// pokemon.js — spawn, IA vagabondaggio, amicizia, mosse insegnate, shiny; Pokédex.
var MONS = (function(){
  var list=[];   // Pokémon attivi nel mondo: {id, species, x, y, homeX, homeY, shiny, friends, following, dx,dy, wobble, spriteId}
  var dex={};    // species -> {seen:bool, friends:bool}

  function reset(){ list=[]; dex={}; }
  function addSeen(sp){ if(!dex[sp]) dex[sp]={seen:false,friends:false}; dex[sp].seen=true; }
  function addFriend(sp){ if(!dex[sp]) dex[sp]={seen:false,friends:false}; dex[sp].seen=true; dex[sp].friends=true; }
  function dexCount(){ return Object.keys(dex).filter(function(k){return dex[k].seen;}).length; }
  function friendsCount(){ return Object.keys(dex).filter(function(k){return dex[k].friends;}).length; }
  function pokedex(){ return dex; }
  function all(){ return list; }
  function at(x,y){ for(var i=0;i<list.length;i++){ if(Math.round(list[i].x)===x && Math.round(list[i].y)===y) return list[i]; } return null; }

  // spawn: posiziona un Pokémon; shiny casuale
  function spawn(species, x, y, opts){
    opts=opts||{};
    var shiny = opts.shiny!==undefined?opts.shiny : (Math.random()<SHINY_CHANCE);
    var m={id:Math.random().toString(36).slice(2,8), species:species, x:x, y:y, homeX:x, homeY:y,
      shiny:!!shiny, friendship:0, following:false, wobble:Math.random()*100, questOnly:!!opts.questFollows};
    if(opts.following){ m.following=true; }
    list.push(m); addSeen(species);
    return m;
  }
  function despawn(id){ for(var i=0;i<list.length;i++){ if(list[i].id===id){ list.splice(i,1); return; } } }
  function countSpecies(sp){ return list.filter(function(m){return m.species===sp;}).length; }

  // ─── habitat scanner: determina quali Pokémon dovrebbero essere presenti e fa spawn/despawn ───
  function scanHabitats(time, player){
    HABITATS.forEach(function(rule){
      if(rule.special) return;
      var sp=rule.mon; if(!SPECIES[sp]) return;
      if(SPECIES[sp].questOnly || SPECIES[sp].caveOnly) return;
      if(rule.time!=='any' && rule.time!==time) return;
      if(rule.needDex && dexCount()<rule.needDex) return;
      if(rule.needFriends && friendsCount()<rule.needFriends) return;
      // cerca un punto del mondo che soddisfi la regola (su placed items e tile). 
      // Efficiente: per ogni oggetto piazzato centra i check su di essi se la regola include un oggetto k;
      // altrimenti scan sparse su placed omonimi.
      var centers=[];
      rule.req.forEach(function(c){ if(ITEMS[c.k] && ITEMS[c.k].kind==='place'){ WORLD.getPlaced().forEach(function(p){ if(p.type===c.k) centers.push({x:p.x,y:p.y}); }); } });
      if(centers.length===0){ centers.push({x:40,y:40}); }
      var cur=countSpecies(sp);
      var limit=rule.limit||1;
      centers.some(function(center){
        if(cur>=limit) return true;
        if(WORLD.ruleOk(rule, center.x, center.y)){
          // trova tile libero vicino per spawnare
          var spot=findSpawnSpot(center.x,center.y);
          if(spot){ spawn(sp, spot.x, spot.y); cur++; AUDIO.sfxSparkle(); }
          return cur>=limit;
        }
      });
    });
    // despawn Pokémon la cui regola non è più soddisfatta (vagabondi non amici)
    list.slice().forEach(function(m){ if(SPECIES[m.species].questOnly||SPECIES[m.species].caveOnly)return; if(m.friendship>0)return;
      var rule=null; for(var i=0;i<HABITATS.length;i++){ if(HABITATS[i].mon===m.species){rule=HABITATS[i];break;} }
      if(!rule) return;
      if(rule.time!=='any' && rule.time!==time){ despawn(m.id); return; }
      if(!WORLD.ruleOk(rule, m.x|0, m.y|0)){ despawn(m.id); }
    });
  }
  function findSpawnSpot(cx,cy){ for(var r=1;r<4;r++){ for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){ var x=cx+dx,y=cy+dy; if(WORLD.walkable(x,y) && !WORLD.objAt(x,y)) return {x:x,y:y}; } } return null; }

  // ─── IA vagabondaggio ───
  function update(dt, player){
    for(var i=0;i<list.length;i++){ var m=list[i]; m.wobble+=dt;
      if(m.following){ follow(m,player,dt); }
      else { wander(m,dt); }
    }
  }
  function wander(m,dt){
    m.wobble=m.wobble||0;
    if(Math.random()<0.02){ m.dir=(Math.random()*4)|0; }
    var sp=0.6; var vx=0,vy=0;
    if(m.dir===0)vy=-sp; else if(m.dir===1)vy=sp; else if(m.dir===2)vx=-sp; else if(m.dir===3)vx=sp;
    var nx=m.x+vx*dt, ny=m.y+vy*dt;
    if(Math.abs(vx)>0||Math.abs(vy)>0) faceVx(m,vx,vy);
    if(WORLD.walkable(Math.round(nx),Math.round(m.y)) && Math.abs(nx-m.homeX)<3) m.x=nx; else m.dir=(Math.random()*4)|0;
    if(WORLD.walkable(Math.round(m.x),Math.round(ny)) && Math.abs(ny-m.homeY)<3) m.y=ny; else m.dir=(Math.random()*4)|0;
  }
  function follow(m,player,dt){
    var tx=Math.floor(player.x), ty=Math.floor(player.y-2);
    var dx=tx-m.x, dy=ty-m.y; var d=Math.hypot(dx,dy);
    if(d>0.6){ var sp=1.6; var vx=dx/d*sp, vy=dy/d*sp; var nx=m.x+vx*dt, ny=m.y+vy*dt;
      if(WORLD.walkable(Math.round(nx),Math.round(m.y))) m.x=nx; if(WORLD.walkable(Math.round(m.x),Math.round(ny))) m.y=ny; faceVx(m,vx,vy); }
  }
  function faceVx(m,vx,vy){ m.facing = Math.abs(vx)>Math.abs(vy) ? (vx>0?'R':'L') : (vy>0?'D':'U'); }

  // ─── interazione (E) ───
  // dà amicizia: se risposta Pokémon segue, diventa amico, impara mossa
  function interact(m, game){
    if(!m) return false;
    var sp=SPECIES[m.species];
    addSeen(m.species);
    // diventa amico se non lo è già (anche questOnly)
    if(m.friendship===0){
      m.friendship=1; m.following=sp.follows; addFriend(m.species);
      AUDIO.cry(sp.cry); AUDIO.sfxFanfare();
      game.ui.notify((m.shiny?'Shiny ':'')+'Hai fatto amicizia con '+sp.name+'!');
      if(sp.teaches && !game.player.moves[sp.teaches]){ game.player.moves[sp.teaches]=true; game.ui.notify('Hai imparato '+MOVES[sp.teaches].name+'!'); }
      if(game.onFriend) game.onFriend(m);
      return 'friend:'+sp.name;
    }
    // già amico: dialogo fluff
    game.ui.dialogue(sp.name+': '+(m.shiny?'(Brilla di una luce diversa!) ':'')+sp.flavor);
    AUDIO.cry(sp.cry);
    return 'talk:'+sp.name;
  }

  // ─── serializzazione ───
  function serialize(){ return list.map(function(m){ return {id:m.id, sp:m.species, x:m.x, y:m.y, hx:m.homeX, hy:m.homeY, sh:m.shiny, fr:m.friendship, fo:m.following, qo:m.questOnly}; }); }
  function load(data, specials){ reset(); (data||[]).forEach(function(e){ var m={id:e.id, species:e.sp, x:e.x, y:e.y, homeX:e.hx, homeY:e.hy, shiny:e.sh, friendship:e.fr, following:e.fo, questOnly:e.qo, wobble:0}; list.push(m); if(m.friendship>0) addFriend(m.species); else addSeen(m.species); }); }
  function setDex(d){ dex=d||dex; }
  return { reset:reset, spawn:spawn, despawn:despawn, all:all, at:at, update:update, interact:interact,
    scanHabitats:scanHabitats, countSpecies:countSpecies, pokedex:pokedex, addSeen:addSeen, addFriend:addFriend,
    dexCount:dexCount, friendsCount:friendsCount, serialize:serialize, load:load, setDex:setDex };
})();