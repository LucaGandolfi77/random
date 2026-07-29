// data.js — configurazione di gioco di DITTOPIA (fan game non ufficiale di Pokémon Pokopia)
// Tutti i testi in italiano. Tasselli, oggetti, ricette, mosse, specie, habitat, missioni, dialoghi.

// ───────────────────────── TASSelli DI TERRENO ─────────────────────────
var TILE = {
  GRASS:0, TGRASS:1, DIRT:2, PATH:3, WATER:4, SAND:5, PAVE:6,
  DARKGRASS:7, ROCK:8, CAVEFLOOR:9, CAVEWALL:10, FLOWER:11,
};
var TILE_WALK = {0:1,1:1,2:1,3:1,4:0,5:1,6:1,7:1,8:0,9:1,10:0,11:1};
// categorie di terreno per le regole habitat
var TILE_CAT = {4:'water', 6:'ruin', 8:'rock', 1:'grass', 7:'grass', 9:'cave'};

// ───────────────────────── RISORSE & OGGETTI ─────────────────────────
// kind: 'res'=risorsa inventario, 'place'=piazzabile, 'natural'=oggetto naturale del mondo (albero/roccia)
var ITEMS = {
  rametto:   {name:'Rametto',        kind:'res'},
  ciottolo:  {name:'Ciottolo',       kind:'res'},
  legno:     {name:'Legno',          kind:'res'},
  pietra:    {name:'Pietra',         kind:'res'},
  fibra:     {name:'Fibra',          kind:'res'},
  bacca:     {name:'Bacca',          kind:'res'},
  fiore:     {name:'Fiore',          kind:'res'},
  metallo:   {name:'Metallo',        kind:'res'},
  caramella: {name:'Caramella Rara', kind:'res'},
  flauto:    {name:'Poké Flauto',    kind:'res', desc:"Una magica melodia che sveglia ogni Pokémon addormentato."},

  banco:     {name:'Banco da lavoro',kind:'place', cost:{rametto:5,ciottolo:5},  move:'base',     desc:'Necessario per le ricette avanzate.'},
  falò:      {name:'Falò',           kind:'place', cost:{legno:2,rametto:3},     move:'base',     desc:'Caldeggia le notti. Attira Pokémon di fuoco.', light:true},
  torcia:    {name:'Torcia',         kind:'place', cost:{legno:1,rametto:2},     move:'base',     desc:'Fa luce di notte.', light:true},
  panchina:  {name:'Panchina',       kind:'place', cost:{legno:3},              move:'base',     desc:'Un posto comodo per riposare.'},
  letto:     {name:'Letto',          kind:'place', cost:{legno:4,fibra:6},      move:'base',     desc:'Morbido e accogliente per Pokémon pigri.'},
  aiuola:    {name:'Aiuola',         kind:'place', cost:{fiore:3,fibra:2},      move:'base',     desc:"Fiori colorati. Attira Pokémon d'erba."},
  cespuglio: {name:'Cespuglio',      kind:'place', cost:{fibra:4,rametto:2},    move:'fogliame', desc:'Vegetazione fitta. Attira insetti.'},
  vaso:      {name:'Vaso di fiori',  kind:'place', cost:{pietra:2,fiore:1},     move:'base',     desc:'Un vaso decorativo.'},
  sacco:     {name:'Sacco da boxe',  kind:'place', cost:{fibra:6,legno:2},      move:'base',     desc:"Per Pokémon scatenati. Quello che piace a Mankey!"},
  stereo:    {name:'Stereo',         kind:'place', cost:{metallo:4,legno:3},    move:'base',     desc:'Suona melodie allegre.'},
  statua:    {name:'Statua',         kind:'place', cost:{pietra:6},            move:'base',     desc:'Brilla di notte. Attira amanti dei luccichii.', light:'dim'},
  altare:    {name:'Altare mistico', kind:'place', cost:{pietra:8,caramella:1}, move:'base',     desc:'Un altare antico. Cosa nasconde di notte?', light:'dim'},

  // oggetti naturali del mondo (raccogli/calda) — NON in crafting
  albero:    {name:'Albero',         kind:'natural', drops:'legno', move:'taglio'},
  roccia:    {name:'Roccia',         kind:'natural', drops:'pietra', move:'spaccaroccia'},
  detrito:   {name:'Detrito',        kind:'natural', drops:'mix'},
  cespuglio_nat:{name:'Cespuglio',   kind:'natural', drops:'fibra'},
  spruzzabacche:{name:'Cespuglio di bacche',kind:'natural', drops:'bacca'},
  rovina_metallo:{name:'Rottame metallico', kind:'natural', drops:'metallo'},
};

