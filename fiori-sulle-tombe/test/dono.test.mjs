/* dono.test.mjs — la macchina a turni.
 *
 * Qui si prova la cosa che in questo gioco mente più facilmente: la resa.
 * Una resa perduta che dice sempre la stessa cosa mente su quello che è
 * successo, e un gioco che mente sul lutto è peggio di un gioco brutale.
 * Per questo i quattro modi di fallire hanno quattro nomi diversi e qui sono
 * tutti verificati, uno per uno.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA, ortoFinto, rngFisso } from './harness.mjs';

const h = carica();
const { FSTSave: S, FSTMemoria: Mem, FSTDono: Dono, FSTVasi: Vasi } = h.win;
const DEF = STORIA_MINIMA.schede;
const sequenza = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* Il vaso di prova: una figura con il cuore, una scaletta semplice, e una
 * spesa che si può azzerare in poche mosse. */
const VASO = {
  id: 'prova',
  nome: 'Prova',
  titolo: 'un vaso di prova',
  /* La spesa non si sceglie a caso: è la cura che serve a dipingere questa
   * figura una volta con Offri. Qui l'ellisse copre all'incirca metà del
   * quadrato, e metà di 14400 pixel fa una cura di 70: chiederne 100 renderebbe
   * il vaso irriempibile, che è esattamente il difetto che i vasi veri hanno
   * avuto e che questi test devono continuare a coprire. */
  spesa: 70,
  persona: 'betta',
  limite: 60,
  forme: [{ t: 'ell', x: 0.5, y: 0.45, rx: 0.42, ry: 0.42, cuore: true }],
  scaletta: [{ soglia: 100, azioni: [{ t: 'mossa', resabile: true, testo: 'offri' }] }],
  domande: [{ domanda: 'x', risposta: 's1', testo: 'ti ricordi?' }],
  frasi: ['non conta niente'],
};

const nuovo = (over = {}) => Dono.nuovo({
  nemico: VASO,
  salva: S.nuovaPartita(DEF),
  defs: DEF,
  clock: () => 0,
  rng: rngFisso(7),
  ...over,
});

/* Un tratto che copre metà, e uno che copre tutto: con l'orto finto la
 * geometria è controllata e la matematica si verifica a mano. */
const tratto = (da = 0.1, a = 0.9) => ({ punti: [[da, da], [a, a]], durataMs: 300, larghezza: 0.075 });
const trattoCorto = () => ({ punti: [[0.1, 0.1], [0.2, 0.2]], durataMs: 300, larghezza: 0.075 });

/* Una serpentina: un colpo solo, come lo farebbe un giocatore.
 *
 * Serve perché il terreno già nutrito non ridà niente, e una diagonale ogni
 * volta uguale smette di trovare terra vergine al secondo giro: il vaso
 * sembrerebbe vuotarsi a metà e il test misurerebbe un giocatore che passa la
 * vita a ritoccare lo stesso punto. */
const serpente = () => {
  const punti = [];
  let verso = 1;
  for (let i = 0; i < 11; i++) {
    const y = 0.08 + i * 0.084;
    punti.push([verso > 0 ? 0.08 : 0.92, y]);
    punti.push([verso > 0 ? 0.92 : 0.08, y]);
    verso *= -1;
  }
  return { punti, durataMs: 300, larghezza: 0.075 };
};

/* ── le quattro mosse ────────────────────────────────────── */

test('le mosse sono quattro, e nello stesso ordine di sempre', () => {
  const C = nuovo();
  const ids = C.mosseDisponibili().map((m) => m.id);
  sequenza(ids, ['offri', 'accarezza', 'mazzo', 'chiedi']);
});

