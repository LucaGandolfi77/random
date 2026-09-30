/* tela.js — il motore di pittura.
 *
 * Il nemico è una *tela*: uno sbozzo geometrico (cerchi, poligoni) in coordinate
 * normalizzate 0..1. Il giocatore lo ricopre col dito.
 *
 * Due cose importanti e deliberatamente separate:
 *
 *  1. La GEOMETRIA è pura e headless. `maschera()` e `copre()` non toccano il
 *     DOM: lavorano su una Uint8Array. Si testano senza browser e sono
 *     deterministiche — stessa copertura, stesso risultato, sempre.
 *
 *  2. Il DISEGNO è incrementale. Lo sbozzo si ridipinge solo quando cambia
 *     qualcosa (nemico, luminosità, resize); i tratti del giocatore si
 *     disegnano una volta sola quando terminano. Ridisegnare tutto ogni frame
 *     su un iPhone è la via più rapida per far scaldare la batteria.
 *
 * Il canvas ha due strati: `tela` (carta, sbozzo, inchiostro — persistente) ed
 * `effetti` (ansia, contorno della parata, sgorbio — ridisegnato ogni frame).
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
 * Costruisce le due maschere binarie dello sbozzo: il ritratto intero e la
 * parte che è il *volto* (lì il danno è multiplicato).
 * @returns {{totale:number, volto:number, maschera:Uint8Array, faccia:Uint8Array}}
 */
