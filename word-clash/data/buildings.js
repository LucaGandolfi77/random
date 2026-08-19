/* BUILDINGS — edifici della libreria, data-driven. 5 livelli ciascuno.
   Il livello massimo di un edificio = livello del Catalogo Centrale.
   cell = posizione sulla griglia 6×8 della base. levels.extra dipende dalla categoria. */
const BUILDINGS = [
  { id:'catalogo', name:'Catalogo Centrale', emoji:'🏛️', category:'core',
    cell:[2,4], unlock:1,
    desc:'Il cuore della libreria. Ogni livello sblocca nuovi edifici e alza i limiti.',
    levels:[
      { cost:0, time:0 }, { cost:800, time:120 }, { cost:2500, time:300 },
      { cost:6000, time:600 }, { cost:12000, time:900 }
    ] },

  { id:'banco_prestito', name:'Banco di Prestito', emoji:'📚', category:'production',
    cell:[2,2], unlock:1, ratePerMin:[2,5,10,18,30],
    desc:'Noleggia libri a chi non li riporta mai. Produce monete.',
    levels:[
      { cost:0, time:0 }, { cost:150, time:30 }, { cost:400, time:90 },
      { cost:1000, time:180 }, { cost:2500, time:360 }
    ] },

  { id:'cassaforte', name:'Cassaforte di Note', emoji:'🔐', category:'storage',
    cell:[3,2], unlock:1, cap:[2000,5000,10000,20000,40000],
    desc:'Dove dormono le monete. Alza la capienza del tesoro.',
    levels:[
      { cost:0, time:0 }, { cost:250, time:30 }, { cost:700, time:90 },
      { cost:1800, time:180 }, { cost:4500, time:360 }
    ] },

  { id:'quaderno', name:'Quaderno di Guerra', emoji:'📓', category:'army',
    cell:[2,5], unlock:1, cap:[4,6,8,10,12],
    desc:'Il taccuino tattico: più pagine = più parole schierabili in battaglia.',
    levels:[
      { cost:0, time:0 }, { cost:200, time:30 }, { cost:500, time:90 },
      { cost:1200, time:180 }, { cost:3000, time:360 }
    ] },

  { id:'muro', name:'Muro di Enciclopedie', emoji:'🧱', category:'defense',
    cell:[0,1], unlock:1, wallHp:[150,300,500,800,1200], copyCost:[50,100,200,400,800], copyTime:[0,20,40,80,150],
    desc:'Barriera di tomi. Comprane di più e potenziali: gli attaccanti impazziranno.',
    levels:[
      { cost:0, time:0 }, { cost:150, time:20 }, { cost:400, time:60 },
      { cost:900, time:150 }, { cost:2000, time:300 }
    ] },

  { id:'caffe', name:'Caffè Letterario', emoji:'☕', category:'production',
    cell:[1,2], unlock:2, ratePerMin:[1,3,6,12,20],
    desc:'Espresso e racconti. I lettori pagano per restare. Produce monete.',
    levels:[
      { cost:0, time:0 }, { cost:200, time:30 }, { cost:500, time:90 },
      { cost:1200, time:180 }, { cost:3000, time:360 }
    ] },

  { id:'scrigno', name:'Scrigno dei Dobloni', emoji:'🏺', category:'storage',
    cell:[3,4], unlock:2, cap:[10,25,50,100,200],
    desc:'Il caveau dorato. Alza quanti dobloni puoi custodire.',
    levels:[
      { cost:0, time:0 }, { cost:300, time:30 }, { cost:800, time:90 },
      { cost:2000, time:180 }, { cost:5000, time:360 }
    ] },

  { id:'tipografia', name:'Tipografia', emoji:'🖨️', category:'army',
    cell:[4,2], unlock:3, tier:[1,2,3,4,5],
    desc:'Stampa parole-truppa. Ogni livello sblocca vocaboli più potenti.',
    levels:[
      { cost:0, time:0 }, { cost:600, time:120 }, { cost:1500, time:300 },
      { cost:3500, time:600 }, { cost:8000, time:900 }
    ] },

  { id:'edicola', name:'Edicola Fumetti', emoji:'🦸', category:'production',
    cell:[1,3], unlock:3, ratePerMin:[4,9,16,26,40],
    desc:'Il fumettista del piano di sotto. Produzione seria di monete.',
    levels:[
      { cost:0, time:0 }, { cost:400, time:60 }, { cost:1000, time:180 },
      { cost:2500, time:360 }, { cost:6000, time:600 }
    ] },

  { id:'torretta', name:'Torretta del Correttore', emoji:'🎯', category:'defense',
    cell:[1,4], unlock:4, dps:[3,6,10,16,24],
    desc:'Spara refusi a raffica. Ogni errore di battitura è una vittima.',
    levels:[
      { cost:0, time:0 }, { cost:500, time:60 }, { cost:1200, time:180 },
      { cost:3000, time:360 }, { cost:7500, time:600 }
    ] },

  { id:'trappola', name:'Trappola Grammaticale', emoji:'🕸️', category:'defense',
    cell:[1,5], unlock:4, slow:[0.10,0.15,0.20,0.25,0.30],
    desc:'Congiuntivi improbabili e fili di ragnatela: rallenta gli attaccanti.',
    levels:[
      { cost:0, time:0 }, { cost:400, time:60 }, { cost:1000, time:180 },
      { cost:2500, time:360 }, { cost:6000, time:600 }
    ] },

  { id:'laboratorio', name:'Laboratorio Etimologico', emoji:'🧪', category:'army',
    cell:[3,5], unlock:5, boost:[1.0,1.1,1.2,1.3,1.4],
    desc:'Dà più significato (e più HP) alle tue parole.',
    levels:[
      { cost:0, time:0 }, { cost:800, time:120 }, { cost:2000, time:300 },
      { cost:5000, time:600 }, { cost:10000, time:900 }
    ] },

  { id:'fontana', name:'Fontana di Inchiostro', emoji:'⛲', category:'decor',
    cell:[1,6], unlock:5, currency:'dobloni', bonus:[0.05,0.10,0.15,0.20,0.25],
    desc:'Scorre inchiostro viola. Ogni livello aumenta del 5% la produzione di monete.',
    levels:[
      { cost:0, time:0 }, { cost:2, time:30 }, { cost:4, time:60 },
      { cost:8, time:120 }, { cost:15, time:300 }
    ] }
];