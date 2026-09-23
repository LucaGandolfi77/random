// ui/avatar.js — avatar SVG componibile dall'outfit. Nessun asset esterno.
import { OUTFIT_SLOTS } from '../domain/data/items.js';

// Mappa slot → SVG part. Ogni parte è un path/rect cerchio leggero, coordinato su viewBox 100x120.
const SLOT_PARTS = {
  capelli: (color) => `<path d="M20,45 Q20,10 50,10 Q80,10 80,45 L80,60 Q70,50 50,50 Q30,50 20,60 Z" fill="${color}" />`,
  top: (color) => `<rect x="25" y="55" width="50" height="35" rx="8" fill="${color}" />`,
  bottom: (color) => `<rect x="28" y="88" width="44" height="25" rx="6" fill="${color}" />`,
  accessorio: (color, id) => {
    if (id && id.includes('occhiali')) return `<rect x="28" y="32" width="44" height="10" rx="3" fill="${color}" opacity="0.85" />`;
    if (id && id.includes('fiocco')) return `<path d="M50,18 L42,12 L58,12 Z M42,12 L38,4 M58,12 L62,4" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" />`;
    return `<circle cx="50" cy="22" r="6" fill="${color}" />`;
  },
};

const SLOT_COLORS = {
  capelli: '#5a3d2b',
  top: '#4a358f',
  bottom: '#2e2350',
  accessorio: '#f4c963',
};

const SLOT_FALLBACK = {
  capelli: '#5a3d2b',
  top: '#4a358f',
  bottom: '#2e2350',
  accessorio: '#f4c963',
};

export function avatarSVG(state, size = 80) {
  if (!state) return fallbackAvatar(size);
  const skin = '#f3edff';
  const parts = [];
  // Base (body)
  parts.push(`<rect x="30" y="50" width="40" height="38" rx="8" fill="${skin}" opacity="0.9" />`);
  parts.push(`<circle cx="50" cy="32" r="14" fill="${skin}" />`);
  for (const slot of OUTFIT_SLOTS) {
    const itemId = state.outfit?.[slot];
    const color = SLOT_COLORS[slot] || SLOT_FALLBACK[slot];
    const renderer = SLOT_PARTS[slot];
    if (renderer) parts.push(renderer(color, itemId));
  }
  // Occhi sempre visibili
  parts.push(`<circle cx="44" cy="30" r="1.6" fill="#1a1530" /><circle cx="56" cy="30" r="1.6" fill="#1a1530" />`);
  const svg = `<svg width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${parts.join('')}</svg>`;
  return svg;
}

function fallbackAvatar(size) {
  return `<svg width="${size}" height="${size * 1.2}" viewBox="0 0 100 120"><circle cx="50" cy="32" r="14" fill="#f3edff"/><rect x="30" y="50" width="40" height="38" rx="8" fill="#f3edff" opacity="0.9"/><circle cx="44" cy="30" r="1.6" fill="#1a1530"/><circle cx="56" cy="30" r="1.6" fill="#1a1530"/></svg>`;
}

// Palette da foto per mood-sync
export function extractPalette(imageElement, colors = 5) {
  try {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(imageElement, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const freq = {};
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;
      freq[key] = (freq[key] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, colors);
    return sorted.map(([k]) => {
      const [r, g, b] = k.split(',').map(Number);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    });
  } catch {
    return null;
  }
}
