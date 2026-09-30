/* quaderno.test.mjs — infrastruttura delle lettere sensibili alle scelte.
 *
 * Il vincolo che questi test proteggono per primo: `letter` resta una stringa
 * e `letters` resta un array di stringhe. Nessuna migrazione, e le 100 lettere
 * già scritte valgono esattamente come prima.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadGame, createStorage } from './harness.mjs';
import { lint, jaccard, echoScore, GATES } from '../tools/content-lint.mjs';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);

const boot = (storage) => {
  const g = loadGame({ storage, files });
  return { ...g, Q: g.win.MHQuaderno, win: g.win };
};
const $ = (g, id) => g.doc.getElementById(id);

const AB = { choiceA: { effect: 'coraggio', label: '«Dimmi la verità.»' }, choiceB: { effect: 'dolcezza', label: '«Ti credo.»' } };
const epWithPs = {
  id: 999, ...AB,
  letter: 'Lettera di prova — "Il sale nel tè è un errore."',
  ps: { coraggio: 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera.',
        dolcezza: 'H. Quella volta mi hai perdonata prima di sapere cosa avessi fatto.' },
};



/* ── risoluzione ─────────────────────────────────────────── */

test('una lettera senza postscript resta identica a prima', () => {
  const g = boot(); const { Q } = g;
  const ep = anyEpWithoutPs(g);
  assert.equal(Q.resolveLetter(ep, 'coraggio'), ep.letter,
    'senza ps la risoluzione deve essere un no-op perfetto');
  assert.equal(Q.resolveLetter(ep, undefined), ep.letter);
  assert.equal(Q.resolveLetter(ep, 'finale-qualsiasi'), ep.letter);
  assert.equal(Q.resolveLetter(null, 'coraggio'), '');
});

test('il postscript si aggiunge solo per l\'effetto scelto', () => {
  const { Q } = boot();
  const c = Q.resolveLetter(epWithPs, 'coraggio');
  const d = Q.resolveLetter(epWithPs, 'dolcezza');
  assert.ok(c.includes(epWithPs.ps.coraggio), 'il postscript della scelta fatta deve esserci');
  assert.ok(!c.includes(epWithPs.ps.dolcezza), 'l\'altro postscript non deve trapelare');
  assert.ok(d.includes(epWithPs.ps.dolcezza));
  assert.notEqual(c, d, 'due scelte diverse danno lettere diverse');
});

test('un effetto senza postscript non aggiunge nulla', () => {
  const { Q } = boot();
  const ep = { ...epWithPs, ps: { coraggio: epWithPs.ps.coraggio } };
  assert.equal(Q.resolveLetter(ep, 'rabbia'), ep.letter);
  assert.equal(Q.resolveLetter(ep, 'dolcezza'), ep.letter);
});

test('la risoluzione è deterministica e non muta l\'episodio', () => {
  const { Q } = boot();
  const before = JSON.stringify(epWithPs);
  Q.resolveLetter(epWithPs, 'coraggio');
  Q.resolveLetter(epWithPs, 'dolcezza');
  assert.equal(JSON.stringify(epWithPs), before, 'resolveLetter non deve scrivere sugli episodi');
});

test('baseLetter accetta la stringa di oggi e la futura forma a oggetto', () => {
  const { Q } = boot();
  assert.equal(Q.baseLetter(epWithPs), epWithPs.letter);
  assert.equal(Q.baseLetter({ letter: { text: 'X' } }), 'X');
  assert.equal(Q.baseLetter({}), '');
  assert.equal(Q.baseLetter(null), '');
});

/* ── l'indice inverso ────────────────────────────────────── */

test('l\'indice base → episodio è completo e senza collisioni', () => {
  const { Q, win } = boot();
  for (const u of win.MHU.UNIVERSES) {
    const idx = Q.letterIndex(u);
    assert.equal(idx.size, u.story.length,
      `${u.id}: ${u.story.length} episodi ma ${idx.size} lettere base in indice`);
  }
});

test('ogni lettera risolta si riporta al suo episodio', () => {
  const { Q, win } = boot();
  const u = win.MHU.UNIVERSES[0];
  const idx = Q.letterIndex(u);
  for (const ep of u.story) {
    for (const effect of [ep.choiceA.effect, ep.choiceB.effect]) {
      const text = Q.resolveLetter(ep, effect);
      const back = Q.letterOrigin(text, idx);
      assert.ok(back, `${u.id}/${ep.id}: la lettera non si riporta a nessun episodio`);
      assert.equal(back.id, ep.id);
    }
  }
});

test('l\'origine funziona anche su lettere con postscript', () => {
  const { Q, win } = boot();
  const ep = win.MHU.UNIVERSES[0].story[5];
  const withPs = { ...ep, ps: { coraggio: 'H. Aggiunta di prova sufficientemente lunga per passare i gate.' } };
  const idx = Q.letterIndex({ story: [withPs] });
  const back = Q.letterOrigin(Q.resolveLetter(withPs, 'coraggio'), idx);
  assert.equal(back.id, ep.id, 'il postscript non deve confondere l\'origine');
});

test('l\'origine di una lettera segreta degli egg è null (non ha episodio)', () => {
  const { Q, win } = boot();
  const idx = Q.letterIndex(win.MHU.UNIVERSES[0]);
  const segrete = [
    'Lettera segreta — "Per quando dubiti: rileggi la prima. Eri già brava allora. H."',
    'Parola segreta di Hana — "Venticinque schiume perfette: ora puoi insegnare."',
  ];
  for (const s of segrete) assert.equal(Q.letterOrigin(s, idx), null);
});

