/* memoria.test.mjs — il Mazzetto: che cosa tieni, che cosa dai, che cosa resta.
 *
 * Qui si prova l'economia, che è la cosa che in questo gioco non è decorativa.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const h = carica();
const { FSTSave: S, FSTMemoria: Mem } = h.win;
const DEF = STORIA_MINIMA.schede;

/* Gli array che arrivano dal vm hanno un Array.prototype diverso da quello del
 * test, e deepStrictEqual lo controlla. Qui si confronta il contenuto, che è
 * quello che interessa. */
const sequenza = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

const nuova = () => S.nuovaPartita(DEF);

/* ── le quattro liste, e cosa vuol dire ognuna ───────────── */

test('la partita nuova parte con tutte le schede e con le liste vuote', () => {
  const s = nuova();
  sequenza(s.memoria, ['s1', 's2', 's3', 's4']);
  sequenza(s.bruciate, []);
  sequenza(s.riafferrate, []);
  sequenza(s.fioriti, []);
  assert.equal(Mem.petali(s), 0);
});

test('bruciare sposta la scheda da `memoria` a `bruciate`, in ordine', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);
  Mem.brucia(s, ['s3']);
  sequenza(s.memoria, ['s2', 's4']);
  sequenza(s.bruciate, ['s1', 's3'], 'l\'ordine di bruciatura è l\'ordine che conta');
});

test('bruciare due volte la stessa scheda non fa niente', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);
  Mem.brucia(s, ['s1']);
  sequenza(s.bruciate, ['s1']);
  assert.equal(Mem.quante(s), 3);
});

test('bruciare una scheda che non hai è innocuo', () => {
  const s = nuova();
  Mem.brucia(s, ['inesistente']);
  assert.equal(Mem.quante(s), 4);
  sequenza(s.bruciate, []);
});

test('la perdita automatica prende la scheda più fresca', () => {
  const s = nuova();
  Mem.trova(s, 's1');
  assert.equal(s.memoria[0], 's1', 'la più fresca sta in testa');
  const persi = Mem.bruciaAutomatico(s, 1);
  sequenza(persi, ['s1'], 'la perdita automatica prende quella che non hai ancora avuto il tempo di piangere');
});

test('bruciaAutomatico rispetta il numero', () => {
  const s = nuova();
  sequenza(Mem.bruciaAutomatico(s, 2), ['s1', 's2']);
  sequenza(Mem.bruciaAutomatico(s, 1), ['s3']);
});

test('ritrovare una scheda la rimette in fondo, e la mette al riparo', () => {
  const s = nuova();
  Mem.brucia(s, ['s1', 's2']);
  assert.equal(Mem.schedaDaRiafferrare(s), 's2', 'si riafferra l\'ultima che hai scelto di perdere');
  Mem.riafferra(s, 's2');
  assert.ok(s.memoria.includes('s2'));
  assert.equal(s.memoria[s.memoria.length - 1], 's2', 'la ritrovata va in fondo, non in testa');
  sequenza(Mem.bruciaAutomatico(s, 1), ['s3'], 'e quindi non è la prossima a cadere');
  assert.ok(s.memoria.includes('s2'), 'la ritrovata è ancora tua');
  assert.ok(!s.bruciate.includes('s2'));
});

test('trovata distingue «che ce l\'hai» da «ce l\'hai avuta»', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);
  assert.equal(Mem.ha(s, 's1'), false);
  assert.equal(Mem.trovata(s, 's1'), true);
  assert.equal(Mem.trovata(s, 'inesistente'), false);
});

test('trovare una scheda bruciata la rimette e la toglie dalle bruciate', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);
  Mem.trova(s, 's1');
  assert.ok(s.memoria.includes('s1'));
  assert.ok(!s.bruciate.includes('s1'));
});

/* ── le chiavi: perdere una scheda è perdere una mossa ────── */

test('le chiavi sono l\'unione di quelle che hai ancora', () => {
  const s = nuova();
  sequenza([...Mem.chiavi(s, DEF)].sort(), ['accarezza', 'mazzo', 'parla', 'vedere']);
});

