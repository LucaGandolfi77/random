/* app.js — l'orchestra. Vista, flusso, e il momento in cui il gioco parla.
 *
 * Qui non c'è nessuna regola: solo il modo in cui le regole di combat.js,
 * memoria.js, scena.js ed epitaffio.js diventano cose che il dito tocca.
 *
 * Tre decisioni che vengono da lontano e che vale la pena ricordare:
 *
 *  1. Il giocatore NON ha una barra di vita. L'unico contatore che scende è
 *     il numero di ricordi, in alto a destra. Tutto il resto della UI è
 *     decorazione: serve a far capire *perché* quel numero è sceso.
 *
 *  2. Ogni schermata di testo si può saltare con un tocco. Nessuno è obbligato
 *     a guardare una schermata due volte, e chi gioca col dito in metro non
 *     ha tempo per le transizioni.
 *
 *  3. Il salvare è una funzione: si chiama dopo ogni cosa che conta. Se il
 *     telefono muore, si perde al massimo una frase.
 */
(function () {
'use strict';

const S = window.PMFSave;
const Mem = window.PMFMemoria;
const Epi = window.PMFEpitaffio;
const A = window.PMFAudio;
const Tela = window.PMFTela;
const Combat = window.PMFCombat;
const Nem = window.PMFNemici;
const Scena = window.PMFScena;

let storia = null;
let tela = null;
let C = null;
let scenaCorrente = null;
let battutaCorrente = 0;
let rng = Math.random;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

/* ── minuzie ─────────────────────────────────────────────── */

function avviso(testo, ms = 1800, male = false) {
  const el = $('#cb-avviso');
  if (!el) return;
  el.textContent = testo || '';
  el.classList.toggle('male', !!male);
  el.classList.toggle('visibile', !!testo);
  if (testo) setTimeout(() => el && el.classList.remove('visibile'), ms);
}

function istruzione(testo) {
  const el = $('#cb-istruzione');
  if (el) el.textContent = testo || '';
}

let toastTimer = 0;
function toast(testo, ms = 2600) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = testo;
  el.classList.add('visibile');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visibile'), ms);
}

function sr(testo) {
  const el = $('#sr-stato');
  if (el) el.textContent = testo;
}

function parla(testo) {
  if (!S.carica().impostazioni.narrazione) return;
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(Scena.semplifica(testo));
    u.lang = 'it-IT';
    u.rate = 0.92;
    u.pitch = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* la lettura ad alta voce è un extra, non un requisito */ }
}

/* ── viste ───────────────────────────────────────────────── */

const VISTE = ['copertina', 'atto', 'scena', 'combattimento', 'finale', 'quaderno'];
let vistaCorrente = 'copertina';
let vistaPrecedente = 'copertina';

function vai(nome, { ricorda = true } = {}) {
  if (!VISTE.includes(nome)) nome = 'copertina';
  if (ricorda && nome !== vistaCorrente && vistaCorrente) vistaPrecedente = vistaCorrente;
  for (const v of VISTE) {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('attiva', v === nome);
  }
  vistaCorrente = nome;
  if (nome !== 'combattimento' && tela) { tela.attiva(false); tela.spegni(); }
  if (nome === 'atto') disegnaAtto();
  if (nome === 'quaderno') disegnaQuaderno();
  if (nome === 'copertina') disegnaCopertina();
  window.scrollTo(0, 0);
}

/* ── atto ────────────────────────────────────────────────── */

const attoDi = (i) => storia.atti.find((a) => a.ordine === i) || storia.atti[0];

function disegnaAtto() {
  const s = S.carica();
  const atto = attoDi(s.atto);
  const nodi = Scena.nodi(atto);
  $('#atto-titolo').textContent = `${titoloAtto(atto)} · ${atto.titolo}`;
  $('#atto-epigrafe').textContent = atto.epigrafe;
  $('#atto-premessa').textContent = atto.premessa;
  $('#atto-memorie').textContent = `${Mem.quante(s)} memorie`;

  const ul = $('#atto-stanze');
  ul.innerHTML = '';
  nodi.forEach((n, i) => {
    const li = document.createElement('li');
    if (i < s.stanza) li.className = 'fatto';
    if (i === s.stanza) li.className = 'prossimo';
    const num = document.createElement('span');
    num.className = 'n';
    num.textContent = String(i + 1).padStart(2, '0');
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = n.tipo === 'tela'
      ? `La tela — ${(Nem.per(n.id) || {}).nome || ''}`
      : (n.scena.battute[0].chi ? `${n.scena.battute[0].chi}: ${n.scena.battute[0].testo.split('\n')[0].slice(0, 34)}…` : n.scena.battute[0].testo.split('\n')[0].slice(0, 34) + '…');
    const st = document.createElement('span');
    st.className = 'st';
    st.textContent = i < s.stanza ? 'fatto' : n.tipo === 'tela' ? 'dipingi' : 'leggi';
    li.append(num, t, st);
    ul.appendChild(li);
  });

  const btn = $('#btn-prosegui');
  const n = nodi[s.stanza];
  btn.textContent = !n ? 'Vai avanti' : n.tipo === 'tela' ? 'Prendi il pennello' : 'Leggi';
  btn.disabled = false;

  /* Due faccine in fondo all'atto: rileggere un ricordo, e rammendare.
   * Si svuota il contenitore invece di sostituirlo: rimpiazzare il nodo a ogni
   * disegno ricreerebbe i pulsanti e perderebbe il focus del dito. */
  const extra = $('#atto-strumenti');
  extra.innerHTML = '';

  const bAscolto = document.createElement('button');
  bAscolto.type = 'button';
  bAscolto.className = 'fantasma piccolo largo';
  bAscolto.textContent = '✧  Ascolta un ricordo';
  bAscolto.disabled = Mem.quante(s) === 0;
  if (bAscolto.disabled) bAscolto.title = 'Non ti resta niente da ascoltare.';
  bAscolto.addEventListener('click', ascoltaUnRicordo);
  extra.appendChild(bAscolto);

  const ram = Scena.rammendoPossibile(s, storia.schede, atto.id);
  const bRam = document.createElement('button');
  bRam.type = 'button';
  bRam.className = 'fantasma piccolo largo';
  bRam.textContent = '✚  Rammenda';
  bRam.disabled = !ram.ok;
  bRam.title = ram.ok
    ? 'Brucia il ricordo più fresco per riacquistare il più vecchio. Una volta per atto.'
    : ram.motivo;
  bRam.addEventListener('click', chiediRammendo);
  extra.appendChild(bRam);
}

