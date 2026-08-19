/* ============================================================
 *  VOLA! 3D — uccello controllato con le BRACCIA (PWA)
 *  MediaPipe PoseLandmarker (braccia) + Three.js
 *
 *  - Videocamera frontale in alto, mondo 3D in basso
 *  - Telecamera dietro all'uccello (chase cam)
 *  - Volo libero: quota (Y), yaw (gira), roll (virata), picchiata
 *  - GAME OVER se tocchi il suolo
 *
 *  Comandi con le braccia:
 *   - braccia su/giù        → salita / discesa
 *   - spostate di lato      → gira (yaw)
 *   - una su e una giù      → virata (roll + bank-to-turn)
 *   - braccia vicine        → picchiata
 * ============================================================ */
"use strict";

import * as THREE from "three";

const $ = (id) => document.getElementById(id);

const els = {
  cam: $("cam"),
  camCanvas: $("camCanvas"),
  gameCanvas: $("gameCanvas"),
  startOverlay: $("startOverlay"),
  startBtn: $("startBtn"),
  status: $("status"),
  handsDot: $("handsDot"),
  handsLabel: $("handsLabel"),
  altFill: $("altFill"),
  altVal: $("altVal"),
  rollVal: $("rollVal"),
  diveLabel: $("diveLabel"),
  timeVal: $("timeVal"),
  scoreBox: $("scoreBox"),
  ringVal: $("ringVal"),
  scoreVal: $("scoreVal"),
  comboBadge: $("comboBadge"),
  trophyBtn: $("trophyBtn"),
  trophyCount: $("trophyCount"),
  trophyPanel: $("trophyPanel"),
  trophyList: $("trophyList"),
  trophyClose: $("trophyClose"),
  toast: $("toast"),
  toastText: $("toastText"),
  gameOverOverlay: $("gameOverOverlay"),
  finalTime: $("finalTime"),
  bestLine: $("bestLine"),
  restartBtn: $("restartBtn"),
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- MediaPipe PoseLandmarker ---------- */
const VISION_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

const LS = 11, RS = 12;   /* spalle (sinistra/destra del soggetto) */
const LE = 13, RE = 14;   /* gomiti */
const LW = 15, RW = 16;   /* polsi */

let landmarker = null;

async function loadLandmarker() {
  const vision = await import(VISION_CDN);
  const fileset = await vision.FilesetResolver.forVisionTasks(VISION_CDN + "/wasm");
  const make = (delegate) =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  try {
    landmarker = await make("GPU");
  } catch (e) {
    landmarker = await make("CPU");
  }
}

/* ---------- Camera ---------- */
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  els.cam.srcObject = stream;
  await els.cam.play();
}

/* ---------- Controllo (braccia -> comandi) ---------- */
const ctrl = { arms: 0, climb: 0, yaw: 0, roll: 0, dive: false };
let currentPose = null;

const smooth = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

function updateControl(poses) {
  currentPose = poses && poses.length ? poses[0] : null;
  ctrl.arms = currentPose ? 1 : 0;
  if (!currentPose) return;

  const p = currentPose;
  const mx = (i) => 1 - p[i].x;   /* specchia X come sullo schermo */
  const my = (i) => p[i].y;

  const arms = [];
  for (const [sh, el, wr] of [[LS, LE, LW], [RS, RE, RW]]) {
    if (p[wr].visibility < 0.4 || p[sh].visibility < 0.4) continue;
    arms.push({
      up: clamp((my(sh) - my(wr)) * 2.6, -1, 1),
      lat: clamp((mx(wr) - mx(sh)) * 3.0, -1, 1),
      x: mx(wr),
      y: my(wr),
    });
  }
  if (arms.length === 0) return;

  let c = 0;
  for (const a of arms) c += a.up;
  ctrl.climb = smooth(ctrl.climb, c / arms.length, 5, lastDt);

  let lat = 0;
  for (const a of arms) lat += a.lat;
  ctrl.yaw = smooth(ctrl.yaw, lat / arms.length, 5, lastDt);

  /* roll: braccio SINISTRO (schermo) più alto -> inclinazione a SINISTRA
     (verificato empiricamente: roll<0 = ala sinistra giù = bank a sinistra) */
  if (arms.length === 2) {
    const r = clamp((arms[0].y - arms[1].y) * 3.4, -1, 1);
    ctrl.roll = smooth(ctrl.roll, r, 6, lastDt);
  } else {
    ctrl.roll = smooth(ctrl.roll, 0, 3, lastDt);
  }

  ctrl.dive = false;
  if (arms.length === 2) {
    const d = Math.hypot(arms[0].x - arms[1].x, (arms[0].y - arms[1].y) * 1.4);
    ctrl.dive = d < 0.14;
  }
}

