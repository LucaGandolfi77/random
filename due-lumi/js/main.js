/* I DUE LUMI — schermata titolo, game over, finali, avvio */
INPUT.attach();

/* ---- TITOLO ---- */
G.scenes.title = {
  t:0,
  options:['Inizia'],
  sel:0,
  spark:[],
  enter(){
    this.t = 0;
    this.options = STORY.hasSave() ? ['Continua','Nuova avventura'] : ['Inizia'];
    this.sel = 0;
    this.spark = [];
    for(let i=0;i<18;i++) this.spark.push({ x:Math.random()*VW, y:Math.random()*VH, s:Math.random()*6+1, p:Math.random()*6 });
    AUD.playSong('title');
  },
  update(dt){
    this.t += dt;
    if(this.options.length > 1 && (INPUT.pressed('up') || INPUT.pressed('down'))){
      this.sel = 1 - this.sel;
      AUD.sfx('blip');
    }
    if(INPUT.pressed('A')){
      AUD.sfx('confirm');
      this.go(this.options[this.sel]);
    }
  },
  go(o){
    if(o === 'Continua'){
      STORY.load();
      fadeTo(1, 0.4, () => {
        setScene('overworld', { room: G.flags['lastroom'] || 'hubA' });
        fadeTo(0, 0.4);
      });
    } else {
      STORY.init();
      STORY.clearSave();
      fadeTo(1, 0.4, () => {
        setScene('overworld', { room: 'hubA' });
        fadeTo(0, 0.4);
        DIALOGUE.open(SCRIPT.named('intro'));
      });
    }
  },
  draw(ctx){
    const g = ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0, hex(PAL.cream)); g.addColorStop(0.6, hex(PAL.butter)); g.addColorStop(1, hex(PAL.sky));
    ctx.fillStyle = g; ctx.fillRect(0,0,VW,VH);

    /* colline + borgo */
    ctx.fillStyle = hex(PAL.sage);
    ctx.fillRect(0, 120, VW, 40);
    ctx.fillStyle = hex(PAL.moss);
    ctx.fillRect(0, 132, VW, 28);
    ctx.fillStyle = hex(PAL.wheat);
    ctx.fillRect(70, 96, 100, 40);
    ctx.fillStyle = hex(PAL.honey);
    ctx.fillRect(80, 96, 22, 18); ctx.fillRect(140, 96, 22, 18);
    ctx.fillStyle = hex(PAL.terracotta);
    ctx.fillRect(86, 90, 26, 10); ctx.fillRect(142, 90, 26, 10);

    /* scintille */
    this.spark.forEach(sp => {
      const tw = 0.5 + 0.5*Math.sin(this.t*2 + sp.p);
      ctx.globalAlpha = 0.25 + tw*0.55;
      ctx.fillStyle = hex(PAL.gold);
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
    });
    ctx.globalAlpha = 1;

    /* logo e didascalie (testo su overlay) */
    TXT.text('tt-logo', 'I  DUE  LUMI', 0, 22, { size: 17, color: 'terracotta', weight: 'bold', letter: 2, align: 'center', width: VW });
    TXT.text('tt-sub', 'un piccolo viaggio caldo', 0, 48, { size: 9, color: 'cocoa', align: 'center', width: VW });

    this.options.forEach((o, i) => {
      const y = 76 + i*13;
      TXT.text('tt-opt-'+i, (i === this.sel ? '► ' : '   ') + o, 0, y, { size: 9, color: i === this.sel ? 'ink' : 'inkSoft', weight: i === this.sel ? 'bold' : 'normal', align: 'center', width: VW });
    });
    TXT.text('tt-hint', 'A: parla/usa · B: martello · pad / tastiera', 0, 108, { size: 7, color: 'inkSoft', align: 'center', width: VW });
    TXT.text('tt-tag', 'una storia su trattenere e lasciare andare', 0, 120, { size: 8, color: 'cocoa', align: 'center', width: VW });
  },
};

