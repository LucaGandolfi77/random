/* save.test.mjs — persistenza: deep-merge, migrazioni, cuori, quota esaurita */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, createStorage } from './harness.mjs';

const boot = (seed) => {
  const storage = createStorage(seed);
  const g = loadGame({ storage, files: ['save.js'] });
  g.win.MH = { save: g.win.MHSave.loadSave() };
  return { ...g, save: g.win.MH.save };
};

test('B10: il merge non sostituisce più stats per intero', () => {
  const store = { 'matcha-heart-save-v1': JSON.stringify({
    /* save di una versione vecchia: stats con solo 3 sottochiavi */
    stats: { rainTaps: 42, konamiDate: '2026-01-01' },
    tama: { name: 'Mugi', xp: 90 },
  }) };
  const { save } = boot(store);
  assert.equal(save.stats.rainTaps, 42, 'il dato esistente non deve perdersi');
  assert.equal(save.stats.konamiDate, '2026-01-01');
  assert.equal(save.stats.riteS, 0, 'la sottochiave nuova deve prendere il default');
  assert.equal(save.stats.firstPlay, new Date().toISOString().slice(0, 10), 'firstPlay va popolata');
  assert.equal(save.tama.xp, 90);
  assert.equal(save.tama.stage, 0, 'le sottochiavi nuove di tama devono arrivare dal default');
  assert.equal(save.tama.cuddles, 0);
});

test('il merge non sovrascrive un array con un oggetto e viceversa', () => {
  const store = { 'matcha-heart-save-v1': JSON.stringify({ letters: ['a', 'b'], mood: { log: ['bene'] } }) };
  const { save } = boot(store);
  assert.deepEqual([...save.letters], ['a', 'b']);
  assert.deepEqual([...save.mood.log], ['bene']);
  assert.equal(save.mood.log.length, 1);
});

test('il save porta sempre la versione corrente', () => {
  const { save, win } = boot({ 'matcha-heart-save-v1': JSON.stringify({ saveVersion: 1, hearts: 3 }) });
  assert.equal(save.saveVersion, win.MHSave.SAVE_VERSION);
  assert.equal(save.hearts, 3);
});

test('un JSON corrotto non fa crashare l\'avvio', () => {
  for (const raw of ['{non è json', 'null', '[]', '"stringa"']) {
    const { save } = boot({ 'matcha-heart-save-v1': raw });
    assert.equal(save.hearts, 5, `save non valido: ${raw}`);
    assert.equal(save.universe, 'pioggia');
    assert.equal(typeof save.tama, 'object');
  }
});

test('nessun save preesistente: default completi e firstPlay impostata', () => {
  const { save } = boot({});
  assert.equal(save.hearts, 5);
  assert.equal(save.unlocked, 1);
  assert.equal(save.boosters.chasen, 2);
  assert.equal(save.boosters.cup, 2);
  assert.equal(save.settings.sound, true);
  assert.equal(save.progress, null, 'il multiverso lo crea ensureSave()');
  assert.ok(save.stats.firstPlay);
});

test('refillHearts ricarica tutto ciò che è maturato, mai oltre 5', () => {
  const { win } = boot({});
  const refill = win.MHSave.refillHearts;

  /* ago = "n secondi fa" — nessuna ambiguità */
  const ago = (sec, hearts = 3) => ({ hearts, lastRefill: Date.now() - sec * 1000 });
  assert.equal(refill(ago(10)).hearts, 3, '10s fa: nulla');
  assert.equal(refill(ago(299)).hearts, 3, '4m59s fa: ancora nulla');
  assert.equal(refill(ago(301)).hearts, 4, '5m01s fa: 1 cuore');
  assert.equal(refill(ago(20 * 60)).hearts, 5, '20 minuti = 4 cuori maturati, 3+4 satura a 5');
  assert.equal(refill(ago(9999)).hearts, 5, 'mai oltre 5');
  assert.equal(refill(ago(20 * 60, 0)).hearts, 4, 'da zero cuori un blocco ne dà uno');
  const full = ago(9999, 5);
  refill(full);
  assert.ok(Math.abs(full.lastRefill - Date.now()) < 2000, 'a cuori pieni il timer si azzera');
  assert.equal(refill(ago(10)).hearts, 3, 'un lastRefill nel futuro non regala cuori');
  assert.equal(refill({ hearts: 0, lastRefill: null }).hearts, 0, 'lastRefill assente = nessun regalo');
});

test('B11: un errore di scrittura viene segnalato, non ingoiato', () => {
  const g = loadGame({ files: ['save.js'] });
  const toasts = [];
  g.win.MH = { save: g.win.MHSave.DEFAULT_SAVE() };
  g.win.MHToast = (m) => toasts.push(m);
  const boom = new Error('quota');
  boom.name = 'QuotaExceededError';
  g.win.localStorage.setItem = () => { throw boom; };
  const ok = g.win.MHSave.writeSave(g.win.MH.save);
  assert.equal(ok, false, 'deve restituire false');
  assert.equal(toasts.length, 1, 'l\'errore deve arrivare all\'utente');
  assert.match(toasts[0], /Spazio esaurito/);
});

test('B11: l\'errore viene segnalato una volta sola, e non al ritorno', () => {
  const g = loadGame({ files: ['save.js'] });
  const toasts = [];
  g.win.MH = { save: g.win.MHSave.DEFAULT_SAVE() };
  g.win.MHToast = (m) => toasts.push(m);
  const real = g.win.localStorage.setItem.bind(g.win.localStorage);
  g.win.localStorage.setItem = () => { const e = new Error('x'); e.name = 'NS_ERROR_DOM_QUOTA_REACHED'; throw e; };
  for (let i = 0; i < 10; i++) g.win.MHSave.writeSave(g.win.MH.save);
  assert.equal(toasts.length, 1, 'non devono partire 10 toast identici');
  g.win.localStorage.setItem = real;
  assert.equal(g.win.MHSave.writeSave(g.win.MH.save), true, 'il salvataggio torna a funzionare');
  assert.equal(toasts.length, 2, 'l\'utente viene avvisato anche del ripristino');
  assert.match(toasts[1], /ripristinato/);
});

test('B11: un errore non-quota ha un messaggio dedicato', () => {
  const g = loadGame({ files: ['save.js'] });
  const toasts = [];
  g.win.MH = { save: g.win.MHSave.DEFAULT_SAVE() };
  g.win.MHToast = (m) => toasts.push(m);
  g.win.localStorage.setItem = () => { const e = new Error('SecurityError'); e.name = 'SecurityError'; throw e; };
  g.win.MHSave.writeSave(g.win.MH.save);
  assert.match(toasts[0], /modalità privata/);
});

test('il save sopravvive a un ciclo completo write → load', () => {
  const a = boot({});
  a.save.stars = { 1: 3, 2: 2 };
  a.save.totalStars = 5;
  a.save.pendingMoves = 3;
  a.save.universe = 'sakura';
  a.win.MHSave.writeSave(a.save);
  const b = boot(Object.fromEntries(a.storage._data));
  assert.equal(b.save.totalStars, 5);
  assert.equal(b.save.pendingMoves, 3, 'B9: il bonus pendente deve sopravvivere al reload');
  assert.equal(b.save.universe, 'sakura');
  assert.equal(b.save.stars['1'], 3);
});
