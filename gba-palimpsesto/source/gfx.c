//---------------------------------------------------------------------------------
// Palimpsesto - grafica
//
// Tutta l'arte e' generata in codice: nessun asset esterno, come in
// gba-tiny-harvest. Il motivo e' pratico oltre che di principio, perche' un tile
// da 8x8 si puo' scrivere come stringa e si vede subito se e' giusto, mentre
// un PNG da convertire lo devi fidarti di averlo indicizzato bene.
//
// ARCHITETTURA DEI LAYER (verificata sul ROM, non dedotta):
//
//   BG0 in 8bpp -> font, HUD, testo. NON scrolla.
//   BG1 in 4bpp -> il mondo, 16 tonalita' di carta. Scrolla con la camera.
//   OBJ   4bpp -> personaggi ed effetti.
//
// Il testo sta su BG0 perche' con BG0 in 8bpp attivo un qualsiasi altro BG in
// 4bpp risultava coperto dal mondo, qualunque priorita' gli assegnassi: il testo
// spariva del tutto. BG0 e' l'unico layer che si vede sempre in primo piano.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_memmap.h>
#include <tonc_memdef.h>
#include <string.h>

//---------------------------------------------------------------------------------
// Copia un tile in VRAM.
//
// I tile sono losso come: i pixel di un bit sono accanto a quelli dell'altro
// bit, quattro byte per riga. Su little-endian l'ordine e' gia' quello giusto.
//---------------------------------------------------------------------------------
void gfx_vram_write(volatile u32 *dst, const u8 *src, int bytes)
{
	int i;

	for (i = 0; i < bytes; i += 4) {
		u32 v = (u32)src[i] | ((u32)src[i + 1] << 8)
		      | ((u32)src[i + 2] << 16) | ((u32)src[i + 3] << 24);
		dst[i >> 2] = v;
	}
}

//---------------------------------------------------------------------------------
// I registri, per bit.
//
// Non uso le costanti di libgba (BG0_ENABLE e cosi' via) perche' libtonc non le
// espone, e usarle richiederebbe di includere gba_video.h che ridefinisce macro
// dei registri in modo incompatibile con libgba.
//
// DISPCNT: bit 0-2 modalita', bit 6 mappa OBJ 1D, bit 8-11 abilitano
// BG0-BG3, bit 12 abilita gli sprite.
// BGxCNT: bit 0-1 priorita', bit 2-3 charblock, bit 7 modalita' colore
// (0 = 4bpp, 1 = 8bpp), bit 8-12 screenblock.
//---------------------------------------------------------------------------------
#define DC_MODE0        0x0000
#define DC_OBJ_1D       0x0040
#define DC_BG0          0x0100
#define DC_BG1          0x0200
#define DC_OBJ          0x1000

#define BGC_PRIO(n)     ((n) & 3)
#define BGC_CHAR(n)     (((n) & 3) << 2)
#define BGC_SCREEN(n)   (((n) & 31) << 8)
#define BGC_256          (1 << 7)

void gfx_init(void)
{
	int i;

	// Modalita' 0 con i due soli BG che servono: BG0 per il mondo, BG1 per il
	// testo. Nessuna finestra.
	//
	// Il layering e' tutto qui: BG1 ha priorita' 1, BG0 priorita' 2, quindi
	// il testo vince; e in 4bpp l'indice 0 non disegna, quindi i vuoti
	// dell'HUD lasciano vedere la carta sotto.
	//
	// La finestra WIN0 e' stata tolta perche' era superflua, e non perche'
	// fosse rotta: con WIN0 attivo lo schermo restava nero sotto l'HUD e la
	// colpa sembrava di BG0 in 8bpp, che e' l'unico layer senza pixel
	// trasparenti. Ma BG0 disegnava benissimo, e togliendo la finestra e'
	// comparso tutto. Il costo della finestra era anche una trappola: la
	// seconda meta' di WIN0H/WIN0V e' in blocchi da 8 px, non in pixel, e
	// sbagliarla non dà una finestra piccola ma una finestra grande il doppio,
	// che copre il mondo intero.
	REG_DISPCNT = DC_MODE0 | DC_OBJ_1D | DC_BG0 | DC_BG1 | DC_OBJ;

	// BG0 e' il mondo: 8bpp, charblock 0. Scrolla con la camera.
	REG_BG0CNT = BGC_PRIO(2) | BGC_256 | BGC_CHAR(0) | BGC_SCREEN(26);

	// BG1 e' il testo: 4bpp, charblock 1. Non scrolla.
	REG_BG1CNT = BGC_PRIO(1) | BGC_CHAR(1) | BGC_SCREEN(24);

	for (i = 0; i < 128; i++)
		((volatile OBJ_ATTR *)MEM_OAM)[i].attr0 = 0x0200;
}

