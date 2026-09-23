export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function on(topic, fn) {
  document.addEventListener(`topic:${topic}`, (e) => fn(e.detail), { once: false });
}

export function emit(topic, detail) {
  document.dispatchEvent(new CustomEvent(`topic:${topic}`, { detail }));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function safeToast(msg) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = msg;
  el.className = 'sr-only';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
