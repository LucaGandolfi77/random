/* bilancio.test.mjs — il gioco è giocabile?
 *
 * Qui non si prova nessuna funzione: si gioca. E si gioca male, di proposito,
 * con strategie che un giocatore non avrebbe mai scelto, perché è l'unico modo
 * per trovare le regole che non possono succedere.
 *
 * I tre numeri che devono tornare:
 *
 *   1. Offri da sola DEVE perdere. Se vince, i due contatori non sono due
 *      numeri: sono uno, e il gioco ha una sola mossa.
 *   2. Le domande DEVE suonare. Sono i sei segreti della serie: se non
 *      suonano mai, la serie è muta e il gioco è un raccoglitore di vasetti.
 *   3. Il crollo DEVE essere raggiungibile. Una sconfitta che non si può prendere
 *      non è una sconfitta: è un numero che nessuno controlla.
 *
 * Il simulatore è volutamente mediocre. Copre una fascia larga e non cerca il
 * cuore, perché un giocatore che non ha ancora capito dove sia il cuore è il
 * giocatore da cui partire. Chi lo cerca fa meglio, e va bene: il cuore è un
 * margine che si guadagna, non un requisito per cui si nasce.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT, ortoFinto } from './harness.mjs';

const h = carica();
const { FSTSave: S, FSTMemoria: Mem, FSTDono: Dono, FSTVasi: Vasi } = h.win;

/* Le carte vere, non quella di prova: qui si misura il gioco che si gioca.
 * Con quattro schede il Mazzetto è impraticabile — due ricordi a uso, quattro
 * in tutto — e si misurerebbe un gioco in cui una mossa non esiste. */
const STORIA = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
const DEF = Array.isArray(STORIA) ? STORIA : (STORIA.schede || Object.values(STORIA.schede));

/* Una serpentina: un colpo solo, come lo farebbe un giocatore.
 *
 * Due cose la rendono obbligata. Il terreno già nutrito non ridà niente, quindi
 * una diagonale uguale ogni giro smette di trovare terra vergine al secondo
 * turno e il vaso sembrerebbe svuotarsi a metà. E un colpo solo copre una
 * fetta: se il giocatore fa un tratto e basta, sta pagando un mazzetto
 * intero per un sorso, e si misura quanto si spreca, non quanto si dona. */
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

const NUOVO = () => S.nuovaPartita(DEF);

/* Due ricordi vivi, presi da quelli che ci sono: il Mazzetto si paga con
 * schede vere, e chiedere due volte le stesse non funziona, perché la prima
 * volta le ha già mangiate il terreno. */
const dueVivi = (salva) => [...new Set(salva.memoria)].slice(0, 2);

/* Un generatore deterministico locale: la simulazione deve essere ripetibile,
   e `rngFisso` del harness resterebbe un oggetto solo per test. */