//---------------------------------------------------------------------------------
// L'arte del mondo indica la tinta con un carattere ('0'..'9', 'a'..'p') e
// l'indice e' gia' quello della voce di palette: il mondo sta su BG1 in 4bpp e
// usa la bank 0, cioe' le voci 0-15.
//
// Il dithering e' il punto. Un pavimento pieno di carta sembra uno sfondo
// piatto; due toni alternati a scacchiera sembrano carta. Ogni tile di
// pavimento alterna due indici adiacenti della rampa: e' lo stesso trucco con
// cui si fa la neve, ma qui dice "fibra" e non "freddo".
//---------------------------------------------------------------------------------
static u8 art_pal(char c)
{
	if (c >= '0' && c <= '9') return (u8)(c - '0');
	if (c >= 'a' && c <= 'z') return (u8)(10 + c - 'a');
	return 0;
}

static const char *const s_floor_art[3][8] = {
	// Pavimento liscio: carta piena.
	{ "00000000", "00000000", "00000000", "00000000",
	  "00000000", "00000000", "00000000", "00000000" },
	// Pavimento macchiato: un pixel su quattro scurisce.
	{ "00000000", "00000000", "00010001", "00000000",
	  "00000000", "00010001", "00000000", "00000000" },
	// Pavimento rovinato: due macchie in diagonale.
	{ "00000000", "00000000", "00010000", "00000000",
	  "00000010", "00000000", "00000000", "00000000" }
};

// Muro: righe orizzontali di testo. Il mondo e' scritto, quindi i muri sono
// righe scritte male, e questo si vede anche a occhio nudo.
static const char *const s_wall_art[3][8] = {
	{ "00000000", "03030030", "00220022", "00030003",
	  "00220022", "03030030", "00030003", "00000000" },
	{ "00220022", "03030030", "00000000", "00030003",
	  "00030003", "00220022", "03000000", "00000000" },
	{ "00030003", "00220022", "03030030", "00000000",
	  "00000022", "00030003", "00220000", "00000000" }
};

// Carta cancellata: solo il contorno. Compare dove una riga e' stata rimossa e
// deve sembrare un buco nella pagina, non un pavimento scuro.
static const char *const s_page_erase_art[8] = {
	"00000000", "00222220", "02000002", "02000002",
	"02000002", "02000002", "00222220", "00000000"
};

// Pozza d'inchiostro: il punto in cui l'Inchiostro Madre corregge da solo.
static const char *const s_ink_art[8] = {
	"00000000", "00011000", "00122200", "01222210",
	"01222210", "00122200", "00011000", "00000000"
};

// Pozzo della Buca: un buco scuro con il bordo di carta sollevata.
static const char *const s_pool_art[8] = {
	"00000000", "00111100", "01111110", "01222210",
	"01222210", "01111110", "00111100", "00000000"
};

// Banco di scrittura della Cancelliera.
static const char *const s_desk_art[8] = {
	"00000000", "00044000", "00444400", "04444440",
	"04444440", "00444400", "00044000", "00000000"
};

// Scaffale dei registri.
static const char *const s_shelf_art[8] = {
	"00000000", "04444440", "01111110", "04444440",
	"01111110", "04444440", "01111110", "00000000"
};

