// Migration harness — ogni versione storica del salvataggio deve:
//  1) arrivare a SAVE_VERSION corrente
//  2) NON perdere progressi (invariante "non perde mai progressi")
// Esecuzione: node tests/migration.test.mjs

import { validateAndMigrate, defaultState, isRoomUnlocked } from '../src/model/state.js';
import { SAVE_VERSION, MAX, CATALOG_COST } from '../src/config.js';
import { RARE_BOOKS, ROOMS, CONTENT_VERSION } from '../src/model/data.js';
import { validateContent, getContent } from '../src/model/content.js';
import { t, STR } from '../src/i18n.js';

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', msg); }
};

// ---- Fixture storiche (salvataggi reali di ogni epoca) ----

const FIXTURE_V1 = {
  version: 1,
  resources: { luce: 7, calma: 4, inchiostro: 6 },
  lanterns: [true, true, false, true],
  booksOnTable: 2,
  booksShelved: 12,
  teasBrewed: 5,
  readersServed: 3,
  readerActive: false,
  raresFound: ['almanacco', 'giardino'],
  raresCataloged: ['almanacco'],
  unlocks: { curiosityShelf: true, skylight: false, wellRoom: false },
  milestones: { firstLight: true, firstGuest: false, dawn: false },
  settings: { music: true, sfx: false, lang: 'en', reducedMotion: true },
  tutorialStep: 4,
  tutorialDone: true,
  catArea: 'shelves',
  playtime: 3600,
};

const FIXTURE_V2 = {
  ...FIXTURE_V1,
  version: 2,
  eventDue: Date.now() + 30000,
  bookDue: Date.now() + 20000,
  readerDue: Date.now() + 15000,
  stats: { lanternsLit: 3, booksShelved: 12, teasBrewed: 5, readersServed: 3, eventsSeen: 4 },
  event: { type: 'rain', expires: Date.now() + 10000, bonus: false },
};

const FIXTURE_V3 = {
  ...FIXTURE_V2,
  version: 3,
  letters: [
    { id: 1, text: 'Prima lettera', ts: Date.now() - 50000 },
    { id: 2, text: 'Seconda lettera', ts: Date.now() - 10000 },
  ],
  settings: {
    music: true, sfx: false, lang: 'en', reducedMotion: true,
    haptics: false, wakeLock: true, parallax: true,
  },
  lastSave: Date.now() - 5000,
  lastTick: Date.now() - 1000,
  lastAmbient: Date.now() - 20000,
  ambientIndex: 3,
};

const FIXTURE_V4 = {
  ...FIXTURE_V3,
  version: 4,
  room: 'attic',
  activityDue: { sortArchive: 0, tendPlants: 0 },
  stats: {
    ...FIXTURE_V3.stats,
    archiveSorted: 9,
    plantsTended: 2,
  },
  settings: {
    ...FIXTURE_V3.settings,
    archiveIdb: true,
  },
};

const FIXTURE_V5 = {
  ...FIXTURE_V4,
  version: 5,
  readerActive: true,
  readerProfile: {
    seed: 42, name: 'Mara', mood: 'curious',
    preferredBook: 'almanacco', choice: 'askTitle', reply: '«…»',
  },
  catWeights: { hearth: 1.6, lanterns: 0.8, tableArea: 1, kettle: 1, shelves: 1, archive: 1, greenhouse: 1, readerZone: 1 },
  weather: 'rain',
  weatherChangedAt: Date.now() - 5000,
  almanac: { full: 2, new: 0, phases: ['full', 'waxingCrescent'], lastPhaseId: 'full', lastPhaseDay: 1, achievements: { firstFull: true } },
  daily: { key: '2026-09-23', seed: 123, letterApplied: true },
};

const FIXTURE_V6 = {
  ...FIXTURE_V5,
  version: 6,
  peerName: 'Guardian',
  activeMods: ['demo-pack'],
  settings: {
    ...FIXTURE_V5.settings,
    highContrast: true,
    voiceCommands: false,
  },
};

// ---- 1. Ogni fixture migra a SAVE_VERSION ----
const m1 = validateAndMigrate(structuredClone(FIXTURE_V1));
const m2 = validateAndMigrate(structuredClone(FIXTURE_V2));
const m3 = validateAndMigrate(structuredClone(FIXTURE_V3));
const m4 = validateAndMigrate(structuredClone(FIXTURE_V4));
const m5 = validateAndMigrate(structuredClone(FIXTURE_V5));
const m6 = validateAndMigrate(structuredClone(FIXTURE_V6));