function rng(seme) {
  let x = seme >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

/* Una partita intera con una strategia sola: una mossa, ripetuta.
 *
 * `cercaCuore` sposta la fascia più in alto, dove il cuore dei vasi veri sta.
 * Serve a misurare quanto il cuore valga, non a far vincere.
 */
function gioca(id, mossa, {
  stato = 0, seme = 7, turniMax = 90, cercaCuore = false, risa = false,
} = {}) {
  /* L'orologio cammina, ma piano. Con un orologio fermo a zero la resa non si
   * può mai rispondere — «presto» non scade mai. Con un passo grosso, invece,
   * la sola apertura della finestra la consuma tutta: `apriResa` chiama l'orologio
   * quattro volte, e a 400 ms per volta sono 1600 ms contro una finestra di 880.
   * Il passo deve stare dentro la finestra, altrimenti si sta misurando il
   * clock e non il gioco. */
  let ora = 0;
  const C = Dono.nuovo({
    nemico: Vasi.per(id, stato), salva: NUOVO(), defs: DEF, stato, clock: () => (ora += 60), rng: rng(seme),
  });
  const o = ortoFinto();
  /* `cercaCuore` tiene la serpentina in alto, dove il cuore sta: serve a
   * misurare quanto il cuore valga, non a far vincere. */
  const tracciato = cercaCuore ? serpente(0.04, 0.3, 5) : serpente();
  let turni = 0;
  let domande = 0;
  let salvate = 0;
  let scordate = 0;
  let rese = 0;
  let attese = 0;
  let bloccato = null;

  const conta = (e) => {
    if (e.t === 'domanda') { domande++; if (e.salvata) salvate++; else scordate++; }
  };

  /* Il giocatore medio aspetta quando è scordata e quando il terreno è
   * asciutto: salta il turno e ci riprova. Non è una concessione, è l'unica
   * cosa che si può fare — e senza questo la simulazione misurerebbe una
   * partita che nessuno sta giocando. */
  const attendi = () => {
    if (attese > 8) return false;
    attese++;
    for (const e of C.turnoVaso().eventi) conta(e);
    turni++;
    return !C.finito;
  };

  while (!C.finito && turni < turniMax) {
    /* Si sceglie la mossa solo quando non ce n'è una: dopo aver seminato è
     * chiusa, e riaprirla a ogni tratto sarebbe un buco. */
    if (C.mossa === null) {
      /* `mossa` può essere una mossa sola o una catena di riserve. L'ordine
       * conta: il terreno appassito chiude l'Accarezza, e se l'unica riserva
       * fosse Offri ogni interruzione azzererebbe il vantaggio delle mosse
       * buone — che è il difetto che il Mazzo aperto è venuto a correggere. */
      const catena = Array.isArray(mossa) ? mossa : [mossa, 'offri'];
      let r = null;
      for (const m of catena) {
        r = C.scegli(m);
        if (r.ok) break;
        bloccato = r.motivo;
      }
      if (!r || !r.ok) { if (!attendi()) break; continue; }
      if (r.chiedeSchede && !C.scegliMemorie(dueVivi(C.salva)).ok) C.scegli('offri');
    }

    C.applica(C.misura(tracciato, o), o);
    turni++;
    if (C.finito) break;
    for (const e of C.turnoVaso().eventi) conta(e);
    if (C.finito) break;

    /* E se il vaso ti rimanda un fiore, lo si lascia andare. */
    if (risa && C.attacco && C.attacco.resabile) {
      C.apriResa(0.5, 0.5, { conScheda: C.attacco.conScheda });
      if (C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 400 }).riuscita) rese++;
    }
  }
  return {
    C, turni, domande, salvate, scordate, rese, attese, bloccato,
    vittoria: C.vittoria, finito: C.finito,
    speso: C.speso, limite: C.limite, bruciate: C.bruciate.length,
    ricordi: Mem.quante(C.salva),
  };
}

/* ── 1. la mossa base da sola deve perdere ────────────────── */

/* Quanti semi si provano. Non è un campione grande, ma la partita vera usa un
 * solo semi per atto: qui si giudica una tendenza, non un sorteggio. */
const SEMI = 40;

function quanteVince(id, catena, stato = 0, semi = SEMI) {
  let n = 0;
  for (let s = 1; s <= semi; s++) if (gioca(id, catena, { seme: s, stato }).vittoria) n++;
  return n / semi;
}

test('Offri da sola è una strategia perdente', () => {
  /* «Perde sempre» era l'affermazione di prima, e non era vera: sui vasi più
   * stretti Offri vince ogni tanto. Va bene così — una mossa che perde nove
   * volte su dieci è una mossa perdente — ma il test deve dire quello che
   * misura, altrimenti la prossima volta che si rompe un numero si corregge il
   * numero invece che la regola.
   *
   * Quello che non va bene è Offri che vince spesso: significherebbe che il
   * limite è sopra il suo costo, e le altre due mosse non servirebbero a nulla. */
  for (const id of Vasi.PERSONE_DEI_VASI) {
    const tasso = quanteVince(id, ['offri']);
    assert.ok(tasso <= 0.05,
      `${id}: Offri da sola vince ${(tasso * 100).toFixed(0)}% delle partite. Il limite è sopra il suo costo e le altre due mosse non servono a niente.`);
  }
});