function titoloAtto(atto) {
  return ['Prologo', 'Atto primo', 'Atto secondo', 'Atto terzo', 'Atto quarto', 'Atto quinto'][atto.ordine] || 'Atto';
}

function prosegui() {
  const s = S.carica();
  const atto = attoDi(s.atto);
  const nodi = Scena.nodi(atto);
  const n = nodi[s.stanza];
  if (!n) { fineAtto(); return; }
  if (n.tipo === 'tela') iniziaTela(n.id);
  else apriScena(n.scena, n.fase);
}

function avanti() {
  const s = S.carica();
  s.stanza++;
  S.scrivi(s);
  const atto = attoDi(s.atto);
  const nodi = Scena.nodi(atto);
  if (s.stanza >= nodi.length) fineAtto();
  else vai('atto');
}

/* ── fine atto ───────────────────────────────────────────── */

function fineAtto() {
  const s = S.carica();
  const atto = attoDi(s.atto);
  const nuovi = Scena.frammentiDisponibili(s, storia.schede, atto);
  for (const fr of nuovi) {
    if (!s.frammenti.includes(fr)) s.frammenti.push(fr);
    toast(`✦ ${storia.frammenti[fr] || fr}`);
  }
  if (nuovi.length === 0 && atto.frammento !== undefined) {
    toast(`Ti restano meno di ${Scena.SOGLIA_FRAGMENTI} ricordi: lo schizzo è carta, non un cielo.`, 4200);
  }
  if (atto.finale) { vai('finale'); disegnaFinale(); return; }
  s.atto++;
  s.stanza = 0;
  S.scrivi(s);
  A.campana();
  vai('atto');
}

/* ── scena ───────────────────────────────────────────────── */

/* `da` serve a riprendere una scena a metà dopo un reload: senza, chi
 * chiude il telefono in fondo a una battuta e lo riapre deve rileggerla
 * tutta, e in un gioco sul lutto rileggere è diverso da riprendere. */
function apriScena(scena, fase, da = 0) {
  scenaCorrente = scena;
  battutaCorrente = Math.max(0, Math.min(da, scena.battute.length - 1));
  const s = S.carica();
  s.fase = 'scena';
  s.scenaCoda = { id: scena.id, fase, battuta: battutaCorrente };
  S.scrivi(s);
  vai('scena');
  mostraBattuta();
}

function mostraBattuta() {
  const scena = scenaCorrente;
  const b = scena.battute[battutaCorrente];
  /* ogni battuta viene salvata: se il telefono muore qui, si torna qui */
  const s = S.carica();
  if (s.scenaCoda && s.scenaCoda.id === scena.id) s.scenaCoda.battuta = battutaCorrente;
  S.scrivi(s);

  const chi = (b && b.chi) || scena.chi || '';
  $('#scena-chi').textContent = chi || '·';
  $('#scena-memorie').textContent = String(Mem.quante(S.carica()));
  $('#scena-scelte').innerHTML = '';
  $('#btn-scena-avanti').hidden = true;

  const testo = b ? b.testo : '';
  /* macchina da scrivere: si può toccare per arrivare subito alla fine */
  const el = $('#scena-texto');
  el.innerHTML = Scena.format(testo);
  parla(testo);

  const ultima = battutaCorrente >= scena.battute.length - 1;
  if (ultima) {
    if ((scena.dai || []).length) {
      for (const id of scena.dai) {
        if (!Mem.ha(S.carica(), id)) toast(`Ti torna: ${(storia.schede.find((d) => d.id === id) || {}).titolo || id}`, 3200);
        Mem.trova(S.carica(), id);
      }
      S.scrivi(S.carica());
    }
    if ((scena.scelte || []).length) disegnaScelte(scena.scelte);
    else $('#btn-scena-avanti').hidden = false;
  } else {
    $('#btn-scena-avanti').hidden = false;
  }
}

