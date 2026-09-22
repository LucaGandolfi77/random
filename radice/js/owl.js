function renderOwl() {
  const state = getState();
  const view = document.getElementById('view');
  if (!view) return;

  const roomCount = (state.roomsUnlocked || []).length;
  const owlState = getOwlState(roomCount);
  const timeLabel = getTimeLabel();

  const moodMap = {
    sleepy: { emoji: '🦉', mood: 'Sonnolento', desc: 'Il gufo bibliotecario dorme tra le pagine. Si sveglierà quando avrai letto qualcosa.' },
    drowsy: { emoji: '🦉', mood: 'Sonnolento', desc: 'Il gufo si sveglia appena. "Sss... sss... qualcosa di interessante?"' },
    happy: { emoji: '🦉', mood: 'Contento', desc: 'Il gufo è felice. Ha visto quante storie hai letto. "Continua, lettore!"' },
    proud: { emoji: '🦉', mood: 'Orgoglioso', desc: 'Il gufo si è allargato le ali. "La biblioteca cresce. Sei un lettore eccezionale!"' },
    ecstatic: { emoji: '🦉✨', mood: 'Esaltato', desc: 'Il gufo vola in cerchio! "La biblioteca è viva! Grazie, lettore!"' }
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

  html += '<div class="owl-dialogue">';
  html += '<p class="owl-dialogue-text">"' + dialogue + '"</p>';
  html += '</div>';

  html += '<div class="owl-dialogue">';
  html += '<p class="owl-dialogue-text">"' + idleDialogue + '"</p>';
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;justify-content:center;">';
  html += '<button class="btn btn-secondary owl-button" id="btn-owl-listen">🦉 Ascolta il Gufo</button>';
  html += '<button class="btn btn-ghost owl-button" id="btn-owl-read">📖 Leggi una Storia</button>';
  html += '</div>';

  html += '<div class="panel" style="margin-top:20px;width:100%;">';
  html += '<h3 class="panel-title">Statistiche del Gufo</h3>';
  html += '<p class="panel-text">Stanze scoperte: <strong>' + roomCount + '/' + ROOM_TYPES.length + '</strong></p>';
  html += '<p class="panel-text">Storie lette: <strong>' + state.totalReads + '</strong></p>';
  html += '<p class="panel-text">Capitoli rari: <strong>' + state.chaptersCollected.length + '</strong></p>';
  html += '</div>';

  html += '</section>';

  view.innerHTML = html;

  const listenBtn = document.getElementById('btn-owl-listen');
  if (listenBtn) listenBtn.addEventListener('click', () => {
    AUDIO.playOwl();
    const extraDialogue = getRandomDialogue('idle');
    showToast('🦉 "' + extraDialogue + '"');
  });

  const readBtn = document.getElementById('btn-owl-read');
  if (readBtn) readBtn.addEventListener('click', () => switchView('gacha'));
}

function owlGuide() {
  const state = getState();
  const unlocked = state.roomsUnlocked || [];
  if (unlocked.length === 0) return null;

  const roomTypes = unlocked;
  const currentRoom = roomTypes[Math.floor(Math.random() * roomTypes.length)];
  const room = ROOMS[currentRoom];
  const guide = {
    room: currentRoom,
    roomName: room.name,
    message: 'Il gufo ti porta nel ' + room.name + '. ' + getRandomDialogue('roomUnlocked'),
    time: Date.now()
  };
  return guide;
}
