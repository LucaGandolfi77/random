export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

export function toast(html, ms = 2600) {
  const root = document.getElementById('toast-root');
  const node = el('div', { class: 'toast', html });
  root.append(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 320);
  }, ms);
}

export function openSheet({ title, sub, body, center = false, actions = null }) {
  const root = document.getElementById('sheet-root');
  clear(root);
  const sheet = el('div', { class: center ? 'sheet center' : 'sheet', role: 'dialog', 'aria-modal': 'true' });
  if (!center) sheet.append(el('div', { class: 'sheet-grip' }));
  if (title) sheet.append(el('h3', { text: title }));
  if (sub) sheet.append(el('p', { class: 'sheet-sub', text: sub }));
  if (body) sheet.append(body);
  if (actions) sheet.append(actions);
  const overlay = el('div', { class: center ? 'overlay center' : 'overlay' }, [sheet]);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet();
  });
  root.append(overlay);
  return { overlay, sheet, close: closeSheet };
}

export function closeSheet() {
  clear(document.getElementById('sheet-root'));
}

export function typewriter(node, text, { speed = 1, onDone } = {}) {
  const reduced = document.body.classList.contains('reduce-motion');
  const prefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || prefers || speed >= 4) {
    node.textContent = text;
    if (onDone) onDone();
    return { finish() { node.textContent = text; if (onDone) onDone(); }, done: true };
  }
  let i = 0;
  let done = false;
  const caret = el('i', { class: 'caret' });
  node.textContent = '';
  node.append(caret);
  const delay = Math.max(8, 26 / Math.max(0.4, speed));
  const timer = setInterval(() => {
    if (done) return;
    i += 1;
    node.textContent = text.slice(0, i);
    node.append(caret);
    if (i >= text.length) {
      clearInterval(timer);
      caret.remove();
      done = true;
      if (onDone) onDone();
    }
  }, delay);
  return {
    finish() {
      if (done) return;
      clearInterval(timer);
      node.textContent = text;
      done = true;
      if (onDone) onDone();
    },
    get done() { return done; }
  };
}

export function haptic(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}