function disegnaScelte(scelte) {
  const box = $('#scena-scelte');
  box.innerHTML = '';
  const s = S.carica();
  for (const sc of scelte) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta';
    if ((sc.costa || []).some((id) => Mem.ha(s, id))) b.classList.add('costa');
    const t = document.createElement('span');
    t.textContent = sc.testo;
    b.appendChild(t);
    if (sc.nota) {
      const n = document.createElement('span');
      n.className = 'nota';
      n.textContent = sc.nota;
      b.appendChild(n);
    }
    b.addEventListener('click', () => prendiScelta(sc));
    box.appendChild(b);
  }
}

function prendiScelta(sc) {
  const s = S.carica();
  const r = Scena.applicaScelta(s, sc, storia.schede);
  S.scrivi(s);
  A.tick();
  const msg = r.messaggi.map((m) => m.testo).join(' ');
  if (msg) toast(msg, 4200);
  for (const m of r.messaggi) if (m.tipo === 'costo') A.brucia();
  if (r.trovate.length) A.scoperta();
  avanti();
}

/* ── la tela ─────────────────────────────────────────────── */

function iniziaTela(idNemico) {
  const nemico = Nem.per(idNemico);
  if (!nemico) { toast('Questa tela non esiste.'); vai('atto'); return; }
  const s = S.carica();
  if (!s.compinti.includes(idNemico) && s.atto === 0 && s.viste === 0) { /* primo avvio */ }

  vai('combattimento', { ricorda: false });
  const imp = s.impostazioni;
  tela.attiva(false);
  tela.impostaNemico(nemico);
  tela.impostaPennello(imp.pennello);
  tela.impostaLume(imp.lume);
  tela.impostaTinta(s.inchiostroAttivo || 'ada');
  tela.azzera();
  tela.attiva(true);
  tela.collega({ fine: onTratto });
  tela.accendi();

  C = Combat.nuovo({
    nemico,
    salva: s,
    defs: storia.schede,
    clock: () => performance.now(),
    rng,
  });
  s.fase = 'combattimento';
  s.frammento = idNemico;
  S.scrivi(s);

  $('#cb-nemico').textContent = nemico.nome;
  $('#cb-titolo').textContent = nemico.titolo || '';
  disegnaPalette();
  aggiornaHud();
  disegnaMenu();
  istruzione(nemico.tutorial ? 'traccia sopra la macchia: impari a sporcarti' : 'traccia sopra il ritratto');
  if (nemico.frasi && nemico.frasi[0]) toast(nemico.frasi[0], 4600);
  A.tasto();
}

function onTratto(tratto) {
  if (!C || C.finito) return;
  if (!C.mossa && !C.attacco) { istruzione('scegli prima cosa stai facendo'); return; }

  const evento = C.punto(tratto);

  if (evento.tipo === 'parata') {
    tela.chiudiContorno();
    const esito = evento.esito;
    if (esito.riuscita) A.parata(); else A.errore();
    if (esito.testo) toast(esito.testo, 3000);
    if (!esito.riuscita) tela.colpo();
    const misura = C.misura(tratto, tela);
    const r = C.applica(misura, tela);
    if (r && r.vittoria) return fineCombattimento(true);
    return fineTurno();
  }

  const misura = C.misura(tratto, tela);
  A.spazzola(evento.caratteristiche.forza);
  const r = C.applica(misura, tela);
  if (r && r.vittoria) return fineCombattimento(true);
  fineTurno();
}

function fineTurno() {
  aggiornaHud();
  disegnaMenu();
  if (!C || C.finito) return;
  setTimeout(() => {
    if (!C || C.finito) return;
    const r = C.turnoNemico();
    for (const e of r.eventi) {
      if (e.t === 'asciuga') { A.asciuga(); toast(e.testo, 2600, true); }
      else if (e.t === 'domanda') { e.salvata ? A.scoperta() : A.brucia(); toast(e.testo, 3400, !e.salvata); }
      else if (e.t === 'ricorda') { A.brucia(); tela.colpo(); toast(e.testo, 3400, true); }
      else if (e.t === 'mossa' && e.testo) toast(e.testo, 2400);
    }
    /* La parata si apre solo per gli attacchi che si possono parare:
     * se l'attacco è "non parabile", tocca al bottone Chiedi (o perdere). */
    if (C.attacco && C.attacco.parabile) {
      const { da, a } = C.generaContorno();
      C.apriParata(da, a, { conScheda: C.attacco.conScheda });
      tela.mostraContorno(da, a, { finestraMs: C.bonusFinestra });
      istruzione('TRACCIA LA RIGA');
    } else if (C.attacco) {
      istruzione('non si può parare: usa Chiedi, o brucia');
      A.errore();
    }
    aggiornaHud();
    disegnaMenu();
    if (C.finito) fineCombattimento(C.vittoria);
  }, 520);
}

