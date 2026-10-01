/* orto.js — il motore di semina.
 *
 * Il nemico è un *vaso*: uno sbozzo geometrico (cerchi, poligoni) in coordinate
 * normalizzate 0..1. Il giocatore lo riempie col dito.
 *
 * Due cose importanti e deliberatamente separate:
 *
 *  1. La GEOMETRIA è pura e headless. `maschera()` e `copre()` non toccano il
 *     DOM: lavorano su una Uint8Array. Si testano senza browser e sono
 *     deterministiche — stessa copertura, stesso risultato, sempre.
 *
 *  2. Il DISEGNO è incrementale. Lo sbozzo si ridipinge solo quando cambia
 *     qualcosa (vaso, luminosità, resize); i tratti del giocatore si
 *     disegnano una volta sola quando terminano. Ridisegnare tutto ogni frame
 *     su un iPhone è la via più rapida per far scaldare la batteria.
 *
 * Il canvas ha due strati: `orto` (terra, sbozzo, ciò che è germinato — persistente)
 * ed `effetti` (sete, il fiore da lasciar andare, il fiore sfiorito — ridisegnato
 * ogni frame).
 *
 * L'inversione rispetto al gioco da cui deriva sta qui, e sta in una riga:
 * `pittura()` non restituisce `danno`, restituisce `cura`. Coprire non toglie
 * vita a nessuno: coprire *dà*. Il nemico ne guarisce, e tu ne paghi il conto.
 */
(function () {
'use strict';

/* ── geometria pura ──────────────────────────────────────── */

const RES = 120;                     // risoluzione della maschera, in pixel per lato
/* Il passo fra due campionature è di 1.4 *pixel di maschera*. I tratti hanno
 * coordinate normalizzate 0..1, quindi il passo va diviso per la risoluzione:
 * con il passo intero, una riga lunga mezzo schermo verrebbe campionata una
 * volta sola — e coprirebbe una macchia invece di una striscia. */
const PASSO = 1.4 / RES;

function dentroEll(px, py, e) {
  let dx = px - e.x;
  let dy = py - e.y;
  if (e.rot) {
    const c = Math.cos(-e.rot);
    const s = Math.sin(-e.rot);
    const nx = dx * c - dy * s;
    dy = dx * s + dy * c;
    dx = nx;
  }
  const rx = e.rx || 0.05;
  const ry = e.ry || 0.05;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

function dentroPol(px, py, pts) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function puntoInForma(px, py, f) {
  if (f.t === 'ell') return dentroEll(px, py, f);
  if (f.t === 'pol') return dentroPol(px, py, f.pts);
  return false;
}

/**
 * Costruisce le due maschere binarie dello sbozzo: il vaso intero e la parte che
 * è il *cuore* (lì la cura vale il doppio — o, se il vaso ti ha piantato, il
 * doppio te lo restituisce: vedi `inverteCuore`).
 * @returns {{totale:number, cuore:number, maschera:Uint8Array, petto:Uint8Array}}
 */
function maschera(nemico) {
  const forme = (nemico && nemico.forme) || [];
  const m = new Uint8Array(RES * RES);
  const f = new Uint8Array(RES * RES);
  let totale = 0;
  let cuore = 0;
  for (let j = 0; j < RES; j++) {
    const ny = (j + 0.5) / RES;
    for (let i = 0; i < RES; i++) {
      const nx = (i + 0.5) / RES;
      let dentro = false;
      let eCuore = false;
      for (const forma of forme) {
        if (!puntoInForma(nx, ny, forma)) continue;
        dentro = true;
        if (forma.cuore) eCuore = true;
      }
      if (!dentro) continue;
      const k = j * RES + i;
      m[k] = 1;
      totale++;
      if (eCuore) { f[k] = 1; cuore++; }
    }
  }
  /* Un vaso senza "cuore" dichiarato: il cuore è il terzo superiore dello
   * sbozzo, così il bonus esiste comunque e il giocatore lo trova da solo. */
  if (cuore === 0) {
    for (let j = 0; j < Math.floor(RES / 3); j++) {
      for (let i = 0; i < RES; i++) {
        const k = j * RES + i;
        if (m[k]) { f[k] = 1; cuore++; }
      }
    }
  }
  return { totale, cuore, maschera: m, petto: f };
}

/* Dischi precalcolati per i raggi da 1 a 12 pixel di maschera: stampare un
 * pennello significa sommare questi offset. Senza cache, un tratto lungo
 * costerebbe migliaia di radici quadrate per frame. */
const DISCHI = (() => {
  const d = [null];
  for (let r = 1; r <= 12; r++) {
    const cells = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) cells.push([dx, dy]);
      }
    }
    d.push(cells);
  }
  return d;
})();

/* Ricampiona una polilinea a passo costante: il dito non è un punto ma
 * un disco, e il suo spessore viene da una tabella di offset precalcolata. */
function distacco(punti) {
  if (!punti || !punti.length) return [];
  const out = [[punti[0][0], punti[0][1]]];
  let residuo = PASSO;
  for (let i = 1; i < punti.length; i++) {
    const a = punti[i - 1];
    const b = punti[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) continue;
    let percorsa = 0;
    while (residuo <= d - percorsa) {
      percorsa += residuo;
      const t = percorsa / d;
      out.push([a[0] + dx * t, a[1] + dy * t]);
      residuo = PASSO;
    }
    residuo -= d - percorsa;
  }
  const ult = punti[punti.length - 1];
  const fin = out[out.length - 1];
  if (Math.hypot(ult[0] - fin[0], ult[1] - fin[1]) > PASSO * 0.6) out.push([ult[0], ult[1]]);
  return out;
}

