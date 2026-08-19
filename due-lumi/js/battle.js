/* I DUE LUMI — battaglia a turni con action-commands */
const ENEMIES = {
  ombra: {
    name:'Ombra della Nebbia', hp:10, pow:4, def:0, spd:3, xp:3, crumbs:4,
    sprite:'ombra_b', attacks:[ {name:'Frizione', type:'hold', dmg:3}, {name:'Morso', type:'ring', dmg:4} ],
    flavor:'Un lembo di nebbia che ha dimenticato di essere una creatura.',
  },
  lucciola: {
    name:'Lucciola Grigia', hp:8, pow:4, def:0, spd:7, xp:3, crumbs:5,
    sprite:'lucciola', attacks:[ {name:'Volo Radente', type:'hold', dmg:4}, {name:'Pungiglione', type:'ring', dmg:3} ],
    flavor:'Una lucciola triste che non ricorda più come brillare.',
  },
  custode: {
    name:'Il Custode del Bosco', hp:42, pow:7, def:1, spd:4, xp:20, crumbs:30,
    sprite:'custode', boss:true,
    attacks:[ {name:'Rampata', type:'hold', dmg:7}, {name:'Corna del Ricordo', type:'ring', dmg:8} ],
    phase:[ {name:'Richiamo del cerbiatto', type:'hold', dmg:10} ],
    flavor:'Un grande cervo. La nebbia gli ha portato via il nome del suo cerbiatto.',
  },
  foca: {
    name:'La Foca della Cenere', hp:56, pow:8, def:2, spd:5, xp:26, crumbs:40,
    sprite:'foca', boss:true,
    attacks:[ {name:'Botta di Coda', type:'hold', dmg:8}, {name:'Soffio di Cenere', type:'ring', dmg:9} ],
    phase:[ {name:'Lamento della Cenerentola', type:'ring', dmg:12} ],
    flavor:'Conserva la cenere del suo fuoco più amato. Non la lascerà mai andare.',
  },
  vento: {
    name:'Il Vento dei Rimpianti', hp:64, pow:9, def:1, spd:8, xp:30, crumbs:45,
    sprite:'vento', boss:true,
    attacks:[ {name:'Raffica', type:'hold', dmg:9}, {name:'Brezza dei Se', type:'ring', dmg:10} ],
    phase:[ {name:'Tempesta dei Rimpianti', type:'hold', dmg:13} ],
    flavor:'Il vento che ha sentito ogni "se solo". Non perdona i cammini non presi.',
  },
  ramenta: {
    name:'Ramenta', hp:130, pow:11, def:2, spd:6, xp:0, crumbs:0,
    sprite:'ramenta', boss:true, final:true,
    attacks:[ {name:'Nebbia del Focolare', type:'ring', dmg:11}, {name:'Ondata di Ricordi', type:'hold', dmg:11} ],
    phase:[ {name:'La Scintilla Contenuta', type:'ring', dmg:14} ],
    flavor:'...',
  },
  specchio: {
    name:'Lo Specchio', hp:60, pow:8, def:1, spd:9, xp:0, crumbs:0,
    sprite:'specchio', boss:true, hidden:true,
    attacks:[ {name:'Riflesso', type:'ring', dmg:7}, {name:'Eco delle Scelte', type:'hold', dmg:7} ],
    phase:[ {name:'Il Tuo Volto', type:'ring', dmg:10} ],
    flavor:'Non è un nemico. È la domanda che non hai ancora accettato.',
  },
};

const BROS = {
  abbraccio:{ name:'ABBRACCIO', req:1, use:'vic', desc:'Colpisce e riscalda entrambi.', dmg:0.6, heal:16 },
  turbo:{ name:'SALT.ELLO ROTANTE', req:1, use:'vic', flag:'move_turbo', desc:'Un vortice di salti.', dmg:1.6 },
  ninnananna:{ name:'NINNA NANNA', req:1, use:'vic', flag:'move_ninnananna', desc:'Culla il nemico (salta il turno).', dmg:0.5, sleep:true },
  cenere:{ name:'ABBRACCIO DI CENERE', req:2, use:'vic', flag:'move_cenere', desc:'Il ricordo brucia ma scalda.', dmg:2.2, heal:10 },
};

