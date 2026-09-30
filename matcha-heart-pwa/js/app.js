/* app.js — router, livelli, diario, oracolo, pioggia */
(function () {
'use strict';
window.MH = { save: window.MHSave.refillHearts(window.MHSave.loadSave()) };
function persist(){ window.MHSave.writeSave(window.MH.save); }
/* Il board attivo è esposto in sola lettura: serve al debug in console e
   permette a test/flow.test.mjs di arrivare davvero alla fine di una partita. */
Object.defineProperty(window.MH, 'board', { get(){ return board; }, enumerable: true });
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2400); }
window.MHToast = toast;
window.MHCombo = (chain) => {
  const c=document.getElementById('combo');
  const words={1:'',2:'doppio sorso! 🍵',3:'BATTITO! 💓',4:'MATCHA IN FIAMME! 🔥',5:'ETERNO! ✨'};
  if(chain>=2){ c.textContent=(words[Math.min(5,chain)]||'combo x'+chain); c.classList.remove('show'); void c.offsetWidth; c.classList.add('show'); petalBurst(20*chain); }
};
const $ = (id)=>document.getElementById(id);
let currentId = 1, board = null;
/* B9: il bonus pendente vive nel save, non in una variabile di modulo —
   chiudere la scheda non deve far perdere il +1 mossa dell'oracolo o della
   pioggia toccata (incoerente con bonusMoves, che era già persistito). */
const pending = () => (window.MH.save.pendingMoves || 0);
const setPending = (v) => { window.MH.save.pendingMoves = Math.max(0, Math.round(v) || 0); };

/* --- dialoghi: focus trap, ripristino del focus, Escape --- */
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
let openDialog = null, returnFocusTo = null;
function openModal(id){
  const m=$(id); if(!m) return;
  returnFocusTo = document.activeElement;
  m.classList.add('open');
  openDialog = m;
  const first = m.querySelector(FOCUSABLE);
  if(first) first.focus({preventScroll:true});
  else if(!m.hasAttribute('tabindex')) { m.tabIndex = -1; m.focus({preventScroll:true}); }
}
function closeModal(id){
  const m=$(id)||openDialog; if(!m) return;
  m.classList.remove('open');
  if(openDialog===m) openDialog=null;
  const back=returnFocusTo; returnFocusTo=null;
  if(back && back.focus) back.focus({preventScroll:true});
}
document.addEventListener('keydown',(e)=>{
  if(!openDialog) return;
  if(e.key==='Escape'){ e.preventDefault(); if(openDialog.id==='mini-modal') closeMini(); else closeModal(); return; }
  if(e.key!=='Tab') return;
  const f=[...openDialog.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null||x===document.activeElement);
  if(!f.length) return;
  const first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
});
function announce(msg){ const el=$('sr-status'); if(el) el.textContent=msg; }
window.MHOpenModal = openModal;   // eggs.js apre l'oracolo di mezzanotte
/* --- multiverso: U() = universo attivo, P() = progressi universo attivo --- */
function U(){ return window.MHU.active(); }
function P(uid){ return window.MHU.prog(uid); }