/**
 * Quanto della maschera copre questo tratto, in 0..1. `gia` è il registro dei
 * pixel già riempiti: si aggiornano sul posto e restituisce i *nuovi* pixel,
 * così la somma delle chiamate dà la copertura totale senza doppio conteggio.
 *
 * `maxNuovi` è il mazzetto: quando i fiori finiscono, il tratto **si ferma**.
 * Non è un numero che cala sulla barra, è il gambo che smette di crescere a
 * metà figura — e quello è l'unico modo per far capire che sono finiti senza
 * scrivere niente.
 *
 * @returns {{nuovi:number, cuoreNuovi:number, esaurito:boolean}}
 */
function copre(scheda, punti, larghezzaNorm, gia, maxNuovi = Infinity) {
  if (!punti || punti.length < 1 || !scheda.totale) return { nuovi: 0, cuoreNuovi: 0, esaurito: false };
  const campioni = distacco(punti);
  const r = Math.max(1, Math.min(12, Math.round((larghezzaNorm * RES) / 2)));
  const celle = DISCHI[r];
  let nuovi = 0;
  let cuoreNuovi = 0;
  let esaurito = false;
  for (const [px, py] of campioni) {
    if (nuovi >= maxNuovi) { esaurito = true; break; }
    const i0 = Math.round(px * RES);
    const j0 = Math.round(py * RES);
    for (const [dx, dy] of celle) {
      if (nuovi >= maxNuovi) { esaurito = true; break; }
      const i = i0 + dx;
      const j = j0 + dy;
      if (i < 0 || j < 0 || i >= RES || j >= RES) continue;
      const k = j * RES + i;
      if (!scheda.maschera[k]) continue;
      if (gia[k]) continue;
      gia[k] = 1;
      nuovi++;
      if (scheda.petto[k]) cuoreNuovi++;
    }
  }
  return { nuovi, cuoreNuovi, esaurito };
}

/** Drittezza di un tratto: quanto si discosta dalla corda che unisce gli estremi. */
function drittezza(punti) {
  if (!punti || punti.length < 2) return 1;
  const a = punti[0];
  const b = punti[punti.length - 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 1;
  let max = 0;
  for (let i = 1; i < punti.length - 1; i++) {
    const d = Math.abs((punti[i][0] - a[0]) * dy - (punti[i][1] - a[1]) * dx) / len;
    if (d > max) max = d;
  }
  return max / len;                // normalizzata sulla lunghezza della corda
}

function lunghezza(punti) {
  let l = 0;
  for (let i = 1; i < punti.length; i++) l += Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1]);
  return l;
}

/** Quante pennellate ci sono state, e con che violenza. Serve al suono e all'eroismo. */
function caratteristiche(tratto) {
  const punti = tratto.punti || [];
  const lung = lunghezza(punti);
  const dur = Math.max(1, tratto.durataMs || 1);
  const velocita = lung / (dur / 1000);          // frazione di orto al secondo
  return {
    lunghezza: lung,
    drittezza: drittezza(punti),
    velocita,
    /* La forza è quanto "spinta" c'è stata: una linea lunga e lenta è
     * deliberata, una linea breve e veloce è un colpo. */
    forza: Math.max(0, Math.min(1, velocita / 2.6)),
  };
}

/* ── il telaio ───────────────────────────────────────────── */

/* La larghezza del dito non è una scelta di utente come il pennello: qui si
 * chiama "morsa", e i tre valori sono tre modi di prendere. */
const PRESE = { sottile: 0.045, medio: 0.075, largo: 0.115 };

/* Il colore con cui si accende il centro quando è riempito. Esposto perché la
 * luce del cuore è l'unico posto caldo della tela, e se un giorno il colore
 * cambia qui e non lì, il disegno e la verifica dicono cose diverse. */
const COLORE_CUORE = '#f2ecc9';
const LUMI = { chiaro: 0.95, media: 0.78, scura: 0.6 };
/* Le quattro mani che danno. Ognuna è un fiore diverso, e ognuno è una delle
 * persone di cui porti le schede: il colore del dono dice di chi è. */
const FIORI = {
  nadia:  { base: '#e6e0c8', ombra: '#8a8464' },   // un gambo bianco
  betta:  { base: '#b8433a', ombra: '#5c1a16' },   // una rosa
  ansi:   { base: '#c9a76a', ombra: '#6b4f1e' },   // un fiordaliso
  orielia:{ base: '#5f6b4a', ombra: '#242c1b' },   // una foglia
  donata: { base: '#8d6a4f', ombra: '#3a2718' },   // un cartellino di prezzo
  sauro:  { base: '#7f6a86', ombra: '#2c2333' },   // il primo fiore, che non è suo
};

/* Ogni fiore ha il suo modo di aprirsi. Non è decorazione: il gioco dice «di
 * chi è il fiore che stai dando» e se tutti si aprono uguali quella frase non
 * dice niente. Serve che si distinguano a occhio, dal primo metro, senza
 * leggere l'etichetta. */
const APERTURE = {
  nadia:   'a',   // chiuso, a goccia: è il tuo, e non si apre
  betta:   'rosa',
  ansi:    'raggio',
  orielia: 'foglia',
  donata:  'tag',
  sauro:   'cinque',
};

