/* I DUE LUMI — tile procedurali + mappe delle zone */
const TILES = {};

function mkTile(name, draw){
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  draw(x);
  TILES[name] = c;
}

function seeded(n){
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ---- definizione tile ---- */
mkTile('grass', x => {
  const r = seeded(1);
  x.fillStyle = hex(PAL.sage); x.fillRect(0,0,16,16);
  for(let i=0;i<22;i++){ x.fillStyle = hex(PAL.moss); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  for(let i=0;i<8;i++){ x.fillStyle = hex(PAL.leaf); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  for(let i=0;i<4;i++){ x.fillStyle = hex(PAL.moss); x.fillRect(Math.floor(r()*14)+1, Math.floor(r()*13)+1, 2, 1); }
});

mkTile('dirt', x => {
  const r = seeded(2);
  x.fillStyle = hex(PAL.wheat); x.fillRect(0,0,16,16);
  for(let i=0;i<26;i++){ x.fillStyle = hex(PAL.cocoa); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  for(let i=0;i<8;i++){ x.fillStyle = hex(PAL.honey); x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 2, 1); }
  for(let i=0;i<3;i++){ x.fillStyle = hex(PAL.slate); x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 2, 2); }
});

mkTile('stone', x => {
  const r = seeded(3);
  x.fillStyle = hex(PAL.slate); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.fog); x.fillRect(1,1,6,2); x.fillRect(9,4,5,2); x.fillRect(3,9,6,2); x.fillRect(10,11,4,2);
  x.fillStyle = hex(PAL.inkSoft);
  for(let i=0;i<4;i++){ x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 1, 2); }
});

mkTile('water', x => {
  x.fillStyle = hex(PAL.dusk); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.mist);
  x.fillRect(0,3,16,1); x.fillRect(0,8,16,1); x.fillRect(0,12,16,1);
  x.fillStyle = hex(PAL.sky);
  x.fillRect(2,4,4,1); x.fillRect(9,9,5,1); x.fillRect(5,13,3,1);
});

mkTile('flowers', x => {
  const r = seeded(4);
  x.fillStyle = hex(PAL.sage); x.fillRect(0,0,16,16);
  for(let i=0;i<18;i++){ x.fillStyle = hex(PAL.moss); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  const cs = [PAL.rose, PAL.honey, PAL.gold, PAL.blush, PAL.pumpkin];
  for(let i=0;i<7;i++){
    const cx = 2 + Math.floor(r()*12), cy = 2 + Math.floor(r()*12);
    x.fillStyle = hex(PAL.leaf); x.fillRect(cx, cy+1, 1, 2);
    x.fillStyle = hex(cs[i%cs.length]);
    x.fillRect(cx, cy, 1, 1); x.fillRect(cx-1, cy-1, 1, 1); x.fillRect(cx+1, cy-1, 1, 1); x.fillRect(cx-1, cy+1, 1, 1); x.fillRect(cx+1, cy+1, 1, 1);
    x.fillStyle = hex(PAL.gold); x.fillRect(cx, cy-1, 1, 1);
  }
});

mkTile('canopy', x => {
  const r = seeded(5);
  x.fillStyle = hex(PAL.leaf); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.moss);
  x.fillRect(0,12,16,4);
  for(let i=0;i<16;i++){ x.fillStyle = hex(PAL.sage); x.fillRect(Math.floor(r()*15), Math.floor(r()*13), 2, 2); }
  for(let i=0;i<6;i++){ x.fillStyle = hex(PAL.ink); x.fillRect(Math.floor(r()*15), Math.floor(r()*13), 1, 1); }
  for(let i=0;i<5;i++){ x.fillStyle = hex(PAL.honey); x.fillRect(Math.floor(r()*14)+1, 1+Math.floor(r()*10), 2, 1); }
});

mkTile('trunk', x => {
  x.fillStyle = hex(PAL.cocoa); x.fillRect(4,0,8,16);
  x.fillStyle = hex(PAL.inkSoft); x.fillRect(5,0,1,16); x.fillRect(10,0,1,16);
  x.fillStyle = hex(PAL.honey); x.fillRect(7,2,2,3); x.fillRect(7,8,2,3);
});

