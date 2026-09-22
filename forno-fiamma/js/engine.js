import { RECIPES, OVENS, INGREDIENTS, HELPERS, GACHA_COSTS, GACHA_PITY, UPGRADES, getRecipeMutationData } from './data.js';
import { getState, addXp, hasUpgrade, hasHelper, getBakedMutations, setBakedMutations, getAlchemyState, setAlchemyState, getGamificationData, updateGamificationData, recordAchievement, recordMysterySolved, recordRating } from './state.js';
import { getWeatherBonus, getWeatherIngredientMult, isWeatherRisk, hasLegendaryUnlock } from './weather.js';
import { generateMutations } from './mutation.js';
import { generateGeneticMutations, createLineage, breed, getCatalog, getCatalogStats, getGeneticStats, getLineage, getCatalogEntries, getLineageSummary, getAncestryChain, loadMutationV2State, getMutationV2SaveState } from './mutation_v2.js';
import {
  performAlchemy, getCauldronSize, isCauldronFull, isAlchemyReady,
  getAlchemyTimeRemaining, addToCauldron, removeFromCauldron, clearCauldron,
  getDiscoveredRecipes, discoverRecipe, isRecipeDiscovered, findMatchingRules,
  getCauldronDisplay, getAlchemyCooldown,
} from './alchemy.js';
import { checkAchievements, recordBake, recordPull, recordLogin, recordOffline, getGamificationDef, getAllAchievementDefs, getDailyMystery, unlockMystery, solveMystery, getActiveMysteries, getMysteryProgress, getGamificationState } from './gamification.js';
import { updateDreamMode, isDreamMode, getDreamRecipes, getDreamRecipe, recordDreamBake, getDreamState, getDreamStars, getDreamStarsCollected, visitDreamNPC, getDreamNPCs, getDreamTotalBakes, getDreamRecipesBaked, generateDreamStars, collectDreamStar, getTimeUntilDream, getDreamHoursRemaining } from './dream.js';
import { initConstruction, getMaterials, getBuildings, getConstructionQueue, isBuildInProgress, canAffordBuilding, startConstruction, updateConstruction, deteriorateBuildings, repairBuilding, getRepairCost, getMaterialStock, regenerateMaterials, getConstructionSummary, getConstructionSaveState, loadConstructionState, resetConstruction } from './construction.js';
import { setSoundtrackState, getSoundtrackState } from './soundtrack.js';
import { initNPCs, refreshNPCs, getCurrentNPCs, visitNPC, getNPCById, getNPCHistory, getNPCTodaySummary, getActiveNPCEffects, getNPCRate } from './npc.js';
import { capturePhoto, getGallery, getGalleryPhoto, removeFromGallery, getCurrentFilter, setCurrentFilter, getCurrentBackground, setCurrentBackground, getCurrentFrame, setCurrentFrame, getPhotosTaken, getFilterOptions, getBackgroundOptions, getFrameOptions, getGallerySaveState, loadGallery, resetGallery } from './photo.js';
import { detectRegion, setRegion: setUserRegion, getCurrentRegion, getAllRegions, getRegionalRecipe, getAllRegionalRecipes, getRegionalBonuses, getRegionalBonus, getRegionById, getActiveRegion, loadRegionalState, getRegionalSaveState, resetRegional } from './regional.js';

export function getRecipe(id) { return RECIPES.find(r => r.id === id); }
export function getOven(id) { return OVENS.find(o => o.id === id); }
export function getHelper(id) { return HELPERS.find(h => h.id === id); }
export { getBakedMutations, setBakedMutations };
export { performAlchemy, getCauldronSize, isCauldronFull, isAlchemyReady,
  getAlchemyTimeRemaining, addToCauldron, removeFromCauldron, clearCauldron,
  getDiscoveredRecipes, isRecipeDiscovered, findMatchingRules, getCauldronDisplay,
  getAlchemyCooldown };
export { checkAchievements, recordBake, recordPull, recordLogin, recordOffline,
  getDailyMystery, unlockMystery, solveMystery, getActiveMysteries,
  getMysteryProgress, getGamificationState, getAllAchievementDefs, getGamificationDef };
export { updateDreamMode, isDreamMode, getDreamRecipes, getDreamRecipe, recordDreamBake, getDreamState,
  getDreamStars, getDreamStarsCollected, visitDreamNPC, getDreamNPCs, getDreamTotalBakes,
  getDreamRecipesBaked, generateDreamStars, collectDreamStar, getTimeUntilDream, getDreamHoursRemaining };
