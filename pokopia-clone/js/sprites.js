// sprites.js — sprite disegnati proceduralmente su canvas 16×16.
// Palette GBC + modalità GB (4 verdi, derivata per luminanza) + shiny.
// Interfaccia: drawSprite(ctx,id,dx,dy,scale,opts), drawPlayer(...), drawIcon(...), drawTile(...).

// ─────── palette base (nome -> [r,g,b]) ───────
var PAL = {
 outline:[26,26,46], W:[246,246,250],
 grass:[96,200,80], grassD:[42,138,42], leaf:[120,228,96], leafD:[40,120,58],
 dirt:[176,140,88], sand:[226,210,138], wood:[150,96,44], woodL:[196,150,84],
 rock:[150,152,166], rockD:[96,98,114], metal:[176,180,196], metalD:[104,108,124],
 pave:[156,156,170], paveD:[108,108,124],
 water:[72,120,226], sky:[140,186,250], teal:[104,200,196], tealD:[56,154,158],
 pink:[245,140,184], pinkD:[206,92,132], violet:[184,120,216], violetD:[136,72,168],
 yellow:[248,214,52], yellowD:[200,152,24], orange:[248,128,58], orangeD:[200,80,32],
 red:[230,80,64], redD:[180,48,48], fire:[255,150,56], fireD:[248,88,24],
 purple:[140,92,204], purpleD:[92,58,150], ghost:[214,214,232], ghostD:[120,120,160],
 tan:[232,200,150], tanD:[200,152,104], cream:[248,202,216], creamD:[216,156,180],
 green:[80,200,120], greenD:[48,150,90], dragBlue:[170,210,250], dragBlueD:[110,160,210],
 skin:[232,184,148], hair:[60,40,30], shirt:[60,90,150],
};

// shiny: per-specie override di alcuni nomi
var SHINY = {
  pikachu:{yellow:[220,220,230],yellowD:[180,180,200],red:[200,60,200]},
  squirtle:{teal:[200,170,220],tealD:[150,120,180]},
  bulbasaur:{teal:[120,200,210],tealD:[80,150,170]},
  charmander:{orange:[250,220,72],orangeD:[210,170,30],red:[120,200,255],redD:[80,160,220]},
  oddish:{purple:[40,120,200],water:[30,80,140]},
  caterpie:{grassD:[180,150,40],grass:[220,200,80]},
  butterfree:{purple:[80,210,190],purpleD:[40,140,150]},
  pidgey:{tan:[150,120,200],tanD:[110,90,160]},
  farfetchd:{tan:[120,200,170],tanD:[80,160,130]},
  geodude:{rock:[200,150,80],rockD:[150,110,50]},
  diglett:{dirt:[120,200,160],grasstd:[80,150,130]},
  meowth:{red:[230,180,40],yellowD:[200,150,20]},
  jigglypuff:{cream:[170,210,255],creamD:[120,170,230]},
  psyduck:{yellow:[200,230,255],yellowD:[150,190,230]},
  magikarp:{red:[200,120,255],redD:[150,80,200],orange:[250,210,80]},
  gastly:{purple:[40,200,120],purpleD:[20,130,70],ghost:[200,255,220]},
  snorlax:{teal:[180,160,200],tealD:[140,120,160]},
  dratini:{dragBlue:[230,180,220],dragBlueD:[200,140,170]},
  mew:{pink:[230,230,255],pinkD:[180,180,230]},
};

// palette GB:Bucket per luminanza in 4 toni di verde
var _gbGreen=[[15,56,15],[48,98,48],[139,172,15],[155,188,15]];
function toGB(pal){
  var o={W:[228,228,228],outline:[15,56,15]};
  for(var k in pal){ var v=pal[k]; var L=(v[0]*299+v[1]*587+v[2]*114)/1000;
    var idx=L<60?0:L<125?1:L<195?2:3; o[k]=_gbGreen[idx]; }
  return o;
}