ok(m1.version === SAVE_VERSION, `v1 → v${SAVE_VERSION}`);
ok(m2.version === SAVE_VERSION, `v2 → v${SAVE_VERSION}`);
ok(m3.version === SAVE_VERSION, `v3 → v${SAVE_VERSION}`);
ok(m4.version === SAVE_VERSION, `v4 → v${SAVE_VERSION}`);
ok(m5.version === SAVE_VERSION, `v5 → v${SAVE_VERSION}`);
ok(m6.version === SAVE_VERSION, `v6 resta v${SAVE_VERSION}`);
ok(SAVE_VERSION === 6, 'SAVE_VERSION = 6 (ecosistema)');

// ---- 2. Invariante: non perde mai progressi ----
function assertProgressPreserved(label, original, migrated) {
  // risorse (clamp eventuali outlier, ma valori validi restano)
  const expLuce = Math.min(original.resources.luce, MAX.luce);
  const expCalma = Math.min(Math.max(original.resources.calma, 0), MAX.calma);
  const expInk = Math.min(original.resources.inchiostro, MAX.inchiostro);
  ok(migrated.resources.luce === expLuce, `${label}: luce preservata (${migrated.resources.luce}=${expLuce})`);
  ok(migrated.resources.calma === expCalma, `${label}: calma preservata`);
  ok(migrated.resources.inchiostro === expInk, `${label}: inchiostro preservato`);

  ok(migrated.booksShelved === original.booksShelved, `${label}: booksShelved`);
  ok(migrated.teasBrewed === original.teasBrewed, `${label}: teasBrewed`);
  ok(migrated.readersServed === original.readersServed, `${label}: readersServed`);
  ok(migrated.playtime === original.playtime, `${label}: playtime`);

  // collezione
  const found = original.raresFound || [];
  const cat = original.raresCataloged || [];
  ok(found.every((id) => migrated.raresFound.includes(id)), `${label}: raresFound ⊆ migrato`);
  ok(cat.every((id) => migrated.raresCataloged.includes(id)), `${label}: raresCataloged ⊆ migrato`);

  // milestone/sblocchi raggiunti restano raggiunti
  Object.entries(original.milestones || {}).forEach(([k, v]) => {
    if (v) ok(migrated.milestones[k] === true, `${label}: milestone ${k} mantenuta`);
  });
  Object.entries(original.unlocks || {}).forEach(([k, v]) => {
    if (v) ok(migrated.unlocks[k] === true, `${label}: unlock ${k} mantenuto`);
  });

  // lingua e preferenze
  ok(migrated.settings.lang === original.settings.lang, `${label}: lingua`);
  if (original.settings.sfx === false) ok(migrated.settings.sfx === false, `${label}: sfx off mantenuto`);
  if (original.settings.music === false) ok(migrated.settings.music === false, `${label}: music off mantenuto`);
  if (typeof original.settings.reducedMotion === 'boolean') {
    ok(migrated.settings.reducedMotion === original.settings.reducedMotion, `${label}: reducedMotion`);
  }

  // timer numerici presenti
  ok(Number.isFinite(migrated.eventDue), `${label}: eventDue presente`);
  ok(Number.isFinite(migrated.bookDue), `${label}: bookDue presente`);
  ok(Number.isFinite(migrated.readerDue), `${label}: readerDue presente`);

  // lettere
  if (Array.isArray(original.letters)) {
    ok(migrated.letters.length === original.letters.length, `${label}: lettere conservate (${migrated.letters.length})`);
    original.letters.forEach((l, i) => {
      ok(migrated.letters[i]?.text === l.text, `${label}: lettera ${i} testo`);
    });
  }
}

assertProgressPreserved('v1', FIXTURE_V1, m1);
assertProgressPreserved('v2', FIXTURE_V2, m2);
assertProgressPreserved('v3', FIXTURE_V3, m3);
assertProgressPreserved('v4', FIXTURE_V4, m4);
assertProgressPreserved('v5', FIXTURE_V5, m5);
assertProgressPreserved('v6', FIXTURE_V6, m6);

