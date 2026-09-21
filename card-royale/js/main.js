import { Game } from './game.js';
import { getAllCards } from './card-engine.js';
import { getStatsCache } from './save.js';
import { getAllCompanions } from './data/companions.js';
import { getUnlockedAchievements, ACHIEVEMENTS } from './data/achievements.js';

let game;
let statsCache = {};

document.addEventListener('DOMContentLoaded', () => {
  game = new Game();
  const canvas = document.getElementById('bg-canvas');
  game.init(canvas);

  // Load stats
  updateStatsDisplay();

  const playBtn = document.getElementById('btn-play');
  const deckBtn = document.getElementById('btn-deck');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      showScreen('difficulty-screen');
    });
  }

  if (deckBtn) {
    deckBtn.addEventListener('click', () => {
      showScreen('deck-screen');
      renderDeckScreen();
    });
  }

  ['easy', 'medium', 'hard'].forEach(diff => {
    const btn = document.getElementById(`btn-${diff}`);
    if (btn) {
      btn.addEventListener('click', () => {
        if (!game.selectedCompanion) {
          showToast('Choose a spirit companion first! 🌿', 2000);
          return;
        }
        game.startGame(diff, game.selectedCompanion);
        showScreen('battle-screen');
      });
    }
  });

  const backDifficulty = document.getElementById('back-difficulty');
  if (backDifficulty) {
    backDifficulty.addEventListener('click', () => showScreen('menu-screen'));
  }

  const backDeck = document.getElementById('back-deck');
  if (backDeck) {
    backDeck.addEventListener('click', () => showScreen('menu-screen'));
  }

  // Companion screen
  const backCompanion = document.getElementById('back-companion');
  if (backCompanion) {
    backCompanion.addEventListener('click', () => showScreen('menu-screen'));
  }

  // Show companion screen when starting game
  const origStartGame = game.startGame;
  // Override: show companion select before difficulty
  const playBtn2 = document.getElementById('btn-play');
  if (playBtn2) {
    playBtn2.onclick = () => {
      renderCompanionScreen();
      showScreen('companion-screen');
    };
  }

  // Ultimate button handler
  const ultimateBtn = document.getElementById('ultimate-btn');
  if (ultimateBtn) {
    ultimateBtn.addEventListener('click', () => {
      if (game && game.natureMeter >= 100 && game.ultimateCooldown <= 0) {
        game.activateUltimate();
      }
    });
  }

  // Pause button handler
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => game.togglePause());
  }

  // Resume button
  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => game.togglePause());
  }

  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      document.getElementById('pause-overlay').classList.add('hidden');
      showScreen('settings-screen');
    });
  }

  // Quit button
  const quitBtn = document.getElementById('quit-btn');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      game.togglePause();
      game.goToMenu();
    });
  }

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value) / 100;
      game.setVolume(vol);
      if (game.audio) game.audio.setVolume(vol);
    });
  }

  // Mute button
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      game.toggleMute();
      if (game.audio) game.audio.setVolume(game.muted ? 0 : game.volume);
    });
  }

  // Back from settings
  const backSettings = document.getElementById('back-settings');
  if (backSettings) {
    backSettings.addEventListener('click', () => {
      showScreen('menu-screen');
    });
  }

  // ESC key to pause
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && game.gameState === 'playing') {
      game.togglePause();
    }
  });

  // Achievements button
  const achBtn = document.getElementById('btn-achievements');
  if (achBtn) {
    achBtn.addEventListener('click', () => {
      renderAchievementsScreen();
      showScreen('achievements-screen');
    });
  }

  // Collection button
  const collBtn = document.getElementById('btn-collection');
  if (collBtn) {
    collBtn.addEventListener('click', () => {
      renderCollectionScreen();
      showScreen('collection-screen');
    });
  }

  // Back from collection
  const backCollection = document.getElementById('back-collection');
  if (backCollection) {
    backCollection.addEventListener('click', () => {
      showScreen('menu-screen');
    });
  }

  // Collection filter buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderCollectionScreen(e.target.dataset.filter);
    }
  });

  // Leaderboard button
  const leaderBtn = document.getElementById('btn-leaderboard');
  if (leaderBtn) {
    leaderBtn.addEventListener('click', () => {
      renderLeaderboard();
      showScreen('leaderboard-screen');
    });
  }

  // Back from leaderboard
  const backLeaderboard = document.getElementById('back-leaderboard');
  if (backLeaderboard) {
    backLeaderboard.addEventListener('click', () => {
      showScreen('menu-screen');
    });
  }

  // Update difficulty buttons with companion check
  ['easy', 'medium', 'hard'].forEach(diff => {
    const btn = document.getElementById('btn-' + diff);
    if (btn) {
      btn.addEventListener('click', () => {
        if (!game.selectedCompanion) {
          showToast('Choose a spirit companion first! 🌿', 2000);
          return;
        }
        game.startGame(diff, game.selectedCompanion);
        showScreen('battle-screen');
      });
    }
  });

  function renderCompanionScreen() {
    const grid = document.getElementById('companion-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const companions = getAllCompanions();
    companions.forEach(comp => {
      const card = document.createElement('div');
      card.className = 'companion-card';
      card.id = 'comp-' + comp.id;
      card.innerHTML = `
        <span class="companion-emoji">${comp.emoji}</span>
        <span class="companion-name">${comp.name}</span>
        <span class="companion-desc">${comp.desc}</span>
      `;
      card.addEventListener('click', () => selectCompanion(comp.id));
      grid.appendChild(card);
    });
  }

  function selectCompanion(id) {
    document.querySelectorAll('.companion-card').forEach(c => c.classList.remove('selected'));
    const sel = document.getElementById('comp-' + id);
    if (sel) sel.classList.add('selected');
    game.selectedCompanion = id;
  }

  function showScreen(screenId) {
    ['menu-screen', 'difficulty-screen', 'battle-screen', 'deck-screen', 'companion-screen', 'settings-screen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== screenId);
    });
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay && screenId !== 'battle-screen') {
      pauseOverlay.classList.add('hidden');
    }
    if (screenId === 'menu-screen') {
      updateStatsDisplay();
      if (game) game.goToMenu();
    }
    if (screenId === 'companion-screen') {
      renderCompanionScreen();
    }
    if (screenId === 'achievements-screen') {
      renderAchievementsScreen();
    }
    if (screenId === 'settings-screen' && game) {
      const slider = document.getElementById('volume-slider');
      if (slider) slider.value = Math.round((game.volume || 0.8) * 100);
    }
  }

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      document.getElementById('end-overlay').classList.add('hidden');
      game.startGame(game.difficulty);
    });
  }

  const menuRestartBtn = document.getElementById('menu-restart-btn');
  if (menuRestartBtn) {
    menuRestartBtn.addEventListener('click', () => {
      document.getElementById('end-overlay').classList.add('hidden');
      game.startGame(game.difficulty);
    });
  }

  showScreen('menu-screen');
});