function fineCombattimento(vittoria) {
  const s = S.carica();
  if (C) {
    s.statistiche.pennellate = (s.statistiche.pennellate || 0) + 1;
    s.statistiche.parate = (s.statistiche.parate || 0) + C.contatoreParate;
    s.statistiche.bruciate = (s.statistiche.bruciate || 0) + C.bruciate.length;
    if (vittoria && !s.compinti.includes(C.nemico.id)) s.compinti.push(C.nemico.id);
  }
  S.scrivi(s);
  tela.attiva(false);
  tela.chiudiContorno();
  tela.spegni();
  if (!vittoria) {
    A.finale();
    vai('finale');
    disegnaFinale();
    return;
  }
  A.campana();
  avanti();
}

function aggiornaHud() {
  if (!C) return;
  const s = S.carica();
  $('#cb-resto').textContent = `${Math.ceil(C.vita)}%`;
  $('#cb-inchiostro').style.width = `${Math.max(0, Math.min(100, (C.inchiostro / 45) * 100))}%`;
  $('#cb-inchiostro-n').textContent = String(Math.floor(C.inchiostro));
  $('#cb-memorie').textContent = String(Mem.quante(s));
  $('#atto-memorie') && ($('#atto-memorie').textContent = `${Mem.quante(s)} memorie`);
  const ansia = C.ansia / Combat.ANSIA_MAX;
  tela.impostaAnsia(ansia);
  const pips = $('#cb-ansia');
  pips.innerHTML = '';
  for (let i = 0; i < Combat.ANSIA_MAX; i++) {
    const el = document.createElement('i');
    if (ansia * Combat.ANSIA_MAX > i + 0.98) el.className = 'pieno';
    else if (ansia * Combat.ANSIA_MAX > i) el.className = 'on';
    pips.appendChild(el);
  }
  pips.setAttribute('aria-label', `ansia ${Math.round(ansia * Combat.ANSIA_MAX)} su ${Combat.ANSIA_MAX}`);
  const it = $('#cb-intento');
  if (C.intentoVisibile() && !C.finito) {
    it.hidden = false;
    it.textContent = `sta per: ${C.intento()}`;
  } else {
    it.hidden = true;
  }
}

function disegnaMenu() {
  const box = $('#cb-menu');
  if (!C) return;
  box.innerHTML = '';
  for (const m of C.mosseDisponibili()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mossa';
    if (m.pericolo) b.classList.add('pericolo');
    const g = document.createElement('span');
    g.className = 'glifo';
    g.textContent = m.glifo;
    const n = document.createElement('span');
    n.textContent = m.nome;
    const c = document.createElement('span');
    c.className = 'costo';
    c.textContent = m.bloccata ? '—' : (m.costo ? `${m.costo} inchiostro` : 'gratis');
    b.append(g, n, c);
    b.disabled = !!m.bloccata;
    if (m.bloccata) b.title = m.motivo;
    else b.setAttribute('aria-description', m.nota);
    b.addEventListener('click', () => scegliMossa(m));
    box.appendChild(b);
  }
}

function scegliMossa(m) {
  A.tick();
  if (m.bloccata) { toast(m.motivo, 2400); return; }
  if (m.id === 'chiedi') {
    const r = C.scegli('chiedi');
    if (!r.ok) { toast(r.motivo, 2200); return; }
    aggiornaHud();
    disegnaMenu();
    return fineTurno();
  }
  if (m.id === 'inchiostro') {
    apriSceltaSchede(C.nemico, 2, (ids) => {
      const r = C.scegliMemorie(ids);
      if (!r.ok) { toast(r.motivo, 2200); disegnaMenu(); return; }
      A.brucia();
      istruzione('ORA DIPINGI, E NON GUARDARE');
      aggiornaHud();
      disegnaMenu();
    });
    return;
  }
  const r = C.scegli(m.id);
  if (!r.ok) { toast(r.motivo, 2200); return; }
  istruzione(m.id === 'lavora' ? 'piano, e non alzare il pennello' : 'traccia sopra il ritratto');
  disegnaMenu();
}

function disegnaPalette() {
  const box = $('#cb-palette');
  box.innerHTML = '';
  const s = S.carica();
  for (const k of ['ada', 'tecla', 'ansi', 'brizio']) {
    const t = Nem.TINTE[k];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tinta' + ((s.inchiostroAttivo || 'ada') === k ? ' attiva' : '');
    b.setAttribute('aria-pressed', String((s.inchiostroAttivo || 'ada') === k));
    const i = document.createElement('i');
    i.style.background = t.colore;
    const lab = document.createElement('span');
    lab.textContent = t.nome;
    b.append(i, lab);
    b.title = t.nota;
    b.addEventListener('click', () => {
      s.inchiostroAttivo = k;
      S.scrivi(s);
      tela.impostaTinta(k);
      disegnaPalette();
      A.tick();
    });
    box.appendChild(b);
  }
}

/* ── overlay: che cosa brucio ────────────────────────────── */

let schedeOverlay = null;

