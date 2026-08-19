/* I DUE LUMI — sprite procedurali (pixel art in codice) */
const SPR = {};
const PORT = {};

function defSprite(name, rows, legend){
  if(typeof document === 'undefined') return null;
  const h = rows.length;
  let w = 0;
  rows.forEach(r => { if(r.length > w) w = r.length; });
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  for(let r=0;r<h;r++){
    const row = rows[r];
    for(let cc=0;cc<row.length;cc++){
      const ch = row[cc];
      if(ch === '.' || ch === ' ') continue;
      const col = (legend && legend[ch]) ? hex(legend[ch]) : PAL.ink;
      x.fillStyle = col;
      x.fillRect(cc, r, 1, 1);
    }
  }
  SPR[name] = c;
  return c;
}

function scaleSprite(name, src, f){
  if(typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = src.width * f; c.height = src.height * f;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height);
  SPR[name] = c;
  return c;
}

/* ============ forme condivise dei fratelli (overworld 12x16) ============ */
const SHAPE = {
  ow_idle: [
    '...OOOO....',
    '..OHHHHHO...',
    '.OHHHHHHHO..',
    '.OSSHHHOO...',
    '.OSESESO....',
    '.OSSSSSO....',
    '.OCSSSCO....',
    '.OCCCCCCCO..',
    '.OCACCCCCO..',
    '.OCCCCCCCO..',
    '..OCCCCCO...',
    '..OCCCCCO...',
    '..ODDDDDO...',
    '..ODDODDO...',
    '..ODDODDO...',
    '..OBBOBBO...',
  ],
  ow_walk1: [
    '...OOOO....',
    '..OHHHHHO...',
    '.OHHHHHHHO..',
    '.OSSHHHOO...',
    '.OSESESO....',
    '.OSSSSSO....',
    '.OCSSSCO....',
    '.OCCCCCCCO..',
    '.OCACCCCCO..',
    '.OCCCCCCCO..',
    '..OCCCCCO...',
    '..OCCCCCO...',
    '..ODDDDDO...',
    '..ODD.DDO...',
    '..ODD.DDO...',
    '..OBB.OBB...',
  ],
  ow_walk2: [
    '...OOOO....',
    '..OHHHHHO...',
    '.OHHHHHHHO..',
    '.OSSHHHOO...',
    '.OSESESO....',
    '.OSSSSSO....',
    '.OCSSSCO....',
    '.OCCCCCCCO..',
    '.OCACCCCCO..',
    '.OCCCCCCCO..',
    '..OCCCCCO...',
    '..OCCCCCO...',
    '..ODDDDDO...',
    '..ODDDDDO...',
    '..ODDDDDO...',
    '..OBBBBBO...',
  ],
  ow_jump: [
    '...OOOO....',
    '..OHHHHHO...',
    '.OHHHHHHHO..',
    '.OSSHHHOO...',
    '.OSESESO....',
    '.OSSSSSO....',
    '.OCSSSCO....',
    '.OCCCCCCCO..',
    '.OCACCCCCO..',
    '.OCCCCCCCO..',
    '..OCCCCCO...',
    '..ODDDDDO...',
    '..ODDDDD0...',
    '..ODDDDD0...',
    '..OBBBBBO...',
    '..OBBBBBO...',
  ],
};

const L_MILO = { O:'ink', H:'cocoa', S:'blush', E:'ink', C:'cream', A:'honey', D:'cocoa', B:'amber', 0:'ink' };
const L_TITO = { O:'ink', H:'pumpkin', S:'blush', E:'ink', C:'butter', A:'rose', D:'inkSoft', B:'terracotta', 0:'ink' };
const L_NONNA = { O:'ink', H:'milk', S:'blush', E:'ink', C:'sage', A:'rose', D:'inkSoft', B:'cocoa', 0:'ink' };
const L_ELIDE = { O:'ink', H:'honey', S:'blush', E:'ink', C:'mist', A:'gold', D:'dusk', B:'cocoa', 0:'ink' };
const L_FALCO = { O:'ink', H:'inkSoft', S:'blush', E:'ink', C:'slate', A:'ember', D:'night', B:'night', 0:'ink' };

