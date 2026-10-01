/* flusso.test.mjs — una partita intera, dal primo tocco ai titoli di coda.
 *
 * Qui girano i veri `js/*.js` e il vero `index.html`, sul DOM finto. Non è un
 * test di unità: è l'unico che verifica che i pezzi siano agganciati. Se le
 * scene, l'orto, il Mazzetto e il finale sono collegati male, questo fallisce e
 * gli altri passano tranquilli.
 *
 * E ci sono i pointer events: la tela si disegna col dito, e se l'evento non
 * arriva al posto giusto il gioco non si gioca proprio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, STORIA_MINIMA, ROOT } from './harness.mjs';

const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

/* Avvia l'app vera e aspetta che abbia letto la storia. */
async function avvia(seed = {}) {
  const h = carica({ files: ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'orto.js', 'dono.js', 'vasi.js', 'scena.js', 'app.js'], seed, storia: STORIA_MINIMA });
  for (let i = 0; i < 60; i++) {
    if (h.win.FSTApp && h.win.FSTApp.storia()) return h;
    await aspetta(2);
  }
  throw new Error('app.js non ha mai finito di leggere la storia');
}

/* Dal nodo dell'atto corrente, salta alla tela e restituisce la macchina. */
async function allaTela(h, { atto = 0, memoria = null } = {}) {
  const { win, el } = h;
  el('btn-nuova').click();
  const S = win.FSTSave;
  S.salva((s) => {
    if (atto !== null) s.atto = atto;
    s.stanza = 1;                       // dopo la scena, prima dell'orto
    if (memoria) s.memoria = memoria;
    s.fase = 'atto';
  });
  el('btn-prosegui').click();
  await aspetta(25);
  return win.FSTApp.stato().C;
}

/* La tela finta è 390×780: le coordinate sono in pixel, non normalizzate. */
const L = 390;
const A = 780;

/* Un tratto del dito sulla tela: pointerdown, N pointermove, pointerup. */
function semina(h, { x0 = 0.5, x1 = 0.5, y0 = 0.5, y1 = 0.5, passi = 8 } = {}) {
  const tela = h.el('cb-tela');
  const evt = (tipo, x, y) => tela.dispatch(tipo, { clientX: x * L, clientY: y * A, pointerId: 1 });
  evt('pointerdown', x0, y0);
  for (let i = 1; i <= passi; i++) {
    const t = i / passi;
    evt('pointermove', x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  }
  evt('pointerup', x1, y1);
}

/* Copre tutto l'orto a griglia, riscegliendo la mossa a ogni turno come fa
   il giocatore. Restituisce quanti turni ha usato. */
/* Aspetta che il vaso abbia passato il suo turno e che i fiori tornino in
 * mano. Prima, con i semi, non serviva: il contatore era globale e il test
 * poteva seminare di fila. Adesso i fiori sono un tetto di turno, e se non si
 * aspetta il vaso il colpo successivo non ha niente da spendere. */
/* Sceglie la mossa e aspetta che sia davvero armata.
 *
 * Non basta cliccare: dopo aver seminato la mossa è chiusa fino al turno del
 * vaso, e un clic su un bottone bloccato non fa niente senza dirlo. Un test
 * che clicca e va avanti semina a fiori zero, non rileva niente, e il vaso non
 * si riempie — e il sintomo è solo "non ha finito", che non dice dove. */
/* Il vaso passa il suo turno 520 ms dopo la tua mossa (`fineTurno` in app.js).
 * Qui si aspetta ben oltre: con una pazienza più corta il test non falliva per
 * un motivo suo, ma per quello — e il sintomo era solo «il vaso non si è
 * riempito», che non dice da dove comincia. */
const TURNO_VASO_MS = 520;

async function scegliMossa(h, C, mossa, tentativi = 240) {
  for (let i = 0; i < tentativi; i++) {
    if (C.finito) return;
    if (C.mossa === null) h.el('cb-menu').children[mossa].click();
    if (C.fiori > 0) return;
    await aspetta(6);
  }
}

async function riempi(h, { righe = 18, colonne = 18, mossa = 1 } = {}) {
  /* `mossa` è l'indice nel menù: 0 Offri, 1 Accarezza, 2 Mazzo. Di default
   * Accarezza, perché Offri da sola NON può vincere — il suo limite di terra sta
   * sotto il costo della mossa base, ed è il gioco. Un test che riempie il
   * vaso con Offri non sta provando che si vince: sta provando che si perde. */
  const { el } = h;
  const C = h.win.FSTApp.stato().C;
  let turni = 0;
  for (let r = 0; r < righe && C && !C.finito; r++) {
    const y = 0.05 + (r / (righe - 1)) * 0.9;
    await scegliMossa(h, C, mossa);
    if (C.finito) break;
    semina(h, { x0: 0.05, x1: 0.95, y0: y, y1: y, passi: 24 });
    turni++;
    await aspetta(4);
  }
  for (let c = 0; c < colonne && C && !C.finito; c++) {
    const x = 0.05 + (c / (colonne - 1)) * 0.9;
    await scegliMossa(h, C, mossa);
    if (C.finito) break;
    semina(h, { x0: x, x1: x, y0: 0.05, y1: 0.95, passi: 24 });
    turni++;
    await aspetta(4);
  }
  return turni;
}

/* Un tocco e basta, che è il gesto della resa. */
function tieneErilascia(h, ms = 200) {
  const tela = h.el('cb-tela');
  const evt = (tipo) => tela.dispatch(tipo, { clientX: 195, clientY: 390, pointerId: 1 });
  evt('pointerdown');
  h.win.__avanza(ms);
  evt('pointerup');
}

/* ── l'avvio ─────────────────────────────────────────────── */

test('l\'app parte, legge la storia e apre la copertina', async () => {
  const h = await avvia();
  assert.ok(h.win.FSTApp.storia(), 'la storia è stata letta');
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'copertina');
  assert.equal(h.el('crediti-memorie').textContent, String(STORIA_MINIMA.schede.length));
});

