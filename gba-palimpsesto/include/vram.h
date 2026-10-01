//---------------------------------------------------------------------------------
// Palimpsesto - layout della VRAM
//
// In Mode 0 la VRAM utile e' 96 KB (CB0..CB5): gli indirizzi da 0x06018000 in
// su sono riservati alle bitmap OBJ delle Mode 3-5 e non si possono usare.
//
// La cosa piu' facile da sbagliare in un progetto tiled e' far collidere un
// tilemap con un blocco di tile: il sintomo e' uno schermo nero o a strisce
// casuali che si nota solo in certi angoli della mappa. Qui ogni regione ha
// un indirizzo e una dimensione nominali, e in fondo al file gli _Static_assert
// verificano che due regioni non si toccano. Se domani serve piu' memoria,
// fallo fallire qui invece che a schermo.
//---------------------------------------------------------------------------------
#ifndef VRAM_H
#define VRAM_H

#define VRAM_BASE     0x06000000
#define VRAM_BYTES    0x18000        // 96 KB usabili in Mode 0

#define CB(b)         (VRAM_BASE + ((b) * 0x4000))   // charblock = 16 KB
#define SB(n)         (VRAM_BASE + ((n) * 0x800))    // screenblock = 2 KB

//---------------------------------------------------------------------------------
// Tile
//
// L'architettura e' INVERSA rispetto a come si pensa per prima.
//
// Il testo e' su BG0 e il mondo su BG1, non il contrario. Il motivo e' una
// cosa dell'hardware verificata sul ROM: con BG0 in 8bpp attivo, un qualsiasi
// altro BG in 4bpp risultava COPERTO, qualunque priorita' gli assegnassi. Il
// testo spariva completamente.
//
// Mettere l'HUD su BG0 risolve perche' BG0 e' l'unico che si vede sempre in
// primo piano, e in piu' BG0 non scrolla: cosi' l'HUD resta fermo mentre il
// mondo scorre su BG1.
//
// Il prezzo e' che il mondo passa a 4bpp e resta con 16 tonalita' di carta.
// Per un palinsesto fatto di dithering non e' una perdita, e il dithering con
// due soli toni si legge anche meglio.
//---------------------------------------------------------------------------------
// BG0 in 8bpp: il font e i tile del testo. 64 byte per tile.
#define TILE_BG0      CB(0)
#define TILE_BG0_LEN  0x4000

// BG1 in 4bpp: i tile del mondo. 32 byte per tile.
#define TILE_BG1      CB(1)
#define TILE_BG1_LEN  0x4000

// OBJ 4bpp: attori ed effetti. Con la mappa 1D (OBJ_1D_MAP in DISPCNT) gli
// sprite leggono i tile dai charblock 4, 5, 6 e 7, scelti per ogni sprite dai
// bit 0-2 di attr2, quindi i tile degli attori vanno a partire da 0x10000 e
// non in un charblock basso: il risultato sarebbe che l'OAM punta a un blocco
// vuoto e i personaggi semplicemente non si vedono.
#define TILE_OBJ      0x10000        // charblock 4
#define TILE_OBJ_LEN  0x4000

//---------------------------------------------------------------------------------
// Tilemap
//
// Il campo screenblock di BGxCNT e' di 5 bit (bit 8-12), quindi l'indirizzo
// del tilemap e' schermo * 0x800 con schermo da 0 a 31: oltre 31 * 0x800 =
// 0xF800 non si arriva. Per questo tutti i tilemap stanno sotto 0xF800.
//
// Nota: in 8bpp BG0 legge un solo screenblock, perche' una voce di tilemap e'
// di 2 byte anche in 8bpp e 32x32 voci sono 2 KB esattamente. Serve pero' un
// solo charblock (16 KB) di tile, non due.
//---------------------------------------------------------------------------------
// Il mondo e' su BG0 (8bpp) e il testo su BG1 (4bpp). I due tilemap devono
// avere lo STESSO screenblock dei rispettivi registri in gfx.c: BG0 legge da
// SB(26) e BG1 da SB(24). Se qui si scambiano, il mondo finisce nel tilemap
// del testo e lo schermo resta quello che disegna l'HUD.
#define MAP_BG0       SB(26)         // 0x0D000: il mondo (BG0, 8bpp)
#define MAP_BG0_LEN   0x800

#define MAP_BG1       SB(24)         // 0x0C000: testo e HUD (BG1, 4bpp)
#define MAP_BG1_LEN   0x800