mkTile('wall', x => {
  const r = seeded(6);
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.amber);
  for(let i=0;i<4;i++) x.fillRect(0, i*4+3, 16, 1);
  for(let i=0;i<4;i++) x.fillRect((i%2)*8 + (i<2?0:8) , 0, 1, 16);
  for(let i=0;i<10;i++){ x.fillStyle = hex(PAL.inkSoft); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  for(let i=0;i<4;i++){ x.fillStyle = hex(PAL.cream); x.fillRect(Math.floor(r()*14)+1, Math.floor(r()*14)+1, 2, 2); }
});

mkTile('roof', x => {
  const r = seeded(7);
  x.fillStyle = hex(PAL.terracotta); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.rust);
  for(let i=0;i<4;i++) x.fillRect(0, i*4+2, 16, 2);
  x.fillStyle = hex(PAL.pumpkin);
  for(let i=0;i<8;i++) x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 2, 1);
});

mkTile('window', x => {
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.amber); x.fillRect(0,0,16,2); x.fillRect(0,14,16,2); x.fillRect(0,0,2,16); x.fillRect(14,0,2,16);
  x.fillStyle = hex(PAL.gold); x.fillRect(3,3,10,10);
  x.fillStyle = hex(PAL.sky); x.fillRect(4,4,8,8);
  x.fillStyle = hex(PAL.amber); x.fillRect(7,3,2,10); x.fillRect(3,7,10,2);
});

mkTile('door', x => {
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.amber); x.fillRect(0,0,16,2); x.fillRect(0,14,16,2); x.fillRect(0,0,2,16); x.fillRect(14,0,2,16);
  x.fillStyle = hex(PAL.cocoa); x.fillRect(2,2,12,14);
  x.fillStyle = hex(PAL.inkSoft); x.fillRect(2,2,12,1); x.fillRect(2,14,12,1); x.fillRect(2,2,1,14); x.fillRect(13,2,1,14);
  x.fillStyle = hex(PAL.gold); x.fillRect(11,8,2,2);
});

mkTile('dooropen', x => {
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.amber); x.fillRect(0,0,16,2); x.fillRect(0,14,16,2); x.fillRect(0,0,2,16); x.fillRect(14,0,2,16);
  x.fillStyle = hex(PAL.night); x.fillRect(2,2,12,14);
  x.fillStyle = hex(PAL.gold); x.fillRect(2,2,12,2);
});

mkTile('bridge', x => {
  x.fillStyle = 'rgba(0,0,0,0)';
  x.clearRect(0,0,16,16);
  x.fillStyle = hex(PAL.wheat); x.fillRect(0,6,16,4);
  x.fillStyle = hex(PAL.honey); x.fillRect(0,6,16,1); x.fillRect(0,9,16,1);
  x.fillStyle = hex(PAL.cocoa);
  x.fillRect(1,7,2,2); x.fillRect(7,7,2,2); x.fillRect(13,7,2,2);
  x.fillStyle = hex(PAL.ink); x.fillRect(0,6,16,1);
});

mkTile('breakable', x => {
  const r = seeded(8);
  x.fillStyle = hex(PAL.slate); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.fog); x.fillRect(1,1,6,2); x.fillRect(9,4,5,2); x.fillRect(3,9,6,2);
  x.fillStyle = hex(PAL.inkSoft);
  x.fillRect(7,0,2,16); x.fillRect(0,7,16,2);
  for(let i=0;i<3;i++) x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 1, 2);
});

mkTile('switch', x => {
  x.fillStyle = hex(PAL.slate); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.fog); x.fillRect(1,1,6,2);
  x.fillStyle = hex(PAL.gold); x.fillRect(4,8,8,4);
  x.fillStyle = hex(PAL.ink); x.fillRect(4,8,8,1); x.fillRect(4,11,8,1); x.fillRect(4,8,1,4); x.fillRect(11,8,1,4);
  x.fillStyle = hex(PAL.amber); x.fillRect(7,12,2,2);
});

mkTile('memory', x => {
  x.fillStyle = hex(PAL.sage); x.fillRect(0,0,16,16);
  for(let i=0;i<10;i++){ x.fillStyle = hex(PAL.moss); x.fillRect((i*5)%16, (i*7)%14, 1, 1); }
  x.fillStyle = hex(PAL.rose); x.fillRect(6,6,4,4);
  x.fillStyle = hex(PAL.blush); x.fillRect(5,5,6,6);
  x.fillStyle = hex(PAL.milk); x.fillRect(7,7,2,2);
});

mkTile('void', x => {
  x.fillStyle = '#0d0b09'; x.fillRect(0,0,16,16);
  const r = seeded(9);
  for(let i=0;i<4;i++){ x.fillStyle = hex(PAL.fog); x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 1, 1); }
});

