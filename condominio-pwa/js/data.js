/* Scala B, Civico 0 — catalogo del condominio */

export const SAVE_KEY = "civico0.save.v1";
/* versione dello schema del salvataggio: bump + migrazione in game.js */
export const SAVE_VERSION = 3;
export const PULL_COST = 60;
export const MULTI_COST = 540;
export const PULLS_PER_MULTI = 10;
export const PITY_MAX = 30;
export const MAX_FLOOR = 6;
export const APTS_PER_FLOOR = 3;
export const FURN_SLOTS = 2;
export const MAX_LEVEL = 5;
export const FAVOR_COOLDOWN = 90_000;
export const LEVEL_COST = 1;

export const RARITY = {
  comune: { id: "comune", label: "Comune", color: "#7FA98B", weight: 60 },
  raro: { id: "raro", label: "Raro", color: "#5E93C9", weight: 27 },
  epico: { id: "epico", label: "Epico", color: "#A97BD1", weight: 11 },
  leggendario: {
    id: "leggendario",
    label: "Leggendario",
    color: "#E2A336",
    weight: 2,
  },
};

export const LEVEL_NAMES = [
  "Vicino di scala",
  "Amico del pianerottolo",
  "Complice di casa",
  "Leggenda di Scale B",
  "Portiere Onorario",
];

export const FAVOR_BY_RARITY = {
  comune: 12,
  raro: 16,
  epico: 20,
  leggendario: 26,
};

/* ---------------------------------------------------------------- inquilini */

