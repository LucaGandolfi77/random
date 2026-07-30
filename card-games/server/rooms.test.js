const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rooms = require('./rooms');

describe('rooms bot difficulty', () => {
  it('addBot stores given difficulty', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const result = rooms.addBot(roomCode, 'easy');
    assert.equal(result.ok, true);
    assert.equal(result.bot.difficulty, 'easy');
    const bot = room.players.find(p => p.isBot);
    assert.equal(bot.difficulty, 'easy');
  });

  it('addBot defaults to medium', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const result = rooms.addBot(roomCode);
    assert.equal(result.ok, true);
    assert.equal(result.bot.difficulty, 'medium');
    const bot = room.players.find(p => p.isBot);
    assert.equal(bot.difficulty, 'medium');
  });

  it('addBot rejects invalid difficulty', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const result = rooms.addBot(roomCode, 'extreme');
    assert.equal(result.error, 'Invalid difficulty');
    assert.equal(room.players.filter(p => p.isBot).length, 0);
  });

  it('addBot returns error when room is full', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    rooms.addBot(roomCode);
    rooms.addBot(roomCode);
    rooms.addBot(roomCode);
    const result = rooms.addBot(roomCode);
    assert.equal(result.error, 'Room full');
    assert.equal(room.players.length, 4);
  });

  it('updateBotDifficulty changes difficulty', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const { bot } = rooms.addBot(roomCode, 'easy');
    const result = rooms.updateBotDifficulty(roomCode, bot.id, 'hard');
    assert.equal(result.ok, true);
    const b = room.players.find(p => p.isBot);
    assert.equal(b.difficulty, 'hard');
  });

  it('updateBotDifficulty rejects after game start', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const { bot } = rooms.addBot(roomCode, 'easy');
    room.state = 'playing';
    const result = rooms.updateBotDifficulty(roomCode, bot.id, 'hard');
    assert.equal(result.error, 'Cannot modify bot after game start');
  });

  it('removeBot removes bot and returns nickname', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const { bot } = rooms.addBot(roomCode, 'medium');
    assert.equal(room.players.filter(p => p.isBot).length, 1);
    const result = rooms.removeBot(roomCode, bot.id);
    assert.equal(result.ok, true);
    assert.equal(result.nickname, bot.nickname);
    assert.equal(room.players.filter(p => p.isBot).length, 0);
  });

  it('removeBot rejects after game start', () => {
    const { room, roomCode } = rooms.createRoom('scopa', 'host-id', 'Host');
    const { bot } = rooms.addBot(roomCode, 'medium');
    room.state = 'playing';
    const result = rooms.removeBot(roomCode, bot.id);
    assert.equal(result.error, 'Cannot remove bot after game start');
  });

  it('pickBotAction with hard always returns valid action', () => {
    const { room, roomCode } = rooms.createRoom('memory', 'host-id', 'Host');
    const { bot } = rooms.addBot(roomCode, 'hard');
    const state = room.game.create(room.players, { rows: 5, cols: 5 });
    state.currentPlayer = bot.id;
    const actions = room.game.getValidActions(state, bot.id);
    assert.ok(actions.length > 0);
    for (let i = 0; i < 20; i++) {
      const action = rooms.pickBotAction(room.game, actions, state, bot.id, 'hard');
      assert.ok(action, 'hard should always return an action');
      assert.ok(actions.some(a => a.type === action.type), `action type ${action.type} should be valid`);
    }
  });

  it('pickBotAction with easy/medium returns valid actions', () => {
    const { room, roomCode } = rooms.createRoom('blackjack', 'host-id', 'Host');
    rooms.addBot(roomCode, 'hard');
    const state = room.game.create(room.players);
    state.currentPlayer = room.players[0].id;
    state.phase = 'play';
    for (const diff of ['easy', 'medium', 'hard']) {
      const actions = room.game.getValidActions(state, room.players[0].id);
      assert.ok(actions.length > 0);
      for (let i = 0; i < 10; i++) {
        const action = rooms.pickBotAction(room.game, actions, state, room.players[0].id, diff);
        assert.ok(action, `${diff} should return an action`);
        assert.ok(actions.some(a => a.type === action.type), `${diff}: action type ${action.type} should be valid`);
      }
    }
  });
});