// ---- 3. Campi nuovi compaiono dopo la migrazione ----
ok(typeof m1.eventDue === 'number', 'v1+ eventDue');
ok(Array.isArray(m1.letters), 'v1+ letters');
ok(typeof m1.settings.haptics === 'boolean', 'v1+ haptics');
ok(typeof m1.settings.archiveIdb === 'boolean', 'v1+ archiveIdb');
ok(m1.room === 'hall', 'v1+ room default hall');
ok(typeof m1.activityDue.sortArchive === 'number', 'v1+ activityDue.sortArchive');
ok(m1.stats.archiveSorted === 0, 'v1+ stats.archiveSorted');
ok(m3.room === 'hall', 'v3 → room hall (prima delle stanze)');
ok(m4.room === 'attic', 'v4 conserva room attic');
ok(m4.stats.archiveSorted === 9, 'v4 conserva archiveSorted');
ok(m4.settings.archiveIdb === true, 'v4 conserva archiveIdb');
// Fase 2: campi compaiono su migrazioni vecchie
ok(m1.catWeights && typeof m1.catWeights.hearth === 'number', 'v1+ catWeights');
ok(m1.weather === 'clear' || m1.weather === 'rain', 'v1+ weather');
ok(m1.almanac && Array.isArray(m1.almanac.phases), 'v1+ almanac');
ok(m1.daily && m1.daily.letterApplied === false, 'v1+ daily');
ok(m1.readerProfile === null, 'v1+ readerProfile null se nessun lettore attivo');
// Fase 2: fixture v5 conserva tutto
ok(m5.readerProfile?.name === 'Mara', 'v5 conserva readerProfile.name');
ok(m5.readerProfile?.choice === 'askTitle', 'v5 conserva dialogo');
ok(m5.weather === 'rain', 'v5 conserva weather');
ok(m5.almanac.full === 2, 'v5 conserva almanac.full');
ok(m5.almanac.achievements.firstFull === true, 'v5 conserva achievements');
ok(m5.catWeights.hearth > 1, 'v5 conserva catWeights');
ok(m5.daily.key === '2026-09-23', 'v5 conserva daily.key');
ok(m5.daily.letterApplied === true, 'v5 conserva daily.letterApplied');
// Fase 3: campi ecosistema
ok(m1.settings.highContrast === false, 'v1+ highContrast default off');
ok(m1.settings.voiceCommands === false, 'v1+ voiceCommands default off');
ok(m1.peerName === '', 'v1+ peerName default');
ok(Array.isArray(m1.activeMods), 'v1+ activeMods array');
ok(m6.peerName === 'Guardian', 'v6 conserva peerName');
ok(m6.settings.highContrast === true, 'v6 conserva highContrast');
ok(m6.activeMods.includes('demo-pack'), 'v6 conserva activeMods');

// ---- 4. Stanza bloccata → torna in hall ----
const lockedRoom = validateAndMigrate({
  ...structuredClone(FIXTURE_V1),
  version: SAVE_VERSION,
  room: 'winterGarden',
  unlocks: { curiosityShelf: false, skylight: false, wellRoom: false },
});
// curiosityShelf false ma firstLight true → riallineato a true da validate
// winterGarden richiede curiosityShelf → sbloccato dopo riallineamento?
// In fixture v1 firstLight=true → curiosityShelf=true → winterGarden unlocked
ok(lockedRoom.unlocks.curiosityShelf === true, 'riallineo curiosityShelf da firstLight');
ok(isRoomUnlocked(lockedRoom, 'winterGarden'), 'winterGarden sbloccata con curiosityShelf');

const trulyLocked = validateAndMigrate({
  version: SAVE_VERSION,
  resources: { luce: 3, calma: 5, inchiostro: 0 },
  room: 'attic',
  readersServed: 0,
  milestones: { firstLight: false, firstGuest: false, dawn: false },
  unlocks: { curiosityShelf: false, skylight: false, wellRoom: false },
});
ok(trulyLocked.room === 'hall', 'stanza non sbloccata → fallback hall');

// ---- 5. content.json: validità, parità e rooms ----
const content = getContent();
ok(validateContent(content) !== null, 'content.json validato');
ok(typeof CONTENT_VERSION === 'number' && CONTENT_VERSION >= 1, 'content versionato');
ok(content.version >= 1, 'content.version >= 1');

ok(content.messages.it.length === content.messages.en.length, 'messages IT/EN parity');
ok(content.rareBooks.length === 8, '8 rare books in content');
ok(new Set(content.rareBooks.map((b) => b.id)).size === 8, 'id rari univoci in content');
ok(content.rareBooks.every((b) => b.it?.title && b.en?.title && b.cover && b.glyph), 'rari bilingui in content');

ok(Array.isArray(content.rooms) && content.rooms.length >= 3, 'almeno 3 stanze in content');
ok(content.rooms[0].id === 'hall', 'prima stanza = hall');
ok(content.rooms.some((r) => r.id === 'attic'), 'soppalco in content');
ok(content.rooms.some((r) => r.id === 'winterGarden'), 'giardino in content');
ok(content.rooms.every((r) => r.name.it && r.name.en && r.icon), 'stanze bilingui + icona');

ok(content.milestones.firstLight.it.title && content.milestones.firstLight.en.title, 'milestone bilingui');
ok(content.unlocks.wellRoom.it.name && content.unlocks.wellRoom.en.name, 'unlocks bilingui');
ok(Object.keys(content.milestones).length === 3, '3 milestone in content');

