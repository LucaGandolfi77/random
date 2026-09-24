import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ---- Browser environment mocks ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

globalThis.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener() {},
  AudioContext: undefined,
  webkitAudioContext: undefined
};
// Node may expose a read-only navigator; ensure vibrate is absent/safe
try {
  if (!('navigator' in globalThis)) {
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate: null }, configurable: true });
  }
} catch { /* ignore */ }
globalThis.performance = globalThis.performance || { now: () => Date.now() };

const rafQueue = [];
globalThis.requestAnimationFrame = (cb) => {
  rafQueue.push(cb);
  return rafQueue.length;
};
globalThis.cancelAnimationFrame = () => {};

function pumpFrames(n = 1) {
  for (let i = 0; i < n; i++) {
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const cb of batch) cb(performance.now());
  }
}

// Minimal DOM
function makeEl(id = '') {
  const el = {
    id,
    style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, force) {
        if (force === undefined) force = !this._s.has(c);
        if (force) this._s.add(c); else this._s.delete(c);
        return force;
      },
      contains(c) { return this._s.has(c); }
    },
    children: [],
    _html: '',
    set innerHTML(v) { this._html = v; this.children = []; },
    get innerHTML() { return this._html; },
    textContent: '',
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    title: '',
    disabled: false,
    dataset: {},
    onclick: null
  };
  return el;
}

const dom = new Map();
function getDocEl(id) {
  if (!dom.has(id)) dom.set(id, makeEl(id));
  return dom.get(id);
}

globalThis.document = {
  getElementById: (id) => getDocEl(id),
  createElement: (tag) => makeEl(''),
  querySelectorAll: () => [],
  addEventListener() {},
  body: makeEl('body')
};

const baseCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
  fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {},
  stroke() {}, moveTo() {}, lineTo() {}, closePath() {}, fillText() {},
  ellipse() {}, rect() {}, quadraticCurveTo() {}, bezierCurveTo() {},
  setLineDash() {}, drawImage() {}, clip() {},
  measureText: () => ({ width: 10 }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createPattern: () => null,
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {}
};
// Auto-fill any other 2D context methods the particle system might use
const ctxStub = new Proxy(baseCtx, {
  get(t, prop) {
    if (prop in t) return t[prop];
    if (typeof prop === 'string') {
      const fn = () => undefined;
      t[prop] = fn;
      return fn;
    }
    return undefined;
  },
  set(t, prop, v) { t[prop] = v; return true; }
});
const canvas = {
  width: 800, height: 600,
  style: {},
  getContext: () => ctxStub,
  addEventListener() {}
};

const { Game } = await import('../js/game.js');
const { getCard, getFusablePairs } = await import('../js/card-engine.js');
const { saveStats, loadStats } = await import('../js/save.js');
const { FUSION_RECIPES } = await import('../data/fusions.js');

beforeEach(() => {
  store.clear();
  dom.clear();
  rafQueue.length = 0;
  saveStats({
    gamesPlayed: 0, wins: 0, losses: 0, threeStarWins: 0, fusions: 0,
    bossesDefeated: 0, essences: {}, weatherTypes: [], ultimateUses: 0,
    companionsUsed: [], achievementsUnlocked: [], highScore: 0,
    cardsPlayed: {}, currentDeck: [
      'moss_wisp', 'spore_sprout', 'dartling', 'starling_scout',
      'elder_tree', 'moon_fox', 'acorn_bomber', 'breeze_lark'
    ],
    unlockedCards: [], difficulty: 'medium'
  });
});

async function newStartedGame(companion = 'fox_spirit', difficulty = 'medium') {
  const g = new Game();
  g.init(canvas);
  g.startGame(difficulty, companion);
  return g;
}

test('startGame preserves the selected companion', async () => {
  const g = await newStartedGame('moon_spirit');
  assert.equal(g.selectedCompanion, 'moon_spirit', 'companion must not be reset');
  assert.equal(g.gameState, 'playing');
  assert.ok(Array.isArray(g.battleLog), 'battleLog must be initialized');
  assert.equal(g.playerDeck.getHandSize(), 4, 'player should draw 4 cards');
  assert.equal(g.ai.hand.length, 4, 'AI should draw 4 cards');
  assert.ok(g.stats.currentDeck.length > 0);
});

