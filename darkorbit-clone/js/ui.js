// DARK ORBIT CLONE - UI
// Login, HUD, negozio e mappa. Manipola il DOM.

var UI = {};

UI.$ = function (id) { return document.getElementById(id); };

// --- Toast / messaggio -----------------------------------------------------
UI.toast = function (msg, ms) {
  var t = UI.$('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(UI._toastT);
  UI._toastT = setTimeout(function () { t.classList.remove('on'); }, ms || 2000);
};

UI.message = function (msg, ms) {
  var m = UI.$('message');
  m.textContent = msg;
  m.classList.add('on');
  clearTimeout(UI._msgT);
  UI._msgT = setTimeout(function () { m.classList.remove('on'); }, ms || 1600);
};

// --- Login -----------------------------------------------------------------
UI.showLogin = function () {
  UI.$('login').classList.remove('hidden');
  UI.renderAccountList();
};

UI.hideLogin = function () {
  UI.$('login').classList.add('hidden');
};

UI.renderAccountList = function () {
  var list = UI.$('accountList'), names = SAVE.listAccounts(), i, b;
  list.innerHTML = '';
  if (names.length === 0) return;
  for (i = 0; i < names.length; i++) {
    b = document.createElement('button');
    b.className = 'acc';
    b.textContent = names[i];
    b.onclick = function () { GAME.enter(names[this._i]); };
    b._i = i;
    list.appendChild(b);
  }
};

// --- HUD -------------------------------------------------------------------
UI.updateHud = function (p) {
  var ship = DATA.SHIPS[p.ship];
  var st = GAME.stats(p);
  var maxHp = st.maxHp;
  var maxShield = st.maxShield;
  var maxEnergy = st.maxEnergy;
  var admin = p.admin;
  var cfg = DATA.CONFIGS[p.config] || DATA.CONFIGS.assalto;

  UI.$('hudName').textContent = p.name;
  UI.$('hudShip').textContent = ship.name + ' (' + ship.slots + ' slot) · CONFIG ' + cfg.name;

  UI.$('hudCredits').innerHTML = 'CREDITI <b>' + (admin ? '∞' : GAME.fmt(p.credits)) + '</b>';
  UI.$('hudUridio').innerHTML = 'URIDIO <b>' + (admin ? '∞' : GAME.fmt(p.uridium)) + '</b>';
  UI.$('hudHull').innerHTML = 'SCOFO <b>' + ship.name + '</b>';

  var epNext = GAME.epForNextLevel(p.level);
  UI.$('hudStats').innerHTML =
    'LIVELLO <b>' + p.level + '</b> · EP <b>' + GAME.fmt(p.ep) + '</b>/' + GAME.fmt(epNext) +
    ' · RANK <b>' + GAME.rankTitle(p) + '</b> · ONORE <b>' + GAME.fmt(p.honor) + '</b>';

  // drone
  UI.$('hudDrone').innerHTML = 'DRONE <b>' + (p.drone ? DATA.DRONES[p.drone].name : 'NESSUNO') + '</b>';

  // booster attivi
  var actBoost = [], bk;
  for (bk in DATA.BOOSTERS) if (DATA.BOOSTERS.hasOwnProperty(bk) && GAME.boosterActive(p, bk)) {
    actBoost.push('<span style="color:' + DATA.BOOSTERS[bk].color + '">' + bk.toUpperCase() + ' ' + GAME.boosterTimeLeft(p, bk) + '</span>');
  }
  var elB = UI.$('hudBoost');
  if (actBoost.length) { elB.classList.remove('hidden'); elB.innerHTML = 'BOOSTER ' + actBoost.join(' · '); }
  else elB.classList.add('hidden');

  // missione attiva
  var mm = p.mission;
  var el = UI.$('hudMission');
  if (mm) {
    var prog = mm.type === 'survive'
      ? Math.max(0, mm.need - Math.ceil(mm.secs)) + '/' + mm.need + 's'
      : mm.have + '/' + mm.need;
    el.classList.remove('hidden');
    el.innerHTML = (mm.claimable ? '<b style="color:var(--good)">COMPLETATA!</b> ' : '') + mm.label + ' · ' + prog + (mm.claimable ? ' · premi B' : '');
  } else {
    el.classList.add('hidden');
  }

  UI.$('barHp').querySelector('.fill').style.width = Math.max(0, Math.min(100, (p.hp / maxHp) * 100)) + '%';
  UI.$('barShield').querySelector('.fill').style.width = Math.max(0, Math.min(100, (p.shieldHp / maxShield) * 100)) + '%';
  UI.$('barEnergy').querySelector('.fill').style.width = Math.max(0, Math.min(100, (p.energy / maxEnergy) * 100)) + '%';
};

UI.setSector = function (name) {
  UI.$('sector').textContent = name;
};

UI.showHud = function () { UI.$('hud').classList.remove('hidden'); };
UI.hideHud = function () { UI.$('hud').classList.add('hidden'); };

// --- Minimappa ---------------------------------------------------------------
UI.drawMinimap = function () {
  var cv = UI.$('minimap'), ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var sx = W / DATA.WORLD_W, sy = H / DATA.WORLD_H;
  var i, p = GAME.player;
  ctx.clearRect(0, 0, W, H);
  // base
  ctx.fillStyle = '#2fd3ff';
  ctx.fillRect(DATA.BASE.x * sx - 2, DATA.BASE.y * sy - 2, 4, 4);
  // portale galaxy gate
  ctx.fillStyle = '#9f6bff';
  ctx.fillRect(DATA.GATE.portal.x * sx - 3, DATA.GATE.portal.y * sy - 3, 6, 6);
  // asteroidi
  ctx.fillStyle = '#6b5b4e';
  for (i = 0; i < WORLD.asteroids.length; i++) {
    if (!WORLD.asteroids[i].alive) continue;
    ctx.fillRect(WORLD.asteroids[i].x * sx - 1, WORLD.asteroids[i].y * sy - 1, 2, 2);
  }
  // npc
  ctx.fillStyle = '#e8546a';
  for (i = 0; i < WORLD.npcs.length; i++) {
    if (!WORLD.npcs[i].alive) continue;
    ctx.fillRect(WORLD.npcs[i].x * sx - 1, WORLD.npcs[i].y * sy - 1, 2, 2);
  }
  // drops
  ctx.fillStyle = '#ffe97a';
  for (i = 0; i < WORLD.drops.length; i++) {
    ctx.fillRect(WORLD.drops[i].x * sx - 1, WORLD.drops[i].y * sy - 1, 2, 2);
  }
  // giocatore
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(p.x * sx - 3, p.y * sy - 3, 6, 6);
  // destinazione
  if (GAME.moveTarget) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(GAME.moveTarget.x * sx, GAME.moveTarget.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Click sulla minimappa: muove la nave nel punto del mondo cliccato
// (mantiene bersaglio e attacco attivi, come il clic sul campo)
UI.minimapClick = function (e) {
  var cv = UI.$('minimap');
  var r = cv.getBoundingClientRect();
  var sx = (e.clientX - r.left), sy = (e.clientY - r.top);
  if (sx < 0 || sy < 0 || sx > cv.width || sy > cv.height) return;
  var wx = (sx / cv.width) * DATA.WORLD_W;
  var wy = (sy / cv.height) * DATA.WORLD_H;
  GAME.moveTarget = { x: wx, y: wy };
};

// --- Munizioni ---------------------------------------------------------------
UI.updateAmmo = function () {
  var p = GAME.player;
  var btns = document.querySelectorAll('#ammoBar .ammo');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('on', btns[i].getAttribute('data-a') === p.ammo);
  }
  var def = DATA.AMMO[p.ammo] || DATA.AMMO.red;
  UI.$('ammoNow').innerHTML = 'MUNIZIONI <b style="color:' + def.color + '">' + def.name + '</b> x' + def.mult;
};

// --- Bersaglio selezionato -----------------------------------------------------
UI.updateTarget = function () {
  var box = UI.$('targetInfo');
  if (GAME.selectedNpc == null) {
    box.classList.add('hidden');
    return;
  }
  var n = WORLD.npcs[GAME.selectedNpc];
  if (!n || !n.alive) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  UI.$('tName').textContent = n.name + (GAME.attacking ? ' · ATTACCO' : ' · selezionato');
  UI.$('tFill').style.width = Math.max(0, Math.min(100, (n.hp / n.maxHp) * 100)) + '%';
};

// --- Mappa galattica ----------------------------------------------------------
UI.openMap = function () {
  UI.$('map').classList.remove('hidden');
  UI.drawGalaxyMap();
};
UI.closeMap = function () {
  UI.$('map').classList.add('hidden');
  GAME.paused = false;
};
UI.drawGalaxyMap = function () {
  var cv = UI.$('mapCanvas'), ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var sx = W / DATA.WORLD_W, sy = H / DATA.WORLD_H;
  var i, p = GAME.player;
  ctx.clearRect(0, 0, W, H);
  // sfondo
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, W, H);
  // settori
  ctx.strokeStyle = '#2a3a5c';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, H);
  ctx.strokeRect(W / 2, 0, W / 2, H / 2);
  ctx.strokeRect(0, H / 2, W / 2, H / 2);
  ctx.strokeRect(W / 2, H / 2, W / 2, H / 2);
  ctx.fillStyle = '#6b7fa3';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALPHA', 10, 20);
  ctx.fillText('BETA', W / 2 + 10, 20);
  ctx.fillText('GAMMA', 10, H / 2 + 20);
  ctx.fillText('DELTA', W / 2 + 10, H / 2 + 20);
  // livello richiesto per settore
  var sec;
  ctx.font = '10px sans-serif';
  for (i = 0; i < DATA.SECTORS.length; i++) {
    sec = DATA.SECTORS[i];
    ctx.fillStyle = (p.level >= sec.reqLevel) ? '#46e0a0' : '#ff5b6a';
    ctx.fillText('LIVELLO ' + sec.reqLevel, (sec.x0 / DATA.WORLD_W) * W + 10, (sec.y0 / DATA.WORLD_H) * H + 34);
  }
  // asteroidi
  ctx.fillStyle = '#6b5b4e';
  for (i = 0; i < WORLD.asteroids.length; i++) {
    if (!WORLD.asteroids[i].alive) continue;
    ctx.fillRect(WORLD.asteroids[i].x * sx - 1, WORLD.asteroids[i].y * sy - 1, 2, 2);
  }
  // npc (colore per tipo: i piu' pericolosi sono piu' avanti nel settore)
  for (i = 0; i < WORLD.npcs.length; i++) {
    if (!WORLD.npcs[i].alive) continue;
    ctx.fillStyle = WORLD.npcs[i].color;
    ctx.fillRect(WORLD.npcs[i].x * sx - 2, WORLD.npcs[i].y * sy - 2, 4, 4);
  }
  // base
  ctx.fillStyle = '#2fd3ff';
  ctx.fillRect(DATA.BASE.x * sx - 3, DATA.BASE.y * sy - 3, 6, 6);
  // portale galaxy gate
  ctx.fillStyle = '#9f6bff';
  ctx.fillRect(DATA.GATE.portal.x * sx - 4, DATA.GATE.portal.y * sy - 4, 8, 8);
  // giocatore
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x * sx, p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
};

