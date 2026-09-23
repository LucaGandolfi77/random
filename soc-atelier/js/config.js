import { PHASES } from './data/phases.js';
import { WEATHERS } from './data/weather.js';
import { COMPONENTS } from './data/components.js';
import { WORKLOADS } from './data/workloads.js';
import { CHAPTERS } from './data/chapters.js';
import { CHARACTERS } from './data/characters.js';
import { EVENTS } from './data/events.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { UNLOCKABLES } from './data/unlockables.js';
import { AMBIENT_MESSAGES } from './data/ambient.js';
import { TUTORIAL_STEPS } from './data/tutorial.js';

export const MAX_MODULES = 8;
export const BASE_POWER_BUDGET = 80;

export const CONFIG = Object.freeze({
  appName: 'SoC Atelier',
  appNameIT: 'SoC Atelier — La Fonderia dei Cristalli',
  appNameEN: 'SoC Atelier — The Crystal Foundry',
  version: '1.0.0',
  storageKey: 'soc-atelier-save',
  storageVersion: 1,
  PHASES, WEATHERS, COMPONENTS, WORKLOADS, CHAPTERS, CHARACTERS,
  EVENTS, ACHIEVEMENTS, UNLOCKABLES, AMBIENT_MESSAGES, TUTORIAL_STEPS,
  MAX_MODULES, BASE_POWER_BUDGET,
});

export { PHASES, WEATHERS, COMPONENTS, WORKLOADS, CHAPTERS, CHARACTERS,
  EVENTS, ACHIEVEMENTS, UNLOCKABLES, AMBIENT_MESSAGES, TUTORIAL_STEPS };
