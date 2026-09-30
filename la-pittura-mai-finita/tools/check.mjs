#!/usr/bin/env node
/**
 * check.mjs — gate unico di qualità. Nessuna dipendenza.
 *   node tools/check.mjs           tutto
 *   node tools/check.mjs --fast    salta i test
 *
 * Fallisce con exit code != 0 se qualcosa non torna: da usare come
 * required check in CI e prima di un commit.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* Carica nemici.js davvero, in un contesto vuoto. nemici.js non tocca il DOM,
   quindi basta una finestra finta: così i controlli leggono gli oggetti veri e
   non una regex che un giorno mentirà. */
function caricaNemici() {
  const win = { window: {} };
  win.window.window = win.window;
  vm.createContext(win);
  vm.runInContext(readFileSync(join(ROOT, 'js/nemici.js'), 'utf8'), win, { filename: 'js/nemici.js' });
  return win.window;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAST = process.argv.includes('--fast');
const t0 = Date.now();
const fallimenti = [];
const C = { ok: '\x1b[32m', bad: '\x1b[31m', dim: '\x1b[2m', b: '\x1b[1m', off: '\x1b[0m' };

const passo = (nome) => {
  process.stdout.write(`${C.b}${nome}${C.off} ${C.dim}…${C.off} `);
  return (msg) => console.log(msg);
};

/* ── 1. sintassi ─────────────────────────────────────────── */
{
  const done = passo('sintassi');
  const files = [
    'sw.js', 'serve.js',
    ...readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
    ...readdirSync(join(ROOT, 'test')).filter((f) => f.endsWith('.mjs')).map((f) => `test/${f}`),
    ...readdirSync(join(ROOT, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => `tools/${f}`),
  ];
  const brutti = [];
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); }
    catch { brutti.push(f); }
  }
  try { JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8')); }
  catch { brutti.push('data/story.json'); }
  if (brutti.length) { fallimenti.push(`sintassi: ${brutti.join(', ')}`); done(`${C.bad}✗${C.off} ${brutti.join(', ')}`); }
  else done(`${C.ok}✓${C.off} ${C.dim}${files.length + 1} file${C.off}`);
}

/* ── 2. manifest, sw e icone esistono davvero ────────────── */
{
  const done = passo('risorse');
  const problemi = [];
  const man = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const ic of man.icons || []) {
    if (!existsSync(join(ROOT, ic.src))) problemi.push(`icona mancante: ${ic.src}`);
  }
  for (const sc of man.screenshots || []) {
    if (!existsSync(join(ROOT, sc.src))) problemi.push(`screenshot mancante: ${sc.src}`);
  }
  if (!existsSync(join(ROOT, 'icons/apple-touch-icon-180.png'))) problemi.push('manca apple-touch-icon-180.png');

  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const shell = (sw.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
  for (const m of shell.matchAll(/'\.\/([^']+)'/g)) {
    if (!existsSync(join(ROOT, m[1]))) problemi.push(`sw precache mancante: ${m[1]}`);
  }
  if (!sw.includes("const PREFIX = 'lpmf-'")) problemi.push('sw.js senza PREFIX: le cache si mescolerebbero a quelle delle altre app');

  /* ogni file precacato deve esistere davvero, e ogni file js/css deve stare
   * nell'app shell, o non si gioca offline */
  for (const f of ['js/save.js', 'js/memoria.js', 'js/epitaffio.js', 'js/audio.js', 'js/tela.js',
    'js/combat.js', 'js/nemici.js', 'js/scena.js', 'js/app.js', 'js/pwa.js',
    'css/style.css', 'data/story.json', 'index.html', 'offline.html']) {
    if (!shell.includes(`./${f}`)) problemi.push(`${f} non è nell'app shell del sw`);
  }

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const f of ['js/save.js', 'js/memoria.js', 'js/epitaffio.js', 'js/audio.js', 'js/tela.js',
    'js/combat.js', 'js/nemici.js', 'js/scena.js', 'js/app.js', 'js/pwa.js']) {
    if (!html.includes(`src="${f}"`)) problemi.push(`${f} non è incluso in index.html`);
  }
  for (const meta of ['viewport-fit=cover', 'apple-mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style', 'apple-touch-icon']) {
    if (!html.includes(meta)) problemi.push(`manca il meta ${meta}`);
  }

  if (problemi.length) { fallimenti.push(`risorse: ${problemi.join(' | ')}`); done(`${C.bad}✗${C.off} ${problemi.length} problemi`); }
  else done(`${C.ok}✓${C.off} ${C.dim}manifest, sw, index${C.off}`);
}

