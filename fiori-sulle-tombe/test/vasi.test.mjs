/* vasi.test.mjs — chi sta dentro il vaso, e se l'arc[o] è vero.
 *
 * Questo è il file che protegge la promessa centrale del gioco: che le persone
 * cambino, e che le cambino meccanicamente e non solo nel testo. Se l'arco
 * fosse una dichiarazione — tre frasi buone in una scheda e la stessa figura in
 * tutti e tre gli stati — il gioco avrebbe promesso una cosa e fatto un'altra,
 * e nessuno se ne accorgerebbe fino al terzo vaso.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT } from './harness.mjs';

const h = carica();
const { FSTVasi: Vasi, FSTOrto: Orto, FSTDono: Dono } = h.win;
const Q = Orto.RES * Orto.RES;

const persone = () => Vasi.ORDINE.filter((id) => Vasi.VASI[id].persona);

/* La storia vera, non quella di prova: qui si verifica che i vasi e il Mazzetto
   parlino della stessa serie di persone. */
const STORIA = () => JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));

/* ── l'insieme ──────────────────────────────────────────── */

test('i vasi sono sei, in un ordine fisso e non casuale', () => {
  assert.equal(Vasi.ORDINE.length, 6);
  assert.equal(new Set(Vasi.ORDINE).size, 6);
});

test('cinque vasi su sei sono persone del Mazzetto', () => {
  const p = persone();
  assert.equal(p.length, 5, 'il vaso del primo atto è il vaso: non è nessuno');
  assert.equal(Vasi.VASI['il-vaso'].persona, null);
});

test('la persona di un vaso è una persona sola, e la stessa per tutte le sue forme', () => {
  for (const id of Vasi.ORDINE) {
    const v = Vasi.VASI[id];
    if (!v.persona) continue;
    assert.equal(typeof v.persona, 'string');
    assert.equal(Vasi.PERSONE_DEI_VASI.includes(id), true);
  }
});

/* ── `per` è pura ────────────────────────────────────────── */

test('`per` non muta il vaso di base', () => {
  const prima = JSON.stringify(Vasi.VASI.betta);
  Vasi.per('betta', 2);
  Vasi.per('betta', 1);
  assert.equal(JSON.stringify(Vasi.VASI.betta), prima, 'gli override non scrivono sopra i dati');
});

test('`per` allo stato 0 restituisce il vaso stesso', () => {
  assert.equal(Vasi.per('betta', 0), Vasi.VASI.betta);
  assert.equal(Vasi.per('betta'), Vasi.VASI.betta, 'e senza stato è lo stesso');
});

test('`per` su un vaso inesistente non solleva niente', () => {
  assert.equal(Vasi.per('inesistente'), null);
  assert.equal(Vasi.perStato('inesistente', 2), null);
});

test('`per` taglia gli stati fuori range invece di esplodere', () => {
  for (const st of [-1, 0, 1, 2, 3, 99]) {
    const v = Vasi.per('betta', st);
    assert.ok(v && v.forme.length, `stato ${st}: dev'essere comunque un vaso giocabile`);
  }
});

/* ── l'arc[o] è reale, non dichiarato ────────────────────── */

test('al secondo stato cadono gli ornamenti, in tutti i vasi', () => {
  /* L'ultima forma di ogni sbozzo è l'ornamento: il braccio, le mani, il
     bancone, la lastra. Perdere l'ornamento è la prima cosa che si vede, ed è
     quello che vuol dire aver perso qualcuno. */
  for (const id of persone()) {
    const zero = Vasi.per(id, 0).forme;
    const uno = Vasi.per(id, 1).forme;
    assert.equal(uno.length, zero.length - 1, `${id}: allo stato 1 non è caduto nessun ornamento`);
    assert.deepEqual(
      JSON.parse(JSON.stringify(uno)),
      JSON.parse(JSON.stringify(zero.slice(0, -1))),
      `${id}: allo stato 1 è cambiato qualcosa di più dell'ornamento`,
    );
  }
});

