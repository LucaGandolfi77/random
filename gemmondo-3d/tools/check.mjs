#!/usr/bin/env node
/**
 * check.mjs — gate unico di qualità per GEMMONDO. Nessuna dipendenza.
 *   node tools/check.mjs          tutto
 *   node tools/check.mjs --fast   salta i test
 *
 * Fallisce con exit code != 0 se qualcosa non torna. Da usare in
 * pre-commit e come required check in CI.
 *
 * I controlli statici sono quelli che il browser non ti segnala: un id
 * nell'HTML che il JS non usa, un file che sw.js promette ma non
 * esiste, una versione di cache dimenticata dopo un deploy.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Alpha dei pixel di bordo di un PNG RGBA a 8 bit.
 * Le icone sono generate da gen-icons.cjs con filtro "none", quindi
 * ogni riga ha 1 byte di filtro + 4 byte per pixel: basta zlib-inflate
 * l'IDAT. Se il formato non è quello, si rinuncia e si torna null.
 */
function pngCorners(buf) {
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString('ascii');
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) return null; /* interlacciato: non gestito */
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) return null;
  if (!idat.length) return null;

  let raw;
  try { raw = inflateSync(Buffer.concat(idat)); } catch { return null; }
  const bpp = 4;
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height) return null;

  const alphaAt = (x, y) => raw[y * (stride + 1) + 1 + x * bpp + 3];
  const out = [];
  /* bordo completo: primo e ultima riga, prima e ultima colonna */
  for (let x = 0; x < width; x++) { out.push(alphaAt(x, 0), alphaAt(x, height - 1)); }
  for (let y = 0; y < height; y++) { out.push(alphaAt(0, y), alphaAt(width - 1, y)); }
  return out;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAST = process.argv.includes('--fast');
const failures = [];
const C = { ok: '\x1b[32m', bad: '\x1b[31m', warn: '\x1b[33m', dim: '\x1b[2m', b: '\x1b[1m', off: '\x1b[0m' };

const step = (name) => {
  process.stdout.write(`${C.b}${name}${C.off} ${C.dim}…${C.off} `);
  return (msg) => console.log(msg);
};
const pass = (msg) => `${C.ok}✓${C.off} ${C.dim}${msg}${C.off}`;
const fail = (msg) => `${C.bad}✗${C.off} ${msg}`;
const note = (msg) => `${C.warn}!${C.off} ${msg}`;

/* ── 1. sintassi di ogni file JS ───────────────────────── */
{
  const done = step('sintassi');
  const files = [
    'sw.js', 'serve.js', 'core.js', 'game.js', 'audio.js', 'gen-icons.cjs',
    ...readdirSync(join(ROOT, 'test')).filter((f) => f.endsWith('.mjs')).map((f) => join('test', f)),
    ...(existsSync(join(ROOT, 'tools')) ? readdirSync(join(ROOT, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => join('tools', f)) : []),
  ];
  const bad = [];
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); }
    catch { bad.push(f); }
  }
  if (bad.length) { failures.push(`sintassi: ${bad.join(', ')}`); done(fail(bad.join(', '))); }
  else done(pass(`${files.length} file`));
}

