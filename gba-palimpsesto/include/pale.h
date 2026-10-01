//---------------------------------------------------------------------------------
// Palimpsesto - costanti globali e tipi condivisi
//
// Il mondo e' una pagina scritta male: per correggere una riga, la spedizione
// deve cancellare una riga di se'. Questo header raccoglie tutto cio' che
// battle.c, map.c e i test host devono vedere identico.
//---------------------------------------------------------------------------------
#ifndef PALIMPSESTO_H
#define PALIMPSESTO_H

// Nel banco di prova host i tipi base arrivano da hostshim.h; sul ROM da
// libtonc. battle.c e battle_ai.c non toccano mai nessuno dei due.
#ifdef PALIMPSESTO_HOST
#include "hostshim.h"
#else
#include <tonc_types.h>
#endif

#include "vram.h"

#define SCREEN_W  240
#define SCREEN_H  160

//---------------------------------------------------------------------------------
// Mappa
//
// 32x20 tile da 8px = 256x160 px. Lo schermo e' largo 240, quindi la camera
// scrolla di 16px in orizzontale e non in verticale (160 = altezza esatta):
// un mondo piu' alto richiederebbe gia' una seconda riga di BG.
//---------------------------------------------------------------------------------
#define MAP_W      32
#define MAP_H      20

//---------------------------------------------------------------------------------
// Personaggi
//
// Tre combattenti piu' un NPC che non combatte ma ha una palette: La Voce
// condivide la bank di Ottava perche' in un palinsesto due personaggi legati
// dalla stessa riga non possono avere due colori.
//---------------------------------------------------------------------------------
enum {
	ACTOR_OTTAVA = 0,
	ACTOR_BIEN,
	ACTOR_FERRO,
	ACTOR_VOCE,       // NPC, non combatte
	ACTOR_MAX
};

enum {
	ROLE_CANCELLIERA,  // Ottava: non attacca, ordina
	ROLE_CENSORE,      // Bien: tank, parry che cura la squadra
	ROLE_RISCRITTORE,  // Ferro: danno alto, HP bassi
	ROLE_CANTANTE      // La Voce: solo hub
};

// Sigilli: l'identita' di cancellazione di ciascuno.
enum {
	SIG_BOTTONE,       // Ottava
	SIG_PUNIZIONE,     // Bien
	SIG_SOVRAPPONGO,   // Ferro
	SIG_NESSUNO        // La Voce
};

// Personaggi cancellati. Nessun ripristino: e' il punto del gioco.
typedef struct {
	u8 id;
	u8 role;
	u8 sigil;

	s16 hp;            // HP individuali
	s16 hp_max;

	u8 clarity;        // Chiarezza 0..3, risorsa per personaggio
	u8 stitches;       // Cuciture rimaste per questa battaglia

	u8 erased;         // 1 = cancellato, non torna piu'
	u8 in_party;       // 1 = schierato nel gruppo corrente

	// Riferimento al banco palette OBJ: e' cosi' che la cancellazione e' una
	// scrittura e non un caso sparso nel renderer.
	u8 pal_bank;
} Actor;

//---------------------------------------------------------------------------------
// Risorse di squadra
//---------------------------------------------------------------------------------
#define FILO_START       120
#define FILO_PER_STAMPA  8

#define CLARITY_MAX      3

//---------------------------------------------------------------------------------
// Sigilli nemici
//
// Le "righe" del nemico. Ogni riga ha una reazione attiva e una debolezza:
// e' il corrispondente del sistema Gradient di Expedition 33, reso come
// difesa materiale che si stacca invece che una barra che si riempie.
//---------------------------------------------------------------------------------
enum {
	REACT_NONE = 0,
	REACT_CORSIVA,      // immune a Traccia, a ogni colpo "scorre" altrove
	REACT_CEDIGIONE,    // +1 attacco per ogni membro perso in battaglia
	REACT_MARGINALIA,   // genera una Nota ogni 2 turni
	REACT_INTERROGAZIONE// a fine turno drena Filo se c'e' un cancellato
};

#define SIGILLI_MAX      3
#define SEGNALIBRI_MAX   3      // 3 segnalibri = stacco della riga

//---------------------------------------------------------------------------------
// Stato di gioco
//---------------------------------------------------------------------------------
enum {
	SCENE_TITLE = 0,
	SCENE_ATELIER,
	SCENE_PAGE,        // dentro una pagina (corridoio)
	SCENE_BATTLE,
	SCENE_REGISTRO     // schermata del Registro delle Taglie
};

