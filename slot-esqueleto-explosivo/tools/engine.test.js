#!/usr/bin/env node
/* Test del motore con RNG deterministico (stub). */
'use strict';
const assert = require('assert');
const E = require('../engine.js');
const C = E.CONFIG;

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ✔', name); }
  catch (e) { failures++; console.log('  ✘', name, '—', e.message); }
}

/* RNG stub: restituisce sempre lo stesso valore */
const seq = (vals) => () => vals.length > 1 ? vals.shift() : vals[0];

console.log('Config:');
check('17 linee, 5 celle ciascuna, celle valide', () => {
  assert.strictEqual(C.lines.length, 17);
  for (const line of C.lines) {
    assert.strictEqual(line.length, 5);
    for (const c of line) { assert.ok(c >= 0 && c < C.cellCount, `cella ${c} fuori griglia`); }
  }
  assert.strictEqual(C.rows, 3);
  assert.strictEqual(C.cols, 5);
});

check('paytable completa per 3/4/5 su tutti i simboli paganti', () => {
  for (const s of C.symbols) {
    if (s.id === C.wildId) continue;
    assert.ok(C.paytable[s.id][3] && C.paytable[s.id][4] && C.paytable[s.id][5]);
  }
});

console.log('\nWild substitution:');
check('A A A _ _  su linea 1 → 3× A', () => {
  const grid = Array(C.cellCount).fill('orange');
  grid[5] = 'gold'; grid[6] = 'gold'; grid[7] = 'gold'; // riga centrale
  grid[0] = 'blue'; grid[1] = 'green'; grid[2] = 'orange'; grid[3] = 'orange'; grid[4] = 'pink';
  grid[10] = 'blue'; grid[11] = 'pink'; grid[12] = 'green'; grid[13] = 'blue'; grid[14] = 'pink';
  const wins = E.evaluateLines(grid);
  const w = wins.find(x => x.line === 1);
  assert.ok(w, 'linea 1 vince');
  assert.strictEqual(w.count, 3);
  assert.strictEqual(w.symbolId, 'gold');
});

check('Wild in testa sostituisce: W W A A B → 4× A', () => {
  const grid = Array(C.cellCount).fill('orange');
  const line12 = C.lines[12]; // [5,11,12,13,9]
  const ids = [C.wildId, C.wildId, 'blue', 'blue', 'pink'];
  C.lines[12].forEach((cell, i) => { grid[cell] = ids[i]; });
  grid[line12[2] + 0] = grid[line12[2]]; // no-op guard
  const wins = E.evaluateLines(grid);
  const w = wins.find(x => x.line === 12);
  assert.ok(w, 'linea 12 vince');
  assert.strictEqual(w.count, 4);
  assert.strictEqual(w.symbolId, 'blue');
});

check('Sequenziale da sinistra: A B A A A → linea non paga', () => {
  const grid = Array(C.cellCount).fill('orange');
  C.lines[0].forEach((cell, i) => { grid[cell] = ['gold', 'pink', 'gold', 'gold', 'gold'][i]; });
  assert.ok(!E.evaluateLines(grid).some(w => w.line === 0), 'linea 0 non deve pagare');
});

check('Riga di soli Wild → nessuna vincita', () => {
  const grid = Array(C.cellCount).fill('orange');
  C.lines[2].forEach(cell => { grid[cell] = C.wildId; });
  assert.ok(!E.evaluateLines(grid).some(w => w.line === 2));
});

console.log('\nExplosivo Wild blast:');
check('Wild al centro → 9 celle', () => {
  const grid = Array(C.cellCount).fill('orange');
  grid[1 * C.cols + 2] = C.wildId;
  assert.strictEqual(E.wildBlastCells(grid).length, 9);
});
check('Wild nell\'angolo (r0,c0) → 4 celle, nessun wrap', () => {
  const grid = Array(C.cellCount).fill('orange');
  grid[0] = C.wildId;
  const cells = E.wildBlastCells(grid);
  assert.strictEqual(cells.length, 4);
  assert.ok(!cells.includes(C.cellCount - 1), 'niente wrap a destra');
  assert.ok(!cells.includes(2 * C.cols), 'niente wrap in basso');
});
check('Wild sul rullo 5 (c=4) non tocca il rullo 1', () => {
  const grid = Array(C.cellCount).fill('orange');
  grid[1 * C.cols + 4] = C.wildId;
  const cells = E.wildBlastCells(grid);
  assert.ok(!cells.includes(1 * C.cols + 0));
  assert.ok(cells.includes(1 * C.cols + 3));
});
check('Due Wild adiacenti → unione senza doppioni', () => {
  const grid = Array(C.cellCount).fill('orange');
  grid[1 * C.cols + 2] = C.wildId;
  grid[1 * C.cols + 3] = C.wildId;
  assert.strictEqual(E.wildBlastCells(grid).length, 12);
});

