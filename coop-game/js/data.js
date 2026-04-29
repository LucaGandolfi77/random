const STORAGE_KEYS = {
  lastGame: "cedole-catastrofi-last-game-v1",
  bestResults: "cedole-catastrofi-best-results-v1",
  preferences: "cedole-catastrofi-preferences-v1"
};

const GAME_TEXT = {
  title: "Cedole & Catastrofi",
  subtitle: "Cronaca cooperativa di un agriturismo biotech quasi legale",
  lore: "Nel cuore di un'Italia amministrativamente stanca, sei professionisti discutibili scoprono che l'unico modo per non crollare tra ex ricomparse, recruiter predatori e mutui con personalita' e' aprire insieme l'Agriturismo Biofiscale \"La Quota Latte Quantistica\". Peccato che serva un dossier perfetto, tre timbri, una PEC leggibile e una dignita' collettiva ancora vagamente intatta.",
  objectiveTitle: "Aprire l'Agriturismo Biofiscale \"La Quota Latte Quantistica\"",
  objectiveBody: "Consegna entro sabato sera il Dossier Regionale del Benessere Approssimativo, completa il piano operativo e tieni insieme dignita', carriera e stabilita' mentale mentre la vita cerca di trasformare il gruppo in un podcast motivazionale non richiesto.",
  rules: [
    {
      title: "1. Assemblea della disgrazia",
      body: "Scegli da 3 a 6 personaggi. Ognuno entra con 2 punti azione per round, una risorsa personale e un talento speciale che sembra inventato da uno stage mal pagato."
    },
    {
      title: "2. Il round e il turno",
      body: "Ogni click su un'azione consuma punti azione e genera un turno. Quando il gruppo ha finito le energie utili o hai spremuto abbastanza il destino, chiudi il round. A inizio round arriva sempre almeno una carta evento."
    },
    {
      title: "3. Risorse condivise",
      body: "Sorveglia Caos, Dignita', Carriera, Stabilita' mentale e Progresso missione. In piu' condividete Fondi, Snack tattici e Documenti. Se una barra collassa, collassate anche voi."
    },
    {
      title: "4. Missioni secondarie",
      body: "I drammi collaterali scadono in pochi round. Se li gestite ottenete bonus enormi; se li ignorate, il gruppo viene pettinato a schiaffi dalla burocrazia cosmica."
    },
    {
      title: "5. Sinergie",
      body: "Alcune coppie di personaggi attivano combo una volta per round. Tradotto: il farmacista calma l'avvocato, l'informatico patcha la montagna e il gestionale ruba tempo al continuum."
    },
    {
      title: "6. Vittoria e sconfitta",
      body: "Vincete tutti insieme se portate il Progresso al traguardo prima del limite dei round. Perdete tutti insieme se Caos esplode o una barra essenziale finisce a zero. La vita reale e' abbastanza individualista, questo no."
    },
    {
      title: "7. Modalita' Penitenza Solidale",
      body: "Se attivate la modalita', gli errori piu' evitabili suggeriscono micro-donazioni da 1 euro a una causa benefica a vostra scelta. Il gioco tiene basso il volume morale: massimo 2 penitenze pendenti alla volta."
    },
    {
      title: "8. Un solo device, fino a 6 cervelli",
      body: "Sul medesimo dispositivo si gioca in pass-and-play. Ogni personaggio selezionato puo' corrispondere a un giocatore locale: il device passa di mano, le azioni degli altri restano bloccate finche' non arriva il loro turno."
    }
  ],
  victoryLines: [
    "La Regione non ha capito nulla del progetto, ma l'ha approvato per stanchezza. E questa, tecnicamente, e' una vittoria.",
    "L'agriturismo apre tra una capra notarile e un CRM scritto su tovaglioli. Il gruppo esulta con compostezza isterica.",
    "La dignita' e' stata salvata con punti metallici, ma e' ancora in piedi. Il paese intero applaude con perplessita'."
  ],
  defeatLines: [
    "Il dossier si perde in una cartellina chiamata finale_definitivo_VERO_3. Il gruppo contempla il vuoto e poi un corso di ceramica.",
    "Una vocale di 7 minuti del capo tossico fa crollare la Stabilita' mentale. Fine della seduta, passate in segreteria per piangere ordinatamente.",
    "L'ex compare al taglio del nastro con un recruiter e un mutuo. Il Caos firma al posto vostro."
  ],
  randomLines: [
    "Un piccione qualificato giudica la vostra roadmap e annuisce come un revisore dei conti stanco.",
    "Qualcuno propone di monetizzare tutto con un webinar. Nessuno lo ferma in tempo, ma almeno il log lo registra.",
    "La stampante produce un foglio bianco e un'opinione non richiesta sulla vostra vita sentimentale.",
    "Il gruppo ottiene un lampo di lucidita' e lo spreca quasi subito per discutere il font del dossier.",
    "Una zia vede il piano industriale e lo definisce \"simpatico ma preoccupante\". Valutazione sorprendentemente utile.",
    "Per un istante tutto sembra sotto controllo. Poi arriva una notifica del conto corrente con la sicurezza di chi sa cose."
  ]
};

