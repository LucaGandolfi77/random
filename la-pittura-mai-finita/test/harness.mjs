/* harness.mjs — DOM minimale in Node, nessuna dipendenza.
 *
 * Qui non c'è jsdom e non ci sarà: quello che serve a questo gioco è
 * `document.getElementById`, un `canvas` che restituisce un contesto finto,
 * `addEventListener`, `localStorage` e `performance.now`. Tutto il resto è
 * rumore. Quindi lo si costruisce a mano in duecento righe, e i test girano
 * sul vero js/*.js — non su una copia, non su un mock.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── canvas 2D finto ────────────────────────────────────── */
function contestoFinto(canvas) {
  const chiamate = [];
  const registra = (nome) => (...a) => { chiamate.push([nome, a]); };
  return new Proxy({
    canvas: { width: 390, height: 780 },
    measureText: (t) => ({ width: (t || '').length * 8 }),
    createLinearGradient: () => ({ addColorStop: registra('addColorStop') }),
    createRadialGradient: () => ({ addColorStop: registra('addColorStop') }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setLineDash: registra('setLineDash'),
    getLineDash: () => [],
  }, {
    get: (t, k) => (k in t ? t[k] : registra(String(k))),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

/* ── Path2D finto ────────────────────────────────────────── */
class Path2DFinto {
  constructor() { this.operazioni = []; }
  moveTo() {} lineTo() {} closePath() {}
  ellipse(...a) { this.operazioni.push(['ellipse', a]); }
  rect(...a) { this.operazioni.push(['rect', a]); }
}

/* ── elementi ────────────────────────────────────────────── */
class Testo {
  constructor(t) { this.nodeValue = String(t); }
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
    this.style = new Proxy({}, { get: (t, k) => t[k] || '', set: (t, k, v) => { t[k] = v; return true; } });
    this._classi = new Set();
    this._classiTesto = '';
    this._html = '';
    this._testo = '';
    this._listener = new Map();
    this._disabled = false;
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.title = '';
    this.tabIndex = -1;
    this.focused = false;
    this._uid = ++uid;
    this._on = {};
    this.dataset = new Proxy({}, {
      get: (t, k) => (typeof k === 'string' ? this.getAttribute('data-' + kebab(k)) : undefined),
      set: (t, k, v) => { this.setAttribute('data-' + kebab(k), v); return true; },
      has: (t, k) => typeof k === 'string' && this.hasAttribute('data-' + kebab(k)),
      ownKeys: () => [...this._attrs.keys()].filter((a) => a.startsWith('data-')).map((a) => camel(a.slice(5))),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
    const se = this;
    this.classList = {
      add: (...c) => c.forEach((x) => x && se._classi.add(x)),
      remove: (...c) => c.forEach((x) => se._classi.delete(x)),
      toggle: (c, on) => {
        const deve = on === undefined ? !se._classi.has(c) : !!on;
        if (deve) se._classi.add(c); else se._classi.delete(c);
        return deve;
      },
      contains: (c) => se._classi.has(c),
    };
  }

  get id() { return this._id; }
  set id(v) { this._id = v; if (DOC) DOC._byId.set(v, this); }
  get className() { return [...this._classi].join(' '); }
  set className(v) { this._classi = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get disabled() { return this._disabled; }
  set disabled(v) { this._disabled = !!v; }
  /* `hidden` è una proprietà riflessa sull'attributo: metterla a false deve
   togliere l'attributo, non tenere traccia di un flag parallelo. */
  get hidden() { return this._attrs.hidden !== undefined; }
  set hidden(v) {
    if (v) this._attrs.hidden = '';
    else delete this._attrs.hidden;
  }

  get textContent() {
    if (this.children.length) return this.children.map((c) => c.textContent).join('');
    return this._testo;
  }
  set textContent(v) { this._testo = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v);
    this.children = [];
    /* Il codice di gioco scrive solo testo e <span>/<br>, non strutture: qui
     * basta a mantenere il testo per le verifiche. */
    if (this._html) this.children = [new Testo(this._html.replace(/<[^>]*>/g, ''))];
  }

  get offsetWidth() { return 100; }
  get offsetHeight() { return 100; }

  appendChild(c) { c.parentNode = this; this.children.push(c); if (c.id) DOC._byId.set(c.id, c); return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); }
  remove() { const p = this.parentNode; if (p) p.children = p.children.filter((c) => c !== this); }
  setAttribute(k, v) { this._attrs[k] = String(v); if (k === 'id') this.id = v; }
  getAttribute(k) { return this._attrs[k] ?? null; }
  removeAttribute(k) { delete this._attrs[k]; }
  hasAttribute(k) { return k in this._attrs; }

  addEventListener(t, fn) { if (!this._listener.has(t)) this._listener.set(t, new Set()); this._listener.get(t).add(fn); }
  removeEventListener(t, fn) { this._listener.get(t)?.delete(fn); }
  listenerCount(t) { return this._listener.get(t)?.size || 0; }

  dispatch(t, ev = {}) {
    const e = {
      type: t, target: ev.target || this, preventDefault() {}, stopPropagation() {},
      clientX: 0, clientY: 0, pointerId: 1, key: '', ...ev,
    };
    for (const fn of [...(this._listener.get(t) || [])]) fn(e);
    return e;
  }
  click(ev = {}) { return this.dispatch('click', { target: this, ...ev }); }
  focus() { this.focused = true; if (DOC) DOC.activeElement = this; }
  blur() { this.focused = false; if (DOC && DOC.activeElement === this) DOC.activeElement = null; }

  getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 780, right: 390, bottom: 780 }; }

  getContext() { return (this._ctx ||= contestoFinto(this)); }
  setPointerCapture() {}
  releasePointerCapture() {}
  getCoalescedEvents() { return []; }

  /* onclick come proprietà: il codice usa b.onclick = fn ovunque */
  get onclick() { return this._onclick; }
  set onclick(fn) {
    this._onclick = fn || null;
    if (fn && !this._clicker) {
      this._clicker = (e) => { if (this._onclick) this._onclick(e); };
      this.addEventListener('click', this._clicker);
    }
  }

  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const parti = String(sel).split(',').map((p) => p.trim().split(/\s+(?![^[]*\])/));
    const cammina = (n) => {
      for (const c of n.children) {
        if (c._corrispondeCatena && parti.some((ch) => c._corrispondeCatena(ch))) out.push(c);
        if (c.children) cammina(c);
      }
    };
    cammina(this);
    return out;
  }

  /* Un selettore può essere discendente ('.overlay .scheda'): l'ultima parte
   * deve combaciare con questo elemento, e le altre con i suoi antenati. */
  _corrispondeCatena(parte) {
    const pezzi = Array.isArray(parte) ? parte : [parte];
    if (!this._matches(pezzi[pezzi.length - 1])) return false;
    let n = this.parentNode;
    for (let k = pezzi.length - 2; k >= 0; k--) {
      if (!n || !n._matches || !n._matches(pezzi[k])) return false;
      n = n.parentNode;
    }
    return true;
  }
  _matches(sel) {
    sel = String(sel).trim();
    if (!sel) return false;
    const non = [...sel.matchAll(/:not\(([^)]*)\)/g)].map((m) => m[1].trim());
    sel = sel.replace(/:not\([^)]*\)/g, '').trim();
    if (sel) {
      const parti = sel.match(/^[a-z][\w-]*|\.[\w-]+|#[\w-]+|\[[^\]]*\]/gi) || [];
      if (parti.join('') !== sel) return false;
      for (const p of parti) {
        if (p.startsWith('.')) { if (!this._classi.has(p.slice(1))) return false; }
        else if (p.startsWith('#')) { if (this._id !== p.slice(1)) return false; }
        else if (p.startsWith('[')) {
          const mm = /^([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?$/.exec(p.slice(1, -1));
          if (!mm) return false;
          const v = this.getAttribute(mm[1]);
          if (!mm[2]) { if (v === null) return false; }
          else if (String(v) !== mm[3]) return false;
        } else if (this.tagName !== p.toUpperCase()) return false;
      }
    }
    for (const n of non) if (!n.split(/\s+/).every((x) => this._semplice(x))) return false;
    return true;
  }
  _semplice(sel) {
    sel = sel.trim();
    if (sel.startsWith('.')) return this._classi.has(sel.slice(1));
    if (sel.startsWith('#')) return this._id === sel.slice(1);
    if (/^\[[\w-]+(="[^"]*")?\]$/.test(sel)) {
      const mm = /^\[([\w-]+)(="([^"]*)")?\]$/.exec(sel);
      return mm[2] === undefined ? this.hasAttribute(mm[1]) : this.getAttribute(mm[1]) === mm[2];
    }
    return this.tagName === sel.toUpperCase();
  }
}

let DOC = null;

export function createDom(html) {
  const byId = new Map();
  DOC = {
    _byId: byId,
    activeElement: null,
    body: new El('body'),
    documentElement: new El('html'),
    visibilityState: 'visible',
  };
  DOC.createElement = (t) => new El(t);
  DOC.createTextNode = (t) => new Testo(t);
  DOC.getElementById = (id) => byId.get(id) || null;
  DOC.querySelector = (s) => DOC.body.querySelector(s);
  DOC.querySelectorAll = (s) => DOC.body.querySelectorAll(s);
  DOC.addEventListener = (t, fn) => DOC.body.addEventListener(t, fn);
  DOC.removeEventListener = (t, fn) => DOC.body.removeEventListener(t, fn);
  DOC.dispatch = (t, ev) => DOC.body.dispatch(t, ev);

  const pila = [DOC.body];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-z0-9]+)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*(\/?)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const [, chiudi, tag, attrs, autoChiuso] = m;
    if (chiudi) { if (pila.length > 1) pila.pop(); continue; }
    const el = new El(tag);
    for (const a of (attrs || '').matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) {
      /* `class` va sulla lista, non sugli attributi: altrimenti
       * `.classList.contains` non trova nulla e i selettori per classe
       * falliscono senza che nessuno se ne accorga. */
      if (a[1] === 'class') el.className = a[2] ?? '';
      else el.setAttribute(a[1], a[2] ?? '');
    }
    if (/\bhidden\b/.test(attrs || '')) el.setAttribute('hidden', '');
    pila[pila.length - 1].appendChild(el);
    const vuoto = /^(img|br|hr|input|meta|link|source)$/i.test(tag);
    if (!vuoto && !autoChiuso) pila.push(el);
  }
  return DOC;
}