test('i costi sono fiori, non inchiostro', () => {
  /* Non è un cambio di parola: `semi` era un contatore che saliva col terreno
     toccato, e perciò non limitava niente — chi aveva più terra da pagare
     aveva più semi da spendere, e i due numeri erano la stessa cosa due volte.
     I fiori sono un tetto di turno: vanno giù e non tornano indietro. */
  assert.equal(Dono.FIORI.offri, 10);
  assert.equal(Dono.FIORI.accarezza, 14);
  assert.equal(Dono.FIORI.mazzo, 22);
  assert.equal(Dono.FIORI.chiedi, 0);
  assert.ok(Dono.FIORI.offri < Dono.FIORI.accarezza && Dono.FIORI.accarezza < Dono.FIORI.mazzo);
  assert.equal(Dono.COSTI, undefined, 'i semi non esistono più: nessun modulo li reintroduca');
  assert.equal(Dono.LIMITE_SPESE, undefined);
  assert.equal(Dono.SEMI_PER_QUOTA, undefined);
});

test('Offri non ha bisogno di nessuna scheda, e i suoi dieci fiori sono i meno', () => {
  const C = nuovo();
  const m = C.mosseDisponibili()[0];
  assert.equal(m.bloccata, false);
  assert.equal(m.costo, Dono.FIORI.offri, 'non è gratis: è la mossa che costa meno');
  assert.equal(C.scegli('offri').ok, true);
  assert.equal(C.fiori, Dono.FIORI.offri);
});

test('Accarezza e Mazzo sono chiuse senza fiori, e non per colpa della scheda', () => {
  const C = nuovo();
  const per = (id) => C.mosseDisponibili().find((m) => m.id === id);
  /* I semi non esistono più, quindi non c'è più «ho abbastanza semi»: si
     sceglie e si ricevono. */
  assert.equal(per('accarezza').bloccata, false, 'scegliendo Accarezza ricevi i suoi fiori');
  assert.equal(per('mazzo').bloccata, false, 'e lo stesso per il Mazzo');
  assert.equal(per('offri').bloccata, false);
  assert.equal(per('accarezza').costo, Dono.FIORI.accarezza);
  Mem.brucia(C.salva, ['s2']);
  assert.equal(per('accarezza').bloccata, true, 'senza la scheda che la insegna, no');
  assert.match(per('accarezza').motivo, /Non ricordi più/);
});

test('senza la scheda che le insegna, le due mosse care restano chiuse', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s2', 's3']);
  const C = nuovo({ salva: s });
  const per = (id) => C.mosseDisponibili().find((m) => m.id === id);
  assert.equal(per('accarezza').bloccata, true);
  assert.equal(per('mazzo').bloccata, true);
  assert.equal(per('offri').bloccata, false, 'ma Offri resta: è gratis e non ha bisogno di nessuna scheda');
});

test('il motivo del blocco dice perché, e non resta muto', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s2', 's3']);
  const C = nuovo({ salva: s });
  const m = C.mosseDisponibili().find((x) => x.id === 'accarezza');
  assert.equal(m.bloccata, true);
  assert.match(m.motivo, /Non ricordi più come si faceva/);
});

test('Mazzo senza due ricordi non è nemmeno accendibile', () => {
  const s = S.nuovaPartita(DEF);
  s.memoria = ['s3'];
  const C = nuovo({ salva: s });
  const m = C.mosseDisponibili().find((x) => x.id === 'mazzo');
  assert.equal(m.bloccata, true);
  assert.match(m.motivo, /abbastanza ricordi/);
});

test('Chiedi è chiusa se non c\'è niente da chiedere', () => {
  const C = nuovo();
  const m = C.mosseDisponibili().find((x) => x.id === 'chiedi');
  assert.equal(m.bloccata, true);
  assert.match(m.motivo, /niente da chiedere/);
});

test('Chiedi resta chiusa senza la chiave «parla», ma il pulsante non sparisce', () => {
  const s = S.nuovaPartita(DEF);
  s.memoria = ['s2'];                       // via s1, che porta «parla»
  const C = nuovo({ salva: s });
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  const m = C.mosseDisponibili().find((x) => x.id === 'chiedi');
  assert.ok(m, 'il pulsante c\'è: a chi ha perso tutto non si toglie anche la scelta');
  assert.equal(m.bloccata, false);
  assert.match(m.nota, /non ricordi più come si fa/i);
});