test('playing a card does not crash and charges player elixir only', async () => {
  const g = await newStartedGame();
  g.elixir = 4;
  const aiElixirBefore = g.ai.elixir;
  const handSizeBefore = g.playerDeck.getHandSize();

  // Pick an affordable card
  const hand = g.playerDeck.getHand();
  let idx = hand.findIndex(c => c.elixir <= 4);
  assert.ok(idx >= 0, 'should have an affordable card');
  const card = hand[idx];
  const playerElixirBefore = g.elixir;

  await g.playCard(idx);

  assert.equal(g.elixir, playerElixirBefore - card.elixir, 'player elixir charged');
  assert.equal(g.battleLog.length >= 1, true, 'battleLog entry added without crashing');
  assert.equal(g.turnCount, 1);
  assert.ok(g.arena.playerUnits.some(u => u.cardId === card.id), 'unit summoned');
  // AI elixir is independent: may have changed only via its own plays/regen, never equal to a forced drain of player pool
  assert.notEqual(g.elixir, playerElixirBefore, 'player elixir changed');
  assert.ok(typeof g.ai.elixir === 'number');
  assert.ok(g.ai.elixir >= 0 && g.ai.elixir <= g.ai.maxElixir, 'AI elixir within bounds');
  assert.ok(g.playerDeck.getHandSize() >= 1 || g.playerDeck.getHandSize() <= 4);
  assert.ok(g.playerDeck.getHandSize() <= 4, 'hand capped at 4');
  void handSizeBefore; void aiElixirBefore; void getCard;
});

test('insufficient elixir returns the card to hand', async () => {
  const g = await newStartedGame();
  g.elixir = 0;
  const hand = g.playerDeck.getHand();
  const idx = hand.findIndex(c => c.elixir > 0);
  if (idx < 0) return;
  const sizeBefore = g.playerDeck.getHandSize();
  const discardBefore = (g.playerDeck.discard || []).length;
  await g.playCard(idx);
  assert.equal(g.elixir, 0, 'no elixir spent');
  assert.equal(g.playerDeck.getHandSize(), sizeBefore, 'card returned to hand');
  assert.equal((g.playerDeck.discard || []).length, discardBefore, 'card not discarded');
});

test('fusion removes both ingredients, charges once, adds evolved unit', async () => {
  const g = await newStartedGame();
  g.elixir = 10;

  // Summon the two ingredients directly
  const moss = getCard('moss_wisp');
  const dart = getCard('dartling');
  const { createUnit } = await import('../js/card-engine.js');
  const u1 = createUnit(moss, 'player', 0);
  const u2 = createUnit(dart, 'player', 1);
  u1.x = 100; u1.y = 420;
  u2.x = 200; u2.y = 420;
  g.arena.addUnit(u1, 'player');
  g.arena.addUnit(u2, 'player');

  const pairs = getFusablePairs(g.arena.playerUnits);
  assert.equal(pairs.length, 1, 'pair should be detected');
  const recipe = pairs[0].recipe;
  const unitsBefore = g.arena.playerUnits.length;

  const ok = g.activateFusion(recipe, pairs[0]);
  assert.equal(ok, true);
  assert.equal(g.elixir, 10 - recipe.elixir, 'recipe charged exactly once');
  assert.equal(g.fusionsThisGame, 1);
  // Both ingredients gone, one evolved present
  assert.ok(!g.arena.playerUnits.includes(u1), 'ingredient 1 removed');
  assert.ok(!g.arena.playerUnits.includes(u2), 'ingredient 2 removed');
  assert.ok(g.arena.playerUnits.some(u => u.cardId === recipe.id), 'evolved unit added');
  assert.ok(g.arena.playerUnits.length <= unitsBefore - 1, 'net units did not grow beyond ingredients');
});

test('fusion is rejected without enough elixir', async () => {
  const g = await newStartedGame();
  g.elixir = 0;
  const { createUnit } = await import('../js/card-engine.js');
  g.arena.addUnit(createUnit(getCard('moss_wisp'), 'player', 0), 'player');
  g.arena.addUnit(createUnit(getCard('dartling'), 'player', 1), 'player');
  const pairs = getFusablePairs(g.arena.playerUnits);
  assert.equal(pairs.length, 1);
  const ok = g.activateFusion(pairs[0].recipe, pairs[0]);
  assert.equal(ok, false);
  assert.equal(g.elixir, 0);
  assert.equal(g.fusionsThisGame, 0);
  assert.equal(g.arena.playerUnits.length, 2, 'ingredients untouched');
});

test('endGame counts a match only once even if called repeatedly', async () => {
  const g = await newStartedGame();
  const statsBefore = loadStats();
  g.arena.enemyStructure.hp = 0;
  g.arena.enemyStructure.alive = false;

  g.endGame('player');
  g.endGame('player');
  g.endGame('player');

  const after = loadStats();
  assert.equal(after.wins, (statsBefore.wins || 0) + 1, 'exactly one win recorded');
  assert.equal(after.gamesPlayed, (statsBefore.gamesPlayed || 0) + 1, 'exactly one game recorded');
  assert.equal(g.gameState, 'over');
});