export function createStorage(seed = {}) {
  const dati = new Map(Object.entries(seed));
  return {
    _data: dati,
    getItem: (k) => (dati.has(k) ? dati.get(k) : null),
    setItem: (k, v) => { dati.set(k, String(v)); },
    removeItem: (k) => { dati.delete(k); },
    clear: () => dati.clear(),
    key: (i) => [...dati.keys()][i] ?? null,
    get length() { return dati.size; },
  };
}

/**
 * Carica i veri script di gioco in un contesto vm.
 *
 * @param {object} o
 * @param {string[]} o.files  quali js caricare, nell'ordine
 * @param {object}   o.seed    contenuto iniziale di localStorage
 * @param {function} o.storia  se passato, Definisce window.fetch e inietta
 *                             data/story.json senza toccare il disco
 * @param {number}   o.now     valore iniziale di performance.now()
 */
export function carica({ files = ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'tela.js', 'combat.js', 'nemici.js', 'scena.js'], seed = {}, storia = null, now = 1000, vel = false } = {}) {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const doc = createDom(html);
  const store = createStorage(seed);

  let tempo = now;
  const win = {
    document: doc,
    localStorage: store,
    innerWidth: 390,
    innerHeight: 780,
    devicePixelRatio: 2,
    scrollTo() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    setTimeout, clearTimeout, setInterval, clearInterval,
    console,
    navigator: { vibrate() {}, onLine: true, userAgent: 'node', storage: {} },
    speechSynthesis: { getVoices: () => [], cancel() {}, speak() {} },
    SpeechSynthesisUtterance: function () {},
    confirm: () => false,
    alert() {},
    fetch: storia ? async (url) => {
      if (String(url).includes('story.json')) return { ok: true, json: async () => storia };
      return { ok: false, status: 404 };
    } : async () => ({ ok: false, status: 404 }),
    requestAnimationFrame: (fn) => win.setTimeout(() => fn(tempo), 16),
    cancelAnimationFrame: (h) => win.clearTimeout(h),
    performance: { now: () => tempo },
    Path2D: Path2DFinto,
    AbortController, URL, URLSearchParams, Blob: function () {},
    location: { search: '', href: 'http://localhost/', origin: 'http://localhost', replace() {} },
  };

  /* app.js accende un rAF perpetuo e dei setInterval: senza unref() il processo
   * non uscirebbe mai e node:test andrebbe in timeout. */
  for (const k of ['setTimeout', 'setInterval']) {
    const orig = win[k];
    win[k] = (fn, ms, ...a) => { const h = orig(fn, ms, ...a); h.unref?.(); return h; };
  }
  win.__avanza = (ms) => { tempo += ms; };
  win.__get = (id) => doc.getElementById(id);
  win.window = win;
  win.globalThis = win;
  win.self = win;
  win.document.documentElement = doc.documentElement;

  const ctx = vm.createContext(win);
  ctx.__carica = (rel) => {
    const src = readFileSync(join(ROOT, 'js', rel), 'utf8');
    vm.runInContext(src, ctx, { filename: `js/${rel}` });
  };
  files.forEach((f) => ctx.__carica(f));
  return { win, ctx, doc, storage: store, $: (s) => doc.querySelector(s), el: (id) => doc.getElementById(id) };
}

