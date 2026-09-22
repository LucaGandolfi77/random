import { RECIPES, OVENS, INGREDIENTS, HELPERS, UPGRADES, getRecipeMutationData } from './data.js';
import { getState, hasUpgrade, xpForLevel, recordRegionalRegion, recordRegionalBake } from './state.js';
import { getRecipe, getOven, getAvailableRecipes, canAfford, startBaking,
  collectBread, sellBread, pullGacha, applyGachaResult, getMaxOvens,
  buyUpgrade, changeOvenType, tickOvens, tickIngredients, helperBonus,
  getBakedMutations, performAlchemy, getAlchemyTimeRemaining,
  isAlchemyReady, getAlchemyCooldown,
} from './engine.js';
import * as Audio from './audio.js';
import { getGrid, getGridSize, cellAt, canPlace, removeBuilding, findEmptySpot } from './village.js';
import { getWeatherType, getWeatherEmoji, getWeatherColor, getWeatherDesc, getWeatherHoursRemaining, hasLegendaryUnlock, hasSpecialRecipe } from './weather.js';
import { getMutationDisplay, getMutationRarityColor, getMutationEmojis } from './mutation.js';
import { generateGeneticMutations, getCatalog, getCatalogStats, getGeneticStats, getLineage, getCatalogEntries, getLineageSummary, getAncestryChain, getPowerLevel, getPowerMultiplier, getCatalogByRarity, getAllGeneticTraits } from './mutation_v2.js';
import * as Haptic from './haptic.js';
import {
  getCauldron, getDiscoveredRecipes, getCauldronDisplay,
  findMatchingRules, getIngredientName, getIngredientEmoji,
  getRecipeRarity, isRecipeDiscovered,
  getAlchemyRules, getAllPossibleResults, clearCauldron,
} from './alchemy.js';
import {
  getAllAchievementDefs, getAchievements, getMysteries,
  getDailyMystery, getMysteryProgress, solveMystery,
  getActiveMysteries, getGamificationState, getGamificationDef,
  recordRating, getRatingCount, getLoginDays, getOfflineSessions,
} from './gamification.js';
import {
  isDreamMode, updateDreamMode, toggleDreamMode, getDreamRecipes,
  getDreamRecipe, getDreamNPCs, visitDreamNPC, getDreamStars,
  getDreamStarsCollected, getDreamStarsEarned, getDreamTotalBakes,
  collectDreamStar, generateDreamStars, getTimeUntilDream,
  getDreamHoursRemaining, getDreamState,
} from './dream.js';
import {
  initConstruction, getConstructionProgress, getMaterials, getBuildings,
  getConstructionQueue, isBuildInProgress, canAffordBuilding, startConstruction,
  updateConstruction, repairBuilding, getRepairCost, getMaterialStock,
  regenerateMaterials, getConstructionSummary, loadConstructionState,
  getConstructionSaveState, resetConstruction,
} from './construction.js';
import { detectRegion, setUserRegion, getCurrentRegion, getAllRegions, getRegionalRecipe,
  getAllRegionalRecipes, getRegionalBonuses, getRegionalBonus, getRegionById,
  getActiveRegion, loadRegionalState, getRegionalSaveState, resetRegional,
  getRegionalRecipesForRegion, getRegionColor, getRegionEmoji, isRegionDetected,
  getRegionSummary } from './regional.js';
import {
  initSoundtrack, setSoundtrackState, disposeSoundtrack,
  getSoundtrackState, toggleSoundtrackMute, isSoundtrackMuted,
  setSoundtrackVolume, getSoundtrackVolume,
  getSoundtrackStateLabel, getSoundtrackStateColor, getSoundtrackStates,
} from './soundtrack.js';
import {
  refreshNPCs, getCurrentNPCs, getNPCById, getAllNPCEffects,
  visitNPC, getNPCTodaySummary, getNPCPersonalityEmoji,
  getNPCRarityColor, getNPCRarityEmoji, getAllNPCPool,
} from './npc.js';
import {
  capturePhoto, getGallery, getGalleryPhoto, removeFromGallery,
  getCurrentFilter, setCurrentFilter, getCurrentBackground, setCurrentBackground,
  getCurrentFrame, setCurrentFrame, getPhotosTaken,
  getFilterOptions, getBackgroundOptions, getFrameOptions,
  getPreviewPhoto,
} from './photo.js';

let _tab = 'ovens';
let _selectedOven = null;

export function init() {
  renderShell();
  switchTab('ovens');
}

