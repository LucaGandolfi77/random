/* calcolo dei token --muted che raggiungono 4.5:1 su --card, per ogni tema.
   Uso: node tools/contrast.mjs            (stampa i valori consigliati)
        node tools/contrast.mjs --check    (fail se il CSS non è conforme) */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const isMain = process.argv[1] && process.argv[1].endsWith('contrast.mjs');

const lum = (h) => {
  const c = h.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
export const contrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};
const toHex = (rgb) => '#' + rgb.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));

function solve(muted, ink, card, target) {
  const a = parse(muted), b = parse(ink);
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const h = toHex(a.map((v, j) => v + (b[j] - v) * t));
    if (contrast(h, card) >= target) return { hex: h, ratio: contrast(h, card) };
  }
  return null;
}
/* scurisce `from` finché il bianco non legge ≥ target: serve per i fondi
   pulsante, dove --matcha (chiaro, usato solo come accento grafico) non basta. */
function solveOnWhite(from, target) {
  const a = parse(from);
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const h = toHex(a.map((v) => v * (1 - t)));
    if (contrast('#ffffff', h) >= target) return { hex: h, ratio: contrast('#ffffff', h) };
  }
  return null;
}

/* card / ink / muted per tema: {universo: {day, night}} */
const THEMES = {
  pioggia: { day: { card: '#fffdf7', ink: '#2e2a24', muted: '#7f7464', matcha: '#7a9e7e', matchaD: '#4a6b4f' },
             night: { card: '#262d25', ink: '#f0ead8', muted: '#a89d85', matcha: '#7a9e7e', matchaD: '#4a6b4f' } },
  sakura:  { day: { card: '#fff8f0', ink: '#3a2a24', muted: '#8b6c62', matcha: '#d98aa5', matchaD: '#af5c7a' },
             night: { card: '#322227', ink: '#f5e6dd', muted: '#b09488', matcha: '#d98aa5', matchaD: '#af5c7a' } },
  yokai:   { day: { card: '#2e2b58', ink: '#efe8ff', muted: '#a79fd1', matcha: '#9a8bd8', matchaD: '#6a5bb5' },
             night: { card: '#201d3a', ink: '#efe8ff', muted: '#8f86c2', matcha: '#9a8bd8', matchaD: '#6a5bb5' } },
  estate:  { day: { card: '#f7fcfa', ink: '#23403c', muted: '#5a7a75', matcha: '#3fa08a', matchaD: '#2a7a67' },
             night: { card: '#173936', ink: '#e8f4ef', muted: '#7fa89f', matcha: '#3fa08a', matchaD: '#2a7a67' } },
};
const ALL = Object.entries(THEMES).flatMap(([u, m]) => ['day', 'night'].map((k) => [u, k, m[k]]));

if (isMain && process.argv.includes('--check')) {
  const css = readFileSync(join(ROOT, 'css/style.css'), 'utf8');
  const used = new Set([...css.matchAll(/--(?:muted|matcha-d|matcha-dd):\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()));
  let fail = 0;
  const line = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? '\u2713' : '\u2717'} ${msg}`); };
  for (const [u, k, t] of ALL) {
    const label = `${(u + '/' + k).padEnd(15)}`;
    if (used.has(t.muted)) line(contrast(t.muted, t.card) >= 4.5,
      `${label} --muted ${t.muted} su ${t.card} = ${contrast(t.muted, t.card).toFixed(2)}:1 (testo 13px, serve 4.5)`);
    line(contrast(t.ink, t.card) >= 7,
      `${label} --ink   ${t.ink} su ${t.card} = ${contrast(t.ink, t.card).toFixed(2)}:1 (testo corrente, serve 7)`);
    line(contrast('#ffffff', t.matchaD) >= 4.5,
      `${label} bianco su --matcha-d ${t.matchaD} = ${contrast('#ffffff', t.matchaD).toFixed(2)}:1 (bottone primario, serve 4.5)`);
  }
  console.log(fail ? `\n${fail} problemi di contrasto` : '\nTutti i contrasti sono conformi WCAG AA.');
  process.exitCode = fail ? 1 : 0;
} else if (isMain) {
  console.log('Correzioni da applicare (target 4.5:1):\n');
  for (const [u, k, t] of ALL) {
    const m = solve(t.muted, t.ink, t.card, 4.5);
    const d = solveOnWhite(t.matchaD, 4.5);
    console.log(`  ${(u + '/' + k).padEnd(15)} --muted    ${t.muted} (${contrast(t.muted, t.card).toFixed(2)})  ->  ${m.hex} (${m.ratio.toFixed(2)})`);
    console.log(`  ${''.padEnd(15)} --matcha-d ${t.matchaD} (bianco ${contrast('#ffffff', t.matchaD).toFixed(2)})  ->  ${d.hex} (bianco ${d.ratio.toFixed(2)})`);
  }
  console.log('\n--matcha-dd per il bottone primario (bianco >= 6:1, con margine):');
  const seen = new Set();
  for (const [u, , t] of ALL) {
    if (seen.has(t.matchaD)) continue;
    seen.add(t.matchaD);
    const d = solveOnWhite(t.matchaD, 6);
    console.log(`  ${u.padEnd(9)} --matcha-d ${t.matchaD} -> --matcha-dd ${d.hex} (bianco ${d.ratio.toFixed(2)}:1)`);
  }
}
