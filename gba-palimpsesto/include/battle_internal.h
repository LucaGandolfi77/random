//---------------------------------------------------------------------------------
// Palimpsesto - dettagli condivisi fra battle.c e battle_ai.c
//
// Non e' un header pubblico: i test host non lo includono mai, e i moduli che
// disegnano non ne hanno bisogno. Sta qui solo perche' i due file del
// combattimento devono condividere gli helper senza duplicarli.
//
// Nota sul perche' gli helper hanno il prefisso battle_: battle.c e
// battle_ai.c finiscono entrambi nel link del banco di prova e nel ROM, e i
// nomi scoperchi come emit o check_collapse rischierebbero di finire in
// conflitto con gli altri moduli del progetto.
//---------------------------------------------------------------------------------
#ifndef BATTLE_INTERNAL_H
#define BATTLE_INTERNAL_H

#include "battle.h"

#define INTERROGAZIONE_DRAIN  10    // Filo rubato per turno, per cancellato
#define CUDIGIONE_BONUS_ATK    1    // +1 attacco per membro perso in battaglia
#define MARGINALIA_NOTE_TURNI  2    // una Nota ogni N turni
#define MARGINALIA_NOTE_MAX    6    // Note necessarie per curare il nemico
#define MARGINALIA_NOTE_HEAL   4    // Filo recuperati dal nemico

// Accoda un evento alla battaglia. Se la coda e' piena l'evento viene
// scartato: preferiamo perdere un'animazione che scrivere oltre l'array.
void battle_emit(Battle *b, int ev);

// Controlla chi e' caduto e cancella chi non e' piu' recuperabile nella
// pagina corrente. Va chiamata dopo ogni azione e dopo la fase nemica.
void battle_check_collapse(Battle *b, Game *g);

#endif // BATTLE_INTERNAL_H