/** Storia di prova: due atti, quattro schede, quattro finali. */
export const STORIA_MINIMA = {
  meta: { titolo: 'T', protagonista: 'Ada Sartori' },
  frammenti: { 'fr-1': 'schizzo 1', 'fr-2': 'schizzo 2', 'fr-3': 'schizzo 3', 'fr-4': 'schizzo 4' },
  /* Le quattro schede coprono tutte le chiavi che combat.js guarda, così nei
   * test si può accendere e spegnere una capacità togliendo una scheda:
   *   s1 «parla»   s2 «lavora» + danno   s3 «inchiostro» + vedi   s4 parata lunga
   */
  schede: [
    { id: 's1', persona: 'tecla', titolo: 'Uno', nome: 'la prima scheda', versi: ['riga uno', 'riga due'], chiavi: ['parla'] },
    { id: 's2', persona: 'aurelio', titolo: 'Due', nome: 'la seconda scheda', versi: ['riga uno', 'riga due'], chiavi: ['lavora'], valori: { danno: 0.1 } },
    { id: 's3', persona: 'ansi', titolo: 'Tre', nome: 'la terza scheda', versi: ['riga uno', 'riga due'], chiavi: ['inchiostro', 'vedere'] },
    { id: 's4', persona: 'ada', titolo: 'Quattro', nome: 'la quarta scheda', versi: ['riga uno', 'riga due'], chiavi: [], valori: { parata: 300 } },
  ],
  atti: [
    {
      id: 'a0', ordine: 0, titolo: 'Primo', epigrafe: 'e-1', premessa: 'p-1',
      dai: ['s1'],
      scena: [{
        id: 'a0-s1', chi: 'Ada',
        battute: [
          { chi: 'Ada', testo: 'Prima battuta.' },
          { chi: 'Ada', testo: 'Seconda.' },
        ],
        scelte: [],
      }],
      combattimento: 'il-commiato',
    },
    {
      id: 'a1', ordine: 1, titolo: 'Secondo', epigrafe: 'e-2', premessa: 'p-2',
      dai: ['s2', 's3', 's4'],
      scena: [{ id: 'a1-s1', chi: 'Brizio', battute: [{ chi: 'Brizio', testo: 'Altra battuta.' }], scelte: [] }],
      combattimento: 'tecla',
      finale: true,
    },
  ],
  finali: {
    voce: { nome: 'La Voce', condizione: 'c-1', quadro: 'vuoto', righe: ['r-1', 'r-2', 'r-3', 'r-4'], sotto: 'sotto', azioni: [{ id: 'ricomincia', testo: 'Ricomincia' }] },
    studio: { nome: 'Studio', condizione: 'c-2', quadro: 'vuoto', righe: ['r-1', 'r-2', 'r-3'], sotto: 'sotto', azioni: [{ id: 'ricomincia', testo: 'Ricomincia' }] },
    calore: { nome: 'Calore', condizione: 'c-3', quadro: 'studio-vuoto', righe: ['r-1', 'r-2', 'r-3'], sotto: 'sotto', azioni: [{ id: 'ricomincia', testo: 'Ricomincia' }] },
    cielo: { nome: 'Cielo', condizione: 'c-4', quadro: 'vuoto', righe: ['r-1', 'r-2', 'r-3'], sotto: 'sotto', azioni: [{ id: 'ricomincia', testo: 'Ricomincia' }] },
    cenere: { nome: 'Cenere', condizione: 'c-5', quadro: 'cenere', righe: ['r-1', 'r-2', 'r-3'], sotto: 'sotto', azioni: [{ id: 'ricomincia', testo: 'Ricomincia' }] },
  },
};

