/* orto.test.mjs — la geometria della semina.
 *
 * La geometria è la parte che, se sbaglia di un fattore due, fa sbagliare tutto
 * il gioco senza che nessuno se ne accorga giocando. Qui è verificata a mano:
 * un tratto che copre metà deve valere circa metà, e ridisegnare lo stesso
 * tratto non deve ricoprire niente.
 *
 * E qui si verifica anche l'inversione: `semina` restituisce `cura` e non
 * `danno`, e il cuore al terzo stato dell'arco restituisce invece di costare.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT, STORIA_MINIMA } from './harness.mjs';

const h = carica();
const { FSTOrto: Orto, FSTVasi: Vasi } = h.win;
const RES = Orto.RES;
const Q = RES * RES;

/* Un quadrato noto, dichiarato in modo che l'area sia esatta e leggibile. */
const quadrato = (x, y, lato) => ({
  nome: 'quadrato',
  forme: [{ t: 'pol', pts: [[x, y], [x + lato, y], [x + lato, y + ladoSafe(y)], [x, y + ladoSafe(y)]] }],
});
/* `ladoSafe` esiste solo per non ripetere: lato e y+lato devono restare in 0..1 */
function ladoSafe(y) { return y; }

const BOX = {
  nome: 'riquadro',
  forme: [{ t: 'ell', x: 0.5, y: 0.5, rx: 0.25, ry: 0.25, cuore: true }],
};

/* ── le forme ────────────────────────────────────────────── */

test('un punto dentro un\'ellisse', () => {
  assert.equal(Orto.dentroEll(0.5, 0.5, { x: 0.5, y: 0.5, rx: 0.2, ry: 0.2 }), true);
  assert.equal(Orto.dentroEll(0.9, 0.5, { x: 0.5, y: 0.5, rx: 0.2, ry: 0.2 }), false);
});

test('un\'ellisse ruotata ruota davvero', () => {
  const e = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.05, rot: Math.PI / 2 };
  assert.equal(Orto.dentroEll(0.5, 0.7, e), true, 'lunga in verticale dopo la rotazione');
  assert.equal(Orto.dentroEll(0.7, 0.5, e), false, 'e non in orizzontale');
});

test('la rotazione parte da zero e non sbaglia il verso', () => {
  const e = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.05 };
  assert.equal(Orto.dentroEll(0.7, 0.5, e), true);
  const ruotata = { ...e, rot: Math.PI / 2 };
  assert.equal(Orto.dentroEll(0.7, 0.5, ruotata), false);
  assert.equal(Orto.dentroEll(0.5, 0.7, ruotata), true);
});

test('puntoInForma distingue le forme e ignora le altre', () => {
  assert.equal(Orto.puntoInForma(0.5, 0.5, { t: 'ell', x: 0.5, y: 0.5, rx: 0.3, ry: 0.3 }), true);
  assert.equal(Orto.puntoInForma(0.5, 0.5, { t: 'pol', pts: [[0, 0], [1, 0], [1, 1], [0, 1]] }), true);
  assert.equal(Orto.puntoInForma(0.5, 0.5, { t: 'invaso', x: 0, y: 0 }), false);
});

/* ── la maschera ────────────────────────────────────────── */

test('la maschera conta l\'area e il cuore', () => {
  const m = Orto.maschera(BOX);
  assert.ok(m.totale > 0, 'qualcosa c\'è');
  assert.ok(m.cuore > 0, 'e il cuore è dichiarato');
  assert.ok(m.cuore <= m.totale, 'il cuore sta dentro l\'area');
  assert.equal(m.maschera.length, Q);
  assert.equal(m.petto.length, Q);
});

test('senza un cuore dichiarato, il cuore è il terzo superiore', () => {
  const senza = { forme: [{ t: 'ell', x: 0.5, y: 0.5, rx: 0.3, ry: 0.4 }] };
  const m = Orto.maschera(senza);
  assert.ok(m.cuore > 0, 'il bonus esiste comunque, e il giocatore lo trova da solo');
  const atteso = Math.ceil(RES / 3) * RES;
  /* il terzo superiore della maschera: conta le celle accese nelle prime righe */
  let sopra = 0;
  for (let j = 0; j < Math.floor(RES / 3); j++) for (let i = 0; i < RES; i++) if (m.petto[j * RES + i]) sopra++;
  assert.equal(sopra, m.cuore, 'il cuore è esattamente la parte alta');
  assert.ok(m.cuore < atteso, 'e non tutto');
});

