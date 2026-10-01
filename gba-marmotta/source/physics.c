//---------------------------------------------------------------------------------
// Marmotta - motore fisico: SAT e solver a impulsi sequenziali
//
// La sequenza per ogni passo e':
//
//   1. broad phase   - bounding box allineati agli assi
//   2. narrow phase  - SAT fra OBB, da cui ricaviamo il punto di contatto
//   3. preparazione  - masse ridotte, bias di Baumgarte, cache degli impeti
//   4. risoluzione   - N iterazioni di vincoli tangenziali e normali
//   5. integrazione - Eulero semi-implicito con smorzamento e quiete
//
// Il punto 3 e' quello che rende stabili le pile: gli impeti calcolati al
// passo precedente vengono riutilizzati come punto di partenza (warm starting),
// cosi' una torre non affossa sotto il proprio peso.
//---------------------------------------------------------------------------------
#include "physics.h"
#include <string.h>

// Sentinelle per gli estremi. Devono essere espresse in pixel, non come
// costanti numeriche grezze: il punto fisso usa 16 bit frazionali sul GBA e 32
// sul banco di prova host, quindi 0x3FFFFFFF varrebbe 32768 px sull'uno e 0.001
// px sull'altro, e i confronti darebbero risultati opposti.
#define BIG_FX  FX(30000)

Body    g_body[MAX_BODIES];
Contact g_contact[MAX_CONTACTS];
s32     g_ncontacts;
s32     g_phys_contacts;
s32     g_phys_bodies;

// Cache degli impeti normali per coppia di corpi: e' il warm starting.
static fx s_impulse_cache[MAX_BODIES * MAX_BODIES * 2];

//---------------------------------------------------------------------------------
// Utilita' interne
//---------------------------------------------------------------------------------
static inline fx cross(fx ax, fx ay, fx bx, fx by)
{
	return fx_mul(ax, by) - fx_mul(ay, bx);
}

static inline fx clamp_mul(fx a, fx b)
{
	return fx_mul(a, b);
}

// Applica un impulso di modulo `imp` lungo (nx, ny) nel punto (px, py).
static void apply_impulse(Body *a, Body *b, fx px, fx py,
	fx nx, fx ny, fx imp)
{
	fx rax = px - a->x, ray = py - a->y;
	fx rbx = px - b->x, rby = py - b->y;
	fx ix, iy;

	// Impulso in velocita': ogni grandezza e' in punto fisso, quindi anche
	// imp*nx va calcolato con fx_mul e non con una semplice moltiplicazione.
	ix = clamp_mul(imp, nx);
	iy = clamp_mul(imp, ny);

	a->vx -= clamp_mul(ix, a->inv_m);
	a->vy -= clamp_mul(iy, a->inv_m);
	a->av -= clamp_mul(clamp_mul(a->inv_i, cross(rax, ray, nx, ny)), imp);

	b->vx += clamp_mul(ix, b->inv_m);
	b->vy += clamp_mul(iy, b->inv_m);
	b->av += clamp_mul(clamp_mul(b->inv_i, cross(rbx, rby, nx, ny)), imp);
}

// Velocita' del punto di contatto sul corpo: v + omega x r. Tutte le
// moltiplicazioni sono in punto fisso e vanno quindi fatte con clamp_mul.
#define POINT_VEL(b, rax_, ray_, vx_, vy_) \
	do { \
		(vx_) = (b)->vx - clamp_mul((b)->av, (ray_)); \
		(vy_) = (b)->vy + clamp_mul((b)->av, (rax_)); \
	} while(0)

// Velocita' relativa di b rispetto ad a lungo la normale del contatto.
static fx rel_normal_vel(const Contact *c)
{
	fx vax, vay, vbx, vby;

	POINT_VEL(c->a, c->rax, c->ray, vax, vay);
	POINT_VEL(c->b, c->rbx, c->rby, vbx, vby);

	return clamp_mul(vbx - vax, c->nx) + clamp_mul(vby - vay, c->ny);
}

