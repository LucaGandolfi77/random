/* quaderno.js — le lettere di Hana che ricordano le tue scelte.
 *
 * Motivo di esistere: il gioco registra 200 scelte (100 episodi × 2) e ne
 * leggeva una sola volta, per il bias "rabbia" del livello successivo.
 * Qui la scelta torna dentro la lettera, e il Quaderno mostra entrambe le
 * strade.
 *
 * Vincoli di progetto, deliberati:
 *  - `letter` resta una stringa: il save non cambia, nessuna migrazione.
 *  - `ps` è un postscript OPZIONALE che si APPENDE alla base, non la sostituisce.
 *    Le 100 lettere già scritte continuano a valere esattamente come prima.
 *  - la risoluzione avviene AL MOMENTO dello sblocco: la lettera che hai
 *    ricevuto resta quella, rileggerla non la riscrive.
 *  - l'origine di una lettera si ricostruisce con una mappa inversa
 *    base → episodio: nessun campo nuovo nel save.
 */
(function () {
'use strict';

/* Separatore tra base e postscript. Va bene per il TTS (pausa) e per il DOM
   (`white-space:pre-wrap` lo rende fedele). Le lettere base non lo contengono:
   test/quaderno.test.mjs lo verifica su tutti e 100 gli episodi. */
const PS_SEP = '\n\n';

/* gli unici tre effetti non-finale. Serve al lint del contenuto. */
const EFFECTS = ['coraggio', 'dolcezza', 'rabbia'];

const isFinale = (effect) => String(effect || '').startsWith('finale-');

/* Accetta sia la forma nuova (oggetto, per robustezza futura) sia la stringa
   dei 100 episodi già scritti. */
function baseLetter(ep) {
  if (!ep) return '';
  if (typeof ep.letter === 'string') return ep.letter;
  if (ep.letter && typeof ep.letter.text === 'string') return ep.letter.text;
  return '';
}

/* Il postscript per un effetto dato, '' se non esiste. */
function postscript(ep, effect) {
  const ps = ep && ep.ps;
  if (!ps || typeof ps !== 'object') return '';
  return typeof ps[effect] === 'string' ? ps[effect] : '';
}

/* Il testo della lettera come va mostrato e letto. */
function resolveLetter(ep, effect) {
  const base = baseLetter(ep);
  if (!base) return '';
  const ps = postscript(ep, effect);
  return ps ? base + PS_SEP + ps : base;
}

/* Mappa inversa base → episodio, costruita una volta per universo. */
function letterIndex(universe) {
  const map = new Map();
  for (const ep of (universe && universe.story) || []) {
    const b = baseLetter(ep);
    if (b && !map.has(b)) map.set(b, ep);
  }
  return map;
}

/* Da una lettera memorizzata risale all'episodio che l'ha prodotta.
   Le lettere segrete degli easter egg non hanno episodio: tornano null. */
function letterOrigin(text, index) {
  if (typeof text !== 'string' || !index) return null;
  return index.get(text.split(PS_SEP)[0]) || null;
}

/* Gli effetti che l'episodio offriva e che il giocatore non ha preso.
   I finali sono esclusi: aprono finali diversi, già gestiti da unlockEnding,
   e due fonti di verità sullo stesso momento sarebbero un bug. */
function alternatives(ep, taken) {
  const out = [];
  for (const choice of [ep && ep.choiceA, ep && ep.choiceB]) {
    const e = choice && choice.effect;
    if (!e || isFinale(e) || e === taken) continue;
    if (!out.includes(e)) out.push(e);
  }
  return out;
}

/* L'etichetta verbatim della scelta fatta: «Dimmi la verità, non la recensione.» */
function choiceLabel(ep, effect) {
  if (!ep || !effect) return '';
  if (ep.choiceA && ep.choiceA.effect === effect) return ep.choiceA.label || '';
  if (ep.choiceB && ep.choiceB.effect === effect) return ep.choiceB.label || '';
  return '';
}

/* IlQuaderno non chiama "rimpianti" le strade non percorse: in un gioco sul
   lutto, etichettarle così sarebbe sbagliato a livello di design. */
const OTHER_PATHS_LABEL = { coraggio: 'la strada del coraggio', dolcezza: 'la strada della dolcezza', rabbia: 'la strada della rabbia' };
const pathLabel = (effect) => OTHER_PATHS_LABEL[effect] || effect;

window.MHQuaderno = {
  PS_SEP, EFFECTS, isFinale,
  baseLetter, postscript, resolveLetter,
  letterIndex, letterOrigin,
  alternatives, choiceLabel, pathLabel,
};
})();
