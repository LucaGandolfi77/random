import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
let ok = true;

function checkFile(rel) {
  const p = join(root, rel);
  try {
    const src = readFileSync(p, 'utf8');
    if (/\beval\s*\(/.test(src)) { console.error(`[eval] ${rel}`); ok = false; }
  } catch (e) {
    console.error(`[missing] ${rel}: ${e.message}`);
    ok = false;
  }
}

const jsFiles = readdirSync(join(root, 'js'), { recursive: true })
  .filter((f) => f.endsWith('.js'))
  .map((f) => `js/${f}`);
const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => `${f}`);
[...jsFiles, ...htmlFiles].forEach(checkFile);

for (const rel of [...jsFiles, ...htmlFiles]) {
  const src = readFileSync(join(root, rel), 'utf8');
  const open = (src.match(/\{/g) || []).length;
  const close = (src.match(/\}/g) || []).length;
  if (open !== close) { console.error(`[braces] ${rel}: {${open}} vs }${close}`); ok = false; }
}

console.log(ok ? 'SYNTAX OK' : 'SYNTAX ISSUES FOUND');
process.exit(ok ? 0 : 1);