test('un vaso senza forme ha una maschera vuota, e non esplode', () => {
  const m = Orto.maschera({ forme: [] });
  assert.equal(m.totale, 0);
  assert.equal(m.cuore, 0);
  assert.equal(Orto.maschera({}).totale, 0, 'nemmeno un vaso mancante fa eccezione');
});

test('la maschera è deterministica', () => {
  const a = Orto.maschera(BOX);
  const b = Orto.maschera(BOX);
  assert.deepEqual(Array.from(a.maschera), Array.from(b.maschera));
  assert.equal(a.totale, b.totale);
});

/* ── copre: la misura vera ──────────────────────────────── */

test('copre conta i pixel nuovi e non riconta', () => {
  const m = Orto.maschera(BOX);
  const gia = new Uint8Array(Q);
  const dritta = [[0.1, 0.5], [0.9, 0.5]];
  const a = Orto.copre(m, dritta, 0.075, gia);
  assert.ok(a.nuovi > 0, 'copre qualcosa');
  const b = Orto.copre(m, dritta, 0.075, gia);
  assert.equal(b.nuovi, 0, 'ridisegnare lo stesso tratto non ricopre niente');
});

test('un tratto largo copre più di uno stretto', () => {
  const m = Orto.maschera(BOX);
  const g1 = new Uint8Array(Q);
  const g2 = new Uint8Array(Q);
  const dritta = [[0.1, 0.5], [0.9, 0.5]];
  const stretto = Orto.copre(m, dritta, 0.045, g1);
  const largo = Orto.copre(m, dritta, 0.115, g2);
  assert.ok(largo.nuovi > stretto.nuovi);
});

test('copre fuori dalla maschera non conta niente', () => {
  const m = Orto.maschera(BOX);
  const gia = new Uint8Array(Q);
  const fuori = Orto.copre(m, [[0.02, 0.02], [0.05, 0.05]], 0.045, gia);
  assert.equal(fuori.nuovi, 0);
});

test('un tocco solo copre una macchia, non una striscia', () => {
  const m = Orto.maschera(BOX);
  const gia = new Uint8Array(Q);
  const a = Orto.copre(m, [[0.5, 0.5]], 0.045, gia);
  const b = Orto.copre(m, [[0.1, 0.5], [0.9, 0.5]], 0.045, new Uint8Array(Q));
  assert.ok(b.nuovi > a.nuovi * 5, 'una riga lunga copre molto di più di un punto');
});

test('copre con una maschera vuota non fa eccezione', () => {
  const m = Orto.maschera({ forme: [] });
  const gia = new Uint8Array(Q);
  sequenzaSicura(() => Orto.copre(m, [[0.1, 0.5], [0.9, 0.5]], 0.075, gia), { nuovi: 0, cuoreNuovi: 0 });
});

/* ── drittezza e lunghezza ───────────────────────────────── */

test('drittezza: un punto è massimo, una riga è zero', () => {
  assert.equal(Orto.drittezza([[0.5, 0.5]]), 1);
  assert.equal(Orto.drittezza([]), 1);
  assert.ok(Orto.drittezza([[0.1, 0.5], [0.9, 0.5]]) < 0.001, 'una riga dritta');
});

test('drittezza: un serpente non è dritto', () => {
  const squiglio = [[0.1, 0.5], [0.5, 0.2], [0.9, 0.5]];
  assert.ok(Orto.drittezza(squiglio) > 0.1);
});

test('drittezza non dipende dalla scala', () => {
  const a = [[0.1, 0.5], [0.5, 0.35], [0.9, 0.5]];
  const b = a.map(([x, y]) => [x * 0.4 + 0.1, y * 0.4 + 0.1]);
  assert.ok(Math.abs(Orto.drittezza(a) - Orto.drittezza(b)) < 0.05);
});

test('lunghezza somma i segmenti', () => {
  assert.equal(Orto.lunghezza([]), 0);
  assert.equal(Orto.lunghezza([[0, 0]]), 0);
  assert.ok(Math.abs(Orto.lunghezza([[0, 0], [0.3, 0.4]]) - 0.5) < 1e-9);
});

