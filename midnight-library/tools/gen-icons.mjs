// Genera le icone PNG del progetto senza dipendenze esterne (zlib nativo di Node).
// Uso: node tools/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'icons');

// --- CRC32 (PNG) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Disegno ---
function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function blend(px, idx, r, g, b, a) {
  if (a <= 0) return;
  const sa = Math.min(1, a);
  const da = px[idx + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  px[idx] = Math.round((r * sa + px[idx] * da * (1 - sa)) / outA);
  px[idx + 1] = Math.round((g * sa + px[idx + 1] * da * (1 - sa)) / outA);
  px[idx + 2] = Math.round((b * sa + px[idx + 2] * da * (1 - sa)) / outA);
  px[idx + 3] = Math.round(outA * 255);
}

// Signed distance: <0 dentro
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function draw(px, size, sdf, color, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = sdf(x + 0.5, y + 0.5);
      const a = Math.min(1, Math.max(0, 0.5 - d)) * alpha;
      if (a > 0) blend(px, (y * size + x) * 4, r, g, b, a);
    }
  }
}

function drawGlow(px, size, cx, cy, radius, color) {
  // Bagliore radiale morbido sopra il cerchio pieno
  const [r, g, b] = hex(color);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > radius && d < radius * 1.9) {
        const a = (1 - (d - radius) / (radius * 0.9)) * 0.35;
        if (a > 0) blend(px, (y * size + x) * 4, r, g, b, a);
      }
    }
  }
}

function makeIcon(size, { maskable = false, square = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const contentScale = maskable ? 0.62 : 1; // safe zone maskable = 80% del diametro
  const c = size / 2;

  // 1) Sfondo notte (full-bleed per maskable/apple, angoli arrotondati altrimenti)
  if (maskable || square) {
    draw(px, size, () => -1, '#141834', 1);
  } else {
    const r = size * 0.22;
    draw(px, size, (x, y) => sdRoundRect(x, y, c, c, size / 2, size / 2, r), '#141834', 1);
  }

  // 2) Libro/finestra (scalato per la safe zone)
  const bw = size * 0.35 * contentScale;
  const bh = size * 0.28 * contentScale;
  draw(px, size, (x, y) => sdRoundRect(x, y, c, c + size * 0.04 * contentScale, bw, bh, size * 0.05 * contentScale), '#2a3158', 1);
  draw(px, size, (x, y) => sdRoundRect(x, y, c, c + size * 0.04 * contentScale, bw * 0.78, bh * 0.72, size * 0.03 * contentScale), '#0d1130', 1);

  // 3) Lanterna (luna/luce) con bagliore
  const moonR = size * 0.13 * contentScale;
  const moonY = c + size * 0.04 * contentScale;
  drawGlow(px, size, c, moonY, moonR, '#f0b96b');
  draw(px, size, (x, y) => sdCircle(x, y, c, moonY, moonR), '#f0b96b', 1);

  // 4) Steli/piccole stelle
  const stars = [
    [c - size * 0.3 * contentScale, c - size * 0.22 * contentScale, size * 0.025 * contentScale],
    [c + size * 0.32 * contentScale, c - size * 0.18 * contentScale, size * 0.02 * contentScale],
    [c + size * 0.26 * contentScale, c + size * 0.28 * contentScale, size * 0.018 * contentScale],
  ];
  stars.forEach(([sx, sy, sr]) => {
    draw(px, size, (x, y) => sdCircle(x, y, sx, sy, sr), '#f5ead7', 0.95);
  });

  return encodePNG(size, size, px);
}

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-180.png', makeIcon(180, { square: true })],
  ['icon-192.png', makeIcon(192)],
  ['icon-512.png', makeIcon(512)],
  ['maskable-512.png', makeIcon(512, { maskable: true })],
];
targets.forEach(([name, buf]) => {
  writeFileSync(join(OUT, name), buf);
  console.log(`icons/${name} (${buf.length} bytes)`);
});
console.log('OK: 4 PNG generati.');