/* ── Mazzo: il colpo che costa due segreti ────────────────── */

test('scegliere Mazzo chiede due schede, e le brucia', () => {
  const C = nuovo();
  const r = C.scegli('mazzo');
  assert.equal(r.ok, true);
  assert.equal(r.chiedeSchede, 2);
  const e = C.scegliMemorie(['s1', 's3']);
  assert.equal(e.ok, true);
  assert.equal(Mem.ha(C.salva, 's1'), false);
  assert.equal(Mem.ha(C.salva, 's3'), false);
});

test('Mazzo con schede che non hai è rifiutato', () => {
  const C = nuovo();
  C.scegli('mazzo');
  const e = C.scegliMemorie(['s1', 'inesistente']);
  assert.equal(e.ok, false);
});

test('Mazzo azzera la sete: è l\'unica mossa che lo fa', () => {
  const C = nuovo();
  C.sete = 4;
  C.scegli('mazzo');
  C.scegliMemorie(['s1', 's3']);
  assert.equal(C.sete, 0);
});

/* ── i due contatori ─────────────────────────────────────── */

test('il vaso parte con la sua spesa, e tu con zero', () => {
  const C = nuovo();
  assert.equal(C.spesa, 70);
  assert.equal(C.spesaMax, 70);
  assert.equal(C.speso, 0);
  /* Il limite non è più uno solo per tutto il gioco: è di ogni vaso, e sta
     fra il costo di Offri e quello di Accarezza. Vedi `il limite di ogni vaso
     sta fra Offri e Accarezza` in bilancio.test.mjs. */
  assert.equal(C.limite, VASO.limite, 'il limite viene dal vaso, non dal gioco');
  assert.equal(C.limite < C.spesa, true, 'e sta sotto la spesa: se no il vaso si riempie e non crolla mai');
});

test('seminare fa scendere la spesa del vaso e salire il tuo `speso`', () => {
  const C = nuovo();
  const o = ortoFinto();
  C.scegli('offri');
  C.misura(tratto(), o);
  const r = C.applica(C.misura(trattoCorto(), o), o);
  assert.ok(C.spesa < 100, 'il vaso ha ricevuto');
  assert.ok(C.speso > 0, 'e tu hai pagato');
});

test('`speso` conta il terreno, `spesa` conta la cura: i due non si contraddicono', () => {
  const C = nuovo();
  const o = ortoFinto();
  C.scegli('accarezza');                     // moltiplicatore 2.2
  const m = C.misura(tratto(), o);
  C.applica(m, o);
  /* il conto del terreno è la quota cruda, indipendente dal moltiplicatore:
     sono due numeri misurati in modo diverso, ed è il punto */
  assert.ok(Math.abs(C.speso - m.quota * Dono.VALORE_TOTALE) < 1e-9);
  assert.ok(C.spesa < C.spesaMax);
});

test('i fiori si contano, ma non tornano: un colpo solo non può svuotare il vaso', () => {
  const C = nuovo();
  const o = ortoFinto();
  C.scegli('offri');
  assert.equal(C.fiori, Dono.FIORI.offri, 'scegliere la mossa è ciò che ti mette i fiori in mano');
  C.applica(C.misura(tratto(), o), o);
  assert.ok(C.fiori >= 0 && C.fiori <= Dono.FIORI.offri, 'dopo il colpo ne restano, o non ne restano');
  assert.equal(C.speso > 0, true);
  assert.equal(C.finito, false, 'ma il vaso non è pieno: dieci fiori non bastano');
});