export const TENANTS = [
  {
    id: "nuvola",
    name: "Nuvola",
    emoji: "☁️",
    rarity: "comune",
    title: "Nuvola meteoropatica",
    lines: [
      "Non piove oggi, quindi sono di ottimo umore. Non ditelo a me stesso.",
      "Ho perso di nuovo il mio tuono. Se lo sentite, non è un boato, è lui.",
      "Mi sono scusato con le piante per il temporale di martedì. Mi hanno perdonato lentamente.",
      "Sono la sola inquilina che ha bisogno di un asciugamano permanente.",
      "Quando rido fa umidità. Il condòmino di sotto si è lamentato, ma con delicatezza.",
    ],
    favor: {
      label: "Ritrova il tuono smarrito",
      line: "Trovato! Era rimasto incastrato tra due comignoli e un segnale TV.",
    },
  },
  {
    id: "mimi",
    name: "Mimì",
    emoji: "👻",
    rarity: "comune",
    title: "Fantasma allergico ai castelli",
    lines: [
      "Ho vissuto in un castello per trecento anni. Mi si è gonfiato l'ectoplasma.",
      "Non sono spaventacchi. Sono semplicemente molto timido e semitrasparente.",
      "Se sparisco non è fuga: è che qui la luce è troppo buona per me.",
      "I cavalieri mi facevano sempre l'orcio. Mai una conversazione vera.",
      "Ho chiesto un monolocale perché i corridoi lunghi mi spaventano, e io sono già un fantasma.",
    ],
    favor: {
      label: "Dai una rassicurante aria fresca",
      line: "Grazie. L'immobiliazione è la mia attività preferita.",
    },
  },
  {
    id: "spina",
    name: "Dott.ssa Spina",
    emoji: "🌵",
    rarity: "comune",
    title: "Cactus consulente sentimentale",
    lines: [
      "Hai provato a parlarne? Pausa. Con una pala?",
      "Ti ascolto, ma stai attento: sono spinosa anche nell'ascolto.",
      "Consulenze: martedì e giovedì. Il resto del tempo faccio fotosintesi del dolore.",
      "La metà delle coppie della scala si è lasciata qui sul divano. È un ottimo divano.",
      "Il mio cabinet è il terrazzo. C'è luce, silenzio e nessun giudice.",
    ],
    favor: {
      label: "Fai una consulenza al cactus",
      line: "Diagnosi chiara: ti manca una buona notte di sonno e un annaffiatoio.",
    },
  },
  {
    id: "bruno",
    name: "Bruno",
    emoji: "🐉",
    rarity: "raro",
    title: "Drago da smart working",
    lines: [
      "Sono in call. Sono in call da ieri. Qualcuno ha chiuso la finestra, per favore?",
      "Cucino biscotti col fiato. Il forno condominiale ha messo un cartello contro di me.",
      "Lavoro da remoto: casa mia, regole mie, fiamme mie.",
      "Ho risposto a una mail con un rantolo. Hanno detto che era molto proattivo.",
      "Non ruggisco durante le riunioni. Faccio solo un rumore di fondo che sembra connessione lenta.",
    ],
    favor: {
      label: "Spegni la call di Bruno",
      line: "Perfetto. Adesso posso infornare senza interruzioni.",
    },
  },
  {
    id: "nerone",
    name: "Nerone",
    emoji: "🕳️",
    rarity: "raro",
    title: "Buco nero postino",
    lines: [
      "Consegno la posta sempre in anticipo. A volte in anticipo di un secolo.",
      "Non mangio le buste di chi mi sta simpatico. Tu sei fortunato, oggi.",
      "Ho una reputazione da tenere: silenzioso, puntuale, gravitazionalmente impegnativo.",
      "Il portiere mi ha chiesto di non passare sulle mattonelle. Ci sto lavorando.",
      "Quando faccio un giro di cortile gli uccelli cambiano opinione sul cielo.",
    ],
    favor: {
      label: "Ritira la posta gravitazionale",
      line: "Tutto consegnato. Inclusa una cartolina che arriverà nel 1987.",
    },
  },
  {
    id: "beppe",
    name: "Beppe",
    emoji: "🌋",
    rarity: "raro",
    title: "Vulcano pasticcere",
    lines: [
      "Il pane a lievitazione magmatica è pronto. Non aprite il forno, non aprite il forno.",
      "Le recensioni online sono incandescenti. Letteralmente.",
      "Ho messo a raffreddare la crostata nel cratere. Chi la tocca si brucia l'orgoglio.",
      "Faccio cornetti con la cenere. È un sapore che il quartiere non ha ancora capito.",
      "Mi dicono di essere passivo-aggressivo. Io sono solo geologicamente intenso.",
    ],
    favor: {
      label: "Togli il pane dal cratere",
      line: "Perfetto cottura. Questo sapore si chiama 'rischio calcolato'.",
    },
  },
  {
    id: "lasagna",
    name: "Lasagna",
    emoji: "🍝",
    rarity: "epico",
    title: "Messaggera della dimensione-lasagna",
    lines: [
      "Da me tutti sono lasagne. Qui invece ho le mani. È sconvolgente, lo ammetto.",
      "Viene una lettera? Nella mia dimensione sarebbe stata una besciamella con indirizzo.",
      "Mi hanno scambiata per un pacco. Per tre giorni sono stata in transito.",
      "Il martedì, da me, non esiste. Per questo lo consegno io: gli altri non sanno dove metterlo.",
      "Ho una forma piatta e strati. Non chiedetemi di spiegarlo all'assemblea.",
    ],
    favor: {
      label: "Riordina la posta interdimensionale",
      line: "Sistemata. Tre lettere sono tornate pasta, ma erano spam.",
    },
  },
  {
    id: "pesce",
    name: "Il Martedì",
    emoji: "🐟",
    rarity: "epico",
    title: "Il martedì diventato un pesce",
    lines: [
      "Martedì è diventato un pesce. Io sono martedì. Non fate domande.",
      "Noto che il resto della settimana mi guarda con fastidio professionale.",
      "Ricordatemi di pisciare, nel senso temporale del termine.",
      "Se mi dimenticate di nutrire, giovedì arriva tardi. È già successo.",
      "Adoro il martedì. Sono io, ovviamente, ma è una cosa di famiglia.",
    ],
    favor: {
      label: "Rimetti il martedì al suo posto",
      line: "Grazie. Ora giovedì può finalmente iniziare senza ansia.",
    },
  },
  {
    id: "calzini",
    name: "Sbirulino",
    emoji: "🧦",
    rarity: "epico",
    title: "Ladro di calzini della scala",
    lines: [
      "Non rubo calzini. Li riassegno a chi ne ha davvero bisogno: me.",
      "Ho un magazzino. È tutto sotto il lavandino. Non apriamo.",
      "Ogni calzino ha una storia. La maggior parte finisce 'e poi non mi sei più tornato indietro'.",
      "Se mi trovi sullo stendardo è un malinteso. Stavo controllando la tenuta.",
      "Il posto più sicuro per un calzino è il buio. Chiedilo a Nerone.",
    ],
    favor: {
      label: "Riprendi i calzini smarriti",
      line: "Presi. Ne restituisco due, per buona fede contrattuale.",
    },
  },
  {
    id: "topo",
    name: "Topolino Freccia",
    emoji: "🐭",
    rarity: "leggendario",
    title: "Tassista del sottoscala",
    lines: [
      "Corsa rapida, prezzo onesto, formaggio come pagamento anticipato.",
      "Conosco il condominio meglio dell'ascensore, e l'ascensore non funziona dal 1994.",
      "Ho la patente. L'ho autografata io, ma è valida moralmente.",
      "Porto ovunque, tranne che in cucina: là c'è il gatto del portiere, e non è un cliente.",
      "Se hai fretta batti tre volte sul tubo dell'acqua. Se hai molta fretta, batti forte.",
    ],
    favor: {
      label: "Chiedi al topo una corsa",
      line: "Saliamo. Tieniti forte, il pianerottolo è in curva.",
    },
  },
];

