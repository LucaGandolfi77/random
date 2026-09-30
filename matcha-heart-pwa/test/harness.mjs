/* harness.mjs — DOM minimale + caricamento dei veri script di gioco in Node.
   Nessuna dipendenza: esegue js/*.js in un contesto vm con window/document finiti,
   così i test girano sul codice che l'utente scarica, non su una copia. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── canvas 2D finto ────────────────────────────────────── */
function fakeCtx() {
  const noop = () => {};
  return new Proxy({
    measureText: (t) => ({ width: (t || '').length * 8 }),
    canvas: { width: 300, height: 150 },
  }, {
    get: (t, k) => (k in t ? t[k] : noop),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

/* ── elemente finto ─────────────────────────────────────── */
/* Nodo di testo: foglia, partecipa al textContent del genitore. */
class TextNode {
  constructor(text) { this.nodeValue = String(text); this.children = []; this.parentNode = null; }
  get textContent() { return this.nodeValue; }
  set textContent(v) { this.nodeValue = String(v); }
}

let uid = 0;
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this._id = '';
    this._attrs = {};
    this.children = [];
    this.parentNode = null;
    /* dataset sincronizzato con gli attributi: data-mood ↔ dataset.mood */
    const self = this;
    this.dataset = new Proxy({}, {
      get: (t, k) => (typeof k === 'string' ? self.getAttribute('data-' + kebab(k)) : undefined),
      set: (t, k, v) => { self.setAttribute('data-' + kebab(k), v); return true; },
      has: (t, k) => typeof k === 'string' && self.hasAttribute('data-' + kebab(k)),
      ownKeys: () => Object.keys(self._attrs).filter((a) => a.startsWith('data-')).map((a) => camel(a.slice(5))),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
    this.style = new Proxy({}, { get: (t, k) => t[k] || '', set: (t, k, v) => { t[k] = v; return true; } });
    this._classes = new Set();
    this._attrs = {};
    this._text = '';
    this._listeners = new Map();
    this.tabIndex = -1;
    this.focused = false;
    this.offsetParent = {};
    this._uid = ++uid;
    this.classList = {
      add: (...c) => c.forEach((x) => self._classes.add(x)),
      remove: (...c) => c.forEach((x) => self._classes.delete(x)),
      toggle: (c, on) => { if (on === undefined ? self._classes.has(c) : !on) self._classes.delete(c); else self._classes.add(c); },
      contains: (c) => self._classes.has(c),
    };
  }
  get id() { return this._id; }
  set id(v) { this._id = v; DOC._byId.set(v, this); }
  get className() { return [...this._classes].join(' '); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get textContent() {
    if (!this.children.length) return this._text;
    return this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(v) { this._html = String(v); if (v === '') this.children = []; }
  get offsetWidth() { return 100; }
  get offsetHeight() { return 100; }
  appendChild(c) { c.parentNode = this; this.children.push(c); if (c.id) DOC._byId.set(c.id, c); return c; }
  append(...cs) { cs.forEach((c) => this.appendChild(c)); }
  remove() { const p = this.parentNode; if (p) p.children = p.children.filter((c) => c !== this); }
  setAttribute(k, v) { this._attrs[k] = String(v); if (k === 'id') this.id = v; }
  getAttribute(k) { return this._attrs[k] ?? null; }
  removeAttribute(k) { delete this._attrs[k]; }
  hasAttribute(k) { return k in this._attrs; }
  addEventListener(t, fn) { if (!this._listeners.has(t)) this._listeners.set(t, new Set()); this._listeners.get(t).add(fn); }
  removeEventListener(t, fn) { this._listeners.get(t)?.delete(fn); }
  /* numero di listener registrati: serve al test sulla perdita B3 */
  listenerCount(t) { return this._listeners.get(t)?.size || 0; }
  dispatch(t, ev = {}) {
    const e = {
      type: t, target: ev.target || this, preventDefault() {}, stopPropagation() {},
      clientX: 0, clientY: 0, key: '', ...ev,
    };
    for (const fn of [...(this._listeners.get(t) || [])]) fn(e);
    return e;
  }
  focus() { this.focused = true; DOC.activeElement = this; }
  blur() { this.focused = false; }
  closest(sel) {
    let n = this;
    while (n) {
      if (sel.split(',').some((p) => n._matchesChain(p.trim().split(/\s+/)))) return n;
      n = n.parentNode;
    }
    return null;
  }
  _matches(sel) {
    sel = sel.trim();
    if (!sel) return false;
    /* :not(semplice) — esclude, non richiede */
    const nots = [...sel.matchAll(/:not\(([^)]*)\)/g)].map((m) => m[1].trim());
    sel = sel.replace(/:not\([^)]*\)/g, '').trim();
    for (const n of nots) {
      if (n && n.split(/\s+/).length === 1 && this._simple(n)) return false;
    }
    if (!sel) return nots.length > 0;
    /* tag.classe#id[attr="v"] — il sottoinsieme sufficiente a questo progetto.
       Tokenizzo con matchAll (mai zero-length) e verifico che copra tutto:
       se non copre, è un selettore che non so valutare → null. */
    const parts = sel.match(/[a-z][\w-]*|\.[\w-]+|#[\w-]+|\[[^\]]*\]/gi) || [];
    if (parts.join('') !== sel) return null;
    for (const p of parts) {
      if (p.startsWith('.')) { if (!this._classes.has(p.slice(1))) return false; }
      else if (p.startsWith('#')) { if (this._id !== p.slice(1)) return false; }
      else if (p.startsWith('[')) {
        const mm = p.slice(1, -1).match(/^([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?$/);
        if (!mm) return null;
        const v = this.getAttribute(mm[1]);
        if (mm[2] === undefined) { if (v === null) return false; }
        else if (String(v) !== mm[3]) return false;
      } else if (this.tagName !== p.toUpperCase()) return false;
    }
    return true;
  }
  _simple(sel) {
    if (sel.startsWith('.')) return this._classes.has(sel.slice(1));
    if (sel.startsWith('#')) return this._id === sel.slice(1);
    if (/^\[([\w-]+)(?:="([^"]*)")?\]$/.test(sel)) {
      const mm = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      return mm[2] === undefined ? this.hasAttribute(mm[1]) : this.getAttribute(mm[1]) === mm[2];
    }
    return this.tagName === sel.toUpperCase();
  }
  /* 'A B' = B discendente di A (senza > + ~, non servono qui) */
  _matchesChain(parts) {
    if (!this._matches(parts[parts.length - 1])) return false;
    let node = this.parentNode, i = parts.length - 2;
    while (i >= 0 && node) {
      if (node._matches(parts[i])) i--;
      node = node.parentNode;
    }
    return i < 0;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 150 }; }
  /* onclick come proprietà: il codice di gioco usa b.onclick = fn ovunque */
  get onclick() { return this._onclick; }
  set onclick(fn) {
    if (!this._clicker) this._clicker = (e) => { if (this._onclick) this._onclick(e); };
    this._onclick = fn || null;
    if (fn && !this._clickBound) { this.addEventListener('click', this._clicker); this._clickBound = true; }
  }
  click(ev = {}) {
    /* nel browser un click su un bottone lo mette a fuoco: senza questo,
       openModal() non ha nulla da ripristinare e i test sul focus mentono */
    if (this.tagName === 'BUTTON' || this.tabIndex >= 0) this.focus();
    return this.dispatch('click', { target: this, ...ev });
  }
  getContext() { return (this._ctx ||= fakeCtx()); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const chains = sel.split(',').map((p) => p.trim().split(/\s+(?![^[]*\])/));
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c._matchesChain && chains.some((ch) => c._matchesChain(ch))) out.push(c);
        if (c.children) walk(c);
      }
    };
    walk(this);
    return out;
  }
}

let DOC = null;

/* ── documento finto, popolato da index.html ─────────────── */
export function createDom(html) {
  const byId = new Map();
  DOC = {
    _byId: byId,
    activeElement: null,
    body: new El('body'),
    documentElement: new El('html'),
    visibilityState: 'visible',
    hidden: false,
  };
  DOC.createElement = (t) => new El(t);
  DOC.createTextNode = (t) => new TextNode(t);
  DOC.getElementById = (id) => byId.get(id) || null;
  DOC.querySelector = (s) => DOC.body.querySelector(s);
  DOC.querySelectorAll = (s) => DOC.body.querySelectorAll(s);
  DOC.addEventListener = (t, fn) => DOC.body.addEventListener(t, fn);
  DOC.removeEventListener = (t, fn) => DOC.body.removeEventListener(t, fn);
  DOC.dispatch = (t, ev) => DOC.body.dispatch(t, ev);

  /* parser minimalista: serve a creare gli elementi che index.html dichiara */
  const stack = [DOC.body];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-z0-9]+)([^>]*?)(\/?)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrs, selfClose] = m;
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const el = new El(tag);
    for (const a of attrs.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) {
      const k = a[1], v = a[2] ?? '';
      if (k === 'id') el.id = v;
      else if (k === 'class') el.className = v;
      else if (v !== '') el.setAttribute(k, v);
      else el.setAttribute(k, '');
    }
    stack[stack.length - 1].appendChild(el);
    if (!selfClose && !/^(img|br|hr|input|meta|link|source)$/i.test(tag)) stack.push(el);
  }
  return DOC;
}

