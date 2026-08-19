/* SIM — simulazione dell'attività: costi → output → eventi casuali → ricompense. */
'use strict';

const sim = {
  validate(activityId, participantIds){
    const activity = getActivity(activityId);
    if (!activity) return { ok:false, reason:'Attività sconosciuta.' };
    const participants = participantIds.map(getFriend).filter(Boolean);
    const n = participants.length;
    if (n < activity.min) return { ok:false, reason:`Servono almeno ${activity.min} partecipanti.` };
    if (activity.duration > maxActivityDuration()) return { ok:false, reason:'Non c\'è tempo per questa attività in questo momento della giornata.' };
    if (n > activity.max) return { ok:false, reason:'Troppi partecipanti.' };

    if (activity.travel){
      const seats = totalSeats();
      if (n > seats){
        const taxiCost = BALANCE.taxiCostPerSeat * (n - seats);
        if (G.money < activity.cost + taxiCost) return { ok:false, reason:`Servono €${fmt(activity.cost + taxiCost)} (taxi per ${n - seats} posti).` };
      }
    }
    if (activity.home){
      const hDef = currentHouse();
      if (!hDef) return { ok:false, reason:'Non avete una casa (impossibile, ma siamo pignoli).' };
      if (n > houseCapacity(G.houses[G.mainHouse], hDef)) return { ok:false, reason:'La casa non è abbastanza grande!' };
      if (activity.requiresRoom){
        const lv = ownedRoom(G.houses[G.mainHouse], activity.requiresRoom);
        if (lv < activity.requireRoomLevel) return { ok:false, reason:'Vi serve uno spazio migliore (manca l\'upgrade richiesto).' };
      }
    }
    for (const p of participants){
      if (activity.energyCost > 0 && p.energy <= 0) return { ok:false, reason:`${getCharacter(p.id).name} è esausto: deve recuperare.` };
    }
    const cost = economy.activityCost(activity, participants).cost;
    if (G.money < cost) return { ok:false, reason:`Servono €${fmt(cost)}.` };
    return { ok:true };
  },

  run(activityId, participantIds, mods){
    const activity = getActivity(activityId);
    const participants = participantIds.map(getFriend).filter(Boolean);
    const n = participants.length;
    const messages = [];
    const check = this.validate(activityId, participantIds);
    if (!check.ok) return { ok:false, reason:check.reason };

    /* costo */
    const { cost, reason } = economy.activityCost(activity, participants);
    let totalCost = cost;
    let taxiUsed = 0;
    if (activity.travel){
      const seats = totalSeats();
      if (n > seats){
        taxiUsed = n - seats;
        totalCost += BALANCE.taxiCostPerSeat * taxiUsed;
      }
    }
    G.money -= totalCost;
    G.stats.moneyEarned -= totalCost;   // spese non contano come guadagni

    /* comfort casa */
    const houseBon = activity.home ? houseComfort(G.houses[G.mainHouse], currentHouse()) * 2 : 0;

    /* moltiplicatori mood medi */
    let moodMul = 0;
    for (const p of participants){ recomputeMood(p); moodMul += BALANCE.moodEffects[p.mood].mul; }
    moodMul /= n;

    /* bonus skill */
    let happyMul = moodMul;
    let happyBonus = 0;
    let repMul = 1;
    if (skillBonusCount('intrattenitore', participants) > 0){ happyBonus += 15; }
    if (skillBonusCount('dj', participants) > 0){ happyBonus += 15; }
    if (activity.home && (activity.id === 'pizza' || activity.id === 'cena' || activity.id === 'grigliata') && skillBonusCount('chef', participants) > 0){ happyBonus += 20; }
    if (activity.id === 'grigliata' && skillBonusCount('re_grigliata', participants) > 0){ happyBonus += 25; messages.push('👑 Tubo: “La grigliata è MIA. E oggi è PERFETTA.”'); }

    /* poteri speciali */
    let happyPower = 1 + powerVal(participants, 'happy');
    let repPower = 1 + powerVal(participants, 'rep');
    if (activity.travel){
      const tv = powerVal(participants, 'travelHappy');
      if (tv > 0){ happyPower += tv; messages.push('✈️ Ferie creative: la vacanza rende tutti felici come mai.'); }
    }
    const isFood = activity.home && (activity.id === 'pizza' || activity.id === 'cena' || activity.id === 'grigliata');
    if (isFood){
      const fv = powerVal(participants, 'foodHappy');
      if (fv > 0){ happyPower += fv; messages.push('🥘 La salsa segreta è entrata in gioco: piatto da applausi.'); }
    }

    /* skill richiesta mancante → qualità dimezzata */
    let missingChef = false;
    if (activity.requiresSkill && skillBonusCount(activity.requiresSkill[0], participants) === 0){
      happyMul *= 0.5;
      missingChef = true;
      messages.push('😅 Nessun esperto in squadra: il risultato è “quasi buono”. Quasi.');
    }

    let happy = Math.max(0, Math.round(
      (activity.output.happy + houseBon + happyBonus) * happyMul * happyPower + (G.rep * 0.02)
    ));
    const money = activity.output.money;
    let rep = Math.max(0, Math.round(activity.output.rep * repMul * repPower + (n / 2)));

    /* bonus del minigioco (mods passati da MINIGAME.play) */
    let minigame = null;
    if (mods){
      happy = Math.max(0, Math.round(happy * (mods.happyMul || 1)) + (mods.happyBonus || 0));
      rep = Math.max(0, Math.round(rep * (mods.repMul || 1)) + (mods.repBonus || 0));
      if (mods.moneyDelta){
        G.money += mods.moneyDelta;
        if (mods.moneyDelta > 0) G.stats.moneyEarned += mods.moneyDelta;
      }
      if (mods.messages) messages.push(...mods.messages);
      if (mods.mini) minigame = mods.mini;
    }

    G.happy += happy;
    G.rep += rep;
    if (money > 0) G.money += money;
    G.stats.moneyEarned += money;
    G.stats.activities++;
    if (activity.id === 'festa' && n >= 6) G.stats.festa6++;
    if (activity.id === 'mare') G.stats.mare++;

    /* energia per partecipante */
    const energyP = Math.max(0, 1 - powerVal(participants, 'energy'));
    const friendP = 1 + powerVal(participants, 'friendship');
    for (const p of participants){
      let ec = activity.energyCost;
      if (ec > 0 && hasSkill(p, 'divanologo')) ec = Math.max(1, ec - 2);
      if (ec > 0) ec = Math.max(1, Math.round(ec * energyP));
      p.energy = clamp(p.energy - ec, 0, 100);
      gainXp(p, happy * 0.3 + activity.cost * 0.08);
      recomputeMood(p);
      for (const o of participants){
        if (o.id !== p.id) gainFriendship(p, o, Math.max(1, Math.round(BALANCE.friendshipPerEvent * friendP)));
      }
    }

    /* evento casuale */
    const event = this.rollEvent(activity, participants, happyMul);
    let eventEffects = { money:0, happy:0, rep:0 };
    if (event){
      G.stats.events++;
      eventEffects = { money:event.effects.money, happy:event.effects.happy, rep:event.effects.rep };
      G.money += eventEffects.money;
      G.happy = Math.max(0, G.happy + eventEffects.happy);
      G.rep = Math.max(0, G.rep + eventEffects.rep);
    }

    G.lastSeen = Date.now();
    checkMissions();
    autosave();

    return {
      ok:true, activity, participants, n,
      cost: totalCost, taxiUsed, discount: reason,
      happy, money, rep, houseBon,
      event, eventEffects,
      minigame,
      messages, missingChef
    };
  },

  /* probabilità evento: chaos attività + mood + fortuna + sfiga */
  rollEvent(activity, participants, moodMul){
    let p = activity.chaos || 0.05;
    for (const f of participants){
      if (f.mood === 'fuori_controllo') p += BALANCE.moodEffects.fuori_controllo.chaos;
      if (hasSkill(f, 'fortunato')) p += 0.05;
      if (hasSkill(f, 'portafoglio_vuoto')) p += 0.06;
      if (hasSkill(f, 'arriva_sempre_tardi')) p += 0.04;
      if (hasSkill(f, 'scrocco')) p += 0.03;
    }
    p = clamp(p, 0, 0.85);
    if (!chance(p)) return null;

    const pool = activity.pool.map(getEvent).filter(Boolean);
    if (!pool.length) return null;
    let ev = pick(pool);

    /* potere: Armandino morde via la sfortuna */
    if (ev.type === 'bad'){
      const shield = powerVal(participants, 'luckShield');
      if (shield > 0 && chance(shield)) return null;
    }

    /* skill di salvataggio: l'evento viene mitigato o ribaltato */
    if (ev.find){
      const savior = participants.find(f => hasSkill(f, ev.find));
      if (savior){
        const base = getCharacter(savior.id);
        if (ev.type === 'bad'){
          ev = { ...ev, title: ev.title + ' (risolto!)', text: `${base.name} risolve tutto. ${ev.text}`, effects: { money:0, happy: Math.max(2, ev.effects.happy + 6), rep: Math.max(0, ev.effects.rep) } };
        }else{
          ev = { ...ev, title: ev.title + ' (potenziato!)', text: `${base.name} rende tutto ancora meglio. ${ev.text}`, effects: { money:ev.effects.money * 2, happy:ev.effects.happy * 2, rep:ev.effects.rep * 2 } };
        }
      }
    }
    return ev;
  }
};