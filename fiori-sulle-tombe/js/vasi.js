/* vasi.js — i sei vasi.
 *
 * Un vaso è una figura disegnata, una sete e tre fasi. Non ha intelligenza: ha
 * un ritmo. Ogni fase si apre quando la spesa scende sotto la sua soglia, e da
 * lì in poi il vaso beve in un modo diverso: più assetato, più cattivo, e con
 * un'altra figura sotto gli occhi.
 *
 * LA FIGURA SI CONSUMA.
 *
 * L'ultima forma di ogni sbozzo è l'ornamento — la lettera, la mano, il
 * cartellino, la lastra — e al primo stato cade. Poi al secondo stato non
 * resta che il vaso e il cuore: chi hai perso occupa sempre meno terra. L'unica
 * eccezione è Sauro, che invece si allarga, perché non è una persona che
 * consumi: è la tomba, e alla fine copre tutto. È l'unico vaso che cresce, ed è
 * la ragione per cui è l'ultimo.
 *
 * LA SPESA È QUELLA DEL VASO, NON UN NUMERO SCRITTO A MANO.
 *
 * `spesa` è la cura che serve a dipingere la figura intera una volta sola con
 * Offri: si misura dalla figura, non si decide. Ed è l'unica definizione che
 * tiene, perché le figure cambiano con l'arco — allo stato due resta un terzo
 * della terra, e un vaso che si è ridotto chiederebbe ancora la spesa di prima
 * e non si riempirebbe mai. Lo stesso per `limite`: la quota di terra che puoi
 * toccare prima di crollare. Sta sotto la spesa (Offri non passa) e sopra
 * `spesa / 2,2` (Accarezza passa), e la percentuale scende a ogni vaso, così
 * l'ultimo ha il margine più stretto.
 *
 * Le domande non sono un quiz: sono «lo ricordi ancora?». Se la scheda ce
 * l'hai è gratis; se non ce l'hai, il terreno beve una memoria e tu resti
 * scordata un turno.
 */
