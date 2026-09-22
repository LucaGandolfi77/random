import store from './core/store.js';
import AudioEngine from './features/audio/index.js';
import SpeechSynthesizer from './features/audio/speech.js';
import { renderTree, renderTreeCanvas, animateTree } from './features/tree/index.js';
import { renderOwl } from './features/owl/index.js';
import { renderReader, handleReaderNav, finishReading, showReaderPage } from './features/reader/index.js';
import { rollBook, rollChapter, executeGacha, handleChapterFound } from './features/gacha/index.js';
import { showToast, showModal, hideModal } from './utils/helpers.js';
import AnalyticsEngine from './features/owl/analytics.js';
import { getAdaptiveMood, getGufoDialogue } from './features/owl/mood.js';
import BackgroundSyncManager from './features/owl/background-sync.js';
import PushManager from './features/owl/push.js';
import RecommendationEngine from './features/owl/recommender.js';
import Ecosystem from './features/ecosystem/index.js';

const synthesizer = new SpeechSynthesizer();
const analytics = new AnalyticsEngine();
const pushManager = new PushManager();
const recommender = new RecommendationEngine();
const syncManager = new BackgroundSyncManager();

// Bridge: expose functions to legacy code (global scope)
window.store = store;
window.AUDIO = AudioEngine;
window.SPEECH = synthesizer;
window.ANALYTICS = analytics;
window.PUSH = pushManager;
window.RECOMMENDER = recommender;
window.SYNC = syncManager;
window.ECOSYSTEM = Ecosystem;
window.renderEcosystem = Ecosystem.renderEcosystem;
window.handleVoiceCommand = Ecosystem.handleVoiceCommand;
window.handleShare = Ecosystem.handleShare;
window.handleSensors = Ecosystem.handleSensors;
window.getAdaptiveMood = getAdaptiveMood;
window.getGufoDialogue = getGufoDialogue;

async function initML() { await recommender.init(); }
async function initSpeech() { if (synthesizer.isSupported) synthesizer.getVoices(); }
async function initPush() { await pushManager.init(); }
async function initBackgroundSync() { await syncManager.init(); }
window.showToast = showToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.renderTree = renderTree;
window.renderTreeCanvas = renderTreeCanvas;
window.animateTree = animateTree;
window.renderOwl = renderOwl;
window.renderReader = renderReader;
window.handleReaderNav = handleReaderNav;
window.finishReading = finishReading;
window.showReaderPage = showReaderPage;
window.rollBook = rollBook;
window.rollChapter = rollChapter;
window.executeGacha = executeGacha;
window.handleChapterFound = handleChapterFound;
window.getBookById = window.getBookById || (id => window.BOOKS?.find(b => b.id === id));
window.getChaptersByRarity = window.getChaptersByRarity || (r => window.CHAPTERS?.filter(c => c.rarity === r));
window.getState = () => store.get();
window.recordRead = (id, pages, room) => {
  const state = store.get();
  if (!state.booksRead.includes(id)) {
    store.set({ booksRead: [...state.booksRead, id] });
  }
  const history = [...(state.readingHistory || []), { bookId: id, pagesRead: pages, roomType: room, time: Date.now() }];
  const totalReads = state.totalReads + 1;
  const stats = { ...state.stats };
  stats.totalPagesRead = (stats.totalPagesRead || 0) + pages;
  stats.booksPerRoom = { ...stats.booksPerRoom };
  stats.booksPerRoom[room] = (stats.booksPerRoom[room] || 0) + 1;
  store.set({ readingHistory: history, totalReads, stats });
};
window.unlockRoom = (roomType) => {
  const state = store.get();
  if (!state.roomsUnlocked.includes(roomType)) {
    store.set({ roomsUnlocked: [...state.roomsUnlocked, roomType] });
    window.showToast('Nuova stanza sbloccata! 🌳');
    AudioEngine.playUnlock();
    return true;
  }
  return false;
};
window.collectChapter = (chapterId) => {
  const state = store.get();
  if (!state.chaptersCollected.includes(chapterId)) {
    store.set({ chaptersCollected: [...state.chaptersCollected, chapterId] });
    return true;
  }
  return false;
};
window.removeSeeds = (count) => {
  const state = store.get();
  if (state.seeds >= count) {
    store.set({ seeds: state.seeds - count });
    return true;
  }
  return false;
};
window.saveState = (state) => store.set(state);
window.startAutoSave = () => {
  setInterval(() => { store.set(store.get()); }, 30000);
};
window.switchView = (viewName) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');
  document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
  if (viewName !== 'reader') {
    if (window.readerTimer) { clearInterval(window.readerTimer); window.readerTimer = null; }
  }
};
window.initTabBar = () => {
  document.querySelectorAll('#tabbar .tab').forEach(tab => {
    tab.addEventListener('click', () => window.switchView(tab.dataset.view));
  });
};
window.updateUI = () => {
  const state = store.get();
  const seedEl = document.querySelector('#res-seme span');
  const bookEl = document.querySelector('#res-libri span');
  const chapterEl = document.querySelector('#res-capitoli span');
  const owlMoodEl = document.getElementById('owl-mood');
  if (seedEl) seedEl.textContent = state.seeds;
  if (bookEl) bookEl.textContent = state.totalReads;
  if (chapterEl) chapterEl.textContent = state.chaptersCollected.length;
  const roomCount = (state.roomsUnlocked || []).length;
  if (owlMoodEl) {
    owlMoodEl.textContent = roomCount === 0 ? 'Sonno' : (roomCount < 3 ? 'Sonnolento' : (roomCount < 7 ? 'Contento' : 'Orgoglioso'));
  }
};

