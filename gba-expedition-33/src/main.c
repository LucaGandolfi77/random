/*==============================================================================
 *  EXPEDITION 33
 *  Un gioco RPG in stile Pokemon per Game Boy Advance, ispirato alla trama,
 *  ai personaggi e al lore di "Clair Obscur: Expedition 33".
 *
 *  - Mode 0, un solo BG0 (8bpp): il mondo scorre con la camera che segue il
 *    giocatore, come nei Pokemon.
 *  - 3 mappe scrollabili 64x64: LUMIERE (la citta), IL CONTINENTE (le terre
 *    selvagge) e LA PIANA DEL MONOLITE.
 *  - Movimento a griglia stile Pokemon (4 direzioni + passo).
 *  - Storia: la PEINTRESSE dipinge il numero 33 sul MONOLITE, chi ha quell'eta
 *    sparisce nel GOMMAGE. Gustave raduna la Spedizione 33: Maelle, Lune,
 *    Sciel, e parte con Esquie verso il Continente per fermarla.
 *  - Personaggi: GUSTAVE (protagonista), MAELLE, LUNE, SCIEL, SOPHIE, VERSO,
 *    MONOCO, ESQUIE, RENOIR, LA PEINTRESSE.
 *  - Dialoghi a pagine, quest a catena, transizioni con fade tra le aree,
 *    schermata titolo con il Monolite e scena finale.
 *
 *  Build con devkitPro:  make
 *============================================================================*/

#include <gba_base.h>
#include <gba.h>
#include <string.h>

/*------------------------------------------------------------------------------
 * Configurazione
 *---------------------------------------------------------------------------*/
#define MAP_W         32          /* screenblock width                        */
#define VIS_W         30          /* visible columns (240px / 8)              */
#define VIS_H         20          /* visible rows (160px / 8)                 */
#define WORLD_SZ      64          /* world map tiles per side (64x64)         */
#define MOVE_TICKS    4           /* frame per tile                           */
#define MSG_TIME      150         /* frame durata messaggio                   */
#define FADE_MAX      16          /* frame fade out/in                        */

#define CAM_MAX_X     (WORLD_SZ * 8 - 240)   /* 272                          */
#define CAM_MAX_Y     (WORLD_SZ * 8 - 160)   /* 352                          */

#define BOX_TOP       16
#define BOX_LINE1     17
#define BOX_LINE2     18
#define BOX_BOT       19

/* VRAM: tile BG0 (charblock 0), screenblock 20, tile OBJ (charblock 4)     */
#define BG0_TILES ((volatile u16 *)0x06000000)
#define BG0_MAP   ((volatile u16 *)0x0600A000)
#define OBJ_TILES ((volatile u16 *)0x06010000)
#define OBJ_OAM   ((volatile OBJATTR *)0x07000000)

/* Indici tile BG0 (8bpp)                                                   */
enum {
    T_BG = 0, T_GRASS, T_GRASS2, T_GRASS3, T_TALL,
    T_COB1, T_COB2, T_COB3, T_STREET, T_STREET2,
    T_PAV1, T_PAV2, T_WAT1, T_WAT2, T_WAT3, T_WAT4,
    T_TREE, T_TREES, T_WALL, T_WINDOW, T_DOOR,
    T_ROOF, T_ROOF2, T_LAMP, T_FOUNT, T_MONO, T_MONO2, T_MONOG,
    T_MOUNT, T_MIST, T_ROCK, T_DIRT, T_CRATE,
    T_FLOWR, T_FLOWG, T_FLOWL, T_BRIDGE, T_STAR, T_MOON
};
#define T_BOX_BASE  40
#define T_TEXT_BASE 49
#define T_GOLD_BASE 108
#define T_BIG_BASE  167

/* Mappe: leggenda dei caratteri                                           */
/* . erba  , erba2  e erba3  g erba alta  c/C/k selciato  s/S strada       */
/* p/P marciapiede  w/W/v/V acqua  t/T albero  H muro  h muro+finestra     */
/* d porta  o/O tetto  l lampione  f fontana  M/m/G monolite  # montagna  */
/* n nebbia  x roccia  r terra  u cassa  1/2/3 fiori  b ponte             */

#define P  "WWwwWwwtp"   /* canale + albero + marciapiede (prefisso LUMIERE)  */
#define PP "ppppppppp"   /* molo (prefisso)                                    */
#define C8 "cccccccc"
#define P8 "pppppppp"
#define S8 "ssssssss"
#define O8 "oooooooo"
#define H8 "hhhhhhhh"
#define G8 "........"
#define N8 "########"
#define R8 "rrrrrrrr"
#define W8 "WWWWWWWW"

/*--- LUMIERE ---------------------------------------------------------------*/
#define L0  P O8 O8 O8 O8 O8 O8 "oMMMMMM"
#define L1  P O8 O8 O8 O8 O8 O8 "oMMMMMM"
#define L2  P O8 O8 O8 O8 O8 O8 "MGMMMMM"
#define L3  P O8 O8 O8 O8 O8 O8 "MGGMMMM"
#define L4  P O8 O8 O8 O8 O8 O8 "mMMMMMm"
#define L5  P O8 O8 O8 O8 O8 O8 "mMMMMMm"
#define L6  P O8 O8 O8 O8 O8 O8 "mMMMMMm"
#define L7  P O8 O8 O8 O8 O8 O8 "nnnnnnn"
#define L8  P H8 H8 H8 H8 H8 H8 "nnnnnnn"
#define L9  P H8 H8 H8 H8 H8 H8 "nnnnnnn"
#define L10 P H8 H8 H8 H8 H8 H8 "nnnnnnn"
#define L11 P H8 H8 H8 H8 H8 H8 "nnnnnnn"
#define L12 P H8 H8 H8 H8 H8 H8 "nnnnnnn"
#define L13 P H8 H8 H8 "hhhdhhhh" H8 H8 "nnnnnnn"
#define L14 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L15 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L16 P S8 S8 S8 S8 S8 S8 "sssssss"
#define L17 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L18 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L19 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L20 P C8 "lccccccc" C8 C8 C8 "cccccccl" "ccccccc"
#define L21 P "c1cccccc" C8 "cc2ccccc" C8 "ccc3cccc" C8 "ccccccc"
#define L22 P C8 C8 C8 "ccccffff" "ffffcccc" C8 "ccccccc"
#define L23 P C8 C8 C8 "ccccffff" "ffffcccc" C8 "ccccccc"
#define L24 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L25 P "ccccccc1" C8 "cccc2ccc" C8 "ccccccc3" C8 "ccccccc"
#define L26 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L27 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L28 P S8 S8 S8 S8 S8 S8 "sssssss"
#define L29 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L30 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L31 P G8 G8 G8 "oooooooo" G8 "oooooooo" "......."
#define L32 P G8 G8 G8 "hhhhhhhh" G8 "hhhhhhhh" "......."
#define L33 P G8 G8 G8 "hhhdhhhh" G8 "hhhdhhhh" "......."
#define L34 P G8 G8 G8 "hhhhhhhh" G8 "hhhhhhhh" "......."
#define L35 P G8 G8 G8 "pppppppp" G8 "pppppppp" "......."
#define L36 P G8 "tttttttt" "..2....." G8 G8 G8 "......."
#define L37 P G8 "tttttttt" G8 G8 G8 G8 "......."
#define L38 P G8 "tttttttt" G8 G8 G8 G8 "......."
#define L39 P G8 "tttttttt" G8 G8 G8 G8 "......."
#define L40 P G8 "tttttttt" G8 G8 G8 G8 "......."
#define L41 P G8 G8 "....rrrr" "rr......" G8 G8 "......."
#define L42 P G8 G8 G8 G8 G8 G8 "......."
#define L43 P G8 "..t....." G8 "...t...." G8 "..t....." "......."
#define L44 P G8 G8 G8 G8 G8 G8 "......."
#define L45 P G8 "..t....." G8 G8 "...t...." G8 "......."
#define L46 P S8 S8 S8 S8 S8 S8 "sssssss"
#define L47 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L48 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L49 P P8 P8 P8 P8 P8 P8 "ppppppp"
#define L50 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L51 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L52 P C8 "clcccccc" C8 C8 C8 C8 "ccccccc"
#define L53 P C8 C8 "c1cccccc" C8 "cc3ccccc" C8 "ccccccc"
#define L54 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L55 P C8 C8 C8 C8 C8 C8 "ccccccc"
#define L56 PP C8 C8 C8 C8 C8 C8 "ccccccc"
#define L57 PP C8 C8 C8 C8 C8 C8 "ccccccc"
#define L58 PP C8 C8 C8 C8 C8 C8 "ccMMMcc"
#define L59 PP C8 C8 C8 C8 C8 C8 "ccMMMcc"
#define L60 PP C8 C8 C8 C8 C8 C8 "ccMMMcc"
#define L61 PP C8 C8 C8 C8 C8 C8 "ccmmmcc"
#define L62 PP C8 C8 C8 C8 C8 C8 "ccccccc"
#define L63 PP C8 C8 C8 C8 C8 C8 "ccccccc"