/* ---------- Punteggio, anelli e trofei ---------- */
let runScore = 0;            /* punteggio della partita in corso */
let runRings = 0;
let combo = 0;               /* anelli consecutivi (bonus) */
let comboTimer = 0;
let bestScore = 0;
const COMBO_WINDOW = 4;      /* secondi per mantenere la combo */
const stats = {
  time: 0, rings: 0, dives: 0, dist: 0,
  maxAlt: 0, runs: 0, bestRunTime: 0,
};
const unlocked = new Set();
const RING_SCORE = 100;

const TROPHIES = [
  { id: "first",    icon: "🕊️", name: "PRIMO VOLO",          desc: "Vola per 30 secondi",           test: (s) => s.time >= 30 },
  { id: "rings5",   icon: "⭕", name: "CACCIATORE",           desc: "Raccogli 5 anelli",            test: (s) => s.rings >= 5 },
  { id: "rings20",  icon: "👑", name: "MAESTRO DEGLI ANELLI", desc: "Raccogli 20 anelli",           test: (s) => s.rings >= 20 },
  { id: "dive5",    icon: "⬇️", name: "PICCHIATORE",          desc: "Esegui 5 picchiate",           test: (s) => s.dives >= 5 },
  { id: "alt",      icon: "🏔️", name: "ALTA QUOTA",          desc: "Raggiungi 150 m di quota",     test: (s) => s.maxAlt >= 150 },
  { id: "explorer", icon: "🧭", name: "ESPLORATORE",          desc: "Percorri 3000 m",              test: (s) => s.dist >= 3000 },
  { id: "survive",  icon: "💪", name: "SOPRAVVISSUTO",        desc: "Vola 90 s in una partita",     test: (s) => s.bestRunTime >= 90 },
  { id: "runs",     icon: "🔁", name: "PERSEVERANTE",         desc: "Gioca 5 partite",              test: (s) => s.runs >= 5 },
];

function loadProgress() {
  try {
    const t = localStorage.getItem("vola_trophies_v1");
    if (t) JSON.parse(t).forEach((id) => unlocked.add(id));
    const b = localStorage.getItem("vola_best_v1");
    if (b) bestScore = parseInt(b, 10) || 0;
  } catch (e) { /* modalità privata */ }
}
function saveProgress() {
  try {
    localStorage.setItem("vola_trophies_v1", JSON.stringify([...unlocked]));
    localStorage.setItem("vola_best_v1", String(bestScore));
  } catch (e) {}
}

let toastTimer = 0;
function showToast(msg, ms) {
  els.toastText.textContent = msg;
  els.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), ms || 2200);
}

function checkTrophies() {
  let any = false;
  for (const t of TROPHIES) {
    if (!unlocked.has(t.id) && t.test(stats)) {
      unlocked.add(t.id);
      saveProgress();
      showToast(t.icon + " TROFEO: " + t.name + "!", 2800);
      any = true;
    }
  }
  if (any) updateTrophyUi();
}

function buildTrophyList() {
  els.trophyList.innerHTML = "";
  for (const t of TROPHIES) {
    const on = unlocked.has(t.id);
    const li = document.createElement("li");
    li.className = "trophy" + (on ? " on" : "");
    li.innerHTML = "<span class='tic'>" + (on ? "✓" : "✗") + "</span>" +
                   "<div class='tt'><b>" + t.name + "</b><small>" + t.desc + "</small></div>";
    els.trophyList.appendChild(li);
  }
}

