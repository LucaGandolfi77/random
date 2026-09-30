/* memoria.test.mjs — il Quaderno.
 *
 * Qui si prova la parte del gioco che non si può tornare indietro: se una
 * scheda sparisce quando non deve, la partita è persa. Quindi i test sono
 * scritti per essere scomodi: si prova a bruciare due volte, a riafferrare
 * una cosa già riafferrata, a finire senza più ricordi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const { win } = carica({ storia: STORIA_MINIMA });

/* Gli array che arrivano dal vm hanno un Array.prototype diverso da quello del
 * test, e deepStrictEqual lo controlla. Qui si confronta il contenuto, che è
 * quello che interessa. */
const sequenza = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const Mem = win.PMFMemoria;
const S = win.PMFSave;
const defs = STORIA_MINIMA.schede;
const nuovo = () => S.nuovaPartita(defs);

test('una partita nuova ha tutte le schede', () => {
  const s = nuovo();
  assert.equal(Mem.quante(s), 4);
  sequenza(s.memoria, ['s1', 's2', 's3', 's4']);
});

test('bruciare toglie la scheda e la mette fra le bruciate, in ordine', () => {
  const s = nuovo();
  Mem.brucia(s, ['s2']);
  assert.equal(Mem.quante(s), 3);
  assert.equal(Mem.ha(s, 's2'), false);
  sequenza(s.bruciate, ['s2']);
  Mem.brucia(s, ['s4']);
  sequenza(s.bruciate, ['s2', 's4'], 'l\'ordine di bruciatura è l\'ordine in cui le hai perse');
});

test('bruciare due volte la stessa scheda non la brucia due volte', () => {
  const s = nuovo();
  Mem.brucia(s, ['s2']);
  Mem.brucia(s, ['s2']);
  sequenza(s.bruciate, ['s2']);
  assert.equal(Mem.quante(s), 3);
});

test('bruciare una scheda che non hai è innocuo', () => {
  const s = nuovo();
  Mem.brucia(s, ['s2']);
  const prima = Mem.quante(s);
  Mem.brucia(s, ['s2']);
  Mem.brucia(s, ['inesistente']);
  assert.equal(Mem.quante(s), prima);
});

test('una scheda già in Quaderno non viene rimossa dal suo posto', () => {
  const s = nuovo();
  sequenza(s.memoria, ['s1', 's2', 's3', 's4']);
  Mem.trova(s, 's1');
  sequenza(s.memoria, ['s1', 's2', 's3', 's4'], 'ritrovare una scheda che hai già non la sposta');
});

test('la perdita automatica prende la scheda appena trovata', () => {
  const s = nuovo();
  Mem.trova(s, 'nuova');
  assert.equal(s.memoria[0], 'nuova', 'una scheda nuova va in testa');
  Mem.trova(s, 'altra');
  assert.equal(s.memoria[0], 'altra', 'e davanti a tutte le altre');
  Mem.bruciaAutomatico(s);
  assert.equal(Mem.ha(s, 'altra'), false, 'la fresca è la prima a salire');
  assert.equal(Mem.ha(s, 'nuova'), true, 'le meno fresche restano');
  assert.equal(s.memoria[0], 'nuova', 'e poi tocca alla successiva');
});

test('una scheda riafferrata non è la più fragile', () => {
  const s = nuovo();
  Mem.brucia(s, ['s2']);
  Mem.riafferra(s, 's2');
  assert.equal(s.memoria[s.memoria.length - 1], 's2',
    'appena ripresa va in fondo: non è ancora consolidata');
  Mem.bruciaAutomatico(s);
  assert.equal(Mem.ha(s, 's2'), true, 'la perdita automatica non la prende');
});

test('bruciaAutomatico rispetta il numero richiesto', () => {
  const s = nuovo();
  Mem.bruciaAutomatico(s, 3);
  assert.equal(Mem.quante(s), 1);
  Mem.bruciaAutomatico(s, 5);
  assert.equal(Mem.quante(s), 0, 'non va sotto zero');
  assert.equal(Mem.isVacia(s), true);
});

test('una scheda bruciata resta "trovata": non torna disponibile', () => {
  const s = nuovo();
  Mem.brucia(s, ['s3']);
  assert.equal(Mem.trovata(s, 's3'), true);
  assert.equal(Mem.ha(s, 's3'), false, 'trovata ma non posseduta');
});

test('riafferrando si riavre il Quaderno', () => {
  const s = nuovo();
  Mem.brucia(s, ['s3']);
  const id = Mem.schedaDaRiafferrare(s);
  assert.equal(id, 's3');
  assert.equal(Mem.riafferra(s, id), 's3');
  assert.equal(Mem.ha(s, 's3'), true);
  sequenza(s.bruciate, [], 'non è più bruciata');
  sequenza(s.riafferrate, ['s3']);
});

