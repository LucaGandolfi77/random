/* ============================================================
 *  ARENA ROYALE — arena shooter (stile Brawl Stars) con la
 *  tempesta che si restringe (stile Fortnite). PWA mobile.
 *
 *  - Joystick touch ovunque (o WASD/frecce su PC)
 *  - Il tuo eroe spara da solo al nemico più vicino
 *  - Cassa distruttibili → power-up (+danno) e medikit (+HP)
 *  - Cerchio di fuoco: fuori si subisce danno, si restringe a ondate
 *  - Ultimo in piedi vince
 * ============================================================ */
"use strict";

import * as THREE from "three";

const $ = (id) => document.getElementById(id);

const els = {
  canvas: $("gameCanvas"),
  hpFill: $("hpFill"),
  hpVal: $("hpVal"),
  killsVal: $("killsVal"),
  aliveVal: $("aliveVal"),
  dmgVal: $("dmgVal"),
  stormVal: $("stormVal"),
  stormBox: $("stormBox"),
  minimap: $("minimap"),
  powerVal: $("powerVal"),
  botBars: $("botBars"),
  joyBase: $("joyBase"),
  joyKnob: $("joyKnob"),
  toast: $("toast"),
  toastText: $("toastText"),
  startOverlay: $("startOverlay"),
  startBtn: $("startBtn"),
  status: $("status"),
  endOverlay: $("endOverlay"),
  endTitle: $("endTitle"),
  endInfo: $("endInfo"),
  endKills: $("endKills"),
  restartBtn: $("restartBtn"),
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- Costanti ---------- */
const ARENA_R = 34;
const BOT_COUNT = 7;

const PLAYER_CFG = { hp: 100, speed: 9.5, dmg: 12, fireRate: 1.6, range: 15, projSpeed: 21 };
const BOT_CFG = { hp: 80, speed: 6.8, dmg: 10, fireRate: 1.1, range: 12, projSpeed: 17 };

const STORM_DMG = 12;              /* danno al secondo fuori zona */
const STORM_PHASES = [             /* [raggio target] — a ondate */
  { r: 24 }, { r: 17 }, { r: 11 }, { r: 7 }, { r: 5 },
];
const STORM_WAIT = 8;              /* secondi di pausa per fase */
const STORM_SHRINK = 6;            /* secondi di restringimento */

/* ---------- Stato partita ---------- */
let phase = "menu";                /* menu | playing | over | victory */
let player = null;
let bots = [];
let projectiles = [];
let crates = [];
let rocks = [];
let pickups = [];
let kills = 0;

const storm = {
  cx: 0, cz: 0,
  r: 30, targetR: STORM_PHASES[0].r,
  startR: 30,                   /* raggio di inizio del restringimento */
  state: "wait",                /* wait | shrink */
  timer: STORM_WAIT,
  phaseIdx: 0,
};

let lastT = performance.now();
let started = false;

/* ---------- Suoni (WebAudio minimale) ---------- */
let actx = null;
function sfx(freq, dur, type, vol) {
  try {
    if (!actx) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.05;
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch (e) { /* muto */ }
}
function initAudio() {
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
}

/* ---------- Three.js ---------- */
let scene, camera, renderer;
let groundMesh, wallMesh;
let stormLine, dangerRing, targetLine;
let stormLineGeo = null, dangerGeo = null, targetLineGeo = null;

function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a2340, 80, 160);
  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x3a3f55, 1.0));
  const sun = new THREE.DirectionalLight(0xffe6c0, 1.15);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  /* terreno circolare */
  const gGeo = new THREE.CircleGeometry(ARENA_R, 48);
  gGeo.rotateX(-Math.PI / 2);
  const gPos = gGeo.attributes.position;
  const gCol = new Float32Array(gPos.count * 3);
  const cA = new THREE.Color(0.30, 0.48, 0.24);
  const cB = new THREE.Color(0.22, 0.36, 0.20);
  const tmp = new THREE.Color();
  for (let i = 0; i < gPos.count; i++) {
    const d = Math.hypot(gPos.getX(i), gPos.getZ(i)) / ARENA_R;
    tmp.copy(cA).lerp(cB, clamp(d, 0, 1));
    gCol[i * 3] = tmp.r; gCol[i * 3 + 1] = tmp.g; gCol[i * 3 + 2] = tmp.b;
  }
  gGeo.setAttribute("color", new THREE.BufferAttribute(gCol, 3));
  groundMesh = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  scene.add(groundMesh);

  /* muro di confine */
  wallMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_R + 0.4, ARENA_R + 0.4, 3, 48, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x4a5570, side: THREE.DoubleSide, flatShading: true })
  );
  wallMesh.position.y = 1.5;
  scene.add(wallMesh);

  buildStormVisuals();
  resize();
}

