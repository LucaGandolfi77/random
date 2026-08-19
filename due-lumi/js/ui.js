/* I DUE LUMI — HUD, menu, negozio, notifiche */
const UI = {
  toastText:'', toastT:0,
  menu:null, /* {mode, sel, subsel, scroll} */

  notify(text){
    this.toastText = text;
    this.toastT = 2.4;
  },
  update(dt){
    if(this.toastT > 0) this.toastT -= dt;
  },
  drawHUD(ctx){
    const p = G.party;
    if(!p) return;
    /* barre vita (grafica su canvas) */
    boxF(4, 4, 70, 14, 'cream', 'ink');
    pxF(6, 6, 66, 3, 'inkSoft');
    const wm = Math.max(0, Math.round(64 * (p.milo.hp / p.milo.maxHp)));
    pxF(6, 6, wm, 3, p.milo.hp > 0 ? 'honey' : 'slate');
    const wt = Math.max(0, Math.round(64 * (p.tito.hp / p.tito.maxHp)));
    pxF(6, 10, wt, 3, p.tito.hp > 0 ? 'pumpkin' : 'slate');
    /* testo su overlay */
    TXT.text('hud-m', 'M', 7, 5, { size: 7, color: 'ink', weight: 'bold' });
    TXT.text('hud-t', 'T', 7, 10, { size: 7, color: 'ink', weight: 'bold' });

    TXT.text('hud-cr', '● ' + G.crumbs, VW - 50, 4, { size: 7, color: 'gold' });
    TXT.text('hud-mem', '★ ' + G.memCount() + '/12', VW - 50, 12, { size: 7, color: 'rose' });

    /* toast */
    if(this.toastT > 0){
      const a = Math.min(1, this.toastT);
      const tw = Math.round(this.toastText.length * 4) + 10;
      const x = (VW - tw) / 2;
      ctx.globalAlpha = Math.min(1, a);
      boxF(x, 70, tw, 14, 'butter', 'ink');
      ctx.globalAlpha = 1;
      TXT.text('toast', this.toastText, x + 5, 73, { size: 7, color: 'ink', opacity: a });
    } else {
      TXT.hide('toast');
    }
  },
};