/* ------------------------------------------------------------------- arredi */

export const FURNITURE = [
  {
    id: "acquario-galassia",
    name: "Acquario Galassia",
    emoji: "🪐",
    rarity: "raro",
    blurb: "C'è una galassia dentro. Non si vede bene, ma c'è.",
  },
  {
    id: "divano-muschio",
    name: "Divano Muschio",
    emoji: "🛋️",
    rarity: "comune",
    blurb: "Morbido, verde, e puzza leggermente di bosco dopo la pioggia.",
  },
  {
    id: "lampadario-barzellette",
    name: "Lampadario Barzellette",
    emoji: "💡",
    rarity: "comune",
    blurb: "Si accende solo per raccontare una battuta. Pessima.",
  },
  {
    id: "frigo-ice-club",
    name: "Frigo del Club del Ghiaccio",
    emoji: "🧊",
    rarity: "raro",
    blurb: "Sportello riservato ai soci. Bruno ne ha già la tessera.",
  },
  {
    id: "letto-nuvola",
    name: "Letto Nuvola",
    emoji: "🛏️",
    rarity: "comune",
    blurb: "Dormirci dentro è tecnicamente dormirci sopra.",
  },
  {
    id: "tappeto-buco",
    name: "Tappeto del Buco",
    emoji: "🕳️",
    rarity: "raro",
    blurb: "Ci finiscono le calzine. Nessuno ha mai saputo dove esca.",
  },
  {
    id: "forno-magmatico",
    name: "Forno Magmatico",
    emoji: "🍞",
    rarity: "epico",
    blurb: "Impasta, lievita, erutta. Nello stesso ordine.",
  },
  {
    id: "specchio-dimensionale",
    name: "Specchio Dimensionale",
    emoji: "🪞",
    rarity: "epico",
    blurb: "A metà strada tra te e una versione che ha messo a posto la posta.",
  },
  {
    id: "sedia-ponce",
    name: "Sedia Ponce",
    emoji: "🪑",
    rarity: "comune",
    blurb: "Serve per appoggiare una sola cosa: la stanchezza.",
  },
  {
    id: "stendardo-sirena",
    name: "Stendardo Sirena",
    emoji: "🧺",
    rarity: "comune",
    blurb: "Il bucato asciuga cantando. Tutti i piani se ne sono accorti.",
  },
  {
    id: "portacenere-cratere",
    name: "Portacenere Cratere",
    emoji: "🌋",
    rarity: "raro",
    blurb: "Basta strofinare. Non serve, ma Beppe insiste.",
  },
  {
    id: "rotolo-temporale",
    name: "Rotolo Temporale",
    emoji: "🧻",
    rarity: "leggendario",
    blurb: "Tira, e torni al momento prima di averlo tirato.",
  },
];

/* ------------------------------------------------------------------ episodi */