/* ---------- Tempesta (visual) ---------- */
function buildStormVisuals() {
  if (stormLineGeo) { stormLineGeo.dispose(); dangerGeo.dispose(); targetLineGeo.dispose(); }
  if (stormLine) scene.remove(stormLine);
  if (dangerRing) scene.remove(dangerRing);
  if (targetLine) scene.remove(targetLine);

  stormLineGeo = makeCircleLine(storm.r);
  stormLine = new THREE.LineLoop(stormLineGeo, new THREE.LineBasicMaterial({ color: 0xff5a45 }));
  stormLine.position.y = 0.18;
  scene.add(stormLine);

  dangerGeo = new THREE.RingGeometry(storm.r, ARENA_R + 2, 48);
  dangerRing = new THREE.Mesh(
    dangerGeo,
    new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  dangerRing.rotation.x = -Math.PI / 2;
  dangerRing.position.y = 0.12;
  scene.add(dangerRing);

  targetLineGeo = makeCircleLine(storm.targetR);
  targetLine = new THREE.LineLoop(targetLineGeo, new THREE.LineBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.9 }));
  targetLine.position.y = 0.16;
  targetLine.visible = storm.state === "wait";
  scene.add(targetLine);
}

function makeCircleLine(r) {
  const pts = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return geo;
}

/* ---------- Personaggi ---------- */
function makeCharacter(color) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x22263a, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8), mat);
  body.position.y = 0.55;
  grp.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat);
  head.position.y = 1.35;
  grp.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.14), darkMat);
  visor.position.set(0, 1.38, 0.3);
  grp.add(visor);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.85), darkMat);
  gun.position.set(0, 0.78, 0.62);
  grp.add(gun);

  scene.add(grp);
  return grp;
}

function makePlayer() {
  player = {
    grp: makeCharacter(0x3fb8e8),
    pos: new THREE.Vector3(0, 0, 0),
    hp: PLAYER_CFG.hp,
    dmg: PLAYER_CFG.dmg,
    fireCd: 0,
    alive: true,
    aimYaw: 0,
    hits: 0,
    move: new THREE.Vector3(),
  };
  player.grp.position.copy(player.pos);
}

function makeBot(i) {
  const a = (i / BOT_COUNT) * Math.PI * 2 + rand(-0.4, 0.4);
  const r = rand(17, 26);
  const bot = {
    grp: makeCharacter([0xff6b5e, 0xffb13b, 0x9d5cff, 0x58d66b, 0xff5ec4, 0x41c8e0, 0xffa94d][i % 7]),
    pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
    hp: BOT_CFG.hp,
    dmg: BOT_CFG.dmg,
    speed: BOT_CFG.speed + rand(-0.6, 0.6),
    fireCd: rand(0, 0.6),
    alive: true,
    aimYaw: rand(0, Math.PI * 2),
    wanderT: 0,
    wanderTarget: new THREE.Vector3(),
    hitT: 0,
  };
  bot.grp.position.copy(bot.pos);
  return bot;
}

/* ---------- Ostacoli e casse ---------- */
function placeObstacles() {
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a8296, flatShading: true });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8713a, flatShading: true });
  const crateDark = new THREE.MeshLambertMaterial({ color: 0x7e5127, flatShading: true });

  /* rocce (indistruttibili) */
  let placed = 0, tries = 0;
  while (placed < 9 && tries < 600) {
    tries++;
    const x = rand(-ARENA_R + 4, ARENA_R - 4);
    const z = rand(-ARENA_R + 4, ARENA_R - 4);
    if (Math.hypot(x, z) < 6) continue;
    if (tooCloseToObstacle(x, z, 3)) continue;
    const g = new THREE.DodecahedronGeometry(rand(0.9, 1.6), 0);
    g.rotateY(rand(0, 6));
    const m = new THREE.Mesh(g, rockMat);
    m.position.set(x, 0.7, z);
    m.scale.y = 0.8;
    scene.add(m);
    rocks.push({ mesh: m, x, z, half: 1.6 });
    placed++;
  }
  /* casse (distruttibili, 30 HP) */
  placed = 0; tries = 0;
  while (placed < 12 && tries < 600) {
    tries++;
    const x = rand(-ARENA_R + 4, ARENA_R - 4);
    const z = rand(-ARENA_R + 4, ARENA_R - 4);
    if (Math.hypot(x, z) < 6) continue;
    if (tooCloseToObstacle(x, z, 3)) continue;
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMat);
    box.position.y = 0.75;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), crateDark);
    lid.position.y = 1.55;
    grp.add(box, lid);
    grp.position.set(x, 0, z);
    scene.add(grp);
    crates.push({ grp, x, z, half: 0.8, hp: 30 });
    placed++;
  }
}