// ───────────────────────── MOSSE ─────────────────────────
var MOVES = {
  base:       {name:'Mani (Trasformazione)', desc:'Raccogli a mani nude. Premi E davanti ai detriti.'},
  fogliame:   {name:'Fogliame',  desc:'Fai crescere erba e cespugli sulla terra. Seleziona con i tasti 1-9.'},
  pistolacqua:{name:'Pistolacqua',desc:'Innaffia piantine secche e riempi gli stagni.'},
  taglio:     {name:'Taglio',     desc:'Abbatti alberi per ottenere legno.'},
  spaccaroccia:{name:'Spaccaroccia',desc:'Fracassa le rocce per ottenere pietra.'},
  braciere:   {name:'Braciere',   desc:'Accendi fuochi e torce.'},
  energia:    {name:'Energia',    desc:'Attiva generatori e lampioni.'},
  scava:      {name:'Scava',      desc:"Scava la terra: crei buchi e stagni riempiendoli d'acqua."},
  splash:     {name:'Splash',     desc:'Uno splash... non fa proprio nulla! (Magikarp docet)'},
};
// ordine per hotbar
var MOVE_ORDER = ['base','pistolacqua','fogliame','taglio','spaccaroccia','braciere','energia','scava','splash'];

// ───────────────────────── SPECIE POKéMON ─────────────────────────
// cry = [ms,Hz,...]; teaches = mossa; habitat = id regola; follows = ti segue
var SPECIES = {
  squirtle:   {name:'Squirtle',  n:7,  type:'Acqua',   cry:[120,380,120,440,120,500], teaches:'pistolacqua', follows:true, questOnly:true,
    flavor:'Una tartarughina sturdy. Quando si spaventa ritira il guscio e sputa acqua.'},
  bulbasaur:  {name:'Bulbasaur', n:1,  type:'Erba',    cry:[100,330,140,392,160,294], teaches:'fogliame', follows:true,
    flavor:"C'è un seme piantato sulla schiena fin dalla nascita."},
  charmander: {name:'Charmander',n:4,  type:'Fuoco',   cry:[160,440,200,523,120,392], teaches:'braciere', follows:true,
    flavor:'La fiamma sulla coda mostra la sua salute. Non si spegne mai.'},
  oddish:     {name:'Oddish',    n:43, type:'Erba',    cry:[180,294,180,247,220,330], teaches:null, follows:true,
    flavor:'Di notte vaga seminando i suoi semi camminando come un fantasma.'},
  caterpie:   {name:'Caterpie',  n:10, type:'Coleottero',cry:[100,660,100,880,100,740], teaches:null, follows:false,
    flavor:'Mangia voracemente foglie. Il suo profumo è delicato.'},
  butterfree: {name:'Butterfree',n:12, type:'Coleottero',cry:[200,587,160,698,200,784], teaches:null, follows:false,
    flavor:'Le sue ali sono ricoperte di polvere idrorepellente.'},
  pidgey:     {name:'Pidgey',    n:16, type:'Normale', cry:[140,440,120,494,140,392], teaches:null, follows:false,
    flavor:'Pokémon docile. Se si spaventa fa tornado di sabbia.'},
  farfetchd:  {name:"Farfetch'd",n:83, type:'Normale', cry:[160,392,160,440,160,392], teaches:'taglio', follows:true, questOnly:true,
    flavor:'Combatte con un porro usato come spada. Un samurai erbivoro.'},
  geodude:    {name:'Geodude',   n:74, type:'Roccia',  cry:[200,220,200,196,200,247], teaches:'spaccaroccia', follows:true,
    flavor:'Lo scambiano per un sasso. Si arrampica sulle montagne.'},
  diglett:    {name:'Diglett',   n:50, type:'Terra',   cry:[80,330,80,294,80,330,80,294], teaches:'scava', follows:true,
    flavor:'Vive sotto terra. Quando emerge fa crepare il suolo.'},
  pikachu:    {name:'Peakychu',  n:25, type:'Elettro', cry:[60,880,40,988,40,880,80,1046], teaches:'energia', follows:true, questOnly:true,
    flavor:'Un Pikachu che ha perso la scintilla. Ma dentro batte un cuore elettrico.'},
  meowth:     {name:'Meowth',    n:52, type:'Normale', cry:[180,523,180,440,180,523], teaches:null, follows:true,
    flavor:'Adora gli oggetti luccicanti. La sua Monetaglia è famosa.'},
  jigglypuff: {name:'Jigglypuff',n:39, type:'Fata',   cry:[300,392,200,440,400,523], teaches:null, follows:false,
    flavor:'Il suo canto fa addormentare i nemici. Tappati le orecchie!'},
  psyduck:    {name:'Psyduck',   n:54, type:'Acqua',   cry:[300,247,200,294,300,247], teaches:null, follows:true,
    flavor:'Soffre di mal di testa costanti. Sprigiona poteri psichici.'},
  magikarp:   {name:'Magikarp',  n:129,type:'Acqua',   cry:[80,196,80,220,80,196], teaches:'splash', follows:false,
    flavor:'Debole e inutile. Salta e basta. Splash! Splash! Splash!'},
  gastly:     {name:'Gastly',    n:92, type:'Spettro', cry:[400,180,200,164,400,196], teaches:null, follows:true,
    flavor:'Avvolge i nemici in un gas tossico. Spaventa a Lavandonia.'},
  snorlax:    {name:'Mosslax',   n:143,type:'Normale', cry:[600,160,400,147,600,160], teaches:null, follows:true, questOnly:true,
    flavor:'Uno Snorlax dormito così a lungo che muschi gli crescono addosso.'},
  dratini:    {name:'Dratini',   n:147,type:'Drago',   cry:[200,698,160,784,200,698], teaches:null, follows:true, caveOnly:true,
    flavor:'Serpente drago leggendario. Muta pelle nella grotta nascosta.'},
  mew:        {name:'Mew',       n:151,type:'Psico',   cry:[120,1046,120,1175,120,1319,120,1046], teaches:null, follows:true, special:true,
    flavor:'Si dice possieda il DNA di tutti i Pokémon. Solo a un cuore puro.'},
};