// Porta.
static const char *const s_door_art[8] = {
	"00000000", "04444440", "04044040", "04040040",
	"04040040", "04044040", "04444440", "00000000"
};

// Cucitura: tre punti. Compare dove una riga e' stata riparata.
static const char *const s_stitch_art[8] = {
	"00000000", "00000000", "04000040", "00404000",
	"04000040", "00000000", "00000000", "00000000"
};

// Strappo sulla carta: una riga lacerata.
static const char *const s_tear_art[8] = {
	"00000000", "03030300", "00303030", "00030303",
	"30030300", "03003030", "00303000", "00000000"
};

//---------------------------------------------------------------------------------
// I tile del mondo: BG1 in 4bpp, 32 byte per tile, due pixel per byte con il
// primo nei bit bassi.
//
// Lo stride e' 32. Con 16 i tile si sovrapponevano a meta' e la meta' alta di
// ogni tile finiva sopra la meta' bassa del successivo.
// I tile del mondo stanno in BG0 in 8bpp: 64 byte per tile, un byte per pixel.
//
// L'indice del pixel e' la voce di palette, quindi l'arte va offsettata di
// PAL_WORLD_BASE per non finire sulle voci del testo.
//
// Lo stride e' 64. Con 32 i tile si sovrapponevano a meta' e la meta' alta di
// ogni tile finiva sopra la meta' bassa del successivo: il sintomo era una
// pagina disegnata con colori sbagliati e mezza mappa illeggibile.
static void put_tile_world(int dst_tile, const char *const art[8])
{
	u8 buf[64];
	int y, x;

	for (y = 0; y < 8; y++)
		for (x = 0; x < 8; x++)
			buf[y * 8 + x] = (u8)(art_pal(art[y][x]) + PAL_WORLD_BASE);

	gfx_vram_write((volatile u32 *)(TILE_BG0 + dst_tile * 64), buf, 64);
}

static void put_tile_world_v(int dst_tile, const char *const art[3][8],
                             int variant)
{
	put_tile_world(dst_tile, art[variant % 3]);
}

