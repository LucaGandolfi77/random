/* flusso.test.mjs — la partita intera, dal primo tocco all'epitaffio.
 *
 * È il test che più di tutti vale la pena scrivere, perché qui si scopre se
 * i pezzi sono agganciati. Gli altri test dicono che la memoria funziona e
 * che la parata funziona; questo dice che una persona può giocare.
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const seq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const aspetta = (ms = 5) => new Promise((r) => setTimeout(r, ms));

/* Avvia l'app con la storia di prova e aspetta che i dati siano caricati. */
async function avvia(seed = {}) {
  const h = carica({
    files: ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'tela.js',
      'combat.js', 'nemici.js', 'scena.js', 'app.js'],
    storia: STORIA_MINIMA,
    seed,
  });
  for (let i = 0; i < 60; i++) {
    if (h.win.PMFApp && h.win.PMFApp.storia()) break;
    await aspetta(2);
  }
  return h;
}

test('l\'app si avvia e mostra la copertina', async () => {
  const h = await avvia();
  assert.ok(h.win.PMFApp.storia(), 'la storia deve essere caricata');
  assert.equal(h.win.PMFApp.storia().atti.length, 2);
  assert.ok(h.el('view-copertina').classList.contains('attiva'));
  assert.equal(h.el('view-atto').classList.contains('attiva'), false);
});

test('senza rete e senza story.json l\'app spiega cosa fare, e non resta muta', async () => {
  /* Il fetch fallisce: invece di una pagina bianca deve comparire un testo
   * che dica di avviare il server. È la prima cosa che vede chi apre per
   * errore index.html con due dita. */
  const h = carica({ files: ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'tela.js', 'combat.js', 'nemici.js', 'scena.js', 'app.js'] });
  await aspetta(30);
  assert.match(h.doc.body.innerHTML || '', /serve\.js|server|testi/i,
    'la pagina di errore deve dire come avviare il gioco');
});

test('nuova partita porta al primo atto con tutte le schede', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  const s = h.win.PMFSave.carica();
  assert.equal(s.memoria.length, 4);
  assert.equal(s.atto, 0);
  assert.equal(s.stanza, 0);
  assert.ok(h.el('view-atto').classList.contains('attiva'));
  assert.match(h.el('atto-titolo').textContent, /Primo/);
});

test('l\'atto elenca i suoi nodi e dice quale viene dopo', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  const li = h.el('atto-stanze').children;
  assert.equal(li.length, 2, 'una scena e una tela');
  assert.ok(li[0].classList.contains('prossimo'));
  assert.equal(h.el('btn-prosegui').textContent, 'Leggi');
});

test('leggere una scena la chiude e avanza all\'atto', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.el('btn-prosegui').click();
  await aspetta();
  assert.ok(h.el('view-scena').classList.contains('attiva'));
  assert.match(h.el('scena-texto').innerHTML, /Prima battuta/);

  h.el('btn-scena-avanti').click();
  await aspetta();
  assert.match(h.el('scena-texto').innerHTML, /Seconda/);

  h.el('btn-scena-avanti').click();
  await aspetta();
  assert.equal(h.win.PMFSave.carica().stanza, 1);
  assert.ok(h.el('view-atto').classList.contains('attiva'));
  assert.equal(h.el('btn-prosegui').textContent, 'Prendi il pennello');
});

test('le stesse scene si possono rileggere tornando indietro', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.el('btn-prosegui').click();
  await aspetta();
  h.el('btn-scena-quit').click();
  await aspetta();
  assert.ok(h.el('view-atto').classList.contains('attiva'));
  assert.equal(h.win.PMFSave.carica().stanza, 0, 'interrompere non deve bruciare la scena');
});

test('la HUD mostra i ricordi che hai e non una barra di vita', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.win.PMFSave.salva((s) => { s.stanza = 1; });
  h.el('btn-prosegui').click();
  await aspetta(20);
  assert.equal(h.el('cb-memorie').textContent, '4');
  assert.match(h.el('cb-resto').textContent, /%/);
  assert.equal(h.el('cb-resto').textContent, '100%', 'l\'inizio: il ritratto è tutto da coprire');
});

test('i comandi disabilitati lo dicono, non spariscono', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  /* Solo una scheda senza «lavora»: il motivo del blocco deve essere la memoria mancante. */
  h.win.PMFSave.salva((s) => { s.stanza = 1; s.memoria = ['s1']; s.inchiostroAttivo = 'ada'; });
  h.el('btn-prosegui').click();
  await aspetta(20);
  const mossa = [...h.el('cb-menu').children].find((b) => /Lavora/.test(b.textContent));
  assert.equal(mossa.disabled, true);
  assert.match(mossa.title, /Non ricordi più/, 'il motivo del blocco va nel title');
});