// Velocita' relativa lungo la tangente del contatto.
static fx rel_tangent_vel(const Contact *c, fx tx, fx ty)
{
	fx vax, vay, vbx, vby;

	POINT_VEL(c->a, c->rax, c->ray, vax, vay);
	POINT_VEL(c->b, c->rbx, c->rby, vbx, vby);

	return clamp_mul(vbx - vax, tx) + clamp_mul(vby - vay, ty);
}

//---------------------------------------------------------------------------------
// Creazione corpi
//---------------------------------------------------------------------------------
static s32 alloc_body(void)
{
	s32 i;

	for(i = 0; i < MAX_BODIES; i++) {
		if(g_body[i].type == BT_NONE) {
			memset(&g_body[i], 0, sizeof(Body));
			return i;
		}
	}
	return -1;
}

// Momento d'inerzia di un rettangolo: m/12 * (w^2 + h^2), con w e h intere.
static fx box_inertia(fx mass, fx w, fx h)
{
	return clamp_mul(mass, clamp_mul(w, w) + clamp_mul(h, h)) / 12;
}

s32 phys_add_block(fx x, fx y, fx hw, fx hh, ang a, u8 mat)
{
	s32 i;
	Body *b;
	const Material *m;
	fx w, h, mass;

	if(mat >= MAT_COUNT) return -1;
	i = alloc_body();
	if(i < 0) return -1;

	m = &g_mat[mat];
	b = &g_body[i];

	// La densita' e' per unita' quadrata, quindi l'area e' (2hw)*(2hh).
	w    = hw * 2;
	h    = hh * 2;
	mass = clamp_mul(m->density, clamp_mul(w, h));

	b->type    = BT_BLOCK;
	b->mat     = mat;
	b->alive   = 1;
	b->x       = x;
	b->y       = y;
	b->hw      = hw;
	b->hh      = hh;
	b->angle   = a;
	b->inv_m   = (mass > 0) ? fx_inv(mass) : 0;
	b->inv_i   = (mass > 0) ? fx_inv(box_inertia(mass, w, h)) : 0;
	b->e       = FXC(15, 100);
	b->u       = m->friction;
	b->hp      = m->hp;
	b->hp_max  = m->hp;
	b->radius  = 0;
	b->score   = m->score;
	b->color   = m->color;
	b->edge    = m->edge;

	g_phys_bodies++;
	return i;
}

s32 phys_add_ball(fx x, fx y, fx radius, fx vx, fx vy)
{
	s32 i;
	Body *b;
	fx mass, r2;

	i = alloc_body();
	if(i < 0) return -1;

	b = &g_body[i];
	r2   = clamp_mul(radius, radius);
	mass = clamp_mul(FXC(120, 100), clamp_mul(r2, FX(4)));

	b->type    = BT_BALL;
	b->mat     = MAT_STONE;
	b->alive   = 1;
	b->x       = x;
	b->y       = y;
	b->vx      = vx;
	b->vy      = vy;
	b->hw      = radius;
	b->hh      = radius;
	b->radius  = radius;
	b->inv_m   = fx_inv(mass);
	// Momento d'inerzia di un disco: I = m*r^2/2, quindi l'inverso e' 2/(m*r^2).
	b->inv_i   = fx_mul(fx_inv(clamp_mul(mass, r2)), FX(2));
	b->e       = FXC(35, 100);
	b->u       = FXC(60, 100);
	b->hp      = FX(1000);   // il proiettile non si distrugge
	b->hp_max  = b->hp;
	b->score   = 0;
	b->color   = C_BALL;
	b->edge    = C_WOOD_DK;

	g_phys_bodies++;
	return i;
}

