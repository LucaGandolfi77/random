/* CHARACTERS — DATA-DRIVEN. Per aggiungere un amico basta una voce qui. */
const CHARACTERS = [
  {
    id:'dario', name:'Dario', age:32, emoji:'🧔🏻', color:'#ffb400', job:'impiegato',
    blurb:'Proprietario di casa e cuore del gruppo. Crede nell\'amicizia e che ogni problema si risolva con una serata.',
    stats:{social:88, cooking:45, driving:55, energy:72, luck:55},
    skills:['organizzatore','intrattenitore'],
    power:{ name:'Cerimoniere', desc:'Con lui sul podio, le serate rendono +20% felicità.', type:'happy', val:0.2 },
    traits:['simpatico','crede nell\'amicizia'],
    preferences:['festa','grigliata','cena'],
    dislikes:['discoteca','montagna']
  },
  {
    id:'armandino', name:'Armandino', age:2, emoji:'🐹', color:'#c98a4b', job:'criceto',
    blurb:'Un criceto di cui nessuno conosce il nome vero. Vive nella gabbietta, scappa alle 3 di notte e morde. L\'amiamo.',
    stats:{social:20, cooking:10, driving:5, energy:55, luck:80},
    skills:['patatine'],
    power:{ name:'Morso della Fortuna', desc:'12% di probabilità di mordere via un evento negativo.', type:'luckShield', val:0.12 },
    traits:['morde','impulsivo'],
    preferences:['grattata','gaming'],
    dislikes:['piscina','viaggio']
  },
  {
    id:'doris', name:'Doris', age:27, emoji:'👱🏻‍♀️', color:'#ff5d8f', job:'stilista',
    blurb:'Bellissima e stilosa. Entra in una stanza e la stanza migliora l\'arredamento.',
    stats:{social:90, cooking:45, driving:55, energy:75, luck:62},
    skills:['fortunato','intrattenitore'],
    power:{ name:'Effetto Stiloso', desc:'La reputazione guadagnata cresce del 15%.', type:'rep', val:0.15 },
    traits:['stilosa','di classe'],
    preferences:['aperitivo','discoteca','concerto'],
    dislikes:['gaming','recupero']
  },
  {
    id:'tommy', name:'Tommy', age:26, emoji:'🧑🏼‍🦱', color:'#6ee7ff', job:'musicista',
    blurb:'Punk e gioca a basket. Ha sempre una canzone da suonare e un concerto da improvvisare.',
    stats:{social:78, cooking:30, driving:60, energy:88, luck:45},
    skills:['dj','non_dorme_mai'],
    power:{ name:'Energia Punk', desc:'Le attività con lui costano il 20% di energia in meno a tutti.', type:'energy', val:0.2 },
    traits:['punk','energico'],
    preferences:['concerto','discoteca','torneo'],
    dislikes:['film','grigliata']
  },
  {
    id:'ricca', name:'Ricca', age:29, emoji:'🧔🏽', color:'#b388ff', job:'barista',
    blurb:'Parla tantissimo e beve tantissime birre. Indossa la felpa anche a 35 gradi. E trova sempre una giustificazione.',
    stats:{social:82, cooking:40, driving:50, energy:62, luck:35},
    skills:['scrocco','portafoglio_vuoto'],
    power:{ name:'Brindisi', desc:'Brinda con tutti: +50% di amicizia guadagnata.', type:'friendship', val:0.5 },
    traits:['chiacchierone','sempre in felpa'],
    preferences:['aperitivo','festa','grattata'],
    dislikes:['montagna','mare']
  },
  {
    id:'luca', name:'Luca', age:28, emoji:'😎', color:'#ffd866', job:'freelance',
    blurb:'Pazzo, bellissimo, dorme ovunque e in ogni momento. Ma se parli di viaggio si sveglia: e lì è inguardabile per la felicità.',
    stats:{social:72, cooking:35, driving:68, energy:32, luck:72},
    skills:['gps_umano','divanologo'],
    power:{ name:'Passaporto Sempre Pronto', desc:'I viaggi costano il 25% in meno.', type:'travel', val:0.25 },
    traits:['dormiglione','amante dei viaggi'],
    preferences:['viaggio','mare','montagna','recupero'],
    dislikes:['torneo','concerto']
  },
  {
    id:'fede', name:'Fede', age:27, emoji:'🧑🏻', color:'#ff7a45', job:'cameriere',
    blurb:'Cameriere di professione, bevitore di vocazione. Porta i vassoi pieni e li riporta indietro pieni di altro.',
    stats:{social:70, cooking:62, driving:40, energy:55, luck:30},
    skills:['scrocco'],
    power:{ name:'Vassoio Veloce', desc:'Conosce i prezzi: -10% sul costo delle attività.', type:'money', val:0.1 },
    traits:['bevitore','servizievole'],
    preferences:['aperitivo','festa','grattata'],
    dislikes:['montagna','gaming']
  },
  {
    id:'ruben', name:'Ruben', age:30, emoji:'🤓', color:'#3ecf6b', job:'developer',
    blurb:'Super nerd, molto sexy (dice lui, confermano tutti). Excel, strategie e un sesto senso per il coupon giusto.',
    stats:{social:45, cooking:25, driving:40, energy:70, luck:65},
    skills:['economista','divanologo'],
    power:{ name:'Foglio di Calcolo', desc:'Ha già fatto il preventivo: -15% sul costo delle attività.', type:'money', val:0.15 },
    traits:['nerd','stratega'],
    preferences:['gaming','film','torneo'],
    dislikes:['discoteca','piscina','montagna']
  },
  {
    id:'coppe', name:'Coppe', age:29, emoji:'🧑🏿', color:'#5b8def', job:'freelance',
    blurb:'Stiloso, sempre al telefono con Franci. “Ma la ascolto anche quando parla di niente.” Il gruppo piange.',
    stats:{social:85, cooking:35, driving:55, energy:72, luck:55},
    skills:['organizzatore','fortunato'],
    power:{ name:'Galante', desc:'Con Franci in arrivo, la serata rende +15% felicità.', type:'happy', val:0.15 },
    traits:['stiloso','innamorato'],
    preferences:['cena','aperitivo','concerto','karaoke'],
    dislikes:['gaming','torneo']
  },
  {
    id:'franci', name:'Franci', age:28, emoji:'👩🏼', color:'#ff8fb0', job:'stilista',
    blurb:'Stilosa e dolce, la pazienza del gruppo. Riesce a far ridere anche il criceto. Quasi.',
    stats:{social:88, cooking:65, driving:45, energy:70, luck:60},
    skills:['intrattenitore','patatine'],
    power:{ name:'Zona di Comfort', desc:'Ricarica tutti: +15 energia extra ogni giorno.', type:'recover', val:15 },
    traits:['dolce','stilosa'],
    preferences:['cena','aperitivo','karaoke','film'],
    dislikes:['torneo','montagna']
  },
  {
    id:'gando', name:'Gando', age:31, emoji:'👨🏻‍💻', color:'#00c2a8', job:'developer',
    blurb:'Pazzo e programmatore. Crea sistemi che nemmeno lui capisce il giorno dopo, e lavora mentre tutti festeggiano.',
    stats:{social:55, cooking:30, driving:45, energy:80, luck:50},
    skills:['non_dorme_mai','organizzatore'],
    power:{ name:'Sistema Gando', desc:'Un suo sistema automatizzato frutta €40 a settimana.', type:'income', val:40 },
    traits:['programmatore','instancabile'],
    preferences:['gaming','film','recupero','serata_tranquilla'],
    dislikes:['discoteca','montagna']
  },
  {
    id:'pietro', name:'Pietro', age:30, emoji:'🧔🏼', color:'#9b8cff', job:'freelance',
    blurb:'Lavora da remoto, ma “da remoto” per lui è ovunque tranne che a casa. In vacanza fa il pazzo con metodo.',
    stats:{social:68, cooking:30, driving:70, energy:60, luck:75},
    skills:['pilota','arriva_sempre_tardi'],
    power:{ name:'Ferie Creative', desc:'In viaggio la felicità aumenta del 30%.', type:'travelHappy', val:0.3 },
    traits:['pazzo','sempre in ferie'],
    preferences:['viaggio','mare','montagna','concerto'],
    dislikes:['gaming','recupero']
  },
  {
    id:'tubo', name:'Tubo', age:33, emoji:'👨🏽‍🍳', color:'#ff4d4d', job:'chef_pro',
    blurb:'Grande chef. La sua salsa segreta è il segreto meglio custodito d\'Europa. Beve tantissimo, ma il sugo no.',
    stats:{social:65, cooking:95, driving:35, energy:50, luck:40},
    skills:['chef','re_grigliata'],
    power:{ name:'Salsa Segreta', desc:'+30% felicità su pizza, cena e grigliata.', type:'foodHappy', val:0.3 },
    traits:['chef','gran bevitore'],
    preferences:['grigliata','cena','pizza','piscina'],
    dislikes:['montagna','concerto']
  },
  {
    id:'marci', name:'Marci', age:25, emoji:'🧑🏽', color:'#8ee05e', job:'rider',
    blurb:'Gioca a calcio ed è fortissimo. Porta il pallone anche al cinema. Lo fanno entrare? No. Però segna sempre.',
    stats:{social:78, cooking:30, driving:60, energy:90, luck:55},
    skills:['macchina_piena','intrattenitore'],
    power:{ name:'Spirito di Squadra', desc:'Quando gioca lui, tutti i partecipanti guadagnano +10% felicità.', type:'happy', val:0.1 },
    traits:['calciatore','impetuoso'],
    preferences:['torneo','grigliata','festa','piscina'],
    dislikes:['film','recupero','viaggio']
  }
];

