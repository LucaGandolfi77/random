/* scena.test.mjs — i testi, le scelte, e il branch.
 *
 * Due cose qui sono da non sbagliare. La prima è che il contenuto di
 * story.json finisce in innerHTML, e l'unico modo per star tranquilli è che
 * l'unico markup che ne esce siano quattro `<span>` con classe di tabella.
 * La seconda è che una scelta che non cambia niente è una scelta che non hai
 * fatto: qui si verifica che le battute spariscano davvero.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT, STORIA_MINIMA } from './harness.mjs';

const h = carica();
const { FSTScena: Scena, FSTSave: S, FSTMemoria: Mem } = h.win;
const DEF = STORIA_MINIMA.schede;

/* ── il markup ───────────────────────────────────────────── */

test('le quattro voci aprono e chiudono', () => {
  assert.equal(Scena.format('{a}uno{/}'), '<span class="a">uno</span>');
  assert.equal(Scena.format('{b}due{/}'), '<span class="b">due</span>');
  assert.equal(Scena.format('{c}tre{/}'), '<span class="c">tre</span>');
  assert.equal(Scena.format('{d}quattro{/}'), '<span class="d">quattro</span>');
});

test('una graffa chiusa da sola si chiude da sola', () => {
  assert.equal(Scena.format('{a}uno'), '<span class="a">uno</span>');
});

test('una graffa di troppo resta una graffa, e non mangia il testo', () => {
  assert.ok(Scena.format('chiudi } male').includes('}'), 'la graffa sciolta è parte del testo');
});

test('gli angoli e la & del contenuto non entrano mai dentro un tag', () => {
  const cattivo = '<script>alert(1)</script> & {a}voce{/}';
  const out = Scena.format(cattivo);
  assert.equal(out.includes('<script>'), false, 'lo script non passa');
  assert.equal(out.includes('</script>'), false);
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('&amp;'));
  /* l'unico markup che esce è lo span, e la classe viene dalla tabella */
  const tag = out.match(/<[a-z]+/gi) || [];
  for (const t of tag) assert.ok(t === '<span', `è uscito un ${t} che non doveva`);
});

test('una classe che vuole scappare non può scappare', () => {
  /* `{a"onmouseover=...}` non è una voce: non apre niente, e resta testo */
  const out = Scena.format('{a"onmouseover="x"}');
  assert.equal(/class=/.test(out), false);
});

test('i versi vanno a capo da soli', () => {
  const out = Scena.format('> uno\n> due');
  assert.ok(out.includes('class="verso"'));
  assert.ok(out.includes('<br>'));
  assert.equal(out.includes('> uno'), false, 'il segno del verso non finisce nel testo');
});

test('una riga vuota è un paragrafo nuovo', () => {
  const out = Scena.format('uno\n\ndue');
  assert.equal((out.match(/<br>/g) || []).length, 0, 'due paragrafi non hanno un a capo fra loro');
});

test('una riga normale manda a capo, un verso no', () => {
  const prosa = Scena.format('uno\ndue');
  assert.equal((prosa.match(/<br>/g) || []).length, 1);
});

test('semplifica toglie il markup e mette il punto', () => {
  const s = Scena.semplifica('{a}uno{/}\n> due\n\ntre');
  assert.equal(s.includes('{'), false);
  assert.equal(s.includes('}'), false);
  assert.equal(s.includes('>'), false);
  assert.equal(s.includes('«'), false);
  assert.ok(s.endsWith('.'), 'una riga senza punto finale riceve il punto');
});

test('semplifica non aggiunge un punto a chi ce l\'ha già', () => {
  assert.equal(Scena.semplifica('uno.'), 'uno.');
  assert.equal(Scena.semplifica('uno?'), 'uno?');
  assert.equal(Scena.semplifica('uno!'), 'uno!');
  assert.equal(Scena.semplifica('uno…'), 'uno…');
});