/* ── 3. i testi ──────────────────────────────────────────── */
{
  const done = passo('testi');
  const st = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  const problemi = [];

  const id = new Set();
  for (const s of st.schede) {
    if (id.has(s.id)) problemi.push(`id scheda duplicato: ${s.id}`);
    id.add(s.id);
    if (!s.nome) problemi.push(`scheda ${s.id} senza "nome" (serve all'epitaffio)`);
    if (!s.versi || s.versi.length < 2) problemi.push(`scheda ${s.id} con meno di due versi`);
    for (const v of s.versi || []) {
      if (v.length > 120) problemi.push(`scheda ${s.id}: verso troppo lungo (${v.length})`);
      if (/\s{2,}/.test(v)) problemi.push(`scheda ${s.id}: doppio spazio nel verso`);
    }
  }

  /* Gli span di colore devono essere chiusi: {a} apre, {/} chiude. Una graffa
   * non chiusa non rompe la pagina — colora() si chiude da sola — ma vuol dire
   * che nel testo c'è una voce che si perde, e questo va saputo. */
  const controlla = (testo, dove) => {
    const s = String(testo);
    let saldo = 0;
    for (const m of s.matchAll(/\{\/?[abcd]?\}/g)) saldo += m[0] === '{/}' ? -1 : 1;
    if (saldo < 0) problemi.push(`${dove}: chiusura di troppo (${s.slice(0, 40)})`);
    else if (saldo > 0) problemi.push(`${dove}: voce non chiusa (${s.slice(0, 40)})`);
  };
  const cammina = (v, path) => {
    if (typeof v === 'string') { controlla(v, path); return; }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) cammina(v[k], `${path}.${k}`);
    }
  };
  cammina(st, 'story');

  /* ogni scheda citata deve esistere davvero, o il Quaderno resta vuoto
   * per sempre e nessuno capisce perché */
  const citate = [];
  const raccogli = (v) => {
    if (Array.isArray(v)) return v.forEach(raccogli);
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if ((k === 'costa' || k === 'dai') && Array.isArray(v[k])) citate.push(...v[k]);
        else raccogli(v[k]);
      }
    }
  };
  raccogli(st.atti);
  /* I frammenti non sono schede: vivono nel loro elenco e si controllano lì,
   * o ogni atto che assegna uno schizzo sembrerebbe citare una scheda
   * inesistente. */
  const frammentiNoti = new Set(Object.keys(st.frammenti || {}));
  const citateDaSchede = citate.filter((c) => !frammentiNoti.has(c));
  for (const c of citateDaSchede) {
    if (!id.has(c)) problemi.push(`scheda citata ma inesistente: ${c}`);
  }
  for (const c of st.schede) {
    if (c.frammento && !frammentiNoti.has(c.frammento)) {
      problemi.push(`la scheda ${c.id} porta lo schizzo inesistente ${c.frammento}`);
    }
  }
  for (const a of st.atti) {
    if (a.frammento && !frammentiNoti.has(a.frammento)) {
      problemi.push(`l'atto ${a.id} assegna lo schizzo inesistente ${a.frammento}`);
    }
  }

  /* nessuna scheda deve essere irraggiungibile */
  const raggiunte = new Set(citate.filter((c) => id.has(c)));
  for (const a of st.atti) for (const s of a.schede || []) raggiunte.add(s);
  for (const a of st.atti) {
    for (const i of a.dai || []) raggiunte.add(i);
    for (const sc of a.scena || []) for (const c of sc.scelte || []) for (const i of c.dai || []) raggiunte.add(i);
    for (const sc of a.dopo || []) for (const i of sc.dai || []) raggiunte.add(i);
  }
  for (const s of st.schede) if (!raggiunte.has(s.id)) problemi.push(`scheda mai assegnata: ${s.id}`);

  /* ogni finale deve esistere per tutte le soglie */
  for (const s of ['voce', 'studio', 'calore', 'cielo', 'cenere']) {
    if (!st.finali[s]) problemi.push(`manca il finale ${s}`);
    else if (!st.finali[s].righe || st.finali[s].righe.length < 3) problemi.push(`finale ${s} troppo corto`);
  }

  /* ogni atto deve avere una tela e una scena */
  for (const a of st.atti) {
    if (!a.titolo || !a.epigrafe || !a.premessa) problemi.push(`atto ${a.id} incompleto`);
    if (!a.combattimento) problemi.push(`atto ${a.id} senza tela`);
    if (!(a.scena || []).length) problemi.push(`atto ${a.id} senza scene`);
  }

  if (problemi.length) {
    fallimenti.push(`testi: ${problemi.join(' | ')}`);
    done(`${C.bad}✗${C.off} ${problemi.length} problemi`);
    for (const p of problemi.slice(0, 20)) console.log(`  · ${p}`);
  }
  else done(`${C.ok}✓${C.off} ${C.dim}${st.schede.length} schede, ${st.atti.length} atti, ${Object.keys(st.finali).length} finali${C.off}`);
}