/*--- CONTINENTE ------------------------------------------------------------*/
#define K0  N8 N8 N8 N8 N8 N8 N8 N8
#define K1  N8 N8 N8 N8 N8 N8 N8 N8
#define K2  N8 N8 N8 N8 N8 N8 N8 N8
#define K3  N8 N8 N8 N8 N8 N8 N8 "MMGGMMMM"
#define K4  N8 N8 N8 N8 N8 N8 N8 "mMMMMMMm"
#define K5  N8 N8 N8 N8 N8 N8 N8 "mMMMMMMm"
#define K6  N8 N8 N8 "##rrrr##" N8 N8 N8 "nnnnnnnn"
#define K7  N8 N8 N8 "##rrrr##" N8 N8 N8 "nnnnnnnn"
#define K8_ N8 N8 N8 "##rrrr##" N8 N8 N8 "nnnnnnnn"
#define K9  N8 N8 N8 "##rrrr##" N8 N8 N8 "nnnnnnnn"
#define K10 "..t....." G8 "..t....." G8 "..t....." G8 "..t....." G8
#define K11 G8 "..g....." G8 "..g....." G8 "..g....." G8 G8
#define K12 G8 G8 "..x....." G8 "..x....." G8 G8 G8
#define K13 G8 G8 G8 "..n....." G8 "..n....." G8 G8
#define K14 "..t....." G8 G8 G8 G8 G8 "..t....." G8
#define K15 G8 "..g....." G8 G8 G8 "..g....." G8 G8
#define K16 G8 G8 G8 "..u....." G8 G8 G8 G8
#define K17 G8 G8 "..x....." G8 G8 "..x....." G8 G8
#define K18 G8 G8 G8 G8 G8 G8 G8 G8
#define K19 G8 "..g....." G8 G8 G8 G8 G8 G8
#define K20 G8 G8 "..n....." G8 "..n....." G8 "..n....." G8
#define K21 "..t....." G8 G8 G8 G8 G8 "..t....." G8
#define K22 G8 G8 G8 "..u....." G8 G8 G8 G8
#define K23 G8 G8 G8 G8 G8 G8 G8 G8
#define K24 G8 G8 G8 G8 G8 G8 G8 G8
#define K25 G8 "..g....." G8 G8 G8 "..g....." G8 G8
#define K26 G8 G8 G8 G8 G8 G8 G8 G8
#define K27 G8 G8 "..x....." G8 G8 G8 G8 G8
#define K28 G8 G8 G8 G8 G8 G8 G8 G8
#define K29 "..t....." G8 G8 G8 G8 G8 "..t....." G8
#define K30 G8 G8 G8 G8 G8 G8 G8 G8
#define K31 G8 G8 G8 G8 G8 G8 G8 G8
#define K32 G8 "..g....." G8 G8 G8 G8 G8 G8
#define K33 G8 G8 G8 G8 G8 G8 G8 G8
#define K34 G8 G8 "..n....." G8 G8 G8 G8 G8
#define K35 G8 G8 G8 G8 G8 G8 G8 G8
#define K36 G8 G8 G8 G8 G8 G8 G8 G8
#define K37 G8 "..t....." G8 G8 G8 "..t....." G8 G8
#define K38 G8 G8 G8 "..u....." G8 G8 G8 G8
#define K39 G8 G8 G8 G8 G8 G8 G8 G8
#define K40 G8 G8 G8 G8 G8 G8 G8 G8
#define K41 G8 "..g....." G8 G8 G8 G8 G8 G8
#define K42 G8 G8 G8 G8 G8 G8 G8 G8
#define K43 G8 G8 "..x....." G8 "..x....." G8 G8 G8
#define K44 G8 G8 G8 G8 G8 G8 G8 G8
#define K45 G8 G8 G8 G8 G8 G8 G8 G8
#define K46 G8 G8 G8 G8 G8 G8 G8 G8
#define K47 G8 "..t....." G8 G8 G8 "..t....." G8 G8
#define K48 G8 G8 G8 G8 G8 G8 G8 G8
#define K49 G8 G8 G8 G8 G8 G8 G8 G8
#define K50 G8 G8 G8 G8 G8 G8 G8 G8
#define K51 G8 G8 G8 G8 G8 G8 G8 G8
#define K52 G8 G8 G8 G8 G8 G8 G8 G8
#define K53 G8 G8 G8 G8 G8 G8 G8 G8
#define K54 "....rr.." G8 G8 G8 G8 G8 G8 G8
#define K55 "....rr.." G8 G8 G8 G8 G8 G8 G8
#define K56 "....rr.." G8 G8 G8 G8 G8 G8 G8
#define K57 "....rr.." G8 G8 G8 G8 G8 G8 G8
#define K58 R8 G8 G8 G8 G8 G8 G8 G8
#define K59 R8 G8 G8 G8 G8 G8 G8 G8
#define K60 R8 R8 R8 R8 R8 R8 R8 R8
#define K61 R8 R8 R8 R8 R8 R8 R8 R8
#define K62 W8 W8 W8 W8 W8 W8 W8 W8
#define K63 W8 W8 W8 W8 W8 W8 W8 W8

/*--- PIANA DEL MONOLITE ----------------------------------------------------*/
#define N0  C8 C8 C8 C8 C8 C8 C8 C8
#define N1  C8 C8 C8 C8 C8 C8 C8 C8
#define N2  C8 C8 C8 C8 C8 C8 C8 C8
#define N3  C8 C8 C8 C8 C8 C8 C8 C8
#define N4  C8 C8 C8 C8 C8 C8 C8 C8
#define N5  C8 C8 C8 C8 C8 C8 C8 C8
#define N6  C8 C8 C8 C8 C8 C8 C8 C8
#define N7  C8 C8 C8 C8 C8 C8 C8 C8
#define N8_ C8 C8 C8 C8 C8 C8 C8 C8
#define N9  C8 C8 C8 C8 C8 C8 C8 C8
#define N10 C8 C8 "ccGGGGMM" "MMMMcccc" C8 C8 C8 C8
#define N11 C8 C8 "ccGGGGMM" "MMMMcccc" C8 C8 C8 C8
#define N12 C8 C8 "ccMMMMMM" "MMMMcccc" C8 C8 C8 C8
#define N13 C8 C8 "ccMMMMMM" "MMMMcccc" C8 C8 C8 C8
#define N14 C8 C8 "ccMMMMMM" "MMMMcccc" C8 C8 C8 C8
#define N15 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N16 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N17 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N18 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N19 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N20 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N21 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N22 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N23 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N24 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N25 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N26 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N27 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N28 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N29 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N30 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N31 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N32 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N33 C8 C8 "ccmmmmmm" "mmmmcccc" C8 C8 C8 C8
#define N34 C8 C8 "ccnnnnnn" "nnnncccc" C8 C8 C8 C8
#define N35 C8 C8 "ccnnnnnn" "nnnncccc" C8 C8 C8 C8
#define N36 C8 C8 "ccnnnnnn" "nnnncccc" C8 C8 C8 C8
#define N37 C8 C8 C8 C8 C8 C8 C8 C8
#define N38 C8 C8 C8 C8 C8 C8 C8 C8
#define N39 C8 C8 C8 C8 C8 C8 C8 C8
#define N40 "xccccccc" C8 C8 C8 C8 C8 C8 C8
#define N41 C8 C8 C8 C8 C8 C8 C8 C8
#define N42 C8 C8 C8 C8 C8 C8 "ccxccccc" C8
#define N43 C8 C8 C8 C8 C8 C8 C8 C8
#define N44 C8 C8 C8 "cccxcccc" C8 C8 C8 C8
#define N45 C8 C8 C8 C8 C8 C8 C8 C8
#define N46 C8 C8 C8 C8 C8 C8 C8 C8
#define N47 C8 C8 C8 C8 C8 C8 C8 C8
#define N48 C8 C8 C8 C8 C8 "ccccxccc" C8 C8
#define N49 C8 C8 C8 C8 C8 C8 C8 C8
#define N50 C8 C8 C8 C8 C8 C8 C8 C8
#define N51 C8 C8 C8 C8 C8 C8 C8 C8
#define N52 C8 C8 C8 C8 C8 C8 C8 "cccucccc"
#define N53 C8 C8 C8 C8 C8 C8 C8 C8
#define N54 C8 C8 C8 C8 C8 C8 C8 C8
#define N55 C8 C8 C8 C8 C8 C8 C8 C8
#define N56 C8 C8 "cucccccc" C8 C8 C8 C8 C8
#define N57 C8 C8 C8 C8 C8 C8 C8 C8
#define N58 C8 C8 C8 C8 C8 C8 C8 C8
#define N59 C8 C8 C8 C8 C8 C8 C8 C8
#define N60 C8 C8 C8 C8 C8 C8 C8 C8
#define N61 C8 C8 C8 C8 C8 C8 C8 C8
#define N62 C8 C8 C8 C8 C8 C8 C8 C8
#define N63 C8 C8 C8 C8 C8 C8 C8 C8

static const char *const MAP0[WORLD_SZ] = {
    L0,L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,
    L16,L17,L18,L19,L20,L21,L22,L23,L24,L25,L26,L27,L28,L29,L30,L31,
    L32,L33,L34,L35,L36,L37,L38,L39,L40,L41,L42,L43,L44,L45,L46,L47,
    L48,L49,L50,L51,L52,L53,L54,L55,L56,L57,L58,L59,L60,L61,L62,L63
};
static const char *const MAP1[WORLD_SZ] = {
    K0,K1,K2,K3,K4,K5,K6,K7,K8_,K9,K10,K11,K12,K13,K14,K15,
    K16,K17,K18,K19,K20,K21,K22,K23,K24,K25,K26,K27,K28,K29,K30,K31,
    K32,K33,K34,K35,K36,K37,K38,K39,K40,K41,K42,K43,K44,K45,K46,K47,
    K48,K49,K50,K51,K52,K53,K54,K55,K56,K57,K58,K59,K60,K61,K62,K63
};
static const char *const MAP2[WORLD_SZ] = {
    N0,N1,N2,N3,N4,N5,N6,N7,N8_,N9,N10,N11,N12,N13,N14,N15,
    N16,N17,N18,N19,N20,N21,N22,N23,N24,N25,N26,N27,N28,N29,N30,N31,
    N32,N33,N34,N35,N36,N37,N38,N39,N40,N41,N42,N43,N44,N45,N46,N47,
    N48,N49,N50,N51,N52,N53,N54,N55,N56,N57,N58,N59,N60,N61,N62,N63
};
static const char *const *const WORLDS[3] = { MAP0, MAP1, MAP2 };