// --- Negozio ------------------------------------------------------------------
UI.openShop = function () {
  UI.$('shop').classList.remove('hidden');
  UI.shopTab = 'nave';
  UI.renderShop();
};
UI.closeShop = function () {
  UI.$('shop').classList.add('hidden');
  GAME.paused = false;
};

UI.shopTabs = [
  { tab: 'nave', label: 'NAVE', data: null, type: null },
  { tab: 'navi', label: 'NAVI', data: DATA.SHIPS, type: 'ship' },
  { tab: 'laser', label: 'LASER', data: DATA.LASERS, type: 'laser' },
  { tab: 'scudo', label: 'SCUDO', data: DATA.SHIELDS, type: 'shield' },
  { tab: 'gen', label: 'GENERATORE', data: DATA.GENERATORS, type: 'gen' },
  { tab: 'batt', label: 'BATTERIE', data: DATA.BATTERIES, type: 'batt' },
  { tab: 'prop', label: 'PROPULSORE', data: DATA.ENGINES, type: 'eng' },
  { tab: 'drone', label: 'DRONI', data: DATA.DRONES, type: 'drone' },
  { tab: 'minerali', label: 'MINERALI', data: null, type: null },
  { tab: 'skylab', label: 'SKYLAB', data: null, type: null },
  { tab: 'portale', label: 'PORTALE', data: null, type: null },
  { tab: 'booster', label: 'BOOSTER', data: null, type: null }
];