/* ── 4. i nemici combaciano con il testo ─────────────────── */
{
  const done = passo('nemici');
  const nem = readFileSync(join(ROOT, 'js/nemici.js'), 'utf8');
  const st = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  const problemi = [];
  const ordine = (nem.match(/const ORDINE = \[([\s\S]*?)\];/) || [])[1] || '';
  const nemici = ordine.match(/'([^']+)'/g).map((x) => x.replace(/'/g, ''));
  if (nemici.length !== st.atti.length) problemi.push(`${nemici.length} nemici per ${st.atti.length} atti`);
  st.atti.forEach((a, i) => {
    if (a.combattimento !== nemici[i]) problemi.push(`atto ${a.id} chiama ${a.combattimento}, l'ordine dice ${nemici[i]}`);
  });

  /* Si carica il vero nemici.js invece di leggerlo a regex: un nemico senza
   * nome tra apici verrebbe dato per non definito, e le forme si contano
   * davvero invece che a occhio. */
  const { PMFNemici } = caricaNemici();
  const idSchede = new Set(st.schede.map((x) => x.id));

  for (const id of nemici) {
    const n = PMFNemici.per(id);
    if (!n) { problemi.push(`nemico ${id} non definito in nemici.js`); continue; }
    if (!n.forme || !n.forme.length) problemi.push(`${id}: nessuna forma, il ritratto è vuoto`);
    if (!n.scaletta || !n.scaletta.length) problemi.push(`${id}: nessuna scaletta, non attacca mai`);
    if (!(n.vita > 0)) problemi.push(`${id}: vita ${n.vita} non è un numero positivo`);

    /* ogni azione deve essere una delle quattro che combat.js sa eseguire */
    const azioni = (n.scaletta || []).flatMap((f) => f.azioni || []);
    for (const az of azioni) {
      if (!['mossa', 'domanda', 'asciuga', 'ricorda'].includes(az.t)) {
        problemi.push(`${id}: azione sconosciuta «${az.t}»`);
      }
    }
    /* una domanda deve avere una risposta che esiste, o è irrispondibile */
    for (const d of n.domande || []) {
      if (!idSchede.has(d.risposta)) {
        problemi.push(`${id}: la domanda «${d.testo}» chiede la scheda inesistente ${d.risposta}`);
      }
    }
    for (const az of azioni) {
      if (az.conScheda && !idSchede.has(az.conScheda)) {
        problemi.push(`${id}: parare chiede la scheda inesistente ${az.conScheda}`);
      }
    }
    /* il ritratto deve essere una forma che il pennello può coprire */
    if (n.forme && n.forme.length) {
      for (const f of n.forme) {
        if (f.t === 'ell' && (!(f.rx > 0) || !(f.ry > 0))) problemi.push(`${id}: ellisse degenere`);
        if (f.t === 'pol' && (!f.pts || f.pts.length < 3)) problemi.push(`${id}: poligono con meno di tre vertici`);
      }
    }
  }

  /* ogni tinta deve esistere in tela.js, o il pennello non avrebbe colore */
  const telaSrc = readFileSync(join(ROOT, 'js/tela.js'), 'utf8');
  for (const k of Object.keys(PMFNemici.TINTE)) {
    if (!new RegExp(`\\b${k}:`).test(telaSrc)) {
      problemi.push(`la tinta ${k} non esiste in tela.js: dipingere non avrebbe colore`);
    }
  }
  if (problemi.length) {
    fallimenti.push(`nemici: ${problemi.join(' | ')}`);
    done(`${C.bad}✗${C.off} ${problemi.length} problemi`);
    for (const p of problemi.slice(0, 20)) console.log(`  · ${p}`);
  }
  else done(`${C.ok}✓${C.off} ${C.dim}${nemici.length} nemici${C.off}`);
}

