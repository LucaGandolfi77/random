import { createScene } from "./scene.js";
import { createCombat } from "./combat.js";
import { $, showScreen, narrate, showChoice, showEnding } from "./ui.js";
import {
  INTRO_BEATS, INTERLUDE_BEATS, CUSTODE_INTRO,
  TOWER_BEATS_1, TOWER_BEATS_2, TOWER_BEATS_3, TOWER_BEATS_4,
  RENZO_BEATS, NINO_BEATS, ARGO_BEATS, ARALDO_BEATS,
  ADELE_BEATS, CERA_BEATS, NOTTURNO_BEATS, SIBILLA_BEATS,
  MID_BEATS, CHOICE_TEXT, CHOICES, ENDINGS
} from "./story.js";

const ZONES = [
  {
    id: "soglia",
    theme: "soglia",
    player: { x: 0, z: 2.5 },
    figures: [
      { kind: "npc", key: "renzo", type: "renzo", pos: { x: 6.2, z: -0.6 } },
      { kind: "npc", key: "adele", type: "adele", pos: { x: -4.6, z: 4.2 } },
      { kind: "enemy", type: "echo", pos: { x: -8.5, z: -4.5 } }
    ],
    banner: "La soglia della Torre dei Rintocchi"
  },
  {
    id: "sala",
    theme: "sala",
    player: { x: 0, z: 2.5 },
    figures: [
      { kind: "npc", key: "nino", type: "nino", pos: { x: 6.2, z: -0.8 } },
      { kind: "npc", key: "cera", type: "cera", pos: { x: -4.6, z: 4.2 } },
      { kind: "enemy", type: "dimenticata", pos: { x: -8.5, z: -4.5 } }
    ],
    banner: "La Sala dei Nomi"
  },
  {
    id: "galleria",
    theme: "galleria",
    player: { x: 0, z: 2.5 },
    figures: [
      { kind: "npc", key: "argo", type: "argo", pos: { x: 6.2, z: -0.5 } },
      { kind: "enemy", type: "velma", pos: { x: -8.5, z: -4.5 } }
    ],
    banner: "La Galleria delle Voci"
  },
  {
    id: "cripta",
    theme: "cripta",
    player: { x: 0, z: 2.5 },
    figures: [
      { kind: "npc", key: "araldo", type: "araldo", pos: { x: 6.2, z: -0.6 } },
      { kind: "npc", key: "notturno", type: "notturno", pos: { x: -4.6, z: 4.2 } },
      { kind: "enemy", type: "giudice", pos: { x: -8.5, z: -4.5 } }
    ],
    banner: "La Cripta dei Debiti"
  },
  {
    id: "vetta",
    theme: "vetta",
    player: { x: -2.5, z: 2.5 },
    figures: [
      { kind: "npc", key: "sibilla", type: "sibilla", pos: { x: 4.6, z: -0.5 } },
      { kind: "enemy", type: "custode", pos: { x: -8.5, z: -4.5 } }
    ],
    banner: "La vetta: il Custode del Rintocco"
  }
];

const ZONE_AFTER = {
  echo: { beats: [INTERLUDE_BEATS, TOWER_BEATS_1], next: 1 },
  dimenticata: { beats: [TOWER_BEATS_2], next: 2 },
  velma: { beats: [TOWER_BEATS_3], next: 3 },
  giudice: { beats: [CUSTODE_INTRO, TOWER_BEATS_4], next: 4 }
};

const NPC_DIALOGUES = {
  renzo: { beats: RENZO_BEATS, flag: "renzo" },
  adele: { beats: ADELE_BEATS, flag: "adele" },
  nino: { beats: NINO_BEATS, flag: "nino" },
  cera: { beats: CERA_BEATS, flag: "cera" },
  argo: { beats: ARGO_BEATS, flag: "argo" },
  araldo: { beats: ARALDO_BEATS, flag: "araldo" },
  notturno: { beats: NOTTURNO_BEATS, flag: "notturno" },
  sibilla: { beats: SIBILLA_BEATS, flag: "sibilla" }
};

let scene = null;
let combat = null;
let currentEnemyKey = null;
let zoneIndex = 0;
let exploring = false;
let last = performance.now();
const flags = {};

const keys = new Set();
let touchInput = { x: 0, z: 0 };
const isTouch = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;

function onKeyDown(e) {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (combat) combat.onPrimary();
    return;
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
}

function onKeyUp(e) {
  keys.delete(e.code);
}

function getInput() {
  let ix = 0, iz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) iz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  ix += touchInput.x;
  iz += touchInput.z;
  return { x: ix, z: iz };
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (exploring && scene) {
    scene.updatePlayer(dt, getInput());
    checkTrigger();
  }
  if (combat) combat.update(dt);
  if (scene) scene.update(dt);
  requestAnimationFrame(loop);
}