/*------------------------------------------------------------------------------
 * Arte: stringhe -> pixel
 *---------------------------------------------------------------------------*/
static u8 art_pal(char c)
{
    if (c >= '0' && c <= '9') return (u8)(c - '0');
    if (c >= 'A' && c <= 'Z') return (u8)(10 + c - 'A');
    if (c >= 'a' && c <= 'z') return (u8)(36 + c - 'a');
    return 0;
}

static u16 rgb15(int r, int g, int b)
{
    return (u16)((r & 31) | ((g & 31) << 5) | ((b & 31) << 10));
}

/* Palette BG (64 colori) - stile Belle Epoque / Expedition 33             */
static const int BG_PAL[64][3] = {
    { 8, 9,18},   /*  0 sfondo box/banner/notte - navy                     */
    {13,21,13},   /*  1 erba chiara                                        */
    {11,18,11},   /*  2 erba media                                         */
    { 8,14, 8},   /*  3 erba scura                                         */
    { 6,11, 6},   /*  4 erba alta (Continente)                             */
    {25,23,19},   /*  5 selciato chiaro                                    */
    {21,19,15},   /*  6 selciato medio                                     */
    {16,15,11},   /*  7 selciato scuro                                     */
    {19,17,14},   /*  8 strada                                             */
    {14,12,10},   /*  9 strada scura                                       */
    {26,24,20},   /* 10 marciapiede chiaro                                 */
    {22,20,17},   /* 11 marciapiede medio                                  */
    {13,23,25},   /* 12 acqua chiara                                       */
    {10,19,22},   /* 13 acqua media                                        */
    { 6,14,18},   /* 14 acqua scura                                        */
    {18,27,29},   /* 15 riflesso acqua                                     */
    {17,12, 7},   /* 16 tronco                                             */
    { 9,17, 9},   /* 17 foglia scura                                       */
    {13,21,12},   /* 18 foglia media                                       */
    {18,27,16},   /* 19 foglia chiara                                      */
    {28,15,18},   /* 20 fiore rosa                                         */
    {30,25,15},   /* 21 fiore oro                                          */
    {25,18,29},   /* 22 fiore lilla                                        */
    {31,29,23},   /* 23 muro chiaro (crema)                                */
    {27,25,20},   /* 24 muro medio                                         */
    {23,21,17},   /* 25 muro scuro                                         */
    {17,23,31},   /* 26 vetro finestra (blu)                               */
    {31,27,17},   /* 27 vetro finestra (oro)                               */
    {14,16,27},   /* 28 tetto navy                                         */
    {10,12,22},   /* 29 tetto scuro                                        */
    {20,15, 9},   /* 30 porta legno                                        */
    {15,11, 7},   /* 31 porta scuro                                        */
    {13,13,16},   /* 32 lampione                                          */
    {31,29,22},   /* 33 lampada oro                                        */
    {27,27,29},   /* 34 fontana chiara                                     */
    {20,20,23},   /* 35 fontana scura                                      */
    {21,21,25},   /* 36 monolite chiaro                                    */
    {16,16,21},   /* 37 monolite medio                                     */
    {11,11,17},   /* 38 monolite scuro                                     */
    {28,19,28},   /* 39 bagliore monolite (magenta)                        */
    {13,13,17},   /* 40 montagna                                           */
    { 9, 9,13},   /* 41 montagna scura                                     */
    {26,25,30},   /* 42 nebbia                                             */
    {17,15,12},   /* 43 roccia                                             */
    {12,11, 9},   /* 44 roccia scura                                       */
    {23,19,14},   /* 45 terra chiara                                       */
    {19,15,11},   /* 46 terra media                                        */
    {15,12, 9},   /* 47 terra scura                                        */
    {20,14, 8},   /* 48 cassa                                              */
    {14, 9, 5},   /* 49 cassa scura                                        */
    {29,27,21},   /* 50 bordo box                                          */
    {31,31,29},   /* 51 testo crema                                        */
    {31,29,19},   /* 52 testo oro                                          */
    {31,28,15},   /* 53 titolo oro                                         */
    { 6, 8,17},   /* 54 cielo notte                                       */
    { 9,11,21},   /* 55 cielo notte 2                                      */
    {31,31,29},   /* 56 stella                                             */
    {30,30,27},   /* 57 luna                                               */
    {29,13,19},   /* 58 rosa peintresse                                    */
    {31,17,11},   /* 59 fuoco                                              */
    {29,28,24},   /* 60 crema segno                                        */
    {23,22,19},   /* 61 segno scuro                                        */
    {20,16,10},   /* 62 riserva                                           */
    {10, 8, 6},   /* 63 riserva                                           */
};

/* Palette OBJ: 8 banchi da 16 colori (4bpp)                               */
static const int OBJ_PAL[8][16][3] = {
    /* 0 GUSTAVE */
    { {0,0,0},{31,24,20},{26,19,15},{14,10,8},{18,13,10},{18,22,31},{12,16,26},
      {30,28,24},{9,11,18},{6,7,12},{27,19,9},{31,27,18},{25,11,12},{31,31,30},
      {16,12,9},{7,6,8} },
    /* 1 MAELLE */
    { {0,0,0},{31,23,19},{26,18,15},{26,22,14},{21,17,10},{31,30,28},{25,24,22},
      {20,24,31},{16,11,7},{11,7,5},{18,22,30},{30,26,15},{31,20,20},{31,31,31},
      {20,18,16},{7,6,8} },
    /* 2 LUNE */
    { {0,0,0},{30,22,19},{25,18,15},{24,24,28},{18,18,22},{15,26,28},{10,20,23},
      {30,24,20},{8,10,14},{5,7,10},{28,22,16},{31,31,30},{20,14,20},{16,14,18},
      {12,11,15},{6,5,9} },
    /* 3 SCIEL */
    { {0,0,0},{30,22,18},{25,17,14},{16,10,6},{11,7,4},{29,25,14},{24,20,10},
      {18,28,17},{12,22,12},{12,16,12},{30,29,27},{20,13,7},{31,31,30},{10,9,8},
      {7,6,5},{6,5,4} },
    /* 4 SOPHIE / LA PEINTRESSE */
    { {0,0,0},{31,24,20},{26,19,15},{20,12,10},{15,9,7},{22,25,31},{16,20,27},
      {31,31,30},{13,9,7},{9,6,4},{29,16,21},{30,26,16},{29,29,31},{26,20,28},
      {20,15,22},{7,6,8} },
    /* 5 VERSO */
    { {0,0,0},{29,23,20},{24,18,15},{29,29,31},{23,23,27},{13,12,20},{20,18,28},
      {29,27,24},{9,9,15},{5,5,10},{30,30,31},{22,16,12},{24,12,16},{31,31,30},
      {15,14,22},{5,5,8} },
    /* 6 RENOIR */
    { {0,0,0},{30,23,19},{25,18,14},{22,22,24},{16,16,19},{16,10,12},{26,18,18},
      {30,29,27},{10,7,8},{6,4,5},{30,11,12},{25,20,16},{31,31,30},{18,14,16},
      {12,10,12},{6,4,5} },
    /* 7 ESQUIE / MONOCO */
    { {0,0,0},{31,31,31},{26,26,29},{17,20,31},{30,27,18},{12,12,18},{24,14,10},
      {31,22,12},{31,29,26},{22,18,12},{24,24,27},{18,18,22},{20,18,14},{15,13,10},
      {10,9,8},{6,6,9} },
};

