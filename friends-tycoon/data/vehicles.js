/* VEHICLES — parco macchine. Data-driven. */
const VEHICLES = [
  {
    id:'macchina_scassata', name:'La Scassata', emoji:'🚙', price:0,
    seats:4, speed:2, comfort:1, reliability:35, style:1, trunk:2,
    desc:'Ha tre portiere e una non si apre mai. Il motore ha un\'anima: una triste.'
  },
  {
    id:'city_car', name:'City Car', emoji:'🚗', price:2500,
    seats:4, speed:3, comfort:2, reliability:75, style:3, trunk:3,
    desc:'Piccola, parcheggia ovunque, beve poco. Il primo passo da persone serie.'
  },
  {
    id:'berlina', name:'La Berlina', emoji:'🚘', price:8000,
    seats:5, speed:4, comfort:4, reliability:85, style:5, trunk:5,
    desc:'Lussuosa. Dentro ci si parla a bassa voce, come in banca.'
  },
  {
    id:'van', name:'Il Van delle Occasioni', emoji:'🚐', price:15000,
    seats:8, speed:3, comfort:3, reliability:80, style:4, trunk:9,
    desc:'Otto posti, un frigo, il terzo pollo arrosto. La scelta giusta per la tribù.'
  },
  {
    id:'suv', name:'SUV Truffaldino', emoji:'🚙', price:22000,
    seats:7, speed:4, comfort:5, reliability:78, style:6, trunk:7,
    desc:'Guida alta, sguardo fiero, parcheggia come un elefante gentile.'
  },
  {
    id:'cabrio', name:'Cabrio dei Sogni', emoji:'🏎️', price:30000,
    seats:4, speed:5, comfort:4, reliability:82, style:9, trunk:3,
    desc:'Scoperta. Tutti i capelli in aria e la voce che vola. Estate eterna.'
  },
  {
    id:'sportiva', name:'Sportiva Veloce e Scontrosa', emoji:'🏎️', price:60000,
    seats:2, speed:6, comfort:3, reliability:70, style:10, trunk:1,
    desc:'Due posti, zero lamentele: chi sale lascia il bagaglio a casa.'
  },
  {
    id:'limousine', name:'Limousine Assurda', emoji:'🚌', price:120000,
    seats:10, speed:3, comfort:6, reliability:88, style:10, trunk:10,
    desc:'Dentro c\'è un bancone. Il conducente ha giurato di non raccontare nulla.'
  }
];

/* Servizio taxi: prezzo per posto */
const TAXI = { name:'Taxi', pricePerSeat:12, emoji:'🚕', seats:99, desc:'Per chi non c\'è proprio posto. Il tassista conosce già tutta la storia.' };