/* ── caratteristiche: serve al suono e alla resa ────────── */

test('caratteristiche dà lunghezza, drittezza, velocità e forza', () => {
  const c = Orto.caratteristiche({ punti: [[0.1, 0.5], [0.9, 0.5]], durataMs: 500 });
  assert.ok(c.lunghezza > 0.7);
  assert.ok(c.drittezza < 0.01);
  assert.ok(c.velocita > 0);
  assert.ok(c.forza >= 0 && c.forza <= 1);
});

test('più veloce è più forza, e la velocità non cambia la lunghezza', () => {
  const lento = Orto.caratteristiche({ punti: [[0.1, 0.5], [0.9, 0.5]], durataMs: 2000 });
  const veloce = Orto.caratteristiche({ punti: [[0.1, 0.5], [0.9, 0.5]], durataMs: 100 });
  assert.ok(veloce.forza > lento.forza, 'un colpo rapido è più forte di una striscia');
  assert.ok(Math.abs(veloce.lunghezza - lento.lunghezza) < 1e-9, 'ma la striscia è la stessa');
});

/* ── l'inversione: `semina` restituisce cura ────────────── */

const orto = () => {
  const T = Orto.nuovo(null, null);
  T.impostaNemico(BOX);
  return T;
};

test('semina restituisce cura, non danno', () => {
  const T = orto();
  const r = T.semina({ punti: [[0.1, 0.5], [0.9, 0.5]], larghezza: 0.075 }, { valore: 100 });
  assert.ok('cura' in r, 'si chiama cura');
  assert.equal('danno' in r, false, 'e non esiste nessun danno: non si attacca');
  assert.ok(r.quota > 0 && r.quota <= 1);
  assert.ok(r.cuore > 0);
  assert.ok(r.nuovo > 0);
});

test('la copertura è (lunghezza + presa) × presa: si può fare a mano', () => {
  /* Il pennello è un disco, e un disco aggiunge un raggio a ogni estremità.
     Quindi un tratto lungo L copre (L + larghezza) × larghezza, e la copertura
     è esattamente proporzionale a quel numero. Qui non c'è una tolleranza
     "abbastanza stretta": c'è la formula, e si verifica. */
  const GRANDE = { nome: 'grande', forme: [{ t: 'pol', pts: [[0.02, 0.02], [0.98, 0.02], [0.98, 0.98], [0.02, 0.98]] }] };
  const apri = () => { const T = Orto.nuovo(null, null); T.impostaNemico(GRANDE); return T; };
  const MISURA = 0.02;
  for (const L of [0.1, 0.25, 0.5, 0.8]) {
    const T = apri();
    const x0 = 0.1;
    const r = T.semina({ punti: [[x0, 0.5], [x0 + L, 0.5]], larghezza: MISURA }, { valore: 100 });
    const atteso = ((L + MISURA) * MISURA) / (0.96 * 0.96);
    assert.ok(Math.abs(r.quota - atteso) < 0.006, `L=${L}: quota ${r.quota.toFixed(4)} contro un atteso di ${atteso.toFixed(4)}`);
  }
});

test('raddoppiare il terreno raddoppia la copertura, tolleranza del disco', () => {
  const GRANDE = { nome: 'grande', forme: [{ t: 'pol', pts: [[0.02, 0.02], [0.98, 0.02], [0.98, 0.98], [0.02, 0.98]] }] };
  const apri = () => { const T = Orto.nuovo(null, null); T.impostaNemico(GRANDE); return T; };
  const a = apri().semina({ punti: [[0.1, 0.5], [0.25, 0.5]], larghezza: 0.02 }, { valore: 100 });
  const b = apri().semina({ punti: [[0.1, 0.5], [0.85, 0.5]], larghezza: 0.02 }, { valor: 100, valore: 100 });
  const rapporto = b.quota / a.quota;
  const atteso = (0.77) / (0.17);            // (0.75+0.02) / (0.15+0.02)
  assert.ok(Math.abs(rapporto - atteso) < 0.2, `${rapporto.toFixed(2)} contro un atteso di ${atteso.toFixed(2)}`);
  assert.ok(rapporto > 4, 'e il terreno reso è quasi cinque volte: la copertura segue il terreno');
});

