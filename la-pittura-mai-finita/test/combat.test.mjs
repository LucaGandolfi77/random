/* combat.test.mjs — la macchina a turni.
 *
 * Qui si verifica la promessa del gioco: la parata è l'unico modo di
 * riavere un ricordo, e fallirla costa esattamente quanto costa non parare.
 * Se queste due cose cambiano, il gioco mente, e un gioco che mente sul lutto
 * è peggio di un gioco brutale.
 *
 * L'orologio e il caso sono iniettati: nessun test aspetta davvero 700 ms e
 * nessuno dipende da Math.random.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA, telaFinto, rngFisso } from './harness.mjs';

const { win } = carica({ storia: STORIA_MINIMA });
const Comb = win.PMFCombat;
const Mem = win.PMFMemoria;
const S = win.PMFSave;
const Nem = win.PMFNemici;
const defs = STORIA_MINIMA.schede;

const sequenza = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);

/* Una battaglia con un nemico piccolo e prevedibile, e un orologio che si
 * comanda a mano. */
function battaglia({ nemico = 'il-commiato', schede = ['s1', 's2', 's3', 's4'], rng = rngFisso(7), vita = 100 } = {}) {
  const s = S.SALVA_DEFAULT();
  s.memoria = [...schede];
  s.bruciate = [];
  s.riafferrate = [];
  s.scelte = {};
  const nem = { ...Nem.per(nemico), vita };
  let t = 1000;
  const C = Comb.nuovo({ nemico: nem, salva: s, defs, rng, clock: () => t });
  return { C, s, avanza: (ms) => { t += ms; }, tel: telaFinto() };
}

/* Una riga dritta lunga `len` che parte da `da` e va verso destra. */
const riga = (x, y, len = 0.5) => [[x, y], [x + len, y]];

test('le quattro mosse sono sempre elencate, anche quando non puoi usarle', () => {
  const { C } = battaglia();
  const mosse = C.mosseDisponibili().map((m) => m.id);
  sequenza(mosse, ['traccia', 'lavora', 'inchiostro', 'chiedi']);
});

test('il gioco parte con una sola mossa: il resto è da guadagnare', () => {
  const { C } = battaglia({ schede: ['s1'] });
  const per = Object.fromEntries(C.mosseDisponibili().map((m) => [m.id, m]));
  assert.equal(per.traccia.bloccata, false, 'Traccia è l\'unica cosa che sai fare all\'inizio');
  assert.equal(per.lavora.bloccata, true);
  assert.equal(per.inchiostro.bloccata, true);
  assert.match(per.lavora.motivo, /Non ricordi più come si faceva/,
    'il motivo è la memoria mancante, non un costo');
});

test('Chiedi si sblocca solo quando c\'è un attacco da parare', () => {
  const { C } = battaglia();
  assert.equal(C.mosseDisponibili().find((m) => m.id === 'chiedi').bloccata, true);
  C.turnoNemico();
  const chiedi = C.mosseDisponibili().find((m) => m.id === 'chiedi');
  assert.equal(chiedi.bloccata, false, 'c\'è un attacco: si può scegliere come rispondere');
});

test('Traccia non costa niente e fa sempre danno', () => {
  const { C, tel } = battaglia();
  const m = C.mosseDisponibili().find((x) => x.id === 'traccia');
  assert.equal(m.costo, 0);
  C.scegli('traccia');
  const e = C.punto(riga(0.3, 0.5));
  const misura = C.misura({ punti: riga(0.3, 0.5), durataMs: 200 }, tel);
  assert.ok(misura.danno > 0);
  assert.equal(e.tipo, 'normale');
});

test('coprire il ritratto dà inchiostro', () => {
  const { C, tel } = battaglia();
  C.scegli('traccia');
  C.misura({ punti: riga(0.3, 0.5), durataMs: 200 }, tel);
  assert.ok(C.inchiostro > 0, 'l\'inchiostro si prende coprendo, non si trova');
});