function renderShell() {
  const root = document.getElementById('app');
root.innerHTML = `
    <header id="header" role="banner">
      <div class="header-left">
        <span class="logo" aria-label="Forno & Fiamma">Forno &amp; Fiamma</span>
      </div>
      <div class="header-right" role="status" aria-live="polite" aria-label="Risorse">
        <span id="hdr-weather" class="hdr-stat" aria-label="Meteo">☀️</span>
        <span id="hdr-coins" class="hdr-stat" aria-label="Monete">0 coins</span>
        <span id="hdr-flour" class="hdr-stat" aria-label="Fiocchi di farina">0 flour</span>
        <span id="hdr-level" class="hdr-stat" aria-label="Livello">Lv.1</span>
      </div>
    </header>
    <div id="xp-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Esperienza">
      <div id="xp-fill"></div>
      <span id="xp-text"></span>
    </div>
    <main id="main" role="main" aria-label="Gioco"></main>
    <nav id="bottom-nav" role="navigation" aria-label="Navigazione principale">
      <button class="nav-btn active" data-tab="ovens" aria-label="Forni" aria-current="page">🔥<br>Forni</button>
      <button class="nav-btn" data-tab="village" aria-label="Villaggio">🏘️<br>Villaggio</button>
      <button class="nav-btn" data-tab="shop" aria-label="Vendita">🏪<br>Vendita</button>
      <button class="nav-btn" data-tab="gacha" aria-label="Gacha">🎰<br>Gacha</button>
      <button class="nav-btn" data-tab="collection" aria-label="Album">📖<br>Album</button>
      <button class="nav-btn" data-tab="alchemy" aria-label="Alchimia">⚗️<br>Alchimia</button>
      <button class="nav-btn" data-tab="gamification" aria-label="Gamification">🏆<br>Gamification</button>
      <button class="nav-btn" data-tab="dream" aria-label="Sogno">🌙<br>Sogno</button>
      <button class="nav-btn" data-tab="construction" aria-label="Costruzione">🏗️<br>Costr.</button>
      <button class="nav-btn" data-tab="soundtrack" aria-label="Musica">🎵<br>Musica</button>
      <button class="nav-btn" data-tab="npc" aria-label="Abitanti">🧍<br>Abitanti</button>
      <button class="nav-btn" data-tab="photo" aria-label="Foto">📸<br>Foto</button>
      <button class="nav-btn" data-tab="regional" aria-label="Regioni">🌍<br>Regioni</button>
      <button class="nav-btn" data-tab="mutation" aria-label="Genetica">🧬<br>Genetica</button>
      <button class="nav-btn" data-tab="upgrades" aria-label="Upgrade">⬆️<br>Upgrade</button>
    </nav>
    <div id="modal-overlay" class="hidden" aria-hidden="true"></div>
    <div id="modal" class="hidden" role="dialog" aria-modal="true" aria-hidden="true"></div>
    <div id="toast-container" role="status" aria-live="polite" aria-label="Notifiche"></div>
  `;
  root.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

export function switchTab(tab) {
  _tab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const main = document.getElementById('main');
  switch (tab) {
    case 'ovens': renderOvensTab(main); break;
    case 'village': renderVillageTab(main); break;
    case 'shop': renderShopTab(main); break;
    case 'gacha': renderGachaTab(main); break;
    case 'collection': renderCollectionTab(main); break;
    case 'upgrades': renderUpgradesTab(main); break;
    case 'alchemy': renderAlchemyTab(main); break;
    case 'gamification': renderGamificationTab(main); break;
    case 'dream': renderDreamTab(main); break;
    case 'construction': renderConstructionTab(main); break;
    case 'soundtrack': renderSoundtrackTab(main); break;
    case 'npc': renderNPCTab(main); break;
    case 'photo': renderPhotoTab(main); break;
    case 'regional': renderRegionalTab(main); break;
    case 'mutation': renderMutationTab(main); break;
  }
}

export function refresh() {
  updateHeader();
  if (_tab) switchTab(_tab);
}

function updateHeader() {
  const s = getState();
  const el = (id) => document.getElementById(id);
  const weatherEmoji = getWeatherEmoji();
  const weatherEl = el('hdr-weather');
  if (weatherEl) weatherEl.innerHTML = weatherEmoji;
  el('hdr-coins').innerHTML = s.player.coins + ' coins';
  el('hdr-flour').innerHTML = s.player.flour + ' flour';
  el('hdr-level').innerHTML = 'Lv.' + s.player.level;
  const needed = xpForLevel(s.player.level);
  const pct = (s.player.xp / needed) * 100;
  el('xp-fill').style.width = pct + '%';
  el('xp-text').textContent = 'XP ' + s.player.xp + '/' + needed;
}

function renderOvensTab(container) {
  const s = getState();
  const maxOvens = getMaxOvens();
  let html = '<div class="ovens-grid">';
  for (let i = 0; i < maxOvens; i++) {
    const oven = s.ovens[i];
    if (!oven) {
      html += '<div class="oven-card oven-empty"><span class="oven-emoji">+</span><span class="oven-label">Vuoto</span></div>';
      continue;
    }
    const ovenData = getOven(oven.ovenType);
    const recipe = oven.recipeId ? getRecipe(oven.recipeId) : null;
    if (oven.done && recipe) {
      const mutations = getMutationDisplay(getBakedMutations(recipe.id, oven.mutationKey || ''));
      const mutEmojis = getMutationEmojis(getBakedMutations(recipe.id, oven.mutationKey || ''));
      html += '<div class="oven-card oven-done" data-oven="' + i + '" role="article" aria-label="' + recipe.name + ' pronto">' +
        '<span class="oven-emoji pulse">' + recipe.emoji + mutEmojis + '</span>' +
        '<span class="oven-label">' + recipe.name + '</span>' +
        '<span class="oven-status done-text">Pronto!</span>' +
        (mutations ? '<span class="oven-mutations">' + mutations + '</span>' : '') +
        '<button class="btn btn-warm btn-collect" data-collect="' + i + '" aria-label="Sforna ' + recipe.name + '">Sforna</button></div>';
    } else if (recipe) {
      html += '<div class="oven-card oven-baking" data-oven="' + i + '" role="article" aria-label="' + recipe.name + ' in cottura ' + oven.progress.toFixed(0) + '%">' +
        '<span class="oven-emoji">' + ovenData.emoji + '</span>' +
        '<span class="oven-label">' + recipe.name + '</span>' +
        '<div class="progress-bar" role="progressbar" aria-valuenow="' + oven.progress.toFixed(0) + '" aria-valuemin="0" aria-valuemax="100"></div>' +
        '<span class="oven-status">' + oven.progress.toFixed(0) + '%</span></div>';
    } else {
      html += '<div class="oven-card oven-idle" data-oven="' + i + '" role="article" aria-label="Forno vuoto">' +
        '<span class="oven-emoji idle-glow">' + ovenData.emoji + '</span>' +
        '<span class="oven-label">Libero</span>' +
        '<button class="btn btn-primary" data-start="' + i + '" aria-label="Cuoci in forno ' + (i+1) + '">Cuoci</button></div>';
    }
  }
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.btn-collect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.collect);
      const result = collectBread(idx);
      if (result) {
        Haptic.hapticCollect();
        audio.playDing();
        let toast = '+' + result.flourGain + ' farina, +' + result.xpGain + ' XP';
        if (result.mutations && result.mutations.length > 0) {
          const mutNames = result.mutations.map(m => m.emoji + ' ' + m.name).join(', ');
          toast += ' | 🧬 ' + mutNames;
        }
        showToast(toast);
        if (result.leveled) {
          audio.playLevelUp();
          showToast('Livello ' + s.player.level + '!');
        }
        refresh();
      }
    });
  });

  container.querySelectorAll('.oven-idle .btn-primary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _selectedOven = parseInt(btn.dataset.start);
      showRecipePicker();
    });
  });
}

function showRecipePicker() {
  const s = getState();
  const available = getAvailableRecipes(s.player.level, s.helpers);
  let html = '<div class="modal-content"><h3>Scegli una ricetta</h3>';
  html += '<div class="recipe-list">';
  for (const r of available) {
    const afford = canAfford(r);
    const cls = afford ? 'recipe-item' : 'recipe-item disabled';
    let ingText = '';
    for (const [k, v] of Object.entries(r.ingredients)) {
      const ing = INGREDIENTS[k];
      const have = s.ingredients[k]?.stock || 0;
      const ok = have >= v;
      ingText += '<span class="' + (ok ? '' : 'text-red') + '">' + ing.emoji + have + '/' + v + '</span> ';
    }
    html += '<div class="' + cls + '" data-recipe="' + r.id + '">' +
      '<span class="recipe-emoji">' + r.emoji + '</span>' +
      '<div class="recipe-info"><span class="recipe-name">' + r.name + '</span>' +
      '<span class="recipe-meta">' + r.bakeTime + 's | +' + r.xp + ' XP</span>' +
      '<div class="recipe-ings">' + ingText + '</div></div></div>';
  }
  html += '</div><button class="btn btn-close-modal" id="close-modal">Annulla</button></div>';
  showModal(html);

  document.querySelectorAll('.recipe-item:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.recipe;
      if (startBaking(_selectedOven, id)) {
        audio.playOvenHum();
        Haptic.hapticBake();
        hideModal();
        refresh();
      }
    });
  });
  document.getElementById('close-modal').addEventListener('click', hideModal);
}

function renderVillageTab(container) {
  const weather = getWeatherType();
  const weatherData = getWeatherEmoji();
  const weatherColor = getWeatherColor();
  const weatherDesc = getWeatherDesc();
  const hoursLeft = getWeatherHoursRemaining();

  let html = '<div class="village-weather-banner" style="background:' + weatherColor + '20;border-color:' + weatherColor + ';">' +
    '<span class="weather-emoji">' + weatherData + '</span>' +
    '<span class="weather-name">' + weather + '</span>' +
    '<span class="weather-desc">' + weatherDesc + '</span>' +
    '<span class="weather-hours">' + hoursLeft + 'h rimasti</span></div>';

  if (hasLegendaryUnlock()) {
    html += '<div class="legendary-banner" style="background:linear-gradient(90deg,#9b59b6,#e74c3c);">' +
      '<span>🌌 Ricette Leggendarie sbloccate!</span></div>';
  }
  if (hasSpecialRecipe()) {
    html += '<div class="special-banner" style="background:linear-gradient(90deg,#2c3e50,#16a085);">' +
      '<span>❄️ Pane Neve disponibile!</span></div>';
  }

  const grid = getGrid();
  const { cols, rows } = getGridSize();
  html += '<div class="village-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cellAt(c, r);
      if (cell) {
        const isOrigin = cell.originCol === c && cell.originRow === r;
        if (isOrigin) {
          html += '<div class="village-cell has-building" data-col="' + c + '" data-row="' + r + '">' +
            getBuildingEmoji(cell.type) + '</div>';
        } else {
          html += '<div class="village-cell occupied"></div>';
        }
      } else {
        html += '<div class="village-cell empty" data-col="' + c + '" data-row="' + r + '"></div>';
      }
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function getBuildingEmoji(type) {
  const map = { forno: 'F', bottega: 'B', campo: 'C', mulino: 'M', deposito: 'D', decorazione: '*' };
  return map[type] || '?';
}

function renderShopTab(container) {
  const s = getState();
  const sellMult = 1 + helperBonus('sell');
  let html = '<div class="shop-container"><h2>Vendita</h2>';
  html += '<div class="shop-inventory">';
  for (const [id, qty] of Object.entries(s.inventory)) {
    if (qty <= 0) continue;
    const recipe = getRecipe(id);
    if (!recipe) continue;
    const price = Math.floor(recipe.sellPrice * sellMult);
    html += '<div class="shop-item">' +
      '<span>' + recipe.emoji + ' ' + recipe.name + ' x' + qty + '</span>' +
      '<button class="btn btn-primary sell-btn" data-sell="' + id + '" data-price="' + price + '">Vendi (' + price + ' each)</button></div>';
  }
  html += '</div></div>';
  container.innerHTML = html;

  container.querySelectorAll('.sell-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sell;
      const earned = sellBread(id, 1);
      if (earned > 0) {
        audio.playCoins();
        Haptic.hapticCollect();
        showToast('+' + earned + ' coins');
        refresh();
      }
    });
  });
}