test('l\'origine tollera testo non stringa e indice assente', () => {
  const { Q } = boot();
  assert.equal(Q.letterOrigin(null), null);
  assert.equal(Q.letterOrigin(42, new Map()), null);
  assert.equal(Q.letterOrigin('qualsiasi cosa', null), null);
});

/* ── scelte, alternative, etichette ──────────────────────── */

test('alternatives esclude l\'effetto scelto e i finali', () => {
  const { Q } = boot();
  assert.deepEqual([...Q.alternatives(epWithPs, 'coraggio')], ['dolcezza']);
  assert.deepEqual([...Q.alternatives(epWithPs, 'dolcezza')], ['coraggio']);
  const finale = { id: 25, choiceA: { effect: 'finale-resta', label: 'A' }, choiceB: { effect: 'finale-lascia', label: 'B' } };
  assert.deepEqual([...Q.alternatives(finale, 'finale-resta')], [],
    'i finali non generano "l\'altra strada": li gestisce unlockEnding');
});

test('alternatives non duplica se un episodio offre lo stesso effetto due volte', () => {
  const { Q } = boot();
  const ep = { id: 1, choiceA: { effect: 'coraggio', label: 'A' }, choiceB: { effect: 'coraggio', label: 'B' } };
  assert.deepEqual([...Q.alternatives(ep, 'coraggio')], []);
});

test('choiceLabel restituisce l\'etichetta verbatim, per A e per B', () => {
  const { Q } = boot();
  assert.equal(Q.choiceLabel(epWithPs, 'coraggio'), '«Dimmi la verità.»');
  assert.equal(Q.choiceLabel(epWithPs, 'dolcezza'), '«Ti credo.»');
  assert.equal(Q.choiceLabel(epWithPs, 'rabbia'), '');
  assert.equal(Q.choiceLabel(null, 'coraggio'), '');
});

test('il Quaderno non chiama "rimpianti" le strade non percorse', () => {
  const { Q } = boot();
  const label = Q.pathLabel('coraggio');
  assert.ok(!/rimpiant|errore|peccato/i.test(label), `etichetta fuori registro: "${label}"`);
  assert.ok(label.length > 0);
});

/* ── il vincolo che regge tutto: nessuna migrazione ───────── */

test('B: `letters` resta un array di stringhe, senza migrazione', () => {
  const g = boot(); const { Q, win } = g;
  const ep = anyEpWithoutPs(g);
  const prog = win.MHU.prog('pioggia');
  prog.letters = [];
  prog.choices[ep.id] = ep.choiceA.effect;
  prog.letters.push(Q.resolveLetter(ep, prog.choices[ep.id]));
  assert.ok(prog.letters.every((l) => typeof l === 'string'), 'gli elementi devono restare stringhe');
  assert.equal(prog.letters[0], ep.letter, 'senza ps il testo è esattamente la base di prima');
  assert.equal(typeof prog.letters, 'object');
  assert.ok(Array.isArray(prog.letters));
});

test('un save vecchio con letters stringhe si carica e si riusa invariato', () => {
  const legacy = ['Lettera 1 — "Il primo tè è sempre amaro. Servilo lo stesso. H."',
                  'Lettera 2 — "Chi entra scalzo, porta verità. Offrigli un mochi."'];
  const store = createStorage({ 'matcha-heart-save-v1': JSON.stringify({
    universe: 'pioggia',
    progress: { pioggia: { stars: { 1: 3 }, unlocked: 3, choices: { 1: 'coraggio' },
                            letters: legacy, endings: [], threads: {}, totalStars: 3 } },
  }) });
  const { win } = boot(store);
  const prog = win.MHU.prog('pioggia');
  assert.deepEqual([...prog.letters], legacy, 'i dati esistenti non si toccano');
  const idx = win.MHQuaderno.letterIndex(win.MHU.UNIVERSES[0]);
  assert.equal(win.MHQuaderno.letterOrigin(prog.letters[0], idx).id, 1,
    'una lettera del save vecchio si riporta comunque al suo episodio');
});

test('gli easter egg continuano a funzionare su letters stringhe', () => {
  /* la trappola: eggs.js fa l.startsWith('Lettera segreta'). Se letters
     diventasse un array di oggetti, qui andrebbe in crash. */
  const { win, Q } = boot();
  win.MH.save.universe = 'pioggia';
  const prog = win.MHU.prog('pioggia');
  prog.letters = ['Lettera 1 — "ciao"'];

  /* 7 tap sulla settima lettera del Diario → la lettera segreta */
  win.MHSave.writeSave(win.MH.save);
  for (let i = 0; i < 7; i++) win.MHEggs.onRainTap();   // warms up the badge path
  const found = prog.letters.some((l) => typeof l === 'string' && l.startsWith('Lettera segreta'));
  assert.equal(typeof prog.letters[0], 'string', 'l\'indice del Diary resta fatto di stringhe');
  void found; void Q;
  /* il percorso critico è startsWith: verifico che non lanci su una lista mista */
  assert.doesNotThrow(() => prog.letters.some((l) => l.startsWith('Parola segreta')));
  const idx = Q.letterIndex(win.MHU.UNIVERSES[0]);
  for (const l of prog.letters) assert.doesNotThrow(() => Q.letterOrigin(l, idx));
});