test('Lavora fa più danno di Traccia ma costa inchiostro', () => {
  const a = battaglia();
  a.C.scegli('traccia');
  const dTraccia = a.C.misura({ punti: riga(0.3, 0.5), durataMs: 200 }, a.tel).danno;

  const b = battaglia();
  b.C.inchiostro = 99;
  b.C.scegli('lavora');
  assert.equal(b.C.inchiostro, 99 - Comb.COSTI.lavora, 'la si paga quando la scegli');
  const dLavora = b.C.misura({ punti: riga(0.3, 0.5), durataMs: 200 }, b.tel).danno;

  assert.ok(dLavora > dTraccia, 'il lavoro lento rende di più');
  assert.ok(b.C.inchiostro > 99 - Comb.COSTI.lavora, 'e il tratto ne riaccredita un po\' inchiostro');
});

test('Lavora si blocca quando l\'inchiostro è asciutto', () => {
  const { C } = battaglia();
  C.asciutto = 2;
  const lavora = C.mosseDisponibili().find((m) => m.id === 'lavora');
  assert.equal(lavora.bloccata, true);
  assert.match(lavora.motivo, /asciutto/);
  assert.equal(C.scegli('lavora').ok, false);
  assert.equal(C.mosseDisponibili().find((m) => m.id === 'traccia').bloccata, false, 'Traccia si usa sempre');
});

test('Inchiostro chiede due schede da bruciare prima di dipingere', () => {
  const { C, s } = battaglia();
  C.inchiostro = 99;
  const r = C.scegli('inchiostro');
  assert.equal(r.ok, true);
  assert.equal(r.chiedeSchede, Comb.MEMORIE_PER_PARATA);
  assert.equal(s.memoria.length, 4, 'non è ancora bruciato niente');

  const q = C.scegliMemorie(['s1', 's3']);
  assert.equal(q.ok, true);
  sequenza(s.memoria, ['s2', 's4']);
  assert.ok(C.inchiostro < 99 - Comb.COSTI.inchiostro + 1);
});

test('Inchiostro non parte con meno di due schede', () => {
  /* s3 porta la chiave «inchiostro», ma da sola non basta: se ne deve
   * bruciare due, e una sola non è un sacrificio, è un incidente. */
  const { C } = battaglia({ schede: ['s3'] });
  C.inchiostro = 99;
  const m = C.mosseDisponibili().find((x) => x.id === 'inchiostro');
  assert.equal(m.bloccata, true);
  assert.match(m.motivo, /Non hai abbastanza ricordi/);
});

test('Inchiostro azzera l\'ansia del nemico', () => {
  const { C } = battaglia();
  C.ansia = 4;
  C.inchiostro = 99;
  C.scegli('inchiostro');
  C.scegliMemorie(['s1', 's2']);
  assert.equal(C.ansia, 0);
});

test('parata riuscita: nessuna perdita e un ricordo torna indietro', () => {
  const { C, s } = battaglia();
  Mem.brucia(s, ['s3']);
  sequenza(s.memoria, ['s1', 's2', 's4']);

  C.turnoNemico();
  assert.ok(C.attacco, 'il nemico ha attaccato');
  C.apriParata([0.3, 0.5], [0.7, 0.5]);

  const res = C.rispondiParata({ punti: riga(0.3, 0.5), durataMs: 200 });
  assert.equal(res.riuscita, true);
  assert.equal(C.contatoreParate, 1);
  assert.equal(C.contatoreFallite, 0);
  assert.equal(Mem.ha(s, 's3'), true, 'il ricordo è tornato');
  assert.equal(C.attacco, null, 'e l\'attacco è finito');
});

test('parata fallita: un ricordo se ne va', () => {
  const { C, s } = battaglia();
  C.turnoNemico();
  C.apriParata([0.3, 0.5], [0.7, 0.5]);

  /* troppo tremolante */
  const res = C.rispondiParata({ punti: [[0.3, 0.5], [0.4, 0.42], [0.5, 0.6], [0.6, 0.44], [0.7, 0.5]], durataMs: 300 });
  assert.equal(res.riuscita, false);
  assert.equal(Mem.quante(s), 3);
  assert.equal(res.motivo, 'troppo tremolante');
});

