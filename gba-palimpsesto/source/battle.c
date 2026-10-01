//---------------------------------------------------------------------------------
// Palimpsesto - motore di combattimento (logica pura)
//
// Regola di ferro: questo file non include niente della GBA. Non scrive in
// VRAM, non tocca i registri, non legge i tasti. Riceve invece lo stato e vi
// scrive dentro, e lascia un coda di eventi da disegnare al renderer.
//
// Il motivo e' pratico: poter cambiare un numero di danno e rilanciare i test
// in un secondo, invece di riavviare un emulatore.
//---------------------------------------------------------------------------------
#include "pale.h"
#include "battle.h"
#include "battle_internal.h"

//---------------------------------------------------------------------------------
// Danni
//
// I numeri sono chiusi e verificati dai test in tests/host/test_battle.c:
// 3 personaggi con Traccia fanno circa 33 danno a turno, quindi il Censore
// (260 HP) cade in circa 8 turni mentre la squadra da 120 Filo ne regge 6. Il
// margine e' negativo apposta: si vince parando e usando Cucisci, non
// resistendo.
//---------------------------------------------------------------------------------
#define TRACCIA_MIN      8
#define TRACCIA_MAX     11
#define CANCELLA_MIN    20
#define CANCELLA_MAX    28

#define COST_CANCELLA     2
#define COST_RIENTRO      1
#define COST_CUCISCI      3

#define DAMAGE_STACCO_PCT 150    // la riga rotta rende il nemico piu' fragile
#define CUCISCI_RECOVER   50    // percentuale di HP al richiamato

//---------------------------------------------------------------------------------
// PRNG: xorshift32.
//
// Nessuna divisione e nessuna tabella, e soprattutto e' riproducibile: due
// battaglie con lo stesso seed danno esattamente la stessa partita. E' cio'
// che permette a un test di riprodurre un caso esatto che fallisce.
//---------------------------------------------------------------------------------
u32 battle_rand(Battle *b)
{
	u32 x = b->rng;

	x ^= x << 13;
	x ^= x >> 17;
	x ^= x << 5;

	// Uno zero farebbe restare il generatore fermo per sempre: su ARM7 un
	// xorshift con seme 0 e' un vicolo cieco e i test si bloccherebbero.
	if (x == 0) x = 0x1234567u;

	b->rng = x;
	return x;
}


//---------------------------------------------------------------------------------
// Eventi
//---------------------------------------------------------------------------------
void battle_emit(Battle *b, int ev)
{
	// Se la coda e' piena l'evento viene scartato: e' preferibile a scrivere
	// oltre l'array e a corrompere il turno successivo. Il test verifica che
	// l'indice non superi mai EV_EVENT_COUNT.
	if (b->event_count >= BATTLE_EVENT_MAX) return;
	b->events[b->event_count++] = (u8)ev;
}

//---------------------------------------------------------------------------------
// Sigilli
//---------------------------------------------------------------------------------
int battle_sig_broken(const Battle *b, int sigil)
{
	if (sigil < 0 || sigil >= SIGILLI_MAX) return 0;
	return b->enemy.sigil_broken[sigil] ? 1 : 0;
}

static int sigil_valid(const Battle *b, int sigil)
{
	(void)b;
	return sigil >= 0 && sigil < SIGILLI_MAX;
}

// Il nemico che reagisce a REACT_CORSIVA "scorre": dopo un colpo sposta la
// sua attenzione, cosi' il giocatore non puo' martellare la stessa riga.
// E' la ragione per cui Corsiva e' il nemico tutorial: la sua debolezza e'
// visibile ma va cercata.
static void maybe_flow(Battle *b, int hit_sig)
{
	if (b->enemy.sigil_react[hit_sig] != REACT_CORSIVA) return;
	if (b->enemy.sigil_broken[hit_sig]) return;
	battle_emit(b, EV_SIGILLO_SCORRE);
}

//---------------------------------------------------------------------------------
// Danno previsto (usato dal motore e dalla UI)
//
// Attenzione: questa funzione e' PURA. Non chiama battle_rand.
//
// Il motivo e' che la UI la chiama ogni volta che il giocatore muove il
// cursore, per mostrare quanto farà male. Se tirasse il PRNG, ogni movimento
// del cursore cambierebbe il futuro della battaglia e la previsione mostrata
// non corrisponderebbe mai al colpo effettivo. Qui si restituisce il punto
// medio dell'intervallo: e' il valore che il giocatore puo' valutare con
// criterio, e il colpo vero lo tira do_cancella.
//---------------------------------------------------------------------------------
static int first_active_sig(const Battle *b)
{
	int i;

	for (i = 0; i < SIGILLI_MAX; i++)
		if (b->enemy.sigil_react[i] != REACT_NONE && !b->enemy.sigil_broken[i])
			return i;

	return 0;
}