/* ── 5. contrasto ────────────────────────────────────────── */
{
  const done = passo('contrasto');
  try {
    execFileSync(process.execPath, [join(ROOT, 'tools/contrast.mjs'), '--check'], { stdio: 'pipe' });
    done(`${C.ok}✓${C.off} ${C.dim}WCAG AA${C.off}`);
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    fallimenti.push(`contrasto: ${out.trim().split('\n').slice(0, 6).join(' | ')}`);
    done(`${C.bad}✗${C.off} ${out.trim().split('\n').slice(0, 3).join(' ')}`);
  }
}

/* ── 6. peso ─────────────────────────────────────────────── */
{
  const done = passo('peso');
  const budget = { totale: 320 * 1024, js: 190 * 1024 };
  const somma = (dir, filtro) => readdirSync(join(ROOT, dir)).filter(filtro)
    .reduce((n, f) => n + statSync(join(ROOT, dir, f)).size, 0);
  const js = somma('js', (f) => f.endsWith('.js'));
  const totale = js + statSync(join(ROOT, 'css/style.css')).size
    + statSync(join(ROOT, 'index.html')).size
    + statSync(join(ROOT, 'data/story.json')).size;
  const problemi = [];
  if (js > budget.js) problemi.push(`js ${(js / 1024).toFixed(0)}kB > ${(budget.js / 1024).toFixed(0)}kB`);
  if (totale > budget.totale) problemi.push(`totale ${(totale / 1024).toFixed(0)}kB > ${(budget.totale / 1024).toFixed(0)}kB`);
  if (problemi.length) { fallimenti.push(`peso: ${problemi.join(' | ')}`); done(`${C.bad}✗${C.off} ${problemi.join(', ')}`); }
  else done(`${C.ok}✓${C.off} ${C.dim}${(totale / 1024).toFixed(0)}kB totali, ${(js / 1024).toFixed(0)}kB di js, zero dipendenze${C.off}`);
}

/* ── 7. test ─────────────────────────────────────────────── */
if (!FAST) {
  const done = passo('test');
  try {
    execFileSync(process.execPath, ['--test', '--test-reporter=dot'], { cwd: ROOT, stdio: 'pipe' });
    done(`${C.ok}✓${C.off}`);
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).trim();
    fallimenti.push(`test falliti`);
    done(`${C.bad}✗${C.off}`);
    console.log(out.split('\n').slice(-25).map((l) => '  ' + l).join('\n'));
  }
} else {
  const done = passo('test');
  done(`${C.dim}saltati (--fast)${C.off}`);
}

/* ── esito ───────────────────────────────────────────────── */
const ms = Date.now() - t0;
if (fallimenti.length) {
  console.log(`\n${C.bad}${fallimenti.length} controlli falliti${C.off} ${C.dim}(${ms}ms)${C.off}`);
  process.exit(1);
}
console.log(`\n${C.ok}tutto a posto${C.off} ${C.dim}(${ms}ms)${C.off}`);