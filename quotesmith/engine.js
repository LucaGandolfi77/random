/* ===================================================
   🗣️ QUOTESMITH — Motore puro
   "Chi ha detto questa frase?"
   Seleziona domande dal database, genera le 4 opzioni
   (1 corretta + 3 distrattori plausibili), gestisce
   punteggio. Nessun DOM: testabile in Node.
   Esposto come window.QuoteSmith (browser) e
   module.exports (Node).
   =================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuoteSmith = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROUND_SIZE = 10;

  const LANGS = [
    { key: 'it', name: 'Italiano 🇮🇹', native: 'Italiano' },
    { key: 'en', name: 'English 🇬🇧', native: 'English' },
  ];

  const DIFFICULTIES = [
    { key: 'easy', name: { it: 'Facile 🌱', en: 'Easy 🌱' }, hint: { it: 'Frasi iconiche, chiunque le conosce', en: 'Iconic lines, everyone knows them' } },
    { key: 'medium', name: { it: 'Medio ⚖️', en: 'Medium ⚖️' }, hint: { it: 'Per chi ne sa qualcosa', en: 'For those who know a thing or two' } },
    { key: 'hard', name: { it: 'Difficile 🔥', en: 'Hard 🔥' }, hint: { it: 'Solo veri intenditori', en: 'Only true connoisseurs' } },
  ];

  const CATEGORIES = [
    { key: 'film', emoji: '🎬', name: { it: 'Film', en: 'Movies' } },
    { key: 'serie', emoji: '📺', name: { it: 'Serie TV', en: 'TV Series' } },
    { key: 'cartoni', emoji: '🎨', name: { it: 'Cartoni animati', en: 'Animated Shows' } },
    { key: 'canzoni', emoji: '🎵', name: { it: 'Canzoni', en: 'Songs' } },
    { key: 'libri', emoji: '📚', name: { it: 'Libri', en: 'Books' } },
    { key: 'storia', emoji: '🏛️', name: { it: 'Storia e Personaggi', en: 'History & People' } },
    { key: 'videogiochi', emoji: '🕹️', name: { it: 'Videogiochi', en: 'Video Games' } },
    { key: 'proverbi', emoji: '🗣️', name: { it: 'Proverbi e Detti', en: 'Proverbs & Sayings' } },
  ];

  const VALID = {
    cat: CATEGORIES.map((c) => c.key),
    lang: LANGS.map((l) => l.key),
    diff: DIFFICULTIES.map((d) => d.key),
  };

  function shuffle(arr, rng) {
    const a = arr.slice();
    const rand = typeof rng === 'function' ? rng : Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function catName(key, lang) {
    const c = CATEGORIES.find((c) => c.key === key);
    return c ? c.name[lang] : key;
  }

  function diffName(key, lang) {
    const d = DIFFICULTIES.find((d) => d.key === key);
    return d ? d.name[lang] : key;
  }

  /* Converte una riga-array del database in un oggetto. */
  function toObj(q) {
    return { text: q[0], author: q[1], cat: q[2], lang: q[3], diff: q[4] };
  }

  /* Filtra il DB per lingua/categoria/difficoltà. */
  function filterQuotes(db, opts) {
    const { cat, lang, diff } = opts || {};
    return db.map(toObj).filter((q) => {
      if (lang && q.lang !== lang) return false;
      if (cat && q.cat !== cat) return false;
      if (diff && q.diff !== diff) return false;
      return true;
    });
  }

  /* Estrae `count` citazioni; se la combo cat+lang+diff non basta,
     riempie con la stessa cat+lang (altre difficoltà), poi solo lang.
     Ritorna in ordine casuale. */
  function getQuotes(db, opts) {
    const { cat, lang, diff, count } = opts || {};
    const n = count || ROUND_SIZE;
    const exact = filterQuotes(db, { cat, lang, diff });
    if (exact.length >= n) return shuffle(exact, opts.rng).slice(0, n);
    const catLang = filterQuotes(db, { cat, lang });
    const catLangShuffled = shuffle(catLang, opts.rng);
    const out = [];
    const seen = new Set();
    catLangShuffled.forEach((q) => {
      if (seen.has(q.text)) return;
      seen.add(q.text);
      out.push(q);
    });
    if (out.length < n) {
      const langAll = shuffle(filterQuotes(db, { lang }), opts.rng);
      const seen2 = new Set(out.map((q) => q.text));
      langAll.forEach((q) => {
        if (seen2.has(q.text)) return;
        seen2.add(q.text);
        out.push(q);
      });
    }
    return out.slice(0, n);
  }

  /* Distrattori: autori della stessa lingua, possibilmente stessa
     categoria e difficoltà, escluso l'autore corretto. */
  function pickDistractors(db, quote, n) {
    const same = shuffle(
      filterQuotes(db, { lang: quote.lang, cat: quote.cat, diff: quote.diff })
        .filter((q) => q.author !== quote.author && q.text !== quote.text),
      null
    );
    const authors = [];
    const seen = new Set();
    same.forEach((q) => { if (!seen.has(q.author) && authors.length < n) { seen.add(q.author); authors.push(q.author); } });
    if (authors.length < n) {
      const other = shuffle(
        filterQuotes(db, { lang: quote.lang })
          .filter((q) => q.author !== quote.author && !seen.has(q.author)),
        null
      );
      other.forEach((q) => { if (authors.length < n) { seen.add(q.author); authors.push(q.author); } });
    }
    return authors.slice(0, n);
  }

  function makeQuestion(db, quote, rng) {
    const distractors = pickDistractors(db, quote, 3);
    const options = shuffle([quote.author].concat(distractors), rng);
    return {
      text: quote.text,
      author: quote.author,
      cat: quote.cat,
      lang: quote.lang,
      diff: quote.diff,
      options: options,
      correct: options.indexOf(quote.author),
    };
  }

  function buildRound(db, opts) {
    const quotes = getQuotes(db, opts);
    return quotes.map((q) => makeQuestion(db, q, opts.rng));
  }

  function checkAnswer(question, index) {
    return question.correct === index;
  }

  function scoreFor(correct, total) {
    const pct = total ? correct / total : 0;
    if (pct >= 0.9) return '⭐⭐⭐';
    if (pct >= 0.7) return '⭐⭐';
    if (pct >= 0.5) return '⭐';
    return '🫠';
  }

  return {
    ROUND_SIZE: ROUND_SIZE,
    LANGS: LANGS,
    DIFFICULTIES: DIFFICULTIES,
    CATEGORIES: CATEGORIES,
    VALID: VALID,
    shuffle: shuffle,
    catName: catName,
    diffName: diffName,
    filterQuotes: filterQuotes,
    getQuotes: getQuotes,
    pickDistractors: pickDistractors,
    makeQuestion: makeQuestion,
    buildRound: buildRound,
    checkAnswer: checkAnswer,
    scoreFor: scoreFor,
  };
});