// Danno base di Traccia: corto e prevedibile, e' l'opposto di Cancella.
s16 battle_traccia_damage(void)
{
	return TRACCIA_MIN;
}

// Danno base di Cancella: intervallo ampio, e' l'azzardo del personaggio che
// ha salvato Chiarezza per quello.
s16 battle_cancella_base(void)
{
	return (CANCELLA_MIN + CANCELLA_MAX) / 2;       // 24
}

s16 battle_preview_damage(const Battle *b, int sigil)
{
	s16 base;

	if (!sigil_valid(b, sigil)) sigil = first_active_sig(b);

	base = battle_cancella_base();

	// La resistenza della riga riduce, non azzera: altrimenti Corsiva sarebbe
	// immune e basta premere Cancella su un'altra riga.
	if (b->enemy.sigil_resist[sigil] > 0) {
		base -= (s16)(b->enemy.sigil_resist[sigil] * 3);
		if (base < 4) base = 4;
	}

	if (b->enemy.sigil_broken[sigil])
		base = (s16)((base * DAMAGE_STACCO_PCT) / 100);

	return base;
}

// Traccia e' a danno fisso e non tira sul PRNG: e' l'azione affidabile, e se
// tirasse anche lei ogni turno avrebbe il suo rischio e il gioco diventerebbe
// solo rumore. E' Cancella che incassa il bonus da stacco, cosi' la scelta fra
// le due resta reale.
static s16 tracciu_damage(void)
{
	return TRACCIA_MIN;
}

// Danno effettivo di Cancella: intervallo ampio, con lo stesso calcolo della
// previsione ma partendo da un valore tirato. La differenza fra preview e
// reale e' voluta: e' l'azzardo, e il giocatore deve poter scegliere di
// giocare sul sicuro con Traccia quando il rischio non serve.
static s16 battle_cancella_damage(Battle *b, int sigil)
{
	s16 base;

	if (!sigil_valid(b, sigil)) sigil = first_active_sig(b);

	base = (s16)(CANCELLA_MIN + (s16)(battle_rand(b) %
	          (u32)(CANCELLA_MAX - CANCELLA_MIN + 1)));

	if (b->enemy.sigil_resist[sigil] > 0) {
		base -= (s16)(b->enemy.sigil_resist[sigil] * 3);
		if (base < 4) base = 4;
	}

	if (b->enemy.sigil_broken[sigil])
		base = (s16)((base * DAMAGE_STACCO_PCT) / 100);

	return base;
}

//---------------------------------------------------------------------------------
// Attivita' del personaggio
//---------------------------------------------------------------------------------
static Actor *slot_actor(Battle *b, Game *g, int slot)
{
	if (slot < 0 || slot >= b->actor_count) return 0;
	return &g->party[b->actor_id[slot]];
}