test('senza story.json l\'app spiega come si gioca, e non sparisce a metà', async () => {
  const h = carica({ files: ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'orto.js', 'dono.js', 'vasi.js', 'scena.js', 'app.js'], storia: null });
  await aspetta(30);
  const corpo = h.doc.body.innerHTML || '';
  assert.match(corpo, /serve\.js|server|testi/i, 'deve dire cosa lanciare, non lasciare una pagina bianca');
});

test('ogni id che app.js cerca esiste davvero nel documento', async () => {
  /* 51 id nel gioco da cui deriva, 55 in questo: se aggiungi un'id a app.js e
     non lo metti in index.html, qui te lo dice subito e non quando lo apre
     qualcuno sul telefono. */
  const h = await avvia();
  const src = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  const cercati = [...new Set([...src.matchAll(/\$\('#([a-z0-9-]+)'/g)].map((m) => m[1]))];
  assert.ok(cercati.length >= 55, `solo ${cercati.length} id cercati: il gioco è più piccolo del previsto?`);
  for (const id of cercati) {
    assert.ok(h.el(id), `app.js cerca #${id}, che in index.html non esiste`);
  }
});

test('tutte le viste citate esistono, e sono sette', async () => {
  const h = await avvia();
  for (const v of ['copertina', 'atto', 'scena', 'combattimento', 'finale', 'mazzetto', 'cast']) {
    assert.ok(h.el('view-' + v), `manca la vista «${v}»`);
  }
});

/* ── la partita ──────────────────────────────────────────── */

test('Nuova puntita porta al primo atto con tutte le schede', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  const s = h.win.FSTSave.carica();
  assert.equal(s.fase, 'atto');
  assert.equal(s.atto, 0);
  assert.equal(s.memoria.length, STORIA_MINIMA.schede.length);
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'atto');
});

test('l\'atto mostra le sue stanze e il pulsante giusto', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  assert.match(h.el('atto-titolo').textContent, /Primo/);
  const voci = h.el('atto-stanze').children;
  assert.ok(voci.length >= 2, 'una scena e un orto');
  assert.match(h.el('btn-prosegui').textContent, /Leggi/);
  h.el('btn-prosegui').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'scena');
  h.el('btn-scena-quit').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'atto');
  h.el('btn-prosegui').click();
  h.el('btn-scena-avanti').click();
  /* la scena finisce su una scelta, non su un Avanti: si sceglie e si va. */
  const scelte = h.el('scena-scelte').children;
  assert.ok(scelte.length > 0);
  scelte[0].click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'atto');
  assert.match(h.el('btn-prosegui').textContent, /Prendi la mano/);
});

