import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'icons');
mkdirSync(outDir, { recursive: true });

const svgTemplate = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`;

const iconSvg = svgTemplate(`
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#2a1f4d"/>
      <stop offset="100%" stop-color="#0f0a26"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="translate(256 240)">
    <polygon points="0,-150 130,-75 130,75 0,150 -130,75 -130,-75" fill="none" stroke="#8fbdff" stroke-width="8"/>
    <polygon points="0,-90 80,-50 80,10 0,90 -80,10 -80,-50" fill="none" stroke="#f4d58d" stroke-width="6"/>
    <circle r="28" fill="#b48bdf"/>
    <circle cx="0" cy="0" r="10" fill="#0f0a26"/>
  </g>
  <circle cx="80" cy="100" r="6" fill="#f4d58d" opacity="0.7"/>
  <circle cx="410" cy="400" r="7" fill="#8fbdff" opacity="0.6"/>
  <circle cx="420" cy="90" r="5" fill="#b48bdf" opacity="0.7"/>
  <circle cx="70" cy="420" r="5" fill="#f4d58d" opacity="0.6"/>
`);
const maskableSvg = svgTemplate(`
  <rect width="512" height="512" fill="#0f0a26"/>
  <g transform="translate(256 240) scale(1.1)">
    <polygon points="0,-150 130,-75 130,75 0,150 -130,75 -130,-75" fill="none" stroke="#8fbdff" stroke-width="10"/>
    <polygon points="0,-80 70,-45 70,15 0,90 -70,15 -70,-45" fill="#241a52"/>
    <circle r="30" fill="#f4d58d"/>
  </g>
`);

writeFileSync(join(outDir, 'icon-192.svg'), svgTemplate(`
  <defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="#2a1f4d"/><stop offset="100%" stop-color="#0f0a26"/></radialGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="translate(256 240) scale(0.85)"><polygon points="0,-150 130,-75 130,75 0,150 -130,75 -130,-75" fill="none" stroke="#8fbdff" stroke-width="10"/><polygon points="0,-90 80,-50 80,10 0,90 -80,10 -80,-50" fill="none" stroke="#f4d58d" stroke-width="6"/><circle r="28" fill="#b48bdf"/></g>
  <circle cx="80" cy="100" r="6" fill="#f4d58d" opacity="0.7"/><circle cx="410" cy="400" r="7" fill="#8fbdff" opacity="0.6"/>
`));
writeFileSync(join(outDir, 'icon-512.svg'), iconSvg);
writeFileSync(join(outDir, 'maskable-512.svg'), maskableSvg);

async function generatePNG(svgString, size, out) {
  const svgFile = join(outDir, `tmp-${size}.svg`);
  writeFileSync(svgFile, svgString.replace('viewBox="0 0 512 512"', `width="${size}" height="${size}"`));
  try {
    const { default: { createCanvas, loadImage } } = await import('canvas');
    const img = await loadImage(svgFile);
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    writeFileSync(out, canvas.toBuffer('image/png'));
  } catch { /* png skipped */ }
}
await generatePNG(svgTemplate(), 192, join(outDir, 'icon-192.png'));
await generatePNG(iconSvg, 512, join(outDir, 'icon-512.png'));
await generatePNG(maskableSvg, 512, join(outDir, 'maskable-512.png'));

try {
  const { createCanvas } = (await import('canvas')).default;
  const c = createCanvas(180, 180);
  writeFileSync(join(outDir, 'apple-touch-icon-180.png'), c.toBuffer('image/png'));
} catch { /* png skipped */ }
console.log('icons generated (SVG + PNG)');
