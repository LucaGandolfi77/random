/* HOUSES — proprietà e stanze upgradeabili. Data-driven. */
const HOUSES = [
  {
    id:'stanza_studenti', name:'Stanza Studenti', emoji:'🏚️', price:700,
    capacity:6, rooms:2, comfort:2, value:700, parking:0,
    desc:'Una stanza con tre prese e un\'idea. Perfetta per iniziare un impero.',
    allowed:['serata_tranquilla','pizza','film','gaming','grattata','karaoke','festa','aperitivo'],
    rooms:{ divano:true, cucina:true, tv:true, bagno:true, giardino:false, garage:false, piscina:false }
  },
  {
    id:'appartamento', name:'Appartamento', emoji:'🏢', price:5000,
    capacity:8, rooms:3, comfort:4, value:5000, parking:1,
    desc:'Un vero appartamento. Il soggiorno è più grande del bagno, grande vittoria.',
    allowed:['serata_tranquilla','pizza','film','gaming','grattata','karaoke','festa','aperitivo','cena'],
    rooms:{ divano:true, cucina:true, tv:true, bagno:true, giardino:false, garage:true, piscina:false }
  },
  {
    id:'casa', name:'Casa con Giardino', emoji:'🏡', price:25000,
    capacity:10, rooms:5, comfort:6, value:25000, parking:2,
    desc:'Ha un giardino. Il vicino non ha ancora chiamato la polizia. Non aspettatevi che duri.',
    allowed:['serata_tranquilla','pizza','film','gaming','grattata','karaoke','festa','aperitivo','cena','grigliata'],
    rooms:{ divano:true, cucina:true, tv:true, bagno:true, giardino:true, garage:true, piscina:false }
  },
  {
    id:'villa', name:'Villa', emoji:'🏘️', price:90000,
    capacity:14, rooms:8, comfort:9, value:90000, parking:4,
    desc:'Piscina, prato e un campanello che suona come una fanfara. I vicini ora ci invidiano.',
    allowed:['serata_tranquilla','pizza','film','gaming','grattata','karaoke','festa','aperitivo','cena','grigliata','piscina'],
    rooms:{ divano:true, cucina:true, tv:true, bagno:true, giardino:true, garage:true, piscina:true }
  },
  {
    id:'mega_villa', name:'Mega Villa', emoji:'🏰', price:350000,
    capacity:20, rooms:12, comfort:12, value:350000, parking:8,
    desc:'Il quartier generale. Le feste qui hanno un volantino proprio. Forse una religione.',
    allowed:['serata_tranquilla','pizza','film','gaming','grattata','karaoke','festa','aperitivo','cena','grigliata','piscina','discoteca'],
    rooms:{ divano:true, cucina:true, tv:true, bagno:true, giardino:true, garage:true, piscina:true }
  }
];

/* STANZE UPGRADEABILI — pool globale. Ogni casa ne abilita un sottoinsieme. */
const UPGRADES = {
  divano:{
    icon:'🛋️', name:'Divano',
    levels:[
      { label:'Divano del supermercato', cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'Divano decente',          cost:120, comfort:1, capacity:1, happy:3, value:300 },
      { label:'Divano enorme',           cost:400, comfort:2, capacity:2, happy:6, value:1000 },
      { label:'Divano imperiale',        cost:1200, comfort:3, capacity:3, happy:10, value:3000 },
      { label:'Portale dimensionale del relax', cost:4000, comfort:5, capacity:5, happy:16, value:9000 }
    ]
  },
  cucina:{
    icon:'🍳', name:'Cucina',
    levels:[
      { label:'Fornello dubbio',        cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'Fornello decente',       cost:180, comfort:1, capacity:1, happy:3, value:500 },
      { label:'Piano cottura spaziale', cost:600, comfort:2, capacity:1, happy:6, value:1500 },
      { label:'Cucina da chef (con chef dentro)', cost:2200, comfort:3, capacity:2, happy:10, value:5000 }
    ]
  },
  tv:{
    icon:'📺', name:'Televisione',
    levels:[
      { label:'TV a tubo nostalgica',    cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'TV semi-nuova',           cost:150, comfort:1, capacity:1, happy:4, value:400 },
      { label:'TV gigante',              cost:700, comfort:2, capacity:2, happy:8, value:1800 },
      { label:'Cinema privato',          cost:2500, comfort:3, capacity:4, happy:14, value:6000 }
    ]
  },
  bagno:{
    icon:'🛁', name:'Bagno',
    levels:[
      { label:'Acqua fredda costante',   cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'Acqua calda stabile',     cost:100, comfort:1, capacity:0, happy:2, value:250 },
      { label:'Jacuzzi (tollerata)',     cost:900, comfort:2, capacity:1, happy:6, value:2000 }
    ]
  },
  giardino:{
    icon:'🌳', name:'Giardino',
    levels:[
      { label:'Erbacce compagne',        cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'Prati curati',            cost:350, comfort:1, capacity:2, happy:4, value:900 },
      { label:'Angolo barbecue',         cost:800, comfort:1, capacity:2, happy:8, value:2000 }
    ]
  },
  garage:{
    icon:'🚗', name:'Garage',
    levels:[
      { label:'Strada pubblica (friendly)', cost:0, comfort:0, capacity:0, happy:0, value:0, parking:0 },
      { label:'Parcheggio coperto',      cost:400, comfort:1, capacity:0, happy:2, value:1000, parking:1 },
      { label:'Doppio garage',           cost:1200, comfort:1, capacity:0, happy:4, value:3000, parking:2 }
    ]
  },
  piscina:{
    icon:'🏊', name:'Piscina',
    levels:[
      { label:'Piscina (desiderata)',    cost:0, comfort:0, capacity:0, happy:0, value:0 },
      { label:'Piscina gonfiabile',      cost:500, comfort:1, capacity:2, happy:8, value:1200 },
      { label:'Piscina vera',            cost:2000, comfort:2, capacity:4, happy:14, value:5000 }
    ]
  }
};