/* ============================================================
   GEMMONDO — Raccolta Incrementale 3D (folle, geniale, simpatico)
   Muovi Cubetto, raccogli gemme, potenzia i droni, sblocca
   7 dimensioni e fai esplodere l'universo per le Stelle.
   ============================================================ */
(() => {
  'use strict';

  /* ------------------------------------------------------------
     1. UTILITÀ
  ------------------------------------------------------------ */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) {
      if (n < 10 && n % 1 !== 0) return n.toFixed(1);
      return Math.floor(n).toString();
    }
    let tier = Math.floor(Math.log10(n) / 3);
    if (tier >= UNITS.length) tier = UNITS.length - 1;
    const scaled = n / Math.pow(10, tier * 3);
    const dec = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return scaled.toFixed(dec) + UNITS[tier];
  }

  /* ------------------------------------------------------------
     2. DATI DI GIOCO — Zone (biomi) e Potenziamenti
  ------------------------------------------------------------ */
  const ZONES = [
    {
      name: 'Prato Felice', tagline: 'Dove le gemme crescono sugli alberi. Quasi.',
      unlock: 0, base: 1, gem: 0x46f06a, ground: 0x4f9e5a, sky: 0x8fd8ff, fog: 0x9ad8e8,
      sun: 0xfff4d6, hemiSky: 0xbfe8ff, hemiGround: 0x3c9d55, decor: ['tree', 'flower', 'rock'],
      radius: 50,
    },
    {
      name: 'Deserto Scintillante', tagline: 'Caldo, ma con stile.',
      unlock: 250, base: 6, gem: 0xffb84d, ground: 0xe0bd6f, sky: 0xffd9a0, fog: 0xf2cf92,
      sun: 0xffe0b0, hemiSky: 0xffe9c2, hemiGround: 0xc9974a, decor: ['cactus', 'rock', 'crystal'],
      radius: 54,
    },
    {
      name: 'Caverna di Cristallo', tagline: 'Sotto terra c’è il tesoro. E un po’ di muffa.',
      unlock: 2500, base: 25, gem: 0xc46bff, ground: 0x3a2f5c, sky: 0x120c2e, fog: 0x170f38,
      sun: 0x9f8bff, hemiSky: 0x7a63c9, hemiGround: 0x241a45, decor: ['crystal', 'rock', 'spike'],
      radius: 56,
    },
    {
      name: 'Oceano al Neon', tagline: 'Atlantide, ma con le luci LED.',
      unlock: 25000, base: 120, gem: 0x00e5ff, ground: 0x123a66, sky: 0x081e3d, fog: 0x0a2144,
      sun: 0x00e5ff, hemiSky: 0x3fd4ff, hemiGround: 0x0a2440, decor: ['coral', 'coral', 'rock'],
      radius: 58,
    },
    {
      name: 'Vulcano Fiamma', tagline: 'Non toccare la lava. Ovviamente.',
      unlock: 400000, base: 700, gem: 0xff5a3c, ground: 0x3d1c14, sky: 0x1a0a06, fog: 0x2a0e08,
      sun: 0xff7a3c, hemiSky: 0xff7a5a, hemiGround: 0x1a0a06, decor: ['rock', 'rock', 'spike', 'crystal'],
      radius: 60,
    },
    {
      name: 'Spazio Profondo', tagline: 'Nessuno può sentirti raccogliere.',
      unlock: 8000000, base: 6000, gem: 0xffffff, ground: 0x0b0b14, sky: 0x000008, fog: 0x0b0b14,
      sun: 0xcfe6ff, hemiSky: 0x3a4a7a, hemiGround: 0x08080f, decor: ['asteroid', 'asteroid', 'rock'],
      radius: 64,
    },
    {
      name: 'Dimensione Folle', tagline: 'Qui la fisica si è presa una pausa caffè.',
      unlock: 150000000, base: 50000, gem: 0xff00ff, ground: 0x2a0f3a, sky: 0x1a0a2e, fog: 0x200a36,
      sun: 0xffffff, hemiSky: 0xff5e9c, hemiGround: 0x12041f, decor: ['crystal', 'tree', 'coral', 'asteroid', 'spike'],
      radius: 68,
    },
  ];

  const UPGRADES = [
    { id: 'speed',  name: 'Scarpe Razzo',      icon: '👟', base: 10,   mult: 1.35, desc: (v) => `Cubetto corre ×${v.toFixed(2)}` },
    { id: 'radius', name: 'Braccia Lunghe',    icon: '🫸', base: 25,   mult: 1.4,  desc: (v) => `Raggio di raccolta ${v.toFixed(1)}m` },
    { id: 'magnet', name: 'Magnete Cosmico',   icon: '🧲', base: 80,   mult: 1.45, desc: (v) => `Attira gemme entro ${v.toFixed(1)}m` },
    { id: 'value',  name: 'Taglia Gemme',      icon: '💎', base: 50,   mult: 1.6,  desc: (v) => `Valore gemma ×${fmt(v)}` },
    { id: 'spawn',  name: 'Fertilità',         icon: '🌱', base: 120,  mult: 1.5,  desc: (v) => `Massimo ${v} gemme nel mondo` },
    { id: 'drone',  name: 'Droni Raccoglitori',icon: '🛸', base: 300,  mult: 1.7,  desc: (v) => `+${v} droni (reddito passivo)` },
    { id: 'luck',   name: 'Fortuna Sfacciata', icon: '🍀', base: 500,  mult: 1.6,  desc: (v) => `${(v * 100).toFixed(0)}% gemme d’oro (×12)` },
  ];

  function upgradeValue(id, lvl) {
    switch (id) {
      case 'speed':  return 1 + lvl * 0.18;
      case 'radius': return 1.6 + lvl * 0.3;
      case 'magnet': return 3 + lvl * 1.2;
      case 'value':  return Math.pow(1.6, lvl);
      case 'spawn':  return 8 + lvl * 3;
      case 'drone':  return lvl;
      case 'luck':   return Math.min(0.03 + lvl * 0.03, 0.6);
      default: return 1;
    }
  }
  function upgradeCost(id, lvl) {
    const u = UPGRADES.find((x) => x.id === id);
    return Math.floor(u.base * Math.pow(u.mult, lvl));
  }

  /* --- Risorse raccoglibili / craftate --- */
  const RESOURCES = {
    legno:       { name: 'Legno',       icon: '🪵', color: '#c98a4b' },
    pietra:      { name: 'Pietra',      icon: '🪨', color: '#9aa0a8' },
    tavole:      { name: 'Tavole',      icon: '📦', color: '#d9a05b' },
    mattoni:     { name: 'Mattoni',     icon: '🧱', color: '#c66b5a' },
    ingranaggio: { name: 'Ingranaggi',  icon: '⚙️', color: '#d8d8e8' },
    cristallo:   { name: 'Cristallo',   icon: '🔮', color: '#8f7bff' },
    oro:         { name: 'Oro',         icon: '💰', color: '#ffd54f' },
  };

  /* --- Attrezzi --- */
  const TOOL_NAMES = { axe: { name: 'Ascia', icon: '🪓' }, pick: { name: 'Piccone', icon: '⛏️' } };
  const TOOL_LEVELS = { axe: 3, pick: 3 };
  function toolStats(kind) {
    const lvl = Math.min(state.tools[kind] || 0, TOOL_LEVELS[kind]);
    if (kind === 'axe') return { yield: [1, 3, 8, 20][lvl] ?? 1, interval: [2.2, 1.4, 0.9, 0.55][lvl] ?? 2.2 };
    return { yield: [1, 2, 5, 12][lvl] ?? 1, interval: [2.2, 1.5, 1.0, 0.6][lvl] ?? 2.2 };
  }
  function toolLabel(kind) {
    const lvl = state.tools[kind] || 0;
    return lvl === 0 ? '✋ Mani Nude' : `${TOOL_NAMES[kind].icon} ${TOOL_NAMES[kind].name} Lv${lvl}`;
  }

  /* --- Ricette di crafting --- */
  const RECIPES = [
    { id: 'tavole',      name: 'Tavole',           icon: '📦', out: { tavole: 1 },          cost: { legno: 3 },                            desc: 'Legno segato con molta fatica' },
    { id: 'mattoni',     name: 'Mattoni',          icon: '🧱', out: { mattoni: 1 },         cost: { pietra: 3 },                           desc: 'Pietra cotta con molta rabbia' },
    { id: 'axe1',        name: 'Ascia di Pietra',  icon: '🪓', out: { tool: 'axe', lvl: 1 }, cost: { legno: 3, pietra: 2 },                 desc: 'Per tagliare gli ALBERI come si deve' },
    { id: 'pick1',       name: 'Piccone di Legno', icon: '⛏️', out: { tool: 'pick', lvl: 1 }, cost: { legno: 4, pietra: 3 },                desc: 'Per spaccare i SASSI come si deve' },
    { id: 'ingranaggio', name: 'Ingranaggio',      icon: '⚙️', out: { ingranaggio: 1 },     cost: { tavole: 2, mattoni: 2, energia: 50 },  desc: 'Meccanica da quattro soldi', zone: 1 },
    { id: 'axe2',        name: 'Ascia Rinforzata', icon: '🪓', out: { tool: 'axe', lvl: 2 }, cost: { tavole: 10, mattoni: 5, legno: 20 },   desc: 'Taglia come un forsennato', needTool: 'axe', needLvl: 1 },
    { id: 'pick2',       name: 'Piccone Rinforzato', icon: '⛏️', out: { tool: 'pick', lvl: 2 }, cost: { tavole: 8, mattoni: 8, pietra: 25 }, desc: 'Spacca come un tritacarne', needTool: 'pick', needLvl: 1 },
    { id: 'axe3',        name: 'Ascia del Multiverso', icon: '🪓', out: { tool: 'axe', lvl: 3 }, cost: { ingranaggio: 4, cristallo: 10, tavole: 25 }, desc: 'Il bosco piange al solo vederla', needTool: 'axe', needLvl: 2 },
    { id: 'pick3',       name: 'Piccone Stellare', icon: '⛏️', out: { tool: 'pick', lvl: 3 }, cost: { ingranaggio: 4, cristallo: 12, mattoni: 30 }, desc: 'Scava fino al cuore delle stelle', needTool: 'pick', needLvl: 2 },
  ];

  /* --- Prezzi del mercante (base, per unità) --- */
  const PRICES = {
    legno:       { sell: 2, buy: 3 },
    pietra:      { sell: 2, buy: 3 },
    tavole:      { sell: 8, buy: 12 },
    mattoni:     { sell: 8, buy: 12 },
    ingranaggio: { sell: 40, buy: 60 },
    cristallo:   { sell: 60, buy: 90 },
  };
  const EXCHANGE = { sell: 25, buy: 40 }; // 100 Energia ↔ Oro

  /* ------------------------------------------------------------
     3. STATO + SALVATAGGIO
  ------------------------------------------------------------ */
  const SAVE_KEY = 'gemmondo_save_v1';
  const DEFAULT_STATE = {
    energy: 0,
    totalEarned: 0,
    gemsCollected: 0,
    zone: 0,
    unlockedZone: 0,
    stars: 0,
    upgrades: {},
    resources: {},
    tools: { axe: 0, pick: 0 },
    lastSave: Date.now(),
    started: false,
  };

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const s = JSON.parse(raw);
      const merged = { ...DEFAULT_STATE, ...s };
      merged.upgrades = merged.upgrades || {};
      merged.resources = merged.resources || {};
      merged.tools = merged.tools || { axe: 0, pick: 0 };
      return merged;
    } catch (e) {
      return { ...DEFAULT_STATE };
    }
  }
  function save() {
    state.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Reddito passivo (per secondo)
  function droneRate() {
    return upgradeValue('drone', (state.upgrades.drone || 0)) * 0.35;
  }
  function currentGemValue() {
    const z = ZONES[state.zone];
    return z.base * upgradeValue('value', (state.upgrades.value || 0));
  }
  function starMult() {
    return 1 + state.stars * 0.1;
  }
  function incomePerSec() {
    return droneRate() * currentGemValue() * starMult();
  }

  /* ------------------------------------------------------------
     4. RIFERIMENTI DOM
  ------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const elEnergy = $('energy');
  const elPerSec = $('per-sec');
  const elGems = $('gems');
  const elStars = $('stars');
  const elZoneName = $('zone-name');
  const elHint = $('hint');
  const elToasts = $('toasts');
  const elFloaters = $('floaters');
  const elOverlay = $('overlay');
  const elPanelTitle = $('panel-title');
  const elPanelEnergy = $('panel-energy');
  const elTabShop = $('tab-shop');
  const elTabZones = $('tab-zones');
  const elTabCraft = $('tab-craft');
  const elTabMerchant = $('tab-merchant');
  const elTabPrestige = $('tab-prestige');
  const elSplash = $('splash');
  const elJoyBase = $('joy-base');
  const elJoyStick = $('joy-stick');
  const elJoyZone = $('joy-zone');
  const elResBar = $('res-bar');
  const elActionBtn = $('action-btn');
  const elBtnCraft = $('btn-craft');
  const elBtnMerchant = $('btn-merchant');

  /* ------------------------------------------------------------
     5. THREE.JS — SCENA
  ------------------------------------------------------------ */
  const container = $('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 400);
  camera.position.set(0, 18, 14);

  // Luci
  const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x3c9d55, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
  sun.position.set(18, 32, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Terreno
  const groundGeo = new THREE.CircleGeometry(90, 48);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4f9e5a, roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Stelle (per Spazio / Dimensione Folle)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 600; i++) {
    const r = rand(60, 160);
    const th = rand(0, Math.PI * 2);
    const y = rand(4, 90);
    starPos.push(Math.cos(th) * r, y, Math.sin(th) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.9 });
  starMat.fog = false; // le stelle ignorano la nebbia
  const starField = new THREE.Points(starGeo, starMat);
  starField.visible = false;
  scene.add(starField);

  /* --- Giocatore: Cubetto --- */
  const player = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.55, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), bodyMat);
  body.castShadow = true;
  body.position.y = 0.6;
  player.add(body);

  const eyeGeo = new THREE.SphereGeometry(0.14, 12, 12);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilGeo = new THREE.SphereGeometry(0.07, 10, 10);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const eyes = new THREE.Group();
  for (const sx of [-0.26, 0.26]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx, 0.88, -0.58);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(sx, 0.88, -0.69);
    eyes.add(eye); eyes.add(pupil);
  }
  player.add(eyes);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x5b3a1a })
  );
  mouth.position.set(0, 0.55, -0.58);
  player.add(mouth);

  // antenna con gemma luminosa
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 })
  );
  antenna.position.set(0, 1.35, 0);
  player.add(antenna);
  const antennaGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.4 })
  );
  antennaGem.position.set(0, 1.62, 0);
  player.add(antennaGem);

  player.position.set(0, 0, 0);
  scene.add(player);

  /* --- Portale (centro del mondo) --- */
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

  /* --- Gemme / decorazioni / droni / particelle --- */
  const gems = [];
  const decorGroup = new THREE.Group();
  scene.add(decorGroup);
  const droneGroup = new THREE.Group();
  scene.add(droneGroup);
  const drones = [];

  const gemGeo = new THREE.OctahedronGeometry(0.45);
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
    return t;
  })();
  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture, color: 0xffffff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });

  const gemMats = {}; // cache materiale per zona
  function gemMatFor(zoneIdx) {
    if (!gemMats[zoneIdx]) {
      const c = new THREE.Color(ZONES[zoneIdx].gem);
      gemMats[zoneIdx] = new THREE.MeshStandardMaterial({
        color: c.clone().multiplyScalar(0.4), emissive: c, emissiveIntensity: 1.1,
        roughness: 0.2, metalness: 0.1,
      });
    }
    return gemMats[zoneIdx];
  }
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a00, emissive: 0xffd54f, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.3,
  });

  function spawnGem() {
    const z = ZONES[state.zone];
    let x, zz, tries = 0;
    do {
      const a = rand(0, Math.PI * 2);
      const r = rand(3, z.radius - 3);
      x = Math.cos(a) * r;
      zz = Math.sin(a) * r;
      tries++;
    } while (tries < 20 && dist2D(x, zz, player.position.x, player.position.z) < 6);

    const golden = Math.random() < upgradeValue('luck', state.upgrades.luck || 0);
    const mat = golden ? goldMat : gemMatFor(state.zone);
    const mesh = new THREE.Mesh(gemGeo, mat);
    mesh.position.set(x, rand(0.6, 1.2), zz);
    mesh.castShadow = true;
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(golden ? 2.6 : 1.8);
    mesh.add(glow);
    mesh.scale.setScalar(golden ? 1.5 : 1);
    scene.add(mesh);
    gems.push({
      mesh, golden,
      baseY: mesh.position.y,
      phase: rand(0, Math.PI * 2),
      value: (golden ? 12 : 1) * currentGemValue() * starMult(),
    });
  }

  function clearGems() {
    for (const g of gems) scene.remove(g.mesh);
    gems.length = 0;
  }

  /* --- Particelle --- */
  const PARTICLE_COUNT = 120;
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
  function burst(pos, color, count) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const p = particles[partCursor];
      partCursor = (partCursor + 1) % particles.length;
      p.active = true;
      p.life = p.maxLife = rand(0.35, 0.6);
      p.mesh.position.copy(pos);
      p.mesh.visible = true;
      p.mat.color.copy(c);
      p.mat.opacity = 1;
      const a = rand(0, Math.PI * 2);
      const e = rand(0.3, Math.PI * 0.5);
      const sp = rand(2, 5.5);
      p.vel.set(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.5, Math.sin(a) * Math.cos(e) * sp);
    }
  }

  /* --- Decorazioni --- */
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
  function makeDecor(kind) {
    const g = new THREE.Group();
    const mat = (hex, rough = 0.8) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, flatShading: true });
    switch (kind) {
      case 'tree': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), mat(0x6b4a2a));
        trunk.position.y = 0.6; trunk.castShadow = true;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 8), mat(0x2e9e4f));
        leaf.position.y = 1.7; leaf.castShadow = true;
        g.add(trunk, leaf);
        break;
      }
      case 'flower': {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat(0x3c9d55));
        stem.position.y = 0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat(choice([0xff5e9c, 0xffd54f, 0x00d4ff])));
        head.position.y = 0.72;
        g.add(stem, head);
        break;
      }
      case 'rock': {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.1), 0), mat(0x8a8a92));
        r.position.y = 0.4; r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); r.castShadow = true;
        g.add(r);
        break;
      }
      case 'crystal': {
        const c = new THREE.Mesh(
          new THREE.OctahedronGeometry(rand(0.5, 0.9)),
          new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 0.7, roughness: 0.2 })
        );
        c.position.y = rand(0.5, 1.2); c.rotation.y = rand(0, 3); c.castShadow = true;
        g.add(c);
        break;
      }
      case 'spike': {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.25, rand(1, 1.8), 6), mat(0x3a3a44));
        s.position.y = rand(0.5, 0.9); s.castShadow = true;
        g.add(s);
        break;
      }
      case 'cactus': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.4, 7), mat(0x2e9e4f));
        trunk.position.y = 0.7; trunk.castShadow = true;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 7), mat(0x2e9e4f));
        arm.position.set(0.3, 0.9, 0); arm.rotation.z = Math.PI / 2; arm.castShadow = true;
        g.add(trunk, arm);
        break;
      }
      case 'coral': {
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, rand(0.8, 1.5), 6), mat(choice([0xff5e9c, 0x00e5ff, 0xffd54f])));
        c1.position.y = 0.6; c1.castShadow = true;
        const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, rand(0.6, 1.1), 6), mat(0xff5e9c));
        c2.position.set(0.25, 0.5, 0.1); c2.castShadow = true;
        g.add(c1, c2);
        break;
      }
      case 'asteroid': {
        const a = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.6, 1.3), 0), mat(0x6a6a76));
        a.position.y = rand(0.6, 1.4); a.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); a.castShadow = true;
        g.add(a);
        break;
      }
    }
    return g;
  }

  function buildDecor() {
    for (const c of decorGroup.children) disposeGroup(c);
    while (decorGroup.children.length) decorGroup.remove(decorGroup.children[0]);
    const z = ZONES[state.zone];
    const count = 26 + (z.decor.length ? 12 : 0);
    for (let i = 0; i < count; i++) {
      const kind = choice(z.decor);
      const d = makeDecor(kind);
      const a = rand(0, Math.PI * 2);
      const r = rand(6, z.radius - 2);
      d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      d.rotation.y = rand(0, Math.PI * 2);
      decorGroup.add(d);
    }
  }

  /* --- Droni --- */
  const droneBodyGeo = new THREE.OctahedronGeometry(0.34);
  function makeDroneMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7b2fff, emissive: 0x00d4ff, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4,
    });
    const b = new THREE.Mesh(droneBodyGeo, mat);
    b.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2 })
    );
    ring.rotation.x = Math.PI / 2;
    g.add(b, ring);
    g.userData = { angle: rand(0, Math.PI * 2), phase: rand(0, Math.PI * 2) };
    return g;
  }
  function syncDrones() {
    const want = upgradeValue('drone', state.upgrades.drone || 0);
    while (drones.length < want) {
      const m = makeDroneMesh();
      droneGroup.add(m);
      drones.push(m);
    }
    while (drones.length > want) {
      const m = drones.pop();
      droneGroup.remove(m);
    }
  }

  /* ------------------------------------------------------------
     5bis. RISORSE NEL MONDO — Nodi raccoglibili + Mercante
  ------------------------------------------------------------ */
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  const nodes = [];
  const MERCHANT_POS = [14, 0, 10];

  const emojiTexCache = {};
  function emojiSprite(ch, scale) {
    if (!emojiTexCache[ch]) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.font = '84px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 64, 66);
      emojiTexCache[ch] = new THREE.CanvasTexture(c);
    }
    const m = new THREE.SpriteMaterial({ map: emojiTexCache[ch], transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(scale);
    return s;
  }

  function addResource(id, n) {
    state.resources[id] = (state.resources[id] || 0) + n;
  }

  /* --- Nodi: alberi / sassi / cristalli --- */
  function makeNodeMesh(type) {
    const g = new THREE.Group();
    if (type === 'tree') {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 2.5, 7),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 })
      );
      trunk.position.y = 1.25; trunk.castShadow = true;
      const l1 = new THREE.Mesh(
        new THREE.ConeGeometry(1.25, 2.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e9e4f, roughness: 0.9, flatShading: true })
      );
      l1.position.y = 3.0; l1.castShadow = true;
      const l2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x3fae5c, roughness: 0.9, flatShading: true })
      );
      l2.position.y = 4.0; l2.castShadow = true;
      g.add(trunk, l1, l2);
    } else if (type === 'rock') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.95, flatShading: true });
      const r1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), mat);
      r1.position.y = 0.8; r1.castShadow = true;
      const r2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), mat);
      r2.position.set(0.9, 0.55, 0.35);
      g.add(r1, r2);
    } else { // cristallo
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 0.8, roughness: 0.2,
      });
      const c1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.85), mat);
      c1.position.y = 1.05; c1.rotation.y = 0.5; c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mat);
      c2.position.set(0.75, 0.75, 0.3); c2.rotation.y = -0.4;
      const c3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), mat);
      c3.position.set(-0.65, 0.55, -0.4);
      g.add(c1, c2, c3);
    }
    return g;
  }

  function makeNode(type) {
    const mesh = makeNodeMesh(type);
    const resource = type === 'tree' ? 'legno' : type === 'rock' ? 'pietra' : 'cristallo';
    const sprite = emojiSprite(RESOURCES[resource].icon, type === 'tree' ? 1.8 : type === 'rock' ? 1.5 : 1.7);
    sprite.position.y = type === 'tree' ? 4.9 : type === 'rock' ? 2.7 : 3.1;
    mesh.add(sprite);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.55, 28),
      new THREE.MeshBasicMaterial({
        color: RESOURCES[resource].color, transparent: true, opacity: 0.35,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.renderOrder = 2;
    mesh.add(ring);
    return {
      type, resource, mesh, sprite, ring,
      hits: 4, maxHits: 4,
      cooldownUntil: 0, respawnUntil: 0, depleted: false, shake: 0,
      scale: 1, respawnTime: type === 'tree' ? 30000 : type === 'rock' ? 26000 : 20000,
    };
  }

  function buildNodes() {
    for (const n of nodes) { disposeGroup(n.mesh); nodeGroup.remove(n.mesh); }
    nodes.length = 0;
    const z = ZONES[state.zone];
    const counts = { tree: 5, rock: 5, crystal: state.zone >= 2 ? 3 : 0 };
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

  function harvestNode(node) {
    const now = performance.now();
    if (node.depleted) return;
    if (now < node.cooldownUntil) { toast('⏳ Ancora un momento...'); return; }
    const isTree = node.type === 'tree';
    const kind = isTree ? 'axe' : 'pick';
    const lvl = state.tools[kind] || 0;
    const stats = toolStats(kind);
    if (lvl === 0 && Math.random() < 0.3) {
      toast(choice(['✋ Mani nude! Meglio un attrezzo...', '💪 Con le mani è dura... crafta 🪓 o ⛏️ nel 🧰 Craft', '😅 Le mani nude rendono poco. Molto poco.']));
    }
    let amount = node.type === 'crystal' ? Math.max(1, Math.round(stats.yield * 0.6)) : stats.yield;
    addResource(node.resource, amount);
    if (node.type === 'rock' && lvl >= 2 && Math.random() < 0.22) {
      addResource('cristallo', 1);
      toast('🔮 Un cristallo è spuntato dalla roccia!');
    }
    node.hits--;
    node.cooldownUntil = now + stats.interval * 1000;
    node.shake = 1;

    const pos = node.mesh.position.clone(); pos.y = 1.5;
    burst(pos, RESOURCES[node.resource].color, 8);
    floater(pos, `+${amount} ${RESOURCES[node.resource].icon}`, RESOURCES[node.resource].color);

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
    save(); updateHUD();
  }

  /* --- Mercante (Sgobbo) --- */
  let merchantGroup = null;
  function buildMerchant() {
    if (merchantGroup) { disposeGroup(merchantGroup); scene.remove(merchantGroup); }
    const g = new THREE.Group();
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.7, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 })
    );
    table.position.y = 0.35; table.castShadow = true; table.receiveShadow = true;
    g.add(table);
    const boxMerch = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5a2fff, emissiveIntensity: 0.7 })
    );
    boxMerch.position.set(0.6, 0.86, 0.35); g.add(boxMerch);
    const boxWood = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.32, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.9 })
    );
    boxWood.position.set(-0.55, 0.8, -0.25); g.add(boxWood);

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a2a12 });
    for (const [px, pz] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) {
      const p = new THREE.Mesh(poleGeo, poleMat);
      p.position.set(px, 1.15, pz);
      g.add(p);
    }
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x7b2fff })
    );
    roof.position.y = 2.35; g.add(roof);

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.6 })
    );
    body.position.set(1.7, 1.0, 0); body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xffc79a, roughness: 0.7 })
    );
    head.position.set(1.7, 1.7, 0);
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xff5e9c })
    );
    hat.position.set(1.7, 2.12, 0);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const sx of [1.56, 1.84]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
      e.position.set(sx, 1.76, 0.27);
      g.add(e);
    }
    g.add(body, head, hat);
    const spr = emojiSprite('🤝', 1.9);
    spr.position.set(1.7, 2.9, 0);
    g.add(spr);

    g.position.set(MERCHANT_POS[0], 0, MERCHANT_POS[2]);
    g.rotation.y = Math.atan2(-MERCHANT_POS[0], -MERCHANT_POS[2]);
    scene.add(g);
    merchantGroup = g;
  }

  /* --- Azione contestuale --- */
  let context = null;
  let lastCtxKey = null;
  function computeContext() {
    const now = performance.now();
    context = null;
    let bestD = 2.9, bestNode = null;
    for (const n of nodes) {
      if (n.depleted || now < n.cooldownUntil) continue;
      const d = dist2D(n.mesh.position.x, n.mesh.position.z, player.position.x, player.position.z);
      if (d < bestD) { bestD = d; bestNode = n; }
    }
    if (bestNode) { context = { kind: 'node', node: bestNode }; return; }
    if (merchantGroup) {
      const d = dist2D(merchantGroup.position.x, merchantGroup.position.z, player.position.x, player.position.z);
      if (d < 3.6) { context = { kind: 'merchant' }; return; }
    }
    if (dist2D(player.position.x, player.position.z, 0, 0) < 5) context = { kind: 'portal' };
  }
  function doAction() {
    if (!context) return;
    if (context.kind === 'node') harvestNode(context.node);
    else if (context.kind === 'merchant') openPanel('merchant');
    else openPanel('zones');
  }
  function updateActionBtn() {
    if (!context) {
      elActionBtn.classList.add('hidden');
      lastCtxKey = null;
      return;
    }
    let key = context.kind;
    let label = '';
    if (context.kind === 'node') {
      key = 'node:' + context.node.type;
      label = context.node.type === 'tree' ? '🪓 Taglia' : context.node.type === 'rock' ? '⛏️ Mina' : '🔮 Estrai';
    } else if (context.kind === 'merchant') label = '🤝 Parla';
    else label = '🌀 Zone';
    if (key !== lastCtxKey) {
      elActionBtn.innerHTML = label;
      lastCtxKey = key;
    }
    elActionBtn.classList.remove('hidden');
  }

  /* ------------------------------------------------------------
     6. CAMBIO ZONA
  ------------------------------------------------------------ */
  function enterZone(idx) {
    state.zone = idx;
    const z = ZONES[idx];
    groundMat.color.set(z.ground);
    scene.fog = new THREE.Fog(z.fog, 40, 140);
    renderer.setClearColor(z.sky);
    hemi.color.set(z.hemiSky);
    hemi.groundColor.set(z.hemiGround);
    sun.color.set(z.sun);
    if (idx >= 4) { hemi.intensity = 0.55; sun.intensity = 1.0; }
    else { hemi.intensity = 0.9; sun.intensity = 1.1; }
    starField.visible = idx >= 5;
    portalRing.material.color.set(z.gem);
    portalRing.material.emissive.set(z.gem);

    player.position.set(0, 0, 0);
    camera.position.set(0, 18, 14);
    buildDecor();
    buildNodes();
    buildMerchant();
    clearGems();
    for (let i = 0; i < 6; i++) spawnGem();

    elZoneName.textContent = z.name;
    toast(`${z.name} — ${z.tagline}`);
    renderShop(); renderZones(); updateHUD();
  }

  /* ------------------------------------------------------------
     7. INPUT
  ------------------------------------------------------------ */
  const keys = {};
  const joyInput = { x: 0, y: 0 };
  let joyActive = false;

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE') { if (context) doAction(); else openZones(); }
    if (e.code === 'KeyB') { openShop(); }
    if (e.code === 'KeyC') { openPanel('craft'); }
    if (e.code === 'KeyM') { openPanel('merchant'); }
    if (e.code === 'Escape') { closePanel(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Joystick
  const joyRadius = 44;
  function setJoy(e) {
    const rect = elJoyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > joyRadius) { dx = dx / len * joyRadius; dy = dy / len * joyRadius; }
    elJoyStick.style.transform = `translate(${dx}px, ${dy}px)`;
    joyInput.x = dx / joyRadius;
    joyInput.y = dy / joyRadius;
  }
  elJoyBase.addEventListener('pointerdown', (e) => {
    elJoyBase.setPointerCapture(e.pointerId);
    joyActive = true; setJoy(e);
  });
  elJoyBase.addEventListener('pointermove', (e) => { if (joyActive) setJoy(e); });
  function resetJoy(e) {
    joyActive = false; joyInput.x = 0; joyInput.y = 0;
    elJoyStick.style.transform = 'translate(0,0)';
  }
  elJoyBase.addEventListener('pointerup', resetJoy);
  elJoyBase.addEventListener('pointercancel', resetJoy);

  function movementVector() {
    let x = 0, z = 0;
    if (keys['KeyW'] || keys['ArrowUp']) z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) x += 1;
    // joystick: su = avanti (-z), destra = +x
    x += joyInput.x;
    z += joyInput.y;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z, len: Math.min(1, len) };
  }

  /* ------------------------------------------------------------
     8. RACCOLTA
  ------------------------------------------------------------ */
  function collect(g) {
    scene.remove(g.mesh);
    const idx = gems.indexOf(g);
    if (idx >= 0) gems.splice(idx, 1);
    const val = g.value;
    state.energy += val;
    state.totalEarned += val;
    state.gemsCollected++;
    burst(g.mesh.position, g.golden ? 0xffd54f : ZONES[state.zone].gem, g.golden ? 14 : 7);
    floater(g.mesh.position, `+${fmt(val)}`, g.golden ? '#ffd54f' : '#9ff5b0');
    if (g.golden) toast(choice(['💛 GEMMA D’ORO! Che colpo di fortuna!', '🌟 Oro puro! Cubetto non ci crede.', '🍀 La Fortuna ti sorride, eccome!']));
    if (state.gemsCollected > 0 && state.gemsCollected % 50 === 0) {
      toast(`🎉 ${state.gemsCollected} gemme raccolte! Cubetto è orgoglioso di te.`);
    }
    updateHUD();
  }

  /* ------------------------------------------------------------
     9. UI — HUD, Pannello, Toast, Floater
  ------------------------------------------------------------ */
  function updateHUD() {
    elEnergy.textContent = fmt(state.energy);
    elPerSec.textContent = `+${fmt(incomePerSec())}/s`;
    elGems.textContent = fmt(state.gemsCollected);
    elStars.textContent = fmt(state.stars);
    elPanelEnergy.textContent = fmt(state.energy);
    updateResourceBar();
    if (currentTab === 'craft') renderCraft();
    if (currentTab === 'merchant') renderMerchant();
  }

  function updateResourceBar() {
    elResBar.innerHTML = '';
    for (const [id, r] of Object.entries(RESOURCES)) {
      const span = document.createElement('span');
      span.className = 'res-item';
      span.title = r.name;
      span.innerHTML = `${r.icon} <b>${fmt(state.resources[id] || 0)}</b>`;
      elResBar.appendChild(span);
    }
  }

  function toast(msg) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    elToasts.appendChild(div);
    while (elToasts.children.length > 4) elToasts.removeChild(elToasts.firstChild);
    setTimeout(() => { if (div.parentNode) div.remove(); }, 3700);
  }

  function floater(worldPos, text, color) {
    const v = worldPos.clone().project(camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    elFloaters.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 950);
  }

  /* --- Pannello --- */
  let currentTab = 'shop';
  function openPanel(tab) {
    elOverlay.classList.remove('hidden');
    setTab(tab || 'shop');
  }
  function closePanel() { elOverlay.classList.add('hidden'); }
  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    elTabShop.classList.toggle('hidden', tab !== 'shop');
    elTabZones.classList.toggle('hidden', tab !== 'zones');
    elTabCraft.classList.toggle('hidden', tab !== 'craft');
    elTabMerchant.classList.toggle('hidden', tab !== 'merchant');
    elTabPrestige.classList.toggle('hidden', tab !== 'prestige');
    elPanelTitle.textContent =
      tab === 'shop' ? 'Negozio' : tab === 'zones' ? 'Zone' : tab === 'craft' ? 'Craft' :
      tab === 'merchant' ? 'Mercante' : 'Rinascita';
    if (tab === 'shop') renderShop();
    if (tab === 'zones') renderZones();
    if (tab === 'craft') renderCraft();
    if (tab === 'merchant') renderMerchant();
    if (tab === 'prestige') renderPrestige();
  }
  function openShop() { openPanel('shop'); }
  function openZones() { openPanel('zones'); }

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
  $('btn-shop').addEventListener('click', openShop);
  $('btn-zones').addEventListener('click', openZones);
  $('btn-close').addEventListener('click', closePanel);
  elOverlay.addEventListener('click', (e) => { if (e.target === elOverlay) closePanel(); });
  elActionBtn.addEventListener('click', doAction);
  elBtnCraft.addEventListener('click', () => openPanel('craft'));
  elBtnMerchant.addEventListener('click', () => openPanel('merchant'));

  function renderShop() {
    elTabShop.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = state.upgrades[u.id] || 0;
      const val = upgradeValue(u.id, lvl);
      const cost = upgradeCost(u.id, lvl);
      const card = document.createElement('div');
      card.className = 'up-card';
      card.innerHTML = `
        <div class="up-icon">${u.icon}</div>
        <div class="up-info">
          <div class="up-name">${u.name}<span class="up-lvl">Lv ${lvl}</span></div>
          <div class="up-desc">${u.desc(val)}</div>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'up-buy';
      btn.textContent = `💠 ${fmt(cost)}`;
      btn.disabled = state.energy < cost;
      btn.addEventListener('click', () => buyUpgrade(u.id, cost));
      card.appendChild(btn);
      elTabShop.appendChild(card);
    }
  }

  function buyUpgrade(id, cost) {
    if (state.energy < cost) return;
    state.energy -= cost;
    state.upgrades[id] = (state.upgrades[id] || 0) + 1;
    if (id === 'drone') syncDrones();
    save();
    renderShop(); updateHUD();
    const u = UPGRADES.find((x) => x.id === id);
    toast(choice([
      `${u.icon} ${u.name} potenziato!`,
      `📈 ${u.name} sale di livello!`,
      `🔧 Cubetto ha migliorato ${u.name}.`,
    ]));
  }

  function renderZones() {
    elTabZones.innerHTML = '';
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i];
      const locked = i > state.unlockedZone;
      const isHere = i === state.zone;
      const canUnlock = i === state.unlockedZone + 1;
      const card = document.createElement('div');
      card.className = 'zone-card' + (locked ? ' locked' : '');
      card.innerHTML = `
        <div class="zone-swatch" style="background:radial-gradient(circle at 40% 30%, #${z.gem.toString(16).padStart(6, '0')}, #${z.sky.toString(16).padStart(6, '0')})"></div>
        <div class="zone-info">
          <div class="zone-name">${i === 0 ? '🏡 ' : ''}${z.name}</div>
          <div class="zone-tag">${z.tagline}</div>
          <div class="zone-meta">Valore gemma: <b>${fmt(z.base)}</b> · ${locked ? '🔒 Bloccata' : isHere ? '📍 Sei qui' : 'Sbloccata'}</div>
        </div>
      `;
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
      card.appendChild(btn);
      elTabZones.appendChild(card);
    }
  }

  function unlockZone(i) {
    const z = ZONES[i];
    if (state.energy < z.unlock) return;
    state.energy -= z.unlock;
    state.unlockedZone = i;
    save();
    renderZones(); updateHUD();
    toast(`🚪 Hai sbloccato ${z.name}! ${z.tagline}`);
    enterZone(i);
    closePanel();
  }

  /* --- Craft --- */
  function recipeUnlocked(r) {
    if (r.zone && state.unlockedZone < r.zone) return false;
    if (r.needTool && (state.tools[r.needTool] || 0) < r.needLvl) return false;
    return true;
  }
  function isRecipeDone(r) {
    if (r.out.tool) return (state.tools[r.out.tool] || 0) >= r.out.lvl;
    return false;
  }
  function canCraft(r) {
    if (!recipeUnlocked(r)) return false;
    if (r.out.tool && (state.tools[r.out.tool] || 0) !== r.out.lvl - 1) return false;
    for (const [id, n] of Object.entries(r.cost)) {
      const have = id === 'energia' ? state.energy : (state.resources[id] || 0);
      if (have < n) return false;
    }
    return true;
  }
  function craftRecipe(r) {
    if (!canCraft(r)) return;
    for (const [id, n] of Object.entries(r.cost)) {
      if (id === 'energia') state.energy -= n;
      else state.resources[id] = (state.resources[id] || 0) - n;
    }
    const p = player.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    if (r.out.tool) {
      state.tools[r.out.tool] = r.out.lvl;
      toast(`🛠️ ${r.name} creata! Ora raccogli molto di più!`);
      floater(p, `${r.icon} Nuovo attrezzo!`, '#9ff5b0');
    } else {
      for (const [id, n] of Object.entries(r.out)) {
        state.resources[id] = (state.resources[id] || 0) + n;
        floater(p, `${RESOURCES[id].icon} +${n}`, RESOURCES[id].color);
      }
      toast(`🔨 Craft: ${r.name}`);
    }
    save(); renderCraft(); updateHUD();
  }
  function renderCraft() {
    elTabCraft.innerHTML = '';
    const inv = document.createElement('div');
    inv.className = 'inv-grid';
    inv.innerHTML = Object.entries(RESOURCES).map(([id, r]) =>
      `<div class="inv-item" title="${r.name}"><span class="ic">${r.icon}</span><span class="n">${fmt(state.resources[id] || 0)}</span></div>`
    ).join('');
    elTabCraft.appendChild(inv);
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'mer-quote';
    toolsDiv.textContent = `Attrezzi attuali: ${toolLabel('axe')} · ${toolLabel('pick')}`;
    elTabCraft.appendChild(toolsDiv);

    for (const r of RECIPES) {
      const card = document.createElement('div');
      const unlocked = recipeUnlocked(r);
      const done = isRecipeDone(r);
      const can = canCraft(r);
      card.className = 'rec-card' + (unlocked ? '' : ' locked');
      const costHtml = Object.entries(r.cost).map(([id, n]) => {
        const icon = id === 'energia' ? '💠' : RESOURCES[id].icon;
        const have = id === 'energia' ? state.energy : (state.resources[id] || 0);
        return `<span class="${have >= n ? 'has' : 'no'}">${icon} ${fmt(n)}</span>`;
      }).join('');
      card.innerHTML = `
        <div class="rec-icon">${r.icon}</div>
        <div class="rec-info">
          <div class="rec-name">${r.name}</div>
          <div class="rec-desc">${r.desc}</div>
          <div class="rec-cost">${costHtml}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'rec-btn' + (done ? ' done' : '');
      if (done) btn.textContent = '✓ Fatto';
      else if (!unlocked) btn.textContent = '🔒 Bloccata';
      else { btn.textContent = '🔨 Craft'; btn.disabled = !can; }
      btn.addEventListener('click', () => craftRecipe(r));
      card.appendChild(btn);
      elTabCraft.appendChild(card);
    }
  }

  /* --- Mercante: compra / vendi / cambio --- */
  function sellResource(id, q, price) {
    if ((state.resources[id] || 0) < q) return;
    state.resources[id] -= q;
    const gold = q * price;
    addResource('oro', gold);
    toast(`💰 Venduti ${q} ${RESOURCES[id].icon} per ${fmt(gold)} Oro!`);
    save(); renderMerchant(); updateHUD();
  }
  function buyResource(id, q, price) {
    const total = price * q;
    if ((state.resources.oro || 0) < total) return;
    state.resources.oro -= total;
    addResource(id, q);
    toast(`🛍️ Comprati ${q} ${RESOURCES[id].icon}!`);
    save(); renderMerchant(); updateHUD();
  }
  function exchangeEnergy(toBuy) {
    if (toBuy) {
      if ((state.resources.oro || 0) < EXCHANGE.buy) return;
      state.resources.oro -= EXCHANGE.buy;
      state.energy += 100;
      toast('🔋 Comprati 100 💠 di Energia!');
    } else {
      if (state.energy < 100) return;
      state.energy -= 100;
      addResource('oro', EXCHANGE.sell);
      toast('💱 Venduti 100 💠 per 25 💰!');
    }
    save(); renderMerchant(); updateHUD();
  }
  function renderMerchant() {
    elTabMerchant.innerHTML = '';
    const borsa = document.createElement('div');
    borsa.className = 'mer-title';
    borsa.textContent = `💰 Borsa di Sgobbo: ${fmt(state.resources.oro || 0)} Oro`;
    elTabMerchant.appendChild(borsa);
    const quote = document.createElement('p');
    quote.className = 'mer-quote';
    quote.textContent = 'Sgobbo: "Tutto si compra, tutto si vende... tranne i sogni. Quelli sono gratis."';
    elTabMerchant.appendChild(quote);

    const zoneBonus = 1 + state.zone * 0.15;

    const tV = document.createElement('div');
    tV.className = 'mer-title'; tV.textContent = '💱 Vendi al mercante';
    elTabMerchant.appendChild(tV);
    for (const [id, p] of Object.entries(PRICES)) {
      const have = state.resources[id] || 0;
      const price = Math.floor(p.sell * zoneBonus);
      const row = document.createElement('div');
      row.className = 'mer-row';
      row.innerHTML = `
        <div class="mer-res">${RESOURCES[id].icon} ${RESOURCES[id].name} <span class="n">(hai ${fmt(have)})</span></div>
        <div class="mer-price">${price} 💰/u</div>`;
      const btns = document.createElement('div'); btns.className = 'mer-btns';
      for (const q of [1, 10]) {
        const b = document.createElement('button');
        b.className = 'mer-btn sell';
        b.textContent = q === 1 ? 'Vendi 1' : `Vendi ${q}`;
        b.disabled = have < q;
        b.addEventListener('click', () => sellResource(id, q, price));
        btns.appendChild(b);
      }
      row.appendChild(btns);
      elTabMerchant.appendChild(row);
    }

    const tC = document.createElement('div');
    tC.className = 'mer-title'; tC.textContent = '🛍️ Compra dal mercante';
    elTabMerchant.appendChild(tC);
    for (const [id, p] of Object.entries(PRICES)) {
      const gold = state.resources.oro || 0;
      const row = document.createElement('div');
      row.className = 'mer-row';
      row.innerHTML = `
        <div class="mer-res">${RESOURCES[id].icon} ${RESOURCES[id].name}</div>
        <div class="mer-price">${p.buy} 💰/u</div>`;
      const btns = document.createElement('div'); btns.className = 'mer-btns';
      for (const q of [1, 5]) {
        const b = document.createElement('button');
        b.className = 'mer-btn';
        b.textContent = q === 1 ? 'Compra 1' : `Compra ${q}`;
        b.disabled = gold < p.buy * q;
        b.addEventListener('click', () => buyResource(id, q, p.buy));
        btns.appendChild(b);
      }
      row.appendChild(btns);
      elTabMerchant.appendChild(row);
    }

    const tE = document.createElement('div');
    tE.className = 'mer-title'; tE.textContent = '🔁 Cambio Energia ↔ Oro';
    elTabMerchant.appendChild(tE);
    const rowE = document.createElement('div');
    rowE.className = 'mer-row';
    rowE.innerHTML = `<div class="mer-res">💠 Energia (hai ${fmt(state.energy)})</div>`;
    const btnsE = document.createElement('div'); btnsE.className = 'mer-btns';
    const b1 = document.createElement('button');
    b1.className = 'mer-btn sell';
    b1.textContent = 'Vendi 100 💠';
    b1.disabled = state.energy < 100;
    b1.addEventListener('click', () => exchangeEnergy(false));
    const b2 = document.createElement('button');
    b2.className = 'mer-btn';
    b2.textContent = 'Compra 100 💠';
    b2.disabled = (state.resources.oro || 0) < EXCHANGE.buy;
    b2.addEventListener('click', () => exchangeEnergy(true));
    btnsE.appendChild(b1); btnsE.appendChild(b2);
    rowE.appendChild(btnsE);
    elTabMerchant.appendChild(rowE);
  }

  function prestigeGain() {
    if (state.totalEarned < 1e6) return 0;
    return Math.floor(Math.pow(state.totalEarned / 1e6, 0.6));
  }
  let confirmPrestige = false;
  let confirmTimer = null;

  function renderPrestige() {
    const gain = prestigeGain();
    elTabPrestige.innerHTML = `
      <div class="prestige-box">
        <h3>🌌 Esplosione Cosmica</h3>
        <p>Fai esplodere l'universo e ricomincia da zero in cambio di <b>Stelle</b>.
        Ogni Stella dà un <b>+10%</b> permanente a tutti i guadagni.</p>
        <div class="big-num">+${fmt(gain)} ⭐</div>
        <p>Raccogli almeno <b>1.00M 💠</b> in totale per rinascere.<br>
        Ora hai guadagnato <b>${fmt(state.totalEarned)} 💠</b> in questa vita.</p>
      </div>
      <p style="font-size:13px;color:var(--dim)">Hai già <b style="color:var(--gold)">${fmt(state.stars)} ⭐</b> (moltiplicatore ×${(1 + state.stars * 0.1).toFixed(2)}).</p>
    `;
    const btn = document.createElement('button');
    btn.className = 'big-btn2';
    btn.textContent = confirmPrestige ? '⚠️ Tocca di nuovo per confermare!' : '💥 Fai esplodere tutto';
    btn.disabled = gain <= 0;
    btn.addEventListener('click', () => doPrestige(gain));
    elTabPrestige.appendChild(btn);
  }

  function doPrestige(gain) {
    if (gain <= 0) return;
    if (!confirmPrestige) {
      confirmPrestige = true;
      renderPrestige();
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => { confirmPrestige = false; renderPrestige(); }, 3000);
      return;
    }
    confirmPrestige = false;
    state.stars += gain;
    state.energy = 0;
    state.totalEarned = 0;
    state.gemsCollected = 0;
    state.zone = 0;
    state.unlockedZone = 0;
    state.upgrades = {};
    syncDrones();
    save();
    burst(player.position, 0xffd54f, 30);
    toast(`💥 BOOM! Universo esploso! Hai guadagnato ${fmt(gain)} ⭐ (+${gain * 10}% guadagni!)`);
    enterZone(0);
    closePanel();
    updateHUD();
  }

  /* ------------------------------------------------------------
     10. LOOP PRINCIPALE
  ------------------------------------------------------------ */
  const clock = new THREE.Clock();
  let spawnTimer = 0;
  let incomeTick = 0;
  let bobPhase = 0;
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    // --- Movimento ---
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

    // limita al raggio della zona
    const z = ZONES[state.zone];
    const pr = Math.hypot(player.position.x, player.position.z);
    if (pr > z.radius) {
      player.position.x *= z.radius / pr;
      player.position.z *= z.radius / pr;
    }
    const bob = moving ? Math.sin(bobPhase) * 0.08 : Math.sin(time * 2) * 0.02;
    player.position.y = bob;
    body.rotation.y = Math.sin(time * (moving ? 3 : 1)) * (moving ? 0.12 : 0.04);
    body.rotation.x = Math.cos(bobPhase * 0.5) * (moving ? 0.06 : 0.02);

    // antenna gemma pulsa
    antennaGem.material.emissiveIntensity = 1.2 + Math.sin(time * 5) * 0.5;
    antennaGem.rotation.y += dt * 3;

    // --- Camera ---
    const camTarget = new THREE.Vector3(
      player.position.x,
      player.position.y + 17,
      player.position.z + 13
    );
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 5));
    camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);

    // --- Portale ---
    portalGroup.rotation.y += dt * 0.8;
    portalGroup.position.y = 1.1 + Math.sin(time * 1.4) * 0.1;

    // --- Nodi raccoglibili: animazione, respawn, anelli ---
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
      const nd = dist2D(n.mesh.position.x, n.mesh.position.z, player.position.x, player.position.z);
      const near = !n.depleted && nd < 2.9;
      const cooling = nowMs < n.cooldownUntil;
      n.ring.material.opacity = n.depleted ? 0 : cooling ? 0.12 : near ? 0.75 : 0.32;
    }

    // --- Mercante: piccolo dondolio ---
    if (merchantGroup) {
      merchantGroup.position.y = Math.sin(time * 1.6) * 0.04;
    }

    // --- Azione contestuale (nodo / mercante / portale) ---
    computeContext();
    updateActionBtn();
    if (context) {
      const c = context;
      if (c.kind === 'node') {
        elHint.textContent = c.node.type === 'tree'
          ? '🪓 Premi E (o tocca il pulsante) per tagliare'
          : c.node.type === 'rock'
            ? '⛏️ Premi E (o tocca il pulsante) per minare'
            : '🔮 Premi E (o tocca il pulsante) per estrarre';
      } else if (c.kind === 'merchant') {
        elHint.textContent = '🤝 Premi E per parlare con Sgobbo il Mercante';
      } else {
        elHint.textContent = '🌀 Premi E per viaggiare tra le Zone';
      }
    } else {
      elHint.textContent = 'WASD / frecce per muoverti · taglia alberi 🪵 e sassi 🪨';
    }

    // --- Gemme: animazione, magnete, raccolta ---
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

    // --- Spawn gemme ---
    spawnTimer -= dt;
    const maxGems = upgradeValue('spawn', state.upgrades.spawn || 0);
    if (spawnTimer <= 0 && gems.length < maxGems) {
      spawnGem();
      spawnTimer = 0.9;
    }

    // --- Droni ---
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

    // --- Reddito passivo ---
    const ips = incomePerSec();
    if (ips > 0) {
      const gain = ips * dt;
      state.energy += gain;
      state.totalEarned += gain;
      incomeTick += dt;
      if (incomeTick >= 1 && drones.length) {
        incomeTick = 0;
        const d = choice(drones);
        floater(d.position, `+${fmt(ips)}`, '#7fe3ff');
      }
    }

    // --- Particelle ---
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

    // --- Dimensione Folle: colori cangianti ---
    if (state.zone === 6) {
      const hue = (time * 40) % 360;
      const c = new THREE.Color().setHSL(hue / 360, 1, 0.55);
      gemMatFor(6).emissive.set(c);
      gemMatFor(6).color.set(c.clone().multiplyScalar(0.4));
      portalRing.material.color.set(c);
      portalRing.material.emissive.set(c);
      renderer.setClearColor(new THREE.Color().setHSL(hue / 360, 0.8, 0.12));
    }

    // --- Render ---
    renderer.render(scene, camera);

    // --- HUD leggero (solo energia cambia spesso) ---
    elEnergy.textContent = fmt(state.energy);
  }

  /* ------------------------------------------------------------
     11. AVVIO
  ------------------------------------------------------------ */
  function applyOfflineProgress() {
    const elapsed = (Date.now() - state.lastSave) / 1000;
    if (elapsed > 30 && state.started) {
      const capped = Math.min(elapsed, 8 * 3600);
      const gain = incomePerSec() * capped * 0.5;
      if (gain >= 1) {
        state.energy += gain;
        state.totalEarned += gain;
      }
      // anche i droni... anzi, gli attrezzi lavorano in autonomia
      const hours = capped / 3600;
      const woodGain = Math.floor(toolStats('axe').yield * 30 * 0.5 * hours);
      const stoneGain = Math.floor(toolStats('pick').yield * 30 * 0.5 * hours);
      if (woodGain > 0) addResource('legno', woodGain);
      if (stoneGain > 0) addResource('pietra', stoneGain);
      const parts = [];
      if (gain >= 1) parts.push(`+${fmt(gain)} 💠`);
      if (woodGain > 0) parts.push(`+${fmt(woodGain)} 🪵`);
      if (stoneGain > 0) parts.push(`+${fmt(stoneGain)} 🪨`);
      if (parts.length) toast(`😴 Ben tornato! Mentre dormivi: ${parts.join(' ')}`);
    }
  }

  function boot() {
    syncDrones();
    enterZone(clamp(state.zone, 0, ZONES.length - 1));
    applyOfflineProgress();
    updateHUD();
    animate();
    setInterval(save, 3000);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Installazione PWA
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

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Splash → gioco
  $('btn-play').addEventListener('click', () => {
    elSplash.classList.add('hidden');
    if (!state.started) {
      state.started = true;
      toast('👋 Ciao! Io sono Cubetto. Raccogli le gemme e diventa ricchissimo!');
      setTimeout(() => toast('🪓 Gli alberi 🪵 e i sassi 🪨 danno risorse: cerca il pulsante azione!'), 3000);
      setTimeout(() => toast('🧰 Apri Craft per creare attrezzi · 🤝 il Mercante scambia con l’Oro 💰'), 6000);
    }
    save();
    boot();
  });

  // Se non è la prima volta, mostra subito il gioco ma con lo splash? No: lo splash si mostra sempre all'avvio.
  // (boot() viene chiamato al click su GIOCA.)

  // Handle di debug/test (opzionale, innocuo)
  window.__gemmondo = {
    get state() { return state; },
    player,
    nodes,
    harvestNode,
    craftRecipe,
    sellResource,
    buyResource,
    computeContext,
    doAction,
  };
})();
