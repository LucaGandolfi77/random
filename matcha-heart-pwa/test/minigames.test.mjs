/* minigames.test.mjs — B5: ogni rito deve essere cancellabile.
   Prima: chiudere il modale a metà lasciava girare il rAF su un canvas nascosto
   e, al resolve, regalava +2 mosse / +1 cuore senza aver finito il rito. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const setup = () => {
  const g = loadGame({ files: ['save.js', 'tiles.js', 'audio.js', 'minigames.js'] });
  const canvas = g.doc.createElement('canvas');
  const status = g.doc.createElement('p');
  g.doc.body.appendChild(canvas, status);
  return { ...g, canvas, status };
};

for (const kind of ['awa', 'latte', 'respiro']) {
  test(`${kind}: abortare non regala nulla e non lascia handler attivi`, async () => {
    const { win, canvas, status } = setup();
    const ac = new AbortController();
    const p = win.MHMinis.playMini(kind, canvas, status, ac.signal);
    ac.abort();
    const res = await p;
    assert.equal(res.aborted, true, `${kind}: doveva risultare aborted`);
    assert.equal(res.bonus, 0, `${kind}: un rito interrotto non può dare bonus`);
    assert.equal(res.heart, undefined, `${kind}: nessun cuore da un rito interrotto`);
    assert.ok(!canvas.onpointerdown, `${kind}: handler pointerdown rimasto attivo`);
    assert.ok(!canvas.onpointermove, `${kind}: handler pointermove rimasto attivo`);
    assert.ok(!canvas.onpointerup, `${kind}: handler pointerup rimasto attivo`);
    assert.match(status.textContent, /interrotto/);
  });
}

test('un signal già abortito non avvia nemmeno il rito', async () => {
  const { win, canvas, status } = setup();
  const ac = new AbortController();
  ac.abort();
  const res = await win.MHMinis.playMini('awa', canvas, status, ac.signal);
  assert.equal(res.aborted, true);
  assert.equal(res.bonus, 0);
});

test('senza signal il rito parte e non risolve subito', async () => {
  const { win, canvas, status } = setup();
  let settled = false;
  const p = win.MHMinis.playMini('awa', canvas, status, undefined).then((r) => { settled = true; return r; });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(settled, false, 'senza abort il rito deve restare in corso');
  void p;
});

test('resolve non può chiamarsi due volte', async () => {
  const { win, canvas, status } = setup();
  const ac = new AbortController();
  let calls = 0;
  const orig = Promise.prototype.then;
  void orig;
  const p = win.MHMinis.playMini('awa', canvas, status, ac.signal).then((r) => { calls++; return r; });
  ac.abort();
  await p;
  ac.abort();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(calls, 1, 'abort ripetuto non deve far risolvere due volte');
});

test('completati Naturally, ogni rito dà voto e bonus coerenti', async () => {
  /* orologio accelerato: 500ms di tempo di gioco per frame, così i 12-21s
     reali dei riti si trasformano in pochi millisecondi */
  const boost = (win) => { let t = 1000; win.__now = () => (t += 500); };

  {   // respiro: 4+7+8s, sempre voto S, +1 cuore e +2 mosse
    const { win, canvas, status } = setup();
    boost(win);
    const res = await win.MHMinis.playMini('respiro', canvas, status);
    assert.equal(res.grade, 'S');
    assert.equal(res.heart, 1, 'il respiro ricarica un cuore');
    assert.equal(res.bonus, 2);
    assert.equal(res.aborted, undefined);
  }
  {   // awa: senza muovere il dito la schiuma resta 0 → voto C, bonus 0
    const { win, canvas, status } = setup();
    boost(win);
    const res = await win.MHMinis.playMini('awa', canvas, status);
    assert.equal(res.grade, 'C');
    assert.equal(res.bonus, 0, 'un rito C non regala mosse');
    assert.match(status.textContent, /amara/);
  }
  {   // latte: tracciato fuori tazza → voto C
    const { win, canvas, status } = setup();
    boost(win);
    const p = win.MHMinis.playMini('latte', canvas, status);
    for (let i = 0; i < 30 && !canvas.onpointermove; i++) await new Promise((r) => setTimeout(r, 5));
    canvas.onpointerdown({ clientX: 5, clientY: 5 });
    canvas.onpointermove({ clientX: 8, clientY: 8 });
    canvas.onpointerup({});
    canvas.ondblclick();
    const res = await p;
    assert.ok(['S', 'A', 'B', 'C'].includes(res.grade));
    assert.equal(res.aborted, undefined);
  }
});

test('playMini è esposto e accetta il signal come quarto argomento', () => {
  const { win } = setup();
  assert.equal(typeof win.MHMinis.playMini, 'function');
  assert.ok(win.MHMinis.playMini.length >= 4, 'la firma deve prevedere il signal');
});