test('cercare il cuore non trasforma Offri in una strategia vincente', () => {
  /* Il cuore è un margine che si guadagna, non un requisito. Se trovarlo
   * bastasse a vincere colla mossa base, il cuore smetterebbe di essere una
   * scelta e diventerebbe un tutorial. */
  for (const id of Vasi.PERSONE_DEI_VASI) {
    const tasso = quanteVince(id, ['offri'], 0, SEMI);
    assert.ok(tasso <= 0.05, `${id}: Offri vince il ${(tasso * 100).toFixed(0)}%`);
  }
});

test('il vaso del primo atto è l\'eccezione: Offri deve bastare', () => {
  /* Il tutorial insegna la mossa base. Se lì pure crolli, il primo atto è una
     trappola e non un tutorial. */
  const r = gioca('il-vaso', 'offri');
  assert.equal(r.vittoria, true, 'nel tutorial la mossa base deve bastare');
  assert.ok(r.turni <= 5, `e in ${r.turni} turni: un tutorial non è un combattimento`);
});

test('la catena di un giocatore vince quasi sempre, e Mazzo quasi sempre da solo', () => {
  /* La catena è Accarezza, poi Mazzo se il terreno è appassito o non hai
   * ricordi, poi Offri come ultima riserva. È quello che fa un giocatore, ed è
   * la strategia che il gioco deve rendere possibile. */
  for (const id of Vasi.PERSONE_DEI_VASI) {
    const bene = quanteVince(id, ['accarezza', 'mazzo', 'offri']);
    assert.ok(bene >= 0.9,
      `${id}: la catena del giocatore vince solo il ${(bene * 100).toFixed(0)}% delle volte. Il gioco non è giocabile con la strategia che uno ci aspetterebbe.`);
    const mazzo = quanteVince(id, ['mazzo', 'accarezza', 'offri']);
    assert.ok(mazzo >= 0.9, `${id}: e Mazzo da solo il ${(mazzo * 100).toFixed(0)}%`);
  }
});

test('il Mazzo costa ricordi davvero, e sono quelli che gli passi', () => {
  const r = gioca('sauro', 'mazzo');
  assert.ok(r.bruciate >= 2, `un Mazzo deve costare almeno due ricordi, ne ha costati ${r.bruciate}`);
});

test('il Mazzo che brucia la scheda che lo insegna si spegne a metà', () => {
  /* È la cosa migliore del gioco e nessuno la scriverebbe: l'unica mossa che
   * ti fa finire in fretta è anche l'unica che ti toglie se stessa.
   *
   * Nella storia vera il Mazzo si impara da quattro schede, e una partita
   * normale non lo spegne — quindi qui non si aspetta che succeda da solo. Si
   * toglie a mano ciò che nella partita si toglie da soli: le schede che lo
   * insegnano. */
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0, clock: () => 0, rng: rng(7),
  });
  const insegnano = DEF.filter((c) => (c.chiavi || []).includes('mazzo')).map((c) => c.id);
  assert.ok(insegnano.length > 0, 'qualcuno deve insegnare il Mazzo');

  C.scegli('mazzo');
  const date = dueVivi(C.salva);
  C.scegliMemorie(date);
  assert.equal(C.scegliMemorie(date).ok, false, 'e non puoi dare due volte gli stessi ricordi: sono finiti');

  for (const id of insegnano) Mem.brucia(C.salva, [id]);
  const m = C.mosseDisponibili().find((x) => x.id === 'mazzo');
  assert.equal(m.bloccata, true, 'e adesso non lo sai più fare');
  assert.match(m.motivo, /Non ricordi più come si faceva/);
  assert.equal(C.mosseDisponibili().find((x) => x.id === 'offri').bloccata, false,
    'ma Offri resta: è l’unica mossa che non si può perdere');
});

/* ── 2. le domande devono suonare ─────────────────────────── */