/* ── il branch: il cuore della telenovela ────────────────── */

test('senza condizione tutto si vede', () => {
  assert.equal(Scena.visibile(undefined, { scelte: {} }), true);
  assert.equal(Scena.visibile(null, { scelte: {} }), true);
  assert.equal(Scena.visibile({}, { scelte: {} }), true);
});

test('una condizione vale solo se il flag è quello', () => {
  const s = { scelte: { a0_porta: 'aperta' } };
  assert.equal(Scena.visibile({ a0_porta: 'aperta' }, s), true);
  assert.equal(Scena.visibile({ a0_porta: 'chiusa' }, s), false);
});

test('un flag che non c\'è non vale, e non fa crashare', () => {
  assert.equal(Scena.visibile({ inesistente: 'x' }, { scelte: {} }), false);
  assert.equal(Scena.visibile({ a: 'x' }, {}), false);
  assert.equal(Scena.visibile({ a: 'x' }, null), false);
});

test('due condizioni sono un «e», e un «e» si legge', () => {
  const s = { scelte: { a: '1', b: '2' } };
  assert.equal(Scena.visibile({ a: '1', b: '2' }, s), true);
  assert.equal(Scena.visibile({ a: '1', b: '3' }, s), false);
  assert.equal(Scena.visibile({ a: '9', b: '2' }, s), false);
});

test('le battute si filtrano, e l\'ordine di quelle rimaste è quello di prima', () => {
  const scena = {
    battute: [
      { testo: 'sempre' },
      { testo: 'solo se aperta', se: { porta: 'aperta' } },
      { testo: 'solo se chiusa', se: { porta: 'chiusa' } },
      { testo: 'sempre anche lui' },
    ],
  };
  const aperta = Scena.battuteVisibili(scena, { scelte: { porta: 'aperta' } });
  assert.equal(aperta.length, 3);
  assert.equal(aperta[0].testo, 'sempre');
  assert.equal(aperta[1].testo, 'solo se aperta');
  assert.equal(aperta[2].testo, 'sempre anche lui');

  const chiusa = Scena.battuteVisibili(scena, { scelte: { porta: 'chiusa' } });
  assert.equal(chiusa.length, 3);
  assert.equal(chiusa[1].testo, 'solo se chiusa');
});

test('una scena le cui battute sono tutte filtrate non si rompe', () => {
  const scena = { battute: [{ testo: 'x', se: { porta: 'chiusa' } }] };
  const v = Scena.battuteVisibili(scena, { scelte: { porta: 'aperta' } });
  assert.equal(v.length, 0);
  assert.equal(Scena.battuteVisibili(null, {}).length, 0);
  assert.equal(Scena.battuteVisibili({}, {}).length, 0);
});

test('le scelte si filtrano con la stessa regola delle battute', () => {
  const scena = {
    scelte: [
      { id: 'a', testo: 'sempre' },
      { id: 'b', testo: 'solo se aperta', se: { porta: 'aperta' } },
    ],
  };
  assert.equal(Scena.scelteVisibili(scena, { scelte: { porta: 'aperta' } }).length, 2);
  assert.equal(Scena.scelteVisibili(scena, { scelte: { porta: 'chiusa' } }).length, 1);
});

test('i due atti hanno davvero due finali diversi', () => {
  const a1 = STORIA_MINIMA.atti[1].scena[0];
  const aperta = Scena.battuteVisibili(a1, { scelte: { a0_porta: 'aperta' } }).map((b) => b.testo);
  const chiusa = Scena.battuteVisibili(a1, { scelte: { a0_porta: 'chiusa' } }).map((b) => b.testo);
  assert.notEqual(aperta.join('|'), chiusa.join('|'), 'le due partite devono leggere atti diversi');
  assert.equal(aperta.length, chiusa.length, 'e della stessa lunghezza, se non è un trucco');
});

/* ── applicare una scelta ────────────────────────────────── */

