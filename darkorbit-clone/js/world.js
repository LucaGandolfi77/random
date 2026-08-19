// DARK ORBIT CLONE - Mondo
// Genera la mappa condivisa: asteroidi, NPC (pirati/alien), drops e laser.
// Il mondo persiste tra sessioni e account.

var WORLD = {};

// Stato runtime (non salvato integralmente per non gonfiare il localStorage)
WORLD.asteroids = [];
WORLD.npcs = [];
WORLD.drops = [];
WORLD.lasers = [];        // laser in volo: {x,y,vx,vy,dmg,color,owner,life}
WORLD.explosions = [];
WORLD.galaxy = null;      // mondo persistente: {asteroids:[{x,y,r,res,uri}], npcs:[...]}

// --- Costruzione galassia --------------------------------------------------
// Distribuisce asteroidi e NPC rispettando il "sistema di permessi": ogni
// settore ha la sua fascia di NPC (tier) e il suo pool di minerali.
WORLD.pickOre = function (sec) {
  var pool = sec.ores, i = Math.floor(Math.random() * pool.length);
  return pool[i];
};

WORLD.sectorIndexAt = function (x, y) {
  for (var j = 0; j < DATA.SECTORS.length; j++) {
    if (x >= DATA.SECTORS[j].x0 && x <= DATA.SECTORS[j].x1 &&
        y >= DATA.SECTORS[j].y0 && y <= DATA.SECTORS[j].y1) return j;
  }
  return 0;
};

WORLD.newGalaxy = function () {
  var g = { asteroids: [], npcs: [] }, i, x, y, r, type, count, secIdx, sec;
  // Asteroidi: 90 distribuiti, 2/3 in Alpha/Beta (facili), 1/3 in Gamma/Delta (ricchi)
  var arr = [];
  for (i = 0; i < 90; i++) {
    x = 120 + Math.random() * (DATA.WORLD_W - 240);
    y = 120 + Math.random() * (DATA.WORLD_H - 240);
    secIdx = WORLD.sectorIndexAt(x, y);
    sec = DATA.SECTORS[secIdx];
    r = 14 + Math.random() * 18;
    arr.push({ x: x, y: y, r: r, res: 30 + Math.floor(Math.random() * 40), uri: Math.random() < DATA.ASTEROID_URIDIUM_CHANCE, ore: WORLD.pickOre(sec) });
  }
  g.asteroids = arr;
  // NPC: fascia di tier in base al settore
  count = 26;
  for (i = 0; i < count; i++) {
    x = 200 + Math.random() * (DATA.WORLD_W - 400);
    y = 200 + Math.random() * (DATA.WORLD_H - 400);
    secIdx = WORLD.sectorIndexAt(x, y);
    sec = DATA.SECTORS[secIdx];
    type = sec.tierMin + Math.floor(Math.random() * (sec.tierMax - sec.tierMin + 1));
    g.npcs.push({ type: type, x: x, y: y });
  }
  return g;
};

// --- Carica / salva galassia ------------------------------------------------
WORLD.load = function () {
  WORLD.galaxy = SAVE.loadWorld();
  if (!WORLD.galaxy || !WORLD.galaxy.asteroids || WORLD.galaxy.asteroids.length === 0) {
    WORLD.galaxy = WORLD.newGalaxy();
    SAVE.saveWorld(WORLD.galaxy);
  }
  SPRITE.initStars();
  WORLD.buildRuntime();
};

