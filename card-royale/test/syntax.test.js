import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// These touch browser globals (document/self) at import time; parse-check only in Node
const DOM_AT_IMPORT = new Set(['main.js', 'sw.js']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'test' || name === '.git') continue;
      walk(p, out);
    } else if (name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

test('all JS modules parse as ES modules', async () => {
  const files = walk(root);
  assert.ok(files.length >= 10, 'expected to find project JS files');
  for (const f of files) {
    const base = f.split('/').pop();
    if (DOM_AT_IMPORT.has(base)) {
      execFileSync(process.execPath, ['--input-type=module', '--check'], {
        input: readFileSync(f),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      continue;
    }
    const url = new URL('file://' + f);
    await assert.doesNotReject(
      () => import(url.href),
      `failed to import ${f}`
    );
  }
});

test('index.html references existing assets and closes #app', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('data:')) continue;
    assert.ok(existsSync(join(root, ref)), `missing asset referenced by index.html: ${ref}`);
  }
  assert.ok(html.includes('</div>\n</body>') || html.trimEnd().endsWith('</html>'), 'html should be closed');
  const openApp = (html.match(/<div id="app">/g) || []).length;
  const closeDivs = (html.match(/<\/div>/g) || []).length;
  const openDivs = (html.match(/<div\b/g) || []).length;
  assert.equal(openDivs, closeDivs, `unbalanced div tags: ${openDivs} open vs ${closeDivs} close`);
});

test('service worker asset list only references existing files', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const listStart = sw.indexOf('const ASSETS');
  const listEnd = sw.indexOf('];', listStart);
  assert.ok(listStart >= 0 && listEnd > listStart, 'ASSETS list not found');
  const block = sw.slice(listStart, listEnd);
  for (const m of block.matchAll(/'(\.\/[^']+)'/g)) {
    const rel = m[1].replace(/^\.\//, '');
    const path = rel === '' ? root : join(root, rel);
    assert.ok(existsSync(path), `sw.js references missing asset: ${m[1]}`);
  }
});

test('manifest icons exist', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  assert.ok(manifest.name);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), `missing manifest icon ${icon.src}`);
  }
});

test('main.js has no escaped-template syntax errors', () => {
  const src = readFileSync(join(root, 'js/main.js'), 'utf8');
  assert.ok(!/innerHTML = \\`/.test(src), 'found escaped template literal in main.js');
  assert.ok(!/innerHTML = \\$/.test(src), 'found escaped interpolation in main.js');
});