(function () {
  const VASI = {
    'il-vaso': {
      id: 'il-vaso',
      nome: 'Il Vaso di Terra',
      titolo: 'quello che hai trovato e che nessuno ha piantato',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 1.4,   /* quota di terra sopra la quale crolli */
      persona: null,      /* non è nessuno: è il vaso, e non ha un arco */
      tutorial: true,     /* e per questo non ha sete: è terra, non una persona */
      /* Il gambo, le foglie, il cuore. Meno di tutto, e va bene: serve a
         imparare che il cuore vale il doppio, non a litigare con qualcuno. */
      forme: [
        { t: 'pol', pts: [[0.46, 0.34], [0.54, 0.34], [0.57, 0.86], [0.43, 0.86]] },
        { t: 'pol', pts: [[0.5, 0.36], [0.26, 0.3], [0.3, 0.44], [0.5, 0.46]] },
        { t: 'pol', pts: [[0.5, 0.42], [0.74, 0.3], [0.7, 0.45], [0.5, 0.5]] },
        { t: 'ell', x: 0.5, y: 0.26, rx: 0.125, ry: 0.1625, cuore: true },
      ],
      frasi: [
        'Non sai chi l’ha piantato. Non l’ha piantato nessuno.',
        'È terra di giardino, e il giardino non è qui.',
        'Fiorisce. È l’unica cosa che fa, e la fa bene.',
      ],
      domande: [],
      scaletta: [
        {
          soglia: 16,
          azioni: [
            { t: 'mossa', resabile: false, testo: 'Non si muove. Non ha niente da dirti, e per questo è l’unico vaso che non ti chiede niente.' },
          ],
        },
        {
          soglia: 0,
          azioni: [
            { t: 'mossa', resabile: false, testo: 'La terra si assesta. Sotto, un cocciolo di vetro che non era di nessuno.' },
          ],
        },
      ],
    },

    betta: {
      id: 'betta',
      nome: 'Betta',
      titolo: 'è partita con metà di tutto',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 0.76,   /* quota di terra sopra la quale crolli */
      persona: 'betta',
      setePerTurno: 1.55,
      /* L'ornamento è la busta: la lettera che non ha scritto. */
      forme: [
        { t: 'ell', x: 0.5, y: 0.82, rx: 0.34, ry: 0.15 },
        { t: 'pol', pts: [[0.47, 0.4], [0.54, 0.4], [0.56, 0.72], [0.45, 0.72]] },
        { t: 'ell', x: 0.31, y: 0.34, rx: 0.16, ry: 0.09, rot: -0.5 },
        { t: 'ell', x: 0.69, y: 0.29, rx: 0.15, ry: 0.085, rot: 0.55 },
        { t: 'ell', x: 0.5, y: 0.19, rx: 0.0995, ry: 0.1279, cuore: true },
        { t: 'pol', pts: [[0.07, 0.24], [0.2, 0.22], [0.21, 0.3], [0.08, 0.32]] },
      ],
      /* Alla fine non resta che il vaso e il cuore. */
      formePerStato: [null, [
        { t: 'ell', x: 0.5, y: 0.83, rx: 0.3, ry: 0.12 },
        { t: 'pol', pts: [[0.48, 0.52], [0.53, 0.52], [0.54, 0.72], [0.47, 0.72]] },
        { t: 'ell', x: 0.5, y: 0.46, rx: 0.103, ry: 0.1236, cuore: true },
      ]],
      frasi: [
        'È partita con due valigie e un biglietto solo.',
        'Il vaso è suo. La terra è tua. La casa era di entrambe e ora è solo tua.',
        'Non ti chiede di tornare. Ti chiede di ricordare, che è più caro.',
      ],
      domande: [
        { testo: '«non ti ho scritto perché non sapevo scrivere.»', risposta: 'betta-partenza' },
        { testo: '«sono passata. sono passata e non sono entrata.»', risposta: 'betta-tornata' },
        { testo: '«l’hai saputo prima di me, o te l’ho detto io?»', risposta: 'betta-lettera' },
      ],
      /* Nello stato due non ti chiede della partenza: ti chiede di quello che
         portava dentro, che è una domanda che preferisce non fare. */
      domandePerStato: [
        [
          { testo: '«la lettera l’ho scritta due volte. la prima l’ho buttata.»', risposta: 'betta-lettera' },
          { testo: '«sono passata. e questa volta sono entrata.»', risposta: 'betta-pelle' },
        ],
        [
          { testo: '«te l’ho detto solo quando non potevo più dirlo.»', risposta: 'betta-gravidanza' },
          { testo: '«non ti ho scritto perché non sapevo scrivere.»', risposta: 'betta-partenza' },
          { testo: '«sono passata. e questa volta sono entrata.»', risposta: 'betta-pelle' },
        ],
      ],
      scaletta: [
        {
          soglia: 74,
          azioni: [
            { t: 'mossa', resabile: true, testo: '«Sono qui. Non è una frase, è un indirizzo.»' },
          ],
        },
        {
          soglia: 48,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'betta-partenza', testo: '«Quella sera sono uscita e non ho portato niente. Nemmeno me.»' },
          ],
        },
        {
          soglia: 22,
          azioni: [
            { t: 'ricorda', testo: 'Ti ricorda una cosa che avevi appena dimenticato, e la terra la beve.' },
            { t: 'mossa', resabile: true, conScheda: 'betta-gravidanza', testo: '«Adesso non posso dirtelo come prima. Adesso non posso dirtelo come prima.»' },
            { t: 'appassisce', turni: 2, testo: 'I semi si chiudono di nuovo.' },
          ],
        },
      ],
    },

    ansi: {
      id: 'ansi',
      nome: 'Anselmo',
      titolo: 'ha firmato per primo, e non si è mosso',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 0.74,   /* quota di terra sopra la quale crolli */
      persona: 'ansi',
      setePerTurno: 1.6,
      /* L'ornamento è la mano: quella che ha firmato. */
      forme: [
        { t: 'ell', x: 0.5, y: 0.83, rx: 0.33, ry: 0.14 },
        { t: 'pol', pts: [[0.44, 0.38], [0.56, 0.38], [0.58, 0.74], [0.42, 0.74]] },
        { t: 'pol', pts: [[0.5, 0.26], [0.38, 0.14], [0.62, 0.14]] },
        { t: 'ell', x: 0.5, y: 0.2, rx: 0.1056, ry: 0.1206, cuore: true },
        { t: 'ell', x: 0.68, y: 0.33, rx: 0.09, ry: 0.06, rot: 0.5 },
      ],
      formePerStato: [null, [
        { t: 'ell', x: 0.5, y: 0.84, rx: 0.28, ry: 0.11 },
        { t: 'pol', pts: [[0.46, 0.56], [0.55, 0.56], [0.57, 0.74], [0.45, 0.74]] },
        { t: 'ell', x: 0.5, y: 0.5, rx: 0.1009, ry: 0.1262, cuore: true },
      ]],
      frasi: [
        'È venuto al funerale e non è salito, perché aveva detto che non veniva.',
        'Ha finito la fila. Fila di che non te l’ha detto, e non te lo dirà.',
        'Il giuramento era suo. La firma è tua, ma la mano era la sua.',
      ],
      domande: [
        { testo: '«ho giurato. non ho detto dove.»', risposta: 'ansi-giuramento' },
        { testo: '«ero lì. l’ho visto entrare e non ho fatto niente.»', risposta: 'ansi-testimone' },
        { testo: '«la luna era gibbosa. avevo detto non viene, e non è venuta.»', risposta: 'ansi-luna' },
      ],
      domandePerStato: [
        [
          { testo: '«sono un testimone. i testimoni non fanno niente.»', risposta: 'ansi-testimone' },
          { testo: '«l’ho firmato io. il nome era il tuo, ma la mano era mia.»', risposta: 'ansi-bambina' },
        ],
        [
          { testo: '«l’ho firmato per far tornare le cose. sono tornate tutte, tranne quella.»', risposta: 'ansi-bambina' },
          { testo: '«non ti guardo. se ti guardo, non firmo.»', risposta: 'ansi-pelle' },
          { testo: '«la luna era gibbosa. avevo detto non viene.»', risposta: 'ansi-luna' },
        ],
      ],
      scaletta: [
        {
          soglia: 82,
          azioni: [
            { t: 'mossa', resabile: true, testo: '«Il giuramento non era per te. Era per me.»' },
            { t: 'appassisce', turni: 2, testo: 'Il terreno si chiude. Lui aspetta: è l’unica cosa che gli è facile.' },
          ],
        },
        {
          soglia: 55,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'ansi-giuramento', testo: '«Ho giurato davanti a due persone. Una se n’è andata.»' },
            { t: 'ricorda', testo: 'Ti ricorda una cosa che avevi appena dimenticato.' },
          ],
        },
        {
          soglia: 25,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'ansi-bambina', testo: '«L’ho firmato per far tornare le cose. Sono tornate tutte, tranne quella.»' },
            { t: 'appassisce', turni: 3, testo: 'Il terreno si chiude del tutto. Lui aspetta, e non ha fretta.' },
          ],
        },
      ],
    },

    orielia: {
      id: 'orielia',
      nome: 'Orielia',
      titolo: 'ha smesso di aspettare, ma non di fiorire',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 0.72,   /* quota di terra sopra la quale crolli */
      persona: 'orielia',
      setePerTurno: 1.5,
      /* L'ornamento è la lettera senza mittente. */
      forme: [
        { t: 'ell', x: 0.5, y: 0.81, rx: 0.36, ry: 0.16 },
        { t: 'pol', pts: [[0.46, 0.4], [0.55, 0.4], [0.57, 0.72], [0.43, 0.72]] },
        { t: 'ell', x: 0.35, y: 0.28, rx: 0.16, ry: 0.1, rot: -0.6 },
        { t: 'ell', x: 0.65, y: 0.24, rx: 0.15, ry: 0.09, rot: 0.6 },
        { t: 'ell', x: 0.5, y: 0.18, rx: 0.1009, ry: 0.1262, cuore: true },
        { t: 'pol', pts: [[0.8, 0.3], [0.93, 0.32], [0.92, 0.4], [0.79, 0.38]] },
      ],
      formePerStato: [null, [
        { t: 'ell', x: 0.5, y: 0.82, rx: 0.31, ry: 0.13 },
        { t: 'pol', pts: [[0.48, 0.56], [0.54, 0.56], [0.55, 0.72], [0.46, 0.72]] },
        { t: 'ell', x: 0.5, y: 0.5, rx: 0.103, ry: 0.1236, cuore: true },
      ]],
      frasi: [
        'Non ti ha chiesto quando tornavi. Non lo chiede più da molto.',
        'Fiorisce perché tu continui a darle qualcosa, e non glielo chiedi.',
        'È fiorita tutta insieme. Adesso non c’è più niente da aspettare.',
      ],
      domande: [
        { testo: '«ti aspetto da martedì. o è giovedì? non me lo ricordo.»', risposta: 'orielia-attesa' },
        { testo: '«non ti ho detto della malattia perché me l’avevi già detto tu.»', risposta: 'orielia-malattia' },
        { testo: '«la pioggia è venuta. era la prima. me n’ero dimenticata.»', risposta: 'orielia-prima-pioggia' },
      ],
      domandePerStato: [
        [
          { testo: '«non aspetto. aspetto è una parola che ho smesso di usare.»', risposta: 'orielia-lettera-senza' },
          { testo: '«la lettera senza il mittente era tua. me l’hai data tu.»', risposta: 'orielia-lettera-senza' },
        ],
        [
          { testo: '«ho aspettato. è l’unica cosa che ho fatto, e l’ho fatta bene.»', risposta: 'orielia-attesa' },
          { testo: '«fiorisco tutta insieme, e non è merito mio. è tuo.»', risposta: 'orielia-malattia' },
        ],
      ],
      scaletta: [
        {
          soglia: 90,
          azioni: [
            { t: 'mossa', resabile: true, testo: '«Non ti chiedo niente. È una novità, e ti avverto che dura poco.»' },
          ],
        },
        {
          soglia: 60,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'orielia-attesa', testo: '«Sono qui. È martedì, se ti serve.»' },
            { t: 'appassisce', turni: 2, testo: 'I petali chiudono. Lei aspetta: è il suo talento.' },
          ],
        },
        {
          soglia: 28,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'orielia-lettera-senza', testo: '«Quella lettera non l’ho scritta. Ma non ti l’ho detto che non l’avevo scritta.»' },
            { t: 'ricorda', testo: 'Ti ricorda una cosa che avevi appena dimenticato.' },
          ],
        },
      ],
    },

    donata: {
      id: 'donata',
      nome: 'Donata',
      titolo: 'ha fatto mercato di tutto, anche di te',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 0.70,   /* quota di terra sopra la quale crolli */
      persona: 'donata',
      setePerTurno: 1.65,
      /* L'ornamento è il cartellino: il prezzo, scritto. */
      forme: [
        { t: 'pol', pts: [[0.22, 0.62], [0.78, 0.62], [0.72, 0.88], [0.28, 0.88]] },
        { t: 'pol', pts: [[0.47, 0.32], [0.54, 0.32], [0.56, 0.62], [0.45, 0.62]] },
        { t: 'ell', x: 0.5, y: 0.26, rx: 0.13, ry: 0.09 },
        { t: 'ell', x: 0.5, y: 0.26, rx: 0.1178, ry: 0.1081, cuore: true },
        { t: 'pol', pts: [[0.36, 0.12], [0.64, 0.12], [0.62, 0.19], [0.38, 0.19]] },
      ],
      formePerStato: [null, [
        { t: 'pol', pts: [[0.3, 0.66], [0.7, 0.66], [0.66, 0.86], [0.34, 0.86]] },
        { t: 'pol', pts: [[0.48, 0.48], [0.53, 0.48], [0.54, 0.66], [0.47, 0.66]] },
        { t: 'ell', x: 0.5, y: 0.42, rx: 0.1128, ry: 0.1128, cuore: true },
      ]],
      frasi: [
        'Ha un prezzo per tutto, e te lo dice prima, che è il suo modo di essere onesta.',
        'Il conto è aperto. Non conta subito: conta quando te lo dice lei.',
        'Ha venduto anche te, e ti ha fatto un piano, e il piano era buono.',
      ],
      domande: [
        { testo: '«il vaso costa quanto una persona. è un buon affare, se non ti affezioni.»', risposta: 'donata-prezzo' },
        { testo: '«ti ho dato il sacchetto. dentro c’era tutto, tranne quello che ti avevo preso.»', risposta: 'donata-sacchetto' },
        { testo: '«la commissione la prendo sempre. anche quando non c’è niente.»', risposta: 'donata-commissione' },
      ],
      domandePerStato: [
        [
          { testo: '«il conto è aperto. non ti preoccupare: non conto subito.»', risposta: 'donata-commissione' },
          { testo: '«ti ho venduta anch’io. non ti ricordi? ti ho fatto un piano.»', risposta: 'donata-niente' },
        ],
        [
          { testo: '«niente. è la parola più onesta che so, e la dico spesso.»', risposta: 'donata-niente' },
          { testo: '«il sacchetto. dentro c’era tutto tranne quello che ti avevo preso.»', risposta: 'donata-sacchetto' },
        ],
      ],
      scaletta: [
        {
          soglia: 97,
          azioni: [
            { t: 'mossa', resabile: false, testo: '«Prima il prezzo, poi la merce. Il contrario è roba da principesse.»' },
          ],
        },
        {
          soglia: 65,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'donata-prezzo', testo: '«Adesso ti dico quanto ti resta. E ti resta poco.»' },
            { t: 'appassisce', turni: 2, testo: 'Il terreno si spacca. Il vaso è di terracotta, e la terracotta ha fretta.' },
          ],
        },
        {
          soglia: 30,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'donata-commissione', testo: '«La commissione la prendo anche adesso. È l’unica cosa che non so dare.»' },
            { t: 'ricorda', testo: 'Ti ricorda una cosa che avevi appena dimenticato, e te la mette nel conto.' },
          ],
        },
      ],
    },

    sauro: {
      id: 'sauro',
      nome: 'Sauro',
      titolo: 'l’uomo sotto l’aiuola, che non si chiama',
      spesa: 0,          /* misurata dalla figura, in coda a questo file */
      limiteQuota: 0.68,   /* quota di terra sopra la quale crolli */
      persona: 'sauro',
      setePerTurno: 1.45,
      /* L'ornamento è il primo fiore: l'unica cosa che ha piantato per primo. */
      forme: [
        { t: 'ell', x: 0.5, y: 0.8, rx: 0.38, ry: 0.17 },
        { t: 'ell', x: 0.5, y: 0.62, rx: 0.2, ry: 0.16 },
        { t: 'pol', pts: [[0.46, 0.34], [0.54, 0.34], [0.56, 0.5], [0.45, 0.5]] },
        { t: 'pol', pts: [[0.5, 0.16], [0.34, 0.26], [0.5, 0.3], [0.66, 0.26]] },
        { t: 'ell', x: 0.5, y: 0.2, rx: 0.1045, ry: 0.1219, cuore: true },
        { t: 'ell', x: 0.13, y: 0.2, rx: 0.055, ry: 0.05 },
      ],
      /* SAURO È L'ECCEZIONE: si allarga invece di restringersi. Non è una
         persona che consumi, è la tomba, e alla fine copre tutto. */
      formePerStato: [null, [
        { t: 'ell', x: 0.5, y: 0.78, rx: 0.47, ry: 0.22 },
        { t: 'ell', x: 0.5, y: 0.56, rx: 0.29, ry: 0.22 },
        { t: 'pol', pts: [[0.44, 0.26], [0.56, 0.26], [0.6, 0.44], [0.4, 0.44]] },
        { t: 'pol', pts: [[0.5, 0.08], [0.26, 0.24], [0.5, 0.3], [0.74, 0.24]] },
        { t: 'ell', x: 0.5, y: 0.16, rx: 0.107, ry: 0.1189, cuore: true },
        { t: 'pol', pts: [[0.2, 0.34], [0.34, 0.3], [0.28, 0.42]] },
        { t: 'pol', pts: [[0.8, 0.34], [0.66, 0.3], [0.72, 0.42]] },
      ]],
      frasi: [
        'Non sai come si chiama. Non è un nome che manca: è un nome che non c’è.',
        'È sotto l’aiuola da prima che l’aiuola ci fosse, e non ti ha chiesto nulla.',
        'Il primo fiore l’ha piantato lui, e te l’ha detto come si pianta.',
      ],
      domande: [
        { testo: '«il primo fiore l’ho piantato io. te l’ho detto come si pianta, non che l’ho piantato.»', risposta: 'sauro-primo' },
        { testo: '«il giardino era già fatto. io ho solo continuato a stare sotto.»', risposta: 'sauro-giardino' },
        { testo: '«non ti ho detto il mio nome. non me lo ricordo, e non me lo chiedere.»', risposta: 'sauro-nome' },
      ],
      domandePerStato: [
        [
          { testo: '«sono sotto. da sempre. e non ti ho chiesto di venire.»', risposta: 'sauro-sotto' },
          { testo: '«il giardino era già fatto. io ho solo continuato a stare sotto.»', risposta: 'sauro-giardino' },
        ],
        [
          { testo: '«piantami. è l’unica cosa che ti chiedo, ed è l’unica che non so fare.»', risposta: 'sauro-sotto' },
          { testo: '«il nome è nell’aiuola. guarda la terra, non me.»', risposta: 'sauro-nome' },
        ],
      ],
      scaletta: [
        {
          soglia: 108,
          azioni: [
            { t: 'mossa', resabile: true, testo: '«Sono qui sotto. Non ti chiedo di scendere. Non ti chiedo niente.»' },
          ],
        },
        {
          soglia: 72,
          azioni: [
            { t: 'mossa', resabile: true, conScheda: 'sauro-giardino', testo: '«Il giardino era già fatto quando sono arrivato. Ho solo imparato a-starci dentro.»' },
            { t: 'appassisce', turni: 3, testo: 'La terra si richiude sopra di lui. È quella la sua parte, e la fa bene.' },
          ],
        },
        {
          soglia: 34,
          azioni: [
            /* Da qui il cuore ti restituisce invece di darti: è l'unico punto del
               gioco in cui dare ti fa tornare qualcosa, e arriva tardi. Vedi
               `st.inverteCuore` in dono.js. */
            { t: 'mossa', resabile: true, conScheda: 'sauro-nome', testo: '«Adesso guardami dove metti le mani. E poi smeti.»' },
            { t: 'ricorda', testo: 'Ti ricorda una cosa che avevi appena dimenticato. Lui la guarda leggere.' },
            { t: 'appassisce', turni: 2, testo: 'La terra si richiude. Adesso è più difficile, non impossibile.' },
          ],
        },
      ],
    },
  };

  /* L'ordine è quello degli atti, e non è casuale: una cosa che non hai ancora
   * nominato, poi chi è partito, poi chi ha firmato, poi chi ti aspetta, poi
   * chi ti fa un prezzo, e infine chi è sotto. */
  const ORDINE = ['il-vaso', 'betta', 'ansi', 'orielia', 'donata', 'sauro'];

  /* Una volta sola, qui: ogni vaso prende la spesa dalla propria figura. */
  for (const id of ORDINE) misura(VASI[id]);

