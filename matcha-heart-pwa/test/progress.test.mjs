/* progress.test.mjs — multiverso: persistenza dell'universo e avanzamento.
   Copre i due bug più gravi: il reset a Pioggia e il NaN sugli id stringa. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, createStorage } from './harness.mjs';

const boot = (storage) => {
  const g = loadGame({
    storage,
    files: ['save.js', 'tiles.js', 'audio.js', 'board.js', 'story.js', 'universes.js'],
  });
  g.win.MH = { save: g.win.MHSave.refillHearts(g.win.MHSave.loadSave()) };
  g.win.MHU.ensureSave();
  return g;
};

test('B1: tutti e quattro gli universi sopravvivono a un reload', () => {
  for (const uid of ['pioggia', 'sakura', 'yokai', 'estate']) {
    const store = createStorage();
    const a = boot(store);
    a.win.MH.save.universe = uid;
    a.win.MHSave.writeSave(a.win.MH.save);
    const b = boot(createStorage(Object.fromEntries(store._data)));  // reload
    assert.equal(b.win.MH.save.universe, uid, `l'universo ${uid} è stato resettato al reload`);
  }
});

test('un universo inesistente ripiega su Pioggia', () => {
  const g = boot(createStorage());
  g.win.MH.save.universe = 'mondo-che-non-esiste';
  g.win.MHU.ensureSave();
  assert.equal(g.win.MH.save.universe, 'pioggia');
});

test('B2: advanceUnlocked non produce mai NaN sugli id stringa', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  /* il vecchio codice faceva Math.max(<id stringa>, 26) → NaN → JSON null →
     epIndex(null) === -1 → l'intera saga risultava sbloccata */
  for (const uid of ['sakura', 'yokai', 'estate']) {
    MH.save.universe = uid;
    const prog = MHU.prog(uid);
    const mid = MHU.UNIVERSES.find((u) => u.id === uid).story[2].id;   // terzo episodio
    prog.unlocked = mid;
    MHU.advanceUnlocked(prog, uid, 26);
    assert.ok(typeof prog.unlocked !== 'number' || !Number.isNaN(prog.unlocked),
      `${uid}: unlocked è NaN`);
    assert.notEqual(prog.unlocked, null, `${uid}: NaN serializzerebbe in null`);
    assert.ok(MHU.epIndex(prog.unlocked, uid) >= 0,
      `${uid}: epIndex di "${prog.unlocked}" è -1, quindi tutto sbloccato`);
  }
});

test('B2: dopo il finale Yokai la saga NON è interamente sbloccata', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  MH.save.universe = 'yokai';
  const prog = MHU.prog('yokai');
  prog.unlocked = 'y3';                          // siamo a metà
  MHU.advanceUnlocked(prog, 'yokai', 26);        // il vecchio codice faceva Math.max('y3',26)
  const idx = MHU.epIndex(prog.unlocked, 'yokai');
  assert.ok(idx >= 0, `epIndex di "${prog.unlocked}" deve essere valido, non -1 (=-1 sblocca tutto)`);
  assert.equal(idx, 2, 'l\'avanzamento deve restare posizionale, non azzerare la saga');
  assert.equal(MHU.epIndex('y15', 'yokai'), 14);
  assert.ok(MHU.epIndex('y4', 'yokai') > idx, 'y4 deve restare bloccato');
  assert.ok(MHU.epIndex('y10', 'yokai') > idx, 'y10 deve restare bloccato');
});

test('completeUniverse chiude il mondo senza toccare gli altri', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  MH.save.universe = 'yokai';
  const yokai = MHU.prog('yokai'), pioggia = MHU.prog('pioggia');
  yokai.unlocked = 'y1';
  MHU.completeUniverse(yokai);
  assert.equal(yokai.unlocked, 'complete');
  assert.notEqual(pioggia.unlocked, 'complete', 'il canone deve restare giocabile');
});

test('completeUniverse è idempotente e advanceUnlocked non riapre un mondo chiuso', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  MH.save.universe = 'sakura';
  const prog = MHU.prog('sakura');
  MHU.completeUniverse(prog);
  assert.equal(MHU.completeUniverse(prog), false, 'la seconda chiamata non deve cambiare nulla');
  MHU.advanceUnlocked(prog, 'sakura', 's3');
  assert.equal(prog.unlocked, 'complete', 'un mondo completo non deve essere riaperto');
});

test('advanceUnlocked avanza solo in avanti', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  MH.save.universe = 'pioggia';
  const prog = MHU.prog('pioggia');
  prog.unlocked = 10;
  MHU.advanceUnlocked(prog, 'pioggia', 26);
  assert.equal(prog.unlocked, 26);
  MHU.advanceUnlocked(prog, 'pioggia', 5);
  assert.equal(prog.unlocked, 26, 'non deve tornare indietro');
  assert.equal(MHU.advanceUnlocked(prog, 'pioggia', 9999), false, 'un id inesistente non avanza nulla');
});

test('la catena di sblocco degli universi regge', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  const byId = Object.fromEntries(MHU.UNIVERSES.map((u) => [u.id, u]));
  assert.equal(MHU.universeUnlocked(byId.pioggia), true);
  MHU.prog('pioggia').endings = []; MH.save.universe = 'pioggia';
  assert.equal(MHU.universeUnlocked(byId.sakura), false, 'sakura resta chiuso senza un finale canone');
  MHU.prog('pioggia').endings = ['finale-resta'];
  assert.equal(MHU.universeUnlocked(byId.sakura), true);
  assert.equal(MHU.universeUnlocked(byId.yokai), false);
  MHU.prog('sakura').endings = ['finale-pioggia-vera'];
  assert.equal(MHU.universeUnlocked(byId.yokai), true);
  MHU.prog('yokai').endings = ['finale-alba'];
  assert.equal(MHU.universeUnlocked(byId.estate), true);
});

test('setUniverse rifiuta un universo sigillato senza scrivere nulla', () => {
  const g = boot(createStorage());
  const { MHU, MH } = g.win;
  MH.save.universe = 'pioggia';
  assert.equal(MHU.setUniverse('yokai'), false);
  assert.equal(MH.save.universe, 'pioggia', 'un rifiuto non deve toccare il save');
});

test('ogni universo espone capitoli, episodi e finali coerenti', () => {
  const g = boot(createStorage());
  for (const u of g.win.MHU.UNIVERSES) {
    assert.ok(u.story.length > 0, `${u.id} senza episodi`);
    assert.ok(u.chapters.length > 0, `${u.id} senza capitoli`);
    const ids = new Set();
    for (const ch of u.chapters) {
      assert.ok(ch.eps.length > 0, `capitolo ${ch.n} di ${u.id} senza episodi`);
      for (const id of ch.eps) {
        assert.ok(u.story.some((e) => e.id === id), `${u.id}: la mappa punta a "${id}", che non esiste`);
        assert.ok(!ids.has(id), `${u.id}: episodio "${id}" duplicato nella mappa`);
        ids.add(id);
      }
    }
    assert.equal(ids.size, u.story.length, `${u.id}: ${u.story.length} episodi ma ${ids.size} in mappa`);
    for (const e of u.story) {
      assert.ok(u.endings[e.choiceA.effect] || !e.choiceA.effect.startsWith('finale'), `${u.id}/${e.id}: finale A inesistente`);
      assert.ok(u.endings[e.choiceB.effect] || !e.choiceB.effect.startsWith('finale'), `${u.id}/${e.id}: finale B inesistente`);
    }
  }
});