function tooCloseToObstacle(x, z, minD) {
  for (const o of rocks) if (Math.hypot(x - o.x, z - o.z) < minD) return true;
  for (const c of crates) if (Math.hypot(x - c.x, z - c.z) < minD) return true;
  return false;
}

/* ---------- Power-up ---------- */
const PU_MAT = new THREE.MeshBasicMaterial({ color: 0xffd75e });
const MED_MAT = new THREE.MeshBasicMaterial({ color: 0x7ce08a });

function dropPickup(x, z, kind) {
  const grp = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
    kind === "power" ? PU_MAT : MED_MAT
  );
  m.position.y = 0.4;
  grp.add(m);
  grp.position.set(x, 0, z);
  scene.add(grp);
  pickups.push({ grp, kind, pos: new THREE.Vector3(x, 0, z), t: rand(0, 6) });
}

function breakCrate(crate) {
  scene.remove(crate.grp);
  const kind = Math.random() < 0.6 ? "power" : "med";
  dropPickup(crate.x, crate.z, kind);
  const i = crates.indexOf(crate);
  if (i >= 0) crates.splice(i, 1);
}

/* ---------- Proiettili ---------- */
const PROJ_MAT = new THREE.MeshBasicMaterial({ color: 0xffe27a });

function shoot(e, targetPos, dmg, speed, fromPlayer) {
  const dir = new THREE.Vector3().subVectors(targetPos, e.pos);
  if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
  dir.y = 0;
  dir.normalize();
  const p = {
    grp: new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), PROJ_MAT),
    pos: e.pos.clone().addScaledVector(dir, 1.1),
    vel: dir.clone().multiplyScalar(speed),
    dmg,
    fromPlayer,
  };
  p.pos.y = 0.9;
  p.grp.position.copy(p.pos);
  scene.add(p.grp);
  projectiles.push(p);
  sfx(fromPlayer ? 620 : 340, 0.08, "square", fromPlayer ? 0.03 : 0.02);
}

/* ---------- Collisioni cerchio-vs-AABB ---------- */
function circleBlocked(x, z, r) {
  for (const o of rocks) {
    const dx = Math.max(Math.abs(x - o.x) - o.half, 0);
    const dz = Math.max(Math.abs(z - o.z) - o.half, 0);
    if (dx * dx + dz * dz < r * r) return o;
  }
  for (const c of crates) {
    const dx = Math.max(Math.abs(x - c.x) - c.half, 0);
    const dz = Math.max(Math.abs(z - c.z) - c.half, 0);
    if (dx * dx + dz * dz < r * r) return c;
  }
  return null;
}

function resolveEntity(e, r) {
  const hit = circleBlocked(e.pos.x, e.pos.z, r);
  if (hit) {
    /* spingi fuori lungo l'asse meno invaso */
    const ox = e.pos.x - hit.x, oz = e.pos.z - hit.z;
    const minX = hit.x - hit.half, maxX = hit.x + hit.half;
    const minZ = hit.z - hit.half, maxZ = hit.z + hit.half;
    const px = clamp(e.pos.x, minX, maxX), pz = clamp(e.pos.z, minZ, maxZ);
    const dx = e.pos.x - px, dz = e.pos.z - pz;
    if (Math.abs(dx) > Math.abs(dz)) e.pos.x = px + (dx >= 0 ? r : -r);
    else e.pos.z = pz + (dz >= 0 ? r : -r);
  }
  const d = Math.hypot(e.pos.x, e.pos.z);
  if (d > ARENA_R - 0.5) {
    e.pos.x *= (ARENA_R - 0.5) / d;
    e.pos.z *= (ARENA_R - 0.5) / d;
  }
}

