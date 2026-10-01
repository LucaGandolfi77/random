//---------------------------------------------------------------------------------
// Palimpsesto - punto d'ingresso
//
// Vertical slice. Cosa c'e' adesso: l'Atelier, la Buca, i quattro personaggi con
// le palette, e il sistema di cancellazione collegato al page tint.
//
// Cosa NON c'e' ancora e va detto prima di guardare il resto: la schermata dei
// titoli, i dialoghi, la schermata di battaglia, il Registro delle Taglie, i
// nemici in mappa e il salvataggio. Il codice di combattimento esiste ed e'
// verificato dai test host, ma non e' ancora cablato a una schermata.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_core.h>
#include <tonc_irq.h>
#include <tonc_bios.h>   // VBlankIntrWait
#include <tonc_input.h>
#include <tonc_memmap.h>
#include <tonc_memdef.h>
#include <string.h>

// key_scan e' una macro di libtonc: senza di lei __key_curr/__key_prev non
// vengono mai aggiornati e key_hit restituisce sempre zero. Vedi marmotta.
#define key_scan() key_poll()

Game g_game;

//---------------------------------------------------------------------------------
// Velocita' di camminata
//
// 6 frame per tile = 8 px in 100ms. Il numero non e' estetico: a 4 frame il
// personaggio scivola sulla carta e non si sente dove mette i piedi; a 10
// sembra impantanato. Con 6 la mappa si attraversa con decisione ma si vede
// ancora il passo.
//---------------------------------------------------------------------------------
#define MOVE_TICKS  6

// L'HUD occupa le prime righe di tile sul layer di testo (BG1, 4bpp).
#define HUD_ROW_FILO   0
#define HUD_ROW_MSG    1
#define HUD_ROW_PARTY  2

static int s_px, s_py;              // posizione aInterpolata in pixel
static int s_moving;
static int s_from_x, s_from_y, s_to_x, s_to_y, s_t;
static int s_frame;
static int s_msg_timer;
static char s_msg[32];

//---------------------------------------------------------------------------------
static void itoa(s32 v, char *out)
{
	char tmp[12];
	int i = 0, j = 0;

	if (v == 0) { out[0] = '0'; out[1] = 0; return; }
	while (v > 0) { tmp[i++] = (char)('0' + v % 10); v /= 10; }
	while (i > 0) out[j++] = tmp[--i];
	out[j] = 0;
}

static void show_msg(const char *s)
{
	strncpy(s_msg, s, sizeof(s_msg) - 1);
	s_msg[sizeof(s_msg) - 1] = 0;
	s_msg_timer = 150;
}