/* 40 tile della mappa (8x8)                                              */
static const char *const BG_ART[40][8] = {
    { "00000000","00000000","00000000","00000000",
      "00000000","00000000","00000000","00000000" },              /*  0 bg  */
    { "11111111","11111111","11211211","11111111",
      "11111112","11111111","11211111","11111111" },              /*  1 erba */
    { "22222222","22232222","22222222","22322222",
      "22222222","22222223","22222222","23222222" },              /*  2 erba2*/
    { "33333333","33334333","33333333","34333333",
      "33333333","33333334","33333333","34333333" },              /*  3 erba3*/
    { "44444444","43434343","44444444","34343434",
      "44444444","43434343","44444444","34343434" },              /*  4 erba alta */
    { "55555555","55656555","55555555","56555565",
      "55565555","55555555","55655555","55555555" },              /*  5 selciato */
    { "66666666","66767666","66666666","67666676",
      "66676666","66666666","66766666","66666666" },              /*  6 selciato2 */
    { "77777777","77878777","77777777","78777778",
      "77787777","77777777","77877777","77777777" },              /*  7 selciato3 */
    { "88888888","89898989","98989898","88888888",
      "98989898","89898989","88888888","89898989" },              /*  8 strada */
    { "99999999","98989898","89898989","99999999",
      "89898989","98989898","99999999","98989898" },              /*  9 strada2 */
    { "AAAAAAAA","AAAAAAAA","AABBBAAA","AAAAAABA",
      "BBAAAAAA","AAAAAAAA","AABAAAAA","AAAAABBA" },              /* 10 pavimento */
    { "BBBBBBBB","BBBBABBB","BABBBBBB","BBBBBBBA",
      "BBABBBBB","BBBBBABB","BBBBBBBB","BABBBBBB" },              /* 11 pavimento2 */
    { "CCCCCCCC","CCCCCCCC","CDCCCCCC","CCCCDCCC",
      "CCCCCCCC","CCDCCCCC","CCCCCCCC","CCCCCDCC" },              /* 12 acqua */
    { "DDDDDDDD","DDDDEDDD","DDDDDDDD","DDEDDDDD",
      "DDDDDDDD","DDDDDDED","DDDDDDDD","EDDDDDDD" },              /* 13 acqua2 */
    { "EEEEEEEE","EEEEEEEE","EEEEEEEE","EEEEEEEE",
      "EEEEEEEE","EEEEEEEE","EEEEEEEE","EEEEEEEE" },              /* 14 acqua3 */
    { "EEEEEFEE","EEEEEEEE","EEEEEEEE","EEFEEEEE",
      "EEEEEEEE","EEEEEEEF","EEEEEEEE","EEFEEEEE" },              /* 15 acqua4 */
    { "1111JJ11","11JJJJJ1","1JJJJJJJ","1JHJJJJ1",
      "HHHHHHHH","HHHHHHHH","111GGG11","111GGG11" },              /* 16 albero */
    { "2222II22","22IIIII2","2IIIIIII","2IHIIII2",
      "HHHHHHHH","HHHHHHHH","222GGG22","222GGG22" },              /* 17 albero2 */
    { "NNNNNNNN","NNNONNNN","NNNNNNNN","ONNNNNNN",
      "NNNNNONN","NNNNNNNN","NNONNNNN","NNNNNNNN" },              /* 18 muro */
    { "NNNNNNNN","NNOOOOON","NOQOOQON","OQQQQQQO",
      "OQQQQQQO","NOQOOQON","NNOOOOON","NNNNNNNN" },              /* 19 muro+finestra */
    { "UUUUUUUU","UVVVVVVU","UVVVVVVU","UVVVVRVU",
      "UVVVVVVU","UVVVVVVU","UVVVVVVU","UUUUUUUU" },              /* 20 porta */
    { "SSSSSSSS","STSTSTSS","TSTSSSTS","SSSSSSSS",
      "STSSSTSS","SSTSSSTS","SSSSSSSS","TSTSSSST" },              /* 21 tetto */
    { "TTTTTTTT","TSTSTTTT","STTTSTTS","TTTTTTTT",
      "TTSSTTTT","STTTTSTT","TTTTTTTT","STTSTTST" },              /* 22 tetto2 */
    { "ccRRRRcc","ccRRRRcc","ccccWWcc","ccccWWcc",
      "ccccWWcc","ccccWWcc","ccccWWcc","ccccWWcc" },              /* 23 lampione */
    { "YYYYYYYY","YZZZZZZY","YZCCCCZY","YZCDDCZY",
      "YZCDDCZY","YZCCCCZY","YZZZZZZY","YYYYYYYY" },              /* 24 fontana */
    { "aaaaaaaa","aaaabaaa","aaaaaaaa","abaaaaaa",
      "aaaaaaaa","aaaabaaa","aaaaaaaa","aaaaaaaa" },              /* 25 monolite */
    { "bbbbbbbb","bbbbcbbb","bbbbbbbb","bcbbbbbb",
      "bbbbbbbb","bbbbcbbb","bbbbbbbb","bbbbbbbb" },              /* 26 monolite2 */
    { "dddddddd","dddddddd","dcddcddc","cddcddcd",
      "dddddddd","dcdddddd","ddddcddd","dddddddd" },              /* 27 monolite bagliore */
    { "eeeeeeee","eeeeffee","eefffffe","efffffff",
      "ffffffff","ffffffff","ffffffff","ffffffff" },              /* 28 montagna */
    { "gggggggg","gggggggg","gggggggg","gggggggg",
      "gggggggg","gggggggg","gggggggg","gggggggg" },              /* 29 nebbia */
    { "hhhhhhhh","hhiiihhh","hiiihhhh","hhhhiihh",
      "hhihhiih","hihhhihi","hhhhhhhh","hhhhhhhh" },              /* 30 roccia */
    { "jjjjjjjj","jkjjjkjj","jjjjjjjj","kjjjjjjk",
      "jjkkjjjj","jjjjjkjj","jkjjjjjj","jjjjjjjj" },              /* 31 terra */
    { "mmmmmmmm","mnnmmmmm","mnnmnnmm","mmmmmmmm",
      "mmmmmmmn","mmmmnnmm","mnnmmmmm","mmmmmmmm" },              /* 32 cassa */
    { "12121212","12KK1212","212KK221","1212KK12",
      "21212212","12KK1212","2121K121","12121212" },              /* 33 fiore rosa */
    { "21212121","21LL2121","1212LL12","211LL212",
      "12121L21","21L21212","1221L212","21212121" },              /* 34 fiore oro */
    { "12121212","21MM1212","1221MM21","21121M12",
      "12M21212","2121M212","1212121M","21212121" },              /* 35 fiore lilla */
    { "55555555","65656565","56565656","77777777",
      "77777777","56565656","65656565","55555555" },              /* 36 ponte */
    { "........","........","....u...","........",
      "...u....","........","........","........" },              /* 37 stella */
    { "........","...vvv..","..vvvvv.","..vvvvv.",
      "..vvvvv.","...vvv..","........","........" },              /* 38 luna */
};

/* Font 5x7, glifi per ' ' (0x20) .. 'Z' (0x5A)                            */
static const u8 FONT[59][8] = {
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x18,0x18,0x18,0x18,0x18,0x00,0x18,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x18,0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x18,0x18,0x7E,0x18,0x18,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x30},
    {0x00,0x00,0x00,0x7E,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x00},
    {0x06,0x0C,0x18,0x18,0x30,0x60,0x40,0x00},
    {0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0x00},
    {0x18,0x38,0x18,0x18,0x18,0x18,0x7E,0x00},
    {0x3C,0x66,0x06,0x0C,0x18,0x30,0x7E,0x00},
    {0x3C,0x66,0x06,0x1C,0x06,0x66,0x3C,0x00},
    {0x0C,0x1C,0x2C,0x4C,0x7E,0x0C,0x0C,0x00},
    {0x7E,0x60,0x60,0x3C,0x06,0x66,0x3C,0x00},
    {0x1C,0x30,0x60,0x7C,0x66,0x66,0x3C,0x00},
    {0x7E,0x06,0x0C,0x18,0x18,0x18,0x18,0x00},
    {0x3C,0x66,0x66,0x3C,0x66,0x66,0x3C,0x00},
    {0x3C,0x66,0x66,0x3E,0x06,0x0C,0x38,0x00},
    {0x00,0x18,0x18,0x00,0x18,0x18,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x00,0x00,0x7E,0x00,0x00,0x7E,0x00,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x3C,0x66,0x06,0x0C,0x18,0x00,0x18,0x00},
    {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
    {0x18,0x3C,0x66,0x66,0x7E,0x66,0x66,0x00},
    {0x7C,0x66,0x66,0x7C,0x66,0x66,0x7C,0x00},
    {0x3C,0x66,0x60,0x60,0x60,0x66,0x3C,0x00},
    {0x78,0x6C,0x66,0x66,0x66,0x6C,0x78,0x00},
    {0x7E,0x60,0x60,0x7C,0x60,0x60,0x7E,0x00},
    {0x7E,0x60,0x60,0x7C,0x60,0x60,0x60,0x00},
    {0x3C,0x66,0x60,0x6E,0x66,0x66,0x3E,0x00},
    {0x66,0x66,0x66,0x7E,0x66,0x66,0x66,0x00},
    {0x7E,0x18,0x18,0x18,0x18,0x18,0x7E,0x00},
    {0x1E,0x0C,0x0C,0x0C,0x0C,0x6C,0x38,0x00},
    {0x66,0x6C,0x78,0x70,0x78,0x6C,0x66,0x00},
    {0x60,0x60,0x60,0x60,0x60,0x60,0x7E,0x00},
    {0x62,0x76,0x7E,0x7E,0x6A,0x62,0x62,0x00},
    {0x66,0x76,0x7E,0x7E,0x6E,0x66,0x66,0x00},
    {0x3C,0x66,0x66,0x66,0x66,0x66,0x3C,0x00},
    {0x7C,0x66,0x66,0x7C,0x60,0x60,0x60,0x00},
    {0x3C,0x66,0x66,0x66,0x66,0x3C,0x0E,0x00},
    {0x7C,0x66,0x66,0x7C,0x78,0x6C,0x66,0x00},
    {0x3C,0x66,0x60,0x3C,0x06,0x66,0x3C,0x00},
    {0x7E,0x18,0x18,0x18,0x18,0x18,0x18,0x00},
    {0x66,0x66,0x66,0x66,0x66,0x66,0x3C,0x00},
    {0x66,0x66,0x66,0x66,0x66,0x3C,0x18,0x00},
    {0x62,0x62,0x6A,0x7E,0x7E,0x76,0x62,0x00},
    {0x66,0x66,0x3C,0x18,0x3C,0x66,0x66,0x00},
    {0x66,0x66,0x66,0x3C,0x18,0x18,0x18,0x00},
    {0x7E,0x06,0x0C,0x18,0x30,0x60,0x7E,0x00},
};

