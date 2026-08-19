/* BUILD — costruzioni con tempi reali, bibliotecari, muro extra, acquisto costruttori. */
'use strict';

function levelCost(id, toLevel){
  const d = getBuilding(id);
  const lv = d.levels[toLevel - 1];
  return { cost: lv.cost, time: lv.time, currency: d.currency || 'coins' };
}

function startBuild(id){
  settleBuildings();
  const d = getBuilding(id);
  if (!d) return { ok:false, reason:'Edificio sconosciuto.' };
  const cur = buildingLevel(id);
  if (cur >= maxLevelFor(id)) return { ok:false, reason:'Livello massimo raggiunto (serve il Catalogo).' };
  if (!isUnlocked(id)) return { ok:false, reason:'Sblocca prima il Catalogo Centrale al livello ' + d.unlock + '.' };
  if (buildingBusy(id)) return { ok:false, reason:'È già in costruzione.' };
  if (buildersFree() < 1) return { ok:false, reason:'Nessun bibliotecario libero (ce ne sono ' + G.builders + ', tutti al lavoro).' };
  const lc = levelCost(id, cur + 1);
  if (lc.currency === 'dobloni'){
    if (!canAffordDobloni(lc.cost)) return { ok:false, reason:'Servono 💛 ' + lc.cost + ' dobloni.' };
    payDobloni(lc.cost);
  }else{
    if (!canAffordCoins(lc.cost)) return { ok:false, reason:'Servono 🪙 ' + fmt(lc.cost) + ' monete.' };
    payCoins(lc.cost);
  }
  G.buildings[id] = { level: cur, state: 1, doneAt: now() + lc.time * 1000 };
  audio.build();
  return { ok:true, msg: (cur === 0 ? 'Costruzione' : 'Potenziamento') + ' avviato: ' + fmtTime(lc.time) + '.' };
}

function remainingBuildTime(id){
  const b = G.buildings[id];
  if (!b || b.state === 0) return 0;
  return Math.max(0, Math.ceil((b.doneAt - now()) / 1000));
}

/* salta la costruzione coi dobloni: 1 doblone al minuto (minimo 1) */
function skipBuild(id){
  settleBuildings();
  const rem = remainingBuildTime(id);
  if (rem <= 0) return { ok:false, reason:'Niente da saltare.' };
  const cost = Math.max(1, Math.ceil((rem / 60) * BALANCE.skipDobloniPerMin));
  if (!canAffordDobloni(cost)) return { ok:false, reason:'Servono 💛 ' + cost + ' dobloni per saltare ' + fmtTime(rem) + '.' };
  payDobloni(cost);
  const b = G.buildings[id];
  b.state = 0;
  b.doneAt = 0;
  b.level += 1;
  G.prod[id] = now();
  audio.done();
  return { ok:true, msg:'Costruzione completata al volo! +€💛 usati: ' + cost + '.' };
}

/* ---- muri: copie extra (senza bibliotecari) ---- */
function wallCost(){
  const m = getBuilding('muro');
  const lv = Math.max(1, buildingLevel('muro'));
  return { cost: m.copyCost[lv - 1], time: m.copyTime[lv - 1] };
}
function buyWall(){
  settleBuildings();
  if (G.walls >= wallMax()) return { ok:false, reason:'Muri al massimo (potenzia il Catalogo per altri).' };
  const wc = wallCost();
  if (!canAffordCoins(wc.cost)) return { ok:false, reason:'Servono 🪙 ' + fmt(wc.cost) + ' monete.' };
  payCoins(wc.cost);
  G.walls++;
  audio.build();
  return { ok:true, msg:'Muro posato. ' + G.walls + '/' + wallMax() + ' enciclopedie a difesa.' };
}

/* ---- nuovi bibliotecari (dobloni) ---- */
function builderCostNext(){
  if (G.builders >= BALANCE.buildersMax) return null;
  return BALANCE.builderCost[G.builders - 1];
}
function buyBuilder(){
  const cost = builderCostNext();
  if (cost == null) return { ok:false, reason:'Avete già tutti i bibliotecari della città.' };
  if (!canAffordDobloni(cost)) return { ok:false, reason:'Servono 💛 ' + cost + ' dobloni.' };
  payDobloni(cost);
  G.builders++;
  audio.fanfare();
  return { ok:true, msg:'Un nuovo bibliotecario firma il contratto (ora ' + G.builders + ').' };
}