s32 phys_add_static(fx x, fx y, fx hw, fx hh)
{
	s32 i;
	Body *b;

	i = alloc_body();
	if(i < 0) return -1;

	b = &g_body[i];
	b->type   = BT_STATIC;
	b->alive  = 1;
	b->x      = x;
	b->y      = y;
	b->hw     = hw;
	b->hh     = hh;
	b->inv_m  = 0;          // massa infinita
	b->inv_i  = 0;
	// Attenzione: il terreno deve avere attrito pieno. Se `u` restasse a zero
	// il coefficiente del contatto sarebbe sqrt(0 * u_blocco) = 0 e nulla
	// frenerebbe: le pile scivolerebbero via senza mai fermarsi.
	b->u      = FX_ONE;
	b->e      = 0;
	b->color  = C_DIRT;
	b->edge   = C_GRASS_DK;
	b->hp     = FX(100000);

	return i;
}

void phys_remove(s32 index)
{
	if(index < 0 || index >= MAX_BODIES) return;
	if(g_body[index].type == BT_NONE) return;

	g_body[index].type  = BT_NONE;
	g_body[index].alive = 0;
	if(g_phys_bodies > 0) g_phys_bodies--;
	phys_wake_all();
}

void phys_wake_all(void)
{
	s32 i;
	for(i = 0; i < MAX_BODIES; i++) {
		g_body[i].asleep  = 0;
		g_body[i].sleep_t = 0;
	}
}

void phys_reset(void)
{
	memset(g_body, 0, sizeof(g_body));
	memset(s_impulse_cache, 0, sizeof(s_impulse_cache));
	g_ncontacts     = 0;
	g_phys_contacts = 0;
	g_phys_bodies   = 0;
}

//---------------------------------------------------------------------------------
// Broad phase
//---------------------------------------------------------------------------------
typedef struct { fx minx, miny, maxx, maxy; int idx; } AABB;

static void make_aabb(const Body *b, AABB *box)
{
	fx ca = fx_abs(fx_cos(b->angle));
	fx sa = fx_abs(fx_sin(b->angle));
	fx ex = clamp_mul(b->hw, ca) + clamp_mul(b->hh, sa);
	fx ey = clamp_mul(b->hw, sa) + clamp_mul(b->hh, ca);

	box->minx = b->x - ex;
	box->maxx = b->x + ex;
	box->miny = b->y - ey;
	box->maxy = b->y + ey;
	box->idx  = (int)(b - g_body);
}

static int aabb_overlap(const AABB *p, const AABB *q)
{
	return !(p->maxx < q->minx || q->maxx < p->minx
	      || p->maxy < q->miny || q->maxy < p->miny);
}

//---------------------------------------------------------------------------------
// Narrow phase: SAT fra OBB con generazione dei punti di contatto.
//
// Il SAT da' l'asse di minima separazione e la profondita'. Da li' in poi serve
// sapere *dove* premono i corpi: usare il centro del corpo, come facevo
// all'inizio, e' un errore che si vede solo con i corpi impilati. In una pila
// verticale il punto di contatto cadrebbe a metta' fra i due blocchi invece che
// sulla loro faccia, e il braccio di leva risulterebbe lungo tutto quello
// spazio. L'impulso che ne risulterebbe e' enorme e spazza via la pila.
//
// Il metodo corretto e' il clipping: si prende la faccia di riferimento (quella
// del corpo che "vince" l'asse), la faccia incidente dell'altro corpo, e si
// ritaglia la seconda sulla prima. Quello che resta sono uno o due punti di
// contatto reali.
//---------------------------------------------------------------------------------

// Vertici della faccia `face` del corpo. Le facce sono numerate 0..3 e valgono
// per un rettangolo: 0 e 2 le due facce larghe, 1 e 3 le due strette.
// Semi-estensione proiettata di un corpo su una direzione arbitraria. E' la
// formula del supporto di un rettangolo ruotato: il raggio e' la somma dei due
// semiassi proiettati sui due assi locali del corpo.
static fx projected_extent(const Body *b, fx dx, fx dy)
{
	fx c = fx_cos(b->angle), s = fx_sin(b->angle);
	fx du = fx_abs(clamp_mul(dx, c) + clamp_mul(dy, s));
	fx dv = fx_abs(clamp_mul(dx, -s) + clamp_mul(dy, c));

	return clamp_mul(du, b->hw) + clamp_mul(dv, b->hh);
}

