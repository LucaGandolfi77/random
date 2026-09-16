#!/usr/bin/env node
/**
 * gen-icons.js — genera le icone PWA di Keyfall come PNG veri.
 * Encoder PNG minimale in puro Node (zlib + CRC32), nessuna dipendenza.
 * Disegno: tastiera in basso + barre luminose che cadono (motivo del logo).
 *
 * Uso: node tools/gen-icons.js
 */
'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/* ── PNG encoder ─────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

/* ── color helpers ───────────────────────────────────────── */
const BG_TOP = [20, 22, 42]
const BG_BOT = [7, 8, 15]
const WHITE = [246, 243, 236]
const BLACK = [6, 7, 11]
const BARS = [
  { x: 0.28, w: 0.075, from: 0.30, c: [255, 93, 143] },
  { x: 0.43, w: 0.075, from: 0.16, c: [255, 209, 102] },
  { x: 0.58, w: 0.075, from: 0.38, c: [56, 214, 192] },
  { x: 0.73, w: 0.075, from: 0.24, c: [122, 140, 255] },
]

function mix(c1, c2, t) {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ]
}

function designColor(u, v) {
  // background gradient with soft glows
  let col = mix(BG_TOP, BG_BOT, Math.min(1, v * 1.15))
  const glows = [
    [0.26, 0.45, BARS[0].c], [0.43, 0.4, BARS[1].c], [0.58, 0.5, BARS[2].c], [0.74, 0.42, BARS[3].c],
  ]
  for (const [gx, gy, gc] of glows) {
    const d = Math.hypot(u - gx, v - gy)
    if (d < 0.55) col = mix(col, gc, (1 - d / 0.55) * 0.15)
  }

  // rounded falling bars
  for (const b of BARS) {
    if (u < b.x - b.w || u > b.x + b.w || v < b.from || v > 0.8) continue
    const rad = b.w * 0.95
    if (v - b.from < rad) {
      const dx = (u - b.x) / rad
      const dy = (v - b.from) / rad
      if (dx * dx + dy * dy > 1) continue // rounded top cap
    }
    const t = (v - b.from) / (0.8 - b.from)
    let c = mix(b.c, WHITE, 0.3 + 0.3 * (1 - Math.abs(u - b.x) / b.w))
    c = mix(c, [0, 0, 0], t * 0.35)
    col = c
    return col
  }

  // keyboard
  if (v >= 0.8) {
    const kt = (v - 0.8) / 0.2
    const blackRects = [[0.115, 0.235], [0.365, 0.485], [0.615, 0.735], [0.865, 0.985]]
    for (const [a, b2] of blackRects) {
      if (u >= a && u <= b2) {
        return kt < 0.6 ? mix(BLACK, [30, 34, 58], 0.25) : mix(BLACK, [10, 11, 20], 0.1)
      }
    }
    const whiteRects = [[0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1]]
    for (const [a, b2] of whiteRects) {
      if (u >= a && u <= b2) {
        return mix(WHITE, [128, 124, 118], Math.min(1, Math.max(0, (kt - 0.35) * 1.5)) * 0.85)
      }
    }
  }
  return col
}

/* signed distance to a rounded rect; < 0 inside */
function roundedRectSDF(u, v, rr) {
  const qx = Math.abs(u - 0.5) - (0.5 - rr)
  const qy = Math.abs(v - 0.5) - (0.5 - rr)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr
}

function render(size, opts) {
  const SS = 4
  const rgba = Buffer.alloc(size * size * 4)
  const aa = size > 256 ? 1.5 : 2.2 // antialias band (px)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size
          const v = (py + (sy + 0.5) / SS) / size
          let alpha = 1
          if (opts.rounded) {
            const d = roundedRectSDF(u, v, 0.2)
            alpha = d >= 0 ? 0 : Math.min(1, -d * size / aa)
          }
          if (alpha <= 0) continue
          const c = designColor(u, v)
          r += c[0] * alpha; g += c[1] * alpha; b += c[2] * alpha; a += alpha; n++
        }
      }
      const i = (py * size + px) * 4
      if (!n) continue
      rgba[i] = Math.round(r / n)
      rgba[i + 1] = Math.round(g / n)
      rgba[i + 2] = Math.round(b / n)
      rgba[i + 3] = Math.round((a / n) * 255)
    }
  }
  return rgba
}

const OUT = path.join(__dirname, '..', 'icons')
fs.mkdirSync(OUT, { recursive: true })

function write(name, size, opts) {
  fs.writeFileSync(path.join(OUT, name), encodePNG(size, size, render(size, opts)))
  console.log('scritto icons/' + name + ' (' + size + '×' + size + ')')
}

write('icon-192.png', 192, { rounded: true })
write('icon-512.png', 512, { rounded: true })
write('icon-maskable-512.png', 512, { rounded: false })
console.log('icone OK')
