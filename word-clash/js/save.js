/* SAVE — localStorage: autosave, manuale, reset, import/export, difesa offline. */
'use strict';

const save = {
  KEY: 'word_clash_save_v1',
  _sanitize(){
    const knownB = new Set(BUILDINGS.map(b => b.id));
    const knownW = new Set(WORDS.map(w => w.id));
    for (const id in G.buildings){
      if (!knownB.has(id)){
        delete G.buildings[id];
        continue;
      }
      const b = G.buildings[id];
      b.level = clamp(Math.floor(b.level || 1), 1, 5);
      if (b.state !== 0) b.state = 1;
    }
    for (const id in G.army) if (!knownW.has(id)) delete G.army[id];
    G.walls = clamp(Math.floor(G.walls || 0), 0, wallMax());
    G.money = clamp(G.money, 0, storageCap());
    G.dobloni = clamp(G.dobloni, 0, dobloniCap());
    G.builders = clamp(G.builders, BALANCE.buildersStart, BALANCE.buildersMax);
    if (!Array.isArray(G.log)) G.log = [];
  },
  _snapshot(){
    G.lastSeen = Date.now();
    const s = JSON.parse(JSON.stringify(G));
    delete s.rng;
    delete s.toast;
    return { v: G.version, savedAt: Date.now(), state: s };
  },
  save(){
    try{
      localStorage.setItem(this.KEY, JSON.stringify(this._snapshot()));
      return true;
    }catch(e){ return false; }
  },
  load(){
    try{
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.state) return null;
      Object.assign(G, data.state);
      G.rng = null;
      G.toast = null;
      G.lastSeen = data.state.lastSeen || Date.now();
      this._sanitize();
      settleBuildings();
      this._offlineDefense();
      return data;
    }catch(e){ return null; }
  },
  clear(){ try{ localStorage.removeItem(this.KEY); }catch(e){} },
  exportB64(){ return btoa(unescape(encodeURIComponent(JSON.stringify(this._snapshot())))); },
  importB64(b64){
    try{
      const data = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!data || !data.state) return false;
      Object.assign(G, data.state);
      G.rng = null; G.toast = null;
      G.lastSeen = data.state.lastSeen || Date.now();
      this._sanitize();
      settleBuildings();
      this.save();
      return true;
    }catch(e){ return false; }
  },
  /* mentre sei via una rivale può tentare l'assalto: le tue difese rispondono da sole */
  _offlineDefense(){
    const awayMin = Math.floor((Date.now() - (G.lastSeen || Date.now())) / 60000);
    if (awayMin < 30) return;
    const p = Math.min(1, (awayMin / BALANCE.defense.perMinute) * BALANCE.defense.attackChance);
    if (!chance(p)) return;
    const tor = getBuilding('torretta');
    const tDps = buildingLevel('torretta') >= 1 ? tor.dps[buildingLevel('torretta') - 1] : 0;
    const muro = getBuilding('muro');
    const wHp = buildingLevel('muro') >= 1 ? muro.wallHp[buildingLevel('muro') - 1] : 0;
    const defPower = tDps * 4 + (G.walls * wHp) / 60 + 10;
    const rivalLv = Math.max(1, Math.ceil(catalogoLevel() / 2));
    const attPower = rivalLv * 12 + rnd() * 20;
    if (defPower >= attPower){
      G.log.unshift({ t: Date.now(), icon: '🛡️', text: 'Difesa perfetta! Le Torrette del Correttore hanno respinto un\'assalto notturno.' });
    }else{
      const steal = Math.min(G.money, Math.floor(storageCap() * BALANCE.defense.maxSteal));
      G.money -= steal;
      G.log.unshift({ t: Date.now(), icon: '💨', text: 'Un\'orda di sinonimi ha saccheggiato la libreria: perse €' + fmt(steal) + '.' });
    }
    G.log = G.log.slice(0, BALANCE.maxLog);
  }
};

function autosave(){ save.save(); }