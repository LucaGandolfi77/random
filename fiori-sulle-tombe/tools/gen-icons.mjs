#!/usr/bin/env node
/**
 * gen-icons.mjs — icone e screenshot PWA, PNG veri.
 *
 * Encoder PNG minimale in puro Node (zlib + CRC32), nessuna dipendenza, e un
 * rasterizzatore a SDF con supersampling 3x3. Le icone non sono un asset: sono
 * una descrizione di forma dentro a questo file, quindi si correggono senza
 * toccare un binario.
 *
 * L'icona è la tesi del gioco in un quadrato: un gambo che esce da una pietra,
 * e metà del gambo già fiorito. La parte fiorita è l'unica che hai pagato, e
 * non la paghi subito — perché nel gioco si paga per quattro atti, e la
 * pietra sotto è un cadavere con la faccia cancellata.
 *
 * Due piatti di stampa e un errore di registro: verde muschio e ocra, e la
 * seconda tinta un filo storto, come una serigrafia tirata due volte.
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
/* segmento spesso: serve per i gambi e per le foglie */
const seg = (ax, ay, bx, by, r) => (u, v) => {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return ((u - ax) ** 2 + (v - ay) ** 2) <= r * r;
  let t = ((u - ax) * dx + (v - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return ((u - (ax + t * dx)) ** 2 + (v - (ay + t * dy)) ** 2) <= r * r;
};
const banda = (p0, p1, r) => (u, v) => seg(p0[0], p0[1], p1[0], p1[1], r)(u, v);

/* La serigrafia: due piatti e un registro storto. */
const NOTTE = hexa('#0f120c');
const TERRA = hexa('#d8d0b2');
const TERRA_SCURA = hexa('#bdb894');
const MUSCHIO = hexa('#5f6b4a');
const MUSCHIO_CHIARO = hexa('#7f8a63');
const OCRA = hexa('#c9a76a');
const OCRA_ALTA = hexa('#e0c18a');
const OSSO = hexa('#e6e0c8');

/* ── la pietra ─────────────────────────────────────────────
   Non è un sasso: è una sepoltura. Un blocco basso e tondeggiante,
   con la faccia cancellata da un inchiostro che non ha finito, e
   una data che non si legge. */
const PIETRA = [
  [0.500, 0.775, 0.300, 0.070],   // la massa, schiacciata
  [0.330, 0.815, 0.140, 0.045],
  [0.672, 0.818, 0.135, 0.043],
];
const pietra = (u, v) => {
  for (const [cx, cy, rx, ry] of PIETRA) {
    /* il bordo non è un'ellisse: si sposta col rumore su due scale */
    const s = 1 + (rumore(u * 7.0, v * 4.0) - 0.5) * 0.14 + (rumore(u * 19, v * 13) - 0.5) * 0.05;
    if (((u - cx) / (rx * s)) ** 2 + ((v - cy) / (ry * s)) ** 2 <= 1) return 1;
  }
  return 0;
};

/* Il gambo: esce dal centro della pietra e sale. È storto, perché le
   radici sotto terra lo spingono da una parte sola. */
const NODI_GAMBO = [
  [0.500, 0.815], [0.492, 0.700], [0.520, 0.585], [0.500, 0.470],
  [0.535, 0.360], [0.512, 0.258], [0.520, 0.170],
];
function gambo(u, v) {
  let fuori = 0;
  for (let i = 1; i < NODI_GAMBO.length; i++) {
    const a = NODI_GAMBO[i - 1];
    const b = NODI_GAMBO[i];
    if (seg(a[0], a[1], b[0], b[1], 0.021)(u, v)) fuori = 1;
  }
  return fuori;
}
/* Lo stelo del fiore, più sottile: sale ancora e si apre. */
function stelo(u, v) {
  let fuori = 0;
  const a = NODI_GAMBO[NODI_GAMBO.length - 1];
  if (seg(a[0], a[1], a[0] + 0.012, 0.085, 0.013)(u, v)) fuori = 1;
  return fuori;
}

/* Due foglie, una per lato, a due altezze diverse. */
const FOGLIE = [
  [0.503, 0.630, 0.400, 0.590, 0.062],
  [0.510, 0.520, 0.628, 0.462, 0.056],
];
function foglie(u, v) {
  let fuori = 0;
  for (const [ax, ay, bx, by, r] of FOGLIE) {
    if (seg(ax, ay, bx, by, r * 0.55)(u, v)) {
      /* la foglia è un ellisse allungato lungo il suo asse */
      const dx = bx - ax; const dy = by - ay;
      const len = Math.hypot(dx, dy);
      const nx = (-dy / len) * (u - (ax + dx / 2)) + (dx / len) * (v - (ay + dy / 2));
      const ny = (dx / len) * (u - (ax + dx / 2)) + (dy / len) * (v - (ay + dy / 2));
      if ((nx / (r * 0.52)) ** 2 + (ny / (r * 1.9)) ** 2 <= 1) fuori = 1;
    }
  }
  return fuori;
}

/* Il fiore: cinque petali attorno a un nocciolo, e i petali sono la
   parte che hai pagato.
   Ogni petalo è un ellisse spostato lungo il proprio asse: si ottiene
   riportando l'angolo dentro uno dei cinque lobi e togliendo lo
   spostamento. Unione di cinque ellissi, che è un fiore. */
const CORAGGIO = [0.532, 0.092];
const PETALI_N = 5;
const PETALO_R = 0.062;     // quanto il petalo è staccato dal nocciolo
const PETALO_A = 0.040;     // semiassi del petalo
const PETALO_B = 0.028;
function petali(u, v) {
  const dx = u - CORAGGIO[0];
  const dy = v - CORAGGIO[1];
  const d = Math.hypot(dx, dy);
  if (d > PETALO_R + PETALO_A + 0.004) return 0;
  if (d < 0.028) return 1;                       // il nocciolo, sempre pieno
  const passo = (Math.PI * 2) / PETALI_N;
  let rel = Math.atan2(dy, dx) + Math.PI / 2;    // un petalo in alto
  rel = ((rel % passo) + passo) % passo - passo / 2;
  const px = d * Math.cos(rel) - PETALO_R;
  const py = d * Math.sin(rel);
  /* il bordo del petalo è irregolare: una stampa non stampa cerchi */
  const s = 1 + (rumore(Math.cos(rel) * 4 + 3, Math.sin(rel) * 4 + 3) - 0.5) * 0.20;
  return (px * px) / ((PETALO_A * s) ** 2) + (py * py) / ((PETALO_B * s) ** 2) <= 1 ? 1 : 0;
}
const nocciolo = ell(CORAGGIO[0], CORAGGIO[1], 0.024, 0.024);

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
      if (aa <= 0) { buf[k] = NOTTE[0]; buf[k + 1] = NOTTE[1]; buf[k + 2] = NOTTE[2]; buf[k + 3] = 255; }
      else { buf[k] = Math.round(ar / aa); buf[k + 1] = Math.round(ag / aa); buf[k + 2] = Math.round(ab / aa); buf[k + 3] = 255; }
    }
  }
  return buf;
}

