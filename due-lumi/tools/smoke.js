/* Smoke test: carica tutto il gioco in Node con stub di DOM/Canvas/Audio
   e simula un percorso di gioco top-down per scovare errori runtime. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');

/* ---- stub base ---- */
function makeCtx(){
  const gradient = { addColorStop(){} };
  const gainObj = { value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){} };
  const osc = { type:'sine', frequency:{ value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, detune:{ value:0 }, connect(){}, start(){}, stop(){} };
  const src = { buffer:null, connect(){}, start(){} };
  const target = {};
  return new Proxy(target, {
    get(t, p){
      if(p in t) return t[p];
      if(p === 'createLinearGradient' || p === 'createRadialGradient') return () => gradient;
      if(p === 'createOscillator') return () => osc;
      if(p === 'createGain') return () => gainObj;
      if(p === 'createBuffer') return () => ({ getChannelData: () => new Float32Array(8) });
      if(p === 'createBufferSource') return () => src;
      if(p === 'createBiquadFilter') return () => ({ type:'lowpass', frequency:{ value:0 }, connect(){} });
      return () => {};
    },
    set(t, p, v){ t[p] = v; return true; },
  });
}
function makeCanvas(){
  const c = { width:0, height:0, style:{}, getContext: () => makeCtx(), addEventListener(){}, classList:{ add(){}, remove(){} }, children:[], appendChild(){}, removeChild(){} };
  return c;
}

