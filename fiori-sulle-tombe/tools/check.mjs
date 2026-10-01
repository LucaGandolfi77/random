#!/usr/bin/env node
/**
 * check.mjs — gate unico di qualità. Nessuna dipendenza.
 *   node tools/check.mjs           tutto
 *   node tools/check.mjs --fast    salta i test
 *
 * Fallisce con exit code != 0 se qualcosa non torna: da usare come
 * required check in CI e prima di un commit.
 *
 * I controlli non sono un elenco di buone maniere: sono le cose che in questo
 * gioco specifico, se sbagli, non si vedono. Il più importante di tutti è il
 * numero 3d — un flag scritto da una scelta e mai letto da nessuno è una
 * scelta che non è mai successa, e in una telenovela è la peggiore bug
 * possibile perché sembra che funzioni.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* Carica vasi.js davvero, in un contesto vuoto. vasi.js non tocca il DOM,
   quindi basta una finestra finta: così i controlli leggono gli oggetti veri e
   non una regex che un giorno mentirà.
 *
 * Prima va orto.js, perché `vasi.js` misura le sue figure per ricavare la
 * spesa: è una dipendenza vera, non un dettaglio. Caricandolo da solo,
   `window.FSTOrto` è undefined e la spesa verrebbe 0 — cioè un vaso che non
 * chiede niente e si riempie subito. Per questo l'ordine è dichiarato qui e il
   caricamento fallisce se qualcosa manca, invece di proseguire con numeri
 * inventati. */