// Schermate di riserva: il Registro delle Taglie, i menu, le cutscene.
#define MAP_SPARE     SB(27)         // 0x0D800
#define MAP_SPARE_LEN 0x1400

//---------------------------------------------------------------------------------
// Indici dei tile
//
// I tile del mondo sono in BG1 in 4bpp: 512 tile per charblock, indice 0..511.
// I tile del font sono in BG0 in 8bpp: 256 tile per charblock, indice 0..255.
// I due spazi sono indipendenti, quindi entrambi possono partire da 0.
//---------------------------------------------------------------------------------
enum {
	// BG1 4bpp: il mondo, campionato sulla rampa della carta.
	T_FLOOR_A = 0,
	T_FLOOR_B,
	T_FLOOR_C,
	T_WALL_A,
	T_WALL_B,
	T_WALL_C,
	T_DESK,          // banco di scrittura della Cancelliera
	T_STOOL,
	T_SHELF,         // scaffale dei registri
	T_DOOR_CLOSED,
	T_DOOR_OPEN,
	T_POOL,          // pozzo della Buca
	T_INK,           // pozza d'inchiostro
	T_PAGE_ERASE,    // pagina cancellata: solo il contorno del testo
	T_TEAR,          // strappo sulla carta
	T_STITCH,        // punto di cucitura
	T_BONE,
	T_NUM_WORLD
};

enum {
	T_PROP_DESK = 0,
	T_PROP_STOOL,
	T_PROP_SHELF,
	T_PROP_WELL,
	T_PROP_INK,
	T_PROP_DOOR,
	T_PROP_PAGE,
	T_PROP_STITCH,
	T_NUM_PROPS
};

// Font 5x7 dentro il tile 8x8, piu' i nove tile del bordo.
// Ordine dei tile in BG1 (4bpp, charblock 1). Deve restare contiguo e senza
// buchi: un buco fa scivolare l'intero alfabeto di una posizione e il testo
// esce con lettere sbagliate senza che nulla sembri rotto.
#define T_FONT_BASE   0
#define T_FONT_GLYPHS 63             // da ' ' (0x20) a '^' (0x5E)

// T_EMPTY e' il tile completamente vuoto: in 4bpp l'indice colore 0 e'
// trasparente, quindi questo tile non disegna niente e lascia vedere BG0.
// Viene subito dopo il font.
#define T_EMPTY      (T_FONT_BASE + T_FONT_GLYPHS)

// I nove tile del box: 3 bordi in alto, 3 nel mezzo, 3 in basso.
#define T_BOX_BASE   (T_EMPTY + 1)
#define T_NUM_FONT_BLOCK (T_BOX_BASE + 9 - T_FONT_BASE)

enum {
	T_BOX_TL = T_BOX_BASE, T_BOX_T, T_BOX_TR, T_BOX_L,
	T_BOX_BG, T_BOX_R, T_BOX_BL, T_BOX_B, T_BOX_BR
};

//---------------------------------------------------------------------------------
// L'HUD
//
// Quante righe di tile occupa l'interfaccia in alto. La finestra WIN0 copre
// esattamente queste: dentro ci sono mondo e testo, fuori solo il mondo.
#define HUD_ROWS  4

//---------------------------------------------------------------------------------
// Palette
//
// BG: 16 bank da 16 colori. OBJ: altre 16, ma le bank 12-15 sono specchi
// hardware delle 0-3, quindi usarle sembra funzionare e poi disegna con i
// colori sbagliati. Restano 12 bank OBJ utilizzabili.
//---------------------------------------------------------------------------------
#define PAL_BG_BASE   0x05000000
#define PAL_OBJ_BASE  0x05000200
#define PAL_BANK_SIZE 32            // 16 colori da 2 byte

// Bank e indici di palette.
//
// FATTO VERIFICATO SUL ROM: BG1 in 4bpp usa la bank 0, cioe' le voci 0-15.
// Non la bank 1, e i bit 12-15 della voce di tilemap non cambiano nulla
// (quelli valgono solo per gli sprite). La sonda che l'ha accertato colorava
// ogni bank di un grigio diverso e leggeva il grigio sullo schermo.
//
// Con il mondo su BG1 in 4bpp e l'HUD su BG0 in 8bpp:
//
//   BG1 4bpp  bank 0  ->  voci 0-15   : le 16 tonalita' della carta
//   BG0 8bpp  indici  ->  voci 16-31  : il testo e l'HUD
//
// e i due non si pestano. Il page tint riscrive 0-15 e non tocca mai il testo,
// che e' esattamente il motivo per cui stanno su bank diverse.
//---------------------------------------------------------------------------------
enum {
	PB_UI_LO = 0,              // voci 0-15: BG1 in 4bpp, testo e HUD
	PB_UI_HI = 0,
	PB_BG_MAX = 15
};