function updateTrophyUi() {
  const n = unlocked.size + "/" + TROPHIES.length;
  els.trophyBtn.textContent = "🏆 " + n;
  els.trophyCount.textContent = n;
  if (!els.trophyPanel.classList.contains("hidden")) buildTrophyList();
}

/* ---------- Mondo 3D ---------- */
let scene, camera, renderer;
let birdGroup, wingL, wingR;
let cloudsList = [];
let lastDt = 1 / 60;

/* Altezza del terreno: colline dolci + catena montuosa diagonale + vette */
function terrainH(x, z) {
  let h =
    Math.sin(x * 0.005 + 1.3) * 7 +
    Math.cos(z * 0.004 + 0.7) * 7 +
    Math.sin((x + z) * 0.011) * 4 +
    Math.cos((x - z) * 0.009) * 4 +
    Math.cos(x * 0.0021 + z * 0.0027) * 10 +
    3;

  /* catena montuosa lungo la diagonale NW-SE */
  const d = (x + z) / Math.SQRT2 - 380;
  const band = Math.exp(-(d * d) / (2 * 230 * 230));
  const ridge = Math.abs(Math.sin(x * 0.02 + z * 0.02 + 1.7)) *
                (0.6 + 0.4 * Math.sin(x * 0.05 + z * 0.04));
  h += band * (40 + ridge * 70);

  /* vette isolate */
  h += Math.exp(-((x - 350) ** 2 + (z + 420) ** 2) / (2 * 130 * 130)) * 60;
  h += Math.exp(-((x + 560) ** 2 + (z - 300) ** 2) / (2 * 110 * 110)) * 48;

  return h;
}
const WATER_Y = 2.6;
const WORLD_R = 1100;         /* raggio del mondo */
const MAX_Y = 190;

function buildSky() {
  const geo = new THREE.SphereGeometry(1700, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        float h = normalize(vP).y;
        vec3 top = vec3(0.30, 0.48, 0.78);
        vec3 mid = vec3(0.96, 0.72, 0.52);
        vec3 low = vec3(1.00, 0.62, 0.42);
        vec3 col = mix(mid, top, smoothstep(0.05, 0.55, h));
        col = mix(low, col, smoothstep(-0.25, 0.08, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(34, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2c9 })
  );
  sun.position.set(-260, 300, -420);
  scene.add(sun);
}

function buildTerrain() {
  const SIZE = 2400, SEG = 96;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0.78, 0.68, 0.52);
  const cGrassA = new THREE.Color(0.38, 0.60, 0.28);
  const cGrassB = new THREE.Color(0.30, 0.50, 0.25);
  const cRock = new THREE.Color(0.52, 0.50, 0.47);
  const cSnow = new THREE.Color(0.82, 0.84, 0.88);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrainH(x, z);
    pos.setY(i, y);
    if (y < WATER_Y + 0.6) {
      tmp.copy(cSand);
    } else if (y > 58) {
      tmp.copy(cRock).lerp(cSnow, clamp01((y - 58) / 45));
    } else if (y > 24) {
      tmp.copy(cGrassB).lerp(cRock, clamp01((y - 24) / 30));
    } else {
      const t = (y - 2.6) / 18;
      tmp.copy(cGrassA).lerp(cGrassB, clamp01(t));
      if ((Math.sin(x * 0.9) * Math.cos(z * 0.7)) > 0.72) tmp.multiplyScalar(1.08);
    }
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  scene.add(new THREE.Mesh(geo, mat));
}

