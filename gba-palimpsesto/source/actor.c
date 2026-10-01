//---------------------------------------------------------------------------------
// Palimpsesto - attori
//
// I personaggi sono sprite OBJ, non tile di BG, perche' ogni personaggio ha la
// sua bank di palette OBJ: e' cosi' che cancellare qualcuno e' scrivere quattro
// righe in palette.c e non un caso speciale in due file di rendering.
//
// Sprite 16x16 in 4bpp: 4 tile per frame. Otto frame per personaggio (quattro
// direzioni x passo), quindi 32 tile a testa. Con 512 tile 4bpp nel blocco
// oggetti ci stanno tutti e i nemici con margine.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_memmap.h>
#include <tonc_memdef.h>
#include <string.h>

//---------------------------------------------------------------------------------
// Arte
//
// Figure minime, 16x16, in stile incisione: busto in tre toni e contorno
// scuro. Non e' un limite di tempo, e' una scelta: in un gioco dove il colore
// porta il significato, le forme possono essere povere. Anzi, devono esserlo:
// se le figure fossero ricche, la perdita del colore peserebbe meno.
//
// Le lettere sono i tre colori propri del personaggio (0 = contorno scuro,
// 1 = tono medio, 2 = tono chiaro) piu' A/B/C per gli accenti.
//---------------------------------------------------------------------------------
static const char *const s_ottava[16] = {
	"................", ".....000000.....", "....01111110....",
	"...0111111110...", "...01A11111A10..", "...0111111110...",
	"...0333333330...", "..033333333330..", "..031333133130..",
	"..031111111130..", "..031111111130..", "...0333333330...",
	"...03DD3DD30....", "..0DD33DD330....", "..0DD33DD330....",
	"...0000000000..."
};

static const char *const s_bien[16] = {
	"................", "....00000000....", "...0111111110...",
	"..011111111110..", "..01A111111A10..", "..011111111110..",
	"..022222222220..", ".02222222222220.", ".02122222122120.",
	".02111111111120.", "..011111111110..", "..022222222220..",
	"..022222222220..", ".0220000000220..", ".0220000000220..",
	"..00000000000..."
};

static const char *const s_ferro[16] = {
	"................", ".....000000.....", "....01111110....",
	"...0111111110...", "...0111111110...", "...0A111111A10...",
	"...0333333330...", "..033333333330..", "..031333133130..",
	"..031111111130..", "..031111111130..", "..033333333330..",
	"...03CC3CC30....", "..0CC33CC330....", "..0CC33CC330....",
	"...0000000000..."
};

// Un cancellato e' lo stesso contorno, senza i tre colori propri. La differenza
// e' che qui i toni sono gia' grigi: quindi il personaggio non cambia aspetto
// in un colpo solo, smette semplicemente di essere colorato.
static const char *const s_erased[16] = {
	"................", ".....000000.....", "....00000000....",
	"...0000000000...", "...00A00000A00..", "...0000000000...",
	"...0000000000...", "..000000000000..", "..000000000000..",
	"..000000000000..", "..000000000000..", "...0000000000...",
	"...0000000000...", "..000000000000..", "..000000000000..",
	"...0000000000..."
};

// La Voce: senza cappello, piu' stretta, e un segno di bocca aperta. E' l'unica
// che non combatte, e si vede.
static const char *const s_voce[16] = {
	"................", "......0000......", ".....011110.....",
	"....01111110....", "...01A1111A10...", "...0111111110...",
	"...0333333330...", "..033333333330..", "..031333133130..",
	"..03B111111B30..", "..03B111111B30..", "..033333333330..",
	"...0333333330...", "...0CC3333CC0...", "...0CC3333CC0...",
	"...0000000000..."
};

