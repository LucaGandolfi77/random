/* ============================================================
   GEMMONDO — Raccolta Incrementale 3D (folle, geniale, simpatico)
   Muovi Cubetto, raccogli gemme, potenzia i droni, sblocca
   7 dimensioni e fai esplodere l'universo per le Stelle.

   ── Dove sta cosa ──────────────────────────────────────────
   core.js   dati di gioco, economia, artigianato, salvataggio.
             Nessun import di three, nessun tocco al DOM: gira
             identico nel browser e sotto `node --test`.
   audio.js  suoni generati con WebAudio. Nessun file.
   game.js   (questo file) Three.js, DOM, input, ciclo di gioco.

   ── Regole che tengono insieme il tutto ───────────────────
   · Ogni formula economica sta in core.js. Qui si chiama, non
     si ricalcola: è il posto unico dove riequilibrare.
   · Il ciclo è diviso in simulate(dt) e render. La simulazione
     non disegna e il disegno non decide nulla: i test possono
     quindi far girare il mondo a passo fisso senza dipendere
     dalla GPU.
   · Gli oggetti condivisi (geometrie, materiali, texture) vanno
     messi in SHARED, altrimenti disposeGroup li distrugge.
   · Gli upgrade che cambiano il reddito passivo passano tutti
     da incomePerSec(), mai da una formula sparsa nel loop.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Audio } from './audio.js';
import {
  ZONES, UPGRADES, RESOURCES, RECIPES, TOOL_NAMES, PRICES, EXCHANGE,
  clamp, lerp, rand, choice, dist2D, fmt,
  upgradeValue, upgradeCost, toolStats, toolLevel, toolLabel,
  canCraft, isRecipeDone, recipeUnlocked, craftInto,
  sellPrice, buyPrice, zonePriceBonus,
  starMult, prestigeGain, applyPrestige, PRESTIGE_MIN, STAR_BONUS,
  incomePerSec, gemValue, gemValueWithStars, offlineGain,
  nodeCounts, nodeResource, nodeRespawnMs, harvestYield, NODE_HITS,
  loadState, saveState, safeZoneIndex, zoneAt,
} from './core.js';

const audio = new Audio();

/* ------------------------------------------------------------
   1. STATO
   ------------------------------------------------------------ */
let state = loadState(window.localStorage);
let booted = false;
let saveTimer = null;
let saveFailed = false;

/* Salvataggio differito: `save()` non scrive subito. Ogni colpo, ogni
   raccolta e ogni acquisto lo chiama, e prima scriveva in localStorage fino
   a 30 volte al secondo. Ora si accoda e si spara al massimo una volta ogni
   2 secondi (e comunque alla fine). */
function save(immediate = false) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (immediate) return doSave();
  saveTimer = setTimeout(() => { saveTimer = null; doSave(); }, 2000);
}
let autosavePaused = false;
function doSave() {
  if (autosavePaused) return;
  const err = saveState(window.localStorage, state);
  if (err && !saveFailed) {
    saveFailed = true;
    toast('⚠️ Impossibile salvare: la memoria del browser è piena o bloccata. I progressi di questa sessione ci saranno, ma non sopravviveranno alla chiusura.');
  }
}

/* ------------------------------------------------------------
   2. RIFERIMENTI DOM
   ------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const el = {
  energy: $('energy'), perSec: $('per-sec'), gems: $('gems'), stars: $('stars'),
  zoneName: $('zone-name'), hint: $('hint'), toasts: $('toasts'), floaters: $('floaters'),
  overlay: $('overlay'), panelTitle: $('panel-title'), panelEnergy: $('panel-energy'),
  tabShop: $('tab-shop'), tabZones: $('tab-zones'), tabCraft: $('tab-craft'),
  tabMerchant: $('tab-merchant'), tabPrestige: $('tab-prestige'),
  splash: $('splash'), joyBase: $('joy-base'), joyStick: $('joy-stick'),
  resBar: $('res-bar'), actionBtn: $('action-btn'),
  btnCraft: $('btn-craft'), btnMerchant: $('btn-merchant'),
  btnMute: $('btn-mute'), btnPlay: $('btn-play'), fatal: $('fatal'), fatalMsg: $('fatal-msg'),
};

/** Se WebGL non c'è, o three non ha caricato, spiega invece di lasciare una pagina morta. */
function fatal(msg) {
  if (!el.fatal) return;
  el.fatalMsg.textContent = msg;
  el.fatal.classList.remove('hidden');
  el.splash.classList.add('hidden');
}

/* ------------------------------------------------------------
   3. SCENA
   ------------------------------------------------------------ */
const container = $('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  fatal('Questo browser non ha potuto creare un contesto WebGL.');
  throw e;
}

/* La quality parte "auto": scende da sola se i frame costano troppo (vedi
   applyQuality). Su un telefono spento a 30fps si arresta al primo livello. */
const quality = {
  level: 2,          // 2 = tutto, 1 = niente bloom, 0 = niente ombre
};

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
/* r152+: outputEncoding è morto, si usa outputColorSpace. */
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 600);
camera.position.set(0, 11, 17);

/* Cielo a gradiente: una sfera rovesciata con uno shader di due colori.
   Prima era un setClearColor piatto, e ogni zona sembrava lo stesso vetro colorato. */
const skyUniforms = {
  top: { value: new THREE.Color(0x8fd8ff) },
  bottom: { value: new THREE.Color(0xffd9a0) },
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(320, 32, 20),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top;
      uniform vec3 bottom;
      varying vec3 vWorld;
      void main() {
        // 0 all'orizzonte, 1 allo zenith
        float h = clamp(normalize(vWorld).y * 1.35 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.75)), 1.0);
        #include <colorspace_fragment>
      }`,
  })
);
skyDome.frustumCulled = false;
scene.add(skyDome);

/* Luci */
const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x3c9d55, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
sun.position.set(18, 32, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
/* L'orto era ±60 ma il raggio di zona arriva a 68: le ombre si tagliavano
   al bordo. Ora segue il giocatore (vedi animate) con una finestra stretta,
   così la risoluzione della shadow map spetta tutta a quello che si vede. */
sun.shadow.camera.left = -26;
sun.shadow.camera.right = 26;
sun.shadow.camera.top = 26;
sun.shadow.camera.bottom = -26;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

/* Rim light: separa Cubetto e gli oggetti emissivi dal fondo. */
const rim = new THREE.DirectionalLight(0x00d4ff, 0.35);
rim.position.set(-14, 10, -18);
scene.add(rim);

/* Punto luce per zona (lava, cristalli, neon). */
const zoneLight = new THREE.PointLight(0xffffff, 0, 60, 2);
zoneLight.position.set(0, 6, 0);
scene.add(zoneLight);

/* Terreno: il raggio segue la zona, e il bordo ha un muro di confine
   visibile, così il disco non finisce a caso nel nulla. */
const groundGeo = new THREE.CircleGeometry(1, 64);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4f9e5a, roughness: 0.95, metalness: 0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const wallMat = new THREE.MeshBasicMaterial({ color: 0x7b2fff, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 64, 1, true), wallMat);
wall.position.y = 2.5;
scene.add(wall);

/* Stelle (Spazio e Dimensione Folle) */
const starGeo = new THREE.BufferGeometry();
{
  const pos = [];
  for (let i = 0; i < 900; i++) {
    const r = rand(90, 260);
    const th = rand(0, Math.PI * 2);
    pos.push(Math.cos(th) * r, rand(-40, 220), Math.sin(th) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
}
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.95, fog: false, depthWrite: false });
const starField = new THREE.Points(starGeo, starMat);
starField.visible = false;
scene.add(starField);

/* ------------------------------------------------------------
   4. GIOCATORE: CUBETTO
   ------------------------------------------------------------ */
const player = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.55, metalness: 0.05, flatShading: true });
const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), bodyMat);
body.castShadow = true;
body.position.y = 0.72;
player.add(body);

const face = new THREE.Group();
face.position.y = 0.72;
player.add(face);

const eyeGeo = new THREE.SphereGeometry(0.14, 12, 12);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const pupilGeo = new THREE.SphereGeometry(0.07, 10, 10);
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
const eyes = new THREE.Group();
for (const sx of [-0.26, 0.26]) {
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(sx, 0.14, -0.58);
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.set(sx, 0.14, -0.69);
  eyes.add(eye, pupil);
}
face.add(eyes);

const mouth = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.06, 0.06),
  new THREE.MeshBasicMaterial({ color: 0x5b3a1a })
);
mouth.position.set(0, -0.16, -0.58);
face.add(mouth);

/* Gambe: due scatolette che oscillano quando cammina. */
const legs = [];
const legMat = new THREE.MeshStandardMaterial({ color: 0xe69a3a, roughness: 0.6, flatShading: true });
for (const sx of [-0.28, 0.28]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), legMat);
  leg.position.set(sx, 0.17, 0);
  leg.castShadow = true;
  player.add(leg);
  legs.push(leg);
}

/* Braccia: pendono e si bilanciano contrarie alle gambe. */
const arms = [];
for (const sx of [-0.74, 0.74]) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.26), legMat);
  arm.position.set(sx, 0.72, 0);
  arm.castShadow = true;
  player.add(arm);
  arms.push(arm);
}

/* Sciarpa: tre segmenti con ritardo, dà vita al personaggio. */
const scarfMat = new THREE.MeshStandardMaterial({ color: 0xff5e9c, roughness: 0.8, flatShading: true });
const scarf = [];
let scarfPrev = null;
for (let i = 0; i < 3; i++) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.3), scarfMat);
  seg.castShadow = true;
  player.add(seg);
  scarf.push({ mesh: seg, node: { x: 0, y: 1.32, z: 0.2 }, phase: i });
}
scarfPrev = scarf[0].node;

const antenna = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 })
);
antenna.position.set(0, 1.52, 0);
player.add(antenna);
const antennaGem = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.18),
  new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.4 })
);
antennaGem.position.set(0, 1.8, 0);
player.add(antennaGem);

player.position.set(0, 0, 0);
scene.add(player);

/* ------------------------------------------------------------
   5. PORTALE
   ------------------------------------------------------------ */
const portalGroup = new THREE.Group();
const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.4, 0.18, 12, 40),
  new THREE.MeshStandardMaterial({ color: 0x7b2fff, emissive: 0x7b2fff, emissiveIntensity: 1.6 })
);
portalGroup.add(portalRing);
const portalBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.7, 2.0, 0.3, 24),
  new THREE.MeshStandardMaterial({ color: 0x2a1a55, roughness: 0.6 })
);
portalBase.position.y = -0.15;
portalBase.receiveShadow = true;
portalGroup.add(portalBase);
portalGroup.position.y = 1.1;
scene.add(portalGroup);

/* ------------------------------------------------------------
   6. GEMME, DECOR, DRONI, PARTICELLE
   ------------------------------------------------------------ */
const gems = [];
const decorGroup = new THREE.Group();
scene.add(decorGroup);
const droneGroup = new THREE.Group();
scene.add(droneGroup);
const drones = [];

const gemGeo = new THREE.OctahedronGeometry(0.45);
const goldGeo = new THREE.OctahedronGeometry(0.5);

const glowTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

/* glowMat è condiviso da tutte le gemme: non va mai disporato per singolo. */
const glowMat = new THREE.SpriteMaterial({
  map: glowTexture, color: 0xffffff, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false,
});

const gemMats = {};
function gemMatFor(zoneIdx) {
  if (!gemMats[zoneIdx]) {
    const c = new THREE.Color(ZONES[zoneIdx].gem);
    gemMats[zoneIdx] = new THREE.MeshStandardMaterial({
      color: c.clone().multiplyScalar(0.4), emissive: c, emissiveIntensity: 1.4,
      roughness: 0.2, metalness: 0.1,
    });
  }
  return gemMats[zoneIdx];
}
const goldMat = new THREE.MeshStandardMaterial({
  color: 0x6b4a00, emissive: 0xffd54f, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.3,
});

function spawnGem() {
  const z = zoneAt(state.zone);
  let x, zz, tries = 0;
  do {
    const a = rand(0, Math.PI * 2);
    const r = rand(3, z.radius - 3);
    x = Math.cos(a) * r;
    zz = Math.sin(a) * r;
    tries++;
  } while (tries < 20 && dist2D(x, zz, player.position.x, player.position.z) < 6);

  const golden = Math.random() < upgradeValue('luck', state.upgrades.luck || 0);
  const mesh = new THREE.Mesh(golden ? goldGeo : gemGeo, golden ? goldMat : gemMatFor(state.zone));
  mesh.position.set(x, rand(0.6, 1.2), zz);
  mesh.castShadow = true;
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(golden ? 2.6 : 1.8);
  mesh.add(glow);
  mesh.scale.setScalar(golden ? 1.5 : 1);
  scene.add(mesh);
  gems.push({ mesh, golden, baseY: mesh.position.y, phase: rand(0, Math.PI * 2) });
}

function clearGems() {
  for (const g of gems) scene.remove(g.mesh);
  gems.length = 0;
}

/* Particelle: pool fisso, nessuna allocazione in gioco. */
const PARTICLE_COUNT = 140;
const particles = [];
const partGeo = new THREE.OctahedronGeometry(0.14);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const m = new THREE.Mesh(partGeo, mat);
  m.visible = false;
  scene.add(m);
  particles.push({ mesh: m, mat, vel: new THREE.Vector3(), life: 0, maxLife: 1, active: false });
}
let partCursor = 0;
const burstColor = new THREE.Color();
function burst(pos, color, count) {
  burstColor.set(color);
  for (let n = 0; n < count; n++) {
    const p = particles[partCursor];
    partCursor = (partCursor + 1) % particles.length;
    p.active = true;
    p.life = p.maxLife = rand(0.35, 0.6);
    p.mesh.position.copy(pos);
    p.mesh.visible = true;
    p.mat.color.copy(burstColor);
    p.mat.opacity = 1;
    const a = rand(0, Math.PI * 2);
    const e = rand(0.3, Math.PI * 0.5);
    const sp = rand(2, 5.5);
    p.vel.set(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.5, Math.sin(a) * Math.cos(e) * sp);
  }
}

/* Tetto della caverna: una cupola scura sopra il mondo, così il "sotto
   terra" ha un soffitto invece di essere un disco nel nulla. */
const caveDome = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x241a45, roughness: 1, side: THREE.BackSide, flatShading: true })
);
caveDome.visible = false;
scene.add(caveDome);

/* Stalattiti: coni appesi al soffitto, solo nelle zone chiuse. */
const stalactiteGroup = new THREE.Group();
scene.add(stalactiteGroup);

/* Superficie dell'acqua per l'Oceano al Neon: un piano semitrasparente
   con onde verificate, sopra il terreno di roccia. */
const waterUniforms = { time: { value: 0 }, tint: { value: new THREE.Color(0x00e5ff) } };
const water = new THREE.Mesh(
  new THREE.CircleGeometry(1, 48),
  new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      uniform float time;
      varying float vWave;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        /* due onde incrociate: abbastanza per far leggere il moto */
        float w = sin(p.x * 9.0 + time * 1.7) * 0.10 + sin(p.y * 7.0 - time * 1.3) * 0.08;
        p.z += w;
        vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 tint;
      varying float vWave;
      varying vec2 vUv;
      void main() {
        /* la cresta della onda è più chiara: fa le "strisce" del neon */
        float crest = smoothstep(0.02, 0.16, vWave);
        float fade = smoothstep(0.5, 0.15, length(vUv - 0.5));
        vec3 col = mix(tint * 0.28, tint, crest);
        gl_FragColor = vec4(col, 0.55 + crest * 0.35 * fade);
        #include <colorspace_fragment>
      }`,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = 5.5;