test('la copertura non può superare l\'area del vaso', () => {
  const T = orto();
  /* una griglia, non una riga: riempiere davvero richiede passare in due direzioni */
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      const y0 = 0.08 + r * 0.07;
      const x0 = 0.08 + c * 0.07;
      T.semina({ punti: [[x0, y0], [x0 + 0.05, y0]], larghezza: 0.115 }, { valore: 100 });
    }
  }
  assert.ok(T.quota() <= 1, 'ridisegnare mille volte non fa crescere la copertura oltre l\'area');
  assert.ok(T.quota() > 0.9, `e il vaso si riempie davvero (${T.quota().toFixed(3)})`);
});

test('il moltiplicatore della mossa c\'è e lavora', () => {
  const a = orto();
  const b = orto();
  const t = { punti: [[0.1, 0.5], [0.9, 0.5]], larghezza: 0.045 };
  const uno = a.semina(t, { moltiplicatore: 1, valore: 100 });
  const due = b.semina(t, { moltiplicatore: 4, valore: 100 });
  assert.ok(due.cura > uno.cura, 'il Mazzo rende più cura di Offri a parità di terreno');
});

test('il cuore rende il doppio — finché non lo inverto', () => {
  const a = orto();
  const b = orto();
  const t = { punti: [[0.5, 0.35], [0.5, 0.45]], larghezza: 0.03 };   // dentro il cuore
  const dritto = a.semina(t, { bonusCuore: 2.2, valore: 100 });
  const rovesciato = b.semina(t, { bonusCuore: 2.2, valore: 100, inverteCuore: true });
  assert.ok(dritto.cuore > 0, 'il tratto è passato sul cuore');
  assert.ok(rovesciato.cura < 0, 'invertito, il cuore ti restituisce invece di costare');
});

test('senza coprire il cuore, invertirlo non cambia niente', () => {
  const a = orto();
  const b = orto();
  const t = { punti: [[0.2, 0.85], [0.8, 0.85]], larghezza: 0.03 };   // in basso
  const dritto = a.semina(t, { valore: 100 });
  const rovesciato = b.semina(t, { valore: 100, inverteCuore: true });
  assert.ok(rovesciato.cuore === 0);
  assert.ok(Math.abs(dritto.cura - rovesciato.cura) < 1e-9);
});

test('quota e copertura corrente tornano al gioco vero', () => {
  const T = orto();
  assert.equal(T.quota(), 0);
  T.semina({ punti: [[0.1, 0.5], [0.9, 0.5]], larghezza: 0.075 }, { valore: 100 });
  assert.ok(T.quota() > 0);
  T.azzera();
  assert.equal(T.quota(), 0, 'azzera riporta tutto a zero');
});

test('un orto senza vaso non si rompe quando lo usi', () => {
  const T = Orto.nuovo(null, null);
  const r = T.semina({ punti: [[0.1, 0.5], [0.9, 0.5]], larghezza: 0.075 });
  assert.equal(r.cura, 0);
  assert.equal(T.quota(), 0);
  T.impostaSete(0.5);
  T.azzera();
});

test('la larghezza della presa ha tre valori, e sono in ordine', () => {
  const T = orto();
  T.impostaMorsa('sottile');
  const sottile = T.larghezzaMorsa();
  T.impostaMorsa('medio');
  const medio = T.larghezzaMorsa();
  T.impostaMorsa('largo');
  assert.ok(sottile < medio && medio < T.larghezzaMorsa());
  T.impostaMorsa('inesistente');
  assert.equal(T.larghezzaMorsa(), medio, 'una presa sconosciuta non ti lascia senza mano');
});

