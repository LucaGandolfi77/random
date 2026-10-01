//---------------------------------------------------------------------------------
// Marmotta - motore fisico
//
// Corpi rigidi 2D come Oriented Bounding Boxes, con un solver a impulsi
// sequenziali. La sequenza per ogni passo e':
//
//   1. broad phase   -Bounding Box allineati agli assi, con sweep su x
//   2. narrow phase  -SAT fra OBB, che produce 1 o 2 punti di contatto
//   3. preparazione  - masse, impeti, bias di Baumgarte, cache dei contatti
//   4. risoluzione  - N iterazioni di vincoli normali e tangenziali
//   5. integrazione - Eulero semi-implicito, posizione e angolo
//
// Il punto 3 e' quello che rende stabili le pile: gli impeti calcolati al
// passo precedente vengono riutilizzati come punto di partenza (warm starting),
// cosi' una torre non affossa sotto il proprio peso.
//---------------------------------------------------------------------------------
#ifndef MARMOTTA_PHYSICS_H
#define MARMOTTA_PHYSICS_H

#include "marmotta.h"

// Numeri dolci. Il solver lavora in fixed point con 16 bit frazionali, quindi
// i valori sono scelti per stare comodamente in s32.
#define GRAVITY        FX(1600)     // px/s^2, verso il basso

// Attenzione: lo smorzamento e' applicato a ogni sotto-passo, e i sotto-passi
// sono 240 al secondo. Un valore come 0.90 significherebbe 0.9^240 al secondo,
// cioe' azzererebbe qualsiasi velocita' in un istante. Per una perdita di circa
// l'1% al secondo servono valori vicinissimi a 1: 0.9999^240 = 0.976.
#define LINEAR_DAMP    FXC(9999, 10000)
#define ANGULAR_DAMP   FXC(9990, 10000)
// Soglie di quiete. Il limite lineare non puo' essere troppo stretto: a 240
// sotto-passi al secondo la gravita' aggiunge 1600/240 = 6.7 px/s a ogni
// passo, e il contatto lo azzera solo al passo successivo. Quindi un corpo
// fermo ha sempre qualche px/s di velocita' residua, e con una soglia bassa non
// si addormenterebbe mai, consumando CPU per sempre.
#define SLEEP_LIN_TOL  FX(20)       // px/s
#define SLEEP_ANG_TOL  FX(120)      // rad/s
#define SLEEP_FRAMES   40

#define VEL_ITERATIONS 8

// La penetrazione si risolve dentro il solver di velocita', con un bias di
// Baumgarte piccolo e limitato: e' il metodo che aggiunge meno energia. Un
// passaggio separato di correzione delle posizioni e' stato provato e
// scartato: sposta i corpi senza tenere conto della rotazione, e con due punti
// di contatto per coppia i due spostamenti non sono simmetrici, quindi il
// blocco si inclina e la pila si "sheara" fino a disintegrarsi.
#define BAUMGARTE      FXC(15, 100)  // quota di penetrazione risolta per passo
#define MAX_BIAS_SEP   FX(2)        // tetto alla penetrazione considerata

#define MAX_BODIES     48
#define MAX_CONTACTS   96

// Tetto alla velocita' lineare e angolare. Non e' un vezzo cosmetico: e' un
// limite di sicurezza. Se per un errore di risoluzione un corpo riceve un
// impulso assurdo, senza tetto la sua velocita' resta enorme per sempre (non
// c'e' aria a 16 MHz che la freni) e il corpo vola via portandosi dietro
// metà struttura. 1200 px/s e' gia' piu' veloce di qualsiasi tiri plausibile.
#define MAX_SPEED      FX(1200)
#define MAX_ANG_SPEED  FX(4 * FX_TWO_PI)

//---------------------------------------------------------------------------------
// Punto di contatto, gia' pronto per il solver.
//---------------------------------------------------------------------------------
typedef struct {
	Body *a;          // primo corpo (b ha sempre massa inversa >= quella di a)
	Body *b;
	fx    px, py;     // punto di contatto in coordinate mondo
	fx    nx, ny;     // normale, da a verso b
	fx    sep;        // penetrazione, positiva quando i corpi si sovrappongono

	// Precalcolati in fase di preparazione.
	fx    rax, ray;   // vettore da centro di a al punto
	fx    rbx, rby;
	fx    mass_n;     // massa inversa ridotta lungo la normale
	fx    mass_t;     // massa inversa ridotta lungo la tangente
	fx    bias;       // solo restituzione: la penetrazione sta in `pen`
	fx    pn, pt;     // impulsi accumulati, ripartiti dalla cache

	s32    key;       // chiave di cache: a * MAX_BODIES + b
} Contact;

extern Body      g_body[MAX_BODIES];
extern Contact   g_contact[MAX_CONTACTS];
extern s32       g_ncontacts;

//---------------------------------------------------------------------------------
// Creazione corpi. Restituiscono l'indice, o -1 se la scelta e' piena.
//---------------------------------------------------------------------------------
s32 phys_add_block(fx x, fx y, fx hw, fx hh, ang a, u8 mat);
s32 phys_add_ball(fx x, fx y, fx radius, fx vx, fx vy);
s32 phys_add_static(fx x, fx y, fx hw, fx hh);

// Rimuove un corpo. Quando un blocco viene distrutto lo si rimuove e si lascia
// che il solver smonti la struttura al frame successivo.
void phys_remove(s32 index);

// Sveglia un corpo e tutti quelli che lo toccano: serve dopo una rimozione,
// altrimenti una torreaddormentata resterebbe sospesa.
void phys_wake_all(void);

// Svuota il mondo e la cache degli impeti. Usata dal banco di prova e dal
// caricamento dei livelli.
void phys_reset(void);

//---------------------------------------------------------------------------------
// Passo di simulazione. dt e' il tempo simulato, tipicamente 1/60 s diviso in
// sotto-passi dal chiamante.
//---------------------------------------------------------------------------------
void phys_step(fx dt);

//---------------------------------------------------------------------------------
// Danno per impatto. Restituisce i punti guadagnati dalla distruzione.
// Il game loop chiama questa funzione sui contatti generati nell'ultimo passo e
// rimuove i corpi rimasti senza punti struttura.
//---------------------------------------------------------------------------------
s32 phys_apply_damage(fx impulse_scale);

// Numeri di diagnostica, utili per capire se il motore regge.
extern s32 g_phys_contacts;
extern s32 g_phys_bodies;

#endif // MARMOTTA_PHYSICS_H