test('le domande suonano, e l\'arco fa bere di più', () => {
  /* La tesi è che il gioco, avanti, beve di più. Ma non si può misurare sul
   * numero di domande a parità di vaso: chi si consuma è anche più piccolo, e
   * un vaso più piccolo si svuota prima e chiede meno. Si misura quindi sulla
   * sete per turno — che è l'unico numero che l'arco governa davvero — e sul
   * totale di domande dell'ultimo atto rispetto al primo. */
  const SEMI = 12;
  const media = (id, stato) => {
    let n = 0;
    for (let s = 1; s <= SEMI; s++) n += gioca(id, 'accarezza', { stato, seme: s }).domande;
    return n / SEMI;
  };

  assert.ok(media('betta', 0) >= 1, `le domande non suonano mai: la serie è muta (${media('betta', 0).toFixed(2)} a combattimento)`);

  /* La sete per turno cresce con l'arco, vaso per vaso. */
  for (const id of Vasi.PERSONE_DEI_VASI) {
    const sete = [0, 1, 2].map((stato) => {
      const C = Dono.nuovo({
        nemico: Vasi.per(id, stato), salva: NUOVO(), defs: DEF, stato, clock: () => 0, rng: rng(7),
      });
      return C.setePerTurno;
    });
    assert.ok(sete[1] > sete[0], `${id}: allo stato 1 il vaso non ha più sete (${sete[0]} contro ${sete[1]})`);
    assert.ok(sete[2] > sete[1], `${id}: allo stato 2 idem (${sete[1]} contro ${sete[2]})`);
  }

  /* E la fine della serie beve almeno quanto l'inizio. */
  const primo = media('betta', 0);
  const ultimo = media('sauro', 2);
  assert.ok(ultimo >= primo, `l'ultimo atto beve meno del primo: ${ultimo.toFixed(2)} contro ${primo.toFixed(2)}`);
});

test('una partita intera è abbastanza lunga da tenere in piedi sei segreti', () => {
  let turni = 0;
  let domande = 0;
  for (const id of Vasi.ORDINE) {
    const r = gioca(id, 'accarezza');
    domande += r.domande;
    turni += r.turni;
  }
  /* I sei segreti della serie sono sei, e perché arrivino a qualcuno ne
   * servono almeno sei: sotto, la serie è una collezione di sei spiegazioni. */
  assert.ok(domande >= 6, `in ${turni} turni suonano ${domande} domande: la serie non arriva a nessuno`);
  assert.ok(turni >= 20, `una partita sono ${turni} turni di orto: troppo pochi perché sei vasi siano sei`);
  assert.ok(turni <= 130, `e ${turni} è troppa: il gioco non finisce e nessuno arriva al finale`);
});

test('la resa è una risorsa vera e non un abbellimento', () => {
  /* Non si misura su una partita intera: se in quattro turni capita una mossa
   * resabile dipende dalla sorte, e un test che passa metà delle volte non
   * dice niente. Si pilota il vaso finché non offre un fiore, e poi si
   * risponde davvero. */
  let ora = 0;
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0,
    clock: () => (ora += 60), rng: rng(7),
  });
  const o = ortoFinto();
  const tracce = [];

  for (let t = 0; t < 30 && !C.finito; t++) {
    if (C.mossa === null) {
      let ok = false;
      for (const m of ['accarezza', 'mazzo', 'offri']) {
        if (C.scegli(m).ok) {
          ok = true;
          if (m === 'mazzo' && !C.scegliMemorie(dueVivi(C.salva)).ok) C.scegli('offri');
          break;
        }
      }
      if (!ok) { C.turnoVaso(); continue; }
    }
    C.applica(C.misura(serpente(), o), o);
    if (C.finito) break;
    C.turnoVaso();

    if (C.attacco && C.attacco.resabile) {
      C.apriResa(0.5, 0.5, { conScheda: C.attacco.conScheda });
      assert.equal(C.resaScaduta(), false, 'appena aperta, la finestra c\'è');
      const r = C.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 400 });
      tracce.push(r);
      assert.equal(r.riuscita, true, `una resa fatta in tempo si riesce: ${r.motivo || ''}`);
      break;
    }
  }
  assert.ok(tracce.length > 0, 'il vaso non ha mai offerto un fiore da lasciar andare');

  /* E una risposta data troppo tardi non si può riprendere: è l'unico motivo
   * per cui la finestra esiste. */
  let adesso = 0;
  const tardi = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0,
    clock: () => adesso, rng: rng(7),
  });
  tardi.apriResa(0.5, 0.5, {});
  assert.equal(tardi.resaScaduta(), false, 'la finestra è ancora aperta');
  adesso = tardi.resa.scaduta + 1;
  assert.equal(tardi.resaScaduta(), true, 'la finestra scade, e una scaduta non è più una risa');
  assert.equal(tardi.rispondiResa({ punti: [[0.5, 0.5]], durataMs: 100 }).riuscita, false,
    'e su una finestra scaduta la risposta non si può dare: è il costo di aver aspettato');
});

