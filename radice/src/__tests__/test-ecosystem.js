import { test, describe } from './run-tests.js';

// Test AchievementSystem
describe('Phase 3: Gamification — AchievementSystem', () => {
  const { AchievementSystem } = await import('../../features/ecosystem/gamification.js');
  const system = new AchievementSystem();

  test('badge definitions exist', () => {
    const badges = system.getAllBadgeDefs();
    assert(badges.length > 0, 'Should have badge definitions');
    assert(badges[0].id === 'first_read', 'First badge should be first_read');
  });

  test('progress tracking', () => {
    const progress = system.getProgress();
    assert(typeof progress.total === 'number', 'Should have total');
    assert(typeof progress.unlocked === 'number', 'Should have unlocked');
    assert(typeof progress.percentage === 'number', 'Should have percentage');
  });

  test('achievement check returns array', () => {
    const unlocked = system.checkAll();
    assert(Array.isArray(unlocked), 'Should return array');
  });

  test('reset clears achievements', () => {
    system.reset();
    const progress = system.getProgress();
    assert(progress.unlocked === 0, 'Should have 0 unlocked after reset');
  });
});

// Test Leaderboard
describe('Phase 3: Gamification — Leaderboard', () => {
  const { Leaderboard } = await import('../../features/ecosystem/leaderboard.js');
  const board = new Leaderboard();

  test('submit and retrieve score', () => {
    const entry = board.submitScore('test-player', 100, { totalReads: 5 });
    assert(entry.score === 100, 'Score should be 100');
    assert(entry.playerId === 'test-player', 'Player ID should match');
  });

  test('top scores sorted descending', () => {
    board.submitScore('player-b', 200, {});
    board.submitScore('player-c', 50, {});
    const top = board.getTop(10);
    assert(top[0].score >= top[1].score, 'Should be sorted descending');
  });

  test('player rank', () => {
    const rank = board.getPlayerRank('test-player');
    assert(rank > 0, 'Rank should be > 0');
  });

  test('reset clears scores', () => {
    board.reset();
    assert(board.getTop(1).length === 0, 'Should be empty after reset');
  });
});

// Test ShareTarget
describe('Phase 3: Ecosistema — ShareTarget', () => {
  const { ShareTarget } = await import('../../features/ecosystem/share.js');
  const share = new ShareTarget();

  test('initialized', () => {
    const supported = share.getSupport();
    assert(typeof supported.share === 'boolean', 'Should have share boolean');
  });
});

// Test VoiceController
describe('Phase 3: Ecosistema — VoiceController', () => {
  const { VoiceController } = await import('../../features/ecosystem/voice.js');
  const voice = new VoiceController();

  test('initialized', () => {
    const supported = voice.supported;
    assert(typeof supported === 'boolean', 'Should have supported boolean');
  });

  test('has commands', () => {
    const commands = voice.getCommands();
    assert(Array.isArray(commands), 'Should have command list');
    assert(commands.length > 0, 'Should have at least one command');
  });

  test('processCommand works', () => {
    const result = voice.processCommand('portami all\'atrio');
    assert(result.action === 'switchView', 'Should return switchView action');
    assert(result.target === 'tree', 'Target should be tree');
  });
});

// Test SensorManager
describe('Phase 3: Ecosistema — SensorManager', () => {
  const { SensorManager } = await import('../../features/ecosystem/sensors.js');
  const sensors = new SensorManager();

  test('initialized with defaults', () => {
    assert(typeof sensors.supportsAccelerometer === 'boolean', 'Should have accelerometer flag');
    assert(typeof sensors.supportsGyroscope === 'boolean', 'Should have gyroscope flag');
  });

  test('calculateGrowth works', () => {
    const growth = sensors.calculateGrowth({
      acceleration: { x: 10, y: 5, z: 0 },
      gyroscope: { alpha: 0, beta: 0, gamma: 0 }
    });
    assert(typeof growth === 'number', 'Should return number');
    assert(growth >= 0 && growth <= 1, 'Growth should be between 0 and 1');
  });
});

console.log('✅ Phase 3 Ecosystem tests defined');
