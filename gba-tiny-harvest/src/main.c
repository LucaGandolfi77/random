/*==============================================================================
 *  TINY HARVEST
 *  Un piccolo gioco agricolo in stile Harvest Moon per Game Boy Advance.
 *
 *  - Intro "cozy & misteriosa": notte stellata, luna, foschia, casetta con
 *    finestra accesa, lucciole animate, titolo dorato. A / START per iniziare.
 *  - Mode 0, un solo BG0 (8bpp): mappa + HUD + box messaggi nello stesso
 *    layer, nessuna sovrapposizione di testo.
 *  - Personaggi: NONNO (missioni agricole) e LA STRETTA (missioni misteriose).
 *    Parla con loro premendo A davanti a loro. Sistema di quest a catena.
 *  - D-Pad: muovi    A: usa strumento / parla / avanza nei dialoghi
 *    SELECT: cambia strumento    START: dormi    B: chiudi dialoghi/tutorial
 *
 *  Build con devkitPro:  make
 *============================================================================*/

#include <gba_base.h>
#include <gba.h>
#include <string.h>

/*------------------------------------------------------------------------------
 * Configurazione
 *---------------------------------------------------------------------------*/
#define MAP_W         30          /* larghezza mappa in tile (240px / 8)     */
#define MAP_H         20          /* altezza mappa in tile (160px / 8)       */
#define DAY_LENGTH    (60 * 30)   /* 30 secondi per giorno di gioco          */
#define MOVE_TICKS    4           /* frame per percorrere un tile            */
#define MSG_TIME      150         /* frame di durata di un messaggio         */
#define SEED_COST     10          /* soldi per seme                          */
#define SELL_PRICE    25          /* soldi per rapa venduta                  */

#define BOX_TOP       16          /* prima riga del box messaggi             */
#define BOX_LINE1     17          /* riga testo 1 del box                    */
#define BOX_LINE2     18          /* riga testo 2 del box                    */
#define BOX_BOT       19          /* ultima riga del box                     */

/* Posizioni dei personaggi (tile mappa)                                    */
#define NONNO_X       4
#define NONNO_Y       9
#define STRETTA_X     25
#define STRETTA_Y     11

/* VRAM: tile BG0 (charblock 0), screenblock 20, tile OBJ (charblock 4)     */
#define BG0_TILES ((volatile u16 *)0x06000000)
#define BG0_MAP   ((volatile u16 *)0x0600A000)
#define OBJ_TILES ((volatile u16 *)0x06010000)
#define OBJ_OAM   ((volatile OBJATTR *)0x07000000)

/* Indici tile BG0 (8bpp)                                                   */
enum {
    T_HUD = 0, T_GRASS, T_GRASS2, T_SOIL, T_SOIL_WET,
    T_CROP0, T_CROP1, T_CROP2, T_CROP3,
    T_WATER, T_TREE, T_FENCE, T_HOUSE, T_DOOR, T_BOX, T_ROCK
};
#define T_TEXT_BASE  16          /* font normale (crema) 16..74              */
#define T_BOX_BASE   (T_TEXT_BASE + 59)   /* box 75..83                      */
enum {
    T_BOX_TL = T_BOX_BASE, T_BOX_T, T_BOX_TR, T_BOX_L,
    T_BOX_BG, T_BOX_R, T_BOX_BL, T_BOX_B, T_BOX_BR
};
#define T_INTRO_BASE 90          /* tile scena intro 90..102                 */
enum {
    T_STAR1 = T_INTRO_BASE, T_STAR2, T_MOON, T_MIST1, T_MIST2,
    T_GROUND, T_HILL1, T_HILL2, T_HILL3, T_ROOF, T_WALLWIN, T_WALL, T_SILTREE
};
#define T_GOLD_BASE  103         /* font dorato 103..161                     */
#define T_BIG_BASE   162         /* titolo grande 162..205 (11 glifi x 4)    */

/* Stato fattoria per tile                                                  */
#define F_TILLED   1
#define F_CROP     2
#define F_WATERED  16

/*------------------------------------------------------------------------------
 * Mappa
 *   u=sfondo HUD  g=erba  f=fiori  t=albero  F=recinto  H=muro casa
 *   D=porta  w=acqua  B=cassetta  X=area box messaggi (bloccata)
 *---------------------------------------------------------------------------*/
#define R0  "uuuuuuuuuuuuuuuuuuuuuuuuuuuuuu"
#define R1  "uuuuuuuuuuuuuuuuuuuuuuuuuuuuuu"
#define R2  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
#define R3  "FHHHHHHHFFttFFgggggggggggggggF"
#define R4  "FHHHHHHHFFttFFgggggggggggggggF"
#define R5  "FHHHHHHHFFtFgggggggggggggggggF"
#define R6  "FHHHHHHHFFgggggggggggggggggggF"
#define R7  "FHHHDHHHFFgggggggggggggggggggF"
#define R8  "FFFFFFFFFFgggggggggggggggggggF"
#define R9  "FgfggggggFFwwwwggggggggggggggF"
#define R10 "FggfgggggFFwwwwggggggggggggggF"
#define R11 "FggggggggFFwwwwggggggggggggggF"
#define R12 "FggggggggFFwwwwggggggggggggggF"
#define R13 "FggggggggFFggggggggggggggggggF"
#define R14 "FggggggggggggggggggggggggggggF"
#define R15 "FggggggggggggggggggggggggggBgF"
#define R16 "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#define R17 "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#define R18 "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#define R19 "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

_Static_assert(sizeof(R0)-1 == MAP_W && sizeof(R1)-1 == MAP_W &&
               sizeof(R2)-1 == MAP_W && sizeof(R3)-1 == MAP_W &&
               sizeof(R4)-1 == MAP_W && sizeof(R5)-1 == MAP_W &&
               sizeof(R6)-1 == MAP_W && sizeof(R7)-1 == MAP_W &&
               sizeof(R8)-1 == MAP_W && sizeof(R9)-1 == MAP_W &&
               sizeof(R10)-1 == MAP_W && sizeof(R11)-1 == MAP_W &&
               sizeof(R12)-1 == MAP_W && sizeof(R13)-1 == MAP_W &&
               sizeof(R14)-1 == MAP_W && sizeof(R15)-1 == MAP_W &&
               sizeof(R16)-1 == MAP_W && sizeof(R17)-1 == MAP_W &&
               sizeof(R18)-1 == MAP_W && sizeof(R19)-1 == MAP_W,
               "map row width must be MAP_W");

static const char g_map[MAP_H][MAP_W] = {
    R0, R1, R2, R3, R4, R5, R6, R7, R8, R9,
    R10, R11, R12, R13, R14, R15, R16, R17, R18, R19
};