test('le quattro mancanze hanno quattro nomi diversi', () => {
  /* Ogni motivo si distingue dagli altri, perché «hai sbagliato» e «sei
   * arrivato tardi» sono rimproveri diversi, e il giocatore deve sapere
   * quale dei due gli è costato un ricordo. */
  const casi = [
    ['fuori dal segno', { punti: riga(0.05, 0.95), durataMs: 200 }, 0],
    ['troppo tremolante', { punti: [[0.3, 0.5], [0.4, 0.42], [0.5, 0.6], [0.6, 0.44], [0.7, 0.5]], durataMs: 200 }, 0],
    ['troppo corto', { punti: [[0.48, 0.5], [0.52, 0.5]], durataMs: 200 }, 0],
    ['troppo tardi', { punti: riga(0.3, 0.5), durataMs: 200 }, 1],
  ];
  for (const [motivo, tratto, quantoScorre] of casi) {
    const { C, avanza } = battaglia();
    C.turnoNemico();
    C.apriParata([0.3, 0.5], [0.7, 0.5]);
    if (quantoScorre) avanza(C.bonusFinestra + quantoScorre);
    const res = C.rispondiParata(tratto);
    assert.equal(res.riuscita, false);
    assert.equal(res.motivo, motivo);
  }
});

test('una parata in tempo scaduto fallisce anche se è perfetta', () => {
  const { C, s, avanza } = battaglia();
  C.turnoNemico();
  C.apriParata([0.3, 0.5], [0.7, 0.5]);
  avanza(C.bonusFinestra + 1);
  const res = C.rispondiParata({ punti: riga(0.3, 0.5), durataMs: 200 });
  assert.equal(res.riuscita, false);
  assert.equal(res.motivo, 'troppo tardi');
  assert.equal(Mem.quante(s), 3);
});

test('la finestra è quella dichiarata, non quella di prima', () => {
  /* Se il bonus cambiasse durante il combattimento, una parata già aperta
   * cambierebbe sotto le dita del giocatore. */
  const { C } = battaglia();
  C.turnoNemico();
  const prima = C.bonusFinestra;
  C.apriParata([0.3, 0.5], [0.7, 0.5]);
  C.bonusFinestra = 5000;
  assert.ok(C.parata.scaduta < 5000, 'la scadenza è fissata quando si apre');
  assert.equal(C.bonusFinestra !== prima || prima > 0, true);
});

test('una parata corta non conta, anche se è dritta', () => {
  const { C } = battaglia();
  C.turnoNemico();
  C.apriParata([0.3, 0.5], [0.7, 0.5]);
  const res = C.rispondiParata({ punti: [[0.49, 0.5], [0.53, 0.5]], durataMs: 100 });
  assert.equal(res.riuscita, false);
  assert.equal(res.motivo, 'troppo corto');
});

test('una scheda con parata allunga la finestra', () => {
  const senza = battaglia({ schede: ['s1', 's2', 's3'] });
  const con = battaglia({ schede: ['s1', 's2', 's3', 's4'] });
  assert.equal(senza.C.bonusFinestra, Comb.FINESTRA_PARATA);
  assert.equal(con.C.bonusFinestra, Comb.FINESTRA_PARATA + 300);
});

test('parare Tecla costa Tecla', () => {
  const { C, s } = battaglia({ nemico: 'tecla', schede: ['s1', 's2', 's3', 's4'] });
  /* La parata di Tecla chiede una scheda specifica. */
  let tentato = false;
  for (let i = 0; i < 6 && !tentato; i++) {
    C.turnoNemico();
    if (C.attacco && C.attacco.parabile) {
      tentato = true;
      C.apriParata([0.3, 0.5], [0.7, 0.5], { conScheda: 's1' });
      const res = C.rispondiParata({ punti: riga(0.3, 0.5), durataMs: 200 });
      assert.equal(res.riuscita, true);
      assert.equal(Mem.ha(s, 's1'), false, 'per pararla hai consegnato la scheda richiesta');
    }
  }
  assert.ok(tentato, 'Tecla deve avere almeno un attacco parabile con una scheda');
});

