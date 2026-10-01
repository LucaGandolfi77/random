//---------------------------------------------------------------------------------
// Marmotta - costanti globali e tipi condivisi
//---------------------------------------------------------------------------------
#ifndef MARMOTTA_H
#define MARMOTTA_H

// Nel banco di prova host i tipi base arrivano da hostshim.h; sul ROM da libtonc.
#ifdef MARMOTTA_HOST
#include "hostshim.h"
#else
#include <tonc_types.h>
#endif

#include "fxmath.h"

#define SCREEN_W  240
#define SCREEN_H  160

// Il mondo e' piu' largo dello schermo: la camera scorre in orizzontale seguendo
// il proiettile. In verticale e' solo un filo piu' alto dello schermo, per dare
// un po' di aria sopra le strutture senza sprecare spazio.
#define WORLD_W   640
#define WORLD_H   200

enum {
	BT_NONE = 0,
	BT_STATIC,
	BT_BLOCK,
	BT_BALL
};

enum {
	MAT_WOOD = 0,
	MAT_STONE,
	MAT_GLASS,
	MAT_COUNT
};

typedef struct {
	const char *name;
	fx          density;
	fx          friction;
	fx          hp;
	u8          color;
	u8          edge;
	u8          shards;
	s32         score;
} Material;

extern const Material g_mat[MAT_COUNT];

// Angoli in BAF: cosi' il corpo che impugna la fionda e la sua velocita'
// angolare usano lo stesso formato, senza conversioni.
typedef u16 ang;

typedef struct {
	u8  type;
	u8  mat;
	u8  alive;
	u8  asleep;

	fx  x, y;
	fx  vx, vy;
	ang angle;
	fx  av;        // velocita' angolare, BAF al secondo
	u8  sleep_t;   // frame consecutivi sotto la soglia di quiete

	fx  hw, hh;    // semiassi
	fx  inv_m;     // massa inversa (0 = corpo statico)
	fx  inv_i;     // momento d'inerzia inverso
	fx  e, u;      // restituzione e attrito

	fx  hp;
	fx  hp_max;
	fx  radius;    // per BT_BALL

	s32 score;
	u8  color, edge;

	// Contatto accumulates, per il warm starting del solver.
	fx  pn, pt;
} Body;

// Il cielo e' una rampa di voci consecutive nella palette: un gradiente fra
// due indici non consecutivi non puo' funzionare, perche' in Mode 4 l'indice
// e' un valore, non un colore da interpolare.
enum {
	C_SKY_0 = 0,
	C_SKY_1,
	C_SKY_2,
	C_SKY_3,
	C_SKY_4,
	C_SKY_5,
	C_SKY_TOP = C_SKY_0,
	C_SKY_BOT = C_SKY_5,
	SKY_STEPS = 6,
	C_GRASS,
	C_GRASS_DK,
	C_DIRT,
	C_ROCK,
	C_WOOD,
	C_WOOD_DK,
	C_STONE,
	C_STONE_DK,
	C_GLASS,
	C_GLASS_DK,
	C_SLING,
	C_BAND,
	C_BALL,
	C_TRAIL,
	C_HUD_BG,
	C_HUD_FG,
	C_TEXT,
	C_SHADOW,
	C_FIRE,
	C_SMOKE,
	C_WHITE,
	C_BLACK,
	C_PAL_COUNT
};

//---------------------------------------------------------------------------------
// Resa. In Mode 4 il mondo e' disegnato via software nel bitmap; la pagina
// viene scambiata a ogni frame.
//---------------------------------------------------------------------------------
void gfx_init(void);
void gfx_clear(u8 idx);
void gfx_flip(void);
void gfx_rect(int x, int y, int w, int h, u8 idx);
void gfx_frame(int x, int y, int w, int h, u8 idx);
void gfx_line(int x1, int y1, int x2, int y2, u8 idx);
void gfx_plot(int x, int y, u8 idx);
void gfx_disc(int cx, int cy, int r, u8 idx);
void gfx_circle(int cx, int cy, int r, u8 idx);
void gfx_gradient_v(int y0, int y1, u8 top, u8 bot);
void gfx_obb(const Body *b, int ox, int oy);
void gfx_obb_shadow(const Body *b, int ox, int oy);
void gfx_text(int x, int y, const char *s, u8 idx);

#endif // MARMOTTA_H