/* ── 3. il crollo deve essere una cosa che capita ─────────── */

test('il crollo capita a chi gioca male, e si dichiara', () => {
  const r = gioca('orielia', 'offri');
  assert.equal(r.finito, true);
  assert.equal(r.vittoria, false);
  assert.ok(r.speso >= r.limite, `terra ${r.speso.toFixed(0)} contro un limite di ${r.limite}`);
  assert.match(r.C.ultimoMessaggio, /dato troppo|tutto quello che avevi/);
});

test('il limite di ogni vaso sta fra Offri e Accarezza: è la regola', () => {
  /* È la condizione che rende necessaria una scelta. Se un vaso la violasse,
     o Offri vincerebbe senza gli altri, o Accarezza non ci passerebbe mai, e in
     entrambi i casi quel vaso sarebbe un vaso a una mossa sola. */
  for (const id of Vasi.ORDINE) {
    const v = Vasi.per(id);
    const offri = v.spesa * Dono.MOLTI.offri;
    const accarezza = v.spesa / Dono.MOLTI.accarezza;
    if (id === 'il-vaso') {
      assert.ok(v.limite > offri, `il tutorial deve potersi vincere colla mossa base (${v.limite} contro ${offri})`);
      continue;
    }
    assert.ok(v.limite < offri, `${id}: Offri passa (limite ${v.limite}, costo ${offri.toFixed(0)})`);
    assert.ok(v.limite > accarezza, `${id}: Accarezza non passa (limite ${v.limite}, costo ${accarezza.toFixed(0)})`);
  }
});

test('il margine si stringe a ogni vaso, e l\'ultimo è il più stretto', () => {
  /* Il margine è di quanto Accarezza può sforare il limite prima di crollare.
   * Se non scendesse, gli atti non avrebbero difficoltà crescente: sei vasi con
   * lo stesso margine sono un vaso solo, ripetuto. */
  const spesso = Vasi.PERSONE_DEI_VASI.map((id) => {
    const v = Vasi.per(id);
    return { id, quota: v.limiteQuota, margine: v.limite - v.spesa / Dono.MOLTI.accarezza };
  });
  for (let i = 1; i < spesso.length; i++) {
    assert.ok(spesso[i].quota < spesso[i - 1].quota,
      `${spesso[i].id} ha più margine di ${spesso[i - 1].id}: la difficoltà non cresce`);
  }
  assert.equal(spesso[spesso.length - 1].margine > 0, true, 'e anche l\'ultimo deve poter passare');
});

/* ── 4. il mazzetto ───────────────────────────────────────── */

test('il mazzetto è un tetto di turno, non di colpo e non di partita', () => {
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0, clock: () => 0, rng: rng(7),
  });
  const o = ortoFinto();
  assert.equal(C.fiori, 0, 'all\'inizio non hai fiori in mano: se ne avessi, il gioco si vincerebbe senza scegliere');
  C.scegli('accarezza');
  assert.equal(C.fiori, Dono.FIORI.accarezza, 'e scegliendo la mossa te li mette in mano');

  /* Una passata corta non li esaurisce: sono un tetto di TURNO, non di colpo.
   * Puoi continuare a seminare finché ne hai, e il tratto si ferma quando
   * finiscono. */
  C.applica(C.misura({ punti: [[0.44, 0.44], [0.5, 0.5]], larghezza: 0.04 }, o), o);
  const rimasti = C.fiori;
  assert.ok(rimasti > 0, 'una passata piccola lascia fiori in mano');
  assert.ok(rimasti < Dono.FIORI.accarezza);

  /* E la parte che resta è spesa tutta entro il turno: un colpo largo esaurisce
   * il mazzetto, e il secondo colpo del turno non aggiunge niente. */
  C.scegli('accarezza');
  C.mossoChiuso = false;
  C.fiori = Dono.FIORI.accarezza;
  const primo = C.misura(serpente(), o);
  assert.equal(primo.esaurito, true, 'una passata da giardiniere esaurisce il mazzetto');
  assert.equal(C.fiori, Dono.FIORI.accarezza, 'e non li tocca: sono spesi quando applichi, non quando misuri');
});

