/* save.js — persistenza locale, deep-merge e migrazioni.
 *
 * Object.assign() rimpiazzerebbe `impostazioni` per intero, così ogni nuova
 * sottochiave aggiunta in futuro sparirebbe dai save già scritti. Qui il merge
 * è ricorsivo e ogni salvataggio porta la sua versione.
 */
(function () {
'use strict';

const SAVE_KEY = 'fst-save-v1';
const SAVE_VERSION = 1;

const IMPOSTAZIONI_DEFAULT = () => ({
  suono: true,
  narrazione: false,
  menoVeloce: false,
  mano: 'destra',
  mossa: 'medio',        // la larghezza della presa: sottile, medio, largo
  lume: 'media',
});

const SALVA_DEFAULT = () => ({
  saveVersion: SAVE_VERSION,
  atto: 0,
  stanza: 0,
  fase: 'copertina',        // copertina | atto | scena | combattimento | finale
  scenaCoda: null,          // indice della battuta in corso, se in scena
  memoria: [],              // id delle schede ancora intere
  bruciate: [],             // id delle schede date al terreno, in ordine
  riafferrate: [],          // id delle schede recuperate con "Rinnova"
  scelte: {},               // { flag: valore } — i flag, e sono letti
  scelteAl: {},             // { flag: atto } — quando sono stati scritti
  fioriti: [],              // i vasi che hai riempito: uno per persona, un petalo
  vaso: null,               // il vaso al centro dell'orto
  finale: null,
  epitafi: [],              // epitaffi già letti
  fioreAttivo: 'nadia',     // di chi è il fiore che stai dando
  viste: 0,
  statistiche: { offerte: 0, rese: 0, bruciate: 0, morti: 0, inizio: '' },
  impostazioni: IMPOSTAZIONI_DEFAULT(),
});

function deepMerge(dst, src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return dst;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)
        && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) {
      deepMerge(dst[k], v);
    } else if (v !== undefined) {
      dst[k] = v;
    }
  }
  return dst;
}

/* Le migrazioni trasformano un save vecchio in uno che il codice di oggi
 * sa leggere. Ogni versione va trattata in ordine e deve essere idempotente
 * se applicata due volte: un giocatore che riapre dopo un aggiornamento
 * non deve perdere nulla. */
const MIGRAZIONI = {
  /* da 0 (save scritti prima delle impostazioni) a 1 */
  0: (s) => { s.impostazioni = Object.assign(IMPOSTAZIONI_DEFAULT(), s.impostazioni || {}); return s; },
};

function migra(parsed) {
  let v = Number(parsed.saveVersion) || 0;
  while (v < SAVE_VERSION) {
    const m = MIGRAZIONI[v];
    if (m) parsed = m(parsed);
    v++;
    parsed.saveVersion = v;
  }
  return parsed;
}

function leggi() {
  const base = SALVA_DEFAULT();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    /* Non fidarsi di un array: un save corrotto non deve far cadere il gioco. */
    for (const k of ['memoria', 'bruciate', 'riafferrate', 'fioriti', 'epitafi']) {
      if (!Array.isArray(parsed[k])) parsed[k] = [];
    }
    if (typeof parsed.scelte !== 'object' || !parsed.scelte) parsed.scelte = {};
    if (typeof parsed.statistiche !== 'object' || !parsed.statistiche) parsed.statistiche = base.statistiche;
    return deepMerge(base, migra(parsed));
  } catch (err) {
    console.warn('[save] illeggibile, riparto da zero:', err && err.message);
    return base;
  }
}

let cache = null;

function carica() {
  if (!cache) cache = leggi();
  return cache;
}

function scrivi(s) {
  cache = s;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }
  catch (err) { console.warn('[save] scrittura fallita:', err && err.message); }
  return s;
}

/* Salva e notifica in un colpo solo: quasi tutti i caller ne hanno bisogno. */
function salva(mutatore) {
  const s = carica();
  const risultato = typeof mutatore === 'function' ? mutatore(s) : mutatore;
  return scrivi(risultato && typeof risultato === 'object' ? risultato : s);
}

function imposta(chiave, valore) {
  return salva((s) => { s.impostazioni[chiave] = valore; });
}

function nuovaPartita(defsSchede) {
  const s = SALVA_DEFAULT();
  s.memoria = defsSchede.map((d) => d.id);
  s.statistiche.inizio = new Date().toISOString().slice(0, 10);
  return scrivi(s);
}

function esiste() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

function cancella() {
  cache = null;
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  return leggi();
}

window.FSTSave = {
  leggi, carica, scrivi, salva, imposta, nuovaPartita, cancella, esiste,
  SALVA_DEFAULT, IMPOSTAZIONI_DEFAULT, SAVE_KEY, SAVE_VERSION,
};
})();
