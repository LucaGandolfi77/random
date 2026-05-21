import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const iconsDirectory = fileURLToPath(new URL('../public/icons/', import.meta.url))

const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="64" y1="44" x2="448" y2="468" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FF7A45"/>
      <stop offset="0.48" stop-color="#10E0C6"/>
      <stop offset="1" stop-color="#7F5FFF"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(256 148) rotate(90) scale(184)">
      <stop stop-color="#FFFFFF" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="dog" x1="256" y1="140" x2="256" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F5C28A"/>
      <stop offset="1" stop-color="#BC6031"/>
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="472" height="472" rx="132" fill="#090914"/>
  <rect x="32" y="32" width="448" height="448" rx="120" fill="url(#bg)"/>
  <circle cx="256" cy="156" r="136" fill="url(#glow)"/>
  <rect x="164" y="120" width="184" height="266" rx="92" fill="url(#dog)"/>
  <rect x="184" y="184" width="144" height="14" rx="7" fill="#7F341A" fill-opacity="0.28"/>
  <rect x="184" y="236" width="144" height="14" rx="7" fill="#7F341A" fill-opacity="0.28"/>
  <rect x="184" y="288" width="144" height="14" rx="7" fill="#7F341A" fill-opacity="0.28"/>
  <circle cx="392" cy="130" r="36" fill="#FFFFFF" fill-opacity="0.18"/>
  <path d="M132 368C160 334 203 316 256 316C309 316 352 334 380 368" stroke="#FFFFFF" stroke-opacity="0.24" stroke-width="28" stroke-linecap="round"/>
</svg>
`

await mkdir(iconsDirectory, { recursive: true })

await writeFile(fileURLToPath(new URL('../public/icons/wurstverse-icon.svg', import.meta.url)), iconSvg)

await Promise.all([
  sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile(fileURLToPath(new URL('../public/icons/icon-192.png', import.meta.url))),
  sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(fileURLToPath(new URL('../public/icons/icon-512.png', import.meta.url))),
  sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(fileURLToPath(new URL('../public/icons/icon-maskable-512.png', import.meta.url))),
  sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(fileURLToPath(new URL('../public/icons/apple-touch-icon.png', import.meta.url))),
])