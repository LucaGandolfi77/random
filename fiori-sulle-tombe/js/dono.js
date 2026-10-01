/* dono.js — la macchina a turni.
 *
 * Regola di ferro di questo gioco: il giocatore NON attacca. L'unica mossa è
 * dare, e dare costa. Il nemico non ti colpisce: *beve*. E la cosa che ti
 * restituisce un ricordo non è uno scermo: è un atto di resa — tenere un fiore
 * che ti ha rimandato indietro e lasciarlo andare.
 *
 * I due contatori, e la ragione per cui sono due:
 *
 *   spesa  → quanto il vaso deve ancora ricevere. Scende a ogni offerta.
 *            A zero ha ricevuto tutto: fiorisce, e muore. È la vittoria.
 *   speso  → quanto terreno hai toccato tu. Sale a ogni offerta, e sale
 *            *sempre*, anche quando il fiore non prende. Quando arrivi al
 *            limite sei tu a crollare. È la sconfitta.
 *
 * Non sono lo stesso numero misurato due volte: `spesa` conta la cura (che
 * dipende dalla mossa e dal cuore), `speso` conta l'area toccata (che non
 * dipende da niente). Per questo le mosse potenti ti *risparmiano*: raddoppiare
 * la cura per tratto dimezza l'orto che ti resta da toccare.
 *
 * ── il mazzetto ───────────────────────────────────────────
 * Senza un tetto, una passata sola copre tutta la tela e il gioco si vince in
 * sei mosse. Il tetto è il mazzetto: quanti fiori hai in mano. Non finisce
 * un intero vaso, finisce un *turno*. E siccome tutte e tre le mosse danno la
 * stessa cura per turno, la mossa non sceglie quanto curi: sceglie **quanta
 * terra bruci per ottenerla**.
 *
 *   mossa        fiori/turno   terra per finire   costo
 *   Offri             10        spesa × 1,00     —
 *   Accarezza         14        spesa × 0,45     rischio `sfiorito`
 *   Mazzo             22        spesa × 0,25     2 ricordi a uso
 *
 * Il limite del vaso è sotto il costo di `Offri`, e questo è tutto il gioco:
 * la mossa base da sola non basta, e imparare a usare le altre due è la
 * prima cosa che il giocatore scopre da solo.
 *
 *   resa riuscita  → perdi niente, +1 ricordo, e semini lo stesso
 *   resa fallita  → -1 ricordo, e semini lo stesso
 *   chiedi (con «parla»)  → -0, +1 ricordo, ma NON semini
 *   chiedi (senza «parla») → -1 ricordo, e non semini
 *   mossa non resabile     → -1 ricordo, e non puoi seminare
 *   domanda senza risposta → -1 ricordo + un turno perso
 *   speso oltre il limite   →  la partita finisce, e finisci male
 *
 * Una resa persa NON è un turno perso. Risemi lo stesso, solo che ti è costato
 * un ricordo. Se non si potesse comunque seminare, punire e non ricompensare
 * insieme sarebbe doppia punizione.
 *
 * Tutta la logica qui dentro è sincrona e senza DOM: prende lo stato del
 * save, il vaso e un "seminatore" (l'Orto) e restituisce eventi.
 */
