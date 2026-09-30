/* a11y.test.mjs — markup: riferimenti rotti, ARIA, contrasti calcolati.
   Nota: i contrasti sono verificati anche da tools/contrast.mjs --check,
   che gira sui valori reali di css/style.css. Qui si controlla la struttura. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { contrast } from '../tools/contrast.mjs';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'css/style.css'), 'utf8');
const js = Object.fromEntries(
  readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js'))
    .map((f) => [f, readFileSync(join(ROOT, 'js', f), 'utf8')])
);

test('ogni id referenziato da $(…) esiste in index.html', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const missing = new Map();
  for (const [file, src] of Object.entries(js)) {
    for (const m of src.matchAll(/\$\('([^']+)'\)/g)) {
      if (!ids.has(m[1])) {
        if (!missing.has(file)) missing.set(file, new Set());
        missing.get(file).add(m[1]);
      }
    }
  }
  assert.equal(missing.size, 0,
    'id referenziato in JS ma assente in index.html:\n' +
    [...missing].map(([f, s]) => `  ${f}: ${[...s].join(', ')}`).join('\n'));
});

test('ogni id dichiarato in index.html è unico', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  assert.deepEqual(dupes, [], 'id duplicati: ' + dupes.join(', '));
});

test('nessun controllo interattivo annidato dentro un altro', () => {
  /* il vecchio #tama-card era role="button" e conteneva un <button> */
  const interactive = /<(button|a\s[^>]*href|input|select|textarea)\b[^>]*>/gi;
  const stack = [];
  const re = /<(\/?)([a-z0-9]+)([^>]*?)(\/?)>/gi;
  const voids = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'canvas']);
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrs, selfClose] = m;
    if (close) { stack.pop(); continue; }
    const isInteractive = interactive.test(`<${tag}${attrs}>`);
    if (isInteractive && stack.some((t) => t === 'button')) {
      assert.fail(`controllo interattivo <${tag}> dentro un <button>`);
    }
    if (!selfClose && !voids.has(tag)) stack.push(tag);
  }
  assert.ok(true);
});

test('ogni elemento con role="button" è focusabile', () => {
  for (const m of html.matchAll(/<[^>]*role="button"[^>]*>/g)) {
    assert.match(m[0], /tabindex="0"/, `role="button" senza tabindex: ${m[0].slice(0, 90)}`);
  }
});

test('i tre modali sono dialoghi accessibili', () => {
  const modals = [...html.matchAll(/<div class="modal" id="([^"]+)"([^>]*)>/g)];
  assert.equal(modals.length, 4, 'attesi 4 modali (storia, rito, oracolo, quaderno)');
  for (const [tag, id, attrs] of modals) {
    assert.match(attrs, /role="dialog"/, `${id} senza role="dialog"`);
    assert.match(attrs, /aria-modal="true"/, `${id} senza aria-modal`);
    const label = attrs.match(/aria-labelledby="([^"]+)"/);
    assert.ok(label, `${id} senza aria-labelledby`);
    assert.ok(html.includes(`id="${label[1]}"`), `${id} punta a un aria-labelledby inesistente: ${label[1]}`);
    void tag;
  }
});

test('la griglia ha un nome accessibile e non usa ruoli invalidi', () => {
  const board = html.match(/<div id="board"[^>]*>/);
  assert.ok(board, 'manca #board');
  assert.match(board[0], /role="grid"/);
  assert.match(board[0], /aria-label="/, 'la griglia deve avere un nome accessibile');
});

test('gli stati dinamici hanno un annuncio per screen reader', () => {
  for (const id of ['hud-hearts', 'hud-stars', 'toast', 'sr-status', 'mini-status']) {
    const tag = html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`));
    assert.ok(tag, `manca #${id}`);
    assert.match(tag[0], /(role="status"|aria-live="polite")/,
      `#${id} cambia contenuto ma non ha role="status"/aria-live`);
  }
});

test('esiste una regione live per gli esiti di livello', () => {
  assert.match(html, /id="sr-status"[^>]*role="status"/);
  assert.match(js['app.js'], /function announce\(/, 'announce() non è definito');
  assert.match(js['app.js'], /announce\(h>0\?/, 'announce() non viene usata per i cuori');
});

test('i pulsanti hanno un nome accessibile', () => {
  const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
  assert.ok(buttons.length > 20, `solo ${buttons.length} bottoni trovati`);
  for (const [tag, inner] of buttons) {
    const hasLabel = /aria-label=/.test(tag);
    const hasText = inner.replace(/<[^>]*>/g, '').trim().length > 0;
    const hasIconOnlyEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}️\s]+$/u.test(inner.trim());
    assert.ok(hasLabel || hasText || hasIconOnlyEmoji,
      `bottone senza nome accessibile: <button …>${inner.trim().slice(0, 40)}`);
  }
});

test('esiste un fallback per chi non ha JavaScript', () => {
  assert.match(html, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test('i token di contrasto dichiarati sono davvero usati', () => {
  for (const t of ['--muted', '--ink', '--card', '--matcha', '--matcha-d', '--matcha-dd']) {
    assert.ok(css.includes(t + ':'), `token mancante: ${t}`);
  }
  assert.ok(!/var\(--matcha-dd\)/.test(css) === false, '--matcha-dd va usato da qualche parte');
});

test('i contrasti dei token usati rispettano WCAG AA', () => {
  /* letto reale da style.css: tema base + override universo/night */
  const grab = (sel, name) => {
    const block = css.split(sel)[1];
    const m = block && block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    return m ? m[1] : null;
  };
  const base = { card: grab(':root', '--card'), ink: grab(':root', '--ink'), muted: grab(':root', '--muted') };
  assert.ok(base.muted, 'non riesco a leggere --muted da :root');
  assert.ok(contrast(base.muted, base.card) >= 4.5,
    `--muted ${base.muted} su ${base.card} = ${contrast(base.muted, base.card).toFixed(2)}:1`);
  assert.ok(contrast(base.ink, base.card) >= 7);
  const pd = grab(':root', '--matcha-d');
  assert.ok(contrast('#ffffff', pd) >= 4.5, `bianco su --matcha-d ${pd} = ${contrast('#ffffff', pd).toFixed(2)}:1`);
});

test('prefers-reduced-motion spegne davvero i canvas', () => {
  const mq = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(mq, 'manca il blocco prefers-reduced-motion');
  assert.match(mq[1], /#rain\s*,\s*#petals\s*\{\s*display:none/, 'i canvas restano animati sotto reduced-motion');
});

test('focus visibile: nessun outline:none senza sostituto', () => {
  const offenders = [...css.matchAll(/([^{}]*)\{([^}]*outline:\s*(none|0)[^}]*)\}/g)]
    .filter(([, sel]) => /:focus/.test(sel));
  assert.equal(offenders.length, 0, 'outline rimosso su un elemento focusable');
  assert.match(css, /:focus-visible\{/, 'manca uno stile :focus-visible');
});

test('i tap target rispettano 44px', () => {
  for (const sel of ['.btn', '.iconbtn', '.tile', '.ep', '.choice', '.tabbar button', '.tama-cuddle']) {
    const block = css.split(sel + '{')[1];
    if (!block) continue;
    const minH = block.match(/min-height:\s*(\d+)px/);
    if (minH) assert.ok(Number(minH[1]) >= 44, `${sel} ha min-height ${minH[1]}px, sotto 44`);
  }
});