//---------------------------------------------------------------------------------
// Punti di contatto fra due OBB.
//
// Il SAT dice gia' che i corpi si sovrappongono e di quanto. Qui troviamo
// *dove*: il piano della faccia di riferimento e' a distanza cn lungo la
// normale, e i due corpi si proiettano sulla tangente in due intervalli. La
// parte che si sovrappone e' la regione di contatto, e i suoi estremi sono i
// due punti che passiamo al solver.
//
// Perche' non il centro del corpo: e' il punto in cui la pila crollava. Il
// braccio di leva di un impulso contato dal centro sbaglierebbe di tutta
// l'altezza del blocco, e l'impulso risultante spazzerebbe via la struttura.
//---------------------------------------------------------------------------------
static int obb_manifold(Body *a, Body *b, int ref_axis, fx nx, fx ny,
	fx *out_x, fx *out_y, fx *out_sep)
{
	Body *ref, *inc;
	fx rnx, rny;   // normale di riferimento, da ref verso inc
	fx tx, ty;     // tangente
	fx half_n, half_t;
	fx inc_half_n, inc_half_t;
	fx cn, ci;     // posizioni dei piani delle facce lungo la normale
	fx rt, it;     // posizioni dei centri lungo la tangente
	fx lo, hi;     // estremi della sovrapposizione sulla tangente
	fx sep;

	if(ref_axis < 2) {
		ref = a;
		inc = b;
		rnx =  nx;
		rny =  ny;
	} else {
		ref = b;
		inc = a;
		rnx = -nx;
		rny = -ny;
	}

	// La normale guarda verso l'incidente: se punta dall'altra parte, la
	// invertiamo, altrimenti la profondita' risulterebbe negativa.
	if(clamp_mul(inc->x - ref->x, rnx) + clamp_mul(inc->y - ref->y, rny) < 0) {
		rnx = -rnx;
		rny = -rny;
	}

	tx = -rny;
	ty =  rnx;

	half_n       = projected_extent(ref, rnx, rny);
	half_t       = projected_extent(ref, tx,  ty);
	inc_half_n   = projected_extent(inc, rnx, rny);
	inc_half_t   = projected_extent(inc, tx,  ty);

	// Piano della faccia di riferimento, e piano della faccia dell'incidente
	// piu' vicina al riferimento.
	cn = clamp_mul(ref->x, rnx) + clamp_mul(ref->y, rny) + half_n;
	ci = clamp_mul(inc->x, rnx) + clamp_mul(inc->y, rny) - inc_half_n;

	// Profondita' della sovrapposizione: positiva quando si penetrano.
	sep = cn - ci;
	if(sep <= 0) return 0;

	// Intervalli proiettati sulla tangente. Se non si sovrappongono, i corpi si
	// toccano solo in un punto o per niente: nessun contatto da risolvere.
	rt = clamp_mul(ref->x, tx) + clamp_mul(ref->y, ty);
	it = clamp_mul(inc->x, tx) + clamp_mul(inc->y, ty);

	lo = fx_max(rt - half_t, it - inc_half_t);
	hi = fx_min(rt + half_t, it + inc_half_t);
	if(lo > hi) return 0;

	// I due estremi della regione condivisa sono i punti di contatto. Se la
	// regione e' degenere (un solo punto) ne emettiamo uno solo.
	out_sep[0] = sep;
	out_x[0] = clamp_mul(rnx, cn) + clamp_mul(tx, lo);
	out_y[0] = clamp_mul(rny, cn) + clamp_mul(ty, lo);

	if(hi - lo <= 0) return 1;

	out_sep[1] = sep;
	out_x[1] = clamp_mul(rnx, cn) + clamp_mul(tx, hi);
	out_y[1] = clamp_mul(rny, cn) + clamp_mul(ty, hi);

	return 2;
}