// ─────── cache 16×16 ───────
var _cache={};
function build(id, pal){
  var cv=document.createElement('canvas'); cv.width=16;cv.height=16;
  var c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  var fn=SPRITE_DRAW[id];
  if(!fn){ c.fillStyle='#f0f'; c.fillRect(0,0,16,16); }
  else fn(c, pal);
  return cv;
}
function resolvePal(opts){
  opts=opts||{};
  var p=PAL;
  var pal={}; for(var k in p) pal[k]=p[k];
  if(opts.shiny && SHINY[opts.id]){ var s=SHINY[opts.id]; for(var k in s) pal[k]=s[k]; }
  if(opts.override){ for(var k in opts.override) pal[k]=opts.override[k]; }
  if(opts.gb){ pal=toGB(pal); }
  return pal;
}
function drawSprite(ctx, id, dx, dy, scale, opts){
  opts=opts||{}; opts.id=id;
  var key=id+'|'+(opts.gb?'g':'c')+'|'+(opts.shiny?'s':'')+'|'+JSON.stringify(opts.override||{});
  var cv=_cache[key]; if(!cv){ opts.id=id; cv=build(id, resolvePal(opts)); _cache[key]=cv; }
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cv,0,0,16,16, Math.round(dx),Math.round(dy),16*scale,16*scale);
}
function drawPlayer(ctx, dx, dy, scale, opts){
  opts=opts||{};
  var id=opts.moving?'player_walk':'player_idle';
  if(!opts.override){
    opts.override={skin:opts.skin||PAL.skin, hair:opts.hair||PAL.hair, shirt:opts.shirt||PAL.shirt};
  }
  opts.id=id; opts.shiny=false;
  drawSprite(ctx,id,dx,dy,scale,opts);
}

// ─────── helper di disegno ───────
function C(p,n){ var v=p[n]||p.W; return 'rgb('+Math.round(v[0])+','+Math.round(v[1])+','+Math.round(v[2])+')'; }
function px(c,x,y,w,h,color){ c.fillStyle=color; c.fillRect(x,y,w,h); }
function ell(c,cx,cy,rx,ry,color){ c.fillStyle=color;
  c.beginPath(); c.ellipse(cx,cy,Math.max(0.5,rx),Math.max(0.5,ry),0,0,Math.PI*2); c.fill(); }
function line(c,x1,y1,x2,y2,w,color){ c.strokeStyle=color; c.lineWidth=w; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); }
function eyes(c,cx,cy,s,pupil){ // due occhi semplici
  px(c,cx-3,cy-1,2,2,pupil); px(c,cx+1,cy-1,2,2,pupil);
  px(c,cx-3,cy-1,1,1,C(PAL||(pupil?PAL:PAL),'W')); // highlight handled? skip
}
function bigEyes(c,cx,cy,pupil){ // occhi tipo Jigglypuff
  px(c,cx-4,cy-2,3,4,pupil); px(c,cx+1,cy-2,3,4,pupil);
  // highlight bianco
}

// ─────── routine per sprite ───────
var SPRITE_DRAW={};

// PLAYER (Ditto in forma umana)
function drawPlayer_(c,p){ var o=C(p,'outline'), s=C(p,'skin'), h=C(p,'hair'), sh=C(p,'shirt');
  // capelli
  px(c,4,1,8,1,h); px(c,3,2,10,2,h); px(c,3,4,10,1,h);
  // viso
  px(c,4,4,8,4,s); px(c,4,4,2,2,h); px(c,10,4,2,2,h); // basette
  // occhi (Ditto: occhi a puntino neri semplici)
  px(c,6,6,1,2,o); px(c,9,6,1,2,o);
  // corpo maglietta
  px(c,4,8,8,5,sh); px(c,4,8,8,1,o);
  // braccia
  px(c,2,9,2,3,s); px(c,12,9,2,3,s);
  // gambe
  px(c,5,13,2,3,s); px(c,9,13,2,3,s);
  px(c,4,16,3,0,0,0); // bordo
}
SPRITE_DRAW.player_idle=function(c,p){ drawPlayer_(c,p); };
SPRITE_DRAW.player_walk=function(c,p){ drawPlayer_(c,p);
  // solleva una gamba
  var s=C(p,'skin'); px(c,9,13,2,3,C(p,'outline')); px(c,8,12,2,2,s); // gamba alzata
};