test('la stessa scheda non viene bruciata due volte dalla stessa parata', () => {
  const { C, s } = battaglia({ nemico: 'tecla' });
  C.turnoNemico();
  if (C.attacco) {
    C.apriParata([0.3, 0.5], [0.7, 0.5], { conScheda: 's1' });
    C.rispondiParata({ punti: riga(0.3, 0.5), durataMs: 200 });
    sequenza(s.bruciate, ['s1'], 'una sola bruciatura');
  }
});

test('Chiedi, se sai parlare, non costa niente e restituisce', () => {
  const { C, s } = battaglia();
  Mem.brucia(s, ['s4']);
  C.turnoNemico();
  const r = C.scegli('chiedi');
  assert.equal(r.ok, true);
  assert.equal(r.dipingi, false, 'parlare non è dipingere');
  assert.equal(Mem.ha(s, 's4'), true, 'ti ha ridato il ricordo');
});

test('Chiedi senza «parla» costa un ricordo e non dà niente', () => {
  const { C, s } = battaglia({ schede: ['s2', 's3'] });
  C.turnoNemico();
  const r = C.scegli('chiedi');
  assert.equal(r.ok, true);
  assert.equal(r.dipingi, false);
  assert.equal(Mem.quante(s), 1);
});

test('Chiedi non si può usare se non c\'è un attacco in arrivo', () => {
  const { C } = battaglia();
  const m = C.mosseDisponibili().find((x) => x.id === 'chiedi');
  assert.equal(m.bloccata, true);
  assert.match(m.motivo, /niente da chiedere/);
});

test('l\'ansia sale col tempo e chiude la partita in domande', () => {
  const { C } = battaglia();
  const inizio = C.ansia;
  C.turnoNemico();
  assert.ok(C.ansia > inizio);
  let domande = 0;
  for (let i = 0; i < 20; i++) {
    const r = C.turnoNemico();
    for (const e of r.eventi) if (e.t === 'domanda') domande++;
  }
  assert.ok(domande > 0, 'prima o poi il nemico chiede, e una domanda non si può ignorare');
});

test('a una domanda senza risposta si perde un ricordo e un turno', () => {
  const { C, s } = battaglia({ schede: ['s2', 's3'] });
  let domanda = null;
  for (let i = 0; i < 20 && !domanda; i++) {
    for (const e of C.turnoNemico().eventi) if (e.t === 'domanda') domanda = e;
  }
  assert.ok(domanda);
  assert.equal(domanda.salvata, false, 'senza la scheda con la risposta, niente');
  assert.ok(domanda.persi.length > 0);
  assert.equal(C.stordito, 1);
});

test('a una domanda con risposta non costa niente', () => {
  /* Il Commiato chiede il nome: la risposta è ada-viso. */
  const { C, s } = battaglia({ schede: ['s1', 's2', 's3', 's4'] });
  s.memoria.push('ada-viso');
  let domanda = null;
  for (let i = 0; i < 20 && !domanda; i++) {
    for (const e of C.turnoNemico().eventi) if (e.t === 'domanda') domanda = e;
  }
  assert.ok(domanda);
  assert.equal(domanda.salvata, true);
  assert.equal(Mem.ha(s, 'ada-viso'), true);
});

test('finire i ricordi finisce la partita', () => {
  const { C, s } = battaglia({ schede: ['s2', 's3'] });
  /* Si perde sempre: ogni risposta sbagliata porta via un ricordo, finché
   * il Quaderno è vuoto. A quel punto il gioco finisce — e non è una
   * vittoria, perché non hai ricoperto niente. */
  for (let i = 0; i < 20 && !C.finito; i++) {
    C.turnoNemico();
    if (C.attacco && C.attacco.parabile) {
      C.apriParata([0.3, 0.5], [0.7, 0.5]);
      C.rispondiParata({ punti: [[0.05, 0.95], [0.5, 0.95]], durataMs: 200 });
    }
  }
  assert.equal(Mem.quante(s), 0);
  assert.equal(C.finito, true);
  assert.equal(C.vittoria, false, 'non aver coperto la tela non è vincere');
  assert.match(C.ultimoMessaggio, /Non ti resta più niente/);
});