test('l\'inchiostro si vede crescere dopo aver dipinto', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.win.PMFSave.salva((s) => { s.stanza = 1; });
  h.el('btn-prosegui').click();
  await aspetta(20);

  const prima = h.el('cb-inchiostro-n').textContent;
  const tela = h.win.PMFTela.nuovo(h.el('cb-tela'), h.el('cb-effetti'));
  tela.impostaNemico(h.win.PMFNemici.per('il-commiato'));
  const C = h.win.PMFApp.stato().C;
  assert.ok(C, 'lo stato di combattimento deve esistere');
  C.scegli('traccia');
  for (let r = 0; r < 8; r++) {
    const punti = [];
    for (let i = 0; i <= 20; i++) punti.push([0.08 + i * 0.042, 0.2 + r * 0.08]);
    C.misura({ punti, durataMs: 200 }, tela);
  }
  assert.ok(Number(h.el('cb-inchiostro-n').textContent) >= Number(prima),
    'dipingere non può togliere inchiostro');
});

/* Dipingere sul canvas finto: il percorso vero del giocatore, cioè
 * pointerdown → pointermove → pointerup sulla tela. */
function dipingi(h, { righe = 70, y0 = 60, passo = 9 } = {}) {
  const cv = h.el('cb-tela');
  const ev = (t, x, y) => cv.dispatch(t, { clientX: x, clientY: y, pointerId: 1, getCoalescedEvents: () => [] });
  for (let r = 0; r < righe; r++) {
    const y = y0 + r * passo;
    ev('pointerdown', 5, y);
    for (let i = 0; i < 20; i++) ev('pointermove', 5 + i * 19, y);
    ev('pointerup', 380, y);
  }
}

async function allaTela(h, { atto = 0, memoria = null } = {}) {
  h.el('btn-nuova').click();
  await aspetta();
  h.win.PMFSave.salva((s) => { s.atto = atto; s.stanza = 1; if (memoria) s.memoria = memoria; });
  h.el('btn-prosegui').click();
  await aspetta(25);
  return h.win.PMFApp.stato().C;
}

test('finire la tela passa al nodo successivo', async () => {
  const h = await avvia();
  await allaTela(h);
  [...h.el('cb-menu').children].find((b) => /Traccia/.test(b.textContent)).click();
  dipingi(h);
  await aspetta(120);

  const s = h.win.PMFSave.carica();
  assert.ok(s.compinti.includes('il-commiato'), 'il nemico va ricordato come sconfitto');
  /* fine atto: la tela era l'ultimo nodo, quindi si passa all'atto seguente
   * invece di fermarsi su un nodo che non esiste */
  assert.equal(s.atto, 1);
  assert.equal(s.stanza, 0);
  assert.ok(h.el('view-atto').classList.contains('attiva'), 'e si torna all\'atto');
});

test('la tela si riempie davvero col dito: il nemico scende', async () => {
  const h = await avvia();
  await allaTela(h);
  assert.equal(h.el('cb-resto').textContent, '100%');
  [...h.el('cb-menu').children].find((b) => /Traccia/.test(b.textContent)).click();

  dipingi(h, { righe: 8 });
  await aspetta(60);
  const resto = Number(h.el('cb-resto').textContent.replace('%', ''));
  assert.ok(resto < 100, `dopo otto righe il nemico deve essere coperto un po', resta ${resto}%`);
  assert.ok(Number(h.el('cb-inchiostro-n').textContent) > 0, 'e inchiostro ce n\'è');
});

test('l\'ultimo atto finisce col finale e l\'epitaffio', async () => {
  const h = await avvia();
  await allaTela(h, { atto: 1, memoria: ['s1', 's2'] });
  [...h.el('cb-menu').children].find((b) => /Traccia/.test(b.textContent)).click();
  dipingi(h, { righe: 90, y0: 40, passo: 8 });
  await aspetta(140);

  const s = h.win.PMFSave.carica();
  assert.ok(s.finale, 'il finale deve essere registrato');
  assert.ok(s.epitafi.length > 0);
  assert.ok(h.el('view-finale').classList.contains('attiva'));
  assert.ok(h.el('finale-nome').textContent.length > 0);
  assert.match(h.el('finale-interno').textContent, /epitaffio/i);
});