//---------------------------------------------------------------------------------
// Traccia: attacco base, e soprattutto accumula Segnalibri sulla riga
// bersagliata. E' l'azione con cui si arriva allo stacco.
//---------------------------------------------------------------------------------
static void do_traccia(Battle *b, Game *g, Actor *a, int sig)
{
	s16 dmg = tracciu_damage();

	// La Redazione puo' riscrivere proprio questa azione. Traccia e' la mossa
	// che piu' spesso si vorrebbe usare, quindi e' la piu' redditizia da
	// togliere: durante il round riscritto l'unica alternativa al parry e'
	// Passa, che non fa danno. E' un turno da difendersi, non un turno perso.
	if (b->rewritten == ACT_TRACCIA) {
		battle_emit(b, EV_REWRITE);
		return;
	}

	if (!sigil_valid(b, sig)) sig = 0;

	// Su una riga rotta il Segnalibro non vale piu': la difesa e' gia' caduta.
	// E una riga si segna una volta sola per round: vedi sig_marked_this_round.
	if (!b->enemy.sigil_broken[sig]
		&& b->enemy.sigil_react[sig] != REACT_NONE
		&& !b->sig_marked_this_round
		&& b->enemy.sigil_notes[sig] < SEGNALIBRI_MAX) {
		b->sig_marked_this_round = 1;
		b->enemy.sigil_notes[sig]++;

		if (b->enemy.sigil_notes[sig] >= SEGNALIBRI_MAX) {
			b->enemy.sigil_broken[sig] = 1;
			b->enemy.sigil_react[sig] = REACT_NONE;
			// Non toccare l'attacco del nemico qui.
			//
			// Ci ho provato e rende il gioco peggiore: togliere attacco
			// insieme al +50% sul danno rende lo stacco una difensiva
			// assoluta, e il boss con piu' righe diventa il piu' facile da
			// battere proprio quando dovrebbe essere il piu' difficile.
			//
			// Il guadagno del giocatore c'e' gia' tutto e senza doppio
			// conteggio: +50% di danno subito, reazione spenta, e un colpo
			// in meno dal nemico perche' il nemico colpisce una volta per
			// riga attiva. Tre benefici, nessuno tira sugli HP del nemico.
			battle_emit(b, EV_STACCO);
		}
	}

	if (b->enemy.sigil_broken[sig])
		dmg = (s16)((dmg * DAMAGE_STACCO_PCT) / 100);

	b->enemy.hp -= dmg;
	if (b->enemy.hp < 0) b->enemy.hp = 0;

	maybe_flow(b, sig);
	battle_emit(b, EV_TRACCIA);
	(void)a;
	(void)g;
}

//---------------------------------------------------------------------------------
// Cancella: danno concentrato, costa 2 Chiarezza, sfrutta lo stacco.
// Se la Redazione ha riscritto questa azione non fa nulla: e' il suo potere.
//---------------------------------------------------------------------------------
static void do_cancella(Battle *b, Game *g, Actor *a, int sig)
{
	s16 dmg;

	if (b->rewritten == ACT_CANCELLA) {
		battle_emit(b, EV_REWRITE);
		return;
	}

	if (a->clarity < COST_CANCELLA) return;   // non spendere il nulla
	a->clarity = (u8)(a->clarity - COST_CANCELLA);

	// Qui il colpo vero tira sul PRNG: e' l'unico posto dove si tira.
	dmg = battle_cancella_damage(b, sig);

	if (sigil_valid(b, sig)) maybe_flow(b, sig);

	b->enemy.hp -= dmg;
	if (b->enemy.hp < 0) b->enemy.hp = 0;

	// Cancella non genera Segnalibri: e' Traccia che apre le difese.
	battle_emit(b, EV_CANCELLA);
	(void)g;
}

//---------------------------------------------------------------------------------
// Rientro: il parry.
//
// Il motore non sa come e' andato il QTE, riceve solo l'esito. Perche' la
// separazione: il timing si prova con l'emulatore (l'unico posto dove si
// misura davvero), ma l'effetto si verifica in un test senza emulatore.
//
// Perfetto nega il colpo a tutta la squadra, parziale ne passa meta', fallito
// non trattiene niente. Il fallback e' "nessuna Difesa" e non "una Difesa":
// se il fallback fosse parziale il parry sarebbe sempre corretto e non ci
// sarebbe una decisione da prendere.
//---------------------------------------------------------------------------------
static void do_rientro(Battle *b, Game *g, Actor *a, int qte)
{
	if (b->rewritten == ACT_RIENTRO) {
		battle_emit(b, EV_REWRITE);
		return;
	}

	if (a->clarity < COST_RIENTRO) {
		battle_emit(b, EV_RIENTRO_NA);
		return;
	}
	a->clarity = (u8)(a->clarity - COST_RIENTRO);

	switch (qte) {
	case RIENTRO_PERFETTO:
		// Il parry e' l'unica azione che non colpisce ma prepara: da' un
		// punto di Chiarezza a tutti, cosi' servono due parry per preparare
		// una Cancella.
		if (a->clarity < CLARITY_MAX) a->clarity++;
		battle_emit(b, EV_RIENTRO_PERFETTO);
		break;
	case RIENTRO_PARZIALE:
		battle_emit(b, EV_RIENTRO_PARZIALE);
		break;
	default:
		// Fallito: si paga subito, e si paga di piu' se la squadra e'
		// gia' stata intaccata. Il rischio e' voluto.
		g->filo -= 3;
		if (g->filo < 0) g->filo = 0;
		battle_emit(b, EV_RIENTRO_FALLITO);
		break;
	}
}

