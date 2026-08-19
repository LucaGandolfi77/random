// DARK ORBIT CLONE - Game
// Loop principale: input, movimento, tiro, mining, collisioni, rendering.

var GAME = {};

GAME.canvas = null;
GAME.ctx = null;
GAME.player = null;     // account attivo
GAME.keys = {};
GAME.lastT = 0;
GAME.fireCd = 0;
GAME.paused = false;
GAME.autoSaveT = 0;
GAME.mouse = { x: 0, y: 0 };
GAME.camX = 0;
GAME.camY = 0;

// Stato mirino / bersaglio
GAME.selectedNpc = null;   // indice NPC selezionato (clic sul nemico)
GAME.attacking = false;    // true se sta attaccando (CTRL toggle)
GAME.moveTarget = null;    // {x,y} destinazione del click-to-move
GAME.mineTarget = null;    // asteroide selezionato per il mining (clic sull'asteroide)
GAME._sectorWarn = '';     // ultimo settore avvisato per il gate di livello
GAME.droneAngle = 0;       // angolo orbitale del drone attorno alla nave
GAME.droneCd = 0;          // cooldown di tiro del drone

// --- Utility ------------------------------------------------------------------
GAME.fmt = function (n) {
  if (!isFinite(n)) return 'INF';
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// --- Input --------------------------------------------------------------------
GAME.initInput = function () {
  var target = window;
  target.addEventListener('keydown', function (e) {
    // durante il login (o con il focus su un campo di testo) i shortcut sono disattivi
    var tgt = e.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
    if (!GAME.player) return;
    // usa sia e.key che e.code per robustezza
    var k = e.key || e.code;
    if (k === 'ArrowUp') k = 'Up';
    else if (k === 'ArrowDown') k = 'Down';
    else if (k === 'ArrowLeft') k = 'Left';
    else if (k === 'ArrowRight') k = 'Right';
    else if (k === ' ') k = 'Space';
    else if (k.length === 1) k = k.toUpperCase();
    GAME.keys[k] = true;
    GAME.keys[e.code] = true;

    if (e.code === 'KeyC') { GAME.paused = true; UI.openShop(); }
    if (e.code === 'KeyM') { GAME.paused = true; UI.openMap(); }
    if (e.code === 'KeyB') { GAME.paused = true; UI.openMissions(); }
    // galaxy gate (G): entra/esci se vicino al portale
    if (e.code === 'KeyG') {
      if (GAME.isInGate()) GAME.exitGate();
      else GAME.enterGate();
    }
    if (k === 'Space') e.preventDefault();
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || k === 'Control') {
      GAME.toggleAttack();
    }
    // munizioni 1-4
    if (k === '1') GAME.setAmmo('red');
    if (k === '2') GAME.setAmmo('blue');
    if (k === '3') GAME.setAmmo('green');
    if (k === '4') GAME.setAmmo('white');
    // configurazione nave (V)
    if (k === 'V' || e.code === 'KeyV') GAME.toggleConfig();
    // ESC: deseleziona bersaglio e annulla il mining
    if (e.code === 'Escape') GAME.clearTarget();
    if (k === 'Up' || k === 'Down' || k === 'Left' || k === 'Right') e.preventDefault();
  });
  target.addEventListener('keyup', function (e) {
    var tgt = e.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
    if (!GAME.player) return;
    var k = e.key || e.code;
    if (k === 'ArrowUp') k = 'Up';
    else if (k === 'ArrowDown') k = 'Down';
    else if (k === 'ArrowLeft') k = 'Left';
    else if (k === 'ArrowRight') k = 'Right';
    else if (k === ' ') k = 'Space';
    else if (k.length === 1) k = k.toUpperCase();
    GAME.keys[k] = false;
    GAME.keys[e.code] = false;
  });
  GAME.canvas.addEventListener('mousemove', function (e) {
    var r = GAME.canvas.getBoundingClientRect();
    GAME.mouse.x = e.clientX - r.left;
    GAME.mouse.y = e.clientY - r.top;
  });
  // click-to-move sul campo di gioco
  GAME.canvas.addEventListener('click', function (e) {
    var r = GAME.canvas.getBoundingClientRect();
    var sx = e.clientX - r.left, sy = e.clientY - r.top;
    GAME.handleCanvasClick(sx, sy);
  });
};

// Click sul campo: asteroide = mining manuale, NPC = selezione, altrimenti sposta la nave
GAME.handleCanvasClick = function (sx, sy) {
  var wx = sx + GAME.camX, wy = sy + GAME.camY;
  var hit = WORLD.npcAt(wx, wy, 20);
  if (hit >= 0) {
    GAME.mineTarget = null;
    GAME.selectNpc(hit);
    UI.toast('Nemico selezionato: ' + WORLD.npcs[hit].name + ' · CTRL per attaccare');
    return;
  }
  var a = WORLD.nearestAsteroid(wx, wy, 26);
  if (a) {
    GAME.selectNpc(null);
    GAME.mineTarget = a;
    GAME.moveTarget = { x: a.x, y: a.y };
    var ore = DATA.ORES[a.ore];
    UI.toast('Mining: ' + ore.name + ' (' + GAME.fmt(GAME.orePrice(a.ore)) + ' CR)');
    return;
  }
  // clic su spazio vuoto: muovi la nave mantenendo bersaglio e attacco attivi
  GAME.moveTarget = { x: wx, y: wy };
};

GAME.selectNpc = function (idx) {
  GAME.selectedNpc = idx;
  GAME.attacking = false;
  UI.updateTarget();
};

// CTRL: alterna attacco sul nemico selezionato
GAME.toggleAttack = function () {
  if (GAME.selectedNpc == null) { UI.toast('Seleziona prima un nemico (clic su di lui)'); return; }
  var n = WORLD.npcs[GAME.selectedNpc];
  if (!n || !n.alive) { UI.toast('Il nemico selezionato non esiste piu'); GAME.selectNpc(null); return; }
  GAME.attacking = !GAME.attacking;
  UI.toast(GAME.attacking ? 'ATTACCO ATTIVO su ' + n.name : 'Attacco fermato', 1200);
};

// Un NPC colpito diventa ostile e allerta i nemici vicini
GAME.provokeNpc = function (idx) {
  var n = WORLD.npcs[idx];
  if (!n || !n.alive) return;
  n.hostile = true;
  var i, o, d;
  for (i = 0; i < WORLD.npcs.length; i++) {
    o = WORLD.npcs[i];
    if (i === idx || !o.alive) continue;
    d = (o.x - n.x) * (o.x - n.x) + (o.y - n.y) * (o.y - n.y);
    if (d < 180 * 180) o.hostile = true;
  }
};

