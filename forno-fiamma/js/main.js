import * as State from './state.js';
import * as Engine from './engine.js';
import * as UI from './ui.js';
import * as Audio from './audio.js';
import * as Haptic from './haptic.js';
import { initGrid, syncWithOvens } from './village.js';
import { getCurrentWeather, getWeatherEmoji, getWeatherHoursRemaining } from './weather.js';
import { initSoundtrack, setSoundtrackState, disposeSoundtrack } from './soundtrack.js';
import { detectRegion, loadRegionalState, getRegionalSaveState } from './regional.js';
import { initMutationV2, loadMutationV2State, getMutationV2SaveState } from './mutation_v2.js';

let _lastTick = 0;
let _autosaveTimer = 0;
let _lastLogicTick = 0;
let _rafId = null;
const AUTOSAVE_INTERVAL = 20000;
const LOGIC_TICK_INTERVAL = 1000;
const MAX_DT = 5000;

function boot() {
  try {
    State.init();
    initGrid();
    syncWithOvens();
    Engine.tickIngredients();
    Engine.tickOvens();

    const offlineEvents = Engine.calcOfflineProgress();
    UI.init();
    UI.refresh();

    initSoundtrack().then(() => {
      setSoundtrackState('idle');
    }).catch(() => {
      console.warn('[FornoFiamma] Soundtrack unavailable');
    });

    const savedRegional = getRegionalSaveState();
    if (savedRegional) loadRegionalState(savedRegional);
    detectRegion().then(region => {
      if (region) console.log('[FornoFiamma] Region:', region);
    }).catch(() => {});

    const savedGenetic = getMutationV2SaveState();
    initMutationV2();
    if (savedGenetic) loadMutationV2State(savedGenetic);

    const weather = getCurrentWeather();
    const weatherEmoji = getWeatherEmoji();
    const hoursLeft = getWeatherHoursRemaining();
    Haptic.light();
    UI.showToast('🌦️ ' + weatherEmoji + ' ' + weather + ' — ' + hoursLeft + 'h rimasti');

    if (offlineEvents) {
      setTimeout(() => {
        for (const ev of offlineEvents) {
          if (ev.type === 'bread_ready') {
            Audio.playDing();
            Haptic.success();
            UI.showToast(ev.emoji + ' ' + ev.recipe + ' pronto!');
          } else if (ev.type === 'ingredient_regen') {
            UI.showToast(ev.emoji + ' ' + ev.ingredient + ' +' + ev.amount);
          }
        }
        UI.refresh();
      }, 500);
    }

    _lastTick = performance.now();
    _lastLogicTick = _lastTick;
    _rafId = requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error('[FornoFiamma] Boot error:', err);
    UI.showErrorToast('Errore di avvio. Ricarica la pagina.');
  }
}

function gameLoop(now) {
  try {
    const dt = now - _lastTick;
    _lastTick = now;

    if (dt > 0 && dt < MAX_DT) {
      _lastLogicTick += dt;
      while (_lastLogicTick >= LOGIC_TICK_INTERVAL) {
        _lastLogicTick -= LOGIC_TICK_INTERVAL;
        Engine.tickOvens();
        Engine.tickIngredients();
      }
    } else if (dt >= MAX_DT) {
      _lastLogicTick = 0;
    }

    _autosaveTimer += dt;
    if (_autosaveTimer >= AUTOSAVE_INTERVAL) {
      _autosaveTimer = 0;
      State.save();
      UI.refresh();
    }

    _rafId = requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error('[FornoFiamma] Game loop error:', err);
    Haptic.error();
  }
}

window.addEventListener('beforeunload', () => {
  try { State.save(); } catch {}
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try { State.save(); } catch {}
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    disposeSoundtrack();
  } else if (document.visibilityState === 'visible') {
    _lastLogicTick = performance.now();
    Engine.tickIngredients();
    Engine.tickOvens();
    UI.refresh();
    initSoundtrack().then(() => {
      setSoundtrackState('idle');
    }).catch(() => {});
    _rafId = requestAnimationFrame(gameLoop);
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function() {});
}

document.addEventListener('DOMContentLoaded', boot);