function applySettings(){
  document.body.classList.toggle('night', !!window.MH.save.settings.night);
  const on = !!window.MH.save.settings.sound;
  $('btn-sound').textContent = on ? '🔔' : '🔕';
  $('btn-sound').setAttribute('aria-pressed', String(on));
  const night = !!window.MH.save.settings.night;
  $('btn-night').setAttribute('aria-pressed', String(night));
}
let lastHearts = null, lastStars = null;
function hud(){
  const h=window.MH.save.hearts, st=P().totalStars;
  $('hud-hearts').textContent = '♥ '+h;
  $('hud-stars').textContent = '★ '+st;
  if(lastHearts!==null && lastHearts!==h) announce(h>0?`${h} cuori rimasti`:'Nessun cuore: fai un Respiro 4-7-8 per ricaricarne uno');
  if(lastStars!==null && lastStars!==st) announce(`Totale stelle: ${st}`);
  lastHearts=h; lastStars=st;
  const done = Object.keys(P().stars).length;
  $('home-progress').textContent = `${done} / ${U().story.length} episodi · ${P().totalStars} ★`;
  $('home-tea').style.width = Math.round(done/U().story.length*100)+'%';
  try { window.MHTama?.renderTama(); } catch {}
  try { window.MHEggs?.tick(); } catch {}
  renderMoodWeek();
  const today=new Date().toISOString().slice(0,10);
  document.querySelectorAll('.moodbtn').forEach(b=>{
    const on=window.MH.save.mood?.value===b.dataset.mood && window.MH.save.mood?.date===today;
    b.classList.toggle('on', !!on);
    b.setAttribute('aria-pressed', String(!!on));
  });
}
function show(tab){
  try{ abortMini(); }catch{}          // cambiare vista durante un rito lo annulla
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(tab).classList.add('active');
  document.querySelectorAll('.tabbar button').forEach(b=>{
    const on = b.dataset.tab===tab;
    b.classList.toggle('on', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
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

/* Una lettera col Quaderno è composta da più blocchi (testo + postscript):
   il karaoke deve seguirli tutti, nell'ordine in cui vengono letti.
   `pairs` è [{el, text}]; se manca, si usa il solo .letter-text come prima. */
function speakLetter(pairs, btn, fallbackText){
  if(!('speechSynthesis' in window)){ toast('Questo browser non ha voce — leggila piano tu 💌'); return; }
  if(window.MH.save.settings.sound===false){ toast('Audio spento 🔕 — riattivalo per ascoltare Hana'); return; }
  stopSpeech();

  const blocks = (pairs || []).filter(p => p && p.el && p.text);
  if(!blocks.length) return;
  /* il testo pronunciato è esattamente i blocchi uniti da uno spazio:
     così l'offset di onboundary combacia con la somma delle lunghezze */
  const spoken = blocks.map(p => p.text).join(' ');

  const u = new SpeechSynthesisUtterance(spoken);
  u.lang='it-IT'; u.rate=0.92; u.pitch=1.1;
  try {
    const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('it'));
    const fem=vs.find(v=>/female|donna|alice|sara|chiara|elisa|federica/i.test(v.name))||vs[0];
    if(fem) u.voice=fem;
  } catch {}

  const spans=[];
  for(const b of blocks){
    b.el.innerHTML='';
    for(const w of b.text.split(/\s+/).filter(Boolean)){
      const s=document.createElement('span');
      s.textContent=w;                       /* textContent, mai innerHTML: niente XSS */
      b.el.appendChild(s); spans.push(s);
    }
    b.el.appendChild(document.createTextNode(' '));
  }

  let wi=0;
  u.onboundary=(e)=>{
    if(typeof e.charIndex!=='number') return;
    let acc=0;
    for(let i=0;i<spans.length;i++){ acc+=spans[i].textContent.length+1; if(acc>e.charIndex){ wi=i; break; } }
    spans.forEach(s=>s.classList.remove('spoken'));
    if(spans[wi]) spans[wi].classList.add('spoken');
  };
  u.onend=()=>{ spans.forEach(s=>s.classList.remove('spoken')); if(btn) btn.textContent='🔈 Ascoltami'; };
  btn.textContent='⏹ Ferma';
  btn.onclick=()=>{ stopSpeech(); btn.textContent='🔈 Ascoltami'; btn.onclick=()=>speakLetter(pairs, btn, fallbackText); };
  speechSynthesis.speak(u);
  void fallbackText;
}
/* --- 📬 IL QUADERNO: la lettera che ricorda la tua scelta ---
 * "quaderno" non è un'invenzione: è già nel canon, è il taccuino di Yuki e
 * quello che Aoi divide con Hana in Sakura Eterna. Qui diventa l'archivio. */
const Q = () => window.MHQuaderno;
let qCache = { uid: null, idx: null };
function letterIdx(){
  const u=U();
  if(qCache.uid!==u.id) qCache={ uid:u.id, idx:Q().letterIndex(u) };
  return qCache.idx;
}
const el=(tag,cls,txt)=>{ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; };

/* Una card del Diario. `text` è la lettera così com'è stata ricevuta:
 * può contenere il postscript separato da Q().PS_SEP. */
function renderLetterCard(text){
  const q=Q(), div=el('div','diary-item letter-item');
  const ep=q.letterOrigin(text, letterIdx());
  const taken=ep ? P().choices[ep.id] : null;

  if(ep){
    div.appendChild(el('div','letter-head', ep.kicker));
    const label=q.choiceLabel(ep,taken);
    if(label) div.appendChild(el('div','letter-choice','Hai scelto: '+label));
  }

  const parts=text.split(q.PS_SEP);
  const baseEl=el('p','letter-text');
  baseEl.textContent='💌 '+parts[0];
  div.appendChild(baseEl);
  const blocks=[{ el:baseEl, text:parts[0] }];

  if(parts[1]){
    const psEl=el('p','letter-ps', parts[1]);
    div.appendChild(psEl);
    blocks.push({ el:psEl, text:parts[1] });
  }

  /* l'altra strada: cosa Hana avrebbe scritto se avessi scelto l'opposto.
     Niente "rimpianti": in un gioco sul lutto non è la parola giusta. */
  if(ep && taken){
    const alts=q.alternatives(ep,taken).filter(a=>q.postscript(ep,a));
    if(alts.length){
      const wrap=el('div','letter-alt');
      const toggle=el('button','btn ghost small other-btn');
      toggle.setAttribute('aria-expanded','false');
      toggle.textContent='▸ l\'altra strada';
      const box=el('div','letter-altbox');
      box.hidden=true;
      for(const a of alts){
        box.appendChild(el('div','letter-althead', q.pathLabel(a)));
        box.appendChild(el('div','letter-altps', q.postscript(ep,a)));
      }
      toggle.onclick=()=>{
        const open=toggle.getAttribute('aria-expanded')==='true';
        toggle.setAttribute('aria-expanded', String(!open));
        box.hidden=open;
        toggle.textContent = open ? '▸ l\'altra strada' : '▾ l\'altra strada';
      };
      wrap.appendChild(toggle); wrap.appendChild(box);
      div.appendChild(wrap);
    }
  }

  const b=el('button','btn ghost small listenbtn');
  b.textContent='🔈 Ascoltami';
  b.onclick=()=>speakLetter(blocks, b);
  div.appendChild(b);
  return div;
}

/* L'archivio: per ogni capitolo, le strade percorse e quelle no. */
function renderQuaderno(){
  const q=Q(), box=$('quaderno-list');
  const u=U(), prog=P();
  box.innerHTML='';

  const byEp=letterIdx();
  const chs=u.chapters.map(ch=>({
    /* i capitoli canonici hanno n numerico (→ "Cap.2"), quelli degli altri
       mondi hanno già il loro prefisso ("S1", "Y1", "E1") */
    title: (typeof ch.n==='number' ? 'Cap.'+ch.n : ch.n)+' · '+ch.title,
    rows: ch.eps.map(id=>byEp.get(q.baseLetter(u.story.find(e=>e.id===id)||{})) || null)
                    .filter(Boolean)
                    .map(ep=>({ ep, taken: prog.choices[ep.id] }))
                    .filter(r=>r.taken),
  })).filter(c=>c.rows.length);

  const scelte=Object.keys(prog.choices).length;
  const ricordi=prog.letters.length;
  $('quaderno-count').textContent = scelte
    ? `${scelte} scelte · ${ricordi} ${ricordi===1?'ricordo':'ricordi'}`
    : 'Nessuna scelta ancora: le pagine si scrivono servendo.';

  if(!chs.length){
    box.appendChild(el('p','meter','Il quaderno è ancora bianco. Servi la prima tazza: qui comparirà la scelta che hai fatto, e la strada che non hai preso.'));
    return;
  }

  for(const c of chs){
    const card=el('div','diary-item');
    card.appendChild(el('b',null,c.title));
    for(const {ep,taken} of c.rows){
      const line=el('div','q-row');
      line.appendChild(el('span','q-mark','●'));
      line.appendChild(el('span','q-path', q.pathLabel(taken)));
      const lbl=q.choiceLabel(ep,taken);
      if(lbl) line.appendChild(el('span','q-label', lbl));
      card.appendChild(line);
      if(q.postscript(ep,taken)) card.appendChild(qStesura(q.postscript(ep,taken),'la tua stesura'));
      for(const a of q.alternatives(ep,taken)){
        const alt=el('div','q-row q-alt');
        alt.appendChild(el('span','q-mark','○'));
        alt.appendChild(el('span','q-path', q.pathLabel(a)));
        const altLbl=q.choiceLabel(ep,a);
        if(altLbl) alt.appendChild(el('span','q-label', altLbl));
        const altPs=q.postscript(ep,a);
        if(altPs) card.appendChild(qStesura(altPs,'la seconda stesura'));
        else alt.appendChild(el('span','q-badge q-none','—'));
        card.appendChild(alt);
      }
    }
    box.appendChild(card);
  }
}

/* Una riga del Quaderno che apre la stesura di un postscript. Hana scriveva
   anche per la strada non percorsa: dichiararlo e non lasciarlo leggere è una
   promessa a metà, e il Quaderno esiste per tenere le promesse. Non è un
   rimpianto — la parola non compare da nessuna parte, e il bottone si chiama
   "stesura", non "peccato" né "colpa". */
function qStesura(testo, etichetta){
  const t=el('button','q-badge q-second');
  t.type='button';
  t.setAttribute('aria-expanded','false');
  t.textContent='▸ '+etichetta;
  const box=el('div','q-secondbox');
  box.hidden=true;
  box.appendChild(el('div','q-secondps', testo));
  t.onclick=()=>{
    const open=t.getAttribute('aria-expanded')==='true';
    t.setAttribute('aria-expanded', String(!open));
    box.hidden=open;
    t.textContent=(open?'▸ ':'▾ ')+etichetta;
  };
  const frag=el('div','q-stesura');
  frag.appendChild(t); frag.appendChild(box);
  return frag;
}
function openQuaderno(){ renderQuaderno(); openModal('quaderno-modal'); }

function renderDiary(){
  const d=$('diary'); const L=P().letters;  const E=P().endings;
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
  L.forEach((x)=>d.appendChild(renderLetterCard(x)));
  E.forEach((e)=>{ const en=U().endings[e]; if(!en) return; const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#e9c46a'; div.innerHTML=`🏁 <b>${en.title}</b><br>${en.text.slice(0,160)}…`; d.appendChild(div); });
  (window.MH.save.stats.badges||[]).forEach((b)=>{ const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#9b7ed9'; div.textContent='🏅 '+b; d.appendChild(div); });
  const t=window.MH.save.tama;
  if(t){ const div=document.createElement('div'); div.className='diary-item'; div.style.borderColor='#f4aebe'; div.textContent=`🐾 ${t.name} ha ${t.xp} xp · ultimi 7 umori: ${(window.MH.save.mood.log||[]).slice(-7).map(m=>m==='bene'?'🌸':m==='ansiosa'?'😰':'🥺').join(' ')||'—'}`; d.appendChild(div); }
}
window.MHRenderDiary = renderDiary;   // usato da eggs.js per rinfrescare i distintivi
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
        c.textContent=`🍵 Vai a servire la tazza (${ep.level.moves+ (window.MH.save.bonusMoves||0) + pending()} mosse)`;
        toast(ch.effect==='rabbia'?'Scelta rabbiosa: più ombre nere sul vassoio 🖤':ch.effect==='dolcezza'?'Scelta dolce: il tè profuma di sakura 🌸':'Scelta coraggiosa: il chasen smette di tremare 💪');
      }
      persist();
    };
    return b;
  };
  box.appendChild(mk(ep.choiceA)); box.appendChild(mk(ep.choiceB));
  /* B8: l'handler era impostato solo nel ramo `else`, quindi su un episodio con
     finaleNote restava quello dell'episodio precedente (o il no-op iniziale):
     cliccando "Vai a servire" si partiva dal livello sbagliato. */
  $('story-continue').onclick=()=>{ closeModal('story-modal'); startLevel(id); };
  if(ep.finaleNote||ep.id===25||ep.id===30){
    const note=document.createElement('p'); note.className='meter';
    note.textContent=ep.finaleNote||(ep.id===25?'Ultima scelta del Cap.5: RESTO o LASCIO ANDARE. Il segreto MATCHA ETERNO si svela nel Diario con 60★. Poi ti aspetta il Cap.6!':'Ultima scelta: RADICI E ALI, in due versioni. Qualunque tu scelga, hai preso tutto. 🌳');
    box.appendChild(note);
  }
  openModal('story-modal');
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
    window.MHU.completeUniverse(Prog);
  }
  else if(U().id==='pioggia'){
    // canone: id numerici → sblocca il capitolo successivo
    if(key.startsWith('finale-radici')) window.MHU.advanceUnlocked(Prog,'pioggia',31);
    else if(key!=='matcha-eterno') window.MHU.advanceUnlocked(Prog,'pioggia',26);
  }
  else {
    // 🌙 Yokai / 🌊 Estate: il finale chiude il mondo (id stringa, mai numerici)
    window.MHU.completeUniverse(Prog);
  }
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
  const extra=(window.MH.save.bonusMoves||0)+pending(); setPending(0); window.MH.save.bonusMoves=0;
  const cfg={ moves: ep.level.moves+extra, targetTile: ep.level.targetTile, targetCount: ep.level.targetCount, biasTile: bias,
    mechanic: ep.level.mechanic || U().mechanic, bloomRate: U().bloomRate, skin: U().skin,
    quota: ep.level.quota || 0,
    onUpdate: updateHUD, onWin: ()=>winLevel(id), onLose: ()=>loseLevel(id) };
  $('level-label').textContent=ep.kicker;
  if(board) board.destroy();          // B3: libera i listener del livello precedente
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
/* 📬 L'unico punto in cui una lettera entra nel Diario.
   La scelta si risolve QUI, al momento dello sblocco: la lettera che ricevi
   resta quella, rileggerla non la riscrive. Il Quaderno (js/quaderno.js)
   aggiunge il postscript se quell'episodio ne ha uno per la tua scelta. */
function pushLetter(ep, Prog){
  const letter=window.MHQuaderno.resolveLetter(ep, Prog.choices[ep.id]);
  if(letter && !Prog.letters.includes(letter)){ Prog.letters.push(letter); return true; }
  return false;
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
  pushLetter(ep, Prog);
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
  const st=board?board.state():{collected:0,need:0,quota:0};
  /* B12: con quota 55-90% si poteva aver raccolto tutto e perdere senza
     alcun segnale del perché. Ora il messaggio distingue i due casi e il
     bersaglio centrato vale comunque 1★ + lettera (filosofia cozy). */
  const targetHit = st.collected >= st.need && st.need > 0;
  if(targetHit) grantProgress(id, 1, 'Tazza bassa ma piena');
  const msg = targetHit
    ? `Tazza bassa ma piena: ${st.collected}/${st.need} 🍵 e schiuma al ${st.score}% (ne serviva ${st.quota}%). 1★ e lettera lo stesso.`
    : 'Tazza fredda… il cliente se ne va, ma Hana direbbe: riprova con più calma ♥ (nessun cuore perso extra)';
  toast(msg);
  window.MH.save.hearts=Math.min(5,window.MH.save.hearts+1); persist(); hud();
  setTimeout(()=>{ if(confirm(targetHit?'Bersaglio centrato, schiuma bassa. Riprovi?':'La tazza si è freddata. Riprovi subito?')) startLevel(id); else show('view-map'); },600);
}
/* B12: estratto da winLevel — bersaglio centrato ma schiuma sotto quota
   comunque una stella e una lettera, così la progresse non si perde mai. */
function grantProgress(id, stars, reason){
  const ep=window.MHU.findEp(id); if(!ep) return;
  const Prog=P();
  const prev=Prog.stars[id]||0;
  Prog.stars[id]=Math.max(prev,stars);
  Prog.totalStars=Object.values(Prog.stars).reduce((a,b)=>a+b,0);
  pushLetter(ep, Prog);
  const nid=window.MHU.nextId(id);
  if(nid && window.MHU.epIndex(nid)>window.MHU.epIndex(Prog.unlocked)) Prog.unlocked=nid;
  if(ep.threads){ Prog.threads=Prog.threads||{}; ep.threads.forEach(t=>{ Prog.threads[t]=(Prog.threads[t]||0)+1; }); }
  persist(); renderMap(); renderDiary(); hud();
  try { window.MHTama?.feed('stars', stars); } catch {}
  const b=$('btn-story-after'); if(b){ b.style.display='block'; b.textContent=`📖 ${reason} ${'★'.repeat(stars)} → rileggi la memoria`; b.onclick=()=>openStory(id); }
}
/* --- minigiochi --- */
let miniKind='awa', miniBusy=false, miniAbort=null;
function openMini(kind){
  abortMini();
  miniKind=kind;
  const names={awa:['🌀 Rito Awa — la schiuma','Ruota il dito in cerchio sul vassoio. Velocità media = schiuma perfetta. S = +4 mosse.'],latte:['🌸 Latte-Art del cuore','Disegna un cuore dentro la tazza senza uscire. S = CG romantica +4 mosse.'],respiro:['🌊 Respiro 4-7-8','Per ansia e cuori esauriti. Segui il cerchio. Ricompensa: +1 ♥ e +2 mosse.']};
  const n=names[kind]||names.awa;
  $('mini-kicker').textContent='rito · bonus per il prossimo livello';
  $('mini-title').textContent=n[0]; $('mini-desc').textContent=n[1];
  $('mini-status').textContent='Premi Inizia. Doppio-tap su Latte-Art per finire prima.';
  openModal('mini-modal');
}
/* B5: chiudere o cambiare vista durante un rito lo annulla: niente +mosse
   a metà, niente rAF orfano, e miniBusy torna subito utilizzabile. */
function abortMini(){
  if(!miniAbort) return;
  miniAbort.abort(); miniAbort=null; miniBusy=false;
  $('mini-start').disabled=false;
}
function closeMini(){ abortMini(); closeModal('mini-modal'); }
$('mini-start').onclick=async ()=>{
  if(miniBusy) return;
  miniBusy=true; miniAbort=new AbortController();
  $('mini-start').disabled=true;
  try {
    const res=await window.MHMinis.playMini(miniKind, $('mini-canvas'), $('mini-status'), miniAbort.signal);
    if(res.aborted) return;
    setPending(pending() + (res.bonus||0));
    if(res.heart) window.MH.save.hearts=Math.min(5,window.MH.save.hearts+1);
    try { if(res.grade==='S'||res.grade==='A') window.MHTama?.feed('mini'); } catch {}
    try { window.MHEggs?.onRite(res.grade); } catch {}
    persist(); hud();
    toast(`Rito ${res.grade}! Bonus accumulato: +${pending()} mosse 🍵`);
  } catch {
    toast('Il rito si è rovesciato 🍵 nessun bonus. Riprova pure.');
  } finally {
    miniBusy=false; miniAbort=null; $('mini-start').disabled=false;
  }
};
$('mini-close').onclick=closeMini;
$('mini-modal').addEventListener('click',(e)=>{ if(e.target.id==='mini-modal') closeMini(); });
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
  openModal('oracle-modal');
  if(window.MH.save.oracleDate!==today){ window.MH.save.oracleDate=today; setPending(pending()+1); persist(); toast('Goccia fortunata: +1 mossa per oggi 🍀'); }
}
$('btn-oracle').onclick=oracle; $('oracle-close').onclick=()=>closeModal('oracle-modal');
$('btn-quaderno').onclick=openQuaderno; $('quaderno-close').onclick=()=>closeModal('quaderno-modal');
$('quaderno-modal').addEventListener('click',(e)=>{ if(e.target.id==='quaderno-modal') closeModal('quaderno-modal'); });
$('btn-start').onclick=()=>{ renderMap(); show('view-map'); const u=P().unlocked; if(window.MHU.epIndex(u)<0){ toast('Saga completata in questo mondo — rigioca o attraversa la Fessura 🌫️'); } else openStory(u); };
$('btn-sound').onclick=()=>{ window.MH.save.settings.sound=!window.MH.save.settings.sound; persist(); applySettings(); };
$('btn-night').onclick=()=>{ window.MH.save.settings.night=!window.MH.save.settings.night; persist(); applySettings(); toast(window.MH.save.settings.night?'Modalità Notte Lo-Fi 🌙':'Modalità Carta di riso ☀️'); };
$('btn-reset').onclick=()=>{ if(confirm('Ricominciare tutta la saga? Lettere e stelle spariranno.')){ const keepName=window.MH.save.tama?.name||'Mugi'; const keepTama=confirm(`Tenere ${keepName} 🐾 con te? (Ok = sì)`); window.MH.save=window.MHSave.DEFAULT_SAVE(); if(keepTama) window.MH.save.tama.name=window.MHTama?window.MHTama.sanitizeName(keepName):keepName; persist(); window.MHU.applyTheme(); hud(); renderMap(); renderDiary(); renderUniverseCard(); applySettings(); toast('Nuovo inizio. Hana crede in te 🍵'); } };
document.querySelectorAll('.moodbtn').forEach(b=>b.onclick=()=>setMood(b.dataset.mood));
/* niente più role=button che contiene un button: due controlli fratelli veri */
$('btn-tama-cuddle').onclick=()=>{ try{window.MHTama?.cuddle();}catch{} };
$('btn-tama-name').onclick=()=>{ try{window.MHTama?.rename();}catch{} };
$('story-continue').onclick=()=>{};
$('story-modal').addEventListener('click',(e)=>{ if(e.target.id==='story-modal') closeModal('story-modal'); });

/* --- pioggia + petali pazzi ma cheap --- */
const rain=$('rain'), petals=$('petals');
function sizeCanvas(c){ c.width=innerWidth; c.height=innerHeight; }
/* B24: su iOS il resize scatta a ogni collapse della URL bar e azzerava il
   canvas (e i drop) 60 volte al secondo durante lo scroll. Ora è debounced
   e, se la dimensione non cambia davvero, non fa nulla. */
let resizeTimer = 0, lastW = 0, lastH = 0;
function onResize(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const w = innerWidth, h = innerHeight;
    if (w === lastW && h === lastH) return;
    const sx = lastW ? w / lastW : 1, sy = lastH ? h / lastH : 1;
    lastW = w; lastH = h;
    sizeCanvas(rain); sizeCanvas(petals);
    drops.forEach(d => { d.x *= sx; d.y *= sy; if (d.x > w) d.x = Math.random() * w; if (d.y > h) d.y = -20; });
    parts.length = 0;
  }, 150);
}
addEventListener('resize', onResize, { passive: true });
addEventListener('orientationchange', onResize, { passive: true });
lastW = innerWidth; lastH = innerHeight;
sizeCanvas(rain); sizeCanvas(petals);
let drops=Array.from({length:60},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,s:2+Math.random()*4}));
let parts = [];
let lastRainTap=0;
/* B6: su mobile .app copriva l'intera viewport, quindi il canvas #rain non
   riceveva mai il tap (+1 mossa irraggiungibile, nonostante il testo in home
   lo promettesse). Ora il tap passa dai vuoti di .app (pointer-events:none
   con i sottoalberi interattivi riabilitati) e c'è anche un bottone esplicito. */
