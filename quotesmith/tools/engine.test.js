'use strict';
const db = require('../data.js').QUOTES;
const Q = require('../engine.js');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2714', name); }
  else { fail++; console.log('  \u2718', name, extra || ''); }
}

console.log('Database totale:', db.length, 'citazioni');

/* --- validità struttura --- */
let bad = [];
db.forEach((q, i) => {
  if (!Array.isArray(q) || q.length !== 5) bad.push('riga ' + i + ': non è un array 5 campi');
  else {
    const [text, author, cat, lang, diff] = q;
    if (typeof text !== 'string' || !text.trim()) bad.push('riga ' + i + ': testo mancante');
    if (typeof author !== 'string' || !author.trim()) bad.push('riga ' + i + ': autore mancante');
    if (!Q.VALID.cat.includes(cat)) bad.push('riga ' + i + ': categoria ' + cat);
    if (!Q.VALID.lang.includes(lang)) bad.push('riga ' + i + ': lingua ' + lang);
    if (!Q.VALID.diff.includes(diff)) bad.push('riga ' + i + ': difficoltà ' + diff);
  }
});
ok('struttura valida (5 campi, categorie/lingue/difficoltà ok)', bad.length === 0, bad.slice(0, 3).join(' | '));

/* --- duplicati testo per lingua --- */
const seen = {};
const dups = [];
db.forEach((q) => {
  const [text, , , lang] = q;
  const k = lang + '::' + text.toLowerCase();
  if (seen[k]) dups.push(text + ' [' + lang + ']');
  seen[k] = true;
});
ok('nessun testo duplicato nella stessa lingua', dups.length === 0, dups.slice(0, 3).join(', '));

/* --- conteggi minimi per combinazione lingua+categoria+difficoltà --- */
const minPer = 10;
const sparse = [];
Q.CATEGORIES.forEach((c) => {
  Q.LANGS.forEach((l) => {
    Q.DIFFICULTIES.forEach((d) => {
      const n = db.filter((q) => q[2] === c.key && q[3] === l.key && q[4] === d.key).length;
      if (n < minPer) sparse.push(c.key + '/' + l.key + '/' + d.key + '=' + n);
    });
  });
});
ok('ogni combinazione cat+lang+diff ha almeno ' + minPer + ' frasi', sparse.length === 0, sparse.slice(0, 6).join(', '));

/* --- copertura per lingua e categoria --- */
Q.LANGS.forEach((l) => {
  const n = db.filter((q) => q[3] === l.key).length;
  ok('lingua ' + l.key + ': ' + n + ' citazioni', n >= 150);
});
Q.CATEGORIES.forEach((c) => {
  Q.LANGS.forEach((l) => {
    const n = db.filter((q) => q[2] === c.key && q[3] === l.key).length;
    ok('categoria ' + c.key + ' [' + l.key + ']: ' + n, n >= 20);
  });
});

/* --- logica quiz --- */
const quotes = db.filter((q) => q[2] === 'film' && q[3] === 'en');
const q = Q.makeQuestion(db, quotes[0]);
ok('4 opzioni per domanda', q.options.length === 4);
ok('opzioni uniche', new Set(q.options).size === 4);
ok('autore corretto presente', q.options.includes(q.author));
ok('indice corretto valido', q.correct >= 0 && q.options[q.correct] === q.author);
ok('checkAnswer riconosce giusto/sbagliato', Q.checkAnswer(q, q.correct) === true && Q.checkAnswer(q, (q.correct + 1) % 4) === false);

const dist = Q.pickDistractors(db, quotes[0], 3);
ok('3 distrattori unici, mai l\'autore corretto', dist.length === 3 && new Set(dist).size === 3 && !dist.includes(quotes[0][1]));

const round = Q.buildRound(db, { cat: 'film', lang: 'en', diff: 'easy', count: 10 });
ok('round da 10 domande', round.length === 10);
ok('round tutto film+en', round.every((x) => x.cat === 'film' && x.lang === 'en'));
ok('round senza domande duplicate', new Set(round.map((x) => x.text)).size === 10);

/* fallback: cartoni it hard ha poche frasi -> riempie con altre difficoltà della stessa cat */
const fallback = Q.buildRound(db, { cat: 'cartoni', lang: 'it', diff: 'hard', count: 10 });
ok('fallback: cartoni it hard comunque 10 domande', fallback.length === 10);
ok('fallback: nessuna domanda duplicata', new Set(fallback.map((x) => x.text)).size === 10);

/* ordine di difficoltà: media ponderata */
const avgDiff = Q.DIFFICULTIES.reduce((acc, d) => acc + (d.key === 'easy' ? 1 : d.key === 'medium' ? 2 : 3), 0) / Q.DIFFICULTIES.length;
ok('config difficoltà sanabile', isFinite(avgDiff));

console.log('\n' + (fail ? 'FAIL: ' + fail + ' test falliti' : 'Tutti i test superati \u2714') + ' (' + pass + ' test)');
process.exit(fail ? 1 : 0);