/* ── l'icona ─────────────────────────────────────────────── */
const T = { x: 0.145, y: 0.150, w: 0.710, h: 0.720 };
const dentroTela = (u, v) => u >= T.x && u <= T.x + T.w && v >= T.y && v <= T.y + T.h;
/* coordinate della tela riportate a 0..1: tutto il resto del disegno ragiona su
 * queste, così proporzioni e tagli restano coerenti fra icone e screenshot */
const L = (u, v) => [(u - T.x) / T.w, (v - T.y) / T.h];

function icona(u, v) {
  let c = mix(hexa('#1c1f12'), hexa('#0b0d07'), Math.min(1, Math.max(0, v)));
  if (rett(T.x - 0.020, T.y + 0.030, T.w, T.h)(u, v)) c = mix(c, hexa('#060704'), 0.85);
  if (!dentroTela(u, v)) return [...c, 1];

  const [a, b] = L(u, v);
  c = mix(TERRA, TERRA_SCURA, b * 0.55);
  c = mix(c, MUSCHIO, (rumore(a * 26, b * 26) - 0.76) * 0.26);

  /* il gambo e lo stelo, in due piatti, il secondo fuori registro */
  if (gambo(a, b)) c = mix(c, MUSCHIO, 1);
  if (stelo(a, b)) c = mix(c, MUSCHIO_CHIARO, 1);
  if (foglie(a, b)) c = mix(c, MUSCHIO, 1);
  if (foglie(a + 0.012, b + 0.010)) c = mix(c, MUSCHIO_CHIARO, 0.55);

  /* il fiore: ocra, l'unica cosa calda del disegno */
  if (petali(a, b)) c = mix(c, OCRA, 0.96);
  if (nocciolo(a, b)) c = mix(c, MUSCHIO, 0.9);
  /* la stampa è tirata due volte: l'ocra è un filo storto a sinistra */
  if (petali(a + 0.016, b + 0.012) && !petali(a, b)) c = mix(c, OCRA_ALTA, 0.42);

  /* la pietra: sotto, e pesante. Il muschio ci entra sopra. */
  if (pietra(a, b)) {
    c = mix(c, mix(hexa('#8f9570'), hexa('#59634a'), Math.min(1, (b - 0.77) * 4.5)), 0.95);
    /* l'inchiostro che ha cancellato la faccia: entra da destra, e il suo
     * bordo è due scale di rumore, perché un inchiostro che non ha finito
     * non si ferma in linea retta */
    const bordo = 0.600
      + (rumore(b * 6.4, a * 1.9) - 0.5) * 0.115
      + (rumore(b * 21, a * 9) - 0.5) * 0.038;
    if (a > bordo) c = mix(c, hexa('#1a1d10'), 0.93);
    else if (a > bordo - 0.070) c = mix(c, hexa('#2b3018'), (1 - (bordo - a) / 0.070) * 0.85);
  }
  /* il muschio che sale sulla pietra: la terra vince sempre, e questa
     è la parte della storia che si vede senza leggere niente */
  if (pietra(a, b) && a < 0.44 && rumore(a * 24, b * 24) > 0.52) c = mix(c, MUSCHIO_CHIARO, 0.42);
  /* la terra attorno alla pietra, un filo più scura: la copre */
  if (b > 0.885 && b < 0.925) c = mix(c, mix(c, NOTTE, 0.42), 0.8);

  /* il retino della serigrafia: due piatti e un grana fine sopra tutto,
     e senza questo sembra un disegno vettoriale e non una stampa */
  const grana = rumore(a * 512, b * 512);
  if (grana > 0.86) c = mix(c, [255, 255, 255], 0.045);
  else if (grana < 0.07) c = mix(c, [0, 0, 0], 0.055);

  return [...c, 1];
}

