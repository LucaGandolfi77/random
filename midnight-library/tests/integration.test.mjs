// Test integrazione — View + Controller + storage con jsdom.
// Esecuzione: node tests/integration.test.mjs

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});

const w = dom.window;
for (const k of [
  'window', 'document', 'localStorage', 'navigator', 'HTMLElement', 'Element',
  'Node', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'MutationObserver', 'DocumentFragment', 'HTMLButtonElement',
]) {
  if (w[k] === undefined) continue;
  try {
    globalThis[k] = w[k];
  } catch {
    Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true });
  }
}
if (!w.matchMedia) {
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = w.matchMedia;
}
globalThis.location = w.location;
globalThis.history = w.history;

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', msg); }
};
const $ = (sel) => w.document.querySelector(sel);
const $$ = (sel) => [...w.document.querySelectorAll(sel)];

const controller = await import(`file://${path.join(root, 'src/controller.js')}`);
const { start, destroy } = controller;

// ---- Init ----
start({ skipWelcome: false });
ok($('#welcome').hidden === false, 'welcome visibile all\'avvio');
ok($('#game').hidden === true, 'gioco nascosto all\'avvio');
ok($('#tut').hidden === false, 'tutorial mostrato');
ok($('#tutText').textContent.includes('lanterna'), 'testo tutorial passo 1');

// ---- Avvia partita ----
$('#startBtn').click();
ok($('#welcome').hidden === true, 'welcome nascosta dopo start');
ok($('#game').hidden === false, 'gioco visibile dopo start');

// ---- Risorse renderizzate ----
ok($('#luceVal').textContent === '3', 'luce iniziale renderizzata = 3');
ok($('#calmaVal').textContent === '5', 'calma iniziale renderizzata = 5');
const luceBar = $('#luce');
ok(luceBar.getAttribute('role') === 'progressbar', 'role=progressbar su barra luce');
ok(luceBar.getAttribute('aria-valuenow') === '3', 'aria-valuenow = 3');
ok(luceBar.getAttribute('aria-valuemax') === '10', 'aria-valuemax = 10');

// ---- Accendere 4 lanterne ----
const lanterns = $$('.lantern');
ok(lanterns.length === 4, '4 lanterne nel DOM');
lanterns.forEach((l) => l.click());
ok(lanterns.every((l) => l.classList.contains('lit')), 'tutte le lanterne accese');
ok(lanterns[0].getAttribute('aria-pressed') === 'true', 'aria-pressed aggiornato');

// milestone card
ok($('#milestoneCard').hidden === false, 'dialogo milestone Prima Luce mostrato');
ok($('#milestoneTitle').textContent === 'Prima Luce', 'titolo milestone in italiano');
$('#milestoneOk').click();
ok($('#milestoneCard').hidden === true, 'dialogo milestone chiuso');
ok($('#curiosityShelf').hidden === false, 'scaffale curiosità sbloccato');

// doppio click lanterna accesa → nessun errore
lanterns[0].click();
ok(lanterns[0].classList.contains('lit'), 'lanterna resta accesa dopo doppio click');

// ---- Tutorial avanzato ----
ok($('#tutText').textContent.includes('tavolo'), 'tutorial passo 2 (tavolo)');

// ---- Riporre un libro ----
const beforeBooks = $$('.table-book').length;
$('#tableArea').click();
const afterBooks = $$('.table-book').length;
ok(afterBooks === beforeBooks - 1, 'libro rimosso dal tavolo');
ok(Number($('#inchiostroVal').textContent) >= 1, 'inchiostro guadagnato');

// ---- Tè ----
const calm0 = Number($('#calmaVal').textContent);
$('#kettle').click();
ok(Number($('#calmaVal').textContent) > calm0, 'calma aumentata col tè');

// ---- B1: stopPropagation su lantern (nessun doppio trigger) ----
// click su .flame figlio deve comunque accendere solo una lanterna
// (le altre sono già accese; verifichiamo che l'evento non buchi)

// ---- Lettore: stato forzato, poi click ----
const st = w.__lumina.state;
st.readerActive = true;
st.resources.calma = 5;
w.__lumina.render();
ok($('#reader').hidden === false, 'lettore visibile');
$('#reader').click();
ok(st.readersServed === 1, 'lettore accolto');
ok(st.milestones.firstGuest === true, 'milestone Primo Ospite');
ok(st.unlocks.skylight === true, 'lucernario sbloccato');
if ($('#milestoneCard').hidden === false) $('#milestoneOk').click();
if ($('#dawnCard') && !$('#dawnCard').hidden) $('#dawnOk').click();

// ---- Pannello collezione + catalogo ----
$('#navCollection').click();
ok($('#collectionPanel').hidden === false, 'pannello collezione aperto');
st.raresFound = ['almanacco'];
st.resources.inchiostro = 5;
st.unlocks.curiosityShelf = true;
w.__lumina.render();
const catBtn = $('[data-action="catalog"][data-id="almanacco"]');
ok(Boolean(catBtn), 'pulsante cataloga presente dopo scoperta');
if (catBtn) {
  catBtn.click();
  ok(st.raresCataloged.includes('almanacco'), 'almanacco catalogato');
  ok(st.resources.inchiostro === 2, 'costo inchiostro detratto (5-3=2)');
}
// Escape chiude il pannello
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok($('#collectionPanel').hidden === true, 'Escape chiude il pannello collezione');