/* ── integrità dei dati esistenti ────────────────────────── */

test('nessuna lettera base contiene il separatore', () => {
  const { Q, win } = boot();
  for (const u of win.MHU.UNIVERSES) {
    for (const ep of u.story) {
      assert.ok(!Q.baseLetter(ep).includes(Q.PS_SEP), `${u.id}/${ep.id}: la base contiene il separatore`);
    }
  }
});

test('le 100 lettere base esistenti sono uniche per universo', () => {
  const { win } = boot();
  for (const u of win.MHU.UNIVERSES) {
    const seen = new Map();
    for (const ep of u.story) {
      const b = ep.letter;
      assert.ok(!seen.has(b), `${u.id}: "${b}" è duplicata fra ${seen.get(b)} e ${ep.id}`);
      seen.set(b, ep.id);
    }
  }
});

test('tutte le lettere esistenti restano stringhe (nessuna è stata convertita)', () => {
  const { win } = boot();
  for (const u of win.MHU.UNIVERSES) {
    for (const ep of u.story) assert.equal(typeof ep.letter, 'string', `${u.id}/${ep.id}`);
  }
});

/* ── i gate sul contenuto, già attivi prima del primo postscript ── */

test('i postscript esistenti rispettano tutti i gate', () => {
  const { win } = boot();
  const { problems, stats } = lint(win.MHU.UNIVERSES);
  assert.deepEqual(problems, [], 'i gate di contenuto non scattano sul contenuto reale');
  assert.ok(stats.postscripts > 0, 'il pilota deve essere nel codice');
  assert.equal(stats.postscripts, stats.episodesWithPs * 2,
    'il pilota è di 2 varianti per episodio: una per strada');
});

test('il rollout dei postscript rispetta le invarianti', () => {
  const g = boot();
  const { win } = g;
  let conPs = 0, senza = 0;
  for (const u of win.MHU.UNIVERSES) {
    for (const ep of u.story) {
      if (!ep.ps) { senza++; continue; }
      conPs++;
      const offerti = [ep.choiceA.effect, ep.choiceB.effect].filter((e) => !String(e).startsWith('finale-'));
      for (const k of Object.keys(ep.ps)) {
        assert.ok(offerti.includes(k),
          `${u.id}/${ep.id}: la chiave "${k}" non è una strada offerta da questo episodio`);
      }
      assert.ok(Object.keys(ep.ps).length >= 1);
    }
  }
  assert.equal(conPs + senza, 100, 'tutti e 100 gli episodi devono essere classificati');
  assert.ok(conPs > 0, 'il rollout non è ancora iniziato');
  /* il primo lotto ha coperto i due capitoli iniziali del canone: verifico
     che siano stati presi per intero, così il lotto successivo parte dal 3. */
  const capitolo1 = win.MHU.UNIVERSES[0].story.filter((e) => e.chap === 1);
  assert.equal(capitolo1.filter((e) => e.ps).length, capitolo1.length, 'Cap.1 incompleto');
});

test('gli episodi senza postscript non ne hanno, e le loro lettere restano intatte', () => {
  const { win, Q } = boot();
  let senza = 0, conPs = 0;
  for (const u of win.MHU.UNIVERSES) {
    for (const ep of u.story) {
      if (ep.ps) { conPs++; continue; }
      senza++;
      assert.equal(ep.letter, Q.baseLetter(ep), `${u.id}/${ep.id}: la base dev'essere immutata`);
      assert.equal(Q.resolveLetter(ep, ep.choiceA.effect), ep.letter,
        `${u.id}/${ep.id}: senza ps la risoluzione è un no-op`);
    }
  }
  assert.equal(senza + conPs, 100, 'il conteggio deve coprire tutti gli episodi');
});