// attività delle stanze laterali presenti
const sideRooms = content.rooms.filter((r) => r.id !== 'hall');
sideRooms.forEach((r) => {
  (r.activities || []).forEach((act) => {
    ok(Boolean(content.activities?.[act]), `activity ${act} definita in content per ${r.id}`);
    const def = content.activities[act];
    ok(Boolean(def.it?.label && def.en?.label), `activity ${act} bilingue`);
    ok(def.cooldownMs > 0, `activity ${act} ha cooldown`);
  });
});

// ROOMS esposti dal model corrispondono al content
ok(ROOMS.length === content.rooms.length, 'ROOMS dal model = content.rooms');
ok(RARE_BOOKS.length === 8, 'RARE_BOOKS dal model = 8');

// ---- 6. i18n: stesse chiavi IT/EN (invariante esistente) ----
ok(JSON.stringify(Object.keys(STR.it).sort()) === JSON.stringify(Object.keys(STR.en).sort()), 'i18n keys parity');
// nuove chiavi Fase 1 presenti in entrambe le linghe
['rooms', 'roomAttic', 'sortArchive', 'editSave', 'archiveIdb'].forEach((k) => {
  ok(typeof STR.it[k] === 'string' && typeof STR.en[k] === 'string', `i18n ${k} in IT e EN`);
});
// nuove chiavi Fase 2 presenti in entrambe le linghe
['readerDialogue', 'almanac', 'weatherRain', 'dailyLetter', 'moonAchievement'].forEach((k) => {
  ok(typeof STR.it[k] === 'string' && typeof STR.en[k] === 'string', `i18n ${k} in IT e EN`);
});
// nuove chiavi Fase 3 presenti in entrambe le linghe
['sharePostcard', 'mods', 'multiplayer', 'highContrast', 'voiceCommands', 'roomDesc'].forEach((k) => {
  ok(typeof STR.it[k] === 'string' && typeof STR.en[k] === 'string', `i18n ${k} in IT e EN`);
});

// content Fase 2: lettori, almanacco, daily
ok(content.readers?.dialogue?.choices?.length >= 3, 'dialoghi lettori >= 3');
ok(content.readers?.names?.it?.length > 0, 'nomi lettori IT');
ok(Object.keys(content.moonAlmanac?.achievements || {}).length >= 4, '>= 4 achievement luna');
ok(content.daily?.letters?.it?.length === content.daily?.letters?.en?.length, 'daily letters IT/EN parity');
ok(content.daily?.letters?.it?.length > 0, 'daily letters presenti');

// ---- 7. defaultState coerente con SAVE_VERSION ----
const def = defaultState();
ok(def.version === SAVE_VERSION, 'defaultState.version');
ok(def.room === 'hall', 'defaultState.room = hall');
ok(def.settings.archiveIdb === false, 'defaultState.archiveIdb off');
ok(def.stats.archiveSorted === 0 && def.stats.plantsTended === 0, 'defaultState stats stanze');
ok(isRoomUnlocked(def, 'hall'), 'hall sempre sbloccata');
ok(!isRoomUnlocked(def, 'attic'), 'attic non sbloccata di default');
ok(def.weather === 'clear', 'defaultState.weather = clear');
ok(def.readerProfile === null, 'defaultState.readerProfile null');
ok(typeof def.catWeights.hearth === 'number', 'defaultState.catWeights');
ok(def.almanac.full === 0 && Array.isArray(def.almanac.phases), 'defaultState.almanac');
ok(def.daily.letterApplied === false, 'defaultState.daily');
ok(def.settings.highContrast === false, 'defaultState.highContrast off');
ok(def.settings.voiceCommands === false, 'defaultState.voiceCommands off');
ok(def.peerName === '', 'defaultState.peerName vuoto');
ok(Array.isArray(def.activeMods), 'defaultState.activeMods array');
ok(!isRoomUnlocked(def, 'winterGarden'), 'winterGarden non sbloccata di default');

// ---- 8. Corruzione → default senza crash ----
ok(validateAndMigrate(null).version === SAVE_VERSION, 'null → default');
ok(validateAndMigrate({ version: 'x' }).version === SAVE_VERSION, 'versione invalida → default');
ok(validateAndMigrate({ version: 1, resources: 'nope' }).resources.luce === 3, 'resources corrotte → default');
ok(validateAndMigrate({ version: SAVE_VERSION, resources: { luce: 99, calma: -3, inchiostro: 'z' } }).resources.luce === MAX.luce, 'clamp risorse');

// t() funziona sulle nuove chiavi
ok(t('it', 'rooms') === 'Stanze', 't() rooms it');
ok(t('en', 'rooms') === 'Rooms', 't() rooms en');

// CATALOG_COST usato in needInk resta coerente
ok(t('it', 'needInk').includes(String(CATALOG_COST)), 'needInk interpolato');

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