/* ---------- Tempesta: logica ---------- */
function updateStorm(dt) {
  if (phase !== "playing") return;

  storm.timer -= dt;
  if (storm.state === "wait") {
    if (storm.timer <= 0) {
      storm.state = "shrink";
      storm.startR = storm.r;       /* parte dal raggio corrente */
      storm.timer = STORM_SHRINK;
      els.stormBox.classList.add("warn");
      showToast("🔥 LA TEMPESTA SI RESTRINGE!", 1600);
      sfx(180, 0.7, "sawtooth", 0.06);
    }
  } else {
    const t = 1 - clamp(storm.timer / STORM_SHRINK, 0, 1);
    storm.r = storm.targetR + (storm.startR - storm.targetR) * (1 - t * t);
    if (storm.timer <= 0) {
      storm.r = storm.targetR;
      storm.phaseIdx++;
      if (storm.phaseIdx < STORM_PHASES.length) {
        storm.state = "wait";
        storm.timer = STORM_WAIT;
        storm.targetR = STORM_PHASES[storm.phaseIdx].r;
        els.stormBox.classList.remove("warn");
      } else {
        storm.state = "end";      /* cerchio finale */
        storm.timer = 999;
      }
      buildStormVisuals();
    }
  }

  /* danno fuori zona */
  storm.dmgAcc = (storm.dmgAcc || 0) + STORM_DMG * dt;
  while (storm.dmgAcc >= 1) {
    storm.dmgAcc -= 1;
    if (inStorm(player.pos)) damageEntity(player, 1);
    for (const b of bots) if (b.alive && inStorm(b.pos)) damageEntity(b, 1);
  }
}

function inStorm(p) {
  return Math.hypot(p.x - storm.cx, p.z - storm.cz) > storm.r;
}

/* ---------- Danno ---------- */
function damageEntity(e, amount) {
  e.hp -= amount;
  e.hitT = 0.12;
  if (e === player) sfx(240, 0.1, "sawtooth", 0.05);
  if (e.hp <= 0) {
    e.alive = false;
    e.hp = 0;
    if (e === player) onPlayerDeath();
    else onBotDeath(e);
  }
}

function onPlayerDeath() {
  phase = "over";
  const place = bots.filter((b) => b.alive).length + 1;
  els.endTitle.textContent = "💀 GAME OVER";
  els.endInfo.textContent = "Posizione: " + place + "/" + (BOT_COUNT + 1);
  els.endKills.textContent = "Eliminazioni: " + kills;
  els.endOverlay.classList.remove("hidden");
  sfx(140, 0.5, "sawtooth", 0.06);
}

function onBotDeath(bot) {
  bot.grp.visible = false;
  if (phase !== "playing") return;
  kills++;
  sfx(500, 0.15, "square", 0.04);
  const alive = bots.filter((b) => b.alive).length;
  if (alive === 0) {
    phase = "victory";
    els.endTitle.textContent = "🏆 VITTORIA!";
    els.endInfo.textContent = "Sei l'ultimo sopravvissuto!";
    els.endKills.textContent = "Eliminazioni: " + kills;
    els.endOverlay.classList.remove("hidden");
    showToast("🏆 VITTORIA!", 2500);
  }
}