/* ── gli screenshot ──────────────────────────────────────── */
/* Non sono una foto del gioco: sono il suo scheletro, disegnato con le stesse
   primitive dell'icona, così l'installazione mostra già che qui si pianta. */
/* Rettangolo di tela e relativizzazione: ogni schermata ha la sua, altrimenti
   il gambo esce dal riquadro e l'immagine mente su come si gioca. */
function teleria(x, y, w, h) {
  return (u, v) => (u >= x && u <= x + w && v >= y && v <= y + h
    ? [(u - x) / w, (v - y) / h] : null);
}

/* Il vaso visto in pianta: un trapezio, la terra dentro, e il gambo che
   esce dal centro. È la forma che il giocatore riempie col dito. */
function vasoDisegno(a, b) {
  let fuori = 0;
  const dentro = a > 0.30 && a < 0.70 && b > 0.30 && b < 0.94;
  if (dentro) {
    /* il trapezio del vaso: più stretto in basso */
    const t = (b - 0.30) / 0.64;
    const half = 0.20 - t * 0.07;
    if (Math.abs(a - 0.5) < half) fuori = 1;
  }
  return fuori;
}

function schermato(verticale) {
  const TELA_N = teleria(0.040, 0.155, 0.920, 0.665);
  const TELA_L = teleria(0.055, 0.145, 0.420, 0.800);
  const orto = (a, b) => {
    let c = mix(TERRA, TERRA_SCURA, b * 0.6);
    c = mix(c, MUSCHIO, (rumore(a * 22, b * 22) - 0.76) * 0.26);
    if (vasoDisegno(a, b)) c = mix(c, MUSCHIO, 0.72);
    /* il gambo dentro il vaso, e il fiore in cima */
    if (gambo(a, b) || stelo(a, b)) c = mix(c, MUSCHIO, 1);
    if (foglie(a, b)) c = mix(c, MUSCHIO_CHIARO, 0.8);
    if (petali(a, b)) c = mix(c, OCRA, 0.94);
    if (nocciolo(a, b)) c = mix(c, MUSCHIO, 0.9);
    /* il fiore da lasciar andare: l'anello, e il cuore che non si tocca */
    const fx = 0.30; const fy = 0.70;
    const dd = Math.abs(Math.hypot(a - fx, b - fy) - 0.085);
    if (dd < 0.011) c = mix(c, OCRA_ALTA, 0.92);
    else if (dd < 0.026) c = mix(c, mix(c, NOTTE, 0.4), 0.5);
    if (ell(fx, fy, 0.028, 0.028)(a, b)) c = mix(c, OCRA, 0.95);
    return c;
  };

  const zones = verticale ? [
    { y0: 0.000, y1: 0.108, f: (u, v) => {
      const c = mix(hexa('#2b2a1c'), NOTTE, (v) / 0.108);
      if (rett(0.045, 0.030, 0.30, 0.019)(u, v)) return mix(c, OCRA_ALTA, 0.85);
      if (rett(0.045, 0.060, 0.19, 0.014)(u, v)) return mix(c, hexa('#8a8768'), 0.9);
      if (rett(0.80, 0.030, 0.155, 0.019)(u, v)) return mix(c, OCRA, 0.85);
      if (rett(0.045, 0.030, 0.030, 0.030)(u, v)) return mix(c, hexa('#8a8768'), 0.7);
      /* i pips della sete */
      for (let i = 0; i < 4; i++) if (ell(0.70 + i * 0.030, 0.046, 0.008, 0.008)(u, v)) return mix(c, OCRA, i < 3 ? 1 : 0.35);
      return c;
    } },
    { y0: 0.108, y1: 0.845, f: (u, v) => {
      const ab = TELA_N(u, v);
      if (!ab) return mix(NOTTE, hexa('#080a05'), (v - 0.108) / 0.737);
      return [...orto(ab[0], ab[1]), 1];
    } },
    { y0: 0.845, y1: 1.0, f: (u, v) => {
      const c = mix(hexa('#171a10'), hexa('#0a0c06'), (v - 0.845) / 0.155);
      if (v < 0.855 || v > 0.985) return c;
      const col = Math.floor((u - 0.012) / 0.246);
      if (col < 0 || col > 3 || (u - 0.012 - col * 0.246) < 0.004) return mix(c, hexa('#222614'), 0.7);
      if (col === 2) return mix(c, hexa('#291f11'), 1);
      if (col === 3 && u > 0.765) return mix(c, OCRA, 0.95);
      return mix(c, hexa('#171a10'), 1);
    } },
  ] : [
    { y0: 0.00, y1: 0.115, f: (u, v) => {
      const c = mix(hexa('#2b2a1c'), NOTTE, v / 0.115);
      if (rett(0.028, 0.030, 0.24, 0.021)(u, v)) return mix(c, OCRA_ALTA, 0.85);
      if (rett(0.028, 0.066, 0.15, 0.013)(u, v)) return mix(c, hexa('#8a8768'), 0.9);
      return c;
    } },
    { y0: 0.115, y1: 0.955, f: (u, v) => {
      if (u < 0.49) {
        const ab = TELA_L(u, v);
        if (!ab) return mix(NOTTE, hexa('#080a05'), v);
        return [...orto(ab[0], ab[1]), 1];
      }
      /* a destra il Mazzetto: schede vere, con le righe */
      const c = NOTTE;
      if (rett(0.54, 0.14, 0.42, 0.36)(u, v)) return mix(c, hexa('#1a1e12'), 1);
      if (rett(0.54, 0.53, 0.42, 0.36)(u, v)) return mix(c, hexa('#1a1e12'), 1);
      if (rett(0.565, 0.175, 0.36, 0.010)(u, v)) return mix(c, OCRA, 0.9);
      if (rett(0.565, 0.255, 0.26, 0.008)(u, v)) return mix(c, hexa('#8a8768'), 0.85);
      if (rett(0.565, 0.335, 0.30, 0.008)(u, v)) return mix(c, hexa('#8a8768'), 0.7);
      if (rett(0.565, 0.415, 0.18, 0.008)(u, v)) return mix(c, OCRA, 0.8);
      if (rett(0.565, 0.565, 0.36, 0.010)(u, v)) return mix(c, hexa('#434b33'), 0.9);
      if (rett(0.565, 0.645, 0.36, 0.008)(u, v)) return mix(c, hexa('#363c26'), 0.9);
      if (rett(0.565, 0.725, 0.26, 0.008)(u, v)) return mix(c, hexa('#363c26'), 0.8);
      return c;
    } },
    { y0: 0.955, y1: 1.0, f: (u, v) => mix(hexa('#171a10'), hexa('#0a0c06'), (v - 0.955) / 0.045) },
  ];

  return (u, v) => {
    for (const z of zones) {
      if (v >= z.y0 && v <= z.y1) {
        const c = z.f(u, v);
        return [...c, 1];
      }
    }
    return [...NOTTE, 1];
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