function updateStatsDisplay() {
  const s = getStatsCache();
  const w = document.getElementById('menu-wins');
  const g = document.getElementById('menu-games');
  const st = document.getElementById('menu-stars');
  if (w) w.textContent = `Wins: ${s.wins || 0}`;
  if (g) g.textContent = `Games: ${s.gamesPlayed || 0}`;
  if (st) st.textContent = `⭐ ${s.threeStarWins || 0}`;
}

function showScreen(screenId) {
  ['menu-screen', 'difficulty-screen', 'battle-screen', 'deck-screen', 'companion-screen', 'collection-screen', 'settings-screen', 'leaderboard-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== screenId);
  });
  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay && screenId !== 'battle-screen') {
    pauseOverlay.classList.add('hidden');
  }
  if (screenId === 'menu-screen') {
    updateStatsDisplay();
    if (game) game.goToMenu();
  }
  if (screenId === 'companion-screen') {
    renderCompanionScreen();
  }
  if (screenId === 'achievements-screen') {
    renderAchievementsScreen();
  }
  if (screenId === 'collection-screen') {
    renderCollectionScreen();
  }
  if (screenId === 'leaderboard-screen') {
    renderLeaderboard();
  }
  if (screenId === 'settings-screen' && game) {
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = Math.round((game.volume || 0.8) * 100);
  }
}