function apriSceltaSchede(salva, n, fatto) {
  const s = salva;
  const carte = Mem.schede(storia.schede, s);
  if (carte.length <= n) {
    toast('Non ti restano abbastanza ricordi per fare questo.', 3000);
    return;
  }
  const scelte = [];
  const pool = carte.slice(0, Math.min(carte.length, 9));
  const box = $('#overlay-schede-lista');
  box.innerHTML = '';
  for (const c of pool) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta-scheda';
    const t = document.createElement('span');
    const ti = document.createElement('b');
    ti.textContent = c.titolo;
    const ve = document.createElement('span');
    ve.textContent = c.versi.join(' ');
    t.append(ti, ve);
    b.appendChild(t);
    const scelta = () => {
      if (scelte.includes(c.id)) scelte.splice(scelte.indexOf(c.id), 1);
      else if (scelte.length < n) scelte.push(c.id);
      else { scelte.shift(); scelte.push(c.id); }
      disegnaSceltaSchede(scelte, n, box, pool);
    };
    b.addEventListener('click', scelta);
    box.appendChild(b);
  }
  schedeOverlay = { scelte, n, fatto };
  $('#overlay-schede-tit').textContent = n === 2 ? 'Cosa bruci?' : 'Cosa bruci?';
  $('#overlay-schede').hidden = false;
  disegnaSceltaSchede(scelte, n, box, pool);
}