function maschera(nemico) {
  const forme = (nemico && nemico.forme) || [];
  const m = new Uint8Array(RES * RES);
  const f = new Uint8Array(RES * RES);
  let totale = 0;
  let volto = 0;
  for (let j = 0; j < RES; j++) {
    const ny = (j + 0.5) / RES;
    for (let i = 0; i < RES; i++) {
      const nx = (i + 0.5) / RES;
      let dentro = false;
      let eVolto = false;
      for (const forma of forme) {
        if (!puntoInForma(nx, ny, forma)) continue;
        dentro = true;
        if (forma.volto) eVolto = true;
      }
      if (!dentro) continue;
      const k = j * RES + i;
      m[k] = 1;
      totale++;
      if (eVolto) { f[k] = 1; volto++; }
    }
  }
  /* Un nemico senza "volto" dichiarato: la faccia è il terzo superiore del
   * ritratto, così il bonus esiste comunque e il giocatore lo trova da solo. */
  if (volto === 0) {
    for (let j = 0; j < Math.floor(RES / 3); j++) {
      for (let i = 0; i < RES; i++) {
        const k = j * RES + i;
        if (m[k]) { f[k] = 1; volto++; }
      }
    }
  }
  return { totale, volto, maschera: m, faccia: f };
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

/* Ricampiona una polilinea a passo costante: il pennello non è un punto ma
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
 * pixel già coperti: si aggiornano sul posto e restituisce i *nuovi* pixel,
 * così la somma delle chiamate dà la copertura totale senza doppio conteggio.
 */
function copre(scheda, punti, larghezzaNorm, gia) {
  if (!punti || punti.length < 1 || !scheda.totale) return { nuovi: 0, voltoNuovi: 0 };
  const campioni = distacco(punti);
  const r = Math.max(1, Math.min(12, Math.round((larghezzaNorm * RES) / 2)));
  const celle = DISCHI[r];
  let nuovi = 0;
  let voltoNuovi = 0;
  for (const [px, py] of campioni) {
    const i0 = Math.round(px * RES);
    const j0 = Math.round(py * RES);
    for (const [dx, dy] of celle) {
      const i = i0 + dx;
      const j = j0 + dy;
      if (i < 0 || j < 0 || i >= RES || j >= RES) continue;
      const k = j * RES + i;
      if (!scheda.maschera[k]) continue;
      if (gia[k]) continue;
      gia[k] = 1;
      nuovi++;
      if (scheda.faccia[k]) voltoNuovi++;
    }
  }
  return { nuovi, voltoNuovi };
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
  const velocita = lung / (dur / 1000);          // frazione di tela al secondo
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

const PENNELLI = { sottile: 0.045, medio: 0.075, largo: 0.115 };
const LUMI = { chiaro: 0.95, media: 0.78, scura: 0.6 };
const TINTE = {
  ada:    { base: '#3a3733', ombra: '#151311' },
  tecla:  { base: '#9c3b2e', ombra: '#4a1a13' },
  ansi:   { base: '#6b5646', ombra: '#2c2219' },
  brizio: { base: '#2a2622', ombra: '#0b0a09' },
};

function nuovo(canvas, effetti) {
  const T = {
    canvas, effetti,
    ctx: canvas && canvas.getContext ? canvas.getContext('2d') : null,
    ectx: effetti && effetti.getContext ? effetti.getContext('2d') : null,
    nemico: null,
    scheda: null,
    gia: null,
    coperti: 0,
    copertiVolto: 0,
    tratti: [],
    pennello: 'medio',
    tinta: 'ada',
    lume: 'media',
    ansia: 0,
    contorno: null,
    scorbii: [],
    lampo: 0,
    W: 0, H: 0, dpr: 1,
    attivo: false,
    _raf: 0,
    _ascoltatori: {},
    _tratto: null,
    _ultimoT: 0,
    _on: {},
  };

  /* ── superficie ────────────────────────────────────────── */
  const ridimensiona = () => {
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
  function disegnaSbozzo(ctx) {
    const { W, H } = T;
    const carta = T.lume === 'chiaro' ? '#efe6d4' : T.lume === 'scura' ? '#191512' : '#e2d8c3';
    const inchiostro = T.lume === 'chiaro' ? '#2a2622' : T.lume === 'scura' ? '#cbbda6' : '#3a352f';
    ctx.save();
    ctx.fillStyle = carta;
    ctx.fillRect(0, 0, W, H);

    /* macchie di tela: un po' di rumore, non un'immagine pulita */
    ctx.globalAlpha = T.lume === 'scura' ? 0.1 : 0.07;
    ctx.fillStyle = inchiostro;
    for (let i = 0; i < 90; i++) {
      const x = ((i * 7919) % 997) / 997 * W;
      const y = ((i * 6271) % 883) / 883 * H;
      const r = 2 + ((i * 131) % 9);
      ctx.fillRect(x, y, r, r * 0.6);
    }
    ctx.globalAlpha = 1;

    const forme = (T.nemico && T.nemico.forme) || [];
    const nero = T.lume === 'chiaro' ? 'rgba(42,38,34,' : T.lume === 'scura' ? 'rgba(203,189,166,' : 'rgba(58,53,47,';
    const luce = T.lume === 'chiaro' ? 'rgba(255,255,255,' : T.lume === 'scura' ? 'rgba(25,21,18,' : 'rgba(226,216,195,';

    for (const f of forme) {
      const tracciato = new Path2D();
      if (f.t === 'ell') {
        tracciato.ellipse(f.x * W, f.y * H, f.rx * W, f.ry * H, f.rot || 0, 0, Math.PI * 2);
      } else if (f.t === 'pol') {
        f.pts.forEach((p, i) => (i ? tracciato.lineTo(p[0] * W, p[1] * H) : tracciato.moveTo(p[0] * W, p[1] * H)));
        tracciato.closePath();
      }

      /* wash: il volume, appena accennato */
      ctx.fillStyle = nero + (f.volto ? '0.16)' : '0.11)');
      ctx.fill(tracciato);

      /* tratteggio: la parte "lavorata", quella che il maestro non ha finito */
      ctx.save();
      ctx.clip(tracciato);
      ctx.strokeStyle = nero + '0.20)';
      ctx.lineWidth = Math.max(1, T.dpr);
      const passo = Math.max(5, 9 * T.dpr);
      for (let d = -H; d < W + H; d += passo) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + H, H);
        ctx.stroke();
      }
      /* la luce viene dal alto a sinistra, sempre */
      ctx.strokeStyle = luce + '0.35)';
      for (let d = -H; d < W + H; d += passo * 2) {
        ctx.beginPath();
        ctx.moveTo(d + 3 * T.dpr, 0);
        ctx.lineTo(d + 3 * T.dpr + H, H);
        ctx.stroke();
      }
      ctx.restore();

      /* contorno a due passate, come chi disegna a carboncino */
      ctx.strokeStyle = nero + '0.55)';
      ctx.lineWidth = Math.max(1.2, 2.1 * T.dpr);
      ctx.stroke(tracciato);
      ctx.strokeStyle = nero + '0.22)';
      ctx.lineWidth = Math.max(1, 1.2 * T.dpr);
      ctx.save();
      ctx.translate(1.6 * T.dpr, 1.2 * T.dpr);
      ctx.stroke(tracciato);
      ctx.restore();
    }

    /* Il volto è segnato: due trattini sull'occhio. Il giocatore deve
     * indovinare che lì sotto c'è la zona che fa male di più. */
    const volto = forme.find((f) => f.volto);
    if (volto && volto.t === 'ell') {
      ctx.strokeStyle = nero + '0.42)';
      ctx.lineWidth = Math.max(1.4, 2.4 * T.dpr);
      ctx.lineCap = 'round';
      const cx = volto.x * W;
      const cy = volto.y * H;
      const rx = volto.rx * W;
      const ry = volto.ry * H;
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.42, cy - ry * 0.12);
      ctx.lineTo(cx - rx * 0.02, cy - ry * 0.16);
      ctx.moveTo(cx + rx * 0.04, cy - ry * 0.12);
      ctx.lineTo(cx + rx * 0.40, cy - ry * 0.20);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── l'inchiostro del giocatore ─────────────────────────── */
  function disegnaTratto(ctx, tr) {
    const t = TINTE[T.tinta] || TINTE.ada;
    const pts = tr.punti;
    if (pts.length === 1) {
      ctx.fillStyle = t.ombra;
      ctx.beginPath();
      ctx.arc(pts[0][0] * T.W, pts[0][1] * T.H, (tr.larghezza * T.W) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const w = Math.max(2, tr.larghezza * T.W);

    /* corpo del tratto: due passate per dare densità alle spalle */
    ctx.strokeStyle = t.base;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * T.W, p[1] * T.H) : ctx.moveTo(p[0] * T.W, p[1] * T.H)));
    ctx.stroke();

    /* bordo bagnato: la pennellata che si asciuga sui lati */
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = t.ombra;
    ctx.lineWidth = Math.max(1, w * 0.16);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * T.W, p[1] * T.H) : ctx.moveTo(p[0] * T.W, p[1] * T.H)));
    ctx.stroke();
    ctx.restore();
  }

  function ridisegna() {
    if (!T.ctx) return;
    T.ctx.clearRect(0, 0, T.W, T.H);
    disegnaSbozzo(T.ctx);
    for (const tr of T.tratti) disegnaTratto(T.ctx, tr);
    /* il giallo del volto: la zona che fa male, quando è coperta */
    if (T.copertiVolto > 0 && T.scheda && T.scheda.volto) {
      T.ctx.save();
      T.ctx.globalAlpha = Math.min(0.16, 0.16 * (T.copertiVolto / T.scheda.volto));
      T.ctx.fillStyle = '#fff6e0';
      T.ctx.fillRect(0, 0, T.W, T.H);
      T.ctx.restore();
    }
  }
  T.ridisegna = ridisegna;

  /* ── imposta un nemico ─────────────────────────────────── */
  T.impostaNemico = (nemico, { conservaInchiostro = false } = {}) => {
    T.nemico = nemico || null;
    T.scheda = T.nemico ? maschera(T.nemico) : null;
    if (!conservaInchiostro) {
      T.gia = new Uint8Array(RES * RES);
      T.tratti = [];
      T.coperti = 0;
      T.copertiVolto = 0;
      T.scorbii = [];
    }
    T.ansia = 0;
    ridimensiona();
    ridisegna();
  };

  T.impostaPennello = (n) => { T.pennello = PENNELLI[n] !== undefined ? n : 'medio'; };
  T.larghezzaPennello = () => PENNELLI[T.pennello] || PENNELLI.medio;

  T.impostaTinta = (id) => {
    if (!TINTE[id] || T.tinta === id) return;
    T.tinta = id;
    /* La tinta cambia: ridisegna lo strato inchiostro accumulato. */
    if (T.ctx) { disegnaSbozzo(T.ctx); for (const tr of T.tratti) disegnaTratto(T.ctx, tr); }
  };

  T.impostaLume = (l) => {
    if (LUMI[l] === undefined || T.lume === l) return;
    T.lume = l;
    ridisegna();
  };

  /* ── misurare un tratto ────────────────────────────────── */
  /**
   * Applica un tratto alla tela e restituisce quanto ha coperto davvero.
   * `moltiplicatore` è il bonus del volto: colpire il viso fa di più.
   * @returns {{danno:number, quota:number, volto:number, nuovo:number}}
   */
  T.pittura = (tratto, { moltiplicatore = 1, bonusVolto = 2.2, valore = 100 } = {}) => {
    if (!T.scheda || !T.scheda.totale || !T.gia) return { danno: 0, quota: 0, volto: 0, nuovo: 0 };
    const larg = tratto.larghezza || T.larghezzaPennello();
    const { nuovi, voltoNuovi } = copre(T.scheda, tratto.punti, larg, T.gia);
    const quota = nuovi / T.scheda.totale;
    const volto = T.scheda.volto ? voltoNuovi / T.scheda.volto : 0;
    T.coperti += nuovi;
    T.copertiVolto += voltoNuovi;
    T.tratti.push({ punti: tratto.punti, larghezza: larg });
    /* Copertura già contata: si disegna comunque, così il tratto "a vuoto"
     * resta visibile e il giocatore capisce che ha sbagliato mira. */
    if (T.ctx) disegnaTratto(T.ctx, { punti: tratto.punti, larghezza: larg });
    const danno = (quota * valore) * moltiplicatore + (volto * valore) * (bonusVolto - 1);
    return { danno, quota, volto, nuovo: nuovi };
  };

  /** Copertura corrente, 0..1. */
  T.quota = () => (T.scheda && T.scheda.totale ? T.coperti / T.scheda.totale : 0);

  T.sgorbio = (x, y) => {
    T.scorbii.push({ x, y, r: 0.1, apparsa: performance.now() });
    if (T.scorbii.length > 40) T.scorbii.shift();
    T.lampo = 1;
  };

  T.impostaAnsia = (v) => { T.ansia = Math.max(0, Math.min(1, v)); };

  /* ── il contorno della parata ──────────────────────────── */
  T.mostraContorno = (da, a, { finestraMs = 700 } = {}) => {
    T.contorno = { da, a, finestraMs, aperto: performance.now() };
  };
  T.chiudiContorno = () => { T.contorno = null; };
  T.contornoScaduto = () => {
    if (!T.contorno) return false;
    return performance.now() - T.contorno.aperta > T.contorno.finestraMs;
  };

  /* ── il ciclo degli effetti ────────────────────────────── */
  function disegnaEffetti(t) {
    const c = T.ectx;
    if (!c) return;
    c.clearRect(0, 0, T.W, T.H);
    c.save();

    /* lo sgorbio: una macchia che beve l'inchiostro */
    for (const s of T.scorbii) {
      const eta = (t - s.apparsa) / 1400;
      if (eta > 1) continue;
      const g = c.createRadialGradient(s.x * T.W, s.y * T.H, 0, s.x * T.W, s.y * T.H, s.r * T.W);
      g.addColorStop(0, 'rgba(232,220,196,0.85)');
      g.addColorStop(0.6, 'rgba(210,196,168,0.35)');
      g.addColorStop(1, 'rgba(210,196,168,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(s.x * T.W, s.y * T.H, s.r * T.W * (0.8 + eta * 0.4), 0, Math.PI * 2);
      c.fill();
    }

    /* l'ansia: la tela si spacca ai bordi */
    if (T.ansia > 0.02) {
      const n = Math.ceil(T.ansia * 14);
      c.strokeStyle = `rgba(20,16,14,${0.1 + T.ansia * 0.42})`;
      c.lineWidth = Math.max(1, T.dpr * (0.6 + T.ansia));
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
      c.fillStyle = `rgba(12,10,9,${T.ansia * 0.18})`;
      c.fillRect(0, 0, T.W, T.H);
    }

    /* il contorno da tracciare: è un trattino, va fatto per bene */
    if (T.contorno) {
      const trascorsi = t - T.contorno.aperta;
      const rimasto = Math.max(0, 1 - trascorsi / T.contorno.finestraMs);
      const { da, a } = T.contorno;
      const x1 = da[0] * T.W;
      const y1 = da[1] * T.H;
      const x2 = a[0] * T.W;
      const y2 = a[1] * T.H;
      const lat = Math.max(10, 0.1 * T.W);

      c.save();
      c.translate(x1, y1);
      c.rotate(Math.atan2(y2 - y1, x2 - x1));
      const lung = Math.hypot(x2 - x1, y2 - y1);

      c.fillStyle = `rgba(24,20,17,${0.35 + rimasto * 0.25})`;
      c.fillRect(-lat, -lat, lung + lat * 2, lat * 2);

      /* le due guide: sopra e sotto. Tracciare *dentro* è parata. */
      c.strokeStyle = 'rgba(232,220,196,0.9)';
      c.lineWidth = Math.max(1.5, 2 * T.dpr);
      c.setLineDash([6 * T.dpr, 5 * T.dpr]);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(lung, 0);
      c.moveTo(0, 0); c.lineTo(0, lat);
      c.stroke();
      c.setLineDash([]);

      /* il tempo che scorre, scritto lungo la riga */
      c.fillStyle = rimasto < 0.34 ? '#d24a34' : '#e0c18a';
      c.fillRect(0, lat * 0.55, lung * rimasto, Math.max(2, 3 * T.dpr));
      c.restore();

      if (rimasto < 0.34) {
        c.strokeStyle = `rgba(210,74,52,${(0.34 - rimasto) * 2})`;
        c.lineWidth = Math.max(2, 4 * T.dpr);
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
      }
    }

    /* il lampo: quando copri il volto */
    if (T.lampo > 0.01) {
      c.fillStyle = `rgba(255,250,238,${T.lampo * 0.5})`;
      c.fillRect(0, 0, T.W, T.H);
    }
    T.lampo *= 0.86;
    c.restore();
  }

  /* Il colpo preso fa tremare la tela. Lo facciamo in CSS, non ridisegnando
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
  T.colpo = () => { T.scuotimento = 1; };

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
      larghezza: T.larghezzaPennello(),
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
    /* Il pennello si assottiglia quando corri e si ispessisce quando rallenti:
     * è così che il gioco "sa" se stai dando un colpo o tracciando. */
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
    /* i gesti del browser rovinerebbero il tratto: il dito deve stare sul pennello */
    T.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    T.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  T.azzera = () => {
    T.gia = new Uint8Array(RES * RES);
    T.tratti = [];
    T.coperti = 0;
    T.copertiVolto = 0;
    T.scorbii = [];
    T.ansia = 0;
    T.contorno = null;
    ridisegna();
  };

  return T;
}

window.PMFTela = {
  nuovo, maschera, copre, drittezza, lunghezza, caratteristiche,
  RES, PENNELLI, LUMI, TINTE, dentroEll, dentroPol, puntoInForma,
};
})();