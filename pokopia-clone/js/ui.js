// ui.js — HUD, dialoghi typewriter, menu, craft, Pokédex, minigioco flauto, titolo/customizzazione, touch.
var UI = (function(){
  var els={};
  var mode='play';
  var dialogueQueue=[]; var dialogueCb=null; var dialogueChars=0; var dialogueTimer=0; var dialogueFull='';
  var craftSelected=0; var craftList=[]; var dexSel=0; var menuSel=0;
  var fluteSeq=[]; var fluteInput=[]; var flutePlayer=false; var fluteCb=null;
  var customizeCb=null;
  var toastT=null;

  // ─── init ───
  function init(){
    var idmap={hud:'hud',clock:'clock',obj:'objective',inv:'inv',hotbar:'hotbar',dialogue:'dialogue',dText:'dText',dName:'dName',dPrompt:'dPrompt',menu:'menu',craft:'craft',craftList:'craftList',dex:'dex',dexList:'dexList',flute:'flute',fluteSeq:'fluteSeq',fluteIn:'fluteIn',fluteMsg:'fluteMsg',title:'title',customize:'customize',notify:'notify',touch:'touch',touchpad:'touchpad',btnA:'btnA',btnB:'btnB',tip:'tip',toast:'toast',touchBtns:'touchBtns'};
    Object.keys(idmap).forEach(function(k){ els[k]=document.getElementById(idmap[k]); });
  }

  // ─── stato UI ───
  function modeOf(){ return mode; }
  function isModal(){ return mode!=='play'; }
  function isTouch(){ return ('ontouchstart' in window) || navigator.maxTouchPoints>0; }

  // ─── HUD ───
  function refreshHUD(state){
    var t=state.time; var h=Math.floor(t/60)%24; var mins=Math.floor(t%60);
    var isNight=h<6||h>=20;
    els.clock.textContent=(h<10?'0':'')+h+':'+(mins<10?'0':'')+mins+' '+(isNight?'☾':'☀');
    var q=QUESTS.find(function(x){return x.id===state.quest.current;});
    els.obj.textContent = q?('★ '+q.title+' — '+q.goal):'';
    // inventario risorse
    var p=state.player;
    var html=''; Object.keys(p.inv).forEach(function(k){ var n=p.inv[k]; if(n>0 && ITEMS[k] && ITEMS[k].kind==='res'){ html+='<span class="ic" title="'+ITEMS[k].name+'"><i data-r="'+k+'"></i>×'+n+'</span>'; } });
    els.inv.innerHTML=html;
    // hotbar mosse
    html=''; MOVE_ORDER.forEach(function(mv,i){ if(p.moves[mv]){ var key=(i+1); html+='<div class="hb'+(p.curMove===mv?' sel':'')+'" data-mv="'+mv+'">'+key+'·'+MOVES[mv].name+'</div>'; } });
    els.hotbar.innerHTML=html;
    if(els.touch) els.touch.style.display = isTouch()?'block':'none';
  }

  // ─── toast ───
  function notify(msg){ if(!els.toast)return; els.toast.textContent=msg; els.toast.style.opacity='1'; if(toastT)clearTimeout(toastT); toastT=setTimeout(function(){els.toast.style.opacity='0';},2600); }

  // ─── dialogo ───
  function dialogue(name,text,cb){ dialogueQueue=[{n:name,t:text}]; dialogueCb=cb; startNextDialog(); }
  function dialogueMulti(lines,cb){ dialogueQueue=lines.map(function(l){ return typeof l==='string'?{t:l}:{n:l.n||'',t:l.t}; }); dialogueCb=cb; startNextDialog(); }
  function startNextDialog(){
    if(dialogueQueue.length===0){ mode='play'; els.dialogue.style.display='none'; var cb=dialogueCb; dialogueCb=null; if(cb)cb(); return; }
    var d=dialogueQueue[0]; mode='dialogue'; els.dialogue.style.display='block'; els.dPrompt.style.display='none';
    els.dName.textContent=d.n||''; dialogueFull=d.t; dialogueChars=0; dialogueTimer=0; els.dText.textContent='';
  }
  function update(dt){
    if(mode!=='dialogue')return;
    if(dialogueChars<dialogueFull.length){
      dialogueTimer+=dt; var speed=0.022; var n=Math.floor(dialogueTimer/speed);
      if(n>dialogueChars){ var prev=Math.floor(dialogueChars/3); var now=Math.floor(n/3); if(now>prev)AUDIO.sfxText(); dialogueChars=Math.min(n,dialogueFull.length); els.dText.textContent=dialogueFull.slice(0,dialogueChars); }
    } else { els.dPrompt.style.display='block'; }
  }
  function dialogueAdvance(){
    if(mode!=='dialogue')return;
    if(dialogueChars<dialogueFull.length){ dialogueChars=dialogueFull.length; els.dText.textContent=dialogueFull; els.dPrompt.style.display='block'; }
    else { dialogueQueue.shift(); startNextDialog(); }
  }

  // ─── menu principale ───
  function openMenu(state){ mode='menu'; menuSel=0; els.menu.style.display='flex'; renderMenu(state); }
  function closeMenu(){ els.menu.style.display='none'; mode='play'; }
  function renderMenu(state){
    var opts=['Pokédex','Salva ora','Esporta salvataggio','Importa salvataggio','Modalità GB: '+(state.settings.gb?'ON':'OFF'),'Audio: '+(AUDIO.isMuted()?'OFF':'ON'),'Cancella salvataggio','Chiudi'];
    els.menu.innerHTML='<div class="mt">MENU</div>'+opts.map(function(o,i){return '<div class="mo'+(i===menuSel?' sel':'')+'" data-i="'+i+'">'+o+'</div>';}).join('');
  }
  function menuMove(dir,state){ var opts=8; menuSel=(menuSel+dir+opts)%opts; AUDIO.sfxSelect(); renderMenu(state); }
  function menuAction(i,state){
    switch(i){
      case 0: closeMenu(); openDex(state); break;
      case 1: SAVE.saveState(state); notify('Salvataggio completo.'); AUDIO.sfxCraft(); break;
      case 2: try{ var b=SAVE.exportB64(); prompt('Copia questo codice:',b); }catch(e){ notify('Errore export.'); } break;
      case 3: var v=prompt('Incolla il codice di salvataggio:'); if(v&&SAVE.importB64(v)){ notify('Importato! Ricarica...'); setTimeout(function(){location.reload();},900);} else notify('Codice non valido.'); break;
      case 4: state.settings.gb=!state.settings.gb; renderMenu(state); break;
      case 5: AUDIO.setMute(!AUDIO.isMuted()); renderMenu(state); break;
      case 6: if(confirm('Cancellare il salvataggio?')){ SAVE.reset(); notify('Salvataggio cancellato.'); } break;
      case 7: closeMenu(); break;
    }
  }

  // ─── crafting ───
  function openCraft(state){ mode='craft'; craftSelected=0; buildCraftList(state); renderCraft(state); }
  function closeCraft(){ els.craft.style.display='none'; mode='play'; }
  function buildCraftList(state){ craftList=[]; Object.keys(ITEMS).forEach(function(k){ var it=ITEMS[k]; if(it.kind!=='place')return; if(it.move && it.move!=='base' && !state.player.moves[it.move]) return; craftList.push(k); }); }
  function canAfford(state,cost){ if(!cost)return true; for(var k in cost) if((state.player.inv[k]||0)<cost[k]) return false; return true; }
  function costStr(cost){ if(!cost)return ''; return Object.keys(cost).map(function(k){return ITEMS[k].name+'×'+cost[k];}).join(', '); }
  function renderCraft(state){
    var html='<div class="mt"><b>BANCO DA LAVORO</b> — ↑↓scegli · E crea · Esc chiudi</div>';
    if(craftList.length===0){ html+='<div>Niente da craftare. Raccogli risorse!</div>'; }
    craftList.forEach(function(k,i){ var it=ITEMS[k]; var can=canAfford(state,it.cost); var sel=i===craftSelected;
      html+='<div class="mo'+(sel?' sel':'')+'" data-i="'+i+'"><b>'+it.name+'</b> — '+costStr(it.cost)+(can?'':' <span style="color:#f88">✗</span>')+(it.desc?'<br><small>'+it.desc+'</small>':'')+'</div>'; });
    els.craft.innerHTML=html; els.craft.style.display='flex';
  }
  function craftMove(dir,state){ if(!craftList.length)return; craftSelected=(craftSelected+dir+craftList.length)%craftList.length; AUDIO.sfxSelect(); renderCraft(state); }
  function craftConfirm(state){
    var k=craftList[craftSelected]; if(!k)return; var it=ITEMS[k];
    if(!canAfford(state,it.cost)){ AUDIO.sfxError(); notify('Risorse insufficienti.'); return; }
    for(var r in it.cost){ state.player.inv[r]-=it.cost[r]; if(state.player.inv[r]<0)state.player.inv[r]=0; }
    state.player.inv[k]=(state.player.inv[k]||0)+1;
    AUDIO.sfxCraft(); notify('Craftato: '+it.name+' ×1'); GAME.onCraft(k); renderCraft(state);
  }

  // ─── Pokédex ───
  function openDex(state){ mode='dex'; dexSel=0; renderDex(state); }
  function closeDex(){ els.dex.style.display='none'; mode='play'; }
  function renderDex(state){
    var dex=MONS.pokedex(); var keys=Object.keys(SPECIES);
    var html='<div class="mt">POKéDEX — visti '+MONS.dexCount()+' · amici '+MONS.friendsCount()+' (Esc chiudi)</div>';
    keys.forEach(function(sp,i){ var s=SPECIES[sp]; var e=dex[sp]||{seen:false,friends:false}; var sel=i===dexSel;
      var n='#'+String(s.n).padStart(3,'0'); var name=e.seen?s.name:'???';
      html+='<div class="mo'+(sel?' sel':'')+'" data-i="'+i+'"><b>'+n+'</b> '+name+(e.friends?' ❤':'')+(e.seen&&!e.friends?' ○':'')+'</div>';
      if(sel){ html+='<div class="dexEntry">'+(e.seen?'<i data-mon="'+sp+'"></i>':'<i class="sil"></i>')+'<div>'+(e.seen?s.flavor:'Pokémon non ancora scoperto.')+'</div><div><small>'+s.type+'</small></div></div>'; }
    });
    els.dex.innerHTML=html; els.dex.style.display='flex';
  }
  function dexMove(dir,state){ var keys=Object.keys(SPECIES); dexSel=(dexSel+dir+keys.length)%keys.length; AUDIO.sfxSelect(); renderDex(state); }

  // ─── minigioco flauto (Simon) ───
  function startFlute(seq,cb){ fluteSeq=seq.slice(); fluteInput=[]; flutePlayer=false; fluteCb=cb; mode='flute'; els.flute.style.display='flex'; playFluteSeq(); }
  function playFluteSeq(){
    els.fluteMsg.textContent='Ascolta la melodia...'; fluteStepWait(0);
  }
  function fluteStepWait(i){
    if(i>=fluteSeq.length){ els.fluteMsg.textContent='Tocca a te! Ripeti con 1-6 (o pulsanti).'; fluteInput=[]; flutePlayer=true; els.fluteIn.innerHTML=''; return; }
    var n=fluteSeq[i]; AUDIO.fluteNote(n);
    els.fluteSeq.innerHTML=fluteSeq.slice(0,i+1).map(function(x){return '<b class="fn'+x+'">'+(['Do','Re','Mi','Fa','Sol','La'][x])+'</b>';}).join(' ');
    fluteSeqTimer=setTimeout(function(){ fluteStepWait(i+1); }, 520);
  }
  var fluteSeqTimer=null;
  function fluteInputNote(n){
    if(mode!=='flute'||!flutePlayer)return;
    AUDIO.fluteNote(n); fluteInput.push(n);
    els.fluteIn.innerHTML=fluteInput.map(function(x){return '<b class="fn'+x+'">'+(['Do','Re','Mi','Fa','Sol','La'][x])+'</b>';}).join(' ');
    var idx=fluteInput.length-1;
    if(fluteInput[idx]!==fluteSeq[idx]){ AUDIO.fluteFail(); els.fluteMsg.textContent='Nota sbagliata! Riprova.'; flutePlayer=false; clearTimeout(fluteSeqTimer); setTimeout(playFluteSeq,1300); return; }
    if(fluteInput.length>=fluteSeq.length){ flutePlayer=false; AUDIO.fluteSuccess(); els.fluteMsg.textContent='Perfetto! Mosslax si sveglia...'; setTimeout(function(){ closeFlute(); if(fluteCb)fluteCb(true); },900); }
  }
  function closeFlute(){ clearTimeout(fluteSeqTimer); els.flute.style.display='none'; mode='play'; fluteCb=null; flutePlayer=false; }

  // ─── titolo ───
  function showTitle(){ mode='title'; els.title.style.display='flex';
    els.title.innerHTML='<div class="tlogo">DITTOPIA</div><div class="tsub">un omaggio a Pokémon Pokopia</div>'+
      '<div class="tbtn" data-act="new">▣ NUOVA PARTITA</div>'+
      '<div class="tbtn" data-act="continue"'+(SAVE.hasSave()?'':' style="opacity:.3"')+'>▣ CONTINUA</div>'+
      '<div class="tdisc">Fan game non ufficiale. Non affiliato a Nintendo/Game Freak/The Pokémon Company.</div>'; }
  function hideTitle(){ els.title.style.display='none'; mode='play'; }

  // ─── customizzazione ───
  var cust={skin:0,hair:0,shirt:0};
  var SKINS=[[[232,184,148]],[[200,150,110]],[[150,100,70]],[[240,210,180]]];
  var HAIRS=[[[60,40,30]],[[140,80,40]],[[180,140,60]],[[60,60,80]],[[200,60,60]]];
  var SHIRTS=[[[60,90,150]],[[200,60,60]],[[60,160,80]],[[180,60,160]],[[230,160,40]]];
  function showCustomize(cb){ mode='customize'; customizeCb=cb; cust={skin:0,hair:0,shirt:0}; els.customize.style.display='flex'; renderCustomize(); }
  function renderCustomize(){
    var skin=SKINS[cust.skin][0],hair=HAIRS[cust.hair][0],shirt=SHIRTS[cust.shirt][0];
    var h='<div class="mt">Crea il tuo Ditto umano</div><canvas id="prevC" width="96" height="96"></canvas>'+
      '<div class="custRow"><span>Pelle</span><button data-c="skin" data-d="-1">‹</button><span>'+(cust.skin+1)+'/'+SKINS.length+'</span><button data-c="skin" data-d="1">›</button></div>'+
      '<div class="custRow"><span>Capelli</span><button data-c="hair" data-d="-1">‹</button><span>'+(cust.hair+1)+'/'+HAIRS.length+'</span><button data-c="hair" data-d="1">›</button></div>'+
      '<div class="custRow"><span>Maglietta</span><button data-c="shirt" data-d="-1">‹</button><span>'+(cust.shirt+1)+'/'+SHIRTS.length+'</span><button data-c="shirt" data-d="1">›</button></div>'+
      "<div class=\"tbtn\" data-act=\"go\">✔ INIZIA L'AVVENTURA</div>";
    els.customize.innerHTML=h;
    var cv=document.getElementById('prevC'); if(cv){ var cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false; cx.clearRect(0,0,96,96); drawPlayer(cx,0,4,6,{skin:skin,hair:hair,shirt:shirt}); }
  }
  function custChoose(cat,dir){ if(cat==='skin')cust.skin=(cust.skin+dir+SKINS.length)%SKINS.length; else if(cat==='hair')cust.hair=(cust.hair+dir+HAIRS.length)%HAIRS.length; else cust.shirt=(cust.shirt+dir+SHIRTS.length)%SHIRTS.length; AUDIO.sfxSelect(); renderCustomize(); }
  function custConfirm(){ var v={skin:SKINS[cust.skin][0],hair:HAIRS[cust.hair][0],shirt:SHIRTS[cust.shirt][0]}; mode='play'; els.customize.style.display='none'; var cb=customizeCb; customizeCb=null; if(cb)cb(v); }

  // ─── input tastiera UI ───
  function handleKey(e,state){
    var k=e.key;
    if(mode==='title'){ if(k==='Enter'||k===' '){ if(SAVE.hasSave())GAME.continueGame(); else GAME.newGame(); } return true; }
    if(mode==='customize'){ if(k==='Enter')custConfirm(); return true; }
    if(mode==='dialogue'){ if(k==='Enter'||k===' '||k==='e'||k==='E')dialogueAdvance(); return true; }
    if(mode==='menu'){ if(k==='Escape'||k==='q'||k==='Q')closeMenu(); else if(k==='ArrowUp'||k==='w'||k==='W')menuMove(-1,state); else if(k==='ArrowDown'||k==='s'||k==='S')menuMove(1,state); else if(k==='Enter'||k===' '||k==='e'||k==='E')menuAction(menuSel,state); return true; }
    if(mode==='craft'){ if(k==='Escape'||k==='q'||k==='Q')closeCraft(); else if(k==='ArrowUp'||k==='w'||k==='W')craftMove(-1,state); else if(k==='ArrowDown'||k==='s'||k==='S')craftMove(1,state); else if(k==='Enter'||k===' '||k==='e'||k==='E')craftConfirm(state); return true; }
    if(mode==='dex'){ if(k==='Escape'||k==='q'||k==='Q'||k==='t'||k==='T')closeDex(); else if(k==='ArrowUp'||k==='w'||k==='W')dexMove(-1,state); else if(k==='ArrowDown'||k==='s'||k==='S')dexMove(1,state); return true; }
    if(mode==='flute'){ var m={'1':0,'2':1,'3':2,'4':3,'5':4,'6':5}; if(m[k]!==undefined)fluteInputNote(m[k]); else if(k==='Escape'){ closeFlute(); if(fluteCb)fluteCb(false); } return true; }
    return false;
  }

  // ─── click delegato ───
  function onClick(ev,state){
    var t=ev.target; var a, c, d, i;
    if(mode==='title'){ a=t.getAttribute&&t.getAttribute('data-act'); if(a==='new')GAME.newGame(); else if(a==='continue')GAME.continueGame(); return; }
    if(mode==='customize'){ c=t.getAttribute&&t.getAttribute('data-c'); if(c){ d=parseInt(t.getAttribute('data-d')); custChoose(c,d); } else if(t.getAttribute&&t.getAttribute('data-act')==='go') custConfirm(); return; }
    if(mode==='menu'){ i=t.getAttribute&&t.getAttribute('data-i'); if(i!==null){ menuSel=parseInt(i); menuAction(menuSel,state); } return; }
    if(mode==='craft'){ i=t.getAttribute&&t.getAttribute('data-i'); if(i!==null){ craftSelected=parseInt(i); AUDIO.sfxSelect(); renderCraft(state); } return; }
    if(mode==='dex'){ i=t.getAttribute&&t.getAttribute('data-i'); if(i!==null){ var keys=Object.keys(SPECIES); dexSel=parseInt(i); AUDIO.sfxSelect(); renderDex(state); } return; }
    if(mode==='flute'){ a=t.getAttribute&&t.getAttribute('data-n'); if(a!==null) fluteInputNote(parseInt(a)); return; }
  }

  return { init:init, refreshHUD:refreshHUD, notify:notify, dialogue:dialogue, dialogueMulti:dialogueMulti,
    update:update, modeOf:modeOf, isModal:isModal, handleKey:handleKey, onClick:onClick,
    dialogueAdvance:dialogueAdvance, fluteInputNote:fluteInputNote,
    openMenu:openMenu, closeMenu:closeMenu, openCraft:openCraft, closeCraft:closeCraft,
    openDex:openDex, closeDex:closeDex, startFlute:startFlute, closeFlute:closeFlute,
    showTitle:showTitle, hideTitle:hideTitle, showCustomize:showCustomize, isTouch:isTouch };
})();