function disegnaSceltaSchede(scelte, n, box, pool) {
  Array.prototype.forEach.call(box.children, (b, i) => {
    const on = scelte.includes(pool[i].id);
    b.classList.toggle('sel', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const ok = $('#overlay-schede-annulla');
  ok.textContent = scelte.length === n ? 'Brucia, e non torni' : `Scegline ${n - scelte.length}`;
  ok.disabled = scelte.length !== n;
  ok.onclick = () => {
    if (scelte.length !== n) return;
    const f = schedeOverlay.fatto;
    const sc = scelte.slice();
    $('#overlay-schede').hidden = true;
    schedeOverlay = null;
    f(sc);
  };
}

/* ── finale ed epitaffio ─────────────────────────────────── */

function disegnaFinale() {
  const s = S.carica();
  const conFrammenti = s.frammenti.length >= 4;
  const fin = Mem.finalePer(s, { conFrammenti });
  const def = storia.finali[fin.chiave] || storia.finali.calore;

  const tenute = Mem.schede(storia.schede, s);
  const bruciate = Mem.schedeBruciate(storia.schede, s);
  const epi = Epi.componi({ tenute, bruciate, finale: fin.chiave, frammenti: s.frammenti.length, rng });

  if (!s.epitafi.some((x) => x.finale === fin.chiave && x.testo === epi.righe.join('\n'))) {
    s.epitafi.push({ finale: fin.chiave, nome: fin.nome, testo: epi.righe.join('\n') });
    if (s.epitafi.length > 12) s.epitafi.shift();
  }
  s.finale = fin.chiave;
  s.fase = 'finale';
  S.scrivi(s);

  const box = $('#finale-interno');
  box.innerHTML = '';
  $('#finale-nome').textContent = def.nome;
  $('#finale-memorie').textContent = `${Mem.quante(s)} ricordi · ${s.frammenti.length}/4 schizzi`;

  box.appendChild(quadro(def.quadro));

  const h = document.createElement('p');
  h.className = 'occhiello';
  h.style.textAlign = 'left';
  h.textContent = def.condizione;
  box.appendChild(h);

  for (const riga of def.righe) {
    const p = document.createElement('p');
    p.className = 'finale-testo';
    p.innerHTML = Scena.format(riga);
    box.appendChild(p);
  }

  const umori = document.createElement('div');
  umori.className = 'finale-umori';
  umori.innerHTML = `<h3>Il tuo epitaffio</h3><p>${Scena.format(epi.righe.join('\n\n'))}</p>`;
  box.appendChild(umori);

  const sotto = document.createElement('p');
  sotto.className = 'finale-testo';
  sotto.innerHTML = Scena.format(def.sotto);
  box.appendChild(sotto);

  if (s.frammenti.length < 4) {
    const p = document.createElement('p');
    p.className = 'finale-testo tenue';
    p.textContent = `Ti restano ${s.frammenti.length} schizzi di cielo su quattro. Gli altri li hai persi insieme a tutto il resto: sotto gli ${Scena.SOGLIA_FRAGMENTI} ricordi non si riconosce un cielo.`;
    box.appendChild(p);
  }

  const az = document.createElement('div');
  az.className = 'finale-azioni';
  for (const a of def.azioni || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fantasma';
    b.textContent = a.testo;
    b.addEventListener('click', () => {
      if (a.id === 'quaderno' || a.id === 'torna') vai('quaderno');
      else nuovaPartita();
    });
    az.appendChild(b);
  }
  box.appendChild(az);

  A.finale();
  parla(epi.righe[0]);
}

/* Il quadro del finale. Nessun asset: quattro quadrati di colore e una
 * cornice. Non è un'immagine, è un diagramma di quello che è successo. */
function quadro(tipo) {
  const c = document.createElement('canvas');
  c.className = 'finale-insieme';
  c.width = 480; c.height = 320;
  const x = c.getContext('2d');
  const bg = '#17140f';
  x.fillStyle = bg;
  x.fillRect(0, 0, 480, 320);
  x.strokeStyle = '#2b251f';
  x.lineWidth = 2;
  x.strokeRect(24, 24, 432, 272);

  const cielo = (da, a, col) => {
    const g = x.createLinearGradient(0, da, 0, a);
    g.addColorStop(0, col[0]);
    g.addColorStop(1, col[1]);
    x.fillStyle = g;
    x.fillRect(26, da, 428, a - da);
  };

  if (tipo === 'studio-pieno') {
    cielo(26, 296, ['#2a3a46', '#c9a76a']);
    x.fillStyle = 'rgba(232,220,196,.9)';
    x.fillRect(150, 170, 46, 46);
    x.strokeStyle = '#c9a76a';
    x.lineWidth = 3;
    x.strokeRect(150, 170, 46, 46);
    x.beginPath();
    x.moveTo(176, 216);
    x.lineTo(176, 296);
    x.stroke();
  } else if (tipo === 'studio-vuoto') {
    cielo(26, 296, ['#241f1b', '#5d4c3c']);
    x.strokeStyle = '#4a4038';
    x.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      x.moveTo(40 + i * 48, 30);
      x.lineTo(60 + i * 48, 290);
      x.stroke();
    }
  } else if (tipo === 'vuoto') {
    x.fillStyle = '#e2d8c3';
    x.fillRect(26, 26, 428, 270);
    x.fillStyle = '#2a2320';
    x.fillRect(26, 200, 428, 96);
  } else if (tipo === 'cenere') {
    cielo(26, 296, ['#100e0d', '#241f1b']);
    x.fillStyle = 'rgba(120,110,98,.35)';
    for (let i = 0; i < 240; i++) {
      const px = 30 + ((i * 7919) % 420);
      const py = 30 + ((i * 6271) % 260);
      x.fillRect(px, py, 2, 2);
    }
    x.strokeStyle = '#4a4038';
    x.lineWidth = 3;
    x.strokeRect(60, 60, 360, 200);
  } else {
    x.fillStyle = '#1c1917';
    x.fillRect(26, 26, 428, 270);
  }
  return c;
}

/* ── il Quaderno ─────────────────────────────────────────── */

let filtroQuaderno = 'tutte';

function disegnaQuaderno() {
  const s = S.carica();
  const tenute = Mem.schede(storia.schede, s, filtroQuaderno === 'tutte' ? null : filtroQuaderno);
  const bruciate = Mem.schedeBruciate(storia.schede, s);
  $('#quaderno-conto').textContent = `${Mem.quante(s)} / ${storia.schede.length}`;

  const f = $('#quaderno-filtri');
  f.innerHTML = '';
  const persone = Mem.persone(storia.schede, s);
  const opzioni = [['tutte', 'tutte']].concat(Array.from(persone.keys()).map((k) => [k, Epi.NOME_PERSONA[k] || k]));
  for (const [k, lab] of opzioni) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro' + (filtroQuaderno === k ? ' attivo' : '');
    b.textContent = lab;
    b.addEventListener('click', () => { filtroQuaderno = k; disegnaQuaderno(); });
    f.appendChild(b);
  }

  const box = $('#quaderno-schede');
  box.innerHTML = '';
  if (!tenute.length) {
    const p = document.createElement('p');
    p.className = 'premessa';
    p.textContent = 'Non ti resta niente. C\'è un Quaderno vuoto, che è la cosa più triste che esista.';
    box.appendChild(p);
  }
  for (const c of tenute) {
    box.appendChild(scheda(c, false));
  }

  const b2 = $('#quaderno-bruciate');
  b2.innerHTML = '';
  if (!bruciate.length) return;
  const h = document.createElement('p');
  h.className = 'occhiello';
  h.style.textAlign = 'left';
  h.textContent = 'bordi scottati';
  b2.appendChild(h);
  const griglia = document.createElement('div');
  griglia.className = 'griglia-bruciate';
  for (const c of bruciate) {
    const d = document.createElement('span');
    d.className = 'cenere';
    d.textContent = c.titolo;
    griglia.appendChild(d);
  }
  b2.appendChild(griglia);
}

function scheda(c, bruciata) {
  const d = document.createElement('article');
  d.className = 'scheda' + (bruciata ? ' brciata' : '');
  const h = document.createElement('h4');
  h.textContent = c.titolo;
  const p = document.createElement('p');
  p.textContent = c.versi.join(' ');
  d.append(h, p);
  const eff = [];
  if ((c.chiavi || []).length) {
    const NOME = { lavora: 'Lavora', inchiostro: 'Inchiostro', parla: 'Chiedi', parata: 'Parata più lunga', vedere: 'Vedi le mosse', dono: 'Un ricordo per atto', fuga: 'Rammendo libero', nudo: 'Più danno', lente: 'Resisti all\'asciugatura' };
    eff.push((c.chiavi || []).map((k) => NOME[k] || k).join(' · '));
  }
  if (c.valori && c.valori.danno) eff.push(`+${Math.round(c.valori.danno * 100)}% pennellata`);
  if (eff.length) {
    const e = document.createElement('span');
    e.className = 'effetto';
    e.textContent = eff.join(' · ');
    d.appendChild(e);
  }
  return d;
}

/* ── ascolto e rammendo ──────────────────────────────────── */

function ascoltaUnRicordo() {
  const s = S.carica();
  const c = Scena.ascolto(s, storia.schede, rng);
  if (!c) { toast('Non ti resta niente da ascoltare.'); return; }
  toast(`${c.titolo} — ${c.versi.join(' ')}`, 9000);
  parla(c.versi.join(' '));
  A.scoperta();
}

function chiediRammendo() {
  const s = S.carica();
  const r = Scena.rammendoPossibile(s, storia.schede, attoDi(s.atto).id);
  if (!r.ok) { toast(r.motivo, 3000); return; }
  apriSceltaSchede(s, 1, (ids) => {
    const esito = Scena.rammendo(s, storia.schede, attoDi(s.atto).id, ids[0]);
    S.scrivi(s);
    if (!esito.ok) { toast(esito.motivo, 2600); return; }
    A.brucia();
    setTimeout(A.scoperta, 400);
    toast(esito.testo, 5200);
    disegnaAtto();
  });
}

/* ── copertina, nuova partita ────────────────────────────── */

function disegnaCopertina() {
  const s = S.carica();
  $('#crediti-memorie').textContent = String(storia.schede.length);
  const b = $('#btn-continua');
  const inCorso = s.fase !== 'copertina';
  b.disabled = !inCorso;
  b.textContent = inCorso ? `Continua · ${titoloAtto(attoDi(s.atto))}` : 'Comincia';
}

function nuovaPartita() {
  const s = S.nuovaPartita(storia.schede);
  s.viste = 1;
  s.fase = 'atto';
  s.scenaCoda = null;
  s.frammento = null;
  S.scrivi(s);
  C = null;
  scenaCorrente = null;
  battutaCorrente = 0;
  rng = Math.random;
  A.campana();
  vai('atto');
}

/**
 * Riprende la partita esattamente dove era. L'ordine dei controlli è quello
 * in cui il gioco si trova: prima la schermata finale (è la fine, e da lì si
 * può tornare indietro), poi la scena a metà, poi la tela, e infine l'atto.
 */
function continua() {
  const s = S.carica();

  if (s.finale || s.fase === 'finale') { vai('finale'); disegnaFinale(); return; }

  const atto = attoDi(s.atto);
  const nodo = Scena.nodi(atto)[s.stanza];

  if (s.fase === 'scena' && s.scenaCoda && nodo && nodo.id === s.scenaCoda.id) {
    apriScena(nodo.scena, nodo.fase, s.scenaCoda.battuta || 0);
    return;
  }

  if (s.fase === 'combattimento' && nodo && nodo.tipo === 'tela') {
    iniziaTela(nodo.id);
    return;
  }

  vai('atto');
}

/* ── impostazioni ────────────────────────────────────────── */

function applicaImpostazioni() {
  const imp = S.carica().impostazioni;
  document.body.dataset.mano = imp.mano || 'destra';
  document.body.classList.toggle('meno-veloce', !!imp.menoVeloce);
  const q = (sel, v) => { const el = $(sel); if (el) el.checked = !!v; };
  q('#opt-suono', imp.suono);
  q('#opt-narrazione', imp.narrazione);
  q('#opt-meno-veloce', imp.menoVeloce);
  for (const b of $$('[data-mano]')) b.classList.toggle('attivo', b.dataset.mano === imp.mano);
  for (const b of $$('[data-pennello]')) b.classList.toggle('attivo', b.dataset.pennello === imp.pennello);
  for (const b of $$('[data-lume]')) b.classList.toggle('attivo', b.dataset.lume === imp.lume);
  if (tela) {
    tela.impostaPennello(imp.pennello);
    tela.impostaLume(imp.lume);
  }
}

function collegaImpostazioni() {
  const suono = $('#opt-suono');
  suono.addEventListener('change', () => { S.imposta('suono', suono.checked); if (suono.checked) A.tasto(); });
  const nar = $('#opt-narrazione');
  nar.addEventListener('change', () => { S.imposta('narrazione', nar.checked); if (nar.checked) parla('Si legge ad alta voce.'); else { try { window.speechSynthesis.cancel(); } catch {} } });
  const mv = $('#opt-meno-veloce');
  mv.addEventListener('change', () => { S.imposta('menoVeloce', mv.checked); applicaImpostazioni(); });
  for (const b of $$('[data-mano]')) {
    b.addEventListener('click', () => { S.imposta('mano', b.dataset.mano); applicaImpostazioni(); A.tick(); });
  }
  for (const b of $$('[data-pennello]')) {
    b.addEventListener('click', () => { S.imposta('pennello', b.dataset.pennello); applicaImpostazioni(); A.tick(); });
  }
  for (const b of $$('[data-lume]')) {
    b.addEventListener('click', () => { S.imposta('lume', b.dataset.lume); applicaImpostazioni(); A.tick(); });
  }
}

/* ── sfondo animato della copertina ──────────────────────── */

function fondo() {
  const c = $('#fondo');
  if (!c) return;
  const x = c.getContext('2d');
  let t = 0;
  let vivo = true;
  const punti = [];
  for (let i = 0; i < 46; i++) {
    punti.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 2.2, v: 0.00012 + Math.random() * 0.0004 });
  }
  const disegna = () => {
    if (!vivo) return;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    x.clearRect(0, 0, c.width, c.height);
    t += 1;
    for (const p of punti) {
      p.y -= p.v * dpr * 16;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      const a = 0.05 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.013 + p.x * 9));
      x.fillStyle = `rgba(201,167,106,${a})`;
      x.beginPath();
      x.arc(p.x * c.width, p.y * c.height, p.r * dpr, 0, Math.PI * 2);
      x.fill();
    }
    requestAnimationFrame(disegna);
  };
  disegna();
  return () => { vivo = false; };
}

