/* MINIGAMES — un minigioco per ogni attività, coerente con l'occasione.
   Alcuni sono dadi, alcuni sono giochi d'azzardo veri (Gratta e Vinci, Raddoppia, Scommessa).
   Engine in js/minigame.js. Tipi: dice | catch | double | scratch | sequence. */
const MINIGAMES = {
  /* 🛋️ serata tranquilla → dadi: chi vince sceglie il film */
  serata_tranquilla: {
    type:'dice', dice:1, sides:6,
    name:'Il Gran Lancio del Cuscino', emoji:'🛋️',
    blurb:'Chi vince sceglie il film. I dadi non mentono… quasi mai.',
    tiers:[
      { at:6, label:'CUSCINO LEGGENDARIO', emoji:'👑', mul:1.4 },
      { at:4, label:'Film Bollente', emoji:'🍿', mul:1.1 },
      { at:3, label:'Zapping Interminabile', emoji:'📺', mul:0.9 },
      { at:0, label:'Sofà Sprofondato', emoji:'😴', mul:0.7 }
    ]
  },

  /* 🍕 pizza → memoria: ricorda l'ordine degli ingredienti */
  pizza: {
    type:'sequence', items:['🍅','🧀','🌿','🫒','🌶️','🍄'], length:3,
    name:'La Ricetta Segreta', emoji:'🍕',
    blurb:'Ricorda l\'ordine degli ingredienti o la pizza diventa un esperimento.'
  },

  /* 🍽️ cena → memoria: l'ordine del menù */
  cena: {
    type:'sequence', items:['🍝','🥩','🍰','🥗','🍷'], length:3,
    name:'Ordine del Menù', emoji:'🍽️',
    blurb:'Primo, secondo, dolce. Se sbagli ordine, il cameriere (voi) piange.'
  },

  /* 🎬 film → reazione: resta sveglio */
  film: {
    type:'catch', target:75,
    name:'Resta Sveglio!', emoji:'🎬',
    blurb:'Il film è noioso, il divano è comodo. Ferma il sonno prima che ti prenda.',
    tiers:[
      { at:85, label:'OCCHI SPALANCATI', emoji:'👀', mul:1.4 },
      { at:60, label:'QUASI SVEGLIO', emoji:'🍿', mul:1.1 },
      { at:35, label:'MENTO IN MANO', emoji:'🥱', mul:0.9 },
      { at:0, label:'SI RUSSIA', emoji:'💤', mul:0.7 }
    ]
  },

  /* 🎮 gaming → dadi: lancio stellare */
  gaming: {
    type:'dice', dice:1, sides:20,
    name:'Dado Stellare', emoji:'🎮',
    blurb:'Un solo lancio decide il campione della serata.',
    tiers:[
      { at:18, label:'BOSS FINALE SCONFITTO', emoji:'🏆', mul:1.6 },
      { at:12, label:'COMBO ROTTA', emoji:'🎮', mul:1.2 },
      { at:7, label:'CAMBIAMO CAMPIONATO', emoji:'🕹️', mul:1.0 },
      { at:0, label:'MORTE INSEGUITA', emoji:'💀', mul:0.7 }
    ]
  },

  /* 🥤 grattata → gratta e vinci (azzardo) */
  grattata: {
    type:'scratch', gamble:true, stake:10, prize:30, winOdds:0.34, symbols:['🍒','🔔','💰'],
    name:'Gratta e Vinci', emoji:'🎟️',
    blurb:'Tre simboli uguali = vincita. La posta è bassa, la gloria è eterna.'
  },

  /* 🥂 aperitivo → raddoppia o niente (azzardo) */
  aperitivo: {
    type:'double', gamble:true, stake:20, winOdds:0.5,
    name:'Lo Spritz Raddoppia', emoji:'🥂',
    blurb:'Chi perde paga il giro. Il dado decide: raddoppi o perdi tutto.'
  },

  /* 🎤 karaoke → reazione: la nota perfetta */
  karaoke: {
    type:'catch', target:65,
    name:'Nota Perfetta', emoji:'🎤',
    blurb:'Ferma la freccia sulla nota giusta. L\'aplomb del pubblico ne dipende.',
    tiers:[
      { at:85, label:'NOTA PERFETTA', emoji:'🎵', mul:1.5 },
      { at:55, label:'DISCRETO', emoji:'🎤', mul:1.1 },
      { at:30, label:'STONATO', emoji:'🐸', mul:0.9 },
      { at:0, label:'IL MICROFONO URLA', emoji:'📢', mul:0.7 }
    ]
  },

  /* 🎉 festa → dadi: la festa si fa leggenda */
  festa: {
    type:'dice', dice:2, sides:6,
    name:'Bombe di Festa', emoji:'🎉',
    blurb:'Due dadi decidono il destino della serata.',
    tiers:[
      { at:10, label:'FESTA EPICA', emoji:'🎇', mul:1.5 },
      { at:7, label:'FESTA GRANDE', emoji:'🎉', mul:1.15 },
      { at:5, label:'FESTA Carina', emoji:'🎈', mul:1.0 },
      { at:0, label:'PALLA AL VICINO', emoji:'🚓', mul:0.7 }
    ]
  },

  /* 🪩 discoteca → reazione: sul beat */
  discoteca: {
    type:'catch', target:50,
    name:'Sul Beat', emoji:'🪩',
    blurb:'Ferma la freccia a tempo di musica. Il dj vi osserva.',
    tiers:[
      { at:85, label:'DJ FUSO', emoji:'🕺', mul:1.4 },
      { at:55, label:'A RITMO', emoji:'🪩', mul:1.1 },
      { at:30, label:'RITMO DA CLIPS', emoji:'🥶', mul:0.9 },
      { at:0, label:'PIEDI SINCRONI', emoji:'👞', mul:0.7 }
    ]
  },

  /* 🍖 grigliata → memoria: l'ordine sulla griglia */
  grigliata: {
    type:'sequence', items:['🔥','🥩','🌽','🍆','🍋'], length:3,
    name:'Sotto il Ferro', emoji:'🍖',
    blurb:'Ricorda l\'ordine: prima il fuoco, poi la carne, poi il resto.'
  },

  /* 🏊 piscina → reazione: il tuffo perfetto */
  piscina: {
    type:'catch', target:30,
    name:'Tuffo Perfetto', emoji:'🏊',
    blurb:'Ferma la freccia nell\'acqua: un tuffo che spruzza poco e impressiona tanto.',
    tiers:[
      { at:85, label:'TUFFO DA OLIMPIADI', emoji:'🏅', mul:1.5 },
      { at:60, label:'SPLASH PERFETTO', emoji:'💦', mul:1.1 },
      { at:35, label:'TUFFO DEL CORAGGIO', emoji:'🤿', mul:0.9 },
      { at:0, label:'BOMBA', emoji:'💥', mul:0.7 }
    ]
  },

  /* 🌊 mare → reazione: il pallone in rete */
  mare: {
    type:'catch', target:50,
    name:'Pallone in Rete', emoji:'🌊',
    blurb:'Il mare è la rete, la sabbia è il campo. Ferma al momento giusto.',
    tiers:[
      { at:85, label:'RETE SPETTACOLARE', emoji:'🏐', mul:1.5 },
      { at:55, label:'PALLEGGIO OK', emoji:'🏖️', mul:1.1 },
      { at:30, label:'PALLONE IN FACCIA', emoji:'😵', mul:0.9 },
      { at:0, label:'CAPOVOLTA NELLA SABBIA', emoji:'🏖️', mul:0.7 }
    ]
  },

  /* ⛰️ montagna → reazione: la scalata */
  montagna: {
    type:'catch', target:85,
    name:'Scalata', emoji:'⛰️',
    blurb:'Ferma la freccia in cima: si scende solo per un\'emergenza di meritato pranzo.',
    tiers:[
      { at:80, label:'VETTA CONQUISTATA', emoji:'⛰️', mul:1.5 },
      { at:55, label:'SENTIERO BELLO', emoji:'🥾', mul:1.1 },
      { at:30, label:'FIATO CORTO', emoji:'😮‍💨', mul:0.9 },
      { at:0, label:'GIRANDOLA IN SALITA', emoji:'🔄', mul:0.7 }
    ]
  },

  /* ✈️ viaggio → dadi: il grande volo */
  viaggio: {
    type:'dice', dice:3, sides:6,
    name:'Semaforo del Viaggio', emoji:'✈️',
    blurb:'Tre dadi per un viaggio: valigie, sveglie e destinazione tutto in un lancio.',
    tiers:[
      { at:15, label:'VIAGGIO DEI SOGNI', emoji:'🌍', mul:1.6 },
      { at:11, label:'VIAGGIO TOP', emoji:'✈️', mul:1.2 },
      { at:8, label:'VIAGGIO OK', emoji:'🧳', mul:1.0 },
      { at:0, label:'PERDUTI IN AEROPORTO', emoji:'😵', mul:0.7 }
    ]
  },

  /* 🏆 torneo → scommessa (azzardo) */
  torneo: {
    type:'double', gamble:true, stake:30, winOdds:0.45,
    name:'Posta sul Campione', emoji:'🏆',
    blurb:'Scommetti sul tuo campione. Ogni vittoria raddoppia la posta.',
    stakeNote:'La posta parte da €30 e raddoppia ad ogni vittoria.'
  },

  /* 🎸 concerto → reazione: l'assolo epico */
  concerto: {
    type:'catch', target:40,
    name:'Assolo Epico', emoji:'🎸',
    blurb:'Ferma la freccia sul massimo del furore chitarristico.',
    tiers:[
      { at:85, label:'ASSOLO EPICO', emoji:'🤘', mul:1.5 },
      { at:55, label:'POGO DECENTE', emoji:'🎸', mul:1.1 },
      { at:30, label:'CHITARRA SMORDA', emoji:'🪕', mul:0.9 },
      { at:0, label:'IL BASSISTA SCAPPA', emoji:'🏃', mul:0.7 }
    ]
  },

  /* 😴 recupero → dadi: un altro episodio? */
  recupero: {
    type:'dice', dice:1, sides:6,
    name:'Sì o No a un Altro Episodio', emoji:'😴',
    blurb:'L\'ultima puntata… e poi via. Sul serio. Dado alla mano.',
    tiers:[
      { at:5, label:'BINGE COMPLETO', emoji:'📺', mul:1.3 },
      { at:3, label:'UN EPISODIO IN PIÙ', emoji:'🛋️', mul:1.05 },
      { at:0, label:'IL DIVANO VINCE', emoji:'😴', mul:0.9 }
    ]
  }
};