const BATTLE = {
  active:false,
  state:'intro',
  enemy:null, enemyData:null,
  eHp:0, phase:false,
  t:0,
  action:null,
  prevSong:null, roomId:null, isBoss:false,
  vic:1,
  msg:'',
  msgT:0,
  choice:0,
  enemyTurnAttacks:[],
  atkIdx:0,

  start(id, roomId, prevSong){
    this.active = true;
    this.roomId = roomId;
    this.prevSong = prevSong;
    this.enemyData = ENEMIES[id];
    this.enemy = Object.assign({}, this.enemyData);
    this.enemy.id = id;
    this.eHp = this.enemy.hp;
    this.phase = false;
    this.vic = Math.max(1, this.vic);
    this.msg = '';
    this.msgT = 0;
    this.choice = 0;
    this.atkIdx = 0;
    this.isBoss = !!this.enemy.boss;
    this.state = 'intro';
    this.t = 0;
    AUD.playSong('battle');
    setScene('battle');
    const script = SCRIPT.battleIntro(id);
    if(script){ DIALOGUE.open(script, { onEnd: () => { this.state = 'player'; } }); }
    else { this.state = 'player'; }
  },

  getCommands(){
    const cmds = ['SALTO','MARTELLO'];
    Object.keys(BROS).forEach(k => {
      const b = BROS[k];
      if((!b.flag || G.flags[b.flag]) && this.vic >= b.req) cmds.push(b.name);
    });
    cmds.push('OGGETTI');
    cmds.push('INCORAGGIA');
    return cmds;
  },

  update(dt){
    if(DIALOGUE.active){ DIALOGUE.update(dt); return; }
    this.t += dt;
    if(this.msgT > 0) this.msgT -= dt;

    if(this.state === 'player'){
      const cmds = this.getCommands();
      if(INPUT.pressed('up')){ this.choice = (this.choice + cmds.length - 1) % cmds.length; AUD.sfx('blip'); }
      if(INPUT.pressed('down')){ this.choice = (this.choice + 1) % cmds.length; AUD.sfx('blip'); }
      if(INPUT.pressed('A')){
        AUD.sfx('confirm');
        this.pick(cmds[this.choice]);
      }
      return;
    }
    if(this.state === 'itemselect'){
      const list = this.itemList;
      if(INPUT.pressed('up')){ this.itemSel = (this.itemSel + list.length - 1) % list.length; AUD.sfx('blip'); }
      if(INPUT.pressed('down')){ this.itemSel = (this.itemSel + 1) % list.length; AUD.sfx('blip'); }
      if(INPUT.pressed('B')){ this.state = 'player'; return; }
      if(INPUT.pressed('A')){
        const key = list[this.itemSel];
        MENU.useItem(key);
        if(G.inv[key]){ /* oggetto ancora presente: resta nel menu */ }
        else this.state = 'player';
        this.endPlayerTurn();
      }
      return;
    }
    if(this.state === 'action' && this.action){
      this.action.update(dt);
      return;
    }
    if(this.state === 'defense' && this.action){
      this.action.update(dt);
      return;
    }
    if(this.state === 'enemy'){
      this.enemyUpdate(dt);
      return;
    }
    if(this.state === 'win' || this.state === 'lose'){
      if(this.t > 1.2 && INPUT.pressed('A')) this.finish();
      return;
    }
  },

  pick(cmd){
    if(cmd === 'SALTO'){
      this.msg = ''; this.msgT = 0;
      this.action = new BarAction(this.onBar.bind(this, 'jump'));
      this.state = 'action';
    } else if(cmd === 'MARTELLO'){
      this.action = new BarAction(this.onBar.bind(this, 'hammer'));
      this.state = 'action';
    } else if(BROS[cmd]){
      const b = BROS[cmd];
      this.action = new SeqAction(b, this.onSeq.bind(this, cmd));
      this.state = 'action';
    } else if(cmd === 'OGGETTI'){
      this.openItems();
    } else if(cmd === 'INCORAGGIA'){
      this.vic = Math.min(3, this.vic + 1);
      AUD.sfx('heal');
      this.flash('I fratelli si incoraggiano. Vicinanza +1.');
      this.endPlayerTurn();
    }
  },
  openItems(){
    const usable = G.invList().filter(k => ITEMS[k] && ITEMS[k].kind !== 'story');
    if(!usable.length){ this.flash('Nessun oggetto usabile.'); return; }
    this.itemList = usable;
    this.itemSel = 0;
    this.state = 'itemselect';
  },

  onBar(kind, result){
    const mult = result === 'perfect' ? 3 : (result === 'good' ? 2 : 1);
    const miloPow = effStat(G.party.milo,'pow') * (G.party.milo.nebbia ? 0 : 1);
    const titoPow = effStat(G.party.tito,'pow') * (G.party.tito.nebbia ? 0 : 1);
    let dmg = Math.max(1, Math.round((miloPow + titoPow) * mult) - this.enemy.def);
    if(kind === 'hammer') dmg = Math.max(1, Math.round((miloPow + titoPow) * 1.2 * mult) - this.enemy.def);
    if(result === 'perfect'){ this.vic = Math.min(3, this.vic + 1); this.flash('PERFETTO! Vicinanza +1'); AUD.sfx('victory'); }
    else if(result === 'good'){ AUD.sfx('hit'); this.flash('Colpo riuscito!'); }
    else { AUD.sfx('cancel'); this.flash('Mancato...'); dmg = Math.max(1, Math.round(dmg/3)); }
    this.hitEnemy(dmg);
  },
  onSeq(key, result){
    const b = BROS[key];
    let dmg = Math.max(1, Math.round((effStat(G.party.milo,'pow') + effStat(G.party.tito,'pow')) * b.dmg) - this.enemy.def);
    if(result === 'perfect'){ dmg = Math.round(dmg * 1.5); this.vic = Math.min(3, this.vic + 1); AUD.sfx('victory'); }
    else if(result === 'good'){ AUD.sfx('hit'); }
    else { dmg = Math.max(1, Math.round(dmg/2)); AUD.sfx('cancel'); }
    this.vic = Math.max(0, this.vic - b.use);
    if(b.heal){
      G.party.milo.hp = Math.min(G.party.milo.maxHp, G.party.milo.hp + b.heal);
      G.party.tito.hp = Math.min(G.party.tito.maxHp, G.party.tito.hp + b.heal);
    }
    if(b.sleep){ this.enemy.sleep = 2; }
    this.flash(b.name + '!');
    this.hitEnemy(dmg);
  },
  hitEnemy(dmg){
    this.eHp -= dmg;
    AUD.sfx('enemyHit');
    if(this.eHp <= 0){
      this.eHp = 0;
      this.win();
      return;
    }
    this.checkPhase();
    this.endPlayerTurn();
  },
  checkPhase(){
    const e = this.enemy;
    if(e.boss && !this.phase && this.eHp <= e.hp/2){
      this.phase = true;
      const script = SCRIPT.bossPhase(e.id);
      if(script){ DIALOGUE.open(script, { onEnd: () => this.continueAfterPhase() }); }
      else this.continueAfterPhase();
    }
  },
  continueAfterPhase(){
    AUD.sfx('curse');
    this.flash(this.enemy.name + ' è ferito ma più forte!');
    this.endPlayerTurn();
  },
  endPlayerTurn(){
    this.state = 'enemy';
    this.t = 0;
    this.atkIdx = 0;
  },

  enemyUpdate(dt){
    if(this.t < 1.0) return;
    const e = this.enemy;
    if(e.sleep > 0){ e.sleep--; this.flash(e.name + ' sta dormendo.'); this.state='player'; this.choice=0; return; }
    const list = this.enemyTurnAttacks.length ? this.enemyTurnAttacks : (this.phase ? e.phase : e.attacks);
    const atk = list[this.atkIdx % list.length];
    const target = this.pickTarget(atk);
    this.flash(e.name + ' usa ' + atk.name + '!');
    this.atkIdx++;
    this.state = 'defense';
    this.action = new RingHoldAction(atk, target, this.onDefense.bind(this, atk, target));
    this.t = 0;
  },
  pickTarget(atk){
    if(atk.type === 'hold') return { milo:true, tito:true };
    const flip = Math.random() < 0.5;
    return { milo: flip, tito: !flip };
  },
  onDefense(atk, target, result){
    let dmg = atk.dmg + this.enemy.pow - 2;
    if(result === 'perfect'){ dmg = 0; AUD.sfx('parry'); this.flash('SCHIVATO! Contrattacco!'); this.hitEnemy(Math.max(1, Math.round(dmg*0 + effStat(G.party.milo,'pow')))); this.vic = Math.min(3, this.vic+1); return; }
    if(result === 'good'){ dmg = Math.max(1, Math.round(dmg/2)); this.flash('Quasi! Danni ridotti.'); }
    else { this.flash('Colpiti!'); }
    if(target.milo){ G.party.milo.hp -= dmg; if(G.party.milo.hp<0) G.party.milo.hp=0; }
    if(target.tito){ G.party.tito.hp -= dmg; if(G.party.tito.hp<0) G.party.tito.hp=0; }
    AUD.sfx('hurt');
    this.vic = Math.max(0, this.vic - 1);
    this.afterDamage();
  },
  afterDamage(){
    if(G.party.milo.hp <= 0 && G.party.tito.hp <= 0){ this.lose(); return; }
    if(G.party.milo.hp <= 0 || G.party.tito.hp <= 0){
      this.flash('Un fratello è a terra! Usa la Marmellata!');
    }
    this.state = 'player';
    this.choice = 0;
  },
  flash(msg){ this.msg = msg; this.msgT = 1.6; },

  win(){
    this.state = 'win';
    this.t = 0;
    AUD.sfx('victory');
    const e = this.enemy;
    if(e.boss) G.flags['boss:'+e.id] = true;
    G.crumbs += e.crumbs;
    const gained = this.giveXp(e.xp);
    this.victoryMsg = e.name + ' svanisce in nebbia calda.\nBriciole +' + e.crumbs + (gained ? '\n' + gained : '');
  },
  giveXp(xp){
    if(!xp) return '';
    let s = '';
    [G.party.milo, G.party.tito].forEach(w => {
      w.xp += xp;
      while(w.xp >= xpFor(w.lvl)){
        w.xp -= xpFor(w.lvl);
        w.lvl++;
        w.maxHp += GROWTH.hp(w.lvl);
        w.pow += GROWTH.pow(w.lvl);
        w.def += GROWTH.def(w.lvl);
        w.spd += GROWTH.spd(w.lvl);
        w.hp = w.maxHp;
        s += (s?'\n':'') + w.name + ' sale al livello ' + w.lvl + '!';
        AUD.sfx('levelup');
      }
    });
    return s;
  },
  lose(){
    this.state = 'lose';
    this.t = 0;
  },
  finish(){
    const wasWin = this.state === 'win';
    this.active = false;
    const roomId = (G.lastBattle && G.lastBattle.roomId) ? G.lastBattle.roomId : 'hubA';
    const goBack = () => {
      G.flags['battlebusy'] = false;
      STORY.afterBattle(this.enemy.id);
      fadeTo(1, 0.45, () => {
        setScene('overworld', { room: roomId });
        fadeTo(0, 0.4);
      });
    };
    if(wasWin){
      const script = SCRIPT.battleWin(this.enemy.id);
      if(script && script.length){
        DIALOGUE.open(script, { onEnd: goBack });
      } else {
        goBack();
      }
    } else {
      STORY.gameOver();
    }
  },
};

