const registry = require('./games/registry');

const rooms = new Map();
const playerRoom = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(code)) return code;
  }
  return Date.now().toString(36).toUpperCase().slice(0, 4);
}

function createRoom(gameId, hostId, hostNickname) {
  const game = registry.get(gameId);
  if (!game) return { error: 'Game not found' };

  const code = generateCode();
  const room = {
    code, gameId, game, state: 'waiting',
    players: [{ id: hostId, nickname: hostNickname, isBot: false, socketId: hostId }],
    hostId, gameState: null, botTimers: [], turnTimer: null, chatHistory: [],
  };
  rooms.set(code, room);
  playerRoom.set(hostId, code);
  return { room, roomCode: code };
}

function getRoom(code) { return rooms.get(code) || null; }

function joinRoom(code, playerId, playerNickname) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting') return { error: 'Game already started' };
  if (room.players.length >= room.game.maxPlayers) return { error: 'Room full' };
  if (room.players.find(p => p.id === playerId)) return { error: 'Already in room' };
  room.players.push({ id: playerId, nickname: playerNickname, isBot: false, socketId: playerId });
  playerRoom.set(playerId, code);
  return { ok: true, room };
}

function leaveRoom(playerId) {
  const code = playerRoom.get(playerId);
  if (!code) return;
  const room = rooms.get(code);
  if (!room) { playerRoom.delete(playerId); return; }

  room.players = room.players.filter(p => p.id !== playerId);
  playerRoom.delete(playerId);

  if (room.players.length === 0) {
    clearTimers(room);
    rooms.delete(code);
    return;
  }

  if (room.hostId === playerId) room.hostId = room.players[0].id;
  removePendingPlayer(room, playerId);
  return room;
}

function removePendingPlayer(room, playerId) {
  if (room.gameState) {
    const idx = room.gameState.playerOrder.indexOf(playerId);
    if (idx >= 0) {
      room.gameState.playerOrder.splice(idx, 1);
      delete room.gameState.hands[playerId];
      if (room.gameState.captured) delete room.gameState.captured[playerId];
      if (room.gameState.chips) delete room.gameState.chips[playerId];
      if (room.gameState.bets) delete room.gameState.bets[playerId];
      if (room.gameState.playerDone) delete room.gameState.playerDone[playerId];
      if (room.gameState.blackjacks) delete room.gameState.blackjacks[playerId];
      if (room.gameState.results) delete room.gameState.results[playerId];
      if (room.gameState.scopePoints) delete room.gameState.scopePoints[playerId];
    }
  }
}

function addBot(code) {
  const room = rooms.get(code);
  if (!room || room.state !== 'waiting') return { error: 'Cannot add bot' };
  if (room.players.length >= room.game.maxPlayers) return { error: 'Room full' };
  const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nickname = `Bot ${room.players.filter(p => p.isBot).length + 1}`;
  room.players.push({ id: botId, nickname, isBot: true, socketId: null });
  return { ok: true, bot: { id: botId, nickname } };
}

function startGame(code) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting') return { error: 'Game already started' };
  if (room.players.length < room.game.minPlayers) return { error: 'Not enough players' };
  const gameState = room.game.create(room.players);
  room.gameState = gameState;
  room.state = 'playing';
  return { ok: true, gameState };
}

function handleAction(code, playerId, action) {
  const room = rooms.get(code);
  if (!room || !room.gameState) return { error: 'No active game' };
  const result = room.game.applyAction(room.gameState, playerId, action);
  clearTurnTimer(room);
  return result;
}

const TIMEOUT_MS = 45000;

function startTurnTimer(room, io) {
  clearTurnTimer(room);
  if (!room.gameState || room.gameState.phase === 'gameOver') return;
  if (room.gameState.meta && room.gameState.meta.id === 'blackjack' && room.gameState.phase === 'bet') {
    return;
  }
  if (room.gameState.handOver) return;
  const currentId = room.gameState.currentPlayer;
  if (room.players.some(p => p.id === currentId && p.isBot)) return; // bots handled by bot.js

  room.turnTimer = setTimeout(() => {
    if (!room.gameState || room.gameState.phase === 'gameOver') return;
    const pid = room.gameState.currentPlayer;
    const actions = room.game.getValidActions(room.gameState, pid);
    if (!actions || actions.length === 0) return;

    const defaultAction = pickDefaultAction(room.game, actions, room.gameState, pid);
    if (!defaultAction) return;

    if (room.players.some(p => p.id === pid && p.isBot)) return;

    const result = room.game.applyAction(room.gameState, pid, defaultAction);
    if (result && result.error) return;

    if (room.gameState.phase === 'roundEnd' && room.game.nextRound) {
      room.game.nextRound(room.gameState);
    }

    const state = {};
    for (const p of room.gameState.playerOrder) {
      state[p] = room.game.getPublicState(room.gameState, p);
    }
    for (const p of room.gameState.playerOrder) {
      io.to(p).emit('gameUpdate', state[p]);
    }
    scheduleBotAction(room, io);
    startTurnTimer(room, io);
  }, TIMEOUT_MS);
}