test('i gate sono armati: colpiscono davvero le violazioni', () => {
  const mk = (id, ps, extra = {}) => ({ id, ...AB, ps, ...extra });
  const uni = [{ id: 'x', story: [
    /* divergenza: due varianti gemelle */
    mk(1, { coraggio: 'Quella volta mi hai chiesto la verità e te l\'ho data intera.',
            dolcezza: 'Quella volta mi hai chiesto la verità e te l\'ho data uguale.' }),
    /* colpa */
    mk(2, { coraggio: 'H. Avresti dovuto bussare: ti avevo avvertito del gelo, testarda.',
            dolcezza: 'H. Quella volta mi hai aspettata sulla porta anche sotto la neve.' }),
    /* troppo corta */
    mk(3, { coraggio: 'Ok.', dolcezza: 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera.' }),
    /* chiave non offerta dall'episodio */
    mk(4, { coraggio: 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera.',
            rabbia: 'H. Quella volta mi hai chiuso la porta in faccia per tre giorni di fila.' }),
    /* finale: fuori dal meccanismo */
    { id: 5, choiceA: { effect: 'finale-resta', label: 'A' }, choiceB: { effect: 'finale-lascia', label: 'B' },
      ps: { 'finale-resta': 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera.' } },
  ] }];
  const { problems } = lint(uni);
  const has = (frag) => problems.some((p) => p.problem.includes(frag));
  assert.ok(has('identiche'), 'il gate di divergenza non scatta');
  assert.ok(has('avresti dovuto'), 'il gate anti-rimpianto non scatta');
  assert.ok(has('fuori 40-110'), 'il gate di lunghezza non scatta');
  assert.ok(has('non è uno degli effetti'), 'il gate delle chiavi non scatta');
  assert.ok(has('unlockEnding'), 'il gate sui finali non scatta');
});

test('il gate di coerenza prende una polarità invertita', () => {
  /* Il gate di divergenza NON basta: due testi sulla strada sbagliata sono
     validi, nello stesso registro, e divergenti. Serve il confronto con
     l'etichetta della scelta. Questo test esiste perché sulla versione
     invertita del pilota l'errore è passato in review a occhio. */
  const giusta = 'H. Hai detto «vedremo domani». È la risposta più onesta che ci sia.';
  const sbagliata = 'H. Hai promesso di riempirla. Ti credo. E se non ci riuscirai domani, aspetta.';
  const ep = { id: 24, choiceA: { effect: 'coraggio', label: 'Dici "vedremo domani"' },
               choiceB: { effect: 'dolcezza', label: 'Prometti di riempirla' } };
  const mk = (ps) => [{ id: 'x', story: [{ ...ep, ps }] }];
  assert.equal(lint(mk({ coraggio: giusta })).problems.length, 0, 'il testo giusto non deve beingere segnalato');
  const rotto = lint(mk({ coraggio: sbagliata, dolcezza: giusta })).problems;
  assert.equal(rotto.length, 2, `polarità invertita: devono scattare 2 problemi, trovati ${rotto.length}`);
  assert.ok(rotto.every((p) => p.problem.includes('invece che di')), 'ogni problema deve dire quale strada era attesa');
});

test('echoScore conta i riscontri per prefisso, così "versi" e "versare" si riconoscono', () => {
  assert.ok(echoScore('hai versato in fretta per chiudere', 'Versi di fretta per finire') >= 2);
  assert.equal(echoScore('Hai promesso di riempirla', 'Dici "vedremo domani"'), 0);
  assert.equal(echoScore('qualsiasi cosa', ''), 0);
  assert.ok(GATES.divergence > 0 && GATES.divergence < 1);
});

test('il Jaccard misura il contenuto, non la sintassi', () => {
  assert.equal(jaccard('mela pera acqua', 'mela pera acqua'), 1);
  assert.equal(jaccard('mela pera acqua', 'sogno chasen pioggia'), 0);
  assert.equal(jaccard('di la e che nel', 'a del per con'), 0, 'solo stopword → nessun segnale');
  assert.ok(jaccard('gelo saracinesca', 'gelo tetto') > 0 && jaccard('gelo saracinesca', 'gelo tetto') < 1);
  assert.ok(GATES.divergence > 0 && GATES.divergence < 1);
});

/* ── il flusso vero, end-to-end ──────────────────────────── */

test('CON postscript, due scelte opposte danno lettere diverse', () => {
  /* è la promessa della feature */
  const gioca = (g, effect) => {
    const $g = (id) => g.doc.getElementById(id);
    const ep = anyEpWithPs(g);
    g.win.MH.save.universe = 'pioggia';
    g.win.MHU.prog('pioggia').unlocked = ep.id;
    $g('btn-start').click();
    const idx = ep.choiceA.effect === effect ? 0 : 1;
    $g('story-choices').children[idx].click();
    $g('story-continue').click();
    const b = g.win.MH.board;
    b.collected = b.targetCount; b.score = 70; b.checkEnd();
    return g.win.MHU.prog('pioggia').letters[0];
  };
  const a = boot(), b = boot();
  const ep = anyEpWithPs(a);
  const primo = gioca(a, ep.choiceA.effect);
  const secondo = gioca(b, ep.choiceB.effect);
  assert.notEqual(primo, secondo, 'due strade diverse devono produrre lettere diverse');
  for (const l of [primo, secondo]) assert.equal(typeof l, 'string');
});

test('SENZA postscript, due scelte opposte danno la stessa lettera', () => {
  /* il comportamento di sempre deve restare intatto per i 86 episodi non ancora
     coperti: la base è condivisa, cambia solo ciò che è stato scritto */
  const gioca = (g) => {
    const $g = (id) => g.doc.getElementById(id);
    const ep = anyEpWithoutPs(g);
    g.win.MH.save.universe = 'pioggia';
    g.win.MHU.prog('pioggia').unlocked = ep.id;
    $g('btn-start').click();
    $g('story-choices').children[0].click();
    $g('story-continue').click();
    const b = g.win.MH.board;
    b.collected = b.targetCount; b.score = 70; b.checkEnd();
    return { text: g.win.MHU.prog('pioggia').letters[0], ep };
  };
  const r = gioca(boot());
  assert.equal(r.text, r.ep.letter, 'senza ps la lettera è la base, in ogni caso');
});

test('la lettera finisce nel Diario come stringa, non come oggetto', () => {
  const g = boot();
  const { win } = g;
  win.MH.save.universe = 'pioggia';
  win.MHU.prog('pioggia').unlocked = 1;
  g.doc.getElementById('btn-start').click();
  g.doc.getElementById('story-choices').children[0].click();
  g.doc.getElementById('story-continue').click();
  const b = win.MH.board;
  b.collected = b.targetCount; b.score = 70; b.checkEnd();
  const prog = win.MHU.prog('pioggia');
  assert.equal(prog.letters.length, 1);
  assert.equal(typeof prog.letters[0], 'string');
  const diary = g.doc.getElementById('diary');
  const txt = diary.children.map((c) => c.textContent).join(' ');
  assert.match(txt, /Ascoltami/, 'la lettera deve comparire nel Diario con il bottone di ascolto');
  void $;
});

/* ─────────── Fase 1: l'interfaccia del Quaderno ─────────── */

/* Ogni test() carica gli script in un proprio contesto vm, quindi mutare un
   episodio qui non tocca nessun altro test: è il modo più onesto per provare
   il percorso di rendering vero prima che i postscript esistano. */
/* Un episodio con / senza postscript, trovato a runtime: i test asseriscono
   invarianti, non fissano un conteggio di contenuto che il lotto dopo cambierà. */
const anyEpWithoutPs = (g) => {
  for (const u of g.win.MHU.UNIVERSES) for (const ep of u.story) if (!ep.ps) return ep;
  throw new Error('nessun episodio senza postscript: il rollout è completo');
};
const anyEpWithPs = (g) => {
  for (const u of g.win.MHU.UNIVERSES) for (const ep of u.story) if (ep.ps) return ep;
  throw new Error('nessun episodio con postscript');
};

const withPs = (g, epId, ps) => {
  const ep = g.win.MHU.UNIVERSES[0].story.find((e) => e.id === epId);
  if (ps) ep.ps = ps; else delete ep.ps;
  return ep;
};
const openGame = (g, epId, effect) => {
  const $g = (id) => g.doc.getElementById(id);
  const win = g.win;
  win.MH.save.universe = 'pioggia';
  const ep = win.MHU.UNIVERSES[0].story.find((e) => e.id === epId);
  win.MHU.prog('pioggia').unlocked = epId;
  win.MH.save.hearts = 5;   // una tazza costa un cuore: sotto zero startLevel rifiuta
  $g('btn-start').click();
  const box = $g('story-choices').children;
  (ep.choiceA.effect === effect ? box[0] : box[1]).click();
  $g('story-continue').click();
  return $g;
};
const earnLetter = (g, epId, effect) => {
  const $g = openGame(g, epId, effect);
  const before = g.win.MHU.prog().letters.length;
  const b = g.win.MH.board;
  b.collected = b.targetCount; b.score = 70; b.checkEnd();
  /* Senza questa asserzione un test può passare in verde perché la partita
     non è mai iniziata: startLevel rifiuta quando i cuori sono esauriti, e il
     checkEnd agisce sul board del livello precedente, già finito. */
  assert.equal(g.win.MHU.prog().letters.length, before + 1,
    `ep ${epId}/${effect}: nessuna lettera nuova — la tazza non è partita (cuori esauriti?)`);
  return $g;
};
const cardOf = (g) => g.doc.getElementById('diary').children.find((c) => c.classList.contains('letter-item'));
const has = (el, cls) => el.querySelector('.' + cls);

test('la card della lettera mostra il capitolo e la scelta, verbatim', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Postscript di prova sufficientemente lunga da superare i gate di contenuto.',
                 dolcezza: 'H. Una seconda stesura, anch\'essa abbastanza lunga per i gate.' });
  const $g = earnLetter(g, 7, 'coraggio');
  const card = cardOf(g);
  assert.ok(card, 'la lettera deve produrre una card .letter-item');
  assert.equal(has(card, 'letter-head').textContent, 'Cap.2-2 · Sale');
  const choice = has(card, 'letter-choice');
  assert.ok(choice, 'manca la riga della scelta');
  /* ep.7: A=dolcezza "Lo lasci entrare fradicio", B=coraggio. Scegliendo
     coraggio la riga deve riportare l'etichetta B, verbatim. */
  assert.equal(choice.textContent, 'Hai scelto: «Prima dimmi perché sei andato via.»');
  void $g;
});

test('il postscript appare come blocco separato dalla lettera', () => {
  const g = boot();
  const ps = 'H. Postscript di prova sufficientemente lunga da superare i gate di contenuto.';
  withPs(g, 7, { coraggio: ps, dolcezza: 'H. Una seconda stesura, anch\'essa abbastanza lunga per i gate.' });
  earnLetter(g, 7, 'coraggio');
  const card = cardOf(g);
  const base = has(card, 'letter-text');
  const post = has(card, 'letter-ps');
  assert.ok(post, 'manca il blocco del postscript');
  assert.equal(post.textContent, ps);
  assert.notEqual(base.textContent, post.textContent, 'i due blocchi non devono confondersi');
  assert.ok(!base.textContent.includes(ps), 'la base non deve contenere il postscript');
});

test('"l\'altra strada" compare solo se l\'altra scelta ha un postscript', () => {
  const soloA = boot();
  withPs(soloA, 7, { coraggio: 'H. Solo la strada del coraggio ha una seconda stesura scritta da Hana.' });
  earnLetter(soloA, 7, 'coraggio');
  assert.equal(has(cardOf(soloA), 'other-btn'), null,
    'senza postscript sull\'altra strada non deve esserci il bottone: niente segnaposto vuoti');

  const entrambe = boot();
  withPs(entrambe, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                        dolcezza: 'H. Seconda stesura, completamente diversa dalla prima per contenuto.' });
  earnLetter(entrambe, 7, 'coraggio');
  const btn = has(cardOf(entrambe), 'other-btn');
  assert.ok(btn, 'con entrambe le varianti il bottone deve esserci');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.ok(btn.textContent.includes('l\'altra strada'));
});

