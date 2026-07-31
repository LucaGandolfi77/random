/* ===================================================
   💀 Esqueleto Explosivo Clone — Test simboli SVG
   Verifica che ogni simbolo produca un SVG valido con
   le decorazioni previste.
   =================================================== */
'use strict';

const path = require('path');
const { SKULLS } = require(path.join(__dirname, '..', 'symbols.js'));

let pass = 0;
let fail = 0;

function check(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ✘ ${name} — ${e.message}`);
  }
}

console.log('Simboli SVG:');
check('tutti i 6 simboli presenti', () => {
  const ids = Object.keys(SKULLS);
  for (const id of ['gold', 'pink', 'green', 'blue', 'orange', 'wild']) {
    if (!ids.includes(id)) throw new Error(`manca ${id}`);
  }
});

check('ogni simbolo è un <svg> ben formato', () => {
  for (const [id, s] of Object.entries(SKULLS)) {
    if (!s.startsWith('<svg') || !s.endsWith('</svg>')) throw new Error(`${id} non è un svg`);
    if (s.includes('undefined') || s.includes('NaN')) throw new Error(`${id} contiene valori non validi`);
  }
});

check('ogni simbolo contiene il cranio', () => {
  for (const [id, s] of Object.entries(SKULLS)) {
    if (!s.includes('M50 14')) throw new Error(`${id} manca il percorso del cranio`);
  }
});

check('decorazioni visibili sopra la testa', () => {
  const headIdx = s => s.indexOf('M50 14');
  const gold = SKULLS.gold;
  const headPos = headIdx(gold);
  const heartPos = gold.indexOf('3ec96a');
  if (heartPos < 0 || heartPos < headPos) throw new Error('cuore verde nascosto dietro la testa');
});

check('S1: fiore arancione laterale', () => {
  if (!SKULLS.gold.includes('#ff9a3d')) throw new Error('manca fiore arancione');
});

check('S2: corona + giallo base', () => {
  if (!SKULLS.pink.includes('f6c63f')) throw new Error('manca corona');
  if (!SKULLS.pink.includes('#fdf3c9')) throw new Error('base non giallo chiaro');
});

check('S3: baffi neri coprono la bocca', () => {
  if (!SKULLS.green.includes('#191920')) throw new Error('mancano baffi neri');
  if (SKULLS.green.includes('mouth(')) throw new Error('S3 non deve avere la bocca a denti');
});

check('S4: stella rosa + baffi rosa', () => {
  if (!SKULLS.blue.includes('#ff9ecb')) throw new Error('manca stella rosa');
  if (!SKULLS.blue.includes('#ff6fb0')) throw new Error('mancano baffi rosa');
});

check('S5: cappello + giacca', () => {
  if (!SKULLS.orange.includes('9c5a2f')) throw new Error('manca cappello');
  if (!SKULLS.orange.includes('#155e63')) throw new Error('manca giacca');
});

check('occhi: orbite nere + punto luce in ogni teschio', () => {
  for (const id of ['gold', 'pink', 'green', 'blue', 'orange']) {
    if (!SKULLS[id].includes('#14131c')) throw new Error(`${id} mancano orbite scure`);
    if (!SKULLS[id].includes('#fff')) throw new Error(`${id} manca il punto luce`);
  }
});

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok, ${fail} falliti`);
process.exit(fail === 0 ? 0 : 1);
