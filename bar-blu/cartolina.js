// ===== Bar Blu — Cartolina (canvas snapshot + Web Share) =====
import { PHASES, PHASE_NAMES, COLLECTIBLES } from './model.js';

export function generateCartolina(state) {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 520;
  const ctx = canvas.getContext('2d');
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, 520);
  grad.addColorStop(0, '#1a3a5c'); grad.addColorStop(1, '#0f1923');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 400, 520);
  // Wood counter
  ctx.fillStyle = '#8b6914'; ctx.fillRect(0, 320, 400, 60);
  ctx.fillStyle = '#c4a050'; ctx.fillRect(0, 320, 400, 4);
  // Polaroid white border (inner)
  ctx.fillStyle = '#f5e6cc'; ctx.fillRect(20, 20, 360, 440);
  // Blue header band
  ctx.fillStyle = '#3a7ab5'; ctx.fillRect(20, 20, 360, 80);
  // Title
  ctx.fillStyle = '#f5e6cc'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Bar Blu', 200, 62);
  ctx.fillStyle = '#d4a056'; ctx.font = '13px system-ui';
  ctx.fillText("Il bar di Luca Zheng", 200, 82);
  // Customer
  if (state.currentCustomer) {
    ctx.fillStyle = '#f5e6cc'; ctx.font = '40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.currentCustomer.icon, 200, 180);
    ctx.fillStyle = '#1a3a5c'; ctx.font = 'bold 18px system-ui';
    ctx.fillText(state.currentCustomer.name, 200, 215);
    const item = { coffee:'Caffè',cigarette:'Sigaretta',jagerbomb:'JägerBomb',scratch:'Grattacielo' }[state.currentCustomer.wants] || '';
    ctx.fillStyle = '#6a4a8c'; ctx.font = '13px system-ui';
    ctx.fillText('Vuole: ' + item, 200, 235);
  } else {
    ctx.fillStyle = '#6a4a8c'; ctx.font = '15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Nessun cliente in attesa', 200, 190);
  }
  // Phase
  ctx.textAlign = 'center'; ctx.fillStyle = '#d4a056'; ctx.font = '12px system-ui';
  ctx.fillText('Fase: ' + PHASE_NAMES[PHASES[state.phaseIndex]], 200, 270);
  // Stats (bottom area)
  ctx.textAlign = 'left'; ctx.fillStyle = '#1a3a5c'; ctx.font = '13px system-ui';
  ctx.fillText('Turno ' + state.currentShift + '  ·  Lv.' + state.level, 40, 365);
  ctx.fillText('Gettoni: ' + state.tokens + '  ·  Cimeli: ' + state.collectiblesFound.length + '/' + COLLECTIBLES.length, 40, 385);
  ctx.fillText('Servizi: ' + state.perfectServicesTotal + '  ·  Turni: ' + (state.currentShift - 1), 40, 405);
  // Footer note
  ctx.textAlign = 'center'; ctx.fillStyle = '#8a8a8a'; ctx.font = '10px system-ui';
  ctx.fillText('Nessun dato personale salvato · Zero dipendenze', 200, 470);
  return canvas;
}

export async function shareCartolina(canvas, state) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return { ok: false, reason: 'canvas-error' };
  const file = new File([blob], 'barblu-cartolina.png', { type: 'image/png' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Bar Blu',
        text: `Turno ${state.currentShift} · Lv.${state.level} · ${state.tokens} gettoni · ${state.collectiblesFound.length} cimeli`,
      });
      return { ok: true };
    } catch (e) {
      if (e.name === 'AbortError') return { ok: false, reason: 'aborted' };
      return { ok: false, reason: 'share-failed' };
    }
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'barblu-cartolina.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, downloaded: true };
}
