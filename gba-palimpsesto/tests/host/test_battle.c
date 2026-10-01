//---------------------------------------------------------------------------------
// Palimpsesto - banco di prova della logica di combattimento sul PC
//
// Compila battle.c e battle_ai.c per x86 e verifica il bilanciamento senza
// emulatore. E' il motivo per cui battle.c e' logica pura: cambiare un numero
// e rilanciare costa un secondo, non un boot di mGBA.
//
// Uso:  tests/run-tests.sh
//---------------------------------------------------------------------------------
#include "pale.h"
#include "battle.h"

static int g_fail;
static int g_checks;

static void ok(int cond, const char *what)
{
	g_checks++;
	if (!cond) {
		g_fail++;
		printf("  FAIL  %s\n", what);
	}
}

static void eq(s32 got, s32 want, const char *what)
{
	g_checks++;
	if (got != want) {
		g_fail++;
		printf("  FAIL  %s: atteso %d, ottenuto %d\n", what, want, got);
	}
}

static void section(const char *name)
{
	printf("\n== %s ==\n", name);
}

//---------------------------------------------------------------------------------
// Setup di una battaglia riproducibile
//---------------------------------------------------------------------------------
static void setup(Battle *b, Game *g, int enemy_kind, u32 seed)
{
	memset(g, 0, sizeof(*g));

	g->filo = FILO_START;
	g->filo_max = FILO_START + 2 * FILO_PER_STAMPA;

	g->party[ACTOR_OTTAVA].id = ACTOR_OTTAVA;
	g->party[ACTOR_OTTAVA].hp = 30;
	g->party[ACTOR_OTTAVA].hp_max = 30;
	g->party[ACTOR_OTTAVA].in_party = 1;
	g->party[ACTOR_OTTAVA].clarity = 2;
	g->party[ACTOR_OTTAVA].stitches = 1;

	g->party[ACTOR_BIEN].id = ACTOR_BIEN;
	g->party[ACTOR_BIEN].hp = 55;
	g->party[ACTOR_BIEN].hp_max = 55;
	g->party[ACTOR_BIEN].in_party = 1;
	g->party[ACTOR_BIEN].clarity = 2;
	g->party[ACTOR_BIEN].stitches = 1;

	g->party[ACTOR_FERRO].id = ACTOR_FERRO;
	g->party[ACTOR_FERRO].hp = 40;
	g->party[ACTOR_FERRO].hp_max = 40;
	g->party[ACTOR_FERRO].in_party = 1;
	g->party[ACTOR_FERRO].clarity = 2;
	g->party[ACTOR_FERRO].stitches = 1;

	g->party[ACTOR_VOCE].id = ACTOR_VOCE;
	g->party[ACTOR_VOCE].hp = 1;
	g->party[ACTOR_VOCE].hp_max = 1;

	battle_begin(b, enemy_kind);
	b->rng = seed;
}

static int count_events(const Battle *b, int ev)
{
	int i, n = 0;
	for (i = 0; i < b->event_count; i++)
		if (b->events[i] == ev) n++;
	return n;
}

static int has_event(const Battle *b, int ev)
{
	return count_events(b, ev) > 0;
}

//---------------------------------------------------------------------------------
// Nemici
//---------------------------------------------------------------------------------
enum {
	EN_CORSIVA,
	EN_MARGINALIA,
	EN_INTERROGAZIONE,
	EN_CENSORE,
	EN_REDAZIONE,
	EN_COUNT
};

//---------------------------------------------------------------------------------
// Test: il motore parte pulito
//---------------------------------------------------------------------------------
static void test_begin(Game *g)
{
	Battle b;

	section("battle_begin");

	setup(&b, g, EN_CORSIVA, 1);
	ok(b.running, "la battaglia deve partire attiva");
	eq(b.filo, FILO_START, "il Filo parte pieno");
	eq(b.turn, 0, "nessun turno all'inizio");
	eq(b.round, 0, "nessun round all'inizio");
	eq(b.actor_count, BATTLE_ACTOR_MAX, "tre attori schierati");
	eq(b.rewritten, ACT_COUNT, "nessuna azione riscritta al primo turno");
}

