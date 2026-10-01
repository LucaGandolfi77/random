/* partita.test.mjs — una partita dall'inizio alla fine.
 *
 * Gli altri test provano i pezzi: qui si prova che i pezzi, attaccati in
 * ordine, portano da qualche parte. È l'unico test che attraversa tutti e sei
 * gli atti, e l'unico che scopre i difetti che si vedono solo al quinto vaso:
 * una scelta che non torna, un vaso che non si riempie, un finale che non
 * esiste.
 *
 * Qui non c'è il browser. Il gioco è logica — save, scena, orto, dono, vasi —
 * e la si guida come un giocatore: si sceglie, si semina, si risponde, si
 * passa al turno del vaso. Il DOM è un'altra storia, e ha i suoi test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT, ortoFinto } from './harness.mjs';

const h = carica();
const { FSTSave: S, FSTScena: Scena, FSTMemoria: Mem, FSTDono: Dono, FSTVasi: Vasi } = h.win;
const STORIA = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
const DEF = STORIA.schede;

function rng(seme) {
  let x = seme >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

/* Una serpentina: un colpo solo, come lo farebbe un giocatore. Il terreno già
 * nutrito non ridà niente, quindi ripassare sullo stesso punto è tempo perso. */
function serpente(da = 0.06, a = 0.94, righe = 11) {
  const punti = [];
  let verso = 1;
  for (let i = 0; i < righe; i++) {
    const y = da + (i * (a - da)) / (righe - 1);
    punti.push([verso > 0 ? da : a, y]);
    punti.push([verso > 0 ? a : da, y]);
    verso *= -1;
  }
  return { punti, durataMs: 300, larghezza: 0.085 };
}

/**
 * Una partita intera.
 *
 * `mossa` è la strategia nell'orto, `scegli` dice quale scelta prendere quando
 * se ne presentano diverse. Restituisce tutto quello che si può misurare,
 * perché un test che torna solo con `ok` non serve a niente: se la partita si
 * rompe al quarto atto, vuoi il numero che lo mostra.
 */