UI.renderShop = function () {
  var p = GAME.player;
  var admin = p.admin;
  var items = UI.$('shopItems');
  var tabs = UI.$('shop');
  var active = UI.shopTab || 'navi';
  var i, t, k, def, row;

  UI.$('shopCredits').innerHTML = 'CREDITI <b>' + (admin ? '∞' : GAME.fmt(p.credits)) + '</b>';
  UI.$('shopUridio').innerHTML = 'URIDIO <b>' + (admin ? '∞' : GAME.fmt(p.uridium)) + '</b>';
  UI.$('shopAdmin').classList.toggle('hidden', !admin);

  // tab attivi
  var tabBtns = tabs.querySelectorAll('.tab');
  for (i = 0; i < tabBtns.length; i++) {
    tabBtns[i].classList.toggle('on', tabBtns[i].getAttribute('data-tab') === active);
  }

  items.innerHTML = '';
  if (active === 'nave') { UI.renderShip(p, items); return; }
  if (active === 'minerali') { UI.renderMinerals(p, items, admin); return; }
  if (active === 'skylab') { UI.renderSkylab(p, items, admin); return; }
  if (active === 'portale') { UI.renderPortal(p, items, admin); return; }
  if (active === 'booster') { UI.renderBooster(p, items, admin); return; }

  for (i = 0; i < UI.shopTabs.length; i++) {
    t = UI.shopTabs[i];
    if (t.tab !== active) continue;
    for (k in t.data) {
      if (!t.data.hasOwnProperty(k)) continue;
      def = t.data[k];
      row = document.createElement('div');
      row.className = 'shopRow';

      var info = document.createElement('div');
      info.className = 'info';
      var nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = def.name;
      var st = document.createElement('div');
      st.className = 'st';
      st.textContent = UI.describeItem(t.type, def);
      info.appendChild(nm);
      info.appendChild(st);

      var costBox = document.createElement('div');
      costBox.className = 'cost' + (def.uridium > 0 ? ' u' : '');
      costBox.textContent = GAME.fmt(def.cost) + ' CR' + (def.uridium > 0 ? ' · ' + GAME.fmt(def.uridium) + ' UR' : '');

      var buy = document.createElement('button');
      buy.className = 'buy';
      buy._key = k;
      buy._type = t.type;
      buy.onclick = function () { GAME.buy(this._type, this._key); };

      var ownedList = (p.owned && p.owned[t.type]) || [];
      var inUse = (t.type === 'ship' && p.ship === k) || (t.type === 'drone' && p.drone === k);
      if (inUse) {
        buy.textContent = 'IN USO';
        buy.disabled = true;
      } else if (ownedList.indexOf(k) >= 0) {
        buy.textContent = 'POSSEDUTA';
        buy.disabled = true;
      } else {
        var afford = admin || (p.credits >= def.cost && p.uridium >= def.uridium);
        buy.textContent = 'COMPRA';
        buy.disabled = !afford;
      }
      row.appendChild(info);
      row.appendChild(costBox);
      row.appendChild(buy);
      items.appendChild(row);
    }
  }
};

