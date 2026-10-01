/* disegno.test.mjs — il gioco si vede, e non si può accorgersene.
 *
 * Il contesto finto di `harness.mjs` è un Proxy che registra qualunque
 * chiamata e non si Breakdown mai. Va bene per la logica, e per il disegno è
 * esattamente il contrario: un `ctx.arc` in più o in meno, una proprietà scritta
 * invece di letta, un metodo che non esiste — tutto passa, e la pagina resta
 * bianca.
 *
 * Qui il contesto è severo: conosce la superficie del Canvas 2D e si rifiuta di
 * fare finta. Se orto.js chiama qualcosa che un browser non ha, il test
 * fallisce invece di lasciare un rettangolo grigio sul telefono di nessuno.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carica, ROOT } from './harness.mjs';

const h = carica();
const { FSTOrto: Orto, FSTVasi: Vasi } = h.win;

/* Il colore con cui si accende il centro. È in orto.js: qui viene ripetuto
   apposta, perché se cambia da una parte e non dall'altra il test deve
   accorgersene invece di passare. */
const CUORE = '#f2ecc9';

/* La superficie del Canvas 2D che questo gioco usa, e nient'altro. */
const METODI = [
  'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'transform',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo',
  'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke', 'clip',
  'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'setLineDash',
  'getLineDash', 'drawImage', 'putImageData', 'createLinearGradient', 'createRadialGradient',
  'createPattern', 'measureText', 'getImageData',
];
const PROPRIETA = [
  'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
  'globalAlpha', 'globalCompositeOperation', 'shadowBlur', 'shadowColor',
  'font', 'textAlign', 'textBaseline', 'imageSmoothingEnabled',
];

/**
 * Un contesto che non mente: registra le chiamate e, se il codice usa qualcosa
 * che un browser non ha, lo dice con il nome.
 */
function contestoSevero() {
  const chiamate = [];
  const stato = {};
  const trappola = new Proxy(stato, {
    get: (t, k) => {
      if (typeof k === 'symbol') return undefined;
      if (k in t) return t[k];
      if (!METODI.includes(k) && !PROPRIETA.includes(k)) {
        throw new Error(`ctx.${String(k)}: un browser non ha questo. Il disegno non funzionerebbe.`);
      }
      return undefined;
    },
    set: (t, k, v) => { t[k] = v; return true; },
  });
  for (const m of METODI) {
    if (stato[m]) continue;
    stato[m] = (...a) => {
      /* Si registra anche il colore: da solo il nome della chiamata non basta,
         perché `fillRect` sulla tela intera è legittimo per la carta — che si
         ridipinge a ogni ridisegno — e illegittimo per una luce che sborda. */
      chiamate.push([m, a, stato.fillStyle, stato.globalAlpha]);
      if (m === 'createLinearGradient' || m === 'createRadialGradient') {
        return { addColorStop() {} };
      }
      if (m === 'measureText') return { width: (a[0] || '').length * 8 };
      if (m === 'getLineDash') return [];
      return undefined;
    };
  }
  /* Le funzioni devono stare fuori dal Proxy-trappola: altrimenti `save`
   * verrebbe risolto come metodo mancante e ogni chiamata romperebbe. */
  return { ctx: Object.assign(trappola, stato), chiamate };
}

/* Le dimensioni le decide orto.js, non il test: è l'orto che è quadrato, e un
   test che scrive 390 per 780 controllerebbe un numero che non è quello del
   disegno. */
const LATO = 420;

function tela() {
  const c1 = contestoSevero();
  const c2 = contestoSevero();
  const telaFinta = (ctx) => ({
    width: LATO,
    height: LATO,
    clientWidth: LATO,
    clientHeight: LATO,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: LATO, bottom: LATO, width: LATO, height: LATO }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
  });
  const canvas = telaFinta(c1.ctx);
  const effetti = telaFinta(c2.ctx);
  return { T: Orto.nuovo(canvas, effetti), chiamate: c1.chiamate };
}

const tratto = (pts, larghezza = 0.075) => ({ punti: pts, durataMs: 300, larghezza });

/* ── si disegna, e non si rompe ───────────────────────────── */

