// game.js — loop principale, stato, input, camera, render, ciclo giorno/notte, logica missioni/interazioni.
var GAME = (function(){
  var state, cv, ctx, TILE_PX=24, viewW, viewH;
  var cam={x:0,y:0};
  var keys={};
  var last=0;
  var autoplay=true;
  var hudDirty=0;

  // stato persistente
  function freshState(){
    return {
      time: 8*60,           // 08:00
      frame:0,
      settings:{gb:false},
      quest:{ current:'q1', flags:{}, rewardGiven:{} },
      player:{ x:12, y:14, dir:'D', skin:PAL.skin, hair:PAL.hair, shirt:PAL.shirt, inv:{}, moves:{base:true}, curMove:'base', placeSel:null },
    };
  }
  function stateRef(){ return state; }

  function init(){
    cv=document.getElementById('game'); ctx=cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    UI.init();
    setupInput();
    // mostra titolo
    UI.showTitle();
    requestAnimationFrame(loop);
  }
  function resize(){ viewW=Math.floor(window.innerWidth/TILE_PX)+2; viewH=Math.floor(window.innerHeight/TILE_PX)+2; cv.width=viewW*TILE_PX; cv.height=viewH*TILE_PX; ctx.imageSmoothingEnabled=false; }

  // ─── nuova partita / continua ───
  function newGame(){
    state=freshState();
    WORLD.gen();
    MONS.reset();
    AUDIO.resume(); AUDIO.playMusic('day');
    UI.hideTitle();
    UI.showCustomize(function(vals){ state.player.skin=vals.skin; state.player.hair=vals.hair; state.player.shirt=vals.shirt;
      var s=WORLD.getSpecials(); state.player.x=s.start.x; state.player.y=s.start.y;
      MONS.spawn('snorlax', s.snorlax.x, s.snorlax.y); MONS.all()[MONS.all().length-1].questOnly=true;
      MONS.spawn('squirtle', s.squirtle.x, s.squirtle.y, {questFollows:false}); var sq=MONS.all()[MONS.all().length-1]; sq.friendship=0; sq.questOnly=true;
      intro();
    });
  }
  function continueGame(){
    state=freshState();
    if(!SAVE.loadInto(state)){ UI.notify('Nessun salvataggio.'); return; }
    AUDIO.resume(); AUDIO.playMusic(isNight()?'night':'day');
    UI.hideTitle();
  }

  function intro(){
    UI.dialogueMulti(['Professor Tangrowth: Sciocco piccolo blob viola... ma guardati! Sei un Ditto trasformato in umano!',
      'Professor Tangrowth: Gli umani hanno lasciato la Kanto tempo fa. Noi Pokémon siamo ancora qui.',
      'Professor Tangrowth: Io studio questo luogo. Tu lo coltiverai. Tutto inizia da una tartarughina assetata. Avanti!'],
      function(){ state.quest.current='q2'; advanceObjectiveCheck(); });
  }

  // ─── input ───
  function setupInput(){
    document.addEventListener('keydown', function(e){
      // hotbar mosse 1-9
      if(!UI.isModal()){
        if(e.key>='1'&&e.key<='9'){ var idx=parseInt(e.key)-1; var mv=MOVE_ORDER[idx]; if(mv && state.player.moves[mv]){ state.player.curMove=mv; AUDIO.sfxSelect(); markHUD(); } return; }
        // menu keys globali
        if(e.key==='c'||e.key==='C'){ UI.openCraft(state); return; }
        if(e.key==='t'||e.key==='T'){ UI.openDex(state); return; }
        if(e.key==='p'||e.key==='P'||e.key==='Escape'){ UI.openMenu(state); return; }
        if(e.key==='Tab'){ e.preventDefault(); UI.openMenu(state); return; }
      }
      if(UI.handleKey(e,state)) return;
      keys[e.key]=true;
      keys[e.key.toLowerCase()]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0) e.preventDefault();
    });
    document.addEventListener('keyup', function(e){ keys[e.key]=false; keys[e.key.toLowerCase()]=false; });
    // click: interagisci col tile cliccato / piazza
    cv.addEventListener('click', function(ev){ if(UI.isModal())return; var r=tileAt(ev); handleClickTile(r.x,r.y); });
    // delega click UI
    document.addEventListener('click', function(ev){ UI.onClick(ev,state); });
    // touch pad
    setupTouch();
    // salva su chiusura
    window.addEventListener('beforeunload', function(){ if(state) SAVE.saveState(state); });
    // resume audio al primo gesto
    var wake=function(){ AUDIO.resume(); document.removeEventListener('pointerdown',wake); };
    document.addEventListener('pointerdown',wake);
  }
  function tileAt(ev){ var rect=cv.getBoundingClientRect(); var px=(ev.clientX-rect.left); var py=(ev.clientY-rect.top);
    return { x: Math.floor(cam.x + px/TILE_PX), y: Math.floor(cam.y + py/TILE_PX) }; }

  // ─── controlli touch ───
  var touchVec={x:0,y:0};
  function setupTouch(){
    var tp=document.getElementById('touchpad'); if(!tp)return;
    function start(e){ e.preventDefault(); }
    function center(){ var r=tp.getBoundingClientRect(); return {cx:r.left+r.width/2, cy:r.top+r.height/2}; }
    function move(e){ if(!e.touches||!e.touches[0])return; var c=center(); touchVec.x=e.touches[0].clientX-c.cx; touchVec.y=e.touches[0].clientY-c.cy; var m=18; if(Math.abs(touchVec.x)<m)touchVec.x=0; if(Math.abs(touchVec.y)<m)touchVec.y=0; touchVec.x=Math.max(-1,Math.min(1,touchVec.x/40)); touchVec.y=Math.max(-1,Math.min(1,touchVec.y/40)); }
    function end(e){ touchVec.x=0; touchVec.y=0; }
    tp.addEventListener('touchstart',start,{passive:false}); tp.addEventListener('touchmove',move,{passive:false}); tp.addEventListener('touchend',end);
    var bA=document.getElementById('btnA'); if(bA)bA.addEventListener('touchstart',function(e){e.preventDefault(); doInteract();},{passive:false});
    var bB=document.getElementById('btnB'); if(bB)bB.addEventListener('touchstart',function(e){e.preventDefault(); keys[' ']=false; if(UI.isModal()) UI.handleKey({key:'Escape'},state); else { state.player.placeSel = null; UI.notify('Piazzamento annullato.'); } },{passive:false});
  }

  // ─── loop ───
  function loop(t){
    var dt=Math.min(0.05,(t-last)/1000||0); last=t;
    if(state && UI.modeOf()!=='title' && UI.modeOf()!=='customize'){ update(dt); render(); }
    UI.update(dt);
    requestAnimationFrame(loop);
  }
  function isNight(){ var h=Math.floor(state.time/60)%24; return h<6||h>=20; }

  function update(dt){
    state.frame++; state.time=(state.time+dt*60)%1440; // 1s reale = 1min gioco (giorno=24min)
    var prevMusic = state._music; var nm = isNight()?'night':'day'; if(nm!==prevMusic){ AUDIO.playMusic(nm); state._music=nm; }
    // movimento
    var p=state.player; var vx=0,vy=0;
    if(!UI.isModal()){
      if(keys['ArrowUp']||keys['w'])vy=-1; else if(keys['ArrowDown']||keys['s'])vy=1;
      if(keys['ArrowLeft']||keys['a'])vx=-1; else if(keys['ArrowRight']||keys['d'])vx=1;
      if(touchVec.x||touchVec.y){ vx=touchVec.x; vy=touchVec.y; }
      var sp=2.4; var len=Math.hypot(vx,vy); if(len>0){ vx=vx/len*sp; vy=vy/len*sp; p.moving=true; } else p.moving=false;
      if(len>0){
        var nx=p.x+vx*dt, ny=p.y+vy*dt;
        if(WORLD.walkable(Math.round(nx),Math.round(p.y))){ p.x=nx; } p.dir = Math.abs(vx)>Math.abs(vy)?(vx>0?'R':'L'):(vy>0?'D':'U');
        if(WORLD.walkable(Math.round(p.x),Math.round(ny))){ p.y=ny; }
        if((state.frame&7)===0) AUDIO.sfxStep();
      }
    }
    // camera segue
    cam.x=p.x-viewW/2+0.5; cam.y=p.y-viewH/2+0.5;
    cam.x=Math.max(0,Math.min(WORLD.size().w-viewW,cam.x)); cam.y=Math.max(0,Math.min(WORLD.size().h-viewH,cam.y));
    // mons
    MONS.update(dt,p);
    // habitat scan (ogni ~2s)
    if(state.frame%120===0){ MONS.scanHabitats(isNight()?'night':'day',p); }
    // HUD refresh cadenzato
    hudDirty+=dt; if(hudDirty>0.25){ hudDirty=0; UI.refreshHUD(state); }
    // quest passivi (flags da controllare)
    passiveQuests();
    // autosave ogni 20s
    if(state.frame%1200===0){ SAVE.saveState(state); }
  }

  // ─── render ───
  function render(){
    ctx.imageSmoothingEnabled=false;
    var gb=state.settings.gb;
    // tiles
    var x0=Math.floor(cam.x), y0=Math.floor(cam.y);
    for(var dy=-0; dy<=viewH; dy++) for(var dx=-0; dx<=viewW; dx++){
      var tx=x0+dx, ty=y0+dy;
      var tile=WORLD.getTile(tx,ty);
      var sx=Math.round((tx-cam.x)*TILE_PX), sy=Math.round((ty-cam.y)*TILE_PX);
      var l=lightAt(tx,ty,gb);
      drawTile(ctx,tile,tx,ty,sx,sy,TILE_PX,state.frame,l);
    }
    // oggetti naturali e piazzati
    var objs=WORLD.allObjects(); 
    for(var k in objs){ var o=objs[k]; if(o.x<x0-1||o.x>x0+viewW+1||o.y<y0-1||o.y>y0+viewH+1)continue;
      var sx=Math.round((o.x-cam.x)*TILE_PX), sy=Math.round((o.y-cam.y)*TILE_PX);
      drawObject(o, sx, sy, gb); }
    // bonus: sprouts (piantine secche) marker
    var spr=WORLD.getSpecials().sprouts||[];
    spr.forEach(function(s,i){ var sx=Math.round((s.x-cam.x)*TILE_PX), sy=Math.round((s.y-cam.y)*TILE_PX); if(sx<-16||sx>cv.width||sy<-16||sy>cv.height)return;
      var watered=s.watered; drawSprout(ctx,sx,sy,watered,state.frame,gb); });
    // mons
    MONS.all().forEach(function(m){ var sx=Math.round((m.x-cam.x)*TILE_PX), sy=Math.round((m.y-cam.y)*TILE_PX); if(sx<-16||sx>cv.width||sy<-16||sy>cv.height)return;
      drawSprite(ctx,m.species,sx,sy,TILE_PX/16,{shiny:m.shiny,gb:gb}); });
    // player
    (function(){ var p=state.player; var sx=Math.round((p.x-cam.x)*TILE_PX), sy=Math.round((p.y-cam.y)*TILE_PX);
      drawPlayer(ctx,sx,sy,TILE_PX/16,{skin:p.skin,hair:p.hair,shirt:p.shirt,moving:!!p.moving,gb:gb}); })();
    // ghost preview piazzamento
    if(state.player.placeSel && !UI.isModal()){ var g=state.player.placeSel; var sx=Math.round((Math.round(p().x)-cam.x)*TILE_PX)+(p().dir==='R'?TILE_PX:0); preview(g); }
    // filtro notte overlay
    nightOverlay();
  }
  function p(){ return state.player; }
  function lightAt(tx,ty,gb){ var h=Math.floor(state.time/60)%24; var l=1;
    if(h<6)l=0.45+0.1*Math.max(0,1-Math.abs(h-3)/3); else if(h>=20)l=0.45; else if(h<8||h>=18)l=0.75; else l=1;
    // luci posizionate
    var obj=WORLD.objAt(tx,ty);
    if(obj){ var def=ITEMS[obj.type]; if(def && def.light){ if(def.light==='dim')l=Math.max(l,0.7); else l=Math.max(l,0.95); }
      if(obj.type==='falò' && isNight()) l=Math.max(l,0.95); }
    return l;
  }
  function nightOverlay(){ var h=Math.floor(state.time/60)%24; var a=0;
    if(h<6)a=0.55; else if(h>=20)a=((h-20)+Math.floor(state.time%60)/60)/4*0.6; else if(h<7)a=(7-h)/1*0.3; else if(h>=18)a=((h-18)+Math.floor(state.time%60)/60)/2*0.4;
    if(a>0){ ctx.fillStyle='rgba(20,20,70,'+a.toFixed(2)+')'; ctx.fillRect(0,0,cv.width,cv.height); }
    // stelle di notte
    if(a>0.3){ ctx.fillStyle='rgba(255,255,255,0.5)'; for(var i=0;i<40;i++){ var sx=(i*97+state.frame*0.05)%cv.width; var sy=(i*53)%Math.min(cv.height,cv.width*0.5); ctx.fillRect(sx,sy,1,1); } }
  }
  function drawObject(o,sx,sy,gb){
    var opts={gb:gb};
    if(o.type==='falò'){ drawSprite(ctx, isNight()&&o.state.lit!==false?'falò_on':'falò_off', sx,sy,TILE_PX/16,opts); return; }
    if(o.type==='generatore'){ // generatore: rotto/riparato
      drawSprite(ctx,'generatore',sx,sy,TILE_PX/16,opts); if(o.state.broken) drawBrokenMark(ctx,sx,sy); return;
    }
    if(o.type==='detrito'){ drawSprite(ctx,'detrito',sx,sy,TILE_PX/16,opts); return; }
    if(o.type==='albero'){ drawSprite(ctx,'tree',sx,sy-8,TILE_PX/16,opts); return; }
    if(o.type==='roccia'){ drawSprite(ctx,'rock',sx,sy,TILE_PX/16,opts); return; }
    if(o.type==='cespuglio'||o.type==='spruzzabacche'){ drawSprite(ctx,'cespuglio',sx,sy,TILE_PX/16,opts); if(o.type==='spruzzabacche'){ drawSprite(ctx,'bacche',sx,sy,TILE_PX/16,opts);} return; }
    if(o.type==='rovina_metallo'){ drawSprite(ctx,'rottame',sx,sy,TILE_PX/16,opts); return; }
    if(o.type==='sign'){ drawSign(ctx,sx,sy); return; }
    if(ITEMS[o.type] && ITEMS[o.type].kind==='place'){ drawSprite(ctx,o.type,sx,sy,TILE_PX/16,opts); return; }
  }
  function drawBrokenMark(ctx,sx,sy){ ctx.fillStyle='#f44'; ctx.fillRect(sx+TILE_PX*0.4,sy+2,4,4); }
  function drawSign(ctx,sx,sy){ ctx.fillStyle='#9a6a3a'; ctx.fillRect(sx+6,sy+4,TILE_PX*0.5,TILE_PX*0.5); ctx.fillStyle='#6b4a2a'; ctx.fillRect(sx+7,sy+5,TILE_PX*0.4,TILE_PX*0.4); ctx.fillRect(sx+9,sy+TILE_PX*0.6,2,TILE_PX*0.4); }
  function drawSprout(ctx,sx,sy,watered,frame,gb){ ctx.fillStyle=watered?'rgb('+(gb?'139,172,15':'96,200,80')+')':'rgb(180,160,90)'; ctx.fillRect(sx+TILE_PX*0.4,sy+TILE_PX*0.6,TILE_PX*0.2,TILE_PX*0.25); if(watered&&frame%60<30){ ctx.fillStyle='rgba(120,220,120,0.6)'; ctx.fillRect(sx+TILE_PX*0.3,sy+TILE_PX*0.4,TILE_PX*0.4,2);} }

  // preview piazzamento
  function preview(type){ var p=state.player; var fx=Math.round(p.x), fy=Math.round(p.y);
    // tile davanti
    var tx=fx, ty=fy; if(p.dir==='U')ty--; else if(p.dir==='D')ty++; else if(p.dir==='L')tx--; else tx++;
    var sx=Math.round((tx-cam.x)*TILE_PX), sy=Math.round((ty-cam.y)*TILE_PX);
    ctx.globalAlpha=0.5; drawSprite(ctx,type,sx,sy,TILE_PX/16,{gb:state.settings.gb}); ctx.globalAlpha=1;
    ctx.strokeStyle= WORLD.walkable(tx,ty)&&!WORLD.objAt(tx,ty)?'rgba(120,255,120,0.8)':'rgba(255,80,80,0.8)'; ctx.lineWidth=2; ctx.strokeRect(sx,sy,TILE_PX,TILE_PX);
  }

  // ─── interazione E / click ───
  function doInteract(){
    if(UI.isModal())return;
    var p=state.player; var fx=Math.round(p.x), fy=Math.round(p.y);
    var tx=fx, ty=fy; if(p.dir==='U')ty--; else if(p.dir==='D')ty++; else if(p.dir==='L')tx--; else tx++;
    // prima: Pokémon sul tile?
    var m=MONS.at(tx,ty); if(m){ interactMon(m); return; }
    // oggetto naturale / piazzato / speciale
    var o=WORLD.objAt(tx,ty);
    if(o){ interactObj(o,tx,ty); return; }
    // tile speciale: sprout, cave, altar
    var spr=WORLD.getSpecials().sprouts||[];
    for(var i=0;i<spr.length;i++){ if(spr[i].x===tx && spr[i].y===ty && !spr[i].watered){ interactSprout(spr[i]); return; } }
    // tile acqua/scava con mossa
    var tile=WORLD.getTile(tx,ty);
    var cm=state.player.curMove;
    if(cm==='scava' && (tile===TILE.DIRT||tile===TILE.GRASS||tile===TILE.TGRASS)){ WORLD.setTile(tx,ty,TILE.WATER); AUDIO.sfxWater(); return; }
    if(cm==='fogliame' && tile===TILE.DIRT){ WORLD.setTile(tx,ty,TILE.GRASS); AUDIO.sfxCraft(); return; }
    // piazza oggetto selezionato?
    if(state.player.placeSel){ tryPlace(state.player.placeSel,tx,ty); }
  }
  function handleClickTile(tx,ty){
    var p=state.player;
    // se ho un placeSel: piazza dove clicco se vicino
    if(state.player.placeSel){ var d=Math.hypot(tx-p.x,ty-p.y); if(d<3){ tryPlace(state.player.placeSel,tx,ty); } return; }
    // altrimenti avvicina l'interazione: muovi il player verso il tile? semplice: marca direzione
    if(tx< p.x) p.dir='L'; else if(tx>p.x) p.dir='R'; else if(ty<p.y) p.dir='U'; else p.dir='D';
    doInteract();
  }

  // ─── interazione con Pokémon ───
  function interactMon(m){
    var sp=SPECIES[m.species];
    // quest speciale: squirtle disidratato
    if(m.species==='squirtle' && m.friendship===0){
      if(!state.player.moves.pistolacqua){
        UI.dialogue('Squirtle','*glerinno fiacco* ...sigh... acqua... (non hai ancora Pistolacqua. Aiuta Squirtle dopo averlo conosciuto.)');
      } else {
        UI.dialogue('Squirtle','*beve felice!* Gluglu... squirt! Squirtle è in forze e ti insegna Pistolacqua!', function(){
          state.quest.flags.squirtle_helped=true;
          makeFriend(m);
          advanceObjectiveCheck();
        });
      }
      return;
    }
    if(m.species==='snorlax' && state.quest.current==='q7' && !state.quest.flags.snorlax_awake){
      startFluteChallenge(); return;
    }
    if(m.species==='snorlax'){ UI.dialogue('Mosslax','Zzzz... mmm... brrr... Zzzz...'); return; }
    MONS.interact(m, {player:state.player, ui:wrapUI(), onFriend:function(){ UI.refreshHUD(state); advanceObjectiveCheck(); }});
    UI.refreshHUD(state);
  }
  function makeFriend(m){
    var sp=SPECIES[m.species];
    m.friendship=1; m.following=sp.follows; MONS.addFriend(m.species); AUDIO.cry(sp.cry); AUDIO.sfxFanfare();
    UI.notify('Hai fatto amicizia con '+sp.name+'!'+(m.shiny?' ✨SHINY!':''));
    if(sp.teaches && !state.player.moves[sp.teaches]){ state.player.moves[sp.teaches]=true; UI.notify('Hai imparato '+MOVES[sp.teaches].name+'!'); }
    advanceObjectiveCheck();
  }
  // wrap API MONS.interact compatibile
  function wrapUI(){ return { notify:UI.notify, dialogue:function(a,b){ UI.dialogue(a,b); } }; }

  // ─── interazione con oggetto ───
  function interactObj(o,tx,ty){
    var cm=state.player.curMove;
    if(o.type==='detrito'){
      // raccogli rametti/ciottoli misto
      var r=Math.random(); giveRes(r<0.6?'rametto':'ciottolo', 1+Math.floor(Math.random()*2)); WORLD.removeObj(tx,ty); AUDIO.sfxPickup(); advanceObjectiveCheck(); return;
    }
    if(o.type==='cespuglio'){ giveRes('fibra', 1+Math.floor(Math.random()*2)); WORLD.removeObj(tx,ty); AUDIO.sfxPickup(); return; }
    if(o.type==='spruzzabacche'){ giveRes('bacca', 1+Math.floor(Math.random()*3)); WORLD.removeObj(tx,ty); AUDIO.sfxPickup(); return; }
    if(o.type==='rovina_metallo'){ giveRes('metallo', 1+Math.floor(Math.random()*2)); WORLD.removeObj(tx,ty); AUDIO.sfxPickup(); return; }
    if(o.type==='albero'){ if(cm==='taglio' || state.player.moves.taglio){ giveRes('legno', 2+Math.floor(Math.random()*2)); WORLD.removeObj(tx,ty); AUDIO.sfxChop(); } else { UI.notify('Serve la mossa Taglio!'); AUDIO.sfxError(); } return; }
    if(o.type==='roccia'){ if(cm==='spaccaroccia' || state.player.moves.spaccaroccia){ giveRes('pietra', 2+Math.floor(Math.random()*2)); WORLD.removeObj(tx,ty); AUDIO.sfxSmash(); } else { UI.notify('Serve la mossa Spaccaroccia!'); AUDIO.sfxError(); } return; }
    if(o.type==='sign'){ UI.dialogue('Cartello', pick(DIALOGUES.sign)); return; }
    if(o.type==='generatore'){
      if(o.state.broken){
        if(state.player.inv.metallo>=6 && confirm('Usare 6 Metallo e la mossa Energia per riparare il generatore?')){
          state.player.inv.metallo-=6; o.state.broken=false; if(state.player.moves.energia){} AUDIO.sfxCraft(); UI.notify('Generatore riparato! Le luci delle rovine si accendono.');
          if(!state.quest.flags.gen_fixed){ state.quest.flags.gen_fixed=true; // attira pikachu peakychu
            var gen=WORLD.getSpecials().generator; MONS.spawn('pikachu', gen.x, gen.y+1, {questFollows:false}); MONS.all()[MONS.all().length-1].questOnly=true; }
          MONS.interact(MONS.all()[MONS.all().length-1], {player:state,ui:wrapUI()});
        } else { UI.dialogue('Generatore','Rotto. Servono 6 Metallo e la mossa Energia per ripararlo.'); }
      } else { UI.dialogue('Generatore','Ronzando... fornisce luce alle rovine.'); }
      return;
    }
    // altare interazione speciale per Mew
    if(o.type==='altare' && isNight()){
      var friends=MONS.friendsCount();
      if(friends>=12){ triggerMew(o,tx,ty); } else { UI.dialogue('Altare','Vedi un altare antico... la leggenda dice che un cuore puro con 12 amici potrà evocare Mew. Amici: '+friends+'/12.'); }
      return;
    }
    // oggetto piazzato: ritira
    if(ITEMS[o.type] && ITEMS[o.type].kind==='place'){
      var rem=WORLD.removePlaced(tx,ty); if(rem){ var it=ITEMS[rem.type]; if(it.cost){ for(var r2 in it.cost){ var half=Math.ceil(it.cost[r2]/2); giveRes(r2,half); } } AUDIO.sfxPickup(); UI.notify('Rimosso: '+it.name); }
      return;
    }
    // carta segnaposto generico
    UI.dialogue(o.type, '...');
  }
  function giveRes(k,n){ state.player.inv[k]=(state.player.inv[k]||0)+n; UI.notify('+'+n+' '+ITEMS[k].name); markHUD(); }
  function markHUD(){ hudDirty=1; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // ─── sprout (q4) ───
  function interactSprout(s){
    var cm=state.player.curMove;
    if(cm==='pistolacqua'){ if(!s.watered){ s.watered=true; AUDIO.sfxWater(); UI.notify('Piantina innaffiata! 🌱'); WORLD.setTile(s.x,s.y,TILE.FLOWER); advanceObjectiveCheck(); } }
    else { UI.notify('Serve Pistolacqua (tasto 2)!'); AUDIO.sfxError(); }
  }

  // ─── piazzamento ───
  function tryPlace(type,tx,ty){
    if(!ITEMS[type]){ state.player.placeSel=null; return; }
    if((state.player.inv[type]||0)<=0){ UI.notify('Non hai '+ITEMS[type].name+'. Craftalo al banco (C).'); state.player.placeSel=null; return; }
    if(WORLD.objAt(tx,ty)||!WORLD.walkable(tx,ty)){ UI.notify('Non puoi piazzarlo qui.'); AUDIO.sfxError(); return; }
    if(type==='flauto'){ /* oggetto speciale: non si piazza */ startFluteChallengeIfSnorlax(); return; }
    WORLD.placeItem(tx,ty,type); state.player.inv[type]-=1; AUDIO.sfxCraft(); UI.notify('Piazzato: '+ITEMS[type].name); if(state.player.inv[type]<=0) state.player.placeSel=null;
    advanceObjectiveCheck();
  }
  function startFluteChallengeIfSnorlax(){ doInteract(); }

  // ─── flauto challenge (Mosslax) ───
  function startFluteChallenge(){
    // genera sequenza di 4 note
    var n=4; var seq=[]; for(var i=0;i<n;i++) seq.push(Math.floor(Math.random()*6));
    UI.startFlute(seq, function(success){ if(success){ wakeSnorlax(); } else { UI.notify('La melodia non è riuscita. Riprova!'); } });
  }
  function wakeSnorlax(){
    state.quest.flags.snorlax_awake=true;
    var s=WORLD.getSpecials().snorlax; var m=MONS.all().find(function(x){return x.species==='snorlax';});
    if(m){ m.friendship=1; m.following=true; MONS.addFriend('snorlax'); AUDIO.sfxFanfare(); UI.notify('Mosslax si sveglia e si unisce a te! ❤'); MONS.cry?AUDIO.cry(SPECIES.snorlax.cry):0; }
    // apri grotta: spawn dratini
    var cave=WORLD.getSpecials().caveEntrance; MONS.spawn('dratini', cave.x, cave.y-1, {questFollows:false});
    state.quest.current='q8'; advanceObjectiveCheck();
  }
  function triggerMew(o,tx,ty){
    if(state.quest.flags.mew_met) { UI.dialogue('Mew','Mew~ (già tuo amico) 🌸'); return; }
    MONS.spawn('mew',tx,ty-1); var m=MONS.all()[MONS.all().length-1]; m.friendship=0;
    UI.dialogueMulti([{n:'???',t:'...'},
      {n:'Mew',t:'Mew... mew mew~ (Vedo un cuore puro. Ti dono la mia amicizia, Ditto.)'},
      {n:'Professor Tangrowth',t:'Non posso crederci... Mew! La leggenda era vera! La Kanto tornerà a fiorire grazie a te.'}], function(){
      makeFriend(m); state.quest.flags.mew_met=true; state.quest.current=null;
      UI.dialogue(' finale','★ DITTOPIA — FINE ★\n\nHai riportato la vita nella Kanto post-apocalittica.\nGrazie, Ditto, da parte di tutti i Pokémon. 🌸');
    });
  }

  // ─── missioni: progressione ───
  function onCraft(k){ if(state.quest.current==='q6' && k==='flauto'){ advanceObjectiveCheck(); } }
  function advanceObjectiveCheck(){
    var q=QUESTS.find(function(x){return x.id===state.quest.current;}); if(!q)return;
    var done=false;
    if(q.flag){ done=!!state.quest.flags[q.flag]; }
    else if(q.need){ done=true; for(var r in q.need){ if((state.player.inv[r]||0)<q.need[r]) done=false; } }
    else if(q.place){ done=q.place.every(function(t){ return (state.player.inv[t]||0)>0 || placedHas(t); }); }
    else if(q.craft){ done=(state.player.inv[q.craft]||0)>0; }
    else if(q.needFriends){ done=MONS.friendsCount()>=q.needFriends && state.quest.flags.cave_explored; }
    if(done){ completeQuest(q); }
  }
  function placedHas(type){ return WORLD.getPlaced().some(function(p){return p.type===type;}); }
  function completeQuest(q){
    if(state.quest._completing===q.id) return; // anti-reentrancy
    state.quest._completing=q.id;
    AUDIO.sfxFanfare(); UI.notify('Missione completata: '+q.title);
    if(q.teaches && !state.player.moves[q.teaches]){ state.player.moves[q.teaches]=true; UI.notify('Hai imparato la mossa '+MOVES[q.teaches].name+'!'); }
    // avanza quest PRIMA del reward/spawn + dialogo, così advanceObjectiveCheck non riprega q2
    var next=QUESTS.find(function(x){return x.id===q.next;});
    state.quest.current = q.next||null;
    if(q.reward==='squirtle_intro' && !state.quest.flags.squirtle_reward){
      var sq=MONS.all().find(function(x){return x.species==='squirtle';});
      if(sq && sq.friendship===0){ makeFriend(sq); }
      state.quest.flags.squirtle_reward=true;
    }
    // (q2 non ha più reward: avanza a q3 e mostra dialogo)
    if(next){ var lines=next.lines.map(function(l){return 'Professor Tangrowth: '+l;}); UI.dialogueMulti(lines, function(){ /* non controlla subito il nuovo obiettivo */ }); }
    state.quest._completing=null;
  }
  function passiveQuests(){
    if(state.quest.current==='q2'){ advanceObjectiveCheck(); }
    if(state.quest.current==='q4'){ var n=(WORLD.getSpecials().sprouts||[]).filter(function(s){return s.watered;}).length; if(n>=3 && !state.quest.flags.watered3){ state.quest.flags.watered3=true; advanceObjectiveCheck(); } }
    if(state.quest.current==='q5'){ advanceObjectiveCheck(); }
    if(state.quest.current==='q8'){ if(MONS.friendsCount()>=12 && caveEntered()) { state.quest.flags.cave_explored=true; advanceObjectiveCheck(); } }
  }
  function caveEntered(){ var ce=WORLD.getSpecials().caveEntrance; var p=state.player; return Math.abs(p.x-ce.x)<4 && p.y<ce.y+2; }

  // API pubblica
  return { init:init, newGame:newGame, continueGame:continueGame, state:stateRef, player:freshState().player, onCraft:onCraft,
           inv: function(){return state?state.player.inv:{};},
           _expose:{ doInteract:doInteract, handleClickTile:handleClickTile, keys:keys },
           _tick:function(dt){ dt=dt||0.016; update(dt); render(); } };
})();
// esponi doInteract e player per UI/touch
window.GAME=GAME;
GAME.doInteract=function(){ GAME._expose.doInteract(); };
GAME.clickTile=function(x,y){ GAME._expose.handleClickTile(x,y); };