/* ── 2. core.js non deve dipendere dal browser ─────────── */
{
  const done = step('isolamento core');
  const raw = readFileSync(join(ROOT, 'core.js'), 'utf8');
  /* I commenti non contano: core.js documenta il ruolo di localStorage
     pur non toccandolo, e il controllo non deve segnalare un falso. */
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const problems = [];
  if (/from\s+['"]three/.test(src)) problems.push('core.js importa three');
  for (const forbidden of ['document', 'window', 'localStorage', 'navigator', 'requestAnimationFrame']) {
    const uses = src.match(new RegExp(`\\b${forbidden}\\b`, 'g'));
    if (uses) problems.push(`core.js usa "${forbidden}" (${uses.length}×)`);
  }
  if (problems.length) { failures.push(`core: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass('puro: nessun three, nessun DOM'));
}

/* ── 3. gli id che il JS cerca devono esistere nell'HTML ── */
{
  const done = step('id DOM');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const js = readFileSync(join(ROOT, 'game.js'), 'utf8');
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const jsIds = new Set([
    ...[...js.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]),
    ...[...js.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]),
    ...[...js.matchAll(/^\s{2}(\w+):\s*\$\('([^']+)'\)/gm)].map((m) => m[2]),
  ]);
  const missing = [...jsIds].filter((id) => !htmlIds.has(id));
  if (missing.length) { failures.push(`id mancanti: ${missing.join(', ')}`); done(fail(missing.join(', '))); }
  else done(pass(`${jsIds.size} id risolti`));
}

/* ── 4. i file che sw.js precaccia devono esistere ─────── */
{
  const done = step('service worker');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const problems = [];

  const shell = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]);
  for (const p of new Set(shell)) {
    if (p === './') continue;
    if (!existsSync(join(ROOT, p))) problems.push(`sw.js precaccia "${p}" che non esiste`);
  }

  /* Ogni file della shell deve stare nella lista, o il primo avvio
     offline non funziona. */
  const forShell = ['index.html', 'style.css', 'core.js', 'game.js', 'audio.js', 'manifest.json'];
  for (const f of forShell) {
    if (!sw.includes(`'./${f}'`)) problems.push(`${f} non è nel precache di sw.js`);
  }

  /* Il service worker è cache-first: se la versione non cambia, chi ha
     installato l'app non riceve più gli aggiornamenti. */
  const ver = sw.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
  if (!ver) problems.push('sw.js non dichiara CACHE_VERSION');
  if (ver && ver[1] !== 'v3') problems.push(`CACHE_VERSION è "${ver[1]}", atteso "v3"`);

  /* Il fallback a index.html vale solo per le navigazioni: servirlo per
     un'immagine mancante è un bug (era il caso prima). */
  if (/caches\.match\('\.\/index\.html'\)/.test(sw) && !/isNavigation/.test(sw)) {
    problems.push('sw.js serve index.html come fallback generico');
  }

  if (problems.length) { failures.push(`sw: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass(`precache ok, ${ver ? ver[1] : '?'}`));
}

/* ── 5. manifest e icone ───────────────────────────────── */
{
  const done = step('PWA');
  const man = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  const problems = [];

  if (man.id !== './') problems.push(`manifest id è "${man.id}", deve essere "./" (la app vive in una sottocartella)`);
  if (man.scope !== './') problems.push(`scope "${man.scope}" non copre l'app alla root del progetto`);

  const declared = [...man.icons.map((i) => i.src), ...(man.shortcuts || []).flatMap((s) => (s.icons || []).map((i) => i.src))];
  for (const src of new Set(declared)) {
    if (!existsSync(join(ROOT, src))) { problems.push(`manifest dichiara "${src}" che non esiste`); continue; }
    const b = readFileSync(join(ROOT, src));
    if (b.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') { problems.push(`${src} non è un PNG valido`); continue; }
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    const want = Number(man.icons.find((i) => i.src === src)?.sizes?.split('x')[0] || 0);
    if (w !== h || (want && w !== want)) problems.push(`${src} è ${w}x${h}, dichiara ${man.icons.find((i) => i.src === src)?.sizes}`);
  }

  /* La maskable deve essere piena fino ai bordi: il sistema applica la
     sua maschera, e i pixel trasparenti vengono via con il ritaglio.
     Va letto un pixel vero, non l'ultimo byte del file (che è la coda
     del chunk IEND): serve decodificare l'IDAT. */
  const any = man.icons.filter((i) => (i.purpose || 'any') === 'any').map((i) => i.src);
  const mask = man.icons.filter((i) => (i.purpose || '').includes('maskable')).map((i) => i.src);
  if (!mask.length) problems.push('nessuna icona maskable dichiarata');
  for (const m of mask) {
    const px = pngCorners(readFileSync(join(ROOT, m)));
    if (!px) { problems.push(`${m}: non riesco a leggere i pixel`); continue; }
    const trasparenti = px.filter((a) => a < 250).length;
    if (trasparenti) problems.push(`${m}: ${trasparenti} pixel sui bordi non sono pieni (alpha<255), il sistema la ritaglia`);
    for (const a of any) {
      if (a === m) continue;
      if (readFileSync(join(ROOT, a)).equals(readFileSync(join(ROOT, m)))) {
        problems.push(`${m} è identica a ${a}: non è una maskable vera`);
      }
    }
  }

  /* L'icona che il browser mostra nella scheda deve esistere */
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]+href="([^"]+)"/g)) {
    if (!existsSync(join(ROOT, m[1]))) problems.push(`index.html linka "${m[1]}" che non esiste`);
  }

  if (problems.length) { failures.push(`pwa: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass(`${man.icons.length} icone, maskable piena`));
}

/* ── 6. import map e vendor ────────────────────────────── */
{
  const done = step('moduli');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const js = readFileSync(join(ROOT, 'game.js'), 'utf8');
  const problems = [];

  const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!map) problems.push('index.html non ha la import map: i moduli non risolvono');
  else {
    let parsed = null;
    try { parsed = JSON.parse(map[1]); } catch { problems.push('la import map non è JSON valido'); }
    if (parsed) {
      for (const [spec, target] of Object.entries(parsed.imports || {})) {
        if (typeof target !== 'string' || !existsSync(join(ROOT, target.replace(/^\.\//, '')))) {
          if (!target.endsWith('/')) problems.push(`import "${spec}" punta a "${target}" che non esiste`);
        }
      }
      if (!parsed.imports?.three) problems.push('la import map non mappa "three"');
    }
  }

  /* Ogni import di game.js deve essere coperto dalla import map o
     essere un file locale. */
  const specs = [...js.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  const local = new Set(['./audio.js', './core.js']);
  for (const spec of new Set(specs)) {
    if (local.has(spec)) continue;
    if (spec === 'three' || spec.startsWith('three/addons/')) continue;
    problems.push(`game.js importa "${spec}": non coperto dalla import map né locale`);
  }

  /* Il vecchio build UMD non deve più essere referenziato. */
  if (html.includes('three.min.js')) problems.push('index.html carica ancora three.min.js (build UMD, r149)');

  if (problems.length) { failures.push(`moduli: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass(`${new Set(specs).size} import risolti`));
}

/* ── 7. le API di Three che sono cambiate di versione ───── */
{
  const done = step('API three');
  const js = readFileSync(join(ROOT, 'game.js'), 'utf8');
  const problems = [];
  if (/outputEncoding\s*=/.test(js)) problems.push('outputEncoding è pre-r152: usa outputColorSpace');
  if (/\.sRGBEncoding/.test(js)) problems.push('THREE.sRGBEncoding non esiste più: usa SRGBColorSpace');
  if (/physicallyCorrectLights|useLegacyLights/.test(js)) problems.push('useLegacyLights è rimosso');
  if (problems.length) { failures.push(`api: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass('nessuna API rimossa'));
}

/* ── 8. CSS bilanciato e senza marcatori rotti ─────────── */
{
  const done = step('CSS');
  const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
  const problems = [];
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open !== close) problems.push(`graffe non bilanciate: ${open} aperte, ${close} chiuse`);
  if (/@[*/]\s*$|@[*/][^\n]*[*/]?@[*/]/.test(css)) problems.push('marker di commento CSS rotti (@* o @/)');
  if (problems.length) { failures.push(`css: ${problems.join('; ')}`); done(fail(problems.join('; '))); }
  else done(pass(`${open} regole`));
}

/* ── 9. nessun colore magico senza spiegazione? (info) ─── */
{
  const done = step('igiene');
  const notes = [];
  const files = ['game.js', 'core.js'];
  let big = 0;
  for (const f of files) {
    const lines = readFileSync(join(ROOT, f), 'utf8').split('\n').length;
    if (lines > 1500) notes.push(`${f} ha ${lines} righe: valuta se è ancora il posto giusto`);
    big = Math.max(big, lines);
  }
  if (notes.length) done(note(notes.join('; ')));
  else done(pass(`file più grande: ${big} righe`));
}

/* ── 10. test ──────────────────────────────────────────── */
if (!FAST) {
  const done = step('test');
  try {
    const out = execFileSync(process.execPath, ['--test', 'test/**/*.test.mjs'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const m = out.match(/ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/);
    if (m && m[2] !== '0') { failures.push(`test: ${m[2]} falliti`); done(fail(`${m[1]} pass, ${m[2]} fail`)); }
    else done(pass(`${m ? m[1] : '?'} test`));
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
    failures.push(`test: ${m ? m[2] : '?'} falliti`);
    done(fail(out.split('\n').filter((l) => l.startsWith('not ok')).slice(0, 3).join(' | ') || 'test falliti'));
  }
}

/* ── risultato ─────────────────────────────────────────── */
console.log('');
if (failures.length) {
  console.log(`${C.bad}${C.b}${failures.length} controlli falliti${C.off}`);
  for (const f of failures) console.log(`  ${C.bad}✗${C.off} ${f}`);
  process.exit(1);
}
console.log(`${C.ok}${C.b}tutto ok${C.off}`);