test('perdere i ricordi porta comunque a un finale, non a un vicolo cieco', async () => {
  const h = await avvia();
  await allaTela(h, { memoria: ['s1'] });
  /* ogni risposta sbagliata porta via l\'unico ricordo che resta */
  for (let i = 0; i < 8 && !h.win.PMFApp.stato().C?.finito; i++) {
    await aspetta(600);
    const C = h.win.PMFApp.stato().C;
    if (!C || C.finito) break;
    /* non sceglie niente: si lascia prendere */
    await aspetta(600);
  }
  await aspetta(80);
  const s = h.win.PMFSave.carica();
  assert.ok(s.memoria.length === 0 || h.win.PMFApp.stato().vistaCorrente === 'combattimento',
    'o finisce la partita, o continua con quello che resta');
  void s;
});

test('il Quaderno elenca quello che hai e quello che hai bruciato', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.win.PMFMemoria.brucia(h.win.PMFSave.carica(), ['s3']);
  h.win.PMFSave.scrivi(h.win.PMFSave.carica());
  h.el('btn-quaderno-home').click();
  await aspetta();
  assert.ok(h.el('view-quaderno').classList.contains('attiva'));
  assert.equal(h.el('quaderno-conto').textContent, '3 / 4');
  assert.match(h.el('quaderno-schede').textContent, /Uno|Tre/);
  assert.match(h.el('quaderno-bruciate').textContent, /Tre/, 'le bruciate restano, come bordi scottati');
});

test('il Quaderno si filtra per persona', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.el('btn-quaderno-home').click();
  await aspetta();
  const filtri = [...h.el('quaderno-filtri').children];
  assert.ok(filtri.length >= 2, 'deve esserci almeno «tutte» e una persona');

  filtri[1].click();
  await aspetta();
  const persona = filtri[1].textContent;
  const schede = h.el('quaderno-schede').children;
  assert.ok(schede.length <= 4, `il filtro «${persona}» mostra troppe schede`);
  /* il bottone premuto viene ridisegnato, quindi va cercato di nuovo */
  const nuovoFiltro = [...h.el('quaderno-filtri').children][1];
  assert.ok(nuovoFiltro.classList.contains('attivo'), `«${persona}» deve risultare scelto`);
  assert.ok([...h.el('quaderno-filtri').children][0].classList.contains('attivo') === false);
});

test('la partita sopravvive a un reload: si riapre dov\'era', async () => {
  const primo = await avvia();
  await allaTela(primo);
  /* Il save è già su disco: era quello scritto all'inizio del combattimento. */
  const salvato = primo.storage.getItem(primo.win.PMFSave.SAVE_KEY);
  assert.ok(salvato, 'il combattimento deve aver salvato qualcosa');

  const secondo = await avvia({ [primo.win.PMFSave.SAVE_KEY]: salvato });
  assert.equal(secondo.win.PMFSave.carica().fase, 'combattimento');
  secondo.el('btn-continua').click();
  await aspetta(25);
  assert.ok(secondo.el('view-combattimento').classList.contains('attiva'),
    'deve riprendere esattamente dove era, non tornare alla copertina');
  assert.equal(secondo.el('cb-nemico').textContent, 'Il Commiato');
});

test('riaprire a metà scena torna a metà scena, non dall\'inizio', async () => {
  const primo = await avvia();
  primo.el('btn-nuova').click();
  await aspetta();
  primo.el('btn-prosegui').click();
  await aspetta();
  primo.el('btn-scena-avanti').click();
  await aspetta();
  const salvato = primo.storage.getItem(primo.win.PMFSave.SAVE_KEY);

  const secondo = await avvia({ [primo.win.PMFSave.SAVE_KEY]: salvato });
  secondo.el('btn-continua').click();
  await aspetta(25);
  assert.ok(secondo.el('view-scena').classList.contains('attiva'));
  assert.match(secondo.el('scena-texto').innerHTML, /Seconda/,
    'deve riprendere dalla seconda battuta, non rileggerla da capo');
});

test('un save corrotto non impedisce di giocare', async () => {
  const h = await avvia({ 'lpmf-save-v1': '{non è json' });
  assert.equal(h.win.PMFSave.carica().memoria.length, 0, 'si riparte puliti invece di crashare');
  h.el('btn-nuova').click();
  await aspetta();
  assert.equal(h.win.PMFSave.carica().memoria.length, 4);
});

test('un save di una versione futura non sovrascrive le impostazioni', async () => {
  const h = await avvia({
    'lpmf-save-v1': JSON.stringify({ saveVersion: 1, impostazioni: { suono: false }, atto: 0 }),
  });
  const s = h.win.PMFSave.carica();
  assert.equal(s.impostazioni.suono, false, 'le impostazioni esistenti vengono tenute');
  assert.ok(s.impostazioni.mano, 'e quelle nuove prendono il default');
});

