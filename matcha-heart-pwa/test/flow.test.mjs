/* flow.test.mjs — integrazione: avvio reale dell'app e giocata di una tazza.
   È il test che avrebbe rivelato subito lo SyntaxError della v1.4.0:
   universes.js non veniva eseguito, window.MHU non esisteva e l'app moriva
   sulla riga di init. Qui si boota davvero e si gioca. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadGame } from './harness.mjs';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);

const boot = () => {
  const g = loadGame({ files });
  const $ = (id) => g.doc.getElementById(id);
  return { ...g, $ };
};

/* avvia un episodio preciso (serve per i livelli con quota di schiuma) */
const startEpisode = (g, $, id) => {
  win_universeOf(g, id);
  g.win.MHU.prog().unlocked = id;
  $('btn-start').click();
  $('story-choices').children[0].click();
  $('story-continue').click();
  return g.win.MH.board;
};
const win_universeOf = (g, id) => {
  const u = g.win.MHU.UNIVERSES.find((u) => u.story.some((e) => String(e.id) === String(id)));
  g.win.MH.save.universe = u.id;
  g.win.MHU.prog().unlocked = id;
};

const chooseAndPlay = (g, $) => {
  $('btn-start').click();
  const choices = $('story-choices').children.filter((b) => b.onclick);
  assert.ok(choices.length >= 2, 'la storia deve offrire due scelte');
  choices[0].click();
  $('story-continue').click();
  return g.doc.getElementById('board');
};

test('l\'app si avvia e costruisce la schermata di casa', () => {
  const { win, $ } = boot();
  assert.ok(win.MH, 'window.MH non esiste: app.js non è partito');
  assert.equal(win.MH.save.hearts, 5);
  assert.equal($('hud-hearts').textContent, '♥ 5');
  assert.equal($('hud-stars').textContent, '★ 0');
  assert.ok($('chapters').children.length > 0, 'la mappa dei capitoli è vuota');
  assert.ok($('tama-face').textContent.length > 0, 'Mugi non ha un volto');
  assert.ok($('univ-row').children.length === 4, 'il selettore deve offrire 4 universi');
  assert.equal($('tama-name').textContent, 'Mugi · Germoglio');
});

test('il tema dell\'universo viene applicato al body', () => {
  const { doc } = boot();
  assert.equal(doc.body.getAttribute('data-universe'), 'pioggia');
});

test('la catena view → mappa → storia → gioco funziona', () => {
  const { win, $ } = boot();
  $('btn-start').click();
  assert.ok($('view-map').classList.contains('active'), 'deve apparire la mappa');
  assert.ok($('story-modal').classList.contains('open'), 'deve aprirsi la storia');
  assert.ok($('story-title').textContent.length > 0);
  assert.equal($('story-choices').children.length, 2);

  $('story-choices').children[0].click();
  assert.ok($('story-continue').style.display === 'block' || $('story-continue').style.display === '',
    'il bottone "vai a servire" deve comparire dopo la scelta');

  $('story-continue').click();
  assert.ok(!$('story-modal').classList.contains('open'), 'la storia deve chiudersi');
  assert.ok($('view-game').classList.contains('active'), 'deve apparire la tavola');
});

test('la scelta viene registrata e applicata al livello successivo', () => {
  const { win, $ } = boot();
  $('btn-start').click();
  const eff = $('story-choices').children[0].textContent;
  assert.ok(eff.length > 0);
  $('story-choices').children[0].click();
  const prog = win.MHU.prog('pioggia');
  assert.equal(Object.keys(prog.choices).length, 1, 'la scelta deve essere salvata nel progress');
  const eff2 = $('story-choices').children[1];
  eff2.click();
  assert.equal(Object.keys(prog.choices).length, 1, 'la seconda scelta sovrascrive la prima');
});

test('B8: dopo un episodio con finaleNote il bottone avvia il livello giusto', () => {
  const { win, $ } = boot();
  /* prima un episodio normale, poi uno con finaleNote: il vecchio codice
     lasciava in vita l'handler del primo (i due id non hanno nulla a che fare) */
  win.MHU.prog('pioggia').unlocked = 1;
  $('btn-start').click();
  assert.equal($('story-kicker').textContent, 'Cap.1-1 · Il debito');

  win.MHU.prog('pioggia').unlocked = 25;      // finale con finaleNote
  $('btn-start').click();
  assert.equal($('story-kicker').textContent, 'Cap.5-5 · Finale');
  assert.equal($('story-choices').children.filter((b) => b.onclick).length, 2,
    'il finaleNote è un <p>, non una terza scelta');

  /* il bottone resta nascosto (le scelte sono finali), ma l'handler deve
     comunque puntare all'episodio 25 e non al primo */
  $('story-continue').onclick();
  assert.equal($('level-label').textContent, 'Cap.5-5 · Finale',
    'il bottone ha avviato il livello sbagliato: handler stantio');
});

