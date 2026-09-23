// Utility pure: storage safe, dom helpers, math, clamp, debounce.

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const ce = (tag, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html; // html solo da codice interno, mai da input utente
  return el;
};

export function safeLocalStorage(op, key, value = undefined) {
  try {
    if (op === 'get') {
      return localStorage.getItem(key);
    }
    if (op === 'set') {
      localStorage.setItem(key, value === undefined ? null : String(value));
      return true;
    }
    if (op === 'remove') {
      localStorage.removeItem(key);
      return true;
    }
  } catch {
    return op === 'get' ? null : false;
  }
}

export function safeJSON(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function rand(n) {
  return Math.floor(Math.random() * n);
}

export function pick(arr) {
  return arr[rand(arr.length)];
}

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function hasTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function nowHour() {
  return new Date().getHours();
}