test('una scena si legge tutta, e le battute filtrate non ci sono', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.el('btn-prosegui').click();
  assert.match(h.el('scena-texto').textContent || h.el('scena-texto').innerHTML, /Prima battuta/);
  h.el('btn-scena-avanti').click();
  const testo = h.el('scena-texto').innerHTML || h.el('scena-texto').textContent;
  assert.match(testo, /Seconda/);
  assert.equal(testo.includes('Prima battuta'), false, 'la battuta precedente non resta a schermo');
});

test('una scelta scrive il flag, e la scena successiva lo legge', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.el('btn-prosegui').click();
  h.el('btn-scena-avanti').click();
  const scelte = h.el('scena-scelte').children;
  assert.ok(scelte.length > 0, 'la scena offre le sue scelte');
  scelte[0].click();
  assert.equal(h.win.FSTSave.carica().scelte.a0_porta, 'aperta', 'il flag è scritto');

  /* e l'atto successivo lo mostra: due partite, due atti diversi */
  const { win, el } = h;
  win.FSTSave.salva((s) => { s.atto = 1; s.stanza = 0; s.fase = 'atto'; });
  el('btn-atto-home').click();
  win.FSTApp.vai('atto');
  el('btn-prosegui').click();
  el('btn-scena-avanti').click();
  const testo = el('scena-texto').innerHTML || el('scena-texto').textContent;
  assert.match(testo, /Questa è sua\./, 'la battuta condizionata è quella giusta');
  assert.equal(testo.includes('non si vede'), false, 'e l\'altra non c\'è');
});

test('il tocco sul testo porta subito alla fine, e al finale della scena', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.el('btn-prosegui').click();
  h.el('scena-texto').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'scena');
  const scelte = h.el('scena-scelte').children;
  assert.ok(scelte.length > 0, 'il tocco è arrivato in fondo e ha mostrato le scelte');
});

test('il Continua riprende esattamente dove eri', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.el('btn-prosegui').click();
  h.el('btn-scena-avanti').click();
  const prima = h.win.FSTSave.carica().scenaCoda;
  assert.equal(prima.battuta, 1, 'la seconda battuta');

  /* simula la morte del telefono e la riapertura */
  h.win.FSTApp.vai('copertina');
  h.el('btn-continua').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'scena');
  assert.equal(h.win.FSTSave.carica().scenaCoda.battuta, 1, 'e non ti fa rileggere da capo');
});

/* ── l'orto ──────────────────────────────────────────────── */

test('l\'orto si apre col nome del vaso e il menu delle quattro mosse', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  assert.ok(C, 'la macchina a turni è viva');
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'combattimento');
  assert.ok(h.el('cb-nemico').textContent.length > 0);
  const mosse = h.el('cb-menu').children;
  assert.equal(mosse.length, 4, 'quattro mosse');
  assert.match(mosse[0].textContent, /Offri/);
  assert.match(mosse[1].textContent, /Accarezza/);
  assert.match(mosse[2].textContent, /Mazzo/);
  assert.match(mosse[3].textContent, /Chiedi/);
});

test('il gesto del dito arriva al vaso e conta come cura', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  const spesaPrima = C.spesa;
  const spesoPrima = C.speso;
  h.el('cb-menu').children[0].click();          // Offri
  semina(h, { x0: 0.2, x1: 0.8, y0: 0.4, y1: 0.4, passi: 16 });
  await aspetta(20);
  assert.ok(C.speso > spesoPrima, 'il terreno è stato toccato');
  assert.ok(C.spesa < spesaPrima, 'e il vaso ha ricevuto');
});

test('senza scegliere una mossa, il dito non fa niente e lo dice', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  const speso = C.speso;
  semina(h);
  await aspetta(20);
  assert.equal(C.speso, speso, 'non si semina senza sapere che cosa stai facendo');
  assert.match(h.el('cb-istruzione').textContent, /scegli prima/);
});

test('il vaso pieno finisce il combattimento e mette un petalo', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  const S = h.win.FSTSave;
  h.el('cb-menu').children[0].click();          // Offri

  /* Una griglia di tratti: il vase di Betta è una figura, e una figura si
     riempie passando in due direzioni. Poi l'ultimo tratto chiude il conto. */
  const turni = await riempi(h);
  assert.ok(turni >= 1, 'un orto si riempie in qualche turno, non in nessuno');
  assert.ok(C.spesa >= 0, 'la spesa non è mai negativa');
  assert.equal(C.finito, true, 'il vaso si è riempito');
  assert.equal(C.vittoria, true);
  const s = S.carica();
  assert.ok(s.fioriti.length > 0, `il vaso è stato registrato come fiorito, e c'è un petalo`);
  assert.equal(s.statistiche.offerte > 0, true, 'e le offerte sono contate');
});