/* ---- menu ---- */
const MENU = {
  active:false,
  mode:'pause',
  sel:0,
  scroll:0,
  useWhich:null,
  stock:[],
  modeSel:['OGGETTI','EQUIP','STATO','DIARIO','SALVA','CHIUDI'],

  open(mode){
    this.active = true;
    this.mode = mode || 'pause';
    this.sel = 0; this.scroll = 0; this.useWhich = null;
    if(this.mode === 'shop') this.stock = (SHOP.hub || []).slice();
  },
  close(){ this.active = false; AUD.sfx('cancel'); },

  listMode(){
    if(this.mode === 'shop') return this.stock;
    if(this.mode === 'pause') return this.modeSel;
    if(this.mode === 'items') return this.items;
    if(this.mode === 'equip') return G.owns;
    return [];
  },
  get items(){ return G.invList(); },

  update(dt){
    if(!this.active) return;
    if(this.mode === 'diary'){
      if(INPUT.pressed('B') || INPUT.pressed('start')){ this.mode = 'pause'; this.sel = 0; AUD.sfx('cancel'); }
      return;
    }
    if(this.mode === 'stats'){
      if(INPUT.pressed('B') || INPUT.pressed('start')){ this.mode = 'pause'; this.sel = 0; AUD.sfx('cancel'); }
      return;
    }
    const n = this.listMode().length;
    if(INPUT.pressed('up')){ this.sel = (this.sel + Math.max(1,n) - 1) % Math.max(1,n); AUD.sfx('blip'); }
    if(INPUT.pressed('down')){ this.sel = (this.sel + 1) % Math.max(1,n); AUD.sfx('blip'); }
    if(INPUT.pressed('B') || INPUT.pressed('start')){
      if(this.mode === 'items' || this.mode === 'equip'){ this.mode = 'pause'; this.sel = 0; AUD.sfx('cancel'); return; }
      this.close();
      return;
    }
    if(INPUT.pressed('A')){
      AUD.sfx('confirm');
      if(this.mode === 'pause') this.pauseAction(this.modeSel[this.sel]);
      else if(this.mode === 'shop') this.shopBuy();
      else if(this.mode === 'items'){ this.useItem(this.items[this.sel]); }
      else if(this.mode === 'equip'){ this.toggleEquip(); }
    }
  },
  toggleEquip(){
    const k = G.owns[this.sel];
    const eq = EQUIPS[k];
    if(!eq) return;
    if(G.equipped[k]){ delete G.equipped[k]; AUD.sfx('cancel'); UI.notify(eq.name + ' rimesso via.'); }
    else { G.equipped[k] = true; AUD.sfx('item'); UI.notify(eq.name + ' indossato: ' + eq.stat + ' +' + eq.amt + ' a ' + G.party[eq.who].name + '.'); }
  },
  pauseAction(act){
    switch(act){
      case 'OGGETTI': this.mode='items'; this.sel=0; this.scroll=0; break;
      case 'EQUIP': this.mode='equip'; this.sel=0; this.scroll=0; break;
      case 'STATO': this.mode='stats'; this.sel=0; break;
      case 'DIARIO': this.mode='diary'; this.sel=0; break;
      case 'SALVA': STORY.save(); UI.notify('Gioco salvato.'); break;
      case 'CHIUDI': this.close(); break;
    }
  },
  shopBuy(){
    const key = this.stock[this.sel];
    const it = ITEMS[key];
    if(!it) return;
    if(it.price == null || G.crumbs < it.price){ UI.notify('Briciole insufficienti!'); AUD.sfx('cancel'); return; }
    G.crumbs -= it.price;
    G.inv[key] = (G.inv[key]||0) + 1;
    AUD.sfx('item');
    UI.notify(it.name + ' acquistato.');
  },
  useItem(key){
    const it = ITEMS[key];
    if(!it) return;
    if(it.kind === 'heal' || it.kind === 'healall' || it.kind === 'revive' || it.kind === 'buff'){
      if(it.kind === 'healall'){
        G.party.milo.hp = Math.min(G.party.milo.maxHp, G.party.milo.hp + it.heal);
        G.party.tito.hp = Math.min(G.party.tito.maxHp, G.party.tito.hp + it.heal);
        if(it.cure) G.party.milo.nebbia = G.party.tito.nebbia = false;
        G.inv[key]--; if(G.inv[key]<=0) delete G.inv[key];
        AUD.sfx('heal'); UI.notify(it.name + ': tutti ripristinati.');
        return;
      }
      const who = this.chooseWho();
      if(!who) return;
      if(it.kind === 'heal'){
        who.hp = Math.min(who.maxHp, who.hp + it.heal);
        if(it.cure) who.nebbia = false;
        G.inv[key]--; if(G.inv[key]<=0) delete G.inv[key];
        AUD.sfx('heal'); UI.notify(it.name + ': +' + it.heal + ' PV.');
      } else if(it.kind === 'revive'){
        if(who.hp <= 0){ who.hp = Math.round(who.maxHp * it.heal); G.inv[key]--; if(G.inv[key]<=0) delete G.inv[key]; AUD.sfx('heal'); UI.notify(who.name + ' torna in piedi.'); }
        else UI.notify(who.name + ' è già sveglio.');
      } else if(it.kind === 'buff'){
        who[it.stat+'b'] = (who[it.stat+'b']||0) + it.amt;
        G.inv[key]--; if(G.inv[key]<=0) delete G.inv[key];
        AUD.sfx('item'); UI.notify(it.name + ': ' + it.stat + ' +' + it.amt + '.');
      }
    }
  },
  chooseWho(){
    /* scegli tra Milo e Tito */
    if(G.party.milo.hp <= 0 && G.party.tito.hp > 0) return G.party.tito;
    if(G.party.tito.hp <= 0 && G.party.milo.hp > 0) return G.party.milo;
    if(this._who === undefined) this._who = 0;
    const list = [G.party.milo, G.party.tito];
    const w = list[this._who % 2];
    this._who++;
    return w;
  },

  draw(ctx){
    if(!this.active){
      (this._used || []).forEach(id => TXT.hide(id));
      this._used = [];
      return;
    }
    this._used = [];
    const mtxt = (id, s, x, y, o) => { this._used.push(id); return TXT.text(id, s, x, y, o); };
    ctx.globalAlpha = 0.62;
    pxF(0, 0, VW, VH, 'night');
    ctx.globalAlpha = 1;

    if(this.mode === 'pause' || this.mode === 'shop' || this.mode === 'items'){
      const n = this.listMode().length;
      const bh = Math.min(n, 9) * 9 + 12;
      const bx = 6, by = 20, bw = this.mode==='shop' ? 128 : 96;
      boxF(bx, by, bw, bh, 'cream', 'ink');
      pxF(bx+2, by+2, bw-4, 2, 'butter');
      mtxt('mi-hdr', this.mode==='shop' ? 'LA CESTA' : (this.mode==='items' ? 'OGGETTI' : 'PAUSA'), bx+4, by-9, { size: 8, color: 'terracotta', weight: 'bold' });
      mtxt('mi-cr', '● '+G.crumbs, bx + bw - 40, by - 9, { size: 8, color: 'gold' });
      const vis = Math.min(n, 9);
      const s0 = Math.max(0, this.sel - (vis-1));
      for(let i=0;i<vis;i++){
        const idx = s0 + i;
        if(idx >= n) break;
        const label = this.listMode()[idx];
        const disp = (this.mode==='shop' || this.mode==='items') ? ITEMS[label].name : label;
        const price = this.mode==='shop' ? ITEMS[label].price : null;
        const y = by + 6 + i*9;
        if(idx === this.sel){ pxF(bx+2, y-1, bw-4, 8, 'butter'); mtxt('mi-row-'+i, '► ' + disp, bx + 3, y, { size: 7, color: 'ink', weight: 'bold' }); }
        else mtxt('mi-row-'+i, disp, bx + 9, y, { size: 7, color: 'inkSoft' });
        if(price != null) mtxt('mi-pr-'+i, ''+price, bx + bw - 24, y, { size: 7, color: G.crumbs>=price ? 'gold' : 'ember', align: 'right', width: 20 });
        if(this.mode==='items') mtxt('mi-cnt-'+i, '×'+(G.inv[label]||0), bx + bw - 30, y, { size: 7, color: 'inkSoft' });
      }
      for(let i=vis;i<9;i++) TXT.hide('mi-row-'+i);
      if(this.mode==='items'){
        mtxt('mi-hint', 'A: usa   B: indietro', bx + 4, by + bh - 5, { size: 7, color: 'inkSoft' });
      } else TXT.hide('mi-hint');
      return;
    }

    /* schermate a pagina singola */
    if(this.mode === 'equip'){ this.drawEquip(ctx, mtxt); return; }
    if(this.mode === 'stats'){ this.drawStats(ctx, mtxt); return; }
    if(this.mode === 'diary'){ this.drawDiary(ctx, mtxt); return; }
  },
  drawEquip(ctx, mtxt){
    const owns = G.owns;
    const bh = owns.length * 9 + 14;
    const bx = 6, by = 20, bw = 150;
    boxF(bx, by, bw, bh, 'cream', 'ink');
    mtxt('eq-hdr', 'EQUIP', bx+4, by-9, { size: 8, color: 'terracotta', weight: 'bold' });
    owns.forEach((k, i) => {
      const eq = EQUIPS[k];
      const y = by + 6 + i*9;
      const on = G.equipped[k] === true;
      mtxt('eq-row-'+i, '[' + (on?'×':' ') + '] ' + eq.name, bx+5, y, { size: 7, color: i===this.sel ? 'ink' : 'inkSoft', weight: i===this.sel ? 'bold' : 'normal' });
    });
    const selEq = EQUIPS[owns[this.sel]];
    if(selEq){
      const who = G.party[selEq.who];
      mtxt('eq-detail', who.name + ': ' + selEq.stat + ' +' + selEq.amt, bx+5, by + bh + 2, { size: 7, color: 'inkSoft' });
    } else TXT.hide('eq-detail');
    mtxt('eq-hint', 'A: equip  B: indietro', bx+4, by + bh + 11, { size: 7, color: 'inkSoft' });
  },
  drawStats(ctx, mtxt){
    const p = G.party;
    const bx = 6, by = 20;
    const rows = [];
    rows.push('MILO  liv '+p.milo.lvl);
    rows.push('  PV '+p.milo.hp+'/'+p.milo.maxHp);
    rows.push('  Pot '+effStat(p.milo,'pow')+'  Dif '+effStat(p.milo,'def')+'  Vel '+effStat(p.milo,'spd'));
    rows.push('');
    rows.push('TITO  liv '+p.tito.lvl);
    rows.push('  PV '+p.tito.hp+'/'+p.tito.maxHp);
    rows.push('  Pot '+effStat(p.tito,'pow')+'  Dif '+effStat(p.tito,'def')+'  Vel '+effStat(p.tito,'spd'));
    rows.push('');
    rows.push('Briciole: '+G.crumbs);
    rows.push('Memorie: '+G.memCount()+'/12');
    rows.push('Capitolo: '+G.chapter);
    const bh = rows.length * 9 + 10;
    boxF(bx, by, 130, bh, 'cream', 'ink');
    rows.forEach((r, i)=> mtxt('st-line-'+i, r, bx+5, by+4+i*9, { size: 7, color: 'ink' }));
    mtxt('st-hint', 'B: indietro', bx+4, by + bh + 3, { size: 7, color: 'inkSoft' });
  },
  drawDiary(ctx, mtxt){
    const pages = STORY.diary();
    const p = pages[Math.min(pages.length-1, this.sel)];
    const bx = 6, by = 20, bw = VW - 12, bh = 120;
    boxF(bx, by, bw, bh, 'cream', 'ink');
    mtxt('di-hdr', 'DIARIO — pag.' + (this.sel+1) + '/' + pages.length, bx+4, by-9, { size: 8, color: 'terracotta', weight: 'bold' });
    const lines = wrap(p, 44);
    lines.slice(0, 13).forEach((l, i)=> mtxt('di-line-'+i, l, bx+5, by+4+i*9, { size: 7, color: 'ink' }));
    for(let i=lines.length;i<13;i++) TXT.hide('di-line-'+i);
    if(INPUT.pressed('A') && this.sel < pages.length-1) this.sel++;
    if(INPUT.pressed('B')){
      if(this.sel > 0) this.sel--;
      else { this.mode = 'pause'; this.sel = 0; AUD.sfx('cancel'); }
    }
    mtxt('di-hint', 'A: avanti  B: indietro', bx+4, by + bh + 3, { size: 7, color: 'inkSoft' });
  },
};

function effStat(who, s){
  let v = who[s] + (who[s+'b']||0);
  for(const k in G.equipped){
    if(G.equipped[k]){
      const eq = EQUIPS[k];
      if(eq.who === who.id && eq.stat === s) v += eq.amt;
    }
  }
  return v;
}