const { pathToFileURL } = await import('url');
const { default: jsdom } = await import('jsdom');
const fs = await import('fs');
const path = await import('path');

const root = process.cwd();
const { JSDOM } = jsdom;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, length: 0 };
global.matchMedia = global.matchMedia || (() => true);
global.URL.createObjectURL = () => 'blob:x';
global.URL.revokeObjectURL = () => {};
global.document.createElement('a').click = () => {};

const files = fs.readdirSync(path.join(root, 'js'), { recursive: true })
  .filter((f) => String(f).endsWith('.js'))
  .map((f) => path.join(root, 'js', String(f)));
let ok = true;
for (const f of files) {
  try {
    const url = pathToFileURL(f).href;
    const mod = await import(url);
    console.log(`OK  ${path.relative(root, f)}`);
    void mod;
  } catch (e) {
    ok = false;
    console.error(`FAIL ${path.relative(root, f)}: ${e.message}`);
  }
}
console.log(ok ? 'SMOKE IMPORT OK' : 'SMOKE IMPORT FAILED');
process.exit(ok ? 0 : 1);