test('imposta scrive il flag, e il flag si rilegge', () => {
  const s = S.nuovaPartita(DEF);
  const r = Scena.applicaScelta(s, { id: 'x', testo: 't', imposta: { a0_porta: 'aperta' } }, DEF);
  assert.equal(s.scelte.a0_porta, 'aperta');
  assert.equal(Scena.visibile({ a0_porta: 'aperta' }, s), true);
  assert.equal(r.messaggi.length, 0);
});

test('costa brucia, e dice che cosa è andato', () => {
  const s = S.nuovaPartita(DEF);
  const r = Scena.applicaScelta(s, { id: 'x', testo: 't', costa: ['s1'] }, DEF);
  assert.equal(Mem.ha(s, 's1'), false);
  assert.ok(r.messaggi.some((m) => m.tipo === 'costo' && /Uno|uno/.test(m.testo)));
});

test('dai mette dentro, e dice che cosa è tornato', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  const r = Scena.applicaScelta(s, { id: 'x', testo: 't', dai: ['s1'] }, DEF);
  assert.equal(Mem.ha(s, 's1'), true);
  assert.ok(r.messaggi.some((m) => m.tipo === 'dono' && /Uno|uno/.test(m.testo)));
});

test('una scelta che costa una scheda che non hai non ti blocca', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  const r = Scena.applicaScelta(s, { id: 'x', testo: 't', costa: ['s1'] }, DEF);
  assert.ok(r.messaggi.some((m) => m.tipo === 'nota' && /Non te lo ricordavi più/.test(m.testo)));
  assert.equal(Mem.quante(s), 3, 'e non costa niente');
});

test('una scheda che non esiste non entra nel Mazzetto', () => {
  const s = S.nuovaPartita(DEF);
  const r = Scena.applicaScelta(s, { id: 'x', testo: 't', dai: ['inesistente'] }, DEF);
  assert.ok(!s.memoria.includes('inesistente'));
  assert.ok(r.messaggi.some((m) => m.tipo === 'nota'));
});

test('una scelta inesistente non rompe niente', () => {
  const s = S.nuovaPartita(DEF);
  const r = Scena.applicaScelta(s, null, DEF);
  assert.equal(r.messaggi.length, 0);
  assert.equal(r.trovate.length, 0);
});

/* ── i nodi di un atto ───────────────────────────────────── */

test('i nodi sono: scena, orto, scena', () => {
  const atto = { scena: [{ id: 's1' }], combattimento: 'betta', dopo: [{ id: 'd1' }] };
  const n = Scena.nodi(atto);
  assert.equal(n.length, 3);
  assert.equal(n[0].tipo, 'scena');
  assert.equal(n[1].tipo, 'orto');
  assert.equal(n[1].id, 'betta');
  assert.equal(n[2].tipo, 'scena');
  assert.equal(n[2].fase, 'dopo');
});

test('un atto senza orto salta l\'orto, e senza scene dopo finisce lì', () => {
  const n = Scena.nodi({ scena: [{ id: 's1' }] });
  assert.equal(n.length, 1);
  assert.equal(Scena.nodi({}).length, 0);
});

/* ── Annusa ──────────────────────────────────────────────── */

test('annusa restituisce una scheda che hai, o niente', () => {
  const s = S.nuovaPartita(DEF);
  const c = Scena.annusa(s, DEF, () => 0);
  assert.ok(c && Mem.ha(s, c.id));
  s.memoria = [];
  assert.equal(Scena.annusa(s, DEF, () => 0), null);
});

/* ── Rinnova ─────────────────────────────────────────────── */