const BOARD_STAGES = [
  { label: "Bar del Prologo", icon: "☕", text: "Dove nasce la pessima idea che sembra una missione." },
  { label: "Catasto Astrale", icon: "🗂️", text: "I moduli cambiano forma quando li guardi male." },
  { label: "Coworking delle Ex", icon: "💔", text: "Qui ogni incontro e' un ritorno di trama." },
  { label: "HR con Fumogeni", icon: "🧯", text: "Colloqui motivazionali che odorano di trappola." },
  { label: "Monte Curriculum", icon: "🧗", text: "Pareti ripide fatte di soft skill autocelebrative." },
  { label: "Gruppo WhatsApp Infinito", icon: "📱", text: "189 messaggi, zero informazioni, un sondaggio tossico." },
  { label: "La Quota Latte Quantistica", icon: "🚜", text: "Il finale glorioso o il collasso con buffet." }
];

const CHARACTERS = [
  {
    id: "ubaldo",
    name: "Ubaldo Fiscozappa",
    title: "Agricoltore / commercialista del raccolto certificato",
    description: "Coltiva zucchine, scarica trattori e separa le emozioni in prima nota. Riesce a parlare di compost e detrazioni nello stesso respiro.",
    specialName: "Bilancio da cortile",
    specialText: "Converte faldoni e fieno in ordine: riduce il Caos, rilancia la Dignita' e spinge in avanti il dossier.",
    flaw: "Se sente la parola bonus apre un faldone e perde una Scartoffia Fertile la prima volta che agisce nel round.",
    statLabel: "Scartoffie Fertili",
    statMax: 4,
    statStart: 2,
    role: "Tampona la burocrazia e trasforma i documenti in progresso reale.",
    tags: ["bureaucracy", "logistics"],
    quotes: [
      "Questa zucchina e' deducibile, lo sento nelle ginocchia.",
      "Firmiamo in triplice copia e poi concimiamo la speranza.",
      "La PEC e' come il basilico: se la trascuri, ti odia."
    ]
  },
  {
    id: "evarista",
    name: "Evarista Cerottini",
    title: "Farmacista dei protocolli emotivi a rilascio lento",
    description: "Dispensa camomille tattiche, bugiardini esoterici e rassicurazioni con posologia. Sorride come un antidoto che ha letto troppo Jung.",
    specialName: "Camomilla d'urto 500",
    specialText: "Rimette insieme i nervi del gruppo, abbassa il Caos e restituisce fiato agli altri professionisti stropicciati.",
    flaw: "Legge sempre il foglietto illustrativo fino in fondo: a inizio round rischia di consumare un Documento per eccesso di scrupolo.",
    statLabel: "Scorte Calmanti",
    statMax: 4,
    statStart: 2,
    role: "Tiene alta la stabilita' mentale e impedisce al gruppo di trasformarsi in un reality.",
    tags: ["wellbeing", "social"],
    quotes: [
      "Respira, idratati e non rispondere a nessuno prima delle 10:30.",
      "La tua ansia va agitata prima dell'uso, non nutrita.",
      "Se l'HR sibila, e' solo un effetto collaterale della modernita'."
    ]
  },
  {
    id: "brando",
    name: "Brando Arrampicrispr",
    title: "Ingegnere biotecnologo e scalatore da balcone verticale",
    description: "Ottimizza enzimi, sale sui cornicioni per riflettere e considera ogni call una via ferrata dell'anima.",
    specialName: "Scalata CRISPR dell'impossibile",
    specialText: "Si lancia dove nessuno ha chiesto nulla, recupera margine sul progetto e converte il panico in slancio operativo.",
    flaw: "Se resta fermo troppo a lungo inizia a spiegare il free climbing ai ficus e perde un punto di Stabilita' personale del gruppo.",
    statLabel: "Adrenalina Etica",
    statMax: 4,
    statStart: 2,
    role: "Accelera il progresso e sfonda i colli di bottiglia con entusiasmo scientifico disturbante.",
    tags: ["tech", "climb"],
    quotes: [
      "Ogni problema ha un appiglio. Alcuni pero' sono umidi.",
      "Se serve salgo sul tetto del coworking e torno con una soluzione e un cono gelato.",
      "Il protocollo e' semplice: respiro, grip e biotecnologia feroce."
    ]
  },
  {
    id: "aldo",
    name: "Aldo Spritzforense",
    title: "Avvocato alcolizzato con eloquenza da aperitivo eterno",
    description: "Conosce le norme, aggira il tono passivo-aggressivo e trasforma ogni obiezione in un monologo da bancone luminoso.",
    specialName: "Arringa al negroni della verita'",
    specialText: "Schiaccia gli eventi sociali o burocratici con cavilli poetici, rimette in piedi la carriera e umilia il dramma senza violenza, solo con sintassi aggressiva.",
    flaw: "Quando parte in arringa si dimentica il volume della voce: la sua abilita' logora un po' la Stabilita' mentale del gruppo.",
    statLabel: "Audacia Giuridica",
    statMax: 4,
    statStart: 2,
    role: "Difende la squadra dai disastri relazionali, dall'HR e dalle figuracce ufficiali.",
    tags: ["law", "career"],
    quotes: [
      "Obietto per stile, insisto per principio, brindisi dopo il deposito.",
      "Il problema non e' illegale, e' solo mal raccontato.",
      "Se il recruiter mente, io gli faccio un controesame col sottobicchiere."
    ]
  },
  {
    id: "miro",
    name: "Miro KPI Lupin",
    title: "Ingegnere gestionale ladro di tempo, penne e opportunita'",
    description: "Ottimizza processi, ruba margini e sa esattamente dove spariscono i budget. Nessuno gli presta una biro, lui ne possiede quarantatre'.",
    specialName: "Ottimizzazione opportunistica",
    specialText: "Sottrae risorse al vuoto cosmico, produce Fondi e Documenti, ma lo fa con un'eleganza che insospettisce la Dignita'.",
    flaw: "Quando vede un ufficio ben fornito entra in modalita' gazza professionale e perde un punto Dignita' durante la sua abilita'.",
    statLabel: "Margine Operativo",
    statMax: 4,
    statStart: 2,
    role: "Genera risorse condivise e velocizza le missioni secondarie piu' improbabili.",
    tags: ["logistics", "bureaucracy"],
    quotes: [
      "Non rubo, rialloco il possibile verso il necessario.",
      "Questo budget non e' sparito. Ha solo cambiato proprietario morale.",
      "La vera leadership e' uscire da un meeting con piu' graffette di quando sei entrato."
    ]
  },
  {
    id: "teo",
    name: "Teo Kernel Tempesta",
    title: "Ingegnere informatico pazzo con server interiori instabili",
    description: "Programma a occhi semichiusi, parla coi tostapane e considera i bug una forma di folclore computazionale.",
    specialName: "Patch oracolare nel microonde",
    specialText: "Smanetta col destino, abbassa il Caos, aumenta il Progresso e a volte risolve anche cose che non esistevano ancora.",
    flaw: "Quando fa lavoro ordinario puo' aprire per sbaglio una dimensione laterale: ottieni progresso extra ma anche un po' di Caos.",
    statLabel: "Visione Bugghiata",
    statMax: 4,
    statStart: 2,
    role: "Manipola eventi, missioni tech e l'intero concetto di piano sensato.",
    tags: ["tech", "mission"],
    quotes: [
      "Se smette di lampeggiare, probabilmente e' morto o felicissimo.",
      "Ho scritto una patch che comprende il dolore umano in beta privata.",
      "Il server canta, quindi siamo vivi. O osservati."
    ]
  }
];

