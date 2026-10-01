//---------------------------------------------------------------------------------
// Palimpsesto - comportamento dei nemici (logica pura)
//
// Come battle.c, questo file non sa cosa sia la GBA. Le sue uniche entrate
// sono lo stato della battaglia e i numeri usati dal test host.
//---------------------------------------------------------------------------------
#include "pale.h"
#include "battle.h"
#include "battle_internal.h"

//---------------------------------------------------------------------------------
// Tavole dei nemici
//
// I boss hanno piu' sigilli e reazioni. La difficolta' non e' solo HP: un
// nemico con 200 HP ma una sola reazione muore in sei turni come uno da 90 con
// tre. E' quello che si prova a cambiare quando il ritmo non funziona.
//---------------------------------------------------------------------------------
typedef struct {
	const char *name;
	s16 hp;
	s16 atk;
	s16 resist[SIGILLI_MAX];
	u8  react[SIGILLI_MAX];
	u8  is_boss;
	u8  rewrite_every;   // 0 = non riscrive
} EnemyDef;

static const EnemyDef s_enemies[] = {
	// Corsiva: debole a Cancella, immune a Traccia. Il tutorial del sigillo.
	{ "LINEA CORSIVA", 30, 7,  { 1, 0, 0 }, { REACT_CORSIVA, 0, 0 }, 0, 0 },

	// Marginalia: debole, ma genera Note che nutrono il nemico. Da sola e'
	// una noia; in branco e' un problema.
	{ "MARGINALIA", 18, 4, { 0, 0, 0 }, { REACT_MARGINALIA, 0, 0 }, 0, 0 },

	// Interrogazione: punisce le perdite invece di fare danno piu' di tanto.
	// In una squadra intera sembra debole; con un cancellato e' la cosa piu'
	// pericolosa in giro.
	{ "INTERROGAZIONE", 45, 9, { 0, 0, 0 }, { REACT_INTERROGAZIONE, 0, 0 }, 0, 0 },

	// I CENSORI (Atto I). Cedigione cresce con le perdite della squadra.
	{ "IL CENSORE", 260, 9, { 2, 1, 0 },
	  { REACT_CEDIGIONE, REACT_CORSIVA, 0 }, 1, 4 },

	// LE REDAZIONI (Atto II). Riscrivono Traccia meta' dei round: la meta'
	// dei giri e' una da difendersi e non ha modo di attaccare.
	//
	// Tarato con tests/run-tests.sh, non a occhio: 340 HP porta la partita
	// con parry a 22 turni, contro i 15 del Censore dell'Atto I. Con 280 si
	// chiudeva in 16, cio' il boss finale era piu' breve del primo, e con 260
	// era una passeggiata.
	//
	// Il parry perfetto vale tanto piu' quanti piu' colpi il nemico porta da
	// solo: tre righe attive sono tre colpi negati in un colpo solo. Per
	//che' il parry non resti la risposta vincente a ogni costo, la Redazione
	// richiede il parry meta' dei round: nell'altra meta' non si puo' attaccare
	// e bisogna campare.
	{ "LA REDAZIONE", 340, 10, { 2, 2, 1 },
	  { REACT_CEDIGIONE, REACT_INTERROGAZIONE, REACT_CORSIVA }, 1, 2 },
};

#define ENEMY_COUNT ((int)(sizeof(s_enemies) / sizeof(s_enemies[0])))