// Costruisce lo stato runtime a partire dalla galassia persistente
WORLD.buildRuntime = function () {
  var i, a, n, npc;
  WORLD.asteroids = [];
  WORLD.npcs = [];
  WORLD.drops = [];
  WORLD.lasers = [];
  WORLD.explosions = [];
  for (i = 0; i < WORLD.galaxy.asteroids.length; i++) {
    a = WORLD.galaxy.asteroids[i];
    WORLD.asteroids.push({ x: a.x, y: a.y, r: a.r, res: a.res, uri: a.uri, ore: a.ore || 'prometium', alive: true });
  }
  for (i = 0; i < WORLD.galaxy.npcs.length; i++) {
    n = WORLD.galaxy.npcs[i];
    npc = DATA.NPCS[n.type];
    WORLD.npcs.push({
      id: i,
      type: n.type,
      name: npc.name,
      hp: npc.hp,
      maxHp: npc.hp,
      x: n.x, y: n.y,
      vx: 0, vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: npc.speed,
      dmg: npc.dmg,
      aggro: npc.aggro,
      range: npc.range,
      color: npc.color,
      size: npc.size,
      ep: npc.ep,
      honor: npc.honor,
      alive: true,
      hostile: false,
      shootCd: Math.random() * 1,
      wanderT: 0,
      targetX: 0, targetY: 0
    });
  }
};

WORLD.save = function () {
  SAVE.saveWorld(WORLD.galaxy);
};

// --- Asteroidi -------------------------------------------------------------
WORLD.nearestAsteroid = function (x, y, maxR) {
  var best = null, bd = maxR * maxR, i, a, d;
  for (i = 0; i < WORLD.asteroids.length; i++) {
    a = WORLD.asteroids[i];
    if (!a.alive) continue;
    d = (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
};

// --- NPC -------------------------------------------------------------------
WORLD.nearestNpc = function (x, y, maxR) {
  var best = null, bd = maxR * maxR, i, n, d;
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) continue;
    d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
};

// Indice dell'NPC piu' vicino al punto (x,y) entro raggio, o -1
WORLD.npcAt = function (x, y, radius) {
  var best = -1, bd = radius * radius, i, n, d;
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) continue;
    d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};

// --- Drop ------------------------------------------------------------------
WORLD.spawnDrop = function (x, y, type, amount, ore) {
  WORLD.drops.push({ x: x, y: y, type: type, amount: amount, ore: ore || null, life: 45 });
};

WORLD.collectDrop = function (d, player) {
  if (d.type === 'credits') player.credits += d.amount;
  else if (d.type === 'uridium') player.uridium += d.amount;
  else if (d.type === 'ore') {
    if (!player.ores) player.ores = SAVE.emptyOres();
    player.ores[d.ore] = (player.ores[d.ore] || 0) + d.amount;
    if (typeof GAME !== 'undefined' && GAME.trackCollect) GAME.trackCollect(d.ore, d.amount);
  }
  WORLD.drops.splice(WORLD.drops.indexOf(d), 1);
};

// --- Esplosioni -------------------------------------------------------------
WORLD.spawnExplosion = function (x, y, color, n) {
  var i, particles = [], angle, spd;
  n = n || 14;
  for (i = 0; i < n; i++) {
    angle = Math.random() * Math.PI * 2;
    spd = 30 + Math.random() * 90;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      color: color
    });
  }
  WORLD.explosions.push({ x: x, y: y, particles: particles, t: 0 });
};

// --- Laser -----------------------------------------------------------------
WORLD.fireLaser = function (x, y, angle, dmg, color, owner, isAst) {
  WORLD.lasers.push({ x: x, y: y, vx: Math.cos(angle) * 480, vy: Math.sin(angle) * 480, dmg: dmg, color: color, owner: owner, isAst: !!isAst, life: 1 });
};

// --- Galaxy Gate (NPC dell'arena) ---------------------------------------------
// I nemici del gate sono runtime-only (non salvati nel mondo condiviso).
WORLD.gateNpcs = [];
WORLD.gateClear = function () { WORLD.gateNpcs = []; };