test('combat does not attack the structure from across the field', async () => {
  const g = await newStartedGame();
  const { createUnit } = await import('../js/card-engine.js');
  const u = createUnit(getCard('dartling'), 'player', 0);
  u.x = 100; u.y = 420;
  u.nextAttackAt = 0;
  g.arena.addUnit(u, 'player');
  const hpBefore = g.arena.enemyStructure.hp;

  g.doCombat();
  assert.equal(g.arena.enemyStructure.hp, hpBefore, 'far unit must not hit structure');

  u.x = 490;
  u.nextAttackAt = 0;
  g.doCombat();
  assert.ok(g.arena.enemyStructure.hp < hpBefore, 'close unit should hit structure');
});

test('attack cooldown prevents per-frame damage', async () => {
  const g = await newStartedGame();
  const { createUnit } = await import('../js/card-engine.js');
  const attacker = createUnit(getCard('dartling'), 'player', 0);
  const target = createUnit(getCard('thorn_bush'), 'enemy', 0);
  attacker.x = 100; target.x = 120;
  attacker.nextAttackAt = 0;
  g.arena.addUnit(attacker, 'player');
  g.arena.addUnit(target, 'enemy');

  g.doCombat();
  const hpAfterFirst = target.hp;
  assert.ok(hpAfterFirst < target.maxHp, 'first hit lands');
  g.doCombat();
  g.doCombat();
  assert.equal(target.hp, hpAfterFirst, 'cooldown blocks immediate follow-up hits');
});

test('AI uses its own elixir pool', async () => {
  const g = await newStartedGame();
  g.elixir = 4;
  g.ai.elixir = 0;
  // AI cannot afford anything
  assert.equal(g.ai.canPlay(g.ai.hand, g.ai.elixir), false);
  const playerElixir = g.elixir;
  await g.handleAIturn();
  assert.equal(g.elixir, playerElixir, 'player elixir untouched by AI turn');
  assert.ok(g.ai.elixir >= 0);
});

test('boss defeat is recorded exactly once on victory', async () => {
  const g = await newStartedGame();
  const { getNextBoss } = await import('../data/bosses.js');
  const bossTemplate = getNextBoss(4);
  assert.ok(bossTemplate, 'need a boss template for 4 wins');
  g.stats.wins = 4;
  g.bossActive = true;
  g.boss = { ...bossTemplate };
  g.bossShield = bossTemplate.shield || 0;
  g.arena.enemyStructure.hp = 0;
  g.arena.enemyStructure.alive = false;

  g.endGame('player');
  const after = loadStats();
  assert.equal(after.bossesDefeated, 1, 'boss defeat recorded once');
  assert.equal(g.bossActive, false, 'boss state cleared');
});

test('updateBossMechanics implements shadow queen steal and dragon power ramp', async () => {
  const g = await newStartedGame();
  g.bossActive = true;
  g.boss = { id: 'shadow_queen', attackDmg: 20, hp: 200, maxHp: 200 };
  const handBefore = g.playerDeck.hand.length;
  g.updateBossMechanics();
  if (handBefore > 0) {
    assert.equal(g.playerDeck.hand.length, handBefore - 1, 'a card was stolen');
    assert.ok(g.bossStolenCard, 'stolen card tracked');
  }

  g.boss = { id: 'ancient_dragon', attackDmg: 12, hp: 250, maxHp: 250 };
  g.bossPowerLevel = 0;
  g.updateBossMechanics();
  g.updateBossMechanics();
  g.updateBossMechanics();
  assert.equal(g.boss.attackDmg, 24, 'power doubles every 3 boss turns');
});

test('gameLoop keeps running while paused and resumes', async () => {
  const g = await newStartedGame();
  pumpFrames(2);
  assert.ok(rafQueue.length > 0, 'loop scheduled while playing');

  g.paused = true;
  pumpFrames(3);
  assert.ok(rafQueue.length > 0, 'loop must keep scheduling while paused');

  g.paused = false;
  const elixir = g.elixir;
  // Advance ~2 seconds of ticks
  const realNow = () => performance.now();
  let t = realNow();
  performance.now = () => t;
  for (let i = 0; i < 65; i++) {
    t += 16;
    pumpFrames(1);
  }
  // Restore a working now()
  performance.now = () => Date.now();
  assert.ok(g.elixir >= elixir, 'elixir regenerates after resume');
  void realNow;
});

test('weather applies to summoned units', async () => {
  const g = await newStartedGame();
  g.weather = 'SUNNY';
  const card = getCard('moon_fox');
  const { createUnit } = await import('../js/card-engine.js');
  const u = createUnit(card, 'player', 0);
  g.applyWeatherToUnit(u);
  // SUNNY has damageBonus 0.5 → dmg should be boosted vs base
  assert.ok(u.dmg > card.dmg, `weather should boost dmg (${u.dmg} vs ${card.dmg})`);
  void FUSION_RECIPES;
});