function caricaVasi() {
  const win = { window: {} };
  win.window.window = win.window;
  vm.createContext(win);
  for (const f of ['js/orto.js', 'js/vasi.js']) {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), win, { filename: f });
  }
  if (!win.window.FSTOrto || !win.window.FSTVasi) {
    throw new Error('orto.js o vasi.js non si sono caricati: i controlli sui vasi non hanno niente da guardare');
  }
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
  if (!sw.includes("const PREFIX = 'fst-")) problemi.push('sw.js senza PREFIX: le cache si mescolerebbero a quelle delle altre app');

  /* ogni file precacato deve esistere davvero, e ogni file js/css deve stare
   * nell'app shell, o non si gioca offline */
  const CORE = ['js/save.js', 'js/memoria.js', 'js/epitaffio.js', 'js/audio.js', 'js/orto.js',
    'js/dono.js', 'js/vasi.js', 'js/scena.js', 'js/app.js', 'js/pwa.js',
    'css/style.css', 'data/story.json', 'index.html', 'offline.html'];
  for (const f of CORE) {
    if (!shell.includes(`./${f}`)) problemi.push(`${f} non è nell'app shell del sw`);
  }

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const f of CORE.filter((f) => f.startsWith('js/'))) {
    if (!html.includes(`src="${f}"`)) problemi.push(`${f} non è incluso in index.html`);
  }
  for (const meta of ['viewport-fit=cover', 'apple-mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style', 'apple-touch-icon']) {
    if (!html.includes(meta)) problemi.push(`manca il meta ${meta}`);
  }

  /* Ogni id che app.js cerca deve esistere nel documento: un id sparito è un
   * crash silenzioso, perché `$('#x')` restituisce null e il codice non lo
   * nota fino a quando lo tocca. */
  const appSrc = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  const idsHtml = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of new Set([...appSrc.matchAll(/\$\('#([a-z0-9-]+)'/g)].map((m) => m[1]))) {
    if (!idsHtml.has(m)) problemi.push(`app.js cerca #${m}, che in index.html non esiste`);
  }
  const dup = [...idsHtml].filter((id) => (html.match(new RegExp(`id="${id}"`, 'g')) || []).length > 1);
  for (const id of dup) problemi.push(`id duplicato in index.html: ${id}`);

  if (problemi.length) { fallimenti.push(`risorse: ${problemi.join(' | ')}`); done(`${C.bad}✗${C.off} ${problemi.length} problemi`); }
  else done(`${C.ok}✓${C.off} ${C.dim}manifest, sw, index, ${idsHtml.size} id${C.off}`);
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
    if (!s.titolo) problemi.push(`scheda ${s.id} senza "titolo" (serve al Mazzetto)`);
    if (!s.versi || s.versi.length < 2) problemi.push(`scheda ${s.id} con meno di due versi`);
    if (!s.persona) problemi.push(`scheda ${s.id} senza "persona": non si sa di chi è`);
    for (const v of s.versi || []) {
      if (v.length > 120) problemi.push(`scheda ${s.id}: verso troppo lungo (${v.length})`);
      if (/\s{2,}/.test(v)) problemi.push(`scheda ${s.id}: doppio spazio nel verso`);
    }
  }

  /* Le persone delle schede devono essere nel cast: una scheda di una persona
   * che il Cast non conosce è un buco nella vista del cast, e la vista del cast
   * è una delle cose che questo gioco ha promesso. */
  const nelCast = new Set((st.cast || []).map((c) => c.id));
  if (!st.cast || !st.cast.length) problemi.push('manca il cast');
  for (const c of st.cast || []) {
    for (const campo of ['id', 'nome', 'ruolo']) {
      if (!c[campo]) problemi.push(`cast ${c.id || '?'} senza "${campo}"`);
    }
    if (!c.arco || c.arco.length !== 3) problemi.push(`cast ${c.id}: l'arco deve avere esattamente tre frasi`);
    for (const f of c.arco || []) {
      if (!f || !f.trim()) problemi.push(`cast ${c.id}: una frase d'arco è vuota`);
    }
  }
  for (const s of st.schede) {
    if (!nelCast.has(s.persona)) problemi.push(`scheda ${s.id}: la persona "${s.persona}" non è nel cast`);
  }

  /* Gli span di colore devono essere chiusi: {a} apre, {/} chiude. Una graffa
   * non chiusa non rompe la pagina — colora() si chiude da solo — ma vuol dire
   * che nel testo c'è una voce che si perde, e questo va saputo. */
  const controlla = (testo, dove) => {
    const s = String(testo);
    let saldo = 0;
    for (const m of s.matchAll(/\{\/?[abcd]?\}/g)) saldo += m[0] === '{/}' ? -1 : 1;
    if (saldo < 0) problemi.push(`${dove}: chiusura di troppo (${s.slice(0, 40)})`);
    else if (saldo > 0) problemi.push(`${dove}: voce non chiusa (${s.slice(0, 40)})`);
    /* Uno spazio dentro le graffe non viene riconosciuto da nessuno: è un
     * testo che sembra colorato e non lo è. Solo le voci: `{/}` è markup
     * valido e non ha niente a che fare con questo controllo. */
    for (const m of s.matchAll(/\{\s+[abcd]\}/g)) problemi.push(`${dove}: spazio dentro le graffe (${s.slice(Math.max(0, m.index - 20), m.index + 20)})`);
  };
  const cammina = (v, path) => {
    if (typeof v === 'string') { controlla(v, path); return; }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) cammina(v[k], `${path}.${k}`);
    }
  };
  cammina(st, 'story');

  /* ogni scheda citata deve esistere davvero, o il Mazzetto resta vuoto
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
  for (const a of st.atti) for (const s of a.schede || []) citate.push(s);

  for (const c of citate) if (!id.has(c)) problemi.push(`scheda citata ma inesistente: ${c}`);

  /* nessuna scheda deve essere irraggiungibile: una scheda che nessuno
   * assegna mai è un Mazzetto con un buco, e un buco non lo nota nessuno */
  const raggiunte = new Set(citate.filter((c) => id.has(c)));
  for (const c of st.schede) if (!raggiunte.has(c.id)) problemi.push(`scheda mai assegnata: ${c.id}`);

  /* ogni finale deve esistere per tutte le soglie */
  for (const s of ['giardino', 'vigna', 'prato', 'spoglio', 'terra']) {
    if (!st.finali[s]) problemi.push(`manca il finale ${s}`);
    else {
      const f = st.finali[s];
      if (!f.righe || f.righe.length < 3) problemi.push(`finale ${s} troppo corto`);
      for (const campo of ['nome', 'condizione', 'quadro', 'sotto', 'azioni']) {
        if (!f[campo]) problemi.push(`finale ${s} senza "${campo}"`);
      }
    }
  }
  /* ogni chiave di finale deve comparire in memoria.js, o il gioco non la
   * saprà mai scegliere e la schermata finale mostrerà un fallback */
  const memoriaSrc = readFileSync(join(ROOT, 'js/memoria.js'), 'utf8');
  for (const s of Object.keys(st.finali)) {
    if (!memoriaSrc.includes(`'${s}'`)) problemi.push(`il finale "${s}" non compare in memoria.js: non si può mai raggiungere`);
  }

  /* ogni atto deve avere un orto e almeno una scena */
  for (const a of st.atti) {
    if (!a.titolo || !a.epigrafe || !a.premessa) problemi.push(`atto ${a.id} incompleto`);
    if (!a.combattimento) problemi.push(`atto ${a.id} senza orto`);
    if (!(a.scena || []).length) problemi.push(`atto ${a.id} senza scene`);
    if (a.id !== st.atti[st.atti.length - 1].id && !(a.dopo || []).length) problemi.push(`atto ${a.id} senza scene dopo`);
  }
  for (let i = 0; i < st.atti.length; i++) {
    if (st.atti[i].ordine !== i) problemi.push(`atto ${st.atti[i].id}: ordine ${st.atti[i].ordine} ma sta in posizione ${i}`);
  }
  const ultimo = st.atti[st.atti.length - 1];
  if (!ultimo.finale) problemi.push(`l'ultimo atto (${ultimo.id}) non ha "finale": il gioco non finisce mai`);

  if (problemi.length) {
    fallimenti.push(`testi: ${problemi.join(' | ')}`);
    done(`${C.bad}✗${C.off} ${problemi.length} problemi`);
    for (const p of problemi.slice(0, 20)) console.log(`  · ${p}`);
  }
  else done(`${C.ok}✓${C.off} ${C.dim}${st.schede.length} schede, ${st.atti.length} atti, ${Object.keys(st.finali).length} finali, ${st.cast.length} nel cast${C.off}`);
}