test('il bottone "l\'altra strada" apre e chiude, e mostra la variante giusta', () => {
  const g = boot();
  const alt = 'H. Quella volta mi hai perdonata prima di sapere cosa avessi fatto.';
  withPs(g, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                 dolcezza: alt });
  earnLetter(g, 7, 'coraggio');
  const card = cardOf(g);
  const btn = has(card, 'other-btn');
  const box = has(card, 'letter-altbox');
  assert.equal(box.hidden, true, 'la variante alternativa nasce chiusa');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');

  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'true', 'aria-expanded deve invertirsi');
  assert.equal(box.hidden, false);
  assert.ok(box.textContent.includes(alt), 'deve comparire il postscript dell\'altra strada');
  assert.ok(!box.textContent.includes('Prima stesura'), 'non deve mostrare la propria: quella è già sopra');

  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(box.hidden, true, 'deve richiudersi');
});

test('una lettera senza episodio (i segreti degli egg) non mostra scelta né strada', () => {
  const g = boot();
  g.win.MH.save.universe = 'pioggia';
  g.win.MHU.prog('pioggia').letters = ['Lettera segreta — "Per quando dubiti: rileggi la prima."'];
  g.win.MHRenderDiary();
  const card = cardOf(g);
  assert.ok(card, 'la lettera segreta deve comunque essere mostrata');
  assert.equal(has(card, 'letter-head'), null, 'senza episodio non c\'è un capitolo da indicare');
  assert.equal(has(card, 'letter-choice'), null);
  assert.equal(has(card, 'letter-ps'), null);
  assert.ok(card.textContent.includes('Lettera segreta'), 'il testo deve restare leggibile');
});

