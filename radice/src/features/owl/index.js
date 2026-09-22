import store from '../../core/store.js';

function getOwlState(roomCount) {
  if (roomCount === 0) return { mood: 'sleepy', animation: 'sleeping' };
  if (roomCount < 3) return { mood: 'drowsy', animation: 'perched' };
  if (roomCount < 7) return { mood: 'happy', animation: 'perched-wings' };
  if (roomCount < 12) return { mood: 'proud', animation: 'flying' };
  return { mood: 'ecstatic', animation: 'flying-circles' };
}

function getRandomDialogue(type, timeOfDay) {
  const pool = {
    tree: [
      'Guarda l\'albero. È cresciuto grazie a te.',
      'L\'albero è vivo. Lo senti?',
      'Ogni stanza illuminata è una storia che hai scritto.'
    ],
    idle: [
      'Shhh... leggi. Il gufo sta ascoltando.',
      'Questa pagina ha un profumo speciale.',
      'Il gufo sogna storie. E tu?'
    ]
  };
  const list = pool[type] || pool.idle;
  return list[Math.floor(Math.random() * list.length)];
}

function renderOwl() {
  const state = store.get();
  const view = document.getElementById('view');
  if (!view) return;

  const roomCount = (state.roomsUnlocked || []).length;
  const owlState = getOwlState(roomCount);
  const moodMap = {
    sleepy: { emoji: '🦉', mood: 'Sonnolento', desc: 'Il gufo bibliotecario dorme tra le pagine.' },
    drowsy: { emoji: '🦉', mood: 'Sonnolento', desc: 'Il gufo si sveglia appena.' },
    happy: { emoji: '🦉', mood: 'Contento', desc: 'Il gufo è felice. "Continua, lettore!"' },
    proud: { emoji: '🦉', mood: 'Orgoglioso', desc: 'La biblioteca cresce. Sei eccezionale!' },
    ecstatic: { emoji: '🦉✨', mood: 'Esaltato', desc: 'Il gufo vola in cerchio! "La biblioteca è viva!"' }
  };
  const mood = moodMap[owlState.mood] || moodMap.sleepy;

  const dialogue = getRandomDialogue('tree');
  const idleDialogue = getRandomDialogue('idle');

  let html = '<section id="view-owl" class="screen active owl-view">';
  html += '<h2 class="section-title">🦉 Il Gufo Bibliotecario</h2>';
  html += '<div class="owl-container">';
  html += '<div class="owl-emoji-large">' + mood.emoji + '</div>';
  html += '<div class="owl-mood-text">' + mood.mood + '</div>';
  html += '<div class="owl-mood-desc">' + mood.desc + '</div>';
  html += '</div>';
  html += '<div class="owl-dialogue"><p class="owl-dialogue-text">"' + dialogue + '"</p></div>';
  html += '<div class="owl-dialogue"><p class="owl-dialogue-text">"' + idleDialogue + '"</p></div>';
  html += '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;justify-content:center;">';
  html += '<button class="btn btn-secondary" id="btn-owl-listen" aria-label="Ascolta il gufo">🦉 Ascolta il Gufo</button>';
  html += '<button class="btn btn-ghost" id="btn-owl-read" aria-label="Leggi una storia">📖 Leggi una Storia</button>';
  html += '</div>';
  html += '<div class="panel" style="margin-top:20px;">';
  html += '<h3 class="panel-title">Statistiche del Gufo</h3>';
  html += '<p class="panel-text">Stanze scoperte: <strong>' + roomCount + '/' + window.ROOM_TYPES.length + '</strong></p>';
  html += '<p class="panel-text">Storie lette: <strong>' + state.totalReads + '</strong></p>';
  html += '<p class="panel-text">Capitoli rari: <strong>' + state.chaptersCollected.length + '</strong></p>';
  html += '</div>';
  html += '</section>';

  view.innerHTML = html;

  const listenBtn = document.getElementById('btn-owl-listen');
  if (listenBtn) listenBtn.addEventListener('click', () => {
    window.AUDIO.playOwl();
    window.showToast('🦉 "' + getRandomDialogue('idle') + '"');
  });
  const readBtn = document.getElementById('btn-owl-read');
  if (readBtn) readBtn.addEventListener('click', () => window.switchView('gacha'));
}

function getState() { return store.get(); }

export { renderOwl, getOwlState, getRandomDialogue, getState };
