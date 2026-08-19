/* I DUE LUMI — sistema dialoghi (macchina da scrivere, ritratti, scelte, skip) */
const DIALOGUE = {
  active:false,
  queue:[],
  qi:0,
  type:0,      /* caratteri mostrati */
  cur:'',
  choices:null,
  choice:0,
  onEnd:null,
  held:false,
  done:false,
  fast:0,

  open(script, opts){
    this.active = true;
    this.queue = script.slice();
    this.qi = 0;
    this.choices = null;
    this.onEnd = (opts && opts.onEnd) || null;
    this.held = false;
    this._start();
  },
  _start(){
    const p = this.queue[this.qi];
    if(!p){ this._end(); return; }
    const text = typeof p === 'string' ? p : p.text;
    /* pagina troppo lunga: spezza automaticamente */
    if(text && wrap(text, 48).length > 3){
      const chunkLines = [];
      const lines = wrap(text, 48);
      for(let i=0;i<lines.length;i+=3){
        chunkLines.push(lines.slice(i, i+3).join(' '));
      }
      const rest = this.queue.slice(this.qi+1);
      const head = chunkLines.map((t, i) => (typeof p === 'string') ? t : Object.assign({}, p, { text:t, choices:undefined, onEnd: i===chunkLines.length-1 ? p.onEnd : undefined }));
      this.queue = this.queue.slice(0, this.qi).concat(head, rest);
    }
    const p2 = this.queue[this.qi];
    const t2 = typeof p2 === 'string' ? p2 : p2.text;
    this.cur = t2 || '';
    this.type = 0;
    this.done = false;
    this.fast = 0;
    if(typeof p2 === 'object' && p2.choices){ this.choices = p2.choices; this.choice = 0; }
    else this.choices = null;
    if(typeof p2 === 'object' && p2.sfx) AUD.sfx(p2.sfx);
  },
  _end(){
    this.active = false;
    this.queue = [];
    if(this.onEnd) this.onEnd();
  },
  close(){
    this.active = false;
    this.queue = [];
    this.choices = null;
    this.onEnd = null;
  },
  _advance(){
    const p = this.queue[this.qi];
    if(typeof p === 'object' && p.choices && this.choices){
      /* scelta confermata */
      const c = this.choices[this.choice];
      const val = (typeof c === 'string') ? null : (c.goto);
      this.choices = null;
      this._runOnEnd(p);
      if(typeof c === 'object' && c.onEnd) c.onEnd();
      if(val === '__end'){
        this.qi = this.queue.length;
        this._end();
        return;
      }
      if(typeof val === 'number'){
        this.qi = val;
      } else {
        this.qi++;
      }
      this._start();
      return;
    }
    this._runOnEnd(p);
    this.qi++;
    this._start();
  },
  _runOnEnd(p){
    if(typeof p === 'string') return;
    if(p.set) p.set.forEach(f => G.flags[f] = true);
    if(p.onEnd) p.onEnd();
  },
  update(dt){
    if(!this.active) return;
    if(this.choices){ this._updateChoices(dt); return; }
    if(!this.done){
      this.fast = (INPUT.held('B')) ? this.fast + dt : 0;
      const rate = this.fast > 0.15 ? 60 : 34;
      this.type += dt * rate;
      if(this.type >= this.cur.length){
        this.type = this.cur.length;
        this.done = true;
        if(INPUT.pressed('A')) this._advance();
      }
    } else {
      if(INPUT.pressed('A') || INPUT.pressed('B')){
        if(INPUT.pressed('A')) this._advance();
      }
    }
    if(INPUT.pressed('start')){
      /* skip: salta alla fine della sequenza, MA mai oltre una scelta */
      let hasChoice = false;
      for(let i=this.qi;i<this.queue.length;i++){
        const pp = this.queue[i];
        if(typeof pp === 'object' && pp.choices){ hasChoice = true; break; }
      }
      if(!hasChoice){
        const end = this.onEnd;
        const run = [];
        for(let i=this.qi;i<this.queue.length;i++){ const p=this.queue[i]; if(typeof p==='object'&&p.onEnd) run.push(p.onEnd); if(typeof p==='object'&&p.set) run.push(()=>p.set.forEach(f=>G.flags[f]=true)); }
        this.active = false; this.queue=[]; this.choices=null;
        run.forEach(f=>f());
        if(end) end();
      }
    }
  },
  _updateChoices(dt){
    if(INPUT.pressed('up')){ this.choice = (this.choice + this.choices.length - 1) % this.choices.length; AUD.sfx('blip'); }
    if(INPUT.pressed('down')){ this.choice = (this.choice + 1) % this.choices.length; AUD.sfx('blip'); }
    if(INPUT.pressed('A')){ AUD.sfx('confirm'); this._advance(); }
    const p = this.queue[this.qi];
    const required = typeof p === 'object' && p.required;
    if(INPUT.pressed('B') && !required){ AUD.sfx('cancel'); this.choices=null; this.qi++; this._start(); }
  },

  draw(ctx){
    const hideIds = () => ['dlg-name','dlg-l0','dlg-l1','dlg-l2','dlg-caret','dlg-hint'].concat(
      [0,1,2,3,4,5,6,7].map(i=>'dlg-ch-'+i)
    ).forEach(id => TXT.hide(id));
    if(!this.active){ hideIds(); return; }
    const p = this.queue[this.qi];
    if(!p) return;
    const who = (typeof p === 'string') ? null : p.who;
    const text = this.cur;

    /* ritratto */
    if(who && PORT[who]){
      const pr = PORT[who];
      pxF(4, 8, 40, 40, 'ink');
      pxF(6, 10, 36, 36, pr.plate || 'honey');
      ctx.drawImage(pr, 7, 11);
      if(PORT[who].plate === 'slate'){ ctx.drawImage(pr, 7, 11); }
    }

    /* casella testo */
    const bx = 4, by = VH - 46, bw = VW - 8, bh = 42;
    boxF(bx, by, bw, bh, 'cream', 'ink');
    pxF(bx+2, by+2, bw-4, 2, 'butter');

    if(who){
      const NAME_COLORS = { milo:'honey', tito:'pumpkin', nonna:'rose', falco:'slate', signora:'gold', bambina:'pumpkin', contadina:'sage', elide:'mist', rammenta:'fog', custodeeco:'moss', focascena:'slate' };
      const name = (typeof p === 'string') ? '' : (p.name || (who.charAt(0).toUpperCase() + who.slice(1)));
      const col = NAME_COLORS[who] || 'ink';
      TXT.text('dlg-name', name.toUpperCase(), bx + 4, by - 11, { size: 8, color: col, weight: 'bold', letter: 1 });
    }

    /* testo con wrap */
    const maxw = 44;
    const lines = wrap(text, maxw);
    let y = by + 5;
    for(let i=0;i<Math.min(3, lines.length);i++){
      const shown = lines[i];
      let disp = shown;
      if(!this.done && i === lines.length-1){
        const start = i * maxw;
        disp = shown.slice(0, Math.max(0, Math.floor(this.type) - start));
      }
      TXT.text('dlg-l'+i, disp, bx + 5, y, { size: 7, color: 'ink', lh: 1.4 });
      y += 9;
    }
    for(let i=lines.length;i<3;i++) TXT.hide('dlg-l'+i);

    /* caret / freccia avanti */
    if(this.done && !this.choices){
      const blink = Math.floor(G.time*4) % 2 === 0;
      TXT.text('dlg-caret', '▼', bx + bw - 8, by + bh - 8, { size: 7, color: blink ? 'pumpkin' : 'rose' });
    }
    if(this.done) TXT.text('dlg-hint', 'Tieni B: veloce', bx + bw - 44, by + bh - 8, { size: 6, color: 'inkSoft' });
    else TXT.hide('dlg-hint');

    /* scelte */
    if(this.choices){
      const ch = this.choices;
      const chh = ch.length * 9 + 8;
      const cx = bx + 10, cy = by - chh - 4;
      boxF(cx, cy, 92, chh, 'butter', 'ink');
      ch.forEach((c, i) => {
        const label = typeof c === 'string' ? c : c.label;
        const y = cy + 5 + i*9;
        if(i === this.choice){
          TXT.text('dlg-ch-'+i, '► ' + label, cx + 2, y, { size: 7, color: 'ink', weight: 'bold' });
        } else {
          TXT.text('dlg-ch-'+i, label, cx + 9, y, { size: 7, color: 'inkSoft' });
        }
      });
    } else {
      for(let i=0;i<8;i++) TXT.hide('dlg-ch-'+i);
    }
  },
};

function wrap(str, maxw){
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for(const w of words){
    if((cur + ' ' + w).trim().length <= maxw){ cur = (cur ? cur + ' ' : '') + w; }
    else { if(cur) lines.push(cur); cur = w; }
  }
  if(cur) lines.push(cur);
  return lines;
}