static u8 g_farm[MAP_H][MAP_W];

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

/* Palette BG (0-51) in stile COZY + notte misteriosa                       */
static const int BG_PAL[52][3] = {
    {26,18,12},   /*  0 sfondo box/HUD/notte - marrone caldo scuro */
    {13,24,13},   /*  1 erba chiaro - salvia                   */
    {10,19,11},   /*  2 erba medio                             */
    { 8,15, 9},   /*  3 erba scuro                             */
    { 6,12, 7},   /*  4 erba puntini                           */
    {24,19,13},   /*  5 terra chiara - crema calda             */
    {20,15,10},   /*  6 terra media                            */
    {16,12, 8},   /*  7 terra scura                            */
    {13,10, 7},   /*  8 terra bagnata                          */
    {10, 8, 6},   /*  9 terra bagnata scura                    */
    {12,24,13},   /* 10 germoglio                              */
    {16,25,13},   /* 11 foglia chiara                          */
    { 9,18, 9},   /* 12 foglia scura                           */
    {31,30,27},   /* 13 rapa bianca - crema                    */
    {29,22,24},   /* 14 rapa rosa - polvere di rosa            */
    {22,15,25},   /* 15 rapa viola - malva                     */
    {13,22,29},   /* 16 acqua chiara - azzurro polvere         */
    { 9,16,24},   /* 17 acqua media                            */
    { 7,12,19},   /* 18 acqua scura                            */
    {22,28,31},   /* 19 riflesso acqua                         */
    {17,11, 6},   /* 20 tronco                                 */
    { 8,16, 8},   /* 21 foglia scura verde                     */
    {11,20,11},   /* 22 foglia media verde                     */
    {15,24,15},   /* 23 foglia chiara verde                    */
    {26,21,14},   /* 24 recinto chiaro - tan caldo             */
    {19,15, 9},   /* 25 recinto scuro                          */
    {26,16,11},   /* 26 mattone - terracotta                   */
    {20,12, 8},   /* 27 mattone scuro                          */
    {16,11, 6},   /* 28 porta                                  */
    {29,26,16},   /* 29 maniglia - oro morbido                 */
    {24,17,10},   /* 30 cassetta legno                         */
    {18,12, 7},   /* 31 cassetta scuro                         */
    {30,29,26},   /* 32 etichetta cassetta                     */
    {24,24,24},   /* 33 pietra chiara                          */
    {18,18,18},   /* 34 pietra scura                           */
    {28,16,14},   /* 35 fiore rosso - corallo                  */
    {30,27,15},   /* 36 fiore giallo - burro                   */
    {31,31,30},   /* 37 fiore bianco                           */
    {22,22,22},   /* 38 roccia chiara                          */
    {15,15,15},   /* 39 roccia scura                           */
    {26,18,12},   /* 40 (riservato)                            */
    {28,23,16},   /* 41 bordo box - tan caldo                  */
    {31,30,27},   /* 42 testo - crema calda                    */
    {30,27,17},   /* 43 accento oro (riservato)                */
    {30,26,13},   /* 44 titolo oro caldo                       */
    {30,30,28},   /* 45 stella - crema brillante               */
    {29,29,26},   /* 46 luna - avorio                          */
    {21,18,15},   /* 47 foschia - grigio caldo                 */
    {26,28,18},   /* 48 lucciola (BG, non usato)               */
    {30,26,10},   /* 49 finestra accesa - ambra                */
    {11, 9, 6},   /* 50 sagoma casa - nero caldo               */
    {12, 9, 7},   /* 51 terra notturna                         */
};

/* Palette OBJ (16 colori, banco 0)                                        */
static const int OBJ_PAL[16][3] = {
    { 0, 0, 0}, {31,25,19}, {29,22,15}, {18,12, 6}, {14, 9, 4},
    {28,12,11}, {22, 9, 8}, {10,16,24}, { 8,12,20}, {14, 9, 6}, { 6, 5, 5},
    {29,27,16},   /* 11 paglia (cappello Nonno)               */
    {30,30,29},   /* 12 barba bianca                          */
    {20,13, 7},   /* 13 mantello marrone                      */
    {15, 9, 5},   /* 14 marrone scuro / cappello strega       */
    {23,13,25},   /* 15 veste viola strega                    */
};

/* 16 tile della mappa */
static const char *const BG_ART[16][8] = {
    { "00000000", "00000000", "00000000", "00000000",
      "00000000", "00000000", "00000000", "00000000" },
    { "12121121", "11211212", "21132112", "12111211",
      "11212113", "21121121", "12111212", "11212111" },
    { "12111211", "11211212", "21121121", "1211ZbZ1",
      "1121ZbZ2", "21121121", "12111212", "11212111" },
    { "55555555", "56565656", "65656565", "56567656",
      "65656565", "56565656", "65657565", "55555555" },
    { "88888888", "89898989", "98989898", "89898989",
      "98989898", "89898989", "98989898", "88888888" },
    { "55555555", "56565656", "65656565", "5655AA55",
      "6565AA65", "565BBBB5", "65656565", "55555555" },
    { "55555555", "56565656", "65656565", "565BB565",
      "65BBBB56", "56BBBB65", "65656565", "55555555" },
    { "56555565", "65BBBB56", "56BBBB65", "5BBBBBB5",
      "65DDDD56", "56DDDD65", "65656565", "55555555" },
    { "56555565", "65BBBB56", "56BBBB65", "5DDFFDD5",
      "5DFFFFD5", "5DFFFFD5", "65DDDD56", "55555555" },
    { "GHGHGHGH", "HGHGHGHG", "GHGHGHGH", "HGHGJGHG",
      "GHGHGHGH", "HGHGHGHG", "GHGHGHGH", "HGHGHGHG" },
    { "..LLLL..", ".LMMMML.", "LMMNNMML", "LMMNNMML",
      "LMMNNMML", ".LMMMML.", "..KKKK..", "..KKKK.." },
    { "OOOOOOOO", "OOOOOOOO", "POPOPOPO", "OOOOOOOO",
      "OOOOOOOO", "POPOPOPO", "OOOOOOOO", "OOOOOOOO" },
    { "QRQRQRQR", "RQRQRQRQ", "QRQRQRQR", "RQRQRQRQ",
      "QRQRQRQR", "RQRQRQRQ", "QRQRQRQR", "RQRQRQRQ" },
    { "SSSSSSSS", "SSSSSSSS", "SSSSSSSS", "SSSSSSSS",
      "SSSSSSSS", "SSSSSSSS", "SSSSSTSS", "SSSSSSSS" },
    { "VVVVVVVV", "VUUUUUUV", "VUWWUWWV", "VUWWUWWV",
      "VUUUUUUV", "VUUUUUUV", "VVVVVVVV", "VVVVVVVV" },
    { "..cccc..", ".cccccc.", ".cddddc.", "cddddddc",
      "cddddddc", ".cddddc.", ".cccccc.", "........" },
};

