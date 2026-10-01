//---------------------------------------------------------------------------------
// Marmotta - banco di prova del motore fisico
//
// Costruisce scena e usa i tasti per fare azioni, cosi' posso verificare a
// schermo che il solver regge. Non e' parte del gioco: serve durante lo
// sviluppo della fase 2.
//---------------------------------------------------------------------------------
#include "marmotta.h"
#include "physics.h"

#include <tonc_irq.h>
#include <tonc_bios.h>
#include <tonc_input.h>

// key_scan e' una macro di libtonc: senza di lei __key_curr/__key_prev non
// vengono mai aggiornati e key_hit restituisce sempre zero.
#define key_scan() key_poll()

#define GROUND_Y  (WORLD_H - 26)

static s32 s_ball;
static char s_msg[32];
static s32 s_score;

static void itoa(s32 v, char *out)
{
	char tmp[12];
	int i = 0, j = 0;

	if(v < 0) { out[j++] = '-'; v = -v; }
	if(v == 0) { out[j++] = '0'; out[j] = 0; return; }
	while(v > 0) { tmp[i++] = (char)('0' + v % 10); v /= 10; }
	while(i > 0) out[j++] = tmp[--i];
	out[j] = 0;
}

static void build_scene(void)
{
	s32 i;

	for(i = 0; i < MAX_BODIES; i++) {
		g_body[i].type = BT_NONE;
	}
	g_phys_bodies = 0;
	g_ncontacts = 0;

	// Terreno largo e due mensole per avere appoggi anche in alto.
	phys_add_static(fx_int(WORLD_W / 2), fx_int(GROUND_Y), fx_int(WORLD_W / 2), fx_int(20));
	phys_add_static(fx_int(180), fx_int(100), fx_int(30), fx_int(6));
	phys_add_static(fx_int(430), fx_int(70),  fx_int(40), fx_int(6));

	// Torre centrale: 3 colonne x 4 piani, alternate legno e pietra.
	for(i = 0; i < 4; i++) {
		phys_add_block(fx_int(300 + i * 20), fx_int(GROUND_Y - 20 - i * 20),
			fx_int(9), fx_int(9), 0, (i & 1) ? MAT_STONE : MAT_WOOD);
	}

	// Due pile piu' larghe ai lati, per provare la stabilita' su superfici
	// estese.
	for(i = 0; i < 3; i++) {
		phys_add_block(fx_int(150 + i * 22), fx_int(GROUND_Y - 20 - i * 20),
			fx_int(10), fx_int(9), 0, MAT_GLASS);
	}
	for(i = 0; i < 3; i++) {
		phys_add_block(fx_int(500 + i * 22), fx_int(GROUND_Y - 20 - i * 20),
			fx_int(10), fx_int(9), 0, MAT_STONE);
	}

	// Un blocco inclinato: verifica che la rotazione sia gestita bene.
	phys_add_block(fx_int(390), fx_int(GROUND_Y - 14), fx_int(24), fx_int(7),
		FXT(30), MAT_WOOD);

	s_ball = phys_add_ball(fx_int(40), fx_int(40), fx_int(8), 0, 0);
	itoa(g_phys_bodies, s_msg);
}

int main(void)
{
	fx cam_x = 0, cam_y = 0;
	const fx DT_SUB = FX_ONE / 240;
	int sub;
	int ox, oy;
	s32 i;

	irq_init(NULL);
	irq_enable(II_VBLANK);
	gfx_init();
	build_scene();

	for(;;) {
		VBlankIntrWait();
		key_scan();

		// Tasto A: spara il proiettile verso destra e in alto.
		if(key_hit(KI_A)) {
			phys_remove(s_ball);
			s_ball = phys_add_ball(fx_int(30), fx_int(GROUND_Y - 60),
				fx_int(8), fx_int(520), FXC(-140, 100));
			phys_wake_all();
		}

		// Tasto B: ricostruisce la scena.
		if(key_hit(KI_B)) {
			build_scene();
			phys_wake_all();
		}

		// START: riattiva tutti i corpi.
		if(key_hit(KI_START)) {
			phys_wake_all();
		}

		// Quattro sotto-passi da 1/240 s danno un passo da 1/60 s: e' il
		// modo piu' economico per tenere le pile stabili a 60 fps.
		for(sub = 0; sub < 4; sub++) {
			phys_step(DT_SUB);
		}

		s_score += phys_apply_damage(FXC(1, 700));

		// Camera sul proiettile, con inseguimento morbido.
		{
			fx tx = g_body[s_ball].x - fx_int(SCREEN_W / 2);
			fx ty = g_body[s_ball].y - fx_int(SCREEN_H / 2);
			tx = fx_clamp(tx, 0, fx_int(WORLD_W - SCREEN_W));
			ty = fx_clamp(ty, 0, fx_int(WORLD_H - SCREEN_H));
			cam_x = fx_lerp(cam_x, tx, FXC(20, 100));
			cam_y = fx_lerp(cam_y, ty, FXC(20, 100));
		}

		ox = fx_floor(cam_x);
		oy = fx_floor(cam_y);

		// --- resa ---------------------------------------------------------
		gfx_gradient_v(0, SCREEN_H, C_SKY_TOP, C_SKY_BOT);

		// Terreno e piattaforme.
		for(i = 0; i < MAX_BODIES; i++) {
			Body *b = &g_body[i];
			if(b->type != BT_STATIC) continue;
			gfx_obb_shadow(b, ox, oy);
			gfx_obb(b, ox, oy);
		}

		// Blocchi e proiettile.
		for(i = 0; i < MAX_BODIES; i++) {
			Body *b = &g_body[i];
			if(b->type != BT_BLOCK && b->type != BT_BALL) continue;
			gfx_obb_shadow(b, ox, oy);
		}
		for(i = 0; i < MAX_BODIES; i++) {
			Body *b = &g_body[i];
			if(b->type != BT_BLOCK && b->type != BT_BALL) continue;
			gfx_obb(b, ox, oy);
		}

		// HUD di diagnostica.
		{
			char buf[16];

			gfx_rect(2, 2, 118, 30, C_HUD_BG);
			gfx_frame(2, 2, 118, 30, C_HUD_FG);
			gfx_text(6, 6, s_msg, C_TEXT);
			gfx_text(6, 14, "corpi", C_HUD_FG);
			itoa(g_phys_bodies, buf);
			gfx_text(48, 14, buf, C_TEXT);
			gfx_text(6, 22, "contatti", C_HUD_FG);
			itoa(g_phys_contacts, buf);
			gfx_text(54, 22, buf, C_TEXT);

			gfx_text(4, SCREEN_H - 10, "A spara  B reset  START sveglia", C_HUD_FG);
		}

		gfx_flip();
	}
}