/* ---------- AI nemici ---------- */
function updateBot(bot, dt) {
  if (!bot.alive || phase !== "playing") return;
  bot.hitT -= dt;

  const toPlayer = new THREE.Vector3().subVectors(player.pos, bot.pos);
  const distToPlayer = toPlayer.length();
  const inZona = !inStorm(bot.pos);

  let target = null;
  if (!inZona) {
    target = new THREE.Vector3(storm.cx, 0, storm.cz);   /* scappa dentro */
  } else if (distToPlayer < 15) {
    target = player.pos;
  } else {
    bot.wanderT -= dt;
    if (bot.wanderT <= 0) {
      bot.wanderT = rand(2, 4.5);
      const a = rand(0, Math.PI * 2);
      const r = rand(4, 16);
      bot.wanderTarget.set(bot.pos.x + Math.cos(a) * r, 0, bot.pos.z + Math.sin(a) * r);
    }
    target = bot.wanderTarget;
  }

  /* movimento verso il target */
  const dir = new THREE.Vector3().subVectors(target, bot.pos);
  dir.y = 0;
  if (dir.lengthSq() > 0.5) {
    dir.normalize();
    bot.pos.addScaledVector(dir, bot.speed * dt);
    resolveEntity(bot, 0.5);
    bot.aimYaw = Math.atan2(dir.x, dir.z);
  }

  /* spara al giocatore */
  bot.fireCd -= dt;
  if (distToPlayer < BOT_CFG.range && bot.fireCd <= 0) {
    bot.fireCd = 1 / BOT_CFG.fireRate;
    shoot(bot, player.pos, bot.dmg, BOT_CFG.projSpeed, false);
  }

  /* raccoglie power-up vicini */
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (Math.hypot(bot.pos.x - p.pos.x, bot.pos.z - p.pos.z) < 1.3) {
      scene.remove(p.grp);
      pickups.splice(i, 1);
      if (p.kind === "power") bot.dmg += 2;
      else bot.hp = Math.min(80, bot.hp + 25);
    }
  }

  applyEntityVisual(bot);
}

/* ---------- Giocatore ---------- */
function updatePlayer(dt) {
  if (!player.alive || phase !== "playing") return;
  player.hitT -= dt;

  player.move.x = joy.dx;
  player.move.z = joy.dy;
  if (keys.up) player.move.z = -1;
  if (keys.down) player.move.z = 1;
  if (keys.left) player.move.x = -1;
  if (keys.right) player.move.x = 1;
  const ml = Math.hypot(player.move.x, player.move.z);
  if (ml > 1) { player.move.x /= ml; player.move.z /= ml; }

  if (ml > 0.15) {
    player.pos.x += player.move.x * PLAYER_CFG.speed * dt;
    player.pos.z += player.move.z * PLAYER_CFG.speed * dt;
    resolveEntity(player, 0.5);
  }

  /* auto-fire: nemico più vicino nel raggio */
  let best = null, bestD = PLAYER_CFG.range;
  for (const b of bots) {
    if (!b.alive) continue;
    const d = Math.hypot(b.pos.x - player.pos.x, b.pos.z - player.pos.z);
    if (d < bestD) { bestD = d; best = b; }
  }
  player.fireCd -= dt;
  if (best && player.fireCd <= 0) {
    player.fireCd = 1 / PLAYER_CFG.fireRate;
    shoot(player, best.pos, player.dmg, PLAYER_CFG.projSpeed, true);
    player.aimYaw = Math.atan2(best.pos.x - player.pos.x, best.pos.z - player.pos.z);
  } else if (ml > 0.15) {
    player.aimYaw = Math.atan2(player.move.x, player.move.z);
  }

  /* power-up del giocatore */
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (Math.hypot(player.pos.x - p.pos.x, player.pos.z - p.pos.z) < 1.2) {
      scene.remove(p.grp);
      pickups.splice(i, 1);
      if (p.kind === "power") {
        player.dmg += 2;
        showToast("⚔ POTENZIAMENTO! +2 DANNO", 1200);
        sfx(700, 0.12, "square", 0.05);
      } else {
        player.hp = Math.min(PLAYER_CFG.hp, player.hp + 25);
        showToast("➕ MEDIKIT +25 HP", 1200);
        sfx(520, 0.12, "square", 0.05);
      }
    }
  }

  applyEntityVisual(player);
}

function applyEntityVisual(e) {
  e.grp.position.copy(e.pos);
  e.grp.rotation.y = e.aimYaw;
  const s = e.hitT > 0 ? 1.12 : 1;
  e.grp.scale.set(s, s, s);
}

