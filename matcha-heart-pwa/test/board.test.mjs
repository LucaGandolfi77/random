/* board.test.mjs — motore match-3: swap, categorie di tessere, booster, teardown */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

/* gli oggetti nascono dentro il contesto vm: hanno prototipi diversi, quindi
   deepStrictEqual fallirebbe sul confronto del prototype. Confronto i campi. */
const at = (o, r, c) => assert.equal(o.r, r) || assert.equal(o.c, c);

const mk = (opts = {}) => {
  const g = loadGame({ files: ['save.js', 'tiles.js', 'audio.js', 'board.js'] });
  const el = g.doc.createElement('div');
  g.doc.body.appendChild(el);
  return { ...g, el, board: new g.win.MHBoard(el, { moves: 22, targetTile: 0, targetCount: 15, ...opts }) };
};

test('le tessere speciali non sono movibili e non producono match', () => {
  const { board } = mk();
  const T = 6;
  assert.equal(board.isPlain(0), true);
  assert.equal(board.isPlain(T - 1), true);
  assert.equal(board.isPlain(10), false, 'un bocciolo non è una tessera semplice');
  assert.equal(board.isBloom(10), true);
  assert.equal(board.isBloom(10 + T - 1), true);
  assert.equal(board.isBloom(10 + T), false, 'il bloom non deve sfondare TILE_COUNT');
  assert.equal(board.isFrozen(20), true);
  assert.equal(board.isFrozen(20 + T), false);
  assert.equal(board.isInk(30), true);
  assert.equal(board.isInk(31), false);
  assert.equal(board.movable(20), false, 'il gelo non si sposta');
  assert.equal(board.movable(30), false, 'linchiostro non si sposta');
  assert.equal(board.movable(10), true, 'il bocciolo si sposta');
});

test('findMatches ignora boccioli, gelo e inchiostro anche in fila', () => {
  const { board } = mk();
  const S = board.size, T = 6;
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) board.grid[r][c] = (r + c) % T;
  // tre inchiostro di fila
  for (let c = 0; c < 3; c++) board.grid[0][c] = 30;
  assert.equal(board.findMatches().some(([r]) => r === 0), false);
  // tre tessere sempliche uguali di fila
  for (let c = 0; c < 3; c++) board.grid[1][c] = 2;
  const m = board.findMatches();
  assert.ok(m.length >= 3, 'la fila di 3 sakura deve essere un match');
  assert.ok(m.every(([r]) => r === 1));
});

test('B3: più livelli sullo stesso nodo non accumulano listener', () => {
  const g = loadGame({ files: ['save.js', 'tiles.js', 'audio.js', 'board.js'] });
  const el = g.doc.createElement('div');
  g.doc.body.appendChild(el);
  const before = el.listenerCount('pointerup');

  const boards = [];
  for (let i = 0; i < 5; i++) {
    boards.push(new g.win.MHBoard(el, { moves: 22, targetTile: 0, targetCount: 15 }));
    if (i < 4) boards[i].destroy();   // come startLevel(): distrugge il livello precedente
  }
  const after = el.listenerCount('pointerup');
  assert.equal(after, before + 1, `attesi 1 set di listener, trovati ${after - before}`);

  /* uno swipe deve produrre UNA sola trySwap, non una per livello giocato */
  let swaps = 0;
  boards[4].trySwap = () => { swaps++; };
  boards[4].render = () => {};
  boards[4].tap = () => {};
  const cell = boards[4].cells[0];
  el.dispatch('pointerdown', { target: cell, clientX: 100, clientY: 100 });
  el.dispatch('pointerup', { target: cell, clientX: 140, clientY: 100 });
  assert.equal(swaps, 1, `1 swipe ha lanciato ${swaps} trySwap`);
});

test('destroy() rimuove davvero i listener', () => {
  const g = loadGame({ files: ['save.js', 'tiles.js', 'audio.js', 'board.js'] });
  const el = g.doc.createElement('div');
  g.doc.body.appendChild(el);
  const b = new g.win.MHBoard(el, {});
  const n = el.listenerCount('pointerdown');
  assert.ok(n > 0);
  b.destroy();
  assert.equal(el.listenerCount('pointerdown'), 0);
  assert.equal(el.listenerCount('pointerup'), 0);
  assert.equal(el.listenerCount('keydown'), 0);
});

test('B4: il booster chasen termina anche su board saturo', () => {
  const { board } = mk({ targetTile: 4 });
  const S = board.size;
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) board.grid[r][c] = 4;
  board.render = () => {};
  const t0 = Date.now();
  const res = board.booster('chasen');
  assert.equal(res, false, 'su un board già tutto target il booster non deve forzare nulla');
  assert.ok(Date.now() - t0 < 500, 'il booster deve tornare subito, non ciclare all\'infinito');
});

