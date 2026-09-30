#!/usr/bin/env node
/**
 * gen-icons.mjs — icone e screenshot PWA, PNG veri.
 *
 * Encoder PNG minimale in puro Node (zlib + CRC32), nessuna dipendenza, e un
 * rasterizzatore a SDF con supersampling 3x3. Le icone non sono un asset: sono
 * una descrizione di forma dentro a questo file, quindi si correggono senza
 * toccare un binario.
 *
 * L'icona è la tesi del gioco in un quadrato: un ritratto a carboncino senza
 * volto, e metà del ritratto già coperto dall'inchiostro che lo cancella.
 *
 * Uso:  node tools/gen-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(OUT, { recursive: true });

/* ── PNG encoder ─────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    sig, chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── colore ──────────────────────────────────────────────── */
const hexa = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* Frammento deterministico: la stessa icona a ogni `npm run icons`, o il
 * diff è rumore. */
const rumore = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const ell = (cx, cy, rx, ry) => (u, v) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
const rett = (x, y, w, h) => (u, v) => u >= x && u <= x + w && v >= y && v <= y + h;
const rot = (cx, cy, a) => (u, v) => {
  const dx = u - cx; const dy = v - cy;
  return [dx * Math.cos(-a) - dy * Math.sin(-a), dx * Math.sin(-a) + dy * Math.cos(-a)];
};

const NERO = hexa('#12100e');
const CARTA = hexa('#e2d8c3');
const CARTA_SCURA = hexa('#c8bda6');
const CARBONCINO = hexa('#6b6252');
const OCRA = hexa('#c9a76a');
const OCRA_ALTA = hexa('#e0c18a');
const OSSO = hexa('#cfc4b4');
const GRIGIO = hexa('#8d8275');
const TERRA = hexa('#2a2320');
const ROSSO = hexa('#9c3b2e');

/* ── il ritratto ─────────────────────────────────────────── */
/* Un busto: testa e spalle. Il volto non ha occhi né bocca — è la parte che il
 * maestro non ha fatto, ed è anche la parte che l'inchiostro sta coprendo. */
const BUSTO = { testa: [0.615, 0.375, 0.155], spalle: [0.615, 1.02, 0.46, 0.40] };
const busto = (u, v) => {
  const [hx, hy, hr] = BUSTO.testa;
  const testa = ((u - hx) / hr) ** 2 + ((v - hy) / (hr * 1.18)) ** 2 <= 1;
  const collo = u > hx - 0.075 && u < hx + 0.075 && v > hy && v < hy + 0.24;
  const spalle = ((u - BUSTO.spalle[0]) / BUSTO.spalle[2]) ** 2 + ((v - BUSTO.spalle[1]) / BUSTO.spalle[3]) ** 2 <= 1;
  return testa || collo || spalle;
};

/**
 * L'inchiostro che copre: entra da sinistra e si ferma a metà, con il bordo
 * irregolare e la parte più scura appena dentro — come l'inchiostro che
 * si assedia prima di asciugare. Copre il lato sinistro del viso, che è
 * esattamente la promessa del gioco: non lo guardi.
 */
function coperto(u, v, soglia = 0.545) {
  if (v < 0.03 || v > 0.97) return 0;
  /* Il bordo ondeggia su due scale: una larga (la mano che va su e giù) e
   * una stretta (le setole). Nessuna frequenza alta, altrimenti il bordo
   * diventa sabbia e non inchiostro. */
  const bordo = soglia
    + (rumore(u * 5.0, v * 1.7) - 0.5) * 0.10
    + (rumore(u * 13, v * 5) - 0.5) * 0.030;
  if (u < 0.015 || u > bordo) return 0;
  /* la zona bagnata è larga: se è stretta si vede il retino del campionamento */
  const dalBordo = bordo - u;
  if (dalBordo > 0.10) return 1;
  return 0.42 + 0.58 * (1 - dalBordo / 0.10);
}

/* ── tela ────────────────────────────────────────────────── */
function render(w, h, scala, disegno) {
  const buf = Buffer.alloc(w * h * 4);
  const SS = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / w - 0.5) / scala + 0.5;
          const v = ((y + (sy + 0.5) / SS) / h - 0.5) / scala + 0.5;
          if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) continue;
          const c = disegno(u, v);
          ar += c[0]; ag += c[1]; ab += c[2]; aa += c[3];
        }
      }
      const k = (y * w + x) * 4;
      if (aa <= 0) { buf[k] = NERO[0]; buf[k + 1] = NERO[1]; buf[k + 2] = NERO[2]; buf[k + 3] = 255; }
      else { buf[k] = Math.round(ar / aa); buf[k + 1] = Math.round(ag / aa); buf[k + 2] = Math.round(ab / aa); buf[k + 3] = 255; }
    }
  }
  return buf;
}

/* ── l'icona ─────────────────────────────────────────────── */
const T = { x: 0.145, y: 0.175, w: 0.710, h: 0.615 };
const dentroTela = (u, v) => u >= T.x && u <= T.x + T.w && v >= T.y && v <= T.y + T.h;
/* coordinate della tela riportate a 0..1: tutto il resto del disegno ragiona su
 * queste, così proporzioni e tagli restano coerenti fra icone e screenshot */