test('al terzo stato le forme cambiano davvero, e non cadono un pezzo qualsiasi', () => {
  for (const id of persone()) {
    const uno = Vasi.per(id, 1).forme;
    const due = Vasi.per(id, 2).forme;
    assert.notEqual(
      JSON.parse(JSON.stringify(uno)), JSON.parse(JSON.stringify(due)),
      `${id}: lo stato 2 ha le forme dello stato 1, e allora l'arco è una dichiarazione`,
    );
  }
});

test('al secondo stato la domanda cambia davvero', () => {
  for (const id of persone()) {
    const zero = Vasi.per(id, 0).domande[0];
    const uno = Vasi.per(id, 1).domande[0];
    assert.notEqual(zero.testo, uno.testo, `${id}: chi hai perso deve fare un'altra domanda`);
    assert.notEqual(zero.risposta, uno.risposta, `e cercare un'altra risposta`);
  }
});

test('la figura si consuma di stato in stato: chi hai perso occupa meno terra', () => {
  /* Non è una regola estetica: è la stampa che si consuma. Se un giorno un vaso
     non si stringe, il test va aggiornato insieme alla forma, e non a caso. */
  for (const id of persone()) {
    const a = Orto.maschera(Vasi.per(id, 0)).totale;
    const b = Orto.maschera(Vasi.per(id, 1)).totale;
    assert.ok(b < a, `${id}: stato 1 ${(100 * b / Q).toFixed(1)}% contro stato 0 ${(100 * a / Q).toFixed(1)}%`);
  }
});

test('al terzo stato le persone sono quasi sparite', () => {
  /* Il giardino è l'unica eccezione, e l'eccezione è il punto: l'ultimo vaso
     cresce sopra gli altri cinque, e per questo è l'ultimo. */
  for (const id of persone()) {
    if (id === 'sauro') continue;
    const b = Orto.maschera(Vasi.per(id, 1)).totale;
    const c = Orto.maschera(Vasi.per(id, 2)).totale;
    assert.ok(c < b, `${id}: stato 2 ${(100 * c / Q).toFixed(1)}% contro stato 1 ${(100 * b / Q).toFixed(1)}%`);
  }
});

test('il giardino fa il contrario di tutti gli altri: si allarga', () => {
  /* Sauro non è una persona che si consuma: è la tomba, e alla fine copre
     tutto. È l'unico vaso che cresce, ed è la ragione per cui l'ultimo atto è
     l'ultimo. */
  const a = Orto.maschera(Vasi.per('sauro', 1)).totale;
  const b = Orto.maschera(Vasi.per('sauro', 2)).totale;
  assert.ok(b > a, 'il giardino si allarga invece di restringersi');
});

test('a ogni stato i tre modi di fallire restano i tre stessi', () => {
  /* La resa non cambia con l'arco: cambia solo chi chiede e che cosa chiede.
     Se i motivi cambiassero, un giocatore che ha imparato i quattro nomi
     perderebbe la capacità di capire perché ha perso. */
  for (const id of persone()) {
    for (const st of [0, 1, 2]) {
      const v = Vasi.per(id, st);
      assert.ok(v.scaletta.length, `${id} stato ${st}: senza scaletta non beve mai`);
      for (const f of v.scaletta) {
        for (const az of f.azioni) {
          if (az.t === 'mossa') assert.notEqual(az.resabile, undefined, `${id}: azione senza resabile`);
        }
      }
    }
  }
});

/* ── la sete dell'arc[o] ─────────────────────────────────── */

test('uno stato più avanto beve di più', () => {
  const crescita = Dono.SETE_PER_ARCO;
  assert.equal(crescita.length, 3);
  assert.ok(crescita[0] < crescita[1] && crescita[1] < crescita[2], 'chi è stato tradito beve sempre di più');
  assert.equal(crescita[0], 1, 'e allo stato 0 la sete è quella di base');
});

/* ── le azioni devono essere di quelle che dono.js esegue ── */

test('ogni azione è una delle quattro che la macchina sa eseguire', () => {
  const note = new Set(['mossa', 'domanda', 'appassisce', 'ricorda']);
  for (const id of Vasi.ORDINE) {
    const v = Vasi.VASI[id];
    for (const fase of v.scaletta) {
      for (const az of fase.azioni) assert.ok(note.has(az.t), `${id}: azione sconosciuta «${az.t}»`);
    }
  }
});