function buildTrees() {
  const geo = new THREE.ConeGeometry(1.5, 7, 7);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cTrunk = new THREE.Color(0.42, 0.30, 0.20);
  const cGreenA = new THREE.Color(0.22, 0.45, 0.20);
  const cGreenB = new THREE.Color(0.16, 0.36, 0.16);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 3.5) / 7;
    if (t < 0.3) tmp.copy(cTrunk);
    else tmp.copy(cGreenA).lerp(cGreenB, clamp01((t - 0.3) / 0.7));
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  const trees = new THREE.InstancedMesh(geo, mat, 240);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0, tries = 0;
  while (placed < 240 && tries < 6000) {
    tries++;
    const x = (Math.random() - 0.5) * 2100;
    const z = (Math.random() - 0.5) * 2100;
    const y = terrainH(x, z);
    if (y < WATER_Y + 1.2 || y > 20) continue;
    const sc = 0.8 + Math.random() * 0.9;
    s.set(sc, sc * (0.9 + Math.random() * 0.5), sc);
    p.set(x, y - 0.5, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    m.compose(p, q, s);
    trees.setMatrixAt(placed, m);
    placed++;
  }
  trees.count = placed;
  scene.add(trees);
}

function buildRocks() {
  const geo = new THREE.DodecahedronGeometry(1.4, 0);
  geo.rotateX(Math.random());
  const mat = new THREE.MeshLambertMaterial({ color: 0x8d857c, flatShading: true });
  const rocks = new THREE.InstancedMesh(geo, mat, 90);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0, tries = 0;
  while (placed < 90 && tries < 3000) {
    tries++;
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    const y = terrainH(x, z);
    if (y < WATER_Y + 0.8) continue;
    const sc = 0.5 + Math.random() * 1.4;
    s.set(sc, sc * 0.7, sc);
    p.set(x, y - 0.4 * sc, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    m.compose(p, q, s);
    rocks.setMatrixAt(placed, m);
    placed++;
  }
  rocks.count = placed;
  scene.add(rocks);
}

function buildWater() {
  const geo = new THREE.PlaneGeometry(2400, 2400);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: 0x5aa8d8,
    transparent: true,
    opacity: 0.78,
    flatShading: true,
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.y = WATER_Y;
  scene.add(water);
}

function buildClouds() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xfff6e6, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const grp = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(8 + Math.random() * 8, 7, 5), mat);
      s.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 12);
      s.scale.y = 0.55;
      grp.add(s);
    }
    grp.position.set((Math.random() - 0.5) * 1700, 80 + Math.random() * 90, (Math.random() - 0.5) * 1700);
    grp.userData.speed = 1.5 + Math.random() * 3;
    scene.add(grp);
    cloudsList.push(grp);
  }
}

/* ---------- Anelli da raccogliere ---------- */
let ringGeo, ringMat, glowTex;
const rings = [];
const pops = [];

function makeGlowTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(255, 242, 190, 1)");
  grad.addColorStop(0.5, "rgba(255, 214, 90, 0.55)");
  grad.addColorStop(1, "rgba(255, 190, 60, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

function randomRingPos() {
  const x = (Math.random() - 0.5) * 1700;
  const z = (Math.random() - 0.5) * 1700;
  const y = Math.max(terrainH(x, z) + 10, WATER_Y + 8) + Math.random() * 55;
  return new THREE.Vector3(x, y, z);
}

function buildRings() {
  ringGeo = new THREE.TorusGeometry(2.2, 0.3, 10, 26);
  ringMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });
  glowTex = makeGlowTexture();
  const N = 14;
  for (let i = 0; i < N; i++) {
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    let pos;
    if (i < 4) {
      /* anelli vicini allo spawn, così li vedi subito */
      const a = (i / 4) * Math.PI * 2;
      pos = new THREE.Vector3(Math.cos(a) * 130, 115, Math.sin(a) * 130);
    } else {
      pos = randomRingPos();
    }
    mesh.position.copy(pos);
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    scene.add(mesh);
    rings.push({ mesh, active: true, respawnT: 0, spin: 0.7 + Math.random() });
  }
}

function collectRing(r) {
  r.active = false;
  r.respawnT = 3;
  /* bonus anelli consecutivi: ogni anello vale 100 x combo */
  combo = comboTimer > 0 ? combo + 1 : 1;
  comboTimer = COMBO_WINDOW;
  const gained = RING_SCORE * combo;
  runScore += gained;
  runRings++;
  stats.rings++;
  els.scoreBox.classList.add("flash");
  setTimeout(() => els.scoreBox.classList.remove("flash"), 300);
  if (runScore > bestScore) {
    bestScore = runScore;
    saveProgress();
  }
  /* effetto pop */
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex, color: 0xffd75e, transparent: true, depthWrite: false })
  );
  sp.position.copy(r.mesh.position);
  sp.scale.set(3, 3, 1);
  scene.add(sp);
  pops.push({ sprite: sp, t: 0 });
}