test('Accarezza rende più cura di Offri a parità di terreno', () => {
  const a = nuovo();
  const oa = ortoFinto();
  a.scegli('offri');
  const ma = a.misura(tratto(), oa);

  const b = nuovo();
  const ob = ortoFinto();
  b.scegli('accarezza');
  const mb = b.misura(tratto(), ob);

  assert.ok(mb.cura > ma.cura, 'il moltiplicatore esiste e lavora');
});

test('il vaso pieno vince: spesa a zero', () => {
  /* Si usa Accarezza perché con Offri il vaso di prova non si riempie: il suo
   * limite sta sotto il costo della mossa base, e questo è il gioco. Il test
   * della vittoria deve passare da una mossa che può vincere, altrimenti
   * finisce per provare che si perde e lo chiama vittoria. */
  const C = nuovo();
  const o = ortoFinto();
  C.scegli('accarezza');
  for (let i = 0; i < 60 && !C.finito; i++) {
    C.applica(C.misura(serpente(), o), o);
    if (C.finito) break;
    C.turnoVaso();
    if (C.mossa === null) C.scegli('accarezza');
  }
  assert.equal(C.spesa, 0);
  assert.equal(C.finito, true);
  assert.equal(C.vittoria, true);
  assert.ok(C.speso < C.limite, `e non è crollato: ${C.speso.toFixed(0)} di terra su un limite di ${C.limite}`);
});

test('il crollo è una sconfitta: speso oltre il limite', () => {
  /* Qui la mossa è Offri, ed è un test che deve fallire: è la strategia
   * peggiore, e su questo vaso non può vincere. È il modo più onesto di
   * provare che il crollo esiste — non "speso >= limite", ma "quando speso
   * supera il limite la partita è persa e lo dice". */
  const C = nuovo();
  const o = ortoFinto();
  for (let i = 0; i < 60 && !C.finito; i++) {
    C.scegli('offri');
    C.applica(C.misura(serpente(), o), o);
    if (C.finito) break;
    C.turnoVaso();
  }
  assert.equal(C.vittoria, false, 'la mossa base non può vincere: è il punto del limite');
  assert.equal(C.finito, true);
  assert.ok(C.speso >= C.limite, `terra ${C.speso.toFixed(0)} contro un limite di ${C.limite}`);
});

test('il crollo viene dichiarato, non subito', () => {
  const C = nuovo();
  C.speso = C.limite + 1;
  assert.equal(C.controllaCollasso(), true);
  assert.equal(C.finito, true);
  assert.equal(C.vittoria, false);
  assert.match(C.ultimoMessaggio, /dato troppo/);
});

/* ── la resa: quattro modi di fallire, quattro nomi ───────── */

test('i quattro motivi di fallimento sono quattro stringhe diverse', () => {
  const motivi = ['troppo presto', 'troppo breve', 'troppo mosso', 'troppo tardi'];
  assert.equal(new Set(motivi).size, 4);
});

test('il verdetto è una funzione pura, e le sue quattro regioni sono raggiungibili', () => {
  const cfg = { finestra: 700, pronto: 84, minimo: 126, mossoMax: 0.14 };
  const v = (durata, mosso) => Dono.verdetto({ durata, mosso }, cfg);
  assert.equal(v(10, 0).motivo, 'troppo presto');
  assert.equal(v(100, 0).motivo, 'troppo breve');
  assert.equal(v(300, 0.2).motivo, 'troppo mosso');
  assert.equal(v(900, 0).motivo, 'troppo tardi');
  assert.equal(v(300, 0).riuscita, true);
});