water.visible = false;
scene.add(water);

/* Lava: una pozza emissiva nelle zone calde, con i colori che pulsano. */
const lavaUniforms = { time: { value: 0 }, hot: { value: new THREE.Color(0xff5a1a) } };
const lava = new THREE.Mesh(
  new THREE.CircleGeometry(1, 40),
  new THREE.ShaderMaterial({
    uniforms: lavaUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 hot;
      varying vec2 vUv;
      /* rumore value carezzevole: la crosta si spacca e sotto si vede
         il fuso. Nessuna texture, tutto calcolato. */
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x),
                   mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        /* frequenza alta: a 7 le "fessure" erano larghe metà pozza e
           sembravano una macchia sfocata */
        vec2 p = vUv * 26.0;
        float n = noise(p + vec2(time * 0.10, time * -0.07));
        n = mix(n, noise(p * 2.7 - time * 0.05), 0.5);
        /* la crosta scura si spacca: sotto il fuso */
        float fuso = smoothstep(0.46, 0.78, n);
        vec3 col = mix(hot * 0.12, mix(hot, vec3(1.0, 0.85, 0.5), fuso * 0.7), fuso);
        float r = length(vUv - 0.5);
        gl_FragColor = vec4(col, smoothstep(0.5, 0.28, r) * (0.25 + fuso * 0.75));
        #include <colorspace_fragment>
      }`,
  })
);
lava.rotation.x = -Math.PI / 2;
lava.position.y = 0.06;
lava.visible = false;
scene.add(lava);

/* Nebulose per lo Spazio Profondo: sprite additivi grandi e tenui. */
const nebulaGroup = new THREE.Group();
scene.add(nebulaGroup);

/* Stalattiti: coni appesi al tetto della caverna. Geometria e materiale
   condivisi, quindi si ricreano i soli mesh. */
const stalactiteGeo = new THREE.ConeGeometry(0.4, 1, 6);
const stalactiteMat = new THREE.MeshStandardMaterial({ color: 0x3a2f5c, roughness: 0.95, flatShading: true });
function buildStalactites(radius) {
  stalactiteGroup.clear();
  if (state.zone !== 2) return;
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(4, radius * 0.9);
    const len = rand(3, 9);
    const m = new THREE.Mesh(stalactiteGeo, stalactiteMat);
    /* il cono di Three punta su +y: capovolto sembra stalattite */
    m.position.set(Math.cos(a) * r, 26 - len / 2, Math.sin(a) * r);
    m.scale.set(rand(0.6, 1.5), len, rand(0.6, 1.5));
    m.rotation.y = rand(0, 3);
    m.castShadow = true;
    stalactiteGroup.add(m);
  }
}

/* Nebulose: pochi sprite additivi grandi e tenui dietro le stelle. */
const nebulaMats = [];
function buildNebulae(radius) {
  nebulaGroup.clear();
  nebulaMats.length = 0;
  if (state.zone < 5) return;
  const tints = state.zone === 6
    ? [0xff00ff, 0x00d4ff, 0xff5e9c, 0x7b2fff]
    : [0x2a4a9f, 0x7b2fff, 0x1a6fa8, 0x4a2a8f];
  for (let i = 0; i < 7; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(radius * 1.2, radius * 2.2);
    const mat = new THREE.SpriteMaterial({
      map: glowTexture, color: tints[i % tints.length], transparent: true,
      opacity: rand(0.1, 0.22), blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    nebulaMats.push(mat);
    const sp = new THREE.Sprite(mat);
    sp.position.set(Math.cos(a) * r, rand(20, 110), Math.sin(a) * r);
    sp.scale.setScalar(rand(70, 170));
    nebulaGroup.add(sp);
  }
}

/* Polvere ambientale: un solo Points, il colore lo dà la zona. */
const MOTES_COUNT = 220;
const moteGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(MOTES_COUNT * 3);
  for (let i = 0; i < MOTES_COUNT; i++) {
    pos[i * 3] = rand(-40, 40);
    pos[i * 3 + 1] = rand(0.5, 16);
    pos[i * 3 + 2] = rand(-40, 40);
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const moteMat = new THREE.PointsMaterial({
  color: 0xffffff, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false,
});
const motes = new THREE.Points(moteGeo, moteMat);
scene.add(motes);

/* Risorse condivise: disposeGroup non deve mai liberarle, o il sprite
   geometry di Three.js (un singleton di modulo) verrebbe distrutto a ogni
   cambio zona e ogni sprite dovrebbe ricaricarlo. */
const SHARED = new Set([gemGeo, goldGeo, partGeo, glowMat, glowTexture, stalactiteGeo, stalactiteMat]);

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!SHARED.has(m)) m.dispose();
  });
}

/* Decorazioni: geometrie e materiali creati una volta per tipo e riusati
   per tutte le istanze. Prima ogni gruppo ne creava di nuovi, e venivano
   distrutti e ricreati a ogni viaggio. */
const decorCache = {};
function decorAssets(kind) {
  if (decorCache[kind]) return decorCache[kind];
  const mat = (hex, rough = 0.8) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, flatShading: true });
  let parts;
  switch (kind) {
    case 'tree':
      parts = [
        { geo: new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), mat: mat(0x6b4a2a), y: 0.6 },
        { geo: new THREE.ConeGeometry(0.7, 1.6, 8), mat: mat(0x2e9e4f), y: 1.7 },
      ];
      break;
    case 'flower':
      parts = [
        { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat: mat(0x3c9d55), y: 0.3 },
        { geo: new THREE.SphereGeometry(0.18, 8, 8), mat: mat(choice([0xff5e9c, 0xffd54f, 0x00d4ff])), y: 0.72 },
      ];
      break;
    case 'rock':
      parts = [{ geo: new THREE.DodecahedronGeometry(0.8, 0), mat: mat(0x8a8a92), y: 0.4, spin: true }];
      break;
    case 'crystal':
      parts = [{
        geo: new THREE.OctahedronGeometry(0.7, 0),
        mat: new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 0.9, roughness: 0.2, flatShading: true }),
        y: 0.9, spin: true,
      }];
      break;
    case 'spike':
      parts = [{ geo: new THREE.ConeGeometry(0.25, 1.4, 6), mat: mat(0x3a3a44), y: 0.7 }];
      break;
    case 'cactus':
      parts = [
        { geo: new THREE.CylinderGeometry(0.22, 0.26, 1.4, 7), mat: mat(0x2e9e4f), y: 0.7 },
        { geo: new THREE.CylinderGeometry(0.12, 0.12, 0.6, 7), mat: mat(0x2e9e4f), y: 0.9, x: 0.3, rz: Math.PI / 2 },
      ];
      break;
    case 'coral':
      parts = [
        { geo: new THREE.CylinderGeometry(0.1, 0.2, 1.1, 6), mat: mat(choice([0xff5e9c, 0x00e5ff, 0xffd54f])), y: 0.55 },
        { geo: new THREE.CylinderGeometry(0.08, 0.14, 0.8, 6), mat: mat(0xff5e9c), y: 0.4, x: 0.25, z: 0.1 },
      ];
      break;
    case 'asteroid':
      parts = [{ geo: new THREE.IcosahedronGeometry(1, 0), mat: mat(0x6a6a76), y: 1, spin: true }];
      break;
    default:
      parts = [];
  }
  decorCache[kind] = parts;
  return parts;
}

function buildDecor() {
  /* Le geometrie e i materiali sono in cache: si butta via solo il gruppo,
     senza toccare le risorse GPU condivise. */
  decorGroup.clear();
  const z = zoneAt(state.zone);
  const count = quality.level >= 1 ? 58 : 32;
  for (let i = 0; i < count; i++) {
    const kind = choice(z.decor);
    const parts = decorAssets(kind);
    if (!parts.length) continue;
    const g = new THREE.Group();
    for (const p of parts) {
      const m = new THREE.Mesh(p.geo, p.mat);
      m.position.set(p.x || 0, p.y || 0, p.z || 0);
      if (p.rz) m.rotation.z = p.rz;
      if (p.spin) m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      m.castShadow = true;
      g.add(m);
    }
    /* Il 70% delle decorazioni sta nella metà interna del raggio: è
       dove si gioca davvero, e a riempire gli angoli lontani il mondo
       sembrava vuoto. */
    const a = rand(0, Math.PI * 2);
    const r = Math.random() < 0.7 ? rand(5, z.radius * 0.5) : rand(z.radius * 0.5, z.radius - 2);
    g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.rotation.y = rand(0, Math.PI * 2);
    g.scale.setScalar(rand(0.7, 1.6));
    decorGroup.add(g);
  }
}

/* Droni */
const droneBodyGeo = new THREE.OctahedronGeometry(0.34);
const droneRingGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 20);
const droneBodyMat = new THREE.MeshStandardMaterial({
  color: 0x7b2fff, emissive: 0x00d4ff, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4,
});
const droneRingMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2 });

function makeDroneMesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(droneBodyGeo, droneBodyMat);
  b.castShadow = true;
  const ring = new THREE.Mesh(droneRingGeo, droneRingMat);
  ring.rotation.x = Math.PI / 2;
  g.add(b, ring);
  g.userData = { angle: rand(0, Math.PI * 2), phase: rand(0, Math.PI * 2) };
  return g;
}

function syncDrones() {
  const want = Math.min(upgradeValue('drone', state.upgrades.drone || 0), 24);
  while (drones.length < want) {
    const m = makeDroneMesh();
    droneGroup.add(m);
    drones.push(m);
  }
  while (drones.length > want) {
    droneGroup.remove(drones.pop());
  }
}

/* ------------------------------------------------------------
   7. RISORSE NEL MONDO — NODI + MERCANTE
   ------------------------------------------------------------ */
const nodeGroup = new THREE.Group();
scene.add(nodeGroup);
const nodes = [];
const MERCHANT_POS = [14, 0, 10];

/* Icone delle risorse disegnate su canvas: non dipendono dal font emoji
   del sistema, quindi non cambiano aspetto da un telefono all'altro
   (e non spariscono del tutto su Linux senza font colorati). */
const ICONS = {
  legno: (ctx, s) => {
    ctx.fillStyle = '#c98a4b';
    roundRect(ctx, s * 0.18, s * 0.3, s * 0.64, s * 0.4, s * 0.08);
    ctx.fill();
    ctx.fillStyle = '#8a5f30';
    ctx.beginPath();
    ctx.ellipse(s * 0.24, s * 0.5, s * 0.09, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5f30';
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.ellipse(s * 0.24, s * 0.5, s * 0.04, s * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
  pietra: (ctx, s) => {
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.2);
    ctx.lineTo(s * 0.82, s * 0.46);
    ctx.lineTo(s * 0.7, s * 0.8);
    ctx.lineTo(s * 0.3, s * 0.8);
    ctx.lineTo(s * 0.18, s * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c3c8d0';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.2);
    ctx.lineTo(s * 0.82, s * 0.46);
    ctx.lineTo(s * 0.5, s * 0.46);
    ctx.closePath();
    ctx.fill();
  },
  cristallo: (ctx, s) => {
    ctx.fillStyle = '#8f7bff';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.14);
    ctx.lineTo(s * 0.74, s * 0.52);
    ctx.lineTo(s * 0.5, s * 0.86);
    ctx.lineTo(s * 0.26, s * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9bcff';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.14);
    ctx.lineTo(s * 0.74, s * 0.52);
    ctx.lineTo(s * 0.5, s * 0.52);
    ctx.closePath();
    ctx.fill();
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const iconTextures = {};
function iconTexture(resource) {
  if (!iconTextures[resource]) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    (ICONS[resource] || ICONS.pietra)(ctx, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    iconTextures[resource] = t;
  }
  return iconTextures[resource];
}

const iconMats = {};
function iconSprite(resource, scale) {
  if (!iconMats[resource]) {
    iconMats[resource] = new THREE.SpriteMaterial({
      map: iconTexture(resource), transparent: true, depthWrite: false, opacity: 0.95,
    });
  }
  const s = new THREE.Sprite(iconMats[resource]);
  s.scale.setScalar(scale);
  return s;
}

const ringMats = {};
function ringMaterial(resource) {
  if (!ringMats[resource]) {
    ringMats[resource] = new THREE.MeshBasicMaterial({
      color: RESOURCES[resource].color, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    });
  }
  return ringMats[resource];
}

function addResource(id, n) {
  state.resources[id] = (state.resources[id] || 0) + n;
}

/* Nodi: alberi / sassi / cristalli */
const nodeGeoCache = {};
function nodeGeo(type) {
  if (nodeGeoCache[type]) return nodeGeoCache[type];
  let parts;
  if (type === 'tree') {
    parts = [
      { geo: new THREE.CylinderGeometry(0.28, 0.42, 2.5, 7), mat: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9, flatShading: true }), y: 1.25 },
      { geo: new THREE.ConeGeometry(1.25, 2.1, 8), mat: new THREE.MeshStandardMaterial({ color: 0x2e9e4f, roughness: 0.9, flatShading: true }), y: 3.0 },
      { geo: new THREE.ConeGeometry(0.9, 1.6, 8), mat: new THREE.MeshStandardMaterial({ color: 0x3fae5c, roughness: 0.9, flatShading: true }), y: 4.0 },
    ];
  } else if (type === 'rock') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.95, flatShading: true });
    parts = [
      { geo: new THREE.IcosahedronGeometry(1.05, 0), mat, y: 0.8 },
      { geo: new THREE.IcosahedronGeometry(0.75, 0), mat, x: 0.9, y: 0.55, z: 0.35 },
    ];
  } else {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 1.1, roughness: 0.2, flatShading: true,
    });
    parts = [
      { geo: new THREE.OctahedronGeometry(0.85), mat, y: 1.05, ry: 0.5 },
      { geo: new THREE.OctahedronGeometry(0.55), mat, x: 0.75, y: 0.75, z: 0.3, ry: -0.4 },
      { geo: new THREE.OctahedronGeometry(0.42), mat, x: -0.65, y: 0.55, z: -0.4 },
    ];
  }
  nodeGeoCache[type] = parts;
  return parts;
}

const ringGeo = new THREE.RingGeometry(1.2, 1.55, 28);

function makeNode(type) {
  const mesh = new THREE.Group();
  for (const p of nodeGeo(type)) {
    const m = new THREE.Mesh(p.geo, p.mat);
    m.position.set(p.x || 0, p.y || 0, p.z || 0);
    if (p.ry) m.rotation.y = p.ry;
    m.castShadow = true;
    mesh.add(m);
  }
  const resource = nodeResource(type);
  const sprite = iconSprite(resource, type === 'tree' ? 1.9 : type === 'rock' ? 1.6 : 1.8);
  sprite.position.y = type === 'tree' ? 4.9 : type === 'rock' ? 2.7 : 3.1;
  mesh.add(sprite);

  /* L'anello è l'unico elemento per-nodo: materiale e geometria sono
     condivisi, quindi disposeGroup li deve rispettare. */
  const ring = new THREE.Mesh(ringGeo, ringMaterial(resource).clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.renderOrder = 2;
  mesh.add(ring);

  return {
    type, resource, mesh, sprite, ring,
    hits: NODE_HITS, maxHits: NODE_HITS,
    cooldownUntil: 0, respawnUntil: 0, depleted: false, shake: 0,
    scale: 1, respawnTime: nodeRespawnMs(type),
  };
}

function buildNodes() {
  for (const n of nodes) { disposeGroup(n.mesh); nodeGroup.remove(n.mesh); }
  nodes.length = 0;
  const z = zoneAt(state.zone);
  const counts = nodeCounts(state.zone);
  for (const [type, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      let x, zz, tries = 0;
      do {
        const a = rand(0, Math.PI * 2);
        const r = rand(7, z.radius - 5);
        x = Math.cos(a) * r; zz = Math.sin(a) * r;
        tries++;
      } while (tries < 25 && (
        dist2D(x, zz, 0, 0) < 6 ||
        dist2D(x, zz, MERCHANT_POS[0], MERCHANT_POS[2]) < 6
      ));
      const node = makeNode(type);
      node.mesh.position.set(x, 0, zz);
      nodeGroup.add(node.mesh);
      nodes.push(node);
    }
  }
}

const harvestPos = new THREE.Vector3();
function harvestNode(node) {
  const now = performance.now();
  if (node.depleted) return;
  if (now < node.cooldownUntil) { toast('⏳ Ancora un momento...'); audio.error(); return; }

  const lvl = toolLevel(state, node.type === 'tree' ? 'axe' : 'pick');
  if (lvl === 0 && Math.random() < 0.3) {
    toast(choice([
      '✋ Mani nude! Meglio un attrezzo...',
      '💪 Con le mani è dura... crafta 🪓 o ⛏️ nel 🧰 Craft',
      '😅 Le mani nude rendono poco. Molto poco.',
    ]));
  }

  const amount = harvestYield(state, node.type);
  addResource(node.resource, amount);
  if (node.type === 'crystal') audio.mineCrystal();
  else if (node.type === 'tree') audio.chop();
  else audio.mine();

  if (node.type === 'rock' && lvl >= 2 && Math.random() < 0.22) {
    addResource('cristallo', 1);
    toast('🔮 Un cristallo è spuntato dalla roccia!');
  }

  node.hits--;
  node.cooldownUntil = now + toolStats(state, node.type === 'tree' ? 'axe' : 'pick').interval * 1000;
  node.shake = 1;

  harvestPos.copy(node.mesh.position);
  harvestPos.y = 1.5;
  burst(harvestPos, RESOURCES[node.resource].color, 8);
  floater(harvestPos, `+${amount} ${RESOURCES[node.resource].icon}`, RESOURCES[node.resource].color);

  if (node.hits <= 0) {
    node.depleted = true;
    node.respawnUntil = now + node.respawnTime;
    toast(choice(
      node.type === 'tree'
        ? ['🌳 Albero abbattuto! Ricrescerà tra poco.', '🪓 Crac! L’albero si arrende.']
        : node.type === 'rock'
          ? ['🪨 Roccia spaccata! Tornerà presto.', '⛏️ Tonfo! La roccia va in pensione.']
          : ['🔮 Cristallo estratto! Ricresce da solo.', '✨ I cristalli sono testardi ma generosi.']
    ));
  }
  markDirty('resources');
  save();
}

/* Mercante (Sgobbo) */
let merchantGroup = null;
function buildMerchant() {
  if (merchantGroup) { disposeGroup(merchantGroup); scene.remove(merchantGroup); }
  const g = new THREE.Group();
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.7, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8, flatShading: true })
  );
  table.position.y = 0.35; table.castShadow = true; table.receiveShadow = true;
  const boxMerch = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 0.9, flatShading: true })
  );
  boxMerch.position.set(0.6, 0.86, 0.35);
  const boxWood = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.32, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.9, flatShading: true })
  );
  boxWood.position.set(-0.55, 0.8, -0.25);

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.9 });
  for (const [px, pz] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) {
    const p = new THREE.Mesh(poleGeo, poleMat);
    p.position.set(px, 1.15, pz);
    p.castShadow = true;
    g.add(p);
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.12, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x7b2fff, flatShading: true })
  );
  roof.position.y = 2.35; roof.castShadow = true;

  const bodyM = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.6, flatShading: true })
  );
  bodyM.position.set(1.7, 1.0, 0); bodyM.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xffc79a, roughness: 0.7, flatShading: true })
  );
  head.position.set(1.7, 1.7, 0);
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xff5e9c, flatShading: true })
  );
  hat.position.set(1.7, 2.12, 0);
  const eyeMatM = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const eyesM = new THREE.Group();
  for (const sx of [1.56, 1.84]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMatM);
    e.position.set(sx, 1.76, 0.27);
    eyesM.add(e);
  }

  g.add(table, boxMerch, boxWood, roof, bodyM, head, hat, eyesM);
  const spr = iconSprite('cristallo', 1.9);
  spr.material = iconMats.cristallo;
  spr.position.set(1.7, 2.9, 0);
  g.add(spr);

  g.position.set(MERCHANT_POS[0], 0, MERCHANT_POS[2]);
  g.rotation.y = Math.atan2(-MERCHANT_POS[0], -MERCHANT_POS[2]);
  scene.add(g);
  merchantGroup = g;
}

/* Azione contestuale */
const NODE_REACH = 2.9;
const MERCHANT_REACH = 3.6;
const PORTAL_REACH = 5.0;
let context = null;
let lastCtxKey = null;

function computeContext() {
  let bestD = NODE_REACH, bestNode = null;
  for (const n of nodes) {
    /* I nodi in cooldown restano contesto: se sparissero, il pulsante
       azione si nasconderebbe per tutta la durata del cooldown e il
       giocatore fermo accanto all'albero non saprebbe più cosa fare.
       Sarà harvestNode() a rispondere "ancora un momento". */
    if (n.depleted) continue;
    const d = dist2D(n.mesh.position.x, n.mesh.position.z, player.position.x, player.position.z);
    if (d < bestD) { bestD = d; bestNode = n; }
  }
  if (bestNode) { context = { kind: 'node', node: bestNode }; return; }
  if (merchantGroup) {
    const d = dist2D(merchantGroup.position.x, merchantGroup.position.z, player.position.x, player.position.z);
    if (d < MERCHANT_REACH) { context = { kind: 'merchant' }; return; }
  }
  if (dist2D(player.position.x, player.position.z, 0, 0) < PORTAL_REACH) context = { kind: 'portal' };
  else context = null;
}

function doAction() {
  if (!context) return;
  if (context.kind === 'node') harvestNode(context.node);
  else if (context.kind === 'merchant') openPanel('merchant');
  else openPanel('zones');
}

function updateActionBtn() {
  if (!context) {
    if (lastCtxKey !== null) { el.actionBtn.classList.add('hidden'); lastCtxKey = null; }
    return;
  }
  let key = context.kind;
  let label = '';
  if (context.kind === 'node') {
    const cooling = performance.now() < context.node.cooldownUntil;
    key = 'node:' + context.node.type + (cooling ? ':cd' : '');
    label = cooling
      ? (context.node.type === 'tree' ? '🪓 Taglia…' : context.node.type === 'rock' ? '⛏️ Mina…' : '🔮 Estrai…')
      : (context.node.type === 'tree' ? '🪓 Taglia' : context.node.type === 'rock' ? '⛏️ Mina' : '🔮 Estrai');
  } else if (context.kind === 'merchant') label = '🤝 Parla';
  else label = '🌀 Zone';
  if (key !== lastCtxKey) {
    el.actionBtn.textContent = label;
    lastCtxKey = key;
  }
  el.actionBtn.classList.remove('hidden');
}

/* ------------------------------------------------------------
   8. CAMBIO ZONA
   ------------------------------------------------------------ */
function enterZone(idx) {
  state.zone = safeZoneIndex(idx);
  const z = zoneAt(state.zone);

  groundMat.color.set(z.ground);
  ground.scale.setScalar(z.radius);
  wall.scale.set(z.radius, 1, z.radius);
  wallMat.color.set(z.gem);
  scene.fog = scene.fog || new THREE.Fog(z.fog, 40, 140);
  scene.fog.color.set(z.fog);
  scene.fog.near = z.radius * 0.45;
  scene.fog.far = z.radius * 2.4;

  skyUniforms.top.value.set(z.sky);
  skyUniforms.bottom.value.set(z.fog);

  hemi.color.set(z.hemiSky);
  hemi.groundColor.set(z.hemiGround);
  sun.color.set(z.sun);
  rim.color.set(z.gem);
  if (state.zone >= 4) { hemi.intensity = 0.55; sun.intensity = 1.0; }
  else { hemi.intensity = 0.9; sun.intensity = 1.1; }

  /* Luce per zona: lava, cristalli, neon. */
  zoneLight.position.set(0, 6, 0);
  if (state.zone === 2) { zoneLight.color.set(0x8a5cff); zoneLight.intensity = 26; zoneLight.distance = 55; }
  else if (state.zone === 3) { zoneLight.color.set(0x00e5ff); zoneLight.intensity = 18; zoneLight.distance = 60; }
  else if (state.zone === 4) { zoneLight.color.set(0xff5a1a); zoneLight.intensity = 34; zoneLight.distance = 70; }
  else { zoneLight.intensity = 0; }

  moteMat.color.set(z.gem);
  moteMat.opacity = state.zone === 3 || state.zone === 5 ? 0.8 : 0.5;
  motes.visible = state.zone !== 5;

  /* Ogni zona ha un elemento che la rende riconoscibile a colpo d'occhio:
     tetto e stalattiti nella caverna, acqua nell'oceano, lava nel
     vulcano, nebulose nello spazio. */
  caveDome.visible = state.zone === 2;
  caveDome.scale.setScalar(z.radius * 1.05);
  caveDome.position.y = 26;
  water.visible = state.zone === 3;
  water.scale.setScalar(z.radius * 0.98);
  waterUniforms.tint.value.set(z.gem);
  lava.visible = state.zone === 4;
  lava.scale.setScalar(z.radius * 0.42);
  lavaUniforms.hot.value.set(z.gem);

  buildStalactites(z.radius);
  buildNebulae(z.radius);

  starField.visible = state.zone >= 5;
  portalRing.material.color.set(z.gem);
  portalRing.material.emissive.set(z.gem);

  renderer.toneMappingExposure = z.exposure;
  if (bloomPass) bloomPass.strength = z.bloom;

  player.position.set(0, 0, 0);
  camera.position.set(0, 11, 17);
  buildDecor();
  buildNodes();
  buildMerchant();
  clearGems();
  spawnTimer = 0;
  for (let i = 0; i < 6; i++) spawnGem();

  /* L'ambiente sonoro segue la zona: senza questo nasceva sul Prato e
     restava lì per tutta la partita. */
  audio.setAmbient(state.zone);

  el.zoneName.textContent = z.name;
  toast(`${z.name} — ${z.tagline}`);
  markDirty('all');
  updateHUD();
}

/* ------------------------------------------------------------
   9. INPUT
   ------------------------------------------------------------ */
const keys = {};
const joyInput = { x: 0, y: 0 };
let joyActive = false;

/* Il movimento è riutilizzato: movementVector() non allocava un oggetto
   nuovo a ogni frame. */
const move = { x: 0, z: 0, len: 0 };
function movementVector() {
  let x = 0, z = 0;
  if (keys.KeyW || keys.ArrowUp) z -= 1;
  if (keys.KeyS || keys.ArrowDown) z += 1;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  x += joyInput.x;
  z += joyInput.y;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  move.x = x; move.z = z; move.len = Math.min(1, len);
  return move;
}

const ACTION_CODES = new Set(['KeyE', 'KeyB', 'KeyC', 'KeyM', 'Escape']);

window.addEventListener('keydown', (e) => {
  /* I tasti d'azione scattano una volta sola: tenendo premuto E si
     ricostruiva l'intero pannello Zone ~30 volte al secondo. */
  if (ACTION_CODES.has(e.code) && e.repeat) return;

  /* Prima dello start non si fa nulla: altrimenti B/E sullo splash
     aprivano pannelli che restavano aperti sotto. */
  if (!booted) return;

  keys[e.code] = true;
  if (e.code === 'KeyE') { if (context) doAction(); else openPanel('zones'); }
  if (e.code === 'KeyB') openPanel('shop');
  if (e.code === 'KeyC') openPanel('craft');
  if (e.code === 'KeyM') openPanel('merchant');
  if (e.code === 'Escape') closePanel();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });

/* Senza questo, Alt-Tab o una notifica lasciavano i tasti "premuti":
   Cubetto continuava a camminare da solo. */
function releaseAllInput() {
  for (const k of Object.keys(keys)) keys[k] = false;
  joyActive = false;
  joyInput.x = 0; joyInput.y = 0;
  el.joyStick.style.transform = 'translate(0,0)';
}
window.addEventListener('blur', releaseAllInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAllInput(); });

/* Joystick */
const joyRadius = 44;
function setJoy(e) {
  const rect = el.joyBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > joyRadius) { dx = (dx / len) * joyRadius; dy = (dy / len) * joyRadius; }
  el.joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  joyInput.x = dx / joyRadius;
  joyInput.y = dy / joyRadius;
}
el.joyBase.addEventListener('pointerdown', (e) => {
  el.joyBase.setPointerCapture(e.pointerId);
  joyActive = true; setJoy(e);
});
el.joyBase.addEventListener('pointermove', (e) => { if (joyActive) setJoy(e); });
function resetJoy() {
  joyActive = false; joyInput.x = 0; joyInput.y = 0;
  el.joyStick.style.transform = 'translate(0,0)';
}
el.joyBase.addEventListener('pointerup', resetJoy);
el.joyBase.addEventListener('pointercancel', resetJoy);

/* ------------------------------------------------------------
   10. RACCOLTA
   ------------------------------------------------------------ */
let combo = 0;
let comboTimer = 0;
let lastPickupAt = 0;

function collect(g) {
  const i = gems.indexOf(g);
  if (i < 0) return;
  gems.splice(i, 1);
  scene.remove(g.mesh);

  /* Il valore è rivalutato al momento della raccolta: prima era fissato
     nello spawn, quindi comprare "Taglia Gemme" non cambiava le gemme
     già per terra. */
  const val = (g.golden ? 12 : 1) * gemValueWithStars(state);
  state.energy += val;
  state.totalEarned += val;
  state.gemsCollected++;

  /* Combo: gemme raccolte in sequenza rapida. Si misura l'istante
     dell'ultima raccolta, non la gemma: ogni gemma è un oggetto nuovo,
     quindi una WeakMap per gemma sarebbe sempre vuota. */
  const now = performance.now();
  combo = now - lastPickupAt < 900 ? combo + 1 : 1;
  lastPickupAt = now;

  burst(g.mesh.position, g.golden ? 0xffd54f : ZONES[state.zone].gem, g.golden ? 14 : 7);
  floater(g.mesh.position, g.golden ? `+${fmt(val)} 💛` : `+${fmt(val)}`, g.golden ? '#ffd54f' : '#9ff5b0');

  if (g.golden) {
    audio.collectGold();
    toast(choice(['💛 GEMMA D’ORO! Che colpo di fortuna!', '🌟 Oro puro! Cubetto non ci crede.', '🍀 La Fortuna ti sorride, eccome!']));
  } else {
    audio.collect(combo);
  }
  if (combo >= 10 && combo % 10 === 0) {
    toast(`🔥 Combo ×${combo}! Le mani di Cubetto non si fermano più.`);
    audio.milestone();
  }
  if (state.gemsCollected > 0 && state.gemsCollected % 50 === 0) {
    toast(`🎉 ${state.gemsCollected} gemme raccolte! Cubetto è orgoglioso di te.`);
    audio.milestone();
  }
  markDirty('energy');
}

/* ------------------------------------------------------------
   11. HUD, TOAST, FLOATER
   ------------------------------------------------------------ */

/* updateHUD non viene più chiamato a ogni raccolta: prima ricostruiva
   l'intero pannello Craft o Mercante per ogni gemma, N volte in un
   frame. Ora il testo si aggiorna a 10 Hz e i pannelli si
   ri-renderizzano solo quando cambia il tab o quando lo stato è "sporco". */
let hudTimer = 0;
const dirty = new Set();
function markDirty(what) { dirty.add(what); }
function isPanelOpen() { return !el.overlay.classList.contains('hidden'); }

function updateHUD(force = false) {
  el.energy.textContent = fmt(state.energy);
  el.perSec.textContent = `+${fmt(incomePerSec(state))}/s`;
  el.gems.textContent = fmt(state.gemsCollected);
  el.stars.textContent = fmt(state.stars);
  el.panelEnergy.textContent = fmt(state.energy);
  updateResourceBar();

  if (!force) return;
  if (currentTab === 'craft') renderCraft();
  else if (currentTab === 'merchant') renderMerchant();
  else if (currentTab === 'shop') renderShop();
  else if (currentTab === 'zones') renderZones();
  else if (currentTab === 'prestige') renderPrestige();
}

function updateResourceBar() {
  /* Gli span sono creati una volta sola: si aggiorna solo il numero.
     Prima innerHTML = '' li ricreava 7 volte per gemma raccolta. */
  if (el.resBar.children.length !== Object.keys(RESOURCES).length) {
    el.resBar.textContent = '';
    for (const [id, r] of Object.entries(RESOURCES)) {
      const span = document.createElement('span');
      span.className = 'res-item';
      span.title = r.name;
      const ic = document.createElement('span');
      ic.textContent = r.icon;
      const b = document.createElement('b');
      span.append(ic, b);
      span.dataset.res = id;
      el.resBar.appendChild(span);
    }
  }
  let i = 0;
  for (const id of Object.keys(RESOURCES)) {
    const span = el.resBar.children[i++];
    const want = fmt(state.resources[id] || 0);
    if (span.lastChild.textContent !== want) span.lastChild.textContent = want;
  }
}

function toast(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  el.toasts.appendChild(div);
  /* I toast fissi (riepilogo offline) non si contano nel limite e non
     hanno timer: sono l'unica cosa che il giocatore deve poter leggere. */
  while (el.toasts.querySelectorAll(':scope > .toast:not(.toast-sticky)').length > 3) {
    const primo = el.toasts.querySelector('.toast:not(.toast-sticky)');
    if (!primo) break;
    primo.remove();
  }
  setTimeout(() => { if (div.parentNode) div.remove(); }, 3700);
}

const projScratch = new THREE.Vector3();
function floater(worldPos, text, color) {
  projScratch.copy(worldPos).project(camera);
  if (projScratch.z > 1) return;
  const x = (projScratch.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projScratch.y * 0.5 + 0.5) * window.innerHeight;
  const node = document.createElement('div');
  node.className = 'floater';
  node.textContent = text;
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.style.color = color;
  el.floaters.appendChild(node);
  setTimeout(() => { if (node.parentNode) node.remove(); }, 950);
}

/* ------------------------------------------------------------
   12. PANNELLO
   ------------------------------------------------------------ */
let currentTab = 'shop';
function openPanel(tab) {
  el.overlay.classList.remove('hidden');
  releaseAllInput();
  setTab(tab || 'shop');
  updateHUD(true);
}
function closePanel() { el.overlay.classList.add('hidden'); }
function setTab(tab) {
  currentTab = tab;
  for (const t of document.querySelectorAll('#tabs .tab')) {
    t.classList.toggle('active', t.dataset.tab === tab);
    t.setAttribute('aria-selected', String(t.dataset.tab === tab));
  }
  el.tabShop.classList.toggle('hidden', tab !== 'shop');
  el.tabZones.classList.toggle('hidden', tab !== 'zones');
  el.tabCraft.classList.toggle('hidden', tab !== 'craft');
  el.tabMerchant.classList.toggle('hidden', tab !== 'merchant');
  el.tabPrestige.classList.toggle('hidden', tab !== 'prestige');
  el.panelTitle.textContent =
    tab === 'shop' ? 'Negozio' : tab === 'zones' ? 'Zone' : tab === 'craft' ? 'Craft' :
    tab === 'merchant' ? 'Mercante' : 'Rinascita';
  updateHUD(true);
}

for (const t of document.querySelectorAll('#tabs .tab')) {
  t.addEventListener('click', () => setTab(t.dataset.tab));
}
$('btn-shop').addEventListener('click', () => openPanel('shop'));
$('btn-zones').addEventListener('click', () => openPanel('zones'));
$('btn-close').addEventListener('click', closePanel);
el.overlay.addEventListener('click', (e) => { if (e.target === el.overlay) closePanel(); });
el.actionBtn.addEventListener('click', doAction);
el.btnCraft.addEventListener('click', () => openPanel('craft'));
el.btnMerchant.addEventListener('click', () => openPanel('merchant'));

/* ---------- Negozio ---------- */
function renderShop() {
  el.tabShop.textContent = '';
  for (const u of UPGRADES) {
    const lvl = state.upgrades[u.id] || 0;
    const val = upgradeValue(u.id, lvl);
    const cost = upgradeCost(u.id, lvl);
    const card = document.createElement('div');
    card.className = 'up-card';
    const info = document.createElement('div');
    info.className = 'up-info';
    const name = document.createElement('div');
    name.className = 'up-name';
    name.textContent = u.name;
    const badge = document.createElement('span');
    badge.className = 'up-lvl';
    badge.textContent = `Lv ${lvl}`;
    name.appendChild(badge);
    const desc = document.createElement('div');
    desc.className = 'up-desc';
    desc.textContent = u.desc(val);
    info.append(name, desc);

    const icon = document.createElement('div');
    icon.className = 'up-icon';
    icon.textContent = u.icon;

    const btn = document.createElement('button');
    btn.className = 'up-buy';
    btn.textContent = `💠 ${fmt(cost)}`;
    btn.disabled = state.energy < cost;
    btn.addEventListener('click', () => buyUpgrade(u.id, cost));

    card.append(icon, info, btn);
    el.tabShop.appendChild(card);
  }
}

function buyUpgrade(id, cost) {
  if (state.energy < cost) { audio.error(); return; }
  state.energy -= cost;
  state.upgrades[id] = (state.upgrades[id] || 0) + 1;
  if (id === 'drone') syncDrones();
  audio.upgrade();
  const u = UPGRADES.find((x) => x.id === id);
  toast(choice([
    `${u.icon} ${u.name} potenziato!`,
    `📈 ${u.name} sale di livello!`,
    `🔧 Cubetto ha migliorato ${u.name}.`,
  ]));
  save();
  updateHUD(true);
}

/* ---------- Zone ---------- */
function renderZones() {
  el.tabZones.textContent = '';
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    const locked = i > state.unlockedZone;
    const isHere = i === state.zone;
    const canUnlock = i === state.unlockedZone + 1;
    const card = document.createElement('div');
    card.className = 'zone-card' + (locked ? ' locked' : '');

    const swatch = document.createElement('div');
    swatch.className = 'zone-swatch';
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    swatch.style.background = `radial-gradient(circle at 40% 30%, ${hex(z.gem)}, ${hex(z.sky)})`;

    const info = document.createElement('div');
    info.className = 'zone-info';
    const name = document.createElement('div');
    name.className = 'zone-name';
    name.textContent = `${i === 0 ? '🏡 ' : ''}${z.name}`;
    const tag = document.createElement('div');
    tag.className = 'zone-tag';
    tag.textContent = z.tagline;
    const meta = document.createElement('div');
    meta.className = 'zone-meta';
    meta.textContent = `Valore gemma: ${fmt(z.base)} · ${locked ? '🔒 Bloccata' : isHere ? '📍 Sei qui' : 'Sbloccata'}`;
    info.append(name, tag, meta);

    const btn = document.createElement('button');
    btn.className = 'zone-btn' + (isHere ? ' here' : '');
    if (isHere) {
      btn.textContent = '📍';
      btn.disabled = true;
    } else if (locked) {
      if (canUnlock) {
        btn.textContent = `Sblocca 💠${fmt(z.unlock)}`;
        btn.disabled = state.energy < z.unlock;
        btn.addEventListener('click', () => unlockZone(i));
      } else {
        btn.textContent = '🔒';
        btn.disabled = true;
      }
    } else {
      btn.textContent = 'Viaggia ➜';
      btn.addEventListener('click', () => { enterZone(i); closePanel(); });
    }

    card.append(swatch, info, btn);
    el.tabZones.appendChild(card);
  }
}

function unlockZone(i) {
  const z = ZONES[i];
  if (state.energy < z.unlock) { audio.error(); return; }
  state.energy -= z.unlock;
  state.unlockedZone = i;
  audio.unlockZone();
  toast(`🚪 Hai sbloccato ${z.name}! ${z.tagline}`);
  burst(new THREE.Vector3(0, 2, 0), z.gem, 24);
  save();
  enterZone(i);
  closePanel();
}

/* ---------- Craft ---------- */
function renderCraft() {
  el.tabCraft.textContent = '';
  const inv = document.createElement('div');
  inv.className = 'inv-grid';
  for (const [id, r] of Object.entries(RESOURCES)) {
    const item = document.createElement('div');
    item.className = 'inv-item';
    item.title = r.name;
    const ic = document.createElement('span');
    ic.className = 'ic';
    ic.textContent = r.icon;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = fmt(state.resources[id] || 0);
    item.append(ic, n);
    inv.appendChild(item);
  }
  el.tabCraft.appendChild(inv);

  const toolsDiv = document.createElement('div');
  toolsDiv.className = 'mer-quote';
  toolsDiv.textContent = `Attrezzi attuali: ${toolLabel(state, 'axe')} · ${toolLabel(state, 'pick')}`;
  el.tabCraft.appendChild(toolsDiv);

  for (const r of RECIPES) {
    const unlocked = recipeUnlocked(state, r);
    const done = isRecipeDone(state, r);
    const can = canCraft(state, r);
    const card = document.createElement('div');
    card.className = 'rec-card' + (unlocked ? '' : ' locked');

    const cost = document.createElement('div');
    cost.className = 'rec-cost';
    for (const [id, n] of Object.entries(r.cost)) {
      const have = id === 'energia' ? state.energy : (state.resources[id] || 0);
      const s = document.createElement('span');
      s.className = have >= n ? 'has' : 'no';
      s.textContent = `${id === 'energia' ? '💠' : RESOURCES[id].icon} ${fmt(n)}`;
      cost.appendChild(s);
    }

    const info = document.createElement('div');
    info.className = 'rec-info';
    const name = document.createElement('div');
    name.className = 'rec-name';
    name.textContent = r.name;
    const desc = document.createElement('div');
    desc.className = 'rec-desc';
    desc.textContent = r.desc;
    info.append(name, desc, cost);

    const icon = document.createElement('div');
    icon.className = 'rec-icon';
    icon.textContent = r.icon;

    const btn = document.createElement('button');
    btn.className = 'rec-btn' + (done ? ' done' : '');
    if (done) btn.textContent = '✓ Fatto';
    else if (!unlocked) btn.textContent = '🔒 Bloccata';
    else { btn.textContent = '🔨 Craft'; btn.disabled = !can; }
    if (can) btn.addEventListener('click', () => craft(r));

    card.append(icon, info, btn);
    el.tabCraft.appendChild(card);
  }
}

const craftPos = new THREE.Vector3();
function craft(r) {
  if (!craftInto(state, r)) { audio.error(); return; }
  audio.craft();
  player.getWorldPosition(craftPos);
  craftPos.y += 1.6;
  if (r.out.tool) {
    toast(`🛠️ ${r.name} creata! Ora raccogli molto di più!`);
    floater(craftPos, `${r.icon} Nuovo attrezzo!`, '#9ff5b0');
  } else {
    for (const [id, n] of Object.entries(r.out)) {
      floater(craftPos, `${RESOURCES[id].icon} +${n}`, RESOURCES[id].color);
    }
    toast(`🔨 Craft: ${r.name}`);
  }
  burst(craftPos, 0x7fe3ff, 12);
  markDirty('resources');
  save();
  updateHUD(true);
}

/* ---------- Mercante ---------- */
function sellResource(id, q) {
  if ((state.resources[id] || 0) < q) { audio.error(); return; }
  const price = sellPrice(id, state.zone);
  state.resources[id] -= q;
  const gold = q * price;
  addResource('oro', gold);
  audio.coin();
  toast(`💰 Venduti ${q} ${RESOURCES[id].icon} per ${fmt(gold)} Oro!`);
  markDirty('resources');
  save();
  updateHUD(true);
}

function buyResource(id, q) {
  const price = buyPrice(id, state.zone);
  const total = price * q;
  if ((state.resources.oro || 0) < total) { audio.error(); return; }
  state.resources.oro -= total;
  addResource(id, q);
  audio.coin();
  toast(`🛍️ Comprati ${q} ${RESOURCES[id].icon}!`);
  markDirty('resources');
  save();
  updateHUD(true);
}

function exchangeEnergy(toBuy) {
  if (toBuy) {
    if ((state.resources.oro || 0) < EXCHANGE.buy) { audio.error(); return; }
    state.resources.oro -= EXCHANGE.buy;
    state.energy += EXCHANGE.energy;
    audio.coin();
    toast(`🔋 Comprati ${EXCHANGE.energy} 💠 di Energia!`);
  } else {
    if (state.energy < EXCHANGE.energy) { audio.error(); return; }
    state.energy -= EXCHANGE.energy;
    addResource('oro', EXCHANGE.sell);
    audio.coin();
    toast(`💱 Venduti ${EXCHANGE.energy} 💠 per ${EXCHANGE.sell} 💰!`);
  }
  markDirty('resources');
  save();
  updateHUD(true);
}

function renderMerchant() {
  const root = el.tabMerchant;
  root.textContent = '';
  const zone = state.zone;
  const bonus = zonePriceBonus(zone);

  const borsa = document.createElement('div');
  borsa.className = 'mer-title';
  borsa.textContent = `💰 Borsa di Sgobbo: ${fmt(state.resources.oro || 0)} Oro`;
  root.appendChild(borsa);
  const quote = document.createElement('p');
  quote.className = 'mer-quote';
  quote.textContent = 'Sgobbo: "Tutto si compra, tutto si vende... tranne i sogni. Quelli sono gratis."';
  root.appendChild(quote);
  const bonusNote = document.createElement('p');
  bonusNote.className = 'mer-quote';
  bonusNote.textContent = bonus > 1
    ? `📍 Prezzi di zona: ×${bonus.toFixed(2)} su compra e vendita.`
    : '📍 Prezzi base del Prato Felice.';
  root.appendChild(bonusNote);

  const mkRow = (resId, have, price, qty, action) => {
    const row = document.createElement('div');
    row.className = 'mer-row';
    const res = document.createElement('div');
    res.className = 'mer-res';
    res.textContent = `${RESOURCES[resId].icon} ${RESOURCES[resId].name}`;
    if (have !== null) {
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = ` (hai ${fmt(have)})`;
      res.appendChild(n);
    }
    const pr = document.createElement('div');
    pr.className = 'mer-price';
    pr.textContent = `${price} 💰/u`;
    const btns = document.createElement('div');
    btns.className = 'mer-btns';
    for (const q of qty) {
      const b = document.createElement('button');
      b.className = action === 'sell' ? 'mer-btn sell' : 'mer-btn';
      b.textContent = action === 'sell'
        ? (q === 1 ? 'Vendi 1' : `Vendi ${q}`)
        : (q === 1 ? 'Compra 1' : `Compra ${q}`);
      b.disabled = action === 'sell'
        ? (have || 0) < q
        : (state.resources.oro || 0) < price * q;
      b.addEventListener('click', () => action === 'sell' ? sellResource(resId, q) : buyResource(resId, q));
      btns.appendChild(b);
    }
    row.append(res, pr, btns);
    return row;
  };

  const tV = document.createElement('div');
  tV.className = 'mer-title';
  tV.textContent = '💱 Vendi al mercante';
  root.appendChild(tV);
  for (const id of Object.keys(PRICES)) {
    root.appendChild(mkRow(id, state.resources[id] || 0, sellPrice(id, zone), [1, 10], 'sell'));
  }

  const tC = document.createElement('div');
  tC.className = 'mer-title';
  tC.textContent = '🛍️ Compra dal mercante';
  root.appendChild(tC);
  for (const id of Object.keys(PRICES)) {
    root.appendChild(mkRow(id, null, buyPrice(id, zone), [1, 5], 'buy'));
  }

  const tE = document.createElement('div');
  tE.className = 'mer-title';
  tE.textContent = '🔁 Cambio Energia ↔ Oro';
  root.appendChild(tE);
  const rowE = document.createElement('div');
  rowE.className = 'mer-row';
  const resE = document.createElement('div');
  resE.className = 'mer-res';
  resE.textContent = `💠 Energia (hai ${fmt(state.energy)})`;
  const prE = document.createElement('div');
  prE.className = 'mer-price';
  prE.textContent = `${EXCHANGE.sell} 💰 / ${EXCHANGE.energy} 💠`;
  const btnsE = document.createElement('div');
  btnsE.className = 'mer-btns';
  const b1 = document.createElement('button');
  b1.className = 'mer-btn sell';
  b1.textContent = `Vendi ${EXCHANGE.energy} 💠`;
  b1.disabled = state.energy < EXCHANGE.energy;
  b1.addEventListener('click', () => exchangeEnergy(false));
  const b2 = document.createElement('button');
  b2.className = 'mer-btn';
  b2.textContent = `Compra ${EXCHANGE.energy} 💠`;
  b2.disabled = (state.resources.oro || 0) < EXCHANGE.buy;
  b2.addEventListener('click', () => exchangeEnergy(true));
  btnsE.append(b1, b2);
  rowE.append(resE, prE, btnsE);
  root.appendChild(rowE);
}

/* ---------- Rinascita ---------- */
let confirmPrestige = false;
let confirmTimer = null;

function renderPrestige() {
  const gain = prestigeGain(state);
  el.tabPrestige.textContent = '';

  const box = document.createElement('div');
  box.className = 'prestige-box';
  const h = document.createElement('h3');
  h.textContent = '🌌 Esplosione Cosmica';
  const p1 = document.createElement('p');
  p1.textContent = 'Fai esplodere l\'universo e ricomincia da zero in cambio di Stelle. Ogni Stella dà un +10% permanente a tutti i guadagni.';
  const num = document.createElement('div');
  num.className = 'big-num';
  num.textContent = `+${fmt(gain)} ⭐`;
  const p2 = document.createElement('p');
  p2.innerHTML = `Raccogli almeno <b>${fmt(PRESTIGE_MIN)} 💠</b> in totale per rinascere.<br>Ora hai guadagnato <b>${fmt(state.totalEarned)} 💠</b> in questa vita.`;
  box.append(h, p1, num, p2);

  const warn = document.createElement('p');
  warn.className = 'mer-quote';
  warn.textContent = '⚠️ Perderai anche attrezzi, risorse e Oro. Restano solo le Stelle.';
  const stars = document.createElement('p');
  stars.style.fontSize = '13px';
  stars.style.color = 'var(--dim)';
  stars.textContent = `Hai già ${fmt(state.stars)} ⭐ (moltiplicatore ×${starMult(state).toFixed(2)}).`;

  const btn = document.createElement('button');
  btn.className = 'big-btn2';
  btn.textContent = confirmPrestige ? '⚠️ Tocca di nuovo per confermare!' : '💥 Fai esplodere tutto';
  btn.disabled = gain <= 0;
  btn.addEventListener('click', () => doPrestige(gain));

  el.tabPrestige.append(box, warn, stars, btn);
}

function doPrestige(gain) {
  if (gain <= 0) { audio.error(); return; }
  if (!confirmPrestige) {
    confirmPrestige = true;
    renderPrestige();
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => { confirmPrestige = false; renderPrestige(); }, 3000);
    return;
  }
  confirmPrestige = false;
  clearTimeout(confirmTimer);
  state = applyPrestige(state, gain);
  syncDrones();
  audio.prestige();
  burst(player.position, 0xffd54f, 30);
  toast(`💥 BOOM! Universo esploso! Hai guadagnato ${fmt(gain)} ⭐ (+${fmt(gain * STAR_BONUS * 100)}% guadagni!)`);
  save(true);
  enterZone(0);
  closePanel();
  updateHUD(true);
}

/* ------------------------------------------------------------
   13. POST-PROCESSING
   ------------------------------------------------------------ */
let composer = null;
let bloomPass = null;

function buildComposer() {
  const dpr = renderer.getPixelRatio();
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.55, 0.75
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

/* La quality scende da sola se il gioco gira sotto i 45 fps medi.
   Ordine: prima sparisce il bloom, poi le ombre.
   Misura il tempo REALE (performance.now), non il dt del loop: dt è
   limitato a 0.05 per stabilizzare la fisica, quindi su un dispositivo
   a 15 fps restituirebbe sempre 20 e il controllo non scenderebbe mai. */
let perfMark = 0;
let perfFrames = 0;
function watchPerformance() {
  const now = performance.now();
  if (!perfMark) { perfMark = now; perfFrames = 0; return; }
  perfFrames++;
  const elapsed = (now - perfMark) / 1000;
  if (elapsed < 2.5) return;
  const fps = perfFrames / elapsed;
  perfMark = now;
  perfFrames = 0;
  if (fps < 45 && quality.level > 0) {
    quality.level--;
    applyQuality();
    toast(quality.level === 1
      ? '📉 Grafica alleggerita per scorrere meglio: il bagliore è stato ridotto.'
      : '📉 Grafica alleggerita ancora: le ombre sono state ridotte.');
  }
}

function applyQuality() {
  const on = quality.level >= 1;
  if (on && !composer) buildComposer();
  renderer.shadowMap.enabled = quality.level >= 2;
  /* La shadow map va rilasciata quando le ombre si spengono, o il renderer
     continua a tiene la texture allocata senza usarla. */
  if (quality.level < 2 && sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.level >= 1 ? 2 : 1.25));
  if (composer) composer.setPixelRatio(renderer.getPixelRatio());
  /* I materiali devono ricompilarsi dopo il cambio di stato delle ombre. */
  scene.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
}

/** Forza un livello di qualità (0-2). Usato dal watchdog e dai test. */
function setQuality(level) {
  quality.level = clamp(Math.floor(level), 0, 2);
  applyQuality();
}

function currentFps() {
  return perfMark && perfFrames ? perfFrames / ((performance.now() - perfMark) / 1000) : 0;
}



/* ------------------------------------------------------------
   14. CICLO PRINCIPALE
   ------------------------------------------------------------ */
const clock = new THREE.Clock();
let spawnTimer = 0;
let incomeTick = 0;
let bobPhase = 0;
let time = 0;
let frames = 0;
const camTarget = new THREE.Vector3();
const zoneColorA = new THREE.Color();
const zoneColorB = new THREE.Color();

function animate() {
  requestAnimationFrame(animate);
  if (contextLost) { clock.getDelta(); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  frames++;
  watchPerformance();
  simulate(dt);
  /* --- Render --- */
  if (quality.level >= 1) composer.render();
  else renderer.render(scene, camera);
}

/**
 * Un passo di simulazione, separato dal rendering.
 * Il rendering è la parte lenta e non deterministica (dipende dalla GPU):
 * tenere la simulazione isolata permette ai test di avanare il mondo a
 * passo fisso senza dipendere dai frame disegnati.
 */
function simulate(dt) {
  time += dt;

  /* --- Movimento --- */
  const mv = movementVector();
  const speed = 7 * upgradeValue('speed', state.upgrades.speed || 0);
  const moving = mv.len > 0.05;
  if (moving) {
    player.position.x += mv.x * speed * dt;
    player.position.z += mv.z * speed * dt;
    const targetYaw = Math.atan2(-mv.x, -mv.z);
    let dy = targetYaw - player.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    player.rotation.y += dy * Math.min(1, dt * 10);
    bobPhase += dt * (6 + speed * 0.5);
  } else {
    bobPhase = lerp(bobPhase, 0, dt * 4);
  }

  /* --- Limite di zona (raggio variabile) --- */
  const zr = zoneAt(state.zone).radius;
  const pr = Math.hypot(player.position.x, player.position.z);
  if (pr > zr) {
    player.position.x *= zr / pr;
    player.position.z *= zr / pr;
  }

  const bob = moving ? Math.sin(bobPhase) * 0.08 : Math.sin(time * 2) * 0.02;
  player.position.y = bob;
  /* Il corpo non ruota più su se stesso: si muove la faccia, così
     Cubetto guarda dove va invece di vibrare. */
  body.rotation.y = Math.sin(time * (moving ? 3 : 1)) * (moving ? 0.12 : 0.04);
  body.rotation.x = Math.cos(bobPhase * 0.5) * (moving ? 0.06 : 0.02);
  face.position.y = 0.72;

  /* Passeggino: gambe e braccia contrarie. */
  const stride = moving ? Math.sin(bobPhase * 1.6) * 0.55 : 0;
  legs[0].position.z = stride * 0.3;
  legs[1].position.z = -stride * 0.3;
  legs[0].rotation.x = stride;
  legs[1].rotation.x = -stride;
  arms[0].rotation.x = -stride * 0.8;
  arms[1].rotation.x = stride * 0.8;

  /* Sciarpa: ogni segmento segue il precedente con un ritardo. */
  scarfPrev.x = 0;
  scarfPrev.y = 1.32;
  scarfPrev.z = 0.2;
  for (const seg of scarf) {
    seg.node.x = lerp(seg.node.x, scarfPrev.x, Math.min(1, dt * 14));
    seg.node.y = lerp(seg.node.y, scarfPrev.y - 0.06, Math.min(1, dt * 14)) + Math.sin(time * 6 + seg.phase) * 0.02;
    seg.node.z = lerp(seg.node.z, scarfPrev.z + (moving ? 0.35 : 0.12), Math.min(1, dt * 12));
    seg.mesh.position.set(seg.node.x, seg.node.y, seg.node.z);
    scarfPrev = seg.node;
  }

  /* La faccia guarda nella direzione di marcia, in spazio locale del player. */
  face.position.y = 0.72;
  face.position.z = 0;

  antennaGem.material.emissiveIntensity = 1.2 + Math.sin(time * 5) * 0.5;
  antennaGem.rotation.y += dt * 3;

  /* --- Camera (senza allocazioni per frame) ---
     Guarda un punto SOPRA e un po' davanti al giocatore: guardando il
     centro esatto l'orizzonte restava fuori dall'inquadratura e il cielo
     — l'unica cosa che distingue una zona dall'altra — non si vedeva. */
  camTarget.set(player.position.x, player.position.y + 11, player.position.z + 17);
  camera.position.lerp(camTarget, 1 - Math.exp(-dt * 5));
  camera.lookAt(player.position.x, player.position.y + 2.4, player.position.z - 1);

  /* La shadow camera segue il giocatore: finestra stretta = ombre nitide
     anche nelle zone da raggio 68, che prima si tagliavano al bordo. */
  sun.position.set(player.position.x + 18, 32, player.position.z + 12);
  sun.target.position.set(player.position.x, 0, player.position.z);
  sun.target.updateMatrixWorld();

  /* --- Portale --- */
  portalGroup.rotation.y += dt * 0.8;
  portalGroup.position.y = 1.1 + Math.sin(time * 1.4) * 0.1;

  /* --- Nodi: animazione, respawn, anelli --- */
  const nowMs = performance.now();
  for (const n of nodes) {
    if (n.depleted) {
      n.scale = lerp(n.scale, 0, 1 - Math.exp(-dt * 10));
      if (nowMs >= n.respawnUntil) {
        n.depleted = false;
        n.hits = n.maxHits;
        n.mesh.visible = true;
        n.scale = 0.01;
      }
    } else {
      n.scale = lerp(n.scale, 1, 1 - Math.exp(-dt * 5));
    }
    if (n.depleted && n.scale < 0.06) n.mesh.visible = false;
    n.mesh.scale.setScalar(Math.max(n.scale, 0.0001));
    if (n.shake > 0.01) {
      n.mesh.rotation.z = Math.sin(nowMs * 0.06) * 0.13 * n.shake;
      n.mesh.rotation.x = Math.cos(nowMs * 0.05) * 0.09 * n.shake;
      n.shake *= Math.exp(-dt * 6);
    } else {
      n.mesh.rotation.x = 0;
      n.mesh.rotation.z = 0;
    }
    /* La distanza è calcolata una volta sola: computeContext() la
       ricalcolava subito dopo su tutti i nodi. */
    const near = !n.depleted && nowMs >= n.cooldownUntil &&
      dist2D(n.mesh.position.x, n.mesh.position.z, player.position.x, player.position.z) < NODE_REACH;
    n.ring.material.opacity = n.depleted ? 0 : near ? 0.8 : 0.32;
  }

  if (merchantGroup) merchantGroup.position.y = Math.sin(time * 1.6) * 0.04;

  /* --- Contesto e pulsante azione --- */
  computeContext();
  updateActionBtn();
  updateHint();

  /* --- Gemme: rotazione, magnete, raccolta --- */
  const pickupR = upgradeValue('radius', state.upgrades.radius || 0);
  const magnetR = upgradeValue('magnet', state.upgrades.magnet || 0);
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const m = g.mesh;
    m.rotation.y += dt * (g.golden ? 3 : 1.6);
    m.position.y = g.baseY + Math.sin(time * 2 + g.phase) * 0.25;
    const d = dist2D(m.position.x, m.position.z, player.position.x, player.position.z);
    if (d < pickupR) {
      collect(g);
    } else if (d < magnetR) {
      const pull = (1 - d / magnetR) * 10 * dt;
      m.position.x += (player.position.x - m.position.x) * pull;
      m.position.z += (player.position.z - m.position.z) * pull;
      g.baseY = m.position.y;
    }
  }

  /* --- Spawn gemme --- */
  spawnTimer -= dt;
  const maxGems = upgradeValue('spawn', state.upgrades.spawn || 0);
  if (spawnTimer <= 0 && gems.length < maxGems) {
    spawnGem();
    spawnTimer = 0.9;
  }

  /* --- Acqua e lava: le animano i loro shader --- */
  if (water.visible) waterUniforms.time.value = time;
  if (lava.visible) lavaUniforms.time.value = time;

  /* --- Polvere ambientale: deriva lenta, si ricicla sul giocatore --- */
  if (motes.visible) {
    const p = moteGeo.attributes.position;
    for (let i = 0; i < MOTES_COUNT; i++) {
      let y = p.array[i * 3 + 1] - dt * (state.zone === 3 ? -1.2 : 0.5);
      let x = p.array[i * 3];
      if (y < 0.4) y = 16;
      if (y > 17) y = 0.4;
      const dx = x - player.position.x;
      if (dx > 40) x -= 80; else if (dx < -40) x += 80;
      p.array[i * 3] = x;
      p.array[i * 3 + 1] = y;
    }
    p.needsUpdate = true;
  }

  /* --- Droni --- */
  for (const d of drones) {
    d.userData.angle += dt * 0.9;
    const a = d.userData.angle;
    const r = 2.4;
    d.position.set(
      player.position.x + Math.cos(a) * r,
      player.position.y + 1.3 + Math.sin(time * 2 + d.userData.phase) * 0.3,
      player.position.z + Math.sin(a) * r
    );
    d.rotation.y += dt * 2;
  }

  /* --- Reddito passivo --- */
  const ips = incomePerSec(state);
  if (ips > 0) {
    const gain = ips * dt;
    state.energy += gain;
    state.totalEarned += gain;
    incomeTick += dt;
    if (incomeTick >= 1 && drones.length) {
      incomeTick = 0;
      floater(drones[0].position, `+${fmt(ips)}`, '#7fe3ff');
    }
  }

  /* --- Combo --- */
  comboTimer += dt;
  if (comboTimer > 1.2 && combo > 0) { combo = 0; comboTimer = 0; }

  /* --- Particelle --- */
  for (const p of particles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; p.mesh.visible = false; continue; }
    p.vel.y -= 8 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const t = p.life / p.maxLife;
    p.mat.opacity = t;
    p.mesh.scale.setScalar(0.4 + t);
  }

  /* --- Dimensione Folle: il colore cangia ovunque, non solo sulle gemme.
     Prima toccava solo gemme e portale: cielo, nebbia, terreno e luci
     restavano fermi e la zona sembrava quella di prima. --- */
  if (state.zone === 6) {
    const hue = (time * 40) % 360;
    zoneColorA.setHSL(hue / 360, 1, 0.55);
    zoneColorB.setHSL(hue / 360, 0.8, 0.12);
    gemMatFor(6).emissive.copy(zoneColorA);
    gemMatFor(6).color.copy(zoneColorA).multiplyScalar(0.4);
    portalRing.material.color.copy(zoneColorA);
    portalRing.material.emissive.copy(zoneColorA);
    scene.fog.color.copy(zoneColorB);
    skyUniforms.top.value.copy(zoneColorA).multiplyScalar(0.5);
    skyUniforms.bottom.value.copy(zoneColorB);
    groundMat.color.copy(zoneColorB).multiplyScalar(2.2);
    zoneLight.color.copy(zoneColorA);
    moteMat.color.copy(zoneColorA);
  }

  /* --- HUD: 10 Hz, non a ogni frame --- */
  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.1;
    updateHUD(isPanelOpen() && (dirty.has('energy') || dirty.has('resources')));
    dirty.clear();
  }

}

/* L'istruzione contestuale si aggiorna solo quando cambia davvero:
   prima scriveva textContent ogni frame, e su mobile l'elemento è
   display:none quindi era sprecato. */
let lastHint = '';
function updateHint() {
  let h;
  if (!context) {
    h = matchMedia('(pointer: coarse)').matches
      ? '🕹️ Usa il joystick · tocca 🪓 per raccogliere'
      : 'WASD / frecce per muoverti · taglia alberi 🪵 e sassi 🪨';
  } else if (context.kind === 'node') {
    h = context.node.type === 'tree' ? '🪓 Premi E per tagliare'
      : context.node.type === 'rock' ? '⛏️ Premi E per minare'
      : '🔮 Premi E per estrarre';
  } else if (context.kind === 'merchant') {
    h = '🤝 Premi E per parlare con Sgobbo il Mercante';
  } else {
    h = '🌀 Premi E per viaggiare tra le Zone';
  }
  if (h !== lastHint) { el.hint.textContent = h; lastHint = h; }
}

/* ------------------------------------------------------------
   15. AVVIO
   ------------------------------------------------------------ */
function applyOfflineProgress() {
  const g = offlineGain(state);
  if (g.seconds <= 0) return;
  state.energy += g.energy;
  state.totalEarned += g.energy;
  if (g.wood) addResource('legno', g.wood);
  if (g.stone) addResource('pietra', g.stone);

  /* Il riepilogo sta in un riquadro dedicato e non è un toast: i toast
     si accavallano (benvenuto, nome della zona, avvisi di quality) e
     questo sparisce prima che il giocatore lo legga. */
  const ore = Math.max(1, Math.round(g.seconds / 3600));
  const parti = [];
  if (g.energy >= 1) parti.push(`<b>+${fmt(g.energy)} 💠</b>`);
  if (g.wood) parti.push(`<b>+${fmt(g.wood)} 🪵</b>`);
  if (g.stone) parti.push(`<b>+${fmt(g.stone)} 🪨</b>`);
  const box = document.createElement('div');
  box.className = 'toast toast-sticky';
  box.innerHTML = `😴 <b>Ben tornato!</b> Mentre eri via ${g.seconds >= 3600 ? `~${ore} ore` : `${Math.round(g.seconds / 60)} minuti`}: ${parti.join(' ')}`;
  el.toasts.appendChild(box);
  /* resta finché non lo chiude il giocatore: è l'unica prova che il gioco
     ha lavorato mentre lui non c'era */
  const chiudi = document.createElement('button');
  chiudi.className = 'toast-x';
  chiudi.textContent = '✕';
  chiudi.setAttribute('aria-label', 'Chiudi il riepilogo');
  chiudi.addEventListener('click', () => box.remove());
  box.appendChild(chiudi);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
}

function boot() {
  /* Guard: senza questo una seconda chiamata registrerebbe listener
     duplicati e avvierebbe un secondo requestAnimationFrame, con doppio
     reddito e doppio costo. */
  if (booted) return;
  booted = true;

/* applyOfflineProgress per PRIMO: legge il lastSave che viene dal disco,
     quindi non deve precederla nessun save() — il click su Gioca ne
     faceva uno e azzerava la finestra temporale, e la ricompensa offline
     non è mai arrivata a nessuno. Va anche prima di enterZone, così
     l'HUD mostra subito il riepilogo del ritorno. */
  applyOfflineProgress();

  syncDrones();
  /* applyQuality() prima di enterZone(): costruisce il composer, così la
     prima zona trova bloomPass già pronto e ne eredita l'intensità. */
  applyQuality();
  enterZone(state.zone);
  updateHUD(true);

  animate();

  window.addEventListener('beforeunload', () => doSave());
  document.addEventListener('visibilitychange', () => { if (document.hidden) doSave(); });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.level >= 1 ? 2 : 1.25));
  renderer.setSize(w, h);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    if (bloomPass) bloomPass.resolution.set(w, h);
  }
}

/* Contesto WebGL perso: senza questo un reset GPU (tipico su mobile
   dopo un po' in scheda) lasciava un canvas morto senza recovery. */
let contextLost = false;
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  contextLost = true;
  toast('⚠️ Scheda graica persa. Attendo il recupero...');
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  contextLost = false;
  applyQuality();
  toast('✅ Scheda graica recuperata. Andiamo!');
});

/* Audio: il contesto nasce solo qui, dentro un gesto utente. */
function syncMuteBtn() {
  el.btnMute.textContent = state.muted ? '🔇' : '🔊';
  el.btnMute.classList.remove('hidden');
  el.btnMute.setAttribute('aria-pressed', String(state.muted));
}
el.btnMute.addEventListener('click', () => {
  audio.unlock();
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  syncMuteBtn();
  save();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX') { state.muted = !state.muted; audio.setMuted(state.muted); syncMuteBtn(); save(); }
});

/* Installazione PWA */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('btn-install').classList.remove('hidden');
});
$('btn-install').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('btn-install').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* Splash → gioco */
audio.setMuted(state.muted);
el.btnPlay.addEventListener('click', () => {
  /* Primo gesto: qui si sblocca l'audio. */
  audio.unlock();
  audio.setAmbient(state.zone);
  el.splash.classList.add('hidden');
  if (!state.started) {
    state.started = true;
    toast('👋 Ciao! Io sono Cubetto. Raccogli le gemme e diventa ricchissimo!');
    setTimeout(() => toast('🪓 Gli alberi 🪵 e i sassi 🪨 danno risorse: cerca il pulsante azione!'), 3000);
    setTimeout(() => toast('🧰 Apri Craft per creare attrezzi · 🤝 il Mercante scambia con l’Oro 💰'), 6000);
  }
  /* boot() prima di save(): il save scrive lastSave, e se avvenisse prima
     la ricompensa offline leggerebbe una finestra di zero secondi. */
  boot();
  save(true);
  syncMuteBtn();
});

syncMuteBtn();

/* ── Handle di test ──────────────────────────────────────
   Non serve al gioco: serve ai test, che altrimenti non
   avrebbero modo di pilotare lo stato. È un gioco single-player
   offline, non c'è nulla da proteggere, ma teniamolo in fondo
   e dichiarato. */
window.__gemmondo = {
  get state() { return state; },
  get booted() { return booted; },
  get frames() { return frames; },
  get quality() { return quality; },
  get gems() { return gems.length; },
  get nodes() { return nodes.length; },
  get drones() { return drones.length; },
  get combo() { return combo; },
  context: () => context,
  upgradeIds: () => UPGRADES.map((u) => u.id),
  setQuality,
  fps: currentFps,
  renderOnce: () => { if (quality.level >= 1) composer.render(); else renderer.render(scene, camera); },
  gemsList: () => gems,
  nodesList: () => nodes,
  hasComposer: () => !!composer,
  scene,
  sky: skyDome,
  player, camera, renderer,
  harvestNode, craft, sellResource, buyResource, exchangeEnergy,
  enterZone, doPrestige, computeContext, doAction,
  save: () => doSave(),
  /* Sospende l'autosave: i test che sabotano il salvataggio devono
     poterlo fare senza che il beforeunload lo riscriva. */
  pauseAutosave: (v = true) => { autosavePaused = !!v; },
  /* Avanza la simulazione senza disegnare: i test non possono dipendere
     dalla GPU (su swiftshader il rendering è lentissimo e i frame pochi). */
  step: (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) simulate(dt); },
  addEnergy: (n) => { state.energy += n; markDirty('energy'); },
  setZone: (i) => { state.unlockedZone = Math.max(state.unlockedZone, i); enterZone(i); },
};