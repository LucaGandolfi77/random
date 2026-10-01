#!/usr/bin/env node
/**
 * contrast.mjs — contrasto WCAG AA sui colori che il gioco usa davvero.
 *
 * Non controlla il CSS generico: controlla le coppie che compaiono sullo
 * schermo in un momento preciso. Il testo di una scheda del Mazzetto in primo
 * piano è il posto dove un verde muschio scuro diventa illeggibile, e lì
 * nessuno se ne accorge se non gli si mette un numero davanti.
 *
 * Le coppie marcate `decorativo: true` non hanno bisogno di 4.5:1: sono bordi,
 * pip spenti, o testo che il gioco vuole deliberatamente spento (una scheda data
 * al terreno deve sembrare data al terreno). Quelle che contano restano a
 * 3:1 come minimo, il livello AA dei componenti grafici.
 *
 *   node tools/contrast.mjs --check   esce con codice 1 se qualcosa è fuori AA
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* La tabella segue le schermate, non il CSS: lunga lettura (Mazzetto, scene),
   HUD, scelte, Cast, finale. Ogni colore qui dentro deve comparire in
 * css/style.css, o il controllo sta guardando il passato. */
const COPPIE = [
  /* ── lettura lunga: il Mazzetto e le scene ── */
  { nome: 'testo su fondo', fg: '#d3cdb8', bg: '#0f120c' },
  { nome: 'testo in primo piano su fondo', fg: '#f0ecd8', bg: '#0f120c' },
  { nome: 'tenue su fondo', fg: '#8a8768', bg: '#0f120c' },
  { nome: 'tenue su carta di stacco', fg: '#8a8768', bg: '#171a10' },
  { nome: 'ocra su fondo', fg: '#c9a76a', bg: '#0f120c' },
  { nome: 'ocra su carta di stacco', fg: '#c9a76a', bg: '#171a10' },
  { nome: 'ocra chiaro su fondo', fg: '#e0c18a', bg: '#0f120c', grande: true },

  /* ── le quattro voci dei testi ── */
  { nome: 'voce A (ocra) su scena', fg: '#c9a76a', bg: '#0b0d07', grande: true },
  { nome: 'voce B (muschio) su scena', fg: '#7f8a63', bg: '#0b0d07' },
  { nome: 'voce C (rosso) su scena', fg: '#d9795f', bg: '#0b0d07' },
  { nome: 'voce D (ocra alto) su scena', fg: '#e0c18a', bg: '#0b0d07', grande: true },

  /* ── pulsanti ── */
  { nome: 'bottone pieno', fg: '#272b1a', bg: '#c9a76a' },
  { nome: 'bottone fantasma', fg: '#d3cdb8', bg: '#0f120c' },
  { nome: 'bottone disabilitato', fg: '#8a8266', bg: '#262a19', decorativo: true },
  { nome: 'bordo di un fantasma', fg: '#5f6b4a', bg: '#0f120c', decorativo: true },

  /* ── HUD dell'orto: i due contatori ── */
  { nome: 'HUD: lui deve', fg: '#d3cdb8', bg: '#16190e' },
  { nome: 'HUD: semi', fg: '#c9a76a', bg: '#16190e' },
  { nome: 'HUD: hai dato (barra)', fg: '#d9795f', bg: '#16190e', decorativo: true },
  { nome: 'HUD: pip carico', fg: '#b8433a', bg: '#16190e', decorativo: true },
  { nome: 'HUD: pip spento', fg: '#6b7050', bg: '#16190e', decorativo: true },
  { nome: 'HUD: etichetta dell\'arco', fg: '#d9795f', bg: '#16190e', grande: true },

  /* ── Mazzetto ── */
  { nome: 'scheda del Mazzetto', fg: '#a6a184', bg: '#1a1e12' },
  { nome: 'titolo di scheda', fg: '#f0ecd8', bg: '#1a1e12', grande: true },
  { nome: 'scheda data al terreno', fg: '#847c60', bg: '#1a1e12', decorativo: true },
  { nome: 'petalo secco', fg: '#877f62', bg: '#0f120c', decorativo: true },

  /* ── scelte e overlay ── */
  { nome: 'scelta che costa un ricordo', fg: '#d3b1a0', bg: '#1b1f13' },
  { nome: 'nota di una scelta', fg: '#8a8768', bg: '#1b1f13' },
  { nome: 'overlay su fondo', fg: '#d3cdb8', bg: '#171a10' },
  { nome: 'scheda scelta da dare', fg: '#f0ecd8', bg: '#1e2216', grande: true },

  /* ── Il Cast ── */
  { nome: 'CAST: ruolo', fg: '#8a8768', bg: '#1a1e12' },
  { nome: 'CAST: frase dell\'arco', fg: '#d3cdb8', bg: '#1a1e12' },
  { nome: 'CAST: tacca accesa', fg: '#c9a76a', bg: '#1a1e12', decorativo: true },
  { nome: 'CAST: tacca spenta', fg: '#6b7050', bg: '#1a1e12', decorativo: true },
  { nome: 'CAST: stato 2, il rosso', fg: '#d9795f', bg: '#1a1e12' },
  { nome: 'CAST: una persona fiorita', fg: '#7f8a63', bg: '#0f120c', decorativo: true },

  /* ── finale ── */
  { nome: 'epitaffio', fg: '#e0c18a', bg: '#151809', grande: true },
  { nome: 'testo del finale', fg: '#f0ecd8', bg: '#0f120c' },
  { nome: 'titolo della puntata', fg: '#c9a76a', bg: '#0f120c' },
  { nome: 'coda: nome', fg: '#f0ecd8', bg: '#151809', grande: true },
  { nome: 'coda: destino', fg: '#8a8768', bg: '#151809' },

  /* ── menu e orto ── */
  { nome: 'tasto del menu', fg: '#d3cdb8', bg: '#171a10' },
  { nome: 'costo del menu', fg: '#8a8768', bg: '#171a10' },
  { nome: 'tasto bloccato', fg: '#7a7457', bg: '#171a10', decorativo: true },
  { nome: 'istruzione sull\'orto', fg: '#d6cfb2', bg: '#0b0d07', grande: true },
  { nome: 'errore sull\'orto', fg: '#d96b4e', bg: '#0b0d07' },
  { nome: 'avviso di pericolo', fg: '#d9795f', bg: '#0b0d07' },

  /* ── copertina ── */
  { nome: 'sommario', fg: '#d3cdb8', bg: '#0f120c' },
  { nome: 'crediti', fg: '#877f62', bg: '#171a10', decorativo: true },
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
