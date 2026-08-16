#!/usr/bin/env node
/* Test del motore SHOTMIND con input deterministici. */
'use strict';
const assert = require('assert');
const G = require('../game.js');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ✔', name); }
  catch (e) { failures++; console.log('  ✘', name, '—', e.message); }
}

console.log('Pacchetti:');
check('4 pacchetti con almeno 25 parole 4-8 lettere', () => {
  const keys = Object.keys(G.PACKS);
  assert.strictEqual(keys.length, 4);
  for (const k of keys) {
    assert.ok(G.PACKS[k].words.length >= 25, k + ' troppo corto');
    for (const w of G.PACKS[k].words) {
      const n = G.normalize(w);
      assert.ok(n.length >= 4 && n.length <= 8, k + ': ' + w + ' lunghezza ' + n.length);
      assert.ok(/^[a-z]+$/.test(n), k + ': ' + w + ' non valida');
    }
  }
});

console.log('Feedback Mastermind:');
check('parola esatta = tutte verdi', () => {
  assert.deepStrictEqual(G.evalGuess('vino', 'vino'), ['G', 'G', 'G', 'G']);
});
check('lettere fuori posto = gialle', () => {
  assert.deepStrictEqual(G.evalGuess('vino', 'novi'), ['Y', 'Y', 'Y', 'Y']);
});
check('lettere assenti = nere', () => {
  assert.deepStrictEqual(G.evalGuess('vino', 'casa'), ['B', 'B', 'B', 'B']);
});
check('duplicati: casa vs asso = [Y,B,G,B]', () => {
  assert.deepStrictEqual(G.evalGuess('casa', 'asso'), ['Y', 'B', 'G', 'B']);
});
check('duplicati: gatto vs tasto = [Y,G,B,G,G]', () => {
  assert.deepStrictEqual(G.evalGuess('gatto', 'tasto'), ['Y', 'G', 'B', 'G', 'G']);
});
check('normalizza accenti e maiuscole', () => {
  assert.strictEqual(G.normalize('Era Brutta'), 'erabrutta');
});
check('errore su lunghezze diverse', () => {
  assert.throws(() => G.evalGuess('vino', 'vinoo'));
});

console.log('Regola della bevuta:');
check('4 nere su parola 4 lettere = 4 sorsi al guesser', () => {
  const d = G.drinkRule('vino', 'casa');
  assert.strictEqual(d.guesserSips, 4);
  assert.strictEqual(d.makerSips, 0);
});
check('4 gialle = 4 sorsi al cantiniere (mult 1 a 4 lettere)', () => {
  const d = G.drinkRule('vino', 'novi');
  assert.strictEqual(d.makerSips, 4);
  assert.strictEqual(d.guesserSips, 0);
});
check('multiplier 2 su parole da 6 lettere', () => {
  const d = G.drinkRule('spritz', 'ciabatta'.slice(0, 6));
  assert.strictEqual(d.mult, 2);
});
check('multiplier 3 su parole da 8 lettere', () => {
  assert.strictEqual(G.multiplier('finestra'), 3);
});

console.log('Random:');
check('randomWord restituisce parole del pacchetto (rng stub)', () => {
  const seq = [0, 0.5, 0.9999];
  const rng = () => seq.length ? seq.shift() : 0;
  for (let i = 0; i < 3; i++) {
    const w = G.randomWord('bar', rng);
    assert.ok(G.PACKS.bar.words.indexOf(w) >= 0, w + ' non in bar');
  }
});

console.log('Config:');
check('max 6 tentativi, shot = 3 sorsi', () => {
  assert.strictEqual(G.MAX_ATTEMPTS, 6);
  assert.strictEqual(G.SIPS_PER_SHOT, 3);
});

console.log('');
if (failures === 0) console.log('Tutti i test superati ✔');
else { console.log(failures + ' test falliti ✘'); process.exit(1); }