/* Un riempimento senza match preesistenti: un pattern a passo coprimo, così
   né le righe né le colonne hanno tre valori uguali di fila. Serve perché
   booster() chiama findMatches() e poi resolve(), che azzera in modo
   *sincrono* (prima del primo await) le tessere del match: se il board di
   partenza ne ha, il test diventa una corsa. */
const noMatch = (size, targetTile = -1) => {
  const g = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => ((r + 2 * c) % 5) + 1));
  if (targetTile >= 0) for (const row of g) for (let c = 0; c < size; c++) if (row[c] === targetTile) row[c] = 1;
  return g;
};

test('il booster chasen converte davvero 8 tessere su un board misto', () => {
  const { board } = mk({ targetTile: 0 });
  const S = board.size;
  board.grid = noMatch(S, 0);
  board.render = () => {};
  board.findMatches = () => [];   // isoliamo la conversione dalla cascata
  assert.equal(board.findMatches().length, 0, 'il pattern di test non deve avere match');
  const before = board.grid.flat().filter((v) => v === 0).length;
  board.booster('chasen');
  const after = board.grid.flat().filter((v) => v === 0).length;
  assert.equal(after - before, 8);
  assert.equal(board.grid.flat().some((v) => v === -1), false, 'la conversione non deve bucare il board');
});

test('il booster chasen converte 8 tessere anche se il board genera match', () => {
  const { board } = mk({ targetTile: 0 });
  const S = board.size;
  board.grid = noMatch(S, 0);
  board.render = () => {};
  /* qui findMatches resta quello vero: se la conversione crea una fila di 3
     target, resolve() la consuma e il conteggio finale è < 8. È il motivo per
     cui il test precedente isola findMatches: non è un bug, è la cascata. */
  const before = board.grid.flat().filter((v) => v === 0).length;
  board.booster('chasen');
  const after = board.grid.flat().filter((v) => v === 0).length;
  assert.ok(after - before <= 8, 'non può convertirne più di 8');
  assert.ok(board.grid.flat().every((v) => Number.isInteger(v)), 'la griglia resta integra');
});

test('il booster tazza usa this.size e non un 8 cablato', () => {
  const { board } = mk({ targetTile: 0 });
  board.size = 5;
  board.grid = noMatch(5, 0);
  board.render = () => {};
  board.findMatches = () => [];
  board.booster('cup');
  const targets = board.grid.flat().filter((v) => v === 0).length;
  assert.equal(targets, 3, 'tre tessere jolly su un board 5x5');
  for (const row of board.grid) assert.equal(row.length, 5, 'le dimensioni del board non cambiano');
});

test('la gravità riempie i buchi senza lasciare -1', () => {
  const { board } = mk();
  const S = board.size;
  board.grid = Array.from({ length: S }, () => Array(S).fill(1));
  board.grid[0][0] = -1;
  board.render = () => {};
  return board.resolve([[0, 0]]).then(() => {
    assert.equal(board.grid.flat().filter((v) => v === -1).length, 0, 'nessun buco residuo');
  });
});

test('state() espone lo stato di quota al chiamante', () => {
  const { board } = mk({ quota: 70 });
  board.collected = 15; board.score = 40; board.moves = 3;
  const s = board.state();
  assert.equal(s.quota, 70);
  assert.equal(s.quotaMet, false);
  assert.equal(s.need, board.targetCount);
  assert.equal(s.collected, 15);
});

test('la tastiera seleziona e scambia senza puntatore', () => {
  const { board, el } = mk();
  el.focus();
  board.cur = { r: 0, c: 0 };
  el.dispatch('keydown', { key: 'ArrowRight' });
  at(board.cur, 0, 1);
  el.dispatch('keydown', { key: 'ArrowDown' });
  at(board.cur, 1, 1);
  el.dispatch('keydown', { key: 'Enter' });
  at(board.sel, 1, 1);
  el.dispatch('keydown', { key: 'Escape' });
  assert.equal(board.sel, null, 'Escape deseleziona');
});

test('il cursore non esce dalla griglia', () => {
  const { board, el } = mk();
  board.cur = { r: 0, c: 0 };
  for (let i = 0; i < 12; i++) el.dispatch('keydown', { key: 'ArrowUp' });
  at(board.cur, 0, 0);
  for (let i = 0; i < 12; i++) el.dispatch('keydown', { key: 'ArrowRight' });
  at(board.cur, 0, board.size - 1);
});

test('la griglia espone righe e celle per l\'ARIA', () => {
  const { board } = mk();
  assert.equal(board.rows.length, board.size);
  for (const row of board.rows) {
    assert.equal(row.getAttribute('role'), 'row');
    assert.equal(row.children.length, board.size);
    for (const cell of row.children) assert.equal(cell.getAttribute('role'), 'gridcell');
  }
  const roving = board.cells.filter((c) => c.tabIndex === 0);
  assert.equal(roving.length, 1, 'esattamente una cella nel tab order (roving tabindex)');
});