export { initConstruction, getMaterials, getBuildings, getConstructionQueue, isBuildInProgress,
  canAffordBuilding, startConstruction, updateConstruction, deteriorateBuildings, repairBuilding,
  getRepairCost, getMaterialStock, regenerateMaterials, getConstructionSummary, getConstructionSaveState,
  loadConstructionState, resetConstruction };
export { setSoundtrackState, getSoundtrackState };
export { initNPCs, refreshNPCs, getCurrentNPCs, visitNPC, getNPCById, getNPCHistory,
  getNPCTodaySummary, getActiveNPCEffects, getNPCRate };
export { capturePhoto, getGallery, getGalleryPhoto, removeFromGallery, getCurrentFilter,
  setCurrentFilter, getCurrentBackground, setCurrentBackground, getCurrentFrame,
  setCurrentFrame, getPhotosTaken, getFilterOptions, getBackgroundOptions,
  getFrameOptions, getGallerySaveState, loadGallery, resetGallery };
export { detectRegion, setUserRegion, getCurrentRegion, getAllRegions, getRegionalRecipe,
  getAllRegionalRecipes, getRegionalBonuses, getRegionalBonus, getRegionById,
  getActiveRegion, loadRegionalState, getRegionalSaveState, resetRegional };
export { generateGeneticMutations, createLineage, breed, getCatalog, getCatalogStats,
  getGeneticStats, getLineage, getCatalogEntries, getLineageSummary, getAncestryChain,
  loadMutationV2State, getMutationV2SaveState, getPowerLevel, getPowerMultiplier };

export function getAvailableRecipes(level, helpers) {
  const owlBonus = helpers.includes('owl') ? -2 : 0;
  return RECIPES.filter(r => r.level + owlBonus <= level);
}

export function canAfford(recipe) {
  const s = getState();
  for (const [ing, amount] of Object.entries(recipe.ingredients)) {
    if ((s.ingredients[ing]?.stock || 0) < amount) return false;
  }
  return true;
}

export function startBaking(ovenIdx, recipeId) {
  const s = getState();
  const oven = s.ovens[ovenIdx];
  if (!oven || oven.recipeId) return false;
  const recipe = getRecipe(recipeId);
  if (!recipe || !canAfford(recipe)) return false;

  for (const [ing, amount] of Object.entries(recipe.ingredients)) {
    if ((s.ingredients[ing]?.stock || 0) < amount) return false;
  }
  for (const [ing, amount] of Object.entries(recipe.ingredients)) {
    s.ingredients[ing].stock -= amount;
  }
  oven.recipeId = recipeId;
  oven.progress = 0;
  oven.done = false;
  oven.last_tick = Date.now();
  oven.mutationKey = null;
  setSoundtrackState('baking');
  return true;
}

export function tickOvens() {
  const s = getState();
  const now = Date.now();
  const helperSpeed = helperBonus('speed');
  const weatherBonus = getWeatherBonus(null);

  for (const oven of s.ovens) {
    if (!oven.recipeId || oven.done) continue;

    const recipe = getRecipe(oven.recipeId);
    const ovenData = getOven(oven.ovenType);
    if (!recipe || !ovenData) continue;

    const weatherMult = getWeatherBonus(oven.ovenType);
    const elapsed = (now - oven.last_tick) / 1000;
    const speedMult = ovenData.speed + helperSpeed + weatherMult + (hasUpgrade('quick_bake') ? 0.1 : 0);
    const progressPerSec = (100 / recipe.bakeTime) * speedMult;

    oven.progress = Math.min(100, oven.progress + progressPerSec * elapsed);
    oven.last_tick = now;

    if (oven.progress >= 100) {
      oven.done = true;
      oven.progress = 100;
    }
  }
}