test('i fiori sono cinque, e ognuno ha un colore', () => {
  const chiavi = Object.keys(Orto.FIORI);
  assert.ok(chiavi.length >= 4);
  for (const k of chiavi) {
    assert.match(Orto.FIORI[k].base, /^#[0-9a-f]{6}$/i, `${k} ha un colore`);
    assert.match(Orto.FIORI[k].ombra, /^#[0-9a-f]{6}$/i, `${k} ha un'ombra`);
  }
});

test('la luminosità ha tre livelli e accetta solo quelli', () => {
  assert.deepEqual(Object.keys(Orto.LUMI).sort(), ['chiaro', 'media', 'scura']);
  const T = orto();
  T.impostaLume('chiaro');
  T.impostaLume('inesistente');
  T.impostaLume('scura');
  T.azzera();
});

/* ── ogni vaso, ai tre stati, è seminabile ──────────────── */

test('ogni vaso ha una maschera che si può coprire, ai tre stati', () => {
  for (const id of Vasi.ORDINE) {
    for (let st = 0; st <= 2; st++) {
      const v = Vasi.per(id, st);
      const m = Orto.maschera(v);
      assert.ok(m.totale > Q * 0.02, `${id} stato ${st}: area troppo piccola (${(100 * m.totale / Q).toFixed(1)}%)`);
      assert.ok(m.cuore > 0, `${id} stato ${st}: nessun cuore, e senza cuore il gioco perde il 2,2`);
      assert.ok(m.cuore < m.totale, `${id} stato ${st}: il cuore non può essere tutta l'area`);
    }
  }
});

function sequenzaSicura(f, atteso) {
  const r = f();
  assert.equal(r.nuovi, atteso.nuovi);
  assert.equal(r.cuoreNuovi, atteso.cuoreNuovi);
}

/* ── il cuore si deve poter trovare ───────────────────────── */

test('il cuore è piccolo ma non è invisibile', () => {
  /* Era una macchiolina — un paio di pixel percento della figura — e l'unico
   * segno che ci fosse erano due trattini alti due pixel. Il 2,2 era un numero
   * in una tabella: il gioco non diceva mai dove si prendesse. Un centro che
   * vale il doppio e non si vede obbliga a spargere fiori dappertutto sperando.
   *
   * La misura è in percentuale della TELA, non del vaso, e conta. Un colpo
   * copre una fetta del quadrato: se il cuore è il 3% della tela, una passata
   * sola lo prende se passi nel posto giusto, e non lo prende se passi altrove.
   * Se è l'1%, è una fortuna; se è il 12%, è gratis. */
  for (const id of Vasi.ORDINE) {
    for (let stato = 0; stato <= 2; stato++) {
      const m = Orto.maschera(Vasi.per(id, stato));
      const quota = m.cuore / (Orto.RES * Orto.RES);
      assert.ok(quota > 0.02,
        `${id} stato ${stato}: il cuore è il ${(quota * 100).toFixed(1)}% della tela. Sotto il 2% non è una mira, è una fortuna.`);
      assert.ok(quota < 0.10,
        `${id} stato ${stato}: il cuore è il ${(quota * 100).toFixed(1)}% della tela. Sopra il 10% una passata sola lo prende e il 2,2 non è più una scelta.`);
    }
  }
});

test('il cuore vale davvero: il bonus si sente', () => {
  /* Se il cuore non cambiasse niente, l'alone sarebbe un disegno carino e basta.
   * Serve una figura con dentro e fuori: `BOX` è tutto cuore, e fuori dal
   * cuore non c'è niente da coprire. */
  const CONCUORE = {
    nome: 'con cuore',
    forme: [
      { t: 'pol', pts: [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]] },
      { t: 'ell', x: 0.5, y: 0.5, rx: 0.09, ry: 0.09, cuore: true },
    ],
  };
  const apri = () => { const T = Orto.nuovo(null, null); T.impostaNemico(CONCUORE); return T; };

  const sulCuore = apri().semina({ punti: [[0.5, 0.46], [0.5, 0.54]], larghezza: 0.05 }, { valore: 100 });
  const fuori = apri().semina({ punti: [[0.2, 0.2], [0.26, 0.24]], larghezza: 0.05 }, { valore: 100 });

  assert.ok(sulCuore.cuore > 0, 'il primo colpo passa sul cuore');
  assert.equal(fuori.cuore, 0, 'il secondo no');
  assert.ok(fuori.quota > 0, 'e copre terreno: altrimenti non si confronta niente');

  const perCella = sulCuore.cura / (sulCuore.quota * 100);
  const perCellaFuori = fuori.cura / (fuori.quota * 100);
  assert.ok(perCella > perCellaFuori * 1.9,
    `la stessa quantità di terreno vale ${perCella.toFixed(3)} sul cuore contro ${perCellaFuori.toFixed(3)} fuori: il 2,2 non si sente`);
});
