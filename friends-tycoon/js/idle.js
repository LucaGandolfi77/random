/* IDLE — calcolo progressi offline + schermata BENTORNATO! */
'use strict';

const idle = {
  /* ore trascorse dal salvataggio */
  hoursAway(){
    if (!G.lastSeen) return 0;
    return Math.max(0, Math.floor((Date.now() - G.lastSeen) / 3600000));
  },
  compute(){
    const h = Math.min(this.hoursAway(), BALANCE.idleCappedHours);
    if (h < 1) return null;
    const employed = G.friends.filter(f => getCharacter(f.id) && getCharacter(f.id).job);
    const salaryPerDay = employed.reduce((s, f) => s + (BALANCE.salaryBase[getCharacter(f.id).job] || 0), 0);
    const money = Math.round(salaryPerDay * 0.5 * h);
    const happy = Math.round(G.friends.length * 22 * h);
    const rep = Math.round(G.friends.length * 2 * h);
    for (const f of G.friends){ f.energy = clamp(f.energy + 8 * h, 0, 100); }
    return { hours: h, money, happy, rep, salaryPerDay };
  },
  apply(result){
    G.money += result.money;
    G.happy += result.happy;
    G.rep += result.rep;
    G.stats.moneyEarned += result.money;
    G.lastSeen = Date.now();
    autosave();
    return result;
  }
};