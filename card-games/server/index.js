const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const rooms = require('./rooms');
const registry = require('./games/registry');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/games', (req, res) => res.json(registry.list()));
app.get('/api/rooms', (req, res) => res.json(rooms.getRoomList()));

io.on('connection', (socket) => {
  const nickname = socket.handshake.query.nickname || 'Anonimo';
  if (rooms.getPlayerRoom(socket.id)) rooms.leaveRoom(socket.id);

  socket.on('createRoom', ({ gameId }, cb) => {
    const result = rooms.createRoom(gameId, socket.id, nickname);
    if (result.error) { cb({ error: result.error }); return; }
    socket.join(result.roomCode);
    cb({ ok: true, roomCode: result.roomCode, room: serializeRoom(result.room) });
    io.emit('roomListUpdate', rooms.getRoomList());
  });

  socket.on('joinRoom', ({ roomCode }, cb) => {
    const result = rooms.joinRoom(roomCode, socket.id, nickname);
    if (result.error) { cb({ error: result.error }); return; }
    socket.join(roomCode);
    cb({ ok: true, room: serializeRoom(result.room) });
    io.to(roomCode).emit('roomUpdate', serializeRoom(result.room));
    io.to(roomCode).emit('chatMessage', { from: 'Sistema', text: `${nickname} è entrato nella stanza` });
    io.emit('roomListUpdate', rooms.getRoomList());
  });

  socket.on('leaveRoom', (_, cb) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) { if (cb) cb({ ok: true }); return; }
    const room = rooms.getRoom(code);
    const result = rooms.leaveRoom(socket.id);
    socket.leave(code);
    if (result && result.room) {
      io.to(code).emit('roomUpdate', serializeRoom(result.room));
      io.to(code).emit('chatMessage', { from: 'Sistema', text: `${nickname} ha lasciato la stanza` });
    }
    io.emit('roomListUpdate', rooms.getRoomList());
    if (cb) cb({ ok: true });
  });

  socket.on('addBot', (_, cb) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) { cb({ error: 'Not in a room' }); return; }
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) { cb({ error: 'Only host can add bots' }); return; }
    const result = rooms.addBot(code);
    if (result.error) { cb(result); return; }
    io.to(code).emit('roomUpdate', serializeRoom(room));
    io.to(code).emit('chatMessage', { from: 'Sistema', text: `${result.bot.nickname} è stato aggiunto` });
    cb({ ok: true, bot: result.bot });
  });

  socket.on('startGame', ({ options } = {}, cb) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) { cb({ error: 'Not in a room' }); return; }
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) { cb({ error: 'Only host can start' }); return; }

    const result = rooms.startGame(code, options);
    if (result.error) { cb(result); return; }

    io.to(code).emit('gameStarted');
    io.to(code).emit('chatMessage', { from: 'Sistema', text: '🎲 Partita iniziata!' });

    for (const pid of room.gameState.playerOrder) {
      const st = room.game.getPublicState(room.gameState, pid);
      st.gameType = room.game.meta.id;
      io.to(pid).emit('gameUpdate', st);
    }

    rooms.scheduleBotAction(room, io);
    rooms.startTurnTimer(room, io);
    cb({ ok: true });
  });

  socket.on('playerAction', ({ action }, cb) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) { if (cb) cb({ error: 'Not in a room' }); return; }
    const room = rooms.getRoom(code);
    if (!room) { if (cb) cb({ error: 'Room not found' }); return; }

    const result = rooms.handleAction(code, socket.id, action);
    if (result && result.error) { if (cb) cb(result); return; }

    if (result) {
      if (room.gameState.phase === 'roundEnd' && room.game.nextRound) {
        room.game.nextRound(room.gameState);
      }

      for (const pid of room.gameState.playerOrder) {
        const st = room.game.getPublicState(room.gameState, pid);
        st.gameType = room.game.meta.id;
        io.to(pid).emit('gameUpdate', st);
      }
      rooms.scheduleBotAction(room, io);
      rooms.startTurnTimer(room, io);
    }
    if (cb) cb({ ok: true });
  });

  socket.on('requestGameState', (_, cb) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) { if (cb) cb({ error: 'Not in a room' }); return; }
    const room = rooms.getRoom(code);
    if (!room || !room.gameState) { if (cb) cb({ error: 'No game state' }); return; }
    const st = room.game.getPublicState(room.gameState, socket.id);
    st.gameType = room.game.meta.id;
    if (cb) cb(st);
  });

  socket.on('sendChat', ({ text }) => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code || !text || !text.trim()) return;
    const room = rooms.getRoom(code);
    if (!room) return;
    io.to(code).emit('chatMessage', { from: nickname, text: text.trim() });
  });

  socket.on('disconnect', () => {
    const code = rooms.getPlayerRoom(socket.id);
    if (!code) return;
    const room = rooms.getRoom(code);
    if (!room) { rooms.leaveRoom(socket.id); return; }

    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.isBot) {
      if (room.state === 'waiting') {
        const result = rooms.leaveRoom(socket.id);
        if (result && result.room) {
          io.to(code).emit('roomUpdate', serializeRoom(result.room));
          io.to(code).emit('chatMessage', { from: 'Sistema', text: `${nickname} si è disconnesso` });
        }
      } else {
        io.to(code).emit('chatMessage', { from: 'Sistema', text: `${nickname} si è disconnesso!` });
        rooms.leaveRoom(socket.id);
        if (room.gameState) {
          for (const pid of room.gameState.playerOrder) {
            const st = room.game.getPublicState(room.gameState, pid);
            st.gameType = room.game.meta.id;
            io.to(pid).emit('gameUpdate', st);
          }
          rooms.scheduleBotAction(room, io);
          rooms.startTurnTimer(room, io);
        }
      }
      io.emit('roomListUpdate', rooms.getRoomList());
    }
  });
});

function serializeRoom(room) {
  if (!room) return null;
  return {
    code: room.code, gameId: room.gameId, gameName: room.game.name,
    state: room.state, chatHistory: room.chatHistory || [],
    players: room.players.map(p => ({ id: p.id, nickname: p.nickname, isBot: p.isBot })),
    hostId: room.hostId, minPlayers: room.game.minPlayers, maxPlayers: room.game.maxPlayers,
    gameDescription: room.game.description,
  };
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  const glist = registry.list();
  console.log(`\n  🃏 Server giochi di carte avviato!`);
  console.log(`  📡 Connettiti da un altro dispositivo sulla stessa rete:`);
  console.log(`  ───────────────────────────────────────`);
  console.log(`  ▶  http://${ip}:${PORT}`);
  console.log(`  ▶  http://localhost:${PORT} (locale)`);
  console.log(`  ───────────────────────────────────────`);
  console.log(`  Giochi disponibili: ${glist.map(g => g.name).join(', ')}`);
  console.log(`  Turni automatici dopo 45 secondi di inattività`);
  console.log(`  Chat di stanza attiva`);
  console.log(`  Premi Ctrl+C per fermare il server\n`);
});