test('la parata restituisce la scheda bruciata più di recente', () => {
  const s = nuovo();
  Mem.brucia(s, ['s2']);
  Mem.brucia(s, ['s4']);
  assert.equal(Mem.schedaDaRiafferrare(s), 's4');
  Mem.riafferra(s, 's4');
  assert.equal(Mem.schedaDaRiafferrare(s), 's2', 'la prossima da riprendere è la precedente');
});

test('senza schede bruciate non c\'è niente da riprendere', () => {
  assert.equal(Mem.schedaDaRiafferrare(nuovo()), null);
});

test('le chiavi dipendono dalle schede che hai ancora', () => {
  const s = nuovo();
  assert.equal(Mem.abilita(s, defs, 'parla'), true);
  assert.equal(Mem.abilita(s, defs, 'lavora'), true);
  assert.equal(Mem.abilita(s, defs, 'inchiostro'), true);
  Mem.brucia(s, ['s2']);
  assert.equal(Mem.abilita(s, defs, 'lavora'), false, 'bruciando la scheda sparisce la mossa');
  assert.equal(Mem.abilita(s, defs, 'parla'), true, 'le altre schede non cambiano');
});

test('i valori numerici si sommano e spariscono insieme alle schede', () => {
  const s = nuovo();
  assert.equal(Mem.bonus(s, defs).danno, 1.1);
  Mem.brucia(s, ['s2']);
  assert.equal(Mem.bonus(s, defs).danno, 1);
});

test('si può bruciare solo se le schede sono abbastanza', () => {
  const s = nuovo();
  assert.equal(Mem.puoiBruciare(s, 2), true);
  Mem.brucia(s, ['s1', 's2', 's3']);
  assert.equal(Mem.puoiBruciare(s, 2), false, 'una sola scheda non basta per bruciarne due');
  assert.equal(Mem.puoiBruciare(s, 1), true);
});

/* Con quattro schede non si arriva mai alla Voce, quindi per le soglie alte
 * si allunga la lista: ids finti, la logica non guarda il contenuto. */
const molte = (n) => Array.from({ length: n }, (_, i) => `x${i}`);

test('il finale segue il numero di ricordi rimasti', () => {
  const s = nuovo();
  s.memoria = molte(14);
  assert.equal(Mem.finalePer(s).chiave, 'voce');
  s.memoria = molte(13);
  assert.equal(Mem.finalePer(s).chiave, 'voce', 'tredici è la soglia');
  s.memoria = molte(12);
  assert.equal(Mem.finalePer(s).chiave, 'calore');
  s.memoria = molte(5);
  assert.equal(Mem.finalePer(s).chiave, 'calore', 'cinque è la soglia');
  s.memoria = molte(4);
  assert.equal(Mem.finalePer(s).chiave, 'cielo');
  s.memoria = molte(1);
  assert.equal(Mem.finalePer(s).chiave, 'cielo', 'una scheda sola non è abbastanza per parlare');
  s.memoria = [];
  assert.equal(Mem.finalePer(s).chiave, 'cenere');
});

test('il finale vero richiede i quattro schizzi e abbastanza ricordi', () => {
  const s = nuovo();
  s.memoria = molte(13);
  s.frammenti = ['fr-1', 'fr-2', 'fr-3'];
  assert.equal(Mem.finalePer(s, { conFrammenti: true }).chiave, 'voce', 'tre schizzi non bastano');
  s.frammenti = ['fr-1', 'fr-2', 'fr-3', 'fr-4'];
  assert.equal(Mem.finalePer(s, { conFrammenti: true }).chiave, 'studio');
  s.memoria = molte(8);
  assert.equal(Mem.finalePer(s, { conFrammenti: true }).chiave, 'studio', 'otto è la soglia');
  s.memoria = molte(7);
  assert.equal(Mem.finalePer(s, { conFrammenti: true }).chiave, 'calore',
    'i quattro schizzi non bastano se non ti ricordi più nulla');
});

test('senza schizzi non si arriva mai al finale vero', () => {
  const s = nuovo();
  s.memoria = molte(28);
  assert.equal(Mem.finalePer(s, { conFrammenti: true }).chiave, 'voce');
});

test('il Quaderno si può raggruppare per persona', () => {
  const s = nuovo();
  const per = Mem.persone(defs, s);
  assert.equal(per.get('tecla').length, 1);
  assert.equal(per.get('ansi').length, 1);
  Mem.brucia(s, ['s1']);
  const dopo = Mem.persone(defs, s);
  assert.equal(dopo.has('tecla'), true, 'una persona bruciata sparisce dal gruppo');
});

test('le schede sono elencate dalla più fresca alla più antica', () => {
  const s = nuovo();
  Mem.trova(s, 's1');
  assert.equal(Mem.schede(defs, s)[0].id, 's1');
});