/* REGISTRO SKILL — label, descrizione, tag e segno (+ buono / - problematico) */
const SKILLS = {
  chef:          { name:'CHEF', desc:'Cucina come un topo di ristorante: cibo più economico e serate migliori.', sign:+1, tags:['cooking','food'] },
  re_grigliata:  { name:'RE DELLA GRIGLIATA', desc:'La grigliata raddoppia. Il vicino chiama la polizia. Un capolavoro.', sign:+1, tags:['grill','food','chaos'] },
  pilota:        { name:'PILOTA', desc:'Guida meglio di Google Maps: viaggi più economici e zero imprevisti.', sign:+1, tags:['driving','travel'] },
  gps_umano:     { name:'GPS UMANO', desc:'Conosce scorciatoie che non esistono. Viaggi quasi gratis.', sign:+1, tags:['driving','travel','economy'] },
  intrattenitore:{ name:'INTRATTENITORE', desc:'+Felicità ovunque. Le serate prendono fuoco (in senso buono).', sign:+1, tags:['happy'] },
  economista:    { name:'ECONOMISTA', desc:'“Aspetta, ho un coupon.” Costi ridotti e stipendi più grassi.', sign:+1, tags:['economy','money'] },
  dj:            { name:'DJ IMPROVVISATO', desc:'Parte a sorpresa. +Divertimento nelle feste, anche da spento.', sign:+1, tags:['party','happy'] },
  organizzatore: { name:'ORGANIZZATORE', desc:'“Ho prenotato tutto io.” Eventi più economici.', sign:+1, tags:['economy','events'] },
  fortunato:     { name:'FORTUNATO', desc:'Trova le chiavi, il ghiaccio, il portafoglio. Ogni volta.', sign:+1, tags:['luck'] },
  divanologo:    { name:'DIVANOLOGO', desc:'Maestro del divano. Recupera energia ovunque, anche in piedi.', sign:+1, tags:['energy'] },
  non_dorme_mai: { name:'NON DORME MAI', desc:'Caffè per sbaglio. L\'energia non finisce mai (quasi).', sign:+1, tags:['energy'] },
  macchina_piena:{ name:'MACCHINA PIENA', desc:'“C\'è sempre un posto.” +1 posto in ogni auto.', sign:+1, tags:['car','space'] },
  scrocco:       { name:'SCROCCO PROFESSIONISTA', desc:'“Ah, pago dopo.” A volte risparmia. Ironicamente.', sign:-1, tags:['economy','chaos'] },
  portafoglio_vuoto:{ name:'PORTAFOGLIO VUOTO', desc:'“Ma non avevi già pagato?” Eventi negativi più probabili.', sign:-1, tags:['luck','chaos'] },
  arriva_sempre_tardi:{ name:'ARRIVA SEMPRE TARDI', desc:'Sempre. In ritardo. Di 45 minuti.', sign:-1, tags:['chaos','time'] },
  patatine:      { name:'ESPERTO DI PATATINE', desc:'Trova le patatine migliori. Sempre.', sign:+1, tags:['food','happy'] }
};