/*------------------------------------------------------------------------------
 * Sprites dei personaggi (16x16). I 4 frame base sono condivisi da tutti:
 * l'identita del personaggio viene dalla palette OBJ (banco) assegnata.
 *   frame 0-1: fronte (idle / passo)   frame 2-3: profilo (idle / passo)
 *   art_pal: '1' pelle, '2' capelli, '3' occhi, '4' vestito, '5' dettagli
 *---------------------------------------------------------------------------*/
static const char *const SPR_F0[16] = {
    "................", ".....222222.....", "....22222222....",
    "....22333322....", "....22111122....", "....22111122....",
    ".....111111.....", "......1111......",
    ".....444444.....", "....44444444....", "....44444444....",
    "....44....44....", "....44....44....", "....44444444....",
    "....44334444....", ".....333333.....",
};
static const char *const SPR_F1[16] = {
    "................", ".....222222.....", "....22222222....",
    "....22333322....", "....22111122....", "....22111122....",
    ".....111111.....", "......1111......",
    ".....444444.....", "....44444444....", "....44444444....",
    "....44....44....", "....44....44....", "....44444444....",
    "....44334444....", ".....333..333...",
};
static const char *const SPR_S0[16] = {
    "................", ".....222222.....", "....22222222....",
    "....22333322....", "....22111122....", "....22111122....",
    ".....111111.....", "......1111......",
    ".....444444.....", "....44444444....", "....44444444....",
    "....44444444....", "....44444444....", "....44444444....",
    "....44334444....", ".....333333.....",
};
static const char *const SPR_S1[16] = {
    "................", ".....222222.....", "....22222222....",
    "....22333322....", "....22111122....", "....22111122....",
    ".....111111.....", "......1111......",
    ".....444444.....", "....44444444....", "....44444444....",
    "....44444444....", "....44444444....", "....44444444....",
    "....44334444....", ".....33..33.....",
};
/* Gustave usa 8 frame: fronte, profilo, fronte, profilo alternati          */
static const char *const *const GUSTAVE_ART[8] = {
    SPR_F0, SPR_F1, SPR_S0, SPR_S1, SPR_F0, SPR_F1, SPR_S0, SPR_S1
};

/*------------------------------------------------------------------------------
 * Stato del gioco
 *---------------------------------------------------------------------------*/
enum {
    ST_TITLE = 0,
    ST_WORLD,
    ST_DIALOG,
    ST_ENDING
};

typedef struct {
    int x, y;           /* posizione griglia (tile)                          */
    int px, py;         /* pixel per l'animazione del passo                   */
    int facing;         /* 0 su, 1 giu, 2 sin, 3 des                          */
    int step;           /* frame di passo                                     */
} PLAYER;

typedef struct {
    int x, y;
    int pal;
    int tile;
} NPC;

/* Fade: 0 = nessuno, 1 = in uscita, 2 = nero, 3 = in entrata               */
static int g_fade = 0;
static int g_fade_cnt = 0;

static int g_state = ST_TITLE;
static int g_world = 0;              /* area corrente                          */
static int g_stage = 0;              /* stadio della quest                     */
static int g_renoir_gone = 0;        /* flag: Renoir sconfitto/andato          */
static int g_frame = 0;

static PLAYER g_p;
static NPC g_npc[9];                 /* 0 Sophie 1 Maelle 2 Lune 3 Sciel       */
                                     /* 4 Verso 5 Monoco 6 Esquie 7 Renoir     */
                                     /* 8 Paintress                            */

static int g_dialog = -1;            /* dialogo attivo o -1                     */
static int g_dlg_page = 0;           /* pagina corrente del dialogo             */
static int g_dlg_state = 0;          /* 0: parla, 1: attesa, 2: chiudi          */
static int g_pending = -1;           /* dialogo da mostrare dopo la chiusura    */

static int g_maelle = 0, g_lune = 0, g_sciel = 0;

/* ogni dialogo: max 2 pagine da 2 righe                                     */
static const char *const INTRO_DLG[4] = {
    "IL MONOLITE E APPARSI",
    "A LUMIERE. LA PEINTRESSE",
    "HA DIPINTO IL NUMERO 33.",
    "CHI HA 33 ANNI SPARIRA"
};
static const char *const SOPHIE_DLG[4] = {
    "SOPHIE: IL NUMERO 33 E",
    "SUL MONOLITE. SOLO LA",
    "SPEDIZIONE PUO FERMARE",
    "LA PEINTRESSE."
};
static const char *const GOMMAGE_DLG[4] = {
    "IL GOMMAGE HA INIZIO.",
    "LE PERSONE SPARISCONO",
    "DAVANTI AI TUOI OCCHI.",
    "RADUNA LA SPEDIZIONE."
};
static const char *const MAELLE_G[4] = {
    "MAELLE: VENGO CON TE.",
    "NON LASCIERO CHE LA",
    "PEINTRESSE CANCELLI",
    "LA NOSTRA ETA."
};
static const char *const MAELLE_A[4] = {
    "MAELLE: PRONTA. ORA",
    "LA SPEDIZIONE E PIU",
    "FORTE.",
    ""
};
static const char *const LUNE_G[4] = {
    "LUNE: HO LETTO I",
    "VERBALI DEL GOMMAGE.",
    "DEVI FERMARE RENOIR",
    "SUL CONTINENTE."
};
static const char *const LUNE_A[2] = {
    "LUNE: LA SPEDIZIONE",
    "HA UN TRAGUARDO."
};
static const char *const SCIEL_G[4] = {
    "SCIEL: IL MIO ARCO",
    "E PRONTO. TUTTI GLI",
    "ANNI VANNO VISSUTI.",
    "PARTIAMO."
};
static const char *const SCIEL_A[2] = {
    "SCIEL: LA SPEDIZIONE",
    "33 E COMPLETA."
};
static const char *const SPED_DONE[4] = {
    "LA SPEDIZIONE E AL",
    "COMPLETO. VAI AL MOLO",
    "PER RAGGIUNGERE",
    "RENOIR."
};
static const char *const VERSO_DLG[2] = {
    "VERSO: LA RIVOLUZIONE",
    "E INIZIATA. TI SEGUO."
};
static const char *const MONOCO_DLG[4] = {
    "MONOCO: LE GOMME",
    "BLOCCANO IL CUORE.",
    "DEVI CANCELLARE IL",
    "NUMERO 33."
};
static const char *const ESQUIE_EARLY[4] = {
    "ESQUIE: IL MOLO E",
    "BLOCCATO. PRIMA",
    "RADUNA LA SPEDIZIONE."
};
static const char *const ESQUIE_BOARD[4] = {
    "ESQUIE: LA NAVE E",
    "PRONTA. SPEDIAMO VERSO",
    "IL CONTINENTE."
};
static const char *const ESQUIE_AFTER[4] = {
    "ESQUIE: BUON VIAGGIO.",
    "LA SPEDIZIONE 33 VA",
    "AVANTI.",
    ""
};
static const char *const RENOIR_DLG[4] = {
    "RENOIR: IO HO DIPINTO",
    "IL NUMERO. LA COLPA",
    "E DELLA PEINTRESSE?",
    "NO. LA COLPA E MIA."
};
static const char *const RENOIR_GONE[4] = {
    "RENOIR E SVANITO.",
    "IL CONTINENTE E APERTO.",
    "OLTRE LA NEBBIA C E",
    "IL MONOLITE."
};
static const char *const PAINTRESS_DLG[4] = {
    "LA PEINTRESSE: HAI",
    "CANCELLATO IL NUMERO",
    "33. IL GOMMAGE E",
    "FINITO. RIPOSA."
};

/*------------------------------------------------------------------------------
 * Dialoghi multi-pagina
 *---------------------------------------------------------------------------*/
static const char *const *const DIALOGS[] = {
    INTRO_DLG, SOPHIE_DLG, GOMMAGE_DLG, MAELLE_G, MAELLE_A,
    LUNE_G, LUNE_A, SCIEL_G, SCIEL_A, SPED_DONE,
    VERSO_DLG, MONOCO_DLG, ESQUIE_EARLY, ESQUIE_BOARD,
    ESQUIE_AFTER, RENOIR_DLG, RENOIR_GONE, PAINTRESS_DLG
};

#define DIALOG_COUNT (sizeof(DIALOGS) / sizeof(DIALOGS[0]))

/* indice del dialogo: 0 intro, 1 sophie, 2 gommage, 3/4 maelle,
   5/6 lune, 7/8 sciel, 9 sped_done, 10 verso, 11 monoco, 12/13/14 esquie,
   15/16 renoir, 17 peintresse */
#define DLG_INTRO    0
#define DLG_SOPHIE   1
#define DLG_GOMMAGE  2
#define DLG_MAELLE_G 3
#define DLG_MAELLE_A 4
#define DLG_LUNE_G   5
#define DLG_LUNE_A   6
#define DLG_SCIEL_G  7
#define DLG_SCIEL_A  8
#define DLG_SPED     9
#define DLG_VERSO    10
#define DLG_MONOCO   11
#define DLG_ESQ_EARLY 12
#define DLG_ESQ_BOARD 13
#define DLG_ESQ_AFTER 14
#define DLG_RENOIR   15
#define DLG_RENOIR_G 16
#define DLG_PAINT    17

