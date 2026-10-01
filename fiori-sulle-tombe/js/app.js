/* app.js — l'orchestra. Vista, flusso, e il momento in cui il gioco parla.
 *
 * Qui non c'è nessuna regola: solo il modo in cui le regole di dono.js,
 * memoria.js, scena.js ed epitaffio.js diventano cose che il dito tocca.
 *
 * Quattro decisioni che vengono da lontano e che vale la pena ricordare:
 *
 *  1. Il giocatore NON ha una barra di vita. Ha due numeri e sono entrambi
 *     suoi: la `spesa` del vaso, che scende, e il tuo `speso`, che sale. E
 *     tutti gli altri numeri della UI servono a far capire *perché* uno dei
 *     due è cambiato.
 *
 *  2. Ogni schermata di testo si può saltare con un tocco. Nessuno è obbligato
 *     a guardare una schermata due volte, e chi gioca col dito in metro non
 *     ha tempo per le transizioni.
 *
 *  3. Il salvare è una funzione: si chiama dopo ogni cosa che conta. Se il
 *     telefono muore, si perde al massimo una frase.
 *
 *  4. Una scelta che scrive un flag che nessuno legge è un turno sprecato. Il
 *     gate di `tools/check.mjs` lo rende impossibile: ogni flag scritto deve
 *     essere letto da almeno una battuta, un'azione o un finale.
 */
(function () {
'use strict';

const S = window.FSTSave;
const Mem = window.FSTMemoria;
const Epi = window.FSTEpitaffio;
const A = window.FSTAudio;
const Orto = window.FSTOrto;
const Dono = window.FSTDono;
const Vasi = window.FSTVasi;
const Scena = window.FSTScena;

let storia = null;
let orto = null;
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
  toastTimer = setTimeout(() => el && el.classList.remove('visibile'), ms);
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

const VISTE = ['copertina', 'atto', 'scena', 'combattimento', 'finale', 'mazzetto', 'cast'];
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
  if (nome !== 'combattimento' && orto) { orto.attiva(false); orto.spegni(); }
  if (nome === 'atto') disegnaAtto();
  if (nome === 'mazzetto') disegnaMazzetto();
  if (nome === 'cast') disegnaCast();
  if (nome === 'copertina') disegnaCopertina();
  window.scrollTo(0, 0);
}

/* ── atto ────────────────────────────────────────────────── */

const attoDi = (i) => storia.atti.find((a) => a.ordine === i) || storia.atti[0];

function statoDiPersona(persona) {
  return Mem.statoDi(S.carica(), storia.schede, persona);
}

function disegnaAtto() {
  const s = S.carica();
  const atto = attoDi(s.atto);
  const nodi = Scena.nodi(atto);
  $('#atto-titolo').textContent = `${titoloAtto(atto)} · ${atto.titolo}`;
  $('#atto-epigrafe').textContent = atto.epigrafe;
  $('#atto-premessa').textContent = atto.premessa;
  $('#atto-memorie').textContent = `${Mem.quante(s)} ricordi`;
  const pet = $('#atto-petali');
  if (pet) pet.textContent = `${Mem.petali(s)}/6 petali`;

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
    /* Le battute filtrate dai flag: un atto è due atti diversi a seconda di
     * quello che hai scelto, e la lista deve dirlo. */
    const b = (Scena.battuteVisibili(n.scena, s) || [])[0];
    t.textContent = n.tipo === 'orto'
      ? `L'orto — ${(Vasi.per(n.id) || {}).nome || ''}`
      : (b ? (b.chi ? `${b.chi}: ${b.testo.split('\n')[0].slice(0, 34)}…` : b.testo.split('\n')[0].slice(0, 34) + '…') : 'una scena che non ti tocca');
    const st = document.createElement('span');
    st.className = 'st';
    st.textContent = i < s.stanza ? 'fatto' : n.tipo === 'orto' ? 'semina' : 'leggi';
    li.append(num, t, st);
    ul.appendChild(li);
  });

  const btn = $('#btn-prosegui');
  const n = nodi[s.stanza];
  btn.textContent = !n ? 'Vai avanti' : n.tipo === 'orto' ? 'Prendi la mano' : 'Leggi';
  btn.disabled = false;

  /* Due faccine in fondo all'atto: rileggere un ricordo, e rinnovarlo.
   * Si svuota il contenitore invece di sostituirlo: rimpiazzare il nodo a ogni
   * disegno ricreerebbe i pulsanti e perderebbe il focus del dito. */
  const extra = $('#atto-strumenti');
  extra.innerHTML = '';

  const bAnnusa = document.createElement('button');
  bAnnusa.type = 'button';
  bAnnusa.className = 'fantasma piccolo largo';
  bAnnusa.textContent = '✧  Annusa un ricordo';
  bAnnusa.disabled = Mem.quante(s) === 0;
  if (bAnnusa.disabled) bAnnusa.title = 'Non ti resta niente da annusare.';
  bAnnusa.addEventListener('click', annusaUnRicordo);
  extra.appendChild(bAnnusa);

  const bCast = document.createElement('button');
  bCast.type = 'button';
  bCast.className = 'fantasma piccolo largo';
  bCast.textContent = '◈  Il Cast';
  bCast.title = 'Sette persone, e che cosa hai fatto di ognuna.';
  bCast.addEventListener('click', () => vai('cast'));
  extra.appendChild(bCast);

  const rin = Scena.rinnovoPossibile(s, storia.schede, atto.id);
  const bRin = document.createElement('button');
  bRin.type = 'button';
  bRin.className = 'fantasma piccolo largo';
  bRin.textContent = '✚  Rinnova';
  bRin.disabled = !rin.ok;
  bRin.title = rin.ok
    ? 'Dà il ricordo più fresco per riacquistare il più vecchio. Una volta per atto.'
    : rin.motivo;
  bRin.addEventListener('click', chiediRinnovo);
  extra.appendChild(bRin);
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
  if (n.tipo === 'orto') iniziaOrto(n.id);
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
  const s = S.carica();
  const quante = Scena.battuteVisibili(scena, s);
  if (!quante.length) { avanti(); return; }
  battutaCorrente = Math.max(0, Math.min(da, quante.length - 1));
  s.fase = 'scena';
  s.scenaCoda = { id: scena.id, fase, battuta: battutaCorrente };
  S.scrivi(s);
  vai('scena');
  mostraBattuta();
}

