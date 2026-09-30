// A minimal GIF89a encoder: decode PNG frames (via zlib), quantize to a fixed
// palette, and write an animated GIF with LZW compression.
//
// This exists because the ffmpeg binary that ships with Playwright is built
// without the image2 demuxer, so it cannot read a numbered PNG sequence. A
// dependency-free encoder is less code than working around that.
import { inflateSync, deflateSync } from 'node:zlib';

export function decodePng(buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colourType = 6;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colourType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  if (colourType !== 6 && colourType !== 2) throw new Error(`unsupported PNG colour type ${colourType}`);

  const channels = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const previous = y === 0 ? null : raw.subarray((y - 1) * (stride + 1) + 1, (y - 1) * (stride + 1) + 1 + stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = previous === null ? 0 : previous[x];
      const upLeft = previous === null || x < channels ? 0 : previous[x - channels];
      let value = line[x];

      switch (filter) {
        case 1: value += left; break;
        case 2: value += up; break;
        case 3: value += (left + up) >> 1; break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          break;
        }
        default: break;
      }

      line[x] = value & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 3;
      pixels[to] = line[from];
      pixels[to + 1] = line[from + 1];
      pixels[to + 2] = line[from + 2];
    }
  }

  return { width, height, pixels };
}

function buildPalette(frames) {
  const counts = new Map();
  for (const frame of frames) {
    for (let i = 0; i < frame.pixels.length; i += 3) {
      const key = (frame.pixels[i] << 16) | (frame.pixels[i + 1] << 8) | frame.pixels[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length <= 256) {
    const palette = sorted.map(([key]) => [(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
    while (palette.length < 256) palette.push([0, 0, 0]);
    return palette;
  }

  const cube = 6;
  const centres = [];
  for (let r = 0; r < cube; r += 1) {
    for (let g = 0; g < cube; g += 1) {
      for (let b = 0; b < cube; b += 1) {
        const step = 255 / (cube - 1);
        centres.push([Math.round(r * step), Math.round(g * step), Math.round(b * step)]);
      }
    }
  }

  const used = new Set();
  for (const [key] of sorted) {
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < centres.length; i += 1) {
      const centre = centres[i];
      if (centre === undefined) continue;
      const distance = (r - centre[0]) ** 2 + (g - centre[1]) ** 2 + (b - centre[2]) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    used.add(best);
  }

  const palette = [...used].sort((a, b) => a - b).map((index) => {
    const centre = centres[index];
    return centre ?? [0, 0, 0];
  });
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

function indexFrame(frame, palette) {
  const out = Buffer.alloc(frame.width * frame.height);
  for (let i = 0; i < out.length; i += 1) {
    const r = frame.pixels[i * 3];
    const g = frame.pixels[i * 3 + 1];
    const b = frame.pixels[i * 3 + 2];
    let best = 0;
    let bestDistance = Infinity;
    for (let p = 0; p < palette.length; p += 1) {
      const entry = palette[p];
      if (entry === undefined) continue;
      const distance = (r - entry[0]) ** 2 + (g - entry[1]) ** 2 + (b - entry[2]) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = p;
      }
    }
    out[i] = best;
  }
  return out;
}

export function lzwDecode(data, minCodeSize, maxPixels = Infinity) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = [];
  let bitPos = 0;
  let previous = null;

  const readCode = () => {
    let value = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      if (bitPos >> 3 >= data.length) return -1;
      value |= ((data[bitPos >> 3] >> (bitPos & 7)) & 1) << bit;
      bitPos += 1;
    }
    return value;
  };

  const widen = () => {
    if (nextCode >= 1 << codeSize && codeSize < 12) codeSize += 1;
  };



  const reset = () => {
    dictionary = [];
    for (let i = 0; i < clearCode; i += 1) dictionary[i] = [i];
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  reset();

  const out = [];
  for (;;) {
    const code = readCode();
    if (code < 0 || code === endCode) break;
    if (code === clearCode) {
      reset();
      previous = null;
      continue;
    }

    let entry;
    if (dictionary[code] !== undefined) entry = dictionary[code];
    else if (code === nextCode && previous !== null) entry = [...previous, previous[0] ?? 0];
    else throw new Error(`corrupt lzw stream: code ${code} with next ${nextCode}`);

    out.push(...entry);
    if (out.length >= maxPixels) break;

    if (previous !== null && nextCode < 4096) {
      dictionary[nextCode] = [...previous, entry[0] ?? 0];
      nextCode += 1;
      widen();
    }
    previous = entry;
  }

  return out;
}

export function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;

  const bits = [];
  const emit = (code) => {
    for (let bit = 0; bit < codeSize; bit += 1) bits.push((code >> bit) & 1);
  };

  let dictionary = new Map();
  const resetDictionary = () => {
    dictionary = new Map();
    for (let i = 0; i < clearCode; i += 1) dictionary.set(`${i}`, i);
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  resetDictionary();
  emit(clearCode);

  let prefix = null;
  for (const index of indices) {
    if (prefix === null) {
      prefix = String(index);
      continue;
    }

    const candidate = `${prefix},${index}`;
    const found = dictionary.get(candidate);
    if (found !== undefined) {
      prefix = candidate;
      continue;
    }

    emit(dictionary.get(prefix) ?? 0);

    if (nextCode < 4096) {
      dictionary.set(candidate, nextCode);
      nextCode += 1;
    }
    if (nextCode > 1 << codeSize && codeSize < 12) codeSize += 1;
    if (nextCode >= 4096) {
      emit(clearCode);
      resetDictionary();
    }

    prefix = String(index);
  }

  if (prefix !== null) emit(dictionary.get(prefix) ?? 0);
  emit(endCode);
  while (bits.length % 8 !== 0) bits.push(0);

  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i += 1) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value |= bits[i * 8 + bit] << bit;
    bytes[i] = value;
  }
  return Buffer.from(bytes);
}

function subBlocks(data) {
  const parts = [];
  for (let i = 0; i < data.length; i += 255) {
    const slice = data.subarray(i, i + 255);
    parts.push(Buffer.from([slice.length]), slice);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

// GIF blocks are fixed-layout, not length-prefixed: the Global Color Table
// follows the packed byte directly, the Graphic Control Extension is a 4-byte
// body, and the Image Descriptor carries its own geometry. There is no CRC.
const EXT_GRAPHIC_CONTROL = Buffer.from([0x21, 0xf9]);
const EXT_IMAGE_DESCRIPTOR = Buffer.from([0x2c]);
const TRAILER = Buffer.from([0x3b]);

function graphicControl(delayCentiseconds) {
  return Buffer.concat([
    EXT_GRAPHIC_CONTROL,
    Buffer.from([0x04, 0x00]),
    u16(delayCentiseconds),
    Buffer.from([0x00, 0x00]),
  ]);
}

function imageDescriptor(width, height) {
  return Buffer.concat([
    EXT_IMAGE_DESCRIPTOR,
    u16(0),
    u16(0),
    u16(width),
    u16(height),
    Buffer.from([0x00]),
  ]);
}

export function encodeGif(frames, { delayCentiseconds = 25 } = {}) {
  const decoded = frames.map((frame) => (Buffer.isBuffer(frame) ? decodePng(frame) : frame));
  const { width, height } = decoded[0] ?? { width: 0, height: 0 };
  const palette = buildPalette(decoded);
  const minCodeSize = Math.max(2, Math.min(8, Math.ceil(Math.log2(palette.length))));

  // The global colour table must be a power of two in size, and the field in the
  // packed byte counts the size as a power, so both derive from the palette length.
  const tableBits = Math.max(1, Math.min(8, Math.ceil(Math.log2(palette.length))));
  const tableEntries = 2 ** tableBits;

  const header = Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    u16(width),
    u16(height),
    Buffer.from([0x80 | (tableBits - 1), 0x00, 0x00]),
  ]);

  const paletteBytes = Buffer.alloc(tableEntries * 3);
  palette.forEach((colour, index) => {
    paletteBytes[index * 3] = colour[0];
    paletteBytes[index * 3 + 1] = colour[1];
    paletteBytes[index * 3 + 2] = colour[2];
  });

  const parts = [header, paletteBytes];

  for (const frame of decoded) {
    const indices = indexFrame(frame, palette);
    parts.push(graphicControl(delayCentiseconds));
    parts.push(imageDescriptor(frame.width, frame.height));
    parts.push(Buffer.from([minCodeSize]));
    parts.push(subBlocks(lzwEncode(indices, minCodeSize)));
  }

  parts.push(TRAILER);
  return Buffer.concat(parts);
}

export { deflateSync };
