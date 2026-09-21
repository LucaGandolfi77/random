class Shop {
  constructor(game, economy) {
    this.game = game;
    this.econ = economy;
    this.active = false;
    this.tab = 'upgrades'; // 'upgrades', 'ships', 'achievements', 'daily'
  }

  open(tab = 'upgrades') {
    this.active = true;
    this.tab = tab;
    this.render();
    this.game.showToast('🔧 Officina Aperta!');
  }

  close() {
    this.active = false;
    const panel = document.getElementById('shop-panel');
    if (panel) panel.remove();
  }

  render() {
    this.close();
    const panel = document.createElement('div');
    panel.id = 'shop-panel';
    panel.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);
      z-index:50;display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(5px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background:rgba(20,20,60,0.98);border:2px solid #00d4ff;border-radius:20px;
      padding:30px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;
      box-shadow:0 0 60px rgba(0,212,255,0.3);
    `;

    content.innerHTML = `
      <h2 style="color:#ffd700;text-align:center;margin-bottom:20px;">🔧 OFFICINA STARDEX</h2>
      <div style="text-align:center;margin-bottom:20px;color:#ffd700;font-size:1.3rem;">
        💰 Credits: ${this.econ.credits}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px;flex-wrap:wrap;">
        <button class="shop-tab" data-tab="upgrades" style="padding:8px 16px;border:1px solid ${this.tab==='upgrades'?'#00d4ff':'#555'};background:${this.tab==='upgrades'?'#00d4ff':'transparent'};color:${this.tab==='upgrades'?'#000':'#fff'};border-radius:8px;cursor:pointer;">⬆ Upgrade</button>
        <button class="shop-tab" data-tab="ships" style="padding:8px 16px;border:1px solid ${this.tab==='ships'?'#00d4ff':'#555'};background:${this.tab==='ships'?'#00d4ff':'transparent'};color:${this.tab==='ships'?'#000':'#fff'};border-radius:8px;cursor:pointer;">🚀 Navi</button>
        <button class="shop-tab" data-tab="achievements" style="padding:8px 16px;border:1px solid ${this.tab==='achievements'?'#00d4ff':'#555'};background:${this.tab==='achievements'?'#00d4ff':'transparent'};color:${this.tab==='achievements'?'#000':'#fff'};border-radius:8px;cursor:pointer;">🏆 Achieve</button>
        <button class="shop-tab" data-tab="daily" style="padding:8px 16px;border:1px solid ${this.tab==='daily'?'#00d4ff':'#555'};background:${this.tab==='daily'?'#00d4ff':'transparent'};color:${this.tab==='daily'?'#000':'#fff'};border-radius:8px;cursor:pointer;">📅 Daily</button>
      </div>
      <div id="shop-content">${this.getContent()}</div>
      <button id="shop-close" style="display:block;margin:20px auto 0;padding:10px 30px;background:#ff3333;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:1rem;">✖ Chiudi</button>
    `;

    panel.appendChild(content);
    document.body.appendChild(panel);

    // Tab switching
    panel.querySelectorAll('.shop-tab').forEach(btn => {
      btn.onclick = () => {
        this.tab = btn.dataset.tab;
        this.render();
      };
    });

    // Close button
    document.getElementById('shop-close').onclick = () => this.close();
    panel.onclick = (e) => { if (e.target === panel) this.close(); };
  }

  getContent() {
    switch(this.tab) {
      case 'upgrades': return this.getUpgradesContent();
      case 'ships': return this.getShipsContent();
      case 'achievements': return this.getAchievementsContent();
      case 'daily': return this.getDailyContent();
      default: return '';
    }
  }

  getUpgradesContent() {
    const upgrades = [
      { type: 'engine', name: '⚡ Motore', desc: 'Velocità +15%', icon: '🔧' },
      { type: 'hull', name: '🛡️ Scafo', desc: 'Taglia +10%', icon: '🏗️' },
      { type: 'brakes', name: '🛑 Freni', desc: 'Attrito +3%', icon: '🛑' },
      { type: 'boost', name: '🚀 Boost', desc: 'Carburante +20%', icon: '💥' },
      { type: 'paint', name: '🎨 Vernice', desc: 'Aspetto personalizzato', icon: '🎨' }
    ];

    let html = '<h3 style="color:#00d4ff;">Upgrade Navi</h3>';
    SHIP_TYPES.forEach((ship, i) => {
      html += `<div style="margin:10px 0;padding:10px;background:rgba(0,212,255,0.1);border-radius:10px;">`;
      html += `<div style="color:${ship.color};font-weight:bold;">${ship.name}</div>`;
      upgrades.forEach(u => {
        const level = this.econ.getUpgrade(i, u.type);
        const cost = this.econ.getUpgradeCost(i, u.type, level);
        const maxed = level >= 5;
        const canAfford = this.econ.credits >= cost;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;margin:5px 0;">`;
        html += `<span>${u.icon} ${u.name} Lv.${level}/5 ${maxed?'✅':''}</span>`;
        html += `<span style="font-size:0.85px;color:#aaa;">${u.desc}</span>`;
        if (!maxed) {
          html += `<button class="shop-buy" data-ship="${i}" data-upgrade="${u.type}" data-cost="${cost}" style="padding:3px 10px;background:${canAfford?'#ffd700':'#555'};color:#000;border:none;border-radius:5px;cursor:pointer;font-size:0.8rem;">${canAfford?'$'+cost:'No Credits'}</button>`;
        } else {
          html += `<span style="color:#33ff66;">Max!</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    });
    return html;
  }

  getShipsContent() {
    let html = '<h3 style="color:#00d4ff;">Navi Disponibili</h3>';
    SHIP_TYPES.forEach((ship, i) => {
      const unlocked = this.econ.isShipUnlocked(i);
      html += `<div style="margin:10px 0;padding:15px;background:rgba(0,212,255,${unlocked?'0.1':'0.03'});border:2px solid ${unlocked?ship.color:'#333'};border-radius:10px;opacity:${unlocked?1:0.5};">`;
      html += `<div style="color:${ship.color};font-size:1.2rem;font-weight:bold;">${ship.name}</div>`;
      html += `<div style="font-size:0.85px;color:#aaa;">${['Piccola e veloce','Media bilanciata','Grande e resistente','Tiny e ultra veloce'][i]}</div>`;
      html += `<div style="font-size:0.8rem;">Taglia: ${ship.size}x | Velocità: ${ship.speed}</div>`;
      if (!unlocked) {
        html += `<button class="shop-buy" data-unlock="${i}" style="padding:5px 15px;background:#ffd700;color:#000;border:none;border-radius:5px;cursor:pointer;">Sblocca (${this.econ.getUpgradeCost(i,'paint',0)*5} 💰)</button>`;
      } else {
        html += `<span style="color:#33ff66;">✅ Sbloccata</span>`;
      }
      html += `</div>`;
    });
    return html;
  }

  getAchievementsContent() {
    const allAchievements = [
      { id: 'first_park', name: '🏆 Primo Parcheggio', desc: 'Parcheggia per la prima volta' },
      { id: 'parking_5', name: '⭐ Parcheggiatore 5 stelle', desc: '5 parcheggi completati' },
      { id: 'parking_10', name: '🅿️ Professionista', desc: '10 parcheggi completati' },
      { id: 'combo_20', name: '🔥 Combo Master', desc: 'Combo x20 raggiunta' },
      { id: 'gentleman', name: '🎩 Gentleman Driver', desc: 'Meno di 5 bump totali' },
      { id: 'stars_3', name: '🌟 Tre Stelle', desc: '3 stelle su un livello' },
      { id: 'level_5', name: '🗺️ Esploratore', desc: '5 livelli completati' },
      { id: 'boost_user', name: '🚀 Boost User', desc: 'Usa il boost per la prima volta' }
    ];

    let html = '<h3 style="color:#00d4ff;">🏆 Achievements</h3>';
    allAchievements.forEach(a => {
      const unlocked = this.econ.achievements.includes(a.id);
      html += `<div style="margin:8px 0;padding:10px;background:${unlocked?'rgba(255,215,0,0.1)':'rgba(100,100,100,0.1)'};border:1px solid ${unlocked?'#ffd700':'#333'};border-radius:8px;opacity:${unlocked?1:0.5};">`;
      html += `<div style="font-weight:bold;">${unlocked?a.name:'???'}</div>`;
      html += `<div style="font-size:0.8rem;color:#aaa;">${unlocked?a.desc:'Completa questo obiettivo'}</div>`;
      html += `</div>`;
    });
    return html;
  }

  getDailyContent() {
    const dc = this.econ.dailyChallenge;
    const today = new Date().toDateString();
    const isToday = dc.date === today;

    let html = `<h3 style="color:#00d4ff;">📅 Sfida Giornaliera</h3>`;
    html += `<div style="margin:15px 0;padding:15px;background:rgba(0,212,255,0.1);border-radius:10px;">`;
    html += `<div style="color:#ffd700;font-weight:bold;">${isToday?'Oggi':'Domani'}</div>`;
    html += `<div>Livello: ${this.game.levels[dc.levelId]?.name || 'Sconosciuto'}</div>`;
    html += `<div>Astronave: ${SHIP_TYPES[dc.shipType]?.name || '...'}</div>`;
    html += `<div>⏱ Obiettivo tempo: ${dc.targetTime.toFixed(0)}s</div>`;
    html += `<div>⛽ Obiettivo fuel: ${dc.targetFuel.toFixed(0)}%</div>`;
    html += `<div>⭐ Obiettivo stelle: ${dc.targetStars}</div>`;
    html += `<div style="color:#33ff66;font-weight:bold;margin-top:10px;">💰 Ricompensa: ${dc.bonusCredits} credits</div>`;
    html += `</div>`;
    html += `<button id="daily-accept" style="padding:10px 20px;background:#ffd700;color:#000;border:none;border-radius:10px;cursor:pointer;font-size:1rem;">Accetta Sfida</button>`;
    html += `<div style="margin-top:10px;font-size:0.8rem;color:#888;">Nuova sfida ogni giorno a mezzanotte</div>`;
    return html;
  }
}
