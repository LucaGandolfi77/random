import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const jsDir = join(root, '..', 'js');
const dirs = readdirSync(jsDir);
let failed = 0;
for (const f of dirs) {
  if (!f.endsWith('.js')) continue;
  const path = join(jsDir, f);
  try {
    execSync(`node --check "${path}"`, { stdio: 'inherit' });
    console.log(`OK   ${f}`);
  } catch {
    failed++;
  }
}
if (failed) {
  console.error(`${failed} file(s) failed syntax check`);
  process.exit(1);
}