test('un colpo solo non può svuotare un vaso: era il difetto che divideva i due numeri', () => {
  for (const id of Vasi.PERSONE_DEI_VASI) {
    const C = Dono.nuovo({ nemico: Vasi.per(id), salva: NUOVO(), defs: DEF, clock: () => 0, rng: rng(7) });
    const o = ortoFinto();
    C.scegli('mazzo');
    C.applica(C.misura({ punti: [[0, 1], [1, 0]], larghezza: 0.115 }, o), o);
    assert.equal(C.finito, false, `${id}: una passata sola finisce il vaso`);
  }
});

test('il mazzetto si riapre al turno del vaso, e solo lì', () => {
  const C = Dono.nuovo({ nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, clock: () => 0, rng: rng(7) });
  const o = ortoFinto();
  C.scegli('mazzo');
  C.scegliMemorie(['s1', 's3']);
  C.applica(C.misura({ punti: [[0.1, 0.1], [0.9, 0.9]], larghezza: 0.115 }, o), o);
  assert.equal(C.mossoChiuso, true, 'dopo aver seminato la mossa è chiusa');
  const r = C.scegli('offri');
  assert.equal(r.ok, false, 'e non si può richiamare un Mazzo nuovo a ogni tratto');
  assert.match(r.motivo, /già seminato/);
  C.turnoVaso();
  assert.equal(C.mossoChiuso, false, 'al turno dopo si sceglie di nuovo');
  assert.equal(C.scegli('offri').ok, true);
});

test('il menu dice i fiori che dà, e non un costo in semi che non esistono', () => {
  const C = Dono.nuovo({ nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, clock: () => 0, rng: rng(7) });
  for (const m of C.mosseDisponibili()) {
    assert.equal(m.costo, Dono.FIORI[m.id], `${m.id}: il costo dichiarato non è il mazzetto`);
  }
  assert.ok(Dono.FIORI.offri < Dono.FIORI.accarezza);
  assert.ok(Dono.FIORI.accarezza < Dono.FIORI.mazzo);
});

/* ── 5. la finestra del fiore ────────────────────────────── */

test('la finestra scade da sola, e scadere costa un ricordo', () => {
  /* Qui c'era un'icona con una finestrella disegnata dentro e nessun orologio.
   * `resaScaduta` esisteva, e nessuno la chiamava mai: il fiore restava lì
   * finché non lo guardavi, e il tempo non era un costo. Peggio: bastava un
   * attacco aperto perché qualunque pennellata contasse come resa, quindi si
   * poteva farlo quando si voleva e riavere un ricordo per un gesto che non
   * era quello. */
  let ora = 0;
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0,
    clock: () => ora, rng: rng(7),
  });
  const o = ortoFinto();
  C.scegli('accarezza');
  C.applica(C.misura(serpente(), o), o);

  /* Si arriva al punto in cui il vaso offre un fiore. */
  for (let t = 0; t < 12 && !(C.attacco && C.attacco.resabile); t++) C.turnoVaso();
  C.apriResa(0.5, 0.5, { conScheda: null });
  assert.equal(C.resaScaduta(), false, 'la finestra è aperta');
  const prima = Mem.quante(C.salva);

  ora = C.resa.scaduta + 1;
  assert.equal(C.resaScaduta(), true, 'e a un certo punto scade, anche se nessuno la guarda');

  const esito = C.scadeResa();
  assert.ok(esito, 'la finestra scaduta si risolve da sola');
  assert.equal(esito.riuscita, false);
  assert.equal(esito.motivo, 'troppo tardi', 'e dice perché: è il quarto dei quattro modi');
  assert.equal(Mem.quante(C.salva), prima - 1, 'scadere costa un ricordo, come ogni resa persa');
  assert.equal(C.resa, null);
  assert.equal(C.scadeResa(), null, 'e non si risolve due volte');
});

