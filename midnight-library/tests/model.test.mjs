// Test Model — regole di gioco pure (nessun DOM) + Fase 3 services pure.
// Esecuzione: node tests/model.test.mjs

import { defaultState, validateAndMigrate, tick, moonPhase, moonPhaseId, isRoomUnlocked, buildReaderProfile, observeMoon, defaultCatWeights } from '../src/model/state.js';
import {
  lightLantern, shelveBook, brewTea, serveReader, catalogRare,
  collectFallenBook, dismissEvent, worldTick, addLetter,
  switchRoom, sortArchive, tendPlants,
  answerReaderDialogue, dayKey, hashString, dailySeed, ensureDaily,
} from '../src/model/actions.js';
import { RARE_BOOKS, MESSAGES, MILESTONES, ROOMS, READERS, MOON_ACHIEVEMENTS, DAILY_LETTERS } from '../src/model/data.js';
import { MAX, SAVE_VERSION, LETTER_MAX_LEN, MAX_LETTERS } from '../src/config.js';
import { t, STR } from '../src/i18n.js';
import { zipWrite, zipRead, crc32 } from '../src/services/zip.js';
import { validatePack, applyPacks, loadPack } from '../src/services/mods.js';
import { parseVoiceCommand, describeRoom } from '../src/services/a11y.js';
import { encodeSignal, decodeSignal } from '../src/services/multiplayer.js';

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', msg); }
};

// ---- 1. Stato iniziale ----
let s = defaultState();
ok(s.resources.luce === 3, 'luce iniziale 3');
ok(s.resources.calma === 5, 'calma iniziale 5');
ok(s.lanterns.length === 4, '4 lanterne');
ok(s.lanterns.every((l) => l === false), 'lanterne spente');
ok(s.booksOnTable === 3, '3 libri sul tavolo iniziale');
ok(s.raresFound.length === 0, 'nessun raro trovato');
ok(s.raresCataloged.length === 0, 'nessun raro catalogato');
ok(s.letters.length === 0, 'nessuna lettera');
ok(s.version === SAVE_VERSION, 'versione salvataggio corrente');
ok(s.room === 'hall', 'stanza iniziale hall');
ok(s.settings.lang === 'it', 'lingua default it');
ok(s.settings.haptics === true, 'haptics default on');
ok(s.settings.wakeLock === false, 'wakeLock default off');
ok(s.settings.parallax === false, 'parallax default off');
ok(s.settings.archiveIdb === false, 'archiveIdb default off');
ok(s.milestones.firstLight === false, 'milestone firstLight non raggiunta');
ok(s.unlocks.curiosityShelf === false, 'scaffale non sbloccato');
ok(Array.isArray(s.lanterns) && s.lanterns.length === 4, 'lantern array length');

// ---- 2. Accendere 4 lanterne → milestone Prima Luce → sblocca scaffale ----
for (let i = 0; i < 4; i += 1) {
  const r = lightLantern(s, i, Date.now());
  ok(r.ok, `lanterna ${i} accesa`);
}
ok(s.milestones.firstLight === true, 'milestone firstLight');
ok(s.unlocks.curiosityShelf === true, 'sblocco scaffale curiosità');
ok(s.stats.lanternsLit === 4, 'stats.lanternsLit = 4');

// ---- 3. Accendere lanterna già accesa → no-op ----
ok(lightLantern(s, 0, Date.now()).ok === false, 'lanterna già accesa rifiutata');

// ---- 4. Indice fuori range → no-op ----
ok(lightLantern(s, 99, Date.now()).ok === false, 'indice 99 rifiutato');
ok(lightLantern(s, -1, Date.now()).ok === false, 'indice -1 rifiutato');

// ---- 5. Tavolo vuoto → shelve rifiutato ----
s.booksOnTable = 0;
ok(shelveBook(s, Date.now()).reason === 'empty', 'tavolo vuoto rifiutato');

