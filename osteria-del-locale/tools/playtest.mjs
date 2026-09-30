import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(here, 'playtest-entry.ts')],
  outfile: resolve(here, 'playtest-entry.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  logLevel: 'error',
});

const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
const run = promisify(execFile);

const seeds = process.argv.includes('--all') ? [1337, 7, 42, 9001, 20260930] : [Number(process.argv[2] ?? 1337)];

const reports = [];
for (const seed of seeds) {
  const { stdout } = await run(process.execPath, [resolve(here, 'playtest-entry.js'), String(seed)], {
    maxBuffer: 8 * 1024 * 1024,
  });
  reports.push(stdout.trimEnd());
}

await writeFile(resolve(here, '../spike/PLAYTEST.md'), `# Playtest\n\n${reports.join('\n\n---\n\n')}\n`);

console.log(reports[reports.length - 1]?.split('NIGHT ROLL')[0] ?? '');
console.log(`\nran ${seeds.length} seed(s), wrote spike/PLAYTEST.md`);