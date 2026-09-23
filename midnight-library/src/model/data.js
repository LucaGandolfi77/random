// Dati di gioco — re-export dal contenuto config-driven (content.json).
// Le API restano le stesse (binding live via export let + refreshData)
// per non rompere Model/View; la sorgente modificabile è content.json
// e i pack mod (Fase 3).

import {
  RARE_BOOKS as rareBooks,
  MILESTONES as milestones,
  UNLOCKS as unlocks,
  MESSAGES as messages,
  TUTORIAL_STEPS as tutorialSteps,
  ROOMS as rooms,
  ACTIVITIES as activities,
  READERS as readers,
  MOON_ALMANAC as moonAlmanac,
  DAILY as daily,
  getContent,
  onContentChange,
} from './content.js';

// Versione del content al load (i test la confrontano con content.json).
export const CONTENT_VERSION = getContent().version;

// Binding live: riassegnati da refreshData() dopo un'apply di mod/remote.
export let RARE_BOOKS = rareBooks();
export let MILESTONES = milestones();
export let UNLOCKS = unlocks();
export let MESSAGES = messages();
export let TUTORIAL_STEPS = tutorialSteps();
export let ROOMS = rooms();
export let ACTIVITIES = activities();
export let READERS = readers();
export let MOON_ACHIEVEMENTS = moonAlmanac().achievements;
export let DAILY_LETTERS = daily().letters;

/** Riallinea tutti gli snapshot ai getter del content corrente. */
export function refreshData() {
  RARE_BOOKS = rareBooks();
  MILESTONES = milestones();
  UNLOCKS = unlocks();
  MESSAGES = messages();
  TUTORIAL_STEPS = tutorialSteps();
  ROOMS = rooms();
  ACTIVITIES = activities();
  READERS = readers();
  MOON_ACHIEVEMENTS = moonAlmanac().achievements;
  DAILY_LETTERS = daily().letters;
}

export { getContent };

// Auto-refresh quando il content cambia (mod load o remote swap).
onContentChange(() => { refreshData(); });