/* ---- GAME OVER ---- */
G.scenes.gameover = {
  t:0,
  enter(){ this.t = 0; AUD.playSong('crisis'); },
  update(dt){
    this.t += dt;
    if(this.t > 0.5 && INPUT.pressed('A')) this.retry();
    if(INPUT.pressed('B')){ AUD.playSong('title'); setScene('title'); }
  },
  retry(){
    const lb = G.lastBattle;
    if(lb){
      if(lb.enemyKey) delete G.flags[lb.enemyKey];
      else if(lb.boss) delete G.flags['boss:'+lb.enemyId];
    }
    G.party.milo.hp = Math.max(1, Math.round(G.party.milo.maxHp/2));
    G.party.tito.hp = Math.max(1, Math.round(G.party.tito.maxHp/2));
    G.flags['battlebusy'] = false;
    fadeTo(1, 0.4, () => {
      setScene('overworld', { room: lb ? lb.roomId : 'hubA' });
      fadeTo(0, 0.4);
    });
  },
  draw(ctx){
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(0,0,VW,VH);
    TXT.text('go-t', 'IL FOCOLARE SI È SPENTO', 0, 40, { size: 12, color: 'ember', weight: 'bold', align: 'center', width: VW });
    TXT.text('go-s', 'per ora. il pane resta.', 0, 58, { size: 9, color: 'cream', align: 'center', width: VW });
    TXT.text('go-a', 'A: riprova dall\'ultimo passaggio', 0, 88, { size: 8, color: 'cream', align: 'center', width: VW });
    TXT.text('go-b', 'B: torna al titolo', 0, 100, { size: 8, color: 'cream', align: 'center', width: VW });
  },
};

/* ---- FINALI ---- */
G.scenes.ending = {
  ending:'a',
  data:null,
  li:0,
  type:0,
  finished:false,
  enter(opts){
    this.ending = opts.ending;
    this.data = ENDINGS[this.ending];
    this.li = 0;
    this.type = 0;
    this.finished = false;
    AUD.playSong(this.data.song);
  },
  update(dt){
    if(!this.data) return;
    if(this.finished){
      if(INPUT.pressed('A')) setScene('title');
      return;
    }
    const line = this.data.lines[this.li];
    if(this.li < this.data.lines.length - 1 && INPUT.pressed('A')){
      this.li++;
      this.type = 0;
      return;
    }
    this.type += dt * 46;
    if(this.type >= line.length && this.li === this.data.lines.length - 1){
      this.finished = true;
    }
  },
  draw(ctx){
    const g = ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0, hex(PAL.cream)); g.addColorStop(1, hex(PAL.sky));
    ctx.fillStyle = g; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle = 'rgba(42,28,20,0.10)';
    ctx.fillRect(0,0,VW,VH);
    const title = this.data.title;
    TXT.text('end-title', title, 0, 14, { size: 12, color: 'terracotta', weight: 'bold', align: 'center', width: VW });
    TXT.text('end-fine', 'FINE ' + this.ending.toUpperCase(), 0, 28, { size: 7, color: 'cocoa', align: 'center', width: VW });
    const line = this.data.lines[this.li];
    if(!line) return;
    const shown = line.slice(0, Math.floor(this.type));
    const lines = wrap(shown, 40);
    lines.slice(0, 12).forEach((l, i) => TXT.text('end-l'+i, l, 10, 44 + i*9, { size: 7, color: 'ink' }));
    for(let i=lines.length;i<12;i++) TXT.hide('end-l'+i);
    if(this.finished){
      TXT.text('end-hint', 'A: torna al titolo', 0, 150, { size: 8, color: 'pumpkin', weight: 'bold', align: 'center', width: VW });
    } else {
      TXT.text('end-hint', 'A: avanti', VW - 44, 150, { size: 8, color: 'inkSoft' });
    }
  },
};

/* ---- avvio ---- */
STORY.init();
setScene('title');

/* ---- cheat / debug ---- */
window.addEventListener('keydown', e => {
  if(e.key === 'F1'){
    G.crumbs += 999;
    G.party.milo.hp = G.party.milo.maxHp;
    G.party.tito.hp = G.party.tito.maxHp;
    UI.notify('Debug: briciole e salute piene.');
  }
  if(e.key === 'F2'){
    G.flags['move_turbo'] = G.flags['move_turbo'] || true;
    G.flags['move_cenere'] = G.flags['move_cenere'] || true;
    UI.notify('Debug: mosse del cuore sbloccate.');
  }
  if(e.key === 'F3'){
    AUD.sfx('victory');
  }
});