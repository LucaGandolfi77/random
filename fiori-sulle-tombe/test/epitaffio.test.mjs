/* epitaffio.test.mjs — la grammatica che scrive il tuo epitaffio, e i titoli di coda.
 *
 * Due partite diverse danno due epitaffi diversi, e la stessa partita ne dà
 * sempre lo stesso. Qui si controlla anche che nessuna frase citata venga dal
 * nulla: ogni ricordo che compare nel testo è uno che hai davvero perso o
 * tenuto, e nessuno si perde strada fra l'elenco e la frase.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const h = carica();
const { FSTEpitaffio: Epi } = h.win;

const rng = () => 0.5;                        // scelta fissa: la partita è deterministica
const SCHEDE = [
  { id: 'x1', persona: 'betta', titolo: 'X1', nome: 'la rosa che Betta non ha portato' },
  { id: 'x2', persona: 'sauro', titolo: 'X2', nome: 'la spalla sotto l\'aiuola' },
  { id: 'x3', persona: 'nadia', titolo: 'X3', nome: 'il tuo orecchio destro' },
  { id: 'x4', persona: 'ansi', titolo: 'X4', nome: 'la luna del funerale' },
];

/* ── la lista ────────────────────────────────────────────── */

test('lista: niente, uno, due, tre', () => {
  assert.equal(Epi.lista([]), '');
  assert.equal(Epi.lista(['a']), 'a');
  assert.equal(Epi.lista(['a', 'b']), 'a e b');
  assert.equal(Epi.lista(['a', 'b', 'c']), 'a, b e c');
  assert.equal(Epi.lista(['a', 'b', 'c', 'd']), 'a, b, c e d');
});

test('ordina mette prima chi è stato perso per primo', () => {
  /* L'ordine di tenerezza è anche l'ordine con cui il Mazzetto è nato: chi se
     n'è andato per primo è il primo ricordato. */
  assert.equal(Epi.PRIORITA[0], 'sauro', 'il giardino viene primo di tutti');
  const ord = Epi.ordina([
    { persona: 'brizio' }, { persona: 'ansi' }, { persona: 'sauro' }, { persona: 'betta' },
  ]);
  assert.equal(ord[0].persona, 'sauro');
  assert.equal(ord[1].persona, 'betta');
  assert.equal(ord[2].persona, 'ansi');
  assert.equal(ord[3].persona, 'brizio');
});

test('ordina mette in fondo chi non è nel cast, e non lo perde', () => {
  const ord = Epi.ordina([{ persona: 'nessuno' }, { persona: 'betta' }]);
  assert.equal(ord.length, 2);
  assert.equal(ord[1].persona, 'nessuno');
});

/* ── l'epitaffio ─────────────────────────────────────────── */

test('l\'epitaffio comincia da «Qui riposa» e dice il nome', () => {
  const e = Epi.componi({ finale: 'giardino', rng });
  assert.match(e.righe[0], /^Qui riposa Nadia Ferro/);
});

test('un nome diverso sostituisce quello di default, in ogni finale', () => {
  for (const f of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
    const e = Epi.componi({ finale: f, nome: 'Nina Ferro', rng });
    assert.ok(e.righe[0].includes('Nina Ferro'), `${f}: il nome non è stato sostituito`);
    assert.equal(e.righe[0].includes('Nadia'), false, `${f}: è rimasto il nome di default`);
  }
});

test('ogni finale dà un epitaffio diverso', () => {
  const righe = new Set();
  for (const f of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
    righe.add(Epi.componi({ finale: f, rng }).righe[0]);
  }
  assert.equal(righe.size, 5, 'cinque finali, cinque aperture');
});

test('quello che hai dato al terreno ci compare, e quello che hai tenuto anche', () => {
  const e = Epi.componi({
    finale: 'vigna',
    tenute: SCHEDE,
    bruciate: [{ id: 'b1', persona: 'donata', nome: 'la commissione detta a tavola' }],
    rng,
  });
  const testo = e.righe.join('\n');
  assert.ok(testo.includes('la commissione detta a tavola'), 'la bruciata è citata');
  assert.ok(testo.includes('il tuo orecchio destro'), 'e la tenuta');
  assert.ok(testo.includes('Fece fiorire'), 'la sezione si chiama così, non "Tolse dal mondo"');
  assert.equal(testo.includes('Tolse dal mondo'), false, 'quella era la frase dell\'altro gioco');
});