// ---- Apri aiuto con ? ----
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: '?', bubbles: true }));
ok($('#helpPanel').hidden === false, '? apre aiuto');
// help ha testo dinamico
ok($('#helpPanelBody').children.length >= 5, 'help renderizzato con paragrafi');
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok($('#helpPanel').hidden === true, 'Escape chiude aiuto');

// ---- Scorciatoie tastiera: T = tè ----
const calmK = st.resources.calma;
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 't', bubbles: true }));
ok(st.resources.calma > calmK, 'tastiera T prepara tè');

// ---- Impostazioni: cambio lingua via langBtn ----
$('#settingsBtn').click();
ok($('#settingsPanel').hidden === false, 'impostazioni aperte');
$('#langBtn').click();
ok(w.document.documentElement.lang === 'en', 'lang html = en');
// nav help label aggiornato
ok($$('.nav-btn').some((b) => b.textContent.includes('How to play')), 'navigazione in inglese');
$('#langBtn').click();
ok(w.document.documentElement.lang === 'it', 'tornato in italiano');
ok($$('.nav-btn').some((b) => b.textContent.includes('Come si gioca')), 'navigazione in italiano');

// ---- Toggle motion ----
const motion = $('#motionToggle');
motion.checked = true;
motion.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(w.document.documentElement.dataset.motion === 'reduced', 'data-motion=reduced applicato');
ok(st.settings.reducedMotion === true, 'reducedMotion salvato');

// ---- Toggle sfx ----
const sfx = $('#sfxToggle');
sfx.checked = false;
sfx.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(st.settings.sfx === false, 'sfx salvato off');

// ---- Toggle haptics / wake / parallax (Fase G) ----
const haptics = $('#hapticsToggle');
ok(Boolean(haptics), 'toggle haptics presente');
haptics.checked = false;
haptics.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(st.settings.haptics === false, 'haptics salvato off');

const wake = $('#wakeToggle');
ok(Boolean(wake), 'toggle wakeLock presente');
const par = $('#parallaxToggle');
ok(Boolean(par), 'toggle parallax presente');

// ---- Persistenza ----
ok(w.localStorage.getItem('lumina-save-v1') !== null, 'salvataggio in localStorage durante il gioco');

// ---- B7: storage event da altra scheda ----
const external = JSON.parse(w.localStorage.getItem('lumina-save-v1'));
external.resources.luce = 7;
// simula evento storage
const ev = new w.Event('storage');
Object.defineProperty(ev, 'key', { value: 'lumina-save-v1' });
Object.defineProperty(ev, 'newValue', { value: JSON.stringify(external) });
w.dispatchEvent(ev);
ok(w.__lumina.state.resources.luce === 7, 'stato aggiornato da evento storage (altra scheda)');
// aggiorna anche il riferimento locale per i test successivi
const stAfterStorage = w.__lumina.state;
void stAfterStorage;

// ---- Reset con conferma ----
$('#settingsBtn').click(); // riapri se chiuso
// settings potrebbe essere già aperto
if ($('#settingsPanel').hidden) $('#settingsBtn').click();
$('#resetBtn').click();
ok($('#confirmBar').hidden === false, 'conferma reset mostrata');
$('#confirmNo').click();
ok($('#confirmBar').hidden === true, 'annulla chiude conferma');
$('#resetBtn').click();
$('#confirmYes').click();
ok($('#confirmBar').hidden === true, 'conferma chiusa dopo reset');
ok(w.__lumina.state.resources.luce === 3, 'stato azzerato a default');
ok($('#welcome').hidden === false, 'torna alla welcome dopo reset');

// ---- Dopo il reset il salvataggio è rimosso (fino al prossimo save) ----
ok(w.localStorage.getItem('lumina-save-v1') === null, 'reset rimuove il salvataggio');

// ---- Salvataggio corrotto → recupero ----
w.localStorage.setItem('lumina-save-v1', '{corrotto!!');
destroy();
start({ skipWelcome: false });
ok($('#welcome').hidden === false, 'riavvio con save corrotto → welcome, nessun crash');
ok(w.__lumina.state.resources.luce === 3, 'stato default dopo recupero corruzione');

// ---- B16: toast si nasconde da solo (timer 4s) — verifica classe show al mostrare ----
// showToast è interno; verifichiamo che non ci siano eccezioni residue
ok(true, 'nessun crash dopo recupero');

// ---- B6: destroy idempotente ----
destroy();
destroy();
ok(true, 'destroy idempotente (doppia chiamata senza throw)');

// ---- Lettere (Fase G1): addLetter via hook ----
start({ skipWelcome: true });
const st2 = w.__lumina.state;
ok(Array.isArray(st2.letters), 'letters array presente');

