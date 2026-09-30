#!/usr/bin/env node
/**
 * gen-icons.mjs — icone e mockup PWA di Matcha Heart, PNG veri.
 * Encoder PNG minimale in puro Node (zlib + CRC32), nessuna dipendenza.
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
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
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
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ── disegno: SDF + supersampling ───────────────────────── */
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (d, px) => clamp(0.5 - d / px, 0, 1);   // copertura da distanza con firma
const mix = (c1, c2, t) => [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];

function sdEllipse(ux, uy, cx, cy, rx, ry) {
  const dx = (ux - cx) / rx, dy = (uy - cy) / ry;
  const k = Math.hypot(dx, dy);
  return (k - 1) * Math.min(rx, ry);
}
function sdRoundBox(ux, uy, cx, cy, hw, hh, r) {
  const qx = Math.abs(ux - cx) - hw + r, qy = Math.abs(uy - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdSegment(ux, uy, ax, ay, bx, by) {
  const pax = ux - ax, pay = uy - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/* layer(u,v) → null | [r,g,b,alpha] — disegnati in ordine, source-over.
 * Ogni layer può portare `.bbox = [u0,v0,u1,v1]` per il culling (hot path). */
function render(w, h, bg, layers, SS = 2) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / w, v = (y + (sy + 0.5) / SS) / h;
          let c = bg(u, v);
          for (const L of layers) {
            const b = L.bbox;
            if (b && (u < b[0] || u > b[2] || v < b[1] || v > b[3])) continue;
            const r = L(u, v);
            if (!r) continue;
            const a = r[3];
            c = [c[0] + (r[0] - c[0]) * a, c[1] + (r[1] - c[1]) * a, c[2] + (r[2] - c[2]) * a];
          }
          ar += c[0]; ag += c[1]; ab += c[2]; aa += 1;
        }
      }
      const i = (y * w + x) * 4, n = SS * SS;
      out[i] = clamp(Math.round(ar / n), 0, 255);
      out[i + 1] = clamp(Math.round(ag / n), 0, 255);
      out[i + 2] = clamp(Math.round(ab / n), 0, 255);
      out[i + 3] = Math.round((aa / n) * 255);
    }
  }
  return encodePNG(w, h, out);
}
/* AA: la copertura arriva già dal SDF (smooth), il supersampling serve solo
 * per i bordi fortemente curvi — 2x2 basta e tiene i tempi sotto un secondo. */
const box = (fn, u0, v0, u1, v1) => { fn.bbox = [u0, v0, u1, v1]; return fn; };

/* ── palette ─────────────────────────────────────────────── */
const PAPER = [246, 241, 229], PAPER2 = [228, 217, 190];
const MATCHA = [122, 158, 126], MATCHA_D = [74, 107, 79], MATCHA_L = [183, 211, 168];
const CREAM = [255, 253, 247], INK = [46, 42, 36], LINE = [226, 215, 189];
const SAKURA = [244, 174, 190], SAKURA_D = [211, 128, 152], YUZU = [233, 196, 106];