const SYNERGIES = [
  {
    id: "catasto-predittivo",
    pair: ["ubaldo", "miro"],
    title: "Catasto Predittivo",
    description: "Quando la squadra tocca burocrazia o logistica, Ubaldo e Miro spremono Documenti dal nulla e spingono il piano avanti.",
    tags: ["bureaucracy", "logistics"],
    effects: { documents: 1, progress: 2 }
  },
  {
    id: "difesa-camomilla",
    pair: ["evarista", "aldo"],
    title: "Difesa con Camomilla",
    description: "Se entrano in scena drammi sociali o legali, la calma farmacologica sostiene l'arringa e salva i nervi di tutti.",
    tags: ["social", "law"],
    effects: { stability: 1, dignity: 1 }
  },
  {
    id: "patch-alpina",
    pair: ["brando", "teo"],
    title: "Patch Alpina",
    description: "Biotech e informatica si stringono la mano su una parete instabile: piu' Progresso e meno Caos.",
    tags: ["tech", "climb"],
    effects: { progress: 3, chaos: -1 }
  },
  {
    id: "fattura-omeopatica",
    pair: ["ubaldo", "evarista"],
    title: "Fattura Omeopatica",
    description: "Quando il team recupera fiato, produce anche ordine. E' inspiegabile ma fiscalmente tonico.",
    tags: ["wellbeing"],
    effects: { stability: 1, documents: 1 }
  },
  {
    id: "compliance-creativa",
    pair: ["aldo", "miro"],
    title: "Compliance Creativa",
    description: "Tra cavilli e scippi di KPI, la carriera torna respirabile e spunta pure un Fondo inatteso.",
    tags: ["career", "bureaucracy"],
    effects: { career: 1, funds: 1 }
  },
  {
    id: "furto-quantistico",
    pair: ["teo", "miro"],
    title: "Furto Quantistico di Tempo",
    description: "Se il piano avanza, questi due rubano minuti al continuum e lo trasformano in progresso vero.",
    tags: ["mission"],
    effects: { progress: 2 }
  }
];