/*------------------------------------------------------------------------------
 * Helper
 *---------------------------------------------------------------------------*/
static void copy_tile(u16 *dst, const u8 *src, int n)
{
    int i;
    for (i = 0; i < n; i++) {
        dst[0] = src[0] | (src[1] << 8);
        dst[1] = src[2] | (src[3] << 8);
        dst[2] = src[4] | (src[5] << 8);
        dst[3] = src[6] | (src[7] << 8);
        dst += 4;
        src += 8;
    }
}

static void build_palettes(void)
{
    volatile u16 *bg = (volatile u16 *)0x05000000;
    volatile u16 *obj = (volatile u16 *)0x05000200;
    int i, j;
    for (i = 0; i < 64; i++)
        bg[i] = rgb15(BG_PAL[i][0], BG_PAL[i][1], BG_PAL[i][2]);
    for (i = 0; i < 8; i++)
        for (j = 0; j < 16; j++)
            obj[i * 16 + j] = rgb15(OBJ_PAL[i][j][0], OBJ_PAL[i][j][1], OBJ_PAL[i][j][2]);
}

static void build_bg_tiles(void)
{
    u8 raw[8][8];
    int t, r, c;
    for (t = 0; t < 40; t++) {
        for (r = 0; r < 8; r++)
            for (c = 0; c < 8; c++)
                raw[r][c] = art_pal(BG_ART[t][r][c]);
        copy_tile((u16 *)BG0_TILES + t * 32, &raw[0][0], 8);
    }
}

static void build_font_color(u16 *dst, const u8 *f, int color)
{
    u8 raw[8][8];
    int r, c;
    for (r = 0; r < 8; r++) {
        for (c = 0; c < 8; c++) {
            u8 bit = (r < 8 && f[r] & (0x80 >> c)) ? 1 : 0;
            raw[r][c] = bit ? (u8)color : 0;
        }
    }
    copy_tile(dst, &raw[0][0], 8);
}

static void build_text_tiles(void)
{
    int i;
    for (i = 0; i < 59; i++)
        build_font_color((u16 *)BG0_TILES + (T_TEXT_BASE + i) * 32, FONT[i], 51);
}

static void build_box_tiles(void)
{
    u8 raw[8][8];
    int t, r, c;
    static const char *const BOX[9][8] = {
        { "55555555","50000000","50000000","50000000",
          "50000000","50000000","50000000","50000000" },  /* 0 corner TL */
        { "55555555","00000000","00000000","00000000",
          "00000000","00000000","00000000","00000000" },  /* 1 top       */
        { "55555555","00000005","00000005","00000005",
          "00000005","00000005","00000005","00000005" },  /* 2 corner TR */
        { "50000000","50000000","50000000","50000000",
          "50000000","50000000","50000000","50000000" },  /* 3 left      */
        { "00000000","00000000","00000000","00000000",
          "00000000","00000000","00000000","00000000" },  /* 4 center    */
        { "00000005","00000005","00000005","00000005",
          "00000005","00000005","00000005","00000005" },  /* 5 right     */
        { "50000000","50000000","50000000","50000000",
          "50000000","50000000","50000000","55555555" },  /* 6 corner BL */
        { "00000000","00000000","00000000","00000000",
          "00000000","00000000","00000000","55555555" },  /* 7 bottom    */
        { "00000005","00000005","00000005","00000005",
          "00000005","00000005","00000005","55555555" },  /* 8 corner BR */
    };
    for (t = 0; t < 9; t++) {
        for (r = 0; r < 8; r++)
            for (c = 0; c < 8; c++)
                raw[r][c] = art_pal(BOX[t][r][c]);
        copy_tile((u16 *)BG0_TILES + (T_BOX_BASE + t) * 32, &raw[0][0], 8);
    }
}

static void build_gold_text_tiles(void)
{
    int i;
    for (i = 0; i < 59; i++)
        build_font_color((u16 *)BG0_TILES + (T_GOLD_BASE + i) * 32, FONT[i], 52);
}

/* 4 tile contigue per un frame 16x16 (OBJ 4bpp, 2 pixel/byte)              */
static void build_frame_16(u16 *dst, const char *const *art, int pal)
{
    u8 grid[16][16];
    int y, x, ty, tx;
    (void)pal;
    for (y = 0; y < 16; y++)
        for (x = 0; x < 16; x++)
            grid[y][x] = art_pal(art[y][x]);
    for (ty = 0; ty < 2; ty++)
        for (tx = 0; tx < 2; tx++) {
            u8 tmp[32];
            int tileIdx = ty * 2 + tx;
            for (y = 0; y < 8; y++)
                for (x = 0; x < 8; x += 2)
                    tmp[y * 4 + x / 2] = (u8)(grid[ty * 8 + y][tx * 8 + x] |
                                              (grid[ty * 8 + y][tx * 8 + x + 1] << 4));
            copy_tile(dst + tileIdx * 16, tmp, 4);
        }
}

static void build_sprites(void)
{
    u16 *dst = (u16 *)OBJ_TILES;
    /* base tile per ogni NPC (0 Sophie 1 Maelle 2 Lune 3 Sciel 4 Verso
       5 Monoco 6 Esquie 7 Renoir 8 Paintress)                             */
    static const int NPC_TILE[9] = { 44, 32, 36, 40, 48, 52, 56, 60, 64 };
    int i;

    /* Gustave: 8 frame */
    for (i = 0; i < 8; i++)
        build_frame_16(dst + (i * 4) * 16, GUSTAVE_ART[i], 0);

    /* NPC: 4 frame ciascuno (fronte/profilo) */
    for (i = 0; i < 9; i++) {
        int base = NPC_TILE[i];
        build_frame_16(dst + (base + 0) * 16, SPR_F0, 0);
        build_frame_16(dst + (base + 1) * 16, SPR_F1, 0);
        build_frame_16(dst + (base + 2) * 16, SPR_S0, 0);
        build_frame_16(dst + (base + 3) * 16, SPR_S1, 0);
    }
}

/*------------------------------------------------------------------------------
 * Map e rendering
 *---------------------------------------------------------------------------*/
static int is_blocked(int wx, int wy)
{
    char c;
    if (wx < 0 || wy < 0 || wx >= WORLD_SZ || wy >= WORLD_SZ)
        return 1;
    c = WORLDS[g_world][wy][wx];
    switch (c) {
        case 'w': case 'W': case 'v': case 'V':
        case 't': case 'T': case 'H': case 'h':
        case 'd': case 'o': case 'O': case 'l':
        case 'f': case 'M': case 'm': case 'G':
        case '#': case 'n': case 'x': case 'u':
            return 1;
        default:
            return 0;
    }
}

/* Camera: centra il giocatore sullo schermo, clampata ai bordi della mappa  */
static int cam_x(void)
{
    int c = g_p.px - 116;              /* px + 4 (centro tile) - 120          */
    if (c < 0) c = 0;
    if (c > CAM_MAX_X) c = CAM_MAX_X;
    return c;
}

static int cam_y(void)
{
    int c = g_p.py - 76;               /* py + 4 - 80                         */
    if (c < 0) c = 0;
    if (c > CAM_MAX_Y) c = CAM_MAX_Y;
    return c;
}

static void render_map_window(void)
{
    int cam_xp = cam_x(), cam_yp = cam_y();
    int tx0 = cam_xp / 8, ty0 = cam_yp / 8;
    int y, x;
    u16 *dst = (u16 *)BG0_MAP;

    REG_BG0HOFS = (u16)(cam_xp & 7);   /* scostamento residuo in pixel        */
    REG_BG0VOFS = (u16)(cam_yp & 7);

    /* +1 riga/colonna: con HOFS/VOFS > 0 il bordo mostra la colonna/riga   */
    for (y = 0; y < VIS_H + 1; y++) {
        for (x = 0; x < VIS_W + 1; x++) {
            int wx = tx0 + x, wy = ty0 + y;
            char c;
            u16 tile;
            if (wy >= WORLD_SZ || wx >= WORLD_SZ)
                c = 'w';
            else
                c = WORLDS[g_world][wy][wx];
            switch (c) {
                case '.': tile = T_GRASS; break;
                case ',': tile = T_GRASS2; break;
                case 'e': tile = T_GRASS3; break;
                case 'g': tile = T_TALL; break;
                case 'c': tile = T_COB1; break;
                case 'k': tile = T_COB2; break;
                case 'C': tile = T_COB3; break;
                case 's': tile = T_STREET; break;
                case 'S': tile = T_STREET2; break;
                case 'p': tile = T_PAV1; break;
                case 'P': tile = T_PAV2; break;
                case 'w': tile = T_WAT1; break;
                case 'W': tile = T_WAT2; break;
                case 'v': tile = T_WAT3; break;
                case 'V': tile = T_WAT4; break;
                case 't': tile = T_TREE; break;
                case 'T': tile = T_TREES; break;
                case 'H': tile = T_WALL; break;
                case 'h': tile = T_WINDOW; break;
                case 'd': tile = T_DOOR; break;
                case 'o': tile = T_ROOF; break;
                case 'O': tile = T_ROOF2; break;
                case 'l': tile = T_LAMP; break;
                case 'f': tile = T_FOUNT; break;
                case 'M': tile = T_MONO; break;
                case 'm': tile = T_MONO2; break;
                case 'G': tile = T_MONOG; break;
                case '#': tile = T_MOUNT; break;
                case 'n': tile = T_MIST; break;
                case 'x': tile = T_ROCK; break;
                case 'r': tile = T_DIRT; break;
                case 'u': tile = T_CRATE; break;
                case '1': tile = T_FLOWR; break;
                case '2': tile = T_FLOWG; break;
                case '3': tile = T_FLOWL; break;
                case 'b': tile = T_BRIDGE; break;
                default:  tile = T_STAR; break;
            }
            dst[y * 32 + x] = tile;
        }
    }
}

