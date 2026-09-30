/* scena.test.mjs — i testi, le scelte, l'ascolto e il rammendo.
 *
 * Qui la regola è che il gioco non deve mai bloccarsi. Una scelta che costa
 * una scheda che non hai più non può impedirti di andare avanti: la si
 * applica, si dice che non è costato niente, e si continua. Un gioco sul lutto
 * che ti lascia fermo non è un gioco sul lutto, è un bug.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const { win } = carica({ storia: STORIA_MINIMA });
const Scena = win.PMFScena;
const Mem = win.PMFMemoria;
const S = win.PMFSave;
const defs = STORIA_MINIMA.schede;
const sequenza = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const nuovo = () => S.nuovaPartita(defs);

/* ── formattazione ───────────────────────────────────────── */

test('una voce colorata si apre e si chiude', () => {
  const h = Scena.format('Ada disse {c}no} e basta');
  assert.match(h, /<span class="c">no<\/span>/);
});

test('le quattro voci hanno quattro colori', () => {
  for (const k of ['a', 'b', 'c', 'd']) {
    assert.match(Scena.format(`{${k}}x{/}`), new RegExp(`class="${k}"`), `la voce ${k} non ha classe`);
  }
});

test('i versi vanno in corsivo, la prosa no', () => {
  const h = Scena.format('> uno\n> due');
  assert.match(h, /class="verso"/);
  assert.ok(!/class="verso"/.test(Scena.format('prosa normale')));
});

test('i paragrafi sono separati, i versi no', () => {
  assert.match(Scena.format('uno\n\ndue'), /uno\ndue/, 'fra paragrafi c\'è un a capo');
  assert.match(Scena.format('> uno\n> due'), /uno<br>due/, 'fra versi c\'è un br');
});

test('il contenuto dei testi viene sempre scappato', () => {
  const h = Scena.format('<script>alert(1)</script>');
  assert.ok(!h.includes('<script>'), 'lo script non deve passare');
  assert.match(h, /&lt;script&gt;/);
});

test('nessun markup è disequilibrato, in nessun caso', () => {
  const prove = ['{a}x}', '{a}{b}{c}x}', '}x', '{x}', '{', '}}', '{{{}}}', '{a}x{c}',
    '{c}a&b<c}', 'testo {c}a\n\nb} c', '> {a}verso}'];
  for (const p of prove) {
    const h = Scena.format(p);
    const aperti = (h.match(/<span/g) || []).length;
    const chiusi = (h.match(/<\/span>/g) || []).length;
    assert.equal(aperti, chiusi, `disbilanciato su ${JSON.stringify(p)}: ${h}`);
  }
});

test('una graffa senza apertura resta com\'è', () => {
  /* Una `}` isolata è punteggiatura e resta letterale: non c'è nessuna voce
   * aperta da chiudere, e cancellarla farebbe sparire una frase. */
  assert.equal(Scena.format('100% certo}'), '100% certo}');
  /* Una `{x}` senza chiusura è invece un colore che va chiuso in fondo: il
   * testo non deve perdere una parola, e il markup non deve disequilibrarsi. */
  const h = Scena.format('a{b}c');
  assert.match(h, /a<span class="b">c<\/span>/);
});

test('un colore non chiuso si chiude da solo alla fine', () => {
  const h = Scena.format('{c}tutto rosso');
  assert.equal((h.match(/<span/g) || []).length, (h.match(/<\/span>/g) || []).length);
});

test('il testo per la lettura ad alta voce è spoglio', () => {
  const t = Scena.semplifica('> «come stai?»\n\nNon molto.\n\n{c}Meglio {d}così{/c}.');
  assert.ok(!/[{}>]/.test(t), `resta markup: ${t}`);
  assert.ok(!/«|»/.test(t), `restano le virgolette: ${t}`);
  assert.ok(t.includes('come stai'), 'il testo deve essere ancora leggibile');
});

/* ── scelte ──────────────────────────────────────────────── */