/* ---------- Proiettili ---------- */
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.pos.addScaledVector(p.vel, dt);
    p.pos.y = 0.9;
    p.grp.position.copy(p.pos);

    let dead = false;
    const dCenter = Math.hypot(p.pos.x, p.pos.z);
    if (dCenter > ARENA_R) dead = true;

    /* ostacoli */
    if (!dead) {
      for (const o of rocks) {
        const dx = Math.max(Math.abs(p.pos.x - o.x) - o.half, 0);
        const dz = Math.max(Math.abs(p.pos.z - o.z) - o.half, 0);
        if (dx * dx + dz * dz < 0.2 * 0.2) { dead = true; break; }
      }
    }
    if (!dead) {
      for (let ci = crates.length - 1; ci >= 0; ci--) {
        const c = crates[ci];
        const dx = Math.max(Math.abs(p.pos.x - c.x) - c.half, 0);
        const dz = Math.max(Math.abs(p.pos.z - c.z) - c.half, 0);
        if (dx * dx + dz * dz < 0.2 * 0.2) {
          c.hp -= p.dmg;
          sfx(260, 0.08, "triangle", 0.04);
          if (c.hp <= 0) breakCrate(c);
          dead = true;
          break;
        }
      }
    }

    /* entità */
    if (!dead && p.fromPlayer) {
      for (const b of bots) {
        if (!b.alive) continue;
        if (Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 0.65) {
          damageEntity(b, p.dmg);
          dead = true;
          break;
        }
      }
    }
    if (!dead && !p.fromPlayer && player.alive) {
      if (Math.hypot(player.pos.x - p.pos.x, player.pos.z - p.pos.z) < 0.65) {
        damageEntity(player, p.dmg);
        dead = true;
      }
    }

    if (dead) {
      scene.remove(p.grp);
      projectiles.splice(i, 1);
    }
  }
}

/* ---------- Power-up animazione ---------- */
function updatePickups(dt) {
  for (const p of pickups) {
    p.t += dt;
    p.grp.rotation.y += dt * 3;
    p.grp.position.y = Math.abs(Math.sin(p.t * 2)) * 0.35;
  }
}

/* ---------- Camera ---------- */
function updateCamera(dt) {
  if (!player) return;
  const target = player.pos.clone().add(new THREE.Vector3(0, 24, 13));
  camera.position.lerp(target, 1 - Math.exp(-4.5 * dt));
  camera.lookAt(player.pos);
}

/* ---------- Input: joystick touch ---------- */
const joy = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, rad: 50 };
const keys = { up: false, down: false, left: false, right: false };

window.addEventListener("pointerdown", (e) => {
  if (phase !== "playing") return;
  if (e.target.closest("#hud, #toast")) return;
  joy.active = true;
  joy.id = e.pointerId;
  joy.bx = e.clientX;
  joy.by = e.clientY;
  joy.dx = 0; joy.dy = 0;
  els.joyBase.classList.remove("hidden");
  els.joyBase.style.left = e.clientX + "px";
  els.joyBase.style.top = e.clientY + "px";
  els.joyKnob.style.left = "50%";
  els.joyKnob.style.top = "50%";
});
window.addEventListener("pointermove", (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  const dx = e.clientX - joy.bx;
  const dy = e.clientY - joy.by;
  const d = Math.hypot(dx, dy);
  const m = Math.min(d, joy.rad);
  joy.dx = d > 1 ? (dx / d) * (m / joy.rad) : 0;
  joy.dy = d > 1 ? (dy / d) * (m / joy.rad) : 0;
  els.joyKnob.style.left = (50 + joy.dx * 50) + "%";
  els.joyKnob.style.top = (50 + joy.dy * 50) + "%";
});
window.addEventListener("pointerup", (e) => {
  if (e.pointerId !== joy.id) return;
  joy.active = false;
  joy.id = null;
  joy.dx = 0; joy.dy = 0;
  els.joyBase.classList.add("hidden");
});
window.addEventListener("pointercancel", () => {
  joy.active = false; joy.id = null; joy.dx = 0; joy.dy = 0;
  els.joyBase.classList.add("hidden");
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
});

/* ---------- HUD ---------- */
function updateHud() {
  els.hpFill.style.width = Math.max(0, player.hp) + "%";
  els.hpVal.textContent = Math.max(0, Math.round(player.hp));
  els.killsVal.textContent = kills;
  els.aliveVal.textContent = bots.filter((b) => b.alive).length + 1;
  els.dmgVal.textContent = player.dmg;

  if (storm.state === "wait") {
    els.stormVal.textContent = "Tempesta fra " + Math.max(0, Math.ceil(storm.timer)) + "s";
  } else if (storm.state === "shrink") {
    els.stormVal.textContent = "🔥 LA TEMPESTA ARRIVA!";
  } else {
    els.stormVal.textContent = "Cerchio finale!";
  }
}