function pickDefaultAction(game, actions, gameState, pid) {
  if (actions.some(a => a.type === 'stand')) return { type: 'stand' };
  if (actions.some(a => a.type === 'bet')) return actions[0];
  if (actions.length > 0) {
    const nonNull = actions.filter(a => a.take === null || a.take);
    if (nonNull.length > 0) return nonNull[Math.floor(Math.random() * nonNull.length)];
    return actions[0];
  }
  return null;
}

function clearTurnTimer(room) {
  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
}

function clearTimers(room) {
  clearTurnTimer(room);
  for (const t of room.botTimers) clearTimeout(t);
  room.botTimers = [];
}

function getRoomList() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.state === 'waiting') {
      list.push({
        code: room.code, gameId: room.gameId, gameName: room.game.name,
        playerCount: room.players.length, maxPlayers: room.game.maxPlayers,
        players: room.players.map(p => ({ nickname: p.nickname, isBot: p.isBot })),
      });
    }
  }
  return list;
}

function getPlayerRoom(playerId) { return playerRoom.get(playerId) || null; }

function scheduleBotAction(room, io) {
  if (!room.gameState || room.gameState.phase === 'gameOver') return;
  const pid = room.gameState.currentPlayer;
  const bot = room.players.find(p => p.id === pid && p.isBot);
  if (!bot) return;

  const actions = room.game.getValidActions(room.gameState, bot.id);
  if (!actions || actions.length === 0) return;

  const delay = 1500 + Math.random() * 2000;
  const timer = setTimeout(() => {
    const action = pickBotAction(room.game, actions, room.gameState, bot.id);
    if (!action) return;

    const result = room.game.applyAction(room.gameState, bot.id, action);
    if (result && result.error) return;

    if (room.gameState.phase === 'roundEnd' && room.game.nextRound) {
      room.game.nextRound(room.gameState);
    }

    const state = {};
    for (const p of room.gameState.playerOrder) {
      state[p] = room.game.getPublicState(room.gameState, p);
    }
    for (const p of room.gameState.playerOrder) {
      io.to(p).emit('gameUpdate', state[p]);
    }
    scheduleBotAction(room, io);
    startTurnTimer(room, io);
  }, delay);
  room.botTimers.push(timer);
}

function pickBotAction(game, actions, gameState, botId) {
  if (game.getBotAction) {
    return game.getBotAction(gameState, botId);
  }

  const standHit = actions.find(a => a.type === 'stand');
  if (standHit && gameState && gameState.meta && gameState.meta.id === 'blackjack') {
    const hand = gameState.hands[botId] || [];
    const val = hand.reduce((s, c) => {
      if (c.rank === 'A') return s + 11;
      if (['K', 'Q', 'J', '10'].includes(c.rank)) return s + 10;
      return s + (parseInt(c.rank) || 0);
    }, 0);
    if (val >= 17) return { type: 'stand' };
    if (val < 17) return { type: 'hit' };
  }

  const takeActions = actions.filter(a => a.take && a.take.length > 0);
  if (takeActions.length > 0) {
    const multi = takeActions.filter(a => a.take.length >= 2);
    if (multi.length > 0) return multi[Math.floor(Math.random() * multi.length)];
    return takeActions[Math.floor(Math.random() * takeActions.length)];
  }
  return actions[Math.floor(Math.random() * actions.length)];
}

module.exports = { createRoom, getRoom, joinRoom, leaveRoom, addBot, startGame, handleAction, clearTimers, getRoomList, getPlayerRoom, scheduleBotAction, startTurnTimer, clearTurnTimer };