static void render_text_base(int sx, int sy, const char *s, int base)
{
    u16 *dst = (u16 *)BG0_MAP;
    while (*s) {
        char c = *s++;
        if (c < ' ' || c > 'Z')
            c = ' ';
        if (sx >= 0 && sx < VIS_W && sy >= 0 && sy < VIS_H)
            dst[sy * 32 + sx] = (u16)(base + c - ' ');
        sx++;
    }
}

static void render_text(int sx, int sy, const char *s)
{
    render_text_base(sx, sy, s, T_TEXT_BASE);
}

static void render_text_gold(int sx, int sy, const char *s)
{
    render_text_base(sx, sy, s, T_GOLD_BASE);
}

static void render_intro_scene(void)
{
    /* cielo notte + luna + stelle + monolite in fondo + titolo              */
    int x, y;
    u16 *dst = (u16 *)BG0_MAP;
    for (y = 0; y < VIS_H; y++) {
        for (x = 0; x < VIS_W; x++) {
            u16 tile = (y < 15) ? T_BG : T_MIST;
            dst[y * 32 + x] = tile;
        }
    }
    /* luna in alto a destra */
    dst[2 * 32 + 25] = T_MOON;
    dst[2 * 32 + 26] = T_MOON;
    dst[3 * 32 + 25] = T_MOON;
    dst[3 * 32 + 26] = T_MOON;
    /* stelle sparse */
    dst[1 * 32 + 4] = T_STAR;
    dst[2 * 32 + 12] = T_STAR;
    dst[4 * 32 + 8] = T_STAR;
    dst[4 * 32 + 20] = T_STAR;
    dst[6 * 32 + 3] = T_STAR;
    dst[6 * 32 + 27] = T_STAR;
    /* monolite al centro */
    for (y = 8; y < 15; y++) {
        for (x = 13; x < 17; x++) {
            int t;
            if (y == 8)         t = (x == 13 || x == 16) ? T_MONO : T_MONO2;
            else if (y == 14)   t = T_MONOG;
            else                t = T_MONO2;
            dst[y * 32 + x] = t;
        }
    }
    render_text_gold(7, 3, "EXPEDITION 33");
    render_text(4, 18, "PREMI START");
}

static void render_ending_scene(void)
{
    int x, y;
    u16 *dst = (u16 *)BG0_MAP;
    for (y = 0; y < VIS_H; y++) {
        for (x = 0; x < VIS_W; x++) {
            dst[y * 32 + x] = (y < 12) ? T_BG : T_MIST;
        }
    }
    render_text_gold(12, 5, "FINE");
    render_text(3, 12, "LA SPEDIZIONE 33 HA");
    render_text(3, 13, "CANCELLATO IL GOMMAGE");
    render_text(6, 15, "GRAZIE PER AVER");
    render_text(6, 16, "GIOCATO");
}

/*------------------------------------------------------------------------------
 * OAM
 *---------------------------------------------------------------------------*/
static int npc_visible(int i);

static void update_oam(void)
{
    int i;
    OBJATTR *o = (OBJATTR *)OBJ_OAM;
    int cam_xp, cam_yp, sx, sy;

    if (g_state == ST_TITLE || g_state == ST_ENDING) {
        for (i = 0; i < 128; i++)
            o[i].attr0 = ATTR0_DISABLED;
        return;
    }

    cam_xp = cam_x();
    cam_yp = cam_y();

    /* giocatore: il tile del giocatore va al centro schermo                 */
    sx = g_p.px - 4 - cam_xp;
    sy = g_p.py - 8 - cam_yp;

    /* giocatore */
    int tile = (g_p.step * 2 + (g_p.facing & 1)) * 4;
    o[0].attr0 = (u16)((sy & 0xFF) | (0 << 12) | (0 << 11));
    o[0].attr1 = (u16)((sx & 0x1FF) | (1 << 14));
    o[0].attr2 = (u16)(tile | (0 << 12));
    o++;

    /* NPC: appaiono solo se non nascosti dallo stage                        */
    for (i = 0; i < 9; i++) {
        int sx2, sy2;
        int visible = npc_visible(i);
        if (!visible) {
            o->attr0 = ATTR0_DISABLED;
            o++;
            continue;
        }
        sx2 = g_npc[i].x * 8 - 4 - cam_xp;
        sy2 = g_npc[i].y * 8 - 8 - cam_yp;
        if (sx2 < -16 || sx2 > 256 || sy2 < -16 || sy2 > 176) {
            o->attr0 = ATTR0_DISABLED;
            o++;
            continue;
        }
        o->attr0 = (u16)((sy2 & 0xFF) | (0 << 12) | (0 << 11));
        o->attr1 = (u16)((sx2 & 0x1FF) | (1 << 14));
        o->attr2 = (u16)(g_npc[i].tile | (g_npc[i].pal << 12));
        o++;
    }
    /* spegne gli altri */
    while (o < (OBJATTR *)OBJ_OAM + 128) {
        o->attr0 = ATTR0_DISABLED;
        o++;
    }
}

/*------------------------------------------------------------------------------
 * Dialogo
 *---------------------------------------------------------------------------*/
static void start_dialog(int dlg)
{
    g_dialog = dlg;
    g_dlg_page = 0;
    g_dlg_state = 0;
    g_state = ST_DIALOG;
}

static int dialog_page_count(int dlg)
{
    /* numero di pagine: dialoghi da 3-4 righe = 2, da 1-2 righe = 1          */
    switch (dlg) {
        case DLG_LUNE_A:
        case DLG_SCIEL_A:
        case DLG_VERSO:
            return 1;
        default:
            return 2;
    }
}

static void apply_dialog_effects(int dlg);

static void close_dialog(void)
{
    int dlg = g_dialog;
    g_dialog = -1;
    g_state = ST_WORLD;
    apply_dialog_effects(dlg);
    if (g_pending >= 0) {
        int p = g_pending;
        g_pending = -1;
        start_dialog(p);
    }
}

/*------------------------------------------------------------------------------
 * Quest
 *---------------------------------------------------------------------------*/
static void apply_dialog_effects(int dlg)
{
    switch (dlg) {
        case DLG_INTRO:
            g_stage = 1;                    /* comincia la ricerca          */
            g_pending = DLG_SOPHIE;         /* intro -> parla con Sophie    */
            break;
        case DLG_SOPHIE:
            if (g_stage < 2) {
                g_stage = 2;                /* raduna la spedizione         */
                g_pending = DLG_GOMMAGE;
            }
            break;
        case DLG_GOMMAGE:
            g_stage = 2;
            break;
        case DLG_MAELLE_G:
            g_maelle = 1;
            break;
        case DLG_LUNE_G:
            g_lune = 1;
            break;
        case DLG_SCIEL_G:
            g_sciel = 1;
            break;
        case DLG_ESQ_BOARD:
            g_world = 1;                    /* parte per il continente      */
            g_p.x = 6; g_p.y = 58;
            g_p.px = 6 * 8; g_p.py = 58 * 8;
            g_stage = 4;
            g_pending = DLG_ESQ_AFTER;
            render_map_window();            /* mostra subito la nuova mappa  */
            break;
        case DLG_RENOIR:
            g_renoir_gone = 1;
            g_stage = 5;
            break;
        case DLG_PAINT:
            g_stage = 6;
            g_state = ST_ENDING;
            render_ending_scene();
            break;
        default:
            break;
    }
    if (g_maelle && g_lune && g_sciel && g_stage < 3)
        g_stage = 3;                        /* spedizione completa          */
}

static void dialog_update(void)
{
    u16 keys = ~REG_KEYINPUT & 0x03FF;
    if (g_dlg_state == 0) {
        if (keys & (KEY_A | KEY_B)) {
            if (g_dlg_page + 1 < dialog_page_count(g_dialog))
                g_dlg_page++;
            else
                g_dlg_state = 2;
        }
    } else if (g_dlg_state == 2) {
        if (keys & (KEY_A | KEY_B)) {
            close_dialog();
        }
    }
}

/*------------------------------------------------------------------------------
 * Mondo
 *---------------------------------------------------------------------------*/
static int npc_visible(int i)
{
    /* quali NPC sono presenti nel mondo corrente e nello stage attuale      */
    if (g_world == 0) {
        switch (i) {
            case 0:  return 1;                                /* Sophie      */
            case 1:  return g_stage >= 2 && g_stage < 6;      /* Maelle      */
            case 2:  return g_stage >= 2 && g_stage < 6;      /* Lune        */
            case 3:  return g_stage >= 2 && g_stage < 6;      /* Sciel       */
            case 6:  return 1;                                /* Esquie      */
            default: return 0;
        }
    } else if (g_world == 1) {
        return (i == 7 && !g_renoir_gone);                    /* Renoir      */
    } else if (g_world == 2) {
        return (i == 8);                                      /* Paintress   */
    }
    return 0;
}