function checkTrigger() {
  const p = scene.getPlayerPos();
  if (!p) return;
  let best = null, bestD = 1.6;
  for (const t of scene.getTriggers()) {
    const d = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
    if (d < bestD) { bestD = d; best = t; }
  }
  if (best) handleTrigger(best.key);
}

function flashBanner(msg, ms = 1400) {
  const b = $("phase-banner");
  b.textContent = msg;
  b.classList.add("show");
  clearTimeout(b._b2);
  b._b2 = setTimeout(() => b.classList.remove("show"), ms);
}

function setExploring(on) {
  exploring = on;
  document.body.classList.toggle("exploring", on);
  const joy = $("joy");
  joy.classList.toggle("show", on && isTouch);
  const hint = $("turn-hint");
  if (on) {
    hint.textContent = "Parla con chi incontri o cammina verso la luce nemica";
    hint.classList.add("show");
  } else {
    hint.classList.remove("show");
  }
}

function startZone(index) {
  zoneIndex = index;
  const zone = ZONES[index];
  currentEnemyKey = zone.figures.find((f) => f.kind === "enemy").type;
  showScreen("game-screen");
  scene.resize();
  scene.setMode("explore");
  scene.applyTheme(zone.theme);
  scene.clearCharacters();
  scene.addPlayer(zone.player);
  for (const f of zone.figures) {
    if (f.kind === "npc") scene.addNpc(f.key, f.pos, f.type);
    else scene.addEnemyFigure(f.type, f.pos);
  }
  scene.updatePlayer(0.001, { x: 0, z: 0 });
  setExploring(true);
  flashBanner(zone.banner, 2200);
}

async function handleTrigger(key) {
  if (key === "enemy") {
    await triggerBattle();
    return;
  }
  await interactNpc(key);
}

async function interactNpc(key) {
  const cfg = NPC_DIALOGUES[key];
  if (!cfg || flags[cfg.flag]) return;
  setExploring(false);
  await narrate(cfg.beats);
  flags[cfg.flag] = true;
  scene.removeFigure(key);
  setExploring(true);
}

async function triggerBattle() {
  setExploring(false);
  flashBanner(currentEnemyKey === "echo" ? "L'Eco si avvicina…" : "Il nemico si avvicina…", 1300);
  await sleep(1100);
  if (exploring) return;
  beginBattle(currentEnemyKey);
}

function beginBattle(key) {
  currentEnemyKey = key;
  showScreen("game-screen");
  scene.resize();
  scene.setMode("battle");
  combat = createCombat({
    scene,
    enemyKey: key,
    bonus: flags,
    onWin,
    onDefeat,
    onMidFight: () => narrate(MID_BEATS[key] || [])
  });
}

async function onWin() {
  await sleep(500);
  combat = null;
  const step = ZONE_AFTER[currentEnemyKey];
  if (step) {
    for (const beats of step.beats) await narrate(beats);
    startZone(step.next);
  } else {
    const key = await showChoice(CHOICE_TEXT, CHOICES);
    const ending = ENDINGS[key];
    showEnding(ending);
  }
}

async function onDefeat() {
  combat = null;
  await sleep(400);
  showEnding(ENDINGS.defeat);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function initJoystick() {
  const base = $("joy-base"), knob = $("joy-knob");
  const R = 44;
  let active = false;
  const set = (dx, dy) => {
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchInput.x = dx / R;
    touchInput.z = -dy / R;
  };
  const reset = () => {
    active = false;
    knob.style.transform = "translate(0,0)";
    touchInput = { x: 0, z: 0 };
  };
  base.addEventListener("pointerdown", (e) => {
    active = true;
    base.setPointerCapture(e.pointerId);
    set(e.offsetX - R, e.offsetY - R);
  });
  base.addEventListener("pointermove", (e) => { if (active) set(e.offsetX - R, e.offsetY - R); });
  base.addEventListener("pointerup", reset);
  base.addEventListener("pointercancel", reset);
}

function boot() {
  showScreen("start-screen");
  $("play-btn").addEventListener("click", startGame);
  $("restart-btn").addEventListener("click", () => location.reload());
  $("parry-btn").addEventListener("click", () => { if (combat) combat.onPrimary(); });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", () => scene && scene.resize());
  initJoystick();

  const container = $("three-container");
  scene = createScene(container);
  const note = $("load-note");
  note.textContent = "";
  note.style.display = "none";
  scene.resize();
  scene.update(0);
  requestAnimationFrame(loop);
}

async function startGame() {
  showScreen("game-screen");
  scene.resize();
  scene.update(0);
  await narrate(INTRO_BEATS);
  startZone(0);
}

boot();