// Tab NAVE: gestione degli slot della nave e dei moduli installati
UI.renderShip = function (p, items) {
  var ship = DATA.SHIPS[p.ship];
  var st = GAME.stats(p);

  // scheda nave
  var card = document.createElement('div');
  card.className = 'skylab';
  var c1 = document.createElement('div');
  c1.className = 'skyRow';
  c1.innerHTML = '<b style="color:' + ship.color + '">' + ship.name + '</b> · Scafo ' + ship.maxHp + ' HP · Velocita base ' + ship.speed + ' · <b>' + ship.slots + ' slot</b>';
  card.appendChild(c1);
  var c2 = document.createElement('div');
  c2.className = 'skyRow';
  c2.innerHTML = 'Danno <b>' + st.dmg + '</b> (' + st.rate + '/s, portata ' + st.range + ') · Scudo <b>' + st.maxShield + '</b> · Energia <b>' + st.maxEnergy + '</b> · Velocita <b>' + Math.round(st.speed) + '</b>';
  card.appendChild(c2);
  items.appendChild(card);

  // lista slot
  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'SLOT DI BORDO (installa i moduli che possiedi)';
  items.appendChild(title);

  // raccogli moduli posseduti, ordinati per categoria
  var all = [], i, j, cat;
  for (i = 0; i < SAVE.SLOT_ORDER.length; i++) {
    cat = SAVE.SLOT_ORDER[i];
    var owned = (p.owned && p.owned[cat]) || [];
    for (j = 0; j < owned.length; j++) {
      var def = null;
      if (cat === 'laser') def = DATA.LASERS[owned[j]];
      else if (cat === 'shield') def = DATA.SHIELDS[owned[j]];
      else if (cat === 'gen') def = DATA.GENERATORS[owned[j]];
      else if (cat === 'batt') def = DATA.BATTERIES[owned[j]];
      else if (cat === 'eng') def = DATA.ENGINES[owned[j]];
      if (!def) continue;
      all.push({ key: owned[j], cat: cat, label: def.name + ' (' + cat.toUpperCase() + ')' });
    }
  }

  for (i = 0; i < ship.slots; i++) {
    var row = document.createElement('div');
    row.className = 'shopRow';
    var lab = document.createElement('div');
    lab.className = 'nm';
    lab.textContent = 'SLOT ' + (i + 1);
    var sel = document.createElement('select');
    sel.className = 'slotSel';
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— VUOTO —';
    sel.appendChild(opt);
    for (j = 0; j < all.length; j++) {
      var o = document.createElement('option');
      o.value = all[j].key;
      o.textContent = all[j].label;
      sel.appendChild(o);
    }
    sel.value = p.slots[i] || '';
    (function (idx, s) {
      s.onchange = function () { GAME.installModule(idx, s.value); };
    })(i, sel);
    row.appendChild(lab);
    row.appendChild(sel);
    items.appendChild(row);
  }

  var hint = document.createElement('div');
  hint.className = 'skyRow';
  hint.textContent = 'Compri i moduli nelle altre schede (LASER, SCUDO, ...) e li installi qui negli slot.';
  items.appendChild(hint);
};