//---------------------------------------------------------------------------------
// L'HUD
//
// BG1 in 4bpp a schermo pieno, e in 4bpp l'indice colore 0 e' TRASPARENTE:
// verificato sul ROM con una sonda. Quindi i pixel vuoti dell'HUD sono indice 0
// e il mondo si vede attraverso. BG1 non scrolla, BG0 sì: testo fermo sopra
// mappa che scorre, senza finestre e senza layer di contorno.
//
// I cancellati restano elencati con un trattino davanti. In un gioco sulla
// cancellazione, far sparire il nome dalla lista sarebbe mentire.
//---------------------------------------------------------------------------------
static void draw_hud(void)
{
	volatile u16 *hud = (volatile u16 *)MAP_BG1;
	char buf[32];
	int i, n;

	// Tutta la schermata del layer di testo parte trasparente. Non solo le
	// righe dell'HUD: se il resto del tilemap avesse spazzatura della VRAM,
	// quei pixel non-transparenti coprirebbero il mondo a macchie.
	gfx_clear_layer(hud, T_EMPTY);

	// Box su tutte le righe dell'HUD, non solo sulla riga dei messaggi.
	// Senza, il testo bianco galleggia sulla carta chiara e non si legge: e'
	// la differenza tra un'interfaccia e un testo stampato a caso sulla pagina.
	gfx_box(hud, HUD_ROW_FILO, HUD_ROW_PARTY);

	// Riga 0: FILO:xxx  TAGLI:x  ATTO:x
	n = 0;
	buf[n++] = 'F'; buf[n++] = 'I'; buf[n++] = 'L'; buf[n++] = 'O';
	buf[n++] = ':';
	itoa(g_game.filo, buf + n); n += (int)strlen(buf + n);
	buf[n++] = ' '; buf[n++] = ' ';
	buf[n++] = 'T'; buf[n++] = 'A'; buf[n++] = 'G'; buf[n++] = 'L';
	buf[n++] = 'I'; buf[n++] = ':';
	{
		int cuts = 0;
		for (i = 1; i < CUT_COUNT; i++)
			if (g_game.cuts_mask & (1 << i)) cuts++;
		itoa(cuts, buf + n); n += (int)strlen(buf + n);
	}
	buf[n++] = ' '; buf[n++] = ' ';
	buf[n++] = 'A'; buf[n++] = 'T'; buf[n++] = 'T'; buf[n++] = 'O';
	buf[n++] = ':';
	buf[n++] = (char)('1' + g_game.chapter);
	buf[n] = 0;
	gfx_text(hud, 0, HUD_ROW_FILO, buf, T_FONT_BASE);

	// Riga 2: i tre combattenti, con '-' davanti a chi e' cancellato.
	n = 0;
	for (i = 0; i < ACTOR_MAX; i++) {
		static const char *const names[3] = { "OTTAVA", "BIEN", "FERRO" };
		Actor *a = &g_game.party[i];
		const char *nm;
		int k;

		if (i == ACTOR_VOCE) continue;
		nm = names[i];
		for (k = 0; k < 6 && n < 30; k++)
			buf[n++] = nm[k];
		buf[n++] = a->erased ? '-' : '+';
		buf[n++] = ' ';
	}
	buf[n] = 0;
	gfx_text(hud, 0, HUD_ROW_PARTY, buf, T_FONT_BASE);

	// Riga 1: messaggio di stato, centrato.
	if (s_msg_timer > 0) {
		s_msg_timer--;
		gfx_text_center(hud, HUD_ROW_MSG, s_msg, T_FONT_BASE);
	}
}

//---------------------------------------------------------------------------------
// La firma della Cancelliera
//
// Ogni taglio che Ottava firma costa una riga, e il mondo perde un gradino di
// colore. E' il cuore del gioco: la scelta e' irreversibile e si vede subito.
//
// I dialoghi veri arrivano in M4; qui il gancio e' gia' al suo posto e il page
// tint e' gia' collegato, perche' la meccanica non si aggiunge dopo: quando si
// aggiunge, si scopre che il colore e' gia' sparito dal mondo.
//---------------------------------------------------------------------------------
static void apply_cut(void)
{
	int applied = g_game.cut_pending;

	g_game.cuts_mask |= (1 << applied);
	g_game.cut_pending = CUT_NONE;

	// Ogni taglio sbiadisce la pagina di un gradino.
	g_game.page_fades++;
	pal_page_tint(g_game.page_fades);

	switch (applied) {
	case CUT_SKILL:  show_msg("HAI PRESO LA MIA SKILL");  break;
	case CUT_PASSO:  show_msg("NON POSSO PIU RIENTRARE"); break;
	case CUT_NOME:   show_msg("IL TUO NOME E UNA RIGA");    break;
	case CUT_VOCE:   show_msg("LA VOCE NON CANTA PIU");    break;
	default:         show_msg("TAGLIO APPLICATO");         break;
	}
}