export const EPISODES = [
  {
    id: "club-ghiaccio",
    title: "Il Club del Ghiaccio Digitale",
    tenants: ["bruno", "nerone"],
    crumbs: 90,
    fragments: 2,
    text: "Bruno e Nerone hanno fondato un circolo riservato: si incontrano in cucina alle 3 per parlare di frozen assets. Letteralmente.",
  },
  {
    id: "pioggia-consenziente",
    title: "La Pioggia Consenziente",
    tenants: ["nuvola", "spina"],
    crumbs: 75,
    fragments: 2,
    text: "Nuvola ha piovuto solo sulla Dott.ssa Spina. Si sono guardate, hanno annuito, e la consulenza è durata quattro minuti.",
  },
  {
    id: "zuppa-non-paura",
    title: "La Zuppa che Non Fa Paura",
    tenants: ["beppe", "mimi"],
    crumbs: 80,
    fragments: 2,
    text: "Mimì ha assaggiato la zuppa di Beppe senza svaporare. Il fantasma ha addirittura sorriso, cosa che in genere spaventa gli altri.",
  },
  {
    id: "martedo-in-busta",
    title: "Il Martedì in Busta",
    tenants: ["lasagna", "pesce"],
    crumbs: 110,
    fragments: 3,
    text: "Lasagna ha consegnato Il Martedì a se stessa. Per un momento tutta la scala ha avuto due martedì. Nessuno se n'è accorto, tranne il gatto.",
  },
  {
    id: "posta-senza-calzini",
    title: "Posta Senza Calzini",
    tenants: ["calzini", "nerone"],
    crumbs: 100,
    fragments: 3,
    text: "Sbirulino ha promesso di non rubare la posta. Nerone ha promesso di non mangiare i calzini. Entrambe le promesse sono durate fino a cena.",
  },
  {
    id: "taxi-del-drago",
    title: "Il Taxi del Drago",
    tenants: ["bruno", "topo"],
    crumbs: 130,
    fragments: 4,
    text: "Topolino Freccia ha portato Bruno al lavoro in sei secondi. Bruno ha comunque arrivato in call in ritardo: il tempo soggettivo è suo.",
  },
  {
    id: "pane-che-sussurra",
    title: "Il Pane che Sussurra",
    tenant: "beppe",
    furniture: "forno-magmatico",
    crumbs: 85,
    fragments: 2,
    text: "Il pane del Forno Magmatico ha cominciato a sussurrare segreti di lievitazione. Beppe ha chiesto silenzio. Il pane ha continuato, ovviamente.",
  },
  {
    id: "eco-dimensionale",
    title: "Eco Dimensionale",
    tenant: "lasagna",
    furniture: "specchio-dimensionale",
    crumbs: 95,
    fragments: 3,
    text: "Nello Specchio Dimensionale Lasagna si è riflessa in strati. Per un attimo la cucina ha profumato di besciamella e di decisioni prese male.",
  },
];

/* ------------------------------------------------------------------ piani */

export const FLOORS = [
  { floor: 1, crumbs: 0, fragments: 0, note: "Già sbloccato. Qui abita la prima sfortuna." },
  { floor: 2, crumbs: 400, fragments: 0, note: "Il secondo piano ha una finestra che guarda un'altra finestra." },
  { floor: 3, crumbs: 900, fragments: 4, note: "Qui c'è un pianerottolo più largo. Gli inquilini lo chiamano 'piazza'." },
  { floor: 4, crumbs: 1500, fragments: 8, note: "Quarto piano: l'ascensore ci arriva solo per sbaglio." },
  { floor: 5, crumbs: 2400, fragments: 12, note: "Quinto piano: l'aria è più rarefatta e le discussioni più corte." },
  { floor: 6, crumbs: 3600, fragments: 16, note: "Attico. C'è un oblò e una regola non scritta: niente ruggiti." },
];

export const TENANT_BY_ID = Object.fromEntries(TENANTS.map((t) => [t.id, t]));
export const FURN_BY_ID = Object.fromEntries(FURNITURE.map((f) => [f.id, f]));
export const EPISODE_BY_ID = Object.fromEntries(EPISODES.map((e) => [e.id, e]));
export const FLOOR_BY_NUM = Object.fromEntries(FLOORS.map((f) => [f.floor, f]));

