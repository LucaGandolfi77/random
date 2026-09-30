/* minigames.js — Awa, Latte-Art, Respiro. Ritornano {grade, bonus, aborted} */
(function () {
'use strict';
function toast(m){ window.MHToast?.(m); }

/* B5: ogni rito è cancellabile via AbortSignal.
   Prima: chiudere il modale a metà lasciava il rAF girare su un canvas
   nascosto e, al resolve, regalava comunque +2 mosse / +1 cuore senza
   aver finito. E miniBusy restava true senza alcun feedback. */
function onAbort(signal, fn) {
  if (!signal) return () => {};
  if (signal.aborted) { fn(); return () => {}; }
  signal.addEventListener('abort', fn, { once: true });
  return () => signal.removeEventListener('abort', fn);
}
const ABORTED = () => ({ grade: '—', bonus: 0, aborted: true });

function runAwa(canvas, status, signal) {
  if (signal && signal.aborted) return Promise.resolve(ABORTED());
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    let angle = 0, speed = 0, last = performance.now(), foam = 0, t0 = performance.now();
    let cx = 220, cy = 150, R = 90, px = null, py = null, active = false;
    let raf = 0, done = false, off = () => {};

    const settle = (res) => {
      if (done) return;
      done = true; off();
      canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = null;
      if (raf) cancelAnimationFrame(raf);
      resolve(res);
    };
    off = onAbort(signal, () => {
      status.textContent = 'Rito interrotto — nessun bonus 🍵';
      settle(ABORTED());
    });

    status.textContent = '🌀 Ruota il dito in cerchio, velocità media! 12 secondi.';
    function draw() {
      ctx.clearRect(0,0,440,300);
      ctx.fillStyle = '#e9f2dd'; ctx.beginPath(); ctx.ellipse(cx,cy,R+30,R*0.75+22,0,0,7); ctx.fill();
      ctx.fillStyle = '#7a9e7e'; ctx.beginPath(); ctx.ellipse(cx,cy,R,R*0.72,0,0,7); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.25+foam/140})`;
      for (let i=0;i<foam;i++){ const a=Math.random()*7, r=Math.random()*R*0.8; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r, cy+Math.sin(a)*r*0.7, 2+Math.random()*3,0,7); ctx.fill(); }
      ctx.fillStyle = '#2e2a24'; ctx.font = '700 15px system-ui'; ctx.textAlign='center';
      ctx.fillText(`schiuma ${Math.min(100,Math.round(foam))}% · ${(12-(performance.now()-t0)/1000).toFixed(1)}s`, cx, 28);
      // anello velocità ideale
      ctx.strokeStyle = speed>2&&speed<9 ? '#4a6b4f' : '#e9c46a'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.arc(cx,cy,R+14,angle-1,angle+1); ctx.stroke();
    }
    function finish() {
      const grade = foam>75?'S':foam>50?'A':foam>28?'B':'C';
      status.textContent = `Schiuma ${Math.round(foam)}% → voto ${grade} ${grade==='S'?'✨ perfetta! +4 mosse al prossimo livello':grade==='C'?'· un po’ amara, ma va bene così ♥':'+2 mosse bonus'}`;
      window.MHAudio.chime();
      settle({ grade, bonus: grade==='S'?4:grade==='C'?0:2 });
    }
    function loop(now) {
      if (done) return;
      const dt=(now-last)/1000; last=now;
      speed*=0.94;
      if (active && speed>2&&speed<9) foam+=dt*14; else if (active && speed>=9) foam-=dt*8;
      foam=Math.max(0,Math.min(100,foam));
      angle+=speed*dt; draw();
      if (now-t0>12000) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }
    const pos = (e) => { const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(440/r.width), y:(e.clientY-r.top)*(300/r.height) }; };
    canvas.onpointerdown=(e)=>{ active=true; const p=pos(e); px=p.x; py=p.y; };
    canvas.onpointerup=canvas.onpointercancel=()=>{ active=false; speed=0; };
    canvas.onpointermove=(e)=>{ if(!active) return; const p=pos(e); const dx=p.x-px, dy=p.y-py; speed=Math.min(14,Math.hypot(dx,dy)/3); px=p.x; py=p.y; window.MHAudio.rainTick(); };
    draw(); raf = requestAnimationFrame(loop);
  });
}

function runLatte(canvas, status, signal) {
  if (signal && signal.aborted) return Promise.resolve(ABORTED());
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    status.textContent = '🌸 Trascina per disegnare un cuore senza uscire dalla tazza! Hai 20s.';
    const t0=performance.now(); let path=[], drawing=false, out=0, timer=0, done=false, off=() => {};

    const settle = (res) => {
      if (done) return;
      done = true; off(); if (timer) clearTimeout(timer);
      canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.ondblclick = null;
      resolve(res);
    };
    off = onAbort(signal, () => {
      status.textContent = 'Rito interrotto — nessun bonus 🍵';
      settle(ABORTED());
    });

    function draw() {
      ctx.clearRect(0,0,440,300);
      ctx.fillStyle='#fffdf7'; ctx.fillRect(0,0,440,300);
      ctx.strokeStyle='#7a9e7e'; ctx.lineWidth=10; ctx.beginPath(); ctx.ellipse(220,155,120,95,0,0,7); ctx.stroke();
      ctx.fillStyle='#cfe3bd'; ctx.beginPath(); ctx.ellipse(220,155,112,87,0,0,7); ctx.fill();
      // cuore guida fantasma
      ctx.strokeStyle='rgba(244,174,190,.7)'; ctx.lineWidth=3; ctx.setLineDash([8,6]);
      ctx.beginPath(); ctx.moveTo(220,210); ctx.bezierCurveTo(140,150,170,80,220,120); ctx.bezierCurveTo(270,80,300,150,220,210); ctx.stroke(); ctx.setLineDash([]);
      // tratto utente
      ctx.strokeStyle='#8a4b5e'; ctx.lineWidth=7; ctx.lineCap='round'; ctx.beginPath();
      path.forEach((p,i)=>{ i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); }); ctx.stroke();
      ctx.fillStyle='#2e2a24'; ctx.font='700 15px system-ui'; ctx.textAlign='center';
      ctx.fillText(`tratto ${path.length} pt · fuori ${out} · ${(20-(performance.now()-t0)/1000).toFixed(0)}s`,220,28);
    }
    function inside(x,y){ const dx=(x-220)/112, dy=(y-155)/87; return dx*dx+dy*dy<=1; }
    function finish() {
      // voto: copertura + stare dentro
      const cover=Math.min(100,path.length/3);
      const penalty=out*2;
      const score=Math.max(0,cover-penalty);
      const grade=score>70?'S':score>45?'A':score>22?'B':'C';
      status.textContent=`Latte-art ${Math.round(score)} → ${grade} ${grade==='S'?'💘 Ren si commuove! Sblocchi CG sakura +4 mosse':grade==='C'?'· storta ma tenera ♥ +0':'+2 mosse'}`;
      window.MHAudio.chime();
      settle({grade,bonus:grade==='S'?4:grade==='C'?0:2});
    }
    canvas.onpointerdown=()=>{ drawing=true; };
    canvas.onpointerup=canvas.onpointercancel=()=>{ drawing=false; };
    canvas.onpointermove=(e)=>{
      if(!drawing||done) return;
      const r=canvas.getBoundingClientRect();
      const x=(e.clientX-r.left)*(440/r.width), y=(e.clientY-r.top)*(300/r.height);
      path.push({x,y}); if(!inside(x,y)) out++;
      draw();
      if(performance.now()-t0>20000) finish();
    };
    draw();
    timer = setTimeout(finish, 21000);
    // chiusura anticipata: doppio tap = fine
    canvas.ondblclick=()=>finish();
  });
}

function runBreath(canvas, status, signal) {
  if (signal && signal.aborted) return Promise.resolve(ABORTED());
  return new Promise((resolve) => {
    const ctx=canvas.getContext('2d');
    status.textContent='🌊 Segui il cerchio: inspira 4s · trattieni 7s · espira 8s. Un ciclo = +1 ♥ / +2 mosse.';
    const phases=[{n:'inspira…',d:4,c:'#7a9e7e'},{n:'trattieni…',d:7,c:'#e9c46a'},{n:'espira…',d:8,c:'#7aa0c4'}];
    let pi=0, pt=performance.now(), raf=0, done=false, off=() => {};

    const settle = (res) => {
      if (done) return;
      done = true; off();
      if (raf) cancelAnimationFrame(raf);
      resolve(res);
    };
    off = onAbort(signal, () => {
      status.textContent = 'Rito interrotto — respira comunque, riprova quando vuoi 🌊';
      settle(ABORTED());
    });

    function draw(now) {
      if (done) return;
      const ph=phases[pi], el=(now-pt)/1000, k=Math.min(1,el/ph.d);
      const R = pi===2 ? 100-60*k : 40+60*(pi===0?k:1);
      ctx.clearRect(0,0,440,300);
      ctx.fillStyle='#f6f1e5'; ctx.fillRect(0,0,440,300);
      ctx.fillStyle=ph.c+'55'; ctx.beginPath(); ctx.arc(220,150,110,0,7); ctx.fill();
      ctx.fillStyle=ph.c; ctx.beginPath(); ctx.arc(220,150,R,0,7); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='800 26px system-ui'; ctx.textAlign='center'; ctx.fillText(ph.n,220,158);
      ctx.fillStyle='#2e2a24'; ctx.font='700 14px system-ui'; ctx.fillText(`fase ${pi+1}/3 · ${Math.ceil(ph.d-el)}s`,220,28);
      if(el>=ph.d){ pi++; pt=now; window.MHAudio.pop(pi+1); if(navigator.vibrate) try{navigator.vibrate(40);}catch{} if(pi>=3){finish();return;} }
      raf = requestAnimationFrame(draw);
    }
    function finish(){ status.textContent='✨ Calma ritrovata. +1 ♥ e +2 mosse al livello. Hana è fiera.'; window.MHAudio.chime(); settle({grade:'S',bonus:2,heart:1}); }
    raf = requestAnimationFrame(draw);
  });
}

async function playMini(kind, canvas, status, signal) {
  window.MHAudio.whisk();
  if (kind==='awa') return runAwa(canvas, status, signal);
  if (kind==='latte') return runLatte(canvas, status, signal);
  return runBreath(canvas, status, signal);
}
window.MHMinis={playMini};
})();
