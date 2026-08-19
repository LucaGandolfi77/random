/* TIME — orologio di gioco, timestamp e formattazione. */
'use strict';

function now(){ return Date.now(); }

function fmtTime(sec){
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + 'm' + (s ? ' ' + s + 's' : '');
}

/* completamento costruzioni: ricontrolla tutti i timer (usato a ogni render e al load) */
function settleBuildings(){
  const t = now();
  for (const id in G.buildings){
    const b = G.buildings[id];
    if (b.state !== 0 && b.doneAt && t >= b.doneAt){
      b.state = 0;
      b.doneAt = 0;
      b.level += 1;
      G.prod[id] = t;   // riparte la produzione col nuovo livello
    }
  }
}

function cooldownLeft(minigameId){
  const last = G.cooldowns[minigameId] || 0;
  const mg = getMinigame(minigameId);
  return Math.max(0, mg.cooldown - Math.floor((now() - last) / 1000));
}