mkTile('fence', x => {
  x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0,0,16,16);
  x.fillStyle = hex(PAL.cocoa);
  x.fillRect(2,2,2,14); x.fillRect(12,2,2,14);
  x.fillRect(0,5,16,2); x.fillRect(0,9,16,2);
  x.fillStyle = hex(PAL.honey);
  x.fillRect(1,6,14,1); x.fillRect(1,10,14,1);
});

mkTile('wheat', x => {
  x.fillStyle = hex(PAL.wheat); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.butter);
  for(let i=0;i<8;i++){ x.fillRect(i*2, 3, 1, 12); x.fillRect(i*2, 2, 1, 1); }
  x.fillStyle = hex(PAL.honey);
  for(let i=0;i<8;i++){ x.fillRect(i*2, 8, 1, 7); }
});

mkTile('honeywood', x => {
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.amber); x.fillRect(0,0,16,2); x.fillRect(0,8,16,1);
  x.fillStyle = hex(PAL.cream); x.fillRect(3,3,2,4); x.fillRect(9,10,2,5);
  x.fillStyle = hex(PAL.inkSoft); x.fillRect(0,14,16,2);
});

mkTile('crate', x => {
  x.fillStyle = hex(PAL.cocoa); x.fillRect(0,0,16,16);
  x.fillStyle = hex(PAL.honey); x.fillRect(0,0,16,1); x.fillRect(0,15,16,1); x.fillRect(0,0,1,16); x.fillRect(15,0,1,16);
  x.fillStyle = hex(PAL.amber); x.fillRect(7,0,2,16); x.fillRect(0,7,16,2);
});

mkTile('path', x => {
  const r = seeded(10);
  x.fillStyle = hex(PAL.dirt); x.fillRect(0,0,16,16);
  for(let i=0;i<22;i++){ x.fillStyle = hex(PAL.wheat); x.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1); }
  for(let i=0;i<5;i++){ x.fillStyle = hex(PAL.slate); x.fillRect(Math.floor(r()*15), Math.floor(r()*15), 2, 1); }
});

/* ---- legenda mappe ---- */
const MAPLEGEND = {
  ' ': { name:'air', solid:false, draw:false },
  '.': { name:'grass', solid:false },
  ',': { name:'path', solid:false },
  'F': { name:'flowers', solid:false },
  '%': { name:'wheat', solid:false },
  '#': { name:'stone', solid:true },
  'w': { name:'water', solid:true },
  'T': { name:'canopy', solid:true },
  't': { name:'trunk', solid:true },
  '^': { name:'wall', solid:true },
  '~': { name:'roof', solid:true },
  'W': { name:'window', solid:true },
  'D': { name:'door', solid:true, door:true },
  'B': { name:'bridge', solid:false },
  'X': { name:'breakable', solid:true, breakable:true },
  'S': { name:'switch', solid:false, sw:true },
  'M': { name:'memory', solid:false, mem:true },
  'G': { name:'void', solid:true, void:true },
  'f': { name:'fence', solid:true },
  'H': { name:'honeywood', solid:false },
  'C': { name:'crate', solid:true },
  'o': { name:'water', solid:true },
};

/* collisione per carattere: 0 niente, 1 solido, 2 one-way */
function tileSolid(ch){
  const t = MAPLEGEND[ch];
  if(!t) return 0;
  if(t.solid === 'oneway') return 2;
  if(t.solid) return 1;
  return 0;
}
function tileName(ch){ const t = MAPLEGEND[ch]; return t ? t.name : null; }

/* ---- zone ---- */
const ZONES = {
  hub:   { sky:['sky','butter'], fog:0.0, song:'hub' },
  meadow:{ sky:['sky','butter'], fog:0.0, song:'meadow' },
  forest:{ sky:['mist','dusk'],  fog:0.25, song:'forest' },
  coast: { sky:['mist','slate'], fog:0.5, song:'coast' },
  wind:  { sky:['dusk','sky'],   fog:0.5, song:'coast' },
  final: { sky:['slate','fog'],  fog:0.8, song:'finale' },
  dark:  { sky:['night','slate'],fog:0.9, song:'crisis' },
};

const ROOMS = {};