// Trova l'asse di minima separazione fra i due corpi. Scrive la normale
// (da a verso b), la profondita' e l'indice dell'asse.
//
// Restituisce 0 se i corpi sono separati.
static int obb_sat(Body *a, Body *b, fx *out_nx, fx *out_ny, fx *out_sep,
	int *out_axis)
{
	fx cax, sax, cbx, sbx;
	fx dx, dy;
	fx best = BIG_FX;
	int best_axis = 0;
	int best_sign = 1;
	int i;

	cax = fx_cos(a->angle); sax = fx_sin(a->angle);
	cbx = fx_cos(b->angle); sbx = fx_sin(b->angle);
	dx  = b->x - a->x;
	dy  = b->y - a->y;

	for(i = 0; i < 4; i++) {
		fx nx, ny, ra, rb, sep, proj;
		fx uax, uay, vax, vay;

		switch(i) {
		case 0: nx =  cax; ny =  sax; break;
		case 1: nx = -sax; ny =  cax; break;
		case 2: nx =  cbx; ny =  sbx; break;
		default: nx = -sbx; ny =  cbx; break;
		}

		// Raggio proiettato di ogni corpo sull'asse candidato.
		uax =  cax; uay =  sax; vax = -sax; vay =  cax;
		ra = fx_abs(clamp_mul(a->hw, clamp_mul(nx, uax) + clamp_mul(ny, uay)))
		   + fx_abs(clamp_mul(a->hh, clamp_mul(nx, vax) + clamp_mul(ny, vay)));

		uax =  cbx; uay =  sbx; vax = -sbx; vay =  cbx;
		rb = fx_abs(clamp_mul(b->hw, clamp_mul(nx, uax) + clamp_mul(ny, uay)))
		   + fx_abs(clamp_mul(b->hh, clamp_mul(nx, vax) + clamp_mul(ny, vay)));

		proj = clamp_mul(dx, nx) + clamp_mul(dy, ny);
		sep  = ra + rb - fx_abs(proj);

		if(sep <= 0) return 0;   // un asse separa i corpi

		if(sep < best) {
			best      = sep;
			best_axis = i;
			best_sign = (proj < 0) ? -1 : 1;
		}
	}

	switch(best_axis) {
	case 0: *out_nx =  cax * best_sign; *out_ny =  sax * best_sign; break;
	case 1: *out_nx = -sax * best_sign; *out_ny =  cax * best_sign; break;
	case 2: *out_nx =  cbx * best_sign; *out_ny =  sbx * best_sign; break;
	default: *out_nx = -sbx * best_sign; *out_ny =  cbx * best_sign; break;
	}
	*out_sep  = best;
	*out_axis = best_axis;

	return 1;
}

//---------------------------------------------------------------------------------
// Costruzione dei contatti.
//---------------------------------------------------------------------------------
static void add_contact(Body *a, Body *b, fx px, fx py,
	fx nx, fx ny, fx sep, int slot)
{
	Contact *c;
	s32 ai, bi;

	if(g_ncontacts >= MAX_CONTACTS) return;

	// Il solver richiede che `a` sia il corpo meno mobile: statico o piu'
	// pesante. Scambiando i due ruotiamo la normale, altrimenti il contatto
	// spingerebbe nel verso sbagliato. Il punto di contatto e' una posizione
	// nello spazio e non cambia.
	if(a->inv_m > b->inv_m) {
		Body *tmp = a;
		fx tnx = nx;

		a = b;
		b = tmp;
		nx = -tnx;
		ny = -ny;
	}

	c = &g_contact[g_ncontacts];
	memset(c, 0, sizeof(Contact));

	c->a   = a;
	c->b   = b;
	c->px  = px;
	c->py  = py;
	c->nx  = nx;
	c->ny  = ny;
	c->sep = sep;

	// La chiave di cache distingue anche i due punti della stessa coppia:
	// senza, i due impulsi si sovrascriverebbero a vicenda e il warm starting
	// sarebbe dimezzato proprio sulle pile, che e' il caso peggiore.
	ai = (s32)(a - g_body);
	bi = (s32)(b - g_body);
	c->key = (ai * MAX_BODIES + bi) * 2 + slot;

	// Warm start: riprendiamo l'impulso del passo precedente, se c'era.
	c->pn = s_impulse_cache[c->key];
	c->pt = 0;

	g_ncontacts++;
}

