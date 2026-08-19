/* I DUE LUMI — input: tastiera PC + pad/pulsanti touch (multi-touch) */
const INPUT = (() => {
  const keys = { left:false,right:false,up:false,down:false,A:false,B:false,start:false };
  const prev = { ...keys };
  let touchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  const KEYMAP = {
    ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
    a:'left', d:'right', w:'up', s:'down',
    z:'A', ' ':'A', x:'B', Shift:'B', Enter:'A',
    Escape:'start', p:'start',
  };

  const btn = (name, on) => { keys[name] = on; };

  function key(name, on){
    const v = KEYMAP[name];
    if(v) btn(v, on);
  }

  function frameBegin(){ /* niente: prev viene copiato alla fine del frame in frameEnd */ }
  function frameEnd(){
    for(const k in keys) prev[k] = keys[k];
  }
  function held(k){ return keys[k]; }
  function pressed(k){ return keys[k] && !prev[k]; }
  function released(k){ return !keys[k] && prev[k]; }
  function anyDir(){ return keys.left||keys.right||keys.up||keys.down; }
  function axis(){
    return { x:(keys.right?1:0)-(keys.left?1:0), y:(keys.down?1:0)-(keys.up?1:0) };
  }

  function attach(){
    window.addEventListener('keydown', e => {
      AUD.unlock();
      if(e.repeat) return;
      key(e.key, true);
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { key(e.key, false); });
    window.addEventListener('blur', () => { for(const k in keys) keys[k] = false; });

    const els = {
      up: document.getElementById('bUp'), down: document.getElementById('bDown'),
      left: document.getElementById('bLeft'), right: document.getElementById('bRight'),
      A: document.getElementById('bA'), B: document.getElementById('bB'),
      start: document.getElementById('bMenu'),
    };
    const vk = { up:'up', down:'down', left:'left', right:'right', A:'A', B:'B', start:'start' };

    if(touchDevice){
      const ctl = document.getElementById('controls');
      if(ctl) ctl.hidden = false;
      Object.keys(els).forEach(k => {
        const el = els[k];
        if(!el) return;
        const onDown = e => {
          e.preventDefault();
          AUD.unlock();
          el.classList.add('held');
          btn(vk[k], true);
          try { el.setPointerCapture(e.pointerId); } catch(_){}
        };
        const onUp = e => {
          e.preventDefault();
          el.classList.remove('held');
          btn(vk[k], false);
        };
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        el.addEventListener('pointerleave', onUp);
      });
    }
  }

  return { attach, held, pressed, released, frameBegin, frameEnd, axis, anyDir, isTouch: () => touchDevice };
})();