function renderGachaTab(container) {
  const s = getState();
  const discount = hasUpgrade('gacha_discount') ? 2 : 0;
  const costSingle = Math.max(1, 10 - discount);
  let html = '<div class="gacha-container"><h2>Macchina del Pane</h2>';
  html += '<p>Fiocchi: ' + s.player.flour + '</p>';
  html += '<p>Pity: ' + s.gacha.pity + '/' + 20 + '</p>';
  html += '<div class="gacha-buttons">';
  html += '<button class="btn btn-primary gacha-btn" data-tier="single" ' + (s.player.flour < costSingle ? 'disabled' : '') + '>Tiro (' + costSingle + ' fiocchi)</button>';
  html += '<button class="btn btn-warm gacha-btn" data-tier="multi" ' + (s.player.flour < 30 ? 'disabled' : '') + '>Tiro multiplo (30)</button>';
  html += '<button class="btn btn-epic gacha-btn" data-tier="guaranteed" ' + (s.player.flour < 50 ? 'disabled' : '') + '>Garanzia (50)</button>';
  html += '</div></div>';
  container.innerHTML = html;

  container.querySelectorAll('.gacha-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = btn.dataset.tier;
      const result = pullGacha(tier);
      if (result) {
        applyGachaResult(result);
        audio.playGacha();
        Haptic.hapticGacha();
        showGachaResult(result);
        refresh();
      }
    });
  });
}

function showGachaResult(result) {
  const tierColors = { common: '#aaa', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
  let html = '<div class="modal-content gacha-reveal">' +
    '<h3 style="color:' + (tierColors[result.tier] || '#fff') + '">' + result.tier.toUpperCase() + '</h3>' +
    '<span class="gacha-emoji">' + result.emoji + '</span>' +
    '<p>' + result.name + '</p>' +
    '<p class="gacha-type">' + result.type + '</p>' +
    '<button class="btn btn-primary" id="close-modal">OK</button></div>';
  showModal(html);
  document.getElementById('close-modal').addEventListener('click', hideModal);
}

function renderCollectionTab(container) {
  const s = getState();
  let html = '<div class="collection-container"><h2>Album</h2>';
  html += '<h3>Ricette</h3><div class="collection-grid">';
  for (const r of RECIPES) {
    const found = s.collection.recipes[r.id];
    const mutData = getRecipeMutationData(r.id);
    const mutInfo = mutData ? Object.values(mutData).join(' | ') : '';
    html += '<div class="collection-item' + (found ? '' : ' locked') + '" title="' + (mutInfo ? 'Mutazioni: ' + mutInfo : '') + '">' +
      (found ? r.emoji + ' ' + r.name + (mutInfo ? '<span class="mutation-badge mutation-common" style="font-size:9px;">🧬 ' + mutInfo.split('|')[0].trim() + '</span>' : '') : '???') + '</div>';
  }
  html += '</div><h3>Forni</h3><div class="collection-grid">';
  for (const o of OVENS) {
    const found = s.collection.ovens[o.id];
    html += '<div class="collection-item' + (found ? '' : ' locked') + '">' +
      (found ? o.emoji + ' ' + o.name : '???') + '</div>';
  }
  html += '</div><h3>Aiutanti</h3><div class="collection-grid">';
  for (const h of HELPERS) {
    const found = s.collection.helpers[h.id];
    html += '<div class="collection-item' + (found ? '' : ' locked') + '">' +
      (found ? h.emoji + ' ' + h.name : '???') + '</div>';
  }
  html += '</div></div>';
  container.innerHTML = html;
}

function renderUpgradesTab(container) {
  const s = getState();
  let html = '<div class="upgrades-container"><h2>Upgrade</h2>';
  for (const u of UPGRADES) {
    const bought = s.upgrades.includes(u.id);
    const afford = s.player.coins >= u.cost;
    html += '<div class="upgrade-item' + (bought ? ' bought' : '') + '">' +
      '<span>' + u.emoji + ' ' + u.name + '</span>' +
      '<span>' + u.desc + '</span>' +
      (bought ? '<span class="bought-text">Acquistato</span>' :
        '<button class="btn btn-primary" data-upgrade="' + u.id + '"' +
        (afford ? '' : ' disabled') + '>' + u.cost + ' coins</button>') +
      '</div>';
  }
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.btn[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (buyUpgrade(btn.dataset.upgrade)) {
        audio.playCoins();
        showToast('Upgrade acquistato!');
        refresh();
      }
    });
  });
}

function showModal(html) {
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

export function hideModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export function showErrorToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = msg;
  toast.style.borderColor = 'var(--fire)';
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 4000);
  }, 4000);
}