//---------------------------------------------------------------------------------
// battle_begin
//---------------------------------------------------------------------------------
void battle_begin(Battle *b, int enemy_kind)
{
	int i;

	if (enemy_kind < 0 || enemy_kind >= ENEMY_COUNT) enemy_kind = 0;

	// Riparto da un blocco noto invece di fidarmi del chiamante: se la
	// battaglia precedente ha lasciato cifre in coda, un memset parziale
	// lascerebbe reazioni fantasma attive nel turno nuovo.
	for (i = 0; i < (int)sizeof(Battle); i++)
		((u8 *)b)[i] = 0;

	b->filo = FILO_START;
	b->filo_max = FILO_START + 2 * FILO_PER_STAMPA;

	b->actor_id[0] = ACTOR_OTTAVA;
	b->actor_id[1] = ACTOR_BIEN;
	b->actor_id[2] = ACTOR_FERRO;
	b->actor_count = BATTLE_ACTOR_MAX;

	b->enemy.hp = s_enemies[enemy_kind].hp;
	b->enemy.hp_max = s_enemies[enemy_kind].hp;
	b->enemy.atk = s_enemies[enemy_kind].atk;
	b->enemy.is_boss = s_enemies[enemy_kind].is_boss;
	b->enemy.rewrite_every = s_enemies[enemy_kind].rewrite_every;

	for (i = 0; i < SIGILLI_MAX; i++) {
		b->enemy.sigil_react[i]  = s_enemies[enemy_kind].react[i];
		b->enemy.sigil_resist[i] = s_enemies[enemy_kind].resist[i];
		b->enemy.sigil_notes[i]  = 0;
		b->enemy.sigil_broken[i] = 0;
	}

	b->running = 1;
	b->turn = 0;
	b->round = 0;
	b->rewritten = ACT_COUNT;
	b->lost_mask = 0;
	b->event_count = 0;

	// Il seme parte da una costante, non dall'orologio: altrimenti due
	// partite identiche non darebbero lo stesso svolgimento e un bug di
	// combattimento sarebbe irreproducibile. Il test passa il seed esplicito
	// subito dopo, quindi resta deterministico lo stesso.
	b->rng = 0x9E3779B9u;
}

//---------------------------------------------------------------------------------
// Le reazioni
//---------------------------------------------------------------------------------

// Cedigione: piu' cado, piu' fa male. Il trauma come risorsa: il nemico non
// si indebolisce quando la squadra perde qualcuno, si rafforza.
//
// Nota il riusso di EV_SIGILLO_SCORRE come evento visivo: e' una riga che si
// sposta, ed e' esattamente cio' che il giocatore vede succedere.
static void react_cedigione(Battle *b, Game *g)
{
	int i, lost = 0;

	for (i = 0; i < ACTOR_MAX; i++)
		if (g->party[i].erased || g->party[i].hp <= 0) lost++;

	if (lost > 0) {
		b->enemy.atk += (s16)(lost * CUDIGIONE_BONUS_ATK);
		battle_emit(b, EV_SIGILLO_SCORRE);
	}
}

// Marginalia: ogni 2 turni genera una Nota. Le Note si accumulano e, quando
// sono abbastanza, il nemico si cura: ucciderle conta piu' del loro HP.
static void react_marginalia(Battle *b, Game *g)
{
	(void)g;

	if (b->enemy.note_timer > 0) b->enemy.note_timer--;
	if (b->enemy.note_timer > 0) return;

	b->enemy.note_timer = MARGINALIA_NOTE_TURNI;
	b->enemy.note_count++;
	battle_emit(b, EV_NOTA);

	if (b->enemy.note_count >= MARGINALIA_NOTE_MAX) {
		b->enemy.note_count = 0;
		b->enemy.hp += MARGINALIA_NOTE_HEAL;
		if (b->enemy.hp > b->enemy.hp_max)
			b->enemy.hp = b->enemy.hp_max;
	}
}

// Interrogazione: a fine turno, se in squadra c'e' un cancellato, drena Filo
// invece di attaccare. Non fa danno: toglie la rete di sicurezza.
//
// Il drenaggio e' per turno e per numero di cancellati, e il tetto e' voluto:
// senza tetto, con un solo cancellato questa reazione da sola chiuderebbe la
// partita in quattro turni e il resto del combattimento diventerebbe una
// corsa che si perde sempre.
static void react_interrogazione(Battle *b, Game *g)
{
	int i, erased = 0, drained = 0;

	for (i = 0; i < ACTOR_MAX; i++) {
		if (!g->party[i].erased) continue;
		erased++;
		if (drained >= INTERROGAZIONE_DRAIN) continue;
		g->filo -= INTERROGAZIONE_DRAIN;
		drained += INTERROGAZIONE_DRAIN;
	}

	if (erased > 0) battle_emit(b, EV_INTERROGAZIONE);

	if (g->filo < 0) g->filo = 0;
}