// === POKéMON ===
SPRITE_DRAW.squirtle=function(c,p){ var o=C(p,'outline'),u=C(p,'teal'),U=C(p,'tealD'),br=C(p,'dirt'),brD=C(p,'wood');
  ell(c,8,7,6,5,u); // testa
  px(c,3,6,3,2,u); px(c,11,6,3,2,u); // braccia
  // guscio
  ell(c,8,12,7,4,brD); ell(c,8,12,6,3,br);
  px(c,4,10,8,1,o);
  // occhi
  px(c,6,5,1,2,o); px(c,9,5,1,2,o);
  px(c,7,7,2,1,u);
};
SPRITE_DRAW.bulbasaur=function(c,p){ var o=C(p,'outline'),u=C(p,'teal'),U=C(p,'tealD'),bulb=C(p,'leaf'),bulbD=C(p,'grassD'),sp=C(p,'grass');
  ell(c,8,11,7,4,u); // corpo
  ell(c,8,6,4,3,bulbD); ell(c,8,6,3,2,bulb); // bulbo
  // zampe
  px(c,3,14,2,2,u); px(c,11,14,2,2,u);
  // macchie
  ell(c,6,11,2,1,bulb); ell(c,11,12,2,1,bulb);
  // occhi
  px(c,6,12,1,2,o); px(c,10,12,1,2,o);
  // orecchie
  px(c,4,9,1,2,u); px(c,12,9,1,2,u);
};
SPRITE_DRAW.charmander=function(c,p){ var o=C(p,'outline'),m=C(p,'orange'),M=C(p,'orangeD'),f=C(p,'fire'),F=C(p,'fireD'),y=C(p,'yellow'),W=C(p,'W');
  ell(c,8,7,5,4,m); // testa
  px(c,3,7,2,2,m); px(c,12,7,2,2,m); // orecchie
  // occhi
  px(c,6,6,1,2,o); px(c,10,6,1,2,o);
  px(c,6,9,4,1,o); // bocca
  // corpo
  ell(c,8,12,5,3,m);
  px(c,4,12,2,2,m); px(c,11,12,2,2,m); // braccia
  px(c,5,15,2,1,m); px(c,9,15,2,1,m); // zampe
  // pancia chiara
  ell(c,8,12,2,1,y);
  // fiamma sulla coda
  px(c,13,3,1,2,f); px(c,12,2,1,1,f); px(c,13,1,1,1,F); px(c,14,4,2,1,f);
  // coda
  line(c,11,8,13,6,1,m);
};
SPRITE_DRAW.oddish=function(c,p){ var o=C(p,'outline'),pp=C(p,'purple'),P=C(p,'purpleD'),g=C(p,'grass'),gD=C(p,'grassD');
  // foglie
  px(c,5,1,2,2,gD); px(c,9,1,2,2,gD); px(c,7,0,2,3,g);
  ell(c,8,11,5,5,pp); // corpo radice
  // occhi (chiusi/sereni)
  px(c,5,10,2,1,o); px(c,9,10,2,1,o);
  px(c,6,12,4,1,P); // bocca
  // piedini
  px(c,3,15,2,1,pp); px(c,11,15,2,1,pp); px(c,6,15,2,1,pp); px(c,9,15,2,1,pp);
};
SPRITE_DRAW.caterpie=function(c,p){ var o=C(p,'outline'),g=C(p,'grass'),gD=C(p,'grassD'),y=C(p,'yellow'),W=C(p,'W');
  // antenne
  px(c,3,0,1,2,g); px(c,13,0,1,2,g); px(c,2,2,2,1,g); px(c,13,2,2,1,g);
  // corpo segmentato
  ell(c,8,5,5,2,gD); ell(c,8,9,5,2,g); ell(c,8,13,4,2,gD);
  // occhi
  px(c,7,4,1,1,o); px(c,10,4,1,1,o);
  // anello giallo
  px(c,5,6,6,1,y);
};
SPRITE_DRAW.butterfree=function(c,p){ var o=C(p,'outline'),pp=C(p,'purple'),P=C(p,'purpleD'),W=C(p,'W'),b=C(p,'water');
  // ali
  ell(c,4,6,4,5,P); ell(c,12,6,4,5,P);
  ell(c,4,6,3,3,pp); ell(c,12,6,3,3,pp);
  px(c,2,7,5,1,W); px(c,10,7,5,1,W);
  // corpo
  ell(c,8,9,2,4,b);
  // occhi
  px(c,7,8,1,1,o); px(c,9,8,1,1,o);
};
SPRITE_DRAW.pidgey=function(c,p){ var o=C(p,'outline'),n=C(p,'tan'),N=C(p,'tanD'),W=C(p,'W'),y=C(p,'yellow');
  // testa
  ell(c,6,6,3,3,n);
  // becco giallo
  px(c,8,7,2,1,y); px(c,9,6,1,1,y);
  // occhi
  px(c,6,5,1,1,o);
  // corpo
  ell(c,7,11,4,4,N); ell(c,7,11,3,3,n);
  // ali
  ell(c,4,11,3,2,N); ell(c,10,11,3,2,N);
  // zampe gialle
  px(c,6,15,1,1,y); px(c,8,15,1,1,y);
};
SPRITE_DRAW.farfetchd=function(c,p){ var o=C(p,'outline'),n=C(p,'tan'),N=C(p,'tanD'),g=C(p,'grass'),gD=C(p,'grassD'),y=C(p,'yellow');
  // porro/spada
  px(c,2,4,1,8,gD); px(c,1,4,2,2,g);
  // corpo papera
  ell(c,8,9,4,5,n);
  // testa
  ell(c,9,5,3,3,n);
  // becco
  px(c,12,5,2,1,y);
  px(c,9,4,1,1,o); // occhio
  // ala
  ell(c,7,11,3,2,N);
  // zampe
  px(c,6,15,1,1,y); px(c,9,15,1,1,y);
};
SPRITE_DRAW.geodude=function(c,p){ var o=C(p,'outline'),r=C(p,'rock'),R=C(p,'rockD'),W=C(p,'W');
  // corpo sasso
  ell(c,8,9,7,6,R); ell(c,8,9,6,5,r);
  // braccia
  ell(c,2,12,2,1,r); ell(c,14,12,2,1,r);
  // occhi
  px(c,6,7,2,2,W); px(c,10,7,2,2,W); px(c,6,7,1,1,o); px(c,10,7,1,1,o);
  // bocca
  px(c,7,11,3,1,o);
  // basamento
  px(c,3,15,7,1,R);
};
SPRITE_DRAW.diglett=function(c,p){ var o=C(p,'outline'),d=C(p,'dirt'),dD=C(p,'wood'),br=C(p,'tan'),pk=C(p,'pink');
  // testa
  ell(c,8,7,6,4,br);
  // naso rosa
  px(c,7,8,2,1,pk);
  // occhi
  px(c,5,5,1,2,o); px(c,10,5,1,2,o);
  // terra ai lati
  px(c,2,11,12,2,dD); px(c,1,11,14,1,d);
  px(c,3,13,10,3,dD);
  px(c,2,12,2,2,d); px(c,12,12,2,2,d);
};
SPRITE_DRAW.pikachu=function(c,p){ var o=C(p,'outline'),y=C(p,'yellow'),Y=C(p,'yellowD'),r=C(p,'red'),W=C(p,'W');
  // orecchie lunghe
  px(c,2,0,1,4,Y); px(c,2,0,1,2,y); px(c,13,0,1,4,Y); px(c,13,0,1,2,y);
  // testa
  ell(c,8,6,5,4,y);
  // guance rosse
  px(c,3,7,2,1,r); px(c,12,7,2,1,r);
  // occhi
  px(c,6,5,1,2,o); px(c,10,5,1,2,o); px(c,6,5,1,1,W); px(c,10,5,1,1,W);
  // bocca
  px(c,7,8,2,1,o);
  // corpo
  ell(c,8,12,4,3,y);
  // zampe
  px(c,4,15,2,1,y); px(c,11,15,2,1,y);
  // coda a saetta
  line(c,13,10,15,7,1,Y); line(c,15,7,13,5,1,Y); line(c,13,5,15,3,1,Y);
  // sguardo triste (Peakychu): sopracciglio giù
  line(c,5,4,7,4,1,o); line(c,10,4,12,4,1,o);
};
SPRITE_DRAW.meowth=function(c,p){ var o=C(p,'outline'),n=C(p,'tan'),N=C(p,'tanD'),r=C(p,'red'),y=C(p,'yellow'),W=C(p,'W');
  // orecchie
  px(c,4,2,2,2,n); px(c,11,2,2,2,n); px(c,5,2,1,1,W);
  // testa
  ell(c,8,6,4,3,n);
  // moneta in fronte
  ell(c,8,5,2,1,y);
  px(c,7,7,1,1,o); px(c,10,7,1,1,o); // occhi
  px(c,8,9,1,1,r); // bocca
  // corpo
  ell(c,8,12,4,3,n);
  // coda
  px(c,13,10,1,4,y);
  // zampe
  px(c,5,15,2,1,n); px(c,10,15,2,1,n);
};
SPRITE_DRAW.jigglypuff=function(c,p){ var o=C(p,'outline'),pk=C(p,'cream'),P=C(p,'creamD'),W=C(p,'W'),b=C(p,'water');
  // corpo trustees
  ell(c,8,9,7,7,pk);
  // occhi grandi
  px(c,5,7,3,4,b); px(c,10,7,3,4,b); px(c,5,7,1,1,W); px(c,10,7,1,1,W); px(c,6,9,1,1,o); px(c,11,9,1,1,o);
  // bocca
  px(c,7,12,3,1,o);
  // orecchie
  px(c,3,4,1,2,P); px(c,13,4,1,2,P);
  // ricciolo
  px(c,8,2,1,1,pk); px(c,7,3,2,1,P);
  // piedini
  px(c,4,15,2,1,P); px(c,11,15,2,1,P);
};
SPRITE_DRAW.psyduck=function(c,p){ var o=C(p,'outline'),y=C(p,'yellow'),Y=C(p,'yellowD'),W=C(p,'W');
  // testa
  ell(c,8,6,4,3,y);
  // becco
  px(c,7,7,2,2,Y);
  // occhi confusi
  px(c,6,5,1,1,o); px(c,10,5,1,1,o);
  // corpo
  ell(c,8,12,4,3,y);
  // zampe
  px(c,5,15,2,1,Y); px(c,10,15,2,1,Y);
  // ala
  px(c,11,11,1,2,Y);
  // codina
  px(c,3,11,1,2,y);
};
SPRITE_DRAW.magikarp=function(c,p){ var o=C(p,'outline'),r=C(p,'red'),R=C(p,'redD'),W=C(p,'W'),y=C(p,'yellow'),m=C(p,'orange');
  // corpo pesce
  ell(c,7,8,6,4,r);
  // pancia chiara
  ell(c,7,9,4,2,m);
  // pinna dorsale
  px(c,5,3,4,1,R); px(c,6,4,3,1,r);
  // coda
  line(c,13,8,16,5,1,r); line(c,13,8,16,11,1,r); px(c,14,7,2,4,R);
  // occhio grosso
  px(c,3,7,2,2,W); px(c,3,7,1,1,o);
  // baffo labbra
  px(c,1,9,2,1,r);
  // scaglie
  px(c,7,7,1,1,R); px(c,9,9,1,1,R);
};
SPRITE_DRAW.gastly=function(c,p){ var o=C(p,'outline'),pp=C(p,'purple'),P=C(p,'purpleD'),g=C(p,'ghost'),W=C(p,'W');
  // nuvola gas
  ell(c,5,7,3,3,P); ell(c,9,7,3,3,P); ell(c,8,6,6,4,pp); ell(c,8,9,7,4,pp);
  ell(c,8,8,6,4,g);
  // occhi
  px(c,5,7,2,2,W); px(c,9,7,2,2,W); px(c,5,7,1,1,o); px(c,9,7,1,1,o);
  // zanne
  px(c,6,11,1,1,W); px(c,9,11,1,1,W);
  // sbuffi
  ell(c,2,12,2,1,g); ell(c,14,12,2,1,g);
};
SPRITE_DRAW.snorlax=function(c,p){ var o=C(p,'outline'),b=C(p,'teal'),B=C(p,'tealD'),m=C(p,'leaf'),W=C(p,'W'),cream=C(p,'tan');
  // corpo grosso dorsuto
  ell(c,8,10,8,6,b);
  // muschio
  ell(c,4,8,2,1,m); ell(c,12,9,2,1,m); ell(c,8,7,3,1,m);
  // faccia chiara
  ell(c,8,8,4,3,cream);
  // occhi chiusi (dorme)
  line(c,6,8,8,8,1,o); line(c,9,8,11,8,1,o);
  // bocca aperta
  px(c,7,10,2,1,o);
  // zampe
  px(c,2,14,3,2,b); px(c,12,14,3,2,b);
  // pollicioni
  ell(c,8,12,2,1,cream);
};
SPRITE_DRAW.dratini=function(c,p){ var o=C(p,'outline'),b=C(p,'dragBlue'),B=C(p,'dragBlueD'),W=C(p,'W');
  // corpo serpentino
  ell(c,8,7,3,5,b);
  // testa
  ell(c,8,4,3,2,b);
  // cornicette
  px(c,6,2,1,1,B); px(c,9,2,1,1,B); px(c,7,1,2,1,B);
  // occhi
  px(c,6,3,1,1,o); px(c,10,3,1,1,W);
  // pancia bianca
  px(c,7,8,2,4,W);
  // coda con pallina
  ell(c,13,12,3,3,B);
  // pinne
  px(c,5,11,1,2,b); px(c,11,11,1,2,b);
};
SPRITE_DRAW.mew=function(c,p){ var o=C(p,'outline'),pk=C(p,'pink'),P=C(p,'pinkD'),W=C(p,'W'),b=C(p,'water');
  // testa
  ell(c,8,5,3,3,pk);
  // orecchie/antenne
  px(c,6,2,1,2,P); px(c,10,2,1,2,P);
  // occhi
  px(c,6,4,1,2,b); px(c,10,4,1,2,b); px(c,6,4,1,1,W); px(c,10,4,1,1,W);
  // corpo
  ell(c,8,9,3,3,pk);
  // braccine
  px(c,4,9,2,2,pk); px(c,11,9,2,2,pk);
  // gambine
  px(c,6,13,2,2,pk); px(c,9,13,2,2,pk);
  // coda lunga
  line(c,11,9,15,13,1,P);
};