// Primo indice di palette del mondo. BG0 e' in 8bpp e usa gli indici 0-255
// come voci dirette, quindi comprende anche quelli del testo: per questo il
// mondo parte da 16 e i primi 16 restano al testo.
//
// Il page tint riscrive da qui in su e non tocca mai l'HUD.
#define PAL_WORLD_BASE  16

// Bank OBJ: una per personaggio, cosi' cancellare qualcuno e' scrivere una
// rampa di grigi nella sua bank e nulla altro.
enum {
	PO_OTTAVA = 0,
	PO_BIEN = 1,
	PO_FERRO = 2,
	PO_VOCE = 3,               // condivide il colore con Ottava: vedi palette.c
	PO_ENEMY = 4,
	PO_EFFECT = 5,
	PO_ERASED = 6,             // aspetto dei cancellati
	PO_OBJ_MAX = 11            // 12-15 sono specchi di 0-3, non usabili
};

//---------------------------------------------------------------------------------
// Verifiche di layout.
//
// Ogni assert fallisce al compile se due regioni si sovrappongono o se una
// esce dai 96 KB utilizzabili. Meglio un errore di compilazione che una
// pagina a macchie di leopardo.
//---------------------------------------------------------------------------------
#define VRAM_OVERLAP(a, b) \
	((a) < ((b) + (b ## _LEN)) && (b) < ((a) + (a ## _LEN)))

_Static_assert(VRAM_BASE + TILE_BG0_LEN <= VRAM_BASE + VRAM_BYTES, "tile BG0 fuori VRAM");
_Static_assert(VRAM_BASE + TILE_BG1_LEN <= VRAM_BASE + VRAM_BYTES, "tile BG1 fuori VRAM");
_Static_assert(VRAM_BASE + TILE_OBJ_LEN <= VRAM_BASE + VRAM_BYTES, "tile OBJ fuori VRAM");
_Static_assert(VRAM_BASE + MAP_SPARE_LEN <= VRAM_BASE + VRAM_BYTES, "tilemap fuori VRAM");

// Nessuna sovrapposizione fra tile e tilemap.
_Static_assert(!VRAM_OVERLAP(TILE_BG0, TILE_BG1), "BG0/BG1 tile sovrapposti");
_Static_assert(!VRAM_OVERLAP(TILE_BG1, TILE_OBJ), "BG1/OBJ tile sovrapposti");
_Static_assert(!VRAM_OVERLAP(TILE_BG0, MAP_BG0), "BG0 tile/HUD map sovrapposti");
_Static_assert(!VRAM_OVERLAP(TILE_BG1, MAP_BG1), "BG1 tile/mondo map sovrapposti");
_Static_assert(!VRAM_OVERLAP(TILE_OBJ, MAP_BG0), "OBJ tile/HUD map sovrapposti");

// I tilemap non devono toccarsi fra loro.
_Static_assert(!VRAM_OVERLAP(MAP_BG0, MAP_BG1), "HUD/mondo map sovrapposti");
_Static_assert(!VRAM_OVERLAP(MAP_BG1, MAP_SPARE), "mondo/spare sovrapposti");
_Static_assert(!VRAM_OVERLAP(MAP_BG0, MAP_SPARE), "HUD/spare sovrapposti");

// Il limite che mi e' costato due build: ogni tilemap deve stare dove il campo
// a 5 bit puo' arrivare, cioe' sotto 0x10000 con SIZE = 0.
_Static_assert(MAP_BG0   < VRAM_BASE + 0x10000, "HUD map irraggiungibile");
_Static_assert(MAP_BG1   < VRAM_BASE + 0x10000, "mondo map irraggiungibile");
_Static_assert(MAP_SPARE < VRAM_BASE + 0x10000, "spare map irraggiungibile");
_Static_assert(MAP_SPARE + MAP_SPARE_LEN <= VRAM_BASE + 0xF800,
               "i tilemap devono stare entro 0xF800 (limite del campo a 5 bit)");

// I tile del mondo devono stare in un charblock 4bpp (512 tile) e il font in
// un charblock 8bpp (256 tile).
_Static_assert(T_NUM_WORLD < 512, "tile del mondo oltre 512");
_Static_assert(T_NUM_FONT_BLOCK <= 256, "font oltre i 256 tile 8bpp");

#endif // VRAM_H