// Tab MINERALI: inventario + vendita + raffineria
UI.renderMinerals = function (p, items, admin) {
  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'STIVA MINERALI · Vendi per crediti (l\'Onore aumenta il prezzo)';
  items.appendChild(title);

  // inventario
  var oreKeys = [], k;
  for (k in DATA.ORES) if (DATA.ORES.hasOwnProperty(k)) oreKeys.push(k);
  for (k = 0; k < oreKeys.length; k++) {
    var key = oreKeys[k], def = DATA.ORES[key];
    var qty = (p.ores && p.ores[key]) ? p.ores[key] : 0;
    var row = document.createElement('div');
    row.className = 'shopRow';

    var info = document.createElement('div');
    info.className = 'info';
    var nm = document.createElement('div');
    nm.className = 'nm';
    nm.innerHTML = '<span class="chip" style="background:' + def.color + '"></span> ' + def.name +
      ' <span class="qty">x' + qty + '</span>';
    var st = document.createElement('div');
    st.className = 'st';
    st.textContent = 'Grezzo · ' + GAME.fmt(def.value) + ' CR base' + (def.tier !== 'raw' ? ' · Raffinato' : '');
    info.appendChild(nm);
    info.appendChild(st);

    var costBox = document.createElement('div');
    costBox.className = 'cost';
    costBox.textContent = GAME.fmt(GAME.orePrice(key)) + ' CR/l\'una';

    var sell = document.createElement('button');
    sell.className = 'buy';
    sell._key = key;
    sell.onclick = function () { GAME.sellOre(this._key, 1); };
    sell.textContent = 'VENDI 1';
    sell.disabled = qty < 1;

    row.appendChild(info);
    row.appendChild(costBox);
    row.appendChild(sell);
    items.appendChild(row);
  }

  // raffineria
  var title2 = document.createElement('div');
  title2.className = 'secTitle';
  title2.textContent = 'RAFFINERIA · Combina minerali per crearne di pregiati';
  items.appendChild(title2);

  var recipeKeys = [], r;
  for (r in DATA.RECIPES) if (DATA.RECIPES.hasOwnProperty(r)) recipeKeys.push(r);
  for (r = 0; r < recipeKeys.length; r++) {
    var rk = recipeKeys[r], rec = DATA.RECIPES[rk];
    var outDef = DATA.ORES[rec.out];
    var rowR = document.createElement('div');
    rowR.className = 'shopRow';

    var infoR = document.createElement('div');
    infoR.className = 'info';
    var nmR = document.createElement('div');
    nmR.className = 'nm';
    nmR.innerHTML = '<span class="chip" style="background:' + outDef.color + '"></span> ' + outDef.name;
    var ingText = [], ing;
    for (ing in rec.cost) if (rec.cost.hasOwnProperty(ing)) {
      ingText.push(rec.cost[ing] + ' ' + DATA.ORES[ing].name);
    }
    var stR = document.createElement('div');
    stR.className = 'st';
    stR.textContent = 'Da: ' + ingText.join(' + ');
    infoR.appendChild(nmR);
    infoR.appendChild(stR);

    var costBoxR = document.createElement('div');
    costBoxR.className = 'cost';
    costBoxR.textContent = 'Valore ' + GAME.fmt(outDef.value) + ' CR';

    var ref = document.createElement('button');
    ref.className = 'buy';
    ref._key = rk;
    ref.onclick = function () { GAME.refine(this._key); };
    ref.textContent = 'RAFFINA';
    ref.disabled = !GAME.canAffordRecipe(rk);

    rowR.appendChild(infoR);
    rowR.appendChild(costBoxR);
    rowR.appendChild(ref);
    items.appendChild(rowR);
  }
};

// Tab SKYLAB: produzione passiva di minerali raffinati (anche offline)
UI.renderSkylab = function (p, items, admin) {
  var lvl = DATA.SKYLAB[p.skylab.level];
  var next = DATA.SKYLAB[p.skylab.level + 1];

  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'SKYLAB · Produzione passiva di minerali raffinati (anche offline)';
  items.appendChild(title);

  var box = document.createElement('div');
  box.className = 'skylab';
  var cur = document.createElement('div');
  cur.className = 'skyRow';
  cur.innerHTML = '<b>' + lvl.name + '</b> · ' + lvl.rate + ' unita/ora di <b style="color:' + DATA.ORES[DATA.RECIPES[p.skylab.recipe].out].color + '">' + DATA.ORES[DATA.RECIPES[p.skylab.recipe].out].name + '</b>';
  box.appendChild(cur);

  if (next) {
    var req = document.createElement('div');
    req.className = 'skyRow';
    req.textContent = 'Prossimo: ' + next.name + ' · ' + next.rate + ' unita/ora · costo ' + GAME.fmt(next.cost) + ' CR · richiede livello ' + next.reqLevel;
    box.appendChild(req);

    var up = document.createElement('button');
    up.className = 'buy';
    up.onclick = function () { GAME.skylabUpgrade(); };
    up.textContent = 'POTENZIA';
    up.disabled = !(admin || (p.credits >= next.cost && p.level >= next.reqLevel));
    box.appendChild(up);
  } else {
    var max = document.createElement('div');
    max.className = 'skyRow';
    max.textContent = 'Livello massimo raggiunto';
    box.appendChild(max);
  }
  items.appendChild(box);

  // scelta ricetta
  var title2 = document.createElement('div');
  title2.className = 'secTitle';
  title2.textContent = 'MINERALE DA PRODURRE';
  items.appendChild(title2);

  var recipeKeys = [], r;
  for (r in DATA.RECIPES) if (DATA.RECIPES.hasOwnProperty(r)) recipeKeys.push(r);
  for (r = 0; r < recipeKeys.length; r++) {
    var rk = recipeKeys[r], rec = DATA.RECIPES[rk];
    var outDef = DATA.ORES[rec.out];
    var row = document.createElement('div');
    row.className = 'shopRow';

    var info = document.createElement('div');
    info.className = 'info';
    var nm = document.createElement('div');
    nm.className = 'nm';
    nm.innerHTML = '<span class="chip" style="background:' + outDef.color + '"></span> ' + outDef.name;
    info.appendChild(nm);

    var ingText = [], ing;
    for (ing in rec.cost) if (rec.cost.hasOwnProperty(ing)) {
      ingText.push(rec.cost[ing] + ' ' + DATA.ORES[ing].name);
    }
    var st = document.createElement('div');
    st.className = 'st';
    st.textContent = 'Consuma: ' + ingText.join(' + ');
    info.appendChild(st);

    var set = document.createElement('button');
    set.className = 'buy';
    set._key = rk;
    set.onclick = function () { GAME.skylabSetRecipe(this._key); };
    set.textContent = (p.skylab.recipe === rk) ? 'ATTIVA' : 'SELEZIONA';
    if (p.skylab.recipe === rk) { set.disabled = true; set.style.background = 'var(--good)'; }

    row.appendChild(info);
    row.appendChild(set);
    items.appendChild(row);
  }
};