// === OGGETTI NATURALI ===
SPRITE_DRAW.tree=function(c,p){ var g=C(p,'grass'),gD=C(p,'grassD'),w=C(p,'wood'),wL=C(p,'woodL');
  // chioma
  ell(c,7,5,6,5,g); ell(c,5,7,4,4,gD); ell(c,10,6,3,3,g);
  // tronco
  px(c,6,10,4,6,w); px(c,6,10,1,6,wL);
};
SPRITE_DRAW.rock=function(c,p){ var r=C(p,'rock'),R=C(p,'rockD');
  ell(c,8,10,7,5,R); ell(c,8,9,6,4,r);
  px(c,5,11,3,1,R); px(c,10,9,2,1,R);
};
SPRITE_DRAW.detrito=function(c,p){ var w=C(p,'wood'),r=C(p,'rock'),R=C(p,'rockD'),q=C(p,'metal');
  px(c,3,9,6,1,w); px(c,7,10,3,1,w); 
  px(c,4,11,1,1,r); px(c,8,11,2,1,R);
  px(c,6,12,2,1,w); px(c,10,12,1,2,q); px(c,7,13,2,1,r);
  px(c,4,13,2,1,q); px(c,9,14,3,1,w);
};
SPRITE_DRAW.cespuglio=function(c,p){ var g=C(p,'grass'),gD=C(p,'grassD');
  ell(c,8,11,6,3,gD); ell(c,7,9,4,3,g); ell(c,10,8,3,3,g);
};
SPRITE_DRAW.bacche=function(c,p){ var g=C(p,'grass'),gD=C(p,'grassD'),r=C(p,'red'),R=C(p,'redD'),W=C(p,'W');
  px(c,6,5,1,1,gD); px(c,9,5,1,1,gD);
  ell(c,6,8,2,2,r); ell(c,9,7,2,2,r); ell(c,7,10,2,2,r);
  px(c,6,8,1,1,W); px(c,9,7,1,1,W);
  px(c,5,10,5,1,gD);
};
SPRITE_DRAW.rottame=function(c,p){ var z=C(p,'metal'),Z=C(p,'metalD'),o=C(p,'outline');
  ell(c,8,9,6,4,Z); ell(c,8,9,5,3,z);
  line(c,5,8,11,10,1,o); line(c,5,11,11,8,1,o);
  px(c,4,12,8,1,Z); px(c,3,12,2,3,z); px(c,12,12,2,3,z);
};