/* ── avvio ───────────────────────────────────────────────── */

async function avvia() {
  tela = Tela.nuovo($('#cb-tela'), $('#cb-effetti'));

  try {
    const res = await fetch('data/story.json', { cache: 'no-cache' });
    storia = await res.json();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:3rem;max-width:34rem;margin:auto;font:400 17px/1.6 Georgia,serif;color:#cfc4b4">
      <h1 style="font-style:italic;color:#e8dcc8">Non riesco a leggere i testi.</h1>
      <p>Questo gioco ha bisogno di un piccolo server, non di un file aperto con due dita.
      Nella cartella esegui <code>node serve.js</code> e apri <code>http://localhost:4173</code>.</p>
      <p style="color:#8d8275;font-size:.85em">Motivo: ${Scena.escapeHtml(String(err && err.message || err))}</p></div>`;
    return;
  }

  applicaImpostazioni();
  collegaImpostazioni();

  /* pulsanti */
  $('#btn-prosegui').addEventListener('click', () => { A.tick(); prosegui(); });
  $('#btn-scena-avanti').addEventListener('click', () => {
    A.tick();
    if (!scenaCorrente) return;
    if (battutaCorrente >= scenaCorrente.battute.length - 1) { avanti(); return; }
    battutaCorrente++;
    mostraBattuta();
  });
  $('#btn-scena-quit').addEventListener('click', () => { A.tick(); vai('atto'); });
  $('#btn-atto-home').addEventListener('click', () => { A.tick(); vai('copertina'); });
  $('#btn-finale-home').addEventListener('click', () => { A.tick(); vai('copertina'); });
  $('#btn-continua').addEventListener('click', () => { A.tick(); continua(); });
  $('#btn-nuova').addEventListener('click', () => { A.tick(); nuovaPartita(); });
  $('#btn-quaderno-home').addEventListener('click', () => { A.tick(); vai('quaderno'); });
  $('#btn-quaderno-indietro').addEventListener('click', () => { A.tick(); vai(vistaPrecedente === 'quaderno' ? 'atto' : vistaPrecedente); });
  $('#btn-cb-quaderno').addEventListener('click', () => { A.tick(); vai('quaderno'); });
  $('#btn-impostazioni').addEventListener('click', () => { A.tick(); $('#overlay-impostazioni').hidden = false; });
  $('#overlay-imp-chiudi').addEventListener('click', () => { A.tick(); $('#overlay-impostazioni').hidden = true; });
  $('#overlay-schede-annulla').addEventListener('click', () => {
    if ($('#overlay-schede-annulla').disabled) return;
    $('#overlay-schede').hidden = true;
  });
  $('#btn-cancella').addEventListener('click', () => {
    if (!confirm('Cancellare tutto? Il Quaderno si riempie di nuovo, ma gli epitaffi letti restano.')) return;
    S.cancella();
    $('#overlay-impostazioni').hidden = true;
    C = null;
    vai('copertina');
  });

  /* la copertina del Quaderno, se il Quaderno è vuoto, è una tristezza */
  $('#btn-installa').addEventListener('click', () => {
    const st = window.PMFPWA && window.PMFPWA.installa;
    if (st) st();
  });

  /* il tocco sul testo lo porta subito alla fine: nessuno legge due volte */
  $('#scena-texto').addEventListener('click', () => {
    A.tick();
    if (!scenaCorrente) return;
    if (battutaCorrente >= scenaCorrente.battute.length - 1) avanti();
    else { battutaCorrente++; mostraBattuta(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const id of ['#overlay-impostazioni', '#overlay-schede']) {
        const el = $(id);
        if (el && !el.hidden) { el.hidden = true; return; }
      }
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (vistaCorrente === 'scena') { e.preventDefault(); $('#btn-scena-avanti').click(); }
      else if (vistaCorrente === 'atto') { e.preventDefault(); prosegui(); }
    }
  });

  /* il telefono cambia idea: il canvas va rimisurato, l'audio sospeso */
  addEventListener('resize', () => { if (tela) tela.ridimensiona(); });
  addEventListener('orientationchange', () => setTimeout(() => tela && tela.ridimensiona(), 300));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      try { window.speechSynthesis.cancel(); } catch {}
      if (vistaCorrente === 'combattimento' && C) S.scrivi(S.carica());
    }
    if (tela && vistaCorrente === 'combattimento') {
      if (document.visibilityState === 'visible') { tela.ridimensiona(); tela.accendi(); }
      else tela.spegni();
    }
  });

  fondo();
  vai('copertina', { ricorda: false });
  applicaImpostazioni();
  document.documentElement.dataset.pronto = '1';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();

window.PMFApp = { vai, toast, avviso, storia: () => storia, stato: () => ({ C, vistaCorrente }) };
})();