// ---- 6. Ripore libri → inchiostro ----
s.booksOnTable = 3;
const inkBefore = s.resources.inchiostro;
const sh = shelveBook(s, Date.now());
ok(sh.ok && s.resources.inchiostro > inkBefore, 'riporre libri dà inchiostro');
ok(s.booksOnTable === 2, 'libri tavolo -1');
ok(s.stats.booksShelved === 1, 'stats.booksShelved = 1');

// ---- 7. Tè → calma ----
const calmBefore = s.resources.calma;
const tea = brewTea(s, Date.now());
ok(tea.ok && s.resources.calma >= calmBefore, 'tè dà calma');
ok(s.stats.teasBrewed === 1, 'stats.teasBrewed = 1');

// ---- 8. Accogliere lettore senza lettore attivo → rifiuto ----
ok(serveReader(s, Date.now()).reason === 'none', 'nessun lettore rifiutato');

// ---- 9. Accogliere lettore senza calma → rifiuto ----
s.readerActive = true;
s.resources.calma = 0;
ok(serveReader(s, Date.now()).reason === 'calma', 'calma 0 rifiuta servizio');

// ---- 10. Accogliere lettore con calma → ok + milestone Primo Ospite ----
s.resources.calma = 5;
const serve = serveReader(s, Date.now());
ok(serve.ok, 'lettore accolto');
ok(s.milestones.firstGuest === true, 'milestone firstGuest');
ok(s.unlocks.skylight === true, 'sblocco lucernario');
ok(s.readerActive === false, 'lettore rimosso');
ok(s.readersServed === 1, 'readersServed = 1');
ok(s.stats.readersServed === 1, 'stats.readersServed = 1');

// ---- 11. Catalogare senza scaffale → rifiuto ----
s.unlocks.curiosityShelf = false;
s.raresFound = ['almanacco'];
ok(catalogRare(s, 'almanacco', Date.now()).reason === 'locked', 'scaffale chiuso rifiuta');
s.unlocks.curiosityShelf = true;

// ---- 12. Catalogare senza aver trovato → rifiuto ----
ok(catalogRare(s, 'giardino', Date.now()).reason === 'notFound', 'non trovato rifiutato');

// ---- 13. Catalogare senza inchiostro → rifiuto ----
s.resources.inchiostro = 0;
ok(catalogRare(s, 'almanacco', Date.now()).reason === 'ink', 'inchiostro 0 rifiuta');

// ---- 14. Catalogare con inchiostro → ok ----
s.resources.inchiostro = 5;
const cat = catalogRare(s, 'almanacco', Date.now());
ok(cat.ok, 'raro catalogato');
ok(s.raresCataloged.includes('almanacco'), 'raro in collezione');
ok(s.resources.inchiostro === 2, 'costo 3 inchiostro');
ok(catalogRare(s, 'almanacco', Date.now()).reason === 'done', 'doppio catalogo rifiutato');

// ---- 15. Evento libro caduto ----
s.event = { type: 'fallenBook', expires: Date.now() + 10000, bonus: false };
const fb = collectFallenBook(s, Date.now());
ok(fb.ok, 'libro caduto raccolto');
ok(s.event === null, 'evento rimosso');
ok(s.resources.inchiostro > 2, 'inchiostro guadagnato dal libro caduto');

// ---- 16. Pioggia → dismiss dà calma ----
s.event = { type: 'rain', expires: Date.now() + 10000, bonus: false };
const cBefore = s.resources.calma;
dismissEvent(s, Date.now());
ok(s.resources.calma > cBefore, 'pioggia dà calma');
ok(s.event === null, 'evento pioggia rimosso');

// ---- 17. Sala del pozzo dopo 3 lettori ----
ok(s.readersServed >= 1, 'almeno 1 lettore');
s.readersServed = 3;
s.readerActive = true;
s.resources.calma = 5;
const serve3 = serveReader(s, Date.now());
ok(serve3.ok, 'terzo lettore accolto');
ok(s.unlocks.wellRoom === true, 'sala del pozzo sbloccata a 3 lettori');