/* ── il marchio: chawan di matcha, vapore, un sakura ────── */
function chawanLayers(map) {
  const tint = (fn, col, col2) => (u, v) => {
    const [du, dv] = map(u, v);
    const cov = smooth(fn(du, dv), 0.02);
    if (cov <= 0) return null;
    const c = mix(col, col2 || col, clamp((dv - 0.5) / 0.45, 0, 1));
    return [c[0], c[1], c[2], cov];
  };
  /* corpo della tazza: metà inferiore di un'ellisse */
  const body = (u, v) => (v >= 0.60 ? sdEllipse(u, v, 0.5, 0.60, 0.30, 0.27) : 1);
  /* piede */
  const foot = (u, v) => sdRoundBox(u, v, 0.5, 0.888, 0.088, 0.020, 0.016);
  /* bordo */
  const rim = (u, v) => sdRoundBox(u, v, 0.5, 0.606, 0.335, 0.030, 0.028);
  /* superficie del matcha */
  const liquid = (u, v) => (v <= 0.612 ? sdEllipse(u, v, 0.5, 0.60, 0.298, 0.056) : 1);
  const layers = [];
  /* vapore: tre sinusoidi */
  for (const [x0, amp, h, a] of [[0.375, 0.030, 0.30, 0.55], [0.5, 0.036, 0.38, 0.7], [0.625, 0.030, 0.31, 0.5]]) {
    layers.push(box((u, v) => {
      const [du, dv] = map(u, v);
      if (dv < 0.19 || dv > 0.20 + h) return null;
      const t = (dv - 0.20) / h;
      const cx = x0 + Math.sin(t * 5.2) * amp * (0.35 + t);
      const d = Math.abs(du - cx) - 0.013 * (1 - t * 0.5);
      const cov = smooth(d, 0.02) * a * (1 - Math.pow(t, 3));
      return cov > 0 ? [CREAM[0], CREAM[1], CREAM[2], cov] : null;
    }, x0 - 0.10, 0.19, x0 + 0.10, 0.20 + h));
  }
  layers.push(box(tint(body, MATCHA, MATCHA_D), 0.19, 0.59, 0.81, 0.88));       // corpo
  layers.push(box(tint(foot, MATCHA_D, MATCHA), 0.40, 0.86, 0.60, 0.92));        // piede
  layers.push(box(tint(liquid, MATCHA_L, MATCHA), 0.19, 0.54, 0.81, 0.615));     // matcha dentro
  /* schiuma: tre bolle */
  for (const [bx, by, br] of [[0.435, 0.600, 0.030], [0.520, 0.607, 0.038], [0.600, 0.599, 0.026]]) {
    layers.push(box((u, v) => {
      const [du, dv] = map(u, v);
      const cov = smooth(sdEllipse(du, dv, bx, by, br, br * 0.5), 0.02) * 0.9;
      return cov > 0 ? [CREAM[0], CREAM[1], CREAM[2], cov] : null;
    }, bx - br, by - br, bx + br, by + br));
  }
  layers.push(box(tint(rim, MATCHA_D, MATCHA), 0.15, 0.57, 0.85, 0.645));        // bordo sopra
  /* sakura a 5 petali */
  const flower = (u, v) => {
    const cx = 0.745, cy = 0.275, R = 0.052, r = 0.024;
    let d = 1e9;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      d = Math.min(d, sdEllipse(u, v, cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72, r, r));
    }
    return d;
  };
  layers.push(box(tint(flower, SAKURA, SAKURA_D), 0.64, 0.18, 0.85, 0.38));
  layers.push(box((u, v) => {
    const [du, dv] = map(u, v);
    const cov = smooth(sdEllipse(du, dv, 0.745, 0.275, 0.016, 0.016), 0.02);
    return cov > 0 ? [YUZU[0], YUZU[1], YUZU[2], cov] : null;
  }, 0.72, 0.25, 0.77, 0.30));
  return layers;
}

const paperBg = (u, v) => {
  let c = mix(PAPER, PAPER2, clamp(v * 0.95, 0, 1));
  const d = Math.hypot((u - 0.5) * 1.05, v - 0.55);
  c = mix(c, MATCHA_L, clamp(1 - d / 0.72, 0, 1) * 0.35);
  return c;
};

/* `any`: quadrato con angoli arrotondati, il launcher applica il proprio mask */
function makeIcon(size, { rounded = true, scale = 1 } = {}) {
  const R = 0.225;
  const bg = rounded
    ? (u, v) => (smooth(sdRoundBox(u, v, 0.5, 0.5, 0.5, 0.5, R), 0.006) > 0 ? paperBg(u, v) : [0, 0, 0])
    : paperBg;
  const map = scale === 1 ? (u, v) => [u, v] : (u, v) => [0.5 + (u - 0.5) / scale, 0.5 + (v - 0.5) / scale];
  return render(size, size, bg, chawanLayers(map));
}

/* ── mockup per le screenshots del manifest ────────────────
 * Sono resi generati, non catture di dispositivo: dichiarati nel README. */