const SIDE_MISSION_TEMPLATES = [
  {
    id: "pec-perduta",
    title: "Recuperare la PEC perduta",
    description: "La password e' finita su una tovaglietta da aperitivo. Servono tecnologia o burocrazia, possibilmente entrambe senza piangere.",
    tags: ["tech", "bureaucracy"],
    target: 3,
    duration: 2,
    reward: { progress: 7, documents: 1, dignity: 1 },
    penalty: { chaos: 2, career: -1 }
  },
  {
    id: "colloquio-escape-room",
    title: "Sopravvivere al colloquio in escape room",
    description: "L'HR vuole sapere i vostri difetti come se fossero una demo commerciale. Servono sociale, legge o faccia tosta terapeutica.",
    tags: ["social", "law", "career"],
    target: 3,
    duration: 2,
    reward: { career: 2, dignity: 1, progress: 5 },
    penalty: { dignity: -2, chaos: 2 }
  },
  {
    id: "formaggi-sintetici",
    title: "Convincere il Comune sui formaggi sintetici",
    description: "Serve un discorso tecnicamente solido e socialmente digeribile. Il consiglio comunale ha fame e opinioni primitive.",
    tags: ["tech", "climb", "social"],
    target: 4,
    duration: 3,
    reward: { progress: 8, career: 1, funds: 1 },
    penalty: { chaos: 2, stability: -1 }
  },
  {
    id: "whatsapp-zia",
    title: "Domare il gruppo WhatsApp delle zie",
    description: "Centoventisette vocali, sei buongiornissimi e una richiesta di consulenza fiscale. Serve benessere, legge o un miracolo digitalmente compatibile.",
    tags: ["wellbeing", "social", "tech"],
    target: 3,
    duration: 2,
    reward: { chaos: -1, dignity: 2, snacks: 1 },
    penalty: { stability: -2, chaos: 1 }
  },
  {
    id: "bando-latte",
    title: "Decifrare il bando latte quantistico",
    description: "Tre allegati contraddittori, un PDF stregato e una tabella con troppi asterischi. Perfetto per burocrati, ladri eleganti e informatici irregolari.",
    tags: ["bureaucracy", "logistics", "tech"],
    target: 4,
    duration: 3,
    reward: { progress: 9, documents: 2 },
    penalty: { career: -1, chaos: 2 }
  },
  {
    id: "weekend-motivazionale",
    title: "Fuggire dal weekend motivazionale",
    description: "Il programma prevede urla nel bosco e networking a piedi nudi. Bisogna sabotarlo con eleganza e tenere integra la psiche collettiva.",
    tags: ["wellbeing", "career", "law"],
    target: 3,
    duration: 2,
    reward: { stability: 2, dignity: 1, progress: 4 },
    penalty: { stability: -2, dignity: -1 }
  }
];

