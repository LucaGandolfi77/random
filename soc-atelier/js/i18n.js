import { CONFIG } from './config.js';

const DICT = {
  appTitle: { IT: 'SoC Atelier — La Fonderia dei Cristalli', EN: 'SoC Atelier — The Crystal Foundry' },
  appTagline: { IT: 'Costruisci piccoli cervelli di cristallo.', EN: 'Forge little crystal minds.' },
  start: { IT: 'Inizia', EN: 'Start' },
  continue: { IT: 'Continua', EN: 'Continue' },
  newGame: { IT: 'Nuova partita', EN: 'New game' },
  settings: { IT: 'Impostazioni', EN: 'Settings' },
  howTo: { IT: 'Come si gioca', EN: 'How to play' },
  inventory: { IT: 'Inventario', EN: 'Inventory' },
  achievements: { IT: 'Traguardi', EN: 'Achievements' },
  play: { IT: 'Gioca', EN: 'Play' },
  pause: { IT: 'Pausa', EN: 'Pause' },
  finish: { IT: 'Concludi', EN: 'Finish' },
  clear: { IT: 'Pulisci', EN: 'Clear' },
  reset: { IT: 'Reset', EN: 'Reset' },
  cancel: { IT: 'Annulla', EN: 'Cancel' },
  save: { IT: 'Salva', EN: 'Save' },
  saved: { IT: 'Salvato', EN: 'Saved' },
  resetConfirm: { IT: 'Vuoi davvero resettare il progresso?', EN: 'Really reset your progress?' },
  resetDone: { IT: 'Il progresso è stato resettato.', EN: 'Progress has been reset.' },
  language: { IT: 'Lingua', EN: 'Language' },
  sound: { IT: 'Suoni', EN: 'Sound' },
  music: { IT: 'Musica', EN: 'Music' },
  on: { IT: 'Acceso', EN: 'On' },
  off: { IT: 'Spento', EN: 'Off' },
  volume: { IT: 'Volume', EN: 'Volume' },
  installApp: { IT: 'Installa lapp', EN: 'Install app' },
  share: { IT: 'Condividi', EN: 'Share' },
  close: { IT: 'Chiudi', EN: 'Close' },
  next: { IT: 'Avanti', EN: 'Next' },
  back: { IT: 'Indietro', EN: 'Back' },
  chapter: { IT: 'Capitolo', EN: 'Chapter' },
  load: { IT: 'Carica', EN: 'Load' },
  tutorialSkip: { IT: 'Salta il tutorial', EN: 'Skip tutorial' },
  power: { IT: 'Potenza', EN: 'Power' },
  performance: { IT: 'Prestazioni', EN: 'Performance' },
  latency: { IT: 'Latenza', EN: 'Latency' },
  cost: { IT: 'Costo', EN: 'Cost' },
  balance: { IT: 'Armonia', EN: 'Balance' },
  bottleneck: { IT: 'Collo di bottiglia', EN: 'Bottleneck' },
  addModule: { IT: 'Aggiungi modulo', EN: 'Add module' },
  module: { IT: 'Modulo', EN: 'Module' },
  signature: { IT: 'Firma cristallo', EN: 'Crystal signature' },
  runBrief: { IT: 'Esegui brief', EN: 'Run brief' },
  fragment: { IT: 'Frammento di Cristallo', EN: 'Crystal Fragment' },
  shard: { IT: 'Sigillo', EN: 'Sigil' },
  sandbox: { IT: 'Sandbox', EN: 'Sandbox' },
  freePlay: { IT: 'Gioco libero', EN: 'Free play' },
  tutorial: { IT: 'Tutorial', EN: 'Tutorial' },
  tutorialDone: { IT: 'Tutorial completato!', EN: 'Tutorial complete!' },
  welcomeBack: { IT: 'Bentornato alla fonderia.', EN: 'Welcome back to the foundry.' },
  ready: { IT: 'Pronto?', EN: 'Ready?' },
  goal: { IT: 'Obiettivo:', EN: 'Goal:' },
  character: { IT: 'Personaggio', EN: 'Character' },
  weather: { IT: 'Meteo', EN: 'Weather' },
  phase: { IT: 'Fase della notte', EN: 'Phase of night' },
  goBackHome: { IT: 'Torna alla schermata iniziale', EN: 'Back to start' },
  export: { IT: 'Esporta salvataggio', EN: 'Export save' },
  import: { IT: 'Importa salvataggio', EN: 'Import save' },
  exportDone: { IT: 'Salvataggio esportato.', EN: 'Save exported.' },
  importDone: { IT: 'Salvataggio importato.', EN: 'Save imported.' },
  importFail: { IT: 'Salvataggio non valido.', EN: 'Save not valid.' },
  soundOffMsg: { IT: 'Suoni spenti (tocca per sbloccare).', EN: 'Sound off (tap to unlock).' },
  load: { IT: 'Carica', EN: 'Load' },
  noSave: { IT: 'Nessun salvataggio trovato.', EN: 'No save found.' },
  loadOK: { IT: 'Caricamento completato.', EN: 'Loaded.' },
  genericError: { IT: 'Qualcosa non va, ma il gioco continua.', EN: 'Something went wrong, but the game goes on.' },
};

let lang = (function () {
  try { return localStorage.getItem('soc-atelier-lang') || 'IT'; } catch { return 'IT'; }
})();

export function setLang(l) {
  lang = l === 'EN' ? 'EN' : 'IT';
  try { localStorage.setItem('soc-atelier-lang', lang); } catch { /* noop */ }
}
export function getLang() { return lang; }
export function t(key, params = {}) {
  const entry = DICT[key];
  let text = (entry && entry[lang]) || (entry && entry.IT) || key;
  Object.entries(params).forEach(([k, v]) => { text = text.replace(new RegExp(`{${k}}`, 'g'), String(v)); });
  return text;
}
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  const title = root.querySelector('title');
  if (title) title.textContent = CONFIG.appNameIT;
}
export function publish(callback) { applyStatic(document); if (callback) callback(); }