/* ── 4. i vasi combaciano col testo e l'arco è reale ─────── */
{
  const done = passo('vasi');
  const st = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  const vasiSrc = readFileSync(join(ROOT, 'js/vasi.js'), 'utf8');
  const problemi = [];

  const ordine = (vasiSrc.match(/const ORDINE = \[([\s\S]*?)\];/) || [])[1] || '';
  const ordineVasi = ordine.match(/'([^']+)'/g).map((x) => x.replace(/'/g, ''));
  if (ordineVasi.length !== st.atti.length) problemi.push(`${ordineVasi.length} vasi per ${st.atti.length} atti`);
  st.atti.forEach((a, i) => {
    if (a.combattimento !== ordineVasi[i]) problemi.push(`atto ${a.id} chiama ${a.combattimento}, l'ordine dice ${ordineVasi[i]}`);
  });

  /* Si carica il vero vasi.js invece di leggerlo a regex: un vaso senza nome
   * tra apici verrebbe dato per non definito, e le forme si contano davvero
   * invece che a occhio. */
  const { FSTVasi } = caricaVasi();
  const idSchede = new Set(st.schede.map((x) => x.id));
  const personeCast = new Set((st.cast || []).map((c) => c.id));

  for (const id of ordineVasi) {
    const v = FSTVasi.VASI[id];
    if (!v) { problemi.push(`vaso ${id} non definito in vasi.js`); continue; }
    if (!v.forme || !v.forme.length) problemi.push(`${id}: nessuna forma, l'orto è vuoto`);
    if (!v.scaletta || !v.scaletta.length) problemi.push(`${id}: nessuna scaletta, non beve mai`);
    if (!(v.spesa > 0)) problemi.push(`${id}: spesa ${v.spesa} non è un numero positivo`);
    if (!v.titolo) problemi.push(`${id}: senza titolo, e il titolo è la frase che spiega il vaso`);
    if (v.persona && !personeCast.has(v.persona)) problemi.push(`${id}: dice di essere "${v.persona}", che non è nel cast`);

    /* ogni azione deve essere una delle quattro che dono.js sa eseguire */
    for (const fase of v.scaletta || []) {
      for (const az of fase.azioni || []) {
        if (!['mossa', 'domanda', 'appassisce', 'ricorda'].includes(az.t)) {
          problemi.push(`${id}: azione sconosciuta «${az.t}»`);
        }
      }
    }
    /* una domanda deve avere una risposta che esiste, o è irrispondibile */
    for (const dd of v.domande || []) {
      if (!idSchede.has(dd.risposta)) problemi.push(`${id}: la domanda «${dd.testo}» chiede la scheda inesistente ${dd.risposta}`);
    }
    for (const fase of v.scaletta || []) {
      for (const az of fase.azioni || []) {
        if (az.conScheda && !idSchede.has(az.conScheda)) problemi.push(`${id}: la resa chiede la scheda inesistente ${az.conScheda}`);
      }
    }
    /* il ritratto deve essere una forma che il dito può coprire */
    for (const f of v.forme || []) {
      if (f.t === 'ell' && (!(f.rx > 0) || !(f.ry > 0))) problemi.push(`${id}: ellisse degenere`);
      if (f.t === 'pol' && (!f.pts || f.pts.length < 3)) problemi.push(`${id}: poligono con meno di tre vertici`);
    }

    /* L'ARCO È REALE, non dichiarato: se uno stato non ha un override, gli
     * si può dire "sei cambiata" e poi non cambia niente. È la bug più
     * insidiosa di questo gioco, perché si vede solo al terzo vaso. */
    if (v.persona) {
      for (let stt = 1; stt <= 2; stt++) {
        const haForme = v.formePerStato && v.formePerStato[stt - 1];
        const haDomande = v.domandePerStato && v.domandePerStato[stt - 1];
        if (!haForme && !haDomande) {
          problemi.push(`${id}: stato ${stt} non cambia niente (nessun override di forme o domande): l'arco sarebbe una dichiarazione`);
        }
      }
      for (const fase of v.scaletta || []) {
        for (const az of fase.azioni || []) {
          if (az.t === 'mossa' && az.resabile === undefined) problemi.push(`${id}: azione senza "resabile" — o si può lasciar andare o no, e dirlo è obbligatorio`);
        }
      }
    }
  }

  /* ogni fiore della palette deve esistere in orto.js, o il pennello non
   * avrebbe colore. La palette si cerca dove è, non dove era: qui leggeva la
   * forma della riga `for (const k of [...])`, e quando la lista è diventata una
   * costante con un nome — cioè quando ha smesso di essere una lista buttata li
   * — il gate ha smesso di vedere i fiori e si è messo a segnalare che non
   * esistono. Un gate che sparisce quando improve il codice è un gate che
   * aspetta solo che qualcuno abbia fretta. */
  const ortoSrc = readFileSync(join(ROOT, 'js/orto.js'), 'utf8');
  const appSrc = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  const costante = (appSrc.match(/const\s+FIORI_PALETTA\s*=\s*\[([^\]]+)\]/) || [])[1];
  const letterale = (appSrc.match(/for \(const k of \[([^\]]+)\]\) \{/) || [])[1];
  const palette = costante || letterale || '';
  const fiori = [...palette.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  if (!fiori.length) problemi.push('app.js non ha una palette di fiori');
  if (costante && !new RegExp(`for\\s*\\(const k of ${'FIORI_PALETTA'}\\)`).test(appSrc)) {
    problemi.push('la palette è dichiarata ma nessuno la usa: il giocatore non può scegliere il fiore');
  }
  for (const k of fiori) {
    if (!new RegExp(`\\b${k}:`).test(ortoSrc)) problemi.push(`il fiore "${k}" non esiste in orto.js: dare non avrebbe colore`);
  }
  if (fiori.length && fiori.length > 6) problemi.push(`${fiori.length} fiori nella palette: la barra non ci sta sul telefono`);

  if (problemi.length) {
    fallimenti.push(`vasi: ${problemi.join(' | ')}`);
    done(`${C.bad}✗${C.off} ${problemi.length} problemi`);
    for (const p of problemi.slice(0, 20)) console.log(`  · ${p}`);
  }
  else done(`${C.ok}✓${C.off} ${C.dim}${ordineVasi.length} vasi, arco a 3 stati, ${fiori.length} fiori${C.off}`);
}