test('avviare una tazza costa un cuore e lo HUD lo aggiorna', () => {
  const g = boot();
  const { win, $ } = g;
  assert.equal(win.MH.save.hearts, 5);
  chooseAndPlay(g, $);
  assert.equal(win.MH.save.hearts, 4, 'avviare una tazza deve costare un cuore');
  assert.equal($('hud-hearts').textContent, '♥ 4');
  assert.equal(win.MH.save.lastRefill > 0, true, 'il timer dei cuori riparte');
});

test('la tavola viene costruita 8x8 con ARIA completa', () => {
  const g = boot();
  const { $ } = g;
  chooseAndPlay(g, $);
  const b = $('board');
  assert.equal(b.children.length, 8, '8 righe');
  for (const row of b.children) {
    assert.equal(row.children.length, 8, '8 celle per riga');
    assert.equal(row.getAttribute('role'), 'row');
  }
  const tiles = b.children.flatMap((r) => r.children);
  assert.equal(tiles.length, 64);
  assert.equal(tiles.filter((t) => t.getAttribute('role') === 'gridcell').length, 64);
  assert.equal(tiles.filter((t) => t.getAttribute('aria-selected') === 'false').length, 64);
  assert.equal(tiles.filter((t) => t.tabIndex === 0).length, 1, 'roving tabindex: una sola cella nel tab order');
  assert.ok(tiles.every((t) => /^\d+,\d+ /.test(t.getAttribute('aria-label'))), 'ogni cella si descrive');
  /* nessun match già presente alla partenza: build() riprova finché non è pulita */
  const rows = b.children.map((r) => r.children.map((c) => c.textContent));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c + 2 < 8; c++) {
      assert.ok(!(rows[r][c] === rows[r][c + 1] && rows[r][c] === rows[r][c + 2]),
        `match orizzontale preesistente a ${r},${c}`);
    }
    if (r + 2 >= 8) continue;
    for (let c = 0; c < 8; c++) {
      assert.ok(!(rows[r][c] === rows[r + 1][c] && rows[r][c] === rows[r + 2][c]),
        `match verticale preesistente a ${r},${c}`);
    }
  }
});

test('il booster consuma l\'inventario e aggiorna lo stato', () => {
  const g = boot();
  const { win, $ } = g;
  chooseAndPlay(g, $);
  const before = win.MH.save.boosters.chasen;
  $('btn-booster-chasen').click();
  assert.equal(win.MH.save.boosters.chasen, before - 1, 'il booster deve essere scalato');
  $('btn-booster-chasen').click();
  assert.equal(win.MH.save.boosters.chasen, before - 2);
  win.MH.save.boosters.chasen = 0;
  $('btn-booster-chasen').click();
  assert.equal(win.MH.save.boosters.chasen, 0, 'a zero non deve andare in negativo');
});

test('il Diario elenca le lettere guadagnate', () => {
  const { win, $ } = boot();
  assert.match($('diary').innerHTML, /Nessuna lettera/);
  win.MHU.prog('pioggia').letters = ['Lettera 1 — prova', 'Lettera 2 — prova'];
  win.MHRenderDiary();
  const d = $('diary');
  assert.ok(d.children.length >= 2, 'le lettere devono comparire nel Diario');
  const txt = d.children.map((c) => c.textContent).join(' ');
  assert.match(txt, /Lettera 1/);
  assert.match(txt, /Ascoltami/, 'ogni lettera deve avere il bottone di ascolto');
});

test('i distintivi compaiono nel Diario appena earned', () => {
  const { win, $ } = boot();
  assert.ok(!/Distintivo/.test(JSON.stringify($('diary').children.map((c) => c.textContent))));
  win.MHSave.writeSave(win.MH.save);
  win.MHEggs.onRainTap();               // 1 tap: nessun distintivo
  for (let i = 0; i < 99; i++) win.MHEggs.onRainTap();
  win.MHEggs.onRainTap();               // 100esimo: "Amico della pioggia"
  const txt = $('diary').children.map((c) => c.textContent).join(' ');
  assert.match(txt, /Amico della pioggia/, 'B7: il distintivo deve comparire senza ricaricare la pagina');
});

test('il check-in umore registra e applica i bonus', () => {
  const { win, $ } = boot();
  const btns = $('mood-row').children.filter((b) => b.dataset && b.dataset.mood);
  assert.equal(btns.length, 3);
  const bene = btns.find((b) => b.dataset.mood === 'bene');
  bene.click();
  assert.equal(win.MH.save.mood.value, 'bene');
  assert.equal(bene.getAttribute('aria-pressed'), 'true', 'lo stato deve essere esposto all\'a11y');
  assert.ok(win.MH.save.mood.log.length > 0);
});