function updateRings(dt) {
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }
  for (const r of rings) {
    if (!r.active) {
      r.respawnT -= dt;
      if (r.respawnT <= 0) {
        r.mesh.position.copy(randomRingPos());
        r.active = true;
      }
      continue;
    }
    r.mesh.rotation.y += dt * 1.4 * r.spin;
    r.mesh.rotation.x += dt * 0.6 * r.spin;
    if (!gameOver && bird.pos.distanceTo(r.mesh.position) < 3.4) collectRing(r);
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt / 0.5;                  /* durata 0.5 s */
    const s = 3 + p.t * 16;
    p.sprite.scale.set(s, s, 1);
    p.sprite.material.opacity = Math.max(0, 1 - p.t);
    if (p.t >= 1) {
      scene.remove(p.sprite);
      p.sprite.material.dispose();
      pops.splice(i, 1);
    }
  }
}

/* Ala a trapezio con corda spazzata indietro. sign=+1 ala destra (si
 * estende verso +X), sign=-1 ala sinistra (specchiata verso -X).          */
function makeWingGeo(sign) {
  const span = 2.3, th = 0.16;
  const rootF = 0.22, rootB = -0.5;    /* corda alla radice */
  const tipF = -0.15, tipB = -0.65;    /* corda al tip, spazzata indietro */
  const v = [];
  const push = (x, y, z) => v.push(x, y, z);
  push(0,  th / 2, rootF); push(0,  th / 2, rootB);
  push(span, th / 2, tipB); push(span, th / 2, tipF);
  push(0, -th / 2, rootF); push(0, -th / 2, rootB);
  push(span, -th / 2, tipB); push(span, -th / 2, tipF);
  const idx = [
    0,1,2, 0,2,3,        /* top    */
    4,6,5, 4,7,6,        /* bottom */
    0,3,7, 0,7,4,        /* front  */
    1,5,6, 1,6,2,        /* back   */
    3,2,6, 3,6,7,        /* tip    */
    0,4,5, 0,5,1,        /* root   */
  ];
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 3) {
    pos[i] = v[i] * sign;
    pos[i + 1] = v[i + 1];
    pos[i + 2] = v[i + 2];
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildBird() {
  birdGroup = new THREE.Group();
  const orange = new THREE.MeshLambertMaterial({ color: 0xff9f5a, flatShading: true });
  const cream = new THREE.MeshLambertMaterial({ color: 0xfff3da, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x7a4a2e, flatShading: true });
  const beakM = new THREE.MeshLambertMaterial({ color: 0xf7b32b, flatShading: true });
  const eyeM = new THREE.MeshLambertMaterial({ color: 0x2e2118 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), orange);
  body.scale.set(1, 0.72, 1.5);
  birdGroup.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 8, 6), cream);
  belly.position.set(0, -0.28, 0.35);
  belly.scale.set(1, 0.55, 1.25);
  birdGroup.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), orange);
  head.position.set(0, 0.6, 1.05);
  birdGroup.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 6), beakM);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.52, 1.62);
  birdGroup.add(beak);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), eyeM);
    eye.position.set(0.28 * s, 0.74, 1.32);
    birdGroup.add(eye);
  }

  /* ali con perno sull'attacco: ognuna con la propria geometria */
  wingL = new THREE.Group();
  wingL.position.set(-0.9, 0.06, 0.12);
  wingL.add(new THREE.Mesh(makeWingGeo(-1), dark));
  wingR = new THREE.Group();
  wingR.position.set(0.9, 0.06, 0.12);
  wingR.add(new THREE.Mesh(makeWingGeo(1), dark));
  birdGroup.add(wingL, wingR);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 4), dark);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(0.8, 1, 0.7);
  tail.position.set(0, 0.1, -1.75);
  birdGroup.add(tail);

  birdGroup.position.set(0, 42, 0);
  scene.add(birdGroup);
}