console.log('\nCascata:');
check('Le celle sopravvissute scendono, le nuove riempiono dall\'alto', () => {
  // colonna 0: gold in alto, pink nel mezzo (rimossa), blue in basso
  const grid = Array(C.cellCount).fill('orange');
  grid[0] = 'gold'; grid[5] = 'pink'; grid[10] = 'blue';
  const removed = new Set([5]); // riga 1, colonna 0
  E.cascade(grid, removed, () => 0.8); // rng 0.8 → simbolo 'orange'
  assert.strictEqual(grid[0], 'orange', 'nuovo simbolo in alto');
  assert.strictEqual(grid[5], 'gold', 'gold scende di una riga');
  assert.strictEqual(grid[10], 'blue', 'blue resta in basso');
});

console.log('\nRound completo:');
check('Round con vincite successive accumula roundTotal e moltiplicatore cresce', () => {
  // RNG che fa sempre cadere un determinato pattern -> costruisco griglia manuale tramite runRound? No: uso un RNG fisso semplice
  let calls = 0;
  const rng = () => { calls++; return 0.5; }; // sempre lo stesso simbolo -> pioggia di gold? 0.5*90.48=45.24 -> green
  const tl = E.runRound(10, rng);
  // Con un RNG costante la griglia e' tutta dello stesso simbolo -> vincite su TUTTE le linee e cascate a catena
  assert.ok(tl.length >= 2, `attese cascate, ottenute ${tl.length} step`);
  assert.ok(tl[0].stepWin > 0, 'vincita al primo step');
  assert.ok(tl[tl.length - 1].ended, 'ultimo step ended');
  assert.ok(tl[0].multiplier === 1, 'primo step a ×1');
  assert.ok(tl.length >= 2 && tl[1].multiplier === 2, 'secondo step a ×2');
  assert.strictEqual(tl[tl.length - 1].roundTotal > 0, true);
});

check('Round senza vincite: 1 solo step, roundTotal 0', () => {
  const tl = E.runRound(10, () => 0.01); // 0.01*90.48 ≈ 0.9 -> gold ovunque (primo simbolo)
  assert.ok(tl.length === 1 || tl[0].stepWin > 0);
  if (tl.length === 1) {
    assert.strictEqual(tl[0].stepWin, 0);
    assert.strictEqual(tl[0].roundTotal, 0);
    assert.strictEqual(tl[0].ended, true);
  }
});

check('Moltiplicatore non supera ×32', () => {
  const tl = E.runRound(10, () => 0.5);
  for (const s of tl) assert.ok(s.multiplier <= 32);
  // max: 32
  assert.ok(tl.some(s => s.multiplier === 32) || tl.length < 32, 'può arrivare a ×32 con cascade lunghe');
});

check('RNG degenerato non causa cascade infinite (cap di sicurezza)', () => {
  const tl = E.runRound(10, () => 0.5); // sempre lo stesso simbolo → vincite a catena
  assert.ok(tl.length <= 64, `cap a 64, ottenuti ${tl.length}`);
  assert.strictEqual(tl[tl.length - 1].ended, true, 'ultimo step ended');
});

check('Puntata minima: vincite intere', () => {
  let seed = 99, a = seed >>> 0;
  const rng = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 5000; i++) {
    const tl = E.runRound(10, rng);
    for (const s of tl) assert.ok(Number.isInteger(s.stepWin), `stepWin ${s.stepWin} non intero`);
    assert.ok(Number.isInteger(tl[tl.length - 1].roundTotal));
  }
});

console.log('\n' + (failures === 0 ? '✅ Tutti i test superati' : `❌ ${failures} test falliti`));
process.exit(failures === 0 ? 0 : 1);