// ESC: deseleziona il bersaglio e annulla mining
GAME.clearTarget = function () {
  GAME.selectNpc(null);
  GAME.mineTarget = null;
  UI.toast('Bersaglio deselezionato', 900);
};

// Munizioni: rosse x1, blu x2, verdi x3, bianche x4
GAME.setAmmo = function (type) {
  var p = GAME.player;
  if (!p) return;
  if (p.ammo === type) return;
  p.ammo = type;
  UI.updateAmmo();
  UI.toast('Munizioni ' + DATA.AMMO[type].name + ' · danno x' + DATA.AMMO[type].mult);
  SAVE.saveAccount(p);
};

// --- Accesso --------------------------------------------------------------------
GAME.enter = function (name) {
  var acc = SAVE.loadAccount(name);
  GAME.player = acc;
  // admin: full wealth
  if (acc.admin) { acc.credits = Infinity; acc.uridium = Infinity; }
  SAVE.ensureFields(acc);
  WORLD.load();
  UI.hideLogin();
  UI.showHud();
  UI.updateAmmo();
  UI.message('Benvenuto, ' + acc.name + (acc.admin ? ' (ADMIN)' : ''));
  if (acc.admin) UI.toast('Account ADMIN: soldi infiniti', 2500);
  UI.updateHud(acc);
  GAME.moveTarget = null;
  GAME.mineTarget = null;
  GAME.selectedNpc = null;
  GAME.attacking = false;
  GAME._gateHint = false;
  GAME.lastT = performance.now();
  if (!GAME._started) {
    GAME._started = true;
    requestAnimationFrame(GAME.loop);
  }
};

// --- Statistiche derivate -------------------------------------------------------
// Le statistiche derivano dalla nave (scafo, velocita', slot) piu' i moduli
// installati negli slot: i laser sommano il danno, scudi/generatori/batterie/
// propulsori si sommano, rate e portata prendono il massimo.
GAME.stats = function (p) {
  var ship = DATA.SHIPS[p.ship];
  var B = DATA.BASE_STATS;
  var dmg = 0, rate = 0, range = 0;
  var maxShield = B.shield, shieldRegen = B.shieldRegen;
  var maxEnergy = B.energy, energyRegen = B.energyRegen;
  var speedBoost = 0;
  var slots = p.slots || [];
  var i, key, mod;
  for (i = 0; i < slots.length; i++) {
    key = slots[i];
    if (!key) continue;
    if ((mod = DATA.LASERS[key])) { dmg += mod.dmg; if (mod.rate > rate) rate = mod.rate; if (mod.range > range) range = mod.range; }
    else if ((mod = DATA.SHIELDS[key])) { maxShield += mod.max; shieldRegen += mod.regen; }
    else if ((mod = DATA.GENERATORS[key])) { energyRegen += mod.regen; }
    else if ((mod = DATA.BATTERIES[key])) { maxEnergy += mod.max; }
    else if ((mod = DATA.ENGINES[key])) { speedBoost += mod.boost; }
  }
  var cfg = DATA.CONFIGS[p.config] || DATA.CONFIGS.assalto;
  var dmgMul = cfg.dmg, spdMul = cfg.speed, shdMul = cfg.shield;
  var now = Date.now();
  if (p.boosters && p.boosters.danno > now) dmgMul *= 1.25;
  if (p.boosters && p.boosters.velocita > now) spdMul *= 1.25;
  if (p.boosters && p.boosters.scudo > now) shdMul *= 1.4;
  return {
    maxHp: ship.maxHp,
    speed: (ship.speed + speedBoost) * spdMul,
    size: ship.size,
    dmg: Math.round(dmg * dmgMul),
    rate: rate || 1,
    range: range || 200,
    maxShield: Math.round(maxShield * shdMul),
    shieldRegen: shieldRegen,
    maxEnergy: maxEnergy,
    energyRegen: energyRegen
  };
};

// --- Booster ---------------------------------------------------------------------
GAME.boosterActive = function (p, key) {
  return !!(p.boosters && p.boosters[key] > Date.now());
};

GAME.buyBooster = function (key) {
  var p = GAME.player;
  var def = DATA.BOOSTERS[key];
  if (!def) return;
  if (!p.admin && p.uridium < def.uridium) { UI.toast('Uridio insufficiente'); return; }
  if (!p.admin) p.uridium -= def.uridium;
  p.boosters[key] = Date.now() + def.dur;
  UI.toast(def.name + ' attivato (' + def.desc + ')');
  UI.renderShop();
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

GAME.boosterTimeLeft = function (p, key) {
  var end = p.boosters ? (p.boosters[key] || 0) : 0;
  var ms = end - Date.now();
  if (ms <= 0) return null;
  var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h + 'h ' + m + 'm';
};

// --- Kit consumabili -----------------------------------------------------------------
GAME.useKit = function (key) {
  var p = GAME.player;
  var def = DATA.KITS[key];
  if (!def) return;
  if (!p.admin && p.credits < def.cost) { UI.toast('Crediti insufficienti'); return; }
  if (!p.admin) p.credits -= def.cost;
  var st = GAME.stats(p);
  if (key === 'repair') { p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.6)); }
  else if (key === 'shield') { p.shieldHp = st.maxShield; }
  else if (key === 'energy') { p.energy = st.maxEnergy; }
  UI.toast(def.name + ' usato');
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

// --- Livelli / EP ----------------------------------------------------------------
// Il livello funziona da "permesso geografico": i settori chiedono un livello minimo.
GAME.epForNextLevel = function (l) { return DATA.EP_FOR_LEVEL(l); };

GAME.gainEp = function (amount) {
  var p = GAME.player;
  p.ep += amount;
  var leveled = false;
  while (p.ep >= GAME.epForNextLevel(p.level)) {
    p.ep -= GAME.epForNextLevel(p.level);
    p.level++;
    leveled = true;
    UI.toast('LIVELLO ' + p.level + '! Nuovi settori sbloccati', 2600);
  }
  if (leveled) {
    UI.updateHud(p);
    SAVE.saveAccount(p);
  }
  return leveled;
};

// --- Honor / Rank ------------------------------------------------------------------
GAME.rankPoints = function (p) {
  return Math.floor((p.ep || 0) + (p.honor || 0) * 50 + p.kills * 200);
};

GAME.rankTitle = function (p) {
  var pts = GAME.rankPoints(p), title = DATA.RANKS[0].title;
  for (var i = 0; i < DATA.RANKS.length; i++) {
    if (pts >= DATA.RANKS[i].pts) title = DATA.RANKS[i].title;
  }
  return title;
};