function renderAlchemyTab(container) {
  const s = getState();
  const cauldron = getCauldron();
  const cauldronDisplay = getCauldronDisplay();
  const discovered = getDiscoveredRecipes();
  const isReady = isAlchemyReady();
  const timeRemaining = getAlchemyTimeRemaining();
  const isFull = isCauldronFull();
  const rules = findMatchingRules(cauldron);
  const canCraft = cauldron.length >= 2 && isReady && rules.length > 0;

  let html = '<div class="alchemy-container"><h2>⚗️ Laboratorio di Alchimia</h2>';
  html += '<div class="alchemy-info">';
  if (!isReady) {
    const secs = Math.ceil(timeRemaining / 1000);
    html += '<div class="alchemy-cooldown">Prossima congiunzione tra: ' + secs + 's</div>';
  } else {
    html += '<div class="alchemy-ready">⚡ Pronto per la congiunzione!</div>';
  }
  html += '<div class="alchemy-cauldron">';
  if (cauldronDisplay.length === 0) {
    html += '<span class="cauldron-empty">Il calderone è vuoto. Aggiungi ingredienti!</span>';
  } else {
    html += '<div class="cauldron-items">';
    for (let i = 0; i < cauldronDisplay.length; i++) {
      const item = cauldronDisplay[i];
      html += '<span class="cauldron-item" data-cauldron-remove="' + i + '" title="Rimuovi ' + item.name + '">' + item.emoji + '</span>';
    }
    if (cauldronDisplay.length < 5) {
      html += '<span class="cauldron-slot">+</span>';
    }
    html += '</div>';
  }
  html += '</div>';

  if (rules.length > 0) {
    const rule = rules[0];
    const rarity = getRecipeRarity(cauldron);
    const rarityColor = rarity === 'common' ? '#95a5a6' : rarity === 'uncommon' ? '#3498db' : rarity === 'rare' ? '#9b59b6' : '#e74c3c';
    html += '<div class="alchemy-result" style="border-color:' + rarityColor + ';">' +
      '<span class="alchemy-result-emoji">' + rule.emoji + '</span>' +
      '<span class="alchemy-result-name">' + rule.name + '</span>' +
      '<span class="alchemy-result-rarity" style="color:' + rarityColor + ';">' + rarity.toUpperCase() + '</span>' +
      '<button class="btn btn-warm" data-alchemy-craft="' + rule.result + '"' + (canCraft ? '' : ' disabled') + '>Congiungi</button></div>';
  } else if (cauldron.length >= 2) {
    html += '<div class="alchemy-no-match">Nessuna combinazione trovata</div>';
  }
  html += '</div>';

  html += '<div class="alchemy-ingredients"><h3>Ingredienti Disponibili</h3><div class="alchemy-ingrid">';
  const allIngredients = [
    { id: 'grano', emoji: '🌾', name: 'Grano' },
    { id: 'farina', emoji: '🥜', name: 'Farina' },
    { id: 'acqua', emoji: '💧', name: 'Acqua' },
    { id: 'lievito', emoji: '🫧', name: 'Lievito' },
    { id: 'sale', emoji: '🧂', name: 'Sale' },
    { id: 'olio', emoji: '🫒', name: 'Olio' },
    { id: 'zucchero', emoji: '🍬', name: 'Zucchero' },
    { id: 'burro', emoji: '🧈', name: 'Burro' },
    { id: 'uova', emoji: '🥚', name: 'Uova' },
    { id: 'miele', emoji: '🍯', name: 'Miele' },
    { id: 'cioccolato', emoji: '🍫', name: 'Cioccolato' },
    { id: 'mandorle', emoji: '🌰', name: 'Mandorle' },
    { id: 'romano', emoji: '🧀', name: 'Pecorino' },
    { id: 'rosmarino', emoji: '🌿', name: 'Rosmarino' },
    { id: 'scorza', emoji: '🍋', name: 'Scorza' },
  ];
  for (const ing of allIngredients) {
    const stock = s.ingredients[ing.id]?.stock || 0;
    const inCauldron = cauldron.includes(ing.id);
    html += '<button class="alchemy-ingredient' + (inCauldron ? ' in-cauldron' : '') + '" data-add-ing="' + ing.id + '"' +
      (stock <= 0 ? ' disabled' : '') + '>' +
      ing.emoji + ' ' + stock + '</button>';
  }
  html += '</div></div>';

  if (Object.keys(discovered).length > 0) {
    html += '<div class="alchemy-discovered"><h3>Scoperte (' + Object.keys(discovered).length + ')</h3><div class="alchemy-discovered-grid">';
    for (const [id, data] of Object.entries(discovered)) {
      html += '<div class="discovered-item" title="' + data.ingredients.join(', ') + '">' +
        data.emoji + ' ' + data.name + '</div>';
    }
    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-add-ing]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ing = btn.dataset.addIng;
      if (addToCauldron(ing)) {
        s.ingredients[ing].stock--;
        Haptic.hapticCollect();
        refresh();
      }
    });
  });

  container.querySelectorAll('[data-cauldron-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.cauldronRemove);
      const removed = removeFromCauldron(idx);
      if (removed) {
        s.ingredients[removed].stock++;
        refresh();
      }
    });
  });

  container.querySelectorAll('[data-alchemy-craft]').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = performAlchemy(s);
      if (result) {
        Haptic.hapticCollect();
        const rarityColor = result.rarity === 'common' ? '#95a5a6' : result.rarity === 'uncommon' ? '#3498db' : result.rarity === 'rare' ? '#9b59b6' : '#e74c3c';
        showToast(result.rule.emoji + ' ' + result.rule.name + ' creato! (' + result.rarity.toUpperCase() + ')');
        if (result.discovered) {
          showToast('🌟 Nuova ricetta scoperta!');
          audio.playLevelUp();
        }
        refresh();
      }
    });
  });
}

function renderGamificationTab(container) {
  const s = getState();
  const achievements = getAllAchievementDefs();
  const unlocked = getAchievements();
  const ratingCount = getRatingCount();
  const loginDays = getLoginDays();
  const offlineSessions = getOfflineSessions();
  const dailyMystery = getDailyMystery();
  const activeMysteries = getActiveMysteries();
  const mysteryProgress = getMysteryProgress(s);

  let html = '<div class="gamification-container"><h2>🏆 Gamification</h2>';
  html += '<div class="gamification-stats">';
  html += '<div class="stat-box"><span class="stat-number">' + ratingCount + '</span><span class="stat-label">Valutazioni</span></div>';
  html += '<div class="stat-box"><span class="stat-number">' + loginDays + '</span><span class="stat-label">Giorni Fedele</span></div>';
  html += '<div class="stat-box"><span class="stat-number">' + offlineSessions + '</span><span class="stat-label">Sessioni Offline</span></div>';
  html += '<div class="stat-box"><span class="stat-number">' + Object.keys(unlocked).length + '</span><span class="stat-label">Trofei</span></div>';
  html += '</div>';

  html += '<div class="daily-mystery"><h3>🔮 Mistero del Giorno</h3>';
  html += '<div class="mystery-card">';
  if (dailyMystery) {
    html += '<span class="mystery-emoji">' + dailyMystery.icon + '</span>';
    html += '<span class="mystery-name">' + dailyMystery.name + '</span>';
    html += '<span class="mystery-desc">' + dailyMystery.desc + '</span>';
    html += '<span class="mystery-reward">+ ' + dailyMystery.reward + ' coins</span>';
    const isSolved = activeMysteries.some(m => m.id === dailyMystery.id);
    if (!isSolved) {
      html += '<button class="btn btn-warm" data-solve-mystery="' + dailyMystery.id + '">Prova</button>';
    } else {
      html += '<span class="mystery-solved">✅ Completato</span>';
    }
  } else {
    html += '<span>Torna domani per un nuovo mistero!</span>';
  }
  html += '</div>';

  if (activeMysteries.length > 0) {
    html += '<div class="active-mysteries"><h4>Misteri Attivi</h4>';
    for (const mp of mysteryProgress) {
      if (mp.mystery && !mp.mystery.solved) {
        const pct = Math.min(100, Math.round((mp.progress / Math.max(1, mp.total)) * 100));
        html += '<div class="mystery-item"><div class="mystery-header">' +
          '<span>' + mp.mystery.icon + ' ' + mp.mystery.name + '</span>' +
          '<span>' + mp.progress + '/' + mp.total + '</span></div>' +
          '<div class="mystery-bar"><div class="mystery-fill" style="width:' + pct + '%;"></div></div></div>';
      }
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="achievements-grid"><h3>Trofei (' + Object.keys(unlocked).length + '/' + achievements.length + ')</h3><div class="achievements-list">';
  for (const def of achievements) {
    const isUnlocked = !!unlocked[def.id];
    const rarityColor = def.id.includes('legendary') ? '#e74c3c' : def.id.includes('rare') || def.id.includes('Master') ? '#9b59b6' : def.id.includes('uncommon') ? '#3498db' : '#95a5a6';
    html += '<div class="achievement-item' + (isUnlocked ? ' unlocked' : ' locked') + '" data-achievement="' + def.id + '" style="' + (isUnlocked ? 'border-color:' + rarityColor : '') + '">' +
      '<span class="achievement-emoji">' + def.icon + '</span>' +
      '<div class="achievement-info">' +
      '<span class="achievement-name">' + (isUnlocked ? def.name : '???') + '</span>' +
      '<span class="achievement-desc">' + def.desc + '</span>' +
      '</div>' +
      (isUnlocked ? '<span class="achievement-check">✅</span>' : '') +
      '</div>';
  }
  html += '</div></div></div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-solve-mystery]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mysteryId = btn.dataset.solveMystery;
      const result = solveMystery(mysteryId, s);
      if (result) {
        audio.playDing();
        Haptic.success();
        showToast('🔮 Mistero risolto! +' + result.reward + ' coins');
        recordMysterySolved();
        recordOffline();
        refresh();
      } else {
        showToast('❌ Condizioni non soddisfatte');
      }
    });
  });
}

