import { describe, expect, it } from 'vitest';
import { decodePng, encodeGif, lzwDecode, lzwEncode } from '../tools/gif.mjs';
import { deflateSync, inflateSync } from 'node:zlib';

function crc32(buffer) {
  let c = 0xffffffff;
  const table = crcTable();
  for (let i = 0; i < buffer.length; i += 1) c = table[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

let cached = null;
function crcTable() {
  if (cached !== null) return cached;
  cached = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    cached[n] = c;
  }
  return cached;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function applyFilter(filter, line, previous, channels) {
  const out = Buffer.alloc(line.length);
  for (let x = 0; x < line.length; x += 1) {
    const raw = line[x];
    const left = x >= channels ? line[x - channels] : 0;
    const up = previous === null ? 0 : previous[x];
    const upLeft = previous === null || x < channels ? 0 : previous[x - channels];

    switch (filter) {
      case 1: out[x] = (raw - left) & 0xff; break;
      case 2: out[x] = (raw - up) & 0xff; break;
      case 3: out[x] = (raw - ((left + up) >> 1)) & 0xff; break;
      case 4: {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        out[x] = (raw - predicted) & 0xff;
        break;
      }
      default: out[x] = raw; break;
    }
  }
  return out;
}

function makePng(width, height, painter, { filter = 0 } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  let previousLine = null;

  for (let y = 0; y < height; y += 1) {
    const offset = y * (stride + 1);
    const line = Buffer.alloc(stride);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = painter(x, y);
      line[x * 4] = r;
      line[x * 4 + 1] = g;
      line[x * 4 + 2] = b;
      line[x * 4 + 3] = a;
    }
    raw[offset] = filter;
    applyFilter(filter, line, previousLine, 4).copy(raw, offset + 1);
    previousLine = line;
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function solid(r, g, b) {
  return makePng(16, 16, () => [r, g, b, 255]);
}

function gradient() {
  return makePng(32, 16, (x, y) => [x * 8, y * 16, 64, 255]);
}

describe('decodePng', () => {
  it('reads dimensions and pixels of an uncompressed png', () => {
    const decoded = decodePng(solid(20, 17, 14));
    expect(decoded.width).toBe(16);
    expect(decoded.height).toBe(16);
    expect([...decoded.pixels.subarray(0, 3)]).toEqual([20, 17, 14]);
  });

  it('reads a gradient', () => {
    const decoded = decodePng(gradient());
    const at = (x, y) => [...decoded.pixels.subarray((y * decoded.width + x) * 3, (y * decoded.width + x) * 3 + 3)];
    expect(at(0, 0)).toEqual([0, 0, 64]);
    expect(at(4, 1)).toEqual([32, 16, 64]);
  });

  it('reassembles rows filtered with each png filter type', () => {
    for (const filter of [0, 1, 2, 3, 4]) {
      const decoded = decodePng(makePng(8, 8, (x) => [(x * 30) & 0xff, 40, 90, 255], { filter }));
      const blue = decoded.pixels[(3 * decoded.width + 3) * 3 + 2];
      expect(`filter ${filter} blue: ${blue}`).toBe('filter ' + filter + ' blue: 90');
    }
  });

  it('rejects an unsupported bit depth', () => {
    const png = solid(1, 1, 1);
    png[24] = 16;
    expect(() => decodePng(png)).toThrow(/bit depth/);
  });

  it('rejects an unsupported colour type', () => {
    const png = solid(1, 1, 1);
    png[25] = 3;
    expect(() => decodePng(png)).toThrow(/colour type/);
  });
});

function readGif(gif) {
  expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  const width = gif.readUInt16LE(6);
  const height = gif.readUInt16LE(8);
  const packed = gif[10] ?? 0;
  const hasTable = (packed & 0x80) !== 0;
  const tableEntries = 2 ** ((packed & 0x07) + 1);

  let offset = 13;
  const palette = [];
  if (hasTable) {
    for (let i = 0; i < tableEntries; i += 1) {
      palette.push([gif[offset + i * 3], gif[offset + i * 3 + 1], gif[offset + i * 3 + 2]]);
    }
    offset += tableEntries * 3;
  }

  const frames = [];
  const delays = [];

  while (offset < gif.length) {
    const marker = gif[offset];
    if (marker === 0x3b) break;

    if (marker === 0x21) {
      const label = gif[offset + 1];
      const size = gif[Math.min(offset + 2, gif.length - 1)] ?? 0;
      if (label === 0xf9) delays.push(gif.readUInt16LE(offset + 4));
      offset += 3 + size;
      while ((gif[offset] ?? 0) !== 0) offset += 1 + (gif[offset] ?? 0);
      offset += 1;
      continue;
    }

    if (marker === 0x2c) {
      const left = gif.readUInt16LE(offset + 1);
      const top = gif.readUInt16LE(offset + 3);
      const frameWidth = gif.readUInt16LE(offset + 5);
      const frameHeight = gif.readUInt16LE(offset + 7);
      const framePacked = gif[offset + 9] ?? 0;
      offset += 10;
      if ((framePacked & 0x80) !== 0) offset += 2 ** ((framePacked & 0x07) + 1) * 3;
      const minCodeSize = gif[offset] ?? 0;
      offset += 1;

      const data = [];
      while ((gif[offset] ?? 0) !== 0) {
        const len = gif[offset] ?? 0;
        data.push(gif.subarray(offset + 1, offset + 1 + len));
        offset += 1 + len;
      }
      offset += 1;

      frames.push({ left, top, width: frameWidth, height: frameHeight, data: Buffer.concat(data), minCodeSize });
      continue;
    }

    throw new Error(`unexpected gif marker 0x${marker?.toString(16)} at ${offset}`);
  }

  return { width, height, palette, frames, delays, consumed: offset, last: gif[gif.length - 1] };
}

describe('encodeGif structure', () => {
  it('writes a valid header, trailer and one frame per input', () => {
    const gif = encodeGif([solid(20, 17, 14), solid(30, 20, 10)]);
    const parsed = readGif(gif);
    expect(parsed.width).toBe(16);
    expect(parsed.height).toBe(16);
    expect(parsed.frames).toHaveLength(2);
    expect(parsed.last).toBe(0x3b);
    expect(parsed.consumed).toBe(gif.length - 1);
  });

  it('declares a power-of-two colour table', () => {
    const gif = encodeGif([gradient()]);
    const entries = 2 ** (((gif[10] ?? 0) & 0x07) + 1);
    expect([2, 4, 8, 16, 32, 64, 128, 256]).toContain(entries);
    expect((gif[10] ?? 0) & 0x80).not.toBe(0);
  });

  it('carries the requested delay on every frame', () => {
    const gif = encodeGif([solid(1, 2, 3), solid(4, 5, 6), solid(7, 8, 9)], { delayCentiseconds: 40 });
    const parsed = readGif(gif);
    expect(parsed.delays).toEqual([40, 40, 40]);
  });

  it('handles a single frame', () => {
    expect(readGif(encodeGif([solid(9, 9, 9)])).frames).toHaveLength(1);
  });
});

describe('encodeGif lzw round trip', () => {
  it('survives a real screenshot: pixels decode back to their colours', () => {
    const source = gradient();
    const gif = encodeGif([source]);
    const parsed = readGif(gif);
    const frame = parsed.frames[0];
    expect(frame).toBeDefined();

    const indices = lzwDecode(frame.data, frame.minCodeSize);
    const original = decodePng(source);

    expect(indices).toHaveLength(original.width * original.height);

    let worst = 0;
    for (let i = 0; i < indices.length; i += 1) {
      const colour = parsed.palette[indices[i] as number] ?? [0, 0, 0];
      for (let channel = 0; channel < 3; channel += 1) {
        worst = Math.max(worst, Math.abs(colour[channel] - (original.pixels[i * 3 + channel] ?? 0)));
      }
    }

    expect(worst).toBeLessThan(40);
  });

  it('round trips a solid image exactly', () => {
    const parsed = readGif(encodeGif([solid(20, 17, 14)]));
    const frame = parsed.frames[0];
    const indices = lzwDecode(frame.data, frame.minCodeSize);
    expect(new Set(indices).size).toBe(1);
    expect(parsed.palette[indices[0] as number]).toEqual([20, 17, 14]);
  });

  it('round trips many frames of changing content', () => {
    const frames = [
      makePng(24, 24, (x, y) => [(x * 10) & 0xff, (y * 10) & 0xff, 30, 255]),
      makePng(24, 24, (x) => [200, (x * 8) & 0xff, 90, 255]),
      makePng(24, 24, (x, y) => [x & 0xff, y & 0xff, x & 0xff, 255]),
    ];
    const parsed = readGif(encodeGif(frames));
    expect(parsed.frames).toHaveLength(3);

    frames.forEach((source, index) => {
      const frame = parsed.frames[index];
      const indices = lzwDecode(frame.data, frame.minCodeSize);
      const original = decodePng(source);
      expect(indices).toHaveLength(24 * 24);

      for (let i = 0; i < indices.length; i += 5) {
        const colour = parsed.palette[indices[i] as number] ?? [0, 0, 0];
        const expected = [original.pixels[i * 3], original.pixels[i * 3 + 1], original.pixels[i * 3 + 2]];
        const error = Math.max(...colour.map((c, k) => Math.abs(c - (expected[k] ?? 0))));
        expect(error).toBeLessThan(48);
      }
    });
  });
});

describe('lzw round trip', () => {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const cases: Array<[number, number]> = [];
  for (const size of [2, 3, 4, 5, 6, 7, 8]) {
    for (const length of [1, 2, 10, 50, 300, 2000, 9000]) cases.push([size, length]);
  }

  for (const [size, length] of cases) {
    it(`round trips ${length} indices at code size ${size}`, () => {
      const limit = size === 8 ? 256 : 1 << size;
      const indices = Array.from({ length }, () => Math.floor(random() * limit));
      const decoded = lzwDecode(lzwEncode(indices, size), size, length);
      expect(decoded).toEqual(indices);
    });
  }

  it('round trips a solid run', () => {
    const indices = new Array<number>(5000).fill(42);
    expect(lzwDecode(lzwEncode(indices, 8), 8, indices.length)).toEqual(indices);
  });

  it('round trips a run that forces the dictionary to reset', () => {
    const indices = Array.from({ length: 60000 }, (_, i) => (i * 7919) % 256);
    const decoded = lzwDecode(lzwEncode(indices, 8), 8, indices.length);
    expect(decoded).toHaveLength(indices.length);
    expect(decoded.every((value, i) => value === indices[i])).toBe(true);
  });

  it('rejects a corrupt stream instead of returning silence', () => {
    expect(() => lzwDecode(Buffer.from([0xff, 0xff, 0xff, 0xff]), 8)).toThrow(/corrupt/);
  });
});

describe('decodePng on real output', () => {
  it('round trips through zlib unchanged', () => {
    const png = solid(3, 4, 5);
    expect([...decodePng(png).pixels.subarray(0, 3)]).toEqual([3, 4, 5]);
    expect(inflateSync(deflateSync(Buffer.from([1, 2, 3])))).toHaveLength(3);
  });

  it('decodes a large screenshot-shaped image quickly', () => {
    const wide = makePng(1280, 1397, (x, y) => [(x * 3) & 0xff, (y * 3) & 0xff, 0x0e, 255]);
    const started = performance.now();
    const decoded = decodePng(wide);
    const elapsed = performance.now() - started;
    expect(decoded.width).toBe(1280);
    expect(decoded.height).toBe(1397);
    expect(elapsed).toBeLessThan(1000);
  });

  it('rebuilds a screenshot gradient correctly', () => {
    const wide = makePng(64, 64, (x, y) => [(x * 4) & 0xff, (y * 4) & 0xff, 0x80, 255]);
    const decoded = decodePng(wide);
    const at = (x: number, y: number) => [...decoded.pixels.subarray((y * decoded.width + x) * 3, (y * decoded.width + x) * 3 + 3)];
    expect(at(0, 0)).toEqual([0, 0, 0x80]);
    expect(at(10, 10)).toEqual([40, 40, 0x80]);
    expect(at(63, 63)).toEqual([252, 252, 0x80]);
  });
});