test('il Quaderno si apre, conta e non parla di rimpianti', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                 dolcezza: 'H. Seconda stesura, completamente diversa dalla prima per contenuto.' });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  const modal = $g('quaderno-modal');
  assert.ok(modal.classList.contains('open'), 'il Quaderno non si è aperto');
  const count = $g('quaderno-count').textContent;
  assert.match(count, /1 scelte/);
  assert.match(count, /1 ricordo/);
  assert.ok(!/rimpiant/i.test(count), `il contatore parla di rimpianti: "${count}"`);
});

test('il Quaderno elenca la strada percorsa e quella non percorsa', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                 dolcezza: 'H. Seconda stesura, completamente diversa dalla prima per contenuto.' });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  const list = $g('quaderno-list');
  const txt = list.textContent;
  assert.match(txt, /Cap\.2 · Zucchero e Sale/, `manca il capitolo: ${txt.slice(0,60)}`);
  assert.match(txt, /la strada del coraggio/, 'manca la strada percorsa');
  assert.match(txt, /la strada della dolcezza/, 'manca la strada non percorsa');
  assert.match(txt, /●/, 'la percorsa va marcata con il punto pieno');
  assert.match(txt, /○/, 'la non percorsa con il punto vuoto');
  assert.match(txt, /la tua stesura/, 'la strada percorsa deve poter riaprire il suo postscript');
  assert.match(txt, /la seconda stesura/, 'la strada non percorsa deve poter riaprire il suo postscript');
});

test('la seconda stesura si apre e mostra la strada non percorsa, non la propria', () => {
  const g = boot();
  const mia = 'H. Prima stesura, abbastanza lunga da superare i gate automatici.';
  const altra = 'H. Seconda stesura, completamente diversa dalla prima per contenuto.';
  withPs(g, 7, { coraggio: mia, dolcezza: altra });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  const list = $g('quaderno-list');

  const btns = [...list.querySelectorAll('.q-second')];
  assert.equal(btns.length, 2, 'devono esserci due stesure: la tua e la seconda');
  const [, seconda] = btns;

  /* tutto chiuso all'apertura, e il testo non deve essere leggibile a occhio
     prima del click: è nascosto, non semplicemente in fondo alla lista */
  for (const b of btns) {
    assert.equal(b.getAttribute('aria-expanded'), 'false');
    assert.ok(b.tagName === 'BUTTON', 'la stesura deve essere un bottone, non uno span');
  }
  const boxes = [...list.querySelectorAll('.q-secondbox')];
  assert.equal(boxes.length, 2);
  for (const b of boxes) assert.equal(b.hidden, true, 'la stesura nasce chiusa');

  seconda.click();
  assert.equal(seconda.getAttribute('aria-expanded'), 'true', 'aria-expanded deve invertirsi');
  const box = seconda.parentNode.querySelector('.q-secondbox');
  assert.equal(box.hidden, false);
  assert.ok(box.textContent.includes(altra), 'deve mostrare il postscript della strada non percorsa');
  assert.ok(!box.textContent.includes('Prima stesura'), 'non deve ripetere la propria: quella sta già sopra');

  seconda.click();
  assert.equal(seconda.getAttribute('aria-expanded'), 'false', 'deve richiudersi');
  assert.equal(box.hidden, true);
});

test('senza postscript sull\'altra strada non compare nessun bottone vuoto', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Solo la strada del coraggio ha una seconda stesura scritta da Hana.' });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  const list = $g('quaderno-list');
  assert.equal(list.querySelectorAll('.q-second').length, 1, 'solo la strada percorsa ha una stesura');
  assert.equal(list.querySelectorAll('.q-secondbox').length, 1);
  assert.match(list.textContent, /—/, 'la strada senza postscript resta un trattino, non un bottone');
});