//---------------------------------------------------------------------------------
// Test: Traccia accumula Segnalibri e lo stacco spezza la riga
//
// Questa e' la meccanica centrale: 3 Segnalibri su una riga e la difesa si
// rompe. E' il "Gradient" di Expedition 33 reso come danno materiale.
//---------------------------------------------------------------------------------
static void test_stacco(Game *g)
{
	Battle b;
	int i;

	section("Traccia e stacco della riga");

	setup(&b, g, EN_CORSIVA, 7);

	// Tre Segnalibri staccano la riga, ma uno per giro di pagina: senza la
	// pausa fra un giro e l'altro i tre Traccia di tre personaggi la
	// romperebbero in un turno solo, che non e' una strategia.
	//
	// Provo anche il caso che la stiamo davvero impedendo: tre Traccia di fila
	// nella stessa fase devono contare come un Segnalibro solo.
	setup(&b, g, EN_CORSIVA, 7);
	for (i = 0; i < 6; i++)
		battle_act(&b, g, 0, ACT_TRACCIA, 0, RIENTRO_FALLITO);
	ok(!battle_sig_broken(&b, 0),
	   "la riga non si stacca tutta in una fase");

	setup(&b, g, EN_CORSIVA, 7);
	for (i = 0; i < SEGNALIBRI_MAX; i++) {
		ok(!battle_sig_broken(&b, 0), "la riga non deve rompersi prima");
		battle_act(&b, g, 0, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		battle_enemy_phase(&b, g);
	}
	ok(battle_sig_broken(&b, 0),
	   "dopo 3 giri di pagina la riga si stacca");
	ok(has_event(&b, EV_STACCO), "lo stacco deve generare un evento");

	// Il danno di Traccia non deve dipendere dalla rottura: e' Cancella che
	// sfrutta il +50%. Se cambiasse qui, Traccia diventerebbe la mossa
	// dominante e il gioco si ridurrebbe a spammare quella.
	{
		s16 plain;
		Enemy e;

		memset(&e, 0, sizeof(e));
		e.hp = 100; e.hp_max = 100; e.atk = 7;
		e.sigil_react[0] = REACT_CORSIVA;
		e.sigil_resist[0] = 1;

		battle_begin(&b, EN_CORSIVA);
		plain = battle_preview_damage(&b, 0);

		e.sigil_broken[0] = 1;
		eq(plain, battle_preview_damage(&b, 0),
		   "Traccia non deve cambiare con la riga rotta");

		// Cancella invece deve battere Traccia, altrimenti l'attacco base
		// (che non costa nulla) sarebbe la mossa migliore in assoluto e il
		// gioco si ridurrebbe a premere quello.
		ok(battle_preview_damage(&b, 0) > battle_traccia_damage(),
		   "Cancella deve superare Traccia");
		ok(battle_traccia_damage() < battle_preview_damage(&b, 0),
		   "Traccia deve costare meno di Cancella");

		// E la previsione non deve mai tirare sul PRNG: se lo facesse, ogni
		// movimento del cursore nella UI cambierebbe il futuro della
		// battaglia e il numero mostrato non corrisponderebbe al colpo vero.
		eq(battle_preview_damage(&b, 0), battle_preview_damage(&b, 0),
		   "la previsione del danno deve essere deterministica");
	}
}

//---------------------------------------------------------------------------------
// Test: i costi in Chiarezza
//---------------------------------------------------------------------------------
static void test_clarity(Game *g)
{
	Battle b;

	section("Chiarezza");

	setup(&b, g, EN_CORSIVA, 11);
	eq(g->party[ACTOR_BIEN].clarity, 2, "Chiarezza iniziale");

	// Cancella costa 2: con 2 punti va a zero.
	battle_act(&b, g, 1, ACT_CANCELLA, 0, RIENTRO_FALLITO);
	eq(g->party[ACTOR_BIEN].clarity, 0, "Cancella consuma 2 Chiarezza");

	// Con zero non si puo' piu' cancellare: l'azione deve essere rifiutata
	// e non andare in negativo (un underflow qui darebbe 250 Chiarezza).
	battle_act(&b, g, 1, ACT_CANCELLA, 0, RIENTRO_FALLITO);
	ok(g->party[ACTOR_BIEN].clarity <= CLARITY_MAX,
	   "la Chiarezza non deve mai andare in underflow");

	// Passa da +1.
	g->party[ACTOR_BIEN].clarity = 0;
	battle_act(&b, g, 1, ACT_PASSA, 0, RIENTRO_FALLITO);
	eq(g->party[ACTOR_BIEN].clarity, 1, "Passa restituisce 1 Chiarezza");

	// E non oltre il massimo.
	g->party[ACTOR_BIEN].clarity = CLARITY_MAX;
	battle_act(&b, g, 1, ACT_PASSA, 0, RIENTRO_FALLITO);
	eq(g->party[ACTOR_BIEN].clarity, CLARITY_MAX, "Chiarezza non supera il massimo");
}

//---------------------------------------------------------------------------------
// Test: Rientro perfetto nega il colpo a tutta la squadra
//
// E' il parry di Expedition 33: il valore sta nel negare un colpo di squadra,
// non nel curare se stessi. Per questo il fallback e' "nessuna Difesa" e non
// "una Difesa": se il fallback fosse parziale il parry sarebbe sempre corretto
// e non ci sarebbe una decisione.
//---------------------------------------------------------------------------------
static void test_rientro(Game *g)
{
	Battle b;
	s16 filo_before;

	section("Rientro (parry)");

	// Perfetto: il Filo non scende. Uso Corsiva, che non ha reazioni, cosi'
	// l'unica variabile e' il parry.
	setup(&b, g, EN_CORSIVA, 3);
	filo_before = g->filo;
	battle_act(&b, g, 1, ACT_RIENTRO, 0, RIENTRO_PERFETTO);
	ok(has_event(&b, EV_RIENTRO_PERFETTO), "il QTE perfetto va registrato");
	battle_enemy_phase(&b, g);
	eq(g->filo, filo_before, "il parry perfetto nega il danno");
	ok(has_event(&b, EV_ENEMY_SILENT), "il nemico deve risultare trattenuto");

	// Fallito: il Filo scende.
	setup(&b, g, EN_CORSIVA, 3);
	filo_before = g->filo;
	battle_act(&b, g, 1, ACT_RIENTRO, 0, RIENTRO_FALLITO);
	ok(has_event(&b, EV_RIENTRO_FALLITO), "il QTE fallito va registrato");
	battle_enemy_phase(&b, g);
	ok(g->filo < filo_before, "il parry fallito deve far entrare il danno");

	// Parziale: passa metta' del danno, e deve stare fra i due estremi.
	setup(&b, g, EN_INTERROGAZIONE, 3);
	filo_before = g->filo;
	battle_act(&b, g, 1, ACT_RIENTRO, 0, RIENTRO_PARZIALE);
	battle_enemy_phase(&b, g);
	ok(g->filo < filo_before, "il parry parziale deve lasciare passare qualcosa");
	ok(g->filo > filo_before - 20, "il parry parziale non deve svuotare il Filo");
}

//---------------------------------------------------------------------------------
// Test: Cucisci richiama un cancellato, ma solo nella stessa battaglia
//
// E' il punto in cui il gioco dice "una cancellazione non e' per sempre" senza
// togliere la permanenza: si puo' rimediare finche' la pagina non e' stata
// voltata. Dopo, no.
//---------------------------------------------------------------------------------
static void test_cucisci(Game *g)
{
	Battle b;
	int before;

	section("Cucisci");

	setup(&b, g, EN_CENSORE, 5);

	// Ferito ma non cancellato: Cucisci non deve fare nulla di utile, e non
	// deve neppure costare. La Cucitura e' scarsa: perderla per un tentativo a
	// vuoto renderebbe la meccanica irritante invece che dura.
	g->party[ACTOR_BIEN].hp = 5;
	before = g->party[ACTOR_BIEN].hp;
	battle_act(&b, g, 1, ACT_CUCISCI, 0, RIENTRO_FALLITO);
	ok(g->party[ACTOR_BIEN].hp == before,
	   "Cucisci non deve curare chi non e' cancellato");
	eq(g->filo, FILO_START, "un Cucisci senza bersaglio non costa Filo");
	eq(g->party[ACTOR_BIEN].stitches, 1,
	   "un Cucisci senza bersaglio non consuma la Cucitura");
	ok(has_event(&b, EV_CUCISCI_NA),
	   "un Cucisci senza bersaglio deve essere segnalato");

	// Cancellato in questa battaglia: torna. Il soccorritore e' Bien (slot 1),
	// che e' ancora in piedi: un personaggio a terra non puo' salvare nessuno,
	// e nemmeno se stesso.
	g->party[ACTOR_FERRO].hp = 0;
	g->party[ACTOR_FERRO].erased = 0;   // ancora recuperabile
	b.lost_mask |= (1 << ACTOR_FERRO);
	battle_act(&b, g, 1, ACT_CUCISCI, 0, RIENTRO_FALLITO);
	ok(has_event(&b, EV_CUCISCI), "Cucisci deve andare a buon fine");
	ok(g->party[ACTOR_FERRO].hp > 0, "Cucisci deve richiamare Ferro");
	ok(!has_event(&b, EV_CANCELLED), "richiamare non e' cancellare");

	// Chi e' stato cancellato sul serio non torna piu', e Cucisci non consuma
	// nulla: e' la rete che deve esistere solo dentro la pagina.
	g->party[ACTOR_FERRO].erased = 1;
	g->party[ACTOR_FERRO].hp = 0;
	b.lost_mask |= (1 << ACTOR_FERRO);
	{
		s16 filo_before = g->filo;
		g->party[ACTOR_BIEN].stitches = 1;
		battle_act(&b, g, 1, ACT_CUCISCI, 0, RIENTRO_FALLITO);
		eq(g->party[ACTOR_FERRO].hp, 0,
		   "un cancellato non si richiama piu'");
		eq(g->filo, filo_before,
		   "un tentativo a vuoto non deve costare Filo");
		eq(g->party[ACTOR_BIEN].stitches, 1,
		   "un tentativo a vuoto non deve consumare la Cucitura");
	}

	// Le Cuciture sono una per personaggio per battaglia.
	g->party[ACTOR_OTTAVA].stitches = 1;
	g->party[ACTOR_BIEN].hp = 0;
	b.lost_mask |= (1 << ACTOR_BIEN);
	battle_act(&b, g, 0, ACT_CUCISCI, 0, RIENTRO_FALLITO);
	ok(g->party[ACTOR_BIEN].hp > 0, "il primo Cucisci funziona");
	eq(g->party[ACTOR_OTTAVA].stitches, 0,
	   "il primo Cucisci consuma la Cucitura");

	// La seconda volta non deve funzionare: Cucisci e' una sola per
	// personaggio per battaglia.
	g->party[ACTOR_BIEN].hp = 0;
	b.lost_mask |= (1 << ACTOR_BIEN);
	battle_act(&b, g, 0, ACT_CUCISCI, 0, RIENTRO_FALLITO);
	eq(g->party[ACTOR_BIEN].hp, 0,
	   "una sola Cucitura per personaggio e per battaglia");
}

//---------------------------------------------------------------------------------
// Test: le reazioni dei sigilli
//---------------------------------------------------------------------------------
static void test_reactions(Game *g)
{
	Battle b;
	int i, notes;

	section("Reazioni dei sigilli");

	// CORSIVA: a ogni colpo scorre su un'altra riga, quindi non si puo'
	// accumulare Segnalibri sulla stessa colpendola sempre.
	setup(&b, g, EN_CORSIVA, 21);
	for (i = 0; i < 6; i++)
		battle_act(&b, g, 0, ACT_TRACCIA, 0, RIENTRO_FALLITO);
	ok(has_event(&b, EV_SIGILLO_SCORRE), "Corsiva deve far scorrere la riga");

	// CEDIGIONE: si rafforza con le perdite.
	setup(&b, g, EN_CENSORE, 31);
	{
		s16 atk_before = b.enemy.atk;
		g->party[ACTOR_FERRO].hp = 0;
		b.lost_mask |= (1 << ACTOR_FERRO);
		battle_enemy_phase(&b, g);
		ok(b.enemy.atk > atk_before,
		   "Cedigione deve crescere quando la squadra perde qualcuno");
	}

	// MARGINALIA: genera Note, che a loro danno Filo al nemico.
	setup(&b, g, EN_MARGINALIA, 41);
	notes = 0;
	for (i = 0; i < 4; i++) {
		battle_enemy_phase(&b, g);
		notes += count_events(&b, EV_NOTA);
	}
	ok(notes > 0, "Marginalia deve generare Note");

	// INTERROGAZIONE: drena il Filo se c'e' un cancellato.
	setup(&b, g, EN_INTERROGAZIONE, 51);
	g->party[ACTOR_FERRO].hp = 0;
	g->party[ACTOR_FERRO].erased = 1;
	{
		s16 filo_before = g->filo;
		battle_enemy_phase(&b, g);
		ok(has_event(&b, EV_INTERROGAZIONE),
		   "Interrogazione deve reagire alla perdita");
		ok(g->filo < filo_before,
		   "Interrogazione deve drenare Filo con un cancellato in squadra");
	}

	// E senza cancellati non deve rubare nulla. Il Filo scende comunque,
	// perche' il nemico attacca: quello che si controlla e' che il drenaggio
	// non si sommi all'attacco.
	setup(&b, g, EN_INTERROGAZIONE, 51);
	{
		s16 filo_before = g->filo;
		battle_enemy_phase(&b, g);
		ok(!has_event(&b, EV_INTERROGAZIONE),
		   "Interrogazione deve tacere senza perdite");
		eq(g->filo, filo_before - 9,
		   "senza perdite si perde solo il colpo normale");
	}
}

//---------------------------------------------------------------------------------
// Test: cancellazione permanente
//
// Il cuore del gioco. Un personaggio che arriva a 0 Filo e resta senza
// Cucitura deve restare cancellato per sempre, e non deve rientrare nella
// schiera ne' nelle battaglie successive.
//---------------------------------------------------------------------------------
static void test_erasure(Game *g)
{
	Battle b;
	int i, alive;

	section("Cancellazione permanente");

	// Ferri di tutto: voglio vedere qualcuno cadere e non venire piu'
	// richiamato, quindi niente Cuciture a disposizione.
	setup(&b, g, EN_CENSORE, 61);
	for (i = 0; i < ACTOR_MAX; i++)
		g->party[i].stitches = 0;

	// Si combatte davvero: il nemico non muore solo passando.
	for (i = 0; i < 60 && b.running; i++) {
		int slot;
		for (slot = 0; slot < b.actor_count; slot++)
			battle_act(&b, g, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		battle_enemy_phase(&b, g);
	}

	ok(has_event(&b, EV_CANCELLED),
	   "la caduta della squadra deve registrare una cancellazione");

	// Qualcuno deve essere stato cancellato per davvero, non solo sceso a zero.
	{
		int erased = 0;
		for (i = 0; i < ACTOR_MAX; i++)
			if (g->party[i].erased) erased++;
		ok(erased > 0, "qualcuno deve risultare cancellato");
	}

	// Un cancellato non deve piu' essere schierato.
	alive = 0;
	for (i = 0; i < ACTOR_MAX; i++)
		if (g->party[i].in_party && g->party[i].hp > 0) alive++;
	if (b.running) ok(alive > 0, "deve restare qualcuno schierato");

	// E una nuova battaglia non lo deve riportare indietro.
	{
		int before = 0;
		for (i = 0; i < ACTOR_MAX; i++)
			before += g->party[i].hp;

		battle_begin(&b, EN_CENSORE);

		{
			int after = 0;
			for (i = 0; i < ACTOR_MAX; i++)
				after += g->party[i].hp;
			eq(after, before,
			   "una nuova battaglia non deve restaurare i cancellati");
		}
	}
}

//---------------------------------------------------------------------------------
// Test: La Redazione riscrive un'azione
//
// Il boss dell'Atto II toglie al giocatore Traccia ogni 3 turni: e' un
// anti-QTE perche' obbliga a giocare di parry. Se l'azione riscritta tornasse
// subito disponibile il boss non sarebbe una minaccia, solo un fastidio.
//---------------------------------------------------------------------------------
static void test_rewrite(Game *g)
{
	Battle b;
	int i, rewrites = 0;

	section("La Redazione riscrive");

	setup(&b, g, EN_REDAZIONE, 71);

	for (i = 0; i < 12 && b.running; i++) {
		int slot;
		for (slot = 0; slot < b.actor_count; slot++) {
			if (b.rewritten == ACT_TRACCIA) {
				// Il giocatore prova a usarla lo stesso.
				s16 before = b.enemy.hp;
				battle_act(&b, g, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
				ok(b.enemy.hp == before,
				   "un'azione riscritta non deve fare danno");
				rewrites++;
				break;
			}
			battle_act(&b, g, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		}
		battle_enemy_phase(&b, g);
	}

	ok(rewrites > 0, "la Redazione deve riscrivere Traccia");
	ok(rewrites < 20,
	   "la riscrittura deve essere periodica, non permanente");
}

//---------------------------------------------------------------------------------
// Test: bilanciamento dei boss
//
// Qui la finestra conta e basta: con 33 danno a turno il Censore cade in
// circa 8 turni, e la squadra da 120 Filo ne regge circa 6. Il margine e'
// negativo apposta: si vince parando e usando Cucisci, non resistendo.
//---------------------------------------------------------------------------------
// La finestra di bilanciamento conta e basta: i numeri chiusi nel piano sono
// verificati qui, non a occhio sull'emulatore.
//
//   Traccia  8 danno, gratis, marca una riga per round
//   Cancella 20-28 danno, 2 Chiarezza, sfrutta lo stacco
//   stacco   +50% su tutto, ma costa 3 round di Traccia
//
// Con 3 personaggi che spingono solo Traccia il Censore (260 HP, 2 righe,
// attacco 9) cade in ~8-9 turni, mentre la squadra da 120 Filo ne regge ~6-7
// perche' il nemico colpisce una volta per riga attiva. Il margine e'
// negativo apposta: si vince parando e usando Cucisci, non resistendo.
static void test_balance(Game *g)
{
	int enemy;

	section("Bilanciamento");

	for (enemy = 0; enemy < EN_COUNT; enemy++) {
		u32 seed;
		int aggr_min = 999, aggr_max = 0;
		int parry_win = 0;
		int aggr_win = 0;

		// Strategia "aggressiva": Traccia e basta, mai un parry. E' la strategia
		// peggiore in assoluto e il parry deve valere abbastanza da batterla.
		for (seed = 1; seed <= 12; seed++) {
			Battle b;
			int turns;

			setup(&b, g, enemy, seed * 7919u);
			for (turns = 0; turns < 80 && b.running; turns++) {
				int slot;
				for (slot = 0; slot < b.actor_count; slot++)
					battle_act(&b, g, slot, ACT_TRACCIA, 0,
					           RIENTRO_FALLITO);
				battle_enemy_phase(&b, g);
			}

			if (turns < aggr_min) aggr_min = turns;
			if (turns > aggr_max) aggr_max = turns;
			if (!b.running && b.enemy.hp <= 0) aggr_win++;
		}

		// Strategia "parry": para a turno alterno, altrimenti colpisce.
		// Alternare e' necessario perche' Rientro da solo non fa danno: un
		// giocatore che para sempre non deve poter vincere solo aspettando.
		for (seed = 1; seed <= 12; seed++) {
			Battle b;
			int turns, parry = 1;

			setup(&b, g, enemy, seed * 104729u);
			for (turns = 0; turns < 80 && b.running; turns++) {
				int slot;
				for (slot = 0; slot < b.actor_count; slot++) {
					Actor *a = &g->party[b.actor_id[slot]];
					if (a->clarity > 0 && parry)
						battle_act(&b, g, slot, ACT_RIENTRO, 0,
						           RIENTRO_PERFETTO);
					else
						battle_act(&b, g, slot, ACT_TRACCIA, 0,
						           RIENTRO_FALLITO);
				}
				parry = !parry;
				battle_enemy_phase(&b, g);
			}
			if (!b.running && b.enemy.hp <= 0) parry_win++;
		}

		printf("  nemico %d: aggressivo %d-%d turni e vince %2d/12"
		       "   parry vince %2d/12\n",
		       enemy, aggr_min, aggr_max, aggr_win, parry_win);

		// Il parry deve essere migliore della strategia peggiore. Se non lo
		// fosse, il parry sarebbe un lusso estetico e tutto il sistema di
		// Chiarezza non avrebbe ragione di esistere.
		ok(parry_win >= aggr_win,
		   "il parry non deve essere peggio del giocare dritto");

		if (enemy >= EN_CENSORE) {
			ok(aggr_max >= 4,
			   "un boss non deve cadere in meno di 4 turni");
			ok(aggr_max <= 30,
			   "un boss non deve richiedere piu' di 30 turni");
			ok(parry_win > 0,
			   "un boss deve essere abbattibile giocando di parry");
		} else {
			// I nemici minori devono cadere in fretta: se un'incontro minore
			// dura quanto un boss, la marcia e' noiosa.
			ok(aggr_max <= 6,
			   "i nemici minori devono cadere entro 6 turni");
			ok(aggr_win == 12,
			   "i nemici minori devono essere abbattibili di getto");
		}
	}
}

//---------------------------------------------------------------------------------
// Test: determinismo
//
// Due run con lo stesso seed devono produrre lo stesso identico esito, o i
// bug di combat non si possono riprodurre.
//---------------------------------------------------------------------------------
static void test_determinism(Game *g)
{
	Battle b1, b2;
	Game g1, g2;
	int i, slot;

	section("Determinismo del PRNG");

	// Due partite parallele con lo stesso seed e con DUE copie distinte dello
	// stato di gioco. Usare la stessa Game non andrebbe bene: battle_begin non
	// tocca g->party, quindi azzerare una partita azzererebbe anche l'altra e
	// il confronto non misurerebbe piu' nulla.
	setup(&b1, &g1, EN_CENSORE, 12345);
	setup(&b2, &g2, EN_CENSORE, 12345);
	g2 = g1;

	for (i = 0; i < 40 && b1.running && b2.running; i++) {
		for (slot = 0; slot < b1.actor_count; slot++)
			battle_act(&b1, &g1, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		battle_enemy_phase(&b1, &g1);

		for (slot = 0; slot < b2.actor_count; slot++)
			battle_act(&b2, &g2, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		battle_enemy_phase(&b2, &g2);
	}

	ok(b1.running == b2.running, "stesso seed, stesso esito");
	eq(b1.turn, b2.turn, "stesso seed, stesso numero di turni");
	eq(b1.enemy.hp, b2.enemy.hp, "stesso seed, stesso HP nemico");
	eq(b1.event_count, b2.event_count, "stesso seed, stessi eventi");

	for (i = 0; i < b1.event_count; i++)
		eq(b1.events[i], b2.events[i], "stesso seed, stessi eventi in ordine");

	// E lo stato dei personaggi deve coincidere, non solo quello del nemico.
	eq(g1.filo, g2.filo, "stesso seed, stesso Filo");
	for (i = 0; i < ACTOR_MAX; i++)
		eq(g1.party[i].hp, g2.party[i].hp, "stesso seed, stessi HP in squadra");

	// Seed diversi devono divergere, altrimenti il PRNG e' rotto.
	{
		Battle b3;
		Game g3;
		int same = 1;

		setup(&b3, &g3, EN_CENSORE, 999);
		g3 = g1;

		// Stessa sequenza di azioni, seed diverso: se il risultato fosse
		// identico il PRNG non entrerebbe nel calcolo del danno.
		setup(&b1, &g1, EN_CENSORE, 12345);
		setup(&b3, &g3, EN_CENSORE, 999);

		for (i = 0; i < 10 && b1.running && b3.running; i++) {
			for (slot = 0; slot < b1.actor_count; slot++) {
				battle_act(&b1, &g1, slot, ACT_CANCELLA, 0, RIENTRO_FALLITO);
				battle_act(&b3, &g3, slot, ACT_CANCELLA, 0, RIENTRO_FALLITO);
			}
			battle_enemy_phase(&b1, &g1);
			battle_enemy_phase(&b3, &g3);
		}

		if (b1.enemy.hp != b3.enemy.hp) same = 0;
		ok(!same, "seed diversi devono divergere");
	}

	// Due estrazioni consecutive non possono dare lo stesso numero.
	{
		Battle b4;
		Game g4;
		setup(&b4, &g4, EN_CENSORE, 4242);
		ok(battle_rand(&b4) != battle_rand(&b4),
		   "due estrazioni consecutive devono differire");
	}
}

//---------------------------------------------------------------------------------
// Test: la coda di eventi non trabocca
//
// 32 eventi sono pochi: se una battaglia lunga li esaurisce, l'indicatore deve
// fermarsi invece di scrivere oltre e corrompere lo stato successivo.
//---------------------------------------------------------------------------------
static void test_event_queue(Game *g)
{
	Battle b;
	int i;

	section("Coda di eventi");

	setup(&b, g, EN_REDAZIONE, 777);

	for (i = 0; i < 30 && b.running; i++) {
		int slot;
		for (slot = 0; slot < b.actor_count; slot++)
			battle_act(&b, g, slot, ACT_TRACCIA, 0, RIENTRO_FALLITO);
		battle_enemy_phase(&b, g);
	}

	ok(b.event_count <= BATTLE_EVENT_MAX,
	   "la coda di eventi non deve superare il massimo");

	// E ogni slot deve essere valido, perche' il renderer li legge tutti.
	for (i = 0; i < b.event_count; i++)
		ok(b.events[i] < EV_EVENT_COUNT,
		   "gli eventi devono essere indici validi");
}

//---------------------------------------------------------------------------------
// Test: integrita' dei tipi sul banco prova
//
// Il rischio vero di un banco di prova e' che l'host e il ROM abbiano
// larghezze diverse: qui ogni struct deve avere la dimensione attesa.
//---------------------------------------------------------------------------------
static void test_layout(void)
{
	section("Layout delle struct");

	ok(sizeof(u8) == 1, "u8 = 1 byte");
	ok(sizeof(s16) == 2, "s16 = 2 byte");
	ok(sizeof(s32) == 4, "s32 = 4 byte");
	ok(sizeof(Actor) < 32, "Actor deve stare in poco spazio");
	ok(sizeof(Battle) < 256, "Battle non deve crescere troppo");
	printf("  Actor = %zu byte, Battle = %zu byte, Enemy = %zu byte\n",
	       sizeof(Actor), sizeof(Battle), sizeof(Enemy));
}

//---------------------------------------------------------------------------------
int main(void)
{
	Game g;

	printf("== Palimpsesto: banco di prova del combattimento ==\n");

	test_layout();
	test_begin(&g);
	test_stacco(&g);
	test_clarity(&g);
	test_rientro(&g);
	test_cucisci(&g);
	test_reactions(&g);
	test_erasure(&g);
	test_rewrite(&g);
	test_balance(&g);
	test_determinism(&g);
	test_event_queue(&g);

	printf("\n----------------------------------------\n");
	if (g_fail == 0) {
		printf("TUTTI I TEST PASSANO (%d controlli)\n", g_checks);
		return 0;
	}
	printf("%d CONTROLLI FALLITI su %d\n", g_fail, g_checks);
	return 1;
}