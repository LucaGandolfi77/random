/* ECONOMY — stipendi, costi, acquisti. Tutte le formule qui. */
'use strict';

const economy = {
  paySalaries(){
    let paid = 0;
    for (const f of G.friends){
      const base = getCharacter(f.id);
      if (!base || !base.job) continue;
      let pay = BALANCE.salaryBase[base.job] || 0;
      if (hasSkill(f, 'economista')) pay = Math.round(pay * 1.15);
      G.money += pay;
      paid += pay;
    }
    const passive = G.friends.reduce((s, f) => s + (hasPower(f, 'income') ? (getCharacter(f.id).power.val || 0) : 0), 0);
    if (passive > 0){ G.money += passive; paid += passive; }
    if (paid > 0){
      toast(`💼 Stipendi della settimana: +€${fmt(paid)}`);
      audio.buy();
    }
  },

  /* costo attività con sconti da skill dei partecipanti */
  activityCost(activity, participants){
    let c = activity.cost;
    let reason = '';
    if (skillBonusCount('organizzatore', participants) > 0){ c *= 0.85; reason = 'Organizzatore'; }
    if (skillBonusCount('economista', participants) > 0){ c *= 0.92; if (reason) reason += ' + '; reason += 'Economista'; }
    if (activity.home && (activity.id === 'pizza' || activity.id === 'cena' || activity.id === 'grigliata')){
      if (skillBonusCount('chef', participants) > 0){ c *= 0.8; if (reason) reason += ' + '; reason += 'Chef'; }
    }
    if (activity.travel){
      if (skillBonusCount('gps_umano', participants) > 0){ c *= 0.75; if (reason) reason += ' + '; reason += 'GPS Umano'; }
      else if (skillBonusCount('pilota', participants) > 0){ c *= 0.9; if (reason) reason += ' + '; reason += 'Pilota'; }
      const tv = powerVal(participants, 'travel');
      if (tv > 0){ c *= (1 - tv); if (reason) reason += ' + '; reason += 'Passaporto'; }
    }
    const mv = powerVal(participants, 'money');
    if (mv > 0){ c *= (1 - mv); if (reason) reason += ' + '; reason += 'Poteri'; }
    return { cost: Math.max(1, Math.round(c)), reason };
  },

  inviteCost(){
    return BALANCE.inviteBaseCost * (G.stats.invites + 1);
  },

  inviteFriend(id){
    if (getFriend(id)) return { ok:false, msg:'È già della compagnia.' };
    const base = getCharacter(id);
    if (!base) return { ok:false, msg:'Personaggio sconosciuto.' };
    if (!isUnlocked(id)) return { ok:false, msg:'Ancora da sbloccare: continua a fare serate e costruire.' };
    const cost = this.inviteCost();
    if (G.money < cost) return { ok:false, msg:`Servono €${fmt(cost)}.` };
    G.money -= cost;
    G.stats.invites++;
    const f = makeFriend(base);
    G.friends.push(f);
    linkFriendships();
    audio.fanfare();
    toast(`🎊 ${base.name} si unisce alla compagnia!`);
    checkMissions();
    autosave();
    return { ok:true, cost };
  },

  buyHouse(houseId){
    const def = getHouse(houseId);
    if (!def) return { ok:false, msg:'Casa sconosciuta.' };
    if (G.houses.some(h => h.id === houseId)) return { ok:false, msg:'La possiedi già.' };
    if (G.money < def.price) return { ok:false, msg:`Servono €${fmt(def.price)}.` };
    G.money -= def.price;
    const entry = { id: houseId, ownedRooms: {}, since: G.week };
    for (const roomId in def.rooms){ if (def.rooms[roomId]) entry.ownedRooms[roomId] = 0; }
    G.houses.push(entry);
    G.mainHouse = G.houses.length - 1;
    audio.fanfare();
    toast(`🏡 Vi siete trasferiti nella ${def.name}!`);
    checkMissions();
    autosave();
    return { ok:true };
  },

  buyVehicle(vehicleId){
    const def = getVehicle(vehicleId);
    if (!def) return { ok:false, msg:'Auto sconosciuta.' };
    if (G.vehicles.indexOf(vehicleId) !== -1) return { ok:false, msg:'La possiedi già.' };
    if (G.money < def.price) return { ok:false, msg:`Servono €${fmt(def.price)}.` };
    G.money -= def.price;
    G.vehicles.push(vehicleId);
    audio.buy();
    toast(`🚗 Nuova in squadra: ${def.name}!`);
    checkMissions();
    autosave();
    return { ok:true };
  },

  nextUpgradeCost(houseEntry, roomId){
    const def = getUpgrade(roomId);
    if (!def) return null;
    const cur = ownedRoom(houseEntry, roomId);
    const next = def.levels[cur + 1];
    return next || null;
  },

  buyUpgrade(roomId){
    const houseEntry = G.houses[G.mainHouse];
    const houseDef = currentHouse();
    if (!houseDef || !houseDef.rooms[roomId]) return { ok:false, msg:'Stanza non disponibile in questa casa.' };
    const next = this.nextUpgradeCost(houseEntry, roomId);
    if (!next) return { ok:false, msg:'Già al massimo livello. Anche l\'impero ha un tetto.' };
    if (G.money < next.cost) return { ok:false, msg:`Servono €${fmt(next.cost)}.` };
    G.money -= next.cost;
    houseEntry.ownedRooms[roomId] = (ownedRoom(houseEntry, roomId) || 0) + 1;
    audio.buy();
    toast(`🛠️ ${getUpgrade(roomId).icon} Ora: "${next.label}"!`);
    autosave();
    return { ok:true };
  }
};