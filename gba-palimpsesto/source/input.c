//---------------------------------------------------------------------------------
// Palimpsesto - input
//
// Il QTE di Rientro vive qui dentro e da nessun'altra parte.
//
// Il motivo per cui la finestra e' in frame e non in millisecondi: la GBA va a
// 60Hz, e il giocatore impara presto a contare i frame. Tre frame sono 50ms, e'
// la sensazione di "l'ho sentito" che si cerca. Per chi non la sente c'e' il
// modo LENTO a sei frame, e non come una difficolta' nascosta ma come una
// scelta esplicita nel menu di pausa.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_memdef.h>
#include <tonc_input.h>

// key_scan e' una macro di libtonc: senza di lei __key_curr/__key_prev non
// vengono mai aggiornati e key_hit restituisce sempre zero. Vedi marmotta.
#define key_scan() key_poll()

static u16 s_prev;

void input_init(void)
{
	key_scan();
	s_prev = (u16)~REG_KEYINPUT & 0x03FF;
}

void input_poll(void)
{
	s_prev = (u16)~REG_KEYINPUT & 0x03FF;
}

// input_hit: premuto ora, non tenuto premuto.
//
// Serve per i dialoghi e per scegliere un'azione: se usassi input_held, una
// singola pressione tenuta a lungo farebbe sfogliare dieci pagine di dialogo.
//---------------------------------------------------------------------------------
int input_hit(u16 mask)
{
	return (s_prev & mask) != 0;
}

int input_held(u16 mask)
{
	u16 now = (u16)~REG_KEYINPUT & 0x03FF;

	return (now & mask) != 0;
}

//---------------------------------------------------------------------------------
// Il QTE
//
// Tre fasi. In ATTESA il nemico annuncia il colpo e la finestra si apre; in
// ARMATA il giocatore deve premere il tasto; in ESITO il risultato viene
// consegnato al motore.
//
// La finestra si chiude da sola: se il giocatore preme troppo tardi il risultato
// e' FALLITO e non "non e' successo niente", perche' in un gioco sulla
// cancellazione l'esitazione costa, e deve costare subito.
//---------------------------------------------------------------------------------
#define QTE_WINDOW_FAST  3
#define QTE_WINDOW_SLOW  6

int s_qte_slow;      // 1 = modo LENTO
int s_qte_timer;
int s_qte_state;
u16 s_qte_keys;

enum {
	QTE_IDLE = 0,
	QTE_ARMED,
	QTE_DONE
};

void qte_reset(void)
{
	s_qte_state = QTE_IDLE;
	s_qte_timer = 0;
	s_qte_keys = 0;
}

// qte_arm: apre la finestra. Restituisce il numero di frame in cui premere.
int qte_arm(u16 keys)
{
	s_qte_keys = keys;
	s_qte_timer = s_qte_slow ? QTE_WINDOW_SLOW : QTE_WINDOW_FAST;
	s_qte_state = QTE_ARMED;
	return s_qte_timer;
}

// qte_poll: da chiamare una volta per frame.
//
// Restituisce -1 mentre la finestra e' aperta e non e' ancora successo niente.
//---------------------------------------------------------------------------------
int qte_poll(void)
{
	if (s_qte_state == QTE_IDLE) return -2;   // nessun QTE in corso

	if (s_qte_state == QTE_ARMED) {
		if (input_hit(s_qte_keys)) {
			s_qte_state = QTE_DONE;
			return RIENTRO_PERFETTO;
		}
		if (--s_qte_timer <= 0) {
			// Scaduta: e' un fallimento, non un nulla.
			s_qte_state = QTE_DONE;
			return RIENTRO_FALLITO;
		}
	}

	return -1;
}

int qte_frames_left(void)
{
	return s_qte_timer;
}

void qte_set_slow(int slow)
{
	s_qte_slow = slow;
}

int qte_is_slow(void)
{
	return s_qte_slow;
}