function room(id, opts){
  const map = opts.map;
  const w = map[0].length * 16, h = map.length * 16;
  ROOMS[id] = Object.assign({ id, w, h }, opts);
  return ROOMS[id];
}
/* =========================================================
   MAPPE (top-down)
   leggenda: ' ' aria, . erba, , sentiero, F fiori, % grano,
   # pietra, w acqua, T chioma, t tronco, ^ muro, ~ tetto,
   W finestra, D porta(lucchetto), B ponte, X blocca(b),
   S interruttore, M memoria, G baratro, f recinto, H legno,
   C cassa
   ========================================================= */

room('hubA', {
  zone:'hub',
  map:[
    "##################################",
    "#F...............TTT.....TTT.....#",
    "#....,,,........TTTTT...TTTTT....#",
    "#...F,,,F........TtT.....TtT.....#",
    "#......,,.........tt......tt.....#",
    "#..............^^^~~~~~^^^^......#",
    "#.............^HHHHHHHHHHH^......#",
    "#...%%,,,......^HHHHHHHHHH^......#",
    "#...%%,,,......^HHHHHHHHHHH^.....#",
    "#...%%.........^~~~~~~~~~~~^.....#",
    "#.............^^^^^^^D^^^........#",
    "#..........F..................F..#",
    "#......%......................F..#",
    "#......%%..........F........F....#",
    "#.....,,,,,..............F........",
    "#.....,,,,,...........,,,,........",
    "#.....,,,,,...........,,,,........",
    "#......%.................,,,.....#",
    "#......F.........F..........F....#",
    "#...F............F.............F.#",
    "#........F..........F............#",
    "##################################",
  ],
  spawn:{"x":36,"y":320},
  exits:{"right":{"to":"meadowA","x":4,"y":240}},
  doors:[{"tx":21,"ty":10,"to":"hubShop","spawn":{"x":344,"y":232}}],
  npcs:[{"id":"nonna","x":330,"y":210,"w":16,"h":18},{"id":"signora","x":120,"y":100,"w":16,"h":18},{"id":"falco","x":470,"y":240,"w":16,"h":18}],
});

room('hubShop', {
  zone:'hub',
  map:[
    "##################################",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "#^HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH^#",
    "####################...###########",
  ],
  spawn:{"x":344,"y":232},
  exits:{"down":{"to":"hubA","x":344,"y":192}},
  npcs:[{"id":"nonna","x":240,"y":120,"w":16,"h":18}],
});

room('meadowA', {
  zone:'meadow',
  map:[
    "####################################",
    "#F.......F.....TTT......F........F.#",
    "#....F.....F..TTTTT.........F......#",
    "#.............TtT....F......F......#",
    "#..F......F.....tt......F........F.#",
    "#...........F...........F..........#",
    "#....F............F..............F.#",
    "#.........F................F.......#",
    "#..........w..w.......F.........F..#",
    "#..........w..w....................#",
    "#.........wwBww......F....F........#",
    "#.........wwBww....................#",
    "#..............wwww.........F......#",
    "#...F..........wwww...........F....#",
    "#..............wwww.......F........#",
    "..........F....wwww.....F........F..",
    ".................F..............F...",
    "....F...........F................F..",
    "#..........F................F......#",
    "#......F............F............F.#",
    "#.F..............F..........F......#",
    "####################################",
  ],
  spawn:{"x":20,"y":240},
  exits:{"left":{"to":"hubA","x":538,"y":240},"right":{"to":"meadowB","x":4,"y":240}},
  enemies:[{"id":"ombra","x":200,"y":120}],
  mem:[{"id":1,"x":80,"y":320}],
  npcs:[{"id":"bambina","x":300,"y":320,"w":16,"h":18}],
});

room('meadowB', {
  zone:'meadow',
  map:[
    "####################################",
    "#F.......F......TTT.......F........#",
    "#....F.....F..TTTTT....F.......F...#",
    "#.............TtT......F....F......#",
    "#..F......F.....tt......F........F.#",
    "#...........F...........F..........#",
    "#....F............F..............F.#",
    "#.........F................F.......#",
    "#.......w..w..........F.......F....#",
    "#.......w..w.......................#",
    "#......wwBww..........F..........F.#",
    "#......wwBww.......................#",
    "#.............ww...........F.......#",
    "#..F.........ww..........F.........#",
    "#.............ww........F..........#",
    "..........F....ww....F..........F...",
    ".................F..............F...",
    "....F...........F................F..",
    "#..........F................F......#",
    "#......F............F............F.#",
    "#.F..............F..........F......#",
    "####################################",
  ],
  spawn:{"x":20,"y":240},
  exits:{"left":{"to":"meadowA","x":570,"y":240},"right":{"to":"forestA","x":4,"y":240}},
  enemies:[{"id":"lucciola","x":150,"y":120},{"id":"ombra","x":300,"y":320}],
  mem:[{"id":2,"x":520,"y":120}],
  npcs:[{"id":"contadina","x":200,"y":320,"w":16,"h":18}],
});