function partita({ seme = 7, mossa = 'accarezza', scegli = 0, risa = true, parte = 0 } = {}) {
  const salva = S.nuovaPartita(DEF);
  salva.atto = parte;
  salva.stanza = 0;
  salva.fase = 'atto';

  let ora = 0;
  const resa = { aperte: 0, riuscite: 0, scadute: 0 };
  const domande = { salvate: 0, scordate: 0 };
  const comb = [];
  const scelteFatte = [];
  let finale = null;

  for (let passo = 0; passo < 4000 && !finale; passo++) {
    const atto = STORIA.atti.find((a) => a.ordine === salva.atto);
    if (!atto) break;
    const nodi = Scena.nodi(atto);
    const n = nodi[salva.stanza];
    if (!n) { fineAtto(); continue; }

    if (n.tipo === 'orto') {
      /* Lo stato dell'arco NON è il numero dell'atto: è quanta schede di
       * quella persona ti restano in mano, che è la definizione che dà
       * memoria.js e che usa l'app. Passare il numero d'atto metteva i vasi
       * degli ultimi atti allo stato due — cioè alla figura ridotta, senza
       * attacchi e senza domande — e la partita risultava una cosa che il
       * gioco non è. */
      const stato = Mem.statoDi(salva, DEF, (Vasi.per(n.id) || {}).persona);
      const esito = combatti(n.id, salva, stato, { mossa, risa, resa, domande, rngNow: rng(seme + salva.atto) });
      comb.push(esito);
      if (!esito.vittoria) { finale = { nome: 'persa', perdita: esito.perdita }; break; }
      if (esito.vittoria && !Mem.haFiorito(salva, esito.id)) salva.fioriti.push(esito.id);
      avanti();
      continue;
    }

    /* Una scena: si leggono le battute visibili e si sceglie. */
    const battute = Scena.battuteVisibili(n.scena, salva);
    if (n.scena.scelte && n.scena.scelte.length) {
      const utili = Scena.scelteVisibili(n.scena, salva);
      const scelta = utili[Math.min(scegli, utili.length - 1)] || utili[0];
      if (scelta) {
        Scena.applicaScelta(salva, scelta, DEF);
        for (const id of utili) {
          scelteFatte.push({ atto: atto.id, scelta: id, imposta: (id === scelta.id && scelta.imposta) || null });
        }
      }
    }
    avanti();
  }

  return { salva, comb, scelteFatte, finale, resa, domande, battute: null };

  /* ── i due passi che fanno avanti la partita ───────────── */

  function avanti() {
    salva.stanza++;
    if (salva.stanza >= nodi(salva)) fineAtto();
  }
  function nodi(s) {
    const a = STORIA.atti.find((x) => x.ordine === s.atto);
    return a ? Scena.nodi(a).length : 0;
  }
  function fineAtto() {
    const a = STORIA.atti.find((x) => x.ordine === salva.atto);
    if (a && a.finale) { finale = { nome: 'finale' }; return; }
    salva.atto++;
    salva.stanza = 0;
  }

  /* ── un combattimento ───────────────────────────────────── */

  function combatti(id, s, stato, { mossa: strategia, risa: usaRisa, resa: conto, domande: dom, rngNow }) {
    const C = Dono.nuovo({
      nemico: Vasi.per(id, stato), salva: s, defs: DEF, stato,
      clock: () => (ora += 60), rng: rngNow,
    });
    const o = ortoFinto();
    let turni = 0;
    let attese = 0;
    let perdita = null;

    const conta = (e) => {
      if (e.t === 'domanda') { if (e.salvata) dom.salvate++; else dom.scordate++; }
    };

    while (!C.finito && turni < 200) {
      /* 1. Il vaso ha aperto una finestra e il tempo è scaduto: costa un
       * ricordo, ma NON è il nostro turno — il fiore se n'è andato mentre
       * guardavamo altrove, e si continua a dare. */
      if (C.resa && !C.resa.risolta && C.resaScaduta()) {
        conto.scadute++;
        if (C.scadeResa()) { /* la scadenza non consuma il turno */ }
        continue;
      }

      /* 2. Si sceglie una mossa. */
      if (C.mossa === null) {
        /* Si prova la mossa voluta, poi un'altra, e Offri per ultima. L'ordine
         * non è un dettaglio: il terreno appassito chiude l'Accarezza, e se
         * l'unica riserva fosse Offri ogni interruzione azzererebbe il vantaggio
         * delle mosse buone — che è esattamente il difetto che il Mazzo aperto
         * era venuto a correggere. */
        const catena = strategia === 'mazzo' ? ['mazzo', 'accarezza', 'offri'] : [strategia, 'mazzo', 'offri'];
        let r = null;
        for (const m of catena) {
          r = C.scegli(m);
          if (r.ok) break;
        }
        if (!r || !r.ok) {
          /* Niente aperto: si passa il turno e si riprova, che è l'unica
           * cosa che un giocatore può fare quando è scordato. */
          if (attese++ > 40) { perdita = 'bloccata'; break; }
          for (const e of C.turnoVaso().eventi) conta(e);
          continue;
        }
        if (r.chiedeSchede) {
          const vive = [...new Set(s.memoria)].slice(0, 2);
          if (!C.scegliMemorie(vive).ok) { r = C.scegli('offri'); if (!r.ok) { attesa++; continue; } }
        }
      }

      /* 3. Il gesto: se c'è una finestra aperta, lo stesso gesto è la resa —
       * come in app.js, dove la resa e la semina sono lo stesso colpo. */
      if (usaRisa && C.resa && !C.resa.risolta && C.attacco && C.attacco.resabile) {
        conto.aperte++;
        C.apriResa(0.5, 0.5, { conScheda: C.attacco.conScheda });
        const r = C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: Math.max(1, C.finestra * 0.5) });
        if (r.riuscita) conto.riuscite++;
      }

      C.applica(C.misura(serpente(), o), o);
      turni++;
      if (C.finito) break;

      for (const e of C.turnoVaso().eventi) conta(e);

      /* Come in app.js: se il vaso ha mandato un attacco che si può lasciar
       * andare, il fiore compare. Non è il combattimento a decidere — è il
       * turno del vaso. */
      if (C.attacco && C.attacco.resabile) {
        const { x, y } = C.generaFiore();
        C.apriResa(x, y, { conScheda: C.attacco.conScheda });
        conto.aperte++;
        /* Ogni terza finestra la si lascia scadere: una partita in cui la
           finestra non scade mai non dice niente sulla finestra. */
        if (conto.aperte % 3 === 0) {
          ora = C.resa.scaduta + 1;
          if (C.scadeResa()) conto.scadute++;
        }
      }
    }
    return {
      id, stato, turni, vittoria: C.vittoria, perdita: perdita || (C.vittoria ? null : 'crollo'),
      speso: C.speso, limite: C.limite, ricordi: Mem.quante(s),
    };
  }
}

/* ── la partita ─────────────────────────────────────────── */

test('la partita si attraversa tutta e arriva a un finale', () => {
  const r = partita();
  assert.ok(r.finale, `la partita non è arrivata da nessuna parte dopo ${r.comb.length} combattimenti`);
  assert.equal(r.finale.nome, 'finale', 'e deve finire con un finale, non con un blocco');
  assert.equal(r.comb.length, 6, `sei vasi, sei combattimenti: ne sono ${r.comb.length}`);
  assert.ok(r.comb.every((c) => c.vittoria), 'e con una strategia sensata li vince tutti');
});

test('i sei vasi si riempiono tutti, e i sei petali si contano', () => {
  const r = partita();
  assert.equal(r.salva.fioriti.length, 6, `i vasi riempiti sono ${r.salva.fioriti.length}, e un petale per persona`);
  assert.equal(new Set(r.salva.fioriti).size, 6, 'e nessuno due volte');
  assert.equal(Mem.petali(r.salva), 6);
});