//---------------------------------------------------------------------------------
// Il font: 5x7 dentro il tile 8x8, in 8bpp sul BG0.
//
// Otto righe per cinque pixel di carattere, con una riga di aria in basso e
// una a destra. Le lettere accentate non ci sono: si scrive italiano senza
// accenti, come in gba-tiny-harvest e gba-expedition-33.
//
// I pixel sono offsettati di PAL_UI_BASE perche' BG0 e' in 8bpp e l'indice nel
// tile e' la voce di palette: senza l'offset il testo prenderebbe le voci del
// mondo e sparirebbe.
//---------------------------------------------------------------------------------
static const u8 s_font[63][5] = {
	{0x00,0x00,0x00,0x00,0x00},  /*   */
	{0x00,0x00,0x5F,0x00,0x00},  /* ! */
	{0x00,0x03,0x00,0x03,0x00},  /* " */
	{0x0A,0x1F,0x0A,0x1F,0x0A},  /* # */
	{0x24,0x2A,0x7F,0x2A,0x12},  /* $ */
	{0x23,0x13,0x08,0x64,0x62},  /* % */
	{0x36,0x49,0x55,0x22,0x50},  /* & */
	{0x00,0x00,0x03,0x00,0x00},  /* ' */
	{0x00,0x1C,0x22,0x41,0x00},  /* ( */
	{0x00,0x41,0x22,0x1C,0x00},  /* ) */
	{0x2A,0x1C,0x3E,0x1C,0x2A},  /* * */
	{0x08,0x08,0x3E,0x08,0x08},  /* + */
	{0x00,0x40,0x30,0x10,0x00},  /* , */
	{0x08,0x08,0x08,0x08,0x08},  /* - */
	{0x00,0x60,0x60,0x00,0x00},  /* . */
	{0x20,0x10,0x08,0x04,0x02},  /* / */
	{0x3E,0x51,0x49,0x45,0x3E},  /* 0 */
	{0x00,0x42,0x7F,0x40,0x00},  /* 1 */
	{0x42,0x61,0x51,0x49,0x46},  /* 2 */
	{0x21,0x41,0x45,0x4B,0x31},  /* 3 */
	{0x18,0x14,0x12,0x7F,0x10},  /* 4 */
	{0x27,0x45,0x45,0x45,0x39},  /* 5 */
	{0x3C,0x4A,0x49,0x49,0x30},  /* 6 */
	{0x01,0x71,0x09,0x05,0x03},  /* 7 */
	{0x36,0x49,0x49,0x49,0x36},  /* 8 */
	{0x06,0x49,0x49,0x29,0x1E},  /* 9 */
	{0x00,0x33,0x33,0x00,0x00},  /* : */
	{0x00,0x53,0x33,0x00,0x00},  /* ; */
	{0x08,0x14,0x22,0x41,0x00},  /* < */
	{0x14,0x14,0x14,0x14,0x14},  /* = */
	{0x41,0x22,0x14,0x08,0x00},  /* > */
	{0x02,0x01,0x51,0x09,0x06},  /* ? */
	{0x32,0x49,0x79,0x01,0x3E},  /* @ */
	{0x7C,0x12,0x11,0x12,0x7C},  /* A */
	{0x7F,0x49,0x49,0x49,0x36},  /* B */
	{0x3E,0x41,0x41,0x41,0x22},  /* C */
	{0x7F,0x41,0x41,0x22,0x1C},  /* D */
	{0x7F,0x49,0x49,0x49,0x41},  /* E */
	{0x7F,0x09,0x09,0x09,0x01},  /* F */
	{0x3E,0x41,0x41,0x49,0x3A},  /* G */
	{0x7F,0x08,0x08,0x08,0x7F},  /* H */
	{0x00,0x41,0x7F,0x41,0x00},  /* I */
	{0x20,0x40,0x41,0x3F,0x01},  /* J */
	{0x7F,0x08,0x14,0x22,0x41},  /* K */
	{0x7F,0x40,0x40,0x40,0x40},  /* L */
	{0x7F,0x02,0x0C,0x02,0x7F},  /* M */
	{0x7F,0x02,0x04,0x08,0x7F},  /* N */
	{0x3E,0x41,0x41,0x41,0x3E},  /* O */
	{0x7F,0x09,0x09,0x09,0x06},  /* P */
	{0x3E,0x41,0x51,0x21,0x5E},  /* Q */
	{0x7F,0x09,0x19,0x29,0x46},  /* R */
	{0x26,0x49,0x49,0x49,0x32},  /* S */
	{0x01,0x01,0x7F,0x01,0x01},  /* T */
	{0x3F,0x40,0x40,0x40,0x3F},  /* U */
	{0x1F,0x20,0x40,0x20,0x1F},  /* V */
	{0x7F,0x20,0x18,0x20,0x7F},  /* W */
	{0x63,0x14,0x08,0x14,0x63},  /* X */
	{0x03,0x04,0x78,0x04,0x03},  /* Y */
	{0x61,0x51,0x49,0x45,0x43},  /* Z */
	{0x00,0x7F,0x41,0x41,0x00},  /* [ */
	{0x02,0x04,0x08,0x10,0x20},  /* \ */
	{0x00,0x41,0x41,0x7F,0x00},  /* ] */
	{0x04,0x02,0x01,0x02,0x04},  /* ^ */
};

