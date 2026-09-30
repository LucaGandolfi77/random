#!/usr/bin/env node
/**
 * check.mjs — gate unico di qualità. Nessuna dipendenza.
 *   node tools/check.mjs           tutto
 *   node tools/check.mjs --fast    salta i test lenti
 *
 * Fallisce con exit code != 0 se qualcosa non torna: da usare in pre-commit
 * e come required check in CI.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAST = process.argv.includes('--fast');
const t0 = Date.now();
const failures = [];
const C = { ok: '\x1b[32m', bad: '\x1b[31m', dim: '\x1b[2m', b: '\x1b[1m', off: '\x1b[0m' };

const step = (name) => {
  process.stdout.write(`${C.b}${name}${C.off} ${C.dim}…${C.off} `);
  return (msg) => { console.log(msg); };
};
const pass = () => { failures.length; return `${C.ok}✓${C.off}`; };

/* ── 1. sintassi ────────────────────────────────────────── */
{
  const done = step('sintassi');
  const files = ['sw.js', 'serve.js', ...readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f),
    ...readdirSync(join(ROOT, 'test')).filter((f) => f.endsWith('.mjs')).map((f) => 'test/' + f),
    ...readdirSync(join(ROOT, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => 'tools/' + f)];
  const bad = [];
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); }
    catch { bad.push(f); }
  }
  if (bad.length) { failures.push(`sintassi: ${bad.join(', ')}`); done(`${C.bad}✗${C.off} ${bad.join(', ')}`); }
  else done(`${C.ok}✓${C.off} ${C.dim}${files.length} file${C.off}`);
}

/* ── 2. risorse dichiarate nei manifest esistono davvero ── */
{
  const done = step('manifest');
  const problems = [];
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const shell = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]).filter((p) => p !== './');
  for (const p of shell) {
    if (!existsSync(join(ROOT, p))) problems.push(`sw.js precacha "${p}" che non esiste`);
  }
  const man = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  const declared = [
    ...man.icons.map((i) => i.src),
    ...(man.screenshots || []).map((s) => s.src),
    ...(man.shortcuts || []).flatMap((s) => (s.icons || []).map((i) => i.src)),
  ];
  for (const src of new Set(declared)) {
    if (!existsSync(join(ROOT, src))) problems.push(`manifest dichiara "${src}" che non esiste`);
  }
  for (const i of man.icons) {
    const b = readFileSync(join(ROOT, i.src));
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    if (b.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') problems.push(`${i.src} non è un PNG valido`);
    const want = Number(i.sizes.split('x')[0]);
    if (w !== want || h !== want) problems.push(`${i.src} è ${w}x${h} ma dichiara ${i.sizes}`);
  }
  /* lo start_url deve risolvere su un file reale (niente rotta client-side) */
  const startFile = man.start_url.replace(/^\.\//, '') || 'index.html';
  if (!existsSync(join(ROOT, startFile))) problems.push(`lo start_url "${man.start_url}" non risolve su un file reale`);
  if (man.scope !== './') problems.push(`scope "${man.scope}" non copre l'app alla root`);
  /* il fallback offline dev'essere precacato o il fallback non serve a nulla */
  if (!shell.includes('./offline.html')) problems.push('sw.js non precaca offline.html');
  if (problems.length) { failures.push(...problems); done(`${C.bad}✗${C.off} ${problems.length} problemi`); problems.forEach((p) => console.log(`    ${C.bad}${p}${C.off}`)); }
  else done(`${C.ok}✓${C.off} ${C.dim}${new Set(declared).size} risorse, ${shell.length} in precache${C.off}`);
}

/* ── 3. contrasti WCAG ──────────────────────────────────── */
{
  const done = step('contrasti');
  try {
    const out = execFileSync(process.execPath, [join(ROOT, 'tools/contrast.mjs'), '--check'], { encoding: 'utf8' });
    const n = (out.match(/^✓/gm) || []).length;
    done(`${C.ok}✓${C.off} ${C.dim}${n} combinazioni tema AA${C.off}`);
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    failures.push('contrasti WCAG non conformi');
    done(`${C.bad}✗${C.off}`);
    console.log(out.split('\n').map((l) => '    ' + l).join('\n'));
  }
}

/* ── 3b. gate sul contenuto dei postscript ───────────────── */
{
  const done = step('contenuto');
  try {
    const out = execFileSync(process.execPath, [join(ROOT, 'tools/content-lint.mjs')], { encoding: 'utf8' });
    const n = (out.match(/^(\d+) postscript/) || [])[1] || '0';
    done(`${C.ok}✓${C.off} ${C.dim}${n} postscript conformi ai gate${C.off}`);
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).trim();
    failures.push('i postscript violano i gate di contenuto');
    done(`${C.bad}✗${C.off}`);
    console.log(out.split('\n').map((l) => '    ' + l).join('\n'));
  }
}

/* ── 4. budget di peso ──────────────────────────────────── */
{
  const done = step('budget');
  const budget = { 'index.html': 30, 'css/style.css': 16, 'sw.js': 12, 'manifest.webmanifest': 4 };
  const over = [];
  const rows = [];
  for (const [f, maxKB] of Object.entries(budget)) {
    const kb = statSync(join(ROOT, f)).size / 1024;
    rows.push(`${f} ${kb.toFixed(1)}/${maxKB}KB`);
    if (kb > maxKB) over.push(`${f} pesa ${kb.toFixed(1)}KB (budget ${maxKB}KB)`);
  }
  const jsKB = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js'))
    .reduce((n, f) => n + statSync(join(ROOT, 'js', f)).size, 0) / 1024;
  rows.push(`js/ ${jsKB.toFixed(1)}KB totali`);
  if (over.length) { failures.push(...over); done(`${C.bad}✗${C.off} ${over.join('; ')}`); }
  else done(`${C.ok}✓${C.off} ${C.dim}${rows.join(' · ')}${C.off}`);
}

/* ── 5. test ────────────────────────────────────────────── */
{
  const done = step('test');
  const files = readdirSync(join(ROOT, 'test')).filter((f) => f.endsWith('.test.mjs')).map((f) => join(ROOT, 'test', f));
  if (FAST) { done(`${C.dim}saltati (--fast)${C.off}`); }
  else {
    try {
      const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const pass = (out.match(/^# pass (\d+)/m) || [])[1];
      const fail = (out.match(/^# fail (\d+)/m) || [])[1];
      if (Number(fail) > 0) { failures.push(`${fail} test falliti`); done(`${C.bad}✗${C.off} ${fail} falliti`); console.log(out); }
      else done(`${C.ok}✓${C.off} ${C.dim}${pass} test${C.off}`);
    } catch (err) {
      failures.push('suite di test fallita');
      done(`${C.bad}✗${C.off}`);
      console.log(((err.stdout || '') + (err.stderr || '')).split('\n').slice(-40).map((l) => '    ' + l).join('\n'));
    }
  }
}

/* ── esito ──────────────────────────────────────────────── */
const secs = ((Date.now() - t0) / 1000).toFixed(1);
if (failures.length) {
  console.log(`\n${C.bad}${C.b}✗ ${failures.length} problemi${C.off} ${C.dim}(${secs}s)${C.off}`);
  process.exit(1);
}
console.log(`\n${C.ok}${C.b}✓ tutto verde${C.off} ${C.dim}(${secs}s)${C.off}`);
void pass; void relative;
