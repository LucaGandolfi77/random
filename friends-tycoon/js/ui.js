/* UI — viste DOM, popup, toast, ticker. Mobile-first. */
'use strict';

const UI = {
  view: 'home',
  pick: null,

  init(){
    document.querySelectorAll('#tabbar .tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.view));
    });
  },

  switchTab(v){
    this.view = v;
    document.querySelectorAll('#tabbar .tab').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    this.renderView();
    $id('view').scrollTop = 0;
  },

  refreshUI(){
    this.renderTopbar();
    this.renderView();
  },

  renderTopbar(){
    $id('res-money').textContent = '💰 €' + fmt(G.money);
    $id('res-happy').textContent = '❤️ ' + fmt(G.happy);
    $id('res-rep').textContent = '⭐ ' + fmt(G.rep);
    $id('res-energy').textContent = '⚡ ' + Math.round(G.friends.reduce((s, f) => s + f.energy, 0) / Math.max(1, G.friends.length)) + '%';
    $id('res-date').textContent = dayDef(G.dayIndex).emoji + ' ' + slotDef(G.slotIndex).id.toUpperCase();
  },

  renderView(){
    const v = $id('view');
    if (this.view === 'home') v.innerHTML = this.homeHTML();
    else if (this.view === 'friends') v.innerHTML = this.friendsHTML();
    else if (this.view === 'cars') v.innerHTML = this.carsHTML();
    else if (this.view === 'events') v.innerHTML = this.eventsHTML();
    else if (this.view === 'shop') v.innerHTML = this.shopHTML();
    else if (this.view === 'cal') v.innerHTML = this.calHTML();
    this.bindView();
    if (this.view === 'home') this.attach3D();
  },

  attach3D(){
    const cv = $id('house3d');
    if (typeof R3D !== 'undefined' && R3D.attach) R3D.attach(cv);
    if (typeof CHARSCENE !== 'undefined'){
      CHARSCENE.sync();
      if (!CHARSCENE.scene && typeof R3D !== 'undefined' && R3D.scene && R3D.scene()) CHARSCENE.init(R3D.scene());
    }
  },

  /* ============ HOME ============ */
  homeHTML(){
    const hDef = currentHouse();
    const hEntry = G.houses[G.mainHouse];
    const cap = hDef ? houseCapacity(hEntry, hDef) : 0;
    const cf = hDef ? houseComfort(hEntry, hDef) : 0;
    const val = hDef ? houseValue(hEntry, hDef) : 0;
    const nextHouse = HOUSES.find(h => !G.houses.some(x => x.id === h.id));
    const av = G.friends.filter(friendAvailable);
    const cats = ['casa','fuori','viaggio'];
    let acts = '';
    for (const c of cats){
      acts += `<div class="section-title">${c === 'casa' ? '🏠 A casa' : c === 'fuori' ? '🏙️ Fuori' : '🧭 Viaggi'}</div>`;
      for (const a of ACTIVITIES.filter(x => x.category === c)){
        acts += this.activityRow(a);
      }
    }
    return `
      <div class="card hero3d fade-in">
        <canvas id="house3d"></canvas>
        <button class="btn hero-btn" data-goto-events title="Organizza un'attività">🎉</button>
        <div class="hero-hint">Trascina per ruotare la camera</div>
      </div>
      <div class="card fade-in">
        <div class="row">
          <div class="avatar" style="background:${hDef.color || '#ffe8f0'}">${hDef.emoji}</div>
          <div>
            <h3>${hDef.name} ${G.houses.length > 1 ? `(×${G.houses.length})` : ''}</h3>
            <p>👥 capienza ${cap} · 🛋️ comfort ${cf} · 💎 valore €${fmt(val)}</p>
          </div>
        </div>
      </div>
      <div class="card fade-in">
        <h3>${slotLabel()}</h3>
        <p>${av.length ? av.map(f => this.friendChip(f)).join(' ') : '😴 Nessuno è disponibile adesso.'}</p>
        ${nextHouse ? `<p class="chip mt">🎯 Prossimo obiettivo: ${nextHouse.name} (€${fmt(nextHouse.price)})</p>` : ''}
      </div>
      <div class="section-title">Cosa facciamo?</div>
      ${acts}
      <div class="card fade-in">
        <h3>🏆 Missioni</h3>
        ${MISSIONS.map(m => {
          const done = G.missions.indexOf(m.id) !== -1;
          const prog = m.check(G) ? 100 : 0;
          return `<div class="row"><span style="flex:1">${done ? '✅' : '🔲'} ${esc(m.title)}</span><span class="chip ${done ? 'good' : ''}">${done ? 'FATTA' : 'in corso'}</span></div>`;
        }).join('')}
      </div>`;
  },

  /* ============ AMICI ============ */
  friendsHTML(){
    const inGroup = id => getFriend(id);
    const html = G.friends.map(f => this.friendCard(f)).join('');
    const pool = recruitPool();
    const invite = pool.map(id => {
      const c = getCharacter(id);
      const cost = economy.inviteCost();
      return `<div class="friend fade-in">
        <div class="avatar" style="background:${c.color}">${c.emoji}</div>
        <div class="info">
          <div class="name">${esc(c.name)} <span class="chip">${esc(c.job)}</span></div>
          <div class="sub">${esc(c.blurb)}</div>
          <div class="sub">${c.skills.map(s => '✨' + getSkill(s).name).join(' · ')}</div>
          ${c.power ? `<div class="sub">⚡ <b>${esc(c.power.name)}</b> — ${esc(c.power.desc)}</div>` : ''}
        </div>
        <button class="btn small green" data-invite="${c.id}">Invita<br>€${fmt(cost)}</button>
      </div>`;
    }).join('');
    const locked = (BALANCE.recruitTiers || []).filter(t => !unlockMet(t.cond)).map(t => {
      return t.ids.filter(id => !inGroup(id)).map(id => {
        const c = getCharacter(id);
        return `<div class="friend dim fade-in">
          <div class="avatar" style="background:${c.color}">${c.emoji}</div>
          <div class="info">
            <div class="name">🔒 ${esc(c.name)} <span class="chip">${esc(c.job)}</span></div>
            <div class="sub">${esc(c.blurb)}</div>
            ${c.power ? `<div class="sub">⚡ <b>${esc(c.power.name)}</b> — ${esc(c.power.desc)}</div>` : ''}
            <div class="sub">✨ ${esc(t.label)}</div>
          </div>
        </div>`;
      }).join('');
    }).join('');
    return `<div class="section-title">👥 La compagnia (${G.friends.length})</div>${html}
      ${pool.length ? `<div class="section-title">🎟️ Nuovi arrivi</div>${invite}` : ''}
      ${locked ? `<div class="section-title">🔒 Da sbloccare</div>${locked}` : ''}
      ${!pool.length && !locked ? '<div class="card center">La banda è al completo. Avete costruito un impero: che gli altri amici si iscrivano.</div>' : ''}`;
  },

  friendCard(f){
    const c = getCharacter(f.id);
    if (!c) return '';
    const st = charStats(f);
    const mood = MOOD_EMOJI[f.mood] || '😐';
    const moodLabel = MOOD_LABEL[f.mood] || '';
    const best = bestFriends(f)[0];
    const skills = c.skills.map(s => `<span class="chip">${getSkill(s).name}</span>`).join(' ');
    const avail = friendAvailable(f) ? '✅ disponibile' : (isWeekday() ? '💼 al lavoro' : '❌');
    return `<div class="friend fade-in">
      <div class="avatar" style="background:${c.color}">${c.emoji}</div>
      <div class="info">
        <div class="name">${esc(c.name)}, ${c.age} <span class="mood-badge">${mood}</span> <span class="chip">Lv ${f.level}</span></div>
        <div class="sub">${esc(c.job)} · ${moodLabel} · ${avail}</div>
        <div class="bar"><i class="hp" style="width:${f.energy}%"></i></div>
        <div class="sub">⚡ ${Math.round(f.energy)}% energia ${best ? `· 💛 ${esc((getCharacter(best.id) || { name: '?' }).name)}: ${Math.round(best.v)}` : ''}</div>
        <div class="sub mt">${skills}</div>
        ${c.power ? `<div class="sub">⚡ <b>${esc(c.power.name)}</b> — ${esc(c.power.desc)}</div>` : ''}
      </div>
    </div>`;
  },

  /* ============ AUTO ============ */
  carsHTML(){
    const owned = ownedVehicles();
    const own = owned.map(v => `<div class="card fade-in">
      <div class="row"><span style="font-size:28px">${v.emoji}</span>
        <div style="flex:1"><h3 style="margin:0">${esc(v.name)}</h3>
        <p style="margin:2px 0">${esc(v.desc)}</p>
        <span class="chip">🪑 ${v.seats} posti</span> <span class="chip">⚡ ${v.speed}/6</span>
        <span class="chip">🛋️ ${v.comfort}/6</span> <span class="chip">🔧 affidabilità ${v.reliability}%</span>
        <span class="chip">✨ stile ${v.style}/10</span> <span class="chip">🧳 bagagliaio ${v.trunk}</span></div>
      </div>
    </div>`).join('') || '<div class="card center">Nessuna auto. A piedi si va più lontano. Fidatevi.</div>';
    const buyList = VEHICLES.filter(v => G.vehicles.indexOf(v.id) === -1).map(v => {
      const can = G.money >= v.price;
      return `<div class="card fade-in"><div class="row">
        <span style="font-size:28px">${v.emoji}</span>
        <div style="flex:1"><h3 style="margin:0">${esc(v.name)}</h3>
        <p style="margin:2px 0">${esc(v.desc)}</p>
        <span class="chip">🪑 ${v.seats} · ✨ stile ${v.style}/10 · 🔧 ${v.reliability}%</span></div>
        <button class="btn small ${can ? '' : 'ghost'}" data-buy-vehicle="${v.id}" ${can ? '' : 'disabled'}>€${fmt(v.price)}</button>
      </div></div>`;
    }).join('');
    return `<div class="section-title">🚗 La flotta — posti totali: ${totalSeats()}</div>${own}
      ${TAXI ? `<div class="card fade-in"><div class="row"><span style="font-size:26px">${TAXI.emoji}</span>
        <div style="flex:1"><h3 style="margin:0">${TAXI.name}</h3><p style="margin:2px 0">${esc(TAXI.desc)}</p>
        <span class="chip">€${TAXI.pricePerSeat}/posto quando manca posto</span></div></div></div>` : ''}
      ${buyList ? `<div class="section-title">🛍️ Concessionario</div>${buyList}` : '<div class="card center">Parco auto completo. Il vicino chiede un prestito.</div>'}`;
  },

  /* ============ EVENTI ============ */
  eventsHTML(){
    const cats = [
      ['casa','🏠 A casa'],
      ['fuori','🏙️ Fuori'],
      ['viaggio','🧭 Viaggi']
    ];
    let h = `<div class="card fade-in"><h3>${slotLabel()}</h3><p>Puoi organizzare attività che durino al massimo ${maxActivityDuration()} slot (pomeriggio 3, sera 4, notte 2).</p></div>`;
    for (const [cat, label] of cats){
      h += `<div class="section-title">${label}</div>`;
      h += ACTIVITIES.filter(a => a.category === cat).map(a => this.activityRow(a)).join('');
    }
    return h;
  },

  activityRow(a){
    const fits = a.duration <= maxActivityDuration();
    const req = a.requiresRoom ? ` · richiede: ${getUpgrade(a.requiresRoom).icon} ${getUpgrade(a.requiresRoom).name} lv${a.requireRoomLevel}+` : '';
    const skill = a.requiresSkill ? ` · serve: ${a.requiresSkill.map(s => getSkill(s).name).join(' o ')}` : '';
    return `<div class="act fade-in">
      <div class="icon">${a.icon}</div>
      <div style="flex:1">
        <div class="ttl">${esc(a.name)}</div>
        <div class="meta">💰 €${a.cost} · ⏱️ ${a.duration} slot · 👥 ${a.min}+ amici${req}${skill}</div>
        <div class="meta">❤️ +${a.output.happy} ${a.output.rep ? '· ⭐ +' + a.output.rep : ''} ${a.output.money ? '· 💰 +€' + a.output.money : ''}${a.energyCost < 0 ? '· ⚡ recupera energia' : ''}</div>
        <div class="meta">${esc(a.desc)} ${MINIGAMES[a.id] ? `· 🎮 minigioco` : ''}</div>
      </div>
      <button class="btn small ${fits ? '' : 'ghost'}" data-organize="${a.id}" ${fits ? '' : 'disabled'}>${fits ? 'Organizza' : 'Troppo tardi'}</button>
    </div>`;
  },

  /* ============ SHOP / UPGRADE ============ */
  shopHTML(){
    const hEntry = G.houses[G.mainHouse];
    const hDef = currentHouse();
    let rooms = '';
    for (const roomId in hDef.rooms){
      if (!hDef.rooms[roomId]) continue;
      const up = getUpgrade(roomId);
      const cur = ownedRoom(hEntry, roomId);
      const curLv = up.levels[cur];
      const next = up.levels[cur + 1];
      rooms += `<div class="card fade-in">
        <div class="row"><span style="font-size:26px">${up.icon}</span>
          <div style="flex:1"><h3 style="margin:0">${esc(up.name)}</h3>
          <p style="margin:2px 0">Ora: <b>${esc(curLv.label)}</b></p>
          ${next ? `<p style="margin:2px 0">Prossimo: ${esc(next.label)} · 🛋️ +${next.comfort} 👥 +${next.capacity||0} ❤️ +${next.happy}</p>` : '<p style="margin:2px 0">Livello massimo. Il portale è raggiunto.</p>'}
          </div>
          ${next ? `<button class="btn small ${G.money >= next.cost ? '' : 'ghost'}" data-upgrade="${roomId}" ${G.money >= next.cost ? '' : 'disabled'}>€${fmt(next.cost)}</button>` : '<span class="chip good">MAX</span>'}
        </div>
      </div>`;
    }
    const houses = HOUSES.filter(h => !G.houses.some(x => x.id === h.id)).map(h => {
      const can = G.money >= h.price;
      return `<div class="card fade-in"><div class="row">
        <span style="font-size:26px">${h.emoji}</span>
        <div style="flex:1"><h3 style="margin:0">${esc(h.name)}</h3>
        <p style="margin:2px 0">${esc(h.desc)}</p>
        <span class="chip">👥 ${h.capacity} · 🛋️ ${h.comfort} · 🅿️ ${h.parking}</span></div>
        <button class="btn small ${can ? 'gold' : 'ghost'}" data-buy-house="${h.id}" ${can ? '' : 'disabled'}>€${fmt(h.price)}</button>
      </div></div>`;
    }).join('');
    return `<div class="card fade-in"><h3>🛋️ ${hDef.name} — comfort ${houseComfort(hEntry, hDef)}, valore €${fmt(houseValue(hEntry, hDef))}</h3></div>
      ${rooms}
      ${houses ? `<div class="section-title">🏡 Altre proprietà</div>${houses}` : '<div class="card center">Possedete tutte le proprietà. L\'impero del Divertimento è completo.</div>'}`;
  },

  /* ============ CALENDARIO ============ */
  calHTML(){
    let h = `<div class="card fade-in center">
      <h3>${slotLabel()} · Settimana ${G.week}</h3>
      <button class="btn" data-advance>⏭ Avanza tempo (1 slot)</button>
      <p style="margin-top:8px">Lun–Ven gli amici lavorano (stipendio) e sono liberi solo sera e notte. Weekend: liberi tutto il giorno.</p>
    </div>`;
    for (let i = 0; i < 7; i++){
      const d = dayDef(i);
      const isToday = i === G.dayIndex;
      const freeTxt = i < 5 ? 'Dopo il lavoro: sera e notte' : 'Liberi tutto il giorno';
      h += `<div class="daycard ${isToday ? 'today' : ''}">
        <div class="d">${d.emoji} ${d.name}</div>
        <div class="free">${freeTxt}</div>
        ${isToday ? `<span class="chip good">OGGI</span>` : ''}
      </div>`;
    }
    return h;
  },

  bindView(){
    const v = $id('view');
    v.querySelectorAll('[data-organize]').forEach(b => b.addEventListener('click', () => this.openOrganize(b.dataset.organize)));
    v.querySelectorAll('[data-invite]').forEach(b => b.addEventListener('click', () => this.doInvite(b.dataset.invite)));
    v.querySelectorAll('[data-buy-vehicle]').forEach(b => b.addEventListener('click', () => this.doBuyVehicle(b.dataset.buyVehicle)));
    v.querySelectorAll('[data-buy-house]').forEach(b => b.addEventListener('click', () => this.doBuyHouse(b.dataset.buyHouse)));
    v.querySelectorAll('[data-upgrade]').forEach(b => b.addEventListener('click', () => this.doUpgrade(b.dataset.upgrade)));
    v.querySelectorAll('[data-advance]').forEach(b => b.addEventListener('click', () => advanceTime()));
    v.querySelectorAll('[data-goto-events]').forEach(b => b.addEventListener('click', () => this.switchTab('events')));
  },

  friendChip(f){
    const c = getCharacter(f.id);
    if (!c) return `<span class="chip">❓ Amico misterioso</span>`;
    return `<span class="chip" title="${esc(c.name)} · ${MOOD_LABEL[f.mood]}">${c.emoji} ${esc(c.name)} ${MOOD_EMOJI[f.mood]}</span>`;
  },

  /* ---- azioni ---- */
  doInvite(id){
    const r = economy.inviteFriend(id);
    if (!r.ok){ this.toast(r.msg); audio.sad(); }
    this.refreshUI();
  },
  doBuyVehicle(id){
    const r = economy.buyVehicle(id);
    if (!r.ok){ this.toast(r.msg); audio.sad(); }
    this.refreshUI();
  },
  doBuyHouse(id){
    const r = economy.buyHouse(id);
    if (!r.ok){ this.toast(r.msg); audio.sad(); }
    else this.rebuild3D();
    this.refreshUI();
  },
  doUpgrade(roomId){
    const r = economy.buyUpgrade(roomId);
    if (!r.ok){ this.toast(r.msg); audio.sad(); }
    else{ audio.buy(); this.rebuild3D(); }
    this.refreshUI();
  },

  rebuild3D(){
    if (typeof R3D !== 'undefined' && R3D.rebuild) R3D.rebuild();
    if (typeof CHARSCENE !== 'undefined' && typeof R3D !== 'undefined' && R3D.scene()){
      CHARSCENE.init(R3D.scene());
    }
  },

  /* ---- organizza attività ---- */
  openOrganize(activityId){
    const a = getActivity(activityId);
    if (!a) return;
    const available = G.friends.filter(friendAvailable).filter(f => a.energyCost <= 0 || f.energy > 0);
    this.pick = { activityId, selected: new Set(available.slice(0, Math.max(a.min, 2)).map(f => f.id)) };
    this.renderOrganizeModal();
  },

  renderOrganizeModal(){
    const a = getActivity(this.pick.activityId);
    const available = G.friends.filter(friendAvailable).filter(f => a.energyCost <= 0 || f.energy > 0);
    const costInfo = economy.activityCost(a, [...this.pick.selected].map(getFriend));
    let travelInfo = '';
    if (a.travel){
      const need = this.pick.selected.size;
      const seats = totalSeats();
      travelInfo = need > seats ? `<p class="chip bad">🚕 Servirà il taxi per ${need - seats} posti (+€${(need - seats) * BALANCE.taxiCostPerSeat})</p>` : `<p class="chip good">🚗 Posti auto ok (${seats})</p>`;
    }
    const chips = available.map(f => {
      const c = getCharacter(f.id);
      const on = this.pick.selected.has(f.id);
      return `<div class="chip toggle ${on ? 'good' : ''}" data-pick="${f.id}">${c.emoji} ${esc(c.name)} ${MOOD_EMOJI[f.mood]} ${Math.round(f.energy)}%</div>`;
    }).join('');
    const sheet = `
      <button class="close" data-close>✕</button>
      <h2>${a.icon} ${esc(a.name)}</h2>
      <p class="sub">${esc(a.desc)}</p>
      ${MINIGAMES[a.id] ? `<p class="sub">🎮 Minigioco: ${esc(MINIGAMES[a.id].name)} ${MINIGAMES[a.id].gamble ? '· 🎲 azzardo' : ''}</p>` : ''}
      <h3>Chi viene?</h3>
      <div class="row" style="gap:6px">${chips}</div>
      <div class="mt">${travelInfo}</div>
      <div class="row mt" style="justify-content:space-between">
        <div><span class="chip">💰 €${fmt(costInfo.cost)}${costInfo.reason ? ' · ' + esc(costInfo.reason) : ''}</span></div>
        <span class="chip">❤️ +${a.output.happy} ⭐ +${a.output.rep}</span>
      </div>
      <button class="btn green mt" data-go>🎉 Organizza!</button>`;
    this.openModal(sheet);
    const mod = $id('modal');
    mod.querySelectorAll('[data-pick]').forEach(ch => ch.addEventListener('click', () => {
      const id = ch.dataset.pick;
      if (this.pick.selected.has(id)) this.pick.selected.delete(id);
      else this.pick.selected.add(id);
      this.renderOrganizeModal();
    }));
    mod.querySelector('[data-go]').addEventListener('click', () => this.runActivity());
    mod.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
  },

  runActivity(){
    const a = this.pick.activityId;
    const ids = [...this.pick.selected];
    const finish = (mods) => {
      const res = sim.run(a, ids, mods);
      if (!res.ok){ this.toast(res.reason); audio.sad(); this.closeModal(); this.refreshUI(); return; }
      if (typeof CHARSCENE !== 'undefined' && CHARSCENE.choreograph) CHARSCENE.choreograph(res.activity.id, ids);
      this.renderResult(res);
    };
    if (MINIGAME.has(a)) MINIGAME.play(a, finish, this);
    else finish();
  },

  renderResult(res){
    const { activity, participants, cost, happy, money, rep, event, eventEffects, messages, taxiUsed, houseBon, minigame } = res;
    let evHtml = '';
    if (event){
      evHtml = `<div class="card ${event.type === 'bad' ? 'bad' : event.type === 'good' ? 'good' : ''}" style="background:${event.type === 'bad' ? '#ffe6e6' : event.type === 'good' ? '#e4ffec' : '#fff6e0'};border:none">
        <div class="big">${event.emoji} ${esc(event.title)}</div>
        <p>${esc(event.text)}</p>
        ${eventEffects.money ? `<span class="chip">💰 ${eventEffects.money > 0 ? '+' : ''}€${fmt(eventEffects.money)}</span>` : ''}
        ${eventEffects.happy ? `<span class="chip">❤️ ${eventEffects.happy > 0 ? '+' : ''}${fmt(eventEffects.happy)}</span>` : ''}
        ${eventEffects.rep ? `<span class="chip">⭐ ${eventEffects.rep > 0 ? '+' : ''}${fmt(eventEffects.rep)}</span>` : ''}
      </div>`;
    }
    const mgHtml = minigame ? `<div class="card" style="background:#fff6e0;border:2px solid var(--accent2)">
      <div class="big">🎮 ${esc(minigame.emoji)} ${esc(minigame.label)}</div>
      ${minigame.moneyDelta ? `<span class="chip">💰 ${minigame.moneyDelta > 0 ? '+' : ''}€${fmt(Math.abs(minigame.moneyDelta))}</span>` : ''}
    </div>` : '';
    const sheet = `
      <button class="close" data-close>✕</button>
      <div class="result-hero">
        <div class="emoji">${activity.icon}</div>
        <h2>${esc(activity.name)}</h2>
        <p>${participants.map(f => getCharacter(f.id).emoji).join(' ')} · ${participants.length} amici</p>
      </div>
      <div class="result-nums">
        <div class="rn"><div class="v" style="color:var(--good)">+${fmt(happy)}</div><div class="l">❤️ FELICITÀ</div></div>
        <div class="rn"><div class="v" style="color:var(--accent)">+${fmt(rep)}</div><div class="l">⭐ REPUTAZIONE</div></div>
        <div class="rn"><div class="v" style="color:var(--accent2)">-€${fmt(cost)}</div><div class="l">💰 COSTO${taxiUsed ? ` (+taxi ×${taxiUsed})` : ''}</div></div>
      </div>
      ${evHtml}
      ${mgHtml}
      ${messages.map(m => `<p style="font-size:13px;color:var(--muted)">${esc(m)}</p>`).join('')}
      <button class="btn mt" data-close2>Perfetto. E adesso?</button>`;
    this.openModal(sheet);
    audio.success();
    this.tickerPop('+❤️ ' + happy, 'var(--good)');
    if (rep) this.tickerPop('+⭐ ' + rep, 'var(--accent)');
    this.closeThen(sheet);
  },

  closeThen(sheet){
    $id('modal').querySelector('[data-close2], [data-close]').addEventListener('click', () => {
      this.closeModal();
      this.refreshUI();
    });
  },

  /* ---- modal generica ---- */
  openModal(html){
    const mod = $id('modal');
    mod.innerHTML = `<div class="sheet fade-in">${html}</div>`;
    mod.classList.add('show');
  },
  closeModal(){
    $id('modal').classList.remove('show');
  },

  /* ---- toast ---- */
  toast(msg){
    const t = $id('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2600);
  },

  /* ---- ticker: numeri che volano ---- */
  tickerPop(text, color){
    const ticker = $id('ticker');
    const el = document.createElement('div');
    el.textContent = text;
    el.style.color = color || 'var(--good)';
    el.style.left = (12 + rnd() * 60) + '%';
    el.style.fontSize = (18 + rnd() * 8) + 'px';
    ticker.appendChild(el);
    setTimeout(() => el.remove(), 2700);
  }
};

function toast(msg){ UI.toast(msg); }