const EVENT_CARDS = [
  {
    id: "ex-coworking",
    title: "Ex nel coworking con laptop nuovo e serenita' ostentata",
    text: "Vi saluta con una tranquillita' che sa di podcast terapeutico. Il gruppo si irrigidisce come una stampante in tribunale.",
    tags: ["social", "romance"],
    effects: { chaos: 2, dignity: -1, stability: -1 }
  },
  {
    id: "recruiter-03",
    title: "Recruiter predatore alle 03:07",
    text: "Scrive \"ciao carissimo\" e vi propone una posizione stimolante pagata in visibilita' e lacrime.",
    tags: ["career", "social"],
    effects: { chaos: 2, career: -1 }
  },
  {
    id: "mutuo-cosmico",
    title: "Il mutuo sviluppa coscienza e pretende attenzioni",
    text: "L'app bancaria respira piano e vi giudica. Perfino il saldo ha un tono passivo-aggressivo.",
    tags: ["career", "bureaucracy"],
    effects: { chaos: 1, dignity: -1, funds: -1 }
  },
  {
    id: "notifiche-3",
    title: "Notifiche alle 03:00 in formazione geometrica",
    text: "Chi vi cerca? Nessuno di utile. Chi vi turba? Tutti contemporaneamente.",
    tags: ["wellbeing", "tech"],
    effects: { chaos: 1, stability: -2 }
  },
  {
    id: "errore-burocratico",
    title: "Errore burocratico con firma apocrifa del destino",
    text: "Un modulo cambia data da solo. Un timbro appare in diagonale. La realta' chiede un consulente.",
    tags: ["bureaucracy", "logistics"],
    effects: { chaos: 2, career: -1, documents: -1 }
  },
  {
    id: "collega-passivo",
    title: "Collega passivo-aggressivo in modalita' zen tossica",
    text: "Dice \"fai pure come credi\" con la serenita' di un serpente che ha letto filosofia orientale.",
    tags: ["career", "social"],
    effects: { chaos: 1, dignity: -1, career: -1 }
  },
  {
    id: "triangolo-gantt",
    title: "Triangolo amoroso su diagramma di Gantt",
    text: "Tutti hanno date, milestone e un'opinione drammatica sulle vostre priorita'.",
    tags: ["romance", "career"],
    effects: { chaos: 2, stability: -1, progress: -3 }
  },
  {
    id: "burnout-morbido",
    title: "Burnout devastante ma confezionato bene",
    text: "Vi sentite produttivi, ma solo perche' state crollando con ottima calligrafia.",
    tags: ["wellbeing"],
    effects: { chaos: 1, stability: -2, dignity: -1 }
  },
  {
    id: "figuraccia-pubblica",
    title: "Figuraccia pubblica durante presentazione improvvisata",
    text: "Il proiettore apre un meme vecchissimo. Purtroppo e' il vostro desktop.",
    tags: ["career", "tech"],
    effects: { dignity: -2, chaos: 1 }
  },
  {
    id: "senso-colpa",
    title: "Senso di colpa a pioggia fine",
    text: "Nessuno vi ha accusati, ma il vostro cervello ha organizzato una commissione interna.",
    tags: ["wellbeing", "social"],
    effects: { stability: -1, dignity: -1 }
  },
  {
    id: "weekend-stage",
    title: "Weekend motivazionale con tamburelli e KPI emozionali",
    text: "Un coach scalzo vuole insegnarvi a fatturare con il diaframma. Vi opponete, ma il diaframma vacilla.",
    tags: ["career", "wellbeing"],
    effects: { chaos: 2, stability: -1, career: -1 }
  },
  {
    id: "tentazione-startup",
    title: "Sogno irrealistico di carriera appena sfornato",
    text: "Qualcuno propone di mollare tutto e aprire una piattaforma per consulenze sentimentali ai geometri.",
    tags: ["career", "mission"],
    effects: { chaos: 1, progress: -4, dignity: -1 }
  }
];