function initThree() {
  const canvas = els.gameCanvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffd9b0, 400, 1150);

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3200);

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x9a6a4a, 0.95));
  const sun = new THREE.DirectionalLight(0xffe6b0, 1.15);
  sun.position.set(250, 320, 120);
  scene.add(sun);

  buildSky();
  buildTerrain();
  buildTrees();
  buildRocks();
  buildWater();
  buildClouds();
  buildRings();
  buildBird();
  resize();
}

/* ---------- Uccello (volo libero) ---------- */
const bird = {
  pos: new THREE.Vector3(0, 160, 0),   /* spawn molto in alto */
  yaw: 0, pitch: 0, roll: 0, speed: 16, flap: 0,
};
const camPos = new THREE.Vector3(0, 165, -16);

let gameOver = false;
let gameOverShown = false;
let crashT = 0;
let flightTime = 0;
let spawnGrace = 3.0;      /* protezione anti-schianto all'avvio */
let prevDive = false;

function applyBirdMesh() {
  birdGroup.position.copy(bird.pos);
  birdGroup.rotation.order = "YXZ";
  birdGroup.rotation.y = bird.yaw;
  birdGroup.rotation.x = -bird.pitch;
  birdGroup.rotation.z = -bird.roll;
}

function updateBird(dt) {
  if (gameOver) {
    /* rotolata al suolo, poi overlay */
    bird.roll += 7 * dt;
    bird.pitch += 2.5 * dt;
    bird.yaw += 4 * dt;
    const th = terrainH(bird.pos.x, bird.pos.z);
    bird.pos.y = Math.max(bird.pos.y - 26 * dt, th + 0.7);
    applyBirdMesh();
    crashT += dt;
    if (!gameOverShown && crashT > 1.1) {
      gameOverShown = true;
      stats.bestRunTime = Math.max(stats.bestRunTime, flightTime);
      if (runScore > bestScore) {
        bestScore = runScore;
        saveProgress();
      }
      els.finalTime.textContent = "Tempo: " + Math.round(flightTime) + "s · Punti: " + runScore;
      els.bestLine.textContent = "Record: " + bestScore + " P";
      els.gameOverOverlay.classList.remove("hidden");
    }
    return;
  }

  const targetSpeed = ctrl.dive ? 46 : 16 + (1 - Math.abs(ctrl.climb)) * 5;
  bird.speed += (targetSpeed - bird.speed) * Math.min(1, 2.2 * dt);

  const targetPitch = clamp(ctrl.climb * 0.85 - (ctrl.dive ? 1.3 : 0), -1.1, 0.7);
  bird.pitch += (targetPitch - bird.pitch) * Math.min(1, 4 * dt);

  const targetRoll = ctrl.roll * 0.9 * (ctrl.dive ? 0.35 : 1);
  bird.roll += (targetRoll - bird.roll) * Math.min(1, 5 * dt);

  /* yaw: bank-to-turn (roll<0 = inclinazione a sinistra -> gira a
     sinistra) + input diretto (braccia a destra schermo -> gira a destra) */
  const yawRate = -(bird.roll * 1.35 + ctrl.yaw * 1.7);
  bird.yaw += yawRate * dt;

  const fwd = new THREE.Vector3(
    Math.sin(bird.yaw) * Math.cos(bird.pitch),
    Math.sin(bird.pitch),
    Math.cos(bird.yaw) * Math.cos(bird.pitch)
  );
  bird.pos.addScaledVector(fwd, bird.speed * dt);
  bird.pos.y += ctrl.climb * 9 * dt;

  /* statistiche per i trofei */
  stats.dist += bird.speed * dt;
  stats.maxAlt = Math.max(stats.maxAlt, bird.pos.y);
  if (ctrl.dive && !prevDive) stats.dives++;
  prevDive = ctrl.dive;
  if (spawnGrace > 0) spawnGrace -= dt;

  /* collisioni col suolo -> GAME OVER (con grazia all'avvio) */
  const th = terrainH(bird.pos.x, bird.pos.z);
  const ground = Math.max(th, WATER_Y - 0.4);
  if (spawnGrace <= 0 && bird.pos.y <= ground + 1.2) {
    bird.pos.y = ground + 0.5;
    gameOver = true;
    crashT = 0;
    return;
  }
  bird.pos.y = Math.min(bird.pos.y, MAX_Y);

  /* confini morbidi del mondo */
  const d = Math.hypot(bird.pos.x, bird.pos.z);
  if (d > WORLD_R) { bird.pos.x *= WORLD_R / d; bird.pos.z *= WORLD_R / d; }

  bird.flap += dt * (ctrl.dive ? 4 : 9);
  applyBirdMesh();

  const amp = ctrl.dive ? 0.12 : 0.45 + Math.max(0, ctrl.climb) * 0.55;
  const w = Math.sin(bird.flap) * amp;
  wingL.rotation.z = -w;
  wingR.rotation.z = w;
}