WORLD.gateSpawnWave = function (count, tierMin, tierMax) {
  var A = DATA.GATE.arena, i, type, npc, x, y;
  for (i = 0; i < count; i++) {
    type = tierMin + Math.floor(Math.random() * (tierMax - tierMin + 1));
    npc = DATA.NPCS[type];
    x = A.x0 + 60 + Math.random() * (A.x1 - A.x0 - 120);
    y = A.y0 + 60 + Math.random() * (A.y1 - A.y0 - 120);
    WORLD.gateNpcs.push({
      type: type,
      name: npc.name,
      hp: npc.hp, maxHp: npc.hp,
      x: x, y: y,
      vx: 0, vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: npc.speed, dmg: npc.dmg,
      aggro: npc.aggro, range: npc.range,
      color: npc.color, size: npc.size,
      ep: npc.ep, honor: npc.honor,
      isGate: true,
      alive: true,
      hostile: true,
      shootCd: Math.random() * 0.6,
      wanderT: 0, targetX: 0, targetY: 0
    });
  }
};

WORLD.gateSpawnBoss = function () {
  var b = DATA.GATE.boss, A = DATA.GATE.arena;
  WORLD.gateNpcs.push({
    type: -1,
    name: b.name,
    hp: b.hp, maxHp: b.hp,
    x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2,
    vx: 0, vy: 0,
    angle: 0,
    speed: b.speed, dmg: b.dmg,
    aggro: b.aggro, range: b.range,
    color: b.color, size: b.size,
    ep: 5000, honor: 800,
    isGate: true, isBoss: true,
    alive: true,
    hostile: true,
    shootCd: 0.5,
    wanderT: 0, targetX: 0, targetY: 0
  });
};

WORLD.gateAliveCount = function () {
  var i, c = 0;
  for (i = 0; i < WORLD.gateNpcs.length; i++) if (WORLD.gateNpcs[i].alive) c++;
  return c;
};

// --- AI NPC (usata sia per i nemici del mondo che per quelli del gate) --------
// I nemici sono difensivi: vagano a caso e attaccano solo se provocati
// (hostile=true), inseguendo il giocatore finche' non esce dall'aggro.
WORLD.stepNpc = function (n, dt, player) {
  var dx = player.x - n.x, dy = player.y - n.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (n.hostile && dist < n.aggro) {
    n.angle = Math.atan2(dy, dx);
    n.vx = Math.cos(n.angle) * n.speed;
    n.vy = Math.sin(n.angle) * n.speed;
    n.shootCd -= dt;
    if (n.shootCd <= 0 && dist < n.range) {
      n.shootCd = 1.4;
      WORLD.fireLaser(n.x, n.y, n.angle, n.dmg, n.color, 'npc');
    }
  } else {
    n.wanderT -= dt;
    if (n.wanderT <= 0) {
      n.wanderT = 2 + Math.random() * 3;
      n.targetX = n.x + (Math.random() - 0.5) * 500;
      n.targetY = n.y + (Math.random() - 0.5) * 500;
      if (n.isGate) {
        n.targetX = Math.max(DATA.GATE.arena.x0 + 30, Math.min(DATA.GATE.arena.x1 - 30, n.targetX));
        n.targetY = Math.max(DATA.GATE.arena.y0 + 30, Math.min(DATA.GATE.arena.y1 - 30, n.targetY));
      } else {
        n.targetX = Math.max(60, Math.min(DATA.WORLD_W - 60, n.targetX));
        n.targetY = Math.max(60, Math.min(DATA.WORLD_H - 60, n.targetY));
      }
    }
    dx = n.targetX - n.x; dy = n.targetY - n.y;
    var wanderDist = Math.sqrt(dx * dx + dy * dy);
    if (wanderDist > 20) {
      n.angle = Math.atan2(dy, dx);
      n.vx = Math.cos(n.angle) * n.speed * 0.4;
      n.vy = Math.sin(n.angle) * n.speed * 0.4;
    } else { n.vx = 0; n.vy = 0; }
  }
  n.x += n.vx * dt;
  n.y += n.vy * dt;
  if (n.isGate) {
    n.x = Math.max(DATA.GATE.arena.x0 + 20, Math.min(DATA.GATE.arena.x1 - 20, n.x));
    n.y = Math.max(DATA.GATE.arena.y0 + 20, Math.min(DATA.GATE.arena.y1 - 20, n.y));
  } else {
    n.x = Math.max(30, Math.min(DATA.WORLD_W - 30, n.x));
    n.y = Math.max(30, Math.min(DATA.WORLD_H - 30, n.y));
  }
};