/* ---- document / window / navigator / localStorage ---- */
const listeners = {};
function makeEl(){
  return {
    addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
    classList:{ add(){}, remove(){} },
    hidden:false, style:{}, textContent:'', className:'',
    children:[], appendChild(){}, removeChild(){},
  };
}
const documentStub = {
  getElementById(id){
    if(!this._els) this._els = {};
    if(!this._els[id]) this._els[id] = (id === 'game') ? makeCanvas() : makeEl();
    return this._els[id];
  },
  createElement(){ return makeCanvas(); },
  addEventListener(){},
};
const store = {};
const localStorageStub = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const windowStub = {
  innerWidth: 800, innerHeight: 600,
  addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener(){},
};
windowStub.window = windowStub;
const navigatorStub = { maxTouchPoints: 0 };
class FakeAudioContext {
  constructor(){ this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain(){ return { value:0, gain:{ value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }
  createOscillator(){ return { type:'sine', frequency:{ value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, detune:{ value:0 }, connect(){}, start(){}, stop(){} }; }
  createBuffer(){ return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource(){ return { buffer:null, connect(){}, start(){} }; }
  createBiquadFilter(){ return { type:'lowpass', frequency:{ value:0 }, connect(){} }; }
  resume(){ this.state = 'running'; return Promise.resolve(); }
}
windowStub.AudioContext = FakeAudioContext;
windowStub.webkitAudioContext = FakeAudioContext;

const sandbox = {
  console,
  setTimeout, clearTimeout,
  setInterval: () => 0,      /* neutralizzato: non blocca il processo */
  clearInterval: () => {},
  document: documentStub,
  window: windowStub,
  navigator: navigatorStub,
  localStorage: localStorageStub,
  Math, JSON, Object, Array, String, Number, Boolean, Promise,
};
vm.createContext(sandbox);

/* cattura il loop: engine.js chiama requestAnimationFrame(loop) */
let rafQueue = [];
sandbox.requestAnimationFrame = (fn) => { rafQueue.push(fn); };
sandbox.__rafQueue = rafQueue;

/* ---- carica tutti i file in ordine (stessa sequenza di index.html) ---- */
const ORDER = ['palette.js','sprites.js','audio.js','input.js','engine.js','textui.js','tiles.js','items.js','dialogue.js','ui.js','overworld.js','battle.js','story.js','main.js'];
for(const f of ORDER){
  const code = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch(e){
    console.error('ERRORE al caricamento di', f, ':', e.message);
    process.exit(1);
  }
}
console.log('OK: tutti i file caricati senza errori top-level.');

/* ---- accesso allo stato di gioco dalla vm ---- */
function gs(expr){ return vm.runInContext(expr, sandbox); }

/* ---- helpers di simulazione ---- */
function emit(type, ev){ (listeners[type] || []).forEach(fn => fn(ev || {})); }
function pressKey(k){ emit('keydown', { key:k, repeat:false, preventDefault(){} }); }
function releaseKey(k){ emit('keyup', { key:k, repeat:false }); }
/* preme, lascia passare alcuni frame, poi rilascia */
function tap(k, holdFrames){
  pressKey(k);
  step(holdFrames == null ? 1 : holdFrames, 16);
  releaseKey(k);
  step(1, 16);
}

let simT = 0;
function step(n, ms){
  const dt = (ms || 16.7);
  for(let i=0;i<n;i++){
    if(!rafQueue.length) break;
    const fn = rafQueue.shift();
    simT += dt;
    fn(simT);
  }
}

try {
  console.log('Scena iniziale:', gs('G.sceneName'));
  console.log('Titolo musica in coda:', gs('AUD.current()'));

  /* avvia una nuova partita */
  tap('z', 2);           // A (nuova partita)
  step(120, 16);         // fade + dialogo intro
  console.log('Dopo start → scena:', gs('G.sceneName'), ', stanza:', gs('OW.room && OW.room.id'), ', seen:', gs('!!G.flags["seen:hubA"]'));

  function skipDialogue(){
    pressKey('x');                    // B = velocizza la scrittura
    let prevQ = -1, guard = 0;
    while(gs('DIALOGUE.active') && !gs('!!DIALOGUE.choices') && guard++ < 600){
      const nowQ = gs('DIALOGUE.qi');
      if(nowQ !== prevQ){ prevQ = nowQ; step(40, 16); }  // la pagina è avanzata: lasciala finire
      tap('z', 1);                    // A: avanza pagina (se finita di scrivere)
      step(4, 16);
    }
    releaseKey('x');
    step(10, 16);
  }
  skipDialogue();
  console.log('Dopo intro → scena:', gs('G.sceneName'), ', dialogo attivo:', gs('DIALOGUE.active'), ', stanza:', gs('OW.room && OW.room.id'));

  /* movimento a 4 direzioni dallo spawn (hubA: 36,320) */
  pressKey('d'); step(40, 16); releaseKey('d');
  pressKey('w'); step(30, 16); releaseKey('w');
  pressKey('a'); step(15, 16); releaseKey('a');
  pressKey('s'); step(15, 16); releaseKey('s');
  const mx = gs('Math.round(OW.p.x)'), my = gs('Math.round(OW.p.y)');
  console.log('Movimento 4 direzioni → x:', mx, 'y:', my);
  if(mx <= 36) throw new Error('Il personaggio non si è mosso a destra (x=' + mx + ')');

  /* martello (B) senza bersagli: non deve crashare, mostra hint */
  tap('x', 1); step(2, 16);
  console.log('Martello → hint:', gs('OW.hintT > 0'));

  /* parla con nonna (hubA, x330 y210) */
  gs('OW.p.x = 324; OW.p.y = 232; OW.p.facing = 2;');
  step(4, 16);
  tap('z', 1); step(16, 16);
  console.log('Parla con nonna → dialogo:', gs('DIALOGUE.active'));
  skipDialogue();
  if(gs('MENU.active')){ tap('x', 1); step(8, 16); }   // la Cesta si apre da sola
  console.log('Cesta (nonna) → MENU attivo:', gs('MENU.active'));

  /* porta hubA → hubShop (porta tx21 ty10): sta sotto, di fronte alla porta */
  gs('OW.p.x = 336; OW.p.y = 192; OW.p.facing = 2;');
  step(4, 16);
  tap('z', 1); step(70, 16);          // fade + cambio stanza
  skipDialogue();
  console.log('Dopo porta → stanza:', gs('OW.room && OW.room.id'));

  /* negozio: parla con nonna del negozio (x240 y120) e chiudi la Cesta */
  gs('OW.p.x = 234; OW.p.y = 134; OW.p.facing = 2;');
  step(4, 16);
  tap('z', 1); step(16, 16);
  skipDialogue();
  step(10, 16);                       // onEnd → MENU.open('shop')
  console.log('Cesta (negozio) → MENU:', gs('MENU.mode'), 'active:', gs('MENU.active'), 'crumbs:', gs('G.crumbs'));
  tap('x', 1); step(10, 16);          // chiudi con B
  console.log('Cesta chiusa:', gs('!MENU.active'));

  /* esci dal negozio in basso → hubA */
  gs('OW.p.x = 344; OW.p.y = 250;');
  step(50, 16);
  console.log('Uscita negozio → stanza:', gs('OW.room && OW.room.id'), ', x:', gs('Math.round(OW.p.x)'));

  /* falco (hubA, x470 y240): parla → move_turbo */
  gs('OW.p.x = 464; OW.p.y = 254; OW.p.facing = 2;');
  step(4, 16);
  tap('z', 1); step(16, 16);
  skipDialogue();
  step(10, 16);
  console.log('Falco → move_turbo:', gs('!!G.flags.move_turbo'));

  /* esci a destra → meadowA */
  gs('OW.p.x = 534; OW.p.y = 240;');
  step(50, 16);
  skipDialogue();
  console.log('Verso meadowA → stanza:', gs('OW.room && OW.room.id'));

  /* memoria 1 (x80 y320) */
  gs('OW.p.x = 72; OW.p.y = 312;');
  step(10, 16);
  console.log('Memoria → memCount:', gs('G.memCount()'));
  skipDialogue();

  /* battaglia con ombra (x200 y120) */
  gs('OW.p.x = 192; OW.p.y = 120;');
  step(60, 16);
  console.log('Battaglia → scena:', gs('G.sceneName'), ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'), ', state:', gs('BATTLE.state'));
  skipDialogue();
  const ombraRes = fight();
  console.log('Dopo colpo → eHp:', gs('BATTLE.eHp'), 'stato:', ombraRes);
  finishWin();
  console.log('Dopo vittoria → scena:', gs('G.sceneName'), ', stanza:', gs('OW.room && OW.room.id'), ', enemy flag:', gs('!!G.flags["enemy:meadowA:0"]'));

  /* salva, torna al titolo, ricarica (Continua) */
  gs('STORY.save()');
  gs('setScene("title")');
  step(10, 16);
  console.log('Salvataggio presente:', gs('STORY.hasSave()'));
  tap('z', 2); step(80, 16);          // Continua (prima opzione)
  console.log('Dopo Continua → scena:', gs('G.sceneName'), ', stanza:', gs('OW.room && OW.room.id'), ', mem:', gs('G.memCount()'), ', crumbs:', gs('G.crumbs'));

  /* ---- MENU PAUSA: tutte le sezioni ---- */
  tap('p', 1); step(10, 16);
  console.log('Menu pausa → mode:', gs('MENU.mode'), 'active:', gs('MENU.active'));
  ['OGGETTI','EQUIP','STATO','DIARIO'].forEach(tag => {
    gs('MENU.sel = MENU.modeSel.indexOf("' + tag + '");');
    tap('z', 1); step(8, 16);
    const mode = gs('MENU.mode');
    tap('x', 1); step(8, 16);         // B torna al pause
    console.log(tag, '→', mode);
  });
  gs('MENU.sel = 5;');                // CHIUDI
  tap('z', 1); step(8, 16);
  console.log('Menu chiuso:', gs('!MENU.active'));

  /* ---- helper: combatti fino alla fine (vittoria o sconfitta) ---- */
  function fight(){
    let guard = 0;
    while(guard++ < 3000){
      if(gs('DIALOGUE.active')){ skipDialogue(); continue; }
      const st = gs('BATTLE.state');
      if(st === 'player'){
        gs('BATTLE.choice = Math.max(0, BATTLE.getCommands().indexOf("MARTELLO"))');
        tap('z', 1); step(3, 16);
      } else if(st === 'action'){
        step(18, 16); tap('z', 1); step(2, 16);   // bar in zona perfect
      } else if(st === 'enemy'){
        step(70, 16);                             // turno nemico: subiamo i colpi
      } else if(st === 'defense'){
        step(90, 16);                             // difesa: nessuna reazione
      } else if(st === 'win' || st === 'lose'){
        break;
      } else {
        step(10, 16);
      }
    }
    return gs('BATTLE.state');
  }

  /* ---- helper: chiudi la schermata di vittoria e torna all'overworld ---- */
  function finishWin(){
    step(90, 16);               // messaggio vittoria (t>1.2)
    tap('z', 1);                // finish()
    step(10, 16);
    skipDialogue();             // dialogo post-battaglia (boss)
    step(140, 16);              // goBack + fade + afterBattle
  }

  /* ---- BOSS: il Custode del Bosco (forestC) ---- */
  gs('G.party.milo.hp = 999; G.party.tito.hp = 999;');
  gs('setScene("overworld", {room:"forestC", x:20, y:224})');
  step(20, 16);
  skipDialogue();                                 // eventuale dialogo di ingresso stanza
  gs('OW.p.x = 430; OW.p.y = 224;');              // oltre bossAt 420 → custode
  step(60, 16);
  console.log('Boss custode → scena:', gs('G.sceneName'), ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'), ', state:', gs('BATTLE.state'));
  skipDialogue();
  const custodeRes = fight();
  console.log('Boss custode → stato:', custodeRes, ', eHp:', gs('BATTLE.eHp'));
  finishWin();
  console.log('Dopo custode → scena:', gs('G.sceneName'), ', stanza:', gs('OW.room && OW.room.id'), ', flag:', gs('!!G.flags["boss:custode"]'));

  /* ---- BOSS FINALE: Ramenta (finalC) + scelta → finale C ---- */
  gs('G.party.milo.hp = 999; G.party.tito.hp = 999;');
  gs('G.memories = {}; for(let i=1;i<=12;i++) G.memories[i] = true;');
  gs('setScene("overworld", {room:"finalC", x:20, y:200})');
  step(20, 16);
  skipDialogue();                                 // eventuale dialogo di ingresso stanza
  gs('OW.p.x = 570; OW.p.y = 200;');              // oltre bossAt 560 → ramenta
  step(60, 16);
  console.log('Boss ramenta → scena:', gs('G.sceneName'), ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'), ', state:', gs('BATTLE.state'));
  skipDialogue();
  const ramRes = fight();
  console.log('Boss ramenta → stato:', ramRes);
  finishWin();                                     // afterBattle('ramenta') → finalChoice
  skipDialogue();                                  // avanza fino alla pagina delle scelte
  console.log('Dopo ramenta → scena:', gs('G.sceneName'), ', dialogo:', gs('DIALOGUE.active'), ', scelte:', gs('!!DIALOGUE.choices'), ', opzioni:', gs('DIALOGUE.choices && DIALOGUE.choices.length'));
  if(gs('DIALOGUE.choices')){
    gs('DIALOGUE.choice = DIALOGUE.choices.length - 1');   // Camminaci accanto → finale C
    tap('z', 1); step(10, 16);
  }
  step(180, 16);                                   // resolveEnding → fade → scena ending
  console.log('Finale → scena:', gs('G.sceneName'), ', ending:', gs('G.ending'));
  step(40, 16);
  console.log('Finale render → titolo:', gs('G.scenes.ending.data && G.scenes.ending.data.title'));

  /* ---- BOSS: la Foca della Costa (coastB) ---- */
  gs('G.party.milo.hp = 999; G.party.tito.hp = 999;');
  gs('setScene("overworld", {room:"coastB", x:20, y:200})');
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 410; OW.p.y = 200;');              // oltre bossAt 400 → foca
  step(60, 16);
  skipDialogue();
  const focaRes = fight();
  console.log('Boss foca → stato:', focaRes, ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'));
  finishWin();
  console.log('Dopo foca → move_cenere:', gs('!!G.flags.move_cenere'));

  /* ---- BOSS: il Vento dei Rimpianti (windB) ---- */
  gs('G.party.milo.hp = 999; G.party.tito.hp = 999;');
  gs('setScene("overworld", {room:"windB", x:20, y:200})');
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 410; OW.p.y = 200;');              // oltre bossAt 400 → vento
  step(60, 16);
  skipDialogue();
  const ventoRes = fight();
  console.log('Boss vento → stato:', ventoRes, ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'));
  finishWin();
  console.log('Dopo vento → stivali:', gs('G.owns.indexOf("stivali") >= 0'));

  /* ---- MARTELLO su un blocco rompibile (forestA: X in colonna 11) ---- */
  gs('setScene("overworld", {room:"forestA", x:20, y:240})');
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 176; OW.p.y = 224; OW.p.facing = 2;');   // sotto la X (11,12)
  step(4, 16);
  tap('x', 1); step(4, 16);
  console.log('Martello su blocco → X(11,12):', gs('OW.room.map[12][11]'));

  /* ---- PUZZLE sw1: interruttore + blocchi + porta (forestB → forestC) ---- */
  gs('G.flags.sw1 = false; G.flags["seen:forestB"] = true;');
  gs('setScene("overworld", {room:"forestB", x:20, y:240})');
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 288; OW.p.y = 130;');               // sopra lo switch S (18,8)
  step(10, 16);
  console.log('forestB su interruttore → sw1:', gs('!!G.flags.sw1'));
  gs('setTile(OW.room, 30, 15, "."); setTile(OW.room, 31, 15, ".");');  // blocchi già rotti
  gs('OW.p.x = 512; OW.p.y = 256; OW.p.facing = 2;');  // davanti alla porta (32,15)
  step(4, 16);
  tap('z', 1); step(70, 16);                        // porta aperta → forestC
  skipDialogue();
  console.log('Dopo porta sw1 → stanza:', gs('OW.room && OW.room.id'));

  /* ---- PUZZLE sw2 + BOSS: lo Specchio (finalB → specchio) ---- */
  gs('G.party.milo.hp = 999; G.party.tito.hp = 999;');
  gs('G.flags.sw2 = false; G.flags["seen:finalB"] = true;');
  gs('setScene("overworld", {room:"finalB", x:20, y:200})');
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 336; OW.p.y = 244;');                // sopra lo switch S (21,15)
  step(10, 16);
  console.log('finalB → sw2:', gs('!!G.flags.sw2'));
  gs('OW.p.x = 416; OW.p.y = 256; OW.p.facing = 2;');  // davanti alla porta (26,15)
  step(4, 16);
  tap('z', 1); step(70, 16);                        // porta → specchio
  step(20, 16);
  skipDialogue();
  gs('OW.p.x = 310; OW.p.y = 224;');                // oltre bossAt 300 → specchio
  step(60, 16);
  skipDialogue();
  const specRes = fight();
  console.log('Boss specchio → stato:', specRes, ', enemy:', gs('BATTLE.enemy && BATTLE.enemy.id'));
  finishWin();                                      // +99 crumbs + cura
  console.log('Dopo specchio → crumbs:', gs('G.crumbs'));

  /* ---- FINALE B: trattienila ---- */
  gs('G.memories = {}; for(let i=1;i<=12;i++) G.memories[i] = true;');
  gs('STORY.finalChoice()'); step(20, 16);
  skipDialogue();                                   // avanza fino alla pagina delle scelte
  gs('DIALOGUE.choice = 1'); tap('z', 1); step(180, 16);
  console.log('Finale B → scena:', gs('G.sceneName'), ', ending:', gs('G.ending'));

  /* ---- FINALE A: lasciala andare (12 memorie) ---- */
  gs('setScene("overworld", {room:"specchio", x:120, y:224})'); step(20, 16);
  skipDialogue();
  gs('STORY.finalChoice()'); step(20, 16);
  skipDialogue();
  gs('DIALOGUE.choice = 0'); tap('z', 1); step(180, 16);
  console.log('Finale A → scena:', gs('G.sceneName'), ', ending:', gs('G.ending'));

  /* ---- FINALE D: poche memorie ---- */
  gs('setScene("overworld", {room:"specchio", x:120, y:224})'); step(20, 16);
  skipDialogue();
  gs('G.memories = {}; G.memories[1] = true;');
  gs('STORY.finalChoice()'); step(20, 16);
  skipDialogue();
  gs('DIALOGUE.choice = 0'); tap('z', 1); step(180, 16);
  console.log('Finale D → scena:', gs('G.sceneName'), ', ending:', gs('G.ending'));

  console.log('SMOKE OK — nessun errore runtime nel percorso base.');
  process.exit(0);
} catch(e){
  console.error('ERRORE RUNTIME durante la simulazione:', e.message);
  console.error((e.stack||'').split('\n').slice(0,5).join('\n'));
  process.exit(1);
}