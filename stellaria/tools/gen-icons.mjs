import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
mkdirSync('./icons', { recursive: true });

const svgStar = '<path d="M96 30 l12 28 l30 2 l-24 22 l8 30 l-26 -16 l-26 16 l8 -30 l-24 -22 l30 -2 z" fill="#f4c963"/>';
function svg(W, H, shapes, txt) {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="bg" cx="50%" cy="40%" r="70%">
    <stop offset="0%" stop-color="#3a2d63"/><stop offset="100%" stop-color="#1a1530"/>
  </radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${shapes}
  <text x="${W/2}" y="${H - 24}" font-size="${Math.round(W/3.4)}" text-anchor="middle" fill="#d8c4ff" font-family="Arial">${txt}</text>
</svg>`;
}
writeFileSync('./icons/icon-192.svg', svg(192, 192, svgStar, '✦'));
writeFileSync('./icons/icon-512.svg', svg(512, 512, '<path d="M256 80 l32 76 l80 8 l-64 60 l16 80 l-64 -42 l-64 42 l16 -80 l-64 -60 l80 -8 z" fill="#f4c963"/>', '✦'));
writeFileSync('./icons/maskable-512.svg', svg(512, 512, '<path d="M256 100 l30 72 l76 8 l-58 54 l14 76 l-62 -40 l-62 40 l14 -76 l-58 -54 l76 -8 z" fill="#f4c963"/><rect x="200" y="360" width="112" height="112" rx="56" fill="#d8c4ff"/>', '✦'));

function pythonDraw(out, W, H, txt) {
  const py = [
    'from PIL import Image, ImageDraw, ImageFont',
    `W=${W}; H=${H}`,
    `TXT=${JSON.stringify(txt)}`,
    "im=Image.new('RGB',(W,H),'#1a1530')",
    'd=ImageDraw.Draw(im)',
    "try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',H//7)",
    'except: f=ImageFont.load_default()',
    `d.text((W//2,H//2-10), TXT, fill=(244,201,99), font=f)`,
    `im.save('${out}')`,
  ].join('\n');
  execSync('python3 -', { input: py, stdio: ['pipe','inherit','inherit'] });
}
for (const [out, W, H, txt] of [
  ['icons/icon-192.png', 192, 192, '✦'],
  ['icons/icon-512.png', 512, 512, '✦'],
  ['icons/maskable-512.png', 512, 512, '✦'],
  ['icons/apple-touch-icon-180.png', 180, 180, '✦'],
]) {
  try { pythonDraw(out, W, H, txt); } catch {}
}
console.log('icons generated');