test('la resa si apre e si chiude, e il fiore ha una finestra', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  const f = C.generaFiore();
  assert.ok(f.x > 0 && f.x < 1 && f.y > 0 && f.y < 1);
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  C.apriResa(f.x, f.y);
  assert.ok(C.resa, 'la resa è aperta');
  assert.equal(C.resaScaduta(), false);
  h.win.__avanza(C.finestra + 10);
  assert.equal(C.resaScaduta(), true, 'e scade da sola');
});

test('tenere e rilasciare conta come una resa, non come una pennellata', async () => {
  const h = await avvia();
  const C = await allaTela(h);
  const { FSTMemoria: Mem } = h.win;
  Mem.brucia(C.salva, ['s1']);
  const prima = Mem.quante(C.salva);
  C.attacco = { resabile: true, conScheda: null, testo: '' };
  C.apriResa(0.5, 0.5);
  h.el('cb-menu').children[0].click();
  tieneErilascia(h, 300);
  await aspetta(20);
  assert.equal(C.contatoreRese, 1, 'la resa è stata registrata');
  assert.ok(Mem.quante(C.salva) > prima, 'e ha restituito un ricordo');
});

/* ── il Mazzetto e il Cast ───────────────────────────────── */

test('il Mazzetto elenca le schede che hai, e le bruciate come petali secchi', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.win.FSTMemoria.brucia(h.win.FSTSave.carica(), ['s1']);
  h.win.FSTApp.vai('mazzetto');
  assert.equal(h.el('mazzetto-conto').textContent, '3 / 4');
  assert.ok(h.el('mazzetto-schede').children.length >= 3);
  assert.ok(h.el('mazzetto-bruciate').textContent.length > 0, 'e i petali secchi ci sono');
});

test('il Cast ha una riga per persona, con le tre tacche', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.win.FSTApp.vai('cast');
  const voci = h.el('cast-lista').children;
  assert.equal(voci.length, STORIA_MINIMA.cast.length, 'una voce per persona del cast');
  for (const v of voci) {
    assert.equal(v.querySelectorAll('.tacche i').length, 3, 'tre tacche: chi è, chi hai perso, chi ti ha piantato');
  }
});

test('il Cast cambia quando bruci qualcosa di quella persona', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.win.FSTApp.vai('cast');
  const prima = h.el('cast-lista').children[1].className;
  h.win.FSTMemoria.brucia(h.win.FSTSave.carica(), ['s1', 's2']);   // di betta
  h.win.FSTApp.vai('cast');
  const dopo = h.el('cast-lista').children[1].className;
  assert.notEqual(prima, dopo, 'lo stato della persona è cambiato: è passata a s1');
});

/* ── il finale ───────────────────────────────────────────── */

test('il finale si compone, e c\'è la puntata con i titoli di coda', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  const s = h.win.FSTSave.carica();
  s.atto = STORIA_MINIMA.atti.length - 1;
  s.fase = 'finale';
  h.win.FSTSave.scrivi(s);
  h.win.FSTApp.vai('finale');
  h.win.FSTApp.toast('x');
  h.el('btn-finale-home').click();
  h.win.FSTApp.vai('finale');
  /* la schermata finale si ridisegna da sola passando da `vai` */
  h.el('btn-continua').click();
  const interno = h.el('finale-interno');
  assert.ok(interno.children.length > 0, 'il finale ha contenuto');
  const testo = interno.textContent || '';
  assert.match(testo, /Qui riposa Nadia Ferro/, 'l\'epitaffio c\'è');
  const titolo = h.el('finale-interno').querySelector('.titolo-puntata');
  assert.ok(titolo, 'il titolo della puntata c\'è, e ha la sua classe');
  assert.ok(titolo.textContent.length > 0);
  assert.match(testo, /I titoli di coda/, 'e i titoli di coda');
});

