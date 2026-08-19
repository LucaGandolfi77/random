/* I DUE LUMI — oggetti, negozi, equipaggiamento */
const ITEMS = {
  pane:   { name:'Pane al Miele',   desc:'Ridà 12 PV a un fratello.', kind:'heal', heal:12, price:4 },
  te:     { name:'Tè Caldo',        desc:'Ridà 30 PV e calma la Nebbia.', kind:'heal', heal:30, cure:true, price:10 },
  marm:   { name:'Marmellata',      desc:'Risveglia un fratello e cura metà.', kind:'revive', heal:0.5, price:18 },
  conch:  { name:'Conchiglia',      desc:'+2 Difesa per lo scontro.', kind:'buff', stat:'def', amt:2, price:14 },
  incenso:{ name:'Incenso',         desc:'+3 Potenza per lo scontro.', kind:'buff', stat:'pow', amt:3, price:16 },
  tigre:  { name:'Tè della Madre',  desc:'Ridà tutti i PV a entrambi.', kind:'healall', heal:999, cure:true, price:0 },
  stella: { name:'Stellina',        desc:'Una piccola stella. Riscaldala.', kind:'story', price:0 },
};

const SHOP = {
  hub: [ 'pane', 'te', 'marm', 'conch', 'incenso' ],
};

const EQUIPS = {
  foulard:  { name:'Foulard di Milo',   stat:'def', amt:2, who:'milo' },
  lanterna: { name:'Lanterna di Tito',  stat:'pow', amt:2, who:'tito' },
  stivali:  { name:'Stivali del Vento', stat:'spd', amt:2, who:'tito' },
  cappotto: { name:'Cappotto di Nonna', stat:'def', amt:2, who:'milo' },
};

const GROWTH = {
  hp:  (lvl) => 3 + lvl*2,
  pow: (lvl) => 1 + Math.floor(lvl/2),
  def: (lvl) => 1 + Math.floor(lvl/3),
  spd: (lvl) => 1 + Math.floor(lvl/2),
};

function xpFor(lvl){ return lvl * 8 + 4; }