function renderDreamTab(container) {
  const s = getState();
  const dreamState = getDreamState();
  const isDream = isDreamMode();
  const dreamRecipes = getDreamRecipes();
  const dreamStars = getDreamStars();
  const starsCollected = getDreamStarsCollected();
  const starsEarned = getDreamStarsEarned();
  const totalBakes = getDreamTotalBakes();
  const dreamNPCs = getDreamNPCs();
  const timeUntilDream = getTimeUntilDream();
  const hoursRemaining = getDreamHoursRemaining();

  let html = '<div class="dream-container' + (isDream ? ' dream-active' : '') + '"><h2>🌙 Modalità Sogno</h2>';

  html += '<div class="dream-status-bar">';
  html += '<span class="dream-status">' + (isDream ? '🌙 Sogno Attivo!' : '☀️ Giorno — Entra nel sogno tra: ' + Math.ceil(timeUntilDream / 60000) + 'min') + '</span>';
  html += '<span class="dream-hours">' + hoursRemaining + 'h</span></div>';

  html += '<div class="dream-toggle"><button class="btn btn-warm" data-toggle-dream>';
  html += isDream ? '🌙 Esci dal Sogno' : '🌙 Entra nel Sogno';
  html += '</button></div>';

  html += '<div class="dream-stats">';
  html += '<div class="stat-box"><span class="stat-number">' + starsCollected + '</span><span class="stat-label">Stelle Raccolte</span></div>';
  html += '<div class="stat-box"><span class="stat-number">' + starsEarned + '</span><span class="stat-label">Stelle Totali</span></div>';
  html += '<div class="stat-box"><span class="stat-number">' + totalBakes + '</span><span class="stat-label">Pane da Sogno</span></div>';
  html += '</div>';

  if (isDream) {
    html += '<div class="dream-stars-area"><h3>⭐ Stelle Cadenti</h3><div class="stars-canvas" id="stars-canvas"></div>';
    html += '<div class="stars-list">';
    if (dreamStars.length === 0) {
      html += '<span class="no-stars">Nessuna stella. Cuoci pane per far cadere stelle!</span>';
    } else {
      for (const star of dreamStars) {
        if (!star.collected) {
          html += '<button class="star-item" data-collect-star="' + star.id + '" title="Stella dimensione ' + star.size.toFixed(0) + '">' +
            '✨' + ' x' + star.size.toFixed(0) + '</button>';
        }
      }
    }
    html += '</div></div>';

    if (dreamNPCs.length > 0) {
      html += '<div class="dream-npcs"><h3>🧙 NPC del Sogno</h3><div class="npc-list">';
      for (const npc of dreamNPCs) {
        html += '<div class="npc-item" data-visit-npc="' + npc.id + '">' +
          '<span class="npc-emoji">' + npc.icon + '</span>' +
          '<span class="npc-name">' + npc.name + '</span>' +
          '<span class="npc-desc">' + npc.desc + '</span>' +
          (npc.visited ? '<span class="npc-visited">✅</span>' : '<button class="btn btn-small">Visita</button>') +
          '</div>';
      }
      html += '</div></div>';
    }

    html += '<div class="dream-recipes"><h3>🍮 Ricette del Sogno</h3><div class="dream-recipe-list">';
    for (const recipe of dreamRecipes) {
      const canAfford = checkDreamRecipeAfford(recipe, s);
      html += '<div class="dream-recipe-item' + (canAfford ? '' : ' disabled') + '" data-bake-dream="' + recipe.id + '">' +
        '<span class="recipe-emoji">' + recipe.emoji + '</span>' +
        '<span class="recipe-name">' + recipe.name + '</span>' +
        '<span class="recipe-tier">' + recipe.tier.toUpperCase() + '</span>' +
        '<span class="recipe-time">' + recipe.bakeTime + 's</span>' +
        '<button class="btn btn-small" data-dream-bake="' + recipe.id + '"' + (canAfford ? '' : ' disabled') + '>Cuoci</button></div>';
    }
    html += '</div></div>';
  } else {
    html += '<div class="dream-preview"><h3>✨ Cosa ti aspetta</h3>';
    html += '<div class="preview-recipes">';
    for (const recipe of dreamRecipes.slice(0, 3)) {
      html += '<span class="preview-recipe">' + recipe.emoji + ' ' + recipe.name + '</span>';
    }
    html += '</div>';
    html += '<p class="preview-text">Ricomincia a cuocere quando arriva la notte (22:00-6:00) per sbloccare ricette speciali e stelle cadenti!</p>';
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;

  const toggleBtn = container.querySelector('[data-toggle-dream]');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleDreamMode();
      audio.playDing();
      Haptic.success();
      refresh();
    });
  }

  container.querySelectorAll('[data-collect-star]').forEach(btn => {
    btn.addEventListener('click', () => {
      const starId = parseInt(btn.dataset.collectStar);
      const result = collectDreamStar(starId);
      if (result) {
        audio.playDing();
        Haptic.success();
        recordDreamStar();
        showToast('⭐ Stella raccolta! (+1)');
        refresh();
      }
    });
  });

  container.querySelectorAll('[data-visit-npc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const npcId = btn.dataset.visitNpc;
      const result = visitDreamNPC(npcId, s);
      if (result) {
        audio.playDing();
        Haptic.success();
        if (result.reward.type === 'recipe') {
          showToast('🧙 ' + result.npc.name + ': ecco la ricetta ' + result.reward.id + '!');
        } else if (result.reward.type === 'coins') {
          s.player.coins += result.reward.amount;
          showToast('🧙 ' + result.npc.name + ': +' + result.reward.amount + ' coins!');
        } else {
          showToast('🧙 ' + result.npc.name + ': +' + result.reward.amount + ' stelle!');
        }
        refresh();
      } else {
        showToast('❌ Hai già visitato questo NPC');
      }
    });
  });

  container.querySelectorAll('[data-dream-bake]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipeId = btn.dataset.dreamBake;
      const recipe = getDreamRecipe(recipeId);
      if (recipe && checkDreamRecipeAfford(recipe, s)) {
        for (const [ing, amount] of Object.entries(recipe.ingredients)) {
          s.ingredients[ing].stock -= amount;
        }
        audio.playOvenHum();
        Haptic.hapticBake();
        recordDreamBake(recipeId);
        generateDreamStars(3);
        showToast('🌙 ' + recipe.name + ' cotto nel sogno!');
        refresh();
      } else {
        showToast('❌ Ingredienti insufficienti');
      }
    });
  });
}

function checkDreamRecipeAfford(recipe, state) {
  for (const [ing, amount] of Object.entries(recipe.ingredients)) {
    if ((state.ingredients[ing]?.stock || 0) < amount) return false;
  }
  return true;
}

