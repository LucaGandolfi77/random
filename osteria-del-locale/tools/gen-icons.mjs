// Generates the PWA icons: a lantern-lit "O" for the Drowned Ox. Pure Node, no deps.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');
mkdirSync(outDir, { recursive: true });

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, painter) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = painter(x, y, size);
      const i = (y * size + x) * 4;
      pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a;
    }
  }
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [20, 17, 14];
const OX = [232, 224, 210];
const EMBER = [217, 138, 74];

function icon(x, y, size, inset) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = inset;
  const rOuter = size * 0.30 * scale;
  const rInner = size * 0.185 * scale;
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);

  if (d > size * 0.46 * scale) return [...BG, 0];

  if (d <= rOuter && d >= rInner) return [...OX, 255];

  const candleY = dy - size * 0.02;
  const flame = Math.hypot(dx, candleY * 1.7) < size * 0.045 * scale;
  if (flame) return [...EMBER, 255];

  if (d < rInner) {
    const halo = Math.hypot(dx, candleY * 1.7);
    if (halo < size * 0.13 * scale) return [...EMBER, Math.round(90 * (1 - halo / (size * 0.13 * scale)))];
    return [...BG, 255];
  }

  return [...BG, 0];
}

for (const [name, size, inset] of [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.72],
]) {
  const data = png(size, (x, y, s) => icon(x, y, s, inset));
  writeFileSync(resolve(outDir, name), data);
  console.log(`${name}: ${size}x${size}, ${data.length} bytes`);
}
