function normalizeGameState(game) {
  if (!game) {
    return null;
  }

  game.modes = {
    charityPenance: false,
    ...(game.modes || {})
  };

  game.donations = {
    pending: [],
    completed: 0,
    totalSuggested: 0,
    overflowBlocked: 0,
    nextId: 1,
    ...(game.donations || {})
  };

  if (!Array.isArray(game.donations.pending)) {
    game.donations.pending = [];
  }

  if (typeof game.donations.nextId !== "number") {
    game.donations.nextId = game.donations.pending.length + game.donations.completed + 1;
  }

  game.localPlay = {
    enabled: true,
    activeCharacterId: game.team?.[0]?.id ?? null,
    nextCharacterId: null,
    handoffPending: false,
    playerNames: buildLocalPlayerNames(game.selectedIds || []),
    ...(game.localPlay || {})
  };

  return game;
}

function syncLocalPlayerName(characterId, rawValue) {
  appState.localPlayerNames[characterId] = rawValue.replace(/\s+/g, " ").trimStart().slice(0, 18);
}

function buildLocalPlayerNames(selectedIds) {
  return selectedIds.reduce((playerNames, characterId, index) => {
    const rawName = appState.localPlayerNames[characterId] || "";
    const cleanedName = rawName.trim();
    playerNames[characterId] = cleanedName || getDefaultLocalPlayerName(index);
    return playerNames;
  }, {});
}

function getDefaultLocalPlayerName(index) {
  return `Giocatore ${index + 1}`;
}

function getLocalPlayerLabel(game, characterId, index) {
  return game.localPlay?.playerNames?.[characterId] || getDefaultLocalPlayerName(index);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function maybeAddFlavorLog(force = false) {
  if (force || Math.random() > 0.58) {
    addLog(randomItem(GAME_TEXT.randomLines), "action");
  }
}

function playSound(kind) {
  if (!appState.preferences.soundOn) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const settings = {
    action: { freq: 360, duration: 0.08, type: "triangle" },
    special: { freq: 520, duration: 0.11, type: "square" },
    event: { freq: 250, duration: 0.09, type: "sawtooth" },
    warning: { freq: 180, duration: 0.12, type: "sawtooth" },
    victory: { freq: 620, duration: 0.2, type: "triangle" }
  }[kind] || { freq: 300, duration: 0.08, type: "triangle" };

  oscillator.type = settings.type;
  oscillator.frequency.value = settings.freq;
  gainNode.gain.value = kind === "warning" ? 0.03 : 0.045;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + settings.duration);
  oscillator.stop(context.currentTime + settings.duration);
  oscillator.onended = () => context.close();
}

function saveGame() {
  saveToStorage(STORAGE_KEYS.lastGame, appState.game);
}

function computeMissionGoal(teamSize) {
  return 70 + teamSize * 12;
}

function getActiveSynergies(selectedIds) {
  return SYNERGIES.filter((synergy) => synergy.pair.every((id) => selectedIds.includes(id)));
}

function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id);
}

function renderStatItem(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function summaryPanel(label, value) {
  return `<article class="panel"><strong>${label}</strong><p>${value}</p></article>`;
}

function scaleEffects(effects, multiplier) {
  const scaled = {};
  Object.entries(effects).forEach(([key, value]) => {
    scaled[key] = value > 0 ? value * multiplier : value * multiplier;
  });
  return scaled;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return structuredClone(fallback);
    }
    return JSON.parse(raw);
  } catch (error) {
    return structuredClone(fallback);
  }
}

function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Salvataggio non riuscito", error);
  }
}

function renderDots(active, total, className) {
  return Array.from({ length: total }, (_, index) => `<span class="${className} ${index < active ? "full" : ""}"></span>`).join("");
}

function formatEffectsAsPills(effects) {
  return Object.entries(effects).map(([key, value]) => {
    const positive = value > 0 && key !== "chaos";
    const negative = value < 0 || (value > 0 && key === "chaos");
    return `<span class="effect-pill ${positive ? "positive" : negative ? "negative" : ""}">${formatEffect(key, value)}</span>`;
  }).join("");
}

function effectSummary(effects) {
  return Object.entries(effects).map(([key, value]) => formatEffect(key, value)).join(" | ");
}

function formatEffect(key, value) {
  const labels = {
    chaos: "Caos",
    dignity: "Dignita'",
    career: "Carriera",
    stability: "Stabilita'",
    progress: "Progresso",
    funds: "Fondi",
    snacks: "Snack",
    documents: "Documenti"
  };
  return `${value > 0 ? "+" : ""}${value} ${labels[key]}`;
}