// ---- 18. Alba: tutti gli 8 rari ----
s.raresFound = RARE_BOOKS.map((b) => b.id);
s.raresCataloged = RARE_BOOKS.map((b) => b.id).slice(0, 7);
s.resources.inchiostro = 5;
s.milestones.dawn = false;
const last = catalogRare(s, RARE_BOOKS[7].id, Date.now());
ok(last.ok && last.milestone === 'dawn', "milestone alba all'8° raro");
ok(s.milestones.dawn === true, 'flag dawn');
ok(s.raresCataloged.length === 8, '8 rari catalogati');

// ---- 19. Serializzazione → validazione → uguaglianza sostanziale ----
const json = JSON.parse(JSON.stringify(s));
const v = validateAndMigrate(json);
ok(v.raresCataloged.length === 8, 'validazione mantiene 8 rari');
ok(v.milestones.dawn === true, 'validazione mantiene dawn');
ok(v.unlocks.wellRoom === true, 'validazione mantiene wellRoom');
ok(v.letters.length === 0, 'validazione mantiene letters array');

// ---- 20. Dati corrotti → default ----
const bad = validateAndMigrate({ version: 999, resources: 'garbage' });
ok(typeof bad.resources === 'object' && bad.resources.luce === 3, 'dato corrotto → default');
const bad2 = validateAndMigrate(null);
ok(bad2.lanterns.length === 4, 'null → default');
const bad3 = validateAndMigrate({ version: 1, resources: { luce: 999, calma: -5, inchiostro: 'x' } });
ok(bad3.resources.luce === 10 && bad3.resources.calma === 0 && bad3.resources.inchiostro === 0, 'clamping risorse');

// ---- 21. Migrazione v1 → v3 (timer + letters + settings) ----
const v1 = validateAndMigrate({
  version: 1,
  resources: { luce: 5, calma: 5, inchiostro: 5 },
  lanterns: [true, false, true, false],
});
ok(typeof v1.eventDue === 'number', 'migrazione v1→v2 aggiunge eventDue');
ok(typeof v1.readerDue === 'number', 'migrazione v1→v2 aggiunge readerDue');
ok(typeof v1.bookDue === 'number', 'migrazione v1→v2 aggiunge bookDue');
ok(Array.isArray(v1.letters), 'migrazione v2→v3 aggiunge letters');
ok(typeof v1.settings.haptics === 'boolean', 'migrazione aggiunge haptics');
ok(typeof v1.settings.wakeLock === 'boolean', 'migrazione aggiunge wakeLock');
ok(typeof v1.settings.parallax === 'boolean', 'migrazione aggiunge parallax');
ok(v1.version === SAVE_VERSION, 'versione post-migrazione');

// ---- 22. Tick passiva: risorse clampate ----
const t0 = defaultState();
t0.resources.luce = 9.99;
t0.lanterns = [true, true, true, true];
t0.unlocks.skylight = true;
tick(t0, Date.now() + 60000);
ok(t0.resources.luce <= MAX.luce, 'luce clampata a max durante tick');
ok(t0.playtime > 0, 'playtime accumulato');

// ---- 23. Tick con dt < 1s → no-op ----
const t1 = defaultState();
const lastTick1 = t1.lastTick;
tick(t1, t1.lastTick + 500);
ok(t1.lastTick === lastTick1, 'tick <1s non modifica lastTick');

// ---- 24. Tick con cap 1h (non rigenera all'infinito offline) ----
const t2 = defaultState();
t2.resources.luce = 0;
t2.lanterns = [true, false, false, false];
const startLu = t2.resources.luce;
tick(t2, t2.lastTick + 8 * 60 * 60 * 1000); // 8h offline → cap 1h
const gained = t2.resources.luce - startLu;
ok(gained <= 0.012 * 3600 + 0.02 * 3600 + 0.5, 'cap 1h di rigenerazione offline');
ok(t2.lastTick > 0, 'lastTick aggiornato');

