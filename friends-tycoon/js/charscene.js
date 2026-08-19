/* CHARSCENE — personaggi stilizzati: vagano per la casa e si spostano
   in cucina/sala/divano/piscina quando si svolge un'attività. */
'use strict';

function ccShade(h, f){
  h = String(h).replace('#','');
  const c = [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  return 'rgb(' + Math.round(c[0]*f) + ',' + Math.round(c[1]*f) + ',' + Math.round(c[2]*f) + ')';
}

const CHARSCENE = {
  scene: null,
  chars: [],
  particles: [],

  init(scene){
    this.scene = scene || null;
    this.chars = [];
    for (const f of G.friends){
      const p = this.freePos();
      this.chars.push({
        id: f.id,
        x: p.x, z: p.z,
        tx: p.x, tz: p.z,
        anim: 'idle', animT: rnd()*6,
        rest: rnd()*2,
        choreo: null
      });
    }
  },

  sync(){
    /* aggiorna i personaggi quando cambia la compagnia */
    const ids = new Set(G.friends.map(f => f.id));
    this.chars = this.chars.filter(c => ids.has(c.id));
    for (const f of G.friends){
      if (!this.chars.some(c => c.id === f.id)){
        const p = this.freePos();
        this.chars.push({ id: f.id, x:p.x, z:p.z, tx:p.x, tz:p.z, anim:'idle', animT:rnd()*6, rest:0, choreo:null });
      }
    }
  },

  collect(){ return this.chars; },

  freePos(){
    const s = this.scene;
    if (!s) return { x: 2, z: 2 };
    for (let i = 0; i < 25; i++){
      const x = 0.6 + rnd()*(s.floorW - 1.2);
      const z = 0.6 + rnd()*(s.floorD - 1.2);
      if (this.blocked(x, z)) continue;
      return { x, z };
    }
    return { x: s.floorW/2, z: s.floorD/2 };
  },

  blocked(x, z){
    const s = this.scene;
    if (!s) return false;
    const m = 0.55;
    for (const f of s.furniture){
      if (f.type === 'tappeto' || f.type === 'entrata' || f.type === 'prato') continue;
      const fx = f.x, fz = f.z, fw = (f.w/2) + m, fd = (f.d/2) + m;
      if (Math.abs(x - fx) < fw && Math.abs(z - fz) < fd) return true;
    }
    return false;
  },

  update(dt){
    if (!this.scene) return;
    for (const c of this.chars){
      c.animT += dt;
      if (c.choreo){
        /* cammina verso la zona */
        const dx = c.tx - c.x, dz = c.tz - c.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.12){
          const sp = c.speed || 1.2;
          c.x += (dx/dist) * sp * dt;
          c.z += (dz/dist) * sp * dt;
          c.anim = 'walk';
        }else{
          c.x = c.tx; c.z = c.tz;
          c.anim = c.choreo.anim;
          c.choreo.t -= dt;
          this.emitParticles(c);
          if (c.choreo.t <= 0){ c.choreo = null; c.anim = 'idle'; c.rest = rnd()*2; }
        }
      }else{
        /* vagabondaggio random */
        c.rest -= dt;
        const dx = c.tx - c.x, dz = c.tz - c.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.12){
          const sp = (c.speed || 1.1) * (c.anim === 'walk' ? 1 : 1);
          c.x += (dx/dist) * sp * dt;
          c.z += (dz/dist) * sp * dt;
          c.anim = 'walk';
        }else if (c.rest <= 0){
          const p = this.freePos();
          c.tx = p.x; c.tz = p.z;
          c.rest = 1 + rnd()*3;
          if (rnd() < 0.2) c.anim = 'idle';
        }else{
          c.anim = 'idle';
        }
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--){
      const p = this.particles[i];
      p.y += p.speed * dt;
      p.t -= dt;
      if (p.t <= 0) this.particles.splice(i, 1);
    }
  },

  emitParticles(c){
    const emojis = { dance:['🎉','🎶'], party:['🎈','🥳'], cook:['🍳','💨'], eat:['🍕'], swim:['💦'], leave:['🧳'] };
    const list = emojis[c.choreo.anim];
    if (!list || rnd() > 0.12) return;
    this.particles.push({ x:c.x, z:c.z, y:1.4, speed:0.4+rnd()*0.3, emoji: pick(list), t: 2 });
  },

  /* Coreografia: quando si svolge un'attività i partecipanti vanno nella zona giusta */
  choreograph(activityId, participantIds){
    if (!this.scene) return;
    const map = ACTIVITY_ZONE[activityId] || ['centro','party'];
    const zone = map[0], anim = map[1];
    const zp = this.scene.zones[zone] || this.scene.zones.centro;
    for (const c of this.chars){
      if (participantIds.indexOf(c.id) !== -1){
        c.choreo = { anim, t: 9 };
        c.tx = zp.x + (rnd()*0.8 - 0.4);
        c.tz = zp.z + (rnd()*0.8 - 0.4);
      }else if (c.choreo && c.choreo.anim === 'leave'){
        /* chi era uscito torna a casa quando si riorganizza qualcosa */
        c.choreo = null; c.rest = rnd()*2;
      }
    }
  },

  /* ---- disegno stilizzato ---- */
  drawChar(ctx, scr, u, c){
    const x = scr[0], y = scr[1];
    const friend = getFriend(c.id);
    const base = getCharacter(c.id);
    if (!friend || !base) return;
    const color = base.color || '#ff5d8f';
    const mood = friend.mood || 'normale';
    const anim = c.anim;
    const t = c.animT;

    /* ombra */
    ctx.fillStyle = 'rgba(80,40,60,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, u*0.42, u*0.13, 0, 0, Math.PI*2);
    ctx.fill();

    const bob = anim === 'walk' ? Math.abs(Math.sin(t*11))*u*0.13
      : anim === 'dance' ? Math.abs(Math.sin(t*9))*u*0.34
      : Math.sin(t*2)*u*0.02;
    const sq = (anim === 'sit' || anim === 'eat') ? 0.68 : 1;

    /* gambe */
    ctx.strokeStyle = ccShade(color, 0.55);
    ctx.lineWidth = Math.max(2, u*0.12);
    ctx.lineCap = 'round';
    const legSpread = anim === 'walk' ? Math.sin(t*11)*u*0.13 : u*0.05;
    ctx.beginPath();
    ctx.moveTo(x - u*0.14 + legSpread, y - u*0.28);
    ctx.lineTo(x - u*0.10 + legSpread*1.4, y);
    ctx.moveTo(x + u*0.14 - legSpread, y - u*0.28);
    ctx.lineTo(x + u*0.10 - legSpread*1.4, y);
    ctx.stroke();

    /* corpo */
    const bodyY = y - u*0.62*sq - bob;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, bodyY, u*0.30, u*0.38*sq, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = ccShade(color, 0.55);
    ctx.lineWidth = Math.max(1.5, u*0.05);
    ctx.stroke();

    /* braccia */
    ctx.lineWidth = Math.max(2, u*0.10);
    ctx.strokeStyle = ccShade(color, 0.7);
    ctx.beginPath();
    if (anim === 'dance'){
      ctx.moveTo(x - u*0.28, bodyY - u*0.1);
      ctx.lineTo(x - u*0.48, bodyY - u*0.5);
      ctx.moveTo(x + u*0.28, bodyY - u*0.1);
      ctx.lineTo(x + u*0.48, bodyY - u*0.5);
    }else if (anim === 'cook'){
      ctx.moveTo(x + u*0.28, bodyY - u*0.1);
      ctx.lineTo(x + u*0.5, bodyY + u*0.05);
    }else{
      ctx.moveTo(x - u*0.30, bodyY - u*0.05);
      ctx.lineTo(x - u*0.40, bodyY + u*0.2);
      ctx.moveTo(x + u*0.30, bodyY - u*0.05);
      ctx.lineTo(x + u*0.40, bodyY + u*0.2);
    }
    ctx.stroke();

    /* testa */
    const headY = y - u*1.02*sq - bob;
    ctx.fillStyle = '#ffd9b3';
    ctx.beginPath();
    ctx.arc(x, headY, u*0.28, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,70,0.5)';
    ctx.lineWidth = Math.max(1.5, u*0.045);
    ctx.stroke();
    /* capelli */
    ctx.fillStyle = ccShade(color, 0.6);
    ctx.beginPath();
    ctx.arc(x, headY - u*0.06, u*0.28, Math.PI, Math.PI*2);
    ctx.fill();

    this.drawFace(ctx, x, headY, u, mood, anim);

    /* oggetto/emoji in testa */
    const acc = { cook:'🍳', eat:'🍕', swim:'💦', party:'🎉', dance:'🎶', sit:'🛋️', leave:'🧳' }[anim];
    if (acc){
      ctx.font = Math.round(u*0.55) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(acc, x, headY - u*0.55);
    }
  },

  drawFace(ctx, x, hy, u, mood, anim){
    const eyeY = hy - u*0.04;
    const ex = u*0.10;
    ctx.fillStyle = '#4a2a30';
    const sleepy = mood === 'stanco';
    const crazy = mood === 'fuori_controllo';
    const angry = mood === 'nervoso';
    if (sleepy || crazy){
      ctx.strokeStyle = '#4a2a30';
      ctx.lineWidth = Math.max(1.5, u*0.05);
      ctx.beginPath();
      if (crazy){ ctx.arc(x-ex, eyeY, u*0.06, 0, Math.PI*2); ctx.arc(x+ex, eyeY, u*0.06, 0, Math.PI*2); }
      else { ctx.moveTo(x-ex-u*0.05, eyeY); ctx.lineTo(x-ex+u*0.05, eyeY); ctx.moveTo(x+ex-u*0.05, eyeY); ctx.lineTo(x+ex+u*0.05, eyeY); }
      ctx.stroke();
    }else{
      ctx.beginPath();
      ctx.arc(x-ex, eyeY, u*0.045, 0, Math.PI*2);
      ctx.arc(x+ex, eyeY, u*0.045, 0, Math.PI*2);
      ctx.fill();
    }
    if (angry){
      ctx.strokeStyle = '#4a2a30';
      ctx.lineWidth = Math.max(1.5, u*0.045);
      ctx.beginPath();
      ctx.moveTo(x-ex-u*0.06, eyeY-u*0.12); ctx.lineTo(x-ex+u*0.05, eyeY-u*0.03);
      ctx.moveTo(x+ex+u*0.06, eyeY-u*0.12); ctx.lineTo(x+ex-u*0.05, eyeY-u*0.03);
      ctx.stroke();
    }
    const my = hy + u*0.14;
    ctx.strokeStyle = '#4a2a30';
    ctx.lineWidth = Math.max(1.5, u*0.05);
    ctx.beginPath();
    if (mood === 'felicissimo'){ ctx.arc(x, my - u*0.02, u*0.09, 0, Math.PI); }
    else if (mood === 'felice'){ ctx.arc(x, my - u*0.04, u*0.07, 0.15*Math.PI, 0.85*Math.PI); }
    else if (mood === 'normale'){ ctx.moveTo(x-u*0.06, my); ctx.lineTo(x+u*0.06, my); }
    else if (mood === 'stanco'){ ctx.moveTo(x-u*0.05, my-u*0.02); ctx.lineTo(x+u*0.05, my-u*0.02); }
    else if (mood === 'nervoso'){ ctx.arc(x, my + u*0.05, u*0.07, Math.PI, Math.PI*2); }
    else { ctx.arc(x, my - u*0.01, u*0.08, 0.1*Math.PI, 0.9*Math.PI); }
    ctx.stroke();
  }
};