import * as THREE from "three";

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function coner(r, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const THEMES = {
  soglia: { ground: 0x171a26, path: 0x20242f, fog: 0x0b0e17, bg: 0x0b0e17 },
  sala: { ground: 0x1a1c2a, path: 0x23263a, fog: 0x14151f, bg: 0x10111a },
  galleria: { ground: 0x201f2c, path: 0x2a2940, fog: 0x181725, bg: 0x141320 },
  cripta: { ground: 0x14121c, path: 0x1c1a26, fog: 0x0d0c14, bg: 0x0b0a12 },
  vetta: { ground: 0x23283a, path: 0x2f3a52, fog: 0x10151f, bg: 0x0e131d }
};

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e17);
  scene.fog = new THREE.Fog(0x0b0e17, 10, 26);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 2.1, 6.0);

  const hemi = new THREE.HemisphereLight(0x6d8fd1, 0x14161f, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xf5e9c8, 1.05);
  sun.position.set(3, 5, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x3a2b52, 0.6);
  rim.position.set(-4, 2, -5);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  applyTheme("soglia");

  const fx = { bursts: [], motes: null, time: 0 };
  buildMotes(scene, fx);

  const chars = new Map();
  let mode = "battle";
  let player = null;
  const triggerPoints = new Map();

  const NPC_FIGURES = {
    renzo: { kind: "person", cloth: 0x5a4632, accent: 0xd4af5a, skin: 0xd3b794, accessory: "hood" },
    nino: { kind: "person", cloth: 0x3f5a6b, accent: 0xe0b45f, skin: 0xe8c9a8, accessory: "hair", scale: 0.72 },
    argo: { kind: "person", cloth: 0x2b2f45, accent: 0xcfd4e6, skin: 0xc9a87f, accessory: "scarf", scale: 1.05 },
    araldo: { kind: "person", cloth: 0x3a3f55, accent: 0xb0a88a, skin: 0xc9a87f, accessory: "hood" },
    adele: { kind: "person", cloth: 0x6b4a3a, accent: 0xffd98a, skin: 0xd9b89a, accessory: "hair", scale: 0.9 },
    cera: { kind: "person", cloth: 0x6a5a7a, accent: 0xb7c4d8, skin: 0xd3b794, accessory: "scarf" },
    notturno: { kind: "person", cloth: 0x2a2f3f, accent: 0x8a93a8, skin: 0xb8a284, accessory: "hood", scale: 1.1 },
    sibilla: { kind: "person", cloth: 0x8a93b0, accent: 0xdfe2f0, skin: 0xdccbb0, accessory: "hood" }
  };

  const ENEMY_FIGURES = {
    echo: { kind: "echo", cloth: 0x4a3a63, accent: 0xb78ad4 },
    dimenticata: { kind: "lament", cloth: 0x2f5f6b, accent: 0x7ad4d0 },
    velma: { kind: "painter", cloth: 0x3a3f55, accent: 0xcfd4e6 },
    giudice: { kind: "judge", cloth: 0x4a3a28, accent: 0xd4c48a },
    custode: { kind: "keeper", cloth: 0x241b33, accent: 0xf2d389 }
  };

  function addCharacter(key, opts) {
    const group = makeHumanoid(opts);
    const base = new THREE.Vector3(opts.x, 0, opts.z);
    group.position.copy(base);
    const c = { key, group, base, mats: group.userData.mats, anim: null, dead: false, moving: false };
    scene.add(group);
    chars.set(key, c);
    return c;
  }

  function addPlayer(opts) {
    const group = makeHumanoid({ kind: "person", cloth: 0x7a3030, accent: 0xd4af5a, skin: 0xe3c09b, accessory: "scarf" });
    const base = new THREE.Vector3(opts.x, 0, opts.z);
    group.position.copy(base);
    const c = { key: "player", group, base, mats: group.userData.mats, anim: null, dead: false, moving: false };
    scene.add(group);
    chars.set("player", c);
    player = c;
    return c;
  }

  function addEnemyFigure(kind, pos) {
    const cfg = ENEMY_FIGURES[kind] || ENEMY_FIGURES.echo;
    const group = makeHumanoid({
      kind: cfg.kind,
      cloth: cfg.cloth,
      accent: cfg.accent,
      skin: 0xb8c0d4
    });
    group.position.set(pos.x, 0, pos.z);
    const c = { key: "enemy", group, base: new THREE.Vector3(pos.x, 0, pos.z), mats: group.userData.mats, anim: null, dead: false, moving: false };
    scene.add(group);
    chars.set("enemy", c);
    triggerPoints.set("enemy", new THREE.Vector3(pos.x, 0, pos.z));
    return c;
  }

  function addNpc(key, pos, type) {
    const cfg = NPC_FIGURES[type] || NPC_FIGURES.renzo;
    const group = makeHumanoid(cfg);
    if (cfg.scale) group.scale.setScalar(cfg.scale);
    group.position.set(pos.x, 0, pos.z);
    const c = { key, group, base: new THREE.Vector3(pos.x, 0, pos.z), mats: group.userData.mats, anim: null, dead: false, moving: false };
    scene.add(group);
    chars.set(key, c);
    triggerPoints.set(key, new THREE.Vector3(pos.x, 0, pos.z));
    return c;
  }

  function removeFigure(key) {
    const c = chars.get(key);
    if (c) {
      scene.remove(c.group);
      chars.delete(key);
    }
    triggerPoints.delete(key);
  }

  function updatePlayer(dt, input) {
    if (!player || mode !== "explore") return;
    const speed = 2.6;
    let ix = input.x, iz = input.z;
    const len = Math.hypot(ix, iz);
    if (len > 0) {
      ix /= len; iz /= len;
      const cam = camera.position;
      let fx = player.group.position.x - cam.x;
      let fz = player.group.position.z - cam.z;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl; fz /= fl;
      const rx = -fz, rz = fx;
      const mx = fx * iz + rx * ix;
      const mz = fz * iz + rz * ix;
      const ml = Math.hypot(mx, mz) || 1;
      player.group.position.x += (mx / ml) * speed * dt;
      player.group.position.z += (mz / ml) * speed * dt;
      player.group.position.x = clamp(player.group.position.x, -13, 13);
      player.group.position.z = clamp(player.group.position.z, -12, 6);
      const targetYaw = Math.atan2(mx, mz);
      player.group.rotation.y = lerpAngle(player.group.rotation.y, targetYaw, 1 - Math.exp(-dt * 10));
      player.moving = true;
    } else {
      player.moving = false;
    }
    const k = 1 - Math.exp(-dt * 4);
    camera.position.x += (player.group.position.x - camera.position.x) * k;
    camera.position.y += (3.6 - camera.position.y) * k;
    camera.position.z += (player.group.position.z + 5.0 - camera.position.z) * k;
    camera.lookAt(player.group.position.x, 1.15, player.group.position.z);
  }

  const api = {
    renderer, scene, camera,
    addCharacter,
    addPlayer,
    addEnemyFigure,
    addNpc,
    removeFigure,
    updatePlayer,
    setMode: (m) => { mode = m; },
    getMode: () => mode,
    applyTheme,
    getPlayerPos: () => (player ? player.group.position.clone() : null),
    getTriggers: () => Array.from(triggerPoints.entries()).map(([key, pos]) => ({ key, pos: pos.clone() })),
    getTrigger: () => {
      const e = triggerPoints.get("enemy");
      return e ? e.clone() : null;
    },
    getPos: (key) => {
      const c = chars.get(key);
      return c ? c.group.position.clone() : new THREE.Vector3(0, 1.2, -2.3);
    },
    clearCharacters: () => {
      for (const c of chars.values()) scene.remove(c.group);
      chars.clear();
      triggerPoints.clear();
    },
    resetPose: (key) => {
      const c = chars.get(key);
      if (!c) return;
      c.dead = false;
      c.anim = null;
      c.group.position.copy(c.base);
      c.group.rotation.set(0, 0, 0);
      const mats = c.group.userData.mats || [];
      for (const m of mats) { m.emissive.setHex(m.userData.eHex); m.emissiveIntensity = m.userData.eInt; }
    },
    play, flash, ko, healGlow,
    burst, update, resize, dispose
  };

  return api;

  /* ---------------- world (theme map) ---------------- */

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) m.dispose();
      }
    });
  }

  function applyTheme(t) {
    while (world.children.length) {
      const c = world.children.pop();
      world.remove(c);
      disposeObject(c);
    }
    const cfg = THEMES[t] || THEMES.soglia;
    scene.background = new THREE.Color(cfg.bg);
    scene.fog = new THREE.Fog(cfg.fog, 16, 54);

    const groundMat = new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1, flatShading: true });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    world.add(ground);

    const pathMat = new THREE.MeshStandardMaterial({ color: cfg.path, roughness: 1 });
    const path = new THREE.Mesh(new THREE.CircleGeometry(15, 28), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.001;
    path.receiveShadow = true;
    world.add(path);

    buildProps(world, t);
  }

  function addCandle(x, z, mat) {
    const g = new THREE.Group();
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), mat);
    holder.position.y = 0.06;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.6 });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), flameMat);
    flame.position.y = 0.2;
    g.add(holder, flame);
    g.position.set(x, 0, z);
    return g;
  }

  function buildProps(w, t) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x171a26, roughness: 1, flatShading: true });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0x2c3350, roughness: 1, flatShading: true });
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 20; i++) {
      const rm = t === "vetta" ? snowMat : rockMat;
      const r = new THREE.Mesh(rockGeo, rm);
      const a = (i / 20) * Math.PI * 2 + Math.random() * 0.7;
      const rad = 9 + Math.random() * 9;
      r.position.set(Math.cos(a) * rad, 0.18, Math.sin(a) * rad - 4);
      r.scale.set(0.5 + Math.random() * 1, 0.6 + Math.random() * 1.3, 0.5 + Math.random() * 1);
      r.rotation.y = Math.random() * Math.PI;
      r.castShadow = true; r.receiveShadow = true;
      w.add(r);
    }

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2436, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x232a45, roughness: 1, flatShading: true });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1d2438, roughness: 1, flatShading: true });
    if (t === "soglia" || t === "vetta") {
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.4, 5), trunkMat);
        trunk.position.y = 0.7; trunk.castShadow = true;
        const lm = t === "vetta" ? pineMat : leafMat;
        const leaf = coner(0.7, 1.6, lm, 0, 1.9, 0);
        const leaf2 = coner(0.5, 1.2, lm, 0, 2.7, 0);
        g.add(trunk, leaf, leaf2);
        const a = (i / 10) * Math.PI * 2 + 0.4;
        const rad = 9 + Math.random() * 5;
        g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad - 4);
        g.scale.setScalar(1.2 + Math.random() * 0.9);
        w.add(g);
      }
    }

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x23283a, roughness: 0.95, flatShading: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4c48a, roughness: 0.6 });
    if (t === "sala") {
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 2.4, 8), stoneMat);
        col.position.y = 1.2; col.castShadow = true;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.18, 8), stoneMat);
        cap.position.y = 2.5;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.18, 8), stoneMat);
        base.position.y = -0.1;
        g.add(col, cap, base);
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const rad = 8 + Math.random() * 6;
        g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad - 4);
        w.add(g);
      }
      for (let i = 0; i < 12; i++) {
        const g = new THREE.Group();
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), stoneMat);
        slab.position.y = 0.07;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.12), goldMat);
        plate.position.y = 0.14;
        g.add(slab, plate);
        g.position.set((Math.random() - 0.5) * 22, 0, (Math.random() - 0.5) * 16 - 2);
        g.rotation.y = Math.random() * Math.PI;
        w.add(g);
      }
      const waxMat = new THREE.MeshStandardMaterial({ color: 0xd9c7a8, roughness: 0.9 });
      for (let i = 0; i < 8; i++) {
        w.add(addCandle((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12 - 2, waxMat));
      }
    }

    if (t === "galleria") {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2436, roughness: 0.8 });
      const canvases = [0x6d3a4a, 0x2f5f6b, 0x5a4632, 0x3a3f55, 0x4a3a63, 0x2f6b4a];
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), frameMat);
        legL.position.set(-0.45, 0.55, 0);
        const legR = legL.clone(); legR.position.x = 0.45;
        const pane = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.06), new THREE.MeshStandardMaterial({ color: canvases[i % canvases.length], roughness: 0.9 }));
        pane.position.y = 1.4;
        const rim = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.38, 0.07), goldMat);
        rim.position.y = 1.4;
        g.add(legL, legR, pane, rim);
        const a = (i / 10) * Math.PI * 2 + 0.5;
        const rad = 7.5 + Math.random() * 5;
        g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad - 4);
        g.rotation.y = Math.random() * Math.PI;
        w.add(g);
      }
    }

    if (t === "cripta") {
      const archMat = stoneMat;
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3, 8), archMat);
        pL.position.set(-1.3, 1.5, 0);
        const pR = pL.clone(); pR.position.x = 1.3;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 10), archMat);
        top.rotation.z = Math.PI / 2;
        top.position.y = 3.1;
        g.add(pL, pR, top);
        const a = (i / 5) * Math.PI * 2 + 0.6;
        const rad = 8 + Math.random() * 5;
        g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad - 4);
        w.add(g);
      }
      const boneMat = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.9 });
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), boneMat);
        skull.scale.set(1, 0.8, 1.1);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), boneMat);
        jaw.position.set(0, -0.08, 0.06);
        g.add(skull, jaw);
        g.position.set((Math.random() - 0.5) * 24, 0.1, (Math.random() - 0.5) * 16 - 2);
        g.rotation.y = Math.random() * Math.PI;
        w.add(g);
      }
      const waxMat = new THREE.MeshStandardMaterial({ color: 0xd9c7a8, roughness: 0.9 });
      for (let i = 0; i < 12; i++) {
        w.add(addCandle((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14 - 2, waxMat));
      }
    }

    if (t === "vetta") {
      const bellMat = goldMat;
      const bell = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 12), bellMat);
      bell.rotation.x = Math.PI;
      bell.position.set(0, 2.4, -18);
      bell.castShadow = true;
      const strikerMat = new THREE.MeshStandardMaterial({ color: 0x11141f, emissive: 0xd4c48a, emissiveIntensity: 1.6 });
      const striker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), strikerMat);
      striker.position.set(0, 1.6, -17.4);
      w.add(bell, striker);
    }

    const tower = buildTower();
    tower.scale.setScalar(1.5);
    tower.position.set(0, 0, t === "vetta" ? -20 : -22);
    w.add(tower);
  }

  function buildTower() {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x171a26, roughness: 0.95, flatShading: true });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 7, 10), stoneMat);
    tower.position.y = 3.5; tower.castShadow = true;
    const spire = coner(0.8, 2.4, stoneMat, 0, 8.2, 0);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.6 });
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), winMat);
    win.position.set(0, 4.6, 1.06);
    const win2 = win.clone(); win2.position.set(0, 6.1, 0.98); win2.scale.setScalar(0.7);
    g.add(tower, spire, win, win2);
    return g;
  }

  function buildMotes(s, fx) {
    const n = 130;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x8fa8d8, size: 0.04, transparent: true, opacity: 0.7, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    s.add(points);
    fx.motes = { points, pos, n };
  }

  /* ---------------- characters ---------------- */

  function makeHumanoid(o) {
    const g = new THREE.Group();
    const mats = [];
    const mat = (color, rough = 0.85) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04, flatShading: true });
      m.userData = { eHex: m.emissive.getHex(), eInt: m.emissiveIntensity };
      mats.push(m);
      return m;
    };
    const skin = mat(o.skin || 0xe3c09b);
    const cloth = mat(o.cloth);
    const dark = mat(0x1b1f2a);
    const accent = mat(o.accent);

    if (o.kind === "keeper") {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 10), cloth);
      robe.position.set(0, 1.05, 0);
      robe.castShadow = true;
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), dark);
      hood.position.set(0, 2.05, 0);
      hood.scale.y = 1.15;
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x3a2b52, emissive: 0xf2d389, emissiveIntensity: 2 });
      coreMat.userData = { eHex: 0xf2d389, eInt: 2 };
      mats.push(coreMat);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), coreMat);
      core.position.set(0, 1.5, 0.4);
      const arms = box(0.1, 0.9, 0.1, cloth, -0.5, 1.5, 0);
      const arms2 = box(0.1, 0.9, 0.1, cloth, 0.5, 1.5, 0);
      g.add(robe, hood, core, arms, arms2);
      g.userData = { mats, core, o };
      g.userData.o = o;
      return g;
    }

    if (o.kind === "echo") {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 9), cloth);
      robe.position.set(0, 0.95, 0); robe.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.26), skin);
      head.position.set(0, 1.95, 0);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x11141f, emissive: o.accent, emissiveIntensity: 1.4 });
      eyeMat.userData = { eHex: o.accent, eInt: 1.4 };
      mats.push(eyeMat);
      const eye = box(0.06, 0.06, 0.04, eyeMat, -0.07, 1.98, 0.13);
      const eye2 = box(0.06, 0.06, 0.04, eyeMat, 0.07, 1.98, 0.13);
      const shawl = box(0.3, 0.12, 0.24, accent, 0, 1.32, 0);
      g.add(robe, head, eye, eye2, shawl);
      g.userData = { mats, o };
      return g;
    }

    if (o.kind === "lament") {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.6, 10), cloth);
      robe.position.set(0, 1.0, 0); robe.castShadow = true;
      const veil = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 9), accent);
      veil.position.set(0, 2.0, -0.06);
      veil.scale.set(1, 1.35, 1);
      veil.material = accent;
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.2), skin);
      face.position.set(0, 1.62, 0);
      const tearMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: o.accent, emissiveIntensity: 1.8 });
      tearMat.userData = { eHex: o.accent, eInt: 1.8 };
      mats.push(tearMat);
      const tear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), tearMat);
      tear.position.set(0, 1.45, 0.12);
      const armL = box(0.09, 0.7, 0.1, cloth, -0.4, 1.35, 0);
      const armR = box(0.09, 0.7, 0.1, cloth, 0.4, 1.35, 0);
      g.add(robe, veil, face, tear, armL, armR);
      g.userData = { mats, o };
      g.userData.o = o;
      return g;
    }

    if (o.kind === "painter") {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.7, 10), cloth);
      robe.position.set(0, 1.05, 0); robe.castShadow = true;
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0, 10), accent);
      cloak.position.set(0, 1.9, 0);
      cloak.scale.y = 1.2;
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skin);
      face.position.set(0, 2.02, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.05, 10), accent);
      brim.position.set(0, 2.22, 0);
      const palette = box(0.16, 0.03, 0.12, accent, 0.45, 1.2, 0.1);
      const brush = box(0.03, 0.3, 0.03, mat(0xc9a87f), 0.42, 1.42, 0.12);
      g.add(robe, cloak, face, brim, palette, brush);
      g.userData = { mats, o };
      g.userData.o = o;
      return g;
    }

    if (o.kind === "judge") {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 12), cloth);
      bell.position.set(0, 1.15, 0);
      bell.rotation.x = Math.PI;
      bell.castShadow = true;
      const lipMat = new THREE.MeshStandardMaterial({ color: 0xd4c48a, metalness: 0.7, roughness: 0.35 });
      lipMat.userData = { eHex: 0xd4c48a, eInt: 0 };
      mats.push(lipMat);
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.12, 12), lipMat);
      lip.position.set(0, 1.98, 0);
      const strikerMat = new THREE.MeshStandardMaterial({ color: 0x1b1f2a, emissive: o.accent, emissiveIntensity: 2.2 });
      strikerMat.userData = { eHex: o.accent, eInt: 2.2 };
      mats.push(strikerMat);
      const striker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), strikerMat);
      striker.position.set(0, 1.0, 0.42);
      const armL = box(0.1, 0.9, 0.1, mat(0x4a3a28), -0.55, 1.5, 0);
      const armR = box(0.1, 0.9, 0.1, mat(0x4a3a28), 0.55, 1.5, 0);
      g.add(bell, lip, striker, armL, armR);
      g.userData = { mats, striker, o };
      g.userData.o = o;
      return g;
    }

    const legL = box(0.13, 0.55, 0.16, cloth, -0.11, 0.27, 0);
    const legR = box(0.13, 0.55, 0.16, cloth, 0.11, 0.27, 0);
    const torso = box(0.34, 0.5, 0.22, cloth, 0, 0.78, 0);
    const belt = box(0.36, 0.08, 0.24, accent, 0, 0.56, 0);
    const armL = box(0.1, 0.48, 0.12, cloth, -0.25, 0.92, 0);
    const armR = box(0.1, 0.48, 0.12, cloth, 0.25, 0.92, 0);
    const head = box(0.26, 0.28, 0.26, skin, 0, 1.14, 0);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x11141f, emissive: 0x22262f, emissiveIntensity: 0.4 });
    eyeMat.userData = { eHex: 0x22262f, eInt: 0.4 };
    mats.push(eyeMat);
    const eyeL = box(0.05, 0.05, 0.03, eyeMat, -0.07, 1.17, 0.13);
    const eyeR = box(0.05, 0.05, 0.03, eyeMat, 0.07, 1.17, 0.13);
    g.add(legL, legR, torso, belt, armL, armR, head, eyeL, eyeR);

    if (o.accessory === "scarf") {
      const scarf = box(0.16, 0.07, 0.24, accent, 0, 1.0, 0);
      g.add(scarf);
    }
    if (o.accessory === "hood") {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 8), cloth);
      hood.position.set(0, 1.24, 0);
      hood.scale.y = 1.3;
      g.add(hood);
    }
    if (o.accessory === "hair") {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 8), accent);
      hair.position.set(0, 1.3, -0.02);
      hair.scale.set(1.1, 1.25, 1);
      g.add(hair);
    }

    g.userData = { mats, o };
    return g;
  }

  /* ---------------- animations ---------------- */

  function setAnim(c, type, dur = 450) {
    c.anim = { type, t: 0, dur };
  }

  function play(key, action, dur) {
    const c = chars.get(key);
    if (!c) return Promise.resolve();
    setAnim(c, action, dur || 450);
    return new Promise((res) => setTimeout(res, (dur || 450) + 40));
  }

  function flash(key) {
    const c = chars.get(key);
    if (!c) return;
    setAnim(c, "hit", 260);
  }

  function ko(key) {
    const c = chars.get(key);
    if (!c) return;
    c.dead = true;
    setAnim(c, "ko", 900);
  }

  function healGlow(key) {
    const c = chars.get(key);
    if (!c) return;
    const mats = c.group.userData.mats || [];
    for (const m of mats) {
      m.emissive.setHex(0x6fb98b);
      m.emissiveIntensity = 0.7;
    }
    setTimeout(() => {
      for (const m of mats) {
        m.emissive.setHex(m.userData.eHex);
        m.emissiveIntensity = m.userData.eInt;
      }
    }, 350);
  }

  function burst(pos) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.45, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2d389, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y += 0.4;
    scene.add(ring);

    const n = 36;
    const posArr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      posArr[i * 3] = pos.x;
      posArr[i * 3 + 1] = pos.y + 0.4;
      posArr[i * 3 + 2] = pos.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xf2d389, size: 0.06, transparent: true, opacity: 1, depthWrite: false });
    const points = new THREE.Points(geo, pMat);
    scene.add(points);
    const vels = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random();
      vels.push(new THREE.Vector3(Math.cos(a) * r * 3, (Math.random() * 2 + 0.5), Math.sin(a) * r * 3));
    }
    fx.bursts.push({ ring, ringMat, points, pMat, geo, vels, t: 0 });
  }

  function update(dt) {
    fx.time += dt;
    const t = fx.time;
    if (mode === "battle") {
      camera.position.x = Math.sin(t * 0.4) * 0.12;
      camera.position.y = 2.1 + Math.sin(t * 0.3) * 0.05;
      camera.lookAt(0, 1.25, -0.6);
    }

    for (const c of chars.values()) {
      const group = c.group;
      if (c.anim) {
        c.anim.t += dt * 1000;
        const p = Math.min(c.anim.t / c.anim.dur, 1);
        if (c.anim.type === "attack") {
          group.position.z = c.base.z - Math.sin(Math.PI * p) * (c.key === "enemy" ? 1.5 : 1.5);
          group.rotation.x = -Math.sin(Math.PI * p) * 0.18;
        } else if (c.anim.type === "hit") {
          group.position.x = c.base.x + Math.sin(c.anim.t * 60) * 0.06 * (1 - p);
          const mats = c.group.userData.mats || [];
          for (const m of mats) { m.emissive.setHex(0xff5040); m.emissiveIntensity = 0.8; }
        } else if (c.anim.type === "ko") {
          group.rotation.z = -1.45 * p;
          group.position.y = c.base.y - p * 0.25;
          const mats = c.group.userData.mats || [];
          for (const m of mats) { m.emissive.setHex(m.userData.eHex); m.emissiveIntensity = m.userData.eInt; }
        } else if (c.anim.type === "idle") {
          group.position.y = c.base.y + Math.sin(t * 2.2 + group.position.x) * 0.03;
          group.rotation.z = Math.sin(t * 1.4 + group.position.x) * 0.03;
        }
        if (c.anim.type !== "hit" && c.anim.type !== "ko") {
          const mats = c.group.userData.mats || [];
          for (const m of mats) { m.emissive.setHex(m.userData.eHex); m.emissiveIntensity = m.userData.eInt; }
        }
        if (p >= 1 && c.anim.type !== "ko") {
          group.position.copy(c.base);
          group.rotation.set(0, 0, 0);
          const mats = c.group.userData.mats || [];
          for (const m of mats) { m.emissive.setHex(m.userData.eHex); m.emissiveIntensity = m.userData.eInt; }
          c.anim = null;
        }
      } else {
        const moving = c.key === "player" && c.moving;
        group.position.y = c.base.y + (moving ? Math.sin(t * 9) * 0.07 : Math.sin(t * 2.2 + group.position.x) * 0.03);
        group.rotation.z = moving ? Math.sin(t * 9) * 0.05 : Math.sin(t * 1.4 + group.position.x) * 0.03;
      }
    }

    const keeper = chars.get("enemy");
    if (keeper && keeper.group.userData.o && keeper.group.userData.o.kind === "keeper") {
      const core = keeper.group.userData.core;
      if (core) {
        core.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
        core.position.y = 1.5 + Math.sin(t * 3) * 0.05;
      }
    }

    const judge = chars.get("enemy");
    if (judge && judge.group.userData.o && judge.group.userData.o.kind === "judge") {
      const striker = judge.group.userData.striker;
      if (striker) {
        striker.position.x = Math.sin(t * 2.4) * 0.18;
        striker.scale.setScalar(1 + Math.sin(t * 2.4) * 0.15);
      }
    }

    if (fx.motes) {
      const p = fx.motes;
      for (let i = 0; i < p.n; i++) {
        p.pos[i * 3 + 1] += Math.sin(t * 0.6 + i) * 0.0008;
      }
      p.points.geometry.attributes.position.needsUpdate = true;
      p.points.rotation.y = t * 0.01;
    }

    for (let i = fx.bursts.length - 1; i >= 0; i--) {
      const b = fx.bursts[i];
      b.t += dt * 1000;
      const p = b.t / 600;
      if (p >= 1) {
        scene.remove(b.ring); scene.remove(b.points);
        b.ring.geometry.dispose(); b.ringMat.dispose();
        b.geo.dispose(); b.pMat.dispose();
        fx.bursts.splice(i, 1);
        continue;
      }
      const s = 1 + p * 4;
      b.ring.scale.set(s, s, s);
      b.ringMat.opacity = 0.9 * (1 - p);
      const attr = b.points.geometry.attributes.position;
      for (let j = 0; j < attr.count; j++) {
        attr.array[j * 3] += b.vels[j].x * 0.02;
        attr.array[j * 3 + 1] += b.vels[j].y * 0.02;
        attr.array[j * 3 + 2] += b.vels[j].z * 0.02;
      }
      attr.needsUpdate = true;
      b.pMat.opacity = 1 - p;
    }

    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function dispose() {
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
}