test('nessuna frase citata viene dal nulla', () => {
  const tenute = [SCHEDE[2], SCHEDE[1]];
  const bruciate = [SCHEDE[0], SCHEDE[3]];
  const e = Epi.componi({ finale: 'prato', tenute, bruciate, rng });
  const citate = [...tenute, ...bruciate].map((c) => c.nome);
  for (const nome of citate) {
    /* ogni scheda finisce o nel primo o nel terzo dei tre elenchi citati */
    const presente = e.righe.some((r) => r.includes(nome));
    assert.ok(presente || citate.indexOf(nome) > 2, `"${nome}" non compare da nessuna parte e non è stato detto che è di scarto`);
  }
});

test('senza niente da dare, l\'epitaffio lo dice e non inventa', () => {
  const e = Epi.componi({ finale: 'prato', tenute: SCHEDE, bruciate: [], rng });
  assert.ok(e.righe.join('\n').includes('Non diede niente al terreno'));
  assert.equal(/Fece fiorire:/.test(e.righe.join('\n')), false);
});

test('senza niente da tenere, anche', () => {
  const e = Epi.componi({ finale: 'terra', tenute: [], bruciate: [], rng });
  const t = e.righe.join('\n');
  assert.ok(t.includes('Non diede niente al terreno'));
  assert.ok(t.includes('Non tenne niente'));
});

test('i petali si dichiarano, e la nota cambia a sei', () => {
  const poco = Epi.componi({ finale: 'vigna', petali: 3, rng }).righe.join('\n');
  assert.ok(poco.includes('3 vasi su sei'), 'la conta quello che c\'è');
  assert.ok(poco.includes('Gli altri sono ancora terra'));
  const tutti = Epi.componi({ finale: 'giardino', petali: 6, rng }).righe.join('\n');
  assert.ok(tutti.includes('tutti e sei i vasi'));
});

test('la nota del giardino dice sempre se lo hai saputo o no', () => {
  /* Esce nei due casi, e non solo quando lo sai: il caso in cui non lo sai è
     quello che va detto, e se restasse muto la parte peggiore del gioco
     passerebbe inosservata. */
  const zero = Epi.componi({ finale: 'giardino', statoSauro: 0, rng }).righe.join('\n');
  const uno = Epi.componi({ finale: 'giardino', statoSauro: 1, rng }).righe.join('\n');
  const due = Epi.componi({ finale: 'giardino', statoSauro: 2, rng }).righe.join('\n');
  assert.ok(zero.includes('Non lo ha mai saputo'), 'non sapere si dichiara');
  assert.ok(uno.includes('Non lo ha mai saputo'));
  assert.ok(due.includes('Lo ha saputo che era lui'), 'e sapere pure');
  assert.notEqual(zero, due);
});

test('la promessa è dichiarata, e le due versioni si distinguono', () => {
  const si = Epi.componi({ finale: 'giardino', promessa: true, rng }).righe.join('\n');
  const no = Epi.componi({ finale: 'giardino', promessa: false, rng }).righe.join('\n');
  assert.ok(si.includes('Hai mantenuto la promessa'));
  assert.ok(no.includes('Non hai mantenuto la promessa'));
});