test('il Mazzetto e il Cast si aprono e si chiudono da dove vuoi', async () => {
  const h = await avvia();
  h.el('btn-mazzetto-home').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'mazzetto');
  h.el('btn-mazzetto-indietro').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'copertina');

  h.el('btn-cast-home').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'copertina', 'il bottone sulla copertina porta alla copertina');

  h.el('btn-cast-indietro').click();
  h.el('btn-nuova').click();
  h.win.FSTApp.vai('cast');
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'cast');
  h.el('btn-cast-indietro').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'atto', 'e si torna dove eri');
});

/* ── le impostazioni ─────────────────────────────────────── */

test('le impostazioni si salvano e si applicano al corpo', async () => {
  const h = await avvia();
  h.el('btn-impostazioni').click();
  h.doc.querySelector('[data-mossa="largo"]').click();
  assert.equal(h.win.FSTSave.carica().impostazioni.mossa, 'largo');
  h.doc.querySelector('[data-mossa="medio"]').click();
  assert.equal(h.win.FSTSave.carica().impostazioni.mossa, 'medio');
  h.doc.querySelector('[data-mano="sinistra"]').click();
  assert.equal(h.win.FSTSave.carica().impostazioni.mano, 'sinistra');
  assert.equal(h.doc.body.dataset.mano, 'sinistra');
  h.doc.querySelector('[data-lume="chiaro"]').click();
  assert.equal(h.win.FSTSave.carica().impostazioni.lume, 'chiaro');
});

test('il colore del fiore si cambia dalla barra e resta', async () => {
  const h = await avvia();
  await allaTela(h);
  const fiori = h.el('cb-palette').children;
  assert.equal(fiori.length, 6, 'sei fiori: i cinque vasi e lei');
  assert.equal(h.win.FSTSave.carica().fioreAttivo, 'nadia', 'si parte da sé');
  fiori[1].click();
  assert.equal(h.win.FSTSave.carica().fioreAttivo, 'betta', 'e cambia');
  fiori[fiori.length - 1].click();
  assert.equal(h.win.FSTSave.carica().fioreAttivo, 'sauro', 'e anche per l\'ultimo: non è il fondo, è il vaso che ti restituisce il cuore');
});

/* ── il save ─────────────────────────────────────────────── */

test('un save corrotto non fa cadere il gioco', async () => {
  const h = await avvia({ 'fst-save-v1': '{non è json' });
  h.el('btn-continua').click();
  assert.ok(h.win.FSTSave.carica().memoria, 'si riparte da uno save pulito');
});

test('un save di una versione futura viene riparato, non buttato', async () => {
  const h = await avvia({ 'fst-save-v1': JSON.stringify({ saveVersion: 99, atto: 1, memoria: ['s1'] }) });
  const s = h.win.FSTSave.carica();
  assert.ok(Array.isArray(s.memoria), 'la memoria c\'è ancora');
  assert.equal(typeof s.impostazioni.suono, 'boolean', 'e le impostazioni sono state completate');
});

test('la partita sopravvive a una riapertura a metà atto', async () => {
  const h = await avvia();
  h.el('btn-nuova').click();
  h.el('btn-prosegui').click();
  const s1 = h.win.FSTSave.carica();
  assert.equal(s1.fase, 'scena');
  assert.equal(s1.stanza, 0);
  h.el('btn-scena-quit').click();
  h.el('btn-continua').click();
  assert.equal(h.win.FSTApp.stato().vistaCorrente, 'scena');
});

/* ── il README racconta questo gioco ─────────────────────── */

test('il README racconta davvero il gioco che c\'è', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const storia = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  assert.match(readme, new RegExp(`${storia.schede.length}\\s+(schede|memorie|ricordi)`),
    'il numero di schede del README non è quello del gioco');
  assert.match(readme, /Sei atti|6 atti/i, 'il numero di atti');
  assert.ok(new RegExp(`${Object.keys(storia.finali).length}\\s+finali`).test(readme),
    'il numero di finali');
  assert.match(readme, /Fiori sulle Tombe/);
  assert.match(readme, /Nadia Ferro/, 'il nome della protagonista è quello vero');
});

test('gli ancore del README puntano a qualcosa che esiste', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const titoli = [...readme.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1]);
  const slug = (t) => t.toLowerCase().trim()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
  const ancore = titoli.map(slug);
  const link = [...readme.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(link.length >= 15, `solo ${link.length} ancore interne: il README non è navigabile`);
  for (const l of link) {
    assert.ok(ancore.includes(l), `l'ancora #${l} non trova un titolo`);
  }
});
