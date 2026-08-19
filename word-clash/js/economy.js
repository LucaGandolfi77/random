/* ECONOMY — produzione, raccolta, capienze, monete e dobloni. */
'use strict';

function fontanaBonus(){
  const f = getBuilding('fontana');
  const lv = buildingLevel('fontana');
  return lv >= 1 && f ? f.bonus[lv - 1] : 0;
}

function prodRate(id){
  const d = getBuilding(id);
  const lv = buildingLevel(id);
  if (!d || d.category !== 'production' || lv < 1 || !d.ratePerMin) return 0;
  return d.ratePerMin[lv - 1] * (1 + fontanaBonus());
}

/* monete prodotte ma non ancora raccolte */
function pendingProd(id){
  const rate = prodRate(id);
  if (rate <= 0) return 0;
  const elapsed = (now() - (G.prod[id] || now())) / 1000;
  return Math.min(storageCap(), Math.floor((rate * elapsed) / 60));
}

function collect(id){
  const amount = pendingProd(id);
  if (amount <= 0) return 0;
  G.money = Math.min(storageCap(), G.money + amount);
  G.stats.coinsEarned = (G.stats.coinsEarned || 0) + amount;
  G.prod[id] = now();
  return amount;
}

/* ---- spese / ricavi con capienza ---- */
function canAffordCoins(c){ return G.money >= c; }
function canAffordDobloni(c){ return G.dobloni >= c; }
function payCoins(c){ if (canAffordCoins(c)){ G.money -= c; return true; } return false; }
function payDobloni(c){ if (canAffordDobloni(c)){ G.dobloni -= c; return true; } return false; }
function addCoins(n){ G.money = Math.min(storageCap(), G.money + n); G.stats.coinsEarned = (G.stats.coinsEarned || 0) + n; }
function addDobloni(n){ G.dobloni = Math.min(dobloniCap(), G.dobloni + n); }
function addLog(icon, text){ G.log.unshift({ t: Date.now(), icon, text }); G.log = G.log.slice(0, BALANCE.maxLog); }