/* -------------------------------------------------- obiettivi gentili */

/* Traguardi di buon vicinato: mai streak, mai scadenze, mai penalità.
   Ogni obiettivo ha current(state) → numero e target; una volta riscosso
   resta riscosso per sempre (state.goals[id] = true). */
export const GOALS = [
  {
    id: "primo-favore",
    title: "Primo favore",
    desc: "Hai aiutato un vicino per la prima volta. Il palazzo ringrazia.",
    target: 1,
    current: (s) => s.favorsDone,
    crumbs: 30,
    fragments: 0,
  },
  {
    id: "buon-vicino",
    title: "Buon vicino",
    desc: "Dieci favori fatti senza chiedere nulla in cambio.",
    target: 10,
    current: (s) => s.favorsDone,
    crumbs: 60,
    fragments: 1,
  },
  {
    id: "portiere-onorario",
    title: "Portiere onorario",
    desc: "Cinquanta richieste evase. Gris ti ha già una tessera.",
    target: 50,
    current: (s) => s.favorsDone,
    crumbs: 150,
    fragments: 3,
  },
  {
    id: "prima-bustina",
    title: "Prima bustina",
    desc: "Hai aperto la posta interdimensionale. Benvenuto nel club.",
    target: 1,
    current: (s) => s.pulls,
    crumbs: 20,
    fragments: 0,
  },
  {
    id: "cento-bustine",
    title: "Centobustina",
    desc: "Cento lettere aperte. La postina ti teme (con rispetto).",
    target: 100,
    current: (s) => s.pulls,
    crumbs: 200,
    fragments: 5,
  },
  {
    id: "primo-episodio",
    title: "Primo episodio",
    desc: "Due vicini si sono trovati. Qualcosa di bello è successo.",
    target: 1,
    current: (s) => Object.keys(s.episodes).length,
    crumbs: 50,
    fragments: 1,
  },
  {
    id: "legami",
    title: "Legami fra vicini",
    desc: "Tre episodi sbloccati: le scale brulicano di vita.",
    target: 3,
    current: (s) => Object.keys(s.episodes).length,
    crumbs: 100,
    fragments: 4,
  },
  {
    id: "storico",
    title: "Storico del condominio",
    desc: "Tutti gli episodi raccontati. L'archivio è completo.",
    target: 8,
    current: (s) => Object.keys(s.episodes).length,
    crumbs: 300,
    fragments: 10,
  },
  {
    id: "album-inquilini",
    title: "Album degli inquilini",
    desc: "Tutti i dieci inquilini conosciuti per nome (e per fantasma).",
    target: 10,
    current: (s) => TENANTS.filter((t) => s.tenants[t.id]).length,
    crumbs: 250,
    fragments: 8,
  },
  {
    id: "album-arredi",
    title: "Album degli arredi",
    desc: "Dodici arredi in cantina. Il palazzo è officially arredato.",
    target: 12,
    current: (s) => FURNITURE.filter((f) => s.furniture[f.id]).length,
    crumbs: 250,
    fragments: 8,
  },
  {
    id: "piano-di-sopra",
    title: "Al piano di sopra",
    desc: "Hai aperto almeno tre piani. L'aria si fa più rarefatta.",
    target: 3,
    current: (s) => s.unlockedFloors,
    crumbs: 80,
    fragments: 2,
  },
  {
    id: "attico",
    title: "All'attico",
    desc: "Sei piani sbloccati. C'è un oblò e una regola: niente ruggiti.",
    target: 6,
    current: (s) => s.unlockedFloors,
    crumbs: 400,
    fragments: 12,
  },
  {
    id: "ricordi",
    title: "Album di ricordi",
    desc: "Dieci ricordi raccolti dai doppioni. Niente si perde davvero.",
    target: 10,
    current: (s) => Object.values(s.tenants).reduce((n, i) => n + (i.memories || 0), 0),
    crumbs: 70,
    fragments: 2,
  },
  {
    id: "leggenda",
    title: "Leggenda di scala",
    desc: "Un inquilino arrivato al livello 5: Portiere Onorario.",
    target: 5,
    current: (s) => Math.max(0, ...Object.values(s.tenants).map((i) => i.level || 1)),
    crumbs: 120,
    fragments: 4,
  },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/* --------------------------------------- combinazioni impossibili (Fase 4) */

/* Scene speciali distinte dagli episodi: stessa casa (tenant+arredo) o stesso
   piano (tenant e arredo in appartamenti diversi). Una volta viste restano. */
export const COMBOS = [
  {
    id: "sotto-acquario",
    title: "Sotto l'Acquario Galassia",
    tenant: "nuvola",
    furniture: "acquario-galassia",
    where: "same-apt",
    text: "Nuvola si è appoggiata all'Acquario e per un attimo ha piovuto dentro la galassia. Gli abitanti di là hanno aprello.",
  },
  {
    id: "specchio-timido",
    title: "Il fantasma e lo Specchio",
    tenant: "mimi",
    furniture: "specchio-dimensionale",
    where: "same-apt",
    text: "Mimì si è specchiato e lo Specchio ha restituito una versione meno timida. Non si sono parlati, ma si sono salutati a gesti.",
  },
  {
    id: "tassista-ghiaccio",
    title: "Corsa col frigo",
    tenant: "topo",
    furniture: "frigo-ice-club",
    where: "same-apt",
    text: "Topolino Freccia ha usato il Frigo del Club come discoteca. Il cubo di ghiaccio ha ballato fino all'alba.",
  },
  {
    id: "stendardo-canto",
    title: "Il bucato canta",
    tenant: "calzini",
    furniture: "stendardo-sirena",
    where: "same-floor",
    text: "Lo Stendardo Sirena e Sbirulino hanno fatto un duetto. Il piano 3 ha chiesto il bis. Il piano 3 non ha avuto voce.",
  },
  {
    id: "cratere-ponce",
    title: "Sedia sul bordo",
    tenant: "beppe",
    furniture: "sedia-ponce",
    where: "same-floor",
    text: "La Sedia Ponce è finita davanti al Portacenere Cratere. Si dice che supporti sia fisico che geologico.",
  },
  {
    id: "rotolo-martedi",
    title: "Il Rotolo e il martedì",
    tenant: "pesce",
    furniture: "rotolo-temporale",
    where: "same-apt",
    text: "Il Martedì ha tirato il Rotolo Temporale. Per tre secondi tutto è stato ancora martedì. Poi anche di più.",
  },
];

export const COMBO_BY_ID = Object.fromEntries(COMBOS.map((c) => [c.id, c]));

/* -------------------------- vita precedente degli arredi (Fase 4) */

/* Retroscena: si sblocca collocando l'arredo nella stessa casa dell'inquilino */
export const FURN_STORIES = [
  {
    id: "divano-muschio-past",
    furniture: "divano-muschio",
    withTenant: "spina",
    title: "Il divano che ascoltava",
    text: "Prima di qui il Divano Muschio era nel cabinet di una consulente che piangeva insieme ai clienti. Ha imparato a non giudicare.",
  },
  {
    id: "letto-nuvola-past",
    furniture: "letto-nuvola",
    withTenant: "nuvola",
    title: "Nuvola su Nuvola",
    text: "Il Letto Nuvola è stato costruito da un sarto che ha smesso di sognare di giorno. Dormirci dentro è ancora tecnica.",
  },
  {
    id: "forno-magmatico-past",
    furniture: "forno-magmatico",
    withTenant: "beppe",
    title: "Forno di famiglia",
    text: "Beppe ha ereditato il Forno Magmatico da uno zio che si è ritirato «per motivi di lava». La ricetta del pane è scritta a matita sul coperchio.",
  },
  {
    id: "tappeto-buco-past",
    furniture: "tappeto-buco",
    withTenant: "calzini",
    title: "Il magazzino invisibile",
    text: "Sbirulino giura che il Tappeto del Buco sia il ingresso del suo magazzino. Nessuno ha ancora osato verificare.",
  },
  {
    id: "lampadario-past",
    furniture: "lampadario-barzellette",
    withTenant: "bruno",
    title: "L'ultimo stand-up",
    text: "Il Lampadario Barzellette ha aperto per Bruno in una cena di condominio. La battuta è stata pessima. L'applauso no.",
  },
  {
    id: "specchio-past",
    furniture: "specchio-dimensionale",
    withTenant: "lasagna",
    title: "La strada di besciamella",
    text: "Lo Specchio Dimensionale è stato trovato in un mercatino tra due mondi. Lasagna lo ha riconosciuto: profumava di besciamella.",
  },
];

export const FURN_STORY_BY_ID = Object.fromEntries(FURN_STORIES.map((s) => [s.id, s]));

/* --------------------------- bacheca condominiale (Fase 5) */

export const BOARD_REACTIONS = [
  { id: "approvato", label: "Approvato", emoji: "✅" },
  { id: "riparliamo", label: "Ne riparliamo", emoji: "💭" },
  { id: "drago", label: "Chi ha parcheggiato qui un drago?", emoji: "🐉" },
];

export const BOARD_REACTION_BY_ID = Object.fromEntries(BOARD_REACTIONS.map((r) => [r.id, r]));

/* Avvisi generati in locale: array di template con {a}/{b}/{c} da inquilini noti */
export const BOARD_TEMPLATES = [
  "AVVISO: {a} ha lasciato {n} calzini sul pianerottolo. Si prega di non metterli nel Tappeto del Buco.",
  "COME SI VOTA: l'assemblea sul mettersi l'ascensore è rimandata. Motivo: {a} ha perso il vermino.",
  "RICORDO: {a} e {b} non devono stare sullo stesso piano senza un mediatore. Il mediatore è {c}.",
  "PREGHIERA: chi ha acceso il Lampadario Barzellette alle 4 lo spenga. La battuta non era arguta.",
  "INFORMATIVA: la posta di {a} arriverà «entro un secolo o due». Firmato, {b}.",
  "MOZIONE: {a} chiede di sostituire la porta con qualcosa di più elastico. Voto: astensione di {b}.",
  "SORTE: oggi il martedì ({c}) è ufficialmente un pesce. Non si nutre con cronometro.",
  "LAMENTA: {n} pacchi interdimensionali bloccano il corridoio. {a} li rivendica, {b} li nega.",
];

/* ------------------------- ascensore impossibile (Fase 5) */

export const ELEVATOR_DESTS = [
  {
    id: "piano-non-esiste",
    title: "Piano che non esiste",
    emoji: "🪟",
    text: "L'ascensore si ferma a un piano non numerato. C'è una finestra che guarda un'altra finestra che guarda te. Chiudi e scendi.",
    require: null,
  },
  {
    id: "sala-fantasmi",
    title: "Sala riunioni dei fantasmi",
    emoji: "👻",
    text: "Mimì presiede un'assemblea di fantasmi. Ordine del giorno: se i muri sono solo un'opinione. Voto: unanime, in spiriti.",
    require: { floors: 2 },
  },
  {
    id: "attico-1994",
    title: "L'ascensore del 1994",
    emoji: "🛗",
    text: "Un pannello segna «Fuori servizio dal 1994». Topolino Freccia ti saluta dall'angolo. La corsa è stata gratis, il formaggio no.",
    require: { floors: 3 },
  },
  {
    id: "cucina-di-bruno",
    title: "Cucina del drago",
    emoji: "🐉",
    text: "Bruno è in call da ieri. I biscotti sono pronti, il forno ha messo un cartello contro di te. Esci prima che finisca la riunione.",
    require: { episode: "club-ghiaccio" },
  },
  {
    id: "dimensione-lasagna",
    title: "Scala B, dimensione-lasagna",
    emoji: "🍝",
    text: "Qui i vicini sono lasagne. Ti offrono un piatto e un indirizzo. Rifiuti cortesemente: devi tornare al tuo mondo (piano reale).",
    require: { combo: "rotolo-martedi" },
  },
  {
    id: "soffitto-stelle",
    title: "Sul tetto con le stelle",
    emoji: "🌟",
    text: "Sei piani e un oblò: l'aria è rara, le discussioni corte, le stelle vicine. C'è una regola non scritta: niente ruggiti.",
    require: { floors: 6 },
  },
];

export const ELEVATOR_BY_ID = Object.fromEntries(ELEVATOR_DESTS.map((d) => [d.id, d]));

/* ------------------------- francobolli cartolina (Fase 5) */

export const STAMPS = [
  {
    id: "scala-in-fiore",
    label: "Scala in fiore",
    emoji: "🌸",
    unlock: (s) => (s.combos && Object.keys(s.combos).length >= 1) || false,
  },
  {
    id: "assemblea-interdimensionale",
    label: "Assemblea interdimensionale",
    emoji: "📋",
    unlock: (s) => Object.keys(s.episodes || {}).length >= 3,
  },
  {
    id: "ufficialmente-infestato",
    label: "Condominio ufficialmente infestato",
    emoji: "🏚️",
    unlock: (s) => Object.keys(s.episodes || {}).length >= 8,
  },
  {
    id: "diario-completo",
    label: "Cronista di scale",
    emoji: "📖",
    unlock: (s) => (s.diary || []).length >= 5,
  },
  {
    id: "storico-arredi",
    label: "Arredi con passato",
    emoji: "🛋️",
    unlock: (s) => Object.keys(s.furnPast || {}).length >= 3,
  },
];

export const STAMP_BY_ID = Object.fromEntries(STAMPS.map((x) => [x.id, x]));

/* --------------------------- visita guidata (Fase 5) */

/* Battute di tappa: generate in ui/game dallo stato; qui i pezzi statici */
export const TOUR_INTRO =
  "Ti accompagno. Piano per piano, chi c'è e cosa stanno combinando. Niente fretta: le scale aspettano.";
export const TOUR_OUTRO =
  "Tour finito. Torna quando vuoi: il palazzo non smontano, nemmeno per l'assemblea.";

/* -------------------------------------------- eventi stagionali locali */

/* Niente rete, niente orologi server: solo la data locale del dispositivo. */
const SEASONS = [
  {
    id: "inverno",
    months: [11, 0, 1],
    label: "Inverno",
    emoji: "❄️",
    line: "In inverno i fantasmi si mettono le calze. Anche se non li vedete.",
  },
  {
    id: "primavera",
    months: [2, 3, 4],
    label: "Primavera",
    emoji: "🌸",
    line: "Primavera: le finestre si aprono e le discussioni di scale pure.",
  },
  {
    id: "estate",
    months: [5, 6, 7],
    label: "Estate",
    emoji: "☀️",
    line: "Estate: l'ascensore suda, il martedì si scioglie un po'.",
  },
  {
    id: "autunno",
    months: [8, 9, 10],
    label: "Autunno",
    emoji: "🍂",
    line: "Autunno: foglie in corridoio e mozioni mai votate.",
  },
];

/* Giornate speciali (giorno/mese) — puramente locali */
const HOLIDAYS = [
  { m: 0, d: 1, emoji: "🎆", line: "Anno nuovo: nessuna bolletta. Finalmente." },
  { m: 5, d: 2, emoji: "💌", line: "Non è un'assemblea: è festa degli inquilini." },
  { m: 9, d: 31, emoji: "🎃", line: "Notte di Halloween: i fantasmi fanno straordinario." },
  { m: 11, d: 25, emoji: "🎁", line: "Natale in scala: regali non richiesti ma graditi." },
  { m: 11, d: 31, emoji: "🥂", line: "Capodanno: il martedì non ancora, per ora." },
];

export function seasonEvent(now = new Date()) {
  try {
    const month = now.getMonth();
    const day = now.getDate();
    const holiday = HOLIDAYS.find((h) => h.m === month && h.d === day);
    const season = SEASONS.find((s) => s.months.includes(month)) || SEASONS[0];
    const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(now);
    return {
      id: holiday ? `festivo-${month}-${day}` : season.id,
      label: holiday ? holiday.emoji + " Oggi speciale" : `${season.emoji} ${season.label}`,
      line: holiday ? holiday.line : season.line,
      season: season.id,
      month: monthLabel,
      day,
      weekday: new Intl.DateTimeFormat("it-IT", { weekday: "long" }).format(now),
    };
  } catch {
    return {
      id: "stagione",
      label: "🏢 Stagione",
      line: "Il palazzo è lo stesso, con o senza calendario.",
      season: "stagione",
      month: "",
      day: 0,
      weekday: "",
    };
  }
}