room('forestA', {
  zone:'forest',
  map:[
    "####################################",
    "#T..T......TTT.............TT......#",
    "#.t........TTTTT..TTTT..F.....t....#",
    "#TTTTT.......TtT..TtT............TT#",
    "#....t.......tt....tt....F.........#",
    "#....TTT...................F.......#",
    "#.t.............F.................T#",
    "#....T...TTTT..........TTT.........#",
    "#........t....T...........t........#",
    "#....F.......X..............F......#",
    "#...........XX.......F.............#",
    "#..F........X.......TTT............#",
    "#...........X..........t...........#",
    "#..T.....F.............T...........#",
    "#...t...........F..................#",
    "............F.............T...F.....",
    "...T..................t......t......",
    "....t....F..............T..F........",
    "#..............F..............F....#",
    "#...F.................F............#",
    "#.....F.......F..............F.....#",
    "####################################",
  ],
  spawn:{"x":20,"y":240},
  exits:{"left":{"to":"meadowB","x":570,"y":240},"right":{"to":"forestB","x":4,"y":240}},
  enemies:[{"id":"ombra","x":250,"y":140}],
  mem:[{"id":3,"x":60,"y":300}],
  npcs:[{"id":"custodeeco","x":200,"y":320,"w":24,"h":20}],
});

room('forestB', {
  zone:'forest',
  map:[
    "#####################################",
    "#.T...T......TTT............TTT.....#",
    "#..t........TTTTT...F.....TTTTT.....#",
    "#T.......T....TtT...........TtT.....#",
    "#..t....TTT....tt....F......tt......#",
    "#.......T.....F......TTT............#",
    "#..........F........t......F........#",
    "#....T..........F....T...F..........#",
    "#...t...F.........S.............F...#",
    "#......F.........###...............T#",
    "#.T....F.....................F....t.#",
    "#..t.............F..................#",
    "#......F..............F......F......#",
    "#............F......................#",
    "#....F...............X..............#",
    "....................XX.......FXXD...#",
    ".....T..........F..X..............F.#",
    "......t..........F..................#",
    "#............F..........TT........F.#",
    "#......F.................t........T.#",
    "#..T.............F..........F...t...#",
    "#...t............F.......F..........#",
    "#..........F..........F.............#",
    "#####################################",
  ],
  spawn:{"x":20,"y":240},
  exits:{"left":{"to":"forestA","x":586,"y":240}},
  doors:[{"tx":32,"ty":15,"to":"forestC","spawn":{"x":20,"y":224},"switch":"sw1"}],
  switches:[{"tx":18,"ty":8,"flag":"sw1"}],
  enemies:[{"id":"lucciola","x":250,"y":160}],
  mem:[{"id":4,"x":150,"y":320}],
});

room('forestC', {
  zone:'forest',
  map:[
    "####################################",
    "#T.T..........TTT............T.....#",
    "#..t...F....TTTTT..F....F...t......#",
    "#...T........TtT................TT.#",
    "#....t......Ftt...TT.......F....t..#",
    "#.......F...........t.....T........#",
    "#..T.............F..........t......#",
    "#...t..........F..............T....#",
    "#..........F..........F........t...#",
    "#...T................F.............#",
    "#....t....F..................F.....#",
    "#.............F....................#",
    "#..F............F.......F...........",
    "#...............F...................",
    "#..........F..........F.............",
    "#...T...................F........F.#",
    "#....t....F.......................t#",
    "#..............F.................T.#",
    "#...T..........F......F............#",
    "#....t.....F...............F.......#",
    "#......F........F..........F.......#",
    "####################################",
  ],
  spawn:{"x":20,"y":224},
  exits:{"right":{"to":"coastA","x":4,"y":200}},
  mem:[{"id":5,"x":350,"y":180}],
  boss:"custode",
  bossAt:420,
});

