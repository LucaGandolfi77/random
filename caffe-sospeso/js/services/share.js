export function generatePoster(state) {
  const w = 1080, h = 1080;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const bg = '#f3e2c7';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#c97b4a';
  ctx.beginPath();
  ctx.arc(cx, cy - 80, Math.min(w, h) * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3b22';
  ctx.font = 'bold 90px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Caff\u00e8 Sospeso', cx, cy + 60);
  ctx.font = '48px Georgia, serif';
  ctx.fillStyle = '#8a5a33';
  const lines = [
    `Livello ${state.level}`,
    `${Object.values(state.aromi).filter(Boolean).length} aromi scoperti`,
    `${state.stats.served} caff\u00e8 serviti`,
    `${state.sospesiLeft} caff\u00e8 sospesi`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + 130 + i * 60));
  return c;
}

export async function sharePoster(canvas, state) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'caffe-sospeso-poster.png', { type: 'image/png' });
  if (navigator.share && Array.isArray(navigator.canShare?.({ files: [file] })) !== false) {
    try {
      await navigator.share({ title: 'Caff\u00e8 Sospeso', text: 'Il mio bar di quartiere', files: [file] });
      return 'shared';
    } catch { return 'cancelled'; }
  }
  downloadPoster(canvas);
  return 'downloaded';
}

export function downloadPoster(canvas) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'caffe-sospeso-poster.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

export function initShareTarget(onReceived) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'CS_SHARE_TARGET') {
      try {
        const body = JSON.parse(e.data.body);
        localStorage.setItem('cs-share-target', JSON.stringify(body));
        toast('Condivisione ricevuta!');
        onReceived && onReceived(body);
      } catch { /* ignore */ }
    }
  });
}

function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('visible'), 2500);
}