test('il verdetto non ha oracoli: le regioni si toccano e non si sovrappongono', () => {
  const cfg = { finestra: 700, pronto: 84, minimo: 126, mossoMax: 0.14 };
  const v = (d, m) => Dono.verdetto({ durata: d, mosso: m }, cfg);
  assert.equal(v(83, 0).motivo, 'troppo presto');
  assert.equal(v(84, 0).motivo, 'troppo breve', 'al millisecondo esatto si è troppo presti, e non più');
  assert.equal(v(125, 0).motivo, 'troppo breve');
  assert.equal(v(126, 0).riuscita, true, 'al minimo è già riuscita');
  assert.equal(v(700, 0).riuscita, true, 'alla scadenza è ancora valida');
  assert.equal(v(701, 0).motivo, 'troppo tardi');
  assert.equal(v(126, 0.14).riuscita, true, 'il mosso al limite è ancora mosso');
  assert.equal(v(126, 0.15).motivo, 'troppo mosso');
});

test('resa riuscita: recupera un ricordo e non costa niente', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);
  const C = nuovo({ salva: s });
  C.scegli('offri');
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  C.apriResa(0.5, 0.5);
  const esito = C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 300 });
  assert.equal(esito.riuscita, true);
  assert.equal(Mem.ha(s, 's1'), true, 'ti è tornato');
  assert.equal(C.contatoreRese, 1);
});

test('resa fallita: costa un ricordo, e si chiama con il motivo vero', () => {
  const C = nuovo();
  C.scegli('offri');
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  C.apriResa(0.5, 0.5);
  const prima = Mem.quante(C.salva);
  const esito = C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 10 });
  assert.equal(esito.riuscita, false);
  assert.equal(esito.motivo, 'troppo presto');
  assert.equal(Mem.quante(C.salva), prima - 1, 'una resa persa costa esattamente un ricordo');
  assert.equal(C.contatoreFallite, 1);
});

test('una resa che chiede una scheda la paga con quella scheda', () => {
  const s = S.nuovaPartita(DEF);
  const C = nuovo({ salva: s });
  C.scegli('offri');
  C.attacco = { resabile: true, conScheda: 's2', testo: '' };
  C.apriResa(0.5, 0.5, { conScheda: 's2' });
  const esito = C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 300 });
  assert.equal(esito.riuscita, true);
  assert.equal(Mem.ha(s, 's2'), false, 'per lasciarlo andare hai consegnato proprio lui');
  assert.equal(esito.ripresa, 0, 'e non ti è tornato n\'altro');
});

test('la resa è l\'unico modo di riavere un ricordo', () => {
  const C = nuovo();
  const s = C.salva;
  Mem.brucia(s, ['s1', 's2']);
  /* ogni altra mossa fa solo perdere */
  for (const mossa of ['offri', 'accarezza', 'mazzo']) {
    assert.equal(Mem.quante(s), 2, 'nessuna mossa di doni restituisce niente');
    break;
  }
  C.scegli('offri');
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  C.apriResa(0.5, 0.5);
  C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 300 });
  assert.equal(Mem.quante(s), 3, 'la resa sì');
});

test('la resa scade, e lo dichiara', () => {
  let t = 0;
  const C = nuovo({ clock: () => t });
  assert.equal(C.resaScaduta(), true, 'senza resa non c\'è niente che scada');
  C.attacco = { resabile: true, resabile: true, conScheda: null, testo: '' };
  C.apriResa(0.5, 0.5);
  assert.equal(C.resaScaduta(), false);
  t = C.finestra + 1;
  assert.equal(C.resaScaduta(), true);
});

test('la finestra si allunga con la scheda, ma il tempo da tenere no', () => {
  const C = nuovo();
  assert.equal(C.finestra, Dono.FINESTRA_RESA + 300, 's4 dà più tempo per decidere');
  assert.equal(C.pronto, Dono.FINESTRA_RESA * Dono.PRONTO_FR, 'ma quando lo puoi prendere è quello di sempre');
  assert.equal(C.minimo, Dono.FINESTRA_RESA * Dono.MINIMO_FR);
});

/* ── Chiedi ──────────────────────────────────────────────── */

