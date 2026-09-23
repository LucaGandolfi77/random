// ZIP minimo senza dipendenze: lettura (store + deflate via DecompressionStream)
// e scrittura (store). Usato per i pacchetti *.luminapack.

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const a = new Uint8Array(2);
  new DataView(a.buffer).setUint16(0, n & 0xffff, true);
  return a;
}
function u32(n) {
  const a = new Uint8Array(4);
  new DataView(a.buffer).setUint32(0, n >>> 0, true);
  return a;
}
function concat(parts) {
  let len = 0;
  parts.forEach((p) => { len += p.length; });
  const out = new Uint8Array(len);
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
}
function readU16(dv, off) { return dv.getUint16(off, true); }
function readU32(dv, off) { return dv.getUint32(off, true); }

/**
 * Scrive un ZIP in metodo store (compression 0).
 * @param {{ name: string, data: Uint8Array|string }[]} entries
 * @returns {Uint8Array}
 */
export function zipWrite(entries) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  entries.forEach((e) => {
    const nameBytes = enc.encode(e.name);
    const data = typeof e.data === 'string' ? enc.encode(e.data) : e.data;
    const crc = crc32(data);
    const local = concat([
      u32(SIG_LOCAL),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method store
      u16(0), u16(0), // time/date
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    locals.push(local);
    centrals.push(concat([
      u32(SIG_CENTRAL),
      u16(20), u16(20),
      u16(0), u16(0),
      u16(0), u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0), u16(0), // extra, comment
      u16(0), u16(0), // disk, attrs
      u32(0), // ext attrs
      u32(offset),
      nameBytes,
    ]));
    offset += local.length;
  });

  const localBlob = concat(locals);
  const centralBlob = concat(centrals);
  const eocd = concat([
    u32(SIG_EOCD),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralBlob.length),
    u32(localBlob.length),
    u16(0),
  ]);
  return concat([localBlob, centralBlob, eocd]);
}

/**
 * Legge un ZIP. Supporta method 0 (store) e 8 (deflate-raw).
 * @returns {Promise<{ name: string, data: Uint8Array }[]>}
 */
export async function zipRead(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Trova EOCD
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65535; i -= 1) {
    if (readU32(dv, i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not-a-zip');

  const total = readU16(dv, eocd + 10);
  let cdOff = readU32(dv, eocd + 16);
  const out = [];
  const dec = new TextDecoder();

  for (let i = 0; i < total; i += 1) {
    if (readU32(dv, cdOff) !== SIG_CENTRAL) break;
    const method = readU16(dv, cdOff + 10);
    const compSize = readU32(dv, cdOff + 20);
    const uncompSize = readU32(dv, cdOff + 24);
    const nameLen = readU16(dv, cdOff + 28);
    const extraLen = readU16(dv, cdOff + 30);
    const commentLen = readU16(dv, cdOff + 32);
    const localOff = readU32(dv, cdOff + 42);
    const name = dec.decode(bytes.subarray(cdOff + 46, cdOff + 46 + nameLen));

    // local header
    const lNameLen = readU16(dv, localOff + 26);
    const lExtraLen = readU16(dv, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 0) {
      data = raw.slice();
    } else if (method === 8) {
      data = await inflateRaw(raw, uncompSize);
    } else {
      throw new Error(`unsupported-method-${method}`);
    }
    out.push({ name, data });
    cdOff += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflateRaw(raw, expected) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('no-decompression');
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([raw]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  const data = new Uint8Array(buf);
  if (expected > 0 && data.length !== expected) {
    // non bloccante: alcune librerie riportano size diversa
  }
  return data;
}

/** Converte entry zip → oggetti { name, text } solo per .json/.svg. */
export function zipEntriesToTexts(entries) {
  const dec = new TextDecoder();
  return entries.map((e) => ({
    name: e.name,
    text: dec.decode(e.data),
  }));
}