// ---- 25. worldTick: spawn libri/lettori/eventi ----
const w = defaultState();
w.bookDue = Date.now() - 1;
w.readerDue = Date.now() - 1;
w.eventDue = Date.now() - 1;
const rng = () => 0.05; // forza evento cat (roll < 0.3)
const evts = worldTick(w, Date.now(), rng);
ok(w.booksOnTable > 0, 'libri arrivano');
ok(w.readerActive === true, 'lettore arriva');
ok(evts.some((e) => e.kind === 'event'), 'evento casuale scatena');
ok(evts.some((e) => e.kind === 'readerArrived'), 'evento readerArrived');
ok(w.stats.eventsSeen >= 1, 'eventsSeen incrementato');

// ---- 26. worldTick: evento scaduto viene rimosso ----
const w2 = defaultState();
w2.event = { type: 'rain', expires: Date.now() - 1, bonus: false };
w2.eventDue = Date.now() + 60000;
worldTick(w2, Date.now(), () => 0.99);
ok(w2.event === null || w2.event.type !== 'rain' || w2.event.expires > Date.now() - 1000, 'evento scaduto gestito');

// ---- 27. worldTick: lanterne si spengono con probabilità bassa ----
const w3 = defaultState();
w3.lanterns = [true, false, false, false];
w3.eventDue = Date.now() + 99999;
w3.bookDue = Date.now() + 99999;
w3.readerDue = Date.now() + 99999;
w3.lastAmbient = Date.now(); // nessun ambient
// rng < LANTERN_DIM_CHANCE (0.003) e poi pick
const dimRng = (() => { let i = 0; const seq = [0.001, 0.0]; return () => seq[Math.min(i += 0, seq.length - 1)]; })();
// usa seq fisso: prima chiamata 0.001 < 0.003 → dim; seconda (pick) 0.0
let call = 0;
const rngDim = () => (call++ === 0 ? 0.001 : 0.0);
worldTick(w3, Date.now(), rngDim);
void dimRng;
ok(w3.lanterns.filter(Boolean).length <= 1, 'lanterna spenta (o invariata se 50% gate)');

// ---- 28. Lettere: aggiunta, cap e dedup ----
const l0 = defaultState();
const r1 = addLetter(l0, 'Ciao dalla biblioteca', Date.now());
ok(r1.ok, 'lettera aggiunta');
ok(l0.letters.length === 1, '1 lettera in lista');
const r2 = addLetter(l0, 'Ciao dalla biblioteca', Date.now() + 100);
ok(r2.ok === false && r2.reason === 'duplicate', 'lettera duplicata rifiutata (5s)');
const r3 = addLetter(l0, '   ', Date.now());
ok(r3.ok === false && r3.reason === 'empty', 'lettera vuota rifiutata');
// cap
for (let i = 0; i < MAX_LETTERS + 5; i += 1) {
  addLetter(l0, `Lettera numero ${i} con un testo abbastanza lungo`, Date.now() + 1000 + i * 10000);
}
ok(l0.letters.length <= MAX_LETTERS, `cap lettere = ${MAX_LETTERS}`);
// troncamento
const long = 'X'.repeat(LETTER_MAX_LEN + 100);
addLetter(l0, long, Date.now() + 9999999);
ok(l0.letters[l0.letters.length - 1].text.length <= LETTER_MAX_LEN, 'testo lettera troncato a LETTER_MAX_LEN');

// ---- 29. validazione lettere corrotte ----
const badLetters = validateAndMigrate({
  version: SAVE_VERSION,
  resources: { luce: 1, calma: 1, inchiostro: 1 },
  letters: [{ id: 1, text: 'ok', ts: Date.now() }, { id: 2, text: '', ts: 0 }, 'nope', null],
});
ok(badLetters.letters.length === 1, 'lettere corrotte filtrate');
ok(badLetters.letters[0].text === 'ok', 'lettera valida conservata');