const L = (u, v) => [(u - T.x) / T.w, (v - T.y) / T.h];

function icona(u, v) {
  let c = mix(hexa('#1d1a17'), hexa('#0d0b0a'), Math.min(1, Math.max(0, v)));
  if (rett(T.x - 0.020, T.y + 0.030, T.w, T.h)(u, v)) c = mix(c, hexa('#070605'), 0.85);
  if (!dentroTela(u, v)) return [...c, 1];

  const [a, b] = L(u, v);
  c = mix(CARTA, CARTA_SCURA, b * 0.5);
  c = mix(c, CARBONCINO, (rumore(a * 26, b * 26) - 0.74) * 0.28);

  /* il ritratto: spalle larghe, testa, collo. Nessun volto. */
  if (busto(a, b)) c = mix(c, CARBONCINO, 0.40);
  if (busto(a, b) && a < BUSTO.testa[0] - 0.03) c = mix(c, CARTA, 0.14);  // luce da sinistra

  /* l'inchiostro che copre */
  const cop = coperto(a, b);
  if (cop > 0) c = mix(c, OCRA, 0.88 * cop);
  if (cop > 0.5) c = mix(c, hexa('#7d5c30'), (cop - 0.5) * 0.42);

  /* il bordo bagnato: una linea più scura appena dentro l'inchiostro */
  const b2 = coperto(a, b) - coperto(a + 0.028, b);
  if (b2 > 0.10 && coperto(a, b) > 0.05) c = mix(c, hexa('#4a3417'), Math.min(0.55, b2 * 3));

  /* il riflesso del pennello: una banda larga e tenue, non un filo */
  const rif = Math.abs(b - 0.30 - Math.sin(a * 3.1) * 0.10);
  if (rif < 0.13 && coperto(a, b) > 0.4) c = mix(c, OCRA_ALTA, (1 - rif / 0.13) * 0.13);

  return [...c, 1];
}

/* ── gli screenshot ──────────────────────────────────────── */
/* Non sono una foto del gioco: sono il suo scheletro, disegnato con le stesse
 * primitive dell'icona, così l'installazione mostra già che qui si dipinge. */
/* Rettangolo di tela e relativizzazione: ogni schermata ha la sua, altrimenti
 * il ritratto esce dalla tela e l'immagine mente su come si gioca. */
function teleria(x, y, w, h) {
  return (u, v) => (u >= x && u <= x + w && v >= y && v <= y + h
    ? [(u - x) / w, (v - y) / h] : null);
}