// Il nemico: non e' una persona, e' una riga di testo che si e' accorta di
// esistere. Due solchi orizzontali al posto degli occhi.
static const char *const s_enemy[16] = {
	"................", "....00000000....", "...0000000000...",
	"..00AA000000A0..", "..0AA00AA000A0..", "..000000000000..",
	"..011111111110..", ".01111111111110.", ".01100000000110.",
	".01110000001110.", ".01111111111110.", ".01111111111110.",
	"..011111111110..", "..022222222220..", "..0220000000220..",
	"...0000000000..."
};

static u8 s_obj_tile[TILE_OBJ_LEN / 32];

// Nell'OAM in 4bpp l'indice 0 e' TRASPARENTE, non nero.
//
// Con la mappa che avevo prima, il punto('.') e il contorno('0') finivano
// entrambi a indice 0: il contorno spariva e restava solo qualche pixel
// colorato, e sullo schermo si vedeva una macchiolina al posto di un
// personaggio. Ora il punto e' l'unico a valere 0 e i colori partono da 1.
static u8 art_pal(char c)
{
	switch (c) {
	case '.': return 0;                 // trasparente
	case '0': return 1;                 // contorno
	case '1': return 2;                 // tono medio
	case '2': return 3;                 // tono chiaro
	case '3': return 4;                 // ombra
	case 'A': return 5;                 // accento 1
	case 'B': return 6;                 // accento 2
	case 'C': return 7;
	default:  return 0;
	}
}

//---------------------------------------------------------------------------------
// Costruzione dei tile 4bpp
//---------------------------------------------------------------------------------
static void put_frame(int tile_base, const char *const art[16])
{
	u8 tile[4][64];
	int ty, tx, y, x;

	memset(tile, 0, sizeof(tile));

	for (ty = 0; ty < 2; ty++) {
		for (tx = 0; tx < 2; tx++) {
			for (y = 0; y < 8; y++) {
				for (x = 0; x < 8; x += 2) {
					// 4bpp: due pixel per byte, il primo nei bit alti.
					tile[ty * 2 + tx][y * 8 + x] =
						(u8)(art_pal(art[ty * 8 + y][tx * 8 + x]) << 4
						   | art_pal(art[ty * 8 + y][tx * 8 + x + 1]));
				}
			}
		}
	}

	// Un OBJ 16x16 non legge quattro tile consecutivi: legge N, N+1, N+32 e
	// N+33, dove N e' l'indice scritto in attr2. Con la mappa 1D la riga
	// inferiore sta 32 tile piu' in basso, non 2.
	//
	// Scrivere i quattro tile in fila (N, N+1, N+2, N+3) e' il modo piu'
	// naturale di guardare un 2x2 e il modo sbagliato: l'hardware leggeva
	// N+32 e N+33, cioe' spazzatura, e il personaggio usciva a meta' o
	// spariva del tutto.
	for (ty = 0; ty < 2; ty++) {
		for (tx = 0; tx < 2; tx++) {
			int idx = tile_base + tx + ty * 32;
			// 4bpp: 32 byte per tile.
			gfx_vram_write((volatile u32 *)(TILE_OBJ + idx * 32),
			                tile[ty * 2 + tx], 32);
			s_obj_tile[idx] = 1;
		}
	}
}

//---------------------------------------------------------------------------------
// Gli slot dei tile OBJ.
//
// Un frame 16x16 occupa quattro tile ma NON quattro indici consecutivi: con la
// mappa 1D l'hardware legge N, N+1, N+32, N+33. Servono quindi 34 indici, e il
// frame successivo non puo' stare a N+4 come sembra naturale.
//
// T_FRAME_STRIDE e' il passo reale fra un frame e il successivo: 34, non 4.
// Con 4 i frame si sovrapponevano a meta' e ogni personaggio mostrava un
// quadrato disbilanciato.
//
// Con 34 il charblock OBJ da 512 tile ne regge 15, e i sei personaggi con due
// frame ciascuno ne usano 408. Le direzioni non hanno un disegno proprio:
// aggiungere quattro varianti e' un lavoro che si fa dopo, e fino ad allora il
// passo si legge dal movimento, non dall'arte.
//---------------------------------------------------------------------------------
#define T_FRAME_STRIDE   34
#define T_FRAME_ERASED   (5 * 2 * T_FRAME_STRIDE)