static void build_contacts(void)
{
	static AABB box[MAX_BODIES];
	s32 n = 0, i, j;

	g_ncontacts = 0;

	// Tutti i corpi vivi vanno nel broadphase, anche quelli addormentati: se un
	// corpo fermo restasse fuori, un blocco sveglio non troverebbe mai il
	// contatto con la pila sotto e ci affonderebbe dentro. Il risparmio di CPU
	// lo si fa invece saltando le coppie in cui entrambi dormono.
	for(i = 0; i < MAX_BODIES; i++) {
		if(g_body[i].type == BT_NONE) continue;
		make_aabb(&g_body[i], &box[n]);
		n++;
	}

	for(i = 0; i < n; i++) {
		for(j = i + 1; j < n; j++) {
			Body *a = &g_body[box[i].idx];
			Body *b = &g_body[box[j].idx];
			fx nx, ny, sep;
			fx cx[2], cy[2], cs[2];
			int axis, npts, k;

			if(a->asleep && b->asleep) continue;
			if(!aabb_overlap(&box[i], &box[j])) continue;
			if(!obb_sat(a, b, &nx, &ny, &sep, &axis)) continue;

			// Il SAT dice che i corpi si toccano, ma per il solver servono i
			// punti esatti: ritagliamo la faccia incidente su quella di
			// riferimento. Una pila stabile ne genera due per coppia.
			npts = obb_manifold(a, b, axis, nx, ny, cx, cy, cs);
			if(npts <= 0) continue;

			// Se uno dei due e' sveglio, l'altro si sveglia: altrimenti un
			// blocco fermo resterebbe sospeso quando viene colpito.
			if(!a->asleep && b->asleep && b->inv_m != 0) b->asleep = 0;
			if(!b->asleep && a->asleep && a->inv_m != 0) a->asleep = 0;

			for(k = 0; k < npts; k++) {
				add_contact(a, b, cx[k], cy[k], nx, ny, cs[k], k);
			}
		}
	}

	g_phys_contacts = g_ncontacts;
}

//---------------------------------------------------------------------------------
// Preparazione: masse ridotte e bias. Costa piu' di ogni altra fase, quindi
// gira una volta sola per passo e non dentro il ciclo di iterazioni.
//---------------------------------------------------------------------------------
static void prepare_contacts(void)
{
	s32 i;

	for(i = 0; i < g_ncontacts; i++) {
		Contact *c = &g_contact[i];
		fx tx = -c->ny, ty = c->nx;
		fx rn_a, rn_b, rt_a, rt_b;
		fx k_n, k_t;
		fx vel_n, e;

		c->rax = c->px - c->a->x;
		c->ray = c->py - c->a->y;
		c->rbx = c->px - c->b->x;
		c->rby = c->py - c->b->y;

		// Massa ridotta lungo la normale e lungo la tangente.
		rn_a = cross(c->rax, c->ray, c->nx, c->ny);
		rn_b = cross(c->rbx, c->rby, c->nx, c->ny);
		rt_a = cross(c->rax, c->ray, tx, ty);
		rt_b = cross(c->rbx, c->rby, tx, ty);

		k_n = c->a->inv_m + c->b->inv_m
		    + clamp_mul(c->a->inv_i, clamp_mul(rn_a, rn_a))
		    + clamp_mul(c->b->inv_i, clamp_mul(rn_b, rn_b));
		c->mass_n = (k_n > 0) ? fx_inv(k_n) : 0;

		k_t = c->a->inv_m + c->b->inv_m
		    + clamp_mul(c->a->inv_i, clamp_mul(rt_a, rt_a))
		    + clamp_mul(c->b->inv_i, clamp_mul(rt_b, rt_b));
		c->mass_t = (k_t > 0) ? fx_inv(k_t) : 0;

		// Il solver di velocita' riceve solo il termine di restituzione, non la
		// penetrazione. Mettere la penetrazione nel bias (Baumgarte) significa
		// aggiungere energia vera ai corpi: funziona finche' non si guarda cosa
		// succede a una pila, poi la pila comincia a saltare.
		//
		// La correzione della posizione e' delegata a un passaggio separato, che
		// sposta i corpi senza toccare le velocita'.
		c->bias = clamp_mul(fx_min(c->sep, MAX_BIAS_SEP), BAUMGARTE);

		// Restituzione solo se i corpi si stavano davvero allontanando:
		// altrimenti i contatti persistenti farebbero saltare le pile.
		vel_n = rel_normal_vel(c);
		e     = fx_min(c->a->e, c->b->e);
		if(vel_n < -FX(50)) {
			c->bias -= clamp_mul(e, vel_n);
		}
	}
}