void gfx_build_font(void)
{
	u8 buf[64];
	int g, c, r, i;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	// T_EMPTY: tutto indice 0, quindi trasparente. L'HUD usa questo tile per
	// il fondo, cosi' il mondo si vede attraverso dove non c'e' testo.
	for (i = 0; i < 32; i++) ((volatile u8 *)TILE_BG1)[i] = 0;

	for (g = 0; g < T_FONT_GLYPHS; g++) {
		// 8bpp: un byte per pixel. Il fondo del glifo e' il colore di fondo
		// dell'HUD, i tratti sono il colore del testo: due voci distinte,
		// quindi il testo resta leggibile su qualunque sfondo disegnato sotto.
		for (i = 0; i < 64; i++)
			buf[i] = (u8)UI_BG;

		for (c = 0; c < 5; c++) {
			u8 bits = s_font[g][c];
			for (r = 0; r < 7; r++)
				if (bits & (1 << r))
					buf[r * 8 + c + 1] = (u8)UI_FG;
		}

		// BG1 e' in 4bpp: 32 byte per tile, 4 byte per riga, due pixel per
		// byte. Il primo pixel della coppia va nei bit ALTI: e' la convenzione
		// della GBA, e invertirla non sposta la lettera ma la dimezza a meta',
		// cosi' che il testo esce illeggibile senza che nulla sembri rotto.
		//
		// Con i bit bassi per il primo pixel ogni lettera risultava composta da
		// due colonne dimezzate, spostate di mezzo glifo.
		{
			u8 t[32];
			int y, x;

			for (y = 0; y < 8; y++)
				for (x = 0; x < 8; x += 2) {
					int sx = buf[y * 8 + x];
					int dx = buf[y * 8 + x + 1];
					t[y * 4 + x / 2] = (u8)((dx << 4) | sx);
				}

			gfx_vram_write((volatile u32 *)(TILE_BG1 + (T_FONT_BASE + g) * 32),
			                t, 32);
		}
	}
}

//---------------------------------------------------------------------------------
void gfx_build_tiles(void)
{
	int i;

	put_tile_world_v(T_FLOOR_A, s_floor_art, 0);
	put_tile_world_v(T_FLOOR_B, s_floor_art, 1);
	put_tile_world_v(T_FLOOR_C, s_floor_art, 2);
	put_tile_world_v(T_WALL_A, s_wall_art, 0);
	put_tile_world_v(T_WALL_B, s_wall_art, 1);
	put_tile_world_v(T_WALL_C, s_wall_art, 2);
	put_tile_world(T_PAGE_ERASE, s_page_erase_art);
	put_tile_world(T_INK, s_ink_art);
	put_tile_world(T_POOL, s_pool_art);
	put_tile_world(T_DESK, s_desk_art);
	put_tile_world(T_SHELF, s_shelf_art);
	put_tile_world(T_DOOR_CLOSED, s_door_art);
	put_tile_world(T_DOOR_OPEN, s_door_art);
	put_tile_world(T_STITCH, s_stitch_art);
	put_tile_world(T_TEAR, s_tear_art);
	put_tile_world(T_BONE, s_floor_art[2]);

	// Pulisco i tile vuoti del charblock del font (CB1): senza questo i tile
	// non usati contengono spazzatura della VRAM e il tilemap del testo
	// mostrerebbe macchie a caso dove dovrebbe stare lo spazio.
	for (i = T_NUM_FONT_BLOCK; i < 256; i++) {
		u8 z[64];
		memset(z, 0, sizeof(z));
		gfx_vram_write((volatile u32 *)(TILE_BG1 + i * 32), z, 32);
	}

	gfx_build_font();
}

//---------------------------------------------------------------------------------
// Tilemap
//---------------------------------------------------------------------------------
void gfx_clear_layer(volatile u16 *map, u16 tile)
{
	int i;
	volatile u16 *m = (volatile u16 *)map;

	for (i = 0; i < 32 * 32; i++)
		m[i] = tile;
}

u16 gfx_glyph(char c)
{
	if (c >= ' ' && c <= 'Z')
		return (u16)(T_FONT_BASE + (c - ' '));
	return T_FONT_BASE;   // spazio per qualsiasi cosa fuori gamma
}

void gfx_text(volatile u16 *map, int x, int y, const char *s, u16 tile_base)
{
	int i;
	volatile u16 *row = map + y * 32;

	for (i = 0; s[i] && (x + i) < 32; i++) {
		if (tile_base == T_FONT_BASE)
			row[x + i] = gfx_glyph(s[i]);
		else
			row[x + i] = (u16)(tile_base + (s[i] - ' '));
	}
}