UI.describeItem = function (type, def) {
  switch (type) {
    case 'ship': return 'Scafo ' + def.maxHp + ' HP · Velocita ' + def.speed + ' · ' + def.slots + ' slot';
    case 'laser': return 'Danno ' + def.dmg + ' · ' + def.rate + ' colpi/s · Portata ' + def.range;
    case 'shield': return 'Scudo ' + def.max + ' · Rigenera ' + def.regen + '/s';
    case 'gen': return 'Energia ' + def.regen + '/s';
    case 'batt': return 'Energia max ' + def.max;
    case 'eng': return 'Velocita +' + def.boost;
    case 'drone': return 'Danno ' + def.dmg + ' · ' + def.rate + ' colpi/s · Portata ' + def.range + ' · Raccoglie i drop';
  }
  return '';
};

// --- Missioni -----------------------------------------------------------------
UI.openMissions = function () {
  var p = GAME.player;
  if (!p.missionBoard && !p.mission) GAME.refreshMissionBoard();
  UI.$('missions').classList.remove('hidden');
  UI.renderMissions();
};
UI.closeMissions = function () {
  UI.$('missions').classList.add('hidden');
  GAME.paused = false;
};

UI.renderMissions = function () {
  var p = GAME.player;
  var box = UI.$('missionsItems');
  box.innerHTML = '';
  var m = p.mission;

  // missione attiva
  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'MISSIONE ATTIVA';
  box.appendChild(title);

  if (m) {
    var row = document.createElement('div');
    row.className = 'shopRow';
    var info = document.createElement('div');
    info.className = 'info';
    var nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = m.label;
    var st = document.createElement('div');
    st.className = 'st';
    if (m.type === 'survive') {
      st.textContent = 'Sopravvissuti: ' + Math.max(0, m.need - Math.ceil(m.secs)) + ' / ' + m.need + ' s';
    } else {
      st.textContent = 'Progresso: ' + m.have + ' / ' + m.need;
    }
    info.appendChild(nm);
    info.appendChild(st);
    var rew = document.createElement('div');
    rew.className = 'cost';
    rew.innerHTML = '+' + GAME.fmt(m.reward.credits) + ' CR · +' + m.reward.uridium + ' UR · +' + GAME.fmt(m.reward.ep) + ' EP';
    var claim = document.createElement('button');
    claim.className = 'buy';
    claim.textContent = m.claimable ? 'RISCUOTI' : 'IN CORSO';
    claim.disabled = !m.claimable;
    claim.onclick = function () { GAME.claimMission(); };
    row.appendChild(info);
    row.appendChild(rew);
    row.appendChild(claim);
    box.appendChild(row);
  } else {
    var none = document.createElement('div');
    none.className = 'skyRow';
    none.textContent = 'Nessuna missione attiva. Scegli una missione dalla bacheca.';
    box.appendChild(none);
  }

  // bacheca
  var title2 = document.createElement('div');
  title2.className = 'secTitle';
  title2.textContent = 'BACHECA (3 missioni per il tuo livello)';
  box.appendChild(title2);

  if (!p.mission && p.missionBoard) {
    for (var i = 0; i < p.missionBoard.length; i++) {
      (function (mi) {
        var bm = p.missionBoard[mi];
        var brow = document.createElement('div');
        brow.className = 'shopRow';
        var binfo = document.createElement('div');
        binfo.className = 'info';
        var bnm = document.createElement('div');
        bnm.className = 'nm';
        bnm.textContent = bm.label;
        binfo.appendChild(bnm);
        var brew = document.createElement('div');
        brew.className = 'cost';
        brew.innerHTML = '+' + GAME.fmt(bm.reward.credits) + ' CR · +' + bm.reward.uridium + ' UR · +' + GAME.fmt(bm.reward.ep) + ' EP';
        var acc = document.createElement('button');
        acc.className = 'buy';
        acc.textContent = 'ACCETTA';
        acc.onclick = function () { GAME.acceptMission(mi); };
        brow.appendChild(binfo);
        brow.appendChild(brew);
        brow.appendChild(acc);
        box.appendChild(brow);
      })(i);
    }
  } else if (!p.mission && !p.missionBoard) {
    var refresh = document.createElement('button');
    refresh.className = 'buy';
    refresh.textContent = 'GENERA MISSIONI';
    refresh.onclick = function () { GAME.refreshMissionBoard(); UI.renderMissions(); };
    box.appendChild(refresh);
  }

  if (p.mission) {
    var hint = document.createElement('div');
    hint.className = 'skyRow';
    hint.textContent = 'Una missione alla volta: completa e riscuoti per generarne di nuove.';
    box.appendChild(hint);
  }
};