//---------------------------------------------------------------------------------
// Una iterazione di solver.
//---------------------------------------------------------------------------------
static void solve_contacts(void)
{
	s32 i;

	for(i = 0; i < g_ncontacts; i++) {
		Contact *c = &g_contact[i];
		fx tx = -c->ny, ty = c->nx;
		fx mu = fx_sqrt(clamp_mul(c->a->u, c->b->u));
		fx vt, dpt, lambda, dpn, vn;
		fx old_pn, max_pt, old_pt;

		// --- vincolo tangenziale (attrito di Coulomb) ----------------------
		vt  = rel_tangent_vel(c, tx, ty);
		dpt = -clamp_mul(vt, c->mass_t);
		c->pt += dpt;

		// L'impulso tangenziale non puo' superare quello normale per la
		// frizione dinamica: |pt| <= mu * pn.
		old_pt = c->pt - dpt;
		max_pt = clamp_mul(mu, c->pn);
		c->pt  = fx_clamp(c->pt, -max_pt, max_pt);
		dpt    = c->pt - old_pt;

		apply_impulse(c->a, c->b, c->px, c->py, tx, ty, dpt);

		// --- vincolo normale ----------------------------------------------
		vn = rel_normal_vel(c);
		lambda = -clamp_mul(vn + c->bias, c->mass_n);

		// L'impulso normale accumulato non puo' diventare negativo: quello
		// e' il contatto che tiene i corpi uniti.
		old_pn = c->pn;
		c->pn   = fx_max(c->pn + lambda, 0);
		dpn     = c->pn - old_pn;

		apply_impulse(c->a, c->b, c->px, c->py, c->nx, c->ny, dpn);
	}
}