static int player_collides(int x, int y)
{
    int i;
    if (is_blocked(x, y))
        return 1;
    for (i = 0; i < 9; i++) {
        if (npc_visible(i) && g_npc[i].x == x && g_npc[i].y == y)
            return 1;
    }
    return 0;
}

static void try_move(int dx, int dy, int facing)
{
    int nx = g_p.x + dx, ny = g_p.y + dy;
    g_p.facing = facing;
    if (g_p.step > 0)
        return;
    if (player_collides(nx, ny))
        return;
    g_p.x = nx;
    g_p.y = ny;
    g_p.step = 1;
}

static void handle_npc_talk(int dx, int dy, int *talk)
{
    int tx = g_p.x + dx, ty = g_p.y + dy;
    int i;
    if (g_state != ST_WORLD)
        return;
    for (i = 0; i < 9; i++) {
        if (npc_visible(i) && g_npc[i].x == tx && g_npc[i].y == ty) {
            switch (i) {
                case 0: start_dialog(DLG_SOPHIE); break;
                case 1: start_dialog(g_maelle ? DLG_MAELLE_A : DLG_MAELLE_G); break;
                case 2: start_dialog(g_lune ? DLG_LUNE_A : DLG_LUNE_G); break;
                case 3: start_dialog(g_sciel ? DLG_SCIEL_A : DLG_SCIEL_G); break;
                case 6:
                    if (g_stage >= 3)
                        start_dialog(DLG_ESQ_BOARD);
                    else
                        start_dialog(DLG_ESQ_EARLY);
                    break;
                case 7: start_dialog(DLG_RENOIR); break;
                case 8: start_dialog(DLG_PAINT); break;
                default: break;
            }
            *talk = 1;
            return;
        }
    }
}

static void world_update(void)
{
    u16 keys = ~REG_KEYINPUT & 0x03FF;

    /* passaggio automatico CONTINENTE -> MONOLITE                          */
    if (g_world == 1 && g_renoir_gone) {
        if (g_p.y <= 7 && g_p.x >= 26 && g_p.x <= 29) {
            g_world = 2;
            g_p.x = 30; g_p.y = 60;
            g_p.px = 30 * 8; g_p.py = 60 * 8;
        }
    }

    if (g_p.step > 0) {
        g_p.step++;
        if (g_p.step >= MOVE_TICKS)
            g_p.step = 0;
        return;
    }

    if (keys & (KEY_UP | KEY_DOWN | KEY_LEFT | KEY_RIGHT)) {
        int talk = 0;
        if (keys & KEY_UP)    { handle_npc_talk(0, -1, &talk); if (!talk) try_move(0, -1, 0); }
        else if (keys & KEY_DOWN)  { handle_npc_talk(0, 1, &talk); if (!talk) try_move(0, 1, 1); }
        else if (keys & KEY_LEFT)  { handle_npc_talk(-1, 0, &talk); if (!talk) try_move(-1, 0, 2); }
        else if (keys & KEY_RIGHT) { handle_npc_talk(1, 0, &talk); if (!talk) try_move(1, 0, 3); }
    }
}

/*------------------------------------------------------------------------------
 * Fade
 *---------------------------------------------------------------------------*/
static void fade_step(void)
{
    volatile u16 *bg = (volatile u16 *)0x05000000;
    volatile u16 *ob = (volatile u16 *)0x05000200;
    int i;
    if (g_fade == 1) {
        for (i = 0; i < 64; i++)
            bg[i] = rgb15(BG_PAL[i][0] >> g_fade_cnt, BG_PAL[i][1] >> g_fade_cnt, BG_PAL[i][2] >> g_fade_cnt);
        for (i = 0; i < 128; i++)
            ob[i] = rgb15(OBJ_PAL[i / 16][i % 16][0] >> g_fade_cnt, OBJ_PAL[i / 16][i % 16][1] >> g_fade_cnt, OBJ_PAL[i / 16][i % 16][2] >> g_fade_cnt);
        g_fade_cnt++;
        if (g_fade_cnt >= FADE_MAX) {
            g_fade = 2;
            g_fade_cnt = 0;
        }
    } else if (g_fade == 3) {
        g_fade_cnt++;
        for (i = 0; i < 64; i++)
            bg[i] = rgb15(BG_PAL[i][0] >> (FADE_MAX - g_fade_cnt), BG_PAL[i][1] >> (FADE_MAX - g_fade_cnt), BG_PAL[i][2] >> (FADE_MAX - g_fade_cnt));
        for (i = 0; i < 128; i++)
            ob[i] = rgb15(OBJ_PAL[i / 16][i % 16][0] >> (FADE_MAX - g_fade_cnt), OBJ_PAL[i / 16][i % 16][1] >> (FADE_MAX - g_fade_cnt), OBJ_PAL[i / 16][i % 16][2] >> (FADE_MAX - g_fade_cnt));
        if (g_fade_cnt >= FADE_MAX) {
            g_fade = 0;
            g_fade_cnt = 0;
        }
    }
}

/*------------------------------------------------------------------------------
 * Init
 *---------------------------------------------------------------------------*/
static void init_player(void)
{
    g_p.x = 32; g_p.y = 26;
    g_p.px = 32 * 8; g_p.py = 26 * 8;
    g_p.facing = 1;
    g_p.step = 0;
}

static void init_npcs(void)
{
    g_npc[0].x = 34; g_npc[0].y = 21; g_npc[0].pal = 4; g_npc[0].tile = 44;   /* Sophie  */
    g_npc[1].x = 26; g_npc[1].y = 24; g_npc[1].pal = 1; g_npc[1].tile = 32;   /* Maelle  */
    g_npc[2].x = 40; g_npc[2].y = 18; g_npc[2].pal = 2; g_npc[2].tile = 36;   /* Lune    */
    g_npc[3].x = 46; g_npc[3].y = 35; g_npc[3].pal = 3; g_npc[3].tile = 40;   /* Sciel   */
    g_npc[4].x = 26; g_npc[4].y = 40; g_npc[4].pal = 5; g_npc[4].tile = 48;   /* Verso   */
    g_npc[5].x = 27; g_npc[5].y = 42; g_npc[5].pal = 7; g_npc[5].tile = 52;   /* Monoco  */
    g_npc[6].x = 5;  g_npc[6].y = 61; g_npc[6].pal = 7; g_npc[6].tile = 56;   /* Esquie  */
    g_npc[7].x = 28; g_npc[7].y = 11; g_npc[7].pal = 6; g_npc[7].tile = 60;   /* Renoir  */
    g_npc[8].x = 30; g_npc[8].y = 38; g_npc[8].pal = 4; g_npc[8].tile = 64;   /* Paintress */
}

static void init_video(void)
{
    /* Mode 0, BG0 8bpp, screenblock 20 */
    REG_DISPCNT = MODE_0 | BG0_ENABLE | OBJ_ENABLE | OBJ_1D_MAP;
    REG_BG0CNT = (0 & 3) | ((0 & 3) << 2) | (1 << 7) | ((20 & 31) << 8);
    REG_BG0HOFS = 0;
    REG_BG0VOFS = 0;

    build_palettes();
    build_bg_tiles();
    build_text_tiles();
    build_box_tiles();
    build_gold_text_tiles();
    build_sprites();

    g_state = ST_TITLE;
    render_intro_scene();
}

/*------------------------------------------------------------------------------
 * Main
 *---------------------------------------------------------------------------*/
int main(void)
{
    irqInit();
    irqEnable(IRQ_VBLANK);
    VBlankIntrWait();

    init_video();
    init_player();
    init_npcs();

    while (1) {
        VBlankIntrWait();
        g_frame++;

        if (g_state == ST_TITLE) {
            u16 keys = ~REG_KEYINPUT & 0x03FF;
            if (keys & KEY_START) {
                g_state = ST_WORLD;
                g_world = 0;
                g_stage = 0;
                render_map_window();
                start_dialog(DLG_INTRO);
            }
        } else if (g_state == ST_WORLD) {
            world_update();
            g_p.px = g_p.x * 8;
            g_p.py = g_p.y * 8;
            render_map_window();
        } else if (g_state == ST_DIALOG) {
            dialog_update();
            if (g_dialog >= 0) {
                int p = g_dlg_page;
                const char *const *txt = DIALOGS[g_dialog];
                int i;
                for (i = 0; i < VIS_W; i++) {
                    BG0_MAP[BOX_TOP * 32 + i] = (i == 0) ? T_BOX_BASE :
                                                (i == VIS_W - 1) ? (T_BOX_BASE + 2) : (T_BOX_BASE + 1);
                    BG0_MAP[(BOX_LINE1) * 32 + i] = (i == 0) ? (T_BOX_BASE + 3) :
                                                     (i == VIS_W - 1) ? (T_BOX_BASE + 5) : (T_BOX_BASE + 4);
                    BG0_MAP[(BOX_LINE2) * 32 + i] = (i == 0) ? (T_BOX_BASE + 3) :
                                                     (i == VIS_W - 1) ? (T_BOX_BASE + 5) : (T_BOX_BASE + 4);
                    BG0_MAP[BOX_BOT * 32 + i] = (i == 0) ? (T_BOX_BASE + 6) :
                                                (i == VIS_W - 1) ? (T_BOX_BASE + 8) : (T_BOX_BASE + 7);
                }
                render_text(1, BOX_LINE1, txt[p * 2]);
                render_text(1, BOX_LINE2, txt[p * 2 + 1]);
            }
        } else if (g_state == ST_ENDING) {
            render_ending_scene();
        }

        fade_step();
        update_oam();
    }

    return 0;
}