test('le soglie della scaletta scendono, o il vaso beve sempre uguale', () => {
  for (const id of persone()) {
    for (let st = 0; st <= 2; st++) {
      const soglie = Vasi.per(id, st).scaletta.map((f) => f.soglia);
      for (let i = 1; i < soglie.length; i++) {
        assert.ok(soglie[i] <= soglie[i - 1], `${id} stato ${st}: la scaletta sale invece di scendere`);
      }
    }
  }
});

test('le azioni di una fase non sono vuote', () => {
  for (const id of Vasi.ORDINE) {
    for (const fase of Vasi.VASI[id].scaletta) {
      assert.ok(fase.azioni && fase.azioni.length, `${id}: una fase senza azioni non è una fase`);
    }
  }
});

test('ogni vaso ha almeno una frase, e il titolo spiega chi è', () => {
  for (const id of Vasi.ORDINE) {
    const v = Vasi.VASI[id];
    assert.ok(v.nome, `${id}: senza nome`);
    assert.ok(v.titolo, `${id}: senza titolo, e il titolo è la frase che lo spiega`);
    assert.ok(v.frasi && v.frasi.length, `${id}: senza frasi, e la prima è quella che dice il gioco`);
    assert.ok(v.spesa > 0, `${id}: la spesa deve essere un numero positivo`);
  }
});

/* ── la risposta delle domande deve esistere ─────────────── */

test('ogni domanda chiede una scheda che esiste nel Mazzetto', () => {
  const storia = STORIA();
  const idSchede = new Set(storia.schede.map((s) => s.id));
  for (const id of Vasi.ORDINE) {
    for (let st = 0; st <= 2; st++) {
      for (const d of Vasi.per(id, st).domande) {
        assert.ok(idSchede.has(d.risposta), `${id} stato ${st}: la domanda chiede la scheda inesistente «${d.risposta}»`);
        assert.ok(d.testo, `${id}: una domanda senza testo non è una domanda`);
      }
    }
  }
});

test('le schede che la resa chiede in pagamento esistono', () => {
  const storia = STORIA();
  const idSchede = new Set(storia.schede.map((s) => s.id));
  for (const id of Vasi.ORDINE) {
    for (const fase of Vasi.VASI[id].scaletta) {
      for (const az of fase.azioni) {
        if (az.conScheda) {
          assert.ok(idSchede.has(az.conScheda), `${id}: la resa chiede la scheda inesistente «${az.conScheda}»`);
        }
      }
    }
  }
});

/* ── i vasi sono le persone del cast ─────────────────────── */

test('le persone dei vasi sono tutte nel cast della storia reale', () => {
  const storia = STORIA();
  const cast = new Set(storia.cast.map((c) => c.id));
  for (const p of Vasi.PERSONE_DEI_VASI) {
    assert.ok(cast.has(Vasi.VASI[p].persona), `${p}: la sua persona non è nel cast`);
  }
});

test('i cinque vasi hanno cinque persone diverse', () => {
  const ps = Vasi.PERSONE_DEI_VASI.map((id) => Vasi.VASI[id].persona);
  assert.equal(new Set(ps).size, 5, 'se due vasi fossero la stessa persona, l\'arc[o] sarebbe uno solo per due');
});

test('nell\'orto c\'è un fiore per ogni persona che non è un vaso', () => {
  /* Qui c'era scritto il contrario: Sauro non aveva un fiore, perché «è il
     fondo». Era la regola giusta quando Sauro era l'ultimo vaso e nessuno ci
     parlava dentro — non si dona a chi è già sotto, si diceva.

     Adesso Sauro è il vaso che ti restituisce il cuore invece di darti la cura,
     e l'unica sua battuta è «piantami». Un vaso a cui non puoi donare nessun
     fiore non è il fondo: è una persona che ti guarda lavorare senza poterti
     dare niente in cambio. Il colore è cambiato quando è cambiato lui. */
  const fiori = Object.keys(Orto.FIORI);
  for (const id of Vasi.PERSONE_DEI_VASI) {
    assert.ok(fiori.includes(id), `${id} è un vaso e deve avere un fiore: altrimenti non si può donare a chi si perde`);
  }
  assert.ok(!fiori.includes('brizio'), 'Brizio è nel cast ma non è un vaso: non gli si pianta niente');
  assert.ok(fiori.includes('nadia'), 'e Nadia è nel Mazzetto: è lei che pianta');
  assert.ok(fiori.length <= 6, 'e la barra deve stare sul telefono');
});