// Tab PORTALE: Galaxy Gate + scambio parti
UI.renderPortal = function (p, items, admin) {
  var G = DATA.GATE;
  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'GALAXY GATE · Settore Delta';
  items.appendChild(title);

  var box = document.createElement('div');
  box.className = 'skylab';
  var r1 = document.createElement('div');
  r1.className = 'skyRow';
  r1.innerHTML = 'Requisito: <b>livello ' + G.reqLevel + '</b> · 5 ondate + boss · <b>G</b> per entrare dal portale';
  box.appendChild(r1);
  var r2 = document.createElement('div');
  r2.className = 'skyRow';
  r2.textContent = 'Ricompensa: crediti, uridio, EP, onore e PARTI DI GATE.';
  box.appendChild(r2);
  items.appendChild(box);

  var title2 = document.createElement('div');
  title2.className = 'secTitle';
  title2.textContent = 'PARTI RACCOLTE: ' + (p.gateParts || 0);
  items.appendChild(title2);

  // scambio parti
  var rowS = document.createElement('div');
  rowS.className = 'shopRow';
  var infoS = document.createElement('div');
  infoS.className = 'info';
  var nmS = document.createElement('div');
  nmS.className = 'nm';
  nmS.textContent = 'Scambio 5 parti';
  var stS = document.createElement('div');
  stS.className = 'st';
  stS.textContent = 'Ottieni 2.000 URIDIO (indirizza verso il negozio)';
  infoS.appendChild(nmS);
  infoS.appendChild(stS);
  var bS = document.createElement('button');
  bS.className = 'buy';
  bS.textContent = 'SCAMBIA';
  bS.disabled = (p.gateParts || 0) < 5;
  bS.onclick = function () {
    p.gateParts -= 5;
    if (!p.admin) p.uridium += 2000;
    UI.renderPortal(p, items, admin);
    UI.updateHud(p);
    SAVE.saveAccount(p);
  };
  rowS.appendChild(infoS);
  rowS.appendChild(bS);
  items.appendChild(rowS);

  var rowV = document.createElement('div');
  rowV.className = 'shopRow';
  var infoV = document.createElement('div');
  infoV.className = 'info';
  var nmV = document.createElement('div');
  nmV.className = 'nm';
  nmV.textContent = 'Vendi 1 parte';
  var stV = document.createElement('div');
  stV.className = 'st';
  stV.textContent = 'Ottieni 1.500 CREDITI';
  infoV.appendChild(nmV);
  infoV.appendChild(stV);
  var bV = document.createElement('button');
  bV.className = 'buy';
  bV.textContent = 'VENDI';
  bV.disabled = (p.gateParts || 0) < 1;
  bV.onclick = function () {
    p.gateParts -= 1;
    p.credits += 1500;
    UI.renderPortal(p, items, admin);
    UI.updateHud(p);
    SAVE.saveAccount(p);
  };
  rowV.appendChild(infoV);
  rowV.appendChild(bV);
  items.appendChild(rowV);
};