const MUTED = [138, 127, 109];
const card = (x0, y0, x1, y1, r = 0.02) => box((u, v) => {
  const cov = smooth(sdRoundBox(u, v, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, r), 0.004);
  return cov > 0 ? [255, 253, 247, cov] : null;
}, x0 - 0.01, y0 - 0.01, x1 + 0.01, y1 + 0.01);
const block = (col, x0, y0, x1, y1, r = 0.008, a = 1) => box((u, v) => {
  const cov = smooth(sdRoundBox(u, v, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, r), 0.004) * a;
  return cov > 0 ? [col[0], col[1], col[2], cov] : null;
}, x0 - 0.01, y0 - 0.01, x1 + 0.01, y1 + 0.01);
function board(L, gx0, gy0, gx1, gy1, gap, seed) {
  const cw = (gx1 - gx0 - gap * 7) / 8, ch = (gy1 - gy0 - gap * 7) / 8;
  const tiles = [MATCHA, MATCHA_D, SAKURA, YUZU, [85, 85, 85], CREAM];
  let s = seed;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    L.push(block(tiles[(s >> 7) % tiles.length],
      gx0 + c * (cw + gap), gy0 + r * (ch + gap),
      gx0 + c * (cw + gap) + cw, gy0 + r * (ch + gap) + ch, 0.010));
  }
}
function mockup(w, h) {
  const L = [];
  const narrow = w / h < 0.8;
  L.push(card(0.03, 0.028, 0.97, 0.075, 0.022));                       // topbar
  L.push(block(MATCHA, 0.07, 0.042, 0.20, 0.062, 0.008));
  L.push(block(PAPER2, 0.76, 0.044, 0.85, 0.062, 0.009));
  L.push(block(PAPER2, 0.87, 0.044, 0.95, 0.062, 0.009));
  if (narrow) {
    L.push(card(0.03, 0.09, 0.97, 0.40, 0.026));                        // hero
    L.push(block(SAKURA, 0.08, 0.135, 0.40, 0.152, 0.009));
    L.push(block(INK, 0.08, 0.170, 0.78, 0.190, 0.010, 0.72));
    for (const [y, w2] of [[0.205, 0.90], [0.230, 0.72], [0.255, 0.84]]) L.push(block(MUTED, 0.08, y, w2, y + 0.013, 0.007, 0.5));
    L.push(block(MATCHA, 0.08, 0.300, 0.92, 0.322, 0.011, 0.35));
    L.push(block(MATCHA, 0.08, 0.334, 0.62, 0.356, 0.011, 0.35));
    L.push(block(INK, 0.08, 0.378, 0.52, 0.392, 0.007, 0.8));
    L.push(card(0.03, 0.44, 0.97, 0.80, 0.026));                        // board
    board(L, 0.075, 0.475, 0.925, 0.755, 0.012, 7);
    for (let i = 0; i < 3; i++) L.push(block(MATCHA, 0.06 + i * 0.30, 0.828, 0.30 + i * 0.30, 0.866, 0.012, 0.25));
    L.push(block(MATCHA_D, 0.06, 0.888, 0.94, 0.938, 0.016, 0.9));
  } else {
    L.push(card(0.04, 0.11, 0.46, 0.92, 0.026));                        // bacheca
    for (let i = 0; i < 5; i++) L.push(block(PAPER2, 0.07, 0.145 + i * 0.152, 0.43, 0.255 + i * 0.152, 0.014));
    L.push(block(MATCHA, 0.09, 0.163, 0.41, 0.237, 0.012, 0.3));
    L.push(card(0.52, 0.11, 0.96, 0.92, 0.026));                        // anteprima
    L.push(block(INK, 0.56, 0.145, 0.90, 0.165, 0.010, 0.75));
    L.push(block(MUTED, 0.56, 0.182, 0.86, 0.196, 0.007, 0.45));
    board(L, 0.56, 0.235, 0.92, 0.735, 0.010, 11);
    L.push(block(MATCHA, 0.56, 0.775, 0.92, 0.805, 0.010, 0.35));
    L.push(block(MATCHA_D, 0.56, 0.825, 0.92, 0.875, 0.016, 0.9));
  }
  L.push(card(0, 0.945, 1, 1, 0));                                       // tabbar
  for (let i = 0; i < 4; i++) {
    const on = i === (narrow ? 2 : 1);
    L.push(block(on ? INK : PAPER2, 0.04 + i * 0.24, 0.955, 0.24 + i * 0.24, 0.992, 0.010));
  }
  return render(w, h, paperBg, L);
}

/* ── generazione ─────────────────────────────────────────── */
if (process.argv.includes('--preview')) {
  /* Anteprima ASCII del marchio: verifica la geometria senza decodificare PNG. */
  const layers = chawanLayers((u, v) => [u, v]);
  const N = 56, M = 30, ramp = ' .:-=+*#%@';
  for (let y = 0; y < M; y++) {
    let row = '';
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N, v = (y + 0.5) / M;
      let c = paperBg(u, v);
      for (const L of layers) { const r = L(u, v); if (r) c = [c[0] + (r[0] - c[0]) * r[3], c[1] + (r[1] - c[1]) * r[3], c[2] + (r[2] - c[2]) * r[3]]; }
      const lum = (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
      row += ramp[clamp(Math.round((1 - lum) * 9), 0, 9)];
    }
    console.log(row);
  }
  process.exit(0);
}

const ANY_SIZES = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
for (const s of ANY_SIZES) {
  const name = s === 180 ? 'apple-touch-icon-180.png' : `icon-${s}.png`;
  writeFileSync(join(OUT, name), makeIcon(s));
}
/* maskable: sfondo a tutto campo, marchio dentro la safe zone (80% del lato) */
writeFileSync(join(OUT, 'maskable-512.png'), makeIcon(512, { rounded: false, scale: 0.72 }));
writeFileSync(join(OUT, 'maskable-192.png'), makeIcon(192, { rounded: false, scale: 0.72 }));
/* mockup dichiarati nelle screenshots del manifest (generati, non catture) */
writeFileSync(join(OUT, 'screenshot-narrow.png'), mockup(540, 960));
writeFileSync(join(OUT, 'screenshot-wide.png'), mockup(1280, 720));
console.log(`✓ ${ANY_SIZES.length + 2} icone + 2 mockup in icons/`);