test('ricomincia azzera tutto e chiede se tenere Mugi', () => {
  const { win, $ } = boot();
  win.MH.save.stars = null;
  win.MHU.prog('pioggia').stars = { 1: 3, 2: 2 };
  win.MHU.prog('pioggia').letters = ['x'];
  win.MH.save.tama.name = 'Pippo';
  win.MH.save.tama.xp = 250;
  win.confirm = () => true;             // "ricominciare?" sì, "tenere Mugi?" sì
  $('btn-reset').click();
  const prog = win.MHU.prog('pioggia');
  assert.equal(prog.stars && Object.keys(prog.stars).length || 0, 0, 'le stelle devono azzerarsi');
  assert.equal(win.MH.save.hearts, 5);
  assert.equal(win.MH.save.tama.name, 'Pippo', 'Mugi deve sopravvivere se richiesto');
});

test('i due toggle di impostazione riflettono lo stato e aria-pressed', () => {
  const { win, $ } = boot();
  assert.equal($('btn-sound').getAttribute('aria-pressed'), 'true');
  $('btn-sound').click();
  assert.equal(win.MH.save.settings.sound, false);
  assert.equal($('btn-sound').getAttribute('aria-pressed'), 'false');
  $('btn-night').click();
  assert.equal($('btn-night').getAttribute('aria-pressed'), 'true');
});

test('la tabbar cambia vista e segna la tab corrente', () => {
  const { $ } = boot();
  const tabs = $('tabbar').children;
  assert.equal(tabs.length, 4);
  for (const t of tabs) {
    t.click();
    const target = t.dataset.tab;
    assert.ok($(target).classList.contains('active'), `${target} non è attiva dopo il click`);
    assert.equal(t.getAttribute('aria-current'), 'page', 'manca aria-current sulla tab attiva');
    for (const other of tabs) {
      if (other === t) continue;
      assert.equal(other.getAttribute('aria-current'), null, 'aria-current non rimosso dalle altre tab');
    }
  }
});

test('il tema notte si applica al body', () => {
  const { win, doc, $ } = boot();
  $('btn-night').click();
  assert.ok(doc.body.classList.contains('night'), 'manca la classe night');
  assert.equal(win.MH.save.settings.night, true);
});

test('tutti gli id toccati dal flusso esistono davvero', () => {
  const { $ } = boot();
  for (const id of ['btn-start', 'story-choices', 'story-continue', 'story-modal', 'view-game', 'view-map',
    'mini-modal', 'mini-start', 'mini-close', 'oracle-modal', 'oracle-close', 'btn-oracle', 'btn-reset',
    'btn-sound', 'btn-night', 'btn-breath-home', 'btn-rain', 'tama-face', 'tama-name', 'tama-meta',
    'btn-tama-cuddle', 'btn-tama-name', 'mood-row', 'chapters', 'diary', 'univ-row', 'level-label',
    'hud-hearts', 'hud-stars', 'home-progress', 'board', 'toast', 'sr-status', 'combo', 'fessura']) {
    assert.ok($(id), `manca #${id}`);
  }
});

test('gli script caricati sono davvero tutti quelli dichiarati', () => {
  const onDisk = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual([...files].sort(), onDisk);
});

/* ── fine partita: il percorso che gira dopo ogni vittoria ── */

test('vincere una tazza assegna stelle, lettera, avanza e nutre il cucciolo', async () => {
  const g = boot();
  const { win, $ } = g;
  chooseAndPlay(g, $);

  const board = win.MH.board;
  assert.ok(board, 'window.MH.board non è esposto');

  /* forziamo la vittoria: il board non deve accettare altri scambi, quindi
     pilotiamo collected/score e lasciamo che sia checkEnd a dichiarare la fine */
  board.collected = board.targetCount;
  board.score = 70;
  board.checkEnd();

  const prog = win.MHU.prog();
  assert.equal(prog.stars[1], 3, 'schiuma 70% con mosse rimaste = 3 stelle');
  assert.equal(prog.totalStars, 3);
  assert.equal(prog.letters.length, 1, 'la lettera del capitolo va nel Diario');
  assert.equal(prog.unlocked, 2, 'il livello successivo si sblocca');
  assert.ok(win.MH.save.tama.xp > 0, 'il cucciolo va nutrito');
  assert.equal($('btn-story-after').style.display, 'block', 'compare il bottone per rileggere la memoria');
  assert.match($('btn-story-after').textContent, /★/);
});