// ───────────────────────── REGOLE HABITAT ─────────────────────────
// condizione: {k:categoria, count, r:raggio in tile}. categoria può essere:
//   oggetto piazzato (es. 'falò','aiuola'), tile-cat ('water','ruin','rock','grave'), 'tree','rock'(naturali).
// time:'any'|'day'|'night'. limit = max esemplari contemporanei. needDex=specie viste min; needFriends=min amici totali.
var HABITATS = [
  {mon:'bulbasaur', req:[{k:'aiuola',count:1,r:2},{k:'grass',count:4,r:2}], time:'day', limit:1},
  {mon:'oddish',    req:[{k:'aiuola',count:1,r:3}], time:'night', limit:2},
  {mon:'caterpie',  req:[{k:'cespuglio',count:1,r:2}], time:'any', limit:2},
  {mon:'butterfree',req:[{k:'aiuola',count:2,r:3}], time:'day', needDex:5, limit:1},
  {mon:'pidgey',    req:[{k:'tree',count:2,r:3}], time:'day', limit:2},
  {mon:'geodude',   req:[{k:'rock',count:2,r:3}], time:'day', limit:2},
  {mon:'charmander',req:[{k:'falò',count:1,r:2}], time:'any', limit:1},
  {mon:'meowth',    req:[{k:'statua',count:1,r:2}], time:'night', limit:1},
  {mon:'jigglypuff',req:[{k:'stereo',count:1,r:2}], time:'any', needDex:6, limit:1},
  {mon:'psyduck',   req:[{k:'water',count:4,r:2}], time:'any', limit:1},
  {mon:'magikarp',  req:[{k:'water',count:4,r:1}], time:'any', limit:2},
  {mon:'gastly',    req:[{k:'ruin',count:4,r:3}], time:'night', limit:2},
  {mon:'mew',       req:[{k:'altare',count:1,r:1}], time:'night', needFriends:12, limit:1, special:true},
];