function rainTap(){
  try { window.MHAudio.rainTick(); } catch {}
  try { window.MHEggs?.onRainTap(); } catch {}
  const now=Date.now();
  if(now-lastRainTap>20000){
    lastRainTap=now; setPending(pending()+1); persist();
    toast('Goccia fortunata toccata! +1 mossa 🍀');
  } else {
    toast(document.body.dataset.universe==='sakura'?'un petalo ti ascolta 🌸':'plip… la pioggia ti ascolta 🌧️');
  }
}
rain.addEventListener('pointerdown', rainTap);
$('btn-rain')?.addEventListener('click', rainTap);
/* B22: due requestAnimationFrame perpetui su canvas full-viewport, anche a tab
   nascosta e sotto prefers-reduced-motion. Ora: un solo scheduler, fermo a
   30fps quando la scheda non è visibile, e del tutto disattivato su
   reduced-motion (il CSS nascole già i canvas). */
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const ambience = { rain: !motionQuery.matches, petals: !motionQuery.matches };
const rainCtx = rain.getContext('2d'), petalCtx = petals.getContext('2d');
function petalBurst(n){
  if(!ambience.petals) return;
  const em=['🌸','🍃','✨','💧'];
  for(let i=0;i<n;i++) parts.push({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight*0.35,e:em[i%em.length],vx:(Math.random()-.5)*4,vy:-2-Math.random()*3,l:90});
}
function stepRain(){
  const ctx=rainCtx; ctx.clearRect(0,0,rain.width,rain.height);
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
}
function stepPetals(){
  const ctx=petalCtx; ctx.clearRect(0,0,petals.width,petals.height);
  if(!parts.length) return;
  ctx.font='18px system-ui';
  parts=parts.filter(p=>p.l>0);
  parts.forEach(p=>{ ctx.fillText(p.e,p.x,p.y); p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.l--; });
}
let lastFrame = 0;
function ambienceFrame(now){
  requestAnimationFrame(ambienceFrame);
  if(document.hidden) return;                       // niente lavoro a tab nascosta
  if(now - lastFrame < 32) return;                  // ~30fps basta per pioggia e petali
  lastFrame = now;
  if(ambience.rain) stepRain();
  if(ambience.petals) stepPetals();
}
motionQuery.addEventListener?.('change',(e)=>{ ambience.rain=!e.matches; ambience.petals=!e.matches; });
requestAnimationFrame(ambienceFrame);

document.querySelectorAll('.tabbar button').forEach(b=>{ const h=b.onclick; b.onclick=()=>{ try{stopSpeech();}catch{} h&&h(); }; });

/* init */
window.MHU.ensureSave(); window.MHU.applyTheme();
applySettings(); hud(); renderMap(); renderDiary(); renderUniverseCard();
try { window.MHTama?.renderTama(); window.MHTama?.dailyChasen(); } catch {}
try { window.MHEggs?.init(); } catch {}
try { if('speechSynthesis' in window) speechSynthesis.getVoices(); } catch {}
/* deep link: ?view=…&mini=… usati dagli shortcut del manifest */
try {
  const q = new URLSearchParams(location.search);
  const v = q.get('view');
  if (v && document.getElementById(v)) show(v);
  const mini = q.get('mini');
  if (mini && document.getElementById('mini-modal')) openMini(mini);
} catch {}
/* refill cuori: pausa la scheda, riprende e aggancia al rientro dalla visibilità */
setInterval(()=>{ if(document.hidden) return; window.MHSave.refillHearts(window.MH.save); persist(); hud(); },60000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ window.MHSave.refillHearts(window.MH.save); persist(); hud(); } });
})();
