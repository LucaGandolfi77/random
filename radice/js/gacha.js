async function handleGachaPull() {
  const state = getState();
  const cost = 5;

  if (state.seeds < cost) {
    showToast('Non hai abbastanza semi! 🌱');
    AUDIO.playFail();
    return;
  }

  showModal(
    '<h3 class="panel-title">🎲 Gacha</h3>' +
    '<p class="panel-text" style="margin:16px 0;">Spendere <strong>' + cost + ' semi</strong> per tirare un nuovo libro?</p>' +
    '<div style="display:flex;gap:10px;margin-top:20px;justify-content:center;">' +
    '<button class="btn btn-primary" id="modal-confirm-gacha">Sì, tira!</button>' +
    '<button class="btn btn-secondary" id="modal-cancel-gacha">Annulla</button>' +
    '</div>'
  );

  const confirmBtn = document.getElementById('modal-confirm-gacha');
  const cancelBtn = document.getElementById('modal-cancel-gacha');

  const cleanup = () => {
    hideModal();
    if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
    if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
  };

  const onConfirm = async () => {
    cleanup();
    if (!removeSeeds(cost)) { showToast('Semi insufficienti!'); return; }
    AUDIO.playGacha();
    const circle = document.querySelector('.gacha-circle');
    if (circle) {
      circle.innerHTML = '<div style="font-size:48px;opacity:0.5">🎲</div>';
      animateGachaCircle(circle);
    }
    await delay(800);
    executeGachaRoll();
  };

  const onCancel = () => { cleanup(); };

  if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
  if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
}

async function executeGachaRoll() {
  const isRare = Math.random() < 0.15;
  let book;
  let isChapter = false;

  if (isRare && Math.random() < 0.5) {
    isChapter = true;
    const chapters = getChaptersByRarity('leggendario').concat(getChaptersByRarity('epico'));
    book = chapters[Math.floor(Math.random() * chapters.length)];
  } else {
    book = rollBook();
  }

  const resultEl = document.getElementById('gacha-result');
  if (!resultEl) return;

  resultEl.classList.add('visible');

  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const rarity = document.getElementById('result-rarity');
  const flavor = document.getElementById('result-flavor');
  const readBtn = document.getElementById('btn-read');

  icon.textContent = isChapter ? '📜' : '📖';
  title.textContent = book.title;
  rarity.className = 'book-rarity rarity-' + book.rarity;
  rarity.textContent = (isChapter ? 'Capitolo ' : '') + RARITY_CONFIG[book.rarity].name;
  flavor.textContent = book.flavor;

  if (isChapter) {
    readBtn.textContent = 'Scopri il Capitolo';
    readBtn.onclick = () => handleChapterFound(book);
  } else {
    readBtn.textContent = 'Leggi (' + book.pages + ' min)';
    readBtn.onclick = () => startReading(book);
  }

  AUDIO.playUnlock();
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  showToast(book.rarity === 'leggendario' ? 'Capitolo raro!' : (isChapter ? 'Capitolo trovato!' : 'Libro trovato!'));
  updateUI();
}

function handleChapterFound(chapter) {
  const wasNew = collectChapter(chapter.id);
  unlockRoom(chapter.roomType);

  if (wasNew) {
    AUDIO.playChapter();
    showToast('Capitolo raro collezionato! ⭐');
  }

  const state = getState();
  state.stats.longestReading = Math.max(state.stats.longestReading, chapter.pages * 12);
  saveState(state);

  showModal(
    '<h3 class="panel-title">' + chapter.title + '</h3>' +
    '<div class="reader-text" style="margin:16px 0;">' + chapter.text + '</div>' +
    '<p style="font-style:italic;color:#8b7d8a;">— ' + chapter.flavor + '</p>' +
    '<div style="text-align:center;margin-top:20px;">' +
    '<button class="btn btn-primary" id="modal-close-btn">Torna all\'albero</button>' +
    '</div>'
  );

  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => { hideModal(); switchView('home'); });

  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
  updateUI();
}
