/* tela.test.mjs — la geometria della tela.
 *
 * Il danno non viene da una barra: viene dall'intersezione fra il segno del
 * dito e la maschera del ritratto. Se qui sbaglia di un fattore due, tutto
 * il gioco è sbagliato e nessuno se ne accorge giocando. Quindi i test sono
 * geometrici e verificabili a mano: un tratto che copre metà del ritratto deve
 * valere circa metà.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carica, STORIA_MINIMA } from './harness.mjs';

const { win } = carica({ storia: STORIA_MINIMA });
const T = win.PMFTela;
const RES = T.RES;

const quadrato = (x, y, lato, volto = false) => ({ t: 'pol', pts: [[x, y], [x + lato, y], [x + lato, y + lato], [x, y + lato]], volto });
const nuovaMaschera = (forme) => T.maschera({ forme });
const registro = () => new Uint8Array(RES * RES);
const orizzontale = (y, da = 0.05, a = 0.95) => [[da, y], [a, y]];
const quota = (m, punti, larg = T.PENNELLI.medio) => T.copre(m, punti, larg, registro()).nuovi / m.totale;

test('la maschera conta solo i pixel dentro le forme', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  /* un quadrato metà per metà dovrebbe essere circa un quarto della tela */
  assert.ok(Math.abs(m.totale / (RES * RES) - 0.25) < 0.01, `atteso ~0.25, ottenuto ${(m.totale / (RES * RES)).toFixed(3)}`);
});

test('due forme sovrapposte non si contano due volte', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5), quadrato(0.25, 0.25, 0.25)]);
  const solo = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  assert.equal(m.totale, solo.totale);
});

test('il volto dichiarato viene contato a parte', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5), quadrato(0.3, 0.3, 0.2, true)]);
  assert.ok(m.volto > 0 && m.volto < m.totale);
});

test('senza volto dichiarato, il volto è il terzo superiore', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.1, 0.5)]);
  assert.ok(m.volto > 0, 'il terzo superiore c\'è sempre, e fa da bersaglio');
});

test('una riga attraversa il ritratto ma non lo riempie', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const q = quota(m, orizzontale(0.5));
  /* Una riga attraversa tutta la larghezza ma è sottile: copre circa un
   * sesto del quadrato, non la metà. Il risultato conta i pixel, non la
   * distanza percorsa — se un giorno coprisse metà, il pennello sarebbe
   * largo quanto la tela. */
  assert.ok(q > 0.10 && q < 0.25, `atteso ~0.17, ottenuto ${q.toFixed(3)}`);
});

test('otto righe incollate coprono il ritratto quasi tutto', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const gia = registro();
  for (let i = 0; i <= 8; i++) {
    T.copre(m, orizzontale(0.25 + (i * 0.5) / 8), T.PENNELLI.medio, gia);
  }
  const coperto = gia.reduce((n, v) => n + v, 0) / m.totale;
  assert.ok(coperto > 0.85, `atteso >0.85, ottenuto ${coperto.toFixed(3)}`);
});

test('un tratto più spesso copre di più', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const sottile = quota(m, orizzontale(0.5), T.PENNELLI.sottile);
  const largo = quota(m, orizzontale(0.5), T.PENNELLI.largo);
  assert.ok(largo > sottile, `largo ${largo.toFixed(3)} deve superare sottile ${sottile.toFixed(3)}`);
});

test('un tratto fuori dal ritratto non copre niente', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  assert.equal(quota(m, orizzontale(0.05)), 0);
  assert.equal(quota(m, orizzontale(0.95)), 0);
});

test('ridisegnare lo stesso tratto non ricopre niente', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const gia = registro();
  const primo = T.copre(m, orizzontale(0.5), T.PENNELLI.medio, gia).nuovi;
  const secondo = T.copre(m, orizzontale(0.5), T.PENNELLI.medio, gia).nuovi;
  assert.ok(primo > 0);
  assert.equal(secondo, 0, 'il doppio conteggio gonfierebbe il danno a ogni dito');
});

test('due tratti adiacenti coprono più di uno solo', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const gia = registro();
  T.copre(m, orizzontale(0.35), T.PENNELLI.medio, gia);
  const totale = gia.reduce((n, v) => n + v, 0);
  assert.ok(totale > m.totale * 0.15);
  const aggiunto = T.copre(m, orizzontale(0.7), T.PENNELLI.medio, gia).nuovi;
  assert.ok(aggiunto > 0);
  const finale = gia.reduce((n, v) => n + v, 0);
  assert.ok(finale > totale);
});