export function collectBread(ovenIdx) {
  const s = getState();
  const oven = s.ovens[ovenIdx];
  if (!oven || !oven.done) return null;

  const recipe = getRecipe(oven.recipeId);
  const ovenData = getOven(oven.ovenType);
  if (!recipe || !ovenData) return null;

  const flourMult = 1 + helperBonus('flour');
  const flourGain = Math.floor(2 * flourMult * (hasUpgrade('knead_master') ? 1.3 : 1));
  s.player.flour += flourGain;

  const sellMult = 1 + helperBonus('sell');
  const xpGain = recipe.xp + ovenData.bonusXp;

  if (!s.inventory[recipe.id]) s.inventory[recipe.id] = 0;
  s.inventory[recipe.id]++;

  s.collection.recipes[recipe.id] = true;

  const baseMutationData = getRecipeMutationData(recipe.id);
  const mutations = generateMutations(recipe.id, baseMutationData ? Object.values(baseMutationData) : []);
  const mutationKey = recipe.id + '_' + Date.now();
  setBakedMutations(recipe.id, mutationKey, mutations);
  oven.mutationKey = mutationKey;

  const leveled = addXp(xpGain);

  recordBake();
  const newlyUnlocked = checkAchievements(s);
  for (const achievement of newlyUnlocked) {
    recordAchievement(achievement.id);
  }

  if (isDreamMode()) {
    recordDreamBake(recipe.id);
    if (Math.random() < 0.3) {
      recordDreamStar();
    }
    generateDreamStars(5);
  }

  oven.recipeId = null;
  oven.progress = 0;
  oven.done = false;

  setSoundtrackState('ready');
  setTimeout(() => setSoundtrackState('idle'), 3000);

  return { recipe, flourGain, xpGain, sellPrice: Math.floor(recipe.sellPrice * sellMult), leveled, mutations, newlyUnlocked };
}

export function tickIngredients() {
  const s = getState();
  const now = Date.now();

  for (const [key, data] of Object.entries(INGREDIENTS)) {
    const slot = s.ingredients[key];
    if (!slot) continue;

    let regenMult = 1;
    if (key === 'grano' && hasUpgrade('field_wheat')) regenMult += 0.3;
    if (key === 'farina' && hasUpgrade('field_flour')) regenMult += 0.3;
    const weatherMult = getWeatherIngredientMult(key);
    regenMult *= weatherMult;

    const elapsed = (now - slot.last_regen) / 1000;
    const regenRate = data.regenTime / regenMult;
    const ticks = Math.floor(elapsed / regenRate);

    if (ticks > 0) {
      slot.stock = Math.min(data.maxStock, slot.stock + ticks);
      slot.last_regen += ticks * regenRate * 1000;
    }
  }
}

export function sellBread(recipeId, qty) {
  const s = getState();
  const recipe = getRecipe(recipeId);
  if (!recipe) return 0;

  const sellMult = 1 + helperBonus('sell');
  const have = s.inventory[recipeId] || 0;
  const toSell = Math.min(qty, have);
  if (toSell <= 0) return 0;

  const total = Math.floor(recipe.sellPrice * sellMult) * toSell;
  s.player.coins += total;
  s.inventory[recipeId] -= toSell;
  if (s.inventory[recipeId] <= 0) delete s.inventory[recipeId];

  return total;
}

export function pullGacha(tier = 'single') {
  const s = getState();
  let cost;
  if (tier === 'guaranteed') {
    cost = GACHA_COSTS.guaranteed;
  } else if (tier === 'multi') {
    cost = GACHA_COSTS.multi;
  } else {
    cost = Math.max(1, GACHA_COSTS.single - (hasUpgrade('gacha_discount') ? 2 : 0));
  }

  if (s.player.flour < cost) return null;
  s.player.flour -= cost;

  const pityBonus = hasHelper('farfalla') ? 0.15 : 0;
  let result;

  if (s.gacha.pity >= GACHA_PITY - 1) {
    result = rollGacha(true);
    s.gacha.pity = 0;
  } else {
    result = rollGacha(tier === 'guaranteed', pityBonus);
    if (result.tier === 'rare' || result.tier === 'epic' || result.tier === 'legendary') {
      s.gacha.pity = 0;
    } else {
      s.gacha.pity++;
    }
  }

  s.gacha.totalPulls++;
  return result;
}

function rollGacha(guaranteedRare = false, pityBonus = 0) {
  const roll = Math.random();
  let tier;

  if (guaranteedRare) {
    tier = roll < 0.6 ? 'rare' : roll < 0.9 ? 'epic' : 'legendary';
  } else {
    const adjusted = roll - pityBonus;
    if (adjusted < 0.55) tier = 'common';
    else if (adjusted < 0.82) tier = 'uncommon';
    else if (adjusted < 0.95) tier = 'rare';
    else if (adjusted < 0.99) tier = 'epic';
    else tier = 'legendary';
  }

  const poolType = Math.random();
  if (poolType < 0.5) {
    const pool = RECIPES.filter(r => r.tier === tier);
    if (pool.length) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'recipe', tier, item, emoji: item.emoji, name: item.name };
    }
  } else if (poolType < 0.8) {
    const pool = OVENS.filter(o => o.tier === tier);
    if (pool.length) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'oven', tier, item, emoji: item.emoji, name: item.name };
    }
  } else {
    const pool = HELPERS.filter(h => h.tier === tier);
    if (pool.length) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'helper', tier, item, emoji: item.emoji, name: item.name };
    }
  }

  const fallback = RECIPES.filter(r => r.tier === tier);
  const item = fallback[Math.floor(Math.random() * fallback.length)] || RECIPES[0];
  return { type: 'recipe', tier: item.tier, item, emoji: item.emoji, name: item.name };
}