void actor_build_tiles(void)
{
	int a;

	for (a = 0; a < 6; a++) {
		const char *const *art;
		int base = a * 2 * T_FRAME_STRIDE;

		switch (a) {
		case 0: art = s_ottava;  break;
		case 1: art = s_bien;    break;
		case 2: art = s_ferro;   break;
		case 3: art = s_voce;    break;
		case 4: art = s_enemy;   break;
		default: art = s_erased; break;
		}

		// Due frame: passo aperto e passo chiuso.
		put_frame(base, art);
		put_frame(base + T_FRAME_STRIDE, art);
	}
}

//---------------------------------------------------------------------------------
void actor_init(void)
{
	int i;

	for (i = 0; i < ACTOR_MAX; i++) {
		Actor *a = &g_game.party[i];

		a->id = (u8)i;
		a->in_party = 1;
		a->erased = 0;
		a->clarity = 2;
		a->stitches = 1;
		a->sigil = SIG_NESSUNO;

		switch (i) {
		case ACTOR_OTTAVA:
			a->role = ROLE_CANCELLIERA;
			a->sigil = SIG_BOTTONE;
			a->hp = a->hp_max = 30;
			a->pal_bank = PO_OTTAVA;
			break;
		case ACTOR_BIEN:
			a->role = ROLE_CENSORE;
			a->sigil = SIG_PUNIZIONE;
			a->hp = a->hp_max = 55;
			a->pal_bank = PO_BIEN;
			break;
		case ACTOR_FERRO:
			a->role = ROLE_RISCRITTORE;
			a->sigil = SIG_SOVRAPPONGO;
			a->hp = a->hp_max = 40;
			a->pal_bank = PO_FERRO;
			break;
		default:
			a->role = ROLE_CANTANTE;
			a->sigil = SIG_NESSUNO;
			a->hp = a->hp_max = 1;
			a->in_party = 0;      // non combatte
			a->pal_bank = PO_VOCE;
			break;
		}

		pal_actor(i);
	}
}

//---------------------------------------------------------------------------------
// OAM
//
// Gli sprite si mettono in ordine di priorita' crescente: lo slot 0 e' quello in
// fondo. I personaggi cancellati prendono il set di tile "erased", che e'
// gia' in grigio: e' cosi' che la loro cancellazione si vede anche se per un
// errore la palette non venisse riscritta.
//---------------------------------------------------------------------------------
static int s_step_frame;

void actor_set_facing(int dir)
{
	g_game.facing = (u8)dir;
}

// actor_place_party: mette i tre combattenti in fila dietro al giocatore.
//---------------------------------------------------------------------------------
void actor_place_party(int cx, int cy)
{
	// Il giocatore e' sempre lo slot 0 in OAM. Gli altri lo seguono in
	// diagonale, come in una processione: la formazione racconta che sono
	// compagni, non un gruppo.
	g_game.player_x = (u8)cx;
	g_game.player_y = (u8)cy;
}