function renderConstructionTab(container) {
  const s = getState();
  const materials = getMaterials();
  const buildings = getBuildings();
  const queue = getConstructionQueue();
  const buildInProgress = isBuildInProgress();
  const summary = getConstructionSummary();

  let html = '<div class="construction-container"><h2>🏗️ Costruzioni</h2>';

  html += '<div class="constr-materials"><h3>Materiali</h3><div class="material-grid">';
  for (const mat of summary.materials) {
    const stock = mat.stock;
    const max = mat.maxStock;
    const pct = Math.round((stock / max) * 100);
    html += '<div class="material-item">' +
      '<span class="mat-emoji">' + mat.emoji + '</span>' +
      '<span class="mat-name">' + mat.name + '</span>' +
      '<span class="mat-stock">' + stock + '/' + max + '</span>' +
      '<div class="mat-bar"><div class="mat-fill" style="width:' + pct + '%;"></div></div>' +
      '</div>';
  }
  html += '</div></div>';

  if (buildInProgress && queue.length > 0) {
    const progress = getConstructionProgress();
    html += '<div class="constr-queue">';
    html += '<h3>⚙️ Cantiere in Corso</h3>';
    html += '<div class="queue-item">';
    html += '<span class="queue-building">' + queue[0].buildingId + '</span>';
    html += '<div class="queue-bar"><div class="queue-fill" style="width:' + (progress ? progress.progress : 0) + '%;"></div></div>';
    html += '<span class="queue-text">' + Math.round(progress ? progress.progress : 0) + '%</span>';
    html += '</div></div>';
  }

  html += '<div class="constr-buildings"><h3>Edifici</h3><div class="building-grid">';
  for (const [id, building] of Object.entries(buildings)) {
    const condition = building.condition;
    const costs = building.costs || {};
    const canAfford = canAffordBuilding(id, materials);
    const needsRepair = condition < 100;
    const repairCost = needsRepair ? getRepairCost(id) : null;
    const canRepair = needsRepair && repairCost && Object.entries(repairCost).every(([mat, amt]) => (materials[mat]?.stock || 0) >= amt);

    html += '<div class="building-card" style="' + (condition < 50 ? 'border-color:#e74c3c;' : condition < 80 ? 'border-color:#f39c12;' : '') + '">' +
      '<span class="building-name">' + id + '</span>' +
      '<span class="building-condition" style="color:' + (condition >= 80 ? 'var(--green)' : condition >= 50 ? '#f39c12' : '#e74c3c') + ';">' + Math.round(condition) + '%</span>' +
      '<div class="condition-bar"><div class="condition-fill" style="width:' + condition + '%;"></div></div>' +
      '<div class="building-costs">';
    for (const [mat, amt] of Object.entries(costs)) {
      const have = materials[mat]?.stock || 0;
      html += '<span class="cost-item ' + (have >= amt ? 'afford' : 'no-afford') + '">' +
        (MATERIAL_EMOJIS[mat] || '❓') + amt + ' (' + have + ')</span>';
    }
    html += '</div>';
    if (needsRepair && canRepair) {
      html += '<button class="btn btn-small" data-repair="' + id + '">Ripara</button>';
    } else if (needsRepair && !canRepair) {
      html += '<span class="repair-locked">❌ Materiali insufficienti</span>';
    } else if (condition >= 100) {
      html += '<span class="building-ok">✅ Buono</span>';
    }
    html += '</div>';
  }
  html += '</div></div>';

  html += '<div class="constr-info"><h3>📋 Come Funziona</h3>';
  html += '<p>I tuoi edifici si deteriorano col tempo. Usa mattoni, legno, pietra e stoffa per ripararli.</p>';
  html += '<p>I materiali si rigenerano automaticamente ogni quelques ore.</p>';
  html += '<p>Solo 1 cantiere alla volta. Gli edifici con meno del 50% di condizioni sono a rischio!</p>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;

  const mats = getMaterials();
  container.querySelectorAll('[data-repair]').forEach(btn => {
    btn.addEventListener('click', () => {
      const buildingId = btn.dataset.repair;
      const result = repairBuilding(buildingId);
      if (result) {
        audio.playDing();
        Haptic.success();
        showToast('🏗️ ' + buildingId + ' riparato! ✅');
        refresh();
      } else {
        showToast('❌ Impossibile riparare — materiali insufficienti');
      }
    });
  });
}

const MATERIAL_EMOJIS = { bricks: '🧱', wood: '🪵', stone: '🪨', fabric: '🧵' };

function renderSoundtrackTab(container) {
  const state = getSoundtrackState();
  const muted = isSoundtrackMuted();
  const volume = getSoundtrackVolume();
  const states = getSoundtrackStates();
  const stateLabel = getSoundtrackStateLabel(state);
  const stateColor = getSoundtrackStateColor(state);
  const bpm = state === 'ready' ? 130 : state === 'baking' ? 100 : state === 'idle' ? 80 : state === 'dream' ? 70 : state === 'gacha' ? 140 : 60;

  let html = '<div class="soundtrack-container' + (muted ? ' muted' : '') + '"><h2>🎵 Soundtrack</h2>';

  html += '<div class="st-player">';
  html += '<div class="st-state-badge" style="background:' + stateColor + ';">' + stateLabel + '</div>';
  html += '<div class="st-bpm">BPM: ' + bpm + '</div>';
  html += '<div class="st-visual">' +
    '<div class="st-wave"></div>' +
    '<div class="st-wave"></div>' +
    '<div class="st-wave"></div>' +
    '</div></div>';

  html += '<div class="st-controls">';
  html += '<button class="btn btn-warm" data-st-mute>' + (muted ? '🔊 Unmuta' : '🔇 Muta') + '</button>';
  html += '<button class="btn btn-primary" data-st-vol-up">+</button>';
  html += '<span class="st-vol">' + Math.round(volume * 100) + '%</span>';
  html += '<button class="btn btn-primary" data-st-vol-down">-</button>';
  html += '</div>';

  html += '<div class="st-states"><h3>Stati Musicali</h3><div class="st-grid">';
  for (const [key, info] of Object.entries(states)) {
    const isActive = key === state;
    html += '<div class="st-state' + (isActive ? ' active' : '') + '" style="' + (isActive ? 'border-color:' + info.color : '') + '">' +
      '<span class="st-dot"></span>' +
      '<span class="st-name">' + info.label + '</span>' +
      (isActive ? '<span class="st-active-badge">🎵</span>' : '') +
      '</div>';
  }
  html += '</div></div>';

  html += '<div class="st-info"><h3>ℹ️ Come Funziona</h3>';
  html += '<p>La musica cambia automaticamente in base all\'attività di gioco.</p>';
  html += '<p><strong>Paziente</strong> (☁️) — Sei inattivo, atmosfera rilassante.</p>';
  html += '<p><strong>Cottura</strong> (🔥) — Stai cuocendo il pane, ritmi più serrati.</p>';
  html += '<p><strong>Pane Pronto</strong> (⚡) — Il tuo pane è pronto, suono di allarme.</p>';
  html += '<p><strong>Sogno</strong> (🌙) — Modalità notte, atmosfera eterea.</p>';
  html += '<p><strong>Gacha</strong> (🎰) — Stai tirando il gacha, tensione crescente.</p>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;

  container.querySelector('[data-st-mute]').addEventListener('click', () => {
    toggleSoundtrackMute();
    Audio.playCollect();
    refresh();
  });

  container.querySelector('[data-st-vol-up]').addEventListener('click', () => {
    setSoundtrackVolume(Math.min(1, volume + 0.1));
    refresh();
  });

  container.querySelector('[data-st-vol-down]').addEventListener('click', () => {
    setSoundtrackVolume(Math.max(0, volume - 0.1));
    refresh();
  });
}