function nuovo(canvas, effetti) {
  const T = {
    canvas, effetti,
    ctx: canvas && canvas.getContext ? canvas.getContext('2d') : null,
    ectx: effetti && effetti.getContext ? effetti.getContext('2d') : null,
    nemico: null,
    scheda: null,
    gia: null,
    riempiti: 0,
    riempitiCuore: 0,
    tratti: [],
    /* Il tempo dell'orto. Serve alle piante per crescere: senza, ogni pianta
     * nasce intera e l'orto sembra una stampa. */
    ora: typeof performance !== 'undefined' && performance.now
      ? () => performance.now()
      : () => Date.now(),
    mossa: 'medio',
    fiore: 'nadia',
    lume: 'media',
    sete: 0,
    resa: null,
    sfioriti: [],
    lampo: 0,
    W: 0, H: 0, dpr: 1,
    attivo: false,
    _raf: 0,
    _tratto: null,
    _ultimoT: 0,
    _on: {},
  };

  /* ── superficie ────────────────────────────────────────── */
  /* Senza canvas l'orto esiste solo per la geometria: e va benissimo, perché
     `maschera` e `copre` sono la parte che va testata e non hanno bisogno di
     nessuno schermo. Il disegno, senza schermo, non lo fa e non finge di farlo. */
  const ridimensiona = () => {
    if (!T.canvas) return;
    const r = T.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (w === T.canvas.width && h === T.canvas.height) return;
    T.canvas.width = w;
    T.canvas.height = h;
    T.dpr = dpr;
    T.W = w;
    T.H = h;
    ridisegna();
  };
  T.ridimensiona = ridimensiona;

  /* ── lo sbozzo ─────────────────────────────────────────── */
  /* Serigrafia: un solo inchiostro per strato, e l'errore di registro
   * visibile. Non è una fotografia, è una stampa tirata due volte. */
  function disegnaSbozzo(ctx) {
    const { W, H } = T;
    const scuro = T.lume === 'scura';
    const chiaro = T.lume === 'chiaro';
    const terra = scuro ? '#191a12' : chiaro ? '#e7e0c6' : '#d8d0b2';
    const inchiostro = scuro ? '#cbd2a8' : chiaro ? '#262a1c' : '#33371f';
    ctx.save();
    ctx.fillStyle = terra;
    ctx.fillRect(0, 0, W, H);

    /* il fondo non è pulito: una stampa tira sempre un po' male in basso */
    ctx.globalAlpha = scuro ? 0.1 : 0.08;
    ctx.fillStyle = inchiostro;
    for (let i = 0; i < 80; i++) {
      const x = ((i * 7919) % 997) / 997 * W;
      const y = ((i * 6271) % 883) / 883 * H;
      const r = 2 + ((i * 131) % 9);
      ctx.fillRect(x, y, r, r * 0.55);
    }
    ctx.globalAlpha = 1;

    const forme = (T.nemico && T.nemico.forme) || [];
    const inchi = scuro ? 'rgba(203,210,168,' : chiaro ? 'rgba(38,42,28,' : 'rgba(51,55,31,';

    for (const f of forme) {
      const tracciato = new Path2D();
      if (f.t === 'ell') {
        tracciato.ellipse(f.x * W, f.y * H, f.rx * W, f.ry * H, f.rot || 0, 0, Math.PI * 2);
      } else if (f.t === 'pol') {
        f.pts.forEach((p, i) => (i ? tracciato.lineTo(p[0] * W, p[1] * H) : tracciato.moveTo(p[0] * W, p[1] * H)));
        tracciato.closePath();
      }

      /* primo strato: il pieno, tutto piatto, come una serigrafia */
      ctx.fillStyle = inchi + (f.cuore ? '0.34)' : '0.24)');
      ctx.fill(tracciato);

      /* secondo strato: il retino. Le piante si stampano a mezzatinta. */
      ctx.save();
      ctx.clip(tracciato);
      ctx.fillStyle = inchi + '0.30)';
      const passo = Math.max(5, 8 * T.dpr);
      const r = Math.max(1, passo * 0.22);
      for (let y = 0; y < H + passo; y += passo) {
        for (let x = ((y / passo) % 2) * passo * 0.5; x < W + passo; x += passo) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      /* terzo passaggio: il contorno, due volte, leggermente fuori registro */
      ctx.strokeStyle = inchi + '0.62)';
      ctx.lineWidth = Math.max(1.2, 2.2 * T.dpr);
      ctx.stroke(tracciato);
      ctx.strokeStyle = inchi + '0.20)';
      ctx.lineWidth = Math.max(1, 1.3 * T.dpr);
      ctx.save();
      ctx.translate(1.8 * T.dpr, -1.4 * T.dpr);
      ctx.stroke(tracciato);
      ctx.restore();
    }

    /* Il cuore è segnato: due trattini all'altezza del nocciolo. Il giocatore
     * deve indovinare che lì sotto la cura vale il doppio. */
    const cuore = forme.find((f) => f.cuore);
    if (cuore && cuore.t === 'ell') {
      const cx = cuore.x * W;
      const cy = cuore.y * H;
      const rx = cuore.rx * W;
      const ry = cuore.ry * H;

      /* L'alone: due tratti concentrici, fuori dal nocciolo, che spengono
       * dentro con una sfumatura. È la stessa forma della serigrafia — il
       * pieno, il retino, il contorno fuori registro — quindi non sembra un
       * elemento di un'interfaccia messo sopra un disegno.
       *
       * Prima qui c'erano due trattini all'altezza del nocciolo, e il nocciolo
       * era una macchiolina: due pixel percento della figura, in un quadrato
       * di serigrafia. Il gioco non diceva dove fosse il 2,2, e non lo
       * diceva in nessun altro modo: il 2,2 era un numero in una tabella. La
       * difficoltà di un centro è che sia PICCOLO, non che sia nascosto — a
       * quello si risponde con la luce, non con la pazienza. */
      for (const [k, a] of [[2.35, '0.10)'], [1.75, '0.16)'], [1.35, '0.24)']]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * k, ry * k, cuore.rot || 0, 0, Math.PI * 2);
        ctx.fillStyle = inchi + a;
        ctx.fill();
      }

      ctx.strokeStyle = inchi + '0.52)';
      ctx.lineWidth = Math.max(1.1, 1.9 * T.dpr);
      ctx.stroke();

      /* Il nocciolo, pieno, con lo stesso retino degli sbozzi. */
      const g = new Path2D();
      g.ellipse(cx, cy, rx, ry, cuore.rot || 0, 0, Math.PI * 2);
      ctx.fillStyle = inchi + '0.30)';
      ctx.fill(g);
      ctx.save();
      ctx.clip(g);
      ctx.fillStyle = inchi + '0.34)';
      const passoCuore = Math.max(4, 6 * T.dpr);
      const rCuore = Math.max(1, passoCuore * 0.24);
      for (let y = cy - ry; y < cy + ry + passoCuore; y += passoCuore) {
        for (let x = cx - rx + ((y / passoCuore) % 2) * passoCuore * 0.5; x < cx + rx + passoCuore; x += passoCuore) {
          ctx.beginPath();
          ctx.arc(x, y, rCuore, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.strokeStyle = inchi + '0.66)';
      ctx.lineWidth = Math.max(1.3, 2.2 * T.dpr);
      ctx.stroke(g);

      /* I due trattini: era l'unico segno che ci fosse, e adesso è il meno
       * importante dei tre. */
      ctx.strokeStyle = inchi + '0.6)';
      ctx.lineWidth = Math.max(1.4, 2.6 * T.dpr);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.44, cy - ry * 0.10);
      ctx.lineTo(cx - rx * 0.04, cy - ry * 0.14);
      ctx.moveTo(cx + rx * 0.06, cy - ry * 0.10);
      ctx.lineTo(cx + rx * 0.42, cy - ry * 0.18);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── ciò che è germinato ───────────────────────────────── */
  /* Un tratto non è un segno d'inchiostro: è un gambo. Viene disegnato una volta
   * sola, quando finisce, e da quel momento resta. */
  /* Un tratto non è un segno: è una pianta. Un gambo, qualche foglia lungo il
   * cammino, e un fiore in fondo — quello del colore che hai scelto, che è
   * il modo che ha il gioco di dirti di chi è la persona che stai dando.
   *
   * Prima qui c'erano due linee sovrapposte sulla stessa polilinea: una scura e
   * una chiara. Sembrava un gambo e non lo era, e in un gioco che parla di
   * piantare cose, piantare una linea non è piantare niente. */
  /* QUANTO CRESCE = 0 → 1. Una pianta che compare tutta insieme non è una
   * pianta: è un decalcomania. Il gambo cresce dalla radice, le foglie si
   * aprono quando il gambo le ha superate, e il fiore si apre per ultimo — ed è
   * l'ultima cosa che si vede, perché il fiore è la parte che ti dice di chi è. */
  function disegnaTratto(ctx, tr, cresciuta = 1) {
    const f = FIORI[T.fiore] || FIORI.nadia;
    const pts = tr.punti;
    const semi = f.ombra;
    const chiara = f.base;

    if (pts.length === 1) {
      /* Un tocco solo è un seme, non un gambo. Ma un seme seminato non è una
       * macchia: è un seme, e sotto si vede che è stato messo giù. */
      const x = pts[0][0] * T.W;
      const y = pts[0][1] * T.H;
      const r = Math.max(1.6, (tr.larghezza * T.W) / 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5);
      ctx.fillStyle = semi;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = semi;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(1, r * 0.34);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.5);
      ctx.lineTo(-r * 0.2, -r * 1.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const w = Math.max(2, tr.larghezza * T.W);

    /* Il gambo cresce dalla radice: si traccia solo la parte già spuntata, con
     * l'ultimo pezzo un po' più chiaro, come una cosa che sta spuntando adesso. */
    const punto = pts[Math.min(pts.length - 1, Math.max(1, Math.round((pts.length - 1) * cresciuta)))];
    const fatti = pts.slice(0, Math.min(pts.length, Math.max(2, Math.round((pts.length - 1) * cresciuta) + 1)));

    ctx.strokeStyle = semi;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = w;
    traccia(ctx, fatti);
    ctx.stroke();

    ctx.strokeStyle = chiara;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1.5, w * 0.4);
    traccia(ctx, fatti);
    ctx.stroke();

    /* Le foglie, lungo il cammino e alternate. Una pianta con una foglia sola è
     * un chiodo.
     *
     * La lunghezza va misurata in PIXEL come `aLungo`, non con `lunghezza`: quella
     * lavora in coordinate normalizzate e restituisce un numero vicino a 1, e un
     * passo di foglie di novanta pixel su un cammino di uno non ne produce
     * nessuna. Le foglie non sparivano per un errore di disegno: non erano
     * mai nate. */
    const cammino = lunghezzaPx(pts);
    const passo = Math.max(26, w * 3.4);
    const quante = Math.min(9, Math.floor(cammino / passo));
    ctx.globalAlpha = 0.72;
    for (let i = 1; i <= quante; i++) {
      const d = (cammino * i) / (quante + 1);
      /* la foglia spunta solo quando il gambo l'ha superata */
      if (d > cammino * cresciuta) break;
      const q = aLungo(pts, d);
      if (!q) continue;
      const lato = i % 2 ? 1 : -1;
      const grande = 0.55 + 0.45 * ((i * 7919) % 5) / 4;   // varia, ma sempre uguale
      /* e si apre negli ultimi centesimi del suo cammino, non di colpo */
      const aperta = Math.max(0, Math.min(1, (cresciuta * cammino - d) / (passo * 0.55)));
      foglia(ctx, q.x, q.y, q.ang + lato * (0.75 + 0.1 * lato),
        w * 2.1 * grande * aperta, w * 0.85 * grande * aperta, semi, chiara);
    }

    /* il fiore, in fondo. Ognuno si apre a modo suo: è l'unico modo che ha il
     * colore di dire a chi stai dando. */
    /* Il fiore è l'ultima cosa: compare quando il gambo è arrivato in fondo, e
     * si apre piano. Fino ad allora non c'è, e si vede che manca. */
    const finale = Math.max(0, Math.min(1, (cresciuta - 0.72) / 0.28));
    if (finale > 0) {
      const fine = punto;
      const prima = pts[Math.max(0, pts.length - 2)];
      const ang = Math.atan2((fine[1] - prima[1]) * T.H, (fine[0] - prima[0]) * T.W);
      const r = Math.max(5, w * 1.65) * (0.55 + 0.45 * finale);
      ctx.globalAlpha = finale;
      fiore(ctx, fine[0] * T.W, fine[1] * T.H, r, T.fiore, chiara, semi, ang);
    }
    ctx.restore();
  }

  function traccia(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * T.W, p[1] * T.H) : ctx.moveTo(p[0] * T.W, p[1] * T.H)));
  }

  /* La lunghezza della polilinea in pixel, camminando come `aLungo`: stesso
   * sistema di riferimento, così i due non si contraddicono. */
  function lunghezzaPx(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) {
      l += Math.hypot((pts[i][0] - pts[i - 1][0]) * T.W, (pts[i][1] - pts[i - 1][1]) * T.H);
    }
    return l;
  }

  /* Il punto a distanza `d` lungo la polilinea, con l'angolo di marcia. Serve
   * perché le foglie devono stare dove passa il gambo e non lungo una
   * interpolazione qualsiasi: una foglia staccata dal gambo sembra un errore. */
  function aLungo(pts, d) {
    let passato = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i][0] - pts[i - 1][0]) * T.W;
      const dy = (pts[i][1] - pts[i - 1][1]) * T.H;
      const seg = Math.hypot(dx, dy) || 0.0001;
      if (passato + seg >= d || i === pts.length - 1) {
        const t = Math.max(0, Math.min(1, (d - passato) / seg));
        return {
          x: (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t) * T.W,
          y: (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t) * T.H,
          ang: Math.atan2(dy, dx),
        };
      }
      passato += seg;
    }
    return null;
  }

  /* Una foglia: due piatti che si toccano, non un'ellipse. È la forma che si
   * riconosce a un metro, e un'ellipse è una macchia. */
  function foglia(ctx, x, y, ang, len, larg, semi, chiara) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.42, -larg, len, -larg * 0.12);
    ctx.quadraticCurveTo(len * 0.44, larg * 0.28, 0, 0);
    ctx.fillStyle = semi;
    ctx.globalAlpha *= 0.55;
    ctx.fill();
    ctx.strokeStyle = chiara;
    ctx.globalAlpha *= 0.9;
    ctx.lineWidth = Math.max(1, len * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  /* Il fiore. Sei modi di aprirsi, uno per persona: è la parte del disegno che
   * dice «di chi è», e deve dirlo senza che nessuno legga l'etichetta. */
  function fiore(ctx, x, y, r, id, chiara, semi, ang) {
    const modo = APERTURE[id] || 'cinque';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = chiara;
    ctx.strokeStyle = semi;
    ctx.lineWidth = Math.max(1, r * 0.14);

    if (modo === 'a') {
      /* il tuo: chiuso, a goccia. non è ancora un fiore */
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.62, r * 0.7, 0, r * 0.9);
      ctx.bezierCurveTo(-r * 0.62, r * 0.7, -r * 0.8, -r * 0.3, 0, -r * 1.15);
      ctx.fill();
      ctx.stroke();
    } else if (modo === 'rosa') {
      /* la rosa: spirali, non petali */
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.55;
      for (let g = 1; g <= 3; g++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * (1 - g * 0.26), r * (1 - g * 0.26), g * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (modo === 'raggio') {
      /* il fiordaliso: raggi lunghi e sottili, e il centro è un disco */
      ctx.globalAlpha *= 0.85;
      for (let p = 0; p < 9; p++) {
        const a = (p / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.62, r * 0.16, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = semi;
      ctx.fill();
    } else if (modo === 'foglia') {
      /* Orielia non ha un fiore: ha una foglia. È un peschetto d'inchiostro. */
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.25, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, 0);
      ctx.lineTo(r * 1.1, 0);
      ctx.stroke();
    } else if (modo === 'tag') {
      /* il cartellino: un pentagono, e il foro di un cartellino. Il foro si
       * disegna, non si fora: `destination-out` avrebbe bucato lo sbozzo del
       * vaso che sta sotto, che è disegnato e va tenuto. */
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r * 1.05, -r * 0.3);
      ctx.lineTo(r * 0.66, r * 1.15);
      ctx.lineTo(-r * 0.66, r * 1.15);
      ctx.lineTo(-r * 1.05, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha *= 0.75;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.16);
      ctx.lineTo(0, r * 0.16);
      ctx.lineTo(r * 0.5, r * 0.16);
      ctx.stroke();
    } else {
      /* il primo fiore: cinque petali uguali, e nessuno è più degli altri */
      ctx.globalAlpha *= 0.9;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, r * 0.58, r * 0.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = semi;
      ctx.fill();
    }
    ctx.restore();
  }

  /* Quanto una pianta è cresciuta: sale a uno e ci resta. `ora` è il tempo del
   * ciclo degli effetti, così non serve un orologio per pianta. */
  const CRESCITA_MS = 620;
  function crescitaDi(tr, ora) {
    if (!tr.nata || !ora) return 1;
    const eta = (ora - tr.nata) / CRESCITA_MS;
    if (eta >= 1) return 1;
    /* decelerazione: spunta in fretta e poi si ferma, come una cosa viva */
    return 1 - (1 - Math.max(0, eta)) * (1 - Math.max(0, eta));
  }

  function ridisegna(ora = 0) {
    if (!T.ctx) return;
    T.ctx.clearRect(0, 0, T.W, T.H);
    disegnaSbozzo(T.ctx);
    for (const tr of T.tratti) disegnaTratto(T.ctx, tr, crescitaDi(tr, ora));
    /* Il cuore acceso. Prima era un rettangolo chiaro su tutta la tela, con
     * l'opacità che cresceva man mano che il centro si riempiva: il centro
     * illuminava anche il terreno intorno, che non vale niente, e la cosa che
     * il gioco ti premiava sembrava una luce d'ambiente.
     *
     * Adesso la luce è dentro il cuore, ed è più forte. È l'unico posto dove
     * il colore del gioco è caldo, e deve dirti che lì sotto vale il doppio. */
    const cuore = T.nemico && T.nemico.forme ? T.nemico.forme.find((f) => f.cuore) : null;
    if (T.riempitiCuore > 0 && T.scheda && T.scheda.cuore && cuore) {
      const pieno = Math.min(1, T.riempitiCuore / T.scheda.cuore);
      T.ctx.save();
      T.ctx.globalAlpha = 0.1 + 0.34 * pieno;
      T.ctx.fillStyle = COLORE_CUORE;
      if (cuore.t === 'ell') {
        T.ctx.beginPath();
        T.ctx.ellipse(cuore.x * T.W, cuore.y * T.H, cuore.rx * T.W * 1.16, cuore.ry * T.H * 1.16, cuore.rot || 0, 0, Math.PI * 2);
        T.ctx.fill();
      } else if (cuore.t === 'pol') {
        T.ctx.beginPath();
        cuore.pts.forEach((q, i) => (i ? T.ctx.lineTo(q[0] * T.W, q[1] * T.H) : T.ctx.moveTo(q[0] * T.W, q[1] * T.H)));
        T.ctx.closePath();
        T.ctx.fill();
      }
      /* Il nocciolo ha due anelli, e si accendono con due gradienti concentrici:
       * più è pieno, più il centro è caldo. */
      for (const [k, a] of [[1.7, 0.10], [1.2, 0.14], [0.72, 0.2]]) {
        T.ctx.globalAlpha = a * pieno;
        if (cuore.t === 'ell') {
          T.ctx.beginPath();
          T.ctx.ellipse(cuore.x * T.W, cuore.y * T.H, cuore.rx * T.W * k, cuore.ry * T.H * k, cuore.rot || 0, 0, Math.PI * 2);
          T.ctx.fill();
        }
      }
      T.ctx.restore();
    }
  }
  T.ridisegna = ridisegna;

  /* ── imposta un vaso ───────────────────────────────────── */
  T.impostaNemico = (nemico, { conservaGerminato = false } = {}) => {
    T.nemico = nemico || null;
    T.scheda = T.nemico ? maschera(T.nemico) : null;
    if (!conservaGerminato) {
      T.gia = new Uint8Array(RES * RES);
      T.tratti = [];
      T.riempiti = 0;
      T.riempitiCuore = 0;
      T.sfioriti = [];
    }
    T.sete = 0;
    ridimensiona();
    ridisegna();
  };

  T.impostaMorsa = (n) => { T.mossa = PRESE[n] !== undefined ? n : 'medio'; };
  T.larghezzaMorsa = () => PRESE[T.mossa] || PRESE.medio;

  T.impostaFiore = (id) => {
    if (!FIORI[id] || T.fiore === id) return;
    T.fiore = id;
    /* Il fiore cambia: ridisegna lo strato di ciò che è germinato. */
    if (T.ctx) { disegnaSbozzo(T.ctx); for (const tr of T.tratti) disegnaTratto(T.ctx, tr); }
  };

  T.impostaLume = (l) => {
    if (LUMI[l] === undefined || T.lume === l) return;
    T.lume = l;
    ridisegna();
  };

  /* ── misurare un tratto ────────────────────────────────── */
  /**
   * Applica un tratto all'orto e restituisce quanta cura ha dato davvero.
   *
   * `moltiplicatore` è il fattore della mossa: dice quanta cura vale un fiore
   * per unità di terreno. `bonusCuore` è quanto vale il cuore: 2,2 di solito,
   * ma `inverteCuore` lo rende negativo — cioè il cuore di chi ti ha piantato ti
   * *restituisce* invece di costare. È l'unico punto del gioco in cui dare ti
   * fa tornare qualcosa, e arriva tardi.
   *
   * `budget` è il mazzetto: quanti fiori hai ancora in mano. Quando finisce, il
   * tratto si interrompe dove finisce. Il tratto *disegnato* resta intero anche
   * oltre: vedi dove sei andata, e vedi che i fiori sono finiti lì.
   *
   * @returns {{cura:number, quota:number, cuore:number, nuovo:number, esaurito:boolean}}
   */
  T.semina = (tratto, {
    moltiplicatore = 1, bonusCuore = 2.2, valore = 100, inverteCuore = false, budget = Infinity,
  } = {}) => {
    const vuoto = { cura: 0, quota: 0, cuore: 0, nuovo: 0, esaurito: false };
    if (!T.scheda || !T.scheda.totale || !T.gia) return vuoto;
    /* Una mossa nuova che non ha la sua voce in MOLTI arriva qui come
     * `undefined`, e `undefined × 1,1` è NaN: la cura diventa NaN, la spesa
     * diventa NaN, e la partita muore in silenzio tre secondi dopo, senza che
     * nessuno abbia toccato niente. Meglio una mossa da una che nessuna. */
    if (!Number.isFinite(moltiplicatore)) moltiplicatore = 1;
    if (!Number.isFinite(valore) || valore <= 0) valore = 100;
    /* NaN sì, Infinity no: `Infinity` è il modo con cui si dice "nessun
     * mazzetto", e `Number.isFinite` lo dichiara non finito. Se lo si riducesse
     * a zero ogni colpo coprirebbe niente e il gioco sembrereva rotto. */
    if (Number.isNaN(budget) || budget < 0) budget = 0;
    const larg = tratto.larghezza || T.larghezzaMorsa();
    /* Quanti pixel compra il mazzetto: `valore` è la cura di tutta l'area, e
       il moltiplicatore è la cura che ci metti sopra per ogni fiore. */
    const maxNuovi = budget === Infinity
      ? Infinity
      : Math.max(0, Math.floor((budget * T.scheda.totale) / (valore * moltiplicatore)));
    const { nuovi, cuoreNuovi, esaurito } = copre(T.scheda, tratto.punti, larg, T.gia, maxNuovi);
    const quota = nuovi / T.scheda.totale;
    const cuore = T.scheda.cuore ? cuoreNuovi / T.scheda.cuore : 0;
    T.riempiti += nuovi;
    T.riempitiCuore += cuoreNuovi;
    T.tratti.push({ punti: tratto.punti, larghezza: larg, nata: T.ora() });
    /* Copertura già contata: si disegna comunque, così il tratto "a vuoto"
     * resta visibile e il giocatore capisce che ha sbagliato mira. */
    const nato = T.tratti[T.tratti.length - 1];
    if (T.ctx) disegnaTratto(T.ctx, nato, 0);
    const segno = inverteCuore ? -1 : 1;
    const cura = (quota * valore) * moltiplicatore + segno * (cuore * valore) * (bonusCuore - 1);
    return { cura, quota, cuore, nuovo: nuovi, esaurito };
  };

  /** Copertura corrente, 0..1. */
  T.quota = () => (T.scheda && T.scheda.totale ? T.riempiti / T.scheda.totale : 0);

  T.sfiorito = (x, y) => {
    T.sfioriti.push({ x, y, r: 0.1, apparsa: performance.now() });
    if (T.sfioriti.length > 40) T.sfioriti.shift();
    T.lampo = 1;
  };

  T.impostaSete = (v) => { T.sete = Math.max(0, Math.min(1, v)); };

  /* ── il fiore da lasciar andare ────────────────────────── */
  T.mostraFiore = (x, y, { finestraMs = 700 } = {}) => {
    T.resa = { x, y, finestraMs, aperto: performance.now() };
  };
  T.chiudiFiore = () => { T.resa = null; };
  T.fioreScaduto = () => {
    if (!T.resa) return false;
    return performance.now() - T.resa.aperta > T.resa.finestraMs;
  };

  /* ── il ciclo degli effetti ────────────────────────────── */
  function disegnaEffetti(t) {
    const c = T.ectx;
    if (!c) return;
    c.clearRect(0, 0, T.W, T.H);
    c.save();

    /* il fiore sfiorito: una macchia che la terra si beve */
    for (const s of T.sfioriti) {
      const eta = (t - s.apparsa) / 1400;
      if (eta > 1) continue;
      const g = c.createRadialGradient(s.x * T.W, s.y * T.H, 0, s.x * T.W, s.y * T.H, s.r * T.W);
      g.addColorStop(0, 'rgba(120,118,86,0.8)');
      g.addColorStop(0.6, 'rgba(96,94,68,0.32)');
      g.addColorStop(1, 'rgba(96,94,68,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(s.x * T.W, s.y * T.H, s.r * T.W * (0.8 + eta * 0.4), 0, Math.PI * 2);
      c.fill();
    }

    /* la sete: la terra si spacca ai bordi */
    if (T.sete > 0.02) {
      const n = Math.ceil(T.sete * 14);
      c.strokeStyle = `rgba(24,26,14,${0.1 + T.sete * 0.42})`;
      c.lineWidth = Math.max(1, T.dpr * (0.6 + T.sete));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + i * 0.7;
        const r0 = (0.42 + 0.1 * Math.sin(i * 2.3)) * Math.min(T.W, T.H);
        let x = T.W / 2 + Math.cos(ang) * r0 * 1.25;
        let y = T.H / 2 + Math.sin(ang) * r0 * 1.05;
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += (Math.cos(ang) * 0.035 + Math.sin(i * 3.1 + k) * 0.028) * T.W;
          y += (Math.sin(ang) * 0.035 + Math.cos(i * 2.7 + k) * 0.028) * T.H;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      c.fillStyle = `rgba(14,16,8,${T.sete * 0.18})`;
      c.fillRect(0, 0, T.W, T.H);
    }

    /* il fiore che devi lasciar andare: un anello che si chiude, e una
     * finestrella di tempo scritta dentro. Non si traccia: si tiene e si
     * rilascia, e l'anello dice quanto manca. */
    if (T.resa) {
      const trascorsi = t - T.resa.aperta;
      const rimasto = Math.max(0, 1 - trascorsi / T.resa.finestraMs);
      const cx = T.resa.x * T.W;
      const cy = T.resa.y * T.H;
      const r = Math.max(26, 0.13 * Math.min(T.W, T.H));

      c.save();
      /* la traccia del fiore: l'anello parte aperto e si chiude */
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(214,224,178,0.35)';
      c.lineWidth = Math.max(3, 5 * T.dpr);
      c.beginPath();
      c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
      c.stroke();
      /* quanto manca */
      c.strokeStyle = rimasto < 0.34 ? '#b8433a' : '#c9a76a';
      c.lineWidth = Math.max(3, 5 * T.dpr);
      c.beginPath();
      c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rimasto);
      c.stroke();
      /* il cuore del fiore: non si tocca, si aspetta */
      c.fillStyle = rimasto < 0.34 ? 'rgba(184,67,58,0.9)' : 'rgba(201,167,106,0.9)';
      c.beginPath();
      c.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
      c.fill();
      c.restore();

      if (rimasto < 0.34) {
        c.strokeStyle = `rgba(184,67,58,${(0.34 - rimasto) * 2})`;
        c.lineWidth = Math.max(2, 4 * T.dpr);
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.stroke();
      }
    }

    /* il lampo: quando raggiungi il cuore */
    if (T.lampo > 0.01) {
      c.fillStyle = `rgba(250,250,228,${T.lampo * 0.5})`;
      c.fillRect(0, 0, T.W, T.H);
    }
    T.lampo *= 0.86;
    c.restore();
  }

  /* Il dono preso fa tremare l'orto. Lo facciamo in CSS, non ridisegnando
   * il canvas su sé stesso: il drawImage di un canvas su di sé raddoppia
   * l'immagine invece di spostarla. */
  let scuoti = 0;
  T.colpo = () => {
    if (scuoti) return;
    scuoti = 1;
    const t0 = performance.now();
    const passo = () => {
      const k = 1 - (performance.now() - t0) / 320;
      if (k <= 0) { T.canvas.style.transform = ''; scuoti = 0; return; }
      const a = Math.random() * Math.PI * 2;
      T.canvas.style.transform = `translate(${(Math.cos(a) * 9 * k).toFixed(2)}px, ${(Math.sin(a) * 9 * k).toFixed(2)}px)`;
      requestAnimationFrame(passo);
    };
    passo();
  };

  let attivoLoop = false;
  function frame() {
    const t = performance.now();
    disegnaEffetti(t);
    /* Mentre una pianta spunta il disegno va rifatto: senza questo il tratto
     * compare intero e l'orto sembra una stampa, non una cosa che cresce. Costa
     * un ridisegno per frame e solo finché qualcosa cresce. */
    let crescendo = false;
    for (const tr of T.tratti) {
      if (crescitaDi(tr, t) < 1) { crescendo = true; break; }
    }
    if (crescendo) ridisegna(t);
    T._raf = requestAnimationFrame(frame);
  }
  T.accendi = () => {
    if (attivoLoop || !T.ectx) return;
    attivoLoop = true;
    T._raf = requestAnimationFrame(frame);
  };
  T.spegni = () => {
    attivoLoop = false;
    if (T._raf) cancelAnimationFrame(T._raf);
    T._raf = 0;
  };

  /* ── input ─────────────────────────────────────────────── */
  const norm = (ev) => {
    const r = T.canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)),
    ];
  };

  function aggiungiPunti(ev) {
    const lotto = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : null;
    const punti = lotto && lotto.length ? lotto : [ev];
    for (const p of punti) T._tratto.punti.push(norm(p));
  }

  function inizia(ev) {
    if (!T.attivo) return;
    ev.preventDefault();
    T.canvas.setPointerCapture?.(ev.pointerId);
    const ora = performance.now();
    T._tratto = {
      punti: [norm(ev)],
      inizioMs: ora,
      durataMs: 0,
      larghezza: T.larghezzaMorsa(),
      forza: 0,
    };
    T._ultimoT = ora;
    T._on.inizio?.(T._tratto);
  }

  function muovi(ev) {
    if (!T._tratto || !T.attivo) return;
    ev.preventDefault();
    aggiungiPunti(ev);
    const ora = performance.now();
    /* La presa si assottiglia quando corri e si ispessisce quando rallenti:
     * è così che il gioco "sa" se stai dando o soltanto sfiorando. */
    const dt = Math.max(1, ora - T._ultimoT);
    T._ultimoT = ora;
    const tr = T._tratto;
    tr.forza = tr.forza * 0.85 + Math.min(1, 16 / dt) * 0.15;
  }

  function finisce(ev) {
    if (!T._tratto || !T.attivo) return;
    if (ev && ev.pointerId !== undefined) T.canvas.releasePointerCapture?.(ev.pointerId);
    const tr = T._tratto;
    T._tratto = null;
    tr.durataMs = Math.max(1, performance.now() - tr.inizioMs);
    T._on.fine?.(tr);
  }

  T.collega = (fn) => { T._on = Object.assign(T._on, fn || {}); };
  T.attiva = (v) => { T.attivo = !!v; };

  if (T.canvas) {
    T.canvas.addEventListener('pointerdown', inizia);
    T.canvas.addEventListener('pointermove', muovi);
    T.canvas.addEventListener('pointerup', finisce);
    T.canvas.addEventListener('pointercancel', finisce);
    T.canvas.addEventListener('pointerleave', finisce);
    T.canvas.addEventListener('lostpointercapture', finisce);
    /* i gesti del browser rovinerebbero il tratto: il dito deve stare sulla presa */
    T.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    T.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  T.azzera = () => {
    T.gia = new Uint8Array(RES * RES);
    T.tratti = [];
    T.riempiti = 0;
    T.riempitiCuore = 0;
    T.sfioriti = [];
    T.sete = 0;
    T.resa = null;
    ridisegna();
  };

  return T;
}

window.FSTOrto = {
  nuovo, maschera, copre, drittezza, lunghezza, caratteristiche,
  RES, PRESE, LUMI, FIORI, APERTURE, COLORE_CUORE, dentroEll, dentroPol, puntoInForma,
};
})();
