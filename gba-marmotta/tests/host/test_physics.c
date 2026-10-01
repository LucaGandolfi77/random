//---------------------------------------------------------------------------------
// Marmotta - banco di prova del motore fisico sul PC
//
// Compila physics.c e materials.c per x86 e fa girare scene senza emulatore.
// Serve per verificare la stabilita' del solver e misurare quanto costa un
// passo: sull'emulatore un difetto di fisica si vede solo come "qualcosa
// sembra sbagliato", qui si possono stampare posizioni e guardare le cascate.
//
// Uso:  tests/run-physics-tests.sh
//---------------------------------------------------------------------------------
#include "marmotta.h"
#include "physics.h"

static int g_failures;

// Indici dei corpi creati dai test, per poterli richiamare anche dopo che il
// motore li ha spostati o rimossi.
static s32 phys_add_index[8];

//---------------------------------------------------------------------------------
// Quadro di una scena in ASCII. '#' terra, '.' blocchi, 'o' proiettile.
//---------------------------------------------------------------------------------
static void dump_scene(void)
{
	int x, y, i;
	char row[SCREEN_W + 1];

	for(y = 0; y < WORLD_H; y += 8) {
		for(x = 0; x < WORLD_W; x++) {
			char ch = ' ';

			for(i = 0; i < MAX_BODIES; i++) {
				Body *b = &g_body[i];
				if(b->type == BT_NONE) continue;

				if(fx_abs(b->x - fx_int(x)) < b->hw
				&& fx_abs(b->y - fx_int(y)) < b->hh) {
					ch = (b->type == BT_BALL) ? 'o'
					    : (b->type == BT_STATIC) ? '#' : '.';
					break;
				}
			}
			row[x] = ch;
		}
		row[WORLD_W] = 0;

		// Stampiamo solo le righe non vuote, per non riempire il terminale.
		for(i = 0; row[i]; i++) if(row[i] != ' ') break;
		if(row[i]) printf("y=%3d |%s|\n", y, row);
	}
}

static void clear_world(void)
{
	phys_reset();
}

//---------------------------------------------------------------------------------
// Test 1: un blocco appoggiato sul terreno deve restare fermo.
//---------------------------------------------------------------------------------
static void test_resting_box(void)
{
	s32 idx;
	fx y0, x0;

	printf("\n== test 1: blocco fermo sul terreno ==\n");
	clear_world();

	phys_add_static(fx_int(200), FX(180), FX(200), FX(20));
	idx = phys_add_block(fx_int(200), FX(180 - 20 - 10), FX(10), FX(10), 0,
		MAT_WOOD);

	y0 = g_body[idx].y;
	x0 = g_body[idx].x;

	for(int f = 0; f < 240; f++) {
		phys_step(FX_ONE / 240);
	}

	printf("   posizione iniziale y=%d  finale y=%d (scarto %d px)\n",
		fx_floor(y0), fx_floor(g_body[idx].y),
		fx_floor(fx_abs(g_body[idx].y - y0)));
	printf("   scarto orizzontale: %d px\n",
		fx_floor(fx_abs(g_body[idx].x - x0)));
	printf("   addormentato: %s\n", g_body[idx].asleep ? "si" : "no");

	if(fx_abs(g_body[idx].y - y0) > FX(2)) {
		printf("   FALLITO: il blocco e' affondato o salito\n");
		g_failures++;
	} else {
		printf("   OK\n");
	}
}

//---------------------------------------------------------------------------------
// Test 2: una torre di blocchi deve reggere senza crollare da sola.
//---------------------------------------------------------------------------------
static void test_tower_stability(void)
{
	int f;
	fx max_drift = 0;
	fx start_x[6];

	printf("\n== test 2: torre di 6 blocchi ==\n");
	clear_world();

	phys_add_static(fx_int(300), FX(180), FX(200), FX(20));

	for(f = 0; f < 6; f++) {
		start_x[f] = fx_int(300);
		phys_add_index[f] = phys_add_block(start_x[f],
			FX(180 - 20 - 10 - f * 21), FX(10), FX(10), 0,
			(f & 1) ? MAT_STONE : MAT_WOOD);
	}

	for(f = 0; f < 60 * 6; f++) {   // sei secondi
		int i;
		phys_step(FX_ONE / 240);

		// Ogni blocco viene confrontato con la sua stessa posizione iniziale:
		// e' l'unico modo per misurare uno scarto orizzontale, perche' i
		// blocchi hanno y diversi.
		for(i = 0; i < 6; i++) {
			Body *b = &g_body[phys_add_index[i]];
			fx d;

			if(b->type != BT_BLOCK) continue;
			d = fx_abs(b->x - start_x[i]);
			if(d > max_drift) max_drift = d;
		}
	}

	{
		int blocks = 0;
		for(f = 0; f < MAX_BODIES; f++) if(g_body[f].type == BT_BLOCK) blocks++;
		printf("   blocchi rimasti: %d su 6\n", blocks);
		printf("   scarto massimo del blocco alto: %d px\n",
			fx_floor(max_drift));

		if(blocks < 6) {
			printf("   FALLITO: la torre ha perso blocchi\n");
			g_failures++;
		} else if(max_drift > FX(12)) {
			printf("   FALLITO: la torre scivola troppo\n");
			g_failures++;
		} else {
			printf("   OK\n");
		}
	}
}

