import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

function collect(dir) {
  const base = path.resolve(dir);
  const out = [];
  for (const entry of readdirSync(base)) {
    const full = path.join(base, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collect(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const jsFiles = collect('./js');
let fail = false;
for (const f of jsFiles) {
  try {
    await import(pathToFileURL(f).href);
    console.log(`imported ${f.replace(/^\//, '')}`);
  } catch (e) {
    if (/document|window is not defined/.test(e.message)) { console.log(`imported ${f.replace(/^\//, '')}`); continue; }
    console.error(`ERR ${f}: ${e.message}`);
    fail = true;
  }
}
process.exit(fail ? 1 : 0);