test('rinnova è possibile solo se c\'è qualcosa da riacquistare', () => {
  const s = S.nuovaPartita(DEF);
  assert.equal(Scena.rinnovoPossibile(s, DEF, 'a0').ok, false);
  assert.match(Scena.rinnovoPossibile(s, DEF, 'a0').motivo, /Non c'è niente che sia andato perso/);
  Mem.brucia(s, ['s1']);
  assert.equal(Scena.rinnovoPossibile(s, DEF, 'a0').ok, true);
});

test('rinnova non è possibile se ti resterebbe un ricordo solo', () => {
  const s = S.nuovaPartita(DEF);
  s.memoria = ['s2'];
  s.bruciate = ['s1'];
  const r = Scena.rinnovoPossibile(s, DEF, 'a0');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /un ricordo solo/);
});

test('rinnova una volta per atto, e non una volta per partita', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  assert.equal(Scena.giàUsato(s, 'a0'), false);
  const e = Scena.rinnovo(s, DEF, 'a0', 's2');
  assert.equal(e.ok, true);
  assert.equal(Scena.giàUsato(s, 'a0'), true);
  assert.equal(Scena.rinnovoPossibile(s, DEF, 'a0').ok, false);
  assert.match(Scena.rinnovoPossibile(s, DEF, 'a0').motivo, /già rinnovato/);
  /* in un altro atto si può ancora */
  Mem.brucia(s, ['s3']);
  assert.equal(Scena.rinnovoPossibile(s, DEF, 'a1').ok, true);
});

test('rinnova paga con il più fresco e riacquista il più vecchio', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1', 's3']);
  const e = Scena.rinnovo(s, DEF, 'a0', 's2');
  assert.equal(e.ok, true);
  assert.equal(e.perso, 's2');
  assert.equal(e.riacquistato, 's3', 'si riacquista l\'ultima bruciata, non la prima');
  assert.equal(Mem.ha(s, 's3'), true);
  assert.equal(Mem.ha(s, 's2'), false);
});

test('rinnova con una scheda che non hai è rifiutato, e non costa niente', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  const e = Scena.rinnovo(s, DEF, 'a0', 'inesistente');
  assert.equal(e.ok, false);
  assert.match(e.motivo, /Non ce l'hai/);
  assert.equal(Mem.ha(s, 's1'), false, 'e la bruciata è ancora bruciata');
});

test('il testo di rinnova dice entrambe le cose', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  const e = Scena.rinnovo(s, DEF, 'a0', 's2');
  assert.ok(e.testo.includes('Non ricordi più'), 'cosa hai perso');
  assert.ok(e.testo.includes('Ti torna'), 'cosa è tornato');
});

/* ── i flag: scritti, e soprattutto riletti ──────────────── */

const STORIA_REALE = () => JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));

test('ogni scelta scrive un flag, e il gioco lo rillega entro due atti', () => {
  /* È il difetto che il gate non vedeva. Diceva «6 flag, tutti letti» e aveva
   * ragione per una strada sbagliata: contava come letti anche i flag nominati
   * nei commenti del codice. E il peggio non era quello: `a0_porta` — la scelta
   * del primo atto, se vai dietro l'orto a leggere la lastra — veniva riletta
   * solo all'atto 5. Cinque atti. Il flag c'era, la frase c'era, e non
   * collegavano niente a nessuno. */
  const st = STORIA_REALE();
  const ordine = {};
  st.atti.forEach((a, i) => { ordine[a.id] = i; });

  const scritte = {};
  const lette = {};
  for (const a of st.atti) {
    for (const n of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of n.scelte || []) {
        for (const k of Object.keys(c.imposta || {})) if (scritte[k] === undefined) scritte[k] = a.id;
      }
      for (const b of n.battute || []) {
        for (const k of Object.keys(b.se || {})) (lette[k] = lette[k] || []).push(a.id);
      }
    }
  }

  const FINALE = { a1_promise: true, a2_promise: true, a4_nome: true };
  for (const [k, at] of Object.entries(scritte)) {
    assert.ok(lette[k] && lette[k].length, `il flag "${k}" (atto ${at}) non è mai riletto: è un tasto, non una scelta`);
    if (FINALE[k]) continue;   // la promessa la legge il finale: non ha atto
    const vicino = Math.min(...lette[k].map((m) => Math.abs(ordine[m] - ordine[at])));
    assert.ok(vicino <= 2,
      `il flag "${k}" si sceglie all'atto ${at} e si rilegge solo ${lette[k].join(', ')}: troppo lontano perché il giocatore se ne ricordi`);
  }
});