function renderNPCTab(container) {
  const s = getState();
  refreshNPCs();
  const currentNPCs = getCurrentNPCs();
  const summary = getNPCTodaySummary();
  const pool = getAllNPCPool();
  const visited = getNPCById ? null : null;
  const today = summary.today;

  let html = '<div class="npc-container"><h2>🧍 Abitanti del Villaggio</h2>';

  html += '<div class="npc-summary">';
  html += '<span class="npc-count">' + summary.visited + '/' + summary.total + ' visitati oggi</span>';
  html += '<span class="npc-day">Giorno: ' + today + '</span>';
  html += '</div>';

  html += '<div class="npc-visitor-area"><h3>👥 Visitatori di Oggi</h3><div class="npc-grid">';
  if (currentNPCs.length === 0) {
    html += '<span class="no-npc">Nessun abitante oggi. Torna domani!</span>';
  } else {
    for (const npc of currentNPCs) {
      const isVisited = !!summary.history.find(h => h.npcId === npc.id);
      const rarityColor = getNPCRarityColor(npc.tier);
      const rarityEmoji = getNPCRarityEmoji(npc.tier);
      const personalityEmoji = getNPCPersonalityEmoji(npc.personality);
      const effectLabel = npc.effect.replace(/_/g, ' ');
      html += '<div class="npc-card' + (isVisited ? ' visited' : '') + '" data-npc-id="' + npc.id + '" style="border-color:' + rarityColor + ';">' +
        '<span class="npc-emoji">' + npc.emoji + '</span>' +
        '<span class="npc-name">' + npc.name + '</span>' +
        '<span class="npc-tier">' + rarityEmoji + ' ' + npc.tier.toUpperCase() + '</span>' +
        '<span class="npc-personality">' + personalityEmoji + ' ' + npc.personality + '</span>' +
        '<span class="npc-desc">' + npc.desc + '</span>' +
        '<span class="npc-effect">Effetto: ' + effectLabel + '</span>' +
        (isVisited ? '<span class="npc-visited-badge">✅ Visitato</span>' :
          '<button class="btn btn-warm" data-interact-npc="' + npc.id + '">Interagisci</button>') +
        '</div>';
    }
  }
  html += '</div></div>';

  html += '<div class="npc-pool"><h3>📋 Tutti gli Abitanti</h3><div class="npc-pool-grid">';
  for (const npc of pool) {
    const isToday = currentNPCs.some(c => c.id === npc.id);
    const isVisited = !!summary.history.find(h => h.npcId === npc.id);
    const rarityColor = getNPCRarityColor(npc.tier);
    html += '<div class="npc-pool-item' + (isToday ? ' today' : '') + '" style="' + (isToday ? 'border-color:' + rarityColor : '') + '">' +
      '<span>' + npc.emoji + '</span>' +
      '<span class="npc-pool-name">' + npc.name + '</span>' +
      (isToday ? '<span class="npc-today-badge">📍</span>' : '') +
      (isVisited ? '<span class="npc-visited-icon">✅</span>' : '') +
      '</div>';
  }
  html += '</div></div>';

  html += '<div class="npc-info"><h3>ℹ️ Come Funziona</h3>';
  html += '<p>Ogni giorno 2 abitanti diversi visitano il villaggio.</p>';
  html += '<p>Ogni NPC ha una personalità unica e un effetto speciale.</p>';
  html += '<p>Interagisci con loro per ottenere ricompense!</p>';
  html += '<p class="npc-tip">💡 <strong>Saggio</strong> = +50 XP | <strong>Mercante</strong> = +30 coins | <strong>Critico</strong> = 5 stelle | <strong>Ladra</strong> = -5 farina | <strong>Curatore</strong> = Ripara edifici | <strong>Ferratore</strong> = +20% velocità</p>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-interact-npc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const npcId = btn.dataset.interactNpc;
      const result = visitNPC(npcId);
      if (result) {
        const npc = getNPCById(npcId);
        Audio.playDing();
        Haptic.success();
        let rewardMsg = '';
        if (npc.reward.type === 'coins') {
          s.player.coins += npc.reward.value;
          rewardMsg = '+' + npc.reward.value + ' coins!';
        } else if (npc.reward.type === 'xp') {
          rewardMsg = '+' + npc.reward.value + ' XP!';
        } else if (npc.reward.type === 'flour_steal') {
          s.ingredients.farina.stock = Math.max(0, s.ingredients.farina.stock - npc.reward.value);
          rewardMsg = '-' + npc.reward.value + ' farina (rubata!)';
        } else if (npc.reward.type === 'rating') {
          rewardMsg = '+' + npc.reward.value + ' stelle!';
        } else {
          rewardMsg = 'Effetto attivato!';
        }
        showToast('🧍 ' + npc.name + ': ' + rewardMsg);
        refresh();
      } else {
        showToast('❌ Hai già visitato questo NPC oggi');
      }
    });
  });
}

function renderPhotoTab(container) {
  const gallery = getGallery();
  const photosTaken = getPhotosTaken();
  const filterOptions = getFilterOptions();
  const bgOptions = getBackgroundOptions();
  const frameOptions = getFrameOptions();
  const currentFilter = getCurrentFilter();
  const currentBg = getCurrentBackground();
  const currentFrame = getCurrentFrame();

  let html = '<div class="photo-container"><h2>📸 Galleria Foto</h2>';

  html += '<div class="photo-stats">';
  html += '<span class="photo-count">📷 ' + photosTaken + ' foto scattate</span>';
  html += '<span class="photo-gallery-count">🖼️ ' + gallery.length + ' in galleria</span>';
  html += '</div>';

  html += '<div class="photo-settings">';
  html += '<h3>⚙️ Impostazioni Foto</h3>';
  html += '<div class="photo-settings-grid">';
  html += '<div class="setting-group"><label>Filtro:</label><div class="filter-options">';
  for (const [key, opt] of Object.entries(filterOptions)) {
    html += '<button class="filter-btn' + (key === currentFilter ? ' active' : '') + '" data-set-filter="' + key + '">' + opt.emoji + ' ' + opt.name + '</button>';
  }
  html += '</div></div>';
  html += '<div class="setting-group"><label>Sfondo:</label><div class="bg-options">';
  for (const [key, opt] of Object.entries(bgOptions)) {
    html += '<button class="bg-btn' + (key === currentBg ? ' active' : '') + '" data-set-bg="' + key + '">' + opt.emoji + ' ' + opt.name + '</button>';
  }
  html += '</div></div>';
  html += '<div class="setting-group"><label>Cornice:</label><div class="frame-options">';
  for (const [key, opt] of Object.entries(frameOptions)) {
    html += '<button class="frame-btn' + (key === currentFrame ? ' active' : '') + '" data-set-frame="' + key + '">' + opt.name + '</button>';
  }
  html += '</div></div>';
  html += '</div></div>';

  html += '<div class="photo-gallery"><h3>🖼️ Galleria</h3>';
  if (gallery.length === 0) {
    html += '<div class="no-photos">Nessuna foto scattata. Cuoci un pane e scatta una foto!</div>';
  } else {
    html += '<div class="gallery-grid">';
    for (const photo of gallery) {
      html += '<div class="gallery-item" data-gallery-id="' + photo.id + '">' +
        '<img src="' + photo.dataUrl + '" alt="' + photo.recipeName + '" class="gallery-img">' +
        '<div class="gallery-info">' +
        '<span class="gallery-emoji">' + photo.recipeEmoji + '</span>' +
        '<span class="gallery-name">' + photo.recipeName + '</span>' +
        '<span class="gallery-filter">' + filterOptions[photo.filter]?.emoji + ' ' + filterOptions[photo.filter]?.name + '</span>' +
        '<button class="btn btn-small btn-danger" data-delete-photo="' + photo.id + '">❌</button>' +
        '</div></div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="photo-preview"><h3>🔍 Anteprima</h3>';
  html += '<canvas id="photo-canvas" width="200" height="200" class="photo-canvas"></canvas>';
  html += '<button class="btn btn-warm" data-capture-photo">📸 Scatta Foto</button>';
  html += '</div>';

  html += '<div class="photo-info"><h3>ℹ️ Come Funziona</h3>';
  html += '<p>Seleziona filtro, sfondo e cornice, poi scatta una foto artistica del tuo pane!</p>';
  html += '<p>Le foto si salvano in galleria (max ' + (20) + ').</p>';
  html += '<p>Ogni foto è un\'immagine PNG unica generata con Canvas.</p>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-set-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentFilter(btn.dataset.setFilter);
      refresh();
    });
  });

  container.querySelectorAll('[data-set-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentBackground(btn.dataset.setBg);
      refresh();
    });
  });

  container.querySelectorAll('[data-set-frame]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentFrame(btn.dataset.setFrame);
      refresh();
    });
  });

  const captureBtn = container.querySelector('[data-capture-photo]');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      const recipeEmoji = '🍞';
      const recipeName = 'Pane Base';
      const photo = capturePhoto(recipeEmoji, recipeName, currentFilter, currentBg, currentFrame);
      audio.playDing();
      Haptic.success();
      showToast('📸 Foto scattata! (' + filterOptions[currentFilter]?.name + ')');
      refresh();
    });
  }

  container.querySelectorAll('[data-delete-photo]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const photoId = btn.dataset.deletePhoto;
      removeFromGallery(photoId);
      showToast('🗑️ Foto rimossa dalla galleria');
      refresh();
    });
  });
}

