// services/share.js — Web Share API + Share Target. Nessun backend.
import { serializeState, deserializeState, storageKey } from '../core/state.js';
import { safeLocalStorage } from '../core/utils.js';
import { encodeQR } from '../core/qr.js';

const SHARE_TARGET_PATH = '/share-target';
const PENDING_KEY = 'stellaria-pending-share';

export function canShare() {
  return !!(navigator.share && window.isSecureContext);
}

// Genera una "cartella Riflesso" (canvas con dati stato) e la condivide.
export async function shareProfile(state, { narrative = '' } = {}) {
  const blob = await profileCardBlob(state, narrative);
  const file = new File([blob], `stellaria-${(state && state.session && state.session.createdAt) || 'card'}.png`, { type: 'image/png' });
  if (!canShare()) return { ok: false, reason: 'unsupported' };
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Stellaria — La mia carta Riflesso',
        text: narrative || 'Stellaria — La Piazza dei Riflessi',
        files: [file],
      });
    } else {
      await navigator.share({
        title: 'Stellaria — La mia carta Riflesso',
        text: narrative || 'Stellaria — La Piazza dei Riflessi',
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'cancelled' };
  }
}

// Condivisione testuale (senza file) — sempre disponibile in sicuro.
export async function shareText(state) {
  const text = serializeState(state);
  if (!canShare()) return { ok: false, reason: 'unsupported' };
  try {
    await navigator.share({ title: 'Stellaria', text });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'cancelled' };
  }
}

// Genera PNG della cartella (canvas offscreen). Fallback: SVG stringa.
async function profileCardBlob(state, narrative) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    const g = ctx.createRadialGradient(512, 400, 80, 512, 512, 700);
    g.addColorStop(0, '#3a2d63'); g.addColorStop(1, '#1a1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4c963';
    ctx.font = '300px sans-serif';
    ctx.fillText('✦', 512, 420);
    ctx.font = '70px sans-serif';
    ctx.fillStyle = '#f3edff';
    ctx.fillText(`Stelle ${(state && state.stars) || 0}  ·  Riflesso ${(state && state.riflesso) || 0}`, 512, 620);
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#d8c4ff';
    const line = narrative || `Fama ${(state && state.fame) || 1}/6`;
    ctx.fillText(line, 512, 720);
    ctx.fillText('Stellaria — La Piazza dei Riflessi', 512, 900);
    try {
      const matrix = encodeQR('https://stellaria.example');
      const qrSize = 140;
      const cell = qrSize / matrix.length;
      const qx = 1024 - qrSize - 30, qy = 1024 - qrSize - 30;
      ctx.fillStyle = '#1a1530'; ctx.fillRect(qx - 6, qy - 6, qrSize + 12, qrSize + 12);
      ctx.fillStyle = '#f3edff';
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) ctx.fillRect(qx + c * cell, qy + r * cell, cell, cell);
        }
      }
    } catch {}
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch {
    return new Blob(['<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#1a1530"/><text x="512" y="520" font-size="200" text-anchor="middle" fill="#f4c963">✦</text><text x="512" y="680" font-size="60" text-anchor="middle" fill="#f3edff">Stelle ${(state && state.stars) || 0} · Riflesso ${(state && state.riflesso) || 0}</text></svg>'], { type: 'image/svg+xml' });
  }
}

// Share Target: salva dati ricevuti (text) per uso a prossima apertura.
export async function onShareTarget(request) {
  let text = '';
  if (request && request.body) {
    try {
      const form = await request.formData();
      text = (form.get('text') || form.get('payload') || '').toString();
    } catch {
      try { text = await request.text(); } catch { text = ''; }
    }
  }
  if (text) {
    try { safeLocalStorage('set', PENDING_KEY, text.slice(0, 5000)); } catch {}
  }
}

export function readPendingShare() {
  try {
    const v = safeLocalStorage('get', PENDING_KEY);
    safeLocalStorage('remove', PENDING_KEY);
    if (!v) return null;
    return deserializeState(v) || { raw: v };
  } catch { return null; }
}

export { SHARE_TARGET_PATH, PENDING_KEY, storageKey };