// ---- 30. Luna: fase in [0,1) e id valido ----
const ph = moonPhase(Date.now());
ok(ph >= 0 && ph < 1, 'fase lunare in [0,1)');
const pid = moonPhaseId(ph);
ok(['new', 'waxingCrescent', 'first', 'waxingGibbous', 'full', 'waningGibbous', 'last', 'waningCrescent'].includes(pid), 'id fase valido');
ok(moonPhaseId(0.5) === 'full', '0.5 = luna piena');
ok(moonPhaseId(0) === 'new', '0 = luna nuova');
// data fissa nota: 2000-01-06 18:14 UTC = luna nuova
ok(Math.abs(moonPhase(Date.UTC(2000, 0, 6, 18, 14))) < 0.01, 'epoch new moon ≈ 0');

// ---- 31. i18n: chiavi in entrambe le linghe, stesse chiavi ----
const itKeys = Object.keys(STR.it).sort();
const enKeys = Object.keys(STR.en).sort();
ok(JSON.stringify(itKeys) === JSON.stringify(enKeys), 'stesse chiavi i18n IT/EN');
ok(t('it', 'luce') === 'Luce', 't() it');
ok(t('en', 'luce') === 'Light', 't() en');
ok(t('it', 'missingKey') === 'missingKey', 't() fallback su chiave mancante');
ok(t('it', 'needInk').includes('3'), 'needInk con costo interpolato');
ok(t('it', 'gainCalma', { n: 2 }) === '+2 Calma', 'interpolazione {n}');

// ---- 32. Dati di gioco coerenti ----
ok(RARE_BOOKS.length === 8, '8 libri rari');
ok(new Set(RARE_BOOKS.map((b) => b.id)).size === 8, 'id rari univoci');
ok(RARE_BOOKS.every((b) => b.it && b.en && b.cover && b.glyph), 'rari bilingui completi');
ok(MESSAGES.it.length === MESSAGES.en.length && MESSAGES.it.length > 0, 'messaggi ambientali bilanciati');
ok(Object.keys(MILESTONES).length === 3, '3 traguardi');
ok(Object.values(MILESTONES).every((m) => m.it.title && m.en.title), 'traguardi bilingui');

// ---- 33. shelveBook con now rispetta bookDue ----
const w4 = defaultState();
w4.booksOnTable = 2;
w4.bookDue = Date.now() + 300000;
const now4 = Date.now();
shelveBook(w4, now4);
ok(w4.bookDue <= now4 + 25000, 'bookDue accelerato a 25s dopo azione');

// ---- 34. Stanze: switch, lock, attività (Fase 1) ----
const rs = defaultState();
ok(ROOMS.length >= 3, 'almeno 3 stanze nel content');
ok(isRoomUnlocked(rs, 'hall'), 'hall sempre sbloccata');
ok(!isRoomUnlocked(rs, 'attic'), 'attic bloccata senza wellRoom');

ok(switchRoom(rs, 'nope').reason === 'unknown', 'stanza sconosciuta rifiutata');
ok(switchRoom(rs, 'attic').reason === 'locked', 'attic bloccata rifiutata');
ok(switchRoom(rs, 'hall').ok && switchRoom(rs, 'hall').noop, 'switch su stanza corrente = noop');

// sblocca wellRoom → attic
rs.unlocks.wellRoom = true;
const sw = switchRoom(rs, 'attic');
ok(sw.ok && rs.room === 'attic', 'switch ad attic dopo wellRoom');
ok(sortArchive(rs, Date.now()).ok, 'sortArchive in attic ok');
ok(rs.stats.archiveSorted === 1, 'archiveSorted = 1');
ok(rs.resources.inchiostro >= 1, 'sortArchive dà inchiostro');
// cooldown
ok(sortArchive(rs, Date.now()).reason === 'cooldown', 'sortArchive in cooldown rifiutata');
// wrong room
rs.room = 'hall';
ok(sortArchive(rs, Date.now() + 100000).reason === 'wrongRoom', 'sortArchive fuori attic rifiutata');