/* Sprite giocatore: 0=giu,1=giu passo,2=su,3=su passo,4=sx,5=sx passo,
 * 6=dx,7=dx passo (sprite dedicato)                                      */
static const char *const SPR_ART[8][16] = {
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...311A11A113...", "...3111111113...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", ".....77..77.....", ".....99..99.....",
      ".....99..99....." },
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...311A11A113...", "...3111111113...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", "....77....77....", "....99....99....",
      "....99....99...." },
    { "................", "....33333333....", "...3333333333...",
      "...3333333333...", "...3333333333...", "...3333333333...",
      "...3333333333...", "...3333333333...", "....33333333....",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", ".....77..77.....", ".....99..99.....",
      ".....99..99....." },
    { "................", "....33333333....", "...3333333333...",
      "...3333333333...", "...3333333333...", "...3333333333...",
      "...3333333333...", "...3333333333...", "....33333333....",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", "....77....77....", "....99....99....",
      "....99....99...." },
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...3111111113...", "...3A11111113...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", ".....77..77.....", ".....99..99.....",
      ".....99..99....." },
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...3111111113...", "...3A11111113...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", "....77....77....", "....99....99....",
      "....99....99...." },
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...3111111113...", "...3111111A13...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", ".....77..77.....", ".....99..99.....",
      ".....99..99....." },
    { "................", "....33333333....", "...3333333333...",
      "...3311111133...", "...3111111113...", "...3111111A13...",
      "...3111111113...", "...3111111113...", "...3311111133...",
      "....11111111....", "....57777775....", "...5.577775.5...",
      "...5.588885.5...", "....77....77....", "....99....99....",
      "....99....99...." },
};

/* NONNO: cappello di paglia, barba, mantello marrone (tile OBJ 34-37)     */
static const char *const NONNO_ART[16] = {
    "................", "..BBBBBBBBBBBB..", "..BBBBBBBBBBBB..",
    "...BBBBBBBBBB...", "...B11111111B...", "...B1A1A1111B...",
    "....CCCCCCCC....", "...CCCCCCCCCC...", "...CCCCCCCCCC...",
    "...DDDDDDDDDD...", "..DDD......DDD..", "..DDD......DDD..",
    "..D11......11D..", "..DDD......DDD..", "..99........99..",
    "..99........99..",
};

/* LA STRETTA: cappello a punta, veste viola (tile OBJ 38-41)              */
static const char *const STRETTA_ART[16] = {
    "................", "........EE......", ".......EEEE.....",
    "......EEEEEE....", ".....EEEEEEEE...", "....EEEEEEEEEE..",
    "....EEEEEEEEEE..", "....1111111111..", "....1A1111A11...",
    "....1111111111..", "....FFFFFFFFF...", "...FFFFFFFFFFF..",
    "...FFFFFFFFFFFF.", "...FFFFFFFFFFFF.", "....FFFFFFFFF...",
    "................",
};

