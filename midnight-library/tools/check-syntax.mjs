// Verifica la sintassi di tutti i moduli JS senza eseguirli.
// Uso: node tools/check-syntax.mjs
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', 'icons']);
const EXT = new Set(['.js', '.mjs']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(full.slice(full.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`OK  ${file.replace(ROOT + '/', '')}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${file.replace(ROOT + '/', '')}\n${err.stderr}`);
  }
}
console.log(failed ? `\n${failed} file con errori di sintassi.` : `\nSintassi OK (${files.length} file).`);
process.exit(failed ? 1 : 0);
