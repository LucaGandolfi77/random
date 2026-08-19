// Genera le icone PNG della PWA "GEMMONDO" senza dipendenze esterne.
// Uso: node gen-icons.cjs
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---------- PNG encoder (RGBA, 8-bit) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Color helpers ----------
function lerp(a, b, t) { return a + (b - a) * t; }
function mixRGB(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// ---------- Geometry ----------
// point-in-convex-polygon with signed distance to edges (for AA)
function polygonSDF(px, py, pts) {
  // returns signed distance; negative = inside
  let d = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const nx = -ey; // outward normal (CCW order assumed)
    const ny = ex;
    const dist = (px - a[0]) * nx + (py - a[1]) * ny;
    d = Math.max(d, dist); // inside if all half-planes negative
  }
  return d;
}
// rounded-rect SDF (normalized units, center 0,0). radius in units.
function roundRectSDF(px, py, hw, hh, r) {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

// Gemma faccettata (diamante ghiaccio) — coordinate con y verso l'alto, centro 0,0
const T = [0, 0.56];
const R = [0.38, 0.09];
const G = [0, 0.09];
const L = [-0.38, 0.09];
const B = [0, -0.60];

function gemColor(px, py) {
  // determina la faccetta (ordine CCW = interno negativo)
  const facets = [
    { pts: [T, L, G], col: [255, 255, 255] }, // corona sinistra
    { pts: [T, G, R], col: [206, 244, 255] }, // corona destra
    { pts: [L, B, G], col: [106, 224, 255] }, // padiglione sinistro
    { pts: [G, B, R], col: [41, 183, 245] },  // padiglione destro
  ];
  let best = null;
  let bestD = Infinity;
  for (const f of facets) {
    const d = polygonSDF(px, py, f.pts);
    if (d < 0 && d < bestD) { best = f.col; bestD = d; }
  }
  return best;
}

function sample(px, py) {
  // px,py in [0,1]^2, y verso il basso
  const x = px * 2 - 1;
  const y = -(py * 2 - 1); // ora y verso l'alto

  // sfondo: gradiente diagonale
  const t = 0.5 * (px + py); // 0..1
  const bg = mixRGB(
    mixRGB([42, 14, 97], [123, 47, 255], smoothstep(0, 0.55, t)),
    [0, 212, 255],
    smoothstep(0.45, 1, t)
  );

  // alpha dal rounded-rect (icona standard)
  const alphaRect = 1 - smoothstep(-0.012, 0.012, roundRectSDF(x, y, 1.0, 1.0, 0.24));
  if (alphaRect <= 0) return [bg[0], bg[1], bg[2], 0];

  // Gemma
  const dCrown = polygonSDF(x, y, [T, L, R]);
  const dPav = polygonSDF(x, y, [L, R, B]);
  const dGem = Math.min(dCrown, dPav);
  const gemEdge = smoothstep(-0.012, 0.012, dGem); // 0 dentro, 1 fuori

  let r = bg[0], g = bg[1], b = bg[2];
  if (gemEdge < 1) {
    const col = gemColor(x, y) || [41, 183, 245];
    const colOut = mixRGB(bg, col, 1 - gemEdge);
    r = colOut[0]; g = colOut[1]; b = colOut[2];

    // highlight speculare
    const hd = Math.hypot(x - (-0.09), y - 0.24) - 0.05;
    const hh = 1 - smoothstep(-0.012, 0.012, hd);
    if (hh > 0) {
      const w = mixRGB([r, g, b], [255, 255, 255], hh * 0.9);
      r = w[0]; g = w[1]; b = w[2];
    }
  }

  // scintilla (stella a 4 punte) in alto a destra
  const sx = 0.34, sy = 0.34;
  const dx = Math.abs(x - sx), dy = Math.abs(y - sy);
  const arm = 0.10, thick = 0.024;
  const star = Math.min(
    Math.abs(dx) - thick, // braccio orizzontale
    Math.abs(dy) - thick  // braccio verticale
  );
  // braccio diagonale corto per renderla una stella vera
  const diag = Math.min(dx, dy) - thick * 1.2;
  const starD = Math.min(star, diag);
  if (starD < 0 && Math.abs(dx) < arm && Math.abs(dy) < arm) {
    const a = 1 - smoothstep(-0.01, 0.01, starD);
    const w = mixRGB([r, g, b], [255, 255, 255], a);
    r = w[0]; g = w[1]; b = w[2];
  }

  return [r, g, b, Math.round(alphaRect * 255)];
}

function render(size, rounded) {
  const SS = 3; // supersampling
  const W = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          const c = sample(px, py);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = __dirname;
const targets = [
  ['icon-16.png', 16, true],
  ['icon-32.png', 32, true],
  ['icon-180.png', 180, true],
  ['icon-192.png', 192, true],
  ['icon-512.png', 512, true],
  ['icon-maskable-512.png', 512, false],
];
for (const [name, size, rounded] of targets) {
  const buf = render(size, rounded);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log('OK', name, size + 'x' + size, buf.length, 'bytes');
}
