// Shim per compilare la logica di combattimento sul PC.
//
// battle.c e battle_ai.c sono logica pura: non devono dipendere dalla GBA.
// Sul ROM i tipi base arrivano da tonc_types.h, sul PC glibc ha altre
// larghezze e altri limiti di integer promotion. Qui li dichiariamo con la
// stessa dimensione del ROM cosi' che un test non passi sull'host e fallisca
// sul dispositivo (o viceversa).
//
// Serve solo per il banco di prova in tests/, non finisce nel ROM.

#ifndef PALIMPSESTO_HOST_SHIM_H
#define PALIMPSESTO_HOST_SHIM_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef int8_t   s8;
typedef int16_t  s16;
typedef int32_t  s32;

// I tasti non esistono sul PC: battle.c non deve leggerli, ma alcuni header
// condividi li nominano. Le costanti servono solo a far compilare.
#define KEY_A        (1 << 0)
#define KEY_B        (1 << 1)
#define KEY_SELECT   (1 << 2)
#define KEY_START    (1 << 3)
#define KEY_RIGHT    (1 << 4)
#define KEY_LEFT     (1 << 5)
#define KEY_UP       (1 << 6)
#define KEY_DOWN     (1 << 7)
#define KEY_R        (1 << 8)
#define KEY_L        (1 << 9)

typedef struct {
	u16 attr0;
	u16 attr1;
	u16 attr2;
} OBJATTR;

#endif // PALIMPSESTO_HOST_SHIM_H