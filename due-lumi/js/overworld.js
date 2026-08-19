/* I DUE LUMI — overworld: esplorazione, fisica, interazioni, puzzle */
const OW = {
  room:null,
  p:{ x:20, y:200, vx:0, vy:0, dir:1, facing:0, anim:0, moving:false },
  bob:0,
  hint:null,
  hintMsg:'',
  hintT:0,
  roomT:0,
  roomLabel:'',
  temp:[], /* interattivi temporanei: nemici, memorie, npc */
  talked:[], /* per evitare di far ripartire dialoghi da capo su npc già parlati */

  hint(msg, t){
    OW.hintMsg = msg;
    OW.hintT = t;
  },
};

function npcSprite(id){
  const map = {
    nonna:'nonna_art2', signora:'elide_art2', falco:'falco_art2',
    bambina:'tito_idle_b', contadina:'elide_art2',
    custodeeco:'custode', focascena:'foca',
    custode:'custode', foca:'foca', vento:'vento', ramenta:'ramenta', specchio:'specchio',
  };
  return map[id] || 'milo_idle_b';
}

G.scenes.overworld = {
  enter(opts){
    opts = opts || {};
    OW.room = ROOMS[opts.room || 'hubA'];
    G.flags['lastroom'] = OW.room.id;
    OW.p.x = opts.x != null ? opts.x : OW.room.spawn.x;
    OW.p.y = opts.y != null ? opts.y : OW.room.spawn.y;
    OW.p.vx = 0; OW.p.vy = 0;
    OW.temp = [];
    OW.roomT = 1.6;
    OW.roomLabel = roomTitle(OW.room.id);
    const z = ZONES[OW.room.zone];
    if(z && z.song) AUD.playSong(z.song);
    this.rebuildTemp();
    if(!G.flags['seen:'+OW.room.id]){
      G.flags['seen:'+OW.room.id] = true;
      const script = SCRIPT.enter(OW.room.id);
      if(script) DIALOGUE.open(script);
    }
  },
  update(dt){
    UI.update(dt);
    if(DIALOGUE.active){ DIALOGUE.update(dt); return; }
    if(MENU.active){ MENU.update(dt); if(!MENU.active){} return; }
    if(OW.roomT > 0) OW.roomT -= dt;

    const p = OW.p;
    const axis = INPUT.axis();

    /* movimento a 4 direzioni (top-down) */
    const SPD = 66;
    p.vx = axis.x * SPD;
    p.vy = axis.y * SPD;
    p.moving = (p.vx !== 0 || p.vy !== 0);
    if(p.vx !== 0){ p.dir = p.vx > 0 ? 1 : -1; p.facing = p.vx > 0 ? 0 : 1; }
    else if(p.vy !== 0){ p.facing = p.vy > 0 ? 3 : 2; }

    /* martello */
    if(INPUT.pressed('B')){
      this.tryHammer();
    }

    /* movimento x con collisione */
    let nx = p.x + p.vx * dt;
    p.x = collideX(p, nx);

    /* movimento y con collisione */
    let ny = p.y + p.vy * dt;
    p.y = collideY(p, ny);

    /* animazione */
    if(p.moving){ p.anim += dt * 7; }
    else { p.anim = 0; }

    /* interazione A */
    if(INPUT.pressed('A')) this.interact();

    /* menu pausa */
    if(INPUT.pressed('start')){ MENU.open('pause'); return; }

    /* trigger, switch, nemici */
    this.checkSwitch();
    this.checkEnemies();
    this.checkTriggers();
    this.checkMemories();
    this.checkFell();

    /* uscite */
    this.checkExits();

    /* camera */
    const r = OW.room;
    let cx = p.x - 104, cy = p.y - 84;
    cx = clamp(cx, 0, Math.max(0, r.w - VW));
    cy = clamp(cy, 0, Math.max(0, r.h - VH));
    G.cam.x = cx; G.cam.y = cy;

    /* hint */
    if(OW.hintT > 0) OW.hintT -= dt;
  },

  tryHammer(){
    const p = OW.p;
    AUD.sfx('hammer');
    const f = FACE_VEC[p.facing];
    const tx = Math.floor((p.x + f.x * 15) / 16);
    const ty = Math.floor((p.y - 6 + f.y * 13) / 16);
    let broke = false;
    const ch = tileAt(OW.room, tx, ty);
    if(ch === 'X' && ty >= 0 && ty < OW.room.map.length){
      setTile(OW.room, tx, ty, '.');
      broke = true;
    }
    if(broke){ AUD.sfx('break'); OW.hint('Mmh! Blocchi rotti!', 1.2); }
    else { OW.hint('Martello: niente da rompere qui.', 1.0); }
  },

  interact(){
    const p = OW.p;
    const f = FACE_VEC[p.facing];
    const probe = { x: p.x + f.x * 13 - 8, y: p.y - 6 + f.y * 13 - 8, w: 16, h: 16 };
    const candidates = [];
    (OW.temp || []).forEach(o => {
      if(o.kind === 'npc' || o.kind === 'mem'){
        if(rectsOverlap(probe, o)) candidates.push({ o, d: dist(o, probe) });
      }
    });
    (OW.room.doors || []).forEach(d => {
      const dx = d.tx * 16, dy = d.ty * 16;
      if(rectsOverlap(probe, { x: dx, y: dy, w: 16, h: 16 })) candidates.push({ o: { kind:'door', door:d }, d: dist({x:dx,y:dy}, probe) });
    });
    if(!candidates.length){ return; }
    candidates.sort((a,b)=>a.d-b.d);
    const target = candidates[0].o;
    if(target.kind === 'npc'){
      OW.hintT = 0;
      const id = target.npc.id;
      const script = SCRIPT.npc(id);
      if(script) DIALOGUE.open(script);
    } else if(target.kind === 'mem'){
      this.collectMemory(target.idx);
    } else if(target.kind === 'door'){
      const d = target.door;
      if(d.switch && !G.flags[d.switch]){ AUD.sfx('cancel'); OW.hint('Chiusa. Serve qualcosa di speciale...', 1.4); return; }
      if(d.requires && !G.flags[d.requires]){ AUD.sfx('cancel'); OW.hint('Non si apre ancora.', 1.2); return; }
      AUD.sfx('door');
      fadeTo(1, 0.4, () => {
        G.scenes.overworld.enter({ room: d.to, x: d.spawn.x, y: d.spawn.y });
        fadeTo(0, 0.4);
      });
    }
  },

  collectMemory(idx){
    const m = OW.room.mem[idx];
    if(!m || G.memories[m.id]) return;
    G.memories[m.id] = true;
    G.flags['mem'+m.id] = true;
    AUD.sfx('memory');
    OW.hint('Memoria ritrovata  (' + G.memCount() + '/12)', 2.0);
    const script = SCRIPT.memory(m.id);
    if(script) DIALOGUE.open(script);
    STORY.afterMemory();
  },

  checkSwitch(){
    const p = OW.p;
    const tx = Math.floor((p.x + 8) / 16);
    const ty = Math.floor((p.y + 2) / 16);
    if(tileAt(OW.room, tx, ty) === 'S'){
      OW.room.switches.forEach(s => {
        if(s.tx === tx && s.ty === ty && !G.flags[s.flag]){
          G.flags[s.flag] = true;
          AUD.sfx('item');
          OW.hint('Click! Qualcosa si è aperto.', 1.4);
        }
      });
    }
  },

  checkEnemies(){
    const p = OW.p;
    OW.room.enemies && OW.room.enemies.forEach((en, i) => {
      if(G.flags['enemy:'+OW.room.id+':'+i]) return;
      const ex = en.x, ey = en.y;
      if(Math.abs(p.x + 8 - ex) < 16 && Math.abs((p.y + 14) - (ey + 8)) < 26){
        G.flags['enemy:'+OW.room.id+':'+i] = true;
        this.startBattle(en.id);
      }
    });
    /* boss: raggiungi il cuore della stanza */
    if(OW.room.boss && !G.flags['boss:'+OW.room.boss]){
      const threshold = OW.room.bossAt || OW.room.w/2;
      if(p.x > threshold) this.startBattle(OW.room.boss);
    }
  },

  checkTriggers(){
    const p = OW.p;
    (OW.room.triggers || []).forEach(tr => {
      if(tr.once && G.flags[tr.flag]) return;
      if(rectsOverlap({ x:p.x-4, y:p.y-16, w:24, h:22 }, { x:tr.x, y:tr.y, w:tr.w||16, h:tr.h||16 })){
        G.flags[tr.flag] = true;
        if(tr.action === 'battle') this.startBattle(tr.boss);
        else if(tr.dialogue) DIALOGUE.open(SCRIPT.named(tr.dialogue));
      }
    });
  },

  checkMemories(){
    const p = OW.p;
    (OW.room.mem || []).forEach((m, i) => {
      if(G.memories[m.id]) return;
      if(Math.abs(p.x + 8 - m.x) < 14 && Math.abs((p.y + 14) - (m.y + 6)) < 24){
        this.collectMemory(i);
      }
    });
  },

  checkFell(){
    /* in top-down non si può cadere: i baratri (G) sono solidi.
       Sicurezza: se si finisce fuori mappa, torna allo spawn. */
    if(OW.p.y > OW.room.h + 24 || OW.p.x < -16 || OW.p.x > OW.room.w + 16){
      this.enter({ room: OW.room.id, x: OW.room.spawn.x, y: OW.room.spawn.y });
    }
  },

  checkExits(){
    const p = OW.p, r = OW.room;
    const e = r.exits || {};
    if(p.x < -6 && e.left){ this.go(e.left); }
    else if(p.x > r.w - 14 && e.right){ this.go(e.right); }
    else if(p.y < -6 && e.up){ this.go(e.up); }
    else if(p.y > r.h - 14 && e.down){ this.go(e.down); }
  },
  go(exit){
    if(G.fade.dur > 0) return;        /* evita di riavviare la fade se già in corso */
    const { to, x, y } = exit;
    fadeTo(1, 0.35, () => {
      G.scenes.overworld.enter({ room: to, x: x != null ? x : undefined, y });
      fadeTo(0, 0.35);
    });
  },

  startBattle(id){
    if(G.flags['battlebusy']) return;
    G.flags['battlebusy'] = true;
    const prevSong = AUD.current();
    const isBoss = OW.room.boss === id;
    let enemyKey = null;
    if(!isBoss){
      const idx = (OW.room.enemies||[]).findIndex(e => e.id === id);
      if(idx >= 0) enemyKey = 'enemy:'+OW.room.id+':'+idx;
    }
    G.lastBattle = { enemyId:id, roomId:OW.room.id, enemyKey, boss:isBoss };
    fadeTo(1, 0.5, () => {
      BATTLE.start(id, OW.room.id, prevSong);
      fadeTo(0, 0.4);
    });
  },

  hint(msg, t){
    OW.hintMsg = msg; OW.hintT = t;
  },
  rebuildTemp(){
    OW.temp = [];
    (OW.room.npcs || []).forEach((n, i) => {
      OW.temp.push({ kind:'npc', npc:n, x:n.x, y:n.y, w:n.w, h:n.h });
    });
    (OW.room.enemies || []).forEach((en, i) => {
      if(G.flags['enemy:'+OW.room.id+':'+i]) return;
      OW.temp.push({ kind:'enemy', x:en.x, y:en.y, w:16, h:12, enemyId:en.id });
    });
    (OW.room.mem || []).forEach((m, i) => {
      OW.temp.push({ kind:'mem', idx:i, x:m.x, y:m.y, w:12, h:12 });
    });
  },

  draw(ctx){
    this.drawBackground(ctx);
    this.drawTiles(ctx);
    this.drawTemp(ctx);
    this.drawPlayer(ctx);
    this.drawFog(ctx);
    UI.drawHUD(ctx);

    if(OW.roomT > 0){
      const a = Math.min(1, OW.roomT / 0.6);
      const t = OW.roomLabel;
      const tw = Math.round(t.length * 4.5) + 16;
      ctx.globalAlpha = a;
      boxF((VW - tw)/2, 62, tw, 16, 'butter', 'ink');
      ctx.globalAlpha = 1;
      TXT.text('roomlabel', t, 0, 64, { size: 9, color: 'ink', weight: 'bold', align: 'center', width: VW, opacity: a });
    } else TXT.hide('roomlabel');
    if(OW.hintT > 0){
      const msg = OW.hintMsg || '';
      const tw = Math.round(msg.length * 4) + 10;
      boxF((VW - tw)/2, VH - 62, tw, 14, 'cream', 'ink');
      TXT.text('hint', msg, 0, VH - 60, { size: 7, color: 'ink', align: 'center', width: VW });
    } else TXT.hide('hint');
    if(DIALOGUE.active) DIALOGUE.draw(ctx);
    if(MENU.active) MENU.draw(ctx);
  },

  drawBackground(ctx){
    const z = ZONES[OW.room.zone];
    const top = hex(z.sky[0]), bot = hex(z.sky[1]);
    const g = ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,VW,VH);
    /* colline lontane */
    ctx.fillStyle = 'rgba(122,138,94,0.28)';
    ctx.fillRect(0, 120, VW, 40);
    ctx.fillStyle = 'rgba(228,207,158,0.22)';
    ctx.fillRect(0, 128, VW, 32);
    /* sole caldo */
    ctx.fillStyle = hex(PAL.gold);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(212, 14, 10, 10);
    ctx.globalAlpha = 1;
  },

  drawTiles(ctx){
    const r = OW.room;
    const map = r.map;
    const x0 = Math.max(0, Math.floor(G.cam.x/16)), x1 = Math.min(map[0].length, Math.ceil((G.cam.x+VW)/16)+1);
    const y0 = Math.max(0, Math.floor(G.cam.y/16)), y1 = Math.min(map.length, Math.ceil((G.cam.y+VH)/16)+1);
    for(let ty=y0; ty<y1; ty++){
      const row = map[ty];
      for(let tx=x0; tx<x1; tx++){
        const ch = row[tx];
        const t = MAPLEGEND[ch];
        if(!t || !t.name) continue;
        if(!TILES[t.name]) continue;
        const sx = tx*16, sy = ty*16;
        ctx.drawImage(TILES[t.name], sx - G.cam.x, sy - G.cam.y);
        if(t.name === 'door' && r.doors){
          const d = r.doors.find(dd => dd.tx === tx && dd.ty === ty);
          if(d && (!d.switch || G.flags[d.switch]) && (!d.requires || G.flags[d.requires])){
            ctx.drawImage(TILES['dooropen'], sx - G.cam.x, sy - G.cam.y);
          }
        }
        if(t.name === 'switch'){
          const pulse = 0.4 + 0.4*Math.sin(G.time*5 + tx);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = hex(PAL.gold);
          ctx.fillRect(sx - G.cam.x + 5, sy - G.cam.y + 7, 6, 4);
          ctx.globalAlpha = 1;
        }
        if(t.name === 'water'){
          const off = Math.floor(G.time*20)%4;
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = hex(PAL.sky);
          ctx.fillRect(sx - G.cam.x + 2 + off, sy - G.cam.y + 5, 4, 1);
          ctx.globalAlpha = 1;
        }
      }
    }
    /* memorie lampeggianti */
    (OW.room.mem || []).forEach(m => {
      if(G.memories[m.id]) return;
      const pulse = 0.5 + 0.5*Math.sin(G.time*4 + m.x);
      ctx.globalAlpha = 0.35 + pulse*0.3;
      ctx.fillStyle = hex(PAL.rose);
      ctx.fillRect(m.x - G.cam.x + 2, m.y - G.cam.y + 2, 12, 12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = hex(PAL.milk);
      ctx.fillRect(m.x - G.cam.x + 6, m.y - G.cam.y + 6, 4, 4);
    });
  },

  drawTemp(ctx){
    OW.temp.forEach(o => {
      if(o.kind === 'npc'){
        const spr = SPR[npcSprite(o.npc.id)];
        const idling = Math.sin(G.time*2 + o.x) > 0.2;
        const by = o.y + (idling ? -1 : 0);
        if(spr) ctx.drawImage(spr, Math.round(o.x + 8 - spr.width/2 - G.cam.x), Math.round(by + 2 - G.cam.y));
        if(Math.abs(OW.p.x - o.x) < 26 && Math.abs(OW.p.y - o.y) < 26){
          TXT.text('npc-a', 'A', o.x + 2 - G.cam.x, o.y - 20 - G.cam.y, { size: 7, color: 'gold', weight: 'bold' });
        } else TXT.hide('npc-a');
      } else if(o.kind === 'enemy'){
        const spr = SPR[o.enemyId];
        const bob = Math.sin(G.time*3 + o.x) * 1.5;
        if(spr) ctx.drawImage(spr, Math.round(o.x - G.cam.x), Math.round(o.y + bob - G.cam.y));
      } else if(o.kind === 'mem'){
        const pulse = 0.5 + 0.5*Math.sin(G.time*4 + o.x);
        const r = 3 + pulse*2;
        ctx.fillStyle = hex(PAL.rose);
        ctx.globalAlpha = 0.5 + 0.3*pulse;
        ctx.fillRect(o.x - G.cam.x + 6 - r/2, o.y - G.cam.y + 6 - r/2, r, r);
        ctx.globalAlpha = 1;
      }
    });
  },

  drawPlayer(ctx){
    const p = OW.p;
    const mx = Math.round(p.x - G.cam.x), my = Math.round(p.y - G.cam.y);
    const anim = Math.floor(p.anim) % 2;
    const frameName = (who) => {
      if(p.moving) return anim===0 ? who+'_walk1' : who+'_walk2';
      return who+'_idle';
    };
    const oy = Math.round(Math.sin(G.time*2)*0.5);
    ['milo','tito'].forEach((w, i) => {
      const spr = SPR[frameName(w)];
      if(!spr) return;
      const px_ = mx + i*10;
      const py_ = my + oy;
      if(p.dir < 0){
        ctx.save();
        ctx.translate(px_ + spr.width/2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(px_ + spr.width/2), 0);
        ctx.drawImage(spr, Math.round(px_), Math.round(py_));
        ctx.restore();
      } else {
        ctx.drawImage(spr, Math.round(px_), Math.round(py_));
      }
    });
  },

  drawFog(ctx){
    const z = ZONES[OW.room.zone];
    const warmth = STORY.zoneWarmth(OW.room.zone);
    const f = z.fog * (1 - warmth);
    if(f > 0.01){
      ctx.globalAlpha = Math.min(0.75, f);
      ctx.fillStyle = hex(PAL.fog);
      ctx.fillRect(0,0,VW,VH);
      ctx.globalAlpha = 1;
    }
  },
};