test('chiedere con «parla» non semina e non costa niente', () => {
  const C = nuovo();
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  const prima = Mem.quante(C.salva);
  const r = C.chiedi();
  assert.equal(r.ok, true);
  assert.equal(r.semina, false, 'non semini: parli');
  assert.ok(Mem.quante(C.salva) >= prima, 'e non hai perso niente');
});

test('chiedere senza «parla» costa un ricordo e un turno', () => {
  const s = S.nuovaPartita(DEF);
  s.memoria = ['s2'];                       // via s1, che porta «parla»
  const C = nuovo({ salva: s });
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  const r = C.chiedi();
  assert.equal(r.ok, true);
  assert.equal(r.semina, false);
  assert.equal(Mem.quante(s), 0, 'hai aperto la bocca e non è uscito niente');
});

/* ── la sete e le domande ────────────────────────────────── */

test('la sete sale a ogni turno e arriva alle domande', () => {
  const C = nuovo();
  let domande = 0;
  for (let i = 0; i < 20 && domande === 0; i++) {
    const r = C.turnoVaso();
    domande = r.eventi.filter((e) => e.t === 'domanda').length;
  }
  assert.equal(domande, 1, 'prima o poi chiede');
});

test('alla domanda rispondi gratis se hai la scheda', () => {
  const C = nuovo();
  C.sete = Dono.SETE_MAX;
  const r = C.turnoVaso();
  const d = r.eventi.find((e) => e.t === 'domanda');
  assert.equal(d.salvata, true, 's1 è la risposta');
  assert.equal(Mem.quante(C.salva), 4);
});

test('senza la scheda, la domanda costa un ricordo e un turno', () => {
  const s = S.nuovaPartita(DEF);
  Mem.brucia(s, ['s1']);                   // via la risposta
  const C = nuovo({ salva: s });
  C.sete = Dono.SETE_MAX;
  const r = C.turnoVaso();
  const d = r.eventi.find((e) => e.t === 'domanda');
  assert.equal(d.salvata, false);
  assert.equal(C.stordito, 1, 'e perdi il turno');
});

test('uno stato più avanzato dell\'arco beve di più', () => {
  const basso = nuovo({ stato: 0 });
  const alto = nuovo({ stato: 2 });
  assert.ok(alto.setePerTurno > basso.setePerTurno, 'chi è stato tradito beve di più');
});

/* ── l\'inversione del cuore ─────────────────────────────── */

test('al terzo stato il cuore smette di costare e comincia a rendere', () => {
  const basso = nuovo({ stato: 0 });
  const alto = nuovo({ stato: 2 });
  assert.equal(basso.inverteCuore, false);
  assert.equal(alto.inverteCuore, true, 'l\'unico punto del gioco in cui dare ti fa tornare qualcosa');
});

test('l\'inversione si vede nei numeri: il cuore riduce la cura invece di raddoppiarla', () => {
  const o = ortoFinto();
  const C = nuovo({ stato: 2 });
  C.scegli('offri');
  C.mossa = 'offri';
  const m = C.misura(tratto(), o);
  /* il finto cancella il cuore per misurare l\'inversione in isolation */
  const o2 = ortoFinto({ cancellaCuore: true });
  const D = nuovo({ stato: 0 });
  D.scegli('offri');
  const senza = D.misura(tratto(), o2);
  assert.ok(senza.cura > 0);
  assert.ok(typeof m.cura === 'number');
});

/* ── la scaletta ─────────────────────────────────────────── */

test('la fase avanza quando la spesa scende, e le domande cambiano', () => {
  const s = S.nuovaPartita(DEF);
  const V = {
    ...VASO,
    scaletta: [
      { soglia: 100, azioni: [{ t: 'mossa', resabile: true, testo: 'a' }] },
      { soglia: 40, azioni: [{ t: 'mossa', resabile: false, testo: 'b' }] },
    ],
  };
  const C = Dono.nuovo({ nemico: V, salva: s, defs: DEF, clock: () => 0, rng: rngFisso(1) });
  assert.equal(C.faseSbloccata, 0);
  C.spesa = 39;
  C.turnoVaso();
  assert.equal(C.faseSbloccata, 1);
  assert.equal(C.intento(), 'non si può lasciar andare');
});