//---------------------------------------------------------------------------------
static void update_player(void)
{
	int dx = 0, dy = 0;
	u16 keys;

	keys = (u16)~REG_KEYINPUT & 0x03FF;

	if (s_moving) {
		s_t++;
		if (s_t >= MOVE_TICKS) {
			s_moving = 0;
			g_game.player_x = (u8)s_to_x;
			g_game.player_y = (u8)s_to_y;
		}
		return;
	}

	if (keys & KEY_DOWN)       { dy = 1;  actor_set_facing(0); }
	else if (keys & KEY_UP)    { dy = -1; actor_set_facing(1); }
	else if (keys & KEY_LEFT)  { dx = -1; actor_set_facing(2); }
	else if (keys & KEY_RIGHT) { dx = 1;  actor_set_facing(3); }

	if (dx || dy) {
		int nx = g_game.player_x + dx;
		int ny = g_game.player_y + dy;

		if (!map_blocked(nx, ny)) {
			s_moving = 1;
			s_t = 0;
			s_from_x = g_game.player_x;
			s_from_y = g_game.player_y;
			s_to_x = nx;
			s_to_y = ny;
		}
	}

	if (input_hit(KEY_A)) {
		if (g_game.cut_pending != CUT_NONE)
			apply_cut();
		else
			show_msg("OTTAVA: NESSUNA CORREZIONE");
	}
}

//---------------------------------------------------------------------------------
int main(void)
{
	// irq_init(NULL) e irq_enable(II_VBLANK) sono i nomi di libtonc; irqInit e
	// irqEnable sono quelli di libgba e i due non convivono.
	irq_init(NULL);
	irq_enable(II_VBLANK);

	gfx_init();
	pal_init();
	gfx_build_tiles();
	actor_build_tiles();

	memset(&g_game, 0, sizeof(g_game));
	g_game.scene = SCENE_ATELIER;
	g_game.chapter = 0;
	g_game.filo = FILO_START;
	g_game.filo_max = FILO_START + 2 * FILO_PER_STAMPA;
	g_game.cut_pending = CUT_VOCE;   // il primo taglio aspetta una firma

	actor_init();
	map_load_page(g_game.chapter);
	map_draw();
	pal_page_tint(0);

	s_px = 8 * 8;
	s_py = 6 * 8;
	actor_place_party(8, 6);

	input_init();

	for (;;) {
		VBlankIntrWait();
		s_frame++;
		key_scan();
		input_poll();

		update_player();

		// Camera sul giocatore, interpolata sul passo cosi' lo scorrimento
		// non scatta a ogni tile.
		if (s_moving) {
			int sub = s_t * MOVE_TICKS;
			s_px = (s_from_x * 8) + (s_to_x - s_from_x) * sub / MOVE_TICKS;
			s_py = (s_from_y * 8) + (s_to_y - s_from_y) * sub / MOVE_TICKS;
		} else {
			s_px = g_game.player_x * 8;
			s_py = g_game.player_y * 8;
		}

		map_camera(s_px + 4, s_py + 4);

		draw_hud();
		actor_update_oam();

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}

		// La schermata di debug mostra i tre registri che decidono se gli
		// sprite esistono: DISPCNT, BG0CNT e il primo attr0. Serve per una
		// domanda sola, quella di capire se un personaggio invisibile e' un
		// problema di OAM o di attivazione.
		if (1) {
			volatile u16 *m = (volatile u16 *)MAP_BG1;
			volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
			gfx_text(m, 0, 4, "DC:", T_FONT_BASE);
			gfx_hex(m, 0, 5, REG_DISPCNT);
			gfx_text(m, 0, 6, "A0:", T_FONT_BASE);
			gfx_hex(m, 0, 7, o[0].attr0);
			gfx_text(m, 0, 8, "A1:", T_FONT_BASE);
			gfx_hex(m, 0, 9, o[0].attr1);
			gfx_text(m, 0, 10, "A2:", T_FONT_BASE);
			gfx_hex(m, 0, 11, o[0].attr2);
			gfx_text(m, 0, 12, "T0:", T_FONT_BASE);
			gfx_hex(m, 0, 13,
			        (u16)((*(volatile u8 *)(TILE_OBJ + 0))
			              | ((*(volatile u8 *)(TILE_OBJ + 1)) << 8)));
		}
	}
}