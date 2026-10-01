/* memoria.js — il Mazzetto: che cosa tieni, che cosa hai dato in pasto.
 *
 * È il cuore economico del gioco. Tutto qui dentro è funzione pura: prende il
 * save e i dati delle schede, restituisce un save nuovo. Nessun DOM, nessun
 * canvas — per questo si testa da solo.
 *
 * Tre elenchi, tre significati diversi:
 *   memoria     → schede che hai ancora e che non hai bruciato
 *   bruciate    → schede bruciate, in ordine di bruciatura (l'ultima è la più recente)
 *   riafferrate → schede che hai perso e poi sei tornata a cercare
 *
 * E due numeri che non sono ricordi:
 *   fioriti → i vasi che hai riempito. Uno per persona. Sono i petali.
 *   stato   → quanto hai rovinato una persona. Cambia l'arco, non solo il testo.
 */
(function () {
'use strict';

/* Indice id → definizione, costruito una volta sola. */
let INDICE = null;
function indice(defs) {
  if (INDICE && INDICE.__len === defs.length && INDICE.__defs === defs) return INDICE;
  const m = new Map();
  for (const d of defs) m.set(d.id, d);
  INDICE = Object.assign(m, { __len: defs.length, __defs: defs });
  return m;
}

const senzaDup = (arr) => [...new Set(arr)];

/* ── letture ─────────────────────────────────────────────── */

/* Una scheda è "trovata" se l'hai mai avuta: ora, bruciata o riafferrata. */
function trovata(salva, id) {
  return salva.memoria.includes(id) || salva.bruciate.includes(id) || salva.riafferrate.includes(id);
}

function ha(salva, id) {
  return salva.memoria.includes(id);
}

function quante(salva) {
  return salva.memoria.length;
}

/* I petali: uno per vaso riempito. Il tutorial conta, e conta per una
 * ragione precisa — se non contasse, l'atto zero sarebbe un atto gratis. */
function petali(salva) {
  return (salva.fioriti || []).length;
}

function haFiorito(salva, id) {
  return (salva.fioriti || []).includes(id);
}

function persone(defs, salva, { soloTrovate = true } = {}) {
  const idx = indice(defs);
  const out = new Map();
  for (const d of defs) {
    if (soloTrovate && !trovata(salva, d.id)) continue;
    if (!out.has(d.persona)) out.set(d.persona, []);
    out.get(d.persona).push(d);
  }
  return out;
}

/* Unione delle chiavi di tutte le schede che hai ancora. Perdere la scheda
 * che porta "accarezza" significa che il pulsante Accarezza sparisce dal menu:
 * la perdita è meccanica, non solo narrativa. */
function chiavi(salva, defs) {
  const idx = indice(defs);
  const out = new Set();
  for (const id of salva.memoria) {
    const d = idx.get(id);
    if (d && d.chiavi) for (const k of d.chiavi) out.add(k);
  }
  return out;
}

function abilita(salva, defs, chiave) {
  return chiavi(salva, defs).has(chiave);
}

/* Modificatori numerici che le schede possono portare. */
function bonus(salva, defs) {
  const idx = indice(defs);
  const b = { cura: 1, resa: 0, appassimento: 0, memoriaPerResa: 1 };
  for (const id of salva.memoria) {
    const d = idx.get(id);
    if (!d || !d.valori) continue;
    for (const k of Object.keys(d.valori)) {
      if (k === 'cura') b.cura += d.valori[k];
      else b[k] = (b[k] || 0) + d.valori[k];
    }
  }
  return b;
}

/* ── scelte di gioco ─────────────────────────────────────── */

/* Trovi una scheda. Va in testa: è la più fresca, e le fresche sono le prime
 * a salire quando sei obbligata a scegliere cosa buttare. */
function trova(salva, id) {
  if (ha(salva, id)) return salva;
  if (!salva.memoria.includes(id)) salva.memoria.unshift(id);
  salva.bruciate = salva.bruciate.filter((x) => x !== id);
  return salva;
}

function trovaTutte(salva, ids) {
  for (const id of ids) trova(salva, id);
  return salva;
}

function brucia(salva, ids) {
  const reali = senzaDup(ids).filter((id) => ha(salva, id));
  if (!reali.length) return salva;
  salva.memoria = salva.memoria.filter((id) => !reali.includes(id));
  salva.bruciate.push(...reali);
  return salva;
}

/* La perdita automatica (resa fallita, domanda senza risposta) prende la
 * scheda più fresca: quella che non hai ancora avuto il tempo di piangere.
 * È una scelta narrativa, non una scelta numerica: non serve sceglierla. */
/* Restituisce gli id persi, non il save: chi chiama questo vuole sapere
 * *cosa* è andato, non solo che è andato. `brucia` invece restituisce il save,
 * perché le chiamate che la usano per concatenare hanno bisogno di quello. */
function bruciaAutomatico(salva, n = 1) {
  const presi = salva.memoria.slice(0, n);
  brucia(salva, presi);
  return presi;
}

/* La resa riuscita restituisce un ricordo: la scheda bruciata più di recente,
 * cioè l'ultima che hai scelto di perdere. */
function schedaDaRiafferrare(salva) {
  for (let i = salva.bruciate.length - 1; i >= 0; i--) {
    if (!ha(salva, salva.bruciate[i])) return salva.bruciate[i];
  }
  return null;
}

function riafferra(salva, id) {
  if (ha(salva, id)) return null;
  salva.bruciate = salva.bruciate.filter((x) => x !== id);
  if (!salva.riafferrate.includes(id)) salva.riafferrate.push(id);
  if (!salva.memoria.includes(id)) salva.memoria.push(id);
  return id;
}

/* Voci del Mazzetto, dalla più fresca alla più antica. */
function schede(defs, salva, persona = null) {
  const idx = indice(defs);
  return salva.memoria
    .map((id) => idx.get(id))
    .filter(Boolean)
    .filter((d) => !persona || d.persona === persona);
}

function schedeBruciate(defs, salva) {
  const idx = indice(defs);
  return salva.bruciate.map((id) => idx.get(id)).filter(Boolean);
}

/* ── viste ───────────────────────────────────────────────── */

function isVacia(salva) {
  return salva.memoria.length === 0;
}

/* Risorse per la scelta a due carte: se non hai due schede non puoi usare
 * Mazzo, e il pulsante non deve nemmeno essere accendibile. */
function puoiBruciare(salva, n) {
  return salva.memoria.length >= n;
}

/* ── l'arco ──────────────────────────────────────────────── */

/* Lo stato di una persona non dipende dall'atto: dipende da come l'hai
 * trattata. È la funzione che rende il cast vivo, e siccome è pura si legge
 * dal Mazzetto e da nient'altro.
 *
 *   stato 0  chi è
 *   stato 1  chi hai perso     (le hai date al terreno)
 *   stato 2  chi ti ha piantato (il suo vaso è fiorito)
 *
 * Riempire il vaso vale due e non ne ammette un terzo: non si può uccidere due
 * volte la stessa persona, e una persona a cui hai già dato tutto non può
 * peggiorare. È l'unico caso in cui il massimo non è "tutto quello che hai
 * fatto", ed è voluto.
 */
function statoDi(salva, defs, persona) {
  if (haFiorito(salva, persona)) return 2;
  const idx = indice(defs);
  for (const id of salva.bruciate) {
    const d = idx.get(id);
    if (d && d.persona === persona) return 1;
  }
  return 0;
}

/* Quante schede di quella persona hai ancora: serve al Cast per non
 * confondere "ti ha tradita" con "non la vedi più". */
function quanteDi(salva, defs, persona) {
  const idx = indice(defs);
  let n = 0;
  for (const id of salva.memoria) {
    const d = idx.get(id);
    if (d && d.persona === persona) n++;
  }
  return n;
}

/* Quante ne hai perse: idem, e con la stessa onestà. */
function quantePersiDi(salva, defs, persona) {
  const idx = indice(defs);
  let n = 0;
  for (const id of salva.bruciate) {
    const d = idx.get(id);
    if (d && d.persona === persona) n++;
  }
  return n;
}

/* ── il finale ───────────────────────────────────────────── */

/* L'ordine dei controlli è il cuore del gioco: va dall'unico finale che parla
 * d'amore a quello in cui non ti ricordi più niente. Va tenuto in ordine con
 * `epitaffio.js`.
 *
 * `giardino` — il finale vero — non si sblocca con un numero solo: servono i sei
 * petali E la promessa mantenuta. Sotto gli otto ricordi, e senza la promessa,
 * un giardino non è un giardino: è un prato, e la differenza te la dice il
 * finale, non il numerino.
 */
const SOGLIE = [
  { chiave: 'terra', min: 0, nome: 'La Terra' },
  { chiave: 'spoglio', min: 1, nome: 'Lo Spoglio' },
  { chiave: 'prato', min: 2, nome: 'Il Prato' },
  { chiave: 'vigna', min: 7, petali: 6, nome: 'La Vigna' },
  { chiave: 'giardino', min: 12, petali: 6, nome: 'Il Giardino' },
];

const SOGLIE_SEMPLICI = SOGLIE.filter((s) => !s.petali);

function finalePer(salva, { conPetali = false, promessa = false } = {}) {
  const n = salva.memoria.length;
  const p = petali(salva);
  if (conPetali) {
    for (let i = SOGLIE.length - 1; i >= 0; i--) {
      const s = SOGLIE[i];
      if (!s.petali) continue;
      if (p >= s.petali && n >= s.min && (s.chiave !== 'giardino' || promessa)) return s;
    }
  }
  let scelto = SOGLIE_SEMPLICI[0];
  for (let i = SOGLIE_SEMPLICI.length - 1; i >= 0; i--) {
    if (n >= SOGLIE_SEMPLICI[i].min) { scelto = SOGLIE_SEMPLICI[i]; break; }
  }
  return scelto;
}

/* La promessa: sei sola tu a poter mantenere o no, e il gioco non lo deduce.
 * Va detto. */
function promessaMantenuta(salva) {
  const s = salva.scelte || {};
  return s.a1_promise === 'finiro' || s.a2_promise === 'verita' || s.a4_nome === 'detto';
}

window.FSTMemoria = {
  indice, trovata, ha, quante, persone, chiavi, abilita, bonus,
  trova, trovaTutte, brucia, bruciaAutomatico, schedaDaRiafferrare, riafferra,
  schede, schedeBruciate, isVacia, puoiBruciare,
  petali, haFiorito, statoDi, quanteDi, quantePersiDi,
  finalePer, promessaMantenuta, SOGLIE, senzaDup,
};
})();