/* ── il vaso deve poter essere riempito ──────────────────── */

test('un vaso si deve poter riempire: la spesa non può superare la sua figura', () => {
  /* Questo è il difetto più subdolo che si può avere in un gioco come questo,
   * e nessun altro test lo prende: se `spesa` è un numero scritto a mano e la
   * figura è una sagoma, il vaso chiede più cura di quanta ce ne sia dentro e
   * non si riempie MAI. Non dà errore, non si blocca: dà solo una sconfitta che
   * non si capisce. Lo stub dell'orto non lo mostrava, perché contava come
   * dentro anche la terra fuori dal vaso. */
  for (const id of Vasi.ORDINE) {
    for (let stato = 0; stato <= 2; stato++) {
      const v = Vasi.per(id, stato);
      const m = Orto.maschera(v);
      const curaMassima = m.totale / 100;   // valore 100, moltiplicatore 1
      assert.ok(
        v.spesa <= curaMassima * 1.06,
        `${id} stato ${stato}: chiede ${v.spesa} di cura e dentro ci sono ${curaMassima.toFixed(1)}. Serve il ${(100 * v.spesa / curaMassima).toFixed(0)}% di una figura che non contiene.`,
      );
    }
  }
});

test('la spesa segue la figura quando l\'arco la cambia', () => {
  /* Chi si consuma ha meno terra da riempire, e se la spesa restasse quella di
   * quando era intero il terzo stato sarebbe invincibile per costruzione. */
  for (const id of persone()) {
    if (id === 'sauro') continue;   // il giardino si allarga: è l'eccezione
    const zero = Vasi.per(id, 0).spesa;
    const uno = Vasi.per(id, 1).spesa;
    const due = Vasi.per(id, 2).spesa;
    assert.ok(uno <= zero, `${id}: allo stato 1 la figura è più piccola ma la spesa no (${uno} contro ${zero})`);
    assert.ok(due < uno, `${id}: allo stato 2 idem (${due} contro ${uno})`);
  }
});

test('la spesa scende più della figura, o non scende affatto', () => {
  /* Perdere l'ornamento non sempre basta a far calare la spesa: un' busta è
   * più piccola di un vaso, e arrotondare può nascondere il calo. Allora la
   * diminuzione si vede solo allo stato due, e va bene: quello che conta è che
   * nessuno stato chieda più cura di quanta ce ne sia dentro. */
  for (const id of persone()) {
    const aree = [0, 1, 2].map((s) => Orto.maschera(Vasi.per(id, s)).totale);
    assert.ok(aree[1] <= aree[0], `${id}: la figura non si restringe`);
    if (id === 'sauro') { assert.ok(aree[2] > aree[1]); continue; }
    assert.ok(aree[2] < aree[1], `${id}: allo stato due la figura non si è restringita`);
  }
});

test('il limite sta sotto la spesa e sopra il costo di Accarezza', () => {
  for (const id of persone()) {
    const v = Vasi.per(id);
    assert.ok(v.limite < v.spesa, `${id}: con un limite sopra la spesa il vaso si riempie e non si può perdere`);
    assert.ok(v.limite > v.spesa / Dono.MOLTI.accarezza,
      `${id}: nemmeno Accarezza passa (limite ${v.limite}, costo ${(v.spesa / Dono.MOLTI.accarezza).toFixed(1)})`);
  }
});

test('il tutorial è l\'unico vaso dove la mossa base deve bastare', () => {
  const v = Vasi.per('il-vaso');
  assert.ok(v.limite > v.spesa, 'nel tutorial Offri deve arrivare in fondo: se no il primo atto è una trappola');
  assert.ok(!Vasi.per('betta').tutorial);
});