//---------------------------------------------------------------------------------
// Integrazione con smorzamento e controllo di quiete.
//---------------------------------------------------------------------------------
static void integrate(fx dt)
{
	s32 i;

	for(i = 0; i < MAX_BODIES; i++) {
		Body *b = &g_body[i];

		if(b->type == BT_NONE || b->type == BT_STATIC || b->asleep) continue;

		// Attenzione: GRAVITY e dt sono entrambi valori in punto fisso, quindi
		// il prodotto va calcolato con fx_mul. Una semplice GRAVITY * dt
		// darebbe 1600 * 65536 * (1/240 * 65536), un numero enorme che
		// farebbe schizzare via ogni corpo.
		b->vy += clamp_mul(GRAVITY, dt);

		// Smorzamento: perdita di energia per tick, serve a far smettere i
		// corpi di vibrare all'infinito.
		b->vx = clamp_mul(b->vx, LINEAR_DAMP);
		b->vy = clamp_mul(b->vy, LINEAR_DAMP);
		b->av = clamp_mul(b->av, ANGULAR_DAMP);

		// Tetto di sicurezza: vedi MAX_SPEED in physics.h.
		b->vx = fx_clamp(b->vx, -MAX_SPEED, MAX_SPEED);
		b->vy = fx_clamp(b->vy, -MAX_SPEED, MAX_SPEED);
		b->av = fx_clamp(b->av, -MAX_ANG_SPEED, MAX_ANG_SPEED);

		b->x     += clamp_mul(b->vx, dt);
		b->y     += clamp_mul(b->vy, dt);
		b->angle += (ang)clamp_mul(b->av, dt);

		if(fx_abs(b->vx) < SLEEP_LIN_TOL && fx_abs(b->vy) < SLEEP_LIN_TOL
		&& fx_abs(b->av) < SLEEP_ANG_TOL) {
			if(b->sleep_t < SLEEP_FRAMES) {
				b->sleep_t++;
			} else {
				b->asleep = 1;
				b->vx = b->vy = 0;
				b->av = 0;
			}
		} else {
			b->sleep_t = 0;
		}
	}
}

void phys_step(fx dt)
{
	s32 i;

	build_contacts();
	prepare_contacts();

	// Warm start: applichiamo subito gli impulti dalla cache prima di iterare,
	// altrimenti il primo giro ripartirebbe da zero e le pile affosseranno.
	for(i = 0; i < g_ncontacts; i++) {
		Contact *c = &g_contact[i];
		s_impulse_cache[c->key] = c->pn;
		apply_impulse(c->a, c->b, c->px, c->py, c->nx, c->ny, c->pn);
	}

	for(i = 0; i < VEL_ITERATIONS; i++) {
		solve_contacts();
	}

	// La cache vale solo per i contatti che sono ricomparsi: gli altri vanno
	// azzerati, altrimenti un blocco che ha toccato un muro e poi si e' mosso
	// ripartirebbe da un impulso vecchio.
	{
		static u32 s_seen[MAX_BODIES * MAX_BODIES * 2 / 32 + 1];
		s32 k;

		for(i = 0; i < g_ncontacts; i++) {
			k = g_contact[i].key;
			s_seen[k / 32] |= 1u << (k % 32);
		}
		for(k = 0; k < MAX_BODIES * MAX_BODIES * 2; k++) {
			if(!(s_seen[k / 32] & (1u << (k % 32)))) {
				s_impulse_cache[k] = 0;
			}
		}
		memset(s_seen, 0, sizeof(s_seen));
	}

	integrate(dt);
}

//---------------------------------------------------------------------------------
// Danno per impatto.
//---------------------------------------------------------------------------------
s32 phys_apply_damage(fx impulse_scale)
{
	s32 i, total = 0;
	s32 dead[MAX_BODIES];
	s32 ndead = 0;

	for(i = 0; i < g_ncontacts; i++) {
		Contact *c = &g_contact[i];
		Body *a = c->a, *b = c->b;
		fx power;

		if(a->type != BT_BLOCK && b->type != BT_BLOCK) continue;

		// L'impulso normale accumulato misura la forza dello scontro.
		power = clamp_mul(c->pn, impulse_scale);
		if(power <= 0) continue;

		if(a->type == BT_BLOCK) {
			a->hp -= power;
			if(a->hp <= 0 && ndead < MAX_BODIES) {
				dead[ndead++] = (s32)(a - g_body);
			}
		}
		if(b->type == BT_BLOCK) {
			b->hp -= power;
			if(b->hp <= 0 && ndead < MAX_BODIES) {
				dead[ndead++] = (s32)(b - g_body);
			}
		}
	}

	for(i = 0; i < ndead; i++) {
		s32 idx = dead[i];

		if(idx < 0 || idx >= MAX_BODIES) continue;
		if(g_body[idx].type == BT_NONE) continue;

		total += g_body[idx].score;
		phys_remove(idx);
	}

	return total;
}