// --- Aggiornamento mondo ----------------------------------------------------
// player = account attivo (per AI e collisioni)
WORLD.update = function (dt, player) {
  var i, n, d, l, ex, dx, dy, dist, npc, target, wanderDist, a, acc;

  // Aggiorna NPC (mondo condiviso)
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) continue;
    WORLD.stepNpc(n, dt, player);
  }

  // Aggiorna NPC del Galaxy Gate
  for (i = 0; i < WORLD.gateNpcs.length; i++) {
    n = WORLD.gateNpcs[i];
    if (!n.alive) continue;
    WORLD.stepNpc(n, dt, player);
  }

  // Aggiorna laser
  for (i = WORLD.lasers.length - 1; i >= 0; i--) {
    l = WORLD.lasers[i];
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.life -= dt;
    if (l.life <= 0) { WORLD.lasers.splice(i, 1); continue; }
    // collisione laser nemico con giocatore
    if (l.owner === 'npc') {
      dx = l.x - player.x; dy = l.y - player.y;
      if (dx * dx + dy * dy < 15 * 15) {
        WORLD.lasers.splice(i, 1);
        if (GAME.hitPlayer(l.dmg)) WORLD.spawnExplosion(player.x, player.y, '#ff8a5b', 8);
      }
    }
  }

  // Respawn NPC morti (nel mondo condiviso)
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) {
      n.respawnT = (n.respawnT || 0) - dt;
      if (n.respawnT <= 0) {
        n.alive = true;
        npc = DATA.NPCS[n.type];
        n.hp = npc.hp;
        n.maxHp = npc.hp;
        n.x = 200 + Math.random() * (DATA.WORLD_W - 400);
        n.y = 200 + Math.random() * (DATA.WORLD_H - 400);
        n.wanderT = 0;
        n.hostile = false;
      }
    }
  }

  // Respawn asteroidi estratti
  for (i = 0; i < WORLD.asteroids.length; i++) {
    a = WORLD.asteroids[i];
    if (!a.alive) {
      a.respawnT = (a.respawnT || 0) - dt;
      if (a.respawnT <= 0) {
        a.alive = true;
        a.res = 30 + Math.floor(Math.random() * 40);
        a.uri = Math.random() < DATA.ASTEROID_URIDIUM_CHANCE;
        a.ore = WORLD.pickOre(DATA.SECTORS[WORLD.sectorIndexAt(a.x, a.y)]);
      }
    }
  }

  // Aggiorna drops
  for (i = WORLD.drops.length - 1; i >= 0; i--) {
    d = WORLD.drops[i];
    d.life -= dt;
    if (d.life <= 0) { WORLD.drops.splice(i, 1); continue; }
    dx = d.x - player.x; dy = d.y - player.y;
    if (dx * dx + dy * dy < 26 * 26) WORLD.collectDrop(d, player);
  }

  // Aggiorna esplosioni
  for (i = WORLD.explosions.length - 1; i >= 0; i--) {
    ex = WORLD.explosions[i];
    ex.t += dt;
    var alive = false;
    for (var p = 0; p < ex.particles.length; p++) {
      var part = ex.particles[p];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= (1 - 2 * dt);
      part.vy *= (1 - 2 * dt);
      part.life -= dt;
      if (part.life > 0) alive = true;
    }
    if (!alive) WORLD.explosions.splice(i, 1);
  }
};