/**
 * Misura la figura e ne ricava spesa e limite.
 *
 * Non è una scorciatoia, è la definizione: la spesa di un vaso è la cura che
 * serve a dipingerlo tutto una volta con Offri, e il limite è la quota di quella
 * cura che il terreno può prendere prima di prendere anche te. Scrivere i due
 * numeri a mano sembrava più semplice, e finché le figure erano quadrate
 * funzionava; appena sono diventate sagome vere è saltato fuori che un vaso che
 * si restringe chiedeva ancora la spesa di quando era grande, e non si riempiva
 * più. Dieci vasi su dieci erano impossibili da vincere, e nessun test lo
 * diceva: lo stub contava come dentro anche la terra fuori dal vaso.
 *
 * Vedi `un vaso si deve poter riempire` in vasi.test.mjs.
 */
function misura(out) {
  /* Se orto.js non è qui, `spesa` verrebbe 0 e il vaso si riempirebbe al primo
   * colpo: è il guasto più silenzioso che si possa avere qui, quindi si dice
   * ad alta voce. */
  if (!window.FSTOrto || !window.FSTOrto.maschera) {
    throw new Error('vasi.js ha bisogno di orto.js: senza le maschere la spesa è zero e il vaso è già pieno');
  }
  const m = window.FSTOrto.maschera(out);
  const spesa = Math.round(m.totale / 100);
  out.spesa = spesa;
  out.spesaMax = spesa;
  out.limite = Math.round(spesa * (out.limiteQuota !== undefined ? out.limiteQuota : 0.75));
  return out;
}