// === OGGETTI PIAZZABILI ===
SPRITE_DRAW.banco=function(c,p){ var w=C(p,'wood'),wL=C(p,'woodL'),o=C(p,'outline'),sh=C(p,'metal');
  px(c,2,4,12,2,w); px(c,2,4,12,1,o);
  px(c,2,6,12,3,wL);
  // gambe
  px(c,2,9,2,5,w); px(c,12,9,2,5,w);
  px(c,4,9,8,2,wL);
  // utensile/lama
  px(c,7,6,2,2,sh);
};
SPRITE_DRAW.falò_off=function(c,p){ var w=C(p,'wood'),wL=C(p,'woodL'),o=C(p,'outline'),sh=C(p,'metal');
  // sassi attorno
  px(c,2,12,3,2,sh); px(c,11,12,3,2,sh);
  // legna spenta
  line(c,3,11,6,9,2,w); line(c,6,9,9,11,2,w); line(c,9,11,12,9,2,wL);
  line(c,5,13,11,13,1,o);
};
SPRITE_DRAW.falò_on=function(c,p){ var w=C(p,'wood'),f=C(p,'fire'),F=C(p,'fireD'),y=C(p,'yellow'),sh=C(p,'metal');
  px(c,2,12,3,2,sh); px(c,11,12,3,2,sh);
  line(c,3,11,6,9,2,w); line(c,6,9,9,11,2,w);
  // fiamme
  ell(c,8,7,3,4,F); ell(c,8,6,2,3,f); ell(c,8,5,1,2,y);
};
SPRITE_DRAW.torcia=function(c,p){ var w=C(p,'wood'),f=C(p,'fire'),F=C(p,'fireD'),y=C(p,'yellow'),o=C(p,'outline');
  ell(c,8,4,2,2,F); ell(c,8,3,1,2,f); px(c,8,2,1,1,y);
  px(c,6,6,4,9,w); line(c,6,6,6,15,1,o);
  px(c,5,15,6,1,w);
};
SPRITE_DRAW.panchina=function(c,p){ var w=C(p,'wood'),wL=C(p,'woodL'),o=C(p,'outline');
  px(c,2,8,12,2,w); px(c,2,10,12,1,wL);
  px(c,3,10,1,4,w); px(c,12,10,1,4,w);
  line(c,2,8,14,8,1,o);
};
SPRITE_DRAW.letto=function(c,p){ var cr=C(p,'cream'),cd=C(p,'creamD'),w=C(p,'wood'),wL=C(p,'woodL'),o=C(p,'outline');
  // coperta
  px(c,2,6,12,4,cr); px(c,2,6,12,1,cd); px(c,2,10,12,1,cd);
  px(c,2,5,12,1,o);
  // cuscino
  ell(c,5,5,2,1,cd);
  // struttura legno
  px(c,1,11,14,2,w); px(c,1,11,1,5,w); px(c,14,11,1,5,w);
  px(c,1,15,14,1,wL);
};
SPRITE_DRAW.aiuola=function(c,p){ var q=C(p,'rock'),Q=C(p,'rockD'),r=C(p,'red'),pk=C(p,'cream'),y=C(p,'yellow'),g=C(p,'grass');
  px(c,2,12,12,3,Q);
  ell(c,4,9,2,1,r); ell(c,8,8,2,1,pk); ell(c,12,9,2,1,y);
  px(c,6,11,1,1,g); px(c,10,11,1,1,g);
  px(c,2,12,12,1,q);
};
SPRITE_DRAW.cespuglio_p=function(c,p){ var g=C(p,'grass'),gD=C(p,'grassD'),r=C(p,'red');
  ell(c,8,11,6,4,gD); ell(c,6,9,4,4,g); ell(c,10,8,3,3,g);
  // bacchina
  px(c,8,9,1,1,r); px(c,11,11,1,1,r);
};
SPRITE_DRAW.vaso=function(c,p){ var q=C(p,'rock'),Q=C(p,'rockD'),g=C(p,'grass'),gD=C(p,'grassD'),y=C(p,'yellow'),r=C(p,'red');
  px(c,3,12,10,3,Q); px(c,3,12,10,1,q);
  ell(c,4,8,1,2,gD); ell(c,6,7,1,2,y); ell(c,8,8,1,2,r); ell(c,10,7,1,2,g);
  px(c,3,12,1,4,Q); px(c,12,12,1,4,Q);
};
SPRITE_DRAW.sacco=function(c,p){ var cr=C(p,'cream'),cd=C(p,'creamD'),o=C(p,'outline'),r=C(p,'red');
  // catena
  px(c,7,2,2,3,o);
  // sacco
  ell(c,8,9,5,5,cr); ell(c,8,9,4,4,cd);
  // cerchio rosso
  ell(c,8,9,2,1,r);
  // cinghia
  line(c,4,5,12,5,1,o);
};
SPRITE_DRAW.stereo=function(c,p){ var z=C(p,'metal'),Z=C(p,'metalD'),r=C(p,'red'),b=C(p,'water'),y=C(p,'yellow'),o=C(p,'outline');
  px(c,3,3,10,11,Z); px(c,3,3,10,1,z);
  // manopole
  ell(c,5,9,1,1,r); ell(c,11,9,1,1,b);
  // display
  px(c,5,5,6,2,Z); px(c,6,5,4,1,y);
  // casse
  ell(c,8,12,3,2,Z); 
  // gambe
  px(c,3,14,2,1,o); px(c,11,14,2,1,o);
};
SPRITE_DRAW.statua=function(c,p){ var q=C(p,'rock'),Q=C(p,'rockD'),W=C(p,'W'),b=C(p,'water');
  // base
  px(c,2,15,12,1,Q);
  // figura
  ell(c,8,5,3,4,q); ell(c,8,10,3,5,q);
  px(c,8,12,1,3,Q);
  // brillio
  px(c,5,3,1,1,W); px(c,11,4,1,1,b);
};
SPRITE_DRAW.altare=function(c,p){ var q=C(p,'rock'),Q=C(p,'rockD'),pp=C(p,'purple'),W=C(p,'W'),o=C(p,'outline');
  // fiamma mistica
  ell(c,8,3,1,2,pp); 
  // colonna
  px(c,5,5,6,8,q); px(c,4,5,2,8,Q); px(c,10,5,2,8,Q);
  // base ampia
  px(c,2,13,12,2,Q); px(c,2,13,12,1,q);
  // simbolo
  px(c,7,7,2,2,W); line(c,7,9,9,9,1,o);
};
SPRITE_DRAW.flauto=function(c,p){ var y=C(p,'yellow'),Y=C(p,'yellowD'),o=C(p,'outline'),r=C(p,'red');
  // corpo flauto
  line(c,2,8,14,8,2,y); line(c,2,9,14,9,1,Y);
  // fori
  px(c,5,8,1,1,o); px(c,8,8,1,1,o); px(c,11,8,1,1,o);
  // bocchino
  px(c,13,7,2,1,Y);
  // nastro rosso
  px(c,7,10,1,2,r);
};
SPRITE_DRAW.generatore=function(c,p){ var z=C(p,'metal'),Z=C(p,'metalD'),y=C(p,'yellow'),r=C(p,'red'),b=C(p,'water'),o=C(p,'outline');
  px(c,3,3,10,11,Z); px(c,3,3,10,1,z);
  // maniglia
  px(c,5,5,1,3,y);
  // spie
  px(c,8,5,1,1,r); px(c,10,5,1,1,b);
  // display
  px(c,7,8,4,2,Z); px(c,8,8,2,1,y);
  // gambe
  px(c,3,14,2,2,z); px(c,11,14,2,2,z);
  line(c,3,3,13,3,1,o);
};

