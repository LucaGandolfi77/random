/* combat.js — la macchina a turni.
 *
 * Regola di ferro di questo gioco: il giocatore NON ha una barra di vita.
 * L'unica cosa che perde sono i ricordi. Il nemico non ti "colpisce": ti
 * *fa dimenticare*. E la parata non è uno scermo — è l'unico modo di
 * riavere indietro quello che hai appena perso.
 *
 *   parata riuscita  → perdi niente, +1 ricordo, e dipingi lo stesso
 *   parata fallita   → -1 ricordo, e dipingi lo stesso
 *   chiedi           → -1 ricordo, ma non dipingi (serve la chiave «parla»)
 *   mossa non parabile → -1 ricordo, e non puoi dipingere
 *   domanda senza risposta → -1 ricordo e un turno perso
 *
 * Nota sul fallimento: una parata persa NON è un turno perso. Ridisegni
 * lo stesso, solo che ti è costato un ricordo. Se non si potesse comunque
 * dipingere, punire e non ricompensare insieme sarebbe doppia punizione.
 *
 * Tutta la logica qui dentro è sincrona e senza DOM: prende lo stato del
 * save, il nemico e un "pittore" (la Tela) e restituisce eventi.
 */
(function () {
'use strict';

const COSTI = { traccia: 0, lavora: 6, inchiostro: 18, chiedi: 0 };
const MOLTI = { traccia: 1, lavora: 2.2, inchiostro: 4 };
const GLIF = { traccia: '〰', lavora: '◗', inchiostro: '●', chiedi: '❝' };
const NOMI = {
  traccia: 'Traccia',
  lavora: 'Lavora',
  inchiostro: 'Inchiostro',
  chiedi: 'Chiedi',
};
const NOTE = {
  traccia: 'Copri il ritratto. Il viso fa di più.',
  lavora: 'Più danno, ma se alzi il pennello lasci uno sgorbio.',
  inchiostro: 'Danni altissimi, e brucia due ricordi. Ferma anche l\'ansia.',
  chiedi: 'Non dipingi: parli. Serve ricordare come si fa.',
};

const VALORE_TOTALE = 100;     // coprire tutto il ritratto = 100 danni
const INCHIOSTRO_PER_QUOTA = 45;
const BONUS_VOLTO = 2.2;       // il volto moltiplica: lì il ritratto "paga" di più
const ANSIA_MAX = 6;
const ANSIA_PER_TURNO = 1.7;
const SGORBIO_CHANCE = 0.34;
const SGORBIO_CURA = 7;
const FINESTRA_PARATA = 700;
const CORDA_MIN = 0.2;
const DRITTEZZA_MAX = 0.16;
const TOLLERANZA = 0.07;
const COPERTURA_PARATA = 0.5;
const MEMORIE_PER_PARATA = 2;   // quante ne brucia Inchiostro
const LUNGHEZZA_PARATA = 0.42;  // quanto è lunga la riga da tracciare

const M = () => window.PMFMemoria;

/**
 * Il tratto del giocatore coincide con il contorno richiesto?
 * Distanza perpendicolare dalla retta del contorno + sovrapposizione della
 * proiezione. Due numeri, nessuna magia, e si testa senza browser.
 */
function coincide(tratto, da, a, tolleranza = TOLLERANZA, coperturaMin = COPERTURA_PARATA) {
  const pts = tratto && tratto.punti;
  if (!pts || pts.length < 2) return false;
  const dx = a[0] - da[0];
  const dy = a[1] - da[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return false;
  const ux = dx / len;
  const uy = dy / len;
  let dentro = 0;
  for (const p of pts) {
    const vx = p[0] - da[0];
    const vy = p[1] - da[1];
    const proi = vx * ux + vy * uy;
    const perp = Math.abs(-vx * uy + vy * ux);
    if (perp <= tolleranza && proi >= -tolleranza && proi <= len + tolleranza) dentro++;
  }
  return dentro / pts.length >= coperturaMin;
}

function nuovo({ nemico, salva, defs, clock = null, rng = Math.random }) {
  const Mem = M();
  const b = Mem.bonus(salva, defs);

  const scaletta = nemico.scaletta || [{ soglia: nemico.vita || 100, azioni: [{ t: 'mossa', parabile: true }] }];

  const st = {
    nemico,
    vita: nemico.vita || VALORE_TOTALE,
    vitaMax: nemico.vita || VALORE_TOTALE,
    ansia: 0,
    inchiostro: 0,
    asciutto: 0,          // turni in cui Lavora e Inchiostro non si possono usare
    stordito: 0,          // turni in cui non agisci
    round: 1,
    scaletta,
    faseSbloccata: 0,
    turniAvversari: 0,        // quanti turni ha già avuto il nemico (non il metodo!)
    mossa: null,
    fase: 'giocatore',
    attacco: null,        // { parabile, conScheda, testo } in attesa di risposta
    parata: null,         // { da, a, scaduta, risolta }
    contatoreParate: 0,
    contatoreFallite: 0,
    bruciate: [],
    riafferrate: [],
    eventi: [],
    ultimoMessaggio: '',
    finito: false,
    vittoria: false,
  };

  /* L'orologio è iniettato: nei test si guida a mano, nel browser fa da sé.
   * Senza questo la finestra di parata sarebbe un numero fisso e la parata
   * non scaderebbe mai. */
  st.ora = clock || (() => (typeof performance !== 'undefined' ? performance.now() : 0));
  st.bonusFinestra = FINESTRA_PARATA + (b.parata || 0);

  const dice = (p) => rng() < p;
  const valutaFase = () => {
    let f = 0;
    for (let i = 0; i < scaletta.length; i++) if (st.vita <= scaletta[i].soglia) f = i;
    st.faseSbloccata = f;
  };
  valutaFase();

  const scrivi = (testo, tipo = 'info') => {
    st.ultimoMessaggio = testo;
    st.eventi.push({ tipo, testo });
    return testo;
  };

  st.bonus = b;

  /* La prossima mossa del nemico. L'indice parte da -1 perché `turnoNemico`
   * lo incrementa *prima* di chiedere: così il primo turno del nemico è la
   * prima azione della scaletta, e non la seconda. */
  st.prossima = () => {
    const az = scaletta[st.faseSbloccata].azioni;
    const i = ((st.turniAvversari - 1) % az.length + az.length) % az.length;
    return az[i];
  };
  st.intentoVisibile = () => Mem.abilita(salva, defs, 'vedere');
  st.intento = () => {
    const d = st.prossima();
    if (!d) return '';
    if (d.t === 'mossa') return d.parabile === false ? 'non si può parare' : 'tracciandoci sopra';
    if (d.t === 'domanda') return 'farà una domanda';
    if (d.t === 'asciuga') return 'farà asciugare l\'inchiostro';
    if (d.t === 'ricorda') return 'ti porterà via un ricordo';
    return '';
  };

  /* ── scelte del giocatore ──────────────────────────────── */

  st.mosseDisponibili = () => {
    const out = [];
    for (const id of ['traccia', 'lavora', 'inchiostro', 'chiedi']) {
      /* Chiedi non è chiusa da nessuna chiave: è l'alternativa alla parata, e
       * deve esistere sempre. Se non sai più parlare, costa un ricordo — ma
       * resta lì, perché a un giocatore che ha perso tutto non si toglie anche
       * la scelta. Le altre mosse invece sono legate a una scheda: senza, non
       * sai più farle. */
      const chiave = { lavora: 'lavora', inchiostro: 'inchiostro' }[id];
      let bloccata = false;
      let motivo = '';
      if (st.finito) { bloccata = true; motivo = 'La tela è già coperta.'; }
      else if (st.stordito > 0) { bloccata = true; motivo = 'Sei scordato di quello che stavi facendo.'; }
      else if (chiave && !Mem.abilita(salva, defs, chiave)) { bloccata = true; motivo = 'Non ricordi più come si faceva.'; }
      if (id === 'inchiostro' && !bloccata && !Mem.puoiBruciare(salva, MEMORIE_PER_PARATA)) { bloccata = true; motivo = 'Non hai abbastanza ricordi da bruciare.'; }
      if ((id === 'lavora' || id === 'inchiostro') && st.asciutto > 0 && !bloccata) { bloccata = true; motivo = 'L\'inchiostro è asciutto.'; }
      if (id !== 'chiedi' && !bloccata && COSTI[id] > 0 && st.inchiostro < COSTI[id]) { bloccata = true; motivo = 'Non hai inchiostro.'; }
      if (id === 'chiedi' && !bloccata && !st.attacco) { bloccata = true; motivo = 'Non c\'è niente da chiedere, adesso.'; }
      out.push({
        id,
        nome: NOMI[id],
        glifo: GLIF[id],
        costo: COSTI[id],
        bloccata,
        motivo,
        pericolo: id === 'inchiostro',
        nota: id === 'chiedi' && !Mem.abilita(salva, defs, 'parla')
          ? 'Non dipingi: parli. Ma non ricordi più come si fa.'
          : NOTE[id],
      });
    }
    return out;
  };

  st.scegli = (id) => {
    const m = st.mosseDisponibili().find((x) => x.id === id);
    if (!m || m.bloccata) return { ok: false, motivo: m ? m.motivo : 'Mossa sconosciuta.' };
    st.mossa = id;
    if (id === 'inchiostro') {
      scrivi(`Scegli ${MEMORIE_PER_PARATA} ricordi da bruciare.`, 'pericolo');
      return { ok: true, chiedeSchede: MEMORIE_PER_PARATA };
    }
    if (id === 'chiedi') return st.chiedi();
    if (id === 'lavora') {
      st.inchiostro -= COSTI.lavora;
      scrivi('Pesa il pennello. Non alzarlo.', 'info');
    } else {
      scrivi('Traccia sopra il ritratto.', 'info');
    }
    return { ok: true };
  };

  /* Il giocatore ha indicato le due carte da mandare a fuoco.
   * Si chiama solo dopo un `scegli('inchiostro')` andato bene: è l'unico
   * momento in cui bruciare è una scelta e non una perdita. */
  st.scegliMemorie = (ids) => {
    if (st.mossa !== 'inchiostro') return { ok: false, motivo: 'Non è il momento di bruciare.' };
    const scelte = Mem.senzaDup(ids).filter((id) => Mem.ha(salva, id)).slice(0, MEMORIE_PER_PARATA);
    if (scelte.length < MEMORIE_PER_PARATA) return { ok: false, motivo: 'Servono due ricordi, e due che hai davvero.' };
    st.inchiostro -= COSTI.inchiostro;
    Mem.brucia(salva, scelte);
    st.bruciate.push(...scelte);
    st.ansia = 0;
    scrivi(`Hai bruciato: ${scelte.join(', ')}.`, 'pericolo');
    return { ok: true, scelte };
  };

  /* ── Chiedi: si paga in tempo, non in ricordi (se sai parlare) ── */

  st.chiedi = () => {
    if (!st.attacco) return { ok: false, motivo: 'Non c\'è niente da chiedere.' };
    const saParlare = Mem.abilita(salva, defs, 'parla');
    if (saParlare) {
      st.attacco = null;
      st.parata = null;
      const id = Mem.schedaDaRiafferrare(salva);
      let ripresa = 0;
      if (id && Mem.riafferra(salva, id)) { st.riafferrate.push(id); ripresa++; }
      scrivi(ripresa ? `Hai parlato. Ti ha risposto, e ti ha ridato: ${ripresa}.` : 'Hai parlato. Ti ha ascoltato.', 'bene');
      return { ok: true, ripresa, dipingi: false };
    }
    const persi = Mem.bruciaAutomatico(salva, 1);
    st.bruciate.push(...persi);
    st.attacco = null;
    st.parata = null;
    scrivi('Hai aperto la bocca e non è uscito niente. Ti ha risposto lui.', 'pericolo');
    controllaVuoto();
    return { ok: true, ripresa: 0, dipingi: false, persi };
  };

  /* ── il giocatore dipinge ──────────────────────────────── */

  /**
   * Chiamata a ogni tratto concluso. Calcola il danno ma non lo applica:
   * chi lo scala è `st.applica`, così lo sgorbio può ancora mangiucchiare.
   */
  st.punto = (tratto) => {
    const car = window.PMFTela.caratteristiche(tratto);
    if (st.attacco) {
      return { tipo: 'parata', esito: st.rispondiParata(tratto), caratteristiche: car, punti: tratto.punti };
    }
    const molti = MOLTI[st.mossa || 'traccia'] * (b.danno || 1);
    return { tipo: 'normale', molti, caratteristiche: car, punti: tratto.punti, mossa: st.mossa || 'traccia' };
  };

  /** La misura vera: il tocco del pennello contro la maschera del ritratto. */
  st.misura = (tratto, tela) => {
    const molti = MOLTI[st.mossa || 'traccia'] * (b.danno || 1);
    const larg = tratto.larghezza || tela.larghezzaPennello();
    const r = tela.pittura({ punti: tratto.punti, larghezza: larg }, { moltiplicatore: molti, bonusVolto: BONUS_VOLTO, valore: VALORE_TOTALE });
    st.inchiostro += r.quota * INCHIOSTRO_PER_QUOTA;
    return r;
  };

  st.applica = (misura, tela) => {
    if (!misura) return null;
    let danno = misura.danno;
    let sgorbio = false;

    /* Lavora: chi alza il pennello prima di arrivare, la tela se la beve. */
    if (st.mossa === 'lavora' && dice(SGORBIO_CHANCE)) {
      sgorbio = true;
      danno *= 0.55;
      const pts = (st._ultimoTratto && st._ultimoTratto.punti) || [];
      const ultimo = pts[pts.length - 1] || [0.5, 0.5];
      tela.sgorbio(ultimo[0], ultimo[1]);
      scrivi('Hai alzato il pennello. La tela si beve un pezzo.', 'pericolo');
    }

    st.vita -= danno;
    st._ultimoTratto = st._ultimoTratto || null;
    scrivi(`+${Math.round(danno)}${misura.volto > 0.001 ? ' · volto' : ''}`, 'info');

    if (st.vita <= 0) {
      st.vita = 0;
      st.finito = true;
      st.vittoria = true;
      st.fase = 'finito';
      st.attacco = null;
      scrivi('Il ritratto è coperto. Non si vede più nessuno.', 'bene');
      return { sgorbio, danno, vittoria: true };
    }
    valutaFase();
    return { sgorbio, danno, vittoria: false };
  };

  /* ── la parata ─────────────────────────────────────────── */

  st.apriParata = (da, a, { conScheda = null } = {}) => {
    st.parata = { da, a, scaduta: st.ora() + st.bonusFinestra, conScheda, risolta: false };
    return st.parata;
  };
  st.parataScaduta = () => !st.parata || st.parata.risolta || st.ora() >= st.parata.scaduta;

  st.rispondiParata = (tratto) => {
    if (!st.parata) return { riuscita: false, motivo: 'niente da parare' };
    const { da, a, conScheda } = st.parata;
    const sulSegno = coincide(tratto, da, a);
    const drittezza = window.PMFTela.drittezza(tratto.punti || []);
    const lung = window.PMFTela.lunghezza(tratto.punti || []);
    const inTempo = st.ora() <= st.parata.scaduta;
    const riuscita = inTempo && sulSegno && drittezza <= DRITTEZZA_MAX && lung >= CORDA_MIN;

    st.parata.risolta = true;
    const attacco = st.attacco;
    st.attacco = null;

    if (riuscita) {
      st.contatoreParate++;
      /* La parata è l'unico modo di riavere un ricordo. E se per parare
       * bisogna consegnare qualcuno — Tecla — la scelta è già scritta: si
       * paga con la persona che si stava salvando. */
      if (conScheda && Mem.ha(salva, conScheda)) {
        Mem.brucia(salva, [conScheda]);
        st.bruciate.push(conScheda);
        scrivi('L\'hai parata. Per pararla hai consegnato proprio lei.', 'pericolo');
      } else {
        const date = Math.max(1, Math.min(b.memoriaPerParata || 1, MEMORIE_PER_PARATA));
        let ripresa = 0;
        for (let i = 0; i < date; i++) {
          const id = Mem.schedaDaRiafferrare(salva);
          if (!id || !Mem.riafferra(salva, id)) break;
          st.riafferrate.push(id);
          ripresa++;
        }
        scrivi(ripresa ? `Parata. Ti è tornato: ${ripresa}.` : 'Parata.', 'bene');
      }
      return { riuscita: true, ripresa: conScheda ? 0 : 1, testo: attacco && attacco.testo };
    }

    st.contatoreFallite++;
    const persi = Mem.bruciaAutomatico(salva, 1);
    st.bruciate.push(...persi);
    const motivo = !inTempo ? 'troppo tardi'
      : !sulSegno ? 'fuori dal segno'
        : drittezza > DRITTEZZA_MAX ? 'troppo tremolante' : 'troppo corto';
    scrivi(`Parata fallita: ${motivo}.`, 'pericolo');
    controllaVuoto();
    return { riuscita: false, motivo, persi, testo: attacco && attacco.testo };
  };

  function controllaVuoto() {
    if (!Mem.isVacia(salva)) return false;
    st.finito = true;
    st.vittoria = false;
    st.fase = 'finito';
    st.attacco = null;
    scrivi('Non ti resta più niente. Non ricordi nemmeno perché stavi dipingendo.', 'pericolo');
    return true;
  }
  st.controllaVuoto = controllaVuoto;

  /* ── il turno del nemico ───────────────────────────────── */

  /* Il turno del nemico. Nota il nome: il contatore è turniAvversari, perché
   *  è questo metodo e un numero con lo stesso nome lo
   * sovrascriverebbe — ed è successo, e il gioco non faceva niente. */
  st.turnoNemico = () => {
    if (st.finito) return { azione: null, eventi: [] };
    st.turniAvversari++;
    const az = st.prossima();
    const fuori = [];
    st.attacco = null;
    st.parata = null;

    st.ansia += (nemico.ansiaPerTurno || ANSIA_PER_TURNO) + (1 - st.vita / st.vitaMax) * 0.7;

    if (st.ansia >= ANSIA_MAX) {
      st.ansia = 0;
      const domande = nemico.domande || [];
      const dom = domande.length ? domande[Math.floor(rng() * domande.length) % domande.length] : null;
      if (dom) {
        const sa = Mem.ha(salva, dom.risposta);
        if (sa) {
          scrivi(dom.testo, 'info');
          fuori.push({ t: 'domanda', salvata: true, testo: dom.testo });
        } else {
          const persi = Mem.bruciaAutomatico(salva, 1);
          st.bruciate.push(...persi);
          st.stordito = 1;
          scrivi(dom.testo, 'pericolo');
          fuori.push({ t: 'domanda', salvata: false, testo: dom.testo, persi });
        }
        valutaFase();
        st.fase = st.stordito > 0 ? 'stordito' : 'giocatore';
        st.mossa = null;
        return { azione: { t: 'domanda' }, eventi: fuori };
      }
    }

    if (az.t === 'asciuga') {
      st.asciutto = az.turni || 2;
      scrivi(az.testo || 'L\'inchiostro asciuga.', 'pericolo');
      fuori.push({ t: 'asciuga', testo: az.testo || 'L\'inchiostro asciuga.' });
    } else if (az.t === 'mossa') {
      st.attacco = { parabile: az.parabile !== false, conScheda: az.conScheda || null, testo: az.testo || '' };
      fuori.push({ t: 'mossa', parabile: az.parabile !== false, conScheda: az.conScheda || null, testo: az.testo || '' });
    } else if (az.t === 'ricorda') {
      const persi = Mem.bruciaAutomatico(salva, 1);
      st.bruciate.push(...persi);
      scrivi(az.testo || 'Ti ricorda una cosa che avevi appena dimenticato.', 'pericolo');
      fuori.push({ t: 'ricorda', testo: az.testo || '', persi });
    }

    if (st.stordito > 0) st.stordito--;
    if (st.asciutto > 0) st.asciutto--;

    valutaFase();
    st.round++;
    st.mossa = null;
    st.fase = st.stordito > 0 ? 'stordito' : 'giocatore';
    return { azione: az, eventi: fuori };
  };

  st.azzera = () => { st.ansia = 0; st.mossa = null; st.attacco = null; st.parata = null; };
  st.annulla = () => { st.mossa = null; };

  /* Bordo e vernice: una riga da tracciare, mai in diagonale esatta. */
  st.generaContorno = (rng2 = rng) => {
    const ang = (rng2() - 0.5) * 1.0;                     // ±28° circa
    const len = LUNGHEZZA_PARATA * (0.9 + rng2() * 0.25);
    const cx = 0.34 + rng2() * 0.32;
    const cy = 0.22 + rng2() * 0.42;
    const hx = (Math.cos(ang) * len) / 2;
    const hy = (Math.sin(ang) * len) / 2;
    const dentro = (p) => p[0] > 0.07 && p[0] < 0.93 && p[1] > 0.1 && p[1] < 0.9;
    let da = [cx - hx, cy - hy];
    let a = [cx + hx, cy + hy];
    let tentativi = 0;
    while ((!dentro(da) || !dentro(a)) && tentativi++ < 24) {
      const nn = 0.3 + rng2() * 0.4;
      const nc = 0.22 + rng2() * 0.5;
      da = [nn, nc];
      a = [nn + Math.cos(ang) * len, nc + Math.sin(ang) * len];
    }
    return { da: da.map((v) => Math.max(0.06, Math.min(0.94, v))), a: a.map((v) => Math.max(0.06, Math.min(0.94, v))) };
  };

  return st;
}

window.PMFCombat = {
  nuovo, coincide,
  COSTI, MOLTI, GLIF, NOMI, NOTE,
  VALORE_TOTALE, INCHIOSTRO_PER_QUOTA, BONUS_VOLTO,
  ANSIA_MAX, ANSIA_PER_TURNO, SGORBIO_CHANCE, SGORBIO_CURA,
  FINESTRA_PARATA, CORDA_MIN, DRITTEZZA_MAX, TOLLERANZA, COPERTURA_PARATA,
  MEMORIE_PER_PARATA, LUNGHEZZA_PARATA,
};
})();