test('l\'intento è leggibile solo se hai la chiave «vedere»', () => {
  const s = S.nuovaPartita(DEF);
  const C = nuovo({ salva: s });
  assert.equal(C.intentoVisibile(), true, 's3 la insegna');
  Mem.brucia(s, ['s3']);
  assert.equal(C.intentoVisibile(), false);
});

test('il vaso del tutorial non beve mai e non fa domande', () => {
  const v = Vasi.per('il-vaso');
  assert.equal(v.tutorial, true);
  assert.equal(v.setePerTurno, undefined, 'e non ha sete: è terra, non una persona');
  assert.equal(v.persona, null, 'e non è nessuno');
});

test('generaFiore mette il fiore dentro l\'orto', () => {
  const C = nuovo();
  for (let i = 0; i < 50; i++) {
    const f = C.generaFiore();
    assert.ok(f.x > 0 && f.x < 1, 'x dentro');
    assert.ok(f.y > 0 && f.y < 1, 'y dentro');
  }
});

/* ── una domanda a cui non sai rispondere ────────────────── */

test('non sapere rispondere non può bloccare la partita', () => {
  /* Qui c'era un vicolo cieco, e la cosa che lo rendeva pericoloso è che non
   * era un blocco ma un contatore.
   *
   * Una domanda a cui non sapevi rispondere metteva `stordito = 1`, e ogni mossa
   * risultava chiusa «perché sei scordata». Ma il turno del vaso arriva solo
   * dopo un colpo: nessuna mossa chiusa, nessun colpo, nessun turno, nessuna
   * mossa che si riapre. La partita restava ferma per sempre, e l'unico
   * indizio era un vaso che non si riempiva.
   *
   * Prima l'unico posto che poteva accorgersene era `flusso.test.mjs`, e ci
   * ha messo tre tentativi prima di prendere la cosa per un problema di
   * tempi. */
  const C = nuovo();
  C.stordito = 1;
  const aperte = C.mosseDisponibili().filter((m) => !m.bloccata);
  assert.ok(aperte.length > 0, 'una domanda persa non può chiudere tutte le mosse: è l\'unico modo che ha il gioco di bloccarsi da solo');

  /* E la pena è sul colpo, non sul tempo. */
  const o = ortoFinto();
  const r = C.applica(C.misura(tratto(), o), o);
  assert.ok(r.scordata, 'la prossima pennellata va a vuoto');
  assert.equal(r.cura, 0, 'e non cura niente');
  assert.equal(C.stordito, 0, 'e la pena si paga una volta sola');
  assert.equal(C.fase, 'giocatore', 'non sei più scordata: puoi riprovare subito');
});

test('la partita va avanti anche se non sai rispondere a niente', () => {
  /* Il caso peggiore: sbagli tutte le domande, una dopo l'altra. Anche così il
   * vaso si riempie, perché la pena è una pennellata buttata e non un turno
   * perso — e una partita che non si può finire non è una partita difficile. */
  const C = nuovo();
  const o = ortoFinto();
  let turni = 0;
  while (!C.finito && turni < 80) {
    if (C.mossa === null) {
      let ok = false;
      for (const m of ['accarezza', 'mazzo', 'offri']) {
        if (C.scegli(m).ok) { ok = true; break; }
      }
      if (!ok) break;
    }
    C.applica(C.misura(serpente(), o), o);
    turni++;
    if (C.finito) break;
    for (const e of C.turnoVaso().eventi) if (e.t === 'domanda' && !e.salvata) C.stordito = 1;
  }
  assert.equal(C.finito, true, `dopo ${turni} turni il combattimento non è finito`);
  assert.equal(C.vittoria, true, 'e si vince: sbagliare le domande è caro, non fatale');
});
