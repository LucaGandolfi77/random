function renderHome() {
  const state = getState();
  const view = document.getElementById('view');
  if (!view) return;

  const unlocked = state.roomsUnlocked || [];
  const totalRooms = ROOM_TYPES.length;
  const chapterCount = state.chaptersCollected ? state.chaptersCollected.length : 0;

  let html = '<section id="view-home" class="screen active">';
  html += '<div class="home-hero">';
  html += '<h1 class="home-title">Radice</h1>';
  html += '<p class="home-subtitle">La biblioteca nell\'albero</p>';
  html += '<p class="panel-text" style="max-width:300px;margin:0 auto;">Una libreria dentro un albero antico. Leggi storie e costruisci il tuo albero.</p>';
  html += '</div>';

  html += '<div class="home-stats">';
  html += '<div class="home-stat"><div class="home-stat-value">' + state.seeds + '</div><div class="home-stat-label">🌱 Semi</div></div>';
  html += '<div class="home-stat"><div class="home-stat-value">' + state.totalReads + '</div><div class="home-stat-label">📖 Letture</div></div>';
  html += '<div class="home-stat"><div class="home-stat-value">' + chapterCount + '</div><div class="home-stat-label">⭐ Capitoli</div></div>';
  html += '<div class="home-stat"><div class="home-stat-value">' + unlocked.length + '/' + totalRooms + '</div><div class="home-stat-label">🌳 Stanze</div></div>';
  html += '</div>';

  html += '<div class="panel">';
  html += '<h3 class="panel-title">Il tuo albero cresce</h3>';
  html += '<p class="panel-text">Hai sbloccato ' + unlocked.length + ' su ' + totalRooms + ' stanze.</p>';
  if (unlocked.length > 0) {
    unlocked.forEach(type => {
      const room = ROOMS[type];
      html += '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px;">';
      html += '<span>' + room.icon + '</span><span>' + room.name + '</span>';
      html += '<span style="color:var(--accent-green);font-size:12px;">✓</span></div>';
    });
  } else {
    html += '<p style="font-size:13px;color:var(--ink-light);margin-top:8px;">Nessuna stanza ancora aperta. Inizia dal Gacha!</p>';
  }
  html += '</div>';

  html += '<div class="panel">';
  html += '<h3 class="panel-title">Come funziona</h3>';
  html += '<div style="font-size:13px;color:var(--ink-soft);line-height:1.7;">';
  html += '<p>🎲 <strong>Gacha</strong> — Tira fuori libri con i semi</p>';
  html += '<p>📖 <strong>Leggi</strong> — Ogni libro è una storia di ~2 minuti</p>';
  html += '<p>🌳 <strong>Costruisci</strong> — Ogni libro sblocca una stanza nell\'albero</p>';
  html += '<p>⭐ <strong>Capitoli</strong> — I rari non sono oggetti, sono capitoli speciali</p>';
  html += '<p>🦉 <strong>Gufo</strong> — Il gufo bibliotecario ti guida tra le stanze</p>';
  html += '</div></div>';

  html += '<div style="text-align:center;margin-top:20px;">';
  html += '<button class="btn btn-primary btn-lg btn-full" id="btn-start-reading">Inizia a Leggere</button>';
  html += '</div>';
  html += '</section>';

  view.innerHTML = html;

  const startBtn = document.getElementById('btn-start-reading');
  if (startBtn) startBtn.addEventListener('click', () => switchView('gacha'));
}