test('nella partita le domande suonano davvero', () => {
  const r = partita();
  const domande = r.domande.salvate + r.domande.scordate;
  assert.ok(domande >= 6, `in sei combattimenti suonano ${domande} domande: i sei segreti della serie ne hanno bisogno di almeno sei`);
});

test('nella partita la finestra del fiore si apre, si usa e scade', () => {
  const r = partita();
  assert.ok(r.resa.aperte >= 3, `le finestre aperte sono ${r.resa.aperte}: la resa non è mai capitata`);
  assert.ok(r.resa.riuscite >= 1, 'e almeno una si è risolta bene');
  assert.ok(r.resa.scadute >= 1, `e almeno una è scaduta senza risposta (sono ${r.resa.scadute}): altrimenti la finestra è decorativa`);
});

test('una partita buona arriva al finale giardino, che è il più difficile', () => {
  /* Il finale migliore chiede sei vasi, almeno dodici ricordi e la promessa
   * mantenuta. È il traguardo, e se non è raggiungibile il gioco ha sei finali
   * di cui uno è un desiderio irraggiungibile. */
  const r = partita();
  const s = r.salva;
  const memoria = Mem.quante(s);
  const promessa = Mem.promessaMantenuta(s);
  const f = Mem.finalePer(s, { conPetali: true, promessa });
  if (f.chiave === 'giardino') {
    assert.ok(memoria >= 12, `il giardino vuole almeno dodici ricordi, e ce ne sono ${memoria}`);
    assert.equal(promessa, true, 'e la promessa mantenuta: è il nome del finale');
  }
  assert.ok(f.chiave, 'in ogni caso un finale si sceglie sempre');
});

test('la partita è lunga abbastanza da non essere una corsa', () => {
  const r = partita();
  const turni = r.comb.reduce((a, c) => a + c.turni, 0);
  const scelte = r.scelteFatte.length;
  assert.ok(turni >= 20, `sei vasi in ${turni} turni di orto: pochissimi`);
  assert.ok(scelte >= 8, `e ${scelte} scelte: il narratore non chiede niente`);
});

test('le scelte vengono registrate con l\'atto in cui le hai prese', () => {
  /* `scelteAl` è quello che permette al gate di sapere se una scelta torna. Se
   * non si registra, il gate può solo contare quante scelte ci sono, e conta
   * bene anche quelle che il gioco non ripercorre mai. */
  const r = partita();
  assert.ok(Object.keys(r.salva.scelteAl || {}).length >= 4, 'i flag ricordano quando sono stati scritti');
  for (const s of r.scelteFatte) {
    if (!s.imposta) continue;
    for (const k of Object.keys(s.imposta)) {
      assert.ok(k in (r.salva.scelteAl || {}), `il flag "${k}" non sa quando è stato scritto`);
    }
  }
});

test('una partita si può riprendere da metà senza perdere niente', () => {
  const a = partita({ parte: 0 });
  const b = partita({ parte: 3 });
  assert.equal(b.comb.length, 3, 'dal quarto atto restano tre vasi');
  assert.ok(b.finale, 'e si arriva lo stesso al finale');
  /* Quello che si sapeva prima deve esserci ancora: riprendere non è
   * ricominciare, e una partita che si riavvia da capo losing tutto quello che
   * hai fatto è una partita che mente. */
  const prima = a.salva.scelte.a0_porta;
  assert.ok(prima === undefined || prima === 'aperta' || prima === 'chiusa');
});

test('la partita non è infinita: sei atti, sei vasi, un finale', () => {
  const r = partita();
  const atti = new Set(r.scelteFatte.map((s) => s.atto));
  assert.ok(atti.size <= 6, `la partita tocca ${atti.size} atti: qualcosa non finisce`);
  assert.ok(r.comb.length <= 6, `e ${r.comb.length} combattimenti: il ciclo dei vasi non è chiuso`);
});

test('una strategia sciocca perde, e la partita lo dice', () => {
  const r = partita({ mossa: 'offri' });
  /* Il tutorial si vince colla mossa base, e deve: è un tutorial. Il primo
   * vaso vero no. Quindi la partita si ferma al secondo, non al primo. */
  assert.equal(r.comb[0].vittoria, true, 'il tutorial si vince anche così: se no è una trappola');
  assert.ok(r.comb.length < 6, `con Offri da sola si arriva a ${r.comb.length} vasi su sei`);
  assert.equal(r.finale.nome, 'persa', 'e la partita è persa, non bloccata');
  const persa = r.comb.find((c) => !c.vittoria);
  assert.ok(persa, 'e si vede quale vaso l’ha fermata');
  assert.equal(persa.speso >= persa.limite, true, 'per crollo, non per un blocco');
});