test('una scelta che imposta un valore lo mette nel save', () => {
  const s = nuovo();
  Scena.applicaScelta(s, { imposta: { a1_promise: 'finiro' } }, defs);
  assert.equal(s.scelte.a1_promise, 'finiro');
});

test('una scelta che dona una scheda la mette nel Quaderno', () => {
  const s = nuovo();
  const r = Scena.applicaScelta(s, { dai: ['s3'] }, defs);
  assert.equal(Mem.ha(s, 's3'), true);
  assert.ok(r.messaggi.some((m) => /tre/i.test(m.testo)), r.messaggi.map((m) => m.testo).join(' | '));
});

test('una scelta che costa una scheda la brucia', () => {
  const s = nuovo();
  Scena.applicaScelta(s, { costa: ['s2'] }, defs);
  assert.equal(Mem.ha(s, 's2'), false);
  assert.ok(Mem.schedeBruciate(defs, s).some((c) => c.id === 's2'));
});

test('una scelta che costa una scheda già bruciata non blocca e avvisa', () => {
  const s = nuovo();
  Scena.applicaScelta(s, { costa: ['s2'] }, defs);
  const r = Scena.applicaScelta(s, { costa: ['s2'] }, defs);
  assert.ok(r.messaggi.some((m) => /Non te lo ricordavi più/.test(m.testo)),
    'il giocatore deve sapere che la scelta non gli è costata niente');
  assert.equal(Mem.quante(s), 3);
});

test('una scelta vuota non fa nulla e non fallisce', () => {
  const s = nuovo();
  const r = Scena.applicaScelta(s, null, defs);
  sequenza(r.messaggi, []);
  assert.equal(Mem.quante(s), 4);
});

test('una scelta che dona e costa insieme funziona', () => {
  const s = nuovo();
  Scena.applicaScelta(s, { costa: ['s1'], dai: ['s2'] }, defs);
  assert.equal(Mem.ha(s, 's1'), false);
  assert.equal(Mem.ha(s, 's2'), true);
});

test('una scelta che cita una scheda inesistente non rompe niente', () => {
  const s = nuovo();
  Scena.applicaScelta(s, { costa: ['inesistente'], dai: ['anche-questa'] }, defs);
  assert.equal(Mem.quante(s), 4);
});

/* ── nodi di un atto ─────────────────────────────────────── */

test('un atto è: prima la scena, poi la tela, poi le scene del dopo', () => {
  const atto = STORIA_MINIMA.atti[0];
  const nodi = Scena.nodi(atto);
  const tipi = nodi.map((n) => n.tipo);
  assert.equal(tipi.join(','), 'scena,tela', tipi.join(','));
});

test('l\'ultimo atto non ha scene dopo la tela', () => {
  const atto = STORIA_MINIMA.atti[1];
  const nodi = Scena.nodi(atto);
  assert.equal(nodi[nodi.length - 1].tipo, 'tela');
  assert.ok(atto.finale, 'l\'ultimo atto finisce con un finale');
});

test('un atto vuoto non produce nodi fantasma', () => {
  assert.equal(Scena.nodi({ scena: [], dopo: [] }).length, 0);
});

/* ── ascolto ─────────────────────────────────────────────── */

test('ascolto restituisce una scheda che hai ancora', () => {
  const s = nuovo();
  Mem.brucia(s, ['s1', 's2']);
  for (let i = 0; i < 30; i++) {
    const c = Scena.ascolto(s, defs, () => 0.5);
    assert.ok(c, 'deve restituire qualcosa finché il Quaderno non è vuoto');
    assert.equal(Mem.ha(s, c.id), true);
  }
});

test('ascolto con il Quaderno vuoto non dà niente', () => {
  const s = nuovo();
  s.memoria = [];
  assert.equal(Scena.ascolto(s, defs), null);
});

/* ── rammendo ────────────────────────────────────────────── */

test('si può rammendare solo se c\'è qualcosa di perso', () => {
  const s = nuovo();
  const r = Scena.rammendoPossibile(s, defs, 'a0');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Non c'è niente che sia andato perso/);
});

