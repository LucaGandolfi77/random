// Dependency-free PNG generator for the QBIT app icons.
// The mark is a "Q" that is simultaneously a ring, a wave, and a particle.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')
mkdirSync(OUT, { recursive: true })

const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mix = (a, b, t) => a + (b - a) * t
const rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

const VIOLET = rgb('#8b5cf6')
const CYAN = rgb('#22d3ee')
const PINK = rgb('#ff4ecd')
const INK = rgb('#0a0616')

// coverage of a signed distance field, antialiased over ~1px
const cov = (d, aa) => clamp01(0.5 - d / aa)

const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const over = (dst, col, a) => [
  mix(dst[0], col[0], a),
  mix(dst[1], col[1], a),
  mix(dst[2], col[2], a),
]

function renderIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4)
  // maskable icons must keep their content inside the inner 80% safe zone
  const extent = maskable ? size * 0.6 : size * 0.78
  const ringR = 0.7
  const ringW = 0.095
  const c = size / 2
  const aa = 1.6 / extent

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5 - c) / extent
      const v = (y + 0.5 - c) / extent
      const r = Math.hypot(u, v)

      // deep-space wash with a violet halo behind the mark
      let col = lerp3(INK, [26, 12, 58], clamp01(1.1 - r * 0.95))
      col = over(col, [72, 34, 140], Math.exp(-r * 2.6) * 0.7)

      // the ring of the Q
      const ringA = cov(Math.abs(r - ringR) - ringW, aa)
      const ringCol = lerp3(VIOLET, CYAN, clamp01((Math.atan2(v, u) + Math.PI) / (Math.PI * 2)))
      col = over(col, ringCol, ringA)

      // a wave threading through the ring
      const waveY = Math.sin(u * 6.4) * ringR * 0.21
      const waveA = cov(Math.abs(v - waveY) - ringW * 0.62, aa) * clamp01(1.02 - r)
      col = over(col, lerp3(VIOLET, CYAN, clamp01(u + 0.5)), waveA * 0.95)

      // the tail of the Q, sweeping out to the lower right
      const tx = u - ringR * 0.72
      const ty = v - ringR * 0.72
      const tailAng = Math.atan2(ty, tx)
      const tailA = cov(Math.abs(Math.hypot(tx, ty) - ringR * 0.46) - ringW * 0.85, aa) *
        clamp01((tailAng - 0.1) / 0.45) *
        (tailAng > 0 ? 1 : 0)
      col = over(col, PINK, tailA)

      // the particle: a bright dot caught at the crest of the wave
      const pA = cov(Math.hypot(u + ringR * 0.54, v - 0.0) - ringW * 0.95, aa * 1.5)
      col = over(col, [255, 252, 255], pA * pA)

      const i4 = (y * size + x) * 4
      buf[i4] = col[0] | 0
      buf[i4 + 1] = col[1] | 0
      buf[i4 + 2] = col[2] | 0
      buf[i4 + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

for (const size of [64, 128, 192, 512]) {
  writeFileSync(resolve(OUT, `icon-${size}.png`), renderIcon(size, false))
  process.stdout.write(`icon-${size}.png `)
}
writeFileSync(resolve(OUT, 'maskable-512.png'), renderIcon(512, true))
console.log('maskable-512.png')
