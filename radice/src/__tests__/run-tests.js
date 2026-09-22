// Setup mocks BEFORE any imports
const localStorageStore = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, value) => { localStorageStore[key] = value.toString(); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
    get length() { return Object.keys(localStorageStore).length; },
    key: (i) => Object.keys(localStorageStore)[i] || null
  },
  writable: true
});

const mockNavigator = { vibrate: () => {} };
Object.defineProperty(globalThis, 'navigator', { value: mockNavigator, writable: true });

Object.defineProperty(globalThis, 'speechSynthesis', { value: null, writable: true });
Object.defineProperty(globalThis, 'BookS', { value: null, writable: true });
globalThis.BOOKS = [{ id: 'lib-001', title: 'Test', roomType: 'salottino', rarity: 'comune', pages: 3, story: 'Test', flavor: 'Test' }];
globalThis.CHAPTERS = [{ id: 'cap-001', title: 'Test Cap', roomType: 'serra', rarity: 'raro', text: 'Test', flavor: 'Test' }];
globalThis.RARITY_CONFIG = { comune: { color: '#a0a0a0', weight: 55, name: 'Comune' }, raro: { color: '#3b82f6', weight: 25, name: 'Raro' }, epico: { color: '#8b5cf6', weight: 15, name: 'Epico' }, leggendario: { color: '#f59e0b', weight: 5, name: 'Leggendario' } };
globalThis.tensorflow = null;
globalThis.webnn = null;
globalThis.window = globalThis;

import { migrate, needsMigration } from '../core/version.js';
import storeModule from '../core/store.js';
import { AnalyticsEngine } from '../features/owl/analytics.js';
import { getAdaptiveMood, getGufoDialogue, getTimeOfDay } from '../features/owl/mood.js';
import { RecommendationEngine } from '../features/owl/recommender.js';

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, msg) {
  if (actual === expected) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}: expected ${expected}, got ${actual}`); }
}
function assertDeepEqual(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

async function run() {
  console.log('=== Phase 1: Migration ===\n');
  assertEqual(await needsMigration({ version: 1 }), true, 'needsMigration v1');
  assertEqual(await needsMigration({ version: 2 }), false, 'needsMigration v2');
  const r1 = await migrate({ version: 1, seeds: 10 });
  assertEqual(r1.version, 2, 'migrate sets version');
  assertDeepEqual(r1.stats.booksPerRoom, { salottino: 0, atrio: 0, serra: 0 }, 'migrate adds stats');
  assertEqual((await migrate({ version: 1, seeds: 50 })).seeds, 50, 'migrate preserves data');

  console.log('\n=== Phase 2: Store ===\n');
  const state = storeModule.get();
  assertEqual(state.seeds, 20, 'store default seeds');
  assertEqual(Array.isArray(state.booksRead), true, 'store booksRead');
  assertDeepEqual(state.stats.booksPerRoom, { salottino: 0, atrio: 0, serra: 0 }, 'store booksPerRoom');
  storeModule.set({ seeds: 100 });
  assertEqual(storeModule.get('seeds'), 100, 'store set seeds');
  assertEqual(typeof storeModule.subscribe, 'function', 'store subscribe');

  console.log('\n=== Phase 2: Analytics ===\n');
  const analytics = new AnalyticsEngine();
  analytics.track('book_read', { roomType: 'salottino', pages: 3 });
  analytics.track('book_read', { roomType: 'atrio', pages: 5 });
  analytics.track('chapter_found', { id: 'cap-001' });
  const pattern = analytics.getReadingPattern();
  assertEqual(pattern.totalReads >= 2, true, 'analytics tracks reads');
  assertEqual(typeof pattern.roomPreference.salottino, 'number', 'analytics room pref');
  const summary = analytics.getSummary();
  assertEqual(summary.totalReads >= 2, true, 'analytics summary');
  assertEqual(typeof summary.streak, 'number', 'analytics streak');

  console.log('\n=== Phase 2: Mood ===\n');
  assertEqual(['morning','afternoon','evening','night'].includes(getTimeOfDay()), true, 'getTimeOfDay');
  const mood = getAdaptiveMood(5);
  assertEqual(['sleepy','drowsy','happy','proud','ecstatic'].includes(mood.mood), true, 'getAdaptiveMood mood');
  assertEqual(typeof mood.dialogue, 'string', 'mood dialogue');
  const dialogue = getGufoDialogue(5);
  assertEqual(typeof dialogue.timeDialogue, 'string', 'getGufoDialogue timeDialogue');

  console.log('\n=== Phase 2: Recommender ===\n');
  const recommender = new RecommendationEngine();
  assertEqual(Array.isArray(recommender.getRecommendations()), true, 'getRecommendations array');

  console.log('\n=== Phase 3: Gamification ===\n');
  const { AchievementSystem } = await import('../features/ecosystem/gamification.js');
  const achievementSystem = new AchievementSystem();
  const badges = achievementSystem.getAllBadgeDefs();
  assertEqual(badges.length > 0, true, 'badge definitions exist');
  const progress = achievementSystem.getProgress();
  assertEqual(typeof progress.percentage === 'number', true, 'progress tracking');
  const unlocked = achievementSystem.checkAll();
  assertEqual(Array.isArray(unlocked), true, 'achievement check returns array');
  achievementSystem.reset();
  const progressAfterReset = achievementSystem.getProgress();
  assertEqual(progressAfterReset.unlocked, 0, 'reset clears achievements');

  const { Leaderboard } = await import('../features/ecosystem/leaderboard.js');
  const board = new Leaderboard();
  board.submitScore('test-player', 100, { totalReads: 5 });
  board.submitScore('player-b', 200, {});
  const top = board.getTop(10);
  assertEqual(top[0].score >= top[1].score, true, 'top scores sorted');
  const rank = board.getPlayerRank('test-player');
  assertEqual(rank > 0, true, 'player rank');
  board.reset();
  assertEqual(board.getTop(1).length === 0, true, 'reset clears scores');

  console.log('\n=== Phase 3: Ecosistema ===\n');
  const { ShareTarget } = await import('../features/ecosystem/share.js');
  const share = new ShareTarget();
  const support = share.getSupport();
  assertEqual(typeof support.share === 'boolean', true, 'ShareTarget has support flags');

  const { VoiceController } = await import('../features/ecosystem/voice.js');
  const voice = new VoiceController();
  const commands = voice.getCommands();
  assertEqual(Array.isArray(commands) && commands.length > 0, true, 'VoiceController has commands');
  const cmdResult = await voice.processCommand('portami all\'atrio');
  assertEqual(cmdResult.action === 'switchView', true, 'processCommand works');

  const { SensorManager } = await import('../features/ecosystem/sensors.js');
  const sensors = new SensorManager();
  assertEqual(typeof sensors.supportsAccelerometer === 'boolean', true, 'SensorManager flags');
  const growth = sensors.calculateGrowth({ acceleration: { x: 10, y: 5, z: 0 }, gyroscope: { alpha: 0, beta: 0, gamma: 0 } });
  assertEqual(growth >= 0 && growth <= 1, true, 'calculateGrowth range');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