function renderAchievementsScreen() {
  const list = document.getElementById('achievements-list');
  if (!list) return;
  const stats = getStatsCache();
  const unlocked = getUnlockedAchievements(stats);
  const unlockedIds = (stats.achievementsUnlocked || []);
  
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlockedIds.includes(ach.id);
    const card = document.createElement('div');
    card.className = 'achievement-card ' + (isUnlocked ? 'unlocked' : 'locked');
    card.innerHTML = \`
      <div class="achievement-icon">\${ach.icon}</div>
      <div class="achievement-name">\${ach.name}</div>
      <div class="achievement-desc">\${ach.desc}</div>
    \`;
    list.appendChild(card);
  });
  
  const count = document.getElementById('achieve-count');
  if (count) count.textContent = unlockedIds.length;
}

function renderDeckScreen() {
  const deckList = document.getElementById('deck-list');
  const stats = getStatsCache();
  if (!deckList) return;
  deckList.innerHTML = '';
  const cards = getAllCards();

  // Deck stats
  const statsEl = document.getElementById('deck-stats');
  if (statsEl) {
    const essences = stats.essences || {};
    const commonE = essences.common || 0;
    const uncommE = essences.uncommon || 0;
    const rareE = essences.rare || 0;
    const legE = essences.legendary || 0;
    statsEl.innerHTML = `
      <div style="display:flex;gap:16px;justify-content:center;margin-bottom:12px;font-size:0.85rem;font-weight:700">
        <span style="color:#a0a0a0">🪨 ${commonE} Common</span>
        <span style="color:#4ecdc4">💎 ${uncommE} Uncommon</span>
        <span style="color:#9b6dff">✨ ${rareE} Rare</span>
        <span style="color:#ffd93d">🌟 ${legE} Legendary</span>
      </div>
    `;
  }

  // Deck cards
  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = `deck-card rarity-${card.rarity}`;
    cardEl.style.borderColor = card.color;
    cardEl.innerHTML = `
      <span class="rarity-badge ${card.rarity}">${card.rarity.charAt(0).toUpperCase()}</span>
      <span class="deck-emoji">${card.emoji}</span>
      <span class="deck-name">${card.name}</span>
      <span class="deck-elixir">⚡${card.elixir}</span>
      <span class="deck-rarity" style="color:${card.color}">${card.rarity}</span>
    `;
    deckList.appendChild(cardEl);
  });

  // Crafting area
  const craftingArea = document.getElementById('crafting-area');
  if (!craftingArea) return;
  craftingArea.innerHTML = '';
  
  // Show 3 random craftable cards
  const craftableCards = cards.slice(0, 6);
  craftableCards.forEach(card => {
    const essCost = card.rarity === 'legendary' ? 3 : card.rarity === 'epic' ? 2 : card.rarity === 'rare' ? 2 : card.rarity === 'uncommon' ? 1 : 0;
    const owned = (stats.currentDeck || []).includes(card.id);
    const item = document.createElement('div');
    item.className = 'crafting-item' + (owned ? ' owned' : '');
    item.innerHTML = `
      <span class="crafting-emoji">${card.emoji}</span>
      <div class="crafting-name">${card.name}</div>
      <div class="crafting-cost">${owned ? '✅ Owned' : '⚡ ' + essCost + ' Essence'}</div>
    `;
    if (!owned) {
      item.addEventListener('click', () => {
        showToast('Craft ' + card.name + ' for ' + essCost + ' essences!', 2000);
      });
    }
    craftingArea.appendChild(item);
  });
}

function renderCollectionScreen(filter = 'all') {
  const list = document.getElementById('collection-list');
  const count = document.getElementById('collection-count');
  if (!list) return;
  const stats = getStatsCache();
  const allCards = getAllCards();
  const deck = stats.currentDeck || [];
  const ownedSet = new Set(deck);
  const ownedCount = ownedSet.size;
  if (count) count.textContent = ownedCount;

  list.innerHTML = '';
  const filtered = filter === 'all' ? allCards : allCards.filter(c => c.rarity === filter);
  filtered.forEach(card => {
    const isOwned = ownedSet.has(card.id);
    const cardEl = document.createElement('div');
    cardEl.className = 'collection-card ' + (isOwned ? 'owned' : 'not-owned');
    cardEl.innerHTML = `
      <span class="rarity-badge ${card.rarity}">${card.rarity.charAt(0).toUpperCase()}</span>
      <span class="collection-emoji">${isOwned ? card.emoji : '❓'}</span>
      <span class="collection-name">${isOwned ? card.name : '???'}</span>
      <span class="collection-rarity ${card.rarity}">${card.rarity}</span>
    `;
    list.appendChild(cardEl);
  });
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  const title = document.getElementById('leaderboard-title');
  if (!list) return;
  const board = [];
  try {
    const raw = localStorage.getItem('enchanted_clash_leaderboard');
    if (raw) board.push(...JSON.parse(raw));
  } catch (e) {}
  if (board.length === 0) {
    list.innerHTML = '<div class="leaderboard-entry"><span>No scores yet. Play a game!</span></div>';
    return;
  }
  list.innerHTML = '';
  board.slice(0, 10).forEach((entry, i) => {
    const el = document.createElement('div');
    el.className = 'leaderboard-entry';
    el.innerHTML = `<span>${i + 1}. ${entry.name || 'Player'}</span><span>${entry.score}</span>`;
    list.appendChild(el);
  });
}
