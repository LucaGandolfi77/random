import { createCombat } from "./src/combat.js";

const ctxStub = {
  clearRect(){}, beginPath(){}, arc(){}, stroke(){}, moveTo(){}, lineTo(){},
  closePath(){}, fill(){}, scale(){}, setTransform(){}, save(){}, restore(){},
  translate(){}, rotate(){}, fillRect(){}
};

class El {
  constructor(tag){ this.tag=tag; this.children=[]; this.style={}; this._cls=new Set(); this._html=''; this._txt=''; this.handlers={}; }
  get classList(){
    const el=this;
    return {
      add(c){ el._cls.add(c); }, remove(c){ el._cls.delete(c); },
      contains(c){ return el._cls.has(c); },
      toggle(c,v){ if(v===undefined) v=!el._cls.has(c); v?el._cls.add(c):el._cls.delete(c); return v; }
    };
  }
  appendChild(c){ this.children.push(c); return c; }
  removeChild(c){ const i=this.children.indexOf(c); if(i>=0) this.children.splice(i,1); }
  get firstChild(){ return this.children[0] || null; }
  set innerHTML(v){ this._html=v; this.children=[]; }
  get innerHTML(){ return this._html; }
  set textContent(v){ this._txt=v; }
  get textContent(){ return this._txt; }
  addEventListener(t,f){ (this.handlers[t] ||= []).push(f); }
  removeEventListener(){}
  click(){ (this.handlers.click || []).forEach(f=>f()); }
  getContext(){ return ctxStub; }
  setPointerCapture(){}
}

const els = {};
const getEl = (id) => (els[id] ||= new El(id));
const body = new El("body");
globalThis.document = {
  getElementById: getEl,
  createElement: (t) => new El(t),
  querySelectorAll: () => [],
  body
};

const scene = {
  addCharacter(){}, clearCharacters(){}, addPlayer(){}, addEnemyFigure(){},
  updatePlayer(){}, setMode(){}, getMode(){ return "battle"; },
  getPlayerPos(){ return null; }, getTrigger(){ return null; },
  play(){ return new Promise(r => setTimeout(r, 1)); },
  flash(){}, ko(){}, healGlow(){}, burst(){}, getPos(){ return {x:0,y:1,z:0}; },
  resetPose(){}, update(){}, resize(){}, dispose(){}
};

let won = false, lost = false;
console.error("pre createCombat");
const combat = createCombat({
  scene, enemyKey: process.argv[2] || "echo",
  bonus: process.argv[3] ? JSON.parse(process.argv[3]) : {},
  onWin: () => { won = true; },
  onDefeat: () => { lost = true; },
  onMidFight: () => Promise.resolve()
});
console.error("post createCombat");

const tick = setInterval(() => {
  try { combat.update(0.0167); }
  catch (e) { console.log("UPDATE THREW:", e.message); clearInterval(tick); process.exit(1); }
}, 16);

let hb = 0;
setInterval(() => {
  hb++;
  console.error("HB", hb, "phase=", combat.state.phase);
}, 2000);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function clickAction() {
  const grid = getEl("action-grid");
  const btns = grid.children.filter(c => c.tag === "button" && !c.disabled);
  if (!btns.length) return false;
  const cost = (c) => {
    const el = c.children.find(x => x._txt && x._txt.startsWith("Essenza"));
    return el ? parseInt(el._txt.split(" ")[1], 10) : 0;
  };
  btns.sort((a, b) => cost(a) - cost(b));
  const btn = btns[0];
  console.error("   click ->", btn.children.map(c => c.textContent).join(" | "));
  btn.click();
  return true;
}

async function doAction() {
  const ok = clickAction();
  if (!ok) { console.log("NO BUTTON. phase=", combat.state.phase); return false; }
  await sleep(600);
  return true;
}

async function main() {
  setTimeout(() => {
    console.error("WATCHDOG 120s: phase=", combat.state.phase, "won=", won, "lost=", lost, "enemyHP=", combat.enemy.hp);
    process.exit(3);
  }, 120000);
  await sleep(50);
  for (let round = 1; round <= 80; round++) {
    console.error(`--- round ${round}: phase=${combat.state.phase}, enemyHP=${combat.enemy.hp}`);
    if (won || lost) break;
    for (let i = 0; i < 3; i++) {
      const ok = await doAction();
      if (!ok) { console.error("STALLED at action", i); clearInterval(tick); process.exit(2); }
    }
    console.error("   enemy turn begins...");
    await sleep(1300);
    const parryActive = getEl("parry-overlay")._cls.has("active");
    console.error("   after telegraph: phase=", combat.state.phase, "parryOverlay=", parryActive);
    if (parryActive) {
      combat.onPrimary();
      await sleep(400);
      console.error("   parry pressed, resolving...");
    }
    await sleep(1200);
    console.error("   after enemy turn: phase=", combat.state.phase, "enemyHP=", combat.enemy.hp);
    if (won || lost) break;
  }
  console.error("RESULT won=", won, "lost=", lost, "finalPhase=", combat.state.phase, "enemyHP=", combat.enemy.hp);
  clearInterval(tick);
  process.exit(0);
}

main();