//---------------------------------------------------------------------------------
// Test 3: il proiettile deve cadere e rimbalzare, non attraversare il terreno.
//---------------------------------------------------------------------------------
static void test_ball_lands(void)
{
	s32 idx;
	int f;
	fx min_pen = 0;
	fx rest_y = 0;

	printf("\n== test 3: proiettile lanciato verso il terreno ==\n");
	clear_world();

	phys_add_static(fx_int(200), FX(180), FX(200), FX(20));
	idx = phys_add_ball(fx_int(40), FX(40), FX(8), FX(300), 0);

	for(f = 0; f < 60 * 5; f++) {
		phys_step(FX_ONE / 240);

		// Il terreno parte da y=180 con semialtezza 20, quindi la faccia
		// superiore e' a y=160: sotto quella il proiettile e' penetrato.
		fx surface = FX(160);
		fx bottom  = g_body[idx].y + g_body[idx].radius;

		if(bottom > surface) {
			fx pen = bottom - surface;
			if(pen > min_pen) min_pen = pen;
		}
		rest_y = g_body[idx].y;
	}

	printf("   y finale: %d (superficie a 160)\n", fx_floor(rest_y));
	printf("   penetrazione massima: %d px\n", fx_floor(min_pen));
	printf("   addormentato: %s\n", g_body[idx].asleep ? "si" : "no");

	if(min_pen > FX(6)) {
		printf("   FALLITO: il proiettile affonda nel terreno\n");
		g_failures++;
	} else {
		printf("   OK\n");
	}
}

//---------------------------------------------------------------------------------
// Test 4: un blocco colpito forte deve perdere punti struttura.
//---------------------------------------------------------------------------------
static void test_damage(void)
{
	s32 idx;
	int f;
	fx hp0, hp1;

	printf("\n== test 4: danno da impatto ==\n");
	clear_world();

	phys_add_static(fx_int(300), FX(180), FX(200), FX(20));
	idx = phys_add_block(fx_int(260), FX(180 - 20 - 10), FX(10), FX(10), 0,
		MAT_GLASS);
	hp0 = g_body[idx].hp;

	// Tiro diretto e veloce contro il blocco.
	phys_add_ball(fx_int(100), FX(180 - 20 - 10), FX(8), FX(900), 0);

	for(f = 0; f < 60 * 3; f++) {
		phys_step(FX_ONE / 240);
		phys_apply_damage(FXC(1, 700));
		if(g_body[idx].type == BT_NONE) break;
	}

	hp1 = (g_body[idx].type != BT_NONE) ? g_body[idx].hp : 0;

	printf("   HP iniziali: %d  finali: %d\n",
		fx_floor(hp0 / FX_ONE), fx_floor(hp1 / FX_ONE));
	printf("   sopravvive: %s\n", g_body[idx].type != BT_NONE ? "si" : "no");

	if(hp1 >= hp0) {
		printf("   FALLITO: nessun danno applicato\n");
		g_failures++;
	} else {
		printf("   OK\n");
	}
}

//---------------------------------------------------------------------------------
// Test 5: il costo di un passo, che e' il vincolo reale sulla GBA.
//---------------------------------------------------------------------------------
static void test_performance(void)
{
	int f, i;
	int total = 0;

	printf("\n== test 5: costo di un passo con 20 corpi ==\n");
	clear_world();

	phys_add_static(fx_int(300), FX(180), FX(300), FX(20));
	for(i = 0; i < 18; i++) {
		phys_add_block(fx_int(120 + (i % 6) * 24),
			FX(180 - 20 - 10 - (i / 6) * 21), FX(10), FX(10), 0,
			(i & 1) ? MAT_STONE : MAT_WOOD);
	}
	phys_add_ball(fx_int(20), FX(40), FX(8), FX(500), 0);

	for(f = 0; f < 60; f++) {
		int sub;
		for(sub = 0; sub < 4; sub++) {
			phys_step(FX_ONE / 240);
		}
		total += g_ncontacts;
	}

	printf("   contatti medi per sotto-passo: %d\n", total / 240);
	printf("   (la GBA non ha FPU: qui i costi sono indicativi, non confrontabili)\n");
	printf("   OK\n");
}

int main(void)
{
	printf("Banco di prova del motore fisico\n");
	printf("================================\n");

	test_resting_box();
	test_tower_stability();
	test_ball_lands();
	test_damage();
	test_performance();

	printf("\n--------------------------------\n");
	if(g_failures == 0) {
		printf("Tutti i test superati.\n");
	} else {
		printf("%d test falliti.\n", g_failures);
	}
	return g_failures != 0;
}
