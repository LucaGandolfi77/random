//---------------------------------------------------------------------------------
// Marmotta - aritmetica a punto fisso
//
// La GBA non ha unita' in virgola mobile: ogni operazione float verrebbe
// emulata dal software a 16.78 MHz, il che rende il motore fisico troppo
// lento. Qui tutto e' s32 con 16 bit interi e 16 frazionali.
//
// Gli angoli sono in "binary angle format": un u16 dove 0x0000 e' 0 gradi e
// 0x10000 (wrap a 0) e' 360 gradi. Il seno e' una tabella interpolata.
//---------------------------------------------------------------------------------
#ifndef MARMOTTA_FXMATH_H
#define MARMOTTA_FXMATH_H

// Sul banco di prova host (tests/) il punto fisso e' definito in hostshim.h con
// 32 bit frazionali, perche' su x86 gli interi a 32 bit non reggerebbero i
// valori della fisica. In quel caso questo file non deve definire nulla.
#ifdef MARMOTTA_HOST
#include "hostshim.h"
#else

#include <tonc_types.h>

typedef s32 fx;

#define FX_SHIFT   16
#define FX_ONE     (1 << FX_SHIFT)
#define FX_HALF    (1 << (FX_SHIFT - 1))
#define FX_TWO_PI  0x10000      // un giro completo in BAF

// Moltiplicazione e divisione in punto fisso, con protezione dallo zero.
static inline fx fx_mul(fx a, fx b)
{
	return (fx)(((s64)a * b) >> FX_SHIFT);
}

// Divide due valori in punto fisso. Attenzione: la versione con FX_ONE come
// numeratore va calcolata con fx_inv, perche' (FX_ONE << FX_SHIFT) traboccerebbe.
static inline fx fx_div(fx a, fx b)
{
	if(b == 0) return (a < 0) ? -0x7FFFFFFF : 0x7FFFFFFF;
	return (fx)((((s64)a) << FX_SHIFT) / b);
}

// Inverso di un valore in punto fisso: 1/x, entrambi in .16f. E' il modo
// corretto di ottenere una massa inversa, non fx_div(FX_ONE, massa).
static inline fx fx_inv(fx v)
{
	if(v == 0) return 0x7FFFFFFF;
	return (fx)(((s64)FX_ONE << FX_SHIFT) / v);
}

static inline fx fx_int(s32 v)      { return v << FX_SHIFT; }
static inline s32 fx_floor(fx v)     { return v >> FX_SHIFT; }
static inline s32 fx_round(fx v)     { return (v + FX_HALF) >> FX_SHIFT; }
static inline fx fx_frac(fx v)       { return v & (FX_ONE - 1); }
static inline fx fx_abs(fx v)        { return v < 0 ? -v : v; }
static inline fx fx_min(fx a, fx b)  { return a < b ? a : b; }
static inline fx fx_max(fx a, fx b)  { return a > b ? a : b; }
static inline fx fx_clamp(fx v, fx lo, fx hi)
{
	return v < lo ? lo : (v > hi ? hi : v);
}

// Clamp intero.
static inline s32 clampi(s32 v, s32 lo, s32 hi)
{
	return v < lo ? lo : (v > hi ? hi : v);
}

// Costanti in punto fisso, utilizzabili anche dove serve un'espressione
// costante (inizializzatori statici, dimensioni di array).
//
// Il cast a s64 non basta per i valori negativi: shiftare a sinistre un intero
// negativo e' indefinito in C, e il compilatore segnala l'uso. Moltiplicare per
// 2^16 evita lo shift e dà lo stesso risultato.
#define FX(n)     ((fx)((s64)(n) * ((s64)1 << FX_SHIFT)))
#define FXC(a, b) ((fx)(((s64)(a) * ((s64)1 << FX_SHIFT)) / (b)))

// Angoli in gradi verso il formato BAF, per i dati dei livelli.
#define FXT(deg)  ((ang)(((s64)(deg) * FX_TWO_PI) / 360))

//---------------------------------------------------------------------------------
// Trigometria. sin_lut ha 1025 voci in .12f: l'ultima ripete la prima cosi'
// l'interpolazione lineare non va mai fuori indice.
//---------------------------------------------------------------------------------
extern const s16 s_sinlut[1025];

// Indice e frazione dell'angolo: 6 bit di indice, 10 di interpolazione.
static inline void baf_split(u16 a, s32 *idx, s32 *frac)
{
	*idx  = a >> 6;
	*frac = a & 63;
}

// Seno di un angolo BAF, restituito in .16f.
static inline fx fx_sin(u16 a)
{
	s32 idx, frac;
	s32 s0, s1;

	baf_split(a, &idx, &frac);
	s0 = s_sinlut[idx];
	s1 = s_sinlut[idx + 1];
	return (fx)((s0 + (((s1 - s0) * frac) >> 6)) << (FX_SHIFT - 12));
}

// Coseno: e' il seno ruotato di 90 gradi, cioe' di 0x4000 in BAF.
static inline fx fx_cos(u16 a)
{
	return fx_sin((u16)(a + 0x4000));
}

//---------------------------------------------------------------------------------
// Radice quadrata. Non uso sqrtf per lo stesso motivo di sinf: questa
// implementazione lavora su interi di 32 bit ed e' piu' che sufficiente.
//---------------------------------------------------------------------------------
static inline fx fx_sqrt(fx v)
{
	u32 rem, root, test, div;

	if(v <= 0) return 0;

	// Prima approssimazione: il bit piu' alto di due, arrotondato giù.
	root = 0;
	rem  = (u32)v;
	for(int i = 0; i < 16; i++) root <<= 1;
	// Iniziamo con root = 2^16 e scendiamo, metodo del restoring shift.
	div = (u32)(1 << 30);
	root = 0;
	while(div > rem) div >>= 2;
	while(div != 0) {
		test = root + div;
		if(rem >= test) {
			rem -= test;
			root = (root >> 1) + div;
		} else {
			root >>= 1;
		}
		div >>= 2;
	}
	return (fx)root;
}

//---------------------------------------------------------------------------------
// Distanza e normalizzazione.
//---------------------------------------------------------------------------------
fx fx_len(fx x, fx y);
fx fx_hypot(fx x, fx y);

//---------------------------------------------------------------------------------
// Interpolazione indipendente dal framerate: sposta `v` verso `target` di una
// frazione `rate` (0..FX_ONE) del divario. Serve a smorzare la camera e la
// fionda senza dipendere dai frame.
//---------------------------------------------------------------------------------
static inline fx fx_lerp(fx v, fx target, fx rate)
{
	return v + fx_mul(target - v, rate);
}

#endif // !MARMOTTA_HOST

#endif // MARMOTTA_FXMATH_H