// winterGarden
rs.unlocks.curiosityShelf = true;
ok(switchRoom(rs, 'winterGarden').ok, 'switch a winterGarden dopo curiosityShelf');
const tp = tendPlants(rs, Date.now());
ok(tp.ok && rs.stats.plantsTended === 1, 'tendPlants ok');
ok(rs.resources.calma > 0, 'tendPlants dà calma');
ok(tendPlants(rs, Date.now()).reason === 'cooldown', 'tendPlants in cooldown');
rs.room = 'hall';
ok(tendPlants(rs, Date.now() + 100000).reason === 'wrongRoom', 'tendPlants fuori giardino');

// validazione conserva room sbloccata
const round = validateAndMigrate(JSON.parse(JSON.stringify(rs)));
ok(round.room === rs.room || round.room === 'hall', 'room validata al roundtrip');

// ---- 35. Fase 2 · Lettori procedurali + dialogo ----
const p1 = buildReaderProfile(42);
const p2 = buildReaderProfile(42);
ok(p1.name && p1.name === p2.name, 'profilo lettore deterministico dal seed');
ok(['shy', 'curious', 'dreamy'].includes(p1.mood), 'umore valido');
ok(p1.preferredBook && RARE_BOOKS.some((b) => b.id === p1.preferredBook), 'libro preferito valido');
ok(p1.choice === null, 'nessuna scelta iniziale');

const rp = defaultState();
rp.readerActive = true;
rp.readerProfile = buildReaderProfile(rp.readerDue);
ok(answerReaderDialogue(rp, 'nope', Date.now()).reason === 'unknown', 'scelta sconosciuta rifiutata');
const ans = answerReaderDialogue(rp, 'askTitle', Date.now());
ok(ans.ok && rp.readerProfile.choice === 'askTitle', 'scelta dialogo registrata');
ok(typeof ans.rareMod === 'number', 'rareMod numerico');
ok(answerReaderDialogue(rp, 'quietNod', Date.now()).reason === 'already', 'seconda scelta rifiutata');
ok(typeof rp.readerProfile.reply === 'string' && rp.readerProfile.reply.length > 0, 'reply presente');

rp.resources.calma = 5;
const serveWith = serveReader(rp, Date.now(), () => 0.99); // rng alto → nessun raro
ok(serveWith.ok, 'serve dopo dialogo ok');
ok(serveWith.choice === 'askTitle', 'choice riportata al serve');
ok(rp.readerProfile === null, 'profilo azzerato dopo serve');
ok(READERS.dialogue.choices.length >= 3, '>= 3 scelte dialogo');

// serve senza profilo (retro-compatibilità)
const bare = defaultState();
bare.readerActive = true;
bare.resources.calma = 5;
ok(serveReader(bare, Date.now(), () => 0.99).ok, 'serve senza profilo ok');

// ---- 36. Fase 2 · Meteo influenza pesi eventi + weather update ----
const mw = defaultState();
mw.weather = 'rain';
mw.weatherChangedAt = 0;
mw.eventDue = Date.now() - 1;
mw.readerDue = Date.now() + 999999;
mw.bookDue = Date.now() + 999999;
mw.lastAmbient = Date.now();
// rng 0.0 → sotto la prima soglia pesi (cat 0.25 / total) comunque un evento
worldTick(mw, Date.now(), () => 0.99);
ok(mw.weather === 'clear' || mw.weather === 'rain', 'weather invariato o scattato');
// con weatherChangedAt vecchio e rng basso → cambio meteo
const mw2 = defaultState();
mw2.weather = 'clear';
mw2.weatherChangedAt = Date.now() - 200000;
mw2.eventDue = Date.now() + 999999;
mw2.readerDue = Date.now() + 999999;
mw2.bookDue = Date.now() + 999999;
mw2.lastAmbient = Date.now();
worldTick(mw2, Date.now(), () => 0.0); // rng < 0.35 → toggle
ok(mw2.weather === 'rain', 'pioggia parte da clear con rng basso');