(function () {
'use strict';

/* I fiori che hai in mano. Tutte e tre le mosse danno la stessa cura: cambia
   solo quanta terra ci metti per ottenerla. Vedi la tabella sopra. */
const FIORI = { offri: 10, accarezza: 14, mazzo: 22, chiedi: 0 };
/* La cura che un fiore vale per unità di terreno. Più alto = meno terra. */
const MOLTI = { offri: 1, accarezza: 2.2, mazzo: 4, chiedi: 0 };
const GLIF = { offri: '〰', accarezza: '◗', mazzo: '●', chiedi: '❝' };
const NOMI = {
  offri: 'Offri',
  accarezza: 'Accarezza',
  mazzo: 'Mazzo',
  chiedi: 'Chiedi',
};
const NOTE = {
  offri: 'Dieci fiori, e non basta a finire nessuno. Tocchi molta terra.',
  accarezza: 'Quattordici fiori con meno terra. Se alzi la mano, non prendono.',
  mazzo: 'Ventidue fiori, e due ricordi ogni volta che lo usi.',
  chiedi: 'Non semini: parli. Serve ricordare come si fa.',
};

const VALORE_TOTALE = 100;     // riempire tutto il vaso = 100 di cura
const BONUS_CUORE = 2.2;       // il cuore moltiplica la cura
const SETE_MAX = 3;
const SETE_PER_TURNO = 1.7;
/* Chi è stato tradito beve di più. L'arco è la ragione: non è una
 * difficoltà aggiunta, è il personaggio che è cambiato. */
const SETE_PER_ARCO = [1, 1.45, 2.1];
const SFIORITO_CHANCE = 0.34;
const SFIORITO_PERSO = 0.45;   // quanto di cura il fiore non prende
const MEMORIE_PER_MAZZO = 2;   // quante ne costa un Mazzo
const BONUS_CUORE_RESTA = 1.2; // la differenza sopra 1 quando il cuore è tuo

/* ── la resa: tenere e lasciar andare ─────────────────────── */
const FINESTRA_RESA = 700;     // ms totali
const PRONTO_FR = 0.12;        // sotto questo, il fiore non è ancora tuo
const MINIMO_FR = 0.18;        // sotto questo, non l'hai nemmeno preso
const MOSSO_MAX = 0.14;        // spostare il dito mentre tieni: lo stringi

const M = () => window.FSTMemoria;

/**
 * Il verdetto su una resa. Funzione pura e sincrona: nessun DOM, nessun clock
 * nascosto, e i quattro modi di fallire hanno quattro nomi diversi — perché
 * «hai sbagliato» e «sei arrivato tardi» sono rimproveri diversi, e una resa
 * persa che dice sempre la stessa cosa mente su quello che è successo.
 *
 * @returns {{riuscita:boolean, motivo?:string, durata:number, mosso:number}}
 */
function verdetto({ durata, mosso }, { finestra, pronto, minimo, mossoMax }) {
  if (durata > finestra) return { riuscita: false, motivo: 'troppo tardi', durata, mosso };
  if (durata < pronto) return { riuscita: false, motivo: 'troppo presto', durata, mosso };
  if (durata < minimo) return { riuscita: false, motivo: 'troppo breve', durata, mosso };
  if (mosso > mossoMax) return { riuscita: false, motivo: 'troppo mosso', durata, mosso };
  return { riuscita: true, durata, mosso };
}

function nuovo({ nemico, salva, defs, stato = 0, clock = null, rng = Math.random }) {
  const Mem = M();
  const b = Mem.bonus(salva, defs);

  const scaletta = nemico.scaletta || [{ soglia: nemico.spesa || 100, azioni: [{ t: 'mossa', resabile: true }] }];

  const st = {
    /* Il save vive dentro lo stato, e non in una variabile fuori: `applica` e
     * `rispondiResa` ne hanno bisogno, e se il save cambiasse fuori da qui
     * i due si parlerebbero addosso. */
    salva,
    nemico,
    stato,                    // 0 chi è · 1 chi hai perso · 2 chi ti ha piantato
    spesa: nemico.spesa || VALORE_TOTALE,
    spesaMax: nemico.spesa || VALORE_TOTALE,
    speso: 0,                 // quanto terreno hai toccato tu
    limite: (nemico.limite !== undefined ? nemico.limite : 200),   // oltre questo, crolli
    fiori: 0,                 // il mazzetto: quanti fiori hai ancora in mano
    fioriMax: 0,              // quanti te ne avevano dato la mossa scelta
    mossoChiuso: false,       // hai già seminato con questa mossa: non si cambia
    sete: 0,                 // quanta sete ha il vaso: a 6 fa una domanda
    asciutto: 0,              // turni in cui Accarezza e Mazzo non si possono usare
    stordito: 0,              // una pennellata da buttare, non un turno perso
    round: 1,
    scaletta,
    faseSbloccata: 0,
    turniAvversari: 0,        // quanti turni ha già avuto il vaso (non il metodo!)
    mossa: null,
    fase: 'giocatore',
    attacco: null,        // { resabile, conScheda, testo } in attesa di risposta
    resa: null,           // { x, y, aperta, scaduta, pronta, minimo, risolta }
    contatoreRese: 0,
    contatoreFallite: 0,
    bruciate: [],
    riafferrate: [],
    eventi: [],
    ultimoMessaggio: '',
    finito: false,
    vittoria: false,
  };

  /* L'orologio è iniettato: nei test si guida a mano, nel browser fa da sé.
   * Senza questo la finestra sarebbe un numero fisso e la resa non scaderebbe
   * mai — e una resa che non scade è un pulsante. */
  st.ora = clock || (() => (typeof performance !== 'undefined' ? performance.now() : 0));
  st.finestra = FINESTRA_RESA + (b.resa || 0);
  /* `pronto` e `minimo` restano quelli base: la scheda non ti fa tenere più a
   * lungo, ti dà più tempo per *decidere*. È un aiuto onesto. */
  st.pronto = FINESTRA_RESA * PRONTO_FR;
  st.minimo = FINESTRA_RESA * MINIMO_FR;
  st.mossoMax = MOSSO_MAX;
  /* Al terzo stato il cuore smette di essere la parte che ti costa e diventa
   * quella che ti rende. È l'unico modo di riavere, e arriva a fine partita. */
  st.inverteCuore = stato >= 2;
  st.setePerTurno = (nemico.setePerTurno || SETE_PER_TURNO) * (SETE_PER_ARCO[Math.min(2, Math.max(0, stato))] || 1);

  const dice = (p) => rng() < p;
  const valutaFase = () => {
    let f = 0;
    for (let i = 0; i < scaletta.length; i++) if (st.spesa <= scaletta[i].soglia) f = i;
    st.faseSbloccata = f;
  };
  valutaFase();

  const scrivi = (testo, tipo = 'info') => {
    st.ultimoMessaggio = testo;
    st.eventi.push({ tipo, testo });
    return testo;
  };

  st.bonus = b;

  /* La prossima mossa del vaso. L'indice parte da -1 perché `turnoVaso` lo
   * incrementa *prima* di chiedere: così il primo turno è la prima azione
   * della scaletta, e non la seconda. */
  st.prossima = () => {
    const az = scaletta[st.faseSbloccata].azioni;
    const i = ((st.turniAvversari - 1) % az.length + az.length) % az.length;
    return az[i];
  };
  st.intentoVisibile = () => Mem.abilita(salva, defs, 'vedere');
  st.intento = () => {
    const d = st.prossima();
    if (!d) return '';
    if (d.t === 'mossa') return d.resabile === false ? 'non si può lasciar andare' : 'tenendo e rilasciando';
    if (d.t === 'domanda') return 'farà una domanda';
    if (d.t === 'appassisce') return 'farà appassire i semi';
    if (d.t === 'ricorda') return 'ti porterà via un ricordo';
    return '';
  };

  /* ── scelte del giocatore ──────────────────────────────── */

  st.mosseDisponibili = () => {
    const out = [];
    for (const id of ['offri', 'accarezza', 'mazzo', 'chiedi']) {
      /* Chiedi non è chiusa da nessuna chiave: è l'alternativa alla resa, e
       * deve esistere sempre. Se non sai più parlare, costa un ricordo — ma
       * resta lì, perché a un giocatore che ha perso tutto non si toglie anche
       * la scelta. Le altre mosse invece sono legate a una scheda: senza, non
       * sai più farle. */
      const chiave = { accarezza: 'accarezza', mazzo: 'mazzo' }[id];
      let bloccata = false;
      let motivo = '';
      if (st.finito) { bloccata = true; motivo = 'Il vaso è già pieno.'; }
      /* `stordito` NON blocca le mosse. Prima le bloccava: una domanda a cui
       * non sapevi rispondere chiudeva ogni mossa, e siccome il turno del vaso
       * arriva solo dopo un colpo, nessun colpo poteva più arrivare e la
       * partita restava lì per sempre. Un blocco che si auto-mantiene è un
       * vicolo cieco, non una punizione.
       *
       * Ora la pena è sul COLPO, non sulle mosse: la prossima pennellata va a
       * vuoto e poi passa. Si può sempre agire, e si paga una volta sola. */
      else if (st.stordito > 0) { motivo = 'Sei scordata: la prossima pennellata andrà a vuoto.'; }
      else if (chiave && !Mem.abilita(salva, defs, chiave)) { bloccata = true; motivo = 'Non ricordi più come si faceva.'; }
      if (id === 'mazzo' && !bloccata && !Mem.puoiBruciare(salva, MEMORIE_PER_MAZZO)) { bloccata = true; motivo = 'Non hai abbastanza ricordi da dare al terreno.'; }
      /* Il terreno appassito vieta solo l'accarezza, che è la mossa che lo
       * tocca. Il Mazzo non guarda il terreno: daresti i fiori a occhi chiusi,
       * e a un terreno morto funzionerebbe anche.
       *
       * Se appassisse bloccasse anche il Mazzo, l'unica mossa rimasta sarebbe
       * Offri — la più lenta. Ogni appassimento azzererebbe il vantaggio delle
       * altre due, e il gioco si ridurrebbe a "prega che non capitino". */
      if (id === 'accarezza' && st.asciutto > 0 && !bloccata) { bloccata = true; motivo = 'I semi sono appassiti: non puoi accarezzare, il terreno non la sentirebbe.'; }
      /* Una mossa per turno. Senza questo si potrebbe richiamare Mazzo a ogni
         tratto per rimpiazzare il mazzetto, e il suo costo diventerebbe
         una volta e mezza invece che due a uso. */
      if (id !== 'chiedi' && st.mossoChiuso && !bloccata) { bloccata = true; motivo = 'Hai già seminato con questa mossa: gli altri fiori sono già partiti.'; }
      if (id === 'chiedi' && !bloccata && !st.attacco) { bloccata = true; motivo = 'Non c\'è niente da chiedere, adesso.'; }
      out.push({
        id,
        nome: NOMI[id],
        glifo: GLIF[id],
        costo: FIORI[id],
        bloccata,
        motivo,
        pericolo: id === 'mazzo',
        nota: id === 'chiedi' && !Mem.abilita(salva, defs, 'parla')
          ? 'Non semini: parli. Ma non ricordi più come si fa.'
          : NOTE[id],
      });
    }
    return out;
  };

  st.scegli = (id) => {
    const m = st.mosseDisponibili().find((x) => x.id === id);
    if (!m || m.bloccata) return { ok: false, motivo: m ? m.motivo : 'Mossa sconosciuta.' };
    st.mossa = id;
    if (id === 'chiedi') return st.chiedi();
    /* Il mazzetto è la mossa: scegliere Offri ti mette in mano dieci fiori, e
       finiscono quando finiscono. */
    st.fiori = FIORI[id];
    st.fioriMax = FIORI[id];
    if (id === 'mazzo') {
      scrivi(`Scegli ${MEMORIE_PER_MAZZO} ricordi da dare al terreno.`, 'pericolo');
      return { ok: true, chiedeSchede: MEMORIE_PER_MAZZO };
    }
    if (id === 'accarezza') scrivi('Pesa la mano. Non alzarla.', 'info');
    else scrivi('Semina sopra il vaso. Dieci fiori: non basteranno.', 'info');
    return { ok: true };
  };

  /* Il giocatore ha indicato le due carte da dare in pasto alla terra.
   * Si chiama solo dopo un `scegli('mazzo')` andato bene: è l'unico momento
   * in cui bruciare è una scelta e non una perdita. */
  st.scegliMemorie = (ids) => {
    if (st.mossa !== 'mazzo') return { ok: false, motivo: 'Non è il momento di dare.' };
    const scelte = Mem.senzaDup(ids).filter((id) => Mem.ha(salva, id)).slice(0, MEMORIE_PER_MAZZO);
    if (scelte.length < MEMORIE_PER_MAZZO) return { ok: false, motivo: 'Servono due ricordi, e due che hai davvero.' };
    Mem.brucia(salva, scelte);
    st.bruciate.push(...scelte);
    st.sete = 0;
    scrivi(`Hai dato al terreno: ${scelte.join(', ')}.`, 'pericolo');
    return { ok: true, scelte };
  };

  /* ── Chiedi: si paga in tempo, non in ricordi (se sai parlare) ── */

  st.chiedi = () => {
    if (!st.attacco) return { ok: false, motivo: 'Non c\'è niente da chiedere.' };
    const saParlare = Mem.abilita(salva, defs, 'parla');
    if (saParlare) {
      st.attacco = null;
      st.resa = null;
      const id = Mem.schedaDaRiafferrare(salva);
      let ripresa = 0;
      if (id && Mem.riafferra(salva, id)) { st.riafferrate.push(id); ripresa++; }
      scrivi(ripresa ? `Hai parlato. Ti ha risposto, e ti ha ridato: ${ripresa}.` : 'Hai parlato. Ti ha ascoltato.', 'bene');
      return { ok: true, ripresa, semina: false };
    }
    const persi = Mem.bruciaAutomatico(salva, 1);
    st.bruciate.push(...persi);
    st.attacco = null;
    st.resa = null;
    scrivi('Hai aperto la bocca e non è uscito niente. Ti ha risposto lui.', 'pericolo');
    controllaVuoto();
    return { ok: true, ripresa: 0, semina: false, persi };
  };

  /* ── il giocatore semina ───────────────────────────────── */

  /**
   * Chiamata a ogni tratto concluso. Calcola la cura ma non la applica:
   * chi la scala è `st.applica`, così il fiore sfiorito può ancora mangiucchiare.
   */
  st.punto = (tratto) => {
    const car = window.FSTOrto.caratteristiche(tratto);
    /* Una resa è una finestra APERTA, non un attacco in corso. Con il solo
     * attacco, qualunque pennellata diventava una resa — e quindi si poteva
     * «lasciar andare» un fiore che non era mai comparso, e riavere un ricordo
     * per un gesto che non era quello. */
    if (st.attacco && st.resa && !st.resa.risolta) {
      return { tipo: 'resa', esito: st.rispondiResa(tratto), caratteristiche: car, punti: tratto.punti };
    }
    const molti = MOLTI[st.mossa || 'offri'] * (b.cura || 1);
    return { tipo: 'normale', molti, caratteristiche: car, punti: tratto.punti, mossa: st.mossa || 'offri' };
  };

  /** La misura vera: il tuo dito contro la maschera del vaso. */
  st.misura = (tratto, orto) => {
    const molti = MOLTI[st.mossa || 'offri'] * (b.cura || 1);
    const larg = tratto.larghezza || orto.larghezzaMorsa();
    /* Il budget è il mazzetto: quando finisce, l'Orto tronca il tratto dove
     * finisce. Non è un numero che cala sulla barra, è il gambo che smette di
     * crescere a metà figura — e quello è l'unico modo per far capire che sono
     * finiti senza scrivere niente. */
    return orto.semina(
      { punti: tratto.punti, larghezza: larg },
      {
        moltiplicatore: molti, bonusCuore: BONUS_CUORE, valore: VALORE_TOTALE,
        inverteCuore: st.inverteCuore, budget: st.fiori,
      },
    );
  };

  st.applica = (misura, orto) => {
    if (!misura) return null;
    const curaLorda = misura.cura;
    /* Sei scordata: questa pennellata non dà niente. Non è un turno perso —
     * è un colpo perso, e il vaso avanza lo stesso. È la pena giusta per una
     * domanda a cui non sapevi rispondere: ti costa il gesto, non la possibilità
     * di farne un altro. */
    if (st.stordito > 0) {
      st.stordito = 0;
      st.mossoChiuso = true;
      st.fase = 'giocatore';
      scrivi('Hai seminato senza pensare a che cosa stavi seminando. È andato a vuoto.', 'pericolo');
      if (controllaCollasso()) return { sfiorito: false, cura: 0, vittoria: false, crollo: true };
      valutaFase();
      return { sfiorito: false, cura: 0, scordata: true };
    }

    let cura = curaLorda;
    let sfiorito = false;

    /* Accarezza: chi alza la mano prima, il fiore non prende. E questa è la
     * cosa più brutta che si possa fare in questo gioco, perché il mazzetto
     * è già stato aperto: **i fiori sono partiti, e il vaso non li ha
     * ricevuti.** Non perdi solo la cura: perdi i fiori. È l'unica mossa in
     * cui la disattenzione si paga due volte, e per questo è l'unica che
     * conviene fare con calma. */
    if (st.mossa === 'accarezza' && dice(SFIORITO_CHANCE)) {
      sfiorito = true;
      cura *= 1 - SFIORITO_PERSO;
      const pts = (st._ultimoTratto && st._ultimoTratto.punti) || [];
      const ultimo = pts[pts.length - 1] || [0.5, 0.5];
      orto.sfiorito(ultimo[0], ultimo[1]);
      scrivi('Hai alzato la mano. I fiori sono partiti senza arrivare.', 'pericolo');
    }

    /* Il tuo conto è l'area, non la cura: due numeri che non si contraddicono
     * mai. Per questo le mosse potenti ti risparmiano terreno. */
    st.speso += misura.quota * VALORE_TOTALE;
    st.spesa -= cura;
    /* Il mazzetto si paga intero, sfiorito o no: quello che hai stretto nella
     * mano è stato perso comunque. */
    st.fiori = Math.max(0, st.fiori - curaLorda);
    st.mossoChiuso = true;

    scrivi(`+${Math.round(Math.abs(cura))}${misura.cuore > 0.001 ? ' · cuore' : ''}`, 'info');

    if (st.spesa <= 0) {
      st.spesa = 0;
      st.finito = true;
      st.vittoria = true;
      st.fase = 'finito';
      st.attacco = null;
      scrivi('Il vaso è pieno. È fiorito tutto insieme, e poi non c\'era più niente.', 'bene');
      return { sfiorito, cura, vittoria: true, esaurito: misura.esaurito };
    }
    if (controllaCollasso()) return { sfiorito, cura, vittoria: false, crollo: true, esaurito: misura.esaurito };
    valutaFase();
    return { sfiorito, cura, vittoria: false, esaurito: misura.esaurito };
  };

  /* ── la resa ───────────────────────────────────────────── */

  st.apriResa = (x, y, { conScheda = null } = {}) => {
    st.resa = {
      x, y, conScheda, risolta: false,
      aperta: st.ora(),
      scaduta: st.ora() + st.finestra,
      pronta: st.ora() + st.pronto,
      minimo: st.ora() + st.minimo,
      mossoMax: st.mossoMax,
    };
    return st.resa;
  };
  st.resaScaduta = () => !st.resa || st.resa.risolta || st.ora() >= st.resa.scaduta;

  /**
   * La finestra si chiude da sola, e chiuderla costa.
   *
   * Senza questo il fiore era un'icona: la finestra non scadeva mai, nessuno
   * guardava, e il gesto si poteva fare quando si voleva. Anzi peggio: bastava
   * un attacco aperto perché QUALSIASI colpo di pennello, in qualsiasi momento,
   * contando come resa — quindi il tempo non esisteva, perché bastava premere
   * per duecento millisecondi quando si voleva. Il fiore era gratis e la
   * pazienza non costava niente, cioè la cosa più cara del gioco era gratis.
   *
   * Ora scadere è una fourth uscita, e costa come ogni altra resa persa: un
   * ricordo. Il fiore non ti obbliga a niente, ma non puoi neanche ignorarlo
   * per sempre: devi decidere entro la finestra, e decidere è il gioco.
   */
  st.scadeResa = () => {
    if (!st.resa || st.resa.risolta || st.ora() < st.resa.scaduta) return null;
    const attacco = st.attacco;
    st.resa = null;
    st.attacco = null;
    st.contatoreFallite++;
    const persi = Mem.bruciaAutomatico(salva, 1);
    st.bruciate.push(...persi);
    scrivi('Il fiore è andato via prima che tu decidessi. Il terreno ha preso quello che era rimasto.', 'pericolo');
    controllaVuoto();
    return { riuscita: false, motivo: 'troppo tardi', scaduta: true, persi, testo: attacco && attacco.testo };
  };

  st.rispondiResa = (tratto) => {
    if (!st.resa) return { riuscita: false, motivo: 'niente da lasciar andare' };
    const { conScheda, aperta, scaduta, pronta, minimo, mossoMax } = st.resa;
    const punti = tratto && tratto.punti ? tratto.punti : [];
    /* La durata è quella della pressione: `tratto.durataMs` nasce in orto.js
     * come (fine - inizio) del gesto, cioè esattamente quanto hai tenuto. È
     * la misura fisica della resa, e per questo la si può testare scrivendo
     * un tratto a mano invece di pilotare l'orologio. */
    const mosso = window.FSTOrto.lunghezza(punti);
    const durata = tratto && tratto.durataMs ? tratto.durataMs : Math.max(0, st.ora() - aperta);
    const v = verdetto(
      { durata, mosso },
      { finestra: scaduta - aperta, pronto: pronta - aperta, minimo: minimo - aperta, mossoMax },
    );

    st.resa.risolta = true;
    const attacco = st.attacco;
    st.attacco = null;

    if (v.riuscita) {
      st.contatoreRese++;
      /* La resa è l'unico modo di riavere un ricordo. E se per lasciarlo andare
       * serve consegnare qualcuno — Betta, Orielia — la scelta è già scritta:
       * si paga con la persona che si stava salvando. */
      if (conScheda && Mem.ha(salva, conScheda)) {
        Mem.brucia(salva, [conScheda]);
        st.bruciate.push(conScheda);
        scrivi('Lo hai lasciato andare. Per lasciarlo andare hai consegnato proprio lui.', 'pericolo');
      } else {
        const date = Math.max(1, Math.min(b.memoriaPerResa || 1, MEMORIE_PER_MAZZO));
        let ripresa = 0;
        for (let i = 0; i < date; i++) {
          const id = Mem.schedaDaRiafferrare(salva);
          if (!id || !Mem.riafferra(salva, id)) break;
          st.riafferrate.push(id);
          ripresa++;
        }
        scrivi(ripresa ? `L'hai lasciato andare. Ti è tornato: ${ripresa}.` : `L'hai lasciato andare.`, 'bene');
      }
      return { riuscita: true, ripresa: conScheda ? 0 : 1, testo: attacco && attacco.testo, motivo: v.motivo };
    }

    st.contatoreFallite++;
    const persi = Mem.bruciaAutomatico(salva, 1);
    st.bruciate.push(...persi);
    scrivi(`Non l'hai lasciato andare: ${v.motivo}.`, 'pericolo');
    controllaVuoto();
    return { riuscita: false, motivo: v.motivo, persi, testo: attacco && attacco.testo };
  };

  function controllaVuoto() {
    if (!Mem.isVacia(salva)) return false;
    st.finito = true;
    st.vittoria = false;
    st.fase = 'finito';
    st.attacco = null;
    scrivi('Non ti resta più niente. Non ricordi più nemmeno perché stavi donando.', 'pericolo');
    return true;
  }
  st.controllaVuoto = controllaVuoto;

  /* Il crollo: è l'unico modo in cui perdi *senza* che nessuno te lo faccia.
   * Non è una sconfitta imposta da un nemico: è la spesa. */
  function controllaCollasso() {
    if (st.speso < st.limite) return false;
    st.finito = true;
    st.vittoria = false;
    st.fase = 'finito';
    st.attacco = null;
    scrivi('Hai dato troppo. Il terreno ha preso tutto quello che avevi, e anche un pezzo di te.', 'pericolo');
    return true;
  }
  st.controllaCollasso = controllaCollasso;

  /* ── il turno del vaso ─────────────────────────────────── */

  /* Il turno del vaso. Nota il nome: il contatore è turniAvversari, perché è
   * questo metodo e un numero con lo stesso nome lo sovrascriverebbe — ed è
   * successo, e il gioco non faceva niente. */
  st.turnoVaso = () => {
    if (st.finito) return { azione: null, eventi: [] };
    st.turniAvversari++;
    const az = st.prossima();
    const fuori = [];
    st.attacco = null;
    st.resa = null;
    /* Il mazzetto si riapre, e con lui la possibilità di scegliere una mossa
     * diversa. È l'unico momento in cui si può. */
    st.fiori = 0;
    st.fioriMax = 0;
    st.mossoChiuso = false;

    st.sete += st.setePerTurno + (1 - st.spesa / st.spesaMax) * 0.7;

    if (st.sete >= SETE_MAX) {
      st.sete = 0;
      const domande = nemico.domande || [];
      const dom = domande.length ? domande[Math.floor(rng() * domande.length) % domande.length] : null;
      if (dom) {
        const sa = Mem.ha(salva, dom.risposta);
        if (sa) {
          scrivi(dom.testo, 'info');
          fuori.push({ t: 'domanda', salvata: true, testo: dom.testo });
        } else {
          const persi = Mem.bruciaAutomatico(salva, 1);
          st.bruciate.push(...persi);
          st.stordito = 1;
          scrivi(dom.testo, 'pericolo');
          fuori.push({ t: 'domanda', salvata: false, testo: dom.testo, persi });
        }
        valutaFase();
        st.fase = st.stordito > 0 ? 'stordito' : 'giocatore';
        st.mossa = null;
        return { azione: { t: 'domanda' }, eventi: fuori };
      }
    }

    if (az.t === 'appassisce') {
      st.asciutto = az.turni || 2;
      scrivi(az.testo || 'I semi appassiscono.', 'pericolo');
      fuori.push({ t: 'appassisce', testo: az.testo || 'I semi appassiscono.' });
    } else if (az.t === 'mossa') {
      st.attacco = { resabile: az.resabile !== false, conScheda: az.conScheda || null, testo: az.testo || '' };
      fuori.push({ t: 'mossa', resabile: az.resabile !== false, conScheda: az.conScheda || null, testo: az.testo || '' });
    } else if (az.t === 'ricorda') {
      const persi = Mem.bruciaAutomatico(salva, 1);
      st.bruciate.push(...persi);
      scrivi(az.testo || 'Ti ricorda una cosa che avevi appena dimenticato.', 'pericolo');
      fuori.push({ t: 'ricorda', testo: az.testo || '', persi });
    }

    if (st.asciutto > 0) st.asciutto--;

    valutaFase();
    st.round++;
    st.mossa = null;
    st.fase = st.stordito > 0 ? 'stordito' : 'giocatore';
    return { azione: az, eventi: fuori };
  };

  st.azzera = () => { st.sete = 0; st.mossa = null; st.attacco = null; st.resa = null; };
  st.annulla = () => { st.mossa = null; };

  /* Il punto in cui nasce il fiore da lasciar andare. Non una riga da
   * tracciare: un punto. Tieni premuto e rilascia. */
  st.generaFiore = (rng2 = rng) => ({
    x: 0.36 + rng2() * 0.28,
    y: 0.26 + rng2() * 0.36,
  });

  return st;
}

window.FSTDono = {
  nuovo, verdetto,
  FIORI, MOLTI, GLIF, NOMI, NOTE,
  VALORE_TOTALE, BONUS_CUORE,
  SETE_MAX, SETE_PER_TURNO, SETE_PER_ARCO, SFIORITO_CHANCE, SFIORITO_PERSO,
  FINESTRA_RESA, PRONTO_FR, MINIMO_FR, MOSSO_MAX,
  MEMORIE_PER_MAZZO, BONUS_CUORE_RESTA,
};
})();