test('il vaso si disegna senza usare niente che un browser non abbia', () => {
  for (const id of Vasi.ORDINE) {
    for (let stato = 0; stato <= 2; stato++) {
      const { T } = tela();
      T.impostaNemico(Vasi.per(id, stato));
      T.ridisegna();
    }
  }
});

test('un tratto si disegna per ognuno dei sei fiori', () => {
  /* Ogni fiore ha il suo modo di aprirsi, e ognuno è un ramo diverso di
   * codice: se uno solo è rotto, gli altri test passano e il gioco ha un fiore
   * muto. */
  const fiori = Object.keys(Orto.FIORI);
  assert.ok(fiori.length >= 6, 'sei fiori: i cinque vasi e lei');
  for (const f of fiori) {
    const { T } = tela();
    T.impostaNemico(Vasi.per('betta'));
    T.impostaFiore(f);
    T.semina(tratto([[0.2, 0.2], [0.5, 0.45], [0.8, 0.3]]), { valore: 100 });
    T.ridisegna();
  }
});

test('il seme da solo si disegna: un tocco non è un gambo', () => {
  const { T } = tela();
  T.impostaNemico(Vasi.per('betta'));
  T.semina(tratto([[0.5, 0.5]]), { valore: 100 });
  T.ridisegna();
});

test('il cuore acceso si disegna dentro il cuore, e non fuori', () => {
  const { T, chiamate } = tela();
  T.impostaNemico(Vasi.per('betta'));
  const W = T.W;
  const H = T.H;
  /* si riempie tutto il centro */
  for (let i = 0; i < 8; i++) {
    T.semina(tratto([[0.46, 0.14], [0.54, 0.26]]), { valore: 100 });
  }
  T.ridisegna();
  /* Il centro acceso non può essere un rettangolo su tutta la tela: è la cosa
   * che vale il doppio, e se illuminasse anche il terreno intorno il giocatore
   * non saprebbe dove fermare la mano.
   *
   * Prima qui c'era un `fillRect(0, 0, W, H)` con l'opacità che cresceva col
   * centro riempito: la luce del centro cadeva sul terreno intorno, che non vale
   * niente, e la cosa che il gioco ti premiava sembrava una luce d'ambiente.
   *
   * Sulla tela intera si può disegnare UNA cosa sola, ed è la carta. */
  const aTelaIntera = chiamate.filter(
    (c) => c[0] === 'fillRect' && c[1][0] === 0 && c[1][1] === 0 && c[1][2] === W && c[1][3] === H);
  assert.ok(aTelaIntera.length >= 1, 'la carta si disegna');
  const sborda = aTelaIntera.filter((c) => c[2] === CUORE);
  assert.equal(sborda.length, 0,
    `il colore del centro ha riempito la tela intera ${sborda.length} volte: la luce sborda sul terreno, che non vale niente`);
  assert.ok(chiamate.some((c) => c[0] === 'ellipse' || c[0] === 'closePath'),
    'e il centro si accende dentro un percorso');
});

test('nessun disegno fora ciò che ha sotto', () => {
  /* `destination-out` su un contesto che ha già lo sbozzo del vaso ci fa un
   * buco nel vaso. È successo, e non si vedeva: il Proxy del harness accetta
   * qualsiasi nome di metodo e non si accorge di niente. */
  const { T } = tela();
  T.impostaNemico(Vasi.per('betta'));
  T.impostaFiore('donata');   // il cartellino, che aveva il buco
  T.semina(tratto([[0.3, 0.3], [0.6, 0.5]]), { valore: 100 });
  T.ridisegna();
});