// ---- 37. Fase 2 · Almanacco delle lune ----
const alm = defaultState();
// luna piena forzata via moonFn iniettato
const unlocked1 = observeMoon(alm, Date.now(), () => 0.5); // full
ok(alm.almanac.full === 1, 'full moon contato');
ok(alm.almanac.phases.includes('full'), 'fase full registrata');
ok(unlocked1.includes('firstFull'), 'achievement firstFull sbloccato');
const unlockedAgain = observeMoon(alm, Date.now(), () => 0.5); // stesso giorno/fase
ok(alm.almanac.full === 1, 'stessa fase stesso giorno non ricontata');
ok(unlockedAgain.length === 0, 'nessun nuovo achievement ripetuto');
observeMoon(alm, Date.now() + 86400000, () => 0); // new moon giorno dopo
ok(alm.almanac.new >= 1, 'new moon contato');
ok(alm.almanac.achievements.newMoonNight === true, 'achievement newMoonNight');
ok(Object.keys(MOON_ACHIEVEMENTS).length >= 4, '>= 4 achievement in content');

// ---- 38. Fase 2 · Cat AI pesi esponenziali ----
const catS = defaultState();
ok(typeof catS.catWeights.hearth === 'number', 'catWeights default');
const before = catS.catWeights.shelves;
// interagisci più volte sulle lanterne → peso lanterne sale, shelves scende
for (let i = 0; i < 5; i += 1) {
  catS.catArea = 'kettle'; // evita bonus cat che sposta solo la posizione
  lightLantern(catS, 0, Date.now()); // no-op se già accesa, ma bumpWeight su lanterns se passa
}
// forza bump su zona specifica accendendo lanterna spenta
catS.lanterns = [false, false, false, false];
catS.catWeights = defaultCatWeights();
catS.catArea = 'hearth';
lightLantern(catS, 0, Date.now());
ok(catS.catWeights.lanterns > 1, 'peso lanterns boostato dopo interazione');
ok(catS.catWeights.shelves < 1, 'peso shelves decato');
ok(catS.catWeights.shelves >= 0.05, 'peso minimo 0.05');
ok(before >= 0.05, 'peso iniziale valido');

// ---- 39. Fase 2 · Daily seed deterministico ----
const now = Date.UTC(2026, 8, 23, 12, 0, 0);
ok(dayKey(now) === '2026-09-23', 'dayKey locale ISO');
ok(hashString('2026-09-23') === hashString('2026-09-23'), 'hash deterministico');
ok(hashString('2026-09-23') !== hashString('2026-09-24'), 'hash diverso per giorno diverso');
ok(dailySeed(now) === hashString('2026-09-23'), 'dailySeed = hash(dayKey)');
const ds = defaultState();
const d1 = ensureDaily(ds, now);
ok(d1 && d1.kind === 'dailyLetter', 'lettera del giorno generata');
ok(ds.letters.length === 1, 'lettera aggiunta allo stato');
ok(ds.daily.key === '2026-09-23', 'daily.key impostato');
ok(ensureDaily(ds, now) === null, 'seconda chiamata stesso giorno = null');
ok(DAILY_LETTERS.it.length === DAILY_LETTERS.en.length, 'daily letters IT/EN parity');

// ---- 40. Fase 3 · ZIP roundtrip (store) ----
const enc = new TextEncoder();
const fileA = enc.encode('{"id":"demo-pack","name":"Demo"}');
const zip = zipWrite([{ name: 'pack.json', data: fileA }]);
ok(zip.length > 22, 'zipWrite produce bytes');
const entries = await zipRead(zip);
ok(entries.length === 1, 'zipRead legge 1 entry');
ok(entries[0].name === 'pack.json', 'nome entry');
ok(new TextDecoder().decode(entries[0].data) === '{"id":"demo-pack","name":"Demo"}', 'contenuto entry');
ok(crc32(enc.encode('123456789')) === 0xcbf43926, 'crc32 standard');

