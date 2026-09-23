// Web Share API · cartolina PNG della stanza (canvas, zero server).

const W = 1080;
const H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Disegna la cartolina dello stato corrente su un canvas off-DOM.
 * @returns {HTMLCanvasElement|null}
 */
export function drawPostcard(state, opts = {}) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  const lang = state.settings?.lang === 'en' ? 'en' : 'it';
  const labels = {
    it: { title: 'Lumina', sub: 'La Biblioteca di Mezzanotte', light: 'Luce', calm: 'Calma', ink: 'Inchiostro', readers: 'Lettori', rares: 'Rari', room: 'Stanza' },
    en: { title: 'Lumina', sub: 'The Midnight Library', light: 'Light', calm: 'Calm', ink: 'Ink', readers: 'Readers', rares: 'Rares', room: 'Room' },
  }[lang];
  const roomNames = {
    it: { hall: 'Aula Centrale', attic: 'Soppalco', winterGarden: 'Giardino d\'Inverno' },
    en: { hall: 'Main Hall', attic: 'Attic', winterGarden: 'Winter Garden' },
  }[lang];

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Sfondo notte
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141834');
  g.addColorStop(0.55, '#1b2140');
  g.addColorStop(1, '#0e1128');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Bordo
  ctx.strokeStyle = 'rgba(240,185,107,0.55)';
  ctx.lineWidth = 6;
  roundRect(ctx, 24, 24, W - 48, H - 48, 28);
  ctx.stroke();

  // Luna (fase dallo stato condiviso opzionale)
  const phase = typeof opts.phase === 'number' ? opts.phase : 0.5;
  const mx = W - 140;
  const my = 140;
  ctx.beginPath();
  ctx.arc(mx, my, 56, 0, Math.PI * 2);
  ctx.fillStyle = '#f0e6c8';
  ctx.fill();
  if (phase > 0.05 && phase < 0.95) {
    ctx.beginPath();
    const cover = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const dir = phase < 0.5 ? -1 : 1;
    ctx.ellipse(mx + dir * 56 * (1 - cover), my, 56 * Math.max(0.15, 1 - cover), 56, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#141834';
    ctx.fill();
  }

  // Titolo
  ctx.fillStyle = '#f5ead7';
  ctx.font = '700 72px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(labels.title, 72, 160);
  ctx.fillStyle = '#c9d2ff';
  ctx.font = '400 34px Georgia, serif';
  ctx.fillText(labels.sub, 72, 210);

  // Card risorse
  const cards = [
    [labels.light, state.resources?.luce ?? 0, '#f0b96b'],
    [labels.calm, state.resources?.calma ?? 0, '#7fc7c1'],
    [labels.ink, state.resources?.inchiostro ?? 0, '#b2a7f5'],
  ];
  cards.forEach(([lab, val, col], i) => {
    const x = 72 + i * 310;
    const y = 280;
    ctx.fillStyle = 'rgba(42,49,88,0.85)';
    roundRect(ctx, x, y, 280, 160, 20);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(lab, x + 24, y + 48);
    ctx.fillStyle = '#f5ead7';
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText(String(Math.round(val)), x + 24, y + 120);
    // bar
    const pct = Math.max(0, Math.min(10, val)) / 10;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x + 24, y + 132, 232, 12, 6);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, x + 24, y + 132, 232 * pct, 12, 6);
    ctx.fill();
  });

  // Stanza + stats
  const room = roomNames[state.room] || state.room || '—';
  ctx.fillStyle = 'rgba(42,49,88,0.75)';
  roundRect(ctx, 72, 480, W - 144, 360, 24);
  ctx.fill();

  ctx.fillStyle = '#c9d2ff';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(labels.room, 112, 540);
  ctx.fillStyle = '#f5ead7';
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText(room, 112, 596);

  const rows = [
    [labels.readers, state.stats?.readersServed ?? state.readersServed ?? 0],
    [labels.rares, `${state.raresCataloged?.length ?? 0}/${opts.rareTotal ?? 8}`],
    ['☾', opts.moonName || ''],
  ];
  rows.forEach(([k, v], i) => {
    const y = 660 + i * 52;
    ctx.fillStyle = '#9aa6e8';
    ctx.font = '500 28px system-ui, sans-serif';
    ctx.fillText(String(k), 112, y);
    ctx.fillStyle = '#f5ead7';
    ctx.font = '600 32px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(v), W - 112, y);
    ctx.textAlign = 'left';
  });

  // Lanterne accese
  const lit = (state.lanterns || []).filter(Boolean).length;
  for (let i = 0; i < 4; i += 1) {
    const x = 100 + i * 90;
    const y = 900;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fillStyle = i < lit ? '#f0b96b' : 'rgba(255,255,255,0.12)';
    ctx.fill();
    if (i < lit) {
      ctx.shadowColor = '#f0b96b';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Gatto zona
  ctx.fillStyle = '#c9d2ff';
  ctx.font = '400 28px system-ui, sans-serif';
  const catArea = state.catArea || 'hearth';
  ctx.fillText(`𓃠 ${catArea}`, 112, 990);

  // Footer
  ctx.fillStyle = 'rgba(240,185,107,0.85)';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText(
    lang === 'it' ? 'Ogni libro attende il suo lettore.' : 'Every book awaits its reader.',
    72,
    H - 100,
  );
  ctx.fillStyle = '#6f7ab8';
  ctx.font = '500 24px system-ui, sans-serif';
  ctx.fillText(opts.url || 'Lumina', 72, H - 60);

  return canvas;
}

/** PNG blob della cartolina (async: toBlob). */
export async function postcardBlob(state, opts = {}) {
  const canvas = drawPostcard(state, opts);
  if (!canvas) return null;
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } else {
      resolve(null);
    }
  });
}

/**
 * Condivide la cartolina via Web Share API (files) con fallback download.
 * @returns {Promise<{ ok: boolean, method: 'share'|'download'|'unsupported'|'error', cancelled?: boolean }>}
 */
export async function sharePostcard(state, opts = {}) {
  const blob = await postcardBlob(state, opts);
  if (!blob) return { ok: false, method: 'unsupported' };

  const filename = `lumina-${opts.day || 'card'}.png`;
  const file = typeof File !== 'undefined'
    ? new File([blob], filename, { type: 'image/png' })
    : null;

  const canShareFiles = typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && file
    && (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: opts.title || 'Lumina',
        text: opts.text || '',
      });
      return { ok: true, method: 'share' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, method: 'share', cancelled: true };
      // fallback download sotto
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, method: 'download' };
  } catch {
    return { ok: false, method: 'error' };
  }
}