/* Carica memoria.js davvero, in una finestra finta. Serve a una cosa sola:
 * capire quali flag il CODICE legge, senza doverlo dedurre da una regex sul
 * sorgente — che conta anche i commenti, e quindi approva il gate per un
 * motivo che non c'entra. */
function caricaMemoria() {
  const win = { window: {} };
  win.window.window = win.window;
  vm.createContext(win);
  for (const f of ['js/save.js', 'js/memoria.js']) {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), win, { filename: f });
  }
  return win.window.FSTMemoria;
}

/* ── 5. il gate delle scelte: un flag scritto deve essere letto ── */
{
  const done = passo('scelte');
  const st = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  const problemi = [];

  const scritti = new Map();   // flag -> quante scelte lo scrivono
  const letti = new Set();

  for (const a of st.atti) {
    for (const scn of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of scn.scelte || []) {
        for (const k of Object.keys(c.imposta || {})) scritti.set(k, (scritti.get(k) || 0) + 1);
        for (const k of Object.keys(c.se || {})) letti.add(k);
      }
      for (const bt of scn.battute || []) {
        for (const k of Object.keys(bt.se || {})) letti.add(k);
      }
    }
  }
  /* Anche i finali leggono flag: una scelta che cambia solo il testo della
   * schermata finale è una scelta vera quanto le altre. */
  const testoFinali = Object.values(st.finali).map((f) => f.righe.join('\n')).join('\n');
  for (const m of testoFinali.matchAll(/\{([a-z]\d_[a-z_]+)\}/g)) letti.add(m[1]);
  /* E il codice. Qui prima c'era una regex sul sorgente di memoria.js, e il
   * gate passava per un motivo sbagliato: la regex non distingueva il codice
   * dai commenti, quindi contava come «flag letti» anche quelli nominati in una
   * frase di spiegazione. Un gate che passa perché ha letto la mia prosa è
   * peggio di un gate assente, perché è verde.
   *
   * Adesso si chiama il modulo vero e gli si chiede: «se metto questo flag,
   * cambia qualcosa?». La risposta non è una supposizione. */
  const Mem = caricaMemoria();
  for (const k of scritti.keys()) {
    const a = { scelte: {} };
    const b = { scelte: {} };
    a.scelte[k] = 'valore-prova-1';
    b.scelte[k] = 'valore-prova-2';
    if (JSON.stringify(Mem.promessaMantenuta(a)) !== JSON.stringify(Mem.promessaMantenuta(b))) letti.add(k);
  }

  for (const k of scritti.keys()) {
    if (!letti.has(k)) problemi.push(`flag "${k}" scritto da ${scritti.get(k)} scelte e letto da nessuno: quelle scelte non cambiano niente`);
  }
  for (const k of letti) {
    if (!scritti.has(k)) problemi.push(`flag "${k}" letto ma mai scritto: la condizione non può mai valere`);
  }

  /* ── e la finestra: quanto ci mette una scelta a tornare ────
   *
   * «Tutti letti» è vero e non basta. Un flag riletto cinque atti dopo è un
   * flag che il giocatore ha già dimenticato di aver scelto: la scelta smette
   * di essere una scelta e diventa un tasto premuto una volta e sei mesi prima.
   * Il gioco non se ne accorge, perché il flag c'è e la frase c'è — solo che
   * non collegano niente a nessuno.
   *
   * Qui la finestra è di due atti: la stessa distanza degli schemi del vaso, e
   * non un numero inventato per far passare quello che c'è. I `dopo` contano
   * come letture vere e proprie — sono nell'atto in cui nascono, o in quello
   * dopo — perché una scelta che torna subito dopo l'orto è una scelta che
   * torna. */
  const ordineAtto = {};
  st.atti.forEach((a, i) => { ordineAtto[a.id] = i; });

  const scritte = {};
  const lette = {};
  for (const a of st.atti) {
    for (const scn of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of scn.scelte || []) {
        for (const k of Object.keys(c.imposta || {})) {
          if (scritte[k] === undefined) scritte[k] = a.id;
        }
      }
      for (const b of scn.battute || []) {
        for (const k of Object.keys(b.se || {})) (lette[k] = lette[k] || []).push(a.id);
      }
    }
  }

  for (const [k, at] of Object.entries(scritte)) {
    if (!letti.has(k)) continue;   // già segnalato sopra: mai letto
    /* Il codice non ha un atto: conta come letto ovunque, perché una promessa
     * che decide il finale non ha scadenza — la vedi quando arrivi. */
    const a = { scelte: {} };
    const b = { scelte: {} };
    a.scelte[k] = 'valore-prova-1';
    b.scelte[k] = 'valore-prova-2';
    const lettoDalCodice = Mem.promessaMantenuta(a) !== Mem.promessaMantenuta(b);
    if (lettoDalCodice) continue;

    const momenti = [...new Set(lette[k])];
    /* Basta una lettura dentro la finestra. Un richiamo lontano non è un
     * difetto: è l'eco finale, e serve — se la scelta torna subito e poi si
     * ricorda alla fine, il giocatore la vive due volte, che è quello che si
     * voleva. Il difetto è quando NON torna mai in tempo, e la cosa che torna
     * tardi è l'unica. */
    const vicino = Math.min(...momenti.map((m) => Math.abs(ordineAtto[m] - ordineAtto[at])));
    if (vicino > 2) {
      problemi.push(`flag "${k}" scritto all'atto ${at} e riletto solo ${momenti.join(', ')}: mai entro due atti, e il giocatore non si ricorda di averlo scelto`);
    }
  }

  /* Ogni scelta deve scrivere qualcosa o costare qualcosa. Una scelta che non
   * fa né l'uno né l'altro è un tasto decorativo, e in un gioco che ha deciso
   * che le scelte contano è un bug. */
  for (const a of st.atti) {
    for (const scn of [...(a.scena || []), ...(a.dopo || [])]) {
      for (const c of scn.scelte || []) {
        const fa = (c.imposta && Object.keys(c.imposta).length) || (c.costa || []).length || (c.dai || []).length;
        if (!fa) problemi.push(`scelta ${c.id} non imposta, non costa e non dà niente`);
        if (!c.nota) problemi.push(`scelta ${c.id} senza nota: il giocatore non sa cosa sta scegliendo`);
      }
    }
  }

  if (problemi.length) {
    fallimenti.push(`scelte: ${problemi.join(' | ')}`);
    done(`${C.bad}✗${C.off} ${problemi.length} problemi`);
    for (const p of problemi.slice(0, 20)) console.log(`  · ${p}`);
  }
  else done(`${C.ok}✓${C.off} ${C.dim}${scritti.size} flag, tutti riletti entro due atti${C.off}`);
}

/* ── 6. contrasto ────────────────────────────────────────── */
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

/* ── 7. peso ─────────────────────────────────────────────── */
{
  const done = passo('peso');
  const budget = { totale: 340 * 1024, js: 200 * 1024 };
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

/* ── 8. test ─────────────────────────────────────────────── */
if (!FAST) {
  const done = passo('test');
  try {
    execFileSync(process.execPath, ['--test', '--test-reporter=dot'], { cwd: ROOT, stdio: 'pipe' });
    done(`${C.ok}✓${C.off}`);
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).trim();
    fallimenti.push('test falliti');
    done(`${C.bad}✗${C.off}`);
    console.log(out.split('\n').slice(-30).map((l) => '  ' + l).join('\n'));
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