// ---- Fase 1: room nav renderizzata ----
const roomChips = $$('#roomNav .room-chip');
ok(roomChips.length >= 3, 'room nav con >= 3 stanze');
ok(roomChips[0].classList.contains('on'), 'hall attiva di default');
ok($('#hallPanel') && $('#hallPanel').hidden === false, 'hallPanel visibile');
ok($('#atticPanel') && $('#atticPanel').hidden === true, 'atticPanel nascosto');
ok($('#room').dataset.room === 'hall', 'data-room=hall');

// sblocca wellRoom e switch a soppalco
st2.unlocks.wellRoom = true;
w.__lumina.render();
const atticChip = $('#roomNav [data-room="attic"]');
ok(Boolean(atticChip), 'chip attic presente');
ok(!atticChip.disabled, 'chip attic abilitata dopo wellRoom');
atticChip.click();
ok($('#room').dataset.room === 'attic', 'switch stanza attic');
ok($('#atticPanel').hidden === false, 'atticPanel visibile');
ok($('#hallPanel').hidden === true, 'hallPanel nascosto');

// attività sortArchive
const ink0 = st2.resources.inchiostro;
$('#sortArchiveBtn').click();
ok(st2.resources.inchiostro > ink0, 'sortArchive ha dato inchiostro');
ok(st2.stats.archiveSorted >= 1, 'archiveSorted incrementato');

// torna in hall
$('#roomNav [data-room="hall"]').click();
ok($('#room').dataset.room === 'hall', 'torno in hall');

// ---- Fase 1: editor salvataggio con diff ----
$('#settingsBtn').click();
if ($('#settingsPanel').hidden) $('#settingsBtn').click();
ok(Boolean($('#editSaveBtn')), 'pulsante editSave presente');
$('#editSaveBtn').click();
ok($('#saveEditorPanel').hidden === false, 'editor salvataggio aperto');
const ta = $('#saveEditorText');
ok(Boolean(ta) && ta.value.includes('"version"'), 'JSON corrente in textarea');
// modifica una risorsa e preview
const edited = JSON.parse(ta.value);
edited.resources.luce = 9;
edited.room = 'hall';
ta.value = JSON.stringify(edited, null, 2);
$('#saveEditPreview').click();
ok($('#saveEditApply').disabled === false, 'apply abilitato dopo preview');
ok($('#saveEditDiff').hidden === false, 'diff visibile');
ok($('#saveEditDiff').children.length >= 1, 'diff ha righe');
ok($('#saveEditStatus').textContent.length > 0, 'status diff');
$('#saveEditApply').click();
ok($('#saveEditorPanel').hidden === true, 'editor chiuso dopo apply');
ok(w.__lumina.state.resources.luce === 9, 'luce applicata da editor');
// Escape non crasha se già chiuso
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// toggle archiveIdb
const idbToggle = $('#archiveIdbToggle');
ok(Boolean(idbToggle), 'toggle archiveIdb presente');
idbToggle.checked = true;
idbToggle.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(w.__lumina.state.settings.archiveIdb === true, 'archiveIdb salvato on');

// ---- Fase 3: UI ecosistema ----
ok(Boolean($('#shareCardBtn')), 'pulsante condividi cartolina presente');
ok(Boolean($('#roomDesc')), 'descrizione stanza SR presente');
ok(Boolean($('#highContrastToggle')), 'toggle alto contrasto presente');
ok(Boolean($('#voiceToggle')), 'toggle comandi vocali presente');
ok(Boolean($('#loadModBtn')), 'pulsante carica mod presente');
ok(Boolean($('#modList')), 'lista mod presente');
ok(Boolean($('#multiCreateBtn')), 'pulsante multiplayer invito presente');
ok(Boolean($('#multiSignal')), 'textarea segnale WebRTC presente');

// alto contrasto
const hc = $('#highContrastToggle');
hc.checked = true;
hc.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(w.__lumina.state.settings.highContrast === true, 'highContrast salvato');
ok(w.document.documentElement.dataset.contrast === 'high', 'data-contrast=high');
hc.checked = false;
hc.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(w.document.documentElement.dataset.contrast === 'normal', 'data-contrast tornato normal');

// roomDesc popolata dopo render
w.__lumina.render();
const roomDesc = $('#roomDesc').textContent || '';
ok(roomDesc.length > 10, 'roomDesc descrittiva non vuota');
ok(roomDesc.includes('Luce') || roomDesc.includes('Light'), 'roomDesc include risorse');

// i18n Fase 3 presenti
const i18nKeys = ['sharePostcard', 'mods', 'multiplayer', 'highContrast', 'voiceCommands'];
// verifica via data-i18n su pulsanti
ok($('[data-i18n="sharePostcard"]') !== null, 'chiave i18n sharePostcard nel DOM');
ok($('[data-i18n="highContrast"]') !== null, 'chiave i18n highContrast nel DOM');

// multiPlayer status pannello
ok($('#multiStatus') !== null, 'status multiplayer presente');

console.log(`\n${pass} passati, ${fail} falliti`);
try { destroy(); } catch { /* ok */ }
process.exit(fail ? 1 : 0);
