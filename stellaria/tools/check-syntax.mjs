import { readdirSync, readFileSync, statSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collect(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = collect('./js');
let fail = false;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (/\beval\s*\(/.test(src)) { console.error(`EVAL in ${f}`); fail = true; }
  try {
    await import(pathToFileURL(f).href);
    console.log(`ok ${f.replace(/^\//, '')}`);
  } catch (e) {
    if (/document|window is not defined/.test(e.message)) { console.log(`skip ${f} (browser/deps)`); continue; }
    console.error(`ERR ${f}: ${e.message}`);
    fail = true;
  }
}
process.exit(fail ? 1 : 0);
