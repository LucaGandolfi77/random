import { CONFIG, ACHIEVEMENTS, UNLOCKABLES } from './config.js';
import { evaluate, meetsGoal, powerBudgetFor } from './sim.js';

// Model: state + rules + serialization. No DOM, no localStorage here.
const DEFAULT_STATE = {
  version: CONFIG.storageVersion,
  chapter: 1,
  fragments: 0,
  board: [],
  sigilli: [],
  achievements: ACHIEVEMENTS.map((a) => a.id),
  unlockables: UNLOCKABLES.map((u) => u.id),
  tutorialDone: false,
  audioOn: true,
  musicOn: false,
  volume: 0.6,
  lang: 'IT',
  lastAccess: null,
  sandboxRunCount: 0,
};

let state = { ...DEFAULT_STATE };

export function getState() { return { ...state }; }
export function setState(next) { state = { ...state, ...next }; }

export function isUnlocked(kind) {
  const tier = (CONFIG.COMPONENTS.find((c) => c.kind === kind) || {}).tier || 1;
  return tier <= state.chapter;
}

export function isAllowed(kind, chapterId) {
  const ch = CONFIG.CHAPTERS.find((c) => c.id === chapterId);
  if (!ch || !ch.allowedKinds) return true;
  return ch.allowedKinds.includes(kind);
}

export function isChapterUnlocked(id) {
  if (id === 8) return state.sigilli.length >= 6;
  return id <= state.chapter;
}

export function availableForSlot() {
  return CONFIG.COMPONENTS.filter((c) => isUnlocked(c.kind));
}

export function placeComponent(slotIndex, compId) {
  const comp = CONFIG.COMPONENTS.find((c) => c.id === compId);
  if (!comp) return { ok: false, reason: 'unknown' };
  if (!isUnlocked(comp.kind)) return { ok: false, reason: 'locked' };
  const board = [...state.board || []];
  if (board[slotIndex] && board[slotIndex].id === compId) return { ok: false, reason: 'duplicate' };
  board[slotIndex] = comp;
  const newSigilli = new Set(state.sigilli);
  newSigilli.add(comp.id);
  state = { ...state, board, sigilli: [...newSigilli] };
  return { ok: true };
}

export function removeComponent(slotIndex) {
  const board = [...(state.board || [])];
  board[slotIndex] = null;
  state = { ...state, board };
  return { ok: true };
}

export function clearBoard() {
  state = { ...state, board: [] };
  return { ok: true };
}

export function runSimulation(chapterId, board) {
  const workload = CONFIG.WORKLOADS[CONFIG.CHAPTERS.find((c) => c.id === chapterId).workload];
  const budget = powerBudgetFor(chapterId);
  const metrics = evaluate(board, workload, budget);
  const ok = meetsGoal(metrics, workload.goal);
  return { metrics, workload, budget, ok };
}

export function runSandbox(workloadId, board, budget) {
  const workload = CONFIG.WORKLOADS[workloadId];
  const metrics = evaluate(board, workload, budget);
  return { metrics, workload };
}

export function completeChapter(chapterId, won = false) {
  const rewards = [];
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  let achievement = null;
  if (ch) {
    const frags = chapterId === 1 ? 20 : chapterId * 10;
    state = { ...state, fragments: state.fragments + frags };
    rewards.push({ kind: 'fragment', qty: frags });
    if (won) {
      state = { ...state, chapter: Math.max(state.chapter, chapterId + 1) };
      if (chapterId >= 1 && !state.achievements.includes('first_crystal')) {
        achievement = 'first_crystal';
      }
      if (chapterId >= 5 && !state.achievements.includes('master_founder')) {
        achievement = 'master_founder';
      }
      if (state.sigilli.length >= 6 && !state.achievements.includes('collector')) {
        achievement = 'collector';
      }
      if (achievement) state.achievements = [...state.achievements, achievement];
    }
  }
  if (ch && !won && !state.sigilli.find((s) => s === 'core_alba') && chapterId === 1) {
    rewards.push({ kind: 'sigillo', id: 'core_alba' });
  }
  return { rewards, achievement, chapterAdvanced: won };
}

export function validateSave(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.version !== 'number' || typeof raw.chapter !== 'number') return false;
  if (!Array.isArray(raw.sigilli)) return false;
  return true;
}

export function migrate(raw) {
  let v = { ...DEFAULT_STATE, ...raw };
  if (v.version < 1) {
    v.tutorialDone = v.tutorialDone || false;
    v.version = 1;
  }
  v.achievements = Array.isArray(v.achievements) ? v.achievements : [...DEFAULT_STATE.achievements];
  v.unlockables = Array.isArray(v.unlockables) ? v.unlockables : [...DEFAULT_STATE.unlockables];
  v.sigilli = Array.isArray(v.sigilli) ? v.sigilli : [];
  return { ...DEFAULT_STATE, ...v, version: CONFIG.storageVersion };
}

export function exportSave() {
  return JSON.stringify({ version: state.version, exportedAt: Date.now(), payload: state });
}

export function importSave(parsed) {
  if (!parsed || !validateSave(parsed)) return { ok: false };
  state = migrate(parsed.payload || parsed);
  return { ok: true };
}

export function reset() {
  state = { ...DEFAULT_STATE };
  return state;
}
