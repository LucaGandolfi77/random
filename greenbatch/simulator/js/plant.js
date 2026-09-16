/*
 * GreenBatch GB-8S — motore di simulazione impianto (gemello digitale).
 * Modella: trasporto pneumatico in depressione, ciclone + valvola rotativa,
 * linea di distribuzione con deviatori, banco silos pesati, linea di dosaggio,
 * tramoggia su 3 celle di carico, scarico alla torrefattrice, interblocchi,
 * allarmi e sequenza di lotto con anticipo (in-flight) adattativo.
 *
 * UMD: gira sia nel browser (simulatore) sia in Node (test headless).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./tags.js'));
  else root.GB_PLANT = factory(root.GB_TAGS);
})(typeof self !== 'undefined' ? self : this, function (TAGS) {
  'use strict';

  const P = TAGS.PARAMS;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // deterministic pseudo-noise so HMI looks alive but tests stay reproducible
  function makeRand(seed) {
    let s = seed >>> 0 || 12345;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function nowIso(t) { return new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19); }

  class Plant {
    constructor(opts) {
      opts = opts || {};
      this.t0 = opts.t0 || 0;
      this.time = this.t0;
      this.rand = makeRand(opts.seed || 987654321);
      this.mode = 'AUTO';
      this.estop = false;
      this.operator = 'OP-01';

      this.blower = { cmd: false, run: false, refPct: 76, vacuumKpa: 0, currentA: 0, fault: false };
      this.filter = { dpKpa: P.filter.dpCleanKpa, cleaning: false, cleanT: 0 };
      this.cyclone = { bufferKg: 0, lsl151: true };
      this.airlock = { run: false, fault: false };
      this.knifeGate = { open: false };
      this.source = { variety: 'R Exc Cauca', process: 'W', lot: 'L-2501', label: 'Ricezione big-bag' };

      this.silos = TAGS.SILOS.map((s) => ({
        id: s.id,
        variety: s.variety,
        grade: s.grade,
        origin: s.origin,
        process: s.process,
        lot: s.lot,
        weightKg: s.weightKg,
        capacityKg: s.capacityKg,
        valve: { open: false },
        lsHigh: false,
        lsLow: false,
        lc: [0, 0, 0],
      }));
      this.diverter = TAGS.SILOS.map(() => ({ open: false }));
      this.batchLine = { dv109: false, throttlePct: P.conveying.throttle.coarsePct };

      this.weigher = {
        actualKg: 0, targetKg: 0, valve: { open: false }, overload: false,
        lc: [0, 0, 0], arrivals: [],
      };
      this.roaster = { weightKg: 0, full: false };

      this.alarms = new Map();       // code -> {code, cls, text, since, ack, tag}
      this.events = [];              // log tracciabilità
      this.batches = [];             // lotti completati
      this.currentBatch = null;
      this.inflightFine = {};        // siloId -> anticipo appreso in fase fine (kg)
      this.history = [];             // trend campionato
      this._histAcc = 0;
      this.pipeLoad = [];            // delay line caricamento -> silo
      this.pipeBatch = [];           // delay line silo -> tramoggia
      TAGS.SILOS.forEach((s) => { this.inflightFine[s.id] = P.weigher.inflightInitialKg; });
      this.log('Sistema inizializzato — modalità ' + this.mode);
      this.refreshLevels();
    }

    /* ── log & allarmi ─────────────────────────────────────── */
    log(text, kind) {
      this.events.push({ t: this.time, iso: nowIso(this.time), kind: kind || 'INFO', text });
      if (this.events.length > 500) this.events.shift();
    }

    alarm(code, tag, cls, text) {
      if (this.alarms.has(code)) return;
      this.alarms.set(code, { code, tag, cls, text, since: this.time, ack: false });
      this.log('ALLARME ' + cls + ' [' + code + '] ' + text, 'ALARM');
    }

    clearAlarm(code) {
      if (this.alarms.delete(code)) this.log('Allarme rientrato [' + code + ']', 'INFO');
    }

    ackAll() { for (const a of this.alarms.values()) a.ack = true; this.log('Allarmi riconosciuti da ' + this.operator, 'INFO'); }

    /* ── consensi / interblocchi ───────────────────────────── */
    conveyorReady() {
      return this.blower.run && this.knifeGate.open && this.airlock.run &&
        this.blower.vacuumKpa >= P.conveying.saltationMinKpa && !this.estop;
    }

    openDiverter(i) {
      if (this.estop) return this.deny('Emergenza attiva');
      if (this.silos[i].lsHigh) { this.alarm('A-101', 'LS-20' + (i + 1) + 'H', 'WARNING', 'Livello alto ' + this.silos[i].id + ' — caricamento bloccato'); return this.deny('Livello alto su ' + this.silos[i].id); }
      if (!this.conveyorReady()) return this.deny('Linea di trasporto non pronta (soffiante/ghigliottina/rotativa/vuoto)');
      this.diverter.forEach((d, k) => { d.open = k === i; });
      this.log('Deviatrice ' + this.silos[i].id + ' aperta', 'CMD');
      return { ok: true };
    }

    closeAllDiverters() { this.diverter.forEach((d) => { d.open = false; }); }

    openSiloValve(i) {
      if (this.estop) return this.deny('Emergenza attiva');
      if (!this.batchLine.dv109) return this.deny('Linea di dosaggio (DV-109) chiusa');
      const other = this.silos.findIndex((s, k) => k !== i && s.valve.open);
      if (other >= 0) return this.deny('Già aperto lo scarico di ' + this.silos[other].id);
      if (this.silos[i].lsLow) { this.alarm('A-102', 'LS-20' + (i + 1) + 'L', 'WARNING', 'Livello basso ' + this.silos[i].id); return this.deny('Silo ' + this.silos[i].id + ' in livello basso'); }
      if (!this.blower.run || this.blower.vacuumKpa < P.conveying.saltationMinKpa) return this.deny('Vuoto insufficiente in linea di dosaggio');
      if (this.weigher.overload) return this.deny('Tramoggia in sovraccarico');
      this.silos[i].valve.open = true;
      this.log('Scarico ' + this.silos[i].id + ' aperto', 'CMD');
      return { ok: true };
    }

    closeSiloValve(i) { if (this.silos[i].valve.open) { this.silos[i].valve.open = false; this.log('Scarico ' + this.silos[i].id + ' chiuso', 'CMD'); } }

    openDischarge() {
      if (this.estop) return this.deny('Emergenza attiva');
      if (this.roaster.full) { this.alarm('A-403', 'LS-301H', 'WARNING', 'Tramoggia torrefattrice piena'); return this.deny('Torrefattrice piena'); }
      if (this.silos.some((s) => s.valve.open)) return this.deny('Chiudere prima gli scarichi dei silos');
      this.weigher.valve.open = true;
      this.log('Scarico tramoggia EV-250 aperto', 'CMD');
      return { ok: true };
    }

    closeDischarge() { if (this.weigher.valve.open) { this.weigher.valve.open = false; this.log('Scarico EV-250 chiuso', 'CMD'); } }

    startBlower() {
      if (this.estop) return this.deny('Emergenza attiva');
      this.blower.cmd = true;
      this.log('Soffiante BL-01 avviata (rif. ' + this.blower.refPct + '%)', 'CMD');
      return { ok: true };
    }

    stopBlower() {
      this.blower.cmd = false;
      this.log('Soffiante BL-01 arrestata', 'CMD');
      return { ok: true };
    }

    setAirlock(run) {
      this.airlock.run = !!run;
      this.log('Valvola rotativa M-101 ' + (run ? 'in marcia' : 'arrestata'), 'CMD');
      return { ok: true };
    }

    setKnifeGate(open) {
      this.knifeGate.open = !!open;
      this.log('Ghigliottina EV-101 ' + (open ? 'aperta' : 'chiusa'), 'CMD');
      return { ok: true };
    }

    emergencyStop() {
      this.estop = true;
      this.alarm('A-401', 'ESTOP-01', 'CRITICAL', 'Emergenza premuta');
      this.blower.cmd = false; this.airlock.run = false; this.knifeGate.open = false;
      this.closeAllDiverters(); this.silos.forEach((s) => { s.valve.open = false; });
      this.weigher.valve.open = false; this.batchLine.dv109 = false;
      if (this.currentBatch) this.abortBatch('Emergenza');
      this.log('ARRESTO DI EMERGENZA', 'CRITICAL');
    }

    resetEmergency() {
      this.estop = false;
      this.clearAlarm('A-401');
      this.log('Emergenza riarmata', 'CMD');
    }

    deny(reason) { return { ok: false, reason }; }

    /* ── ricette e lotti ───────────────────────────────────── */
    startBatch(recipeId) {
      if (this.estop) return this.deny('Emergenza attiva');
      const recipe = TAGS.RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return this.deny('Ricetta inesistente');
      if (this.currentBatch) return this.deny('Lotto già in corso');
      const blocked = [];
      recipe.components.forEach((c) => {
        const s = this.silos.find((x) => x.id === c.silo);
        if (s.lsLow) blocked.push(s.id + ' (livello basso)');
        if (s.weightKg < c.kg) blocked.push(s.id + ' (giacenza ' + s.weightKg.toFixed(1) + ' kg < ' + c.kg + ' kg)');
      });
      if (blocked.length) return this.deny('Componenti non disponibili: ' + blocked.join(', '));
      if (!this.blower.run) this.startBlower();
      if (!this.airlock.run) this.setAirlock(true);
      if (!this.knifeGate.open) this.setKnifeGate(true);
      this.batchLine.dv109 = true;
      this.batchLine.throttlePct = P.conveying.throttle.coarsePct;
      this.weigher.targetKg = recipe.batchKg;
      this.weigher.actualKg = 0;
      this.currentBatch = {
        id: 'B-' + nowIso(this.time).replace(/[-: ]/g, '').slice(0, 14),
        recipe: recipe.id, recipeName: recipe.name, operator: this.operator,
        started: this.time, components: recipe.components.map((c) => ({
          silo: c.silo, targetKg: c.kg, actualKg: 0, ok: null,
          variety: (this.silos.find((s) => s.id === c.silo) || {}).variety,
          lot: (this.silos.find((s) => s.id === c.silo) || {}).lot,
        })),
        idx: 0, phase: 'COARSE', phaseT: 0, settleT: 0, tolerancePct: recipe.tolerancePct || P.weigher.tolerancePct,
        totalTargetKg: recipe.batchKg, status: 'RUNNING', alarms: [], componentBaseKg: 0,
      };
      this.log('LOTTO AVVIATO ' + this.currentBatch.id + ' — ricetta "' + recipe.name + '" (' + recipe.batchKg + ' kg)', 'BATCH');
      return { ok: true };
    }

    abortBatch(reason) {
      if (!this.currentBatch) return;
      this.currentBatch.status = 'ABORTED';
      this.currentBatch.abortReason = reason || 'operatore';
      this.silos.forEach((s) => { s.valve.open = false; });
      this.weigher.valve.open = false;
      this.batchLine.dv109 = false;
      this.batches.push(this.currentBatch);
      this.log('LOTTO ANNULLATO ' + this.currentBatch.id + ' — ' + this.currentBatch.abortReason, 'BATCH');
      this.currentBatch = null;
    }

    /* ── avanzamento simulazione ───────────────────────────── */
    step(dt) {
      if (!isFinite(dt) || dt <= 0) dt = 0.05; // un dt non valido non deve corrompere lo stato
      dt = Math.min(0.25, Math.max(0.001, dt));
      this.time += dt;
      this.stepBlower(dt);
      this.stepFilter(dt);
      this.stepLoading(dt);
      this.stepBatching(dt);
      this.stepWeigher(dt);
      this.stepBatchSequence(dt);
      this.stepInstruments(dt);
      this.stepTrend(dt);
    }

    stepBlower(dt) {
      const b = this.blower;
      const target = b.cmd && !b.fault ? (b.refPct / 100) * P.blower.vacuumMaxKpa : 0;
      const tau = target > b.vacuumKpa ? P.blower.spinUpTauS : P.blower.spinUpTauS * 2.2;
      b.vacuumKpa += (target - b.vacuumKpa) * (dt / tau);
      b.run = b.vacuumKpa > 3;
      const load = b.vacuumKpa / P.blower.vacuumMaxKpa;
      b.currentA = b.run ? P.blower.currentNoLoadA + load * (P.blower.currentFullA - P.blower.currentNoLoadA) : 0;

      if (!b.run && this.conveyorReady() === false && (this.diverter.some((d) => d.open) || this.silos.some((s) => s.valve.open))) {
        this.alarm('A-201', 'PI-102', 'ALARM', 'Vuoto insufficiente in linea');
        this.closeAllDiverters();
      } else if (b.vacuumKpa >= P.conveying.saltationMinKpa || !this.silos.some((s) => s.valve.open)) {
        this.clearAlarm('A-201');
      }
    }

    stepFilter(dt) {
      const f = this.filter;
      const conveying = this.conveyorReady() && (this.diverter.some((d) => d.open) || this.silos.some((s) => s.valve.open));
      if (conveying) f.dpKpa += dt * 0.0035;
      f.cleanT += dt;
      if (f.cleaning) {
        f.dpKpa = Math.max(P.filter.dpCleanKpa, f.dpKpa - dt * 0.6);
        if (f.cleanT > P.filter.cleanDurationS) { f.cleaning = false; f.cleanT = 0; }
      } else if (f.cleanT > P.filter.cleanIntervalS) {
        f.cleaning = true; f.cleanT = 0;
        this.log('Ciclo pulizia filtro (controsoffio)', 'CMD');
      }
      if (f.dpKpa > P.filter.dpAlarmKpa) { this.alarm('A-204', 'PDT-103', 'WARNING', 'Filtro intasato (ΔP alta)'); f.cleaning = true; f.cleanT = 0; }
      else this.clearAlarm('A-204');
    }

    stepLoading(dt) {
      const openIdx = this.diverter.findIndex((d) => d.open);
      const active = openIdx >= 0 && this.conveyorReady();
      if (!active) { this.cyclone.lsl151 = this.cyclone.bufferKg < 0.5; return; }
      const prod = TAGS.PRODUCTS[this.source.process];
      const mdot = P.conveying.loadRateKgSPerKpa * this.blower.vacuumKpa * prod.flowFactor * (1 + (this.rand() - 0.5) * 0.04);
      this.cyclone.bufferKg += mdot * dt;
      if (this.cyclone.bufferKg > P.cyclone.bufferCapacityKg) {
        this.alarm('A-205', 'CY-101', 'ALARM', 'Ciclone in sovraccarico — verifica valvola rotativa');
        this.closeAllDiverters();
        return;
      }
      // airlock discharge toward the manifold, then transport delay to the silo
      const out = Math.min(P.cyclone.airlockRateKgS, this.cyclone.bufferKg / Math.max(dt, 1e-3)) * (this.airlock.run ? 1 : 0) * dt;
      this.cyclone.bufferKg -= out;
      if (out > 0) this.pipeLoad.push({ t: this.time + P.conveying.transportDelayS, kg: out, silo: openIdx });
      for (let i = this.pipeLoad.length - 1; i >= 0; i--) {
        const p = this.pipeLoad[i];
        if (p.t <= this.time) {
          const silo = this.silos[p.silo];
          const room = silo.capacityKg - silo.weightKg;
          const qty = Math.min(p.kg, Math.max(0, room));
          silo.weightKg += qty;
          if (qty < p.kg - 1e-6) this.alarm('A-101', 'LS-20' + (p.silo + 1) + 'H', 'WARNING', 'Livello alto ' + silo.id + ' — caricamento bloccato');
          this.pipeLoad.splice(i, 1);
        }
      }
      this.cyclone.lsl151 = this.cyclone.bufferKg < 0.5;
    }

    stepBatching(dt) {
      const openIdx = this.silos.findIndex((s) => s.valve.open);
      const active = openIdx >= 0 && this.conveyorReady() && this.batchLine.dv109;
      if (!active) return;
      const silo = this.silos[openIdx];
      const prod = TAGS.PRODUCTS[silo.process];
      const throttle = Math.max(0, Math.min(100, this.batchLine.throttlePct)) / 100;
      const mdot = P.conveying.batchRateKgSPerKpa * this.blower.vacuumKpa * prod.flowFactor * throttle * (1 + (this.rand() - 0.5) * 0.05);
      const qty = Math.min(mdot * dt, Math.max(0, silo.weightKg));
      if (qty <= 0) return;
      silo.weightKg -= qty;
      this.pipeBatch.push({ t: this.time + P.conveying.transportDelayS, kg: qty });
      this.calcInstruments();
    }

    stepWeigher(dt) {
      for (let i = this.pipeBatch.length - 1; i >= 0; i--) {
        const p = this.pipeBatch[i];
        if (p.t <= this.time) {
          this.weigher.actualKg += p.kg;
          this.pipeBatch.splice(i, 1);
        }
      }
      if (this.weigher.valve.open) {
        if (this.roaster.full) {
          this.weigher.valve.open = false;
          this.alarm('A-403', 'LS-301H', 'WARNING', 'Tramoggia torrefattrice piena — scarico bloccato');
        } else {
          const roasterRoom = P.roaster.hopperCapacityKg - this.roaster.weightKg;
          const q = Math.min(P.weigher.dischargeRateKgS * dt, this.weigher.actualKg, Math.max(0, roasterRoom));
          this.weigher.actualKg = Math.max(0, this.weigher.actualKg - q);
          this.roaster.weightKg += q;
          if (this.weigher.actualKg < 0.05 && q > 0) {
            this.weigher.actualKg = 0;
            this.weigher.valve.open = false;
            this.log('Tramoggia scaricata verso la torrefattrice (' + this.roaster.weightKg.toFixed(1) + ' kg in tramoggia torrefattrice)', 'BATCH');
            if (this.currentBatch && this.currentBatch.phase === 'DISCHARGE') this.completeBatch();
          }
        }
      }
      this.roaster.full = this.roaster.weightKg >= P.roaster.hopperCapacityKg - 0.01;
      this.calcInstruments();
    }

    calcInstruments() {
      const w = this.weigher.actualKg;
      this.weigher.lc[0] = w / 3 + (this.rand() - 0.5) * 0.04;
      this.weigher.lc[1] = w / 3 + (this.rand() - 0.5) * 0.04;
      this.weigher.lc[2] = w / 3 + (this.rand() - 0.5) * 0.04;
      for (const s of this.silos) {
        s.lc[0] = s.weightKg / 3 + (this.rand() - 0.5) * 0.3;
        s.lc[1] = s.weightKg / 3 + (this.rand() - 0.5) * 0.3;
        s.lc[2] = s.weightKg / 3 + (this.rand() - 0.5) * 0.3;
      }
      this.weigher.overload = w > P.weigher.capacityKg * (P.weigher.overloadPct / 100);
      if (this.weigher.overload) { this.alarm('A-301', 'WT-250', 'ALARM', 'Sovraccarico tramoggia di pesa'); this.silos.forEach((s) => { s.valve.open = false; }); }
      else this.clearAlarm('A-301');
    }

    refreshLevels() {
      for (const s of this.silos) {
        s.lsHigh = s.weightKg >= s.capacityKg * (P.silo.highAlarmPct / 100);
        s.lsLow = s.weightKg <= s.capacityKg * (P.silo.lowAlarmPct / 100);
      }
    }

    stepInstruments(dt) {
      this.refreshLevels();
      for (let i = 0; i < this.silos.length; i++) {
        if (this.silos[i].lsHigh && this.diverter[i].open) {
          this.alarm('A-101', 'LS-20' + (i + 1) + 'H', 'WARNING', 'Livello alto ' + this.silos[i].id + ' — caricamento bloccato');
          this.diverter[i].open = false;
        }
      }
      void dt;
    }

    stepTrend(dt) {
      this._histAcc += dt;
      if (this._histAcc >= 1) {
        this._histAcc = 0;
        const feedRate = this.silos.some((s) => s.valve.open) ? P.conveying.batchRateKgSPerKpa * this.blower.vacuumKpa : 0;
        this.history.push({
          t: this.time, vacuum: this.blower.vacuumKpa, weight: this.weigher.actualKg,
          current: this.blower.currentA, feed: feedRate, dp: this.filter.dpKpa,
        });
        if (this.history.length > 180) this.history.shift();
      }
    }

    /* ── sequencer di dosaggio ─────────────────────────────── */
    stepBatchSequence(dt) {
      const cb = this.currentBatch;
      if (!cb || cb.status !== 'RUNNING') return;
      cb.phaseT += dt;
      const comp = cb.components[cb.idx];
      if (!comp) { this.completeBatch(); return; }
      const siloIdx = this.silos.findIndex((s) => s.id === comp.silo);
      if (comp.attempts == null) comp.attempts = 0;
      const remaining = comp.targetKg - this.doseSoFar(cb);
      const inflight = this.inflightFine[comp.silo] || P.weigher.inflightInitialKg;
      const TH = P.conveying.throttle;

      if (cb.phase === 'COARSE' || cb.phase === 'FINE' || cb.phase === 'TOPOFF') {
        if (cb.phaseT > P.batch.timeoutS) {
          this.alarm('A-303', 'BATCH', 'ALARM', 'Timeout ciclo di dosaggio');
          this.abortBatch('timeout');
          return;
        }
        if (!this.silos[siloIdx].valve.open) {
          const r = this.openSiloValve(siloIdx);
          if (!r.ok) { this.abortBatch('interblocco: ' + r.reason); return; }
        }
        if (cb.phase === 'COARSE') {
          this.batchLine.throttlePct = TH.coarsePct;
          if (remaining <= Math.max(inflight * 3, comp.targetKg * 0.15)) {
            cb.phase = 'FINE'; cb.phaseT = 0;
            this.batchLine.throttlePct = TH.finePct;
            this.log('Lotto ' + cb.id + ': fase FINE su ' + comp.silo + ' (valvola EV-260 a ' + TH.finePct + '%)', 'BATCH');
          }
        } else if (cb.phase === 'FINE') {
          if (remaining <= inflight) {
            this.closeSiloValve(siloIdx);
            cb.phase = 'SETTLE'; cb.phaseT = 0;
          }
        } else { // TOPOFF a impulsi finissimi
          if (remaining <= Math.max(inflight * 0.5, 0.04)) {
            this.closeSiloValve(siloIdx);
            cb.phase = 'SETTLE'; cb.phaseT = 0;
          }
        }
      } else if (cb.phase === 'SETTLE') {
        if (cb.phaseT >= cb.settleT && this.pipeBatch.length === 0) {
          const dose = this.doseSoFar(cb);
          const delta = dose - comp.targetKg;
          const tol = Math.max((cb.tolerancePct / 100) * comp.targetKg, P.weigher.toleranceMinKg);
          if (delta < -tol && comp.attempts < 3) {
            comp.attempts++;
            cb.phase = 'TOPOFF'; cb.phaseT = 0;
            this.batchLine.throttlePct = TH.topoffPct;
            this.log('Top-up ' + comp.silo + ' #' + comp.attempts + ' — mancano ' + (-delta).toFixed(3) + ' kg', 'BATCH');
            return;
          }
          comp.actualKg = dose;
          comp.deltaKg = delta;
          comp.ok = Math.abs(delta) <= tol;
          this.inflightFine[comp.silo] = clamp(inflight + P.weigher.inflightAdapt * delta, 0.02, 3);
          if (!comp.ok) {
            this.alarm('A-302', 'WT-250', 'WARNING', 'Dose fuori tolleranza: ' + comp.silo + ' ' + delta.toFixed(2) + ' kg (tol ±' + tol.toFixed(2) + ')');
            cb.alarms.push('fuori tolleranza ' + comp.silo + ' ' + delta.toFixed(2) + ' kg');
          }
          this.log('Dose ' + comp.silo + ': target ' + comp.targetKg.toFixed(2) + ' kg, reale ' + dose.toFixed(2) + ' kg, scarto ' + delta.toFixed(3) + ' kg' + (comp.ok ? ' [OK]' : ' [FUORI TOLLERANZA]'), 'BATCH');
          this.batchLine.throttlePct = TH.coarsePct;
          cb.idx++;
          cb.phase = 'COARSE'; cb.phaseT = 0;
          cb.componentBaseKg = this.weigher.actualKg;
        }
      } else if (cb.phase === 'DISCHARGE') {
        if (this.weigher.actualKg <= 0.05) this.completeBatch();
      }
    }

    doseSoFar(cb) {
      // dose del componente corrente = peso attuale - peso a inizio componente
      const base = cb.componentBaseKg || 0;
      return Math.max(0, this.weigher.actualKg - base);
    }

    completeBatch() {
      const cb = this.currentBatch;
      if (!cb) return;
      if (cb.phase !== 'DISCHARGE') {
        cb.phase = 'DISCHARGE';
        cb.status = 'DISCHARGING';
        this.silos.forEach((s) => { s.valve.open = false; });
        this.batchLine.dv109 = false;
        const r = this.openDischarge();
        if (!r.ok) { this.abortBatch('scarico: ' + r.reason); return; }
        this.log('LOTTO ' + cb.id + ' completo — scarico verso torrefattrice', 'BATCH');
        return;
      }
      cb.status = 'DONE';
      cb.finished = this.time;
      cb.durationS = cb.finished - cb.started;
      cb.totalActualKg = cb.components.reduce((a, c) => a + (c.actualKg || 0), 0);
      this.batches.push(cb);
      this.currentBatch = null;
      this.log('REPORT LOTTO ' + cb.id + ' — totale ' + cb.totalActualKg.toFixed(2) + ' kg su ' + cb.totalTargetKg.toFixed(2) + ' kg in ' + cb.durationS.toFixed(0) + ' s', 'BATCH');
    }

    /* ── snapshot per HMI / test ───────────────────────────── */
    snapshot() {
      return {
        time: this.time, iso: nowIso(this.time), mode: this.mode, estop: this.estop,
        blower: Object.assign({}, this.blower),
        filter: Object.assign({}, this.filter),
        cyclone: Object.assign({}, this.cyclone),
        airlock: Object.assign({}, this.airlock),
        knifeGate: Object.assign({}, this.knifeGate),
        source: Object.assign({}, this.source),
        silos: this.silos.map((s) => ({
          id: s.id, variety: s.variety, process: s.process, lot: s.lot, grade: s.grade, origin: s.origin,
          weightKg: s.weightKg, capacityKg: s.capacityKg, pct: (s.weightKg / s.capacityKg) * 100,
          lsHigh: s.lsHigh, lsLow: s.lsLow, valveOpen: s.valve.open, lc: s.lc.slice(),
        })),
        diverter: this.diverter.map((d) => d.open),
        batchLine: Object.assign({}, this.batchLine),
        weigher: {
          actualKg: this.weigher.actualKg, targetKg: this.weigher.targetKg, valveOpen: this.weigher.valve.open,
          overload: this.weigher.overload, lc: this.weigher.lc.slice(),
        },
        roaster: Object.assign({}, this.roaster),
        alarms: Array.from(this.alarms.values()),
        batch: this.currentBatch ? JSON.parse(JSON.stringify(this.currentBatch)) : null,
        inflight: Object.assign({}, this.inflightFine),
      };
    }

    /* mappa tag I/O -> valore live (per il monitor I/O e il mockup elettronico) */
    tagValues() {
      const v = {};
      v['BL-01-RUN'] = this.blower.cmd ? 1 : 0;
      v['BL-01-FB'] = this.blower.run ? 1 : 0;
      v['BL-01-FLT'] = this.blower.fault ? 1 : 0;
      v['VFD-01-REF'] = this.blower.refPct;
      v['CT-01'] = +this.blower.currentA.toFixed(2);
      v['PI-102'] = -+this.blower.vacuumKpa.toFixed(1);
      v['PDT-103'] = +this.filter.dpKpa.toFixed(2);
      v['EV-104'] = this.filter.cleaning ? 1 : 0;
      v['LSL-151'] = this.cyclone.lsl151 ? 1 : 0;
      v['EV-101-O'] = this.knifeGate.open ? 1 : 0;
      v['EV-101-C'] = this.knifeGate.open ? 0 : 1;
      v['EV-101-OP'] = this.knifeGate.open ? 1 : 0;
      v['EV-101-CL'] = this.knifeGate.open ? 0 : 1;
      v['M-101-RUN'] = this.airlock.run ? 1 : 0;
      v['M-101-FB'] = this.airlock.run ? 1 : 0;
      v['M-101-FLT'] = this.airlock.fault ? 1 : 0;
      v['DV-109'] = this.batchLine.dv109 ? 1 : 0;
      v['DV-109-OP'] = this.batchLine.dv109 ? 1 : 0;
      v['EV-260-REF'] = +this.batchLine.throttlePct.toFixed(1);
      v['EV-260-POS'] = +this.batchLine.throttlePct.toFixed(1);
      this.silos.forEach((s, i) => {
        const n = i + 1;
        v['DV-10' + n] = this.diverter[i].open ? 1 : 0;
        v['DV-10' + n + '-OP'] = this.diverter[i].open ? 1 : 0;
        v['LS-20' + n + 'H'] = s.lsHigh ? 1 : 0;
        v['LS-20' + n + 'L'] = s.lsLow ? 1 : 0;
        v['WT-20' + n] = +s.weightKg.toFixed(1);
        v['EV-20' + n + '-O'] = s.valve.open ? 1 : 0;
        v['EV-20' + n + '-C'] = s.valve.open ? 0 : 1;
        v['EV-20' + n + '-OP'] = s.valve.open ? 1 : 0;
        v['EV-20' + n + '-CL'] = s.valve.open ? 0 : 1;
      });
      v['LC-01'] = +this.weigher.lc[0].toFixed(2);
      v['LC-02'] = +this.weigher.lc[1].toFixed(2);
      v['LC-03'] = +this.weigher.lc[2].toFixed(2);
      v['WT-250'] = +this.weigher.actualKg.toFixed(2);
      v['EV-250-O'] = this.weigher.valve.open ? 1 : 0;
      v['EV-250-C'] = this.weigher.valve.open ? 0 : 1;
      v['EV-250-OP'] = this.weigher.valve.open ? 1 : 0;
      v['EV-250-CL'] = this.weigher.valve.open ? 0 : 1;
      v['LS-301H'] = this.roaster.full ? 1 : 0;
      v['ESTOP-01'] = this.estop ? 1 : 0;
      v['ESTOP-01-B'] = this.estop ? 1 : 0;
      v['MODE-LOCAL'] = this.mode === 'MANUAL' ? 1 : 0;
      v['PANEL-DOOR'] = 0;
      v['BEACON-01'] = this.alarms.size > 0 ? 1 : 0;
      v['AIR-PRESS'] = 1;
      return v;
    }
  }

  return { Plant, P, nowIso };
});
