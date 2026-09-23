// core/qr.js — encoder QR minimale (byte mode, v1-4, EC=M). Zero deps.
// Auto-mask (sceglie la maschera a penalità minima).
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const EC_M = {
  1: { total: 26, ec: 10 }, 2: { total: 44, ec: 16 }, 3: { total: 70, ec: 26 },
  4: { total: 100, ec: 36 },
};
const GFM = [0x11D, 0x12B, 0x137, 0x163, 0x147]; // EC levels M,B,L,Q,H (only M used here)
const GF = GFM[1]; // EC M

function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const h = a & 0x80;
    a = (a << 1) & 0xFF;
    if (h) a ^= GF;
    b >>= 1;
  }
  return p;
}

function rsBlock(data, ecLen) {
  const poly = new Array(ecLen + 1).fill(0);
  poly[0] = 1;
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ poly[0];
    for (let j = 0; j < ecLen; j++) poly[j] = poly[j + 1] ^ gmul(coef, GFM[1 - j]); // placeholder
  }
  return poly.slice(1);
}

function reedSolomon(data, ecLen) {
  const gen = [1];
  for (let i = 0; i < ecLen; i++) {
    gen.push(0);
    for (let j = gen.length - 1; j > 0; j--) gen[j] = gen[j - 1] ^ gmul(gen[j], 2);
    gen[0] = gmul(gen[0], 2);
  }
  const msg = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i] ^ gen[0];
    if (coef) for (let j = 0; j < gen.length; j++) msg[i + j] ^= gmul(coef, gen[j]);
  }
  return msg.slice(data.length);
}

function bitLengthByte(data) {
  let l = 4 + 8; // mode + char count (v1-9 use 8-bit count)
  for (const c of data) l += 8;
  return l;
}

function fitsVersion(dataLenBits) {
  for (let v = 1; v <= 4; v++) {
    const cap = EC_M[v].total * 8;
    if (dataLenBits + 4 + 18 <= cap) return v; // data + mode+count + terminator+pad
  }
  return 4;
}

export function encodeQR(text) {
  const bytes = new TextEncoder().encode(text);
  const dataBits = bitLengthByte(bytes);
  const v = fitsVersion(dataBits);
  const cap = EC_M[v].total * 8;
  const ecLen = EC_M[v].ec;
  // Build data bitstream: mode(4) + count(8) + bytes + terminator + pad
  const bits = [];
  const pushBits = (n, len) => { for (let i = len - 1; i >= 0; i--) bits.push((n >> i) & 1); };
  pushBits(4, 4); // byte mode
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  // terminator
  const term = Math.min(4, cap - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  // pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // pad words
  let padByte = 0xEC;
  while (bits.length < cap) { bits.push((padByte >> 7) & 1, (padByte >> 6) & 1, (padByte >> 5) & 1, (padByte >> 4) & 1, (padByte >> 3) & 1, (padByte >> 2) & 1, (padByte >> 1) & 1, padByte & 1); padByte = padByte === 0xEC ? 0x11 : 0xEC; }

  // Bytes for RS
  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) byte = (byte << 1) | bits[i + j];
    dataBytes.push(byte);
  }
  const ec = reedSolomon(dataBytes, ecLen);
  const allBytes = [...dataBytes, ...ec];

  const size = 21 + (v - 1) * 4;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(-1));
  const isFunction = (r, c) => {
    const f = (a, b) => (Math.floor(a / 3) === Math.floor(b / 3) ? 0 : 1) * (((a % 3) + (b % 3)) % 2 === 0 ? 1 : 0) * 0;
    if (r < 9 && c < 9) return true; // finder top-left
    if (r < 9 && c >= size - 8) return true; // finder top-right
    if (r >= size - 8 && c < 9) return true; // finder bottom-left
    for (let i = 0; i < 8; i++) { if (r === 6 || c === 6) return true; } // timing
    return false;
  };
  // Place function patterns explicitly
  const placeFinder = (row, col) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const edge = r === 0 || r === 6 || c === 0 || c === 6;
      const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r][col + c] = edge || inner ? 1 : 0;
    }
  };
  placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);
  for (let i = 0; i < 8; i++) {
    if (i !== 6) { matrix[6][i] = 1; matrix[i][6] = 1; }
    const a = size - 8 + i;
    if (a !== 6) { matrix[6][a] = 1; matrix[a][6] = 1; }
  }
  // Dark module
  matrix[size - 8][8] = 1;

  // Place data bits
  let bitIdx = 0;
  const up = (c) => c;
  let col = size - 1;
  let direction = -1;
  while (col >= 0) {
    if (col === 6) col--;
    for (let r = direction === -1 ? size - 1 : 0; r >= 0 && r < size; r += direction) {
      if (matrix[r][col] === -1) {
        if (bitIdx < allBytes.length * 8) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          matrix[r][col] = (allBytes[byteIdx] >> bitPos) & 1;
        } else {
          matrix[r][col] = 0;
        }
        bitIdx++;
      }
    }
    col += direction;
    direction = -direction;
  }

  // Mask (choose best by penalty, mask 0..7, fixed mask 0 fallback)
  const maskFn = (m, r, c) => {
    switch (m) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
      default: return false;
    }
  };
  let best = null, bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const m2 = matrix.map((row) => row.map((cell, c) => cell === -1 ? (maskFn(m, matrix.indexOf(row), c) ? 1 : 0) : cell));
    let penalty = 0;
    // adjacent same color
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      let run = 1;
      while (c + run < size && m2[r][c + run] === m2[r][c]) run++;
      if (run >= 5) penalty += run - 2;
      c += run - 1;
    }
    if (penalty < bestPenalty) { bestPenalty = penalty; best = m2; }
  }
  return best;
}