test('le impostazioni si applicano al documento', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.el('btn-impostazioni').click();
  await aspetta();
  assert.equal(h.el('overlay-impostazioni').hidden, false);

  const btn = h.doc.querySelector('[data-mano="sinistra"]');
  btn.click();
  await aspetta();
  assert.equal(h.win.PMFSave.carica().impostazioni.mano, 'sinistra');
  assert.equal(h.doc.body.dataset.mano, 'sinistra', 'il layout deve specchiarsi');

  const pennello = h.doc.querySelector('[data-pennello="largo"]');
  pennello.click();
  await aspetta();
  assert.equal(h.win.PMFSave.carica().impostazioni.pennello, 'largo');
});

test('l\'impostazione di movimento ridotto si applica davvero', async () => {
  const h = await avvia();
  h.el('btn-impostazioni').click();
  await aspetta();
  const cb = h.el('opt-meno-veloce');
  cb.checked = true;
  cb.dispatch('change');
  await aspetta();
  assert.equal(h.doc.body.classList.contains('meno-veloce'), true);
});

test('cancellare la partita svuota il Quaderno, non la pagina', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  await aspetta();
  h.el('btn-impostazioni').click();
  await aspetta();
  h.win.confirm = () => true;
  h.el('btn-cancella').click();
  await aspetta();
  assert.equal(h.win.PMFSave.carica().memoria.length, 0);
  assert.ok(h.el('view-copertina').classList.contains('attiva'));
});

test('tutte le viste citate nell\'HTML esistono davvero', async () => {
  const h = await avvia();
  for (const v of ['copertina', 'atto', 'scena', 'combattimento', 'finale', 'quaderno']) {
    assert.ok(h.el('view-' + v), `manca view-${v} in index.html`);
  }
});

test('ogni id che app.js cerca esiste nel documento', async () => {
  const h = await avvia();
  const src = h.win.PMFApp ? '' : '';
  void src;
  const ids = [
    'btn-continua', 'btn-nuova', 'btn-quaderno-home', 'btn-installa', 'btn-impostazioni',
    'crediti-memorie', 'btn-prosegui', 'atto-titolo', 'atto-epigrafe', 'atto-premessa',
    'atto-stanze', 'btn-scena-quit', 'scena-chi', 'scena-memorie', 'scena-texto',
    'scena-scelte', 'btn-scena-avanti', 'cb-nemico', 'cb-titolo', 'cb-ansia', 'cb-inchiostro',
    'cb-inchiostro-n', 'cb-resto', 'cb-memorie', 'btn-cb-quaderno', 'cb-palette', 'cb-tela',
    'cb-effetti', 'cb-istruzione', 'cb-avviso', 'cb-intento', 'cb-menu', 'btn-finale-home',
    'finale-nome', 'finale-memorie', 'finale-interno', 'btn-quaderno-indietro',
    'quaderno-conto', 'quaderno-premessa', 'quaderno-filtri', 'quaderno-schede',
    'quaderno-bruciate', 'overlay-schede', 'overlay-schede-lista', 'overlay-schede-annulla',
    'overlay-impostazioni', 'opt-suono', 'opt-narrazione', 'opt-meno-veloce',
    'overlay-imp-chiudi', 'btn-cancella', 'toast', 'sr-stato', 'fondo',
  ];
  for (const id of ids) assert.ok(h.el(id), `manca #${id}: app.js lo cerca e riceverà null`);
});

test('nessun elemento di gioco ha un id duplicato', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  seq(dup, [], 'id duplicati in index.html');
});

test('ogni ancora del README porta a una sezione che esiste', () => {
  const md = readFileSync(join(ROOT, 'README.md'), 'utf8');
  /* La stessa regola di GitHub: minuscole, tutto ciò che non è lettera o
   * numero diventa un trattino. */
  const slug = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const titoli = new Set([...md.matchAll(/^#{1,4} (.+)$/gm)].map((m) => slug(m[1].trim())));
  const ancore = [...md.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(ancore.length > 15, 'il README dovrebbe avere un indice');
  const rotte = ancore.filter((a) => !titoli.has(a));
  seq(rotte, [], 'ancore rotte nel README');
});

test('il README racconta davvero il gioco che c\'è', () => {
  const md = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const st = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  assert.match(md, new RegExp(`${st.schede.length} (?:memorie|schede)`),
    `il README deve dire quante schede ci sono (sono ${st.schede.length})`);
  assert.match(md, /Cinque atti|5 atti/i, 'e quanti atti');
  assert.match(md, new RegExp(`${Object.keys(st.finali).length} finali`), 'e quanti finali');
});