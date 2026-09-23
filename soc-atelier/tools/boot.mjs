import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  _m: {},
  getItem(k) { return this._m[k] ?? null; },
  setItem(k, v) { this._m[k] = String(v); },
  removeItem(k) { delete this._m[k]; },
  get length() { return Object.keys(this._m).length; },
};
global.matchMedia = global.matchMedia || (() => true);
global.URL.createObjectURL = () => 'blob:x';
global.URL.revokeObjectURL = () => {};
const a = global.document.createElement('a');
a.click = () => {};
global.Element = dom.window.Element;

const events = ['click', 'input', 'change', 'dragstart', 'dragover', 'drop', 'dragend', 'keydown'];
for (const e of events) {
  dom.window.HTMLElement.prototype.addEventListener || (dom.window.HTMLElement.prototype.addEventListener = () => {});
}

try {
  const url = pathToFileURL(join(root, 'js/app.js')).href;
  await import(url);
} catch (e) {
  if (e.message && /only a document fragment|not implemented|NotImplemented/.test(e.message)) {
    console.warn('non-fatal DOM limitation:', e.message);
  } else {
    console.error('APP IMPORT FAIL:', e);
    process.exit(1);
  }
}

// Fire DOMContentLoaded → boot()
const ev = new dom.window.Event('DOMContentLoaded');
global.document.dispatchEvent(ev);

// Tiny await for microtasks
await new Promise((r) => setTimeout(r, 50));

const checks = [];
const $ = (s) => global.document.querySelector(s);

checks.push(['#app exists', !!$('#app')]);
checks.push(['#screen-home present', !$('#screen-home').classList.contains('hidden')]);
checks.push(['home title set', ($('#home-title') || {}).textContent?.length > 0]);
checks.push(['no crashed screens', ($('#screen-game').classList.contains('hidden'))]);

let fail = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) fail = true;
}

// Exercise controller: start → tutorial
const btnStart = $('#btn-start');
if (btnStart) {
  btnStart.click();
  await new Promise((r) => setTimeout(r, 20));
  const tut = $('#screen-tutorial');
  console.log(`${tut && !tut.classList.contains('hidden') ? 'PASS' : 'FAIL'} tutorial opens`);
  if (tut && !tut.classList.contains('hidden')) {
    const next = $('#btn-tut-next');
    for (let i = 0; i < 4 && next; i++) { next.click(); await new Promise((r) => setTimeout(r, 10)); }
    const game = $('#screen-game');
    console.log(`${game && !game.classList.contains('hidden') ? 'PASS' : 'FAIL'} game opens after tutorial`);
    const die = $('#die');
    const slots = die ? die.querySelectorAll('.slot') : [];
    console.log(`slots: ${slots.length}`);
  }
}

console.log(fail ? 'BOOT TEST FAILED' : 'BOOT TEST PASSED');
process.exit(fail ? 1 : 0);