room('coastA', {
  zone:'coast',
  map:[
    "####################################",
    "#F..........F..........F..........F#",
    "#....F........w..w........F........#",
    "#..........w......w....F......F....#",
    "#.....w...w........w......F........#",
    "#F.....w............w.............F#",
    "#...F..w....F........w.......F.....#",
    "#.......w.........F..w......F......#",
    "#......wwww.............ww.........#",
    "#.......F........wwww....F.........#",
    "#......F..........F..ww...F........#",
    "#............F.......w...F.........#",
    "...F................ww............F.",
    "......F..........F..................",
    "..........F.............F...........",
    "#...F...............F............F.#",
    "#......F.........F........F........#",
    "#............F................F....#",
    "#..F............F......F...........#",
    "#.........F...........F............#",
    "#......F........F..........F.......#",
    "####################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"forestC","x":570,"y":200},"right":{"to":"coastB","x":4,"y":200}},
  enemies:[{"id":"ombra","x":250,"y":120}],
  mem:[{"id":6,"x":80,"y":120}],
  npcs:[{"id":"focascena","x":300,"y":320,"w":24,"h":18}],
});

room('coastB', {
  zone:'coast',
  map:[
    "####################################",
    "#..F..........F..........F.........#",
    "#.....F.....w..w..........F........#",
    "#..F......w......w....F......F.....#",
    "#.......w...w......w......F........#",
    "#F.......w............w.........F..#",
    "#....F...w....F........w......F....#",
    "#........w.........F..w......F.....#",
    "#......wwww............ww..........#",
    "#.......F......wwww...F............#",
    "#.....F........F..ww....F........F.#",
    "#.........F.......w....F...........#",
    "....F...............ww..........F...",
    ".........F..........F...............",
    ".....F.........F.............F......",
    "#........F..............F........F.#",
    "#.F...........F........F...........#",
    "#....F..............F........F.....#",
    "#..F........F.........F............#",
    "#.........F..........F.............#",
    "#....F........F...........F........#",
    "####################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"coastA","x":570,"y":200},"right":{"to":"windA","x":4,"y":200}},
  mem:[{"id":7,"x":350,"y":200}],
  boss:"foca",
  bossAt:400,
});

room('windA', {
  zone:'wind',
  map:[
    "######################################",
    "#............F.............F.........#",
    "#.......F...........F...........F....#",
    "#.........F..M..F.....F..............#",
    "#.....F..........F...........F.......#",
    "#.........BBBBBB.........F...........#",
    "#.......BBBBBBBBBB.......F..........F#",
    "#..........F.....BBBBBB..............#",
    "#......F..............F.........F....#",
    "#..........BBBBBB.........F..........#",
    "#........BBBBBBBBBB......F..........F#",
    "#.........F......F.....F.............#",
    "........F........BBBBBB...............",
    "...........BBBBBBBBB........F.........",
    "......F..........F..........F.........",
    "#............GGGGGGGG..............F.#",
    "#..........GGGGGGGGGG....F...........#",
    "#.........GGGGGGGGGGGG...............#",
    "#...F.......GGGGGGGGGGGG.........F...#",
    "#............F..........F..........F.#",
    "#..F..........F..............F.......#",
    "######################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"coastB","x":570,"y":200},"right":{"to":"windB","x":4,"y":200}},
  enemies:[{"id":"lucciola","x":280,"y":170}],
  mem:[{"id":8,"x":250,"y":100}],
});

room('windB', {
  zone:'wind',
  map:[
    "####################################",
    "#.F...........F..........F........F#",
    "#....F...........F............F....#",
    "#......F.......F........F..........#",
    "#.F..........F..........F........F.#",
    "#....F.......F....F.........F......#",
    "#........F..............F........F.#",
    "#....F...........F..........F......#",
    "#......F..........F..............F.#",
    "#..F.......F..........F........F...#",
    "#........F..............F..........#",
    "#....F..........F..........F.......#",
    "...........F..........F........F....",
    "...F..............F..............F..",
    "......F.........F........F..........",
    "#....F..........F.........F......F.#",
    "#...........F..........F...........#",
    "#......F......F..........F.........#",
    "#...F..............F...........F...#",
    "#..........F........F..........F...#",
    "#.F.........F.......F..........F...#",
    "####################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"windA","x":570,"y":200},"right":{"to":"finalA","x":4,"y":200}},
  mem:[{"id":9,"x":350,"y":200}],
  boss:"vento",
  bossAt:400,
});

room('finalA', {
  zone:'final',
  map:[
    "####################################",
    "#...............................F..#",
    "#..F...................F..........F#",
    "#................F...........F.....#",
    "#....F...............F............F#",
    "#........F.....................F...#",
    "#...F....................F.........#",
    "#..............F...................#",
    "#....F.........F........F..........#",
    "#..................F...........F...#",
    "#........F......................F..#",
    "#..F..........F............F.......#",
    "..................F.................",
    ".......F.................F........F.",
    "...........F..................F.....",
    "#..F........................F......#",
    "#.............F..........F.........#",
    "#....F..................F........F.#",
    "#...........F......................#",
    "#..F.............F.........F.......#",
    "#.........F...................F....#",
    "####################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"windB","x":570,"y":200},"right":{"to":"finalB","x":4,"y":200}},
  enemies:[{"id":"ombra","x":200,"y":120},{"id":"lucciola","x":400,"y":300}],
  mem:[{"id":10,"x":80,"y":120}],
});

room('finalB', {
  zone:'final',
  map:[
    "########################################",
    "#.F.........F..........F.............F.#",
    "#..F...........F..........F..........F.#",
    "#....F........F..........F........F....#",
    "#.F.........F.........F............F...#",
    "#...........F.........F..........F....F#",
    "#....F..........F...........F..........#",
    "#.......F.........F...........F.......F#",
    "#..F.............F................F....#",
    "#..........F.......X.............F.....#",
    "#.F........F.....XXX......F..........F.#",
    "#....F..........XXX........F....F......#",
    "........F.......XXX.............F.......",
    "...........F......X............F........",
    ".....F..........F.........F..........F..",
    "#...........F........S....D..F.........#",
    "#..F.........F................F......F.#",
    "#......F..........F........F...........#",
    "#...........F.........F..............F.#",
    "#....F.........F.........F........F....#",
    "#..F.........F.............F........F..#",
    "########################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"finalA","x":570,"y":200},"right":{"to":"finalC","x":4,"y":200}},
  doors:[{"tx":26,"ty":15,"to":"specchio","spawn":{"x":80,"y":224},"switch":"sw2"}],
  switches:[{"tx":21,"ty":15,"flag":"sw2"}],
  blocks:[{"tx":5,"ty":12,"tx2":7,"ty2":12}],
  enemies:[{"id":"ombra","x":200,"y":120}],
  mem:[{"id":11,"x":60,"y":120}],
});

room('finalC', {
  zone:'final',
  map:[
    "######################################",
    "#.......F..........F..........F......#",
    "#..F............F........F...........#",
    "#........F...........F..........F....#",
    "#....F........F...........F.........F#",
    "#...........F............F...........#",
    "#..F..........F.........F............#",
    "#.....F........F..........F.......F..#",
    "#.........F..............F..........F#",
    "#..F.............F.........F.........#",
    "#...........F...........F..........F.#",
    "#....F..........F.........F..........#",
    "...........F.............F..........F#",
    ".....F.............F............F....#",
    "............F...........F.........F..#",
    "#..F.................F............F..#",
    "#.....F...........F.........F........#",
    "#..........F............F..........F.#",
    "#....F..........F.........F..........#",
    "#..........F............F........F...#",
    "#.....F.......F.........F............#",
    "######################################",
  ],
  spawn:{"x":20,"y":200},
  exits:{"left":{"to":"finalB","x":634,"y":200}},
  mem:[{"id":12,"x":120,"y":120}],
  boss:"ramenta",
  bossAt:560,
});

room('specchio', {
  zone:'dark',
  map:[
    "#################################.#",
    "#........F...........F............#",
    "#...F...........F...........F.....#",
    "#........F........F........F......#",
    "#....F.........F..............F...#",
    "#...........F...........F.........#",
    "#....F..........F...........F.....#",
    "#..........F........F..........F..#",
    "#....F..........F...........F.....#",
    "#...........F..........F..........#",
    "#......F...........F............F.#",
    "#..........F........F...........F.#",
    "#....F..............F..........F..#",
    "#...........F.............F.......#",
    ".......F..........F..........F....#",
    "...........F........F.........F...#",
    ".....F..........F..............F..#",
    "#........F.........F............F.#",
    "#..........F..........F...........#",
    "#################################.#",
  ],
  spawn:{"x":80,"y":224},
  exits:{"left":{"to":"finalB","x":634,"y":224}},
  boss:"specchio",
  bossAt:300,
});
