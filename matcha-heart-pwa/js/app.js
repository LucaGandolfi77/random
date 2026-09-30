/* app.js — router, livelli, diario, oracolo, pioggia */
'use strict';
window.MH = { save: window.MHSave.refillHearts(window.MHSave.loadSave()) };
function persist(){ window.MHSave.writeSave(window.MH.save); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2400); }
window.MHToast = toast;
window.MHCombo = (chain) => {
  const c=document.getElementById('combo');
  const words={1:'',2:'doppio sorso! 🍵',3:'BATTITO! 💓',4:'MATCHA IN FIAMME! 🔥',5:'ETERNO! ✨'};
  if(chain>=2){ c.textContent=(words[Math.min(5,chain)]||'combo x'+chain); c.classList.remove('show'); void c.offsetWidth; c.classList.add('show'); petalBurst(20*chain); }
};
const $ = (id)=>document.getElementById(id);
let currentId = 1, board = null, pendingBonus = 0;
/* --- multiverso: U() = universo attivo, P() = progressi universo attivo --- */
function U(){ return window.MHU.active(); }
function P(uid){ return window.MHU.prog(uid); }

function applySettings(){
  document.body.classList.toggle('night', !!window.MH.save.settings.night);
  $('btn-sound').textContent = window.MH.save.settings.sound ? '🔔' : '🔕';
}
function hud(){
  $('hud-hearts').textContent = '♥ '+window.MH.save.hearts;
  $('hud-stars').textContent = '★ '+P().totalStars;
  const done = Object.keys(P().stars).length;
  $('home-progress').textContent = `${done} / ${U().story.length} episodi · ${P().totalStars} ★`;
  $('home-tea').style.width = Math.round(done/U().story.length*100)+'%';
  try { window.MHTama?.renderTama(); } catch {}
  try { window.MHEggs?.tick(); } catch {}
  renderMoodWeek();
  document.querySelectorAll('.moodbtn').forEach(b=>b.classList.toggle('on', window.MH.save.mood?.value===b.dataset.mood && window.MH.save.mood?.date===new Date().toISOString().slice(0,10)));
}
function show(tab){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(tab).classList.add('active');
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  window.scrollTo({top:0});
}
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>show(b.dataset.tab));