test('perdere la scheda che porta una chiave spegne la mossa', () => {
  const s = nuova();
  assert.equal(Mem.abilita(s, DEF, 'accarezza'), true);
  Mem.brucia(s, ['s2']);                       // s2 porta «accarezza»
  assert.equal(Mem.abilita(s, DEF, 'accarezza'), false);
  assert.equal(Mem.abilita(s, DEF, 'mazzo'), true, 'le altre non dipendono da quella');
});

test('i valori delle schede si sommano, e `cura` è additiva sul 1', () => {
  const s = nuova();
  assert.equal(Mem.bonus(s, DEF).cura, 1.1);
  Mem.brucia(s, ['s2']);
  assert.equal(Mem.bonus(s, DEF).cura, 1);
});

test('una scheda che dà più tempo per la resa allunga la finestra', () => {
  const s = nuova();
  assert.equal(Mem.bonus(s, DEF).resa, 300);
});

/* ── i petali ────────────────────────────────────────────── */

test('un petalo per vaso riempito, e il tutorial conta', () => {
  const s = nuova();
  assert.equal(Mem.petali(s), 0);
  s.fioriti.push('il-vaso');
  assert.equal(Mem.petali(s), 1);
  s.fioriti.push('betta');
  assert.equal(Mem.petali(s), 2);
  assert.equal(Mem.haFiorito(s, 'betta'), true);
  assert.equal(Mem.haFiorito(s, 'ansi'), false);
});

/* ── l'arc[o]: lo stato dipende da come l'hai trattata ────── */

test('stato 0: nessuna scheda data, nessun vaso riempito', () => {
  const s = nuova();
  assert.equal(Mem.statoDi(s, DEF, 'betta'), 0);
});

test('stato 1: una scheda di quella persona data al terreno', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);                       // s1 è di betta
  assert.equal(Mem.statoDi(s, DEF, 'betta'), 1);
  assert.equal(Mem.statoDi(s, DEF, 'ansi'), 0, 'le altre persone non si muovono');
});

test('stato 2: il suo vaso è fiorito', () => {
  const s = nuova();
  s.fioriti.push('betta');
  assert.equal(Mem.statoDi(s, DEF, 'betta'), 2, 'riempire il vaso è metà, e vale doppio');
});

test('stato non va oltre il 2, e non scende sotto lo 0', () => {
  const s = nuova();
  Mem.brucia(s, ['s1', 's2']);
  assert.equal(Mem.statoDi(s, DEF, 'betta'), 1, 'due schede date non fanno stato 2: è già al massimo quello che si può fare senza finirla');
  s.fioriti.push('betta');
  assert.equal(Mem.statoDi(s, DEF, 'betta'), 2);
  assert.equal(Mem.statoDi(s, DEF, 'ansi'), 0);
});

test('quanteDi e quantePersiDi non si confondono', () => {
  const s = nuova();
  Mem.brucia(s, ['s1']);
  assert.equal(Mem.quanteDi(s, DEF, 'betta'), 1);
  assert.equal(Mem.quantePersiDi(s, DEF, 'betta'), 1);
  assert.equal(Mem.quanteDi(s, DEF, 'ansi'), 1);
  assert.equal(Mem.quantePersiDi(s, DEF, 'ansi'), 0);
});

/* ── i finali ────────────────────────────────────────────── */

test('il finale segue i ricordi che ti restano', () => {
  const s = nuova();
  s.memoria = [];
  assert.equal(Mem.finalePer(s).chiave, 'terra');
  s.memoria = ['s1'];
  assert.equal(Mem.finalePer(s).chiave, 'spoglio');
  s.memoria = ['s1', 's2'];
  assert.equal(Mem.finalePer(s).chiave, 'prato');
  s.memoria = ['s1', 's2', 's3', 's4', 's1', 's2', 's3'];
  assert.equal(Mem.finalePer(s).chiave, 'prato', 'sette ricordi ma zero petali: è un prato');
  s.memoria = ['s1', 's2', 's3', 's4', 's1', 's2', 's3', 's1'];
  assert.equal(Mem.finalePer(s).chiave, 'prato', 'la vigna non si raggiunge senza i sei petali');
});

