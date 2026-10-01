//---------------------------------------------------------------------------------
// Palimpsesto - interfaccia del motore di combattimento
//
// Regola di ferro di questo progetto: battle.c e battle_ai.c sono logica pura.
// Non toccano VRAM, non chiamano routine video, non leggono i tasti. Questo
// e' cio' che permette di bilanciare il gioco sul PC (tests/run-tests.sh)
// invece di avviare l'emulatore a ogni numero cambiato.
//
// L'unico servizio esterno e' un generatore di numeri casuali e una coda di
// eventi, entrambi passati dal chiamante: cosi' i test sono deterministici.
//---------------------------------------------------------------------------------
#ifndef BATTLE_H
#define BATTLE_H

// Azioni. I costi sono in Chiarezza; Traccia e Passa sono gratuiti.
enum {
	ACT_TRACCIA = 0,     // attacco base, +1 Segnalibro
	ACT_CANCELLA,        // danno concentrato, 2 Chiarezza
	ACT_RIENTRO,         // parry a QTE, 1 Chiarezza
	ACT_CUCISCI,         // richiama un cancellato, 3 Filo
	ACT_PASSA,           // +1 Chiarezza
	ACT_COUNT
};

// 32 eventi bastano per una battaglia intera. Se la coda si esaurisce gli
// eventi vengono scartati: e' preferibile perdere un'animazione che scrivere
// oltre l'array e corrompere il turno successivo.
#define BATTLE_EVENT_MAX  32

// Risultato del QTE di Rientro.
enum {
	RIENTRO_PERFETTO = 0,
	RIENTRO_PARZIALE,
	RIENTRO_FALLITO
};

typedef struct {
	s16 hp;
	s16 hp_max;
	s16 atk;

	// Le "righe" del nemico: le difese attive, con il contatore dei
	// Segnalibri che porta alla rottura.
	u8 sigil_react[SIGILLI_MAX];
	u8 sigil_notes[SIGILLI_MAX];    // Segnalibri accumulati, 3 = stacco
	u8 sigil_broken[SIGILLI_MAX];   // 1 = la riga si e' spezzata
	s16 sigil_resist[SIGILLI_MAX];  // resistenza fisica della riga

	u8 is_boss;
	u8 turn;              // turni trascorsi
	u8 note_timer;        // per REACT_MARGINALIA: Nota ogni N turni
	u8 note_count;        // Note accumulate, curano il nemico a MARGINALIA_NOTE_MAX

	// Ogni quanti round la Redazione riscrive un'azione (0 = non riscrive
	// mai). Dura un round intero, non un'azione sola: durante quel round
	// Traccia non esiste e il giocatore deve campare di parry.
	u8 rewrite_every;
} Enemy;

typedef struct {
	s16 filo;
	s16 filo_max;

	// Chiarezza e Cuciture sono per personaggio: obbligano a scegliere chi
	// spendere, invece di avere una barra di squadra da consumare.
	u8 actor_id[ACTOR_MAX];
	u8 actor_count;

	Enemy enemy;

	u8 turn;
	u8 round;
	u8 running;

	// Una riga si puo' segnare una volta sola per round. Con tre personaggi in
	// squadra la alternativa sarebbe lo stacco in un turno solo, che non e'
	// una strategia: e' un turno di lavoro. Con il limite, lo stacco richiede
	// tre giri della pagina e diventa una cosa che si pianifica.
	//
	// Non e' un trucco per rallentare: e' la stessa metafora del gioco. Una
	// riga si cancella con tre passaggi di penna, non tre colpi in fila.
	u8 sig_marked_this_round;

	// Personaggi fuori dalla battaglia in corso ma recuperabili con Cucisci.
	u8 lost_mask;

	// Azione che la Redazione ha riscritto questo turno, ACT_COUNT se nessuna.
	u8 rewritten;

	u8 events[BATTLE_EVENT_MAX];
	u8 event_count;

	// PRNG: lo stato vive qui cosi' due run con lo stesso seed danno la
	// stessa partita, e i test possono riprodurre un caso esatto.
	u32 rng;
} Battle;

enum {
	EV_TRACCIA = 0,
	EV_CANCELLA,
	EV_RIENTRO_PERFETTO,
	EV_RIENTRO_PARZIALE,
	EV_RIENTRO_FALLITO,
	EV_CUCISCI,
	EV_CUCISCI_NA,
	EV_PASSA,
	EV_RIENTRO_NA,
	EV_STACCO,
	EV_SIGILLO_SCORRE,
	EV_INTERROGAZIONE,
	EV_NOTA,
	EV_ENEMY_ATTACK,
	EV_ENEMY_SILENT,
	EV_REWRITE,
	EV_DAMAGE_ACTOR,
	EV_CANCELLED,
	EV_VICTORY,
	EV_DEFEAT,
	EV_EVENT_COUNT
};

#define BATTLE_ACTOR_MAX  3

// Inizializza una battaglia. Gli HP degli attori vivono in g_game.party, ma
// battle.c riceve comunque lo stato come argomento cosi' resta testabile.
void battle_begin(Battle *b, int enemy_kind);

// Esegue un'azione del personaggio slot `slot` (0..ACTOR-1). `target_sig`
// e' l'indice della riga bersaglio per Traccia e Cancella.
// `qte` e' il risultato del QTE per ACT_RIENTRO, cosi' il timing resta fuori
// dal motore: lo testa il renderer, il motore ne applica solo l'esito.
void battle_act(Battle *b, Game *g, int slot, int action,
                int target_sig, int qte);

// Chiude il turno nemico: attacchi, reazioni, generazione di Note.
void battle_enemy_phase(Battle *b, Game *g);

// Dimmi se la battaglia e' finita e come.
int  battle_over(const Battle *b);

// Danno previsto da Cancella su una data riga: usato sia dal motore sia
// dalla UI per mostrare le previsioni al giocatore.
s16  battle_preview_damage(const Battle *b, int sigil);

int  battle_sig_broken(const Battle *b, int sigil);

// PRNG lineare (xorshift32): nessuna divisione, deterministico per seed.
u32  battle_rand(Battle *b);

#endif // BATTLE_H