/* --- mappa (per universo: capitoli con eps espliciti) --- */
function renderMap(){
  const box=$('chapters'); box.innerHTML='';
  try {
    $('map-lead').innerHTML = U().id==='sakura'
      ? `10 tazze in un mondo dove Hana non è mai morta. 2 finali: <i>Radice Sognata</i> o <i>Pioggia Vera</i>.`
      : `30 tazze = 30 memorie. 4 finali + 1 segreto <i>Matcha Eterno</i> (60★).`;
  } catch {}
  U().chapters.forEach(ch=>{
    const div=document.createElement('div'); div.className='chap';
    div.innerHTML=`<header>${U().icon} Cap.${ch.n} — ${ch.title}<br><small style="font-weight:400">${ch.desc}</small></header>`;
    const grid=document.createElement('div'); grid.className='eps';
    ch.eps.forEach((id,i)=>{
      const ep=U().story.find(s=>s.id===id); if(!ep) return;
      const b=document.createElement('button'); b.className='ep';
      const st=P().stars[id];
      const ui=window.MHU.epIndex(P().unlocked);
      const locked = ui<0 ? false : window.MHU.epIndex(id)>ui;
      if(st) b.classList.add('done'); if(locked) b.classList.add('lock');
      b.innerHTML=`${locked?'🔒':(ep.level.mini==='awa'?'🌀':ep.level.mini==='latte'?'🌸':'🌊')} ${ch.n}-${i+1}<small>${st?('★'.repeat(st)):(locked?'bloccato':ep.title.slice(0,12)+'…')}</small>`;
      b.onclick=()=>{ if(locked){ toast('Servi prima la tazza precedente 🍵'); return; } openStory(id); };
      grid.appendChild(b);
    });
    div.appendChild(grid); box.appendChild(div);
  });
}
/* --- selettore universo + Fessura --- */
function renderUniverseCard(){
  const card=$('univ-card'); if(!card) return;
  const u=U();
  $('univ-name').textContent=`${u.icon} ${u.name}`;
  $('univ-desc').textContent=u.desc;
  try { $('univ-face').textContent=u.icon; } catch {}
  const row=$('univ-row'); if(!row) return;
  row.innerHTML='';
  window.MHU.UNIVERSES.forEach(def=>{
    const b=document.createElement('button');
    b.className='btn ghost small'; b.style.width='auto'; b.style.marginTop='0';
    const ok=window.MHU.universeUnlocked(def);
    const here=def.id===u.id;
    b.textContent=here?`${def.icon} Qui`:(ok?`${def.icon} ${def.name}`:`${def.icon} 🔒`);
    b.disabled=here;
    b.onclick=()=>{
      if(here) return;
      if(!ok){ toast('Si apre dopo un finale nel mondo precedente 🌫️'); return; }
      fessuraTo(def.id);
    };
    row.appendChild(b);
  });
}
function fessuraTo(uid){
  const veil=$('fessura'); if(!veil){ doSwitchUniverse(uid); return; }
  veil.classList.add('open');
  setTimeout(()=>{
    doSwitchUniverse(uid);
    veil.classList.remove('open');
  }, matchMedia('(prefers-reduced-motion: reduce)').matches?100:1200);
}
function doSwitchUniverse(uid){
  if(!window.MHU.setUniverse(uid)){ toast('Universo ancora sigillato 🌫️'); return; }
  try { window.MHEggs?.onUniverse?.(uid); } catch {}
  renderMap(); renderDiary(); renderUniverseCard(); hud();
  const u=U();
  toast(uid==='sakura'?'🌸 Sakura Eterna. Hana è viva. Tu… anche.':'🌧️ Bentornata nella Pioggia.');
  show('view-map');
}
/* --- diario + lettere che sussurrano (TTS solo su tap) --- */
function stopSpeech(){ try { speechSynthesis.cancel(); } catch {} document.querySelectorAll('.spoken').forEach(s=>s.classList.remove('spoken')); }
function speakLetter(text, itemEl, btn){
  if(!('speechSynthesis' in window)){ toast('Questo browser non ha voce — leggila piano tu 💌'); return; }
  if(window.MH.save.settings.sound===false){ toast('Audio spento 🔕 — riattivalo per ascoltare Hana'); return; }
  stopSpeech();
  const u = new SpeechSynthesisUtterance(text);
  u.lang='it-IT'; u.rate=0.92; u.pitch=1.1;
  try {
    const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('it'));
    const fem=vs.find(v=>/female|donna|alice|sara|chiara|elisa|federica/i.test(v.name))||vs[0];
    if(fem) u.voice=fem;
  } catch {}
  const words=text.split(/\s+/);
  const textEl=itemEl.querySelector('.letter-text');
  textEl.innerHTML=words.map(w=>`<span>${w.replace(/</g,'&lt;')}</span>`).join(' ');
  const spans=[...textEl.querySelectorAll('span')];
  let wi=0;
  u.onboundary=(e)=>{ if(typeof e.charIndex==='number'){ let acc=0; for(let i=0;i<spans.length;i++){ acc+=spans[i].textContent.length+1; if(acc>e.charIndex){ wi=i; break; } } spans.forEach(s=>s.classList.remove('spoken')); if(spans[wi]) spans[wi].classList.add('spoken'); } };
  u.onend=()=>{ spans.forEach(s=>s.classList.remove('spoken')); if(btn) btn.textContent='🔈 Ascoltami'; };
  btn.textContent='⏹ Ferma';
  btn.onclick=()=>{ stopSpeech(); btn.textContent='🔈 Ascoltami'; btn.onclick=()=>speakLetter(text,itemEl,btn); };
  speechSynthesis.speak(u);
}
function renderDiary(){
  const d=$('diary'); const L=P().letters;
  const E=P().endings;
  d.innerHTML = (L.length?'':'<p class="meter">Nessuna lettera ancora. Servi la prima tazza.</p>');
  // 🌫️ Fessura nel Vapore: dopo un finale del canone, prima di averla attraversata
  try {
    if(U().id==='pioggia' && window.MHU.sakuraUnlocked() && !window.MH.save.stats.fessuraSeen){
      const f=document.createElement('div'); f.className='diary-item fessura-item';
      f.innerHTML=`🌫️ <b>Una tazza vaporizza al contrario.</b><br><span class="meter">Il vapore scende invece di salire. Hana non l’ha mai fatto. O forse sì, altrove.</span>`;
      const b=document.createElement('button'); b.className='btn ghost small listenbtn'; b.textContent='Guarda dentro 🌸';
      b.onclick=()=>{ window.MH.save.stats.fessuraSeen=true; persist(); renderDiary(); fessuraTo('sakura'); };
      f.appendChild(b); d.appendChild(f);
    }
  } catch {}
  // 🧵 Fili: progresso sottotrame (vive nell’universo attivo o nel sakura se avviato)
  try { renderThreads(d); } catch {}
  L.forEach((x)=>{
    const div=document.createElement('div'); div.className='diary-item';
    const p=document.createElement('div'); p.className='letter-text'; p.textContent='💌 '+x;
    const b=document.createElement('button'); b.className='btn ghost small listenbtn'; b.textContent='🔈 Ascoltami';
    b.onclick=()=>speakLetter(x,div,b);
    div.appendChild(p); div.appendChild(b); d.appendChild(div);
  });
  E.forEach((e)=>{ const en=U().endings[e]; if(!en) return; const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#e9c46a'; div.innerHTML=`🏁 <b>${en.title}</b><br>${en.text.slice(0,160)}…`; d.appendChild(div); });
  (window.MH.save.stats.badges||[]).forEach((b)=>{ const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#9b7ed9'; div.textContent='🏅 '+b; d.appendChild(div); });
  const t=window.MH.save.tama;
  if(t){ const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#f4aebe'; div.textContent=`🐾 ${t.name} ha ${t.xp} xp · ultimi 7 umori: ${(window.MH.save.mood.log||[]).slice(-7).map(m=>m==='bene'?'🌸':m==='ansiosa'?'😰':'🥺').join(' ')||'—'}`; d.appendChild(div); }
}
/* --- 🧵 Fili: sottotrame con progresso (per universo) --- */
function renderThreads(d){
  const defs=U().threads||[];
  if(!defs.length) return;
  const tp=P().threads||{};
  const started=Object.keys(tp).length>0;
  if(!started) return;
  const wrap=document.createElement('div'); wrap.className='diary-item'; wrap.style.borderColor='#9b7ed9';
  wrap.innerHTML=`🧵 <b>Fili</b> <span class="meter">(${U().name})</span>`;
  defs.forEach(th=>{
    const n=Math.min(5,tp[th.id]||0);
    if(!n) return;
    const dots='●'.repeat(n)+'○'.repeat(5-n);
    const hint=n>=5?'completo ✨':th.hints[Math.min(n,th.hints.length-1)];
    const p=document.createElement('div'); p.className='meter'; p.style.marginTop='6px';
    p.textContent=`${th.icon} ${th.name}: ${dots} — ${hint}`;
    wrap.appendChild(p);
  });
  if(wrap.children.length>0) d.appendChild(wrap);
}
/* --- sismografo del cuore: solo bonus, mai punizioni --- */
function setMood(v){
  const today=new Date().toISOString().slice(0,10);
  window.MH.save.mood.date=today; window.MH.save.mood.value=v;
  window.MH.save.mood.log.push(v); window.MH.save.mood.log=window.MH.save.mood.log.slice(-30);
  persist(); hud();
  try { window.MHTama?.renderTama(); } catch {}
  if(v==='ansiosa'){ toast('😰 Ti tengo la mano. Fai un Respiro prima? 🌊'); openMini('respiro'); }
  else if(v==='malinconica'){ toast('🥺 Oggi il tè è più dolce per te: +2 Mochi nel prossimo vassoio 🤍'); }
  else { toast('🌸 Che bello! Il tuo cucciolo fa festa 🐾'); petalBurst(40); }
}
function renderMoodWeek(){
  const el=$('mood-week'); if(!el) return;
  const log=(window.MH.save.mood.log||[]).slice(-7);
  el.textContent=log.length?('ultimi umori: '+log.map(m=>m==='bene'?'🌸':m==='ansiosa'?'😰':'🥺').join(' ')):'';
}
function sweetenBoardForMood(){
  // solo bonus: aggiunge tessere amiche, mai toglie
  if(!board||board.over) return;
  const mood=window.MH.save.mood;
  const today=new Date().toISOString().slice(0,10);
  if(!mood||mood.date!==today) return;
  const want = mood.value==='ansiosa' ? 3 : mood.value==='malinconica' ? 5 : -1;
  if(want<0||board.targetTile===want) return;
  let n=0, guard=0;
  while(n<(mood.value==='ansiosa'?3:2)&&guard++<200){
    const r=Math.floor(Math.random()*8), c=Math.floor(Math.random()*8);
    if(board.grid[r][c]!==board.targetTile){ board.grid[r][c]=want; n++; }
  }
  board.render();
}
function openStory(id){
  currentId=id;
  const ep=window.MHU.findEp(id);
  if(!ep){ toast('Episodio non trovato 🌫️'); return; }
  $('story-kicker').textContent=ep.kicker;
  $('story-title').textContent=ep.title;
  $('story-text').textContent=ep.text+'\n\n— '+ep.cliff;
  const box=$('story-choices'); box.innerHTML='';
  $('story-continue').style.display='none';
  const mk=(ch)=>{
    const b=document.createElement('button'); b.className='choice'; b.textContent=ch.label;
    b.onclick=()=>{
      P().choices[id]=ch.effect;
      if(ch.effect.startsWith('finale')){
        unlockEnding(ch.effect);
        [...box.children].forEach(x=>x.style.opacity=.4); b.style.opacity=1;
        $('story-continue').style.display='none';
        toast('Finale sbloccato — rileggilo nel Diario 📔');
      } else {
        [...box.children].forEach(x=>x.style.opacity=.4); b.style.opacity=1;
        const c=$('story-continue'); c.style.display='block';
        c.textContent=`🍵 Vai a servire la tazza (${ep.level.moves+ (window.MH.save.bonusMoves||0) + pendingBonus} mosse)`;
        toast(ch.effect==='rabbia'?'Scelta rabbiosa: più ombre nere sul vassoio 🖤':ch.effect==='dolcezza'?'Scelta dolce: il tè profuma di sakura 🌸':'Scelta coraggiosa: il chasen smette di tremare 💪');
      }
      persist();
    };
    return b;
  };
  box.appendChild(mk(ep.choiceA)); box.appendChild(mk(ep.choiceB));
  if(ep.finaleNote||ep.id===25||ep.id===30){
    const note=document.createElement('p'); note.className='meter';
    note.textContent=ep.finaleNote||(ep.id===25?'Ultima scelta del Cap.5: RESTO o LASCIO ANDARE. Il segreto MATCHA ETERNO si svela nel Diario con 60★. Poi ti aspetta il Cap.6!':'Ultima scelta: RADICI E ALI, in due versioni. Qualunque tu scelga, hai preso tutto. 🌳');
    box.appendChild(note);
  } else {
    $('story-continue').onclick=()=>{ $('story-modal').classList.remove('open'); startLevel(id); };
  }
  $('story-modal').classList.add('open');
}
function unlockEnding(key){
  const Prog=P();
  if(!Prog.endings.includes(key)) Prog.endings.push(key);
  // matcha eterno check (solo canone Pioggia)
  if(U().id==='pioggia' && Prog.totalStars>=60 && !Prog.endings.includes('matcha-eterno')){
    Prog.endings.push('matcha-eterno');
    toast('✨ FINALE SEGRETO: MATCHA ETERNO!');
  }
  const en=U().endings[key];
  if(en){ $('story-text').textContent+='\n\n🏁 '+en.title+'\n'+en.text; }
  const se=U().endings['matcha-eterno'];
  if(Prog.endings.includes('matcha-eterno') && key!=='matcha-eterno' && se){ $('story-text').textContent+='\n\n✨ '+se.title+'\n'+se.text; }
  if(U().id==='sakura'){
    // 🌧️ crossover: Pioggia Vera regala +3 mosse al canone, una volta sola
    if(key==='finale-pioggia-vera' && !window.MH.save.stats.crossoverBonus){
      window.MH.save.stats.crossoverBonus=true;
      window.MH.save.bonusMoves=(window.MH.save.bonusMoves||0)+3;
      setTimeout(()=>toast('🌧️ Il sogno ti ha lasciato un regalo: +3 mosse!'),2500);
    }
    Prog.unlocked='complete';
  }
  else if(key.startsWith('finale-radici')) Prog.unlocked=Math.max(Prog.unlocked,31);
  else if(key!=='matcha-eterno') Prog.unlocked=Math.max(Prog.unlocked,26);
  persist(); renderMap(); renderDiary(); renderUniverseCard(); hud();
  window.MHAudio.chime(); petalBurst(120);
}
/* --- livello --- */
function startLevel(id){
  const ep=window.MHU.findEp(id);
  if(!ep){ toast('Livello non trovato 🌫️'); return; }
  if(window.MH.save.hearts<=0){ toast('Cuori esauriti ♥ — fai un Respiro 4-7-8 per ricaricarne 1 🌊'); openMini('respiro'); return; }
  window.MH.save.hearts--; window.MH.save.lastRefill=Date.now(); persist(); hud();
  show('view-game');
  const choiceEff=P().choices[id];
  // rabbia prima della partita = bias nero (se scelta già fatta in partita precedente, o default per liv tensivi)
  let bias = ep.level.biasTile;
  if(choiceEff==='rabbia') bias=4;
  const extra=(window.MH.save.bonusMoves||0)+pendingBonus; pendingBonus=0; window.MH.save.bonusMoves=0;
  const cfg={ moves: ep.level.moves+extra, targetTile: ep.level.targetTile, targetCount: ep.level.targetCount, biasTile: bias,
    mechanic: ep.level.mechanic || U().mechanic, bloomRate: U().bloomRate, skin: U().skin,
    quota: ep.level.quota || 0,
    onUpdate: updateHUD, onWin: ()=>winLevel(id), onLose: ()=>loseLevel(id) };
  $('level-label').textContent=ep.kicker;
  board=new MHBoard($('board'), cfg);
  sweetenBoardForMood();
  $('btn-story-after').style.display='none';
  updateHUD(board.state());
  const tn=window.MHTiles.TILES[cfg.targetTile];
  $('level-goal').textContent=`🎯 ${cfg.targetCount} ${window.MHU.tileEmoji(cfg.targetTile)} in ${cfg.moves} mosse${cfg.quota?` · schiuma ${cfg.quota}%`:''}`;
  toast(`Servi ${cfg.targetCount} ${tn.name}! ${extra?`(+${extra} bonus dai riti) `:''}Trascina per scambiare.`);
  const mechHints={ bloom:'🌱 Boccioli: fai match accanto a loro per farli sbocciare (valgono doppio!)', gelo:'🧊 Gelo: non si sposta! Scioglilo con un match vicino (vale 1).', ink:'⬛ Inchiostro: si allarga ogni 3 mosse! Puliscilo con un match vicino.', mix:'🌱🧊 Boccioli e gelo: tutto si scioglie coi match vicini!' };
  if(cfg.mechanic && mechHints[cfg.mechanic] && !window.MH.save.stats['mech_'+cfg.mechanic]){
    window.MH.save.stats['mech_'+cfg.mechanic]=true; persist();
    setTimeout(()=>toast(mechHints[cfg.mechanic]),1200);
  }
}
function updateHUD(s){
  const ep=window.MHU.findEp(currentId);
  const tn=window.MHTiles.TILES[ep?ep.level.targetTile:0];
  $('moves-label').textContent=`mosse: ${s.moves} · ${window.MHU.tileEmoji(ep?ep.level.targetTile:0)} ${s.collected}/${s.need}`;
  $('score-label').textContent=`schiuma: ${s.score}%`;
  $('tea-fill').style.width=Math.min(100,Math.round(s.collected/s.need*100))+'%';
}
function starsFor(s, total){
  if(s.score>=60 && s.moves>=total*0.15) return 3;
  if(s.score>=30 || s.moves>0) return 2;
  return 1;
}
function winLevel(id){
  try {
    // bonus Tama stage1: +5% schiuma
    if(window.MH.save.tama && window.MH.save.tama.stage>=1 && board) board.score=Math.min(100,board.score+5);
  } catch {}
  const s=board.state();
  const ep=window.MHU.findEp(id);
  const st=starsFor(s, ep.level.moves);
  const Prog=P();
  const prev=Prog.stars[id]||0;
  Prog.stars[id]=Math.max(prev,st);
  Prog.totalStars=Object.values(Prog.stars).reduce((a,b)=>a+b,0);
  if(!Prog.letters.includes(ep.letter)) Prog.letters.push(ep.letter);
  const nid=window.MHU.nextId(id);
  if(nid && window.MHU.epIndex(nid)>window.MHU.epIndex(Prog.unlocked)) Prog.unlocked=nid;
  // 🧵 fili avanzano servendo
  if(ep.threads){ Prog.threads=Prog.threads||{}; ep.threads.forEach(t=>{ Prog.threads[t]=(Prog.threads[t]||0)+1; }); }
  // finale segreto live-check (solo canone)
  if(U().id==='pioggia' && Prog.totalStars>=60 && id===25 && !Prog.endings.includes('matcha-eterno')){
    Prog.endings.push('matcha-eterno');
  }
  persist(); renderMap(); renderDiary(); hud(); petalBurst(80);
  try { window.MHTama?.feed('stars', st); window.MHTama?.dailyChasen(); } catch {}
  const b=$('btn-story-after'); b.style.display='block';
  b.textContent=`📖 Tazza servita ${'★'.repeat(st)} → leggi / rileggi la memoria`;
  b.onclick=()=>openStory(id);
  toast(st===3?'Perfetta! Schiuma da manuale ✨ +lettera nel Diario':st===2?'Servita bene! +lettera nel Diario 📔':'Servita… freddina, ma la storia avanza ♥');
  if(navigator.vibrate) try{navigator.vibrate([40,40,80]);}catch{}
}
function loseLevel(id){
  try { window.MHEggs?.onLoss(id); } catch {}
  const b=$('btn-story-after'); b.style.display='none';
  toast('Tazza fredda… il cliente se ne va, ma Hana direbbe: riprova con più calma ♥ (nessun cuore perso extra)');
  // sblocca comunque scelta triste? consenti retry senza consumare? rimborsa 1 cuore
  window.MH.save.hearts=Math.min(5,window.MH.save.hearts+1); persist(); hud();
  setTimeout(()=>{ if(confirm('La tazza si è freddata. Riprovi subito?')) startLevel(id); else show('view-map'); },600);
}
/* --- minigiochi --- */
let miniKind='awa', miniBusy=false;
function openMini(kind){
  miniKind=kind;
  const names={awa:['🌀 Rito Awa — la schiuma','Ruota il dito in cerchio sul vassoio. Velocità media = schiuma perfetta. S = +4 mosse.'],latte:['🌸 Latte-Art del cuore','Disegna un cuore dentro la tazza senza uscire. S = CG romantica +4 mosse.'],respiro:['🌊 Respiro 4-7-8','Per ansia e cuori esauriti. Segui il cerchio. Ricompensa: +1 ♥ e +2 mosse.']};
  $('mini-kicker').textContent='rito · bonus per il prossimo livello';
  $('mini-title').textContent=names[kind][0]; $('mini-desc').textContent=names[kind][1];
  $('mini-status').textContent='Premi Inizia. Doppio-tap su Latte-Art per finire prima.';
  $('mini-modal').classList.add('open');
}
$('mini-start').onclick=async ()=>{
  if(miniBusy) return; miniBusy=true;
  $('mini-start').disabled=true;
  const res=await window.MHMinis.playMini(miniKind, $('mini-canvas'), $('mini-status'));
  pendingBonus+=res.bonus||0;
  if(res.heart) window.MH.save.hearts=Math.min(5,window.MH.save.hearts+1);
  try { if(res.grade==='S'||res.grade==='A') window.MHTama?.feed('mini'); } catch {}
  try { window.MHEggs?.onRite(res.grade); } catch {}
  persist(); hud(); miniBusy=false; $('mini-start').disabled=false;
  toast(`Rito ${res.grade}! Bonus accumulato: +${pendingBonus} mosse 🍵`);
};
$('mini-close').onclick=()=>$('mini-modal').classList.remove('open');
$('btn-minigame').onclick=()=>{ const ep=window.MHU.findEp(currentId); openMini(ep?ep.level.mini:'awa'); };
$('btn-breath-home').onclick=()=>openMini('respiro');
$('btn-booster-chasen').onclick=()=>{
  if(!board||board.over){toast('Avvia prima una tazza 🍵');return;}
  if(window.MH.save.boosters.chasen<=0){toast('Chasen esauriti — fai un Rito Awa per meritarne altri 🌀');return;}
  window.MH.save.boosters.chasen--; persist(); board.booster('chasen'); toast(`Chasen! Ne restano ${window.MH.save.boosters.chasen}`);
};
$('btn-booster-cup').onclick=()=>{
  if(!board||board.over){toast('Avvia prima una tazza 🍵');return;}
  if(window.MH.save.boosters.cup<=0){toast('Tazze magiche esaurite 🌈');return;}
  window.MH.save.boosters.cup--; persist(); board.booster('cup'); toast(`Tazza arcobaleno! Ne restano ${window.MH.save.boosters.cup}`);
};
/* --- oracolo / bottoni home --- */
function oracle(){
  const today=new Date().toISOString().slice(0,10);
  const idx=[...today].reduce((a,c)=>a+c.charCodeAt(0),0)%window.MHStory.ORACLES.length;
  const o=window.MHStory.ORACLES[idx];
  $('oracle-title').textContent=o.t; $('oracle-text').textContent=o.x+'\n\n— pescata del '+today+'. Torna domani per un altro responso.';
  $('oracle-modal').classList.add('open');
  if(window.MH.save.oracleDate!==today){ window.MH.save.oracleDate=today; pendingBonus+=1; persist(); toast('Goccia fortunata: +1 mossa per oggi 🍀'); }
}
$('btn-oracle').onclick=oracle; $('oracle-close').onclick=()=>$('oracle-modal').classList.remove('open');
$('btn-start').onclick=()=>{ renderMap(); show('view-map'); const u=P().unlocked; if(window.MHU.epIndex(u)<0){ toast('Saga completata in questo mondo — rigioca o attraversa la Fessura 🌫️'); } else openStory(u); };
$('btn-sound').onclick=()=>{ window.MH.save.settings.sound=!window.MH.save.settings.sound; persist(); applySettings(); };
$('btn-night').onclick=()=>{ window.MH.save.settings.night=!window.MH.save.settings.night; persist(); applySettings(); toast(window.MH.save.settings.night?'Modalità Notte Lo-Fi 🌙':'Modalità Carta di riso ☀️'); };
$('btn-reset').onclick=()=>{ if(confirm('Ricominciare tutta la saga? Lettere e stelle spariranno.')){ const keepName=window.MH.save.tama?.name||'Mugi'; const keepTama=confirm(`Tenere ${keepName} 🐾 con te? (Ok = sì)`); window.MH.save=window.MHSave.DEFAULT_SAVE(); if(keepTama) window.MH.save.tama.name=window.MHTama?window.MHTama.sanitizeName(keepName):keepName; persist(); window.MHU.applyTheme(); hud(); renderMap(); renderDiary(); renderUniverseCard(); applySettings(); toast('Nuovo inizio. Hana crede in te 🍵'); } };
document.querySelectorAll('.moodbtn').forEach(b=>b.onclick=()=>setMood(b.dataset.mood));
$('tama-card').onclick=(e)=>{ if(e.target.id==='btn-tama-name') return; try{window.MHTama?.cuddle();}catch{} };
$('tama-card').onkeydown=(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); try{window.MHTama?.cuddle();}catch{} } };
$('btn-tama-name').onclick=(e)=>{ e.stopPropagation(); try{window.MHTama?.rename();}catch{} };
$('story-continue').onclick=()=>{};
$('story-modal').addEventListener('click',(e)=>{ if(e.target.id==='story-modal') $('story-modal').classList.remove('open'); });

/* --- pioggia + petali pazzi ma cheap --- */
const rain=$('rain'), petals=$('petals');
function sizeCanvas(c){ c.width=innerWidth; c.height=innerHeight; }
addEventListener('resize',()=>{sizeCanvas(rain);sizeCanvas(petals);});
sizeCanvas(rain);sizeCanvas(petals);
let drops=Array.from({length:60},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,s:2+Math.random()*4}));
let lastRainTap=0;
(function rainLoop(){
  const ctx=rain.getContext('2d'); ctx.clearRect(0,0,rain.width,rain.height);
  const uni=document.body.dataset.universe;
  if(uni==='sakura'){
    // Sakura Eterna: petali che cadono piano, non pioggia
    ctx.fillStyle='rgba(232,106,146,.5)';
    drops.forEach(d=>{ ctx.beginPath(); ctx.ellipse(d.x,d.y,3.5,2.2,d.x*0.01,0,7); ctx.fill(); d.y+=d.s*0.5; d.x+=Math.sin(d.y*0.02)*0.8; if(d.y>innerHeight){d.y=-20;d.x=Math.random()*innerWidth;} });
  } else if(uni==='yokai'){
    // Notte Yokai: lucciole che salgono nella notte del mercato
    drops.forEach(d=>{ const tw=0.35+0.3*Math.abs(Math.sin(d.y*0.05)); ctx.fillStyle=`rgba(220,255,150,${tw})`; ctx.beginPath(); ctx.arc(d.x,d.y,1.8,0,7); ctx.fill(); d.y-=d.s*0.6; d.x+=Math.sin(d.y*0.03)*0.7; if(d.y<-20){d.y=innerHeight+20;d.x=Math.random()*innerWidth;} });
  } else if(uni==='estate'){
    // Marea d'Estate: spruzzi di mare che scintillano cadendo
    ctx.fillStyle='rgba(120,200,230,.55)';
    drops.forEach(d=>{ ctx.beginPath(); ctx.arc(d.x,d.y,1.6,0,7); ctx.fill(); d.y+=d.s*0.9; d.x+=Math.sin(d.y*0.025)*0.5; if(d.y>innerHeight){d.y=-20;d.x=Math.random()*innerWidth;} });
  } else {
    ctx.strokeStyle='rgba(122,158,126,.35)'; ctx.lineWidth=1.5;
    drops.forEach(d=>{ ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-2,d.y+12); ctx.stroke(); d.y+=d.s; d.x-=0.4; if(d.y>innerHeight){d.y=-20;d.x=Math.random()*innerWidth;} });
  }
  requestAnimationFrame(rainLoop);
})();
rain.addEventListener('pointerdown',(e)=>{
  window.MHAudio.rainTick();
  try { window.MHEggs?.onRainTap(); } catch {}
  const now=Date.now();
  if(now-lastRainTap>20000){ lastRainTap=now; pendingBonus+=1; toast('Goccia fortunata toccata! +1 mossa 🍀'); }
  else toast(document.body.dataset.universe==='sakura'?'un petalo ti ascolta 🌸':'plip… la pioggia ti ascolta 🌧️');
});
let parts=[];
function petalBurst(n){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const em=['🌸','🍃','✨','💧'];
  for(let i=0;i<n;i++) parts.push({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*0.35,e:em[i%em.length],vx:(Math.random()-.5)*4,vy:-2-Math.random()*3,l:90});
}
(function petalLoop(){
  const ctx=petals.getContext('2d'); ctx.clearRect(0,0,petals.width,petals.height);
  ctx.font='18px system-ui';
  parts=parts.filter(p=>p.l>0);
  parts.forEach(p=>{ ctx.fillText(p.e,p.x,p.y); p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.l--; });
  requestAnimationFrame(petalLoop);
})();

document.querySelectorAll('.tabbar button').forEach(b=>{ const h=b.onclick; b.onclick=()=>{ try{stopSpeech();}catch{} h&&h(); }; });

/* init */
window.MHU.ensureSave(); window.MHU.applyTheme();
applySettings(); hud(); renderMap(); renderDiary(); renderUniverseCard();
try { window.MHTama?.renderTama(); window.MHTama?.dailyChasen(); } catch {}
try { window.MHEggs?.init(); } catch {}
try { if('speechSynthesis' in window) speechSynthesis.getVoices(); } catch {}
setInterval(()=>{ window.MHSave.refillHearts(window.MH.save); persist(); hud(); },60000);
