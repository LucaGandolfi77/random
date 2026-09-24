import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'icons');
mkdirSync(iconsDir, { recursive: true });

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function png(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const na = a / 255;
    const oa = buf[i + 3] / 255;
    const ra = na + oa * (1 - na);
    if (ra <= 0) return;
    buf[i] = Math.round((r * na + buf[i] * oa * (1 - na)) / ra);
    buf[i + 1] = Math.round((g * na + buf[i + 1] * oa * (1 - na)) / ra);
    buf[i + 2] = Math.round((b * na + buf[i + 2] * oa * (1 - na)) / ra);
    buf[i + 3] = Math.round(ra * 255);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / size;
      const vign = 1 - 0.45 * Math.hypot(x / size - 0.5, y / size - 0.5);
      set(x, y, Math.round((10 + 8 * (1 - t)) * vign), Math.round((13 + 10 * (1 - t)) * vign), Math.round((24 + 16 * (1 - t)) * vign));
    }
  }

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.33;
  const lw = Math.max(2, size * 0.035);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const ring = Math.abs(d - R);
      if (ring < lw) {
        const glow = 1 - ring / lw;
        const ang = Math.atan2(y - cy, x - cx);
        const warm = 0.5 + 0.5 * Math.sin(ang * 2 + 0.6);
        set(x, y, Math.round(80 + 140 * warm * glow), Math.round(50 + 90 * glow), Math.round(34 + 50 * warm * glow), Math.round(255 * glow));
      }
      const R2 = size * 0.20;
      const ring2 = Math.abs(d - R2);
      if (ring2 < lw * 0.75) {
        const glow = 1 - ring2 / (lw * 0.75);
        set(x, y, Math.round(150 * glow), Math.round(175 * glow), Math.round(200 * glow), Math.round(220 * glow));
      }
    }
  }

  const linkY = [cy - size * 0.2, cy, cy + size * 0.2];
  for (const ly of linkY) {
    const rr = size * 0.055;
    for (let y = Math.floor(ly - rr * 2); y <= ly + rr * 2; y++) {
      for (let x = Math.floor(cx - rr * 2); x <= cx + rr * 2; x++) {
        const d = Math.hypot(x - cx, y - ly);
        if (d < rr) {
          const edge = d > rr * 0.65 ? (d - rr * 0.65) / (rr * 0.35) : 0;
          set(x, y, Math.round(230 - 40 * edge), Math.round(170 - 30 * edge), Math.round(110 - 20 * edge), 255);
        } else if (d < rr * 1.35) {
          set(x, y, 30, 24, 20, Math.round(180 * (1 - (d - rr) / (rr * 0.35))));
        }
      }
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = (x * 13 + y * 7) % 23;
      if (r === 0 && buf[i + 3] > 200) {
        buf[i] = Math.min(255, buf[i] + 14);
        buf[i + 1] = Math.min(255, buf[i + 1] + 12);
        buf[i + 2] = Math.min(255, buf[i + 2] + 10);
      }
    }
  }

  return png(size, size, buf);
}

const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-384.png', 384],
  ['apple-touch-icon.png', 180],
  ['icon-96.png', 96],
];

for (const [name, size] of sizes) {
  writeFileSync(join(iconsDir, name), drawIcon(size));
  console.log('wrote', name);
}