// Corsiva: la riga "scorre" dopo un colpo. Lo gestisce gia' battle.c dentro
// do_traccia, perche' il movimento e' la conseguenza di essere colpiti e non
// una reazione a fine turno: qui non serve niente.

static int run_reactions(Battle *b, Game *g)
{
	int i, drained = 0;

	for (i = 0; i < SIGILLI_MAX; i++) {
		if (b->enemy.sigil_broken[i]) continue;   // reazione gia' spenta

		switch (b->enemy.sigil_react[i]) {
		case REACT_CEDIGIONE:
			react_cedigione(b, g);
			break;
		case REACT_MARGINALIA:
			react_marginalia(b, g);
			break;
		case REACT_INTERROGAZIONE:
			react_interrogazione(b, g);
			if (g->filo < FILO_START - INTERROGAZIONE_DRAIN)
				drained = 1;
			break;
		default:
			break;
		}
	}

	return drained;
}

//---------------------------------------------------------------------------------
// battle_enemy_phase: il nemico agisce
//---------------------------------------------------------------------------------
void battle_enemy_phase(Battle *b, Game *g)
{
	int i, active[ACTOR_MAX], n = 0;
	int negate = 0;         // +1 parry perfetto, -1 parziale, 0 nessuno
	int target, has_interrogazione, erased = 0;

	if (!b->running) return;

	// Qualcuno ha parato? Si guarda il risultato del QTE registrato nella
	// coda degli eventi, non un flag tenuto nel renderer: il motore deve
	// restare l'unica fonte di verita' sullo stato della battaglia.
	//
	// Il ciclo si ferma al primo Rientro incontrato camminando all'indietro,
	// cosi' conta solo il parry piu' recente, che e' l'ultimo accaduto.
	for (i = b->event_count - 1; i >= 0; i--) {
		if (b->events[i] == EV_RIENTRO_PERFETTO) { negate = 1;  break; }
		if (b->events[i] == EV_RIENTRO_PARZIALE) { negate = -1; break; }
		if (b->events[i] == EV_RIENTRO_FALLITO) break;
	}

	for (i = 0; i < ACTOR_MAX; i++) {
		Actor *a = &g->party[i];
		if (a->in_party && a->hp > 0) active[n++] = i;
	}

	if (run_reactions(b, g)) negate = negate ? negate : 0;

	// Chi e' ancora in piedi?
	for (n = 0, i = 0; i < ACTOR_MAX; i++) {
		Actor *a = &g->party[i];
		if (a->in_party && a->hp > 0) active[n++] = i;
	}

	if (n == 0) {
		b->running = 0;
		battle_emit(b, EV_DEFEAT);
		return;
	}

	// Con un parry perfetto il turno nemico passa intero: e' la ricompensa e
	// l'unico modo per non perdere Filo.
	if (negate > 0) {
		battle_emit(b, EV_ENEMY_SILENT);
		goto end_turn;
	}

	// Interrogazione, con un cancellato in squadra, toglie un colpo a questo
	// turno. NON annulla il turno.
	//
	// Qui c'era un buco vero: prima cancellavo l'attacco per non colpire due
	// volte. Ma allora, appena qualcuno era stato cancellato in modo
	// definitivo, il nemico smetteva di attaccare per il resto della
	// battaglia: si cadeva in uno stallo e le partite si allungavano a quaranta
	// turni. Sottrare un colpo mantiene la pressione e rende la perdita
	// comunque costosa, che e' cio' che la reazione deve comunicare.
	has_interrogazione = 0;
	for (i = 0; i < SIGILLI_MAX; i++)
		if (!b->enemy.sigil_broken[i]
			&& b->enemy.sigil_react[i] == REACT_INTERROGAZIONE)
			has_interrogazione = 1;

	for (i = 0; i < ACTOR_MAX; i++)
		if (g->party[i].erased) erased++;

	// Quante volte colpisce? Una per ogni riga ancora attiva.
	//
	// E' la regola che tiene insieme tutto il bilanciamento: un nemico con una
	// sola riga colpisce una volta sola, un boss con tre colpisce tre volte. Il
	// parry perfetto le nega tutte, quindi il suo valore cresce con il numero
	// di righe: e' esattamente perche' un boss e' una minaccia e una marginalia
	// no, senza dover dire al giocatore "questo nemico e' piu' difficile".
	//
	// Con 120 Filo e il Censore (2 righe, 9 di attacco) la squadra ne regge
	// circa sei turni, mentre servirne otto per abbatterlo: il margine e'
	// negativo apposta e si vince parando, non resistendo.
	{
		int hits = 0, h;

		for (i = 0; i < SIGILLI_MAX; i++)
			if (b->enemy.sigil_react[i] != REACT_NONE
				&& !b->enemy.sigil_broken[i])
				hits++;

		// Interrogazione si paga un colpo: drena e toglie, ma la pressione
		// resta. Con una sola riga attiva il minimo e' uno, quindi la
		// reazione non puo' azzerare l'attacco del nemico.
		if (has_interrogazione && erased > 0 && hits > 1) hits--;

		if (hits < 1) hits = 1;

		for (h = 0; h < hits; h++) {
			// Ogni colpo va sul piu' debole rimasto: e' quello che chiude le
			// partite e quello che costringe a usare Cucisci.
			target = -1;
			for (i = 0; i < n; i++) {
				if (g->party[active[i]].hp <= 0) continue;
				if (target < 0
					|| g->party[active[i]].hp < g->party[target].hp)
					target = active[i];
			}

			// Filo e' la vita della SQUADRA: e' la risorsa che il parry
			// perfetto nega a tutti, e quindi la ragione per cui parry
			// conviene piu' di qualunque altra azione.
			g->filo -= b->enemy.atk;
			if (g->filo < 0) g->filo = 0;

			// Il personaggio colpito subisce anche una tensione propria: e' il
			// canale che porta a chi si cancella, e quindi la ragione per cui
			// Cucisci esiste. Senza questo gli HP individuali sarebbero solo
			// una seconda barra di numeri che il giocatore non ha motivo di
			// guardare.
			if (target >= 0) {
				g->party[target].hp -= b->enemy.atk;
				if (g->party[target].hp < 0)
					g->party[target].hp = 0;
			}

			battle_emit(b, EV_DAMAGE_ACTOR);
		}
	}

end_turn:
	b->turn++;
	b->round++;
	b->rewritten = ACT_COUNT;

	// Nuovo round: le righe si possono risegnare.
	b->sig_marked_this_round = 0;

	// La Redazione dichiara qui la riscrittura, non durante le azioni: se
	// l'annuncio arrivasse a meta' del turno dei personaggi, il flag verrebbe
	// tolto qui sotto prima che il giocatore potesse vederlo. Dichiararla a
	// fine turno la rende visibile per tutto il round successivo, che e'
	// l'unico momento in cui serve.
	if (b->enemy.is_boss && b->enemy.rewrite_every > 0
		&& (b->round % b->enemy.rewrite_every) == 0) {
		b->rewritten = ACT_TRACCIA;
		battle_emit(b, EV_REWRITE);
	}

	// Chi arriva a zero e ha gia' usato le Cuciture viene cancellato per
	// davvero: da li' in poi non torna piu'.
	battle_check_collapse(b, g);

	if (b->enemy.hp <= 0) {
		b->running = 0;
		battle_emit(b, EV_VICTORY);
	} else if (n == 0) {
		b->running = 0;
		battle_emit(b, EV_DEFEAT);
	}
}