function updateBotBars() {
  els.botBars.innerHTML = "";
  for (const b of bots) {
    if (!b.alive) continue;
    const v = b.pos.clone().add(new THREE.Vector3(0, 2.1, 0)).project(camera);
    if (v.z > 1) continue;
    const x = ((v.x + 1) / 2) * window.innerWidth;
    const y = ((-v.y + 1) / 2) * window.innerHeight;
    if (x < -20 || x > window.innerWidth + 20 || y < -20 || y > window.innerHeight + 20) continue;
    const bar = document.createElement("div");
    bar.className = "botbar";
    bar.style.left = x + "px";
    bar.style.top = y + "px";
    const fill = document.createElement("div");
    fill.style.width = Math.max(0, b.hp / BOT_CFG.hp * 100) + "%";
    bar.appendChild(fill);
    els.botBars.appendChild(bar);
  }
}

function drawMinimap() {
  const ctx = els.minimap.getContext("2d");
  const S = 96;
  const scale = S / (ARENA_R * 2.4);
  ctx.clearRect(0, 0, S, S);
  /* arena */
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, ARENA_R * scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60, 90, 50, 0.5)";
  ctx.fill();
  /* zona tempesta */
  ctx.beginPath();
  ctx.arc(S / 2 + storm.cx * scale, S / 2 + storm.cz * scale, storm.r * scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 80, 50, 0.75)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S / 2 + storm.cx * scale, S / 2 + storm.cz * scale, storm.r * scale, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff5a45";
  ctx.lineWidth = 2;
  ctx.stroke();
  /* giocatore */
  ctx.beginPath();
  ctx.arc(S / 2 + player.pos.x * scale, S / 2 + player.pos.z * scale, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#3fb8e8";
  ctx.fill();
  /* nemici */
  for (const b of bots) {
    if (!b.alive) continue;
    ctx.beginPath();
    ctx.arc(S / 2 + b.pos.x * scale, S / 2 + b.pos.z * scale, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b5e";
    ctx.fill();
  }
}

/* ---------- Toast ---------- */
let toastTimer = 0;
function showToast(msg, ms) {
  els.toastText.textContent = msg;
  els.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), ms || 1800);
}

/* ---------- Avvio / reset ---------- */
function resetMatch() {
  /* pulizia entità */
  for (const b of bots) { scene.remove(b.grp); }
  bots = [];
  for (const p of projectiles) scene.remove(p.grp);
  projectiles = [];
  for (const p of pickups) scene.remove(p.grp);
  pickups = [];
  for (const c of crates) scene.remove(c.grp);
  crates = [];
  for (const r of rocks) scene.remove(r.mesh);
  rocks = [];
  if (player) scene.remove(player.grp);
  player = null;

  kills = 0;
  storm.cx = 0; storm.cz = 0;
  storm.r = 30;
  storm.startR = 30;
  storm.targetR = STORM_PHASES[0].r;
  storm.state = "wait";
  storm.timer = STORM_WAIT;
  storm.phaseIdx = 0;
  storm.dmgAcc = 0;
  els.stormBox.classList.remove("warn");

  makePlayer();
  for (let i = 0; i < BOT_COUNT; i++) bots.push(makeBot(i));
  placeObstacles();
  buildStormVisuals();

  phase = "playing";
  els.endOverlay.classList.add("hidden");
  els.startOverlay.classList.add("hidden");
  showToast("🔥 IN ARENA! " + (BOT_COUNT + 1) + " giocatori", 1800);
}

els.startBtn.addEventListener("click", () => {
  initAudio();
  try { initThree(); } catch (e) { els.status.textContent = "WebGL non disponibile."; return; }
  started = true;
  resetMatch();
  requestAnimationFrame(loop);
});

els.restartBtn.addEventListener("click", () => {
  resetMatch();
});

/* ---------- Resize ---------- */
function resize() {
  if (!renderer) return;
  const w = els.canvas.clientWidth, h = els.canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { if (started) resize(); });

/* ---------- Loop ---------- */
function loop(now) {
  const dt = Math.min(1 / 30, (now - lastT) / 1000);
  lastT = now;

  updateStorm(dt);
  updatePlayer(dt);
  for (const b of bots) updateBot(b, dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateCamera(dt);

  renderer.render(scene, camera);

  if (phase === "playing") {
    updateHud();
    updateBotBars();
    drawMinimap();
  }
  requestAnimationFrame(loop);
}

/* ---------- Boot ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

els.status.textContent = "Pronto! Tocca per giocare";
els.startBtn.disabled = false;
