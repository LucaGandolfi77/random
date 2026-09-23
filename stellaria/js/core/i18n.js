import { CONFIG } from './config.js';

const DICT = {
  appTitle: { IT: 'Stellaria', EN: 'Stellaria' },
  appSubtitle: { IT: 'La Piazza dei Riflessi', EN: 'The Plaza of Reflections' },
  tagline: { IT: 'La fama è la moneta. Il riflesso è la verità.', EN: 'Fame is the currency. Reflection is the truth.' },
  start: { IT: 'Inizia', EN: 'Start' },
  continue: { IT: 'Continua', EN: 'Continue' },
  newGame: { IT: 'Nuova partita', EN: 'New game' },
  settings: { IT: 'Impostazioni', EN: 'Settings' },
  howTo: { IT: 'Come si gioca', EN: 'How to play' },
  inventory: { IT: 'Inventario', EN: 'Inventory' },
  achievements: { IT: 'Traguardi', EN: 'Achievements' },
  play: { IT: 'Gioca', EN: 'Play' },
  pause: { IT: 'Pausa', EN: 'Pause' },
  close: { IT: 'Chiudi', EN: 'Close' },
  next: { IT: 'Avanti', EN: 'Next' },
  back: { IT: 'Indietro', EN: 'Back' },
  cancel: { IT: 'Annulla', EN: 'Cancel' },
  ok: { IT: 'OK', EN: 'OK' },
  buy: { IT: 'Compra', EN: 'Buy' },
  equip: { IT: 'Equippa', EN: 'Equip' },
  equipped: { IT: 'Equipaggiato', EN: 'Equipped' },
  notEnough: { IT: 'Non abbastanza Stelle.', EN: 'Not enough stars.' },
  reset: { IT: 'Reset', EN: 'Reset' },
  resetConfirm: { IT: 'Vuoi davvero resettare il progresso? Tutto verrà perso.', EN: 'Really reset your progress? Everything will be lost.' },
  resetDone: { IT: 'Il progresso è stato resettato.', EN: 'Progress has been reset.' },
  save: { IT: 'Salva', EN: 'Save' },
  saved: { IT: 'Salvato', EN: 'Saved' },
  shopItemBought: { IT: 'Hai comprato {name}!', EN: 'You bought {name}!' },
  language: { IT: 'Lingua', EN: 'Language' },
  sound: { IT: 'Suoni', EN: 'Sound' },
  music: { IT: 'Musica', EN: 'Music' },
  on: { IT: 'Acceso', EN: 'On' },
  off: { IT: 'Spento', EN: 'Off' },
  volume: { IT: 'Volume', EN: 'Volume' },
  installApp: { IT: 'Installa Stellaria', EN: 'Install Stellaria' },
  share: { IT: 'Condividi', EN: 'Share' },
  exit: { IT: 'Esci', EN: 'Exit' },
  exportSave: { IT: 'Esporta salvataggio', EN: 'Export save' },
  importSave: { IT: 'Importa salvataggio', EN: 'Import save' },
  pinSetup: { IT: 'Imposta PIN biometrico', EN: 'Set biometric PIN' },
  remove: { IT: 'Rimuovi', EN: 'Remove' },
  profile: { IT: 'Profilo', EN: 'Profile' },
  backup: { IT: 'Backup', EN: 'Backup' },
  ambient: { IT: 'Modalità ambiente', EN: 'Ambient mode' },
  errRender: { IT: 'Errore di visualizzazione. Tocca per riprovare.', EN: 'Display error. Tap to retry.' },
  shareUnsupported: { IT: 'Condivisione non disponibile.', EN: 'Sharing not available.' },
  room: { IT: 'Stanza', EN: 'Room' },
  weather: { IT: 'Meteo', EN: 'Weather' },
  phase: { IT: 'Fase', EN: 'Phase' },
  stars: { IT: 'Stelle', EN: 'Stars' },
  reflection: { IT: 'Riflesso', EN: 'Reflection' },
  fame: { IT: 'Fama', EN: 'Fame' },
  level: { IT: 'Livello', EN: 'Level' },
  yourRoom: { IT: 'La tua stanza', EN: 'Your room' },
  greet: { IT: 'Saluta', EN: 'Greet' },
  pose: { IT: 'Esibisciti', EN: 'Pose' },
  compliment: { IT: 'Complimentati', EN: 'Compliment' },
  decorate: { IT: 'Arreda', EN: 'Decorate' },
  outfit: { IT: 'Vestiti', EN: 'Outfit' },
  help: { IT: 'Aiuta', EN: 'Help' },
  move: { IT: 'Spostati', EN: 'Move' },
  north: { IT: 'Nord', EN: 'North' },
  south: { IT: 'Sud', EN: 'South' },
  east: { IT: 'Est', EN: 'East' },
  west: { IT: 'Ovest', EN: 'West' },
  go: { IT: 'Vai', EN: 'Go' },
  starsX: { IT: ' Stelle', EN: ' stars' },
  riflessoX: { IT: ' Riflesso', EN: ' reflection' },
  welcomeBack: { IT: 'Bentornato nella piazza.', EN: 'Welcome back to the plaza.' },
  ready: { IT: 'Pronto?', EN: 'Ready?' },
  starsEarned: { IT: 'Hai guadagnato {n} Stelle!', EN: 'You earned {n} stars!' },
  reflectionEarned: { IT: 'Hai trovato un po\' di Riflesso.', EN: 'You found some Reflection.' },
  voteNice: { IT: '{name} apprezza la tua esibizione.', EN: '{name} appreciates your pose.' },
  voteMeh: { IT: '{name} resta freddo.', EN: '{name} stays cold.' },
  repeatWarning: { IT: 'Ripetere sempre lo stesso gesto… l\'applauso cala.', EN: 'Repeating the same pose… the applause fades.' },
  newCitizen: { IT: '{name} si è appena trasferito qui!', EN: '{name} just moved here!' },
  tutorialTitle: { IT: 'Benvenuto, abitante', EN: 'Welcome, newcomer' },
  tutorial1: { IT: 'Usa le frecce per esplorare le stanze della piazza.', EN: 'Use the arrows to explore the plaza rooms.' },
  tutorial2: { IT: 'Scegli un esibizione per guadagnare Stelle dai cittadini.', EN: 'Choose a pose to earn stars from citizens.' },
  tutorial3: { IT: 'Leggi i loro commenti: alcuni svelano un Riflesso.', EN: 'Read their comments: some reveal a Reflection.' },
  tutorial4: { IT: 'Arreda e vestiti per cambiare il tuo "vibe" e attirare chi ti somiglia.', EN: 'Decorate and dress to change your vibe and attract your match.' },
  tutorialSkip: { IT: 'Salta il tutorial', EN: 'Skip tutorial' },
  panelInventoryTitle: { IT: 'Inventario', EN: 'Inventory' },
  panelOutfitTitle: { IT: 'Il tuo aspetto', EN: 'Your look' },
  panelFurnitureTitle: { IT: 'Arreda la stanza', EN: 'Decorate your room' },
  panelAchievementsTitle: { IT: 'Traguardi', EN: 'Achievements' },
  panelHowToTitle: { IT: 'Come si gioca', EN: 'How to play' },
  panelSettingsTitle: { IT: 'Impostazioni', EN: 'Settings' },
  collectibleRiflesso: { IT: 'Riflesso', EN: 'Reflection' },
  shopItemBought: { IT: 'Hai comprato {name}!', EN: 'You bought {name}!' },
  lockedRoom: { IT: 'Per entrare servono Fama e Riflesso.', EN: 'Fame and Reflection required.' },
  notEnough: { IT: 'Non hai abbastanza Stelle.', EN: 'Not enough.' },
  pinTitle: { IT: 'PIN biometrico', EN: 'Biometric PIN' },
  pinBody: { IT: 'Vuoi rimuovere il PIN?', EN: 'Want to remove the PIN?' },
  dailyBonus: { IT: 'Bonus giornaliero: +3 Stelle', EN: 'Daily bonus: +3 stars' },
  eventGossip: { IT: 'Onda di gossip… {text}', EN: 'A wave of gossip… {text}' },
  eventMeteor: { IT: 'Pioggia di meteore! Un frammento è caduto.', EN: 'A shower of meteors! A fragment fell.' },
  eventVIP: { IT: 'Un visitatore illustre sta arrivando.', EN: 'A VIP visitor is arriving.' },
  eventBlackout: { IT: 'Blackout! Tutti si fanno compagnia.', EN: 'Blackout! Everyone keeps each other company.' },
  ambientFountain: { IT: 'La fontana brilla di stelle deboli.', EN: 'The fountain glimmers faint stars.' },
  ambientCafe: { IT: 'Vapori dolci salgono dal caffè.', EN: 'Sweet vapors rise from the café.' },
  ambientGreenhouse: { IT: 'I fiori si muovono senza vento.', EN: 'The flowers move without wind.' },
  ambientBoutique: { IT: 'Gli specchi delle vetrine ti osservano.', EN: 'The mirrors watch you from the displays.' },
  ambientNight: { IT: 'La piazza si fa più intima.', EN: 'The plaza grows more intimate.' },
  saveAuto: { IT: 'Salvato automaticamente.', EN: 'Auto-saved.' },
  shareCancelled: { IT: 'Condivisione annullata.', EN: 'Share cancelled.' },
  pinActive: { IT: 'PIN biometrico attivo', EN: 'Biometric PIN active' },
  pinUnavailable: { IT: 'Biometria non disponibile su questo dispositivo.', EN: 'Biometrics unavailable on this device.' },
  cancelled: { IT: 'Operazione annullata.', EN: 'Operation cancelled.' },
  pinRemoved: { IT: 'PIN rimosso', EN: 'PIN removed' },
  imported: { IT: 'Salvato importato', EN: 'Save imported' },
  notifOff: { IT: 'Notifiche disattivate', EN: 'Notifications off' },
  importFailed: { IT: 'Import fallito.', EN: 'Import failed.' },
  importBadFile: { IT: 'Import fallito: file non valido.', EN: 'Import failed: invalid file.' },
  shareUnsupported: { IT: 'Condivisione non disponibile', EN: 'Share unavailable' },
  fsUnavailable: { IT: 'File System non disponibile', EN: 'File System unavailable' },
  notifOn: { IT: 'Notifiche attive', EN: 'Notifications on' },
  swUpdate: { IT: 'Nuova versione disponibile. Ricarica per aggiornare.', EN: 'Update available. Reload to update.' },
  installed: { IT: 'Stellaria installata!', EN: 'Stellaria installed!' },
  restTomorrow: { IT: 'Riposa domani.', EN: 'Rest tomorrow.' },
  copied: { IT: 'Copiato!', EN: 'Copied!' },
  copiedPanel: { IT: 'Copiato nel pannello.', EN: 'Copied to panel.' },
  diaryExported: { IT: 'Diario esportato.', EN: 'Diary exported.' },
  exportFailed: { IT: 'Esportazione fallita.', EN: 'Export failed.' },
  paletteFailed: { IT: 'Impossibile estrarre palette.', EN: 'Could not extract palette.' },
  themeApplied: { IT: 'Tema applicato.', EN: 'Theme applied.' },
  photoInvalid: { IT: 'Foto non valida.', EN: 'Invalid photo.' },
  themeReset: { IT: 'Tema ripristinato.', EN: 'Theme reset.' },
  outfitBought: { IT: 'Indossato {name}!', EN: 'Now wearing {name}!' },
  marketTitle: { IT: 'Mercato del Riflesso', EN: 'Market of Reflection' },
  marketStock: { IT: 'Oggi ({n} oggetti)', EN: "Today ({n} items)" },
  marketBuy: { IT: 'Compra', EN: 'Buy' },
  marketNoStars: { IT: 'Non abbastanza Stelle.', EN: 'Not enough stars.' },
  marketNoRefl: { IT: 'Non abbastanza Riflesso.', EN: 'Not enough reflection.' },
  marketBought: { IT: 'Comprato {name}!', EN: 'Bought {name}!' },
  marketSoldOut: { IT: 'Esaurito.', EN: 'Sold out.' },
  marketRare: { IT: 'Oggetto raro', EN: 'Rare item' },
  marketRequireRefl: { IT: 'Richiede Riflesso.', EN: 'Requires Reflection.' },
  marketDate: { IT: 'Valide fino a mezzanotte.', EN: 'Valid until midnight.' },
  marketOwned: { IT: 'Già posseduto — equipaggia', EN: 'Owned — equip' },
  storagePersist: { IT: 'Spazio di archiviazione assicurato.', EN: 'Storage persisted.' },
  storageQuota: { IT: 'Spazio di archiviazione esaurito.', EN: 'Storage quota exceeded.' },
  mirror: { IT: 'Specchio', EN: 'Mirror' },
  mood: { IT: 'Tema', EN: 'Theme' },
  diary: { IT: 'Diario', EN: 'Diary' },
  upgrades: { IT: 'Miglioramenti', EN: 'Upgrades' },
  notification: { IT: 'Notifiche', EN: 'Notifications' },
  gentleNotif: { IT: 'Notifiche gentili', EN: 'Gentle notifications' },
  shared: { IT: 'Carta condivisa!', EN: 'Card shared!' },
};

let lang = (typeof navigator !== 'undefined' && (navigator.language || '').startsWith('it')) ? 'IT' : 'IT';
let resolved = false;

export function t(key, langArg) {
  const l = langArg || lang;
  return (DICT[key] && DICT[key][l]) || (DICT[key] && DICT[key].IT) || key;
}

export function setLang(l) {
  lang = l;
  resolved = true;
  try { localStorage.setItem('stellaria-lang', l); } catch {}
  const html = document.documentElement;
  html.lang = l === 'IT' ? 'it' : 'en';
  html.setAttribute('dir', 'ltr');
}

export function getLang() {
  return lang;
}

export function resolveLang() {
  if (resolved) return lang;
  try {
    const saved = localStorage.getItem('stellaria-lang');
    if (saved) { setLang(saved); return lang; }
  } catch {}
  setLang(lang);
  return lang;
}

export function availableLangs() {
  return [
    { code: 'IT', nameIT: 'Italiano', nameEN: 'Italian' },
    { code: 'EN', nameIT: 'Inglese', nameEN: 'English' },
  ];
}