test('la mappa e il Diario si aggiornano dopo la vittoria', () => {
  const g = boot();
  const { win, $ } = g;
  chooseAndPlay(g, $);
  win.MH.board.collected = win.MH.board.targetCount;
  win.MH.board.score = 70;
  win.MH.board.checkEnd();
  const done = $('chapters').children.flatMap((c) => c.children).flatMap((r) => r.children)
    .filter((b) => b.classList.contains('done'));
  assert.ok(done.length >= 1, 'l\'episodio vinto deve risultare completato in mappa');
  assert.match($('diary').textContent, /Ascoltami/, 'la lettera deve comparire subito nel Diario');
});

test('B12: bersaglio centrato ma schiuma sotto quota dà 1 stella, non una sconfitta secca', () => {
  const g = boot();
  const { win, $ } = g;
  /* un episodio con quota reale: il Cap.1 non ne ha, quindi prendiamo il primo
     livello che ce l'ha (Cap.8-1, quota 55%) */
  const withQuota = win.MHU.UNIVERSES.find((u) => u.id === 'pioggia').story.find((e) => e.level.quota > 0);
  assert.ok(withQuota, 'nessun episodio con quota: il test non avrebbe senso');
  const b = startEpisode(g, $, withQuota.id);
  assert.equal(b.quota, withQuota.level.quota);

  b.collected = b.targetCount;      // bersaglio centrato
  b.score = Math.max(0, b.quota - 20);
  b.moves = 0;
  win.confirm = () => false;
  b.checkEnd();

  const prog = win.MHU.prog();
  assert.equal(prog.stars[withQuota.id], 1, 'bersaglio centrato = almeno 1 stella');
  assert.equal(prog.letters.length, 1, 'la lettera non si perde');
  assert.equal(win.MH.save.hearts, 5, 'il cuore rimborsato riporta a 5');
  assert.match($('toast').textContent, /schiuma/i, 'il messaggio deve dire perché');
});

test('stessa situazione ma senza bersaglio: sconfitta, zero stelle, cuore rimborsato', () => {
  const g = boot();
  const { win, $ } = g;
  const withQuota = win.MHU.UNIVERSES.find((u) => u.id === 'pioggia').story.find((e) => e.level.quota > 0);
  const b = startEpisode(g, $, withQuota.id);
  b.collected = 1;
  b.moves = 0;
  win.confirm = () => false;
  b.checkEnd();
  const prog = win.MHU.prog();
  assert.equal(prog.stars[withQuota.id], undefined, 'nessuna stella senza bersaglio');
  assert.equal(prog.letters.length, 0, 'nessuna lettera senza bersaglio');
  assert.equal(win.MH.save.hearts, 5);
});

test('perdere senza bersaglio non dà stelle ma rimborsa il cuore', () => {
  const g = boot();
  const { win, $ } = g;
  chooseAndPlay(g, $);
  const b = win.MH.board;
  b.collected = 1;
  b.moves = 0;
  win.confirm = () => false;
  b.checkEnd();
  const prog = win.MHU.prog();
  assert.equal(prog.stars[1], undefined, 'nessuna stella se il bersaglio non è centrato');
  assert.equal(win.MH.save.hearts, 5);
});

test('il bottone del rito apre il rito dichiarato dall\'episodio', () => {
  const TITLES = { awa: 'Rito Awa', latte: 'Latte-Art', respiro: 'Respiro' };
  for (const mini of ['awa', 'latte', 'respiro']) {
    const g = boot();
    const { win, $ } = g;
    const ep = win.MHU.UNIVERSES.flatMap((u) => u.story).find((e) => e.level.mini === mini);
    assert.ok(ep, `nessun episodio usa il rito "${mini}"`);
    startEpisode(g, $, ep.id);
    $('btn-minigame').click();
    assert.match($('mini-title').textContent, new RegExp(TITLES[mini].split(' ')[0]),
      `per il rito "${mini}" il titolo dice "${$('mini-title').textContent}"`);
    $('mini-close').click();
  }
});

test('il boost di umore accoda tessere amiche e non rompe nulla', () => {
  const g = boot();
  const { win, $ } = g;
  $('mood-row').children.find((b) => b.dataset.mood === 'ansiosa').click();
  chooseAndPlay(g, $);
  const b = win.MH.board;
  assert.equal(b.grid.length, 8, 'il board deve essere integro dopo sweetenBoardForMood');
  assert.ok(b.grid.flat().every((v) => Number.isInteger(v)), 'nessuno zero o buco nella griglia');
  assert.ok(b.grid.flat().filter((v) => v === 3).length >= 3, 'Yuzu aggiunti dal mood ansioso');
});
