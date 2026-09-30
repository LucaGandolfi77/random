#!/usr/bin/env node
/**
 * contrast.mjs — contrasto WCAG AA sui colori che il gioco usa davvero.
 *
 * Non controlla il CSS generico: controlla le coppie che compaiono sullo
 * schermo in un momento preciso. Il testo del Quaderno su una scheda in primo
 * piano è il posto dove un malinconico scuro diventa illeggibile, e lì nessuno
 * se ne accorge se non gli si mette un numero davanti.
 *
 * Le coppie marcate `decorativo: true` non hanno bisogno di 4.5:1: sono bordi,
 * pip spenti, o testo che il gioco vuole deliberatamente spento (una scheda
 * bruciata deve sembrare una scheda bruciata). Quelle che contano restano a
 * 3:1 come minimo, il livello AA dei componenti grafici.
 *
 *   node tools/contrast.mjs --check   esce con codice 1 se qualcosa è fuori AA
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const COPPIE = [
  /* ── lettura lunga: il Quaderno e le scene ── */
  { nome: 'testo su fondo', fg: '#cfc4b4', bg: '#12100e' },
  { nome: 'testo in primo piano su fondo', fg: '#f0e6d6', bg: '#12100e' },
  { nome: 'tenue su fondo', fg: '#8d8275', bg: '#12100e' },
  { nome: 'tenue su carta di stacco', fg: '#8d8275', bg: '#1c1815' },
  { nome: 'oro su fondo', fg: '#c9a76a', bg: '#12100e' },
  { nome: 'oro su carta di stacco', fg: '#c9a76a', bg: '#1c1815' },
  { nome: 'oro chiaro su fondo', fg: '#e0c18a', bg: '#12100e', grande: true },

  /* ── le quattro voci dei testi ── */
  { nome: 'voce A (oro) su scena', fg: '#c9a76a', bg: '#0e0c0a', grande: true },
  { nome: 'voce B (verde) su scena', fg: '#7f967a', bg: '#0e0c0a' },
  { nome: 'voce C (rosso) su scena', fg: '#d9795f', bg: '#0e0c0a' },
  { nome: 'voce D (oro alto) su scena', fg: '#e0c18a', bg: '#0e0c0a', grande: true },

  /* ── pulsanti ── */
  { nome: 'bottone pieno', fg: '#1a1512', bg: '#c9a76a' },
  { nome: 'bottone fantasma', fg: '#cfc4b4', bg: '#12100e' },
  { nome: 'bottone disabilitato', fg: '#8b8073', bg: '#2c2621', decorativo: true },
  { nome: 'bordo di un fantasma', fg: '#74614c', bg: '#12100e', decorativo: true },

  /* ── HUD di combattimento ── */
  { nome: 'HUD: inchiostro', fg: '#c9a76a', bg: '#191510' },
  { nome: 'HUD: resto', fg: '#cfc4b4', bg: '#191510' },
  { nome: 'HUD: pip carico', fg: '#c25a44', bg: '#191510', decorativo: true },
  { nome: 'HUD: pip spento', fg: '#736858', bg: '#191510', decorativo: true },

  /* ── Quaderno ── */
  { nome: 'scheda del Quaderno', fg: '#a99c8a', bg: '#1c1815' },
  { nome: 'titolo di scheda', fg: '#f0e6d6', bg: '#1c1815', grande: true },
  { nome: 'scheda bruciata', fg: '#83796b', bg: '#1c1815', decorativo: true },
  { nome: 'cenere (bordo scottato)', fg: '#857a6d', bg: '#12100e', decorativo: true },

  /* ── scelte e overlay ── */
  { nome: 'scelta che costa un ricordo', fg: '#d7b2a6', bg: '#1e1915' },
  { nome: 'nota di una scelta', fg: '#8d8275', bg: '#1e1915' },
  { nome: 'overlay su fondo', fg: '#cfc4b4', bg: '#1a1613' },
  { nome: 'scheda scelta da bruciare', fg: '#f0e6d6', bg: '#211c18', grande: true },

  /* ── finale ── */
  { nome: 'epitaffio', fg: '#e0c18a', bg: '#17140f', grande: true },
  { nome: 'testo del finale', fg: '#f0e6d6', bg: '#12100e' },

  /* ── menù e tela ── */
  { nome: 'tasto del menù', fg: '#cfc4b4', bg: '#1c1917' },
  { nome: 'costo del menù', fg: '#8d8275', bg: '#1c1917' },
  { nome: 'tasto bloccato', fg: '#7a6e5f', bg: '#1c1917', decorativo: true },
  { nome: 'istruzione sulla tela', fg: '#d9cdb6', bg: '#0e0c0a', grande: true },
  { nome: 'errore sulla tela', fg: '#e2684f', bg: '#0e0c0a' },
  { nome: 'avviso di pericolo', fg: '#d9795f', bg: '#0e0c0a' },

  /* ── copertina ── */
  { nome: 'sommario', fg: '#cfc4b4', bg: '#12100e' },
  { nome: 'crediti', fg: '#857a6d', bg: '#1c1917', decorativo: true },
];

const lin = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const contrasto = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/* Se un colore qui non compare in css/style.css, il controllo sta guardando
 * il passato: o il CSS è cambiato e la tabella no, o il colore è morto. */
function coloriNelCss() {
  const css = readFileSync(join(ROOT, 'css/style.css'), 'utf8');
  return new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()));
}

const check = process.argv.includes('--check');
const nelCss = coloriNelCss();
const problemi = [];
const avvisi = [];

for (const c of COPPIE) {
  const richiesto = c.grande ? 3 : 4.5;
  const minimo = c.decorativo ? 3 : richiesto;
  const k = contrasto(c.fg, c.bg);
  if (k < minimo) problemi.push(`${c.nome}: ${k.toFixed(2)}:1 (servono ${minimo})`);
  else if (k < richiesto) avvisi.push(`${c.nome}: ${k.toFixed(2)}:1 (testo vuole ${richiesto}, è decorativo)`);
  for (const colore of [c.fg, c.bg]) {
    if (!nelCss.has(colore)) avvisi.push(`${c.nome}: ${colore} non compare in css/style.css`);
  }
}

const ok = !problemi.length;
console.log(`${ok ? '\x1b[32m' : '\x1b[31m'}contrasto${ok ? ' ok' : ''}: ${COPPIE.length} coppie${C_DIM(avvisi.length)}`);
if (avvisi.length) {
  console.log('\x1b[33maccettabili (decorativi, o sotto il minimo del testo):\x1b[0m');
  for (const a of avvisi) console.log('  · ' + a);
}
if (problemi.length) {
  console.log('\x1b[31mfuori AA:\x1b[0m');
  for (const p of problemi) console.log('  · ' + p);
  if (check) process.exit(1);
}

function C_DIM(n) {
  return n ? ` \x1b[2m(${n} avvisi)\x1b[0m` : '';
}