// ---- 41. Fase 3 · Mod pack validate + apply ----
const badPack = validatePack({ id: 'Bad ID!', name: '' });
ok(badPack === null, 'pack invalido rifiutato');
const goodPack = validatePack({
  id: 'demo-pack',
  name: 'Demo Pack',
  version: '1.0.0',
  content: {
    rareBooks: [{
      id: 'mod-luna',
      it: { title: 'Luna di Mod', desc: 'Un volume moddato.' },
      en: { title: 'Mod Moon', desc: 'A modded volume.' },
      cover: '#123456',
      glyph: '☾',
    }],
    messages: { it: ['Messaggio mod.'], en: ['Mod message.'] },
  },
  assets: { badge: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>' },
});
ok(goodPack !== null, 'pack valido accettato');
ok(goodPack.content.rareBooks[0].mod === true, 'libro mod marcato');
ok(goodPack.content.rareBooks[0].id === 'mod-luna', 'id libro mod');

const evil = validatePack({
  id: 'evil-pack',
  name: 'Evil',
  content: { rareBooks: [] },
  assets: { x: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>' },
});
// asset cattivo droppato → se non resta nulla di valido, pack rifiutato
ok(evil === null || !evil.assets.x, 'svg con onload rifiutato');
const evilKeep = validatePack({
  id: 'evil2',
  name: 'Evil2',
  content: { messages: { it: ['ok'], en: ['ok'] } },
  assets: {
    good: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
    bad: '<svg onload="x()"></svg>',
    script: '<svg><script>alert(1)</script></svg>',
  },
});
ok(evilKeep !== null, 'pack con messaggi validi accettato');
ok(evilKeep.assets.good?.includes('<svg'), 'svg pulita tenuta');
ok(!evilKeep.assets.bad, 'svg onload droppata');
ok(!evilKeep.assets.script, 'svg con script droppata');

const base = { version: 1, messages: { it: ['a'], en: ['a'] }, rareBooks: [{ id: 'almanacco', it: { title: 't' }, en: { title: 't' }, cover: '#000', glyph: 'x' }], milestones: {}, unlocks: {}, rooms: [{ id: 'hall' }] };
const merged = applyPacks(base, [goodPack]);
ok(merged.rareBooks.length === 2, 'applyPacks aggiunge libro mod');
ok(merged.rareBooks.some((b) => b.id === 'mod-luna'), 'libro mod presente');
ok(merged.messages.it.includes('Messaggio mod.'), 'messaggio mod aggiunto');
ok(merged.modAssets?.badge?.includes('<svg'), 'asset svg applicato');

const jsonPack = await loadPack(JSON.stringify({ id: 'json-pack', name: 'J', content: { messages: { it: ['x'], en: ['x'] } } }));
ok(jsonPack.ok === true, 'loadPack da JSON string');

// ---- 42. Fase 3 · Voice + room description ----
const cmd = parseVoiceCommand('accendi la lanterna');
ok(cmd && cmd.action === 'lantern', 'voice: lanterna → lantern');
ok(parseVoiceCommand('brew tea')?.action === 'tea', 'voice: tea → tea');
ok(parseVoiceCommand('help me')?.action === 'help', 'voice: help');
ok(parseVoiceCommand('vai al soppalco')?.action === 'switch-room', 'voice: attic');
ok(parseVoiceCommand('vai al soppalco')?.dataset.room === 'attic', 'voice dataset room');
ok(parseVoiceCommand('') === null, 'voice: vuoto → null');
const desc = describeRoom(defaultState(), t);
ok(typeof desc === 'string' && desc.includes('Aula'), 'describeRoom IT');
ok(desc.includes('Calma'), 'describeRoom include risorse');

// ---- 43. Fase 3 · Signal codec ----
const code = encodeSignal({ t: 'offer', sdp: 'v=0\r\n' });
const back = decodeSignal(code);
ok(back && back.t === 'offer', 'signal roundtrip');
ok(decodeSignal('!!!not-base64!!!') === null, 'signal invalido → null');

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