// ───────────────────────── MISSIONI ─────────────────────────
var QUESTS = [
 {id:'q1', title:'Il risveglio di Ditto', giver:'tangrowth',
   lines:[
    "Sciocco piccolo blob viola... ma guardati! Sei un Ditto trasformato in umano!",
    "Gli umani hanno lasciato la Kanto molto tempo fa. Ma noi Pokémon siamo ancora qui.",
    "Io sono il Professor Tangrowth. Studierò questo luogo. Tu lo coltiverai.",
    "Tutto inizia da un'aiuola e una tartarughina assetata. Avanti!"],
   goal:'Parla col Professor Tangrowth', next:'q2'},
 {id:'q2', title:'Una tartarughina assetata', giver:'tangrowth',
   lines:["Vedi quello Squirtle là? È disidratato, poverino.",
    "Ma prima... raccogli ciò che trovi nei detriti. Premi E davanti a un cumulo!"],
   goal:'Raccogli 5 Rametti e 5 Ciottoli', need:{rametto:5,ciottolo:5}, next:'q3'},
 {id:'q3', title:'La prima amicizia', giver:'tangrowth',
   lines:["Ora porta acqua a Squirtle! Avvicinati e premi E.",
    "Un Ditto impara le mosse dai Pokémon amici. Lui ti insegnerà Pistolacqua."],
   goal:'Aiuta Squirtle disidratato', flag:'squirtle_helped', next:'q4'},
 {id:'q4', title:'Innaffia il giardino', giver:'tangrowth',
   lines:["Squirtle ti ha insegnato Pistolacqua! Seleziona la mossa con i tasti 2-9.",
    "Innaffia le piantine secche: l'erba crecerà e attirerà nuovi amici."],
   goal:'Innaffia 3 piantine secche', flag:'watered3', next:'q5'},
 {id:'q5', title:'Costruisci un Falò', giver:'tangrowth',
   lines:["Viene notte, fa freddo. Servirà del legno... e un Banco da lavoro.",
    "Costruisci un Banco (C per il menu Craft) poi un Falò. La notte attira qualcuno di scaglioso!"],
   goal:'Costruisci un Banco e un Falò', place:['banco','falò'], next:'q6'},
 {id:'q6', title:'Non puoi passare!', giver:'tangrowth',
   lines:["Un Mosslax intrappola il passaggio a nord. Per svegliarlo serve il Poké Flauto!",
    "Esplora: trova il Farfetch'd tra i giunchi, scopri Taglio. Recupera Metallo dalle rovine e Legno dagli alberi.",
    "Crafta il Poké Flauto (necessiti di Metallo e Legno)."],
   goal:'Crafta il Poké Flauto', craft:'flauto', next:'q7'},
 {id:'q7', title:'La melodia del risveglio', giver:'tangrowth',
   lines:["Il Poké Flauto! Vai a nord dal Mosslax e premi E.",
    "Una sequenza di note... ricordale e ripetile per suonare la melodia del risveglio!"],
   goal:'Sveglia Mosslax con la melodia', flag:'snorlax_awake', next:'q8'},
 {id:'q8', title:'La grotta segreta', giver:'tangrowth',
   lines:["Il Mosslax si sveglia e si unisce a te! Oltre lui, una grotta leggendaria.",
    "Completa il Pokédex con 12 amici, ed esplora la grotta. Lì dentro... un antico segreto."],
   goal:'Pokédex a 12 amici ed esplora la grotta', flag:'cave_explored', needFriends:12, next:'q9'},
 {id:'q9', title:"L'aurora della rinascita", giver:'tangrowth',
   lines:["Un altare. Una notte limpida. E tu, Ditto, cuore puro.",
    "Posa un Altare mistico e attendi la mezzanotte...",
    "La Kanto tornerà a fiorire. Grazie, da parte di tutti i Pokémon."],
   goal:"Incontra Mew all'altare di notte", flag:'mew_met'},
];

// ───────────────────────── DIALOGHI NPC/EASTER EGG ─────────────────────────
var DIALOGUES = {
  tangrowth_intro:[],
  youngster:["Adoro i pantaloncini! Sono comodi e facili da portare!","Il mio Rattata? È tra i primi per... ehm... diritto!"],
  rocket:["GIO-GIO-GIO! Team Rocket! ...aspetta, sei tu, Ditto? È solo un graffiti.","Prepariamoci ai guai! (Ma non con questo Pokémon, eh?)"],
  oldman:["Ehi! I miei Pokémon sono pallidi! Vuoi un Ko? ...scusa, un caffè.","La vecchia Smeraldopoli non è più quella di un tempo."],
  sign:["ROVINE DI CELESTROPOLI — Vietato l'accesso (ma chi ci bada più)","ATTENZIONE: generatore fuori servizio. Riparazioni in attesa.","La grotta a nord è bloccata da un grosso cuscino muschioso?"],
  oak:["C'è un tempo e un luogo per ogni cosa... ma non ora!"],
  missingno:["…","M̵i̵s̵s̵i̵n̵g̵N̵o̵.̵ comparso.","██████ ERROR █ DATA CORRUPT █","+1 Caramella Rara. Fortunello?"],
};

var SHINY_CHANCE = 1/128; // probabilità shiny allo spawn
var FULL_MOON_MINUTES = [3,6,11,17,22]; // minuti di gioco in cui la luna è "piena" per Mew