function schermato(verticale) {
  const zones = verticale ? [
    { y0: 0.000, y1: 0.108, f: (u, v) => {
      const c = mix(TERRA, hexa('#12100e'), (v - 0) / 0.108);
      if (rett(0.045, 0.030, 0.30, 0.019)(u, v)) return mix(c, OCRA_ALTA, 0.85);
      if (rett(0.045, 0.060, 0.19, 0.014)(u, v)) return mix(c, GRIGIO, 0.9);
      if (rett(0.80, 0.030, 0.155, 0.019)(u, v)) return mix(c, OCRA, 0.85);
      if (rett(0.045, 0.030, 0.030, 0.030)(u, v)) return mix(c, GRIGIO, 0.7);
      for (let i = 0; i < 4; i++) if (ell(0.70 + i * 0.030, 0.046, 0.008, 0.008)(u, v)) return mix(c, OCRA, i < 3 ? 1 : 0.35);
      return c;
    } },
    { y0: 0.108, y1: 0.845, f: (u, v) => {
      const ab = TELA_N(u, v);
      if (!ab) return mix(hexa('#12100e'), hexa('#0b0a09'), (v - 0.108) / 0.737);
      const [a, b] = ab;
      let c = mix(CARTA, CARTA_SCURA, b * 0.6);
      c = mix(c, CARBONCINO, (rumore(a * 22, b * 22) - 0.74) * 0.28);
      if (busto(a, b)) c = mix(c, CARBONCINO, 0.34);
      
      const cop = coperto(a, b, 0.50);
      if (cop > 0) c = mix(c, OCRA, 0.84 * cop);
      if (cop > 0.45) c = mix(c, hexa('#8d6b3a'), (cop - 0.45) * 0.5);
      /* la riga da tracciare: è la parata, e deve essere l'unica cosa che
       * si vede in tutta la tela */
      const dd = Math.abs((a - 0.20) * Math.sin(-0.30) - (b - 0.62) * Math.cos(-0.30));
      const su = (a - 0.20) * Math.cos(-0.30) + (b - 0.62) * Math.sin(-0.30);
      if (dd < 0.020 && su > -0.03 && su < 0.60) c = mix(c, ROSSO, 1 - dd / 0.020);
      if (dd >= 0.020 && dd < 0.052 && su > -0.03 && su < 0.60) c = mix(c, mix(c, NERO, 0.5), (1 - (dd - 0.020) / 0.032) * 0.55);
      /* il tempo che scorre, scritto lungo la riga */
      if (dd < 0.020 && su > -0.03 && su < 0.30) c = mix(c, OCRA_ALTA, 0.65);
      return c;
    } },
    { y0: 0.845, y1: 1.0, f: (u, v) => {
      const c = mix(hexa('#171310'), hexa('#0d0b0a'), (v - 0.845) / 0.155);
      if (v < 0.855 || v > 0.985) return c;
      const col = Math.floor((u - 0.012) / 0.246);
      if (col < 0 || col > 3 || (u - 0.012 - col * 0.246) < 0.004) return mix(c, hexa('#241f1b'), 0.7);
      if (col === 2) {
        if (u > 0.512 && u < 0.744) return mix(c, hexa('#2b1d18'), 1);
        return mix(c, hexa('#1c1815'), 1);
      }
      if (col === 3 && u > 0.765) return mix(c, OCRA, 0.95);
      return mix(c, hexa('#1c1917'), 1);
    } },
  ] : [
    { y0: 0.00, y1: 0.115, f: (u, v) => {
      const c = mix(TERRA, hexa('#12100e'), v / 0.115);
      if (rett(0.028, 0.030, 0.24, 0.021)(u, v)) return mix(c, OCRA_ALTA, 0.85);
      if (rett(0.028, 0.066, 0.15, 0.013)(u, v)) return mix(c, GRIGIO, 0.9);
      return c;
    } },
    { y0: 0.115, y1: 0.955, f: (u, v) => {
      if (u < 0.49) {
        const ab = TELA_L(u, v);
        if (!ab) return mix(hexa('#12100e'), hexa('#0b0a09'), v);
        const [a, b] = ab;
        let c = mix(CARTA, CARTA_SCURA, b * 0.6);
        c = mix(c, CARBONCINO, (rumore(a * 22, b * 22) - 0.74) * 0.28);
        if (busto(a, b)) c = mix(c, CARBONCINO, 0.34);
        const cop = coperto(a, b, 0.50);
        if (cop > 0) c = mix(c, OCRA, 0.84 * cop);
        return c;
      }
      const c = hexa('#12100e');
      if (rett(0.54, 0.14, 0.42, 0.36)(u, v)) return mix(c, hexa('#1c1815'), 1);
      if (rett(0.54, 0.53, 0.42, 0.36)(u, v)) return mix(c, hexa('#1c1815'), 1);
      if (rett(0.565, 0.175, 0.36, 0.010)(u, v)) return mix(c, OCRA, 0.9);
      if (rett(0.565, 0.255, 0.26, 0.008)(u, v)) return mix(c, GRIGIO, 0.85);
      if (rett(0.565, 0.335, 0.30, 0.008)(u, v)) return mix(c, GRIGIO, 0.7);
      if (rett(0.565, 0.415, 0.18, 0.008)(u, v)) return mix(c, OCRA, 0.8);
      if (rett(0.565, 0.565, 0.36, 0.010)(u, v)) return mix(c, hexa('#4a4038'), 0.9);
      if (rett(0.565, 0.645, 0.36, 0.008)(u, v)) return mix(c, hexa('#3a332b'), 0.9);
      if (rett(0.565, 0.725, 0.26, 0.008)(u, v)) return mix(c, hexa('#3a332b'), 0.8);
      return c;
    } },
    { y0: 0.955, y1: 1.0, f: (u, v) => mix(hexa('#171310'), hexa('#0d0b0a'), (v - 0.955) / 0.045) },
  ];

  const TELA_N = teleria(0.040, 0.155, 0.920, 0.665);
  const TELA_L = teleria(0.055, 0.145, 0.420, 0.800);
  return (u, v) => {
    for (const z of zones) {
      if (v >= z.y0 && v <= z.y1) {
        const c = z.f(u, v);
        return [...c, 1];
      }
    }
    return [...NERO, 1];
  };
}

/* ── generazione ─────────────────────────────────────────── */
let n = 0;
for (const s of [72, 96, 128, 144, 152, 192, 256, 384, 512]) {
  writeFileSync(join(OUT, `icon-${s}.png`), encodePNG(s, s, render(s, s, 1, icona)));
  n++;
}
writeFileSync(join(OUT, 'apple-touch-icon-180.png'), encodePNG(180, 180, render(180, 180, 1, icona)));
n++;
for (const s of [192, 512]) {
  /* maskable: il disegno rientra nella safe zone e il fondo fa bleed */
  writeFileSync(join(OUT, `maskable-${s}.png`), encodePNG(s, s, render(s, s, 0.68, icona)));
  n++;
}
writeFileSync(join(OUT, 'screenshot-narrow.png'),
  encodePNG(540, 960, render(540, 960, 1, schermato(true))));
writeFileSync(join(OUT, 'screenshot-wide.png'),
  encodePNG(1280, 720, render(1280, 720, 1, schermato(false))));
n += 2;

console.log(`${n} PNG scritti in icons/`);