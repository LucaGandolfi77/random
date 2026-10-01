// Shim per compilare il motore fisico sul PC.
//
// tonc_types.h e' pensato per la GBA, dove gli interi hanno dimensioni fisse.
// Sul PC i tipi base hanno invece la larghezza naturale della macchina, e il
// punto fisso a 16 bit frazionali non sopporta valori cosi' grandi: per questo
// qui fx e' long long e i calcoli della fisica girano su interi a 64 bit.
//
// Serve solo per il banco di prova in tests/, non finisce nel ROM.

#ifndef MARMOTTA_HOST_SHIM_H
#define MARMOTTA_HOST_SHIM_H

#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

// Con -std=c11 la glibc non espone M_PI: lo ridefiniamo qui.
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;
typedef int8_t   s8;
typedef int16_t  s16;
typedef int32_t  s32;
typedef int64_t  s64;
typedef volatile u8  vu8;
typedef volatile u16 vu16;
typedef volatile u32 vu32;

// Sul PC il punto fisso usa 32 bit di frazione invece di 16, cosi' nessuna
// operazione della fisica perde precisione e i confronti con il codice GBA
// restano leggibili. I valori numerici in pixel sono identici.
//
// Con 32 bit frazionali i prodotti intermedi sono a 64 bit e oltre, quindi qui
// si usa __int128: e' esattamente la stessa operazione che sul GBA fa il
// codice a 64 bit, solo che senza traboccamento.
typedef s64 fxp;
typedef s64 fx;
#define FX_SHIFT   32
#define FX_ONE     ((fxp)1 << FX_SHIFT)
#define FX_HALF    (FX_ONE / 2)
#define FX_TWO_PI  0x10000

static inline fxp fx_mul(fxp a, fxp b)
{
	return (fxp)(((__int128)a * b) >> FX_SHIFT);
}

static inline fxp fx_div(fxp a, fxp b)
{
	return b ? (fxp)(((__int128)a << FX_SHIFT) / b) : 0;
}

static inline fxp fx_inv(fxp v)
{
	return v ? (fxp)(((__int128)FX_ONE << FX_SHIFT) / v) : 0x7FFFFFFF;
}

static inline fxp fx_int(s32 v)     { return (fxp)v << FX_SHIFT; }
static inline s32  fx_floor(fxp v)   { return (s32)(v >> FX_SHIFT); }
static inline s32  fx_round(fxp v)   { return (s32)((v + FX_HALF) >> FX_SHIFT); }
static inline fxp fx_abs(fxp v)      { return v < 0 ? -v : v; }
static inline fxp fx_min(fxp a, fxp b) { return a < b ? a : b; }
static inline fxp fx_max(fxp a, fxp b) { return a > b ? a : b; }
static inline fxp fx_clamp(fxp v, fxp lo, fxp hi)
{
	return v < lo ? lo : (v > hi ? hi : v);
}
static inline s32 clampi(s32 v, s32 lo, s32 hi)
{
	return v < lo ? lo : (v > hi ? hi : v);
}

#define FX(n)     ((fxp)((s64)(n) * ((s64)1 << FX_SHIFT)))
#define FXC(a, b) ((fxp)(((s64)(a) * ((s64)1 << FX_SHIFT)) / (b)))
#define FXT(deg)  ((u16)((((s64)(deg)) * FX_TWO_PI) / 360))

// fx_sqrt e le trigoni usano la libm: e' solo il banco di prova, sul ROM c'e'
// la versione intera con tabella in fxmath.h.
static inline fxp fx_sqrt(fxp v) { return (fxp)(sqrt((double)v) * (double)FX_ONE); }

typedef u16 ang;

static inline fxp fx_sin(u16 a)
{
	return (fxp)(sin(a * 2.0 * M_PI / 65536.0) * (double)FX_ONE);
}

static inline fxp fx_cos(u16 a)
{
	return (fxp)(cos(a * 2.0 * M_PI / 65536.0) * (double)FX_ONE);
}

static inline fxp fx_lerp(fxp v, fxp target, fxp rate)
{
	return v + fx_mul(target - v, rate);
}

#endif // MARMOTTA_HOST_SHIM_H