/* ---- fisica (top-down) ---- */
const TILE = 16;
const FACE_VEC = [
  { x: 1, y: 0 },   /* 0 destra */
  { x: -1, y: 0 },  /* 1 sinistra */
  { x: 0, y: -1 },  /* 2 su */
  { x: 0, y: 1 },   /* 3 giù */
];
function tileAt(room, tx, ty){
  if(ty < 0 || ty >= room.map.length) return ' ';
  const row = room.map[ty];
  if(tx < 0 || tx >= row.length) return ' ';
  return row[tx];
}
function setTile(room, tx, ty, ch){
  if(ty < 0 || ty >= room.map.length) return;
  let row = room.map[ty];
  if(tx < 0 || tx >= row.length) return;
  row = row.split('');
  row[tx] = ch;
  room.map[ty] = row.join('');
}
function solidFor(room, tx, ty){
  return tileSolid(tileAt(room, tx, ty));
}
function collideX(p, nx){
  const hw = 5;
  const dir = nx >= p.x ? 1 : -1;
  const tx = Math.floor((nx + dir * hw) / 16);
  const rows = [Math.floor((p.y - 14) / 16), Math.floor((p.y + 2) / 16)];
  for(let i = 0; i < rows.length; i++){
    if(solidFor(OW.room, tx, rows[i]) === 1){
      return dir > 0 ? tx * 16 - hw - 1 : (tx + 1) * 16 + hw + 1;
    }
  }
  return nx;
}
function collideY(p, ny){
  const hw = 5;
  const dir = ny >= p.y ? 1 : -1;
  const ty = Math.floor((ny + dir * 8) / 16);
  const cols = [Math.floor((p.x - hw) / 16), Math.floor((p.x + hw) / 16)];
  for(let i = 0; i < cols.length; i++){
    if(solidFor(OW.room, cols[i], ty) === 1){
      return dir > 0 ? ty * 16 - 2 - 1 : (ty + 1) * 16 + 14 + 1;
    }
  }
  return ny;
}
function rectsOverlap(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function dist(a, b){
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }

function roomTitle(id){
  const T = {
    hubA:'Borgo del Miele', hubShop:'La Casa di Nonna',
    meadowA:'Prato delle Zucche', meadowB:'Prato delle Zucche',
    forestA:'Bosco del Miele', forestB:'Bosco del Miele', forestC:'Cuore del Bosco',
    coastA:'Costa della Cenere', coastB:'Costa della Cenere',
    windA:'La Sella del Vento', windB:'La Sella del Vento',
    finalA:'Dove le Cose Vengono Conservate', finalB:'Dove le Cose Vengono Conservate',
    finalC:'Il Focolare Spento', specchio:'La Stanza dello Specchio',
  };
  return T[id] || id;
}