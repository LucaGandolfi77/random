/* I DUE LUMI — overlay di testo HTML/CSS con font normale.
   Il canvas resta per grafica/tile/sprite; tutto il testo (dialoghi,
   menu, HUD, titolo, finali) vive qui sopra, scalato con il canvas. */
const TXT = (() => {
  let root = null;
  let scale = 1;
  const FAMILY = "'Georgia', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";

  function ensureRoot(){
    if(root) return root;
    root = document.getElementById('overlay');
    if(!root){
      root = document.createElement('div');
      root.id = 'overlay';
      const stage = document.getElementById('stage') || document.body;
      stage.appendChild(root);
    }
    return root;
  }

  function el(id, tag){
    ensureRoot();
    let e = document.getElementById(id);
    if(!e){
      e = document.createElement(tag || 'div');
      e.id = id;
      root.appendChild(e);
    }
    return e;
  }

  function col(c){
    return (PAL && PAL[c]) ? PAL[c] : (c || 'ink');
  }

  function px(n){
    return Math.round(n * scale);
  }

  function setScale(s){
    scale = s || 1;
    const r = ensureRoot();
    if(r.style){
      r.style.width = px(240) + 'px';
      r.style.height = px(160) + 'px';
    }
  }

  function text(id, str, x, y, opts){
    opts = opts || {};
    const e = el(id);
    const size = px(opts.size || 7);
    e.textContent = (str == null) ? '' : String(str);
    e.style.left = px(x) + 'px';
    e.style.top = px(y) + 'px';
    e.style.fontSize = size + 'px';
    e.style.lineHeight = (opts.lh || 1.45) + '';
    e.style.color = col(opts.color);
    e.style.fontFamily = FAMILY;
    e.style.fontStyle = opts.italic ? 'italic' : 'normal';
    e.style.fontWeight = (opts.weight || 'normal') + '';
    e.style.letterSpacing = (opts.letter != null ? px(opts.letter) : 0) + 'px';
    e.style.textAlign = opts.align || 'left';
    e.style.whiteSpace = opts.pre ? 'pre' : 'normal';
    e.style.overflowWrap = 'break-word';
    e.style.display = (String(str) === '' || opts.hidden) ? 'none' : 'block';
    if(opts.width != null) e.style.width = px(opts.width) + 'px';
    if(opts.opacity != null) e.style.opacity = opts.opacity;
    return e;
  }

  function cls(id, classes){
    const e = el(id);
    e.className = classes || '';
    return e;
  }

  function show(id){
    const e = el(id);
    e.style.display = 'block';
    return e;
  }
  function hide(id){
    const e = el(id);
    e.style.display = 'none';
    return e;
  }
  function hideAll(){
    if(!root) return;
    const kids = root.children;
    for(let i = 0; i < kids.length; i++) kids[i].style.display = 'none';
  }

  return { setScale, text, show, hide, el, cls, px, col, hideAll };
})();

if(window.fitCanvas) fitCanvas();