// Quattro cifre esadecimali con il solo font del gioco: serve per leggere un
// registro a schermo invece di indovinarlo dal risultato.
void gfx_hex(volatile u16 *map, int x, int y, u16 v)
{
	static const char HEX[] = "0123456789ABCDEF";
	char buf[5];
	int i;

	for (i = 0; i < 4; i++)
		buf[i] = HEX[(v >> ((3 - i) * 4)) & 15];
	buf[4] = 0;

	gfx_text(map, x, y, buf, T_FONT_BASE);
}

void gfx_hex4(volatile u16 *map, int x, int y, const char *tag,
              u16 a, u16 b, u16 c, u16 d)
{
	char buf[8];
	int i;
	const u16 v[4] = { a, b, c, d };

	gfx_text(map, x, y, tag, T_FONT_BASE);

	for (i = 0; i < 4; i++) {
		static const char HEX[] = "0123456789ABCDEF";
		int k;
		for (k = 0; k < 4; k++)
			buf[k] = HEX[(v[i] >> ((3 - k) * 4)) & 15];
		buf[4] = 0;
		gfx_text(map, x + (int)strlen(tag) + i * 5, y, buf, T_FONT_BASE);
	}
}

void gfx_text_center(volatile u16 *map, int y, const char *s, u16 tile_base)
{
	int len = (int)strlen(s);

	if (len > 30) len = 30;
	gfx_text(map, (32 - len) / 2, y, s, tile_base);
}

void gfx_box(volatile u16 *map, int top, int bot)
{
	volatile u16 *m = (volatile u16 *)map;
	int x, y;

	// Il box usa i tile T_BOX_* che gfx_build_font scrive come rettangoli pieni
	// di colore UI_BG: senza il bordo arrotondato, perche' su schermo GBA un
	// bordo di 1px a 8x8 si legge come sporco e non come cornice.
	for (y = top; y <= bot; y++) {
		for (x = 0; x < 32; x++) {
			u16 t;
			if (y == top)      t = T_BOX_T;
			else if (y == bot) t = T_BOX_B;
			else               t = T_BOX_BG;
			m[y * 32 + x] = t;
		}
	}
}

//---------------------------------------------------------------------------------
// Camera
//
// Scorre SOLO BG1, che e' il mondo. BG0 tiene HUD e testo e resta fermo: e'
// l'unico modo per avere un'interfaccia che non scorre insieme alla mappa.
//
// Lo schermo e' largo 240 e la mappa 32 tile = 256px: lo scorrimento
// orizzontale e' di 16px, e in verticale non si scorre perche' 160px sono
// esattamente l'altezza dello schermo.
//---------------------------------------------------------------------------------
// Lo scorrimento applicato al mondo. Gli sprite lo leggono per passare dalle
// coordinate di mappa a quelle di schermo.
static int s_hofs, s_vofs;

int map_camera_hofs(void) { return s_hofs; }
int map_camera_vofs(void) { return s_vofs; }

void map_camera(int px, int py)
{
	int hofs, vofs;

	hofs = px - SCREEN_W / 2;
	if (hofs < 0) hofs = 0;
	if (hofs > MAP_W * 8 - SCREEN_W) hofs = MAP_W * 8 - SCREEN_W;

	vofs = py - SCREEN_H / 2;
	if (vofs < 0) vofs = 0;
	if (vofs > MAP_H * 8 - SCREEN_H) vofs = MAP_H * 8 - SCREEN_H;

	// La camera scorre BG0, che e' il mondo. Scrollare BG1 sarebbe la cosa
	// giusta da fare quando BG1 era il mondo: dopo lo scambio dei due layer
	// il registro era rimasto indietro e la mappa non si muoveva.
	s_hofs = hofs;
	s_vofs = vofs;

	REG_BG0HOFS = (u16)hofs;
	REG_BG0VOFS = (u16)vofs;
}