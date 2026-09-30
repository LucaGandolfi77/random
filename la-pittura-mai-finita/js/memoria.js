/* memoria.js — il Quaderno: che cosa tieni, che cosa bruci.
 *
 * È il cuore economico del gioco. Tutto qui dentro è funzione pura: prende il
 * save e i dati delle schede, restituisce un save nuovo. Nessun DOM, nessun
 * canvas — per questo si testa da solo.
 *
 * Tre elenchi, tre significati diversi:
 *   memoria     → schede che hai ancora e che non hai bruciato
 *   bruciate    → schede bruciate, in ordine di bruciatura (l'ultima è la più recente)
 *   riafferrate → schede che hai perso e poi sei tornato a cercare
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
 * che porta "lavora" significa che il pulsante Lavora sparisce dal menu:
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
  const b = { danno: 1, parata: 0, asciugatura: 0, memoriaPerParata: 1 };
  for (const id of salva.memoria) {
    const d = idx.get(id);
    if (!d || !d.valori) continue;
    for (const k of Object.keys(d.valori)) {
      if (k === 'danno') b.danno += d.valori[k];
      else b[k] = (b[k] || 0) + d.valori[k];
    }
  }
  return b;
}

/* ── scelte di gioco ─────────────────────────────────────── */

/* Trovi una scheda. Va in testa: è la più fresca, e le fresche sono le prime
 * a salire quando sei obbligato a scegliere cosa buttare. */
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

/* La perdita automatica (parata fallita, domanda senza risposta) prende la
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

/* La parata riuscita restituisce un ricordo: la scheda bruciata più di
 * recente, cioè l'ultima che hai scelto di perdere. */
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

/* Voci del Quaderno, dalla più fresca alla più antica. */
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
 * Inchiostro, e il pulsante non deve nemmeno essere accendibile. */
function puoiBruciare(salva, n) {
  return salva.memoria.length >= n;
}

/* Finale determinato dal numero di schede rimaste. L'ordine dei controlli è
 * il cuore del gioco: va dall'unico finale che parla d'amore a quello in cui
 * non ti ricordi più niente. Va tenuto in ordine con `epitaffio.js`. */
const SOGLIE = [
  { chiave: 'cenere', min: 0, nome: 'La Cenere' },
  { chiave: 'cielo', min: 1, nome: 'Il Cielo' },
  { chiave: 'calore', min: 5, nome: 'Il Calore' },
  { chiave: 'voce', min: 13, nome: 'La Voce' },
];

function finalePer(salva, { conFrammenti = false } = {}) {
  const n = salva.memoria.length;
  const scelto = [...SOGLIE].reverse().find((s) => n >= s.min) || SOGLIE[0];
  /* Il finale vero non si sblocca con un numero: si sblocca con i quattro
   * schizzi di cielo del maestro, sparsi in tutto il gioco. */
  if (conFrammenti && salva.frammenti.length >= 4 && n >= 8) {
    return { chiave: 'studio', min: 8, nome: 'Lo Studio del Cielo' };
  }
  return scelto;
}

window.PMFMemoria = {
  indice, trovata, ha, quante, persone, chiavi, abilita, bonus,
  trova, trovaTutte, brucia, bruciaAutomatico, schedaDaRiafferrare, riafferra,
  schede, schedeBruciate, isVacia, puoiBruciare, finalePer, SOGLIE, senzaDup,
};
})();