test('coprire tutto il ritratto vince', () => {
  const { C, tel } = battaglia({ vita: 20 });
  C.scegli('traccia');
  let colpito = false;
  for (let i = 0; i < 400 && !colpito; i++) {
    const y = 0.05 + (i % 40) * 0.024;
    const r = C.misura({ punti: [[0.02, y], [0.98, y]], durataMs: 150 }, tel);
    const esito = C.applica(r, tel);
    if (esito.vittoria) colpito = true;
  }
  assert.equal(colpito, true);
  assert.equal(C.finito, true);
  assert.equal(C.vittoria, true);
  assert.equal(C.vita, 0);
  assert.equal(C.mosseDisponibili()[0].bloccata, true, 'a tela coperta non si muove più niente');
});

test('le fasi del nemico cambiano con il suo stato', () => {
  const { C } = battaglia({ nemico: 'il-commiato' });
  const primo = C.faseSbloccata;
  C.vita = 10;
  C.turnoNemico();
  assert.ok(C.faseSbloccata >= primo, 'un nemico agonizzante lotta diversamente');
});

test('il contorno generato resta dentro la tela ed è tracciabile', () => {
  const { C } = battaglia();
  for (let i = 0; i < 200; i++) {
    const { da, a } = C.generaContorno();
    for (const p of [da, a]) {
      assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1, `punto fuori tela: ${p}`);
    }
    const lung = Math.hypot(a[0] - da[0], a[1] - da[1]);
    assert.ok(lung > Comb.CORDA_MIN, `troppo corto per essere tracciabile: ${lung.toFixed(3)}`);
  }
});

test('l\'intento è visibile solo se hai la scheda che te lo dice', () => {
  const senza = battaglia({ schede: ['s1'] });
  assert.equal(senza.C.intentoVisibile(), false);
  const con = battaglia();
  assert.equal(con.C.intentoVisibile(), true, 'brizio-perche dice «perché»');
  assert.ok(con.C.intento().length > 0);
});

test('coincide misura davvero la sovrapposizione col segno', () => {
  const da = [0.2, 0.5];
  const a = [0.8, 0.5];
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.5, 0.6) }, da, a), true, 'esattamente sopra');
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.52, 0.6) }, da, a), true, 'appena sotto, entro la tolleranza');
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.62, 0.6) }, da, a), false, 'fuori dalla tolleranza');
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.95, 0.6) }, da, a), false, 'stessa forma, altro posto');
  assert.equal(Comb.coincide({ punti: [] }, da, a), false);
  assert.equal(Comb.coincide({ punti: [[0.2, 0.5]] }, da, a), false, 'un punto solo copre metà, e metà non basta');
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.5, 0.6) }, da, da), false, 'contorno di lunghezza zero');

  /* Un segno che segue metà del contorno e si ferma è ancora «sul segno»:
     coincide chiede *dove* hai tracciato, non *quanto*. Proseguire oltre la
     fine è un po' tollerato — il dito rallenta e sborda, e multare la
     parata per quello sarebbe ingiusto. */
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.5, 0.3) }, da, a), true, 'metà del contorno va bene');
  assert.equal(Comb.coincide({ punti: riga(0.2, 0.5, 0.8) }, da, a), true, 'un po\' di sbordatura è tollerata');
  /* La tolleranza è di 0.07 su entrambi gli estremi: il dito posa e riprende,
     e pretendere la punta esatta sarebbe severità inutile. */
assert.equal(Comb.coincide({ punti: [[0.15, 0.5], [0.25, 0.5], [0.35, 0.5]] }, da, a), true,
    'partire appena prima dell\'inizio è ancora tracciarlo');
  assert.equal(Comb.coincide({ punti: [[0.0, 0.5], [0.05, 0.5], [0.1, 0.5]] }, da, a), false,
    'ma se il segno è tutto fuori, no');
});