test('si può rammendare scambiando il fresco con il vecchio', () => {
  const s = nuovo();
  Mem.brucia(s, ['s3']);
  assert.equal(Scena.rammendoPossibile(s, defs, 'a0').ok, true);

  const r = Scena.rammendo(s, defs, 'a0', 's1');
  assert.equal(r.ok, true);
  assert.equal(Mem.ha(s, 's1'), false, 'paghi con il più fresco');
  assert.equal(Mem.ha(s, 's3'), true, 'e ti torna il più vecchio');
});

test('non si può rammendare se resterebbe un ricordo solo', () => {
  const s = nuovo();
  Mem.brucia(s, ['s1', 's2', 's3']);
  assert.equal(Mem.quante(s), 1);
  const r = Scena.rammendoPossibile(s, defs, 'a0');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /un ricordo solo/);
});

test('si rammenda una volta sola per atto', () => {
  const s = nuovo();
  Mem.brucia(s, ['s3']);
  Scena.rammendo(s, defs, 'a0', 's1');
  assert.equal(Scena.rammendoPossibile(s, defs, 'a0').ok, false);
  assert.match(Scena.rammendoPossibile(s, defs, 'a0').motivo, /già rammendato/);

  /* ma in un atto dopo si può ancora */
  assert.equal(Scena.rammendoPossibile(s, defs, 'a1').ok, true);
});

test('rammendare senza perdere nulla è innocuo', () => {
  const s = nuovo();
  const r = Scena.rammendo(s, defs, 'a0', 's1');
  assert.equal(r.ok, false);
  assert.equal(Mem.quante(s), 4);
});

test('rammendare con una scheda che non hai è rifiutato', () => {
  const s = nuovo();
  Mem.brucia(s, ['s1']);
  const r = Scena.rammendo(s, defs, 'a0', 'inesistente');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Non ce l'hai/);
});

test('rammendare dice entrambe le cose che sono successe', () => {
  const s = nuovo();
  Mem.brucia(s, ['s3']);
  const r = Scena.rammendo(s, defs, 'a0', 's1');
  assert.match(r.testo, /Non ricordi più/);
  assert.match(r.testo, /Ti torna/);
});

/* ── frammenti di cielo ──────────────────────────────────── */

test('gli schizzi si raccolgono solo sopra la soglia di ricordi', () => {
  const atto = { id: 'a1', dai: [], frammento: 'fr-2' };
  const sotto = nuovo();
  sotto.memoria = ['s1', 's2', 's3', 's4'];
  assert.equal(Scena.frammentiDisponibili(sotto, defs, atto).length, 0,
    `sotto ${Scena.SOGLIA_FRAGMENTI} ricordi la carta è carta`);

  const sopra = nuovo();
  sopra.memoria = ['s1', 's2', 's3', 's4', 'x1', 'x2', 'x3', 'x4'];
  assert.equal(Scena.frammentiDisponibili(sopra, defs, atto).length, 1,
    `sopra la soglia lo schizzo è un cielo`);
});

test('uno schizzo già raccolto non si raccoglie due volte', () => {
  const atto = { id: 'a1', dai: [], frammento: 'fr-2' };
  const s = nuovo();
  s.frammenti = ['fr-2'];
  assert.equal(Scena.frammentiDisponibili(s, defs, atto).length, 0);
});

test('uno schizzo può arrivare da una scheda invece che dall\'atto', () => {
  const s = nuovo();
  s.memoria = ['s1', 's2', 's3', 's4', 'x1', 'x2', 'x3', 'x4'];
  const defsCon = [...defs, { id: 's5', persona: 'aurelio', titolo: 'Cielo', nome: 'lo schizzo', versi: ['a', 'b'], chiavi: [], frammento: 'fr-1' }];
  const atto = { id: 'a1', dai: ['s5'] };
  const fr = Scena.frammentiDisponibili(s, defsCon, atto);
  assert.equal(JSON.stringify(fr), '["fr-1"]', JSON.stringify(fr));
});

test('un atto senza schizzi non ne promises', () => {
  assert.equal(Scena.frammentiDisponibili(nuovo(), defs, { id: 'a9', dai: [] }).length, 0);
});