function battuteDiAdesso() {
  return Scena.battuteVisibili(scenaCorrente, S.carica());
}

function mostraBattuta() {
  const scena = scenaCorrente;
  const quante = battuteDiAdesso();
  const b = quante[battutaCorrente];
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

  const ultima = battutaCorrente >= quante.length - 1;
  if (ultima) {
    if ((scena.dai || []).length) {
      for (const id of scena.dai) {
        if (!Mem.ha(S.carica(), id)) toast(`Ti torna: ${(storia.schede.find((d) => d.id === id) || {}).titolo || id}`, 3200);
        Mem.trova(S.carica(), id);
      }
      S.scrivi(S.carica());
    }
    /* Le scelte che spettano a questa partita: se ne sparisce qualcuna, è
     * perché quello che hai deciso prima rende impossibile sceglierla adesso. */
    const scelte = Scena.scelteVisibili(scena, S.carica());
    if (scelte.length) disegnaScelte(scelte);
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

/* ── l'orto ──────────────────────────────────────────────── */

function iniziaOrto(idNemico) {
  const s0 = S.carica();
  const stato = Vasi.VASI[idNemico] && Vasi.VASI[idNemico].persona
    ? statoDiPersona(Vasi.VASI[idNemico].persona)
    : 0;
  const nemico = Vasi.per(idNemico, stato);
  if (!nemico) { toast('Questo orto non esiste.'); vai('atto'); return; }

  vai('combattimento', { ricorda: false });
  const imp = s0.impostazioni;
  orto.attiva(false);
  orto.impostaNemico(nemico);
  orto.impostaMorsa(imp.mossa);
  orto.impostaLume(imp.lume);
  orto.impostaFiore(s0.fioreAttivo || 'nadia');
  orto.azzera();
  orto.attiva(true);
  orto.collega({ fine: onTratto });
  orto.accendi();

  C = Dono.nuovo({
    nemico,
    salva: s0,
    defs: storia.schede,
    stato,
    clock: () => performance.now(),
    rng,
  });
  s0.fase = 'combattimento';
  s0.vaso = idNemico;
  S.scrivi(s0);

  $('#cb-nemico').textContent = nemico.nome;
  $('#cb-titolo').textContent = nemico.titolo || '';
  const arco = $('#cb-arco');
  if (arco) {
    arco.hidden = stato === 0;
    arco.textContent = stato === 1 ? 'chi hai perso' : stato === 2 ? 'chi ti ha piantato' : '';
  }
  disegnaPalette();
  aggiornaHud();
  disegnaMenu();
  istruzione(nemico.tutorial ? 'semina sopra la terra: impari che dare costa' : 'semina sopra il vaso');
  if (nemico.frasi && nemico.frasi[0]) toast(nemico.frasi[0], 4600);
  A.tasto();
}

/* ── la finestra del fiore, per davvero ──────────────────────
 *
 * Qui c'era un'icona con una finestrella dentro il disegno, e nienti altro: il
 * fiore restava lì finché non lo guardavi, nessuno guardava il tempo, e
 * `resaScaduta` non era mai chiamata da nessuna parte. Il gioco ti chiedeva di
 * decidere e poi non ti faceva decidere: potevi farlo quando ti pareva, e il
 * fiore era un premio con la pazienza gratis.
 *
 * Adesso la finestra ha un orologio. Quando scade, la resa si chiude da sola e
 * costa un ricordo — come ogni altra resa persa — ma NON blocca la semina: si
 * continua a dare, solo senza il premio. Il fiore non è un obbligo, è una
 * scelta con una scadenza, ed è la differenza tra una finestra e un'icona. */
let scadenzaFiore = 0;

function disarmaScadenza() {
  if (scadenzaFiore) { clearTimeout(scadenzaFiore); scadenzaFiore = 0; }
}

function armaScadenza() {
  disarmaScadenza();
  if (!C || !C.resa) return;
  const resta = Math.max(0, C.resa.scaduta - C.ora());
  scadenzaFiore = setTimeout(() => {
    scadenzaFiore = 0;
    if (!C || !C.resa || C.finito) return;
    const esito = C.scadeResa();
    if (!esito) return;
    orto.chiudiFiore();
    orto.colpo();
    A.errore();
    if (esito.testo) toast(esito.testo, 3000);
    toast('Il fiore è andato via prima che tu decidessi.', 3600, true);
    if (C.finito) { fineCombattimento(C.vittoria); return; }
    istruzione('scegli: il terreno ha preso anche quello');
    aggiornaHud();
    disegnaMenu();
  }, resta);
}

function onTratto(tratto) {
  if (!C || C.finito) return;
  if (!C.mossa && !C.attacco) { istruzione('scegli prima che cosa stai facendo'); return; }

  const evento = C.punto(tratto);

  if (evento.tipo === 'resa') {
    disarmaScadenza();
    orto.chiudiFiore();
    const esito = evento.esito;
    if (esito.riuscita) A.resa(); else A.errore();
    if (esito.testo) toast(esito.testo, 3000);
    if (!esito.riuscita) orto.colpo();
    const misura = C.misura(tratto, orto);
    const r = C.applica(misura, orto);
    if (r && r.vittoria) return fineCombattimento(true);
    if (r && r.crollo) return fineCombattimento(false);
    return fineTurno();
  }

  const misura = C.misura(tratto, orto);
  A.semina(evento.caratteristiche.forza);
  const r = C.applica(misura, orto);
  if (r && r.vittoria) return fineCombattimento(true);
  if (r && r.crollo) return fineCombattimento(false);
  fineTurno();
}

function fineTurno() {
  aggiornaHud();
  disegnaMenu();
  if (!C || C.finito) return;
  setTimeout(() => {
    if (!C || C.finito) return;
    const r = C.turnoVaso();
    for (const e of r.eventi) {
      if (e.t === 'appassisce') { A.appassisce(); toast(e.testo, 2600, true); }
      else if (e.t === 'domanda') { e.salvata ? A.scoperta() : A.brucia(); toast(e.testo, 3400, !e.salvata); }
      else if (e.t === 'ricorda') { A.brucia(); orto.colpo(); toast(e.testo, 3400, true); }
      else if (e.t === 'mossa' && e.testo) toast(e.testo, 2400);
    }
    /* La resa si apre solo per gli attacchi che si possono lasciar andare:
     * se l'attacco è "non resabile", tocca al bottone Chiedi (o perdere). */
    if (C.attacco && C.attacco.resabile) {
      const { x, y } = C.generaFiore();
      C.apriResa(x, y, { conScheda: C.attacco.conScheda });
      orto.mostraFiore(x, y, { finestraMs: C.finestra });
      istruzione('TIENI E RILASCIA');
      armaScadenza();
    } else if (C.attacco) {
      istruzione('non si può lasciar andare: usa Chiedi, o brucia');
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
    s.statistiche.offerte = (s.statistiche.offerte || 0) + 1;
    s.statistiche.rese = (s.statistiche.rese || 0) + C.contatoreRese;
    s.statistiche.bruciate = (s.statistiche.bruciate || 0) + C.bruciate.length;
    if (vittoria && !Mem.haFiorito(s, C.nemico.id)) s.fioriti.push(C.nemico.id);
  }
  S.scrivi(s);
  orto.attiva(false);
  orto.chiudiFiore();
  orto.spegni();
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
  /* Due numeri, e nessuno dei due può contraddire l'altro: `spesa` è la cura
   * che il vaso ha ricevuto, `speso` è il terreno che hai toccato tu. */
  $('#cb-spesa').textContent = `${Math.max(0, Math.ceil(C.spesa))}`;
  $('#cb-spesa-n').textContent = `${Math.max(0, Math.ceil(C.spesa))} / ${C.spesaMax}`;
  $('#cb-speso').textContent = `${Math.floor(C.speso)} / ${C.limite}`;
  const barra = $('#cb-speso');
  if (barra) barra.style.width = `${Math.max(0, Math.min(100, (C.speso / C.limite) * 100))}%`;
  /* Il mazzetto: quanti fiori ti restano in mano, e su quanti ne avevi. */
  const fioriBox = $('.fiori');
  if (fioriBox) fioriBox.classList.toggle('vuoto', C.fioriMax > 0 && C.fiori <= 0.01);
  $('#cb-fiori').style.width = `${C.fioriMax > 0 ? Math.max(0, Math.min(100, (C.fiori / C.fioriMax) * 100)) : 0}%`;
  $('#cb-fiori-n').textContent = C.fioriMax > 0 ? `${Math.ceil(C.fiori)}/${C.fioriMax}` : '—';
  $('#cb-memorie').textContent = String(Mem.quante(s));
  const am = $('#atto-memorie');
  if (am) am.textContent = `${Mem.quante(s)} ricordi`;
  const seta = C.sete / Dono.SETE_MAX;
  orto.impostaSete(seta);
  const pips = $('#cb-sete');
  pips.innerHTML = '';
  for (let i = 0; i < Dono.SETE_MAX; i++) {
    const el = document.createElement('i');
    if (seta * Dono.SETE_MAX > i + 0.98) el.className = 'pieno';
    else if (seta * Dono.SETE_MAX > i) el.className = 'on';
    pips.appendChild(el);
  }
  pips.setAttribute('aria-label', `sete ${Math.round(seta * Dono.SETE_MAX)} su ${Dono.SETE_MAX}`);
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
    c.textContent = m.bloccata ? '—' : (m.costo ? `${m.costo} fiori` : 'ascolta');
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
  if (m.id === 'mazzo') {
    apriSceltaSchede(C.nemico, 2, (ids) => {
      const r = C.scegliMemorie(ids);
      if (!r.ok) { toast(r.motivo, 2200); disegnaMenu(); return; }
      A.brucia();
      istruzione('ORA SEMINA, E NON GUARDARE');
      aggiornaHud();
      disegnaMenu();
    });
    return;
  }
  const r = C.scegli(m.id);
  if (!r.ok) { toast(r.motivo, 2200); return; }
  istruzione(m.id === 'accarezza' ? 'piano, e non alzare la mano' : 'semina: i fiori finiscono a metà');
  disegnaMenu();
}

function disegnaPalette() {
  const box = $('#cb-palette');
  if (!box) return;
  box.innerHTML = '';
  const s = S.carica();
  for (const k of FIORI_PALETTA) {
    const f = Orto.FIORI[k];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fiore' + ((s.fioreAttivo || 'nadia') === k ? ' attivo' : '');
    b.setAttribute('aria-pressed', String((s.fioreAttivo || 'nadia') === k));
    const i = document.createElement('i');
    i.style.background = f ? f.base : '#5f6b4a';
    const lab = document.createElement('span');
    lab.textContent = NOME_FIORE[k];
    b.append(i, lab);
    b.title = NOTA_FIORE[k];
    b.addEventListener('click', () => {
      s.fioreAttivo = k;
      S.scrivi(s);
      orto.impostaFiore(k);
      disegnaPalette();
      A.tick();
    });
    box.appendChild(b);
  }
}

/* I cinque fiori: ognuno è una persona, e il colore dice di chi è il fiore
 * che stai dando. Non sono inchiostri: sono mani diverse. */
/* La tavolozza sono le sei persone a cui si pianta: i cinque vasi, e tu.
 * Brizio è nel cast e ha tre schede, ma non è un vaso e non gli si dona
 * niente: c'era nel progetto di prima, e senza di lui i due vasi Donata e
 * Sauro restavano senza fiore — cioè due delle cinque persone che perdi non
 * avevano colore. */
const FIORI_PALETTA = ['nadia', 'betta', 'ansi', 'orielia', 'donata', 'sauro'];

const NOME_FIORE = {
  nadia: 'Nadia',
  betta: 'Betta',
  ansi: 'Anselmo',
  orielia: 'Orielia',
  donata: 'Donata',
  sauro: 'Sauro',
};
const NOTA_FIORE = {
  nadia: 'Il gambo bianco. È il tuo, e non lo porti mai: lo porti a tutto il resto.',
  betta: 'Una rosa. L\'hai comprata da lei, prima che aprisse il banco.',
  ansi: 'Un fiordaliso. Lui non li ha mai voluti: diceva che sanno solo di campo.',
  orielia: 'Una foglia. L\'unica cosa che ha continuato a produrre per anni senza fermarsi.',
  donata: 'Un cartellino. Lei la chiama fioritura e ti fa lo sconto, che è la stessa cosa detta con due parole.',
  sauro: 'Il primo fiore. Non è suo, e lui non lo ha mai detto. Tu lo hai piantato e adesso è suo, che è una cosa diversa.',
};

/* ── overlay: che cosa dai al terreno ────────────────────── */

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
  $('#overlay-schede-tit').textContent = n === 2 ? 'Cosa dai al terreno?' : 'Cosa dai?';
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
  ok.textContent = scelte.length === n ? 'Dai, e non torni' : `Scegline ${n - scelte.length}`;
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

/* ── finale, epitaffio e puntata ─────────────────────────── */

function disegnaFinale() {
  const s = S.carica();
  const promessa = Mem.promessaMantenuta(s);
  const fin = Mem.finalePer(s, { conPetali: true, promessa });
  const def = storia.finali[fin.chiave] || storia.finali.prato;

  const tenute = Mem.schede(storia.schede, s);
  const bruciate = Mem.schedeBruciate(storia.schede, s);
  const statoSauro = Mem.statoDi(s, storia.schede, 'sauro');
  const epi = Epi.componi({
    tenute, bruciate,
    finale: fin.chiave,
    petali: Mem.petali(s),
    statoSauro,
    promessa,
    rng,
  });

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
  $('#finale-memorie').textContent = `${Mem.quante(s)} ricordi · ${Mem.petali(s)}/6 petali`;

  box.appendChild(quadro(def.quadro));

  /* La puntata: il titolo dell'ultima puntata, prima di tutto. È la prima cosa
   * che leggi quando arrivi in fondo, e in una telenovela il titolo viene
   * prima del riassunto. */
  const tit = document.createElement('p');
  tit.className = 'occhiello titolo-puntata';
  tit.textContent = Epi.titoloPuntata(fin.chiave, rng);
  box.appendChild(tit);

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

  /* I titoli di coda: il destino di ognuno, letto dall'arco che gli hai
   * costruito giocando. Non è una tabella di finali: è la stessa funzione che
   * mostra l'arc[o] nel Cast, con due righe in più. */
  const stati = {};
  for (const p of storia.cast || []) {
    stati[p.id] = {
      stato: Mem.statoDi(s, storia.schede, p.id),
      fiorito: Mem.haFiorito(s, p.id),
      vivo: Mem.quanteDi(s, storia.schede, p.id) > 0,
    };
  }
  const cast = Epi.puntata(storia.cast || [], stati, fin.chiave);
  const coda = document.createElement('div');
  coda.className = 'finale-umori coda';
  const hd = document.createElement('h3');
  hd.textContent = 'I titoli di coda';
  coda.appendChild(hd);
  const ol = document.createElement('dl');
  for (const d of cast) {
    const dt = document.createElement('dt');
    dt.textContent = d.nome + (d.ruolo ? ` · ${d.ruolo}` : '');
    const dd = document.createElement('dd');
    dd.textContent = d.testo || '—';
    ol.append(dt, dd);
  }
  coda.appendChild(ol);
  box.appendChild(coda);

  const sotto = document.createElement('p');
  sotto.className = 'finale-testo';
  sotto.innerHTML = Scena.format(def.sotto);
  box.appendChild(sotto);

  if (Mem.petali(s) < 6) {
    const p = document.createElement('p');
    p.className = 'finale-testo tenue';
    p.textContent = `Hai riempito ${Mem.petali(s)} vasi su sei. Gli altri sono ancora terra, e la terra aspetta: un giardino con sei petali è un giardino, con meno è un orto.`;
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
      if (a.id === 'mazzetto' || a.id === 'torna') vai('mazzetto');
      else if (a.id === 'cast') vai('cast');
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
  const bg = '#12140c';
  x.fillStyle = bg;
  x.fillRect(0, 0, 480, 320);
  x.strokeStyle = '#2a2c1c';
  x.lineWidth = 2;
  x.strokeRect(24, 24, 432, 272);

  const cielo = (da, a, col) => {
    const g = x.createLinearGradient(0, da, 0, a);
    g.addColorStop(0, col[0]);
    g.addColorStop(1, col[1]);
    x.fillStyle = g;
    x.fillRect(26, da, 428, a - da);
  };

  /* Un cespuglio: si disegna sempre con la stessa primitiva, e cambia solo
   * quanti rami ha e quanto è in alto. */
  const cespuglio = (n, base, alto, col) => {
    x.strokeStyle = col;
    x.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const px = 60 + t * 360 + ((i * 37) % 19) - 9;
      const h = alto * (0.55 + 0.45 * Math.sin(t * Math.PI));
      x.beginPath();
      x.moveTo(px, base);
      x.quadraticCurveTo(px + 8 - (i % 3) * 8, base - h * 0.6, px + (i % 2 ? 6 : -6), base - h);
      x.stroke();
      x.fillStyle = col;
      x.beginPath();
      x.arc(px + (i % 2 ? 6 : -6), base - h, 3.5, 0, Math.PI * 2);
      x.fill();
    }
  };

  if (tipo === 'giardino-pieno') {
    cielo(26, 296, ['#2b3320', '#c9a76a']);
    x.fillStyle = '#5f6b4a';
    x.fillRect(26, 210, 428, 86);
    cespuglio(46, 296, 150, '#7f8a63');
  } else if (tipo === 'vigna') {
    cielo(26, 296, ['#2b3320', '#b08c4a']);
    x.fillStyle = '#5f6b4a';
    x.fillRect(26, 216, 428, 80);
    cespuglio(34, 296, 140, '#7f8a63');
    /* il buco: l'angolo vuoto, e il nome di chi ci stava */
    x.fillStyle = bg;
    x.beginPath();
    x.moveTo(300, 296);
    x.lineTo(360, 296);
    x.lineTo(340, 210);
    x.lineTo(318, 210);
    x.closePath();
    x.fill();
  } else if (tipo === 'prato') {
    cielo(26, 296, ['#333c26', '#8a7a4a']);
    x.fillStyle = '#4e5838';
    x.fillRect(26, 232, 428, 64);
    cespuglio(18, 296, 74, '#6b7550');
  } else if (tipo === 'spoglio') {
    x.fillStyle = '#171a10';
    x.fillRect(26, 26, 428, 270);
    x.fillStyle = '#33371f';
    x.fillRect(26, 250, 428, 46);
    cespuglio(3, 296, 44, '#5f6b4a');
  } else {
    /* terra: niente è fiorito, e il quadro è solo terra */
    x.fillStyle = '#171a10';
    x.fillRect(26, 26, 428, 270);
    x.fillStyle = 'rgba(120,118,86,.35)';
    for (let i = 0; i < 240; i++) {
      const px = 30 + ((i * 7919) % 420);
      const py = 30 + ((i * 6271) % 260);
      x.fillRect(px, py, 2, 2);
    }
    x.strokeStyle = '#4a4530';
    x.lineWidth = 3;
    x.strokeRect(60, 60, 360, 200);
  }
  return c;
}

/* ── il Mazzetto ─────────────────────────────────────────── */

let filtroMazzetto = 'tutte';

function disegnaMazzetto() {
  const s = S.carica();
  const tenute = Mem.schede(storia.schede, s, filtroMazzetto === 'tutte' ? null : filtroMazzetto);
  const bruciate = Mem.schedeBruciate(storia.schede, s);
  $('#mazzetto-conto').textContent = `${Mem.quante(s)} / ${storia.schede.length}`;
  const pet = $('#mazzetto-petali');
  if (pet) pet.textContent = `${Mem.petali(s)}/6`;

  const f = $('#mazzetto-filtri');
  f.innerHTML = '';
  const persone = Mem.persone(storia.schede, s);
  const opzioni = [['tutte', 'tutte']].concat(Array.from(persone.keys()).map((k) => [k, Epi.NOME_PERSONA[k] || k]));
  for (const [k, lab] of opzioni) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro' + (filtroMazzetto === k ? ' attivo' : '');
    b.textContent = lab;
    b.addEventListener('click', () => { filtroMazzetto = k; disegnaMazzetto(); });
    f.appendChild(b);
  }

  const box = $('#mazzetto-schede');
  box.innerHTML = '';
  if (!tenute.length) {
    const p = document.createElement('p');
    p.className = 'premessa';
    p.textContent = 'Non ti resta niente. C\'è un Mazzetto vuoto, che è la cosa più triste che esista.';
    box.appendChild(p);
  }
  for (const c of tenute) box.appendChild(scheda(c, false));

  const b2 = $('#mazzetto-bruciate');
  b2.innerHTML = '';
  if (!bruciate.length) return;
  const h = document.createElement('p');
  h.className = 'occhiello';
  h.style.textAlign = 'left';
  h.textContent = 'petali secchi';
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
    const NOME = {
      accarezza: 'Accarezza', mazzo: 'Mazzo', parla: 'Chiedi',
      resa: 'Più tempo per decidere', vedere: 'Vedi le mosse', dono: 'Un ricordo per atto',
      rinnovo: 'Rinnova libero', nudo: 'Più cura', lento: 'Resisti all\'appassimento',
    };
    eff.push((c.chiavi || []).map((k) => NOME[k] || k).join(' · '));
  }
  if (c.valori && c.valori.cura) eff.push(`+${Math.round(c.valori.cura * 100)}% cura`);
  if (eff.length) {
    const e = document.createElement('span');
    e.className = 'effetto';
    e.textContent = eff.join(' · ');
    d.appendChild(e);
  }
  return d;
}

/* ── Il Cast ─────────────────────────────────────────────── */

/* La vista che rende la telenovela leggibile: sette persone, e per ognuna la
 * frase dell'arc[o] che le hai costruito, quante schede le restano, quante ne
 * hai perso, e — se è una di loro — se il suo vaso è fiorito. */
function disegnaCast() {
  const s = S.carica();
  const box = $('#cast-lista');
  box.innerHTML = '';
  const totale = (storia.cast || []).length;
  $('#cast-conto').textContent = `${Mem.petali(s)}/6 petali · ${Mem.quante(s)} ricordi`;

  for (const p of storia.cast || []) {
    const stato = Mem.statoDi(s, storia.schede, p.id);
    const tenute = Mem.quanteDi(s, storia.schede, p.id);
    const perse = Mem.quantePersiDi(s, storia.schede, p.id);
    const fiorito = Mem.haFiorito(s, p.id);
    const arcoFrase = (p.arco && p.arco[Math.min(2, stato)]) || '';

    const art = document.createElement('article');
    art.className = 'cast-voce s' + stato + (fiorito ? ' fiorito' : '');

    const h = document.createElement('h4');
    h.textContent = p.nome;
    art.appendChild(h);

    const ruolo = document.createElement('p');
    ruolo.className = 'ruolo';
    ruolo.textContent = p.ruolo || '';
    art.appendChild(ruolo);

    const tacche = document.createElement('div');
    tacche.className = 'tacche';
    tacche.setAttribute('role', 'img');
    tacche.setAttribute('aria-label', `stato ${stato} su 2: ${arcoFrase || 'nessuno'}`);
    for (let i = 0; i < 3; i++) {
      const t = document.createElement('i');
      if (i <= stato) t.className = 'on';
      tacche.appendChild(t);
    }
    art.appendChild(tacche);

    const frase = document.createElement('p');
    frase.className = 'frase';
    frase.textContent = arcoFrase;
    art.appendChild(frase);

    const conto = document.createElement('p');
    conto.className = 'conta';
    const pezzi = [`${tenute} schede`];
    if (perse) pezzi.push(`${perse} date al terreno`);
    if (fiorito) pezzi.push('il suo vaso è fiorito');
    conto.textContent = pezzi.join(' · ');
    art.appendChild(conto);

    box.appendChild(art);
  }
  $('#cast-vuoto').hidden = totale > 0;
}

/* ── annusa e rinnova ────────────────────────────────────── */

function annusaUnRicordo() {
  const s = S.carica();
  const c = Scena.annusa(s, storia.schede, rng);
  if (!c) { toast('Non ti resta niente da annusare.'); return; }
  toast(`${c.titolo} — ${c.versi.join(' ')}`, 9000);
  parla(c.versi.join(' '));
  A.scoperta();
}

function chiediRinnovo() {
  const s = S.carica();
  const r = Scena.rinnovoPossibile(s, storia.schede, attoDi(s.atto).id);
  if (!r.ok) { toast(r.motivo, 3000); return; }
  apriSceltaSchede(s, 1, (ids) => {
    const esito = Scena.rinnovo(s, storia.schede, attoDi(s.atto).id, ids[0]);
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
  s.vaso = null;
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
 * può tornare indietro), poi la scena a metà, poi l'orto, e infine l'atto.
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

  if (s.fase === 'combattimento' && nodo && nodo.tipo === 'orto') {
    iniziaOrto(nodo.id);
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
  for (const b of $$('[data-mossa]')) b.classList.toggle('attivo', b.dataset.mossa === imp.mossa);
  for (const b of $$('[data-lume]')) b.classList.toggle('attivo', b.dataset.lume === imp.lume);
  if (orto) {
    orto.impostaMorsa(imp.mossa);
    orto.impostaLume(imp.lume);
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
  for (const b of $$('[data-mossa]')) {
    b.addEventListener('click', () => { S.imposta('mossa', b.dataset.mossa); applicaImpostazioni(); A.tick(); });
  }
  for (const b of $$('[data-lume]')) {
    b.addEventListener('click', () => { S.imposta('lume', b.dataset.lume); applicaImpostazioni(); A.tick(); });
  }
}

/* ── lo sfondo della copertina: piante disegnate a runtime ── */

/* Non un'immagine e non un effetto: un orto che cresce mentre lo guardi, disegnato
 * riga per riga con le stesse primitive dell'icona. Cresce piano, si ferma, e
 * ogni tantobutta un gambo nuovo. */
function fondo() {
  const c = $('#fondo');
  if (!c) return;
  const x = c.getContext('2d');
  let vivo = true;
  const gambi = [];
  const foglia = (px, py, ang, len) => {
    x.save();
    x.translate(px, py);
    x.rotate(ang);
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    x.quadraticCurveTo(len * 0.5, len * 0.30, 0, 0);
    x.fill();
    x.restore();
  };
  const aggiungi = () => {
    gambi.push({
      x: 0.04 + Math.random() * 0.92,
      h: 0,
      alto: 0.10 + Math.random() * 0.24,
      v: 0.00035 + Math.random() * 0.00075,
      ritardo: Math.random() * 400,
      petali: 0,
      fiore: Math.random() < 0.55,
    });
  };
  for (let i = 0; i < 34; i++) aggiungi();

  let ultimo = 0;
  const disegna = (ora) => {
    if (!vivo) return;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    x.clearRect(0, 0, c.width, c.height);
    if (ora - ultimo > 900) { ultimo = ora; if (gambi.length < 70) aggiungi(); }

    for (const g of gambi) {
      if (g.ritardo > 0) { g.ritardo--; continue; }
      if (g.h < g.alto) {
        g.h += g.v * 16;
        continue;
      }
      if (g.petali) continue;
      g.petali = 1;
    }

    x.lineCap = 'round';
    for (const g of gambi) {
      if (g.ritardo > 0 || g.h <= 0) continue;
      const base = c.height;
      const punta = base - g.h * c.height;
      x.strokeStyle = 'rgba(127,138,99,0.42)';
      x.lineWidth = Math.max(1, 1.4 * dpr);
      x.beginPath();
      x.moveTo(g.x * c.width, base);
      x.quadraticCurveTo(g.x * c.width + 6 * dpr, (base + punta) / 2, g.x * c.width, punta);
      x.stroke();
      /* due foglie a due terzi e a tre quarti */
      x.fillStyle = 'rgba(95,107,74,0.34)';
      foglia(g.x * c.width, punta + (base - punta) * 0.3, -0.7, 9 * dpr);
      foglia(g.x * c.width, punta + (base - punta) * 0.5, 2.4, 7 * dpr);
      if (g.petali && g.fiore) {
        x.fillStyle = 'rgba(201,167,106,0.5)';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          x.beginPath();
          x.ellipse(g.x * c.width + Math.cos(a) * 3.4 * dpr, punta + Math.sin(a) * 3.4 * dpr, 3.2 * dpr, 2.1 * dpr, a, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = 'rgba(127,138,99,0.6)';
        x.beginPath();
        x.arc(g.x * c.width, punta, 1.8 * dpr, 0, Math.PI * 2);
        x.fill();
      }
    }
    requestAnimationFrame(disegna);
  };
  disegna(0);
  return () => { vivo = false; };
}

/* ── avvio ───────────────────────────────────────────────── */

async function avvia() {
  orto = Orto.nuovo($('#cb-tela'), $('#cb-effetti'));

  try {
    const res = await fetch('data/story.json', { cache: 'no-cache' });
    storia = await res.json();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:3rem;max-width:34rem;margin:auto;font:400 17px/1.6 Georgia,serif;color:#d3cdb8">
      <h1 style="font-style:italic;color:#eae3cc">Non riesco a leggere i testi.</h1>
      <p>Questo gioco ha bisogno di un piccolo server, non di un file aperto con due dita.
      Nella cartella esegui <code>node serve.js</code> e apri <code>http://localhost:4184</code>.</p>
      <p style="color:#8a8768;font-size:.85em">Motivo: ${Scena.escapeHtml(String(err && err.message || err))}</p></div>`;
    return;
  }

  applicaImpostazioni();
  collegaImpostazioni();

  /* pulsanti */
  $('#btn-prosegui').addEventListener('click', () => { A.tick(); prosegui(); });
  $('#btn-scena-avanti').addEventListener('click', () => {
    A.tick();
    if (!scenaCorrente) return;
    const quante = battuteDiAdesso();
    if (battutaCorrente >= quante.length - 1) { avanti(); return; }
    battutaCorrente++;
    mostraBattuta();
  });
  $('#btn-scena-quit').addEventListener('click', () => { A.tick(); vai('atto'); });
  $('#btn-atto-home').addEventListener('click', () => { A.tick(); vai('copertina'); });
  $('#btn-finale-home').addEventListener('click', () => { A.tick(); vai('copertina'); });
  $('#btn-continua').addEventListener('click', () => { A.tick(); continua(); });
  $('#btn-nuova').addEventListener('click', () => { A.tick(); nuovaPartita(); });
  $('#btn-mazzetto-home').addEventListener('click', () => { A.tick(); vai('mazzetto'); });
  $('#btn-mazzetto-indietro').addEventListener('click', () => { A.tick(); vai(vistaPrecedente === 'mazzetto' ? 'atto' : vistaPrecedente); });
  $('#btn-cast-home').addEventListener('click', () => { A.tick(); vai('copertina'); });
  $('#btn-cast-indietro').addEventListener('click', () => { A.tick(); vai(vistaPrecedente === 'cast' ? 'atto' : vistaPrecedente); });
  $('#btn-cb-mazzetto').addEventListener('click', () => { A.tick(); vai('mazzetto'); });
  $('#btn-cb-cast').addEventListener('click', () => { A.tick(); vai('cast'); });
  $('#btn-impostazioni').addEventListener('click', () => { A.tick(); $('#overlay-impostazioni').hidden = false; });
  $('#overlay-imp-chiudi').addEventListener('click', () => { A.tick(); $('#overlay-impostazioni').hidden = true; });
  $('#overlay-schede-annulla').addEventListener('click', () => {
    if ($('#overlay-schede-annulla').disabled) return;
    $('#overlay-schede').hidden = true;
  });
  $('#btn-cancella').addEventListener('click', () => {
    if (!confirm('Cancellare tutto? Il Mazzetto si riempie di nuovo, ma gli epitaffi letti restano.')) return;
    S.cancella();
    $('#overlay-impostazioni').hidden = true;
    C = null;
    vai('copertina');
  });

  /* la copertina del Mazzetto, se il Mazzetto è vuoto, è una tristezza */
  $('#btn-installa').addEventListener('click', () => {
    const st = window.FSTPWA && window.FSTPWA.installa;
    if (st) st();
  });

  /* il tocco sul testo lo porta subito alla fine: nessuno legge due volte */
  $('#scena-texto').addEventListener('click', () => {
    A.tick();
    if (!scenaCorrente) return;
    const quante = battuteDiAdesso();
    if (battutaCorrente >= quante.length - 1) avanti();
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
  addEventListener('resize', () => { if (orto) orto.ridimensiona(); });
  addEventListener('orientationchange', () => setTimeout(() => orto && orto.ridimensiona(), 300));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      try { window.speechSynthesis.cancel(); } catch {}
      if (vistaCorrente === 'combattimento' && C) S.scrivi(S.carica());
    }
    if (orto && vistaCorrente === 'combattimento') {
      if (document.visibilityState === 'visible') { orto.ridimensiona(); orto.accendi(); }
      else orto.spegni();
    }
  });

  fondo();
  vai('copertina', { ricorda: false });
  applicaImpostazioni();
  document.documentElement.dataset.pronto = '1';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();

window.FSTApp = { vai, toast, avviso, storia: () => storia, stato: () => ({ C, vistaCorrente }) };
})();