// L'Honor migliora il prezzo di vendita dei minerali (economia indiretta)
GAME.orePrice = function (oreKey) {
  var p = GAME.player;
  var base = DATA.ORES[oreKey].value;
  var mult = Math.min(2.5, 1 + (p.honor || 0) / 2000);
  return Math.floor(base * mult);
};

// --- Configurazioni nave -------------------------------------------------------------
GAME.toggleConfig = function () {
  var p = GAME.player;
  p.config = (p.config === 'assalto') ? 'velocita' : 'assalto';
  var cfg = DATA.CONFIGS[p.config];
  UI.toast('Configurazione: ' + cfg.name + ' (danno x' + cfg.dmg + ', velocita x' + cfg.speed + ')');
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

// --- Minerali: vendita e raffinazione ---------------------------------------------------
GAME.sellOre = function (oreKey, amount) {
  var p = GAME.player;
  amount = amount || 1;
  if (!p.ores || (p.ores[oreKey] || 0) < amount) { UI.toast('Minerali insufficienti'); return; }
  p.ores[oreKey] -= amount;
  p.credits += GAME.orePrice(oreKey) * amount;
  UI.toast('Venduti ' + amount + ' ' + DATA.ORES[oreKey].name + ' per ' + GAME.fmt(GAME.orePrice(oreKey) * amount) + ' CR');
  UI.renderShop();
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

GAME.canAffordRecipe = function (recipeKey) {
  var p = GAME.player, r = DATA.RECIPES[recipeKey], k;
  if (!r) return false;
  for (k in r.cost) if (r.cost.hasOwnProperty(k)) {
    if (!p.ores || (p.ores[k] || 0) < r.cost[k]) return false;
  }
  return true;
};

GAME.refine = function (recipeKey) {
  var p = GAME.player, r = DATA.RECIPES[recipeKey], k;
  if (!GAME.canAffordRecipe(recipeKey)) { UI.toast('Ingredienti insufficienti'); return; }
  for (k in r.cost) if (r.cost.hasOwnProperty(k)) p.ores[k] -= r.cost[k];
  if (!p.ores[r.out]) p.ores[r.out] = 0;
  p.ores[r.out] += 1;
  UI.toast('Raffinato 1 ' + DATA.ORES[r.out].name);
  UI.renderShop();
  SAVE.saveAccount(p);
};

// --- Skylab (produzione passiva) ---------------------------------------------------------
// Applica la produzione accumulata dal tempo trascorso (anche offline).
// Consuma gli ingredienti della ricetta scelta e produce il minerale raffinato.
GAME.skylabProcess = function (p) {
  if (!p.skylab || !p.skylab.recipe || !DATA.RECIPES[p.skylab.recipe]) return;
  var rate = DATA.SKYLAB[p.skylab.level].rate;
  var now = Date.now();
  var elapsed = (now - (p.skylab.lastTick || now)) / 1000;
  if (elapsed < 1) return;
  p.skylab.lastTick = now;
  var units = Math.floor(elapsed / 3600 * rate);
  var r = DATA.RECIPES[p.skylab.recipe], k, produced = 0;
  for (k = 0; k < units; k++) {
    if (!GAME.canAffordRecipe(p.skylab.recipe)) break;
    for (var ing in r.cost) if (r.cost.hasOwnProperty(ing)) p.ores[ing] -= r.cost[ing];
    if (!p.ores[r.out]) p.ores[r.out] = 0;
    p.ores[r.out] += 1;
    produced++;
  }
  if (produced > 0) {
    UI.toast('Skylab: +' + produced + ' ' + DATA.ORES[r.out].name, 2000);
    UI.updateHud(p);
  }
};

GAME.skylabSetRecipe = function (recipeKey) {
  var p = GAME.player;
  if (!DATA.RECIPES[recipeKey]) return;
  p.skylab.recipe = recipeKey;
  UI.toast('Skylab: produzione ' + DATA.ORES[DATA.RECIPES[recipeKey].out].name);
  UI.renderShop();
  SAVE.saveAccount(p);
};

GAME.skylabUpgrade = function () {
  var p = GAME.player;
  var next = DATA.SKYLAB[p.skylab.level + 1];
  if (!next) { UI.toast('Skylab al livello massimo'); return; }
  if (p.level < next.reqLevel) { UI.toast('Richiesto livello ' + next.reqLevel); return; }
  if (!p.admin && p.credits < next.cost) { UI.toast('Crediti insufficienti'); return; }
  if (!p.admin) p.credits -= next.cost;
  p.skylab.level++;
  UI.toast(next.name + ' attivato (' + next.rate + ' unita/h)');
  UI.renderShop();
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

// --- Missioni -----------------------------------------------------------------
// Bacheca con 3 missioni proporzionate al livello; una attiva alla volta.
GAME.generateMission = function (level) {
  var pool = DATA.MISSION_POOL;
  var tmpl = pool[Math.floor(Math.random() * pool.length)];
  var m = {
    type: tmpl.type,
    need: 0, have: 0,
    label: '', reward: { credits: 0, uridium: 0, ep: 0 },
    claimable: false, secs: 0
  };
  var base = 120 + level * 140;
  m.reward.credits = Math.round(base * (1 + Math.random() * 0.5));
  m.reward.uridium = Math.max(1, Math.round((1 + level * 0.35) * (0.6 + Math.random())));
  m.reward.ep = Math.round(level * (220 + Math.random() * 180));
  var low, high;

  if (tmpl.type === 'kill') {
    low = tmpl.gen.n[0] + Math.floor(level / 4);
    high = tmpl.gen.n[1] + Math.floor(level / 3);
    m.need = low + Math.floor(Math.random() * (high - low + 1));
    if (tmpl.gen.tier) {
      m.tier = tmpl.gen.tier;
      m.label = 'Abbatti ' + m.need + ' nemici di fascia ' + (m.tier[0] + 1) + '-' + (m.tier[1] + 1);
    } else {
      m.label = 'Abbatti ' + m.need + ' nemici';
    }
  } else if (tmpl.type === 'collect') {
    low = tmpl.gen.n[0] + Math.floor(level / 5);
    high = tmpl.gen.n[1] + Math.floor(level / 4);
    m.need = low + Math.floor(Math.random() * (high - low + 1));
    m.oreTier = tmpl.gen.oreTier;
    m.label = 'Raccogli ' + m.need + ' minerali di fascia ' + tmpl.gen.oreTier;
  } else if (tmpl.type === 'reach') {
    m.sector = Math.floor(Math.random() * DATA.SECTORS.length);
    m.need = 1; m.have = 0;
    m.label = 'Raggiungi il ' + DATA.SECTORS[m.sector].name;
    m.reward.credits = Math.round(base * 0.6);
    m.reward.ep = Math.round(m.reward.ep * 0.5);
  } else if (tmpl.type === 'survive') {
    m.secs = tmpl.gen.secs[0] + Math.floor(Math.random() * (tmpl.gen.secs[1] - tmpl.gen.secs[0])) + Math.floor(level * 1.5);
    m.need = m.secs;
    m.label = 'Sopravvivi ' + m.secs + ' secondi in combattimento';
  }
  return m;
};

GAME.refreshMissionBoard = function () {
  var p = GAME.player;
  var board = [];
  for (var i = 0; i < 3; i++) board.push(GAME.generateMission(p.level));
  p.missionBoard = board;
  SAVE.saveAccount(p);
};

GAME.acceptMission = function (idx) {
  var p = GAME.player;
  if (!p.missionBoard || !p.missionBoard[idx]) return;
  if (p.mission) { UI.toast('Hai gia una missione attiva'); return; }
  var m = p.missionBoard[idx];
  m.have = 0; m.secs = 0; m.claimable = false;
  p.mission = m;
  p.missionBoard = null;
  UI.toast('Missione accettata: ' + m.label);
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

GAME.claimMission = function () {
  var p = GAME.player;
  var m = p.mission;
  if (!m) return;
  if (!m.claimable) { UI.toast('Missione non completata'); return; }
  if (!p.admin) {
    p.credits += m.reward.credits;
    p.uridium += m.reward.uridium;
  }
  var leveled = GAME.gainEp(m.reward.ep);
  UI.toast('Missione completata: +' + m.reward.credits + ' CR · +' + m.reward.uridium + ' UR · +' + m.reward.ep + ' EP');
  p.mission = null;
  GAME.refreshMissionBoard();
  UI.renderMissions();
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

// Tracciamento missioni "raccogli"
GAME.trackCollect = function (oreKey, amount) {
  var p = GAME.player;
  var m = p.mission;
  if (!m || m.claimable || m.type !== 'collect') return;
  var ore = DATA.ORES[oreKey];
  if (m.oreTier !== ore.tier) return;
  m.have += amount;
  if (m.have >= m.need) { m.claimable = true; UI.toast('Missione completata! B per riscuotere'); }
  UI.updateHud(p);
};

// Tracciamento missioni "abbatti"
GAME.trackKill = function (npcType) {
  var p = GAME.player;
  var m = p.mission;
  if (!m || m.claimable || m.type !== 'kill') return;
  if (m.tier && !(npcType >= m.tier[0] && npcType <= m.tier[1])) return;
  m.have++;
  if (m.have >= m.need) { m.claimable = true; UI.toast('Missione completata! B per riscuotere'); }
  UI.updateHud(p);
};

// Tracciamento missioni "raggiungi" e "sopravvivi" (chiamata nel loop)
GAME.trackMissionState = function (dt) {
  var p = GAME.player;
  var m = p.mission;
  if (!m || m.claimable) return;
  if (m.type === 'reach') {
    var idx = WORLD.sectorIndexAt(p.x, p.y);
    if (idx === m.sector) { m.claimable = true; UI.toast('Missione completata! B per riscuotere'); UI.updateHud(p); }
  } else if (m.type === 'survive') {
    if (GAME.inCombat()) {
      m.secs -= dt;
      if (m.secs <= 0) { m.secs = 0; m.claimable = true; UI.toast('Missione completata! B per riscuotere'); UI.updateHud(p); }
    }
  }
};

// C'e' un nemico che ci insegue?
GAME.inCombat = function () {
  var p = GAME.player, i, n, dx, dy;
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) continue;
    dx = n.x - p.x; dy = n.y - p.y;
    if (dx * dx + dy * dy < (n.aggro * 1.2) * (n.aggro * 1.2)) return true;
  }
  return false;
};

// --- Droni ---------------------------------------------------------------------
GAME.droneFire = function (dt) {
  var p = GAME.player;
  if (!p.drone || !DATA.DRONES[p.drone]) return;
  var def = DATA.DRONES[p.drone];
  GAME.droneCd -= dt;
  GAME.droneAngle += dt * 2.2;
  var target = null;

  if (GAME.attacking && GAME.selectedNpc != null) {
    var n = WORLD.npcs[GAME.selectedNpc];
    if (n && n.alive) target = n;
  } else if (GAME.mineTarget && GAME.mineTarget.alive) {
    target = GAME.mineTarget;
  }
  if (!target) return;
  var dx = target.x - p.x, dy = target.y - p.y;
  if (dx * dx + dy * dy > def.range * def.range) return;
  if (GAME.droneCd > 0) return;
  GAME.droneCd = 1 / def.rate;
  var angle = Math.atan2(dy, dx);
  var ox = Math.cos(GAME.droneAngle) * 22, oy = Math.sin(GAME.droneAngle) * 22;
  var isAst = !!GAME.mineTarget && GAME.mineTarget === target;
  WORLD.fireLaser(p.x + ox, p.y + oy, angle, def.dmg, def.color, 'drone', isAst);
};

// Il drone raccoglie i drop nelle vicinanze
GAME.droneCollect = function () {
  var p = GAME.player;
  if (!p.drone) return;
  var radius = 150;
  var i, d, dx, dy;
  for (i = WORLD.drops.length - 1; i >= 0; i--) {
    d = WORLD.drops[i];
    dx = d.x - p.x; dy = d.y - p.y;
    if (dx * dx + dy * dy < radius * radius) WORLD.collectDrop(d, p);
  }
};

// --- Galaxy Gate ------------------------------------------------------------------
GAME.isInGate = function () {
  return !!(GAME.player && GAME.player.gate && GAME.player.gate.inside);
};

GAME.enterGate = function () {
  var p = GAME.player;
  if (p.level < DATA.GATE.reqLevel) { UI.toast('Richiesto livello ' + DATA.GATE.reqLevel + ' per il Galaxy Gate'); return; }
  if (GAME.isInGate()) return;
  if (!p.gate) p.gate = { wave: 1 };
  p.gate.inside = true;
  var c = DATA.GATE.portal;
  p.x = c.x; p.y = c.y;
  GAME.moveTarget = null;
  GAME.mineTarget = null;
  GAME.selectNpc(null);
  var tiers = DATA.GATE_TIERS(p.level);
  WORLD.gateClear();
  WORLD.gateSpawnWave(2 + p.gate.wave, tiers[0], tiers[1]);
  UI.message('GALAXY GATE · ONDA ' + p.gate.wave + '/' + (DATA.GATE.waves + 1), 2200);
  SAVE.saveAccount(p);
};

GAME.exitGate = function () {
  var p = GAME.player;
  if (!GAME.isInGate()) return;
  WORLD.gateClear();
  p.gate = null;
  p.x = DATA.GATE.portal.x;
  p.y = DATA.GATE.portal.y;
  GAME.moveTarget = null;
  UI.toast('Uscito dal Galaxy Gate');
  SAVE.saveAccount(p);
};

GAME.completeGate = function () {
  var p = GAME.player;
  var r = DATA.GATE_REWARD(p.level);
  if (!p.admin) {
    p.credits += r.credits;
    p.uridium += r.uridium;
  }
  p.honor += r.honor;
  p.gateParts = (p.gateParts || 0) + r.parts;
  GAME.gainEp(r.ep);
  UI.message('GALAXY GATE COMPLETATO! +' + r.parts + ' PARTI', 2600);
  UI.toast('+' + GAME.fmt(r.credits) + ' CR · +' + r.uridium + ' UR · +' + r.ep + ' EP · +' + r.honor + ' ONORE · +' + r.parts + ' parti');
  WORLD.gateClear();
  p.gate = null;
  p.x = DATA.GATE.portal.x;
  p.y = DATA.GATE.portal.y;
  GAME.moveTarget = null;
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

GAME.killGateNpc = function (n) {
  n.alive = false;
  var p = GAME.player;
  WORLD.spawnDrop(n.x, n.y, 'credits', n.isBoss ? DATA.GATE.boss.reward : DATA.NPCS[n.type].reward);
  if (n.isBoss || Math.random() < (n.isBoss ? 1 : 0.2)) WORLD.spawnDrop(n.x, n.y, 'uridium', n.isBoss ? 6 : 1 + Math.floor(Math.random() * 2));
  if (!n.isBoss) {
    var ore = WORLD.pickOre(DATA.SECTORS[3]);
    WORLD.spawnDrop(n.x, n.y, 'ore', DATA.ASTEROID_ORE_AMOUNT, ore);
  }
  p.kills++;
  p.honor = (p.honor || 0) + n.honor;
  GAME.gainEp(n.ep);
  GAME.trackKill(n.type);
  WORLD.spawnExplosion(n.x, n.y, n.color, n.isBoss ? 30 : 18);
};

// Gestione ondate del gate (chiamata nel loop quando si e' dentro)
GAME.gateUpdate = function () {
  var p = GAME.player;
  var g = p.gate;
  if (!g || !g.inside) return;
  var A = DATA.GATE.arena;
  // confina nella arena
  p.x = Math.max(A.x0 + 20, Math.min(A.x1 - 20, p.x));
  p.y = Math.max(A.y0 + 20, Math.min(A.y1 - 20, p.y));
  if (WORLD.gateAliveCount() > 0) return;
  // nessun nemico vivo: ondata successiva, boss o fine
  var tiers = DATA.GATE_TIERS(p.level);
  if (g.wave < DATA.GATE.waves) {
    g.wave++;
    WORLD.gateSpawnWave(2 + g.wave, tiers[0], tiers[1]);
    UI.message('GALAXY GATE · ONDA ' + g.wave + '/' + (DATA.GATE.waves + 1), 1800);
  } else if (g.wave === DATA.GATE.waves) {
    g.wave++;
    WORLD.gateSpawnBoss();
    UI.message('BOSS: ' + DATA.GATE.boss.name + '!', 2200);
  } else {
    GAME.completeGate();
    return;
  }
  SAVE.saveAccount(p);
};
// --- Acquisto -------------------------------------------------------------------
GAME.buy = function (type, key) {
  var p = GAME.player;
  var admin = p.admin;
  var def;
  switch (type) {
    case 'ship': def = DATA.SHIPS[key]; break;
    case 'laser': def = DATA.LASERS[key]; break;
    case 'shield': def = DATA.SHIELDS[key]; break;
    case 'gen': def = DATA.GENERATORS[key]; break;
    case 'batt': def = DATA.BATTERIES[key]; break;
    case 'eng': def = DATA.ENGINES[key]; break;
    case 'drone': def = DATA.DRONES[key]; break;
  }
  if (!def) return;
  if (!admin && (p.credits < def.cost || p.uridium < def.uridium)) {
    UI.toast('Non hai abbastanza risorse');
    return;
  }
  if (!admin) { p.credits -= def.cost; p.uridium -= def.uridium; }

  if (type === 'ship') {
    p.ship = key;
    if (!p.owned.ship) p.owned.ship = [];
    if (p.owned.ship.indexOf(key) < 0) p.owned.ship.push(key);
    SAVE.resizeSlots(p);
    var st = GAME.stats(p);
    p.hp = st.maxHp; p.shieldHp = st.maxShield; p.energy = st.maxEnergy;
  } else if (type === 'drone') {
    // i droni si equipaggiano subito (come prima)
    p.drone = key;
    UI.toast(def.name + ' equipaggiato!');
    UI.renderShop();
  } else {
    // moduli: si aggiungono ai posseduti; vanno installati nel tab NAVE
    if (!p.owned[type]) p.owned[type] = [];
    if (p.owned[type].indexOf(key) < 0) p.owned[type].push(key);
    UI.toast(def.name + ' acquistato! Installalo nel tab NAVE');
    UI.renderShop();
  }
  UI.updateHud(p);
  SAVE.saveAccount(p);
};

// Installa (o rimuove) un modulo in uno slot della nave
GAME.installModule = function (slotIdx, moduleKey) {
  var p = GAME.player;
  var n = DATA.SHIPS[p.ship].slots;
  if (slotIdx < 0 || slotIdx >= n) return;
  if (!Array.isArray(p.slots)) p.slots = [];
  p.slots[slotIdx] = moduleKey || '';
  // la ricarica dello scudo non cambia, ma aggiorna max
  var st = GAME.stats(p);
  if (p.shieldHp > st.maxShield) p.shieldHp = st.maxShield;
  if (p.energy > st.maxEnergy) p.energy = st.maxEnergy;
  UI.updateHud(p);
  UI.renderShop();
  SAVE.saveAccount(p);
};

// --- Danno al giocatore ------------------------------------------------------------
GAME.hitPlayer = function (dmg) {
  var p = GAME.player;
  var st = GAME.stats(p);
  // scudo prima
  var rem = dmg;
  if (p.shieldHp > 0) {
    var sh = Math.min(p.shieldHp, rem);
    p.shieldHp -= sh;
    rem -= sh;
  }
  if (rem > 0) {
    p.hp -= rem;
    if (p.hp <= 0) {
      p.hp = 0;
      GAME.playerDie();
      return true;
    }
  }
  return false;
};

GAME.playerDie = function () {
  var p = GAME.player;
  var st = GAME.stats(p);
  UI.toast('NAVE DISTRUTTA! Respawn alla base...');
  if (!p.admin) {
    // perdi il 20% dei crediti
    p.credits = Math.floor(p.credits * 0.8);
  }
  // se era dentro il gate, esce e perde i progressi
  if (GAME.isInGate()) {
    WORLD.gateClear();
    p.gate = null;
  }
  p.x = DATA.BASE.x;
  p.y = DATA.BASE.y;
  p.hp = st.maxHp;
  p.shieldHp = st.maxShield;
  p.energy = st.maxEnergy;
  GAME.moveTarget = null;
  SAVE.saveAccount(p);
  UI.updateHud(p);
};

// --- Tiro --------------------------------------------------------------------------
GAME.ammoMult = function () {
  var p = GAME.player;
  if (!p || !p.ammo) return 1;
  return DATA.AMMO[p.ammo] ? DATA.AMMO[p.ammo].mult : 1;
};
GAME.ammoColor = function () {
  var p = GAME.player;
  if (!p || !p.ammo) return '#4fd6ff';
  return DATA.AMMO[p.ammo] ? DATA.AMMO[p.ammo].color : '#4fd6ff';
};

// Spara SOLO contro il nemico selezionato (se l'attacco e' attivo) oppure
// contro l'asteroide scelto col clic (mining manuale). Niente auto-mining.
GAME.fire = function () {
  var p = GAME.player;
  var st = GAME.stats(p);
  var mult = GAME.ammoMult();
  var dmg = Math.round(st.dmg * mult);

  if (GAME.attacking && GAME.selectedNpc != null) {
    var n = WORLD.npcs[GAME.selectedNpc];
    if (n && n.alive) {
      var dx = n.x - p.x, dy = n.y - p.y;
      if (dx * dx + dy * dy < st.range * st.range) {
        var angle = Math.atan2(dy, dx);
        WORLD.fireLaser(p.x, p.y, angle, dmg, GAME.ammoColor(), 'player', false);
      }
    } else {
      GAME.selectNpc(null);
    }
    return;
  }

  // mining manuale: spara solo all'asteroide cliccato, se e' dentro gittata
  if (GAME.mineTarget) {
    var a = GAME.mineTarget;
    if (!a.alive) { GAME.mineTarget = null; return; }
    var ax = a.x - p.x, ay = a.y - p.y;
    if (ax * ax + ay * ay < st.range * st.range) {
      var ang = Math.atan2(ay, ax);
      WORLD.fireLaser(p.x, p.y, ang, dmg, GAME.ammoColor(), 'player', true);
    }
  }
};

// --- Morte NPC ------------------------------------------------------------------------
GAME.killNpc = function (n) {
  n.alive = false;
  n.respawnT = 12 + Math.random() * 8;
  var npc = DATA.NPCS[n.type];
  var p = GAME.player;
  // drop crediti
  WORLD.spawnDrop(n.x, n.y, 'credits', npc.reward);
  // drop uridio
  if (Math.random() < npc.uridiumChance) WORLD.spawnDrop(n.x, n.y, 'uridium', 1 + Math.floor(Math.random() * 3));
  p.kills++;
  // EP + Honor (sistema di progressione e permessi)
  p.honor = (p.honor || 0) + npc.honor;
  var leveled = GAME.gainEp(npc.ep);
  GAME.trackKill(n.type);
  WORLD.spawnExplosion(n.x, n.y, npc.color, 18);
  UI.message('+' + npc.reward + ' CR · +' + npc.ep + ' EP · +' + npc.honor + ' ONORE', 1200);
  if (GAME.selectedNpc != null && WORLD.npcs[GAME.selectedNpc] === n) {
    GAME.selectNpc(null);
  }
};

// --- Mining asteroide --------------------------------------------------------------------
// Ogni asteroide contiene un minerale (ore); distruggendolo si raccolgono le risorse.
GAME.mineAsteroid = function (a, dmg) {
  var p = GAME.player;
  a.res -= dmg;
  if (a.res <= 0) {
    a.alive = false;
    a.respawnT = 20 + Math.random() * 15;
    var amount = DATA.ASTEROID_ORE_AMOUNT;
    if (GAME.boosterActive(p, 'mining')) amount += Math.ceil(amount * 0.5);
    WORLD.spawnDrop(a.x, a.y, 'ore', amount, a.ore);
    if (a.uri) WORLD.spawnDrop(a.x, a.y, 'uridium', 1);
    WORLD.spawnExplosion(a.x, a.y, DATA.ORES[a.ore].color, 12);
    UI.message('+' + amount + ' ' + DATA.ORES[a.ore].name, 900);
    if (GAME.mineTarget === a) GAME.mineTarget = null;
  }
};

// --- Collisione laser del giocatore ------------------------------------------------------------
GAME.hitLaser = function (l) {
  var i, n, dx, dy;
  if (l.isAst) {
    for (i = 0; i < WORLD.asteroids.length; i++) {
      n = WORLD.asteroids[i];
      if (!n.alive) continue;
      dx = l.x - n.x; dy = l.y - n.y;
      if (dx * dx + dy * dy < (n.r + 4) * (n.r + 4)) {
        GAME.mineAsteroid(n, l.dmg);
        return true;
      }
    }
    return false;
  }
  // laser contro nemici del mondo
  for (i = 0; i < WORLD.npcs.length; i++) {
    n = WORLD.npcs[i];
    if (!n.alive) continue;
    dx = l.x - n.x; dy = l.y - n.y;
    if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) {
      n.hp -= l.dmg;
      GAME.provokeNpc(i);
      if (n.hp <= 0) GAME.killNpc(n);
      return true;
    }
  }
  // laser contro nemici del gate
  for (i = 0; i < WORLD.gateNpcs.length; i++) {
    n = WORLD.gateNpcs[i];
    if (!n.alive) continue;
    dx = l.x - n.x; dy = l.y - n.y;
    if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) {
      n.hp -= l.dmg;
      if (n.hp <= 0) GAME.killGateNpc(n);
      return true;
    }
  }
  return false;
};

// --- Loop ------------------------------------------------------------------------------
GAME.loop = function (t) {
  var dt = Math.min(0.05, (t - GAME.lastT) / 1000);
  GAME.lastT = t;

  if (!GAME.paused && GAME.player) {
    GAME.update(dt);
  }
  GAME.render();
  UI.drawMinimap();
  UI.updateTarget();

  // autosalvataggio
  GAME.autoSaveT += dt;
  if (GAME.autoSaveT > 10) {
    GAME.autoSaveT = 0;
    if (GAME.player) { SAVE.saveAccount(GAME.player); SAVE.saveWorld(WORLD.galaxy); }
  }

  requestAnimationFrame(GAME.loop);
};

GAME.isManualThrust = function () {
  var k = GAME.keys;
  return !!(k['W'] || k['ArrowUp'] || k['Up'] || k['KeyW'] ||
            k['S'] || k['ArrowDown'] || k['Down'] || k['KeyS'] ||
            k['A'] || k['ArrowLeft'] || k['Left'] || k['KeyA'] ||
            k['D'] || k['ArrowRight'] || k['Right'] || k['KeyD']);
};

GAME.update = function (dt) {
  var p = GAME.player;
  var st = GAME.stats(p);
  var ax = 0, ay = 0;
  var thrusting = false;

  // vx/vy possono essere undefined (account nuovi): inizializza
  if (!p.vx) p.vx = 0;
  if (!p.vy) p.vy = 0;

  var manual = GAME.isManualThrust();
  var k = GAME.keys;

  if (manual) {
    // movimento manuale annulla la destinazione cliccata
    GAME.moveTarget = null;
    if (k['W'] || k['ArrowUp'] || k['Up'] || k['KeyW']) { ay -= 1; thrusting = true; }
    if (k['S'] || k['ArrowDown'] || k['Down'] || k['KeyS']) { ay += 1; thrusting = true; }
    if (k['A'] || k['ArrowLeft'] || k['Left'] || k['KeyA']) { ax -= 1; thrusting = true; }
    if (k['D'] || k['ArrowRight'] || k['Right'] || k['KeyD']) { ax += 1; thrusting = true; }
    var mag = Math.sqrt(ax * ax + ay * ay);
    ax /= mag; ay /= mag;
    // risposta immediata: accelerazione forte, inerzia breve
    p.vx += ax * st.speed * dt * 10;
    p.vy += ay * st.speed * dt * 10;
    p.angle = Math.atan2(ay, ax);
  } else if (GAME.moveTarget) {
    // click-to-move: vola verso la destinazione
    var dx = GAME.moveTarget.x - p.x, dy = GAME.moveTarget.y - p.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 22) {
      GAME.moveTarget = null;
    } else {
      thrusting = true;
      var dirx = dx / dist, diry = dy / dist;
      p.vx += dirx * st.speed * dt * 10;
      p.vy += diry * st.speed * dt * 10;
      p.angle = Math.atan2(diry, dirx);
    }
  }

  // attrito
  p.vx *= (1 - 2.5 * dt);
  p.vy *= (1 - 2.5 * dt);

  // limita velocita'
  var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  var maxSpd = st.speed;
  if (spd > maxSpd) { p.vx = p.vx / spd * maxSpd; p.vy = p.vy / spd * maxSpd; }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(30, Math.min(DATA.WORLD_W - 30, p.x));
  p.y = Math.max(30, Math.min(DATA.WORLD_H - 30, p.y));

  // rigenerazione scudo + energia
  p.shieldHp = Math.min(st.maxShield, p.shieldHp + st.shieldRegen * dt);
  p.energy = Math.min(st.maxEnergy, p.energy + st.energyRegen * dt);

  // Skylab: produzione passiva ogni 5 secondi
  GAME.skylabT = (GAME.skylabT || 0) + dt;
  if (GAME.skylabT > 5) {
    GAME.skylabT = 0;
    GAME.skylabProcess(p);
  }

  // tiro automatico
  GAME.fireCd -= dt;
  if (GAME.fireCd <= 0) {
    GAME.fireCd = 1 / st.rate;
    GAME.fire();
  }

  // drone: tiro assistito + raccolta automatica
  GAME.droneFire(dt);
  GAME.droneCollect();

  // missioni: raggiungi/sopravvivi
  GAME.trackMissionState(dt);

  // galaxy gate: ondate (se dentro) + hint vicino al portale
  GAME.gateUpdate();
  if (!GAME.isInGate()) {
    var gc = DATA.GATE.portal;
    var gdx = gc.x - p.x, gdy = gc.y - p.y;
    if (gdx * gdx + gdy * gdy < 200 * 200 && !GAME._gateHint) {
      GAME._gateHint = true;
      if (p.level >= DATA.GATE.reqLevel) UI.toast('Premi G per entrare nel Galaxy Gate', 3000);
      else UI.toast('Galaxy Gate: richiesto livello ' + DATA.GATE.reqLevel, 3000);
    }
    if (gdx * gdx + gdy * gdy >= 260 * 260) GAME._gateHint = false;
  }

  // aggiorna mondo
  WORLD.update(dt, p);

  // aggiorna laser giocatore (collisioni)
  var i, l;
  for (i = WORLD.lasers.length - 1; i >= 0; i--) {
    l = WORLD.lasers[i];
    if (l.owner === 'player' || l.owner === 'drone') {
      if (GAME.hitLaser(l)) WORLD.lasers.splice(i, 1);
    }
  }

  // settore (sistema "livello = permesso geografico")
  var secIdx = WORLD.sectorIndexAt(p.x, p.y);
  var sec = DATA.SECTORS[secIdx];
  UI.setSector(sec.name + ' · LIVELLO ' + sec.reqLevel);
  if (p.level < sec.reqLevel && GAME._sectorWarn !== sec.name) {
    GAME._sectorWarn = sec.name;
    UI.toast('Attenzione: ' + sec.name + ' richiede livello ' + sec.reqLevel + ' (sei ' + p.level + ')', 2600);
  }
  if (GAME._sectorWarn === sec.name && p.level >= sec.reqLevel) GAME._sectorWarn = '';

  UI.updateHud(p);
};

// --- Rendering ---------------------------------------------------------------------------
GAME.render = function () {
  var ctx = GAME.ctx;
  var cv = GAME.canvas;
  var W = cv.width = cv.clientWidth;
  var H = cv.height = cv.clientHeight;
  var p = GAME.player;

  // camera centrata sul giocatore
  var camX = p.x - W / 2;
  var camY = p.y - H / 2;
  camX = Math.max(0, Math.min(DATA.WORLD_W - W, camX));
  camY = Math.max(0, Math.min(DATA.WORLD_H - H, camY));
  GAME.camX = camX;
  GAME.camY = camY;

  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, W, H);

  // stelle
  var i, s;
  ctx.fillStyle = '#ffffff';
  for (i = 0; i < SPRITE.stars.length; i++) {
    s = SPRITE.stars[i];
    var sx = s.x - camX, sy = s.y - camY;
    if (sx < -5 || sx > W + 5 || sy < -5 || sy > H + 5) continue;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // base
  var bx = DATA.BASE.x - camX, by = DATA.BASE.y - camY;
  if (bx > -60 && bx < W + 60 && by > -60 && by < H + 60) {
    ctx.beginPath();
    ctx.arc(bx, by, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(47,211,255,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1a3a52';
    ctx.fill();
    ctx.strokeStyle = '#2fd3ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2fd3ff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', bx, by + 3);
  }

  // portale Galaxy Gate
  var pc = DATA.GATE.portal;
  var ppx = pc.x - camX, ppy = pc.y - camY;
  if (ppx > -80 && ppx < W + 80 && ppy > -80 && ppy < H + 80) {
    var pulse = 1 + 0.15 * Math.sin(Date.now() / 300);
    ctx.beginPath();
    ctx.arc(ppx, ppy, 30 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(159,107,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#9f6bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ppx, ppy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#9f6bff';
    ctx.fill();
    ctx.fillStyle = '#c9a6ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GALAXY GATE', ppx, ppy - 36);
  }

  // confine arena (quando dentro)
  if (GAME.isInGate()) {
    var A = DATA.GATE.arena;
    ctx.strokeStyle = 'rgba(159,107,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(A.x0 - camX, A.y0 - camY, A.x1 - A.x0, A.y1 - A.y0);
    ctx.setLineDash([]);
  }

  // asteroidi
  for (i = 0; i < WORLD.asteroids.length; i++) {
    var a = WORLD.asteroids[i];
    if (!a.alive) continue;
    var asx = a.x - camX, asy = a.y - camY;
    if (asx < -60 || asx > W + 60 || asy < -60 || asy > H + 60) continue;
    SPRITE.drawAsteroid(ctx, asx, asy, a.r, DATA.ORES[a.ore].color);
  }

  // NPC
  for (i = 0; i < WORLD.npcs.length; i++) {
    var n = WORLD.npcs[i];
    if (!n.alive) continue;
    var nx = n.x - camX, ny = n.y - camY;
    if (nx < -60 || nx > W + 60 || ny < -60 || ny > H + 60) continue;
    SPRITE.drawShip(ctx, nx, ny, n.angle, n.color, n.size, true);
    // barra hp
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(nx - n.size, ny - n.size - 8, n.size * 2, 3);
    ctx.fillStyle = '#e8546a';
    ctx.fillRect(nx - n.size, ny - n.size - 8, n.size * 2 * (n.hp / n.maxHp), 3);
    // anello di selezione
    if (GAME.selectedNpc === i) {
      ctx.beginPath();
      ctx.arc(nx, ny, n.size + 7, 0, Math.PI * 2);
      ctx.strokeStyle = GAME.attacking ? '#ff2d4d' : '#2fd3ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // NPC del Galaxy Gate
  for (i = 0; i < WORLD.gateNpcs.length; i++) {
    var gn = WORLD.gateNpcs[i];
    if (!gn.alive) continue;
    var gx = gn.x - camX, gy = gn.y - camY;
    if (gx < -60 || gx > W + 60 || gy < -60 || gy > H + 60) continue;
    SPRITE.drawShip(ctx, gx, gy, gn.angle, gn.color, gn.size, true);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(gx - gn.size, gy - gn.size - 8, gn.size * 2, 3);
    ctx.fillStyle = '#ff2d4d';
    ctx.fillRect(gx - gn.size, gy - gn.size - 8, gn.size * 2 * (gn.hp / gn.maxHp), 3);
    if (gn.isBoss) {
      ctx.beginPath();
      ctx.arc(gx, gy, gn.size + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,45,77,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // destinazione click-to-move
  if (GAME.moveTarget) {
    var mx = GAME.moveTarget.x - camX, my = GAME.moveTarget.y - camY;
    if (mx > -30 && mx < W + 30 && my > -30 && my < H + 30) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 12, my); ctx.lineTo(mx - 4, my);
      ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 12, my);
      ctx.moveTo(mx, my - 12); ctx.lineTo(mx, my - 4);
      ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 12);
      ctx.stroke();
    }
  }

  // drops
  for (i = 0; i < WORLD.drops.length; i++) {
    var d = WORLD.drops[i];
    var dx2 = d.x - camX, dy2 = d.y - camY;
    if (dx2 < -40 || dx2 > W + 40 || dy2 < -40 || dy2 > H + 40) continue;
    SPRITE.drawDrop(ctx, d);
  }

  // laser
  for (i = 0; i < WORLD.lasers.length; i++) {
    var l = WORLD.lasers[i];
    var ang = Math.atan2(l.vy, l.vx);
    var lx = l.x - camX, ly = l.y - camY;
    SPRITE.drawLaser(ctx, lx, ly, ang, l.color, 12);
  }

  // esplosioni
  for (i = 0; i < WORLD.explosions.length; i++) {
    var ex = WORLD.explosions[i];
    ctx.save();
    ctx.translate(-camX, -camY);
    SPRITE.drawExplosion(ctx, ex);
    ctx.restore();
  }

  // giocatore
  var pcolor = p.admin ? SPRITE.adminColor : DATA.SHIPS[p.ship].color;
  SPRITE.drawShip(ctx, W / 2, H / 2, p.angle, pcolor, DATA.SHIPS[p.ship].size, thrustingNow());

  // drone (orbita attorno alla nave)
  if (p.drone && DATA.DRONES[p.drone]) {
    var dDef = DATA.DRONES[p.drone];
    var dOx = Math.cos(GAME.droneAngle) * 24, dOy = Math.sin(GAME.droneAngle) * 24;
    SPRITE.drawShip(ctx, W / 2 + dOx, H / 2 + dOy, p.angle + GAME.droneAngle, dDef.color, 7, true);
    ctx.beginPath();
    ctx.arc(W / 2 + dOx, H / 2 + dOy, 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // gittata del giocatore (visibile quando ha un bersaglio selezionato)
  var pRange = GAME.stats(p).range;
  if (GAME.selectedNpc != null) {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, pRange, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,214,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // gittata dell'alieno selezionato
  if (GAME.selectedNpc != null) {
    var sn = WORLD.npcs[GAME.selectedNpc];
    if (sn && sn.alive) {
      var snx = sn.x - camX, sny = sn.y - camY;
      ctx.beginPath();
      ctx.arc(snx, sny, sn.range, 0, Math.PI * 2);
      ctx.strokeStyle = GAME.attacking ? 'rgba(255,45,77,0.6)' : 'rgba(255,45,77,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
};

function thrustingNow() {
  return GAME.isManualThrust() || !!GAME.moveTarget;
}

// --- Init ------------------------------------------------------------------------------
GAME.init = function () {
  GAME.canvas = document.getElementById('game');
  GAME.ctx = GAME.canvas.getContext('2d');
  GAME.initInput();
  UI.init();
  UI.showLogin();
};