// Tab BOOSTER: potenziamenti temporanei (10 ore reali) + kit consumabili
UI.renderBooster = function (p, items, admin) {
  var title = document.createElement('div');
  title.className = 'secTitle';
  title.textContent = 'BOOSTER (10 ORE REALI) · L\'uridio compra tempo';
  items.appendChild(title);

  var keys = [], k;
  for (k in DATA.BOOSTERS) if (DATA.BOOSTERS.hasOwnProperty(k)) keys.push(k);
  for (k = 0; k < keys.length; k++) {
    var key = keys[k], def = DATA.BOOSTERS[key];
    var active = GAME.boosterActive(p, key);
    var row = document.createElement('div');
    row.className = 'shopRow';

    var info = document.createElement('div');
    info.className = 'info';
    var nm = document.createElement('div');
    nm.className = 'nm';
    nm.innerHTML = '<span class="chip" style="background:' + def.color + '"></span> ' + def.name;
    var st = document.createElement('div');
    st.className = 'st';
    st.textContent = def.desc + (active ? ' · ATTIVO (' + GAME.boosterTimeLeft(p, key) + ')' : '');
    info.appendChild(nm);
    info.appendChild(st);

    var costBox = document.createElement('div');
    costBox.className = 'cost u';
    costBox.textContent = GAME.fmt(def.uridium) + ' UR';

    var buy = document.createElement('button');
    buy.className = 'buy';
    buy._key = key;
    buy.onclick = function () { GAME.buyBooster(this._key); };
    buy.textContent = active ? 'RINNOVA' : 'ATTIVA';
    buy.disabled = !(admin || p.uridium >= def.uridium);

    row.appendChild(info);
    row.appendChild(costBox);
    row.appendChild(buy);
    items.appendChild(row);
  }

  var title2 = document.createElement('div');
  title2.className = 'secTitle';
  title2.textContent = 'KIT CONSUMABILI (crediti)';
  items.appendChild(title2);

  var kkeys = [], kk;
  for (kk in DATA.KITS) if (DATA.KITS.hasOwnProperty(kk)) kkeys.push(kk);
  for (kk = 0; kk < kkeys.length; kk++) {
    var kkey = kkeys[kk], kde = DATA.KITS[kkey];
    var krow = document.createElement('div');
    krow.className = 'shopRow';
    var kinfo = document.createElement('div');
    kinfo.className = 'info';
    var knm = document.createElement('div');
    knm.className = 'nm';
    knm.textContent = kde.name;
    var kst = document.createElement('div');
    kst.className = 'st';
    kst.textContent = kde.desc;
    kinfo.appendChild(knm);
    kinfo.appendChild(kst);
    var kcost = document.createElement('div');
    kcost.className = 'cost';
    kcost.textContent = GAME.fmt(kde.cost) + ' CR';
    var kuse = document.createElement('button');
    kuse.className = 'buy';
    kuse._key = kkey;
    kuse.onclick = function () { GAME.useKit(this._key); };
    kuse.textContent = 'USA';
    kuse.disabled = !(admin || p.credits >= kde.cost);
    krow.appendChild(kinfo);
    krow.appendChild(kcost);
    krow.appendChild(kuse);
    items.appendChild(krow);
  }
};

// --- Setup eventi -------------------------------------------------------------
UI.init = function () {
  UI.$('loginBtn').onclick = function () {
    var name = UI.$('loginName').value.trim();
    if (!name) { UI.toast('Inserisci un nome pilota'); return; }
    GAME.enter(name);
  };
  UI.$('loginName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') UI.$('loginBtn').click();
  });
  UI.$('shopClose').onclick = function () { UI.closeShop(); };
  UI.$('mapClose').onclick = function () { UI.closeMap(); };
  UI.$('missionsClose').onclick = function () { UI.closeMissions(); };

  // munizioni: pulsanti 1-4
  var ammoBtns = document.querySelectorAll('#ammoBar .ammo');
  for (var a = 0; a < ammoBtns.length; a++) {
    ammoBtns[a].onclick = function () {
      GAME.setAmmo(this.getAttribute('data-a'));
    };
  }

  // minimappa: clic per muoversi, trascina per spostare la finestra
  var mm = UI.$('minimap');
  mm._drag = false;
  mm._moved = false;
  mm._sx = 0; mm._sy = 0;
  mm.addEventListener('mousedown', function (e) {
    mm._drag = true;
    mm._moved = false;
    mm._sx = e.clientX;
    mm._sy = e.clientY;
    mm.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!mm._drag) return;
    var dx = e.clientX - mm._sx, dy = e.clientY - mm._sy;
    if (!mm._moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) mm._moved = true;
    if (mm._moved) {
      // sposta la minimappa seguendo il mouse
      var r = mm.getBoundingClientRect();
      var nx = r.left + dx, ny = r.top + dy;
      nx = Math.max(0, Math.min(window.innerWidth - mm.offsetWidth, nx));
      ny = Math.max(0, Math.min(window.innerHeight - mm.offsetHeight, ny));
      mm.style.left = nx + 'px';
      mm.style.top = ny + 'px';
      mm.style.right = 'auto';
      mm.style.bottom = 'auto';
      mm._sx = e.clientX;
      mm._sy = e.clientY;
    }
  });
  window.addEventListener('mouseup', function (e) {
    if (!mm._drag) return;
    mm._drag = false;
    mm.classList.remove('dragging');
    if (!mm._moved) {
      UI.minimapClick(e);
    }
  });

  var tabBtns = document.querySelectorAll('.tabs .tab');
  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].onclick = function () {
      UI.shopTab = this.getAttribute('data-tab');
      UI.renderShop();
    };
  }
};