/* Lucciole (tile OBJ 32-33, palette bank 1)                               */
static const char *const FIRE_BRIGHT[8] = {
    "........", "...11...", "..1111..", ".111111.",
    "..1111..", "...11...", "........", "........",
};
static const char *const FIRE_DIM[8] = {
    "........", "........", "...11...", "..1111..",
    "...11...", "........", "........", "........",
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
 * Stato di gioco
 *---------------------------------------------------------------------------*/
static int g_frame = 0;
static int g_intro = 1;              /* schermata titolo attiva             */
static int g_gold = 50;
static int g_turnips = 0;
static int g_day = 1;
static int g_dayFrames = 0;

static int g_tool = 0;               /* 0 ZAPPA, 1 ACQUA, 2 SEMI, 3 MANO    */
static const char *const TOOL_NAMES[4] = { "ZAPPA", "ACQUA", "SEMI", "MANO" };

static int g_px = 12, g_py = 13;     /* tile piedi del giocatore            */
static int g_face = 0;
static int g_moving = 0;
static int g_moveFromX, g_moveFromY, g_moveToX, g_moveToY, g_moveT;

static char g_msg[28];
static int g_msgTimer = 0;
static int g_tut = 0;                /* 0 spento, 1..TUT_PAGES attivo      */
static u16 g_prevKeys = 0;

/* Quest: 0=nessuna, 1=Q1 attiva, 2=Q1 fatta, 3=Q2 attiva, 4=Q2 fatta,
 * 5=Q3 attiva, 6=Q3 fatta                                              */
static int g_stage = 0;
static int g_qprog = 0;

#define TUT_PAGES 8
static const char *const TUT[TUT_PAGES][2] = {
    { "BENVENUTO NEL TUO", "PICCOLO PODERE!" },
    { "ZAPPA IL PRATO", "CON IL TASTO A" },
    { "ANNAFFIA E SEMINA", "(SEME COSTA 10 SOLDI)" },
    { "LE RAPE CRESCONO", "1 STADIO AL GIORNO" },
    { "RACCOGLI LE RAPE", "CON LA MANO (A)" },
    { "VENDI ALLA CASSETTA", "IN BASSO A DESTRA" },
    { "PARLA CON NONNO E", "LA STRETTA: MISSIONI!" },
    { "SELECT CAMBIA STRUM.", "START = FINE GIORNO" },
};

/* Dialoghi (2 righe per pagina, max 26 caratteri per riga)                */
typedef struct { const char *l1; const char *l2; } DlgPage;
static const DlgPage *g_dlg = 0;
static int g_dlgPages = 0;
static int g_dlgPage = 0;
static int g_inDlg = 0;

static const DlgPage NONNO_START[] = {
    { "NONNO: CIAO PICCOLO!", "ZAPPA 3 CAMPI DI" },
    { "SE CI RIUSCI AVRAI", "50 SOLDI IN REGALO!" },
};
static const DlgPage NONNO_REMIND[] = {
    { "NONNO: VAI, ZAPPA", "DELLA ERBA NEL CAMPO" },
};
static const DlgPage NONNO_DONE[] = {
    { "NONNO: BRAVO! ECCO", "50 SOLDI PER TE!" },
};
static const DlgPage NONNO_GENERIC[] = {
    { "NONNO: IL PODERE", "E NELLE TUE MANI." },
};
static const DlgPage STRETTA_HINT[] = {
    { "STRETTA: SENTO UN", "GRANDE DESTINO..." },
};
static const DlgPage STRETTA_Q2[] = {
    { "STRETTA: PORTA", "5 RAPE MATURE..." },
    { "PAGO 100 SOLDI.", "TORNA DA ME!" },
};
static const DlgPage STRETTA_REMIND2[] = {
    { "STRETTA: SERVE", "5 RAPE MATURE..." },
};
static const DlgPage STRETTA_DONE2[] = {
    { "STRETTA: MAGICO!", "ECCO 100 SOLDI." },
};
static const DlgPage STRETTA_Q3[] = {
    { "STRETTA: VENDI 5", "RAPE ALLA CASSETTA" },
    { "PAGO 200 SOLDI.", "A PRESTO..." },
};
static const DlgPage STRETTA_REMIND3[] = {
    { "STRETTA: USA LA", "CASSETTA, PICCOLINO." },
};
static const DlgPage STRETTA_DONE3[] = {
    { "STRETTA: IL PODERE", "E SALVO. GRAZIE!" },
};
static const DlgPage STRETTA_END[] = {
    { "STRETTA: RIPOSA", "ORA, PICCOLO FATTORE." },
};

static const int FDX[4] = { 0, 0, -1, 1 };
static const int FDY[4] = { 1, -1, 0, 0 };

/* Tabella seno per le animazioni (lucciole, alberi...)                    */
static const int SINTAB[32] = {
    0, 3, 6, 9, 11, 13, 15, 16, 16, 16, 15, 13, 11, 9, 6, 3,
    0, -3, -6, -9, -11, -13, -15, -16, -16, -16, -15, -13, -11, -9, -6, -3
};

/*------------------------------------------------------------------------------
 * Helper di basso livello
 *---------------------------------------------------------------------------*/
static void copy_tile(volatile u16 *dst, const u8 *src, int bytes)
{
    int i;
    for (i = 0; i < bytes; i += 2)
        dst[i >> 1] = (u16)(src[i] | (src[i + 1] << 8));
}

static void build_palettes(void)
{
    volatile u16 *bg = (volatile u16 *)0x05000000;
    volatile u16 *obj = (volatile u16 *)0x05000200;
    int i;
    for (i = 0; i < 52; i++)
        bg[i] = rgb15(BG_PAL[i][0], BG_PAL[i][1], BG_PAL[i][2]);
    for (i = 0; i < 16; i++)
        obj[i] = rgb15(OBJ_PAL[i][0], OBJ_PAL[i][1], OBJ_PAL[i][2]);
    /* banco 1 della palette OBJ: colore lucciola */
    ((volatile u16 *)0x05000222)[0] = rgb15(26, 28, 18);
}

static void build_bg_tiles(void)
{
    int t, r, c;
    u8 tmp[64];
    for (t = 0; t < 16; t++) {
        for (r = 0; r < 8; r++)
            for (c = 0; c < 8; c++)
                tmp[r * 8 + c] = art_pal(BG_ART[t][r][c]);
        copy_tile(BG0_TILES + t * 32, tmp, 64);
    }
}

/* Font 8bpp con colore dato (bit impostato -> colore, altrimenti 0)        */
static void build_font_color(int base, int color)
{
    int g, r, c;
    u8 tmp[64];
    for (g = 0; g < 59; g++) {
        for (r = 0; r < 8; r++) {
            u8 bits = FONT[g][r];
            for (c = 0; c < 8; c++)
                tmp[r * 8 + c] = (bits & (0x80 >> c)) ? (u8)color : 0;
        }
        copy_tile(BG0_TILES + (base + g) * 32, tmp, 64);
    }
}

/* Box messaggi: 9 tile con bordo arrotondato (colore 41 su sfondo 0)       */
static void build_box_tiles(void)
{
    static const int BORDER = 41;
    u8 t[9][64];
    int i, x, y;
    memset(t, 0, sizeof(t));
    for (x = 0; x < 8; x++) {
        t[0][x] = BORDER; t[1][x] = BORDER; t[2][x] = BORDER;
        t[6][56 + x] = BORDER; t[7][56 + x] = BORDER; t[8][56 + x] = BORDER;
    }
    for (y = 0; y < 8; y++) {
        t[0][y * 8] = BORDER; t[3][y * 8] = BORDER; t[6][y * 8] = BORDER;
        t[2][y * 8 + 7] = BORDER; t[5][y * 8 + 7] = BORDER; t[8][y * 8 + 7] = BORDER;
    }
    t[0][0] = 0; t[2][7] = 0; t[6][56] = 0; t[8][63] = 0;
    for (i = 0; i < 9; i++)
        copy_tile(BG0_TILES + (T_BOX_BASE + i) * 32, t[i], 64);
}

/* Tile della scena intro (string art)                                      */
static void build_intro_tiles(void)
{
    static const char *const art[13][8] = {
        { "........", "........", "...j....", "........",
          "........", "........", "........", "........" },                 /* stella 1 */
        { "........", "...j....", "...j....", ".jjjjj..",
          "...j....", "...j....", "........", "........" },                 /* stella 2 */
        { "........", "...kk...", "..kkkk..", ".kkkkk..",
          ".kkkk...", "..kk....", "........", "........" },                 /* luna */
        { "........", "........", "..llll..", "........",
          "........", ".ll..ll.", "........", "........" },                 /* foschia 1 */
        { "........", "........", "........", ".ll..ll.",
          "........", "..llll..", "........", "........" },                 /* foschia 2 */
        { "pppppppp", "pppppppp", "pppppppp", "pppppppp",
          "pppppppp", "pppppppp", "pppppppp", "pppppppp" },                 /* terra */
        { "00000000", "00pppp00", "0pppppp0", "pppppppp",
          "pppppppp", "pppppppp", "pppppppp", "pppppppp" },                 /* collina 1 */
        { "00000000", "000ppp00", "00ppppp0", "0ppppppp",
          "pppppppp", "pppppppp", "pppppppp", "pppppppp" },                 /* collina 2 */
        { "00000000", "0pppppp0", "pppppppp", "pppppppp",
          "pppppppp", "pppppppp", "pppppppp", "pppppppp" },                 /* collina 3 */
        { "00000000", "000oo000", "00oooo00", "0oooooo0",
          "oooooooo", "oooooooo", "oooooooo", "oooooooo" },                 /* tetto */
        { "oooooooo", "o000000o", "o0nnnn0o", "o0nnnn0o",
          "o0nnnn0o", "o000000o", "oooooooo", "oooooooo" },                 /* muro+finestra */
        { "oooooooo", "oooooooo", "oooooooo", "oooooooo",
          "oooooooo", "oooooooo", "oooooooo", "oooooooo" },                 /* muro */
        { "..oooo..", ".oooooo.", "oooooooo", "oooooooo",
          ".oooooo.", "..oooo..", "..oo....", "..oo...." },                 /* albero */
    };
    int t, r, c;
    u8 tmp[64];
    for (t = 0; t < 13; t++) {
        for (r = 0; r < 8; r++)
            for (c = 0; c < 8; c++)
                tmp[r * 8 + c] = art_pal(art[t][r][c]);
        copy_tile(BG0_TILES + (T_INTRO_BASE + t) * 32, tmp, 64);
    }
}

/* Titolo grande: glifi 5x7 scalati 2x (oro 44) in celle 16x16             */
static int bigBase[26];
static int bigSpaceBase;

static void build_big_chars(void)
{
    static const char *const CHARS = "TINYHARVEST";
    int ci;
    for (ci = 0; ci < 26; ci++) bigBase[ci] = -1;
    for (ci = 0; ci < 10; ci++) {
        char c = CHARS[ci];
        u8 big[16][16];
        int py, px;
        memset(big, 0, sizeof(big));
        if (c >= 'A' && c <= 'Z') {
            const u8 *glyph = FONT[c - 'A' + 33];
            for (py = 0; py < 7; py++)
                for (px = 0; px < 5; px++)
                    if (glyph[py] & (0x80 >> px)) {
                        int bx = 3 + px * 2, by = 1 + py * 2;
                        big[by][bx] = 44; big[by][bx + 1] = 44;
                        big[by + 1][bx] = 44; big[by + 1][bx + 1] = 44;
                    }
        }
        /* impacchetta 16x16 in 4 tile */
        {
            u8 tiles[4][64];
            int ty, tx, y, x;
            memset(tiles, 0, sizeof(tiles));
            for (ty = 0; ty < 2; ty++)
                for (tx = 0; tx < 2; tx++)
                    for (y = 0; y < 8; y++)
                        for (x = 0; x < 8; x++)
                            tiles[ty * 2 + tx][y * 8 + x] = big[ty * 8 + y][tx * 8 + x];
            bigBase[c - 'A'] = T_BIG_BASE + ci * 4;
            for (ty = 0; ty < 4; ty++)
                copy_tile(BG0_TILES + (bigBase[c - 'A'] + ty) * 32, tiles[ty], 64);
        }
    }
    /* spazio: 4 tile vuoti */
    bigSpaceBase = T_BIG_BASE + 10 * 4;
    {
        u8 z[64];
        int i;
        memset(z, 0, sizeof(z));
        for (i = 0; i < 4; i++)
            copy_tile(BG0_TILES + (bigSpaceBase + i) * 32, z, 64);
    }
}

/* Sprite 16x16 (4 tile) da arte a stringhe                                */
static void build_frame_16(int tileBase, const char *const art[16])
{
    u8 grid[16][16];
    int y, x, ty, tx;
    for (y = 0; y < 16; y++)
        for (x = 0; x < 16; x++)
            grid[y][x] = art_pal(art[y][x]);
    for (ty = 0; ty < 2; ty++)
        for (tx = 0; tx < 2; tx++) {
            u8 tmp[32];
            int tileIdx = tileBase + ty * 2 + tx;
            for (y = 0; y < 8; y++)
                for (x = 0; x < 8; x += 2)
                    tmp[y * 4 + x / 2] = (u8)(grid[ty*8+y][tx*8+x] |
                                              (grid[ty*8+y][tx*8+x+1] << 4));
            copy_tile(OBJ_TILES + tileIdx * 16, tmp, 32);
        }
}

/* Sprite 8x8 (1 tile)                                                      */
static void build_frame_8(int tileIdx, const char *const art[8])
{
    u8 tmp[32];
    int y, x;
    for (y = 0; y < 8; y++)
        for (x = 0; x < 8; x += 2)
            tmp[y * 4 + x / 2] = (u8)(art_pal(art[y][x]) |
                                      (art_pal(art[y][x + 1]) << 4));
    copy_tile(OBJ_TILES + tileIdx * 16, tmp, 32);
}

static void build_sprites(void)
{
    int f;
    for (f = 0; f < 8; f++)
        build_frame_16(f * 4, SPR_ART[f]);        /* giocatore 0-31  */
    build_frame_8(32, FIRE_BRIGHT);               /* lucciola 32-33  */
    build_frame_8(33, FIRE_DIM);
    build_frame_16(34, NONNO_ART);                /* nonno 34-37     */
    build_frame_16(38, STRETTA_ART);              /* strega 38-41    */
}

static void init_video(void)
{
    int i;
    REG_DISPCNT = MODE_0 | BG0_ENABLE | OBJ_ENABLE | OBJ_1D_MAP;
    REG_BG0CNT = (0 & 3) | ((0 & 3) << 2) | (1 << 7) | ((20 & 31) << 8);
    for (i = 0; i < 128; i++)
        OBJ_OAM[i].attr0 = 0x0200;
}

/*------------------------------------------------------------------------------
 * Rendering
 *---------------------------------------------------------------------------*/
static u16 base_tile(char c)
{
    switch (c) {
    case 'u': return T_HUD;
    case 'g': return T_GRASS;
    case 'f': return T_GRASS2;
    case 'w': return T_WATER;
    case 't': return T_TREE;
    case 'F': return T_FENCE;
    case 'H': return T_HOUSE;
    case 'D': return T_DOOR;
    case 'B': return T_BOX;
    case 'r': return T_ROCK;
    default:  return T_GRASS;
    }
}

static u16 box_tile(int y, int x)
{
    if (y == BOX_TOP)
        return (x == 0) ? T_BOX_TL : (x == MAP_W - 1) ? T_BOX_TR : T_BOX_T;
    if (y == BOX_BOT)
        return (x == 0) ? T_BOX_BL : (x == MAP_W - 1) ? T_BOX_BR : T_BOX_B;
    return (x == 0) ? T_BOX_L : (x == MAP_W - 1) ? T_BOX_R : T_BOX_BG;
}

static void render_map(void)
{
    int x, y;
    volatile u16 *m = BG0_MAP;
    for (y = 0; y < MAP_H; y++) {
        for (x = 0; x < MAP_W; x++) {
            u16 t;
            if (y >= BOX_TOP) {
                t = box_tile(y, x);
            } else {
                u8 f = g_farm[y][x];
                int type = f & 3;
                if (type == 0)
                    t = base_tile(g_map[y][x]);
                else if (type == F_TILLED)
                    t = (f & F_WATERED) ? T_SOIL_WET : T_SOIL;
                else
                    t = (u16)(T_CROP0 + ((f >> 2) & 3));
            }
            m[y * 32 + x] = t;
        }
    }
}

static u16 glyph_tile(char c)
{
    if (c >= ' ' && c <= 'Z') return (u16)(T_TEXT_BASE + (c - ' '));
    return T_TEXT_BASE;
}

static u16 glyph_gold(char c)
{
    if (c >= ' ' && c <= 'Z') return (u16)(T_GOLD_BASE + (c - ' '));
    return T_GOLD_BASE;
}

static void text_at(int x, int y, const char *s)
{
    int i;
    volatile u16 *row = BG0_MAP + y * 32;
    for (i = 0; s[i] && (x + i) < MAP_W; i++)
        row[x + i] = glyph_tile(s[i]);
}

static void text_at_gold(int x, int y, const char *s)
{
    int i;
    volatile u16 *row = BG0_MAP + y * 32;
    for (i = 0; s[i] && (x + i) < MAP_W; i++)
        row[x + i] = glyph_gold(s[i]);
}

static void text_clear(int y, int x0, int x1)
{
    int x;
    volatile u16 *row = BG0_MAP + y * 32;
    for (x = x0; x <= x1; x++)
        row[x] = T_TEXT_BASE;
}

static void text_center_box(int y, const char *s)
{
    int len = (int)strlen(s);
    if (len > 26) len = 26;
    text_at(1 + (26 - len) / 2, y, s);
}

/* Titolo grande "TINY HARVEST": celle da 2x2 tile, a partire dalla colonna 3 */
static void draw_big_text(int y, const char *s)
{
    int col = 3;
    int i;
    for (i = 0; s[i] && col + 1 < MAP_W; i++) {
        char c = s[i];
        int base = (c == ' ') ? bigSpaceBase
                 : (c >= 'A' && c <= 'Z') ? bigBase[c - 'A'] : -1;
        if (base >= 0) {
            volatile u16 *m = BG0_MAP + y * 32;
            m[col] = base;         m[col + 1] = base + 1;
            m[col + 32] = base + 2; m[col + 33] = base + 3;
        }
        col += 2;
    }
}

/* Scena della schermata titolo (cozy + misteriosa)                        */
static void render_intro_scene(void)
{
    static const u8 stars[][2] = {
        {1,0},{3,2},{7,1},{11,0},{15,2},{19,1},{23,0},{27,2},
        {2,5},{6,6},{10,5},{14,6},{18,5},{22,6},{26,5},{29,6},
        {9,8},{17,7},{21,8},{4,7}
    };
    int x, y, i;
    volatile u16 *m = BG0_MAP;
    int tw = (g_frame >> 5) & 1;

    for (y = 0; y <= 8; y++)
        for (x = 0; x < MAP_W; x++)
            m[y * 32 + x] = T_HUD;              /* notte (palette 0) */
    for (i = 0; i < 20; i++)
        m[stars[i][1] * 32 + stars[i][0]] = tw ? T_STAR2 : T_STAR1;
    m[2 * 32 + 26] = T_MOON;                    /* luna crescente   */

    draw_big_text(3, "TINY HARVEST");
    text_at_gold((MAP_W - 20) / 2, 6, "UNA NOTTE MISTERIOSA");
    if ((g_frame / 30) & 1)                     /* prompt lampeggiante */
        text_at((MAP_W - 21) / 2, 8, "PREMI A PER INIZIARE");

    for (y = 9; y <= 11; y++)                   /* foschia */
        for (x = 0; x < MAP_W; x++)
            m[y * 32 + x] = ((x + y) & 1) ? T_MIST1 : T_MIST2;
    for (x = 0; x < MAP_W; x++)                 /* colline */
        m[12 * 32 + x] = (x % 3 == 0) ? T_HILL1 : (x % 3 == 1) ? T_HILL2 : T_HILL3;
    for (y = 13; y < MAP_H; y++)                /* terra */
        for (x = 0; x < MAP_W; x++)
            m[y * 32 + x] = T_GROUND;

    m[14 * 32 + 12] = T_ROOF;    m[14 * 32 + 13] = T_ROOF;      /* casetta */
    m[15 * 32 + 12] = T_WALLWIN; m[15 * 32 + 13] = T_WALL;
    m[16 * 32 + 12] = T_WALL;    m[16 * 32 + 13] = T_WALL;
    m[14 * 32 + 5] = T_SILTREE;  m[14 * 32 + 24] = T_SILTREE;   /* alberi */
}

static void render_text(void)
{
    char buf[30];
    int i = 0;
    const char *tn;

    if (g_intro) return;                        /* l'intro ha i suoi testi */

    /* --- HUD riga 0: SOLDI + GIORNO --- */
    text_clear(0, 0, MAP_W - 1);
    buf[i++] = 'S'; buf[i++] = 'O'; buf[i++] = 'L'; buf[i++] = 'D';
    buf[i++] = 'I'; buf[i++] = ':';
    buf[i++] = (char)('0' + (g_gold / 1000) % 10);
    buf[i++] = (char)('0' + (g_gold / 100) % 10);
    buf[i++] = (char)('0' + (g_gold / 10) % 10);
    buf[i++] = (char)('0' + g_gold % 10);
    buf[i++] = ' '; buf[i++] = ' ';
    buf[i++] = 'G'; buf[i++] = 'I'; buf[i++] = 'O'; buf[i++] = 'R';
    buf[i++] = 'N'; buf[i++] = 'O'; buf[i++] = ':';
    buf[i++] = (char)('0' + (g_day / 10) % 10);
    buf[i++] = (char)('0' + g_day % 10);
    buf[i] = 0;
    text_at(0, 0, buf);

    /* --- HUD riga 1: strumento + rape + quest --- */
    i = 0;
    buf[i++] = 'S'; buf[i++] = 'T'; buf[i++] = 'R'; buf[i++] = 'U';
    buf[i++] = 'M'; buf[i++] = '.'; buf[i++] = ':';
    tn = TOOL_NAMES[g_tool];
    while (*tn) buf[i++] = *tn++;
    buf[i++] = ' '; buf[i++] = ' ';
    buf[i++] = 'R'; buf[i++] = 'A'; buf[i++] = 'P'; buf[i++] = 'E';
    buf[i++] = ':';
    if (g_turnips >= 10) {
        buf[i++] = (char)('0' + g_turnips / 10);
        buf[i++] = (char)('0' + g_turnips % 10);
    } else {
        buf[i++] = (char)('0' + g_turnips);
    }
    buf[i++] = ' ';
    {
        int qn = 0, qmax = 0, qdone = 0;
        switch (g_stage) {
        case 1: qn = 1; qmax = 3; break;
        case 2: qn = 1; qdone = 1; break;
        case 3: qn = 2; qmax = 5; break;
        case 4: qn = 2; qdone = 1; break;
        case 5: qn = 3; qmax = 5; break;
        case 6: qn = 3; qdone = 1; break;
        }
        buf[i++] = 'Q';
        if (qn) {
            buf[i++] = (char)('0' + qn);
            buf[i++] = ':';
            if (qdone) {
                buf[i++] = 'F'; buf[i++] = 'A'; buf[i++] = 'T';
                buf[i++] = 'T'; buf[i++] = 'A';
            } else {
                int p = g_qprog > qmax ? qmax : g_qprog;
                buf[i++] = (char)('0' + p);
                buf[i++] = '/';
                buf[i++] = (char)('0' + qmax);
            }
        } else {
            buf[i++] = '-';
        }
    }
    buf[i] = 0;
    text_at(0, 1, buf);

    /* --- box messaggi --- */
    text_clear(BOX_LINE1, 1, MAP_W - 2);
    text_clear(BOX_LINE2, 1, MAP_W - 2);
    if (g_inDlg) {
        text_center_box(BOX_LINE1, g_dlg[g_dlgPage].l1);
        text_center_box(BOX_LINE2, g_dlg[g_dlgPage].l2);
    } else if (g_tut > 0) {
        text_center_box(BOX_LINE1, TUT[g_tut - 1][0]);
        text_center_box(BOX_LINE2, TUT[g_tut - 1][1]);
    } else if (g_msgTimer > 0) {
        text_center_box(BOX_LINE1, g_msg);
        g_msgTimer--;
    }
}

static void show_msg(const char *s)
{
    strncpy(g_msg, s, sizeof(g_msg) - 1);
    g_msg[sizeof(g_msg) - 1] = 0;
    g_msgTimer = MSG_TIME;
}

static void msg_num(const char *pre, int num, const char *suf)
{
    char buf[28];
    int i = 0;
    while (*pre && i < 27) buf[i++] = *pre++;
    if (num >= 1000) buf[i++] = (char)('0' + (num / 1000) % 10);
    if (num >= 100)  buf[i++] = (char)('0' + (num / 100) % 10);
    if (num >= 10)   buf[i++] = (char)('0' + (num / 10) % 10);
    buf[i++] = (char)('0' + num % 10);
    while (*suf && i < 27) buf[i++] = *suf++;
    buf[i] = 0;
    show_msg(buf);
}

static void msg_day(void)
{
    char buf[12];
    int i = 0;
    buf[i++] = 'G'; buf[i++] = 'I'; buf[i++] = 'O'; buf[i++] = 'R';
    buf[i++] = 'N'; buf[i++] = 'O'; buf[i++] = ' ';
    buf[i++] = (char)('0' + (g_day / 10) % 10);
    buf[i++] = (char)('0' + g_day % 10);
    buf[i] = 0;
    show_msg(buf);
}

static void start_dlg(const DlgPage *p, int n)
{
    g_dlg = p;
    g_dlgPages = n;
    g_dlgPage = 0;
    g_inDlg = 1;
}

static void update_oam(void)
{
    int i;
    volatile OBJATTR *o = OBJ_OAM;

    if (g_intro) {
        /* lucciole animate */
        static const int FX[3] = { 70, 140, 205 };
        static const int FY[3] = { 86, 104, 68 };
        for (i = 0; i < 3; i++) {
            int t = g_frame;
            int sx = FX[i] + SINTAB[(t / 3 + i * 8) & 31] * 2;
            int sy = FY[i] + SINTAB[(t / 4 + i * 11) & 31];
            int tile = ((t / 18 + i) & 1) ? 33 : 32;
            o[i].attr0 = (u16)((sy & 0xFF) | (0 << 12) | (0 << 11));
            o[i].attr1 = (u16)((sx & 0x1FF) | (0 << 14));
            o[i].attr2 = (u16)(tile | (1 << 10));     /* palette bank 1 */
        }
    } else {
        /* giocatore */
        int sx, sy, frame;
        if (g_moving) {
            int dx = g_moveToX - g_moveFromX;
            int dy = g_moveToY - g_moveFromY;
            int sub = g_moveT * 2;
            sx = g_moveFromX * 8 - 4 + dx * sub;
            sy = g_moveFromY * 8 - 8 + dy * sub;
        } else {
            sx = g_px * 8 - 4;
            sy = g_py * 8 - 8;
        }
        frame = g_face * 2;
        if (g_moving && (g_moveT & 1)) frame += 1;
        o[0].attr0 = (u16)((sy & 0xFF) | (0 << 12) | (0 << 11));
        o[0].attr1 = (u16)((sx & 0x1FF) | (1 << 14));
        o[0].attr2 = (u16)(frame * 4);

        /* NONNO */
        {
            int ny = NONNO_Y * 8 - 8 + (((g_frame >> 4) & 1) ? 1 : 0);
            o[1].attr0 = (u16)((ny & 0xFF) | (0 << 12) | (0 << 11));
            o[1].attr1 = (u16)(((NONNO_X * 8 - 4) & 0x1FF) | (1 << 14));
            o[1].attr2 = 34;
        }
        /* LA STRETTA */
        {
            int ny = STRETTA_Y * 8 - 8 + ((((g_frame >> 4) + 1) & 1) ? 1 : 0);
            o[2].attr0 = (u16)((ny & 0xFF) | (0 << 12) | (0 << 11));
            o[2].attr1 = (u16)(((STRETTA_X * 8 - 4) & 0x1FF) | (1 << 14));
            o[2].attr2 = 38;
        }
    }
    for (i = 3; i < 128; i++)
        o[i].attr0 = 0x0200;
}

/*------------------------------------------------------------------------------
 * Logica di gioco
 *---------------------------------------------------------------------------*/
static int is_blocked(int x, int y)
{
    char c;
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 1;
    if ((x == NONNO_X && y == NONNO_Y) || (x == STRETTA_X && y == STRETTA_Y))
        return 1;
    c = g_map[y][x];
    return c == 'w' || c == 't' || c == 'F' || c == 'H' ||
           c == 'D' || c == 'B' || c == 'u' || c == 'r' || c == 'X';
}

static void talk_to_npc(int npc)
{
    if (npc == 0) {                     /* NONNO */
        if (g_stage == 0) {
            g_stage = 1; g_qprog = 0;
            start_dlg(NONNO_START, 2);
        } else if (g_stage == 1 && g_qprog >= 3) {
            g_gold += 50; g_stage = 2; g_qprog = 0;
            start_dlg(NONNO_DONE, 1);
        } else if (g_stage == 1) {
            start_dlg(NONNO_REMIND, 1);
        } else {
            start_dlg(NONNO_GENERIC, 1);
        }
    } else {                            /* LA STRETTA */
        if (g_stage == 2) {
            g_stage = 3; g_qprog = 0;
            start_dlg(STRETTA_Q2, 2);
        } else if (g_stage == 3 && g_qprog >= 5) {
            g_gold += 100; g_stage = 4; g_qprog = 0;
            start_dlg(STRETTA_DONE2, 1);
        } else if (g_stage == 3) {
            start_dlg(STRETTA_REMIND2, 1);
        } else if (g_stage == 4) {
            g_stage = 5; g_qprog = 0;
            start_dlg(STRETTA_Q3, 2);
        } else if (g_stage == 5 && g_qprog >= 5) {
            g_gold += 200; g_stage = 6; g_qprog = 0;
            start_dlg(STRETTA_DONE3, 1);
        } else if (g_stage == 5) {
            start_dlg(STRETTA_REMIND3, 1);
        } else if (g_stage == 6) {
            start_dlg(STRETTA_END, 1);
        } else {
            start_dlg(STRETTA_HINT, 1);
        }
    }
}

static void update_player(u16 keys)
{
    int dx = 0, dy = 0;
    if (g_moving) {
        g_moveT++;
        if (g_moveT >= MOVE_TICKS) {
            g_moving = 0;
            g_px = g_moveToX;
            g_py = g_moveToY;
        }
        return;
    }
    if (keys & KEY_DOWN)  { dy = 1;  g_face = 0; }
    else if (keys & KEY_UP)    { dy = -1; g_face = 1; }
    else if (keys & KEY_LEFT)  { dx = -1; g_face = 2; }
    else if (keys & KEY_RIGHT) { dx = 1;  g_face = 3; }

    if (dx || dy) {
        int nx = g_px + dx, ny = g_py + dy;
        if (!is_blocked(nx, ny)) {
            g_moving = 1;
            g_moveT = 0;
            g_moveFromX = g_px;
            g_moveFromY = g_py;
            g_moveToX = nx;
            g_moveToY = ny;
        }
    }
}

static void use_tool(void)
{
    int tx, ty, type;
    char base;
    u8 f;
    if (g_moving) return;
    tx = g_px + FDX[g_face];
    ty = g_py + FDY[g_face];
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return;

    /* parla con i personaggi */
    if (tx == NONNO_X && ty == NONNO_Y)   { talk_to_npc(0); return; }
    if (tx == STRETTA_X && ty == STRETTA_Y) { talk_to_npc(1); return; }

    base = g_map[ty][tx];
    f = g_farm[ty][tx];
    type = f & 3;

    switch (g_tool) {
    case 0:                             /* ZAPPA */
        if (type == 0 && (base == 'g' || base == 'f')) {
            g_farm[ty][tx] = F_TILLED;
            if (g_stage == 1) g_qprog++;
        }
        break;
    case 1:                             /* ACQUA */
        if ((type == F_TILLED || type == F_CROP) && !(f & F_WATERED))
            g_farm[ty][tx] = (u8)(f | F_WATERED);
        break;
    case 2:                             /* SEMI */
        if (type == F_TILLED) {
            if (g_gold >= SEED_COST) {
                g_gold -= SEED_COST;
                g_farm[ty][tx] = (u8)(F_CROP | (f & F_WATERED));
                show_msg("SEMINATO!");
            } else {
                show_msg("NIENTE SOLDI!");
            }
        } else if (type == 0) {
            show_msg("PRIMA ZAPPA!");
        }
        break;
    case 3:                             /* MANO */
        if (type == F_CROP && ((f >> 2) & 3) == 3) {
            g_turnips++;
            g_farm[ty][tx] = F_TILLED;
            if (g_stage == 3) g_qprog++;
        } else if (type == F_CROP) {
            show_msg("NON PRONTO!");
        } else if (base == 'B') {
            if (g_turnips > 0) {
                int money = g_turnips * SELL_PRICE;
                if (g_stage == 5) g_qprog += g_turnips;
                g_gold += money;
                g_turnips = 0;
                msg_num("VENDUTO! +", money, " SOLDI");
            } else {
                show_msg("NULLA DA VENDERE");
            }
        }
        break;
    }
}

static void end_day(void)
{
    int x, y;
    for (y = 0; y < MAP_H; y++) {
        for (x = 0; x < MAP_W; x++) {
            u8 f = g_farm[y][x];
            int type = f & 3;
            if (type == F_CROP) {
                int stage = (f >> 2) & 3;
                if ((f & F_WATERED) && stage < 3)
                    f = (u8)(F_CROP | ((stage + 1) << 2));
                f = (u8)(f & ~F_WATERED);
            } else if (type == F_TILLED) {
                f = (u8)(f & ~F_WATERED);
            }
            g_farm[y][x] = f;
        }
    }
    g_day++;
    g_dayFrames = 0;
    msg_day();
}

/*------------------------------------------------------------------------------
 * Punto di ingresso
 *---------------------------------------------------------------------------*/
int main(void)
{
    u16 keys, pressed;

    REG_IME = 0;
    irqInit();
    irqEnable(IRQ_VBLANK);

    init_video();
    build_palettes();
    build_bg_tiles();
    build_font_color(T_TEXT_BASE, 42);
    build_font_color(T_GOLD_BASE, 44);
    build_box_tiles();
    build_intro_tiles();
    build_big_chars();
    build_sprites();
    render_intro_scene();
    REG_IME = 1;

    for (;;) {
        VBlankIntrWait();
        g_frame++;

        keys = (u16)(~REG_KEYINPUT & 0x03FF);
        pressed = (u16)(keys & ~g_prevKeys);
        g_prevKeys = keys;

        if (g_intro) {
            if (pressed & (KEY_A | KEY_START)) {
                g_intro = 0;
                g_tut = 1;                  /* tutorial dopo l'intro */
            }
        } else {
            update_player(keys);
            if (g_inDlg) {
                if (pressed & KEY_A) {
                    g_dlgPage++;
                    if (g_dlgPage >= g_dlgPages) g_inDlg = 0;
                }
                if (pressed & KEY_B) g_inDlg = 0;
            } else if ((pressed & KEY_SELECT) && (keys & KEY_START)) {
                g_tut = 1;                  /* riapri il tutorial */
            } else if (g_tut > 0) {
                if (pressed & KEY_A) {
                    g_tut++;
                    if (g_tut > TUT_PAGES) g_tut = 0;
                }
                if ((pressed & KEY_B) || (pressed & KEY_START))
                    g_tut = 0;
            } else {
                if (pressed & KEY_A)      use_tool();
                if (pressed & KEY_SELECT) g_tool = (g_tool + 1) & 3;
                if (pressed & KEY_START)  end_day();
                if (++g_dayFrames >= DAY_LENGTH)
                    end_day();
            }
        }

        if (g_intro)
            render_intro_scene();
        else
            render_map();
        render_text();
        update_oam();
    }
}
