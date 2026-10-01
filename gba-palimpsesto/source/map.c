//---------------------------------------------------------------------------------
// Palimpsesto - la pagina
//
// Una sola mappa 32x20, non due. L'Atelier sta a sinistra, la Buca a destra, e
// il passaggio fra i due e' una porta in un muro: non c'e' schermata di
// caricamento, si attraversa un muro.
//
// La mappa e' dichiarata come array a dimensione fissa con _Static_assert: se
// una riga sbaglia di un carattere il build fallisce, invece di disegnare una
// pagina spostata di una colonna che si nota solo guardando il bordo destro.
// E' lo stesso trucco di gba-tiny-harvest.
//
// I muri sono dipinti come muri nel tilemap ma NON bloccano il cammino: in un
// palinsesto si cammina sopra il testo. L'unica cosa che blocca davvero e'
// l'inchiostro, perche' e' l'unica che scrive da sola.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_memmap.h>
#include <tonc_memdef.h>

// u = muro      f = pavimento      F = pavimento macchiato
// d = tavolo     s = scaffale       P = pozzo della Buca
// i = inchiostro (blocca)           x = pagina cancellata
// t = strappo    c = cucitura        D = porta
// o = ossa del Registro
static const char g_map[MAP_H][MAP_W + 1] = {
	"uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu",
	"uffffffffffffffuuFFFFFFFFFFFFFFu",
	"ufsfsffddddffffuuPPFFFFFFFFFFFFu",
	"ufsfsfddddddfffuuPFxxxxxxxxxFFFu",
	"ufsfsfffffffddfuuFxiiiiiiiiixffu",
	"ufsfsffffffffffuuFxiiiiiiiiixffu",
	"ufffffffffftfffuuFxiiiiiiiiixffu",
	"uffffxxfxxffftfuuFxiiiiiiiiixffu",
	"uFoFFFFFFFFFFFouuFxiiiiiiiiixffu",
	"uFFcFFFFFFFFccFuuFxiiiiiiiiixffu",
	"ufffFFFfffffttfDfffffffffffffffu",
	"ufffffffffffffffffffffcffffffffu",
	"uuuuuuuuuuuuuuuuuFxiiiiiiiiixffu",
	"uuuuuuuuuuuuuuuuuFxiiiiiiiiixffu",
	"uuuuuuuuuuuuuuuuuFxiiiiiiiiixffu",
	"uuuuuuuuuuuuuuuuuFFxxxxxxxxxFoFu",
	"uuuuuuuuuuuuuuuuuFFtcFFcFFctFoFu",
	"uuuuuuuuuuuuuuuuuFFFFFFFFFFFFFFu",
	"uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu",
	"uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu"
};

// Ogni riga deve essere lunga MAP_W. Una sola assert per tutte: se una stringa
// e' troppo corta il confronto fallisce e si vede quale riga.
_Static_assert(sizeof(g_map[0]) - 1 == MAP_W, "riga 0 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[1]) - 1 == MAP_W, "riga 1 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[2]) - 1 == MAP_W, "riga 2 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[3]) - 1 == MAP_W, "riga 3 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[4]) - 1 == MAP_W, "riga 4 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[5]) - 1 == MAP_W, "riga 5 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[6]) - 1 == MAP_W, "riga 6 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[7]) - 1 == MAP_W, "riga 7 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[8]) - 1 == MAP_W, "riga 8 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[9]) - 1 == MAP_W, "riga 9 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[10]) - 1 == MAP_W, "riga 10 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[11]) - 1 == MAP_W, "riga 11 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[12]) - 1 == MAP_W, "riga 12 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[13]) - 1 == MAP_W, "riga 13 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[14]) - 1 == MAP_W, "riga 14 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[15]) - 1 == MAP_W, "riga 15 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[16]) - 1 == MAP_W, "riga 16 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[17]) - 1 == MAP_W, "riga 17 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[18]) - 1 == MAP_W, "riga 18 della mappa: lunghezza errata");
_Static_assert(sizeof(g_map[19]) - 1 == MAP_W, "riga 19 della mappa: lunghezza errata");

//---------------------------------------------------------------------------------
static u16 tile_for(char c)
{
	switch (c) {
	case 'u': return T_WALL_A;          // muro: righe scritte
	case 'f': return T_FLOOR_A;
	case 'F': return T_FLOOR_B;         // pavimento macchiato
	case 'd': return T_DESK;
	case 's': return T_SHELF;
	case 'P': return T_POOL;
	case 'i': return T_INK;             // l'unica cosa che blocca
	case 'x': return T_PAGE_ERASE;
	case 't': return T_TEAR;
	case 'c': return T_STITCH;
	case 'D': return T_DOOR_OPEN;
	case 'o': return T_BONE;
	default:  return T_FLOOR_C;
	}
}

void map_load_page(int chapter)
{
	// La mappa e' una sola per tutto il vertical slice: i due atti cambiano i
	// nemici e i dialoghi, non il corridoio. Aggiungere una mappa per atto
	// senzaRiutilizzare questa vuol dire raddoppiare i tile entro i limiti di
	// VRAM, che a 256 tile 8bpp non e' gratis.
	(void)chapter;
}

// map_draw: riempi il tilemap del mondo, che sta su BG0.
//
// BG0 e' in 8bpp: il tilemap da 32x32 occupa due screenblock ma le voci
// restano 32 per riga.
//---------------------------------------------------------------------------------
void map_draw(void)
{
	volatile u16 *m = (volatile u16 *)MAP_BG0;
	int x, y;

	for (y = 0; y < 32; y++) {
		for (x = 0; x < 32; x++) {
			u16 t;
			if (y < MAP_H && x < MAP_W)
				t = tile_for(g_map[y][x]);
			else
				// Fuori dalla pagina: muro pieno. Una pagina che finisce
				// deve sembrare che continui oltre il bordo.
				t = T_WALL_B;
			m[y * 32 + x] = t;
		}
	}
}

int map_blocked(int x, int y)
{
	if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 1;
	return g_map[y][x] == 'i';
}

char map_char(int x, int y)
{
	if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 'u';
	return g_map[y][x];
}