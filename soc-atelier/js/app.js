import { boot } from './controller.js';

function start() { boot();
  window.addEventListener('content-share', async (e) => {
    const data = await e.target?.shareTarget?.data.catch(() => null);
    const text = data ? await data.text().catch(() => '') : '';
    if (text) { const t = document.querySelector('#toast'); if (t) { t.textContent = 'Condiviso: ' + text.slice(0, 60); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); } }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

window.addEventListener('online', () => { });
window.addEventListener('offline', () => { });
