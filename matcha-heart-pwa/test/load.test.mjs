/* load.test.mjs — tutti gli script insieme, nell'ordine di index.html.
   È il test che ha scoperto il bug più grave del progetto: `const T` era
   dichiarato sia in story.js sia in universes.js, e in un browser i due script
   condividono il global lexical scope — il secondo lancia SyntaxError,
   window.MHU non viene mai creato e l'app non parte. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadGame, ROOT } from './harness.mjs';

/* l'ordine deve combaciare con i <script> di index.html */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const fromHtml = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);

test('index.html elenca gli script senza defer mancanti e senza duplicati', () => {
  const onDisk = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual([...fromHtml].sort(), onDisk, 'un file in js/ non è incluso in index.html');
  assert.equal(new Set(fromHtml).size, fromHtml.length, 'script duplicato in index.html');
  assert.equal(html.match(/<script src="js\//g).length, fromHtml.length);
});

test('gli script sono tutti defer (non bloccano il parse)', () => {
  const tags = [...html.matchAll(/<script src="js\/[^"]+"([^>]*)>/g)];
  for (const [, attrs] of tags) {
    assert.match(attrs, /\bdefer\b/, 'manca defer su uno <script src="js/…">');
  }
});

test('il caricamento reale non produce alcun errore di scope', () => {
  /* autoritativo: esegue gli script nell'ordine di index.html dentro un
     contesto vm, che replica lo stesso global lexical scope del browser.
     Un const dichiarato due volte fa fallire qui il secondo script. */
  const game = loadGame({ files: fromHtml });
  for (const name of ['MHSave', 'MHTiles', 'MHAudio', 'MHBoard', 'MHStory', 'MHU', 'MHMinis', 'MHTama', 'MHEggs']) {
    assert.ok(game.win[name], `manca il global window.${name}: il suo script non è arrivato in fondo`);
  }
});

test('ogni script è incapsulato in una IIFE', () => {
  for (const f of fromHtml) {
    const src = readFileSync(join(ROOT, 'js', f), 'utf8');
    assert.match(src, /\(function \(\) \{/, `${f} non è incapsulato: le sue costanti inquineranno lo scope globale`);
    assert.match(src, /\}\)\(\);\s*$/, `${f} non chiude la IIFE`);
  }
});

test('caricando tutti gli script non si produce alcun SyntaxError', () => {
  const g = loadGame({ files: fromHtml });
  assert.ok(g.win.MHSave, 'save.js non ha esportato MHSave');
  assert.ok(g.win.MHTiles, 'tiles.js non ha esportato MHTiles');
  assert.ok(g.win.MHAudio, 'audio.js non ha esportato MHAudio');
  assert.ok(g.win.MHBoard, 'board.js non ha esportato MHBoard');
  assert.ok(g.win.MHStory, 'story.js non ha esportato MHStory');
  assert.ok(g.win.MHU, 'universes.js non ha esportato MHU  ← il bug della IIFE lo spegneva qui');
  assert.ok(g.win.MHMinis, 'minigames.js non ha esportato MHMinis');
  assert.ok(g.win.MHTama, 'tama.js non ha esportato MHTama');
  assert.ok(g.win.MHEggs, 'eggs.js non ha esportato MHEggs');
});

test('i dati narrativi sono completi dopo il caricamento di tutti gli script', () => {
  const g = loadGame({ files: fromHtml });
  const { MHStory, MHU } = g.win;
  assert.equal(MHStory.STORY.length, 45, 'il canone deve avere 45 episodi');
  assert.equal(MHStory.CHAPTERS.length, 9);
  assert.equal(MHStory.ORACLES.length >= 9, true);
  assert.equal(MHU.UNIVERSES.length, 4);
  const total = MHU.UNIVERSES.reduce((n, u) => n + u.story.length, 0);
  assert.equal(total, 100, `attesi 100 livelli totali, trovati ${total}`);
});

test('ogni episodio ha livello, scelte e lettera ben formati', () => {
  const g = loadGame({ files: fromHtml });
  const TILE_COUNT = g.win.MHTiles.TILE_COUNT;
  for (const u of g.win.MHU.UNIVERSES) {
    for (const e of u.story) {
      const where = `${u.id}/${e.id}`;
      const L = e.level;
      assert.ok(L, `${where}: manca level`);
      assert.ok(Number.isInteger(L.targetTile) && L.targetTile >= 0 && L.targetTile < TILE_COUNT,
        `${where}: targetTile ${L.targetTile} fuori da TILE_COUNT (${TILE_COUNT}) — il render andrebbe in crash`);
      assert.ok(L.moves > 0, `${where}: mosse non positive`);
      assert.ok(L.targetCount > 0, `${where}: targetCount non positivo`);
      assert.ok(L.quota === 0 || (L.quota > 0 && L.quota <= 95), `${where}: quota ${L.quota} fuori 0..95`);
      assert.ok(L.moves >= L.targetCount * 0.28, `${where}: ratio ${(L.targetCount / L.moves).toFixed(2)} troppo basso, impossibile`);
      assert.ok(['awa', 'latte', 'respiro'].includes(L.mini), `${where}: rito "${L.mini}" sconosciuto`);
      const eff = (x) => ['coraggio', 'dolcezza', 'rabbia'].includes(x) || u.endings[x];
      assert.ok(eff(e.choiceA.effect), `${where}: effetto A "${e.choiceA.effect}" non è né un umore né un finale`);
      assert.ok(eff(e.choiceB.effect), `${where}: effetto B "${e.choiceB.effect}" non è né un umore né un finale`);
      assert.ok(e.letter && e.letter.length > 10, `${where}: lettera mancante o troppo corta`);
      assert.ok(e.text.length > 80, `${where}: testo troppo corto`);
      assert.ok(e.cliff && e.cliff.length > 10, `${where}: cliff mancante`);
    }
  }
});

test('data/story.json combacia con i dati reali', () => {
  const g = loadGame({ files: fromHtml });
  const idx = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  const { MHU, MHStory } = g.win;
  assert.equal(idx.canon.episodes, MHStory.STORY.length);
  assert.equal(idx.canon.chapters, MHStory.CHAPTERS.length);
  assert.equal(idx.total_levels, MHU.UNIVERSES.reduce((n, u) => n + u.story.length, 0));
  const byId = Object.fromEntries(MHU.UNIVERSES.map((u) => [u.id, u]));
  byId.canon = byId.pioggia;   // nel JSON il canone si chiama "canon"
  for (const [uid, section] of Object.entries(idx)) {
    if (uid === 'note' || uid === 'total_levels' || uid === 'minigames' || uid === 'language') continue;
    const u = byId[uid];
    assert.ok(u, `data/story.json parla di "${uid}", che non è un universo`);
    assert.equal(section.episodes, u.story.length, `${uid}: episodi`);
    assert.equal(section.chapters, u.chapters.length, `${uid}: capitoli`);
    assert.equal(section.endings.length, Object.keys(u.endings).length, `${uid}: finali`);
    for (const t of section.threads) {
      assert.ok(u.threads.some((x) => x.id === t), `${uid}: filo "${t}" assente`);
    }
  }
});