test('la scelta del primo atto torna almeno una volta entro due atti', () => {
  const st = STORIA_REALE();
  const a0 = st.atti.find((a) => a.id === 'a0');
  const scrive = [];
  for (const n of [...(a0.scena || []), ...(a0.dopo || [])]) {
    for (const c of n.scelte || []) for (const k of Object.keys(c.imposta || {})) scrive.push(k);
  }
  assert.ok(scrive.length, 'il primo atto deve chiedere qualcosa, altrimenti è solo unaIntroduction');
  for (const k of scrive) {
    let tornata = null;
    for (const a of st.atti) {
      if (ordineDi(st, a.id) < 2) continue;
      for (const n of [...(a.scena || []), ...(a.dopo || [])]) {
        for (const b of n.battute || []) if (b.se && b.se[k]) tornata = tornata || a.id;
      }
    }
    assert.ok(tornata, `"${k}" non torna mai nei primi due atti`);
  }
});

function ordineDi(st, id) {
  return st.atti.findIndex((a) => a.id === id);
}

test('ogni scelta ha una nota: il giocatore deve sapere cosa sta scegliendo', () => {
  const st = STORIA_REALE();
  for (const a of st.atti) {
    for (const n of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of n.scelte || []) {
        assert.ok(c.nota, `scelta ${c.id} (atto ${a.id}) senza nota`);
      }
    }
  }
});

test('due scelte che scrivono lo stesso valore non sono due scelte', () => {
  /* Due scelte che scrivono lo stesso flag con valori DIVERSI sono una scelta
   * binaria, e vanno benissimo: è metà delle scelte di questo gioco. Il difetto
   * è quando scrivono lo stesso valore: il giocatore sceglie fra due frasi,
   * riceve lo stesso flag, e la differenza è solo nel testo che non cambia
   * niente. È una scelta che sembra una scelta. */
  const st = STORIA_REALE();
  const valori = new Map();   // atto/flag → valori usati
  for (const a of st.atti) {
    for (const n of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of n.scelte || []) {
        for (const [k, v] of Object.entries(c.imposta || {})) {
          const chiave = `${a.id}/${k}`;
          valori.set(chiave, (valori.get(chiave) || []).concat(String(v)));
        }
      }
    }
  }
  for (const [k, vs] of valori) {
    const unici = new Set(vs);
    assert.equal(unici.size, vs.length,
      `${k} è scritto da ${vs.length} scelte ma produce ${unici.size} valori: due scelte diverse dicono la stessa cosa`);
  }
});

test('ogni scelta produce un risultato diverso dalle altre dello stesso atto', () => {
  /* Ogni scelta di un atto deve cambiare qualcosa. Se due scelte dell'atto
   * scrivono lo stesso flag e hanno la stessa nota, e non danno né costano
   * nient'altro, sono lo stesso tasto con due etichette. */
  const st = STORIA_REALE();
  for (const a of st.atti) {
    const scelte = [];
    for (const n of [...(a.scena || []), ...(a.dopo || [])]) for (const c of n.scelte || []) scelte.push(c);
    if (scelte.length < 2) continue;
    const impronte = scelte.map((c) => JSON.stringify({
      imposta: c.imposta || null,
      costa: (c.costa || []).slice().sort(),
      dai: (c.dai || []).slice().sort(),
    }));
    assert.equal(new Set(impronte).size, scelte.length,
      `atto ${a.id}: due scelte hanno lo stesso effetto e una delle due è inutile`);
  }
});
