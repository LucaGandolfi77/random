let socket = null;
let currentRoomCode = null;
let currentGameId = null;

function show(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._hide);
  t._hide = setTimeout(() => t.classList.add('hidden'), duration);
}

function $(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', () => {
  $('login-btn').addEventListener('click', doLogin);
  $('nickname-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('logout-btn').addEventListener('click', () => { socket?.disconnect(); show('login'); });
  $('lobby-back-btn').addEventListener('click', () => { leaveRoom(); });
  $('start-game-btn').addEventListener('click', startGame);
  $('add-bot-btn').addEventListener('click', addBot);
  $('leave-game-btn').addEventListener('click', () => { leaveRoom(); });

  $('lobby-chat-send').addEventListener('click', () => sendChat('lobby'));
  $('lobby-chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat('lobby'); });
  $('game-chat-send').addEventListener('click', () => sendChat('game'));
  $('game-chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat('game'); });
});

function doLogin() {
  const nickname = $('nickname-input').value.trim();
  if (!nickname) { $('login-error').textContent = 'Inserisci un nickname'; return; }
  $('login-error').textContent = '';
  window.playerNickname = nickname;
  connectSocket(nickname);
}

function connectSocket(nickname) {
  if (socket?.connected) socket.disconnect();
  socket = io({ query: { nickname } });
  window.socket = socket;

  socket.on('connect', () => {
    window.playerId = socket.id;
    $('user-name').textContent = nickname;
    show('home');
    loadHome();
  });

  socket.on('roomListUpdate', (rooms) => renderRooms(rooms));

  socket.on('roomUpdate', (room) => {
    if (room.code === currentRoomCode) renderLobby(room);
  });

  socket.on('chatMessage', ({ from, text }) => {
    const target = currentGameId && document.getElementById('game-container').classList.contains('hidden') === false ? 'game' : 'lobby';
    addChatMessage(target, from, text);
  });

  socket.on('gameStarted', () => {
    showToast('🎲 Partita iniziata!');
    show('game-container');
  });

  socket.on('gameUpdate', (state) => {
    window.gameState = state;
    renderGame(state);
  });

  socket.on('disconnect', () => {
    showToast('Connessione persa. Ricarica la pagina.');
  });

  socket.on('connect_error', () => {
    $('login-error').textContent = 'Impossibile connettersi al server';
    show('login');
  });
}

function sendChat(type) {
  const input = $(`${type}-chat-input`);
  const text = input.value.trim();
  if (!text) return;
  socket.emit('sendChat', { text });
  input.value = '';
}

function addChatMessage(target, from, text) {
  const msgs = $(`${target}-chat-msgs`);
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const isSystem = from === 'Sistema';
  div.innerHTML = `<span class="from ${isSystem ? 'system' : ''}">${from}: </span><span class="text">${text}</span>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  if (msgs.children.length > 100) msgs.firstChild.remove();
}

function loadHome() {
  fetch('/api/games').then(r => r.json()).then(games => renderGames(games));
  fetch('/api/rooms').then(r => r.json()).then(rooms => renderRooms(rooms));
}

function renderGames(games) {
  const grid = $('games-grid');
  grid.innerHTML = '';
  const icons = { scopa: '🃏', briscola: '♠️', blackjack: '🂡', ramino: '📋', scala40: '🔟', poker: '♣️', monopolydeal: '🏠' };
  const comingSoon = [];

  for (const g of games) {
    const card = document.createElement('div');
    const cs = comingSoon.includes(g.id);
    card.className = 'game-card' + (cs ? ' coming-soon' : '');
    card.innerHTML = `
      <span class="icon">${icons[g.id] || '🃏'}</span>
      <div class="name">${g.name}</div>
      <div class="desc">${g.description}</div>
      <div class="players">${g.minPlayers}-${g.maxPlayers} giocatori</div>
    `;
    if (!cs) card.addEventListener('click', () => createRoom(g.id));
    grid.appendChild(card);
  }
}

function renderRooms(rooms) {
  const list = $('rooms-list');
  const msg = $('no-rooms-msg');
  list.innerHTML = '';
  $('room-count').textContent = rooms?.length || 0;
  if (!rooms || rooms.length === 0) { msg.classList.remove('hidden'); return; }
  msg.classList.add('hidden');
  for (const r of rooms) {
    const entry = document.createElement('div');
    entry.className = 'room-entry';
    entry.innerHTML = `
      <div class="info">
        <strong>${r.gameName}</strong>
        <div class="game-tag">Stanza: ${r.code}</div>
        <div class="players-tag">${r.playerCount}/${r.maxPlayers} giocatori</div>
      </div>
      <button class="btn small primary">Entra</button>
    `;
    entry.querySelector('button').addEventListener('click', () => joinRoom(r.code));
    list.appendChild(entry);
  }
}

function createRoom(gameId) {
  socket.emit('createRoom', { gameId }, (res) => {
    if (res.error) { showToast(res.error); return; }
    currentRoomCode = res.roomCode;
    currentGameId = gameId;
    show('lobby');
    $('lobby-chat-msgs').innerHTML = '';
    renderLobby(res.room);
  });
}

function joinRoom(code) {
  socket.emit('joinRoom', { roomCode: code }, (res) => {
    if (res.error) { showToast(res.error); return; }
    currentRoomCode = code;
    currentGameId = res.room.gameId;
    show('lobby');
    $('lobby-chat-msgs').innerHTML = '';
    renderLobby(res.room);
  });
}

let memoryRows = 6;
let memoryCols = 6;

function renderLobby(room) {
  window.currentRoom = room;
  $('room-code-display').textContent = room.code;
  $('lobby-game-name').textContent = room.gameName + ' — ' + (room.gameDescription || '');
  const list = $('lobby-players');
  list.innerHTML = '';
  const diffLabels = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };
  for (const p of room.players) {
    const row = document.createElement('div');
    row.className = 'player-row';
    const initial = (p.nickname || '?')[0].toUpperCase();
    const diffBadge = p.isBot && p.difficulty ? `<span class="diff-badge diff-${p.difficulty}">${diffLabels[p.difficulty]}</span>` : '';
    const hostControls = p.isBot && room.hostId === window.playerId ? `
      <select class="bot-diff-select" data-bot-id="${p.id}">
        <option value="easy" ${p.difficulty === 'easy' ? 'selected' : ''}>Facile</option>
        <option value="medium" ${p.difficulty === 'medium' ? 'selected' : ''}>Medio</option>
        <option value="hard" ${p.difficulty === 'hard' ? 'selected' : ''}>Difficile</option>
      </select>
      <button class="btn small danger remove-bot-btn" data-bot-id="${p.id}">✕</button>
    ` : '';
    row.innerHTML = `
      <div class="avatar">${initial}</div>
      <div class="nickname">${p.nickname}</div>
      ${p.isBot ? '<span class="bot-badge">Bot</span>' : ''}
      ${diffBadge}
      ${p.id === room.hostId ? '<span class="host-badge">Host</span>' : ''}
      ${hostControls}
    `;
    list.appendChild(row);
  }

  list.querySelectorAll('.bot-diff-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const botId = e.target.dataset.botId;
      const difficulty = e.target.value;
      socket.emit('updateBot', { botId, difficulty }, (res) => {
        if (res && res.error) showToast(res.error);
      });
    });
  });
  list.querySelectorAll('.remove-bot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const botId = e.target.dataset.botId;
      socket.emit('removeBot', { botId }, (res) => {
        if (res && res.error) showToast(res.error);
      });
    });
  });

  const addGroup = $('bot-add-group');
  if (addGroup) addGroup.style.display = room.hostId === window.playerId && room.players.length < room.maxPlayers ? '' : 'none';
  $('start-game-btn').style.display = room.hostId === window.playerId && room.players.length >= room.minPlayers ? '' : 'none';

  const optionsArea = $('game-options');
  optionsArea.innerHTML = '';
  if (room.gameId === 'memory' && room.hostId === window.playerId) {
    const maxVal = window.innerWidth < 768 ? 12 : 15;
    memoryRows = Math.min(memoryRows, maxVal);
    memoryCols = Math.min(memoryCols, maxVal);

    const div = document.createElement('div');
    div.className = 'mem-options';
    div.innerHTML = `
      <div class="label">Opzioni griglia Memory:</div>
      <div class="mem-sliders">
        <label>Righe: <input type="range" min="5" max="${maxVal}" value="${memoryRows}" id="mem-rows-slider">
          <span id="mem-rows-val">${memoryRows}</span></label>
        <label>Colonne: <input type="range" min="5" max="${maxVal}" value="${memoryCols}" id="mem-cols-slider">
          <span id="mem-cols-val">${memoryCols}</span></label>
      </div>
      <div class="mem-preview" id="mem-preview">${memoryRows}×${memoryCols} = ${memoryRows * memoryCols} carte${(memoryRows * memoryCols) % 2 !== 0 ? ' (⭐ jolly incluso)' : ''}</div>
    `;
    optionsArea.appendChild(div);

    $('mem-rows-slider').addEventListener('input', (e) => {
      memoryRows = parseInt(e.target.value);
      $('mem-rows-val').textContent = memoryRows;
      updateMemPreview();
    });
    $('mem-cols-slider').addEventListener('input', (e) => {
      memoryCols = parseInt(e.target.value);
      $('mem-cols-val').textContent = memoryCols;
      updateMemPreview();
    });
  }
}

function updateMemPreview() {
  const p = $('mem-preview');
  if (p) {
    const total = memoryRows * memoryCols;
    p.textContent = `${memoryRows}×${memoryCols} = ${total} carte${total % 2 !== 0 ? ' (⭐ jolly incluso)' : ''}`;
  }
}

function startGame() {
  const options = currentGameId === 'memory' ? { rows: memoryRows, cols: memoryCols } : undefined;
  socket.emit('startGame', { options }, (res) => {
    if (res && res.error) showToast(res.error);
  });
}

function addBot() {
  const difficulty = $('bot-difficulty-select')?.value || 'medium';
  socket.emit('addBot', { difficulty }, (res) => {
    if (res && res.error) showToast(res.error);
  });
}

function leaveRoom() {
  if (currentRoomCode) {
    socket.emit('leaveRoom', null, () => {});
    currentRoomCode = null;
    currentGameId = null;
    window.gameState = null;
    window.currentRoom = null;
    $('game-chat-msgs').innerHTML = '';
    $('lobby-chat-msgs').innerHTML = '';
    show('home');
    loadHome();
  }
}