const HEROES = { milo: L_MILO, tito: L_TITO };

['milo','tito'].forEach(nm => {
  const L = HEROES[nm];
  defSprite(nm+'_idle', SHAPE.ow_idle, L);
  defSprite(nm+'_walk1', SHAPE.ow_walk1, L);
  defSprite(nm+'_walk2', SHAPE.ow_walk2, L);
  defSprite(nm+'_jump', SHAPE.ow_jump, L);
  scaleSprite(nm+'_idle_b', nm+'_idle', 2);
  scaleSprite(nm+'_walk1_b', nm+'_walk1', 2);
  scaleSprite(nm+'_walk2_b', nm+'_walk2', 2);
  scaleSprite(nm+'_jump_b', nm+'_jump', 2);
});

/* ============ ritratti (piatto colorato + sprite 2x) ============ */
function makePortrait(name, spriteName, accent){
  if(typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const x = c.getContext('2d');
  const src = SPR[spriteName];
  if(!src) return null;
  x.fillStyle = hex(accent);
  x.fillRect(1, 1, 30, 30);
  x.fillStyle = hex(PAL.cream);
  x.fillRect(2, 2, 28, 28);
  x.fillStyle = hex(accent);
  x.fillRect(4, 4, 24, 24);
  x.drawImage(src, 4 + (24 - src.width)/2, 4 + (24 - src.height)/2);
  PORT[name] = c;
  return c;
}
makePortrait('milo', 'milo_idle_b', 'honey');
makePortrait('tito', 'tito_idle_b', 'pumpkin');

/* Nonna — figura anziana (16x16, scalata 2x = 32x32) */
function nonnaPortrait(){
  const rows = [
    '..OOOOOOOOOO..',
    '.OHHHHHHHHHHO.',
    '.OHHHHHHHHHHO.',
    '.OOHHHHHHHHOO.',
    '.OSSSSSSSSSSO.',
    '.OSEESSESSSSO.',
    '.OSSSSSSSSSSO.',
    '..OSSSSSSSSO..',
    '.OOSSSSSSSSOO.',
    '.OSSSSSSSSSSO.',
    '.OSSOSSSSOSSO.',
    '..OSOSSSOSSO..',
    '.OOSSSSSSSSOO.',
    '.OOSSSSSSSSOO.',
    '.OOSSSSSSSSOO.',
    '..OOOOOOOOOO..',
  ];
  defSprite('nonna_art', rows, { O:'ink', H:'milk', S:'blush', E:'ink' });
  scaleSprite('nonna_art2', 'nonna_art', 2);
  PORT.nonna = SPR.nonna_art2;
  PORT.nonna.plate = 'sage';
}
nonnaPortrait();

/* Falcò — viandante mascherato (16x16 -> 32x32) */
function falcoPortrait(){
  const rows = [
    '....OOOOOO....',
    '...OOO..OOO...',
    '..OOO....OOO..',
    '..OO......OO..',
    '..OO.OOOO.OO..',
    '..O.O.OO.O.O..',
    '..O.OOOOO.O...',
    '...OO....OO...',
    '..OOOOOOOOOO..',
    '.OOOOSSSSOOOO.',
    '.OOSSSSSSSOO..',
    '.OOSSSSSSSO...',
    '..OSSSSSSSO...',
    '..OSSSSSSSO...',
    '.OOSSSSSSSSO..',
    '.OOOOOOOOOOOO.',
  ];
  defSprite('falco_art', rows, { O:'ink', S:'blush', 0:'ink' });
  scaleSprite('falco_art2', 'falco_art', 2);
  PORT.falco = SPR.falco_art2;
  PORT.falco.plate = 'slate';
}
falcoPortrait();

/* Elide — figura chiara e lontana */
function elidePortrait(){
  const rows = [
    '..OOOOOOOOOO..',
    '.OHHHHHHHHHHO.',
    '.OHHHHHHHHHHO.',
    '.OOHHHHHHHHOO.',
    '.OSSSSSSSSSSO.',
    '.OSSEESSSSSSO.',
    '.OSSSSSSSSSSO.',
    '..OSSSSSSSSO..',
    '.OOSSSSSSSSOO.',
    '.OSSSSSSSSSSO.',
    '.OSSSSSSSSSSO.',
    '.OOOSSSSSSSOO.',
    '..OOSSSSSSSO..',
    '..OOOSSSSOO...',
    '..OOOOSSOO....',
    '...OOOOOO....',
  ];
  defSprite('elide_art', rows, { O:'ink', H:'honey', S:'blush', E:'ink', 0:'ink' });
  scaleSprite('elide_art2', 'elide_art', 2);
  PORT.elide = SPR.elide_art2;
  PORT.elide.plate = 'mist';
}
elidePortrait();

/* ============ nemici ============ */
/* Ombra — sgretolo di nebbia */
defSprite('ombra', [
  '..OOOOOO....',
  '.OOOOOOOO...',
  '.EEOOOOEE...',
  '.EEOOOOEE...',
  '.OOOOOOOO...',
  '..OOOOOO....',
  '..OO..OO....',
  '..OO..OO....',
], { O:'night', E:'fog' });

defSprite('ombra_b', [
  '..OOOOOOOO..',
  '.OOOOOOOOOO.',
  '.OEEOOOOEEO.',
  '.OEEOOOOEEO.',
  '.OOOOOOOOOO.',
  '..OOOOOOOO..',
  '..OOO..OOO..',
  '..OOO..OOO..',
], { O:'night', E:'fog' });

/* Lucciola grigia */
defSprite('lucciola', [
  '...OOOO.....',
  '..O.OO.O....',
  '..O.OO.O....',
  '...OOOO.....',
  '..OOOOOO....',
  '....OO......',
], { O:'slate' });

/* Custode del Bosco — cervo triste (20x20) */
defSprite('custode', [
  '.OOO........OOO.',
  'OOOOO......OOOOO',
  'OO..OO....OO..OO',
  'OO...OOOOO...OOO',
  '.....OO.OO......',
  '....OSSSSSO.....',
  '....OSESESO.....',
  '....OSSSSSO.....',
  '.....OSSSO......',
  '..OOOOSSOOOO....',
  '.OOOSSSSSSSOO...',
  '.OCOSSSSSSOCO...',
  '.OCCOSSSSOOCO...',
  '.OCCCCCOCCCOO...',
  '..OCCCCOCCCCO...',
  '..OOCOO..OOCOO..',
  '..OOO.....OOO...',
], { O:'ink', S:'wheat', E:'ink', C:'cocoa' });

/* Foca della Cenere (24x18) */
defSprite('foca', [
  '................OOOOOO......',
  '...........OOOOOOOOOOOOOO...',
  '.........OOOOOOOOOOOOOOOOOO.',
  '........OOOOOOOOOOOOOOOOOOO.',
  '.......OOOOOOOOOOOOOOOOOOOO.',
  '......OOOOOOOOOOOOOOOOOOOOO.',
  '......OOOOOOOOOOOOSSOOOOOOO.',
  '.....OOOOOOOOOOOOSSEOOOOOOO.',
  '.....OOOOOOOOOOOOOSSOOOOOOO.',
  '.....OOOOOOOOOOOOOOOOSSOOOO.',
'......OOOOOOOOOOOOOOOOOOOO..',
     '.......OOOOOOOOOOOOOOOOOO...',
     '........OOOOOOOOOOOOOOOO....',
     '.........OOOOOOOOOOOOOO.....',
     '............OOOOOOO.........',
], { O:'slate', S:'blush', E:'ink' });

/* Vento dei Rimpianti (20x20) */
defSprite('vento', [
  '....OO...OO....',
  '..OOOO..OOOO...',
  '..OOOOOOOOOO...',
  '.OOOOOOOOOOOO..',
  '.OOO.OOOO.OOO..',
  '.OOO.OOOO.OOO..',
  '.OOOOOOOOOOOO..',
  '..OOOOOOOOOO...',
  '..OOO.OOOO.....',
  '...O..OO..O....',
  '......OO.......',
  '.....OOOO......',
  '....OOOOOO.....',
  '...OOOOOOOO....',
  '...O.OOOO.O....',
], { O:'dusk' });

/* Ramenta — l'entità del focolare spento (24x26) */
defSprite('ramenta', [
  '...OOOOOOOOOOOOOOO......',
  '..OOOOOOOOOOOOOOOOOOO...',
  '.OOO.OOOOOOOOOOO.OOOO...',
  '.OO.OOOOOOOOOOOOO.OO....',
  '.OOO.OOOOOOOOOOO.OOO....',
  '.OOOOOOOOOOOOOOOOOOO....',
  '..OOOOOOOOOOOOOOOOO.....',
  '...OOSSOSOSSOOOSOOO.....',
  '...OSSSOSOSSSOOSSOO.....',
  '..OSSSSSOSSSSSOOSSO.....',
  '..OSSSSSOSSSSSOOSSO.....',
  '...OOSSSSSSSSSSOOO......',
  '..OOOSSSSSSSSSSSOOO.....',
  '..OOSSSSSSSSSSSSSOO.....',
  '..OOSSSSSSSSSSSSSOO.....',
  '..OOSSSSSSSSSSSSSOO.....',
  '...OOSSSSSSSSSSSOO......',
  '....OOSSSSSSSSSOO.......',
  '.....OOSSSSSSSOO........',
  '......OOOOOOOOO.........',
  '.....OOO...OOO..........',
  '....OOO.....OOO.........',
  '...OOO.......OOO........',
  '..OOO.........OOO.......',
], { O:'ink', S:'fog' });

/* Specchio — il riflesso delle scelte (20x22) */
defSprite('specchio', [
  '..OOOOOOOOOOOOOOO...',
  '.OOFFFFFFFFF...OO...',
  '.OFFFFFFFFF....OO...',
  '.OFOHHHHHHFO..OO....',
  '.OFOSSSSSOFO.OO.....',
  '.OFOSESSSOFOOO......',
  '.OFOSSSSSOFOOO......',
  '.OFOSSOSSOFOOO......',
  '.OFOOOOOOOOFOOO.....',
  '.OFFFFFFFFF.FOO.....',
  '.OFFFFFFFFF..OO.....',
  '..OOOOOOOOOOO.......',
  '.....OOO..OOO.......',
  '....OOO....OOO......',
  '...OOO......OOO.....',
  '..OOO........OOO....',
], { O:'ink', F:'cream', H:'cocoa', S:'blush', E:'ink' });

SPR.validate = function(){
  const bad = [];
  for(const k in SPR){
    const c = SPR[k];
    if(c && c.width && typeof c.tag !== 'undefined') {}
  }
  return bad;
};

/* ritratti ricavati da sprite esistenti (definiti ora che esistono tutti) */
function portraitFrom(name, sprName, plate){
  if(!SPR[sprName]) return;
  PORT[name] = SPR[sprName];
  PORT[name].plate = plate;
}
portraitFrom('signora', 'elide_art2', 'gold');
portraitFrom('contadina', 'elide_art2', 'sage');
portraitFrom('bambina', 'tito_idle_b', 'pumpkin');
portraitFrom('custode', 'custode', 'moss');
portraitFrom('foca', 'foca', 'slate');
portraitFrom('vento', 'vento', 'dusk');
portraitFrom('ramenta', 'ramenta', 'fog');
portraitFrom('specchio', 'specchio', 'night');
portraitFrom('custodeeco', 'custode', 'sage');
portraitFrom('focascena', 'foca', 'slate');