const SPECIAL_EVENTS = [
  {
    id: "festival-ex",
    title: "Festival Nazionale delle Ex Ricomparse",
    text: "Tutte insieme, nello stesso quartiere, con playlist condivisa e piena fiducia nei vostri punti deboli.",
    tags: ["social", "romance"],
    effects: { chaos: 3, dignity: -2, stability: -1 }
  },
  {
    id: "audit-cosmico",
    title: "Audit Cosmico del Catasto Emotivo",
    text: "Arriva un ispettore metafisico e chiede perche' avete definito l'ansia una spesa di rappresentanza.",
    tags: ["bureaucracy", "law"],
    effects: { chaos: 3, career: -2, documents: -1 }
  },
  {
    id: "gruppo-voce",
    title: "Gruppo WhatsApp ingestibile con 54 vocali consecutive",
    text: "Ogni vocale contiene tre drammi, un consiglio discutibile e un buongiornissimo con delfino.",
    tags: ["social", "wellbeing"],
    effects: { chaos: 2, stability: -2, dignity: -1 }
  },
  {
    id: "deadline-catastrofica",
    title: "Scadenza catastrofica con allegato invisibile",
    text: "Il portale regionale smette di distinguere tra salvataggio e preghiera.",
    tags: ["tech", "bureaucracy", "mission"],
    effects: { chaos: 2, progress: -6, career: -1 }
  }
];

const DEFAULT_BEST_RESULTS = {
  wins: 0,
  losses: 0,
  bestProgress: 0,
  bestDignity: 0,
  bestCareer: 0,
  longestRun: 0
};

const DEFAULT_PREFERENCES = {
  soundOn: true,
  charityModeOn: false
};

const DONATION_AMOUNT = 1;
const DONATION_PENDING_CAP = 2;
const CHARITY_CAUSES = [
  "una mensa solidale locale",
  "un progetto che distribuisce beni essenziali",
  "una rete di ascolto e supporto concreto",
  "un'iniziativa per farmaci e pronto intervento sociale",
  "un doposcuola solidale per famiglie in difficolta'"
];

const MAX_VALUES = {
  chaos: 18,
  dignity: 12,
  career: 12,
  stability: 12,
  progress: 999,
  funds: 9,
  snacks: 9,
  documents: 9
};