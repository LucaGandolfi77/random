/* ACTIVITIES — tutte le cose assurde che il gruppo può fare. Data-driven. */
const ACTIVITIES = [
  {
    id:'serata_tranquilla', name:'Serata Tranquilla', icon:'🛋️', category:'casa',
    cost:10, duration:1, min:2, max:99, home:true,
    energyCost:5,
    output:{ money:0, happy:15, rep:1 },
    requiresSkill:null,
    pool:['chiavi_perse','cena_bruciata','spesa_dimenticata','vicino_festa','nessuno_a_casa'],
    chaos:0.05,
    desc:'Tranquilla. In teoria. In pratica è l\'inizio di un\'epopea.'
  },
  {
    id:'pizza', name:'Pizza', icon:'🍕', category:'casa',
    cost:25, duration:1, min:2, max:99, home:true,
    energyCost:5,
    output:{ money:0, happy:20, rep:1 },
    requiresSkill:null,
    pool:['cena_bruciata','ghiaccio_finito','spesa_dimenticata','amici_extra'],
    chaos:0.07,
    desc:'Una pizza fatta in casa è più buona. Se non la bruciate.'
  },
  {
    id:'cena', name:'Cena', icon:'🍽️', category:'casa',
    cost:60, duration:2, min:2, max:99, home:true, requiresRoom:'cucina', requireRoomLevel:2,
    energyCost:8,
    output:{ money:0, happy:30, rep:2 },
    requiresSkill:null,
    pool:['cena_bruciata','scrocco_pagamento','amici_extra','sconto_trovato'],
    chaos:0.08,
    desc:'Una cena vera. Con tovaglia, forse. Contiamo fino a tre e non ridiamo.'
  },
  {
    id:'film', name:'Film', icon:'🎬', category:'casa',
    cost:15, duration:2, min:2, max:99, home:true, requiresRoom:'tv', requireRoomLevel:1,
    energyCost:4,
    output:{ money:0, happy:18, rep:1 },
    requiresSkill:null,
    pool:['nessuno_a_casa','addormentati','sconto_trovato'],
    chaos:0.04,
    desc:'Film. Qualcuno spiega il film. Qualcuno chiede “ma lui chi era?”. Sempre.'
  },
  {
    id:'gaming', name:'Gaming', icon:'🎮', category:'casa',
    cost:5, duration:2, min:2, max:99, home:true,
    energyCost:4,
    output:{ money:0, happy:15, rep:1 },
    requiresSkill:null,
    pool:['torneo_vinto','addormentati','spesa_dimenticata'],
    chaos:0.05,
    desc:'Console, controller, urla. Il divano trema. Il vicino ti conosce.'
  },
  {
    id:'grattata', name:'Grattata', icon:'🥤', category:'casa',
    cost:8, duration:1, min:2, max:99, home:true,
    energyCost:3,
    output:{ money:0, happy:12, rep:0 },
    requiresSkill:null,
    pool:['scrocco_pagamento','chiavi_perse','vicino_festa'],
    chaos:0.05,
    desc:'Senza fare niente. Con le patatine. Ecco, il piano perfetto.'
  },
  {
    id:'aperitivo', name:'Aperitivo', icon:'🥂', category:'fuori',
    cost:40, duration:2, min:2, max:99,
    energyCost:6,
    output:{ money:0, happy:25, rep:2 },
    requiresSkill:null,
    pool:['amici_extra','dj_arrivato','sconto_trovato','portafoglio_dimenticato'],
    chaos:0.08,
    desc:'Spritz, olive, una discussione su chi ha comprato gli stuzzichini.'
  },
  {
    id:'karaoke', name:'Karaoke', icon:'🎤', category:'fuori',
    cost:50, duration:2, min:2, max:99,
    energyCost:7,
    output:{ money:0, happy:35, rep:3 },
    requiresSkill:null,
    pool:['dj_arrivato','musica_perfetta','nessuno_a_casa','vicino_festa'],
    chaos:0.10,
    desc:'Il microfono è un\'arma. Tommy canta, tutti ascoltano. Poi tutti cantano.'
  },
  {
    id:'festa', name:'Festa', icon:'🎉', category:'casa',
    cost:80, duration:3, min:4, max:99, home:true,
    energyCost:10,
    output:{ money:0, happy:40, rep:4 },
    requiresSkill:null,
    pool:['amici_extra','dj_arrivato','vicino_festa','piscina_sorpresa','grigliata_festival','nessuno_a_casa'],
    chaos:0.14,
    desc:'Festa. Porta chi vuoi. Il piano era per 6, diventerà per 30.'
  },
  {
    id:'discoteca', name:'Discoteca', icon:'🪩', category:'fuori',
    cost:120, duration:3, min:4, max:99,
    energyCost:12,
    output:{ money:0, happy:50, rep:5 },
    requiresSkill:null,
    pool:['dj_arrivato','musica_perfetta','amici_extra','pioggia'],
    chaos:0.12,
    desc:'Palline da discoteca, bassi che si sentono nei denti, la notte che non finisce.'
  },
  {
    id:'grigliata', name:'Grigliata', icon:'🍖', category:'casa',
    cost:80, duration:3, min:3, max:99, home:true, requiresRoom:'giardino', requireRoomLevel:2,
    energyCost:10,
    output:{ money:0, happy:45, rep:4 },
    requiresSkill:['chef','re_grigliata'],
    pool:['cibo_finito','grigliata_festival','vicino_festa','portafoglio_dimenticato','pioggia'],
    chaos:0.12,
    desc:'Il capitano è Tubo. Il carbone è il sacro fuoco. Nessuno tocca la salsiccia di Tubo.'
  },
  {
    id:'piscina', name:'Giornata in Piscina', icon:'🏊', category:'casa',
    cost:90, duration:3, min:3, max:99, home:true, requiresRoom:'piscina', requireRoomLevel:2,
    energyCost:8,
    output:{ money:0, happy:45, rep:4 },
    requiresSkill:null,
    pool:['piscina_sorpresa','pioggia','amici_extra','cibo_finito'],
    chaos:0.10,
    desc:'La piscina. Il bagnoschiuma fluttua. Qualcuno si tuffa con i calzini. Un eroe.'
  },
  {
    id:'mare', name:'Gita al Mare', icon:'🌊', category:'viaggio',
    cost:200, duration:3, min:2, max:99, travel:true,
    energyCost:10,
    output:{ money:0, happy:60, rep:5 },
    requiresSkill:null,
    pool:['macchina_non_parte','traffico_epico','pioggia','piscina_sorpresa','sconto_trovato'],
    chaos:0.12,
    desc:'Sabbia, cappelli, qualcuno che dimentica la crema e torna rosso come un gambero.'
  },
  {
    id:'montagna', name:'Montagna', icon:'⛰️', category:'viaggio',
    cost:220, duration:3, min:2, max:99, travel:true,
    energyCost:12,
    output:{ money:0, happy:50, rep:5 },
    requiresSkill:null,
    pool:['macchina_non_parte','traffico_epico','pioggia','sconto_trovato'],
    chaos:0.12,
    desc:'Aria buona, scarponi no, il furgone che soffre in salita. Che bello.'
  },
  {
    id:'viaggio', name:'Viaggio Grande', icon:'✈️', category:'viaggio',
    cost:350, duration:4, min:2, max:99, travel:true,
    energyCost:15,
    output:{ money:0, happy:80, rep:8 },
    requiresSkill:null,
    pool:['chiavi_perse','portafoglio_dimenticato','amici_extra','musica_perfetta','torneo_vinto'],
    chaos:0.15,
    desc:'Un viaggio vero. Valigie, documenti, Pietro che ha preso solo il caricatore del telefono.'
  },
  {
    id:'torneo', name:'Torneo', icon:'🏆', category:'fuori',
    cost:60, duration:3, min:2, max:99,
    energyCost:10,
    output:{ money:30, happy:35, rep:4 },
    requiresSkill:null,
    pool:['torneo_vinto','addormentati','sconto_trovato'],
    chaos:0.10,
    desc:'Un torneo. Chi vince paga meno. Tutti urlano. La posta è la dignità.'
  },
  {
    id:'concerto', name:'Concerto', icon:'🎸', category:'fuori',
    cost:150, duration:4, min:2, max:99,
    energyCost:12,
    output:{ money:0, happy:55, rep:6 },
    requiresSkill:null,
    pool:['musica_perfetta','amici_extra','pioggia','portafoglio_dimenticato'],
    chaos:0.10,
    desc:'Il gruppo di Tommy suona? Allora il concerto è un evento privato con pubblico.'
  },
  {
    id:'recupero', name:'Recupero Collettivo', icon:'😴', category:'casa',
    cost:5, duration:1, min:2, max:99, home:true,
    energyCost:-20,
    output:{ money:0, happy:10, rep:0 },
    requiresSkill:null,
    pool:['addormentati','chiavi_perse'],
    chaos:0.03,
    desc:'Divano, pizza fredda, serie TV. La domenica si fa così. Si, anche di lunedì.'
  }
];