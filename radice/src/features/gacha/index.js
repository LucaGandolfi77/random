import store from '../../core/store.js';

function rollBook(rarityBias) {
  const BOOKS = window.BOOKS;
  const RARITY_CONFIG = window.RARITY_CONFIG;
  if (!BOOKS || !RARITY_CONFIG) return null;

  const rarities = Object.keys(RARITY_CONFIG);
  const weights = rarities.map(r => RARITY_CONFIG[r].weight * (rarityBias === r ? 3 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = rarities[0];
  for (let i = 0; i < rarities.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { chosenRarity = rarities[i]; break; }
  }
  const books = BOOKS.filter(b => b.rarity === chosenRarity);
  return books[Math.floor(Math.random() * books.length)];
}

function rollChapter() {
  const chapters = window.CHAPTERS || [];
  if (chapters.length === 0) return null;
  const legendary = chapters.filter(c => c.rarity === 'leggendario');
  const epic = chapters.filter(c => c.rarity === 'epico');
  const pool = [...legendary, ...epic];
  return pool[Math.floor(Math.random() * pool.length)];
}

function executeGacha() {
  const state = store.get();
  const cost = 5;

  if (state.seeds < cost) {
    window.showToast('Non hai abbastanza semi! 🌱');
    window.AUDIO.playFail();
    return Promise.resolve(null);
  }

  store.set({ seeds: state.seeds - cost });
  window.AUDIO.playGacha();

  const isRare = Math.random() < 0.15;
  let book;
  let isChapter = false;

  if (isRare && Math.random() < 0.5) {
    isChapter = true;
    const chapters = (window.CHAPTERS || []).filter(c => c.rarity === 'leggendario' || c.rarity === 'epico');
    book = chapters[Math.floor(Math.random() * chapters.length)];
    book.isChapter = true;
  } else {
    book = rollBook();
  }

  if (book && !book.isChapter && book.rarity === 'leggendario') {
    book.isChapter = true;
  }

  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  return Promise.resolve({ book, isChapter, isRare });
}

async function handleChapterFound(chapter) {
  const wasNew = !store.get('chaptersCollected').includes(chapter.id);
  const unlocked = !store.get('roomsUnlocked').includes(chapter.roomType);

  if (wasNew) {
    const collected = [...store.get('chaptersCollected'), chapter.id];
    store.set({ chaptersCollected: collected });
  }
  if (unlocked) {
    const rooms = [...store.get('roomsUnlocked'), chapter.roomType];
    store.set({ roomsUnlocked: rooms });
  }

  const stats = store.get('stats') || {};
  stats.longestReading = Math.max(stats.longestReading || 0, chapter.pages * 12);
  store.set({ stats });

  window.AUDIO.playChapter();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);

  return { wasNew, unlocked };
}

function getState() { return store.get(); }

export { rollBook, rollChapter, executeGacha, handleChapterFound, getState };