/* ── storage finto ──────────────────────────────────────── */
export function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    _data: data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  };
}

/* ── contesto vm con i veri script ──────────────────────── */
export function loadGame({ html, storage, files = ['save.js', 'tiles.js', 'audio.js', 'board.js', 'story.js', 'universes.js'] } = {}) {
  const doc = createDom(html ?? readFileSync(join(ROOT, 'index.html'), 'utf8'));
  const store = storage ?? createStorage();
  const win = {
    document: doc,
    localStorage: store,
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 3,
    scrollTo() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
    performance, console, navigator: { vibrate() {}, onLine: true, userAgent: 'node' },
    speechSynthesis: { getVoices: () => [], cancel() {}, speak() {} },
    SpeechSynthesisUtterance: function () {},
    confirm: () => false,
    prompt: () => null,
    alert() {},
    location: { search: '', href: 'http://localhost/', origin: 'http://localhost' },
    AbortController, URL, URLSearchParams, Blob: function () {},
    ImageData: function () {},
  };
  /* app.js installa un setInterval e un rAF perpetuo: senza unref() terrebbero
     vivo il process e node:test non uscirebbe mai. Va fatto PRIMA di caricare,
     e il rAF deve passare dal timer già wrappato. */
  for (const k of ['setTimeout', 'setInterval']) {
    const orig = win[k];
    win[k] = (fn, ms, ...a) => { const h = orig(fn, ms, ...a); h.unref?.(); return h; };
  }
  win.requestAnimationFrame = (fn) => win.setTimeout(() => fn(win.__now ? win.__now() : Date.now()), 16);
  win.cancelAnimationFrame = (h) => win.clearTimeout(h);
  /* orologio virtuale: un test può accelerare i minigiochi (che durano 12-21s)
     senza aspettare davvero. Impostare win.__now = () => (t += 500) e
     win.__speed = 1 per far avanzare il tempo di 500ms a ogni frame. */
  win.performance = { now: () => (win.__now ? win.__now() : Date.now()) };
  win.window = win;
  win.globalThis = win;
  win.self = win;
  win.document.documentElement = doc.documentElement;
  const ctx = vm.createContext(win);
  ctx.__load = (rel) => {
    const src = readFileSync(join(ROOT, 'js', rel), 'utf8');
    vm.runInContext(src, ctx, { filename: `js/${rel}` });
  };
  files.forEach((f) => ctx.__load(f));
  return { win, ctx, doc, storage: store };
}