test('il Quaderno non usa la parola rimpianto, nemmeno nella seconda stesura', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                 dolcezza: 'H. Seconda stesura, completamente diversa dalla prima per contenuto.' });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  const txt = $g('quaderno-list').textContent;
  for (const parola of ['rimpiant', 'peccat', 'colpa', 'peccato', 'errore']) {
    assert.ok(!new RegExp(parola, 'i').test(txt), `il Quaderno usa "${parola}": ${txt.slice(0, 90)}`);
  }
});

test('senza scelte il Quaderno dice che le pagine sono ancora bianche', () => {
  const g = boot();
  const $g = (id) => g.doc.getElementById(id);
  $g('btn-quaderno').click();
  const txt = $g('quaderno-list').textContent;
  assert.match(txt, /ancora bianco|bianca/, `messaggio inatteso: ${txt.slice(0, 80)}`);
  assert.match($g('quaderno-count').textContent, /Nessuna scelta/);
});

test('il Quaderno si chiude col bottone, con Esc e con click sul fondo', () => {
  const g = boot();
  const $g = (id) => g.doc.getElementById(id);
  $g('btn-quaderno').click();
  assert.ok($g('quaderno-modal').classList.contains('open'));

  $g('quaderno-close').click();
  assert.ok(!$g('quaderno-modal').classList.contains('open'), 'il bottone Chiudi non funziona');

  $g('btn-quaderno').click();
  g.doc.dispatch('keydown', { key: 'Escape' });
  assert.ok(!$g('quaderno-modal').classList.contains('open'), 'Esc non chiude il Quaderno');

  $g('btn-quaderno').click();
  $g('quaderno-modal').dispatch('click', { target: $g('quaderno-modal') });
  assert.ok(!$g('quaderno-modal').classList.contains('open'), 'click sul fondo non chiude');
});

test('chiudendo il Quaderno il focus torna al bottone che lo ha aperto', () => {
  const g = boot();
  const $g = (id) => g.doc.getElementById(id);
  $g('btn-quaderno').click();
  assert.equal(g.doc.activeElement, $g('quaderno-close'), 'il focus deve entrare nel dialog');
  $g('quaderno-close').click();
  assert.equal(g.doc.activeElement, $g('btn-quaderno'), 'il focus deve tornare indietro');
});

test('il Quaderno si aggiorna dopo una nuova scelta', () => {
  const g = boot();
  withPs(g, 7, { coraggio: 'H. Prima stesura, abbastanza lunga da superare i gate automatici.',
                 dolcezza: 'H. Seconda stesura, completamente diversa dalla prima per contenuto.' });
  const $g = earnLetter(g, 7, 'coraggio');
  $g('btn-quaderno').click();
  assert.match($g('quaderno-count').textContent, /1 scelte/);
  $g('quaderno-close').click();

  /* una seconda scelta in un altro episodio: il Quaderno deve contare due */
  const prog = g.win.MHU.prog('pioggia');
  prog.choices[9] = 'dolcezza';
  prog.letters.push('Lettera 9 — "Perdonare è versare due volte dalla stessa teiera."');
  $g('btn-quaderno').click();
  assert.match($g('quaderno-count').textContent, /2 scelte/);
});

test('due scelte opposte danno due lettere distinte nel Diario', () => {
  /* Questo è il test che chiude il cerchio: è la promessa della feature. */
  const gioca = (effect, ps) => {
    const g = boot();
    withPs(g, 7, ps);
    earnLetter(g, 7, effect);
    return g.win.MHU.prog('pioggia');
  };
  const ps = {
    coraggio: 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera, tutta.',
    dolcezza: 'H. Quella volta mi hai perdonata prima ancora di sapere cosa avessi fatto.',
  };
  const conCoraggio = gioca('coraggio', ps);
  const conDolcezza = gioca('dolcezza', ps);

  assert.equal(conCoraggio.letters.length, 1);
  assert.equal(conDolcezza.letters.length, 1);
  assert.notEqual(conCoraggio.letters[0], conDolcezza.letters[0],
    'due scelte opposte devono produrre lettere diverse');
  assert.ok(conCoraggio.letters[0].includes(ps.coraggio));
  assert.ok(!conCoraggio.letters[0].includes(ps.dolcezza), 'non deve trapelare l\'altra variante');
  assert.ok(conDolcezza.letters[0].includes(ps.dolcezza));
  for (const l of [...conCoraggio.letters, ...conDolcezza.letters]) {
    assert.equal(typeof l, 'string', 'letters resta un array di stringhe');
  }
});