test('i punti fuori tela non rompono nulla', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  assert.equal(quota(m, [[0.05, 0.05], [0.20, 0.05]]), 0, 'un tratto sopra il ritratto');
  assert.equal(quota(m, [[0.05, 0.95], [0.20, 0.95]]), 0, 'e uno sotto');
  assert.equal(quota(m, [[0.05, 0.4], [0.05, 0.6]]), 0, 'e uno di lato');
  assert.equal(quota(m, []), 0);
  const tocco = quota(m, [[0.5, 0.5]]);
  assert.ok(tocco > 0, 'un tocco copre almeno la macchia del pennello');
  assert.ok(tocco < 0.03, `ma un tocco da solo resta un tocco, ottenuto ${tocco.toFixed(3)}`);
});

test('una riga che entra dalla pagina copre la parte dentro, e niente di più', () => {
  const m = nuovaMaschera([quadrato(0.25, 0.25, 0.5)]);
  const dentro = quota(m, [[0.30, 0.5], [0.70, 0.5]]);
  const attraverso = quota(m, [[-0.5, 0.5], [1.5, 0.5]]);
  /* Non è identico: la parte fuori dal ritratto campionata in più spinge il
   * bordo del pennello qualche pixel dentro. Quindi si confronta con un
   * margine, e la proprietà che conta è che la differenza sia minuscola. */
  assert.ok(Math.abs(dentro - attraverso) < 0.02, `la parte fuori tela non deve cambiare la copertura: ${dentro.toFixed(3)} contro ${attraverso.toFixed(3)}`);
});

test('la drittezza distingue una riga da uno scarabocchio', () => {
  const riga = [[0.2, 0.5], [0.35, 0.5], [0.5, 0.5], [0.65, 0.5], [0.8, 0.5]];
  assert.ok(T.drittezza(riga) < 0.001);
  const onda = [[0.2, 0.5], [0.3, 0.4], [0.4, 0.6], [0.5, 0.42], [0.6, 0.58], [0.7, 0.5]];
  assert.ok(T.drittezza(onda) > 0.1, `uno scarabocchio deve superare 0.1, ottenuto ${T.drittezza(onda).toFixed(3)}`);
});

test('la drittezza normalizza sulla lunghezza: stesso tratto, scala diversa', () => {
  const segno = [[0, 0], [0.1, 0.1], [0.2, 0], [0.3, 0.1], [0.4, 0]];
  const grande = segno.map(([x, y]) => [x, y]);
  const piccolo = segno.map(([x, y]) => [x * 0.1, y * 0.1]);
  assert.ok(Math.abs(T.drittezza(grande) - T.drittezza(piccolo)) < 0.05);
});

test('un punto singolo o un tratto cortissimo non è una parata', () => {
  assert.equal(T.drittezza([[0.5, 0.5]]), 1);
  assert.equal(T.drittezza([]), 1);
  assert.equal(T.lunghezza([[0, 0], [0, 0]]), 0);
});

test('la lunghezza misura la strada percorsa, non la distanza finale', () => {
  const dritto = T.lunghezza([[0, 0], [0.5, 0]]);
  const a_zigzag = T.lunghezza([[0, 0], [0.25, 0.25], [0.5, 0]]);
  assert.ok(Math.abs(dritto - 0.5) < 1e-9);
  assert.ok(a_zigzag > dritto, 'lo zigzag percorre di più');
});

test('le caratteristiche di un tratto distinguono un colpo da un tracciare', () => {
  const punti = [];
  for (let i = 0; i <= 10; i++) punti.push([0.2 + i * 0.05, 0.5]);
  const rapido = T.caratteristiche({ punti, durataMs: 120, larghezza: 0.075 });
  const lento = T.caratteristiche({ punti, durataMs: 900, larghezza: 0.075 });
  assert.ok(rapido.velocita > lento.velocita, 'la velocità distingue le due');
  assert.ok(rapido.forza > lento.forza, 'e con lei la forza');
  assert.equal(rapido.lunghezza, lento.lunghezza, 'la lunghezza non dipende dalla velocità');
});

test('la maschera di ogni nemico del gioco ha dentro qualcosa', () => {
  const Nem = win.PMFNemici;
  for (const id of Nem.ORDINE) {
    const m = nuovaMaschera(Nem.per(id).forme);
    assert.ok(m.totale > RES * 0.02, `${id}: ritratto troppo piccolo (${m.totale} pixel)`);
    assert.ok(m.volto > 0, `${id}: nessun volto, e il bonus non avrebbe dove stare`);
    assert.ok(m.volto < m.totale, `${id}: il volto è tutto il ritratto`);
  }
});

test('ritratti diversi hanno maschere diverse', () => {
  const Nem = win.PMFNemici;
  const a = nuovaMaschera(Nem.per('il-commiato').forme);
  const b = nuovaMaschera(Nem.per('tecla').forme);
  assert.notEqual(a.totale, b.totale, 'due nemici diversi non possono avere la stessa area');
});