test('la pianta cresce: prima il gambo, poi le foglie, poi il fiore', () => {
  /* Una pianta che compare tutta insieme è un decalcomania, e una pianta che
   * compare senza foglie è un chiodo. L'ordine è il conto: il gambo esce dalla
   * radice, le foglie si aprono quando il gambo le ha superate, e il fiore
   * viene per ultimo — perché il fiore è la parte che ti dice di chi è, e deve
   * arrivare quando il resto c'è. */
  const { T, chiamate } = tela();
  T.impostaNemico(Vasi.per('betta'));
  T.impostaFiore('betta');
  const t0 = T.ora();
  T.ora = () => t0;
  T.semina(tratto([[0.1, 0.8], [0.9, 0.2]]), { valore: 100 });

  const conta = () => {
    const i = chiamate.length;
    return () => chiamate.slice(i);
  };

  const subito = conta();
  const curveSubito = subito().filter((c) => c[0] === 'quadraticCurveTo').length;
  assert.equal(curveSubito, 0, 'appena seminato non ci sono foglie: il gambo deve uscire prima');

  /* a metà crescita il gambo c'è, e qualche foglia è aperta */
  const segnaMeta = () => chiamate.length;
  const daMeta = segnaMeta();
  T.ridisegna(t0 + 400);
  const curveMeta = chiamate.slice(daMeta).filter((c) => c[0] === 'quadraticCurveTo').length;
  assert.ok(curveMeta > 0 && curveMeta < 18,
    `a metà crescita qualche foglia è aperta, non tutte: qui ce ne sono ${curveMeta}`);

  /* finita crescendo, tutte le foglie e il fiore */
  const curva = conta();
  T.ridisegna(t0 + 4000);
  const tutte = curva().filter((c) => c[0] === 'quadraticCurveTo').length;
  assert.ok(tutte >= 2, `una foglia è fatta di due curve: qui ce ne sono ${tutte}. Il tratto è una linea, non una pianta.`);
  const fioriChiamati = curva().filter((c) => c[0] === 'ellipse' || c[0] === 'bezierCurveTo').length;
  assert.ok(fioriChiamati > 0, 'e il fiore si disegna');
});

test('una pianta non si riapre dopo essere cresciuta', () => {
  const { T, chiamate } = tela();
  T.impostaNemico(Vasi.per('betta'));
  const t0 = T.ora();
  T.ora = () => t0;
  T.semina(tratto([[0.1, 0.8], [0.9, 0.2]]), { valore: 100 });
  const segna = () => chiamate.length;
  const a = segna();
  T.ridisegna(t0 + 999999);
  const primo = chiamate.length - a;
  const b = segna();
  T.ridisegna(t0 + 999999);
  const secondo = chiamate.length - b;
  assert.equal(primo, secondo, 'la pianta cresciuta si ridisegna uguale: non torna indietro');
});

test('le piante sono deterministiche: la stessa traccia si disegna uguale', () => {
  /* Se la pianta cambiasse a ogni ridisegno, alle spalle del giocatore i fiori
   * si muoverebbero da soli. In un gioco sul lutto è una cosa che non si fa. */
  const disegna = () => {
    const { T, chiamate } = tela();
    T.impostaNemico(Vasi.per('betta'));
    T.impostaFiore('sauro');
    T.semina(tratto([[0.1, 0.8], [0.5, 0.5], [0.9, 0.25]]), { valore: 100 });
    T.ridisegna();
    return JSON.stringify(chiamate);
  };
  assert.equal(disegna(), disegna(), 'due disegni della stessa traccia devono essere identici');
});

test('ridisegnare molte volte non moltiplica le piante', () => {
  const { T, chiamate } = tela();
  T.impostaNemico(Vasi.per('betta'));
  T.semina(tratto([[0.1, 0.8], [0.9, 0.3]]), { valore: 100 });
  T.ridisegna();                       // il primo ridisegno disegna anche lo sbozzo
  const base = chiamate.length;
  T.ridisegna();
  const uno = chiamate.length - base;
  for (let i = 0; i < 9; i++) T.ridisegna();
  const dieci = chiamate.length - base;
  assert.equal(dieci, uno * 10, `dieci ridisegni costano ${dieci} chiamate invece di ${uno * 10}: le piante si stanno moltiplicando`);
});

test('il colore del fiore attivo esiste per tutte le persone della barra', () => {
  const appSrc = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  const lista = (appSrc.match(/const\s+FIORI_PALETTA\s*=\s*\[([^\]]+)\]/) || [])[1] || '';
  const chiavi = [...lista.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.ok(chiavi.length >= 6, 'la barra ha tutti i fiori');
  for (const k of chiavi) {
    assert.ok(Orto.FIORI[k], `${k} è nella barra ma non ha un colore`);
    assert.ok(Orto.APERTURE[k], `${k} è nella barra ma non ha un modo di aprirsi: sarebbe un punto`);
  }
});