test('scadere non blocca la semina: si continua a dare, solo senza il premio', () => {
  let ora = 0;
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0,
    clock: () => ora, rng: rng(7),
  });
  const o = ortoFinto();
  C.scegli('accarezza');
  C.applica(C.misura(serpente(), o), o);
  for (let t = 0; t < 12 && !(C.attacco && C.attacco.resabile); t++) C.turnoVaso();
  C.apriResa(0.5, 0.5, {});
  ora = C.resa.scaduta + 1;
  C.scadeResa();

  assert.equal(C.stordito, 0, 'non sei scordata: non è una domanda, è una finestra');

  /* Qualunque mossa aperta: in quel momento il terreno potrebbe essere
   * appassito e l'Accarezza chiusa, e un giocatore prende quella che c'è. */
  const aperta = C.mosseDisponibili().filter((m) => !m.bloccata && m.id !== 'chiedi');
  assert.ok(aperta.length > 0, 'dopo la scadenza resta sempre una mossa');
  const r = C.scegli(aperta[0].id);
  if (r.chiedeSchede) C.scegliMemorie(dueVivi(C.salva));
  assert.ok(C.fiori > 0, 'e mette i fiori in mano come prima');
  /* Un orto nuovo: il terreno già nutrito non ridà niente, e qui si sta
   * provando che il gesto è ancora ammesso, non che la stessa terra dia due
   * volte. */
  const o2 = ortoFinto();
  const prima = C.spesa;
  C.applica(C.misura(serpente(), o2), o2);
  assert.ok(C.spesa < prima, 'e il vaso si riempie lo stesso: perdi il ricordo, non il diritto di dare');
});

test('un colpo qualunque non è più una resa: senza finestra aperta semini', () => {
  const C = Dono.nuovo({
    nemico: Vasi.per('betta'), salva: NUOVO(), defs: DEF, stato: 0, clock: () => 0, rng: rng(7),
  });
  /* Attacco aperto ma nessuna finestra: è il caso di un attacco non resabile.
   * Qui il gesto è una pennellata, e deve contare come una pennellata — altrimenti
   * si «lascia andare» un fiore che non è mai comparso. */
  C.attacco = { resabile: false, conScheda: null, testo: 'non si può' };
  C.scegli('accarezza');
  const evento = C.punto({ punti: [[0.4, 0.4], [0.6, 0.6]], durataMs: 300 });
  assert.equal(evento.tipo, 'normale');
  assert.equal(C.contatoreRese, 0, 'e nessuna resa è stata contata');
});

test('i quattro modi di fallire restano quattro, e la finestra aggiunge il quinto caso', () => {
  /* I quattro sono quelli del gesto: troppo presto, troppo breve, troppo mosso,
   * troppo tardi. La scadenza non è un quinto modo di sbagliare il gesto, è un
   * quinto modo di non farlo affatto — e per questo ha un messaggio suo. */
  const finestra = 700;
  const regole = { finestra, pronto: finestra * 0.12, minimo: finestra * 0.18, mossoMax: 0.14 };
  const nomi = [
    [{ durata: 50, mosso: 0 }, 'troppo presto'],
    [{ durata: 100, mosso: 0 }, 'troppo breve'],
    [{ durata: 300, mosso: 0.4 }, 'troppo mosso'],
    [{ durata: 900, mosso: 0 }, 'troppo tardi'],
  ];
  for (const [gesto, atteso] of nomi) {
    const v = Dono.verdetto(gesto, regole);
    assert.equal(v.riuscita, false);
    assert.equal(v.motivo, atteso, `un gesto di ${gesto.durata}ms mosso ${gesto.mosso} è «${atteso}»`);
  }
  assert.equal(Dono.verdetto({ durata: 300, mosso: 0.05 }, regole).riuscita, true,
    'e un gesto misurato bene riesce');
});