function updateCamera(dt) {
  const fwd = new THREE.Vector3(Math.sin(bird.yaw), 0, Math.cos(bird.yaw));
  const behind = bird.pos.clone()
    .addScaledVector(fwd, -11)
    .add(new THREE.Vector3(0, 4.4, 0));
  const look = bird.pos.clone()
    .addScaledVector(fwd, 6)
    .add(new THREE.Vector3(0, 1.4, 0));

  const th = terrainH(behind.x, behind.z);
  behind.y = Math.max(behind.y, th + 2.5);

  camPos.lerp(behind, 1 - Math.exp(-4.5 * dt));
  camera.position.copy(camPos);
  camera.lookAt(look);
  camera.rotateZ(bird.roll * 0.16);
}

function updateClouds(dt) {
  for (const c of cloudsList) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 1100) c.position.x = -1100;
  }
}

function resize() {
  if (!renderer) return;
  const w = els.gameCanvas.clientWidth, h = els.gameCanvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------- Rendering videocamera + scheletro ---------- */
const POSE_CONN = [
  [LS, LE], [LE, LW], [RS, RE], [RE, RW], [LS, RS],
  [LW, 17], [LW, 19], [RW, 18], [RW, 20],
  [0, LS], [0, RS],
];

function drawCam() {
  const c = els.camCanvas;
  const ctx = c.getContext("2d");
  const cw = c.width, ch = c.height;
  ctx.clearRect(0, 0, cw, ch);
  const vw = els.cam.videoWidth, vh = els.cam.videoHeight;
  if (!vw || !vh) return;

  const sc = Math.max(cw / vw, ch / vh);
  const sw = cw / sc, sh = ch / sc;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;

  ctx.save();
  ctx.translate(cw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(els.cam, sx, sy, sw, sh, 0, 0, cw, ch);
  ctx.restore();

  if (currentPose) {
    ctx.lineWidth = Math.max(2, cw / 300);
    ctx.strokeStyle = "rgba(255, 217, 122, 0.9)";
    for (const [a, b] of POSE_CONN) {
      ctx.beginPath();
      ctx.moveTo((1 - currentPose[a].x) * cw, currentPose[a].y * ch);
      ctx.lineTo((1 - currentPose[b].x) * cw, currentPose[b].y * ch);
      ctx.stroke();
    }
    for (const i of [LS, RS, LE, RE, LW, RW]) {
      ctx.fillStyle = "#ffd97a";
      ctx.beginPath();
      ctx.arc((1 - currentPose[i].x) * cw, currentPose[i].y * ch, Math.max(3, cw / 200), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------- HUD ---------- */
function updateHud() {
  const altNorm = clamp01((bird.pos.y - 2) / 140);
  els.altFill.style.height = Math.round(altNorm * 100) + "%";
  els.altVal.textContent = Math.round(bird.pos.y);
  els.rollVal.textContent =
    bird.roll < -0.22 ? "VIRATA SX" : bird.roll > 0.22 ? "VIRATA DX" : "—";
  els.diveLabel.classList.toggle("hidden", !ctrl.dive);
  const on = ctrl.arms > 0;
  els.handsDot.classList.toggle("on", on);
  els.handsLabel.textContent = "braccia: " + (ctrl.arms ? "1" : "—");
  els.timeVal.textContent = Math.round(flightTime) + "s";
  els.ringVal.textContent = runRings;
  els.scoreVal.textContent = runScore;
  if (combo >= 2 && comboTimer > 0) {
    els.comboBadge.textContent = "x" + combo;
    els.comboBadge.classList.remove("hidden");
  } else {
    els.comboBadge.classList.add("hidden");
  }
}

/* ---------- Canvas sizing ---------- */
function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = els.camCanvas.parentElement;
  els.camCanvas.width = Math.round(cw.clientWidth * dpr);
  els.camCanvas.height = Math.round(cw.clientHeight * dpr);
}

/* ---------- Loop principale ---------- */
let lastVideoTime = -1;
let lastT = performance.now();
let started = false;

function loop(now) {
  const dt = Math.min(1 / 30, (now - lastT) / 1000);
  lastDt = dt;
  lastT = now;

  if (landmarker && els.cam.readyState >= 2 && els.cam.currentTime !== lastVideoTime) {
    lastVideoTime = els.cam.currentTime;
    try {
      const res = landmarker.detectForVideo(els.cam, now);
      updateControl(res.landmarks);
    } catch (e) { /* frame saltato */ }
  }

  if (!gameOver) {
    flightTime += dt;
    stats.time += dt;
  }

  drawCam();
  updateBird(dt);
  updateRings(dt);
  updateClouds(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  updateHud();
  checkTrophies();

  requestAnimationFrame(loop);
}

/* ---------- Avvio / riavvio ---------- */
function setStatus(msg) {
  els.status.textContent = msg;
}

function resetGame() {
  bird.pos.set(0, 160, 0);      /* spawn molto in alto */
  bird.yaw = 0; bird.pitch = 0; bird.roll = 0;
  bird.speed = 16; bird.flap = 0;
  ctrl.climb = 0; ctrl.yaw = 0; ctrl.roll = 0; ctrl.dive = false;
  prevDive = false;
  gameOver = false; gameOverShown = false; crashT = 0; flightTime = 0;
  spawnGrace = 3.0;
  runScore = 0; runRings = 0; combo = 0; comboTimer = 0;
  stats.runs++;
  camPos.set(0, 165, -16);
  els.gameOverOverlay.classList.add("hidden");
  showToast("🕊️ DECOLLA! Raccogli gli anelli!", 1800);
}

els.restartBtn.addEventListener("click", resetGame);

els.trophyBtn.addEventListener("click", () => {
  const hidden = els.trophyPanel.classList.toggle("hidden");
  if (!hidden) buildTrophyList();
});
els.trophyClose.addEventListener("click", () => els.trophyPanel.classList.add("hidden"));
els.trophyPanel.addEventListener("click", (e) => {
  if (e.target === els.trophyPanel) els.trophyPanel.classList.add("hidden");
});

async function boot() {
  loadProgress();
  updateTrophyUi();
  setStatus("Caricamento intelligenza...");
  try {
    await loadLandmarker();
  } catch (e) {
    setStatus("Errore modello AI. Controlla la connessione.");
    return;
  }
  setStatus("Pronto! Tocca per avviare la videocamera");
  els.startBtn.disabled = false;
}

els.startBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("Serve HTTPS o localhost per la videocamera.");
    return;
  }
  els.startBtn.disabled = true;
  setStatus("Avvio videocamera...");
  try {
    await startCamera();
  } catch (e) {
    setStatus("Videocamera negata o assente. Controlla le impostazioni di Safari.");
    els.startBtn.disabled = false;
    return;
  }
  try {
    initThree();
  } catch (e) {
    setStatus("WebGL non disponibile su questo dispositivo.");
    return;
  }
  started = true;
  stats.runs++;
  els.startOverlay.classList.add("hidden");
  setupCanvas();
  showToast("🕊️ DECOLLA! Raccogli gli anelli!", 1800);
  requestAnimationFrame(loop);
});

window.addEventListener("resize", () => {
  if (started) { setupCanvas(); resize(); }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