//---------------------------------------------------------------------------------
// Cucisci: richiama un cancellato dentro questa battaglia.
//
// Costa 3 Filo e funziona una volta per personaggio. Non e' una resurrezione:
// e' l'unica rete di sicurezza, e finisce con la pagina. Dopo, chi e' stato
// cancellato resta cancellato.
//---------------------------------------------------------------------------------
static void do_cucisci(Battle *b, Game *g, Actor *a)
{
	int i;

	if (a->stitches == 0) return;
	if (g->filo < COST_CUCISCI) return;

	// Cerca fra i perdenti di questa battagna, non in tutta la squadra: il
	// perimetro e' quello che rende la meccanica una scelta e non una
	// scorciatoia.
	for (i = 0; i < ACTOR_MAX; i++) {
		Actor *t = &g->party[i];

		if (t->erased) continue;            // cancellato sul serio: niente
		if (t->hp > 0) continue;            // non e' mai caduto
		if (!(b->lost_mask & (1 << i))) continue;

		g->filo -= COST_CUCISCI;
		a->stitches = 0;

		t->hp = (s16)((t->hp_max * CUCISCI_RECOVER) / 100);
		t->in_party = 1;
		b->lost_mask &= (u8)~(1 << i);

		battle_emit(b, EV_CUCISCI);
		return;
	}

	// Nessuno recuperabile: non costa niente e non consuma la Cucitura.
	//
	// Potrebbe sembrare troppo generoso, ma la Cucitura e' una risorsa scarsa
	// e perderla per un tentativo a vuoto renderebbe la meccanica irritante
	// invece che dura. La UI disabilita il comando quando non c'e' nessun
	// bersaglio, quindi questo ramo e' solo una rete di sicurezza.
	battle_emit(b, EV_CUCISCI_NA);
}

//---------------------------------------------------------------------------------
// Caduta e cancellazione
//---------------------------------------------------------------------------------
void battle_check_collapse(Battle *b, Game *g)
{
	int i;

	for (i = 0; i < ACTOR_MAX; i++) {
		Actor *a = &g->party[i];

		if (a->erased) continue;
		if (a->hp > 0) continue;

		if (a->stitches > 0 && g->filo >= COST_CUCISCI) {
			// Recuperabile nella pagina corrente: si lascia la porta
			// aperta e non si cancella subito.
			a->in_party = 0;
			b->lost_mask |= (u8)(1 << i);
			continue;
		}

		// Cancellazione definitiva. Da qui in poi non torna piu': niente
		// HP, niente schiera, niente palette colorata.
		a->erased = 1;
		a->in_party = 0;
		a->hp = 0;
		a->clarity = 0;
		a->stitches = 0;
		b->lost_mask &= (u8)~(1 << i);
		battle_emit(b, EV_CANCELLED);
	}
}

//---------------------------------------------------------------------------------
// battle_act: un'azione di un personaggio
//---------------------------------------------------------------------------------
void battle_act(Battle *b, Game *g, int slot, int action,
                int target_sig, int qte)
{
	Actor *a;

	if (!b->running) return;

	a = slot_actor(b, g, slot);
	if (!a) return;
	if (!a->in_party || a->hp <= 0) return;

	switch (action) {
	case ACT_TRACCIA:
		do_traccia(b, g, a, target_sig);
		break;
	case ACT_CANCELLA:
		do_cancella(b, g, a, target_sig);
		break;
	case ACT_RIENTRO:
		do_rientro(b, g, a, qte);
		break;
	case ACT_CUCISCI:
		do_cucisci(b, g, a);
		break;
	case ACT_PASSA:
	default:
		if (a->clarity < CLARITY_MAX) a->clarity++;
		battle_emit(b, EV_PASSA);
		break;
	}

	// La riscrittura la dichiara battle_enemy_phase a fine turno, non qui: se
	// arrivasse a meta' del turno dei personaggi verrebbe tolta prima che il
	// giocatore potesse vederla, e il boss smetterebbe di essere una minaccia.
	battle_check_collapse(b, g);
}

//---------------------------------------------------------------------------------
// battle_over: la partita e' finita?
//
// Vince chi ha cancellato il nemico. Vince il nemico solo se non resta piu'
// nessuno schierato: e' una sconfitta che si puo' recuperare ricaricando la
// pagina, non un game over.
//---------------------------------------------------------------------------------
int battle_over(const Battle *b)
{
	return !b->running;
}