let currentBook = null;
let readerTimer = null;

function startReading(book) {
  currentBook = book;
  window._currentReaderBook = book.id;
  switchView('reader');
  renderReader();
}

function renderReader() {
  const book = currentBook;
  if (!book) return;

  const view = document.getElementById('view');
  if (!view) return;

  view.innerHTML = '<section id="view-reader" class="screen active reader-area">' +
    '<div class="reader-header">' +
    '<button class="btn btn-ghost btn-sm" id="btn-reader-back" aria-label="Torna alla home">← Indietro</button>' +
    '<span class="reader-title-text" id="reader-title-text">' + book.title + '</span>' +
    '<span class="reader-page-info" id="reader-page">1 / ' + book.pages + '</span>' +
    '</div>' +
    '<div class="reader-progress" id="reader-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + book.pages + '" aria-valuenow="1"></div>' +
    '<div class="reader-timer" id="reader-timer" aria-live="polite">Tempo: <span id="timer-val">' + (book.pages * 20) + '</span>s</div>' +
    '<div class="reader-content" id="reader-content" role="region" aria-label="Contenuto della storia"></div>' +
    '<div class="reader-nav">' +
    '<button class="btn btn-secondary" id="btn-prev-page" aria-label="Pagina precedente">◀</button>' +
    '<button class="btn btn-secondary" id="btn-next-page" aria-label="Pagina successiva">▶</button>' +
    '</div></section>';

  document.getElementById('btn-reader-back').addEventListener('click', () => {
    if (readerTimer) { clearInterval(readerTimer); readerTimer = null; }
    switchView('home');
  });

  const totalPages = book.pages;
  const progressDots = document.getElementById('reader-progress');
  if (progressDots) {
    progressDots.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Pagina ' + (i + 1));
      progressDots.appendChild(dot);
    }
  }

  showReaderPage(book, 0);

  let timeLeft = book.pages * 20;
  const timerVal = document.getElementById('timer-val');
  if (readerTimer) clearInterval(readerTimer);
  readerTimer = setInterval(() => {
    timeLeft--;
    if (timerVal) timerVal.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(readerTimer);
      readerTimer = null;
      finishReading(book);
    }
  }, 1000);

  AUDIO.playPageTurn();
}

function showReaderPage(book, pageIndex) {
  const content = document.getElementById('reader-content');
  if (!content) return;
  const pageNumEl = document.getElementById('reader-page');
  const totalPages = book.pages;
  const wordsPerPage = 120;
  const startIdx = pageIndex * wordsPerPage;
  const chunk = book.story.slice(startIdx, startIdx + wordsPerPage);
  content.innerHTML = '<div class="reader-page"><p class="reader-text">' + chunk + '</p></div>';
  if (pageNumEl) pageNumEl.textContent = (pageIndex + 1) + ' / ' + totalPages;
  document.querySelectorAll('.progress-dot').forEach((d, i) => { d.classList.toggle('active', i === pageIndex); });
}

function finishReading(book) {
  if (readerTimer) { clearInterval(readerTimer); readerTimer = null; }
  recordRead(book.id, book.pages, book.roomType);
  unlockRoom(book.roomType);
  AUDIO.playSuccess();
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  showToast('Storia completata! Nuova stanza nell\'albero! 🌳');
  switchView('home');
  updateUI();
}

function handleReaderNav(e) {
  if (!e || !e.target) return;
  const pageText = document.getElementById('reader-page').textContent;
  if (!pageText) return;
  const parts = pageText.split('/');
  const pageNum = parseInt(parts[0]) || 1;
  const totalPages = parseInt(parts[1]) || 1;
  const bookId = window._currentReaderBook;
  if (!bookId) return;
  const book = getBookById(bookId);
  if (!book) return;
  if (e.target.id === 'btn-next-page' && pageNum < totalPages) {
    showReaderPage(book, pageNum);
    AUDIO.playPageTurn();
  } else if (e.target.id === 'btn-prev-page' && pageNum > 1) {
    showReaderPage(book, pageNum - 2);
    AUDIO.playPageTurn();
  }
}