// ─────── ICONA RISORSA (procedurale) ───────
function drawIcon(ctx, id, dx, dy, s){
  var map={rametto:'wood',ciottolo:'rock',legno:'wood',pietra:'rock',fibra:'grass',bacca:'red',fiore:'cream',metallo:'metal',caramella:'pink',flauto:'yellow'};
  var n=map[id]||'W'; var col=PAL[n]||PAL.W;
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(dx,dy,s,s);
  ctx.fillStyle='rgb('+col[0]+','+col[1]+','+col[2]+')'; ctx.fillRect(dx+s*0.2,dy+s*0.2,s*0.6,s*0.6);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(dx+s*0.2,dy+s*0.2,s*0.2,s*0.2);
}

// ─────── TASSelli TERRENO (procedurali, con luce) ───────
var _tn={};
function _n(x,y){ var k=x+'_'+y; if(_tn[k]===undefined){ _tn[k]=Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5)%1; } return _tn[k]; }
var TILE_COL={0:[96,200,80],1:[64,176,64],2:[176,140,88],3:[206,184,140],4:[72,120,226],5:[226,210,138],6:[156,156,170],7:[80,168,84],8:[150,152,166],9:[80,80,96],10:[48,50,64],11:[180,224,120]};
function drawTile(ctx, tile, tx, ty, dx, dy, scale, frame, light){
  light=light===undefined?1:light;
  var c=TILE_COL[tile]||[120,120,120];
  ctx.fillStyle='rgb('+Math.round(c[0]*light)+','+Math.round(c[1]*light)+','+Math.round(c[2]*light)+')';
  ctx.fillRect(dx,dy,scale,scale);
  if(tile===0||tile===7||tile===1){
    ctx.fillStyle='rgba(30,'+(tile===7?90:120)+',20,0.45)';
    for(var i=0;i<3;i++){ var nx=dx+(_n(tx+i,ty*3+i)*scale), ny=dy+(_n(ty,tx+i)*scale); ctx.fillRect(nx,ny,2,2); }
  } else if(tile===4){
    ctx.fillStyle='rgba(160,200,255,'+(0.25+0.1*Math.sin(frame*0.06+tx+ty))+')';
    ctx.fillRect(dx, dy+(Math.sin(frame*0.06+tx)>0?2:scale-4), scale, 2);
  } else if(tile===6){
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(dx,dy+scale*0.45,scale,1); ctx.fillRect(dx+scale*0.5,dy,1,scale*0.45);
  } else if(tile===8||tile===10){
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(dx,dy+scale-3,scale,3); ctx.fillRect(dx+scale-3,dy,3,scale);
  } else if(tile===11){
    ctx.fillStyle='rgba(255,160,190,0.85)'; ctx.fillRect(dx+scale*0.35,dy+scale*0.35,3,3);
  } else if(tile===5){
    ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fillRect(dx,dy+scale-2,scale,2);
  }
}