function per(id, stato = 0) {
  const v = VASI[id];
  if (!v) return null;
  if (!stato) return v;
  const k = Math.max(0, Math.min(2, stato)) - 1;

  let forme;
  if (v.formePerStato && v.formePerStato[k]) forme = v.formePerStato[k];
  /* Solo un vaso che è una persona si consuma. Il vaso del primo atto non ha
     un arco — non è nessuno — e la sua ultima forma è il cuore, non un
     ornamento: togliergliela gli toglierebbe il 2,2 per sempre. */
  else if (k === 0 && v.persona && v.forme.length > 1) forme = v.forme.slice(0, -1);

  const domande = v.domandePerStato && v.domandePerStato[k];
  if (!forme && !domande) return v;
  const out = Object.assign({}, v);
  if (forme) out.forme = forme;
  if (domande) out.domande = domande;
  /* La figura è cambiata, quindi cambiano anche i due numeri che la misurano:
     non si può chiedere a un terzo di vaso la cura di un vaso intero. */
  if (forme) misura(out);
  return out;
}

function perStato(id, stato = 0) {
  return VASI[id] ? per(id, stato) : null;
}

/* Il vaso dell'atto N: la sequenza è fissa e voluta, non casuale. */
function dellAtto(atto) {
  return per(ORDINE[Math.max(0, Math.min(ORDINE.length - 1, atto))], 0);
}

/* Chi è un vaso e chi no: serve al gate di qualità e alla vista Cast. */
const PERSONE_DEI_VASI = ORDINE.filter((id) => VASI[id] && VASI[id].persona);

window.FSTVasi = {
  VASI, ORDINE, per, perStato, dellAtto, PERSONE_DEI_VASI,
};
})();