// Le tre righe che si cancellano a ogni Confronto. Nessuna e' reversibile.
enum {
	CUT_NONE = 0,
	CUT_SKILL,         // un personaggio perde una skill per sempre
	CUT_PASSO,         // un personaggio non puo' piu' usare Rientro
	CUT_NOME,          // chi e' colpito smette di essere chiamato per nome
	CUT_VOCE,          // La Voce sparisce e il suo canale audio si spegne
	CUT_RIGA_BIANCA,   // opzione nulla: non costa, non ricompensa
	CUT_COUNT
};

typedef struct {
	s16 filo;              // HP di squadra
	s16 filo_max;

	u8 scene;
	u8 chapter;            // 0 = Atto I, 1 = Atto II

	// Taglie applicate. cuts_mask ha un bit per CUT_*.
	u8 cuts_mask;

	// Sfondo di pagina: quante volte la pagina e' stata corretta. Ogni
	// correzione desatura un filo di colore il mondo.
	u8 page_fades;

	Actor party[ACTOR_MAX];

	u8 stamps;             // stampe fatte (checkpoint)

	u8 player_x, player_y; // posizione nella pagina
	u8 facing;

	u8 cut_pending;        // CUT_* da applicare al prossimo Confronto

	// Il colore della Voce: se e' stata tagliata, non suona piu'.
	u8 voce_muted;
} Game;

extern Game g_game;

//---------------------------------------------------------------------------------
// Moduli
//---------------------------------------------------------------------------------

// Le due voci di palette del testo: fondo e primo piano. In 4bpp servono solo
// queste due, quindi il resto della bank resta libero per i box e le icone.
#define UI_BG   1   // fondo dei glifi: nero pieno
#define UI_FG   2   // tratti del testo: bianco

// gfx.c
void gfx_init(void);
void gfx_build_tiles(void);
void gfx_build_font(void);
void gfx_clear_layer(volatile u16 *map, u16 tile);
void gfx_text(volatile u16 *map, int x, int y, const char *s, u16 tile_base);
void gfx_text_center(volatile u16 *map, int y, const char *s, u16 tile_base);
void gfx_hex(volatile u16 *map, int x, int y, u16 v);

// Quattro mezzeparole di 16 bit con l'etichetta davanti, tutto su una riga:
// e' il formato con cui si legge un registro o un blocco di memoria senza
// dover ricordare a cosa si riferisce ogni colonna.
void gfx_hex4(volatile u16 *map, int x, int y, const char *tag,
              u16 a, u16 b, u16 c, u16 d);
void gfx_box(volatile u16 *map, int top, int bot);
void gfx_vram_write(volatile u32 *dst, const u8 *src, int bytes);
u16 gfx_glyph(char c);

// palette.c
void pal_init(void);
void pal_write_bank(volatile u16 *base, int bank, const u16 *colors);
void pal_erase_actor(int actor_id);
void pal_actor(int actor_id);
void pal_page_tint(int level);
int  pal_tint_level(void);
void pal_bank_clear(int obj_bank);

// input.c
void input_init(void);
void input_poll(void);
int  input_hit(u16 mask);
int  input_held(u16 mask);
int  qte_arm(u16 keys);
int  qte_poll(void);
int  qte_frames_left(void);
void qte_reset(void);
void qte_set_slow(int slow);
int  qte_is_slow(void);

// map.c
void map_load_page(int chapter);
void map_draw(void);
int  map_blocked(int x, int y);
char map_char(int x, int y);
void map_camera(int px, int py);

// Lo scorrimento corrente della camera, in pixel. Gli sprite stanno in
// coordinate di SCHERMO mentre la mappa e' in coordinate di MONDO: senza
// questo offset i personaggi resterebbero fermi mentre la carta scorre
// sotto di loro.
int map_camera_hofs(void);
int map_camera_vofs(void);

// actor.c
void actor_build_tiles(void);
void actor_init(void);
void actor_place_party(int cx, int cy);
void actor_update_oam(void);
void actor_set_facing(int dir);

// battle.c - logica pura, compilabile sul PC
#include "battle.h"

// battle.c
s16  battle_traccia_damage(void);
s16  battle_cancella_base(void);

#endif // PALIMPSESTO_H