/** Tela finta: registra le misure senza disegnare niente. */
export function telaFinto({ totale = 1000, volto = 200 } = {}) {
  const scheda = {
    totale, volto,
    maschera: new Uint8Array(120 * 120),
    faccia: new Uint8Array(120 * 120),
  };
  const gia = new Uint8Array(120 * 120);
  /* Tutto quadrato "dentro": ogni tratto copre, e serve a testare la
   * matematica del combattimento senza disegno. */
  for (let i = 0; i < scheda.maschera.length; i++) {
    scheda.maschera[i] = 1;
    scheda.faccia[i] = 1;
  }
  let larghezza = 0.075;
  return {
    scheda, gia,
    larghezzaPennello: () => larghezza,
    larghezza: () => larghezza,
    pittura(tratto, { moltiplicatore = 1, bonusVolto = 2.2, valore = 100 } = {}) {
      const r = windowPMF(tratto);
      return r;
      function windowPMF(tr) {
        const punti = tr.punti || [];
        let nuovi = 0;
        let voltoNuovi = 0;
        const passo = 0.02;
        for (let t = 0; t <= 1; t += passo) {
          const i0 = Math.round(((punti[0][0] + (punti[punti.length - 1][0] - punti[0][0]) * t) * 120) % 120);
          const j0 = Math.round(((punti[0][1] + (punti[punti.length - 1][1] - punti[0][1]) * t) * 120) % 120);
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const i = (i0 + dx + 120) % 120;
              const j = (j0 + dy + 120) % 120;
              const k = j * 120 + i;
              if (scheda.maschera[k] && !gia[k]) { gia[k] = 1; nuovi++; if (scheda.faccia[k]) voltoNuovi++; }
            }
          }
        }
        const quota = nuovi / scheda.totale;
        const voltoQ = voltoNuovi / scheda.volto;
        return {
          nuovo: nuovi, quota, volto: voltoQ,
          danno: quota * valore * moltiplicatore + voltoQ * valore * (bonusVolto - 1),
        };
      }
    },
    sgorbio() {},
    colpo() {},
    impostaAnsia() {},
    impostaNemico() {},
    impostaTinta() {},
    impostaPennello(n) { larghezza = { sottile: 0.045, medio: 0.075, largo: 0.115 }[n] || 0.075; },
    impostaLume() {},
    mostraContorno() {},
    chiudiContorno() {},
    azzera() {},
    accendi() {},
    spegni() {},
    ridimensiona() {},
    collega() {},
    attiva() {},
    contornoscaduto: false,
  };
}

/* Generatore deterministico: stessi numeri a ogni esecuzione. */
export function rngFisso(seme = 1234) {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}