function init() {
  const state = store.get();
  if (!state.lastPlay || Date.now() - state.lastPlay > 86400000) {
    store.set({ seeds: state.seeds + 3 });
  }
  window.initTabBar();
  window.setupPwa();
  animateTree();
  window.switchView('home');
  window.updateUI();
  window.startAutoSave();

  // Phase 2: Initialize AI features
  initML().catch(e => console.warn('ML init failed:', e));
  initSpeech().catch(e => console.warn('Speech init failed:', e));
  initPush().catch(e => console.warn('Push init failed:', e));
  initBackgroundSync().catch(e => console.warn('Background Sync init failed:', e));

  // Track initial analytics
  analytics.track('session_start', { timestamp: Date.now() });

  window.addEventListener('resize', () => {
    const canvas = document.getElementById('tree-canvas');
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; renderTreeCanvas(); }
  });

  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!document.getElementById('view-reader')) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      const pageText = document.getElementById('reader-page').textContent;
      if (!pageText) return;
      const pageNum = parseInt(pageText) || 1;
      const totalPages = parseInt(pageText.split('/')[1]) || 1;
      if (diff > 0 && pageNum < totalPages) { const btn = document.getElementById('btn-next-page'); if (btn) btn.click(); }
      else if (diff < 0 && pageNum > 1) { const btn = document.getElementById('btn-prev-page'); if (btn) btn.click(); }
    }
  }, { passive: true });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-next-page' || e.target.id === 'btn-prev-page') {
      window.handleReaderNav(e);
    }
  });

  document.getElementById('btn-gacha')?.addEventListener('click', async () => {
    const result = await window.executeGacha();
    if (!result || !result.book) return;
    const { book, isChapter } = result;
    const resultEl = document.getElementById('gacha-result');
    if (!resultEl) return;
    resultEl.classList.add('visible');
    document.getElementById('result-icon').textContent = isChapter ? '📜' : '📖';
    document.getElementById('result-title').textContent = book.title;
    const rarityEl = document.getElementById('result-rarity');
    rarityEl.className = 'book-rarity rarity-' + book.rarity;
    rarityEl.textContent = (isChapter ? 'Capitolo ' : '') + window.RARITY_CONFIG[book.rarity].name;
    document.getElementById('result-flavor').textContent = book.flavor;
    const readBtn = document.getElementById('btn-read');
    if (isChapter) {
      readBtn.textContent = 'Scopri il Capitolo';
      readBtn.onclick = async () => {
        const { wasNew } = await window.handleChapterFound(book);
        const modalHtml = '<h3 class="panel-title">' + book.title + '</h3>' +
          '<div class="reader-text" style="margin:16px 0;">' + book.text + '</div>' +
          '<p style="font-style:italic;color:#8b7d8a;">— ' + book.flavor + '</p>' +
          '<div style="text-align:center;margin-top:20px;"><button class="btn btn-primary" id="modal-close-btn">Torna all\'albero</button></div>';
        window.showModal(modalHtml, () => window.switchView('home'));
        document.getElementById('modal-close-btn')?.addEventListener('click', () => window.hideModal());
        window.updateUI();
      };
    } else {
      readBtn.textContent = 'Leggi (' + book.pages + ' min)';
      readBtn.onclick = () => window.startReading(book);
    }
    window.updateUI();
  });

  const backBtn = document.getElementById('btn-back-gacha');
  if (backBtn) backBtn.addEventListener('click', () => window.switchView('home'));

  console.log('🌳 Radice v2 (Feature-Driven) inizializzato!');
}

document.addEventListener('DOMContentLoaded', init);
