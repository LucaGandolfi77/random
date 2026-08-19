/* SAVE — localStorage: autosave, manuale, reset, import/export. */
'use strict';

const save = {
  KEY: 'friends_tycoon_save_v1',
  _sanitize(){
    const known = new Set((typeof CHARACTERS !== 'undefined' ? CHARACTERS : []).map(c => c.id));
    if (Array.isArray(G.friends)) G.friends = G.friends.filter(f => f && f.id && known.has(f.id));
  },
  _snapshot(){
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
      return data;
    }catch(e){ return null; }
  },
  clear(){ try{ localStorage.removeItem(this.KEY); }catch(e){} },
  exportB64(){
    return btoa(unescape(encodeURIComponent(JSON.stringify(this._snapshot()))));
  },
  importB64(b64){
    try{
      const data = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!data || !data.state) return false;
      Object.assign(G, data.state);
      G.rng = null; G.toast = null;
      G.lastSeen = data.state.lastSeen || Date.now();
      this._sanitize();
      this.save();
      return true;
    }catch(e){ return false; }
  }
};

function autosave(){ save.save(); }