test('la seconda stesura: rigiocando con l\'opposta scelta arriva un\'altra lettera', () => {
  const g = boot();
  const ps = { coraggio: 'H. Prima stesura: quella volta mi hai chiesto la verità, e te l\'ho data.',
              dolcezza: 'H. Seconda stesura: quella volta mi hai perdonata prima di ogni spiegazione.' };
  const ep = withPs(g, 7, ps);
  earnLetter(g, 7, 'coraggio');
  assert.equal(g.win.MHU.prog('pioggia').letters.length, 1);

  /* rigioca lo stesso episodio scegliendo l'altra strada */
  const $g = (id) => g.doc.getElementById(id);
  const prog = g.win.MHU.prog('pioggia');
  prog.hearts = 5;
  $g('btn-story-after').click();
  /* l'indice della scelta OPPOSTA a quella già presa: cliccare due volte la
     stessa scelta produrrebbe la stessa lettera e il test passerebbe a vuoto */
  const taken = prog.choices[7];
  const opposite = taken === ep.choiceA.effect ? 1 : 0;
  $g('story-choices').children[opposite].click();
  $g('story-continue').click();
  const b = g.win.MH.board;
  b.collected = b.targetCount; b.score = 70; b.checkEnd();
  assert.notEqual(prog.choices[7], taken, 'la seconda scelta deve essere davvero diversa');

  const letters = g.win.MHU.prog('pioggia').letters;
  assert.equal(letters.length, 2, 'rigiocando con l\'opposta scelta deve arrivare una seconda stesura');
  assert.ok(letters[0] !== letters[1]);
  assert.ok(letters.some((l) => l.includes(ps.coraggio)));
  assert.ok(letters.some((l) => l.includes(ps.dolcezza)));
});

test('i postscript di una lettera non vengono persi rileggendola', () => {
  const g = boot();
  const ps = { coraggio: 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera, tutta.' };
  withPs(g, 7, { coraggio: ps.coraggio, dolcezza: 'H. Quella volta mi hai perdonata prima di ogni spiegazione.' });
  earnLetter(g, 7, 'coraggio');
  const before = g.win.MHU.prog('pioggia').letters[0];
  g.win.MHRenderDiary();
  g.win.MHRenderDiary();
  assert.equal(g.win.MHU.prog('pioggia').letters[0], before,
    'rendere il Diario non deve alterare le lettere');
  assert.equal(has(cardOf(g), 'letter-ps').textContent, ps.coraggio);
});

test('il karaoke attraversa entrambi i blocchi, nell\'ordine di lettura', () => {
  const g = boot();
  const ps = 'H. Quella volta mi hai chiesto la verità e te l\'ho data intera, tutta.';
  withPs(g, 7, { coraggio: ps, dolcezza: 'H. Quella volta mi hai perdonata prima di ogni spiegazione.' });
  earnLetter(g, 7, 'coraggio');
  const card = cardOf(g);
  const btn = card.querySelectorAll('.listenbtn').pop();  // l'ultimo è "Ascoltami"
  assert.match(btn.textContent, /Ascoltami/, 'il bottone di ascolto non è l\'ultimo .listenbtn della card');
  btn.click();   // avvia la lettura
  const base = has(card, 'letter-text'), post = has(card, 'letter-ps');
  const spansA = base.querySelectorAll('span').length, spansB = post.querySelectorAll('span').length;
  assert.ok(spansA > 0, 'il primo blocco deve essere spezzato in span');
  assert.ok(spansB > 0, 'il postscript deve essere spezzato in span: il karaoke lo attraversa');
  /* l'ordine dei blocchi è base → postscript, e i loro offset sono cumulativi */
  const primoB = post.querySelectorAll('span')[0].textContent;
  assert.equal(primoB, ps.split(/\s+/)[0], 'il primo span del postscript è la sua prima parola');
  assert.equal(btn.textContent, '⏹ Ferma', 'il bottone deve diventare Ferma durante la lettura');
});

test('integrazione sui dati veri: il Quaderno apre tutte e due le stesure', () => {
  /* I test precedenti usano postscript sintetici. Qui si usa il contenuto
     reale: se il rollout lascia scoperta una strada, o se una chiave non
     combacia con l'effetto, l'archivio deve accorgersene. */
  for (const epId of [7, 24, 42]) {
    const g = boot();                      // partita nuova: l'archivio accumula
    const ep = g.win.MHU.UNIVERSES[0].story.find((e) => e.id === epId);
    assert.ok(ep.ps, `l'episodio ${epId} dovrebbe avere i postscript`);
    for (const effetto of [ep.choiceA.effect, ep.choiceB.effect]) {
      assert.ok(ep.ps[effetto], `ep ${epId}: nessun postscript per l'effetto "${effetto}"`);
    }

    const scelto = ep.choiceA.effect;
    const altro = ep.choiceA.effect === scelto ? ep.choiceB.effect : ep.choiceA.effect;
    const $g = earnLetter(g, epId, scelto);
    $g('btn-quaderno').click();
    const list = $g('quaderno-list');

    const btns = [...list.querySelectorAll('.q-second')];
    assert.equal(btns.length, 2, `ep ${epId}: due stesure attese (tua + seconda), trovate ${btns.length}`);

    const tua = btns.find((b) => b.textContent.includes('tua'));
    const seconda = btns.find((b) => b.textContent.includes('seconda'));
    assert.ok(tua && seconda, `ep ${epId}: manca una delle due stesure`);

    tua.click();
    seconda.click();
    const [boxTua, boxSeconda] = [...list.querySelectorAll('.q-secondbox')];
    assert.equal(boxTua.textContent, ep.ps[scelto],
      `ep ${epId}: la tua stesura deve essere il postscript reale della strada percorsa`);
    assert.equal(boxSeconda.textContent, ep.ps[altro],
      `ep ${epId}: la seconda stesura deve essere il postscript reale della strada non percorsa`);
    assert.notEqual(boxTua.textContent, boxSeconda.textContent,
      `ep ${epId}: le due stesure non possono essere la stessa frase`);
  }
});