void actor_update_oam(void)
{
	volatile OBJ_ATTR *o = (volatile OBJ_ATTR *)MEM_OAM;
	static const int FX[4] = { 0, 0, -6, 6 };
	static const int FY[4] = { 6, -6, 0, 0 };
	int i;

	// SCLK: il passo cambia ogni 6 frame quando il personaggio si muove.
	s_step_frame = (s_step_frame + 1) & 15;

	for (i = 0; i < ACTOR_MAX; i++) {
		Actor *a = &g_game.party[i];
		int dir = g_game.facing;
		int sx, sy;
		int slot;

		// Solo i tre combattenti + La Voce hanno uno sprite in mappa. Un
		// personaggio cancellato resta visibile: e' il lutto, non un bug.
		if (i == ACTOR_VOCE) {
			// La Voce sta ferma al suo posto nell'Atelier.
			sx = 8 * 8 - 4;
			sy = 4 * 8 - 8;
			slot = 3;
		} else {
			// Gli altri seguono il giocatore: due passi indietro e uno a
			// lato, cosi' non si sovrappongono.
			int off = (i == ACTOR_OTTAVA) ? 0 : (i == ACTOR_BIEN ? 1 : 2);
			int ox = (off == 1) ? -7 : (off == 2 ? 7 : 0);
			int oy = (off == 0) ? 0 : (off == 1 ? 7 : -7);

			sx = g_game.player_x * 8 - 4 + ox;
			sy = g_game.player_y * 8 - 8 + oy;
			// Un slot per personaggio: con lo stesso slot per tutti, gli
			// ultimi due scrivono sopra il primo e del party si vede solo
			// l'ultimo.
			slot = i;
		}

		// Un cancellato non si muove piu' e non cambia passo: resta fermo,
		// grigio, nel punto in cui e' stato tolto.
		if (a->erased) {
			dir = 0;
			sx += FX[0];
			sy += FY[0];
		}

		// 16x16 = 4 tile in 2x2: l'indice del tile deve puntare alla colonna
		// alta a sinistra della figura.
		{
			// Il passo aperto/chiuso e' il frame pari/dispari. La
			// direzione non cambia il disegno: non c'e' ancora un'arte
			// per ogni faccia, e senza arte il frame si ferma sul primo.
			int tile_base = (a->erased ? T_FRAME_ERASED
			                           : a->id * 2 * T_FRAME_STRIDE)
			              + (s_step_frame & 1) * T_FRAME_STRIDE;
			int bank = (a->erased ? PO_ERASED : a->pal_bank);
			int vx, vy;

			if (a->id == ACTOR_VOCE && a->erased) bank = PO_ERASED;

			// Da coordinate di mondo a coordinate di schermo. L'OAM non
			// sa niente della camera: senza la sottrazione, gli sprite
			// resterebbero inchiodati a sinistra mentre il mondo scorre.
			vx = sx - map_camera_hofs();
			vy = sy - map_camera_vofs();

			// Un OAM con Y = 0xFF e Y-in-modalita'-finestra accesa finisce
			// fuori schermo invece che in cima: spingo giu' di un pixel
			// tutto quello che sta sopra la riga 0.
			if (vy < 0) vy = 0;
			if (vx < 0) vx = 0;
			if (vy > 255) vy = 255;
			if (vx > 511) vx = 511;

			// L'OAM ha uno scarto di 16 px sulla Y: la riga disegnata e'
			// OBJ_Y + 16, quindi per mettere la figura a vy il registro
			// deve dire vy + 16. Dimenticarlo non e' uno scarto di 16 px
			// ma uno di 16 px verso il basso, e il personaggio cammina
			// "dentro" il pavimento.
			//
			// Sulla X non c'e' scarto: la colonna disegnata e' OBJ_X.
			//
			// Il bit 12 di attr0 e' il MODO OBJ (0 normale, 1
			// semitrasparente, 2 finestra): nessuno dei due serve qui.
			// Il bit 14 di attr1 e' la dimensione: 1 = 16x16.
			o[slot].attr0 = (u16)(vy + 16);
			// Bit 14 di attr1 = 16x16. Bit 12 = specchio orizzontale:
			// serve per il passo a sinistra, che senza il specchio avrebbe
			// il piede sbagliato.
			o[slot].attr1 = (u16)(vx | (1 << 14)
			                    | ((dir == 2) ? (1 << 12) : 0));
			o[slot].attr2 = (u16)(tile_base | (bank << 12));
		}
	}

	// Nascondiamo il resto degli slot. Senza questo gli sprite usati da una
	// scena precedente restano sullo schermo nella schermata dopo.
	for (i = 4; i < 128; i++)
		o[i].attr0 = 0x0200;
}