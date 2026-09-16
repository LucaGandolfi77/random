/*
 * GreenBatch GB-8S — controller HMI.
 * Collega il motore di simulazione alle viste, ai comandi, agli allarmi,
 * al monitor I/O e ai report di lotto (tracciabilità stampabile).
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAGS = window.GB_TAGS;
  const HMI = window.GB_HMI;
  const { Plant } = window.GB_PLANT;

  const plant = new Plant({ seed: 20250115 });
  const state = {
    speed: 1, running: true, view: 'iso', role: 'operator', anim: 0, dpr: 1, selectedSilo: -1,
    lastT: 0, printBatch: null,
  };

  const ROLES = {
    operator: { label: 'Operatore', canBatch: true, canManual: true, canConfig: false },
    supervisor: { label: 'Supervisore', canBatch: true, canManual: true, canConfig: true },
    admin: { label: 'Amministratore', canBatch: true, canManual: true, canConfig: true },
  };

  const els = {};

  function fmt(v, d) { return Number(v).toFixed(d == null ? 2 : d); }

  /* ── canvas setup ─────────────────────────────────────── */
  function resize() {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const key of ['iso', 'mimic', 'trend']) {
      const c = els[key];
      if (!c) continue;
      const r = c.getBoundingClientRect();
      c.width = Math.max(320, Math.round(r.width * state.dpr));
      c.height = Math.max(180, Math.round(r.height * state.dpr));
      c.style.width = r.width + 'px';
      c.style.height = r.height + 'px';
    }
  }

  /* ── loop principale ──────────────────────────────────── */
  function loop(ts) {
    const dtReal = Math.min(0.1, (ts - state.lastT) / 1000 || 0.016);
    state.lastT = ts;
    if (state.running) {
      const dt = dtReal * state.speed;
      const steps = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < steps; i++) plant.step(dt / steps);
      state.anim += dtReal;
    }
    render();
    requestAnimationFrame(loop);
  }

  function render() {
    const snap = plant.snapshot();
    if (state.view === 'iso') HMI.drawIso(els.iso, snap, TAGS.LAYOUT, state.anim, state.dpr);
    else HMI.drawMimic(els.mimic, snap, state.anim, state.dpr);
    HMI.drawTrends(els.trend, plant.history, state.dpr);
    renderHeader(snap);
    renderSilos(snap);
    renderScale(snap);
    renderBatch(snap);
    renderAlarms(snap);
    renderIO();
    renderLog();
    renderLegend();
  }

  /* ── header ───────────────────────────────────────────── */
  function renderHeader(snap) {
    els.clock.textContent = snap.iso.slice(11);
    els.modeBadge.textContent = snap.estop ? 'EMERGENZA' : snap.mode;
    els.modeBadge.className = 'badge ' + (snap.estop ? 'critical' : 'ok');
    els.roleLabel.textContent = ROLES[state.role].label;
    els.alarmCount.textContent = snap.alarms.length;
    els.alarmCount.className = 'pill-count ' + (snap.alarms.length ? 'has' : '');
    els.blowerBtn.classList.toggle('on', snap.blower.run);
    els.estopBtn.classList.toggle('pressed', snap.estop);
  }

  /* ── schede silos ─────────────────────────────────────── */
  function renderSilos(snap) {
    const html = snap.silos.map((s, i) => {
      const cls = [s.lsHigh ? 'alarm-high' : '', s.lsLow ? 'alarm-low' : '', s.valveOpen ? 'dosing' : ''].join(' ');
      const chip = s.process === 'N' ? 'natural' : 'washed';
      return '' +
        '<button class="silo-card ' + cls + '" data-silo="' + i + '">' +
        '<div class="silo-head"><span class="silo-id">' + s.id + '</span>' +
        '<span class="chip ' + chip + '">(' + s.process + ')</span>' +
        (s.lsHigh ? '<span class="dot-alarm" title="Livello alto"></span>' : '') + '</div>' +
        '<div class="silo-var">' + s.variety + '</div>' +
        '<div class="silo-lot">' + s.lot + ' · ' + s.grade + '</div>' +
        '<div class="bar"><i style="width:' + Math.min(100, s.pct).toFixed(1) + '%"></i></div>' +
        '<div class="silo-foot"><span class="kg">' + fmt(s.weightKg, 1) + ' kg</span>' +
        '<span class="pct">' + fmt(s.pct, 1) + '%</span></div>' +
        '<div class="silo-state">' + (s.valveOpen ? 'DOSAGGIO' : (s.lsHigh ? 'LIVELLO ALTO' : (s.lsLow ? 'LIVELLO BASSO' : 'PRONTO'))) + '</div>' +
        '</button>';
    }).join('');
    els.silos.innerHTML = html;
    els.silos.querySelectorAll('[data-silo]').forEach((b) => {
      b.addEventListener('click', () => selectSilo(+b.dataset.silo));
    });
  }

  function selectSilo(i) {
    state.selectedSilo = i;
    const s = plant.silos[i];
    els.siloDetail.innerHTML =
      '<strong>' + s.id + ' — ' + s.variety + '</strong>' +
      '<span>(' + s.process + ') ' + TAGS.PRODUCTS[s.process].name + ' · ' + s.grade + '</span>' +
      '<span>Origine: ' + s.origin + ' · Lotto ' + s.lot + '</span>' +
      '<span>Giacenza: ' + fmt(s.weightKg, 1) + ' / ' + s.capacityKg + ' kg (' + fmt((s.weightKg / s.capacityKg) * 100, 1) + '%)</span>' +
      '<span>Celle: ' + s.lc.map((v) => fmt(v, 1)).join(' / ') + ' kg</span>' +
      '<span>Anticipo appreso (fine): ' + fmt(plant.inflightFine[s.id], 3) + ' kg</span>';
    els.siloActions.innerHTML =
      '<button class="btn" data-act="valve">' + (s.valve.open ? 'Chiudi scarico EV-20' + i + 1 : 'Apri scarico EV-20' + (i + 1)) + '</button>' +
      '<button class="btn" data-act="load">Carica questo silo</button>' +
      '<button class="btn" data-act="close-load">Chiudi deviatori</button>';
    els.siloActions.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'valve') {
          if (plant.silos[i].valve.open) plant.closeSiloValve(i);
          else notify(plant.openSiloValve(i), 'Apertura scarico ' + plant.silos[i].id);
        } else if (act === 'load') {
          notify(plant.openDiverter(i), 'Caricamento ' + plant.silos[i].id);
        } else {
          plant.closeAllDiverters(); notify({ ok: true }, 'Deviatrie chiuse');
        }
      });
    });
  }

  function notify(res, label) {
    if (res && res.ok) toast(label + ': comando eseguito');
    else toast((label || 'Comando') + ' negato — ' + ((res && res.reason) || 'non consentito'), true);
  }

  /* ── pannello SCALE ───────────────────────────────────── */
  function renderScale(snap) {
    const w = snap.weigher;
    els.scaleActual.textContent = (w.actualKg >= 0 ? '+' : '') + fmt(w.actualKg, 1) + ' Kg';
    els.scaleTarget.textContent = (snap.batch ? '+' : '+') + fmt(w.targetKg, 1) + ' Kg';
    els.scaleStatus.textContent = snap.estop ? 'EMERGENCY' : (w.overload ? 'ALARM' : (snap.batch ? snap.batch.phase : 'STOPPED'));
    els.scaleStatus.className = 'scale-status ' + (snap.estop || w.overload ? 'alarm' : (snap.batch ? 'run' : 'stopped'));
    els.lc1.textContent = fmt(w.lc[0], 2); els.lc2.textContent = fmt(w.lc[1], 2); els.lc3.textContent = fmt(w.lc[2], 2);
    els.scaleBar.style.width = Math.min(100, (w.actualKg / 120) * 100).toFixed(1) + '%';
    els.ev250.className = 'valve ' + (w.valveOpen ? 'open' : 'closed');
    els.ev250.textContent = w.valveOpen ? 'EV-250 APERTA' : 'EV-250 CHIUSA';
  }

  /* ── pannello lotto ───────────────────────────────────── */
  function renderBatch(snap) {
    const opts = TAGS.RECIPES.map((r) => '<option value="' + r.id + '">' + r.name + ' — ' + r.batchKg + ' kg</option>').join('');
    if (els.recipe.innerHTML !== opts) els.recipe.innerHTML = opts;
    const b = snap.batch;
    if (!b) {
      els.batchBody.innerHTML = '<p class="muted">Nessun lotto in corso. Seleziona una ricetta e avvia.</p>';
    } else {
      els.batchBody.innerHTML =
        '<div class="batch-head"><strong>' + b.id + '</strong><span>' + b.recipeName + '</span>' +
        '<span class="badge ok">' + b.phase + '</span></div>' +
        b.components.map((c, i) => {
          const act = i === b.idx;
          return '<div class="comp ' + (act ? 'active' : '') + ' ' + (c.ok === false ? 'bad' : '') + '">' +
            '<span class="comp-silo">' + c.silo + '</span>' +
            '<span class="comp-var">' + (c.variety || '') + '</span>' +
            '<span class="comp-kg">' + fmt(c.targetKg, 1) + ' kg</span>' +
            '<span class="comp-act">' + (c.actualKg != null ? fmt(c.actualKg, 2) : (act ? fmt(plant.doseSoFar(b), 2) : '—')) + '</span>' +
            '<span class="comp-delta">' + (c.deltaKg != null ? (c.deltaKg >= 0 ? '+' : '') + fmt(c.deltaKg, 3) : '') + '</span>' +
            '</div>';
        }).join('') +
        '<div class="batch-foot">Totale: <b>' + fmt(snap.weigher.actualKg, 2) + '</b> / ' + fmt(b.totalTargetKg, 1) + ' kg</div>';
    }
    const done = plant.batches.length;
    els.batchCount.textContent = done + ' lotti completati';
    if (done && !state.printBatch) state.printBatch = plant.batches[done - 1];
  }

  /* ── allarmi ──────────────────────────────────────────── */
  function renderAlarms(snap) {
    els.alarmBanner.className = 'alarm-banner ' + (snap.alarms.some((a) => a.cls === 'CRITICAL') ? 'critical' : (snap.alarms.length ? 'active' : ''));
    els.alarmBanner.textContent = snap.alarms.length
      ? snap.alarms.length + ' allarmi attivi — ' + snap.alarms.map((a) => '[' + a.code + '] ' + a.text).join(' · ')
      : 'Nessun allarme attivo';
    const rows = snap.alarms.map((a) =>
      '<tr class="' + a.cls.toLowerCase() + '"><td>' + a.code + '</td><td>' + a.cls + '</td><td>' + a.tag + '</td><td>' + a.text + '</td>' +
      '<td>' + new Date(a.since * 1000).toISOString().slice(11, 19) + '</td></tr>').join('');
    els.alarmTable.innerHTML = rows || '<tr><td colspan="5" class="muted">Nessun allarme</td></tr>';
  }

  /* ── monitor I/O ──────────────────────────────────────── */
  function renderIO() {
    if (!state.ioBuilt) {
      els.ioTable.innerHTML = TAGS.IO.map((t) =>
        '<tr data-tag="' + t.tag + '"><td>' + t.tag + '</td><td>' + t.type + '</td><td class="io-desc">' + t.desc + '</td><td class="io-val">—</td></tr>'
      ).join('');
      state.ioBuilt = true;
    }
    const values = plant.tagValues();
    els.ioTable.querySelectorAll('tr[data-tag]').forEach((tr) => {
      const tag = tr.dataset.tag;
      const v = values[tag];
      const cell = tr.querySelector('.io-val');
      const txt = typeof v === 'boolean' ? (v ? '1' : '0') : (v === undefined ? '—' : v);
      if (cell.textContent !== String(txt)) cell.textContent = String(txt);
      tr.classList.toggle('io-on', v === 1 || v === true);
      tr.classList.toggle('io-off', v === 0 || v === false);
    });
  }

  /* ── log eventi ───────────────────────────────────────── */
  function renderLog() {
    const last = plant.events.slice(-40).reverse();
    const html = last.map((e) =>
      '<div class="log-row ' + e.kind.toLowerCase() + '"><span class="log-t">' + e.iso.slice(11) + '</span>' +
      '<span class="log-k">' + e.kind + '</span><span class="log-x">' + e.text + '</span></div>').join('');
    if (els.log.innerHTML !== html) els.log.innerHTML = html;
  }

  /* ── legenda prodotti ─────────────────────────────────── */
  function renderLegend() {
    if (state.legendBuilt) return;
    els.legend.innerHTML = Object.values(TAGS.PRODUCTS).map((p) =>
      '<div class="legend-item"><span class="swatch" style="background:' + p.color + '"></span>' +
      '<div><strong>(' + p.code + ') ' + p.name + '</strong><span>' + p.note + ' · densità ' + p.densityKgM3 + ' kg/m³</span></div></div>'
    ).join('');
    state.legendBuilt = true;
  }

  /* ── toast ────────────────────────────────────────────── */
  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.className = 'toast'; }, 3600);
  }

  /* ── comandi ──────────────────────────────────────────── */
  function bind() {
    els.blowerBtn.addEventListener('click', () => {
      if (plant.blower.run) { plant.stopBlower(); toast('Soffiante arrestata'); }
      else { notify(plant.startBlower(), 'Avvio soffiante'); }
    });
    els.airlockBtn.addEventListener('click', () => {
      plant.setAirlock(!plant.airlock.run);
      toast('Valvola rotativa M-101 ' + (plant.airlock.run ? 'in marcia' : 'arrestata'));
    });
    els.gateBtn.addEventListener('click', () => {
      plant.setKnifeGate(!plant.knifeGate.open);
      toast('Ghigliottina EV-101 ' + (plant.knifeGate.open ? 'aperta' : 'chiusa'));
    });
    els.lineBtn.addEventListener('click', () => {
      plant.batchLine.dv109 = !plant.batchLine.dv109;
      toast('Linea di dosaggio ' + (plant.batchLine.dv109 ? 'aperta' : 'chiusa'));
    });
    els.dischargeBtn.addEventListener('click', () => {
      if (plant.weigher.valve.open) { plant.closeDischarge(); toast('Scarico EV-250 chiuso'); }
      else notify(plant.openDischarge(), 'Apertura scarico tramoggia');
    });
    els.startBatch.addEventListener('click', () => {
      if (!ROLES[state.role].canBatch) return toast('Ruolo senza permesso di avvio lotto', true);
      notify(plant.startBatch(els.recipe.value), 'Avvio lotto');
    });
    els.abortBatch.addEventListener('click', () => { plant.abortBatch('operatore'); toast('Lotto annullato'); });
    els.estopBtn.addEventListener('click', () => { plant.emergencyStop(); toast('ARRESTO DI EMERGENZA', true); });
    els.resetBtn.addEventListener('click', () => { plant.resetEmergency(); toast('Emergenza riarmata'); });
    els.ackBtn.addEventListener('click', () => { plant.ackAll(); toast('Allarmi riconosciuti'); });
    els.roasterBtn.addEventListener('click', () => {
      const kg = plant.roaster.weightKg;
      plant.roaster.weightKg = 0;
      plant.roaster.full = false;
      toast('Torrefattrice: consumo simulato di ' + fmt(kg, 1) + ' kg');
    });
    els.speed.addEventListener('change', () => { state.speed = +els.speed.value; toast('Velocità simulazione ' + state.speed + '×'); });
    els.pauseBtn.addEventListener('click', () => {
      state.running = !state.running;
      els.pauseBtn.classList.toggle('on', !state.running);
      els.pauseBtn.textContent = state.running ? '❚❚ Pausa' : '▶ Riprendi';
    });

    document.querySelectorAll('[data-view]').forEach((b) => {
      b.addEventListener('click', () => {
        state.view = b.dataset.view;
        document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
        els.iso.style.display = state.view === 'iso' ? 'block' : 'none';
        els.mimic.style.display = state.view === 'mimic' ? 'block' : 'none';
        resize();
      });
    });

    // login (ruoli)
    els.loginBtn.addEventListener('click', () => els.loginModal.classList.add('open'));
    els.loginClose.addEventListener('click', () => els.loginModal.classList.remove('open'));
    document.querySelectorAll('[data-role]').forEach((b) => {
      b.addEventListener('click', () => {
        state.role = b.dataset.role;
        plant.operator = b.dataset.role.toUpperCase() + '-01';
        els.loginModal.classList.remove('open');
        toast('Accesso come ' + ROLES[state.role].label);
      });
    });

    // green / alarms / print
    els.greenBtn.addEventListener('click', () => toast('Scheda caffè verde: ' + plant.silos.filter((s) => s.weightKg > 0).length + ' lotti in silo, ' + fmt(plant.silos.reduce((a, s) => a + s.weightKg, 0), 1) + ' kg totali'));
    els.alarmsBtn.addEventListener('click', () => { els.panelAlarms.scrollIntoView({ behavior: 'smooth' }); els.panelAlarms.classList.add('flash'); setTimeout(() => els.panelAlarms.classList.remove('flash'), 900); });
    els.printBtn.addEventListener('click', printReport);
    els.reportClose.addEventListener('click', () => els.reportModal.classList.remove('open'));

    window.addEventListener('resize', () => { clearTimeout(bind._r); bind._r = setTimeout(resize, 120); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { els.loginModal.classList.remove('open'); els.reportModal.classList.remove('open'); }
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); els.pauseBtn.click(); }
    });
  }

  /* ── report di lotto (tracciabilità) ──────────────────── */
  function printReport() {
    const b = plant.currentBatch || plant.batches[plant.batches.length - 1];
    if (!b) { toast('Nessun lotto da stampare', true); return; }
    const tot = (b.components.reduce((a, c) => a + (c.actualKg || 0), 0));
    els.reportBody.innerHTML =
      '<h2>Report di lotto — ' + b.id + '</h2>' +
      '<div class="rep-grid">' +
      '<div><span>Ricetta</span><b>' + b.recipeName + ' (' + b.recipe + ')</b></div>' +
      '<div><span>Operatore</span><b>' + b.operator + '</b></div>' +
      '<div><span>Avvio</span><b>' + new Date(b.started * 1000).toISOString().slice(0, 19).replace('T', ' ') + '</b></div>' +
      '<div><span>Stato</span><b>' + b.status + '</b></div>' +
      '<div><span>Target</span><b>' + fmt(b.totalTargetKg, 2) + ' kg</b></div>' +
      '<div><span>Reale</span><b>' + fmt(tot, 2) + ' kg</b></div>' +
      '</div>' +
      '<table class="rep-table"><thead><tr><th>Silo</th><th>Varietà</th><th>Lotto</th><th>Target kg</th><th>Reale kg</th><th>Scarto kg</th><th>Esito</th></tr></thead><tbody>' +
      b.components.map((c) => '<tr><td>' + c.silo + '</td><td>' + (c.variety || '') + '</td><td>' + (c.lot || '') + '</td>' +
        '<td>' + fmt(c.targetKg, 2) + '</td><td>' + (c.actualKg != null ? fmt(c.actualKg, 3) : '—') + '</td>' +
        '<td>' + (c.deltaKg != null ? (c.deltaKg >= 0 ? '+' : '') + fmt(c.deltaKg, 3) : '—') + '</td>' +
        '<td>' + (c.ok === true ? 'OK' : c.ok === false ? 'FUORI TOL.' : 'in corso') + '</td></tr>').join('') +
      '</tbody></table>' +
      '<p class="rep-note">Documento generato da GreenBatch GB-8S — tracciabilità lotto secondo Reg. CE 178/2002 (one-up / one-down). ' +
      'Pesi rilevati da 3 celle di carico su tramoggia di pesa (classe III).</p>';
    els.reportModal.classList.add('open');
  }

  /* ── init ─────────────────────────────────────────────── */
  function boot() {
    els.iso = $('view-iso'); els.mimic = $('view-mimic'); els.trend = $('view-trend');
    els.clock = $('clock'); els.modeBadge = $('mode-badge'); els.roleLabel = $('role-label');
    els.alarmCount = $('alarm-count'); els.blowerBtn = $('btn-blower'); els.estopBtn = $('btn-estop');
    els.silos = $('silos'); els.siloDetail = $('silo-detail'); els.siloActions = $('silo-actions');
    els.scaleActual = $('scale-actual'); els.scaleTarget = $('scale-target'); els.scaleStatus = $('scale-status');
    els.scaleBar = $('scale-bar'); els.lc1 = $('lc1'); els.lc2 = $('lc2'); els.lc3 = $('lc3'); els.ev250 = $('ev250');
    els.recipe = $('recipe'); els.startBatch = $('btn-start-batch'); els.abortBatch = $('btn-abort-batch');
    els.batchBody = $('batch-body'); els.batchCount = $('batch-count');
    els.alarmBanner = $('alarm-banner'); els.alarmTable = $('alarm-table'); els.ackBtn = $('btn-ack');
    els.ioTable = $('io-table'); els.log = $('log'); els.legend = $('legend');
    els.toast = $('toast'); els.speed = $('speed'); els.pauseBtn = $('btn-pause');
    els.airlockBtn = $('btn-airlock'); els.gateBtn = $('btn-gate'); els.lineBtn = $('btn-line');
    els.dischargeBtn = $('btn-discharge'); els.resetBtn = $('btn-reset'); els.roasterBtn = $('btn-roaster');
    els.loginBtn = $('btn-login'); els.loginModal = $('login-modal'); els.loginClose = $('login-close');
    els.greenBtn = $('btn-green'); els.alarmsBtn = $('btn-alarms'); els.printBtn = $('btn-print');
    els.reportModal = $('report-modal'); els.reportBody = $('report-body'); els.reportClose = $('report-close');
    els.panelAlarms = $('panel-alarms');

    bind();
    resize();
    renderLegend();
    selectSilo(3);
    requestAnimationFrame((ts) => { state.lastT = ts; loop(ts); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GB_APP = { plant, state, toast };
})();
