/* RENDER3D — mini-motore 3D su Canvas 2D: proiezione prospettica, ground pass,
   painter sort, camera orbit. Zero librerie. La stanza è una "dollhouse". */
'use strict';

const R3D = (() => {
  let canvas = null, ctx = null;
  let W = 0, H = 0;
  let scene = null;
  let quads = [];      // pareti, mobili (sortati)
  let ground = [];     // pavimento, tappeti, prato (sempre in fondo)
  let cam = { pitch: 1.0, dist: 16, tx: 4, ty: 1.1, tz: 3 };
  let Wf = 7, Df = 6;
  let baseYaw = 0, swayT = 0;
  let camX = 0, camY = 0, camZ = 0, FX = 0, FY = 0, FZ = 0, RX = 1, RY = 0, RZ = 0, UX = 0, UY = 1, UZ = 0;
  let dragging = false, px = -1, py = -1, dragYaw = 0;

  const LIGHT = [0.45, 0.85, 0.35];

  function hexRgb(h){ h = String(h).replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  function shade(h, f){
    const c = hexRgb(h);
    return 'rgb(' + Math.max(0, Math.min(255, Math.round(c[0]*f))) + ',' +
      Math.max(0, Math.min(255, Math.round(c[1]*f))) + ',' +
      Math.max(0, Math.min(255, Math.round(c[2]*f))) + ')';
  }
  function lightF(n){ return 0.76 + 0.24 * Math.max(0, n[0]*LIGHT[0] + n[1]*LIGHT[1] + n[2]*LIGHT[2]); }

  /* ---- math ---- */
  function sub(a, b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
  function dot(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function cross(a, b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function norm(a){ const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }

  function addQuad(pts, color, opts){
    const o = opts || {};
    const p1 = sub(pts[1], pts[0]), p2 = sub(pts[2], pts[0]);
    const q = { pts, color, cull: o.cull || 'none', bias: o.bias || 0, normal: norm(cross(p1, p2)) };
    if (o.ground) ground.push(q); else quads.push(q);
  }

  /* scatola solida con base a y0 */
  function boxAt(x, z, w, d, h, color, opts){
    const o = opts || {};
    const y0 = o.y0 || 0, y1 = y0 + h;
    const x0 = x - w/2, x1 = x + w/2, z0 = z - d/2, z1 = z + d/2;
    const c = o.color2 || color;
    addQuad([[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]], shade(c, lightF([0,1,0]) * (o.topF != null ? o.topF : 1.0)), { cull:'solid' });
    addQuad([[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1]], shade(color, lightF([0,0,1]) * 0.86), { cull:'solid' });
    addQuad([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]], shade(color, lightF([1,0,0]) * 0.70), { cull:'solid' });
  }

  function flatAt(x, z, w, d, color, y){
    addQuad([[x-w/2, (y||0.02), z-d/2],[x-w/2, (y||0.02), z+d/2],[x+w/2, (y||0.02), z+d/2],[x+w/2, (y||0.02), z-d/2]], color, { bias: 0.5, ground: true });
  }

  /* ---- mobili dettagliati ---- */
  function fur_divano(x, z, w, d){
    const h = 0.55;
    boxAt(x, z, w, d, h, '#e8709a');
    boxAt(x, z - d/2 - 0.16, w - 0.2, 0.34, h + 0.42, '#d25a86', { y0: 0.06 });
    boxAt(x - w/2 + 0.18, z, 0.24, d, h + 0.16, '#d25a86', { y0: 0.04 });
    boxAt(x + w/2 - 0.18, z, 0.24, d, h + 0.16, '#d25a86', { y0: 0.04 });
    boxAt(x - w/4.2, z, w*0.38, d*0.8, 0.09, '#f6a1c0', { y0: h });
    boxAt(x + w/4.2, z, w*0.38, d*0.8, 0.09, '#f6a1c0', { y0: h });
  }

  function fur_tavolo(x, z, w, d){
    boxAt(x, z, w, d, 0.08, '#c98a4b', { y0: 0.74 });
    const lw = 0.11;
    boxAt(x - w/2 + 0.14, z - d/2 + 0.14, lw, lw, 0.74, '#8f6233');
    boxAt(x + w/2 - 0.14, z - d/2 + 0.14, lw, lw, 0.74, '#8f6233');
    boxAt(x - w/2 + 0.14, z + d/2 - 0.14, lw, lw, 0.74, '#8f6233');
    boxAt(x + w/2 - 0.14, z + d/2 - 0.14, lw, lw, 0.74, '#8f6233');
  }

  function fur_sedia(x, z){
    boxAt(x, z, 0.48, 0.46, 0.09, '#b07a3a', { y0: 0.44 });
    boxAt(x, z - 0.16, 0.48, 0.08, 0.5, '#b07a3a', { y0: 0.44 });
    boxAt(x - 0.16, z + 0.14, 0.07, 0.08, 0.44, '#8f6233');
    boxAt(x + 0.16, z + 0.14, 0.07, 0.08, 0.44, '#8f6233');
  }

  function fur_tv(x, z, w, d){
    boxAt(x, z, w*0.5, d, 0.5, '#6b5b7e');
    boxAt(x, z, w, d, 1.15, '#2a2033', { y0: 0.5 });
    addQuad([[x-w/2+0.06, 0.62, z+d/2+0.03],[x-w/2+0.06, 1.4, z+d/2+0.03],[x+w/2-0.06, 1.4, z+d/2+0.03],[x+w/2-0.06, 0.62, z+d/2+0.03]], shade('#6b8fe0', 0.95), { cull:'solid', bias: 0.012 });
  }

  function fur_cucina(x, z, w, d){
    boxAt(x, z, w, d, 0.95, '#8fb8e8', { y0: 0.06 });
    boxAt(x, z, w + 0.12, d, 0.06, '#e6eef8', { y0: 1.0 });
    boxAt(x - w*0.18, z, 0.3, 0.2, 0.02, '#4a3a40', { y0: 1.06 });
    boxAt(x + w*0.18, z, 0.3, 0.2, 0.02, '#4a3a40', { y0: 1.06 });
  }

  function fur_bagno(x, z, w, d){
    boxAt(x, z, w, d, 1.0, '#b9d9f0');
    boxAt(x, z, w*0.8, d*0.8, 0.05, '#dceefb', { y0: 1.0 });
  }

  function fur_cassa(x, z, w, d){
    boxAt(x, z, w, d, 0.6, '#c98a4b');
    boxAt(x, z, w*0.9, d*0.9, 0.04, '#a97a45', { y0: 0.6 });
    boxAt(x, z + d*0.14, w*0.06, d*0.6, 0.5, '#a97a45', { y0: 0.1 });
  }

  function fur_pianta(x, z, w, d){
    boxAt(x, z, w*0.66, d*0.66, 0.5, '#b07a3a');
    boxAt(x, z, w*0.5, d*0.5, 0.12, '#8a5a2c', { y0: 0.5 });
    boxAt(x, z, w*0.95, d*0.95, 0.45, '#5fbf6a', { y0: 0.62 });
    boxAt(x - w*0.22, z + d*0.2, w*0.5, d*0.5, 0.3, '#74d180', { y0: 0.95 });
    boxAt(x + w*0.2, z - d*0.2, w*0.45, d*0.45, 0.26, '#4faf5e', { y0: 1.0 });
  }

  function fur_prato(x, z, w, d){
    flatAt(x, z, w, d, '#8fdb7a');
    flatAt(x, z, w*0.7, d*0.7, '#a5e88a');
    const flowers = ['#ff8fb0','#ffd166','#fff'];
    for (let i = 0; i < flowers.length; i++){
      const fx = x - w*0.28 + i*0.28, fz = z - d*0.2 + (i%2)*d*0.4;
      flatAt(fx, fz, 0.14, 0.14, flowers[i], 0.03);
    }
  }

  function fur_tappeto(x, z, w, d){
    flatAt(x, z, w, d, '#ffd6e8');
    flatAt(x, z, w*0.82, d*0.82, '#ffe9f4');
  }

  function fur_entrata(x, z, w, d){
    flatAt(x, z, w, d, '#c9a07a');
    flatAt(x, z, w*0.6, d*0.6, '#d9b490', 0.03);
  }

  function fur_piscina(x, z, w, d){
    boxAt(x, z, w, d, 0.42, '#9ad1f0');
    addQuad([[x-w/2+0.14, 0.44, z-d/2+0.14],[x-w/2+0.14, 0.44, z+d/2-0.14],[x+w/2-0.14, 0.44, z+d/2-0.14],[x+w/2-0.14, 0.44, z-d/2+0.14]], shade('#4fc3f7', 1.05), { cull:'solid', bias: 0.02 });
    addQuad([[x-w/2+0.3, 0.46, z-0.3],[x-w/2+0.3, 0.46, z+0.3],[x-w/2+0.42, 0.46, z+0.3],[x-w/2+0.42, 0.46, z-0.3]], shade('#7fd8fb', 1.1), { cull:'solid', bias: 0.03 });
  }

  function fur_dj(x, z, w, d){
    boxAt(x, z, w, d, 1.05, '#b388ff');
    boxAt(x, z, w*0.92, d*0.4, 0.06, '#7a5bd0', { y0: 1.05 });
    boxAt(x - w*0.18, z, 0.3, 0.16, 0.03, '#4a3a40', { y0: 1.11 });
    boxAt(x + w*0.18, z, 0.3, 0.16, 0.03, '#4a3a40', { y0: 1.11 });
  }

  function fur_scaffale(x, z, w, d){
    boxAt(x, z, w, d, 2.0, '#a97a45');
    for (let i = 0; i < 3; i++){
      const y = 0.55 + i * 0.55;
      addQuad([[x-w/2+0.02, y, z+d/2+0.03],[x-w/2+0.02, y+0.03, z+d/2+0.03],[x+w/2-0.02, y+0.03, z+d/2+0.03],[x+w/2-0.02, y, z+d/2+0.03]], shade('#7d5a2c', 1.0), { cull:'solid', bias: 0.015 });
    }
    const books = ['#e8709a','#6ee7ff','#ffd166','#3ecf6b','#b388ff'];
    for (let i = 0; i < books.length; i++){
      const bx = x - w*0.3 + i * w*0.15;
      boxAt(bx, z, w*0.09, d*0.7, 0.4, books[i], { y0: 0.18 + (i%2)*0.18 });
    }
  }

  function fur_lampada(x, z){
    boxAt(x, z, 0.12, 0.12, 1.35, '#8a8a9a');
    boxAt(x, z, 0.5, 0.5, 0.14, '#ffd166', { y0: 1.35 });
    addQuad([[x-0.22, 1.4, z-0.22],[x-0.9, 0.03, z-0.9],[x+0.9, 0.03, z+0.9],[x+0.22, 1.4, z+0.22]], 'rgba(255,210,120,0.13)', { bias: -0.15 });
  }

  function fur_bar(x, z, w, d){
    boxAt(x, z, w, d, 1.05, '#7d5a3a', { y0: 0.06 });
    boxAt(x, z, w + 0.12, d, 0.06, '#9a7a50', { y0: 1.1 });
    fur_sedia(x - w/4, z + d/2 + 0.42);
    fur_sedia(x + w/4, z + d/2 + 0.42);
  }

  /* ---- costruzione scena ---- */
  function rebuild(){
    quads = []; ground = [];
    const hDef = currentHouse();
    if (!hDef){ scene = null; return null; }
    const s = SCENES[hDef.id];
    if (!s){ scene = null; return null; }
    const W_ = s.floorW, D_ = s.floorD, H_ = 3;
    scene = s; Wf = W_; Df = D_;

    cam.tx = W_/2; cam.ty = 1.1; cam.tz = D_/2 - 0.7;
    cam.dist = Math.max(W_, D_) * 1.6 + 3;

    /* pavimento (ground pass) */
    flatAt(W_/2, D_/2, W_, D_, s.floorColor, 0);

    /* pareti sinistra/destra/fondo */
    addQuad([[0,0,D_],[0,H_,D_],[W_,H_,D_],[W_,0,D_]], shade(s.wallColor, 0.92), { bias: 0.4 });
    addQuad([[0,0,0],[0,H_,0],[0,H_,D_],[0,0,D_]], shade(s.wallColor, 0.72), { bias: 0.4 });
    addQuad([[W_,0,0],[W_,H_,0],[W_,H_,D_],[W_,0,D_]], shade(s.wallColor, 0.72), { bias: 0.4 });

    /* finestre sul muro di fondo */
    for (const fx of [W_*0.30, W_*0.72]){
      addQuad([[fx-0.9, 1.05, D_-0.04],[fx-0.9, 2.15, D_-0.04],[fx+0.9, 2.15, D_-0.04],[fx+0.9, 1.05, D_-0.04]], shade('#a9dcf5', 0.95), { bias: 0.02 });
      addQuad([[fx-0.98, 1.0, D_-0.03],[fx-0.98, 2.2, D_-0.03],[fx-0.9, 2.2, D_-0.03],[fx-0.9, 1.0, D_-0.03]], shade(s.wallColor, 0.7), { bias: 0.025 });
      addQuad([[fx+0.9, 1.0, D_-0.03],[fx+0.9, 2.2, D_-0.03],[fx+0.98, 2.2, D_-0.03],[fx+0.98, 1.0, D_-0.03]], shade(s.wallColor, 0.7), { bias: 0.025 });
      addQuad([[fx-0.9, 2.12, D_-0.03],[fx-0.9, 2.2, D_-0.03],[fx+0.9, 2.2, D_-0.03],[fx+0.9, 2.12, D_-0.03]], shade(s.wallColor, 0.7), { bias: 0.025 });
      addQuad([[fx-0.06, 1.05, D_-0.02],[fx-0.06, 2.15, D_-0.02],[fx+0.06, 2.15, D_-0.02],[fx+0.06, 1.05, D_-0.02]], shade('#e8f7ff', 0.9), { bias: 0.03 });
    }

    /* mobili */
    for (const f of s.furniture){
      const fn = FURFN[f.type] || fur_default;
      fn(f.x, f.z, f.w || 1, f.d || 1);
    }
    return scene;
  }

  const FURFN = {
    divano: fur_divano, tavolo: fur_tavolo, sedia: fur_sedia, tv: fur_tv,
    cucina: fur_cucina, bagno: fur_bagno, cassa: fur_cassa, pianta: fur_pianta,
    prato: fur_prato, tappeto: fur_tappeto, entrata: fur_entrata,
    piscina: fur_piscina, dj: fur_dj, scaffale: fur_scaffale, lampada: fur_lampada, bar: fur_bar
  };
  function fur_default(x, z, w, d){ boxAt(x, z, w, d, 0.6, '#d9b084'); }

  /* ---- camera ---- */
  function computeCam(){
    const yaw = baseYaw + Math.sin(swayT) * 0.45;
    const p = cam.pitch, d = cam.dist;
    let cx = cam.tx + d * Math.cos(p) * Math.sin(yaw);
    const cy = cam.ty + d * Math.sin(p);
    const cz0 = cam.tz + d * Math.cos(p) * Math.cos(yaw);
    cx = Math.max(0.35, Math.min(Wf - 0.35, cx));
    const cz = Math.max(cz0, cam.tz + 0.4);
    camX = cx; camY = cy; camZ = cz;
    const f = norm(sub([cam.tx, cam.ty, cam.tz], [cx, cy, cz]));
    FX = f[0]; FY = f[1]; FZ = f[2];
    const r = norm(cross(f, [0,1,0]));
    RX = r[0]; RY = r[1]; RZ = r[2];
    const u = cross(r, f);
    UX = u[0]; UY = u[1]; UZ = u[2];
  }

  function project(p){
    const dx = p[0]-camX, dy = p[1]-camY, dz = p[2]-camZ;
    const cx2 = dx*RX + dy*RY + dz*RZ;
    const cy2 = dx*UX + dy*UY + dz*UZ;
    const cz2 = dx*FX + dy*FY + dz*FZ;
    if (cz2 <= 0.2) return null;
    const sc = focal()/cz2;
    return [W/2 + cx2*sc, H/2 - cy2*sc, cz2];
  }

  function focal(){ return (H/2) / Math.tan(25 * Math.PI/180); }

  /* ---- attach / resize ---- */
  function attach(canvasEl){
    if (!canvasEl || !canvasEl.getContext){ canvas = null; ctx = null; return; }
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    bindDrag();
    if (!scene) rebuild();
  }

  function resize(){
    if (!canvas || !ctx) return;
    const cw = canvas.clientWidth || 300;
    W = Math.max(120, cw);
    H = Math.max(80, Math.round(cw * 0.72));
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
  }

  function bindDrag(){
    if (!canvas) return;
    canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; dragYaw = baseYaw; });
    if (typeof window !== 'undefined' && window.addEventListener){
      window.addEventListener('pointermove', (e) => { if (dragging) baseYaw = dragYaw + (e.clientX - px) * 0.005; });
      window.addEventListener('pointerup', () => { dragging = false; });
    }
  }

  /* ---- update / draw ---- */
  function tick(dt){
    if (!canvas || !ctx || !scene) return;
    resize();
    swayT += dt * (dragging ? 0 : 0.6);
    computeCam();
    if (typeof CHARSCENE !== 'undefined' && CHARSCENE.update) CHARSCENE.update(dt);
    draw();
  }

  function draw(){
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fbd8ec');
    g.addColorStop(1, '#ffe9f2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* ground pass: pavimento e tappeti SEMPRE per primi (mai sopra i personaggi) */
    for (const q of ground) drawQuad(q);

    /* painter sort per pareti, mobili e personaggi */
    const items = [];
    for (const q of quads){
      if (q.cull === 'solid'){
        const ccx = (q.pts[0][0]+q.pts[1][0]+q.pts[2][0]+q.pts[3][0])/4;
        const ccy = (q.pts[0][1]+q.pts[1][1]+q.pts[2][1]+q.pts[3][1])/4;
        const ccz = (q.pts[0][2]+q.pts[1][2]+q.pts[2][2]+q.pts[3][2])/4;
        const v = [ccx-camX, ccy-camY, ccz-camZ];
        if (dot(q.normal, v) >= 0) continue;
      }
      items.push({ depth: quadDepth(q), quad: q });
    }
    if (typeof CHARSCENE !== 'undefined' && CHARSCENE.collect){
      for (const ch of CHARSCENE.collect()){
        const pr = project([ch.x, 0, ch.z]);
        if (!pr) continue;
        items.push({ depth: pr[2], char: ch, scr: pr });
      }
    }
    items.sort((a, b) => b.depth - a.depth);

    for (const it of items){
      if (it.quad) drawQuad(it.quad);
      else if (typeof CHARSCENE !== 'undefined' && CHARSCENE.drawChar) CHARSCENE.drawChar(ctx, it.scr, focal()/it.scr[2], it.char);
    }
  }

  function quadDepth(q){
    let z = 0;
    for (const p of q.pts){ z += (p[0]-camX)*FX + (p[1]-camY)*FY + (p[2]-camZ)*FZ; }
    return z/4 + (q.bias || 0);
  }

  function drawQuad(q){
    const pr = q.pts.map(project);
    if (pr.some(p => !p)) return;
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.moveTo(pr[0][0], pr[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(pr[i][0], pr[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  return { attach, rebuild, tick, scene: () => scene };
})();