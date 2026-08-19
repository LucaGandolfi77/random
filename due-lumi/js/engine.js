/* I DUE LUMI — motore: canvas, loop, scene, camera, helper di disegno */
const VW = 240, VH = 160;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VW; canvas.height = VH;

function fitCanvas(){
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  canvas.style.width = Math.floor(VW * s) + 'px';
  canvas.style.height = Math.floor(VH * s) + 'px';
  if(typeof TXT !== 'undefined' && TXT.setScale) TXT.setScale(s);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

G.scenes = {};
G.scene = null;
G.time = 0;
G.frame = 0;
G.cam = { x: 0, y: 0 };
G.fade = { a: 0, target: 0, dur: 0, fn: null, t: 0, done: false };

function setScene(name, opts){
  const sc = G.scenes[name];
  if(!sc){ console.error('scene mancante:', name); return; }
  G.scene = sc;
  G.sceneName = name;
  if(typeof TXT !== 'undefined' && TXT.hideAll) TXT.hideAll();
  if(sc.enter) sc.enter(opts);
}

function fadeTo(a, dur, fn){
  const from = (G.fade.dur > 0 && !G.fade.done) ? G.fade.a : (a ? 0 : 1);
  G.fade = { a: from, target: a, dur: dur || 0.5, fn: fn || null, t: 0, done: false };
}

/* ---- helper di disegno ---- */
function drawSprite(name, x, y){
  const s = SPR[name];
  if(!s) return;
  ctx.drawImage(s, Math.round(x - G.cam.x), Math.round(y - G.cam.y));
}
function drawSpriteFixed(name, x, y){
  const s = SPR[name];
  if(!s) return;
  ctx.drawImage(s, Math.round(x), Math.round(y));
}
function px(x, y, w, h, c){
  ctx.fillStyle = typeof c === 'function' ? c() : hex(c);
  ctx.fillRect(Math.round(x - G.cam.x), Math.round(y - G.cam.y), Math.round(w), Math.round(h));
}
function pxF(x, y, w, h, c){
  ctx.fillStyle = hex(c);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function boxF(x, y, w, h, fill, border){
  pxF(x, y, w, h, fill || 'cream');
  if(border){
    pxF(x, y, w, 1, border); pxF(x, y + h - 1, w, 1, border);
    pxF(x, y, 1, h, border); pxF(x + w - 1, y, 1, h, border);
  }
}
function drawLine(x0, y0, x1, y1, c){
  ctx.strokeStyle = hex(c);
  ctx.beginPath();
  ctx.moveTo(Math.round(x0 - G.cam.x), Math.round(y0 - G.cam.y));
  ctx.lineTo(Math.round(x1 - G.cam.x), Math.round(y1 - G.cam.y));
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ---- loop principale ---- */
let lastT = 0;
function loop(t){
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;
  G.time += dt;
  G.frame++;
  INPUT.frameBegin();

  const sc = G.scene;
  if(sc && sc.update) sc.update(dt);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0a08';
  ctx.fillRect(0, 0, VW, VH);
  if(sc && sc.draw) sc.draw(ctx);

  /* dissolvenza */
  if(G.fade.dur > 0){
    G.fade.t += dt;
    const k = Math.min(1, G.fade.t / G.fade.dur);
    const val = G.fade.a + (G.fade.target - G.fade.a) * k;
    ctx.globalAlpha = Math.max(0, Math.min(1, val));
    ctx.fillStyle = '#170f0a';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
    if(k >= 1 && !G.fade.done){
      G.fade.done = true;
      const fn = G.fade.fn;
      G.fade.dur = 0;
      if(fn) fn();
    }
  }

  /* snapshot input a fine frame: i press devono valere per il frame in cui avvengono */
  INPUT.frameEnd();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

/* esposizione globale per debug */
G.VW = VW; G.VH = VH;