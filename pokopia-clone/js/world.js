// world.js — mappa procedurale (seed), oggetti piazzati, scanner habitat.
var WORLD = (function(){
  var W=80, H=80;            // dimensioni mappa in tile
  var tiles;                 // Uint8Array(W*H)
  var objects;               // Map "x,y" -> {type, x, y, state}
  var placed;                // oggetti piazzati dal giocatore (per habitat scan) — array
  var seed;
  var specials;              // punti speciali scriptati: tangrowth, squirtle, snorlax, caveEntrance, etc.

  // RNG mulberry32 deterministico per seed
  function rng(s){ return function(){ s|=0; s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  function idx(x,y){ return y*W+x; }
  function inB(x,y){ return x>=0&&y>=0&&x<W&&y<H; }
  function getTile(x,y){ if(!inB(x,y)) return TILE.CAVEWALL; return tiles[idx(x,y)]; }
  function setTile(x,y,t){ if(inB(x,y)) tiles[idx(x,y)]=t; }

  function gen(newSeed){
    seed=newSeed||((Math.random()*1e9)|0);
    var rnd=rng(seed);
    tiles=new Uint8Array(W*H);
    objects={};
    placed=[];
    specials={};
    for(var y=0;y<H;y++) for(var x=0;x<W;x++){
      var t=TILE.GRASS;
      var n=rnd();
      if(n>0.86) t=TILE.TGRASS; else if(n>0.80) t=TILE.DARKGRASS;
      tiles[idx(x,y)]=t;
    }
    // stagno prosciugato al centro-ovest (terreno DIRT/anciato)
    var cx=18, cy=42;
    for(y=cy-5;y<cy+5;y++)for(var x2=cx-6;x2<cx+6;x2++){ if(inB(x2,y)){ var d=Math.hypot(x2-cx,y-cy); if(d<5+rnd()*2) tiles[idx(x2,y)]=TILE.DIRT; } }
    // rovine di città a sud-est: pavimento e muri
    for(y=58;y<72;y++)for(var x3=50;x3<72;x3++){ if(rnd()<0.55) tiles[idx(x3,y)]=TILE.PAVE; }
    // zona rocciosa/montagna a nord (dietro Mosslax)
    for(y=8;y<20;y++)for(var x4=33;x4<48;x4++){ if(rnd()<0.7) tiles[idx(x4,y)]=TILE.ROCK; }
    // bordi mappa: rocce
    for(var i=0;i<W;i++){ tiles[idx(i,0)]=TILE.ROCK; tiles[idx(i,H-1)]=TILE.ROCK; setTileIfGrass(i,1,TILE.ROCK); }
    for(var j=0;j<H;j++){ tiles[idx(0,j)]=TILE.ROCK; tiles[idx(W-1,j)]=TILE.ROCK; }
    // alberi sparsi (oggetti naturali)
    var treeCount=60;
    for(var k=0;k<treeCount;k++){ var tx=2+((rnd()*W-4)|0), ty=2+((rnd()*H-4)|0); if(getTile(tx,ty)===TILE.GRASS||getTile(tx,ty)===TILE.TGRASS) setObj(tx,ty,'albero'); }
    // rocce sparse
    for(k=0;k<30;k++){ tx=2+((rnd()*W-4)|0), ty=2+((rnd()*H-4)|0); if(getTile(tx,ty)===TILE.GRASS) setObj(tx,ty,'roccia'); }
    // detriti (raccolta base)
    for(k=0;k<55;k++){ tx=2+((rnd()*W-4)|0), ty=2+((rnd()*H-4)|0); if(getTile(tx,ty)===TILE.GRASS||getTile(tx,ty)===TILE.DIRT) setObj(tx,ty,'detrito'); }
    // cespugli naturali e bacche
    for(k=0;k<25;k++){ tx=2+((rnd()*W-4)|0), ty=2+((rnd()*H-4)|0); if(getTile(tx,ty)===TILE.GRASS) setObj(tx,ty, rnd()<0.5?'cespuglio':'spruzzabacche'); }
    // rottami metallici nelle rovine
    for(k=0;k<18;k++){ tx=52+((rnd()*18)|0), ty=58+((rnd()*12)|0); if(getTile(tx,ty)===TILE.PAVE) setObj(tx,ty,'rovina_metallo'); }
    // path centrale dal punto di partenza
    for(var x5=10;x5<16;x5++) tiles[idx(x5,14)]=TILE.PATH;
    // fiori sparsi (tile FLOWER su erba)
    for(k=0;k<40;k++){ tx=2+((rnd()*W-4)|0), ty=2+((rnd()*H-4)|0); if(getTile(tx,ty)===TILE.GRASS) tiles[idx(tx,ty)]=TILE.FLOWER; }

    // ===== punti speciali =====
    specials.start={x:12,y:14};                       // punto di partenza giocatore
    specials.tangrowth={x:14,y:14};                  // professor
    specials.squirtle={x:20,y:42};                    // squirtle disidratato
    // piantine secche da innaffiare (evento q4): marker attraverso uno stato "dry sprout"
    specials.sprouts=[{x:16,y:16},{x:22,y:15},{x:18,y:13}];
    // mosslax che blocca la grotta a nord
    specials.snorlax={x:40,y:20};
    specials.caveEntrance={x:40,y:18};
    // grotta: area 10x10 di cavefloor con qualche dratini (spawn scriptato) — oltre snorlax
    for(y=10;y<18;y++)for(var x6=36;x6<46;x6++){ tiles[idx(x6,y)]= (y<11||y>16||x6<37||x6>45)?TILE.CAVEWALL:TILE.CAVEFLOOR; }
    // generator nelle rovine
    specials.generator={x:60,y:64};
    setObj(60,64,'generatore',{broken:true});
    // cartelli
    setObj(52,58,'sign');   // rovine
    setObj(38,22,'sign');   // grotta bloccata
  }
  function setTileIfGrass(x,y,t){ if(getTile(x,y)===TILE.GRASS||getTile(x,y)===TILE.TGRASS) setTile(x,y,t); }
  function setObj(x,y,type,state){ objects[x+','+y]={type:type,x:x,y:y,state:state||{}}; }
  function objAt(x,y){ return objects[x+','+y]||null; }
  function removeObj(x,y){ var o=objAt(x,y); if(!o)return null; delete objects[x+','+y]; return o; }

  // camminabilità considerando oggetti
  function walkable(x,y){ if(!inB(x,y)) return false; var t=getTile(x,y); if(!TILE_WALK[t]) return false; var o=objAt(x,y); if(o){ var def=ITEMS[o.type]; if(def && (def.kind==='natural') && def.block) return false; if(o.type==='albero'||o.type==='roccia'||o.type==='generatore'||o.type==='sign'||o.type==='snorlax'||o.type==='altare') return false; } return true; }

  // ─── piazzamento oggetti (giocatore) ───
  function placeItem(x,y,type){ var o=objAt(x,y); if(o) return false; var t=getTile(x,y); if(!TILE_WALK[t]) return false; setObj(x,y,type); placed.push({x:x,y:y,type:type,state:{}}); return true; }
  function removePlaced(x,y){ var o=removeObj(x,y); if(!o)return null; for(var i=0;i<placed.length;i++){ if(placed[i].x===x && placed[i].y===y){ placed.splice(i,1); break; } } return o; }

  // ─── scanner habitat ───
  // conta quante celle nel raggio r soddisfano category
  function countCat(cx,cy,cat,r){
    var n=0;
    for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){ var x=cx+dx,y=cy+dy; if(!inB(x,y))continue;
      if(cat==='water'||cat==='ruin'||cat==='rock'||cat==='grass'||cat==='cave'){ if(TILE_CAT[getTile(x,y)]===cat) n++; }
      else if(cat==='tree'){ if(objAt(x,y)&&objAt(x,y).type==='albero') n++; }
      else { var o=objAt(x,y); if(o && o.type===cat) n++; }
    }
    return n;
  }
  // valuta una regola habitat nel mondo attuale; ritorna true se soddisfatta
  function ruleOk(rule,cx,cy,ctx){
    if(rule.req){ for(var i=0;i<rule.req.length;i++){ var c=rule.req[i]; var n=countCat(cx,cy,c.k,c.r); if(n<c.count) return false; } }
    return true;
  }

  function getPlaced(){ return placed; }
  function getSpecials(){ return specials; }
  function size(){ return {w:W,h:H}; }
  function allObjects(){ return objects; }
  function getSeed(){ return seed; }

  // ─── serializzazione (delta su tile + lista oggetti) ───
  function serialize(){
    var objArr=[]; for(var k in objects){ var o=objects[k]; objArr.push([o.type,o.x,o.y,o.state||{}]); }
    var sp={}; for(var s in specials) sp[s]=specials[s];
    return {seed:seed, objects:objArr, specials:sp};
  }
  function load(data){
    gen(data.seed);
    objects={}; placed=[];
    (data.objects||[]).forEach(function(e){ var type=e[0],x=e[1],y=e[2],st=e[3]||{}; setObj(x,y,type,st);
      var def=ITEMS[type]; if(def && def.kind==='place') placed.push({x:x,y:y,type:type,state:st}); });
    if(data.specials) specials=data.specials;
  }
  function setSpecial(k,v){ specials[k]=v; }

  return { gen:gen, getTile:getTile, setTile:setTile, walkable:walkable, size:size,
    objAt:objAt, setObj:setObj, removeObj:removeObj, placeItem:placeItem, removePlaced:removePlaced,
    countCat:countCat, ruleOk:ruleOk, getPlaced:getPlaced, getSpecials:getSpecials, setSpecial:setSpecial,
    serialize:serialize, load:load, allObjects:allObjects, idx:idx };
})();