test('la vigna e il giardino non si raggiungono senza i sei petali', () => {
  const s = nuova();
  s.memoria = ['s1', 's2', 's3', 's4', 's1', 's2', 's3', 's1', 's2', 's3', 's1', 's2'];
  s.fioriti = ['il-vaso', 'betta'];
  assert.equal(Mem.finalePer(s, { conPetali: true }).chiave, 'prato', 'dodici ricordi ma due soli petali: è un prato');
  s.fioriti = ['il-vaso', 'betta', 'ansi', 'orielia', 'donata', 'sauro'];
  assert.equal(Mem.finalePer(s, { conPetali: true }).chiave, 'vigna');
});

test('il giardino — il finale vero — chiede anche la promessa mantenuta', () => {
  const s = nuova();
  s.memoria = Array(14).fill('s1');
  s.fioriti = ['il-vaso', 'betta', 'ansi', 'orielia', 'donata', 'sauro'];
  assert.equal(Mem.finalePer(s, { conPetali: true, promessa: false }).chiave, 'vigna',
    'senza la promessa non è il giardino: sei l\'unica che poteva mantenerla');
  assert.equal(Mem.finalePer(s, { conPetali: true, promessa: true }).chiave, 'giardino');
});

test('la promessa si dichiara, non si deduce', () => {
  const s = nuova();
  assert.equal(Mem.promessaMantenuta(s), false);
  s.scelte.a1_promise = 'silenzio';
  assert.equal(Mem.promessaMantenuta(s), false);
  s.scelte.a1_promise = 'finiro';
  assert.equal(Mem.promessaMantenuta(s), true);
});

test('una finale sconosciuta non fa cadere niente', () => {
  const s = nuova();
  const f = Mem.finalePer(s, { conPetali: true, promessa: true });
  assert.ok(f && f.chiave && f.nome);
});

/* ── le viste ────────────────────────────────────────────── */

test('persone raggruppa per persona', () => {
  const s = nuova();
  const p = Mem.persone(DEF, s);
  assert.ok(p.has('betta'));
  assert.ok(p.has('ansi'));
  assert.equal(p.get('betta').length, 2, 's1 e s2 sono di betta');
});

test('persone con soloTrovate tiene chi hai perso, e ci mostra i petali secchi', () => {
  const s = nuova();
  Mem.brucia(s, ['s1', 's2', 's3', 's4']);
  assert.equal(Mem.persone(DEF, s).size, 3, 'una persona che hai perso resta nel filtro: è il posto dove vedi i petali secchi');
  assert.equal(Mem.persone(DEF, s, { soloTrovate: false }).size, 3, 'qui non cambia, perché le hai trovate tutte');
  assert.equal(Mem.schede(DEF, s, 'betta').length, 0, 'ma di schede da leggere non ne hai più');
  assert.equal(Mem.schedeBruciate(DEF, s, ).length, 4);
});

test('schede e schedeBruciate rispettano il filtro persona', () => {
  const s = nuova();
  assert.equal(Mem.schede(DEF, s, 'betta').length, 2);
  Mem.brucia(s, ['s1']);
  assert.equal(Mem.schede(DEF, s, 'betta').length, 1);
  assert.equal(Mem.schedeBruciate(DEF, s).length, 1);
  assert.equal(Mem.schedeBruciate(DEF, s)[0].id, 's1');
});

test('isVacia e puoiBruciare', () => {
  const s = nuova();
  assert.equal(Mem.isVacia(s), false);
  assert.equal(Mem.puoiBruciare(s, 2), true);
  assert.equal(Mem.puoiBruciare(s, 5), false);
  s.memoria = ['s1'];
  assert.equal(Mem.isVacia(s), false, 'una scheda non è il vuoto');
  s.memoria = [];
  assert.equal(Mem.isVacia(s), true);
});

test('senzaDup toglie i duplicati e conserva l\'ordine', () => {
  sequenza(Mem.senzaDup(['a', 'b', 'a', 'c', 'b']), ['a', 'b', 'c']);
});
