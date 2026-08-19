/* UI — rendering delle 5 viste, modali, griglia della base, schermata di battaglia. */
'use strict';

const BASE_ROWS = 6, BASE_COLS = 8;

const UI = {
  tab: 'home',
  _sel: null,
  _iv: null,
  _battle: false,

  init(){
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.addEventListener('click', () => this.showTab(t.dataset.view)));
    this.refreshUI();
    if (this._iv) clearInterval(this._iv);
    this._iv = setInterval(() => {
      settleBuildings();
      this.refreshUI();
      this._updateTimers();
    }, 1000);
    setInterval(() => save.save(), 30000);
  },

  showTab(view){
    this.tab = view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    this.refreshUI();
  },

  refreshUI(){
    $id('res-money').textContent = '🪙 ' + fmt(G.money) + ' / ' + fmt(storageCap());
    $id('res-dobloni').textContent = '💛 ' + G.dobloni + ' / ' + dobloniCap();
    $id('res-builders').textContent = '👷 ' + buildersFree() + '/' + G.builders;
    $id('res-cap').textContent = '📓 ' + G.armyLibri() + ' · 🧱 ' + G.walls;
    const view = $id('view');
    if (this.tab === 'home') view.innerHTML = this._vHome();
    else if (this.tab === 'army') view.innerHTML = this._vArmy();
    else if (this.tab === 'mini') view.innerHTML = this._vMini();
    else if (this.tab === 'attack') view.innerHTML = this._vAttack();
    else if (this.tab === 'shop') view.innerHTML = this._vShop();
    view.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => this._act(el.dataset.act)));
    this._ticker();
  },

  _ticker(){
    const t = $id('ticker');
    if (!G.log.length){ t.textContent = '💡 Un nuovo bibliotecario lavora gratis? No, ma è molto motivato.'; return; }
    const e = G.log[0];
    t.textContent = e.icon + ' ' + e.text;
  },

  toast(msg){
    const t = $id('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2600);
  },

  openModal(html){
    const m = $id('modal');
    m.innerHTML = html;
    m.classList.add('show');
  },
  closeModal(){ $id('modal').classList.remove('show'); $id('modal').innerHTML = ''; },

  /* ---------- HOME: la griglia della libreria ---------- */
  _vHome(){
    let grid = '';
    for (const b of BUILDINGS){
      const lv = buildingLevel(b.id);
      const busy = buildingBusy(b.id);
      const unlocked = catalogoLevel() >= b.unlock;
      const pending = b.category === 'production' ? pendingProd(b.id) : 0;
      grid += `
        <div class="base-card ${!unlocked ? 'locked' : ''}" data-act="building:${b.id}"
             style="left:${(b.cell[1] + 0.5) / BASE_COLS * 100}%;top:${(b.cell[0] + 0.5) / BASE_ROWS * 100}%">
          <div class="bc-emoji">${unlocked ? b.emoji : '🔒'}</div>
          ${lv >= 1 ? `<div class="bc-lv">Lv ${lv}</div>` : ''}
          ${busy ? `<div class="bc-time">⏳ ${fmtTime(remainingBuildTime(b.id))}</div>` : (pending > 0 ? `<div class="bc-coin">🪙 ${fmt(pending)}</div>` : '')}
        </div>`;
    }
    const m = getBuilding('muro');
    const lv = Math.max(1, buildingLevel('muro'));
    const wc = wallCost();
    return `
      <div class="section-title">La tua Libreria 🏛️</div>
      <div class="base-map">${grid}</div>
      <div class="base-info">
        <span>🧱 Muri: ${G.walls}/${wallMax()}</span>
        <span class="btn mini" data-act="wall">+ Muro (🪙 ${fmt(wc.cost)})</span>
        <span class="sub">cat ${memo()}</span>
      </div>
      <div class="section-title">Edifici</div>
      <div class="b-list">
        ${BUILDINGS.map(b => {
          const lv = buildingLevel(b.id);
          const busy = buildingBusy(b.id);
          const unlocked = catalogoLevel() >= b.unlock;
          const sub = !unlocked ? `🔒 Catalogo Lv ${b.unlock}` : busy ? `⏳ ${fmtTime(remainingBuildTime(b.id))}` : `Lv ${lv}/${maxLevelFor(b.id)}`;
          const pend = b.category === 'production' ? ` · 🪙 ${fmt(pendingProd(b.id))} da raccogliere` : '';
          return `<div class="row" data-act="building:${b.id}"><span>${b.emoji} ${esc(b.name)}</span><span class="sub">${sub}${pend}</span></div>`;
        }).join('')}
      </div>`;
  },

  /* ---------- ARMATA ---------- */
  _vArmy(){
    const cap = warCapacity();
    const stock = totalStock();
    const unlocked = unlockedWords();
    return `
      <div class="section-title">Quaderno di Guerra 📓</div>
      <div class="bar"><i style="width:${Math.min(100, stock / Math.max(1, stockCap()) * 100)}%"></i></div>
      <div class="sub">Parole in magazzino: ${stock}/${stockCap()} · schierabili in battaglia: ${cap}</div>
      <div class="section-title">Parole-Truppa</div>
      ${unlocked.map(w => {
        const st = computeWordStats(w);
        const n = G.army[w.id] || 0;
        return `
          <div class="word-row">
            <div class="wr-icon">${w.emoji}</div>
            <div class="wr-main">
              <div class="wr-name">${w.word} ${w.trait ? '<span class="trait">' + w.trait + '</span>' : ''} ${w.type !== 'melee' ? '<span class="trait">' + w.type + '</span>' : ''}</div>
              <div class="sub">❤️${st.hp} · ⚔️${st.dps} · 👟${Math.round(st.speed)}${st.ranged ? ' · 🎯range' : ''}</div>
            </div>
            <div class="wr-actions">
              <span class="sub">x${n}</span>
              <span class="btn mini" data-act="train:${w.id}">Stampa 🪙${fmt(trainCost(w))}</span>
            </div>
          </div>`;
      }).join('') || '<div class="sub">Potenzia la Tipografia per stampare parole-truppa.</div>'}
      <div class="section-title">Parola Libera ✍️</div>
      <div class="sub">In battaglia puoi digitare una parola (${BALANCE.freeWord.min}–${BALANCE.freeWord.max} lettere): le sue statistiche nascono dalle lettere che scegli.</div>`;
  },

  /* ---------- MINIGIOCHI ---------- */
  _vMini(){
    return `
      <div class="section-title">Giochi di Parole 🎮</div>
      ${MINIGAMES.map(m => {
        const cd = cooldownLeft(m.id);
        return `
          <div class="word-row">
            <div class="wr-icon">${m.emoji}</div>
            <div class="wr-main">
              <div class="wr-name">${esc(m.name)}</div>
              <div class="sub">${esc(m.desc)}</div>
            </div>
            <div class="wr-actions">
              ${cd > 0 ? `<span class="sub">⏳ ${cd}s</span>` : `<span class="btn mini green" data-act="mini:${m.id}">Gioca!</span>`}
            </div>
          </div>`;
      }).join('')}
      <div class="sub" style="margin-top:10px">Le monete dei giochi ricaricano il tesoro; l'Impiccato paga anche in dobloni 💛.</div>`;
  },

  /* ---------- ATTACCA ---------- */
  _vAttack(){
    const cata = catalogoLevel();
    const wins = G.stats.wins || 0, bats = G.stats.battles || 0, three = G.stats.threeStars || 0;
    return `
      <div class="section-title">Librerie da Assaltare ⚔️</div>
      <div class="sub">Record: ${bats} assalti · ${wins} vittorie · 🏆 ${three} da 3 stelle</div>
      ${RIVALS.map(r => {
        const unlocked = cata >= r.needCatalogo;
        const stars = r.dobloni >= 5 ? '★★★' : r.dobloni >= 3 ? '★★☆' : '★☆☆';
        return `
          <div class="row ${unlocked ? '' : 'locked'}">
            <span>${r.emoji} ${esc(r.name)}</span>
            <span class="sub">
              ${unlocked ? `🪙 ${fmt(r.loot)} · 💛 ${r.dobloni} ${stars} · <span class="btn mini" data-act="attack:${r.id}">Attacca</span>`
                : `🔒 serve Catalogo Lv ${r.needCatalogo}`}
            </span>
          </div>`;
      }).join('')}
      <div class="sub" style="margin-top:10px">⭐ 1 stella = 50% distrutto · 2 = 75% · 3 = tutto. Con 3 stelle incassi anche i dobloni. La tua capienza per assalto è ${warCapacity()} parole.</div>`;
  },

  /* ---------- MERCATO ---------- */
  _vShop(){
    const bc = builderCostNext();
    const wc = wallCost();
    const lab = getBuilding('laboratorio');
    const labLv = buildingLevel('laboratorio');
    return `
      <div class="section-title">Mercato 🏪</div>
      <div class="word-row">
        <div class="wr-icon">👷</div>
        <div class="wr-main"><div class="wr-name">Bibliotecari</div><div class="sub">${G.builders}/${BALANCE.buildersMax} al lavoro sulla tua libreria.</div></div>
        <div class="wr-actions">${bc == null ? '<span class="sub">Max!</span>' : `<span class="btn mini" data-act="builder">Assumi 💛${bc}</span>`}</div>
      </div>
      <div class="word-row">
        <div class="wr-icon">🧱</div>
        <div class="wr-main"><div class="wr-name">Muro di Enciclopedie</div><div class="sub">${G.walls}/${wallMax()} · 🪙${fmt(wc.cost)}</div></div>
        <div class="wr-actions"><span class="btn mini" data-act="wall">Compra</span></div>
      </div>
      ${labLv >= 1 ? `<div class="sub" style="margin-top:10px">🧪 Laboratorio Lv ${labLv}: le tue parole hanno ${Math.round((lab.boost[labLv - 1] - 1) * 100)}% di HP e danni in più.</div>` : ''}
      <div class="section-title">Dove trovo i Dobloni? 💛</div>
      <div class="sub">Assalti a 3 stelle, l'Impiccato del Bibliotecario, e costruisci lo Scrigno per custodirne di più. In fretta servono? Saltaci sopra i tempi di costruzione.</div>
      <div class="section-title">Gestione</div>
      <div class="row"><span>💾 Salva</span><span class="btn mini" data-act="save">Ora</span></div>
      <div class="row"><span>♻️ Nuova partita</span><span class="btn mini" data-act="reset">Reset</span></div>`;
  },

  /* ---------- AZIONI ---------- */
  _act(a){
    if (a.startsWith('building:')) return this._buildingModal(a.slice(9));
    if (a.startsWith('train:')) return this._train(a.slice(6));
    if (a.startsWith('mini:')) return this._playMini(a.slice(5));
    if (a.startsWith('attack:')) return this._startBattle(a.slice(7));
    if (a === 'wall') return this._wall();
    if (a === 'builder') return this._builder();
    if (a === 'save'){ save.save(); this.toast('💾 Salvato!'); }
    if (a === 'reset'){
      if (confirm('Eliminare la libreria e ricominciare?')){
        save.clear();
        newGame();
        this.refreshUI();
        this.toast('Nuova libreria aperta. In bocca al lupo.');
      }
    }
  },

  _wall(){
    const r = buyWall();
    this.toast(r.ok ? r.msg : r.reason);
    this.refreshUI();
  },
  _builder(){
    const r = buyBuilder();
    this.toast(r.ok ? r.msg : r.reason);
    this.refreshUI();
  },
  _train(id){
    const r = train(id);
    this.toast(r.ok ? r.msg : r.reason);
    this.refreshUI();
  },
  _playMini(id){
    const cd = cooldownLeft(id);
    if (cd > 0){ this.toast('⏳ Riprova tra ' + cd + 's.'); return; }
    MGAME.start(id, this);
  },

  _buildingModal(id){
    const b = getBuilding(id);
    const lv = buildingLevel(id);
    const busy = buildingBusy(id);
    const maxLv = maxLevelFor(id);
    const isFull = lv >= maxLv;
    const unlocked = catalogoLevel() >= b.unlock;
    const lc = !isFull && unlocked ? levelCost(id, lv + 1) : null;
    const pending = b.category === 'production' ? pendingProd(id) : 0;
    const bf = buildersFree();
    const rem = busy ? remainingBuildTime(id) : 0;
    let html = `
      <div class="b-modal">
        <button class="close" data-close>✕</button>
        <div class="result-hero"><div class="emoji">${b.emoji}</div><h2>${esc(b.name)}</h2></div>
        <p class="sub">${esc(b.desc)}</p>`;
    if (!unlocked){
      html += `<p>🔒 Si sblocca con il Catalogo Centrale al livello ${b.unlock}.</p>`;
    }else if (busy){
      html += `<div class="bar"><i style="width:${100 - (rem / Math.max(1, lc.time * 60) * 100)}%"></i></div>
        <p class="sub">In costruzione: ancora ${fmtTime(rem)} (${fmtTime(lc.time * 60)} totali).</p>
        <div class="actions"><span class="btn" data-act="skip:${id}">⏩ Salta con 💛${Math.max(1, Math.ceil((rem / 60) * BALANCE.skipDobloniPerMin))}</span></div>`;
    }else if (isFull){
      html += `<p class="sub">Lv ${lv} — massimo raggiungibile. Potenzia il Catalogo Centrale per andare oltre.</p>`;
    }else{
      if (pending > 0) html += `<div class="actions"><span class="btn green" data-act="collect:${id}">Raccogli 🪙 ${fmt(pending)}</span></div>`;
      html += `<div class="actions"><span class="btn" data-act="upgrade:${id}">${lv === 0 ? 'Costruisci' : 'Potenzia → Lv ' + (lv + 1)} (${b.currency === 'dobloni' ? '💛' : '🪙'}${lc.cost} · ${fmtTime(lc.time)})</span></div>
        <p class="sub">Bibliotecari liberi: ${bf}/${G.builders}</p>`;
    }
    if (id === 'muro'){
      const wc = wallCost();
      html += `<div class="actions"><span class="btn" data-act="wall">+ Muro (🪙${fmt(wc.cost)} · ${G.walls}/${wallMax()})</span></div>`;
    }
    html += `</div>`;
    this.openModal(html);
    const mod = $id('modal');
    mod.querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    mod.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', () => {
      const act = el.dataset.act;
      if (act === 'skip:' + id){ const r = skipBuild(id); this.toast(r.ok ? r.msg : r.reason); }
      if (act === 'upgrade:' + id){ const r = startBuild(id); this.toast(r.ok ? r.msg : r.reason); }
      if (act === 'collect:' + id){ const c = collect(id); this.toast(c > 0 ? '🪙 +' + fmt(c) + ' raccolte.' : 'Niente da raccogliere.'); }
      if (act === 'wall'){ const r = buyWall(); this.toast(r.ok ? r.msg : r.reason); }
      this.closeModal();
      this.refreshUI();
    }));
  },

  /* ---------- BATTAGLIA ---------- */
  _startBattle(rivalId){
    const s = battle.start(rivalId);
    if (!s){ this.toast('Catalogo troppo basso per questa rivale.'); return; }
    this._battle = true;
    this._sel = null;
    const tray = this._battleTray();
    const fieldWrap = `
      <div class="b-modal battle-modal">
        <div class="battle-head">
          <span>⚔️ ${esc(s.rival.name)}</span>
          <span id="battle-timer">⏱️ ${Math.ceil(s.timeLeft)}</span>
          <span id="battle-cap">📓 0/${s.capacity}</span>
        </div>
        <div class="battle-field-wrap"><div id="battle-field"></div></div>
        <div id="battle-tray">${tray}</div>
        <div class="sub battle-hint">Tocca una parola per selezionarla, poi tocca i bordi della mappa per schierarla.</div>
        <button class="btn" data-close>Fuga 🙈 (via)</button>
      </div>`;
    this.openModal(fieldWrap);
    const mod = $id('modal');
    mod.querySelector('[data-close]').addEventListener('click', () => { battle.cancel(); this.closeModal(); this._battle = false; this.refreshUI(); });
    mod.querySelectorAll('[data-sel]').forEach(el => el.addEventListener('click', () => {
      const v = el.dataset.sel;
      if (v === 'free'){ this._sel = { free: true, word: '' }; }
      else { this._sel = { free: false, id: v }; }
      mod.querySelectorAll('[data-sel]').forEach(x => x.classList.toggle('picked', x === el));
      if (v === 'free') mod.querySelector('[data-free-input]').focus();
    }));
    mod.querySelector('[data-free-input]').addEventListener('input', (e) => {
      if (this._sel && this._sel.free) this._sel.word = e.target.value.trim().toUpperCase();
    });
    battle.bindDom(this);
    battle.startLoop(this);
  },

  _battleTray(){
    const s = battle._s;
    let html = '';
    for (const id in G.army){
      const def = getWord(id);
      const n = Math.min(G.army[id], s.capacity);
      if (n > 0) html += `<span class="tray-item" data-sel="${id}">${def.emoji} ${def.word} <b>x${n}</b></span>`;
    }
    html += `<span class="tray-item" data-sel="free">✍️ Libera <input data-free-input placeholder="es. STREGA" maxlength="12"></span>`;
    return html;
  },

  _bindFieldDeploy(){
    const field = $id('battle-field');
    if (!field) return;
    field.addEventListener('click', (e) => {
      const s = battle._s;
      if (!s || s.over) return;
      const rect = field.getBoundingClientRect();
      const c = Math.floor((e.clientX - rect.left) / rect.width * s.cols);
      const r = Math.floor((e.clientY - rect.top) / rect.height * s.rows);
      if (!(r === 0 || r === s.rows - 1 || c === 0 || c === s.cols - 1)) return;
      let res;
      if (this._sel && this._sel.free){
        res = battle.deployFree(this._sel.word, r, c);
        if (res.ok){ this._sel = null; }
      }else if (this._sel && !this._sel.free){
        res = battle.deployAt(this._sel.id, r, c);
      }else{
        return this.toast('Seleziona prima una parola dal cassetto.');
      }
      if (res && res.ok){
        $id('battle-cap').textContent = '📓 ' + s.deployed + '/' + s.capacity;
        this._refreshTray();
      }else if (res){
        this.toast(res.reason);
      }
    });
  },

  _refreshTray(){
    const s = battle._s;
    if (!s) return;
    const tray = $id('battle-tray');
    tray.innerHTML = this._battleTray();
    tray.querySelectorAll('[data-sel]').forEach(el => el.addEventListener('click', () => {
      const v = el.dataset.sel;
      if (v === 'free') this._sel = { free: true, word: '' };
      else this._sel = { free: false, id: v };
      tray.querySelectorAll('[data-sel]').forEach(x => x.classList.toggle('picked', x === el));
    }));
    const freeInput = tray.querySelector('[data-free-input]');
    if (freeInput) freeInput.addEventListener('input', (e) => { if (this._sel && this._sel.free) this._sel.word = e.target.value.trim().toUpperCase(); });
  },

  _updateTimers(){
    if (!this._battle) return;
    const s = battle._s;
    if (!s) return;
    const t = $id('battle-timer');
    if (t) t.textContent = '⏱️ ' + Math.max(0, Math.ceil(s.timeLeft));
  },

  _onBattleEnd(){
    const res = battle.end();
    if (!res) return;
    this._battle = false;
    const stars = res.stars;
    this.closeModal();
    this.openModal(`
      <div class="b-modal result-modal">
        <div class="result-hero">
          <div class="emoji">${stars >= 3 ? '🏆' : stars >= 1 ? '⭐' : '💔'}</div>
          <h2>${stars >= 3 ? 'Distruzione Totale!' : stars >= 1 ? 'Vittoria di Pirateria Editoriale!' : 'Sconfitta della Parola'}</h2>
          <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
          <p class="sub">${esc(res.rival.name)}</p>
          <p>🪙 +${fmt(res.loot)}${res.dobloni ? ' · 💛 +' + res.dobloni : ''}</p>
        </div>
        <div class="actions"><span class="btn green" data-close>Ottimo!</span></div>
      </div>`);
    $id('modal').querySelector('[data-close]').addEventListener('click', () => this.closeModal());
    this.refreshUI();
    save.save();
  }
};

function memo(){ return getBuilding('catalogo').emoji + ' Lv ' + catalogoLevel() + ' · 👷 ' + buildersFree() + '/' + G.builders; }

G.armyLibri = function(){ return Object.keys(G.army).reduce((s, id) => s + (G.army[id] || 0), 0); };