export function applyGachaResult(result) {
  const s = getState();
  if (!result) return false;

  if (result.type === 'recipe') {
    s.collection.recipes[result.item.id] = true;
  } else if (result.type === 'oven') {
    s.collection.ovens[result.item.id] = true;
  } else if (result.type === 'helper') {
    if (!s.helpers.includes(result.item.id)) {
      s.helpers.push(result.item.id);
      s.collection.helpers[result.item.id] = true;
    }
  }
  return true;
}

export function getMaxOvens() {
  const s = getState();
  let base = s.player.maxOvens;
  for (const upId of s.upgrades) {
    const up = UPGRADES.find(u => u.id === upId);
    if (up && up.effect === 'slot') base += up.value;
  }
  if (hasHelper('coniglio')) base += 1;
  return base;
}

export function buyUpgrade(upgradeId) {
  const s = getState();
  if (s.upgrades.includes(upgradeId)) return false;
  const up = UPGRADES.find(u => u.id === upgradeId);
  if (!up) return false;
  if (s.player.coins < up.cost) return false;

  s.player.coins -= up.cost;
  s.upgrades.push(upgradeId);

  if (up.effect === 'slot') {
    s.player.maxOvens++;
    s.ovens.push({
      id: s.ovens.length,
      recipeId: null,
      progress: 0,
      done: false,
      last_tick: Date.now(),
      ovenType: 'forno_cotto',
    });
  }

  return true;
}

export function changeOvenType(ovenIdx, ovenType) {
  const s = getState();
  const oven = s.ovens[ovenIdx];
  if (!oven || oven.recipeId) return false;
  if (!s.collection.ovens[ovenType]) return false;
  oven.ovenType = ovenType;
  return true;
}

export function helperBonus(effect) {
  const s = getState();
  let total = 0;
  for (const hId of s.helpers) {
    const h = HELPERS.find(x => x.id === hId);
    if (h && h.effect === effect) total += h.value;
  }
  return total;
}

export function calcOfflineProgress() {
  const s = getState();
  const now = Date.now();
  const offlineMs = now - s.meta.last;
  const offlineSec = Math.min(offlineMs / 1000, 86400);

  if (offlineSec < 10) return null;

  const events = [];

  for (const oven of s.ovens) {
    if (!oven.recipeId || oven.done) continue;

    const recipe = getRecipe(oven.recipeId);
    const ovenData = getOven(oven.ovenType);
    if (!recipe || !ovenData) continue;

    const helperSpeed = helperBonus('speed');
    const speedMult = ovenData.speed + helperSpeed + (hasUpgrade('quick_bake') ? 0.1 : 0);
    const progressPerSec = (100 / recipe.bakeTime) * speedMult;

    const newProgress = oven.progress + progressPerSec * offlineSec;

    if (newProgress >= 100) {
      oven.progress = 100;
      oven.done = true;
      oven.last_tick = now;
      events.push({ type: 'bread_ready', recipe: recipe.name, emoji: recipe.emoji });
    } else {
      oven.progress = newProgress;
      oven.last_tick = now;
    }
  }

  for (const [key, data] of Object.entries(INGREDIENTS)) {
    const slot = s.ingredients[key];
    if (!slot) continue;
    let regenMult = 1;
    if (key === 'grano' && hasUpgrade('field_wheat')) regenMult += 0.3;
    if (key === 'farina' && hasUpgrade('field_flour')) regenMult += 0.3;
    const regenRate = data.regenTime / regenMult;
    const ticks = Math.floor(offlineSec / (regenRate));
    if (ticks > 0) {
      const old = slot.stock;
      slot.stock = Math.min(data.maxStock, slot.stock + ticks);
      slot.last_regen += ticks * regenRate * 1000;
      if (slot.stock > old) {
        events.push({ type: 'ingredient_regen', ingredient: data.name, emoji: data.emoji, amount: slot.stock - old });
      }
    }
  }

  s.meta.last = now;

  return events.length > 0 ? events : null;
}

