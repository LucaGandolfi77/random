/* epitaffio.test.mjs — l'epitaffio che il gioco scrive da solo.
 *
 * È la funzione che chiude il cerchio: prende quello che hai scelto di
 * tenere e quello che hai scelto di bruciare, e ne fa un testo. Se mente
 * su quello che è successo, è peggio di non scrivere niente — quindi qui si
 * controlla che ogni ricordo citato compaia davvero, e che nessuno si perda
 * strada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const { win } = carica({ storia: STORIA_MINIMA });
const Epi = win.PMFEpitaffio;
const defs = STORIA_MINIMA.schede;

const carte = (ids) => defs.filter((d) => ids.includes(d.id));
const sequenza = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const rng = () => 0.5;                    // deterministico: sceglie sempre il primo
const compone = (tenute, bruciate, finale, extra = {}) =>
  Epi.componi({ tenute: carte(tenute), bruciate: carte(bruciate), finale, rng, ...extra });

test('l\'epitaffio ha un\'apertura, due righe sul passato, una chiusura', () => {
  const e = compone(['s1', 's2'], ['s3', 's4'], 'calore');
  assert.ok(e.righe.length >= 4, `attese almeno quattro righe, trovate ${e.righe.length}`);
  assert.match(e.righe[0], /Qui riposa Ada Sartori/);
  assert.ok(e.righe.some((r) => r.startsWith('Tolse dal mondo:')));
  assert.ok(e.righe.some((r) => r.startsWith('Tenne:')));
});

test('ogni ricordo citato compare nel testo', () => {
  const e = compone(['s1'], ['s2'], 'calore');
  const testo = e.righe.join(' ');
  assert.match(testo, /la prima scheda/, 'il ricordo tenuto è nominato');
  assert.match(testo, /la seconda scheda/, 'il ricordo bruciato è nominato');
});

test('chi non ha bruciato niente lo dice, e non finge di aver perso', () => {
  const e = compone(['s1', 's2'], [], 'calore');
  assert.ok(e.righe.some((r) => r.includes('Non bruciò niente')));
  assert.ok(!e.righe.some((r) => r.startsWith('Tolse dal mondo:')));
});

test('chi non ha tenuto niente lo dice, e non finge di aver salvato', () => {
  const e = compone([], ['s1'], 'cielo');
  assert.ok(e.righe.some((r) => r.includes('Non tenne niente')));
  assert.ok(!e.righe.some((r) => r.startsWith('Tenne:')));
});

test('l\'elenco di più ricordi li separa con la e, non con virgole a caso', () => {
  const uno = Epi.lista(['a']);
  const due = Epi.lista(['a', 'b']);
  const tre = Epi.lista(['a', 'b', 'c']);
  assert.equal(uno, 'a');
  assert.equal(due, 'a e b');
  assert.equal(tre, 'a, b e c');
});

test('l\'ordine dell\'elenco è per tenerezza: chi amavi viene prima', () => {
  /* L'ordine di priorità è tecla, madre, ansi, aurelio, brizio, donata, sé.
   * Nella storia di prova: s1 è Tecla, s3 Ansi, s2 il maestro, s4 sé stessa.
   * Quindi l'epitaffio deve cominciare da Tecla e finire con Ada. */
  const ordinate = Epi.ordina(carte(['s4', 's2', 's3', 's1']));
  sequenza(ordinate.map((c) => c.id), ['s1', 's3', 's2', 's4']);
});

test('la chiusura cambia con il finale', () => {
  const a = compone(['s1'], [], 'voce').righe.pop();
  const b = compone(['s1'], [], 'cenere').righe.pop();
  assert.notEqual(a, b);
});

test('un finale sconosciuto non fa crashare: cade sul Calore', () => {
  const e = compone(['s1'], ['s2'], 'nessuno');
  assert.ok(e.righe.length >= 4);
  assert.match(e.righe[0], /Qui riposa Ada Sartori/);
});

test('senza ricordi di nessun tipo l\'epitaffio esiste lo stesso', () => {
  const e = Epi.componi({ tenute: [], bruciate: [], finale: 'cenere', rng });
  assert.ok(e.righe.length >= 3);
  assert.equal(e.tenute, 0);
  assert.equal(e.bruciate, 0);
});

test('i quattro schizzi di cielo si dichiarano, e il numero è giusto', () => {
  const e = compone(['s1'], ['s2'], 'voce', { frammenti: 4 });
  const riga = e.righe.find((r) => r.includes('schizzi di cielo'));
  assert.ok(riga, 'la nota sugli schizzi deve esserci');
  assert.match(riga, /4 schizzi/);
});

test('gli schizzi si dichiarano solo se ci sono', () => {
  const e = compone(['s1'], ['s2'], 'voce', { frammenti: 2 });
  assert.ok(!e.righe.some((r) => r.includes('schizzi di cielo')), 'con due schizzi non si scrive di quattro');
});

test('tenere una scheda di Tecla aggiunge la nota sull\'amore', () => {
  const con = compone(['s1'], [], 'voce');           // s1 è di Tecla
  assert.ok(con.righe.some((r) => r.includes('l\'amore non è un effetto')));
  const senza = compone(['s2'], [], 'voce');
  assert.ok(!senza.righe.some((r) => r.includes('l\'amore non è un effetto')));
});

test('lo stesso Quaderno dà sempre lo stesso epitaffio', () => {
  const a = Epi.componi({ tenute: carte(['s1', 's2']), bruciate: carte(['s3']), finale: 'calore', rng: () => 0.5 });
  const b = Epi.componi({ tenute: carte(['s1', 's2']), bruciate: carte(['s3']), finale: 'calore', rng: () => 0.5 });
  assert.equal(a.righe.join('|'), b.righe.join('|'));
});

test('Quaderni diversi danno epitaffi diversi', () => {
  const a = compone(['s1'], ['s2'], 'calore').righe.join('|');
  const b = compone(['s2'], ['s1'], 'calore').righe.join('|');
  assert.notEqual(a, b, 'se teni e bruci cose diverse, il testo deve cambiare');
});

test('il testo finale è le righe unite da un doppio a capo', () => {
  const e = compone(['s1'], ['s2'], 'calore');
  assert.equal(Epi.testo(e), e.righe.join('\n\n'));
});

test('il riassunto è la prima riga, e non va mai a male', () => {
  assert.equal(Epi.riassunto(compone(['s1'], [], 'voce')).startsWith('Qui riposa'), true);
  assert.match(Epi.riassunto({}), /Qui riposa/);
});

test('nessuna riga resta con una graffa non chiusa', () => {
  for (const finale of ['voce', 'studio', 'calore', 'cielo', 'cenere']) {
    for (let i = 0; i < 40; i++) {
      const e = Epi.componi({
        tenute: carte(['s1', 's2']),
        bruciate: carte(['s3', 's4']),
        finale,
        frammenti: i % 5,
        rng: () => i / 40,
      });
      for (const r of e.righe) {
        assert.ok(!/\{[abcd]/.test(r), `riga con markup non risolto: ${r}`);
      }
    }
  }
});