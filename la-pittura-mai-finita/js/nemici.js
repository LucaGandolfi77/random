/* nemici.js — chi sta sulla tela.
 *
 * Ogni nemico è un ritratto che il maestro ha iniziato e non ha finito, e una
 * `forma` geometrica: cerchi e poligoni in coordinate normalizzate 0..1 che
 * dicono alla Tela dove c'è il ritratto da coprire. L'intersezione fra lo
 * sbozzo e la maschera del tuo dito *è* il danno.
 *
 * I nemici non hanno morale: hanno ansia. Ogni turno l'ansia sale, e quando
 * arriva in fondo fanno una domanda. Se hai ancora la scheda con la risposta,
 * non ti costa niente. Se non ce l'hai, ti costa un ricordo e un turno.
 *
 * Il quinto non è una figura. È la cornice.
 */
(function () {
'use strict';

const NEMICI = {

  /* ── Atto 0 · la tela bianca ───────────────────────────── */
  'tela-bianca': {
    id: 'tela-bianca',
    nome: 'La Tela Bianca',
    titolo: 'ci stai già dipingendo sopra',
    vita: 22,
    tutorial: true,
    ansiaPerTurno: 99,          // non fa domande: è solo una mano che impara
    forme: [
      { t: 'ell', x: 0.5, y: 0.52, rx: 0.21, ry: 0.27 },
      { t: 'ell', x: 0.5, y: 0.20, rx: 0.11, ry: 0.13, volto: true },
    ],
    scaletta: [{ soglia: 22, azioni: [{ t: 'mossa', parabile: false, testo: '' }] }],
    domande: [],
    frasi: ['Non c\'è niente qui dentro. Solo te, e quello che ti stai facendo.'],
  },

  /* ── Atto I · il ritratto della fidanzata ──────────────── */
  'il-commiato': {
    id: 'il-commiato',
    nome: 'Il Commiato',
    titolo: 'si scusa mentre ti cancella',
    vita: 100,
    ansiaPerTurno: 1.6,
    forme: [
      { t: 'ell', x: 0.5, y: 0.17, rx: 0.095, ry: 0.115, volto: true },
      { t: 'pol', pts: [[0.40, 0.27], [0.60, 0.27], [0.66, 0.52], [0.34, 0.52]] },   // torso
      { t: 'pol', pts: [[0.34, 0.36], [0.22, 0.30], [0.19, 0.35], [0.33, 0.44]] }, // braccio in saluto
      { t: 'pol', pts: [[0.40, 0.52], [0.60, 0.52], [0.70, 0.92], [0.30, 0.92]] }, // gambe
    ],
    scaletta: [
      {
        soglia: 100,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«scusa il ritardo. è stato il traffico.»' },
          { t: 'domanda', testo: '«come ti chiami? dai, che ci siamo visti.»' },
          { t: 'mossa', parabile: true, testo: '«va bene? stai zitta, dico, scusa.»' },
        ],
      },
      {
        soglia: 55,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«non volevo. credimi, non volevo.»' },
          { t: 'mossa', parabile: false, testo: '«mi hai chiesto chi sono. non lo so più.»' },
          { t: 'asciuga', turni: 2, testo: '«non guardare, si rovina tutto.»' },
        ],
      },
      {
        soglia: 20,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«un\'ultima cosa. poi te ne vai.»' },
          { t: 'mossa', parabile: false, testo: '«te ne sei andata. l\'hai fatto apposta.»' },
        ],
      },
    ],
    domande: [
      { domanda: 'nome', risposta: 'ada-viso', testo: '«come ti chiami? dai, che ci siamo visti.»' },
    ],
    frasi: [
      'L\'ha finito in quattro anni. Non sorrideva in nessuna.',
      'Diceva sempre arrivederci. Non arrivederci: arrivederci.',
    ],
  },

  /* ── Atto II · il ritratto del figlio ──────────────────── */
  'l-attesa': {
    id: 'l-attesa',
    nome: 'L\'Attesa',
    titolo: 'seduta da undici anni',
    vita: 110,
    ansiaPerTurno: 1.8,
    forme: [
      { t: 'ell', x: 0.47, y: 0.30, rx: 0.10, ry: 0.12, volto: true, rot: -0.25 },
      { t: 'pol', pts: [[0.36, 0.38], [0.58, 0.36], [0.64, 0.60], [0.32, 0.60]] },
      { t: 'pol', pts: [[0.30, 0.58], [0.66, 0.56], [0.82, 0.94], [0.18, 0.94]] },  // gonna
      { t: 'pol', pts: [[0.56, 0.40], [0.70, 0.46], [0.66, 0.52], [0.54, 0.45]] },  // braccia in grembo
    ],
    scaletta: [
      {
        soglia: 110,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«ti siedi? fa freddo, va\' là.»' },
          { t: 'domanda', testo: '«dov\'è tuo figlio?»' },
          { t: 'mossa', parabile: true, testo: '«mangia, che hai le labbra scure.»' },
        ],
      },
      {
        soglia: 62,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«ti avevo detto di non uscire con quel cielo.»' },
          { t: 'mossa', parabile: false, testo: '«lui lo sapeva. sapeva, e ci è andato.»' },
          { t: 'asciuga', turni: 2, testo: '«smetti di piangere, si vede dal di dentro.»' },
        ],
      },
      {
        soglia: 25,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«una lettera. una sola. ti prendo il fazzoletto.»' },
          { t: 'mossa', parabile: false, testo: '«sono passati undici anni. li ho contati tutti.»' },
        ],
      },
    ],
    domande: [
      { domanda: 'figlio', risposta: 'ansi-figlio', testo: '«dov\'è tuo figlio?»' },
    ],
    frasi: [
      'La gonna occupa metà tela. Il maestro l\'aveva capita prima di tutti.',
      'Non si muove. È l\'unica figura che non si è mossa mai, in undici anni.',
    ],
  },

  /* ── Atto III · il ritratto del maestro ────────────────── */
  'il-male-in-figura': {
    id: 'il-male-in-figura',
    nome: 'Il Male in Figura',
    titolo: 'la marea con un volto',
    vita: 120,
    ansiaPerTurno: 2.1,
    forme: [
      { t: 'ell', x: 0.5, y: 0.20, rx: 0.13, ry: 0.15, volto: true },
      { t: 'ell', x: 0.5, y: 0.55, rx: 0.30, ry: 0.30 },
      { t: 'ell', x: 0.26, y: 0.38, rx: 0.15, ry: 0.17 },
      { t: 'ell', x: 0.74, y: 0.38, rx: 0.15, ry: 0.17 },
      { t: 'pol', pts: [[0.22, 0.72], [0.78, 0.72], [0.92, 1.0], [0.08, 1.0]] },
    ],
    scaletta: [
      {
        soglia: 120,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«io non sono cattivo. io sono la fine.»' },
          { t: 'asciuga', turni: 2, testo: '«asciughiamo. è più semplice.»' },
          { t: 'domanda', testo: '«chi ti ha fatto male?»' },
        ],
      },
      {
        soglia: 70,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«un colore. solo uno. scegli tu.»' },
          { t: 'mossa', parabile: false, testo: '«una voce. due. tre. continua, non costa niente.»' },
          { t: 'mossa', parabile: true, testo: '«l\'anno prossimo non ci sarà nessun \'anno prossimo.»' },
        ],
      },
      {
        soglia: 28,
        azioni: [
          { t: 'mossa', parabile: false, testo: '«niente ti fa male se non te lo ricordi.»' },
          { t: 'mossa', parabile: true, testo: '«ultima offerta: dimentica anche me.»' },
        ],
      },
    ],
    domande: [
      { domanda: 'male', risposta: 'aurelio-occhi', testo: '«chi ti ha fatto male?»' },
    ],
    frasi: [
      'Non ha linee. È una macchia che ha deciso di avere un volto.',
      'Il maestro l\'ha iniziato senza volerlo. Poi non ha più avuto il coraggio di finirlo.',
    ],
  },

  /* ── Atto IV · il ritratto di Tecla ────────────────────── */
  tecla: {
    id: 'tecla',
    nome: 'Tecla',
    titolo: 'si sta dipingendo per morire al posto tuo',
    vita: 130,
    ansiaPerTurno: 2.0,
    forme: [
      { t: 'ell', x: 0.42, y: 0.26, rx: 0.10, ry: 0.12, volto: true, rot: 0.3 },
      { t: 'pol', pts: [[0.34, 0.34], [0.54, 0.33], [0.60, 0.62], [0.28, 0.62]] },
      /* il braccio teso verso chi guarda: verso di te */
      { t: 'pol', pts: [[0.52, 0.40], [0.86, 0.52], [0.88, 0.60], [0.50, 0.50]] },
      { t: 'pol', pts: [[0.32, 0.60], [0.58, 0.60], [0.70, 1.0], [0.24, 1.0]] },
    ],
    scaletta: [
      {
        soglia: 130,
        azioni: [
          { t: 'mossa', parabile: true, conScheda: 'tecla-sta-zitta', testo: '«para. guarda come sono.»' },
          { t: 'mossa', parabile: true, conScheda: 'tecla-sta-zitta', testo: '«non serve fare gli eroi.»' },
        ],
      },
      {
        soglia: 82,
        azioni: [
          { t: 'mossa', parabile: true, conScheda: 'tecla-sta-zitta', testo: '«ti ricordi la volta sul tetto?»' },
          { t: 'mossa', parabile: false, testo: '«se mi copri, il Male si ferma. se mi copri, io finisco.»' },
          { t: 'domanda', testo: '«resta?»' },
        ],
      },
      {
        soglia: 34,
        azioni: [
          { t: 'mossa', parabile: true, conScheda: 'tecla-sta-zitta', testo: '«un\'ultima pennellata. poi chiudi tu.»' },
          { t: 'mossa', parabile: false, testo: '«non guardarmi mentre lo fai. guarda il cielo.»' },
        ],
      },
      {
        soglia: 10,
        azioni: [
          { t: 'mossa', parabile: true, conScheda: 'tecla-sta-zitta', testo: '«dillo, Ada. adesso dillo.»' },
        ],
      },
    ],
    domande: [
      { domanda: 'resta', risposta: 'tecla-tetto', testo: '«resta?»' },
    ],
    frasi: [
      'Ha preso il tuo colore senza chiedere. Come faceva sempre.',
      'La copri e non guardi. È l\'unica regola che ti ha mai dato.',
    ],
  },

  /* ── Atto V · il Male ──────────────────────────────────── */
  'il-male': {
    id: 'il-male',
    nome: 'Il Male',
    titolo: 'una tela vuota in attesa',
    vita: 90,
    ansiaPerTurno: 2.4,
    /* Nessuna figura: il ritratto è la cornice. Coprire la cornice è
     * l'unico modo di dipingere sopra qualcosa che non ha un dentro. */
    forme: [
      { t: 'pol', pts: [[0.10, 0.08], [0.90, 0.08], [0.90, 0.13], [0.10, 0.13]] },
      { t: 'pol', pts: [[0.10, 0.87], [0.90, 0.87], [0.90, 0.92], [0.10, 0.92]] },
      { t: 'pol', pts: [[0.10, 0.08], [0.15, 0.08], [0.15, 0.92], [0.10, 0.92]] },
      { t: 'pol', pts: [[0.85, 0.08], [0.90, 0.08], [0.90, 0.92], [0.85, 0.92]] },
      { t: 'pol', pts: [[0.10, 0.44], [0.90, 0.44], [0.90, 0.475], [0.10, 0.475]] },  // l'orizzonte
    ],
    scaletta: [
      {
        soglia: 90,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«sono la cosa che resta quando non hai ricordato niente.»' },
          { t: 'asciuga', turni: 2, testo: '«asciughiamo. è l\'ora in cui si asciuga.»' },
        ],
      },
      {
        soglia: 50,
        azioni: [
          { t: 'mossa', parabile: true, testo: '«adesso non c\'è più nessuno da ricordare.»' },
          { t: 'mossa', parabile: false, testo: '«tranne te. e te ti sto guardando.»' },
          { t: 'domanda', testo: '«cosa hai dipinto?»' },
        ],
      },
      {
        soglia: 18,
        azioni: [
          { t: 'mossa', parabile: false, testo: '«finisci. è l\'unica cosa che mi resta da guardare.»' },
        ],
      },
    ],
    domande: [
      { domanda: 'cielo', risposta: 'aurelio-cielo', testo: '«cosa hai dipinto?»' },
    ],
    frasi: [
      'Non c\'è nessuno dentro. C\'è la cornice, e la cornice ha aspettato undici anni.',
      'Il maestro l\'ha lasciata vuota apposta. È l\'unico regalino che abbia mai fatto.',
    ],
  },
};

const ORDINE = ['tela-bianca', 'il-commiato', 'l-attesa', 'il-male-in-figura', 'tecla', 'il-male'];

function per(id) {
  return NEMICI[id] || null;
}

/* Il nemico dell'atto N: la sequenza è fissa e voluta, non casuale. */
function dellAtto(atto) {
  const id = ORDINE[Math.max(0, Math.min(ORDINE.length - 1, atto))];
  return NEMICI[id];
}

/* Le inchiostre: chi è, e che cosa costa al party quando dipinge. */
const TINTE = {
  ada: {
    id: 'ada', nome: 'Ada', colore: '#3a3733',
    motto: 'la tua mano',
    nota: 'Copri quello che ti resta di lei.',
  },
  tecla: {
    id: 'tecla', nome: 'Tecla', colore: '#9c3b2e',
    motto: 'la sua mano',
    nota: 'Parecchia, veloce, non chiede permesso.',
  },
  ansi: {
    id: 'ansi', nome: 'Ansi', colore: '#6b5646',
    motto: 'una velatura',
    nota: 'Quello che toglie, lo restituisce. Non a te: a lui.',
  },
  brizio: {
    id: 'brizio', nome: 'Brizio', colore: '#2a2622',
    motto: 'il nerone',
    nota: 'Brutto, economico, enorme. Funziona sempre.',
  },
};

window.PMFNemici = { NEMICI, ORDINE, TINTE, per, dellAtto };
})();