/* ---- action-commands ---- */
class BarAction {
  constructor(onDone){ this.onDone = onDone; this.t = 0; this.pos = 0; this.dir = 1; this.done = false; }
  update(dt){
    this.t += dt;
    this.pos += this.dir * dt * 0.9;
    if(this.pos >= 1){ this.pos = 1; this.dir = -1; }
    if(this.pos <= 0){ this.pos = 0; this.dir = 1; }
    if(INPUT.pressed('A')){
      this.done = true;
      let r = 'miss';
      if(this.pos >= 0.16 && this.pos <= 0.5) r = 'good';
      if(this.pos >= 0.26 && this.pos <= 0.4) r = 'perfect';
      this.onDone(r);
    }
  }
  draw(ctx){
    const w = 8, h = 60;
    const x = 150, y = 40;
    boxF(x-2, y-2, w+4, h+4, 'cream', 'ink');
    pxF(x, y, w, h, 'butter');
    const py = y + (1 - this.pos) * (h - 2);
    pxF(x+1, py-2, w-2, 3, 'pumpkin');
    /* zone obiettivo */
    pxF(x+1, y + (1-0.5)*h, w-2, h*0.34, 'sage');
    pxF(x+1, y + (1-0.4)*h, w-2, h*0.14, 'gold');
    TXT.text('ba-a', 'A!', x + w + 4, y + h/2 - 4, { size: 8, color: 'ink', weight: 'bold' });
  }
}

class SeqAction {
  constructor(b, onDone){ this.b = b; this.onDone = onDone; this.seq = []; const n = 2 + Math.floor(G.party.milo.lvl/4); for(let i=0;i<Math.min(4,n);i++) this.seq.push(i%2===0?'A':'B'); this.idx = 0; this.t = 0; this.done = false; this.perfect = true; }
  update(dt){
    if(this.idx >= this.seq.length){
      this.done = true;
      this.onDone(this.perfect ? 'perfect' : 'good');
      return;
    }
    this.t += dt;
    const want = this.seq[this.idx];
    if(INPUT.pressed(want)){
      AUD.sfx('blip2');
      this.idx++;
      this.t = 0;
    } else if(INPUT.pressed(want === 'A' ? 'B' : 'A')){
      this.perfect = false;
      AUD.sfx('blip');
    }
    if(this.t > 0.9){ this.done = true; this.onDone(this.perfect ? 'good' : 'miss'); }
  }
  draw(ctx){
    const b = this.b;
    TXT.text('seq-name', b.name, 90, 18, { size: 8, color: 'ink', weight: 'bold' });
    const cw = 30, ch = 20, x0 = 100, y0 = 40;
    for(let i=0;i<this.seq.length;i++){
      const on = i < this.idx;
      const cur = i === this.idx;
      boxF(x0 + i*(cw+4), y0, cw, ch, cur ? 'gold' : (on ? 'sage' : 'cream'), 'ink');
      TXT.text('seq-'+i, this.seq[i], x0 + i*(cw+4) + cw/2 - 3, y0 + 5, { size: 8, color: cur ? 'ink' : (on ? 'ink' : 'inkSoft'), weight: 'bold' });
    }
    for(let i=this.seq.length;i<4;i++) TXT.hide('seq-'+i);
    TXT.text('seq-hint', 'Premi i pulsanti a tempo!', 80, y0 + ch + 5, { size: 7, color: 'ink' });
  }
}

class RingHoldAction {
  constructor(atk, target, onDone){ this.atk = atk; this.target = target; this.onDone = onDone; this.t = 0; this.done = false; this.phase = atk.type === 'hold' ? 'hold' : 'ring'; this.released = false; this.lastHeld = true; }
  update(dt){
    this.t += dt;
    if(this.phase === 'ring'){
      const total = 1.4;
      const rr = this.t / total; /* 0..1.4 */
      if(INPUT.pressed('A') || INPUT.pressed('B') || INPUT.pressed('start')){
        this.done = true;
        const perfectAt = 0.75;
        const r = rr;
        let res = 'miss';
        if(Math.abs(r - perfectAt) < 0.06) res = 'perfect';
        else if(Math.abs(r - perfectAt) < 0.16) res = 'good';
        this.onDone(res);
        return;
      }
      if(rr > 1.3){ this.done = true; this.onDone('miss'); }
    } else {
      /* hold: premere A durante il passaggio dell'onda */
      const total = 1.5;
      const waveT = this.t % 0.55;
      const underWave = this.t >= 0.35 && this.t <= 0.35 + 0.55;
      const holding = INPUT.held('A');
      if(underWave && !holding){ this.released = true; }
      if(this.t >= 0.9){
        this.done = true;
        this.onDone(this.released ? 'miss' : 'perfect');
      }
    }
  }
  draw(ctx){
    if(this.phase === 'ring'){
      const total = 1.4;
      const r = Math.max(1, 60 - (this.t / total) * 55);
      const cx = 120, cy = 80;
      ctx.strokeStyle = hex(PAL.slate);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
      const gr = 60 - 0.75 * 55;
      ctx.strokeStyle = hex(PAL.gold);
      ctx.beginPath(); ctx.arc(cx, cy, gr + 5, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = hex(PAL.honey);
      ctx.beginPath(); ctx.arc(cx, cy, gr - 5, 0, Math.PI*2); ctx.stroke();
      TXT.text('ring-a', 'A!', cx - 5, cy - 8, { size: 8, color: 'ink', weight: 'bold' });
    } else {
      const x = 60 + ((this.t - 0.35) / 0.55) * 140;
      if(this.t >= 0.35 && this.t <= 0.9){
        boxF(x - 10, 74, 20, 14, 'slate', 'ink');
      }
      TXT.text('ring-hold', 'Tieni A: resisti!', 64, 18, { size: 7, color: 'ink', weight: 'bold' });
    }
  }
}

/* ---- scene ---- */
G.scenes.battle = {
  enter(){},
  update(dt){ BATTLE.update(dt); },
  draw(ctx){
    /* sfondo */
    const g = ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0, hex(PAL.mist)); g.addColorStop(1, hex(PAL.sky));
    ctx.fillStyle = g; ctx.fillRect(0,0,VW,VH);
    pxF(0, 118, VW, 42, 'wheat');

    /* nemico */
    const es = SPR[BATTLE.enemy.sprite];
    if(es) ctx.drawImage(es, Math.round(150 - es.width/2), Math.round(64 - es.height/2));

    /* barra nemico */
    boxF(96, 8, 138, 16, 'cream', 'ink');
    TXT.text('btl-ename', BATTLE.enemy.name, 100, 9, { size: 7, color: 'ink', weight: 'bold' });
    const ew = 130 * Math.max(0, BATTLE.eHp / BATTLE.enemy.hp);
    pxF(102, 19, ew, 3, 'ember');
    pxF(102 + ew, 19, 130 - ew, 3, 'inkSoft');

    /* fratelli */
    drawSpriteFixed('milo_idle_b', 14, 96);
    drawSpriteFixed('tito_idle_b', 40, 96);
    /* barre vita */
    boxF(6, 140, 90, 18, 'cream', 'ink');
    const p = G.party;
    const wm = 82 * Math.max(0, p.milo.hp/p.milo.maxHp);
    const wt = 82 * Math.max(0, p.tito.hp/p.tito.maxHp);
    TXT.text('btl-m', 'M', 8, 140, { size: 7, color: 'ink', weight: 'bold' });
    TXT.text('btl-t', 'T', 8, 148, { size: 7, color: 'ink', weight: 'bold' });
    pxF(13, 141, wm, 4, 'honey'); pxF(13, 149, wt, 4, 'pumpkin');
    pxF(13+wm, 141, 82-wm, 4, 'inkSoft'); pxF(13+wt, 149, 82-wt, 4, 'inkSoft');

    /* vicinanza */
    boxF(6, 4, 60, 12, 'cream', 'ink');
    TXT.text('btl-vic', 'CUORE', 8, 4, { size: 7, color: 'ink', weight: 'bold' });
    for(let i=0;i<3;i++){
      pxF(8 + i*14, 12, 10, 3, i < BATTLE.vic ? 'rose' : 'inkSoft');
    }

    /* messaggi */
    if(BATTLE.msgT > 0){
      const tw = Math.round(BATTLE.msg.length * 4) + 10;
      boxF((VW-tw)/2, 24, tw, 13, 'butter', 'ink');
      TXT.text('btl-msg', BATTLE.msg, (VW-tw)/2+5, 26, { size: 7, color: 'ink' });
    } else TXT.hide('btl-msg');

    if(BATTLE.state === 'player' || BATTLE.state === 'itemselect'){
      const cmds = BATTLE.state==='player' ? BATTLE.getCommands() : BATTLE.itemList.map(k=>ITEMS[k].name);
      const bh = cmds.length*9 + 8;
      const bx = VW - 96, by = VH - bh - 4;
      boxF(bx, by, 92, bh, 'cream', 'ink');
      pxF(bx+2, by+2, 88, 2, 'butter');
      cmds.forEach((c, i) => {
        const y = by + 5 + i*9;
        const sel = i === BATTLE.choice;
        if(sel){ pxF(bx+2, y-1, 88, 8, 'butter'); TXT.text('btl-cmd-'+i, '► ' + c, bx + 3, y, { size: 7, color: 'ink', weight: 'bold' }); }
        else TXT.text('btl-cmd-'+i, c, bx + 10, y, { size: 7, color: 'inkSoft' });
      });
      if(BATTLE.state==='itemselect'){
        const list = BATTLE.itemList;
        const it = ITEMS[list[BATTLE.choice]];
        TXT.text('btl-itm-desc', it.desc, 8, VH - 12, { size: 7, color: 'ink' });
      } else TXT.hide('btl-itm-desc');
    }

    if(BATTLE.action && (BATTLE.state === 'action' || BATTLE.state === 'defense')){
      BATTLE.action.draw(ctx);
    }
    if(BATTLE.state === 'win' || BATTLE.state === 'lose'){
      const msg = BATTLE.state==='win' ? (BATTLE.victoryMsg||'Vittoria!') : 'Entrambi i fratelli a terra...';
      const lines = wrap(msg, 40);
      ctx.globalAlpha = 0.7; pxF(0, 40, VW, 60, 'night'); ctx.globalAlpha = 1;
      lines.slice(0,5).forEach((l, i)=> TXT.text('btl-end-'+i, l, 20, 50 + i*9, { size: 7, color: 'cream' }));
      for(let i=lines.length;i<5;i++) TXT.hide('btl-end-'+i);
      TXT.text('btl-end-hint', 'A: continua', 100, 92, { size: 8, color: 'gold', weight: 'bold' });
    }
    if(DIALOGUE.active) DIALOGUE.draw(ctx);
  },
};