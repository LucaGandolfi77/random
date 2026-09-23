// ===== Bar Blu — Model (all mutations in-place) =====

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'barblu_v1';
export const PHASES = ['morning', 'afternoon', 'evening', 'night'];
export const PHASE_NAMES = { morning: 'Mattina', afternoon: 'Pomeriggio', evening: 'Sera', night: 'Notte' };
export const PHASE_ICONS = { morning: '☀', afternoon: '🌤', evening: '🌅', night: '🌙' };
export const XP_PER_LEVEL = 20;

export const MEMORY_THRESHOLDS = [1, 3, 5];

export const ITEMS = {
  coffee:    { id: 'coffee',    name: 'Caffè',     icon: '☕' },
  cigarette: { id: 'cigarette', name: 'Sigaretta', icon: '🚬' },
  jagerbomb: { id: 'jagerbomb', name: 'JägerBomb', icon: '🥃' },
  scratch:   { id: 'scratch',   name: 'Grattacielo', icon: '🎫' },
};
export const ITEM_IDS = ['coffee', 'cigarette', 'jagerbomb', 'scratch'];

export const CUSTOMERS = [
  { id: 'mario',  name: 'Mario',       icon: '👨', wants: 'coffee',    prefPhases: [0, 1], affReward: 2, rarity: 'regular' },
  { id: 'lucia',  name: 'Lucia',       icon: '👩', wants: 'cigarette', prefPhases: [2, 3], affReward: 2, rarity: 'regular' },
  { id: 'franco', name: 'Franco',      icon: '🧔', wants: 'jagerbomb', prefPhases: [2, 3], affReward: 3, rarity: 'regular' },
  { id: 'anna',   name: 'Anna',        icon: '👧', wants: 'scratch',   prefPhases: [1, 2], affReward: 1, rarity: 'regular' },
  { id: 'nonna',  name: 'Nonna Rosa',  icon: '👵', wants: 'coffee',    prefPhases: [0],    affReward: 3, rarity: 'special' },
  { id: 'marco',  name: 'Marco',       icon: '🧑', wants: 'cigarette', prefPhases: [1],    affReward: 1, rarity: 'regular' },
  { id: 'sara',   name: 'Sara',        icon: '👩', wants: 'jagerbomb', prefPhases: [3],    affReward: 3, rarity: 'special' },
  { id: 'piero',  name: 'Piero',       icon: '🧑', wants: 'coffee',    prefPhases: [2, 3], affReward: 2, rarity: 'regular' },
  { id: 'prof-baldini', name: 'Prof. Baldini', icon: '🎓', wants: 'coffee', prefPhases: [0], affReward: 3, rarity: 'special', drunkProne: true, tagline: 'Filosofo caduto in disgrazia', quips: ['La coscienza è una bevanda che non ho mai ordinato.', 'Ho pubblicato tre libri. Ora colleziono bicchieri.', 'Dante beveva. Anche io, per motivi diversi.'], story: ['Era l\'anno della mia dissertazione. Poi il decano.', 'Il bar è l\'unico posto dove i miei pensieri trovano ascolto.', 'Ogni versetto è una scusa per non affrontare la mia porta.'] },
  { id: 'nando',  name: 'Nando',       icon: '🔧', wants: 'jagerbomb', prefPhases: [1, 2], affReward: 2, rarity: 'regular', tagline: 'Inventore pazzo', quips: ['Ho quasi finito la macchina che allunga la vita! Manca il cavo.', 'Se funziona, diventiamo ricchi. Se esplode... offro io.', 'Questo oggetto ha un brevetto in sospeso e un piede in più.'], story: ['Tutto cominciò con una pentola che cucinava da sola.', 'Il brevetto è in sospeso. L\'entusiasmo no.', 'Il mio capolavoro è in fondo al garden: parzialmente funzionante.'] },
  { id: 'contessa', name: 'Contessa Adelaide', icon: '👒', wants: 'cigarette', prefPhases: [2, 3], affReward: 2, rarity: 'regular', tagline: 'Nobildonna truffaldina', quips: ['Ti vendo una tonnara in Sardegna. Affare d\'oro.', 'La nobiltà non si compra, ma si affitta.', 'Ho tre castelli. Due sono piatti panoramici, uno è vero.'], story: ['Arrivai con una valigia e una credibile verità.', 'Il primo affare fu un terreno che esisteva solo sulla carta.', 'Ora offro storie. Le carte sono un supplemento.'] },
  { id: 'dario',  name: 'Dario',       icon: '🍷', wants: 'jagerbomb', prefPhases: [3], affReward: 3, rarity: 'special', drunkProne: true, tagline: 'Poeta dei Navigli', quips: ['Ho scritto una poesia sul fondo del bicchiere. Non si legge.', 'Le parole pesano, l\'alcol no.', 'Sono un poeta. Il che significa: sempre ubriaco, mai sereno.'], story: ['La mia prima poesia la lessi a un gatto. Mi giudicò.', 'I versi migliori li scrivo quando il bancone è umido.', 'Non ho editor. Ho un barista che mi dice "ancora?"'] },
  { id: 'mirella', name: 'Mirella / La Voce', icon: '🎤', wants: 'coffee', prefPhases: [0, 3], affReward: 3, rarity: 'special', drunkProne: true, tagline: 'Ex cantante lirica', quips: ['Cantavo alla Scala. Ora canto per chi resta.', 'La voce non si perde: si sposta.', 'Una voce senza pubblico è solo rumore.'], story: ['La prima volta che cantai, il silenzio era perfetto.', 'Poi arrivarono gli applausi, poi i contratti, poi l\'oblio.', 'Ora ogni sera è un recital. Di solito pago io il caffè.'] },
  { id: 'rocco',  name: 'Rocco \'O Pazzo', icon: '🤡', wants: 'jagerbomb', prefPhases: [2, 3], affReward: 1, rarity: 'regular', tagline: 'Cabarettista ubriacone', quips: ['Perché il caffè va in galera? Perché l\'hanno trovato... moka!', 'Ridere per non piangere. Che è la stessa cosa, di notte.', 'Ho tre barzellette. Due funzionano, una mi caccia fuori.'], story: ['La prima barzelletta la feci a mio padre. Non rise.', 'Il secondo bar lo fece ridere. E poi piangere.', 'Il terzo non lo racconto mai. Funziona sempre.'], drunkProne: true },
  { id: 'ugo',    name: 'Sor Ugo',     icon: '🧥', wants: 'coffee', prefPhases: [0, 1], affReward: 3, rarity: 'wanderer', tagline: 'Senzatetto gentile', quips: ['Non chiedo elemosina. Chiedo di non essere solo.', 'Un caffè può salvare una giornata. A volte due.', 'Ho avuto una vita. Adesso ho una storia.'], story: ['Essere senza casa non significa essere senza nome.', 'Il bar è l\'unico orologio che mi è rimasto.', 'Ogni caffè è un arrivederci a qualcuno.'] },
  { id: 'elvira', name: 'Signora Elvira', icon: '🕯️', wants: 'cigarette', prefPhases: [2], affReward: 3, rarity: 'special', drunkProne: true, tagline: 'Vedova dello stesso tavolo', quips: ['Ordino due caffè. Uno non lo bevo.', 'Il silenzio ha il suo sapore, qui.', 'Mi ricorda tutti. Una è mia moglie.'], story: ['Mi sedevo dall\'altra parte. Ora mi siedo qui.', 'Porto il suo nome come un gatto che non lascia.', 'Il tempo qui è un orologio senza lancette.'] },
  { id: 'gigi',   name: 'Gigi il Caduto', icon: '📉', wants: 'jagerbomb', prefPhases: [1, 3], affReward: 2, rarity: 'regular', drunkProne: true, tagline: 'Ex dirigente, licenziato', quips: ['Avevo tre telefoni in scrivania. Ora ho due piccioni su una panchina.', 'Il CV è in fondo al bicchiere.', 'Il lavoro si perde. La faccia no, a volte.'], story: ['Mi licenziarono con una pacca sulla spalla.', 'Il mese dopo ho perso anche l\'appartamento.', 'Ora il bancone è la mia scrivania. Più calda.'] },
  { id: 'vera',   name: 'Vera Veleno', icon: '🎸', wants: 'jagerbomb', prefPhases: [3], affReward: 2, rarity: 'special', drunkProne: true, tagline: 'Rockstar caduta', quips: ['Ero un mito. Ora sono un avvertimento.', 'La chitarra è scordata. Come me.', 'Il backstage era peggio del palco.'], story: ['Eravamo quattro. Ora ne restano tre e un\'eco.', 'La fama è una mano che ti tiene su e ti lascia cadere.', 'Suono ancora. Solo quando nessuno ascolta.'] },
  { id: 'maresciallo', name: 'Maresciallo Cazzaniga', icon: '👮', wants: 'coffee', prefPhases: [0, 1], affReward: 1, rarity: 'regular', tagline: 'Finto duro nostalgico', quips: ['Rapporto: il bar è in ordine. Il maresciallo, meno.', 'Bevo solo caffè. Nascosto.', 'Ho arrestato più adolescenti di quanti ne abbia mai amati.'], story: ['La divisa pesa meno di quanto pesava la mia giovinezza.', 'Ogni mattina è un rapporto che non invio.', 'Comando qui dentro. Fuori, nessuno mi sente.'] },
  { id: 'assunta', name: 'Assunta', icon: '👩🍳', wants: 'coffee', prefPhases: [0], affReward: 2, rarity: 'regular', tagline: 'Mamma del quartiere', quips: ['Mangia qualcosa, che sei pelle e ossa.', 'Io so tutto di tutti. Non vi piace, ma funziona.', 'Un caffè con Assunta vale due caffè normali.'], story: ['Ho partorito il primo figlio qui, al bancone.', 'Ogni cliente è un figlio che non ho mai avuto.', 'Il segreto è far credere a tutti che vada tutto bene.'] },
];

export const MACHINES = [
  { id: 'piccola', name: 'Piccola Fortuna', cost: 3,  desc: 'Premi sempre, anche se piccolo' },
  { id: 'media',   name: 'Fortuna Media',   cost: 10, desc: 'Più probabilità di premi rari' },
  { id: 'grande',  name: 'Grande Fortuna',  cost: 20, desc: 'Il jackpot del bar — premi fantastici' },
];

export const SYMBOLS = ['⭐', '💎', '🍀', '🌟'];

export const COLLECTIBLES = [
  { id: 'tazzina-blu',      name: 'Tazzina Blu',       icon: '☕', rarity: 'common' },
  { id: 'portacenere-oro',  name: "Portacenere d'Oro", icon: '🪙', rarity: 'uncommon' },
  { id: 'bomba-fantasma',   name: 'Jäger Fantasma',    icon: '👻', rarity: 'uncommon' },
  { id: 'sigaro-regalo',    name: 'Sigaro Regalo',     icon: '🎁', rarity: 'uncommon' },
  { id: 'gatto-luca',       name: 'Gatto di Luca',     icon: '🐱', rarity: 'rare' },
  { id: 'stella-gratta',    name: 'Stella Gratta',     icon: '⭐', rarity: 'rare' },
  { id: 'figurina-macchina',name: 'Figurina Macchina', icon: '🎰', rarity: 'rare' },
  { id: 'portachiavi-bar',  name: 'Portachiavi Bar Blu', icon: '🔑', rarity: 'legendary' },
];

export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export const UNLOCKS = [
  { id: 'display-polished', name: 'Vetrina Lucidata',  desc: 'Vetrina più bella, +10% oggetti rari', requires: 3 },
  { id: 'night-menu',       name: 'Menù Notturno',      desc: 'JägerBomb disponibile anche di mattina', requires: 5 },
  { id: 'sign-lit',         name: 'Insegna Illuminata', desc: 'Clienti speciali appaiono più spesso', requires: 8 },
  { id: 'angolo-ricordi',   name: 'Angolo dei Ricordi', desc: 'I ricordi prendono vita in vetrina', requires: 5 },
];

export const MILESTONES = [
  { id: 'first-service', name: 'Primo Servizio Perfetto', desc: 'Servi il primo cliente correttamente', check: s => s.perfectServicesTotal >= 1 },
  { id: 'ten-happy',     name: 'Dieci Clienti Contenti',  desc: 'Servi 10 clienti correttamente in totale', check: s => s.perfectServicesTotal >= 10 },
  { id: 'inaugural',     name: 'Serata Inaugurale',       desc: 'Completa 3 turni al bar', check: s => s.currentShift >= 3 },
  { id: 'storie-banco',  name: 'Storie del Bancone',      desc: 'Raccogli 10 ricordi', check: s => (s.memories || []).length >= 10 },
];

export const EVENTS = [
  { id: 'cat',   icon: '🐱', text: 'Un gatto si è seduto sulla cassa. Sembra in attesa del suo caffè.' },
  { id: 'offer', icon: '🤝', text: 'Luca ti offre un caffè: "Aiuta il prossimo, dai."' },
  { id: 'snow',  icon: '❄',  text: 'Sta nevicando fuori! Il calore del bar è ancora più accogliente.' },
  { id: 'party', icon: '🎊', text: 'Festa di quartiere oggi! I clienti sono di buon umore.' },
  { id: 'toast', icon: '🍻', text: 'Una tavolata scoppia in un brindisi che non finisce più.' },
  { id: 'sleepy', icon: '😴', text: 'Un avventore si addormenta sul bancone. Sogna a occhi chiusi.' },
  { id: 'mic',   icon: '🎶', text: 'La Voce prende il microfono e il bar ammutolisce.' },
  { id: 'cards', icon: '🃏', text: 'Parte una partita a carte truccata. Rocco vince sempre... strano.' },
  { id: 'lottery', icon: '🎟', text: '"Pago con questo biglietto? Vale come i gettoni, fidati."' },
  { id: 'blackout', icon: '💡', text: 'Salta la corrente. Il bar si accende a candele e nessuno se ne va.' },
  { id: 'dog',   icon: '🐕', text: 'Un cane randagio entra, si accuccia alla stufa e resta.' },
  { id: 'suit',  icon: '👔', text: 'Un uomo in giacca chiede di Luca: ha una proposta. Luca non scende.' },
  { id: 'blues', icon: '📻', text: 'Un vecchio jukebox si accende da solo su un blues lento.' },
];

export const AMBIENT_MESSAGES = [
  "L'odore del caffè appena macinato riempie il locale.",
  'La tenda della saletta si muove leggermente...',
  'Un ronzio distante di insetti nella sera estiva.',
  'La macchinetta emette un ronzio sordo.',
  'Luca pulisce il bancone con cura.',
  "La musica morbida dell'auto fuori si ferma.",
  'Fuori il vento muove le luci della città.',
  'Il termos di Luca emette vapore.',
  'Il Professore legge ad alta voce un tovagliolo scritto.',
  'Sor Ugo scalda le mani vicino alla stufa.',
  'La Contessa conta gettoni che non ha.',
  'Qualcuno ride forte, da solo, al tavolo in fondo.',
  "L'odore della pioggia entra con un cliente.",
  'Vera Veleno canticchia una canzone che nessuno ricorda.',
  'Gigi guarda fuori: forse aspetta qualcuno che non arriva.',
  "Rocco prova una barzelletta col bicchiere in mano.",
];

// ---- State Factory ----
export function createInitialState() {
  const affinity = {};
  CUSTOMERS.forEach(c => { affinity[c.id] = 0; });
  return {
    version: SAVE_VERSION,
    started: false,
    tutorialDone: false,
    tokens: 0,
    xp: 0,
    level: 1,
    currentShift: 1,
    phaseIndex: 0,
    shiftServed: 0,
    shiftPerfect: 0,
    shiftTokensEarned: 0,
    inventory: [],
    displayCase: [null, null, null, null],
    hasScratchCard: false,
    affinity,
    customersServedTotal: 0,
    perfectServicesTotal: 0,
    scratchCardsUsed: 0,
    machineSpins: 0,
    collectiblesFound: [],
    milestones: [],
    unlocks: [],
    memories: [],
    settings: { music: true, sfx: true, volume: 0.5, reducedMotion: false },
    lastAccess: Date.now(),
    audioReady: false,
    currentCustomer: null,
  };
}

// ---- Helpers ----
function xpForLevel(lvl) { return lvl * XP_PER_LEVEL; }

export function addXP(state, amount) {
  state.xp += amount;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
  }
  return state;
}

export function addTokens(state, amount) {
  state.tokens += amount;
  state.shiftTokensEarned += amount;
  return state;
}

// ---- Customer Selection ----
export function pickCustomer(state) {
  const weights = { regular: 6, special: 2, wanderer: 1 };
  let base = CUSTOMERS.filter(c => c.prefPhases.includes(state.phaseIndex));
  if (state.unlocks.includes('night-menu')) {
    base = base.concat(CUSTOMERS.filter(c => c.wants === 'jagerbomb'));
  }
  if (state.unlocks.includes('sign-lit')) {
    base = base.concat(CUSTOMERS.filter(c => c.affReward >= 2));
  }
  if (state.milestones.includes('ten-happy')) {
    base = base.concat(CUSTOMERS.filter(c => c.rarity === 'wanderer'));
  }
  let pool = [];
  base.forEach(c => {
    const w = weights[c.rarity] || weights.regular;
    for (let i = 0; i < w; i++) { pool.push(c); }
  });
  if (pool.length === 0) pool = [...CUSTOMERS];
  const c = pool[Math.floor(Math.random() * pool.length)];
  return c;
}

// ---- Core Actions ----

export function startNewShift(state) {
  state.started = true;
  state.phaseIndex = 0;
  state.shiftServed = 0;
  state.shiftPerfect = 0;
  state.shiftTokensEarned = 0;
  state.hasScratchCard = true;
  state.currentCustomer = null;
  return state;
}

export function generateCustomer(state) {
  const c = pickCustomer(state);
  state.currentCustomer = { ...c, drunk: !!c.drunkProne && Math.random() < 0.5 };
  return state;
}

export function serveCustomer(state, itemId) {
  const c = state.currentCustomer;
  if (!c) return { success: false, error: 'Nessun cliente' };

  const isSobering = c.drunk && itemId === 'coffee' && c.wants !== 'coffee';

  if (itemId === c.wants || isSobering) {
    const reward = 3 + (c.affReward || 1) + (isSobering ? 2 : 0);
    addTokens(state, reward);
    addXP(state, c.affReward || 1);
    state.affinity[c.id] = Math.min(5, (state.affinity[c.id] || 0) + (isSobering ? 2 : 1));
    state.shiftServed++;
    state.shiftPerfect++;
    state.customersServedTotal++;
    state.perfectServicesTotal++;

    // Collectible drop
    const polish = state.unlocks.includes('display-polished');
    const colId = rollCollectible(polish);
    if (colId && !state.inventory.includes(colId)) {
      state.inventory.push(colId);
      state.collectiblesFound.push(colId);
    }

    // Advance phase every 2 customers
    state.currentCustomer = null;
    if (state.shiftServed % 2 === 0) {
      state.phaseIndex = (state.phaseIndex + 1) % PHASES.length;
    }
    const next = pickCustomer(state);
    state.currentCustomer = { ...next, drunk: !!next.drunkProne && Math.random() < 0.5 };

    return { success: true, reward, collectible: colId, newCustomer: state.currentCustomer, level: state.level, sobering: isSobering };
  }
  return { success: false, want: c.wants, item: itemId };
}

function rollCollectible(polishBoost) {
  const weights = polishBoost ? [30, 25, 20, 5] : [40, 30, 15, 1];
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let rarityIdx = 0;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { rarityIdx = i; break; }
  }
  const filtered = COLLECTIBLES.filter(c => RARITY_ORDER[c.rarity] === rarityIdx);
  if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)].id;
  return COLLECTIBLES[0].id;
}

// ---- Fortune Machines ----
export function spinMachine(state, machineIndex) {
  const m = MACHINES[machineIndex];
  if (!m) return { error: 'Macchinetta non trovata' };
  if (state.tokens < m.cost) return { error: 'Gettoni insufficienti' };

  state.tokens -= m.cost;
  state.machineSpins++;

  const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const symbols = [r1, r2, r3];
  const prize = calculatePrize(symbols, machineIndex);

  let tokens = prize.tokens;
  if (tokens <= 0) tokens = 3; // consolation
  addTokens(state, tokens);

  let collectible = null;
  if (prize.collectible && !state.inventory.includes(prize.collectible)) {
    state.inventory.push(prize.collectible);
    state.collectiblesFound.push(prize.collectible);
    collectible = prize.collectible;
  }

  return { symbols, prize, tokens, collectible, machineIndex };
}

function calculatePrize(symbols, machineIndex) {
  const counts = {};
  symbols.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  const tripleDiamond = counts['💎'] === 3;
  const tripleStar = counts['⭐'] === 3;
  const hasSuper = !!counts['🌟'];
  const hasDiamond = !!counts['💎'];
  const hasClover = !!counts['🍀'];

  if (tripleDiamond) return { tokens: 30 + machineIndex * 15, collectible: pickRandomCollectible(['rare', 'legendary']) };
  if (hasSuper && hasDiamond) return { tokens: 15, collectible: pickRandomCollectible(['rare']) };
  if (tripleStar) return { tokens: 12, collectible: pickRandomCollectible(['uncommon', 'rare', 'legendary']) };
  if (hasDiamond) return { tokens: 8, collectible: pickRandomCollectible(['uncommon']) };
  if (hasClover) return { tokens: 5, collectible: pickRandomCollectible(['common', 'uncommon']) };
  return { tokens: 0, collectible: null };
}

function pickRandomCollectible(rarities) {
  const pool = COLLECTIBLES.filter(c => rarities.includes(c.rarity));
  if (pool.length === 0) return COLLECTIBLES[0].id;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// ---- Scratch Cards ----
export function buyScratchCard(state) {
  if (state.tokens < 3) return { error: 'Gettoni insufficienti' };
  state.tokens -= 3;
  state.hasScratchCard = true;
  state.scratchCardsUsed++;
  return { success: true };
}

export function scratchReveal(state) {
  if (!state.hasScratchCard) return { error: 'Nessuna carta' };
  state.hasScratchCard = false;
  const polish = state.unlocks.includes('display-polished');
  const collectible = rollCollectible(polish);
  let tokens = 2;
  if (collectible && !state.inventory.includes(collectible)) {
    state.inventory.push(collectible);
    state.collectiblesFound.push(collectible);
    tokens = 5;
  }
  addTokens(state, tokens);
  return { collectible, tokens };
}

// ---- Display Case ----
export function placeInDisplay(state, slotIndex, collectibleId) {
  if (slotIndex < 0 || slotIndex > 3) return { error: 'Slot non valido' };
  if (state.displayCase[slotIndex] !== null) return { error: 'Slot occupato' };
  if (!state.inventory.includes(collectibleId)) return { error: "Oggetto non nell'inventario" };
  state.displayCase[slotIndex] = collectibleId;
  return { success: true };
}

export function removeFromDisplay(state, slotIndex) {
  if (slotIndex < 0 || slotIndex > 3) return { error: 'Slot non valido' };
  const item = state.displayCase[slotIndex];
  state.displayCase[slotIndex] = null;
  return { success: true, item };
}

// ---- Shift End ----
export function endShift(state) {
  const summary = { served: state.shiftServed, perfect: state.shiftPerfect, tokens: state.shiftTokensEarned };
  state.currentShift++;
  state.shiftServed = 0;
  state.shiftPerfect = 0;
  state.shiftTokensEarned = 0;
  state.currentCustomer = null;
  return { success: true, summary };
}

// ---- Milestones / Unlocks ----
export function checkMilestones(state) {
  const newMilestones = [];
  MILESTONES.forEach(m => {
    if (!state.milestones.includes(m.id) && m.check(state)) {
      state.milestones.push(m.id);
      newMilestones.push(m);
    }
  });
  return { state, newMilestones };
}

export function checkMemories(state) {
  const newMemories = [];
  if (!state.memories) state.memories = [];
  CUSTOMERS.forEach(c => {
    if (!c.story || c.story.length === 0) return;
    const currentAff = state.affinity[c.id] || 0;
    c.story.forEach((fragment, idx) => {
      const threshold = MEMORY_THRESHOLDS[idx];
      const memId = c.id + ':' + idx;
      if (currentAff >= threshold && !state.memories.includes(memId)) {
        state.memories.push(memId);
        newMemories.push({ id: memId, customerId: c.id, name: c.name, icon: c.icon, text: fragment, index: idx });
      }
    });
  });
  return { state, newMemories };
}

export function checkUnlocks(state) {
  const newUnlocks = [];
  UNLOCKS.forEach(u => {
    if (!state.unlocks.includes(u.id) && state.level >= u.requires) {
      state.unlocks.push(u.id);
      newUnlocks.push(u);
    }
  });
  return { state, newUnlocks };
}

// ---- Ambient ----
export function getAmbientMessage() {
  return AMBIENT_MESSAGES[Math.floor(Math.random() * AMBIENT_MESSAGES.length)];
}

export function getEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

let _eventTimer = null;
export function startEventLoop(state, callback) {
  if (_eventTimer) clearInterval(_eventTimer);
  _eventTimer = setInterval(() => {
    if (Math.random() < 0.15 && callback) callback(getEvent());
  }, 45000);
}
