const STORAGE_KEY = 'radice-save-v1';
const SAVE_VERSION = 1;

const SAVE_KEYS = {
  seeds: 'radice-seeds',
  booksRead: 'radice-booksRead',
  chaptersCollected: 'radice-chapters',
  roomsUnlocked: 'radice-rooms',
  readingHistory: 'radice-history',
  totalReads: 'radice-totalReads',
  lastPlay: 'radice-lastPlay',
  stats: 'radice-stats'
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === SAVE_VERSION) return data.state;
    }
  } catch (e) { console.warn('Failed to load save:', e); }
  return getDefaultState();
}

function getDefaultState() {
  return {
    version: SAVE_VERSION,
    seeds: 20,
    booksRead: [],
    chaptersCollected: [],
    roomsUnlocked: [],
    readingHistory: [],
    totalReads: 0,
    lastPlay: null,
    stats: {
      totalPagesRead: 0,
      longestReading: 0,
      booksPerRoom: { salottino: 0, atrio: 0, serra: 0 }
    }
  };
}

function saveState(state) {
  state.lastPlay = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state }));
  } catch (e) { console.warn('Failed to save:', e); }
}

function getState() {
  if (!window._radiceState) {
    window._radiceState = loadState();
  }
  return window._radiceState;
}

function setState(updates) {
  const state = getState();
  Object.assign(state, updates);
  saveState(state);
  return state;
}

function addSeeds(count) {
  const state = getState();
  state.seeds = Math.max(0, (state.seeds || 0) + count);
  saveState(state);
  return state.seeds;
}

function removeSeeds(count) {
  const state = getState();
  if (state.seeds >= count) {
    state.seeds -= count;
    saveState(state);
    return true;
  }
  return false;
}

function recordRead(bookId, pagesRead, roomType) {
  const state = getState();
  if (!state.booksRead.includes(bookId)) {
    state.booksRead.push(bookId);
  }
  state.readingHistory.push({ bookId, pagesRead, roomType, time: Date.now() });
  state.totalReads++;
  state.stats.totalPagesRead += pagesRead;
  state.stats.booksPerRoom[roomType] = (state.stats.booksPerRoom[roomType] || 0) + 1;
  saveState(state);
}

function collectChapter(chapterId) {
  const state = getState();
  if (!state.chaptersCollected.includes(chapterId)) {
    state.chaptersCollected.push(chapterId);
    saveState(state);
    return true;
  }
  return false;
}

function unlockRoom(roomType) {
  const state = getState();
  if (!state.roomsUnlocked.includes(roomType)) {
    state.roomsUnlocked.push(roomType);
    saveState(state);
    return true;
  }
  return false;
}

function isRoomUnlocked(roomType) {
  return getState().roomsUnlocked.includes(roomType);
}

function getStats() {
  return getState().stats || {};
}

function resetSave() {
  localStorage.removeItem(STORAGE_KEY);
  window._radiceState = getDefaultState();
}