function renderGacha() {
  const state = getState();
  const view = document.getElementById('view');
  if (!view) return;

  let html = '<section id="view-gacha" class="screen active">';
  html += '<h2 class="section-title">🎲 Gacha</h2>';
  html += '<div class="panel">';
  html += '<p class="panel-text">Ogni tiro costa <strong>5 semi</strong>. I libri sono stanze: leggili per sbloccarle nell\'albero!</p>';
  html += '<p class="panel-text" style="margin-top:8px;">Rarità: <span style="color:#a0a0a0;">Comune</span> · <span style="color:#3b82f6;">Raro</span> · <span style="color:#8b5cf6;">Epico</span> · <span style="color:#f59e0b;">Leggendario</span></p>';
  html += '</div>';
  html += '<div class="gacha-area">';
  html += '<div class="gacha-circle" id="gacha-circle">🎲</div>';
  html += '<div class="gacha-cost">Costo: <strong>' + state.seeds + '</strong> semi</div>';
  html += '<button class="btn btn-primary btn-lg" id="btn-gacha">Tira il Libro</button>';
  html += '</div>';
  html += '<div class="book-result" id="gacha-result">';
  html += '<div class="book-icon" id="result-icon">📖</div>';
  html += '<div class="book-title" id="result-title"></div>';
  html += '<div class="book-rarity" id="result-rarity"></div>';
  html += '<div class="book-flavor" id="result-flavor"></div>';
  html += '<button class="btn btn-primary" id="btn-read">Leggi</button>';
  html += '<button class="btn btn-secondary" id="btn-back-gacha" style="margin-top:8px;">Torna</button>';
  html += '</div>';
  html += '<div class="panel" style="margin-top:16px;"><h3 class="panel-title">Ultime letture</h3>';
  const history = (state.readingHistory || []).slice(-3);
  if (history.length === 0) {
    html += '<p style="font-size:13px;color:var(--ink-light);">Nessuna ancora. Prova il gacha!</p>';
  } else {
    history.forEach(h => {
      const book = getBookById(h.bookId);
      if (book) {
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);">';
        html += '<span>' + (book.rarity === 'leggendario' ? '⭐' : '📖') + ' ' + book.title + '</span>';
        html += '<span style="color:var(--ink-light);">' + book.roomType + '</span></div>';
      }
    });
  }
  html += '</div>';
  html += '</section>';
  view.innerHTML = html;

  const gachaBtn = document.getElementById('btn-gacha');
  if (gachaBtn) gachaBtn.addEventListener('click', handleGachaPull);

  const backBtn = document.getElementById('btn-back-gacha');
  if (backBtn) backBtn.addEventListener('click', () => switchView('home'));
}

function renderReader() {
  const view = document.getElementById('view');
  if (!view) return;
  view.innerHTML = '<section id="view-reader" class="screen active reader-area">' +
    '<div class="reader-header">' +
    '<button class="btn btn-ghost btn-sm" id="btn-reader-back">← Indietro</button>' +
    '<span class="reader-title-text" id="reader-title-text"></span>' +
    '<span class="reader-page-info" id="reader-page">1 / 1</span>' +
    '</div>' +
    '<div class="reader-progress" id="reader-progress"></div>' +
    '<div class="reader-timer" id="reader-timer">Tempo: <span id="timer-val">0</span>s</div>' +
    '<div class="reader-content" id="reader-content"></div>' +
    '<div class="reader-nav">' +
    '<button class="btn btn-secondary" id="btn-prev-page">◀</button>' +
    '<button class="btn btn-secondary" id="btn-next-page">▶</button>' +
    '</div></section>';

  document.getElementById('btn-reader-back').addEventListener('click', () => switchView('home'));
}

function updateUI() {
  const state = getState();
  const seedEl = document.querySelector('#res-seme span');
  const bookEl = document.querySelector('#res-libri span');
  const chapterEl = document.querySelector('#res-capitoli span');
  const owlMoodEl = document.getElementById('owl-mood');
  if (seedEl) seedEl.textContent = state.seeds;
  if (bookEl) bookEl.textContent = state.totalReads;
  if (chapterEl) chapterEl.textContent = state.chaptersCollected ? state.chaptersCollected.length : 0;
  const roomCount = (state.roomsUnlocked || []).length;
  if (owlMoodEl) {
    owlMoodEl.textContent = roomCount === 0 ? 'Sonno' : (roomCount < 3 ? 'Sonnolento' : (roomCount < 7 ? 'Contento' : 'Orgoglioso'));
  }
}

function switchView(viewName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');
  document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
  if (viewName !== 'reader') {
    if (readerTimer) { clearInterval(readerTimer); readerTimer = null; }
  }
}

function initTabBar() {
  document.querySelectorAll('#tabbar .tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
}

function init() {
  const state = getState();
  if (!state.lastPlay || Date.now() - state.lastPlay > 86400000) {
    setState({ seeds: state.seeds + 3 });
  }
  initTabBar();
  setupPwa();
  animateTree();
  switchView('home');
  updateUI();

  window.addEventListener('resize', () => {
    const canvas = document.getElementById('tree-canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderTreeCanvas();
    }
  });

  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!document.getElementById('view-reader')) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      const pageText = document.getElementById('reader-page').textContent;
      if (!pageText) return;
      const pageNum = parseInt(pageText) || 1;
      const totalPages = parseInt(pageText.split('/')[1]) || 1;
      if (diff > 0 && pageNum < totalPages) {
        const btn = document.getElementById('btn-next-page');
        if (btn) btn.click();
      } else if (diff < 0 && pageNum > 1) {
        const btn = document.getElementById('btn-prev-page');
        if (btn) btn.click();
      }
    }
  }, { passive: true });

  startAutoSave();
  console.log('🌳 Radice inizializzato!');
}

document.addEventListener('DOMContentLoaded', init);