function renderRegionalTab(container) {
  const s = getState();
  const region = getCurrentRegion();
  const regionDef = region || null;
  const isDetected = isRegionDetected();
  const summary = getRegionSummary();
  const regionalRecipes = region ? getRegionalRecipesForRegion(region.id) : [];
  const allRegions = getAllRegions();
  const bonuses = getRegionalBonuses();

  let html = '<div class="regional-container"><h2>🌍 Ricette Regionali</h2>';

  if (!isDetected || !region) {
    html += '<div class="region-unknown">🔍 Nessuna regione rilevata</div>';
    html += '<div class="region-select-grid">';
    for (const r of allRegions) {
      html += '<button class="region-card" data-set-region="' + r.id + '" style="border-color:' + r.color + '">' +
        '<span class="region-emoji">' + r.emoji + '</span>' +
        '<span class="region-name">' + r.name + '</span>' +
        '<span class="region-desc">' + r.desc + '</span></button>';
    }
    html += '</div>';
  } else {
    html += '<div class="region-badge" style="background:' + getRegionColor(region.id) + ';">' +
      '<span class="region-emoji">' + getRegionEmoji() + '</span>' +
      '<span class="region-name">' + region.name + '</span>' +
      '<span class="region-desc">' + region.desc + '</span></div>';
    html += '<div class="regional-summary">';
    html += '<span>Ricette: ' + summary.recipeCount + '</span>';
    html += '<span>Baked: ' + summary.totalBakes + '</span>';
    html += '</div>';
  }

  html += '<div class="regional-actions">';
  html += '<button class="btn btn-primary" data-detect-region>🔍 Rileva Posizione</button>';
  html += '</div>';

  if (regionalRecipes.length > 0) {
    html += '<div class="regional-recipes"><h3>🍮 Ricette Regionali</h3><div class="recipe-grid">';
    for (const recipe of regionalRecipes) {
      html += '<div class="recipe-card">' +
        '<span class="recipe-emoji">' + recipe.emoji + '</span>' +
        '<span class="recipe-name">' + recipe.name + '</span>' +
        '<span class="recipe-tier ' + recipe.tier + '">' + recipe.tier.toUpperCase() + '</span>' +
        '<span class="recipe-time">' + recipe.bakeTime + 's</span>' +
        '<span class="recipe-price">' + recipe.sellPrice + '💰</span></div>';
    }
    html += '</div></div>';
  }

  if (Object.keys(bonuses).length > 0) {
    html += '<div class="regional-ingredients"><h3>🌱 Bonus Ingredienti</h3><div class="ingredient-bonus-grid">';
    for (const [ing, bonus] of Object.entries(bonuses)) {
      const def = INGREDIENTS[ing];
      html += '<div class="ingredient-bonus">' +
        '<span class="ing-emoji">' + (def?.emoji || '🌾') + '</span>' +
        '<span class="ing-name">' + (def?.name || ing) + '</span>' +
        '<span class="ing-bonus">+' + Math.round(bonus * 100) + '%</span></div>';
    }
    html += '</div></div>';
  }

  html += '<div class="regional-info"><h3>ℹ️ Come Funziona</h3>';
  html += '<p>Seleziona la tua regione per sbloccare ricette esclusive!</p>';
  html += '<p>Ogni regione ha ingredienti locali che crescono più velocemente.</p>';
  html += '<p>Ogni regione ha ricette speciali non disponibili altrove.</p>';
  html += '</div>';
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-set-region]').forEach(btn => {
    btn.addEventListener('click', () => {
      const regionId = btn.dataset.setRegion;
      setUserRegion(regionId);
      recordRegionalRegion(regionId);
      Audio.playDing();
      Haptic.success();
      showToast('🌍 Region: ' + (getRegionById(regionId)?.name || regionId));
      refresh();
    });
  });

  container.querySelectorAll('[data-detect-region]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const detected = await detectRegion();
        if (detected) {
          Audio.playDing();
          Haptic.success();
          showToast('🌍 Region rilevata!');
          refresh();
        } else {
          showToast('🔍 Posizione non rilevata. Seleziona manualmente.');
        }
      } catch (e) {
        showToast('🔍 Errore rilevamento posizione');
      }
    });
  });
}

function renderMutationTab(container) {
  const catalog = getCatalog();
  const catalogStats = getCatalogStats();
  const geneticStats = getGeneticStats();
  const entries = getCatalogEntries();
  const traits = getAllGeneticTraits();
  const rarities = ['common', 'uncommon', 'rare', 'legendary'];

  let html = '<div class="mutation-container"><h2>🧬 Linea Genetica V2</h2>';

  html += '<div class="mutation-stats-grid">';
  html += '<div class="mutation-stat"><span class="stat-value">' + geneticStats.totalBakes + '</span><span class="stat-label">Cotture Totali</span></div>';
  html += '<div class="mutation-stat"><span class="stat-value">' + catalogStats.catalogSize + '</span><span class="stat-label">Mutazioni Scoperte</span></div>';
  html += '<div class="mutation-stat"><span class="stat-value">' + geneticStats.lineagesCreated + '</span><span class="stat-label">Linee Genetiche</span></div>';
  html += '<div class="mutation-stat"><span class="stat-value">' + geneticStats.legendaryMutations + '</span><span class="stat-label">Leggendarie</span></div>';
  html += '</div>';

  html += '<div class="mutation-rarity-bar"><h3>📊 Catalogo per Rarità</h3><div class="rarity-chart">';
  for (const r of rarities) {
    const count = (catalogStats.rarityBreakdown && catalogStats.rarityBreakdown[r]) || 0;
    const pct = catalogStats.catalogSize > 0 ? Math.round(count / catalogStats.catalogSize * 100) : 0;
    html += '<div class="rarity-item"><span class="rarity-label ' + r + '">' + r.toUpperCase() + '</span><div class="rarity-bar-bg"><div class="rarity-bar-fill ' + r + '" style="width:' + pct + '%"></div></div><span class="rarity-count">' + count + '</span></div>';
  }
  html += '</div></div>';

  html += '<div class="mutation-traits"><h3>🧬 Tratti Genetici</h3><div class="trait-grid">';
  for (const [type, def] of Object.entries(traits)) {
    html += '<div class="trait-card"><span class="trait-name">' + def.name + '</span><div class="trait-options">';
    for (let i = 0; i < def.options.length; i++) {
      html += '<span class="trait-option">' + def.emojis[i] + ' ' + def.options[i] + '</span>';
    }
    html += '</div></div>';
  }
  html += '</div></div>';

  html += '<div class="mutation-catalog"><h3>📋 Catalogo Mutazioni (' + entries.length + ')</h3><div class="catalog-list">';
  if (entries.length === 0) {
    html += '<div class="no-mutations">Nessuna mutazione scoperta. Cuoci pane con ricette mutate!</div>';
  } else {
    const sorted = entries.sort((a, b) => {
      const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
      return (order[a.rarity] || 3) - (order[b.rarity] || 3);
    });
    for (const entry of sorted.slice(0, 50)) {
      const powerClass = entry.powerLevel || 'base';
      html += '<div class="catalog-entry ' + entry.rarity + '">' +
        '<span class="entry-emoji">' + entry.emoji + '</span>' +
        '<span class="entry-type">' + (traits[entry.type]?.name || entry.type) + '</span>' +
        '<span class="entry-value">' + entry.value + '</span>' +
        '<span class="entry-rarity ' + entry.rarity + '">' + entry.rarity + '</span>' +
        '<span class="entry-power ' + powerClass + '">' + (entry.powerLevel || 'base') + '</span></div>';
    }
  }
  html += '</div></div>';

  html += '<div class="mutation-info"><h3>ℹ️ Come Funziona</h3>';
  html += '<p>Ogni pane ha una linea genetica con tratti ereditabili.</p>';
  html += '<p>La mutazione V2 introduce dominance (dominante, codominante, recessiva) e livelli di potere.</p>';
  html += '<p>Incrociando due pani si crea una nuova linea genetica con tratti combinati.</p>';
  html += '<p>Le mutazioni leggendarie hanno un moltiplicatore x1.5 sui benefici!</p>';
  html += '</div>';
  html += '</div>';
  container.innerHTML = html;
}

export { renderRegionalTab, renderMutationTab };
