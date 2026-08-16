/* ===================================================
   🍸 SHOTMIND — Il Mastermind Alcolico
   Motore puro: parole, feedback Mastermind (G/Y/B) e
   regole della bevuta. Nessun DOM: testabile in Node.
   Esposto come window.ShotmindGame (browser) e
   module.exports (Node).
   =================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShotmindGame = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_ATTEMPTS = 6;
  const SIPS_PER_SHOT = 3;

  /* Moltiplicatore bevuta in base alla lunghezza della parola:
     più lunga = più letale. */
  const LENGTH_MULT = { 4: 1, 5: 1, 6: 2, 7: 2, 8: 3 };
  function multiplier(len) { return LENGTH_MULT[len] || 3; }

  /* ------------- Pacchetti di parole (tutte minuscole, senza accenti) ------------- */
  const PACKS = {
    bar: {
      name: 'Bar & Notte',
      emoji: '🍸',
      hint: 'Drink, distillati e cose da bancone.',
      words: [
        'negroni', 'spritz', 'mojito', 'tequila', 'aperol', 'birra',
        'vino', 'amaro', 'prosecco', 'vodka', 'whisky', 'sangria',
        'martini', 'grog', 'punch', 'sidro', 'cognac', 'amarena',
        'rumore', 'nastro', 'granita', 'zibibbo', 'brandy', 'tango',
        'swing', 'notte', 'balera', 'estate', 'veleno', 'barman',
      ],
    },
    sobri: {
      name: 'Parole da Sobri',
      emoji: '☕',
      hint: 'Roba innocua. Per partire piano.',
      words: [
        'casa', 'pane', 'mare', 'luna', 'sole', 'notte',
        'gatto', 'cane', 'libro', 'amore', 'tempo', 'strada',
        'finestra', 'mattina', 'serata', 'musica', 'pizza', 'sedia',
        'tavolo', 'letto', 'cuore', 'cielo', 'verde', 'viaggio',
        'sport', 'pioggia', 'neve', 'vento', 'fuoco', 'terra',
      ],
    },
    campioni: {
      name: 'Da Campioni',
      emoji: '🧠',
      hint: 'Parole toste. La bevuta si moltiplica.',
      words: [
        'abisso', 'enigma', 'azzardo', 'smeraldo', 'quintale', 'trapezio',
        'zanzara', 'insonnia', 'nebulosa', 'ossequio', 'glabro', 'zigzag',
        'beffardo', 'cazzotto', 'dorato', 'ebano', 'falco', 'sibilo',
        'crampo', 'dirupo', 'lumaca', 'mantice', 'zaffiro', 'zattera',
        'sobbalzo', 'usignolo', 'trottola', 'ombelico', 'pedaggio', 'quercia',
        'fosforo', 'gestante', 'nocciolo',
      ],
    },
    maledetto: {
      name: 'Vietato ai Sobri',
      emoji: '🔥',
      hint: 'Volgare e letale. Solo +18. Lo sai come funziona.',
      words: [
        'merda', 'cazzo', 'figa', 'troia', 'pirla', 'fava',
        'stronzo', 'cazzata', 'minchia', 'gnocca', 'pisello', 'zoccola',
        'coglione', 'puttana', 'bastardo', 'manico', 'culo', 'scopata',
        'sborra', 'culona', 'leccata', 'scandalo', 'scapolo', 'lussuria',
        'eccitato', 'vizio', 'peccato', 'geloso', 'sfrenato', 'amore',
      ],
    },
  };

  /* ------------- Logica Mastermind ------------- */
  function normalize(w) {
    return String(w || '').trim().toLowerCase().replace(/[àáèéìíòóùú]/g, function (c) {
      return { à: 'a', á: 'a', è: 'e', é: 'e', ì: 'i', í: 'i', ò: 'o', ó: 'o', ù: 'u', ú: 'u' }[c];
    }).replace(/[^a-z]/g, '');
  }

  /* Feedback per lettera: 'G' giusta al posto giusto,
     'Y' giusta al posto sbagliato, 'B' assente.
     Gestisce le lettere duplicate correttamente. */
  function evalGuess(secret, guess) {
    secret = normalize(secret);
    guess = normalize(guess);
    if (secret.length !== guess.length || secret.length < 4) {
      throw new Error('Parole di lunghezza diversa o troppo corte');
    }
    const pool = secret.split('');
    const fb = new Array(guess.length).fill('B');
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === pool[i]) { fb[i] = 'G'; pool[i] = null; }
    }
    for (let i = 0; i < guess.length; i++) {
      if (fb[i] === 'B') {
        const idx = pool.indexOf(guess[i]);
        if (idx >= 0) { fb[i] = 'Y'; pool[idx] = null; }
      }
    }
    return fb;
  }

  /* Regola della bevuta:
     - chi indovina (guesser) beve 1 sorso × molteplicità per ogni lettera ASSENTE (B)
     - il Cantiniere beve 1 sorso × molteplicità per ogni lettera GIUSTA ma storta (Y)
     - le verdi (G) sono merito puro, non si beve */
  function drinkRule(secret, guess) {
    const fb = evalGuess(secret, guess);
    const blacks = fb.filter(function (f) { return f === 'B'; }).length;
    const yellows = fb.filter(function (f) { return f === 'Y'; }).length;
    const mult = multiplier(normalize(secret).length);
    return {
      feedback: fb,
      mult: mult,
      guesserSips: blacks * mult,
      makerSips: yellows * mult,
      blacks: blacks,
      yellows: yellows,
    };
  }

  function randomWord(pack, rng) {
    const words = (PACKS[pack] || PACKS.bar).words;
    const rand = typeof rng === 'function' ? rng() : Math.random();
    return words[Math.floor(rand * words.length)];
  }

  function validWord(word) {
    const n = normalize(word);
    return n.length >= 4 && n.length <= 8;
  }

  return {
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    SIPS_PER_SHOT: SIPS_PER_SHOT,
    PACKS: PACKS,
    LENGTH_MULT: LENGTH_MULT,
    normalize: normalize,
    evalGuess: evalGuess,
    drinkRule: drinkRule,
    randomWord: randomWord,
    validWord: validWord,
    multiplier: multiplier,
  };
});