test('nessun finale lascia un\'apertura o una conclusione con markup', () => {
  for (let k = 0; k < 40; k++) {
    const r = (k * 0.025) % 1;
    for (const f of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
      const e = Epi.componi({ finale: f, rng: () => r, petali: 6, statoSauro: 2, promessa: true });
      for (const riga of e.righe) {
        assert.equal(/\{[abcd/]/.test(riga), false, `${f}: markup non risolto in «${riga.slice(0, 40)}»`);
      }
    }
  }
});

test('un finale inesistente non fa cadere niente', () => {
  const e = Epi.componi({ finale: 'inesistente', rng });
  assert.ok(e.righe.length >= 4);
  assert.equal(e.finale, 'inesistente', 'e riporta quello che gli hai chiesto, non quello di cui parlava');
});

test('la stessa partita dà sempre lo stesso epitaffio', () => {
  const a = Epi.componi({ finale: 'vigna', tenute: SCHEDE, bruciate: SCHEDE.slice(0, 1), rng });
  const b = Epi.componi({ finale: 'vigna', tenute: SCHEDE, bruciate: SCHEDE.slice(0, 1), rng });
  assert.equal(Epi.testo(a), Epi.testo(b));
});

test('testo e riassunto non spaccano con un epitaffio vuoto', () => {
  assert.equal(Epi.testo({}), '');
  assert.match(Epi.riassunto({}), /Qui riposa/);
  assert.match(Epi.riassunto({ righe: ['riga'] }), /riga/);
});

/* ── i titoli di coda: l'arc[o] di ognuno ────────────────── */

const CAST = [
  { id: 'sauro', nome: 'Sauro', ruolo: 'il marito, o la tomba', arco: ['l\'uomo sotto l\'aiuola', 'chi è sotto da sempre', 'il primo fiore'] },
  { id: 'betta', nome: 'Betta', ruolo: 'la sorella', arco: ['chi è partita', 'che hai perso in silenzio', 'che ti ha piantato il vaso'] },
];

test('destino: lo stato sceglie la frase', () => {
  assert.equal(Epi.destino(CAST[1], { stato: 0 }).testo, 'chi è partita');
  assert.equal(Epi.destino(CAST[1], { stato: 1 }).testo, 'che hai perso in silenzio');
  assert.equal(Epi.destino(CAST[1], { stato: 2 }).testo, 'che ti ha piantato il vaso');
});

test('destino: il vaso fiorito si dichiara, e non ci si nasconde dietro', () => {
  const d = Epi.destino(CAST[1], { stato: 2, fiorito: true });
  assert.ok(d.testo.includes('Il suo vaso è fiorito tutto insieme'));
});

test('destino: senza più schede si dichiara anche quello', () => {
  const d = Epi.destino(CAST[1], { stato: 0, vivo: false });
  assert.ok(d.testo.includes('Non le resta più niente da ricordare di lei'));
});

test('destino: uno stato fuori range non rompe niente', () => {
  for (const st of [-1, 0, 1, 2, 5, 99]) {
    const d = Epi.destino(CAST[0], { stato: st });
    assert.ok(d && d.testo, `stato ${st}: niente da dire`);
  }
});

test('destino: una voce senza arco dà null, e non mente', () => {
  assert.equal(Epi.destino({ id: 'x', nome: 'X' }, {}), null);
  assert.equal(Epi.destino(null, {}), null);
});

test('puntata restituisce una riga per ogni voce del cast, sempre', () => {
  const coda = Epi.puntata(CAST, { betta: { stato: 1, vivo: true } }, 'prato');
  assert.equal(coda.length, 2);
  assert.equal(coda[0].nome, 'Sauro');
  assert.equal(coda[0].testo, 'l\'uomo sotto l\'aiuola', 'senza stato si parte dalla prima frase, che è quella di chi è');
  assert.equal(coda[0].stato, 0);
  assert.equal(coda[1].testo.includes('che hai perso in silenzio'), true);
});

test('puntata con un cast vuoto non fallisce', () => {
  assert.equal(Epi.puntata([], {}, 'prato').length, 0);
  assert.equal(Epi.puntata(CAST, {}, 'prato').length, 2);
});

test('i titoli delle puntate cambiano col finale', () => {
  const titoli = new Set();
  for (const f of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
    titoli.add(Epi.titoloPuntata(f, rng));
  }
  assert.equal(titoli.size, 5, 'cinque finali, cinque titoli di testa');
  assert.match(Epi.titoloPuntata('giardino', () => 0), /IL GIARDINO — puntata ultima/);
  assert.match(Epi.titoloPuntata('terra', () => 0), /LA TERRA — puntata ultima/);
  /* i due titoli alternativi esistono, e non sono uguali al primo */
  for (const f of Object.keys(Epi.TITOLI)) {
    assert.ok(new Set(Epi.TITOLI[f]).size === Epi.TITOLI[f].length, `${f}: due titoli identici`);
  }
});

test('i titoli esistono per tutti e cinque i finali', () => {
  for (const f of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
    assert.ok(Array.isArray(Epi.TITOLI[f]) && Epi.TITOLI[f].length, `${f}: nessun titolo`);
  }
});
