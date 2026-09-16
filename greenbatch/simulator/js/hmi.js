/*
 * GreenBatch GB-8S — rendering HMI.
 * Tre viste: isometrica 3D (canvas), mimic P&ID (canvas), trend (canvas).
 * Più helper DOM per schede silos, pannello SCALE, allarmi, I/O, lotti.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GB_HMI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const C = {
    bg: '#0b0f14', grid: '#16202b', frame: '#3b4a5a', steel: '#9fb3c8', steelDark: '#5d7386',
    pipe: '#7d8f9f', pipeActive: '#38d6c0', conveyor: '#2a3644',
    text: '#dbe6f0', textDim: '#7c8fa3', green: '#37d67a', amber: '#ffb020', red: '#ff4d5e',
    blue: '#3fa9f5', washe: '#7ee081', natural: '#ffd166', gold: '#ffd166',
    hopperFill: '#c8a165', panel: '#101820',
  };

  const SILO_GEOM = { coneBase: 2.02, coneTip: 1.15, top: 4.02, radius: 0.5 };

  function project(x, y, z, s, ox, oy) {
    return { x: ox + (x - z) * 0.866 * s, y: oy + ((x + z) * 0.5 - y) * s };
  }

  function fitScale(canvas, layout, pad) {
    // stima bounding box proiettata dai punti noti del layout
    const pts = [];
    pts.push([-1, 0, -1.2], [15, 0, -1.2], [-1, 0, 2.6], [15, 0, 2.6], [-1, 5.2, -1.2], [15, 5.2, 2.6]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y, z] of pts) {
      const sx = (x - z) * 0.866, sy = (x + z) * 0.5 - y;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    const s = Math.min((canvas.width) / (maxX - minX + pad * 2), (canvas.height) / (maxY - minY + pad * 2));
    const ox = -minX * s + pad * s;
    const oy = (maxY + pad) * s;
    return { s, ox, oy };
  }

  function ellipse(ctx, cx, cy, rx, ry, fill, stroke) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function dashedFlow(ctx, a, b, phase, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 3;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -phase;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function pipe(ctx, a, b, color, width) {
    ctx.save();
    ctx.strokeStyle = color || C.pipe;
    ctx.lineWidth = width || 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  /* ═══════════════ vista isometrica 3D ═══════════════ */
  function drawIso(canvas, snap, layout, anim, dpr) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const oldW = canvas.width; const oldH = canvas.height;
    canvas.width = oldW; canvas.height = oldH; // no-op, mantiene il buffer
    const fit = fitScale({ width: W, height: H }, layout, 0.5);
    const P = (x, y, z) => project(x, y, z, fit.s, fit.ox, fit.oy);

    // piano di calpestio
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let gx = -1; gx <= 15; gx += 1) {
      const a = P(gx, 0, -1.2), b = P(gx, 0, 2.6);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let gz = -1.2; gz <= 2.6; gz += 0.76) {
      const a = P(-1, 0, gz), b = P(15, 0, gz);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // telaio di supporto
    ctx.strokeStyle = C.frame;
    ctx.lineWidth = 3;
    const fx0 = -0.8, fx1 = 12.6, fz0 = -1.0, fz1 = 1.6, fyTop = 4.3;
    const legs = [[fx0, fz0], [fx1, fz0], [fx0, fz1], [fx1, fz1]];
    for (const [lx, lz] of legs) {
      const a = P(lx, 0, lz), b = P(lx, fyTop, lz);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const y of [fyTop, 0.95]) {
      ctx.beginPath();
      const c1 = P(fx0, y, fz0), c2 = P(fx1, y, fz0), c3 = P(fx1, y, fz1), c4 = P(fx0, y, fz1);
      ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y); ctx.closePath();
      ctx.stroke();
    }

    // silos
    const activeSilo = snap.silos.findIndex((s) => s.valveOpen);
    const activeDiverter = snap.diverter.findIndex((d) => d);
    snap.silos.forEach((s, i) => {
      const pos = layout.silos[i].position_3d;
      const g = SILO_GEOM;
      const bottom = P(pos.x, g.coneTip, pos.z);
      const coneBase = P(pos.x, g.coneBase, pos.z);
      const top = P(pos.x, g.top, pos.z);
      const rx = g.radius * 0.866 * fit.s, ry = g.radius * 0.5 * fit.s;

      // cono
      ctx.beginPath();
      ctx.moveTo(bottom.x, bottom.y);
      ctx.lineTo(coneBase.x - rx, coneBase.y);
      ctx.lineTo(coneBase.x + rx, coneBase.y);
      ctx.closePath();
      ctx.fillStyle = '#1b2836';
      ctx.fill();
      ctx.strokeStyle = C.steelDark; ctx.lineWidth = 1.5; ctx.stroke();

      // corpo cilindro
      const bodyH = top.y - coneBase.y;
      const grad = ctx.createLinearGradient(coneBase.x - rx, 0, coneBase.x + rx, 0);
      grad.addColorStop(0, '#2b3a4a'); grad.addColorStop(0.45, '#40566b'); grad.addColorStop(1, '#22303e');
      ctx.fillStyle = grad;
      ctx.fillRect(coneBase.x - rx, top.y, rx * 2, bodyH);

      // livello prodotto
      const prod = snap.silos[i].process === 'N' ? C.natural : C.washe;
      const frac = Math.max(0, Math.min(1, s.pct / 100));
      const fillTopY = coneBase.y - bodyH * frac;
      ctx.save();
      ctx.beginPath();
      ctx.rect(coneBase.x - rx, fillTopY, rx * 2, coneBase.y - fillTopY);
      ctx.clip();
      const fg = ctx.createLinearGradient(0, fillTopY, 0, coneBase.y);
      fg.addColorStop(0, prod); fg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = fg;
      ctx.fillRect(coneBase.x - rx, fillTopY, rx * 2, coneBase.y - fillTopY);
      ctx.restore();

      // contorno corpo + ellissi
      ctx.strokeStyle = C.steel; ctx.lineWidth = 1.5;
      ctx.strokeRect(coneBase.x - rx, top.y, rx * 2, bodyH);
      ellipse(ctx, top.x, top.y, rx, ry, 'rgba(120,150,175,0.25)', C.steel);
      ellipse(ctx, coneBase.x, coneBase.y, rx, ry, null, C.steelDark);

      // allarme livello alto: quadratino rosso (come nell'HMI originale)
      if (s.lsHigh) {
        ctx.fillStyle = C.red;
        const blink = 0.55 + 0.45 * Math.sin(anim * 6);
        ctx.globalAlpha = blink;
        ctx.fillRect(top.x + rx * 0.55, top.y - ry - 10, 9, 9);
        ctx.globalAlpha = 1;
      }
      // dosaggio in corso: evidenzia il silo attivo
      if (i === activeSilo) {
        ctx.strokeStyle = C.green; ctx.lineWidth = 2.5;
        ctx.strokeRect(coneBase.x - rx - 3, top.y - 3, rx * 2 + 6, bodyH + 6);
      }
      if (i === activeDiverter) {
        ctx.fillStyle = C.blue;
        ctx.fillRect(top.x - 5, top.y - ry - 12, 10, 5);
      }

      // etichetta
      ctx.fillStyle = C.text;
      ctx.font = '600 11px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.id, top.x, top.y - ry - 20);
      ctx.fillStyle = C.textDim;
      ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(s.weightKg.toFixed(1) + ' kg', top.x, top.y - ry - 8);
      ctx.fillStyle = s.process === 'N' ? C.natural : C.washe;
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('(' + s.process + ') ' + s.variety.slice(0, 14), top.x, coneBase.y + 16);
    });

    // collettore di distribuzione + linea di carico
    const man = layout.distributionManifold.position_3d;
    const mA = P(0.2, man.y, man.z), mB = P(12.0, man.y, man.z);
    pipe(ctx, mA, mB, C.pipe, 5);
    const col = layout.collectionManifold.position_3d;
    const cA = P(0.2, col.y, col.z), cB = P(12.0, col.y, col.z);
    pipe(ctx, cA, cB, C.pipe, 5);

    // ciclone + filtro + soffiante
    const cyc = layout.cyclone.position_3d;
    const cyTop = P(cyc.x, cyc.y + 0.9, cyc.z), cyBot = P(cyc.x, cyc.y - 0.7, cyc.z);
    const cyRx = 0.45 * 0.866 * fit.s, cyRy = 0.45 * 0.5 * fit.s;
    ctx.fillStyle = '#31465a';
    ctx.fillRect(cyTop.x - cyRx, cyTop.y, cyRx * 2, cyBot.y - cyTop.y);
    ctx.beginPath();
    ctx.moveTo(cyBot.x - cyRx, cyBot.y); ctx.lineTo(cyBot.x, cyBot.y + cyRy * 2.2); ctx.lineTo(cyBot.x + cyRx, cyBot.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.steel; ctx.lineWidth = 1.5;
    ctx.strokeRect(cyTop.x - cyRx, cyTop.y, cyRx * 2, cyBot.y - cyTop.y);
    ellipse(ctx, cyTop.x, cyTop.y, cyRx, cyRy, 'rgba(120,150,175,0.25)', C.steel);
    label(ctx, 'CY-101', cyTop.x, cyTop.y - 10);

    const flt = layout.filter.position_3d;
    const fP = P(flt.x, flt.y, flt.z);
    ctx.fillStyle = '#2a3b4d'; ctx.fillRect(fP.x - 16, fP.y - 22, 32, 44);
    ctx.strokeStyle = C.steel; ctx.lineWidth = 1.5; ctx.strokeRect(fP.x - 16, fP.y - 22, 32, 44);
    label(ctx, 'FL-101', fP.x, fP.y - 28);

    const blw = layout.blower.position_3d;
    const bP = P(blw.x, blw.y, blw.z);
    const running = snap.blower.run;
    ctx.fillStyle = running ? '#1f5c46' : '#2a3b4d';
    ctx.fillRect(bP.x - 20, bP.y - 20, 40, 40);
    ctx.strokeStyle = running ? C.green : C.steel; ctx.lineWidth = 2;
    ctx.strokeRect(bP.x - 20, bP.y - 20, 40, 40);
    // ventola
    ctx.save();
    ctx.translate(bP.x, bP.y);
    ctx.rotate(running ? anim * 5 : 0);
    ctx.strokeStyle = running ? C.green : C.textDim;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      const ang = (Math.PI / 2) * k;
      ctx.lineTo(Math.cos(ang) * 12, Math.sin(ang) * 12);
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, 'BL-01 ' + (running ? 'RUN' : 'STOP'), bP.x, bP.y + 34, running ? C.green : C.textDim);

    // valvola rotativa + ghigliottina
    const air = layout.airlock.position_3d;
    const aP = P(air.x, air.y, air.z);
    ctx.fillStyle = snap.airlock.run ? '#1f5c46' : '#2a3b4d';
    ctx.beginPath(); ctx.arc(aP.x, aP.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = snap.airlock.run ? C.green : C.steel; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, 'M-101', aP.x + 24, aP.y + 4, snap.airlock.run ? C.green : C.textDim);

    // tubazioni principali
    const blwP = P(blw.x, blw.y, blw.z), fltP = P(flt.x, flt.y, flt.z), cyP = P(cyc.x, cyc.y, cyc.z);
    pipe(ctx, blwP, fltP, C.pipe, 4);
    pipe(ctx, fltP, cyP, C.pipe, 4);
    pipe(ctx, P(cyc.x, cyc.y - 0.7, cyc.z), P(cyc.x, 2.75, cyc.z), C.pipe, 4);
    pipe(ctx, P(cyc.x, 2.4, cyc.z), P(11.4, man.y, man.z), C.pipe, 4);

    // animazione flusso
    if (snap.diverter.some((d) => d) && snap.blower.run && snap.airlock.run) {
      dashedFlow(ctx, P(cyc.x, 2.3, cyc.z), P(11.4, man.y, man.z), anim * 90, C.pipeActive, 3);
      const di = snap.diverter.findIndex((d) => d);
      const siloPos = layout.silos[di].position_3d;
      dashedFlow(ctx, P(siloPos.x, man.y, man.z), P(siloPos.x, SILO_GEOM.top, siloPos.z), anim * 90, C.pipeActive, 3);
    }
    if (activeSilo >= 0) {
      const siloPos = layout.silos[activeSilo].position_3d;
      dashedFlow(ctx, P(siloPos.x, SILO_GEOM.coneTip, siloPos.z), P(siloPos.x, col.y, siloPos.z), anim * 90, C.gold, 3);
      dashedFlow(ctx, P(siloPos.x, col.y, siloPos.z), P(2.0, col.y, 0), anim * 90, C.gold, 3);
    }

    // tramoggia di pesa su 3 celle
    const wh = layout.weighHopper.position_3d;
    const wTop = P(wh.x, wh.y + 0.55, wh.z), wBot = P(wh.x, wh.y - 0.35, wh.z);
    const wRx = 0.42 * 0.866 * fit.s;
    ctx.fillStyle = '#22303e';
    ctx.beginPath();
    ctx.moveTo(wTop.x - wRx, wTop.y); ctx.lineTo(wTop.x + wRx, wTop.y);
    ctx.lineTo(wBot.x + wRx * 0.28, wBot.y); ctx.lineTo(wBot.x - wRx * 0.28, wBot.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.steel; ctx.lineWidth = 1.5; ctx.stroke();
    const wFrac = Math.min(1, snap.weigher.actualKg / 120);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wTop.x - wRx, wTop.y); ctx.lineTo(wTop.x + wRx, wTop.y);
    ctx.lineTo(wBot.x + wRx * 0.28, wBot.y); ctx.lineTo(wBot.x - wRx * 0.28, wBot.y);
    ctx.closePath(); ctx.clip();
    const wf = ctx.createLinearGradient(0, wTop.y, 0, wBot.y);
    wf.addColorStop(0, 'rgba(200,161,101,0.95)'); wf.addColorStop(1, 'rgba(120,90,50,0.9)');
    ctx.fillStyle = wf;
    const wFillY = wBot.y - (wBot.y - wTop.y) * wFrac;
    ctx.fillRect(wTop.x - wRx, wFillY, wRx * 2, wBot.y - wFillY);
    ctx.restore();
    // celle di carico
    [ -0.3, 0, 0.3 ].forEach((dx) => {
      const cp = P(wh.x + dx, wh.y - 0.5, wh.z);
      ctx.fillStyle = snap.weigher.overload ? C.red : C.steelDark;
      ctx.fillRect(cp.x - 5, cp.y, 10, 6);
    });
    label(ctx, 'BILANCIA ' + snap.weigher.actualKg.toFixed(2) + ' kg', wTop.x, wBot.y + 26, C.gold);
    label(ctx, 'target ' + snap.weigher.targetKg.toFixed(1) + ' kg', wTop.x, wBot.y + 38, C.textDim);

    // torrefattrice
    const ro = layout.roasterHopper.position_3d;
    const rTop = P(ro.x, ro.y + 0.8, ro.z), rBot = P(ro.x, ro.y - 0.3, ro.z);
    ctx.fillStyle = '#22303e';
    ctx.fillRect(rTop.x - 22, rTop.y, 44, rBot.y - rTop.y);
    ctx.strokeStyle = C.steel; ctx.lineWidth = 1.5;
    ctx.strokeRect(rTop.x - 22, rTop.y, 44, rBot.y - rTop.y);
    const rFrac = Math.min(1, snap.roaster.weightKg / 80);
    ctx.fillStyle = 'rgba(200,161,101,0.55)';
    ctx.fillRect(rTop.x - 20, rBot.y - (rBot.y - rTop.y) * rFrac, 40, (rBot.y - rTop.y) * rFrac);
    label(ctx, 'TORREFATTRICE', rTop.x, rBot.y + 18, C.textDim);
    if (snap.weigher.valveOpen) {
      dashedFlow(ctx, P(wh.x, wh.y - 0.5, wh.z), P(ro.x, ro.y - 0.3, ro.z), anim * 90, C.green, 3);
    }
  }

  function label(ctx, text, x, y, color) {
    ctx.fillStyle = color || C.text;
    ctx.font = '600 11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  }

  /* ═══════════════ mimic P&ID ═══════════════ */
  function drawMimic(canvas, snap, anim, dpr) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const padX = 26, siloW = (W - padX * 2) / 8;
    const manifoldY = 54, siloTopY = 84, siloBotY = 196, collY = 228, hopperY = 268;

    // linea di distribuzione
    ctx.strokeStyle = C.pipe; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(padX, manifoldY); ctx.lineTo(W - padX, manifoldY); ctx.stroke();
    ctx.fillStyle = C.textDim; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText('DISTRIBUTION MANIFOLD', padX, manifoldY - 10);

    // silos
    snap.silos.forEach((s, i) => {
      const cx = padX + siloW * (i + 0.5);
      const w = siloW * 0.62;
      const prod = s.process === 'N' ? C.natural : C.washe;
      // corpo
      ctx.fillStyle = '#18242f';
      ctx.fillRect(cx - w / 2, siloTopY, w, siloBotY - siloTopY);
      // riempimento
      const frac = Math.max(0, Math.min(1, s.pct / 100));
      ctx.fillStyle = prod; ctx.globalAlpha = 0.55;
      ctx.fillRect(cx - w / 2 + 2, siloBotY - (siloBotY - siloTopY) * frac, w - 4, (siloBotY - siloTopY) * frac);
      ctx.globalAlpha = 1;
      // cono
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, siloBotY); ctx.lineTo(cx + w / 2, siloBotY); ctx.lineTo(cx, collY - 6);
      ctx.closePath(); ctx.fillStyle = '#1d2a36'; ctx.fill();
      ctx.strokeStyle = C.steelDark; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeRect(cx - w / 2, siloTopY, w, siloBotY - siloTopY);

      // deviatore in alto
      drawValve(ctx, cx, manifoldY, snap.diverter[i], false);
      // valvola scarico in basso
      drawValve(ctx, cx, siloBotY + 14, s.valveOpen, s.valveOpen);

      // allarme livello alto: quadratino rosso
      if (s.lsHigh) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(anim * 6);
        ctx.fillStyle = C.red; ctx.fillRect(cx + w / 2 + 3, siloTopY + 2, 8, 8);
        ctx.globalAlpha = 1;
      }
      // etichette
      ctx.textAlign = 'center';
      ctx.fillStyle = C.text; ctx.font = '700 11px ui-monospace, monospace';
      ctx.fillText(s.id, cx, siloTopY - 8);
      ctx.fillStyle = prod; ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('(' + s.process + ')', cx, siloTopY - 19);
      ctx.fillStyle = C.textDim; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(s.weightKg.toFixed(1), cx, siloBotY + 40);
      ctx.fillText('kg', cx, siloBotY + 51);
      // stato
      const st = s.valveOpen ? 'DOSAGGIO' : (s.lsHigh ? 'LIVELLO ALTO' : (s.lsLow ? 'LIVELLO BASSO' : 'STOPPED'));
      ctx.fillStyle = s.valveOpen ? C.green : (s.lsHigh ? C.red : C.textDim);
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(st, cx, collY + 30);
    });

    // collettore di raccolta
    ctx.strokeStyle = C.pipe; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(padX, collY); ctx.lineTo(W - padX, collY); ctx.stroke();
    ctx.fillStyle = C.textDim; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText('COLLECTION MANIFOLD', padX, collY + 16);

    // linea di dosaggio -> tramoggia
    const dv109Open = snap.batchLine.dv109;
    ctx.strokeStyle = dv109Open ? C.gold : C.pipe; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, collY); ctx.lineTo(W * 0.5, hopperY - 26);
    ctx.stroke();
    drawValve(ctx, W * 0.5, collY + 14, dv109Open, dv109Open);
    ctx.fillStyle = C.textDim; ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText('DV-109 / EV-260 ' + snap.batchLine.throttlePct.toFixed(0) + '%', W * 0.5 + 12, collY + 34);

    // tramoggia di pesa + 3 celle
    const hw = 84;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - hw / 2, hopperY - 26);
    ctx.lineTo(W * 0.5 + hw / 2, hopperY - 26);
    ctx.lineTo(W * 0.5 + hw * 0.26, hopperY + 34);
    ctx.lineTo(W * 0.5 - hw * 0.26, hopperY + 34);
    ctx.closePath();
    ctx.fillStyle = '#18242f'; ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    const wf = Math.min(1, snap.weigher.actualKg / 120);
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(200,161,101,0.65)';
    ctx.fillRect(W * 0.5 - hw / 2, hopperY + 34 - 60 * wf, hw, 60 * wf);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = snap.weigher.overload ? C.red : C.gold;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.fillText(snap.weigher.actualKg.toFixed(2) + ' kg', W * 0.5, hopperY + 4);
    ctx.fillStyle = C.textDim; ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('target ' + snap.weigher.targetKg.toFixed(1) + ' kg', W * 0.5, hopperY + 18);
    [ -30, 0, 30 ].forEach((dx) => {
      ctx.fillStyle = C.steelDark; ctx.fillRect(W * 0.5 + dx - 7, hopperY + 38, 14, 7);
      ctx.fillStyle = C.textDim; ctx.font = '8px ui-monospace, monospace';
      const lcIdx = dx < 0 ? 0 : dx === 0 ? 1 : 2;
      ctx.fillText('LC-0' + (lcIdx + 1) + ' ' + snap.weigher.lc[lcIdx].toFixed(1), W * 0.5 + dx, hopperY + 58);
    });
    drawValve(ctx, W * 0.5, hopperY + 52, snap.weigher.valveOpen, snap.weigher.valveOpen);
    ctx.fillStyle = C.textDim; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('EV-250 → TORREFATTRICE', W * 0.5, hopperY + 78);

    // soffiante / filtro / ciclone a destra
    const bx = W - padX - 30;
    ctx.fillStyle = snap.blower.run ? '#1f5c46' : '#22303e';
    ctx.fillRect(bx - 26, 100, 52, 44);
    ctx.strokeStyle = snap.blower.run ? C.green : C.steelDark; ctx.lineWidth = 2;
    ctx.strokeRect(bx - 26, 100, 52, 44);
    ctx.fillStyle = snap.blower.run ? C.green : C.textDim;
    ctx.font = '700 10px ui-monospace, monospace'; ctx.textAlign = 'center';
    ctx.fillText('BL-01', bx, 118);
    ctx.fillText(snap.blower.run ? 'RUN' : 'STOPPED', bx, 132);
    if (snap.blower.fault) { ctx.fillStyle = C.red; ctx.fillRect(bx - 30, 96, 8, 8); }

    // filtro
    ctx.fillStyle = '#22303e'; ctx.fillRect(bx - 20, 168, 40, 34);
    ctx.strokeStyle = C.steelDark; ctx.strokeRect(bx - 20, 168, 40, 34);
    ctx.fillStyle = C.textDim; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('FL-101', bx, 188);
    ctx.fillText('ΔP ' + snap.filter.dpKpa.toFixed(2), bx, 200);

    // ciclone
    const cyx = W - padX - 96;
    ctx.fillStyle = '#22303e';
    ctx.fillRect(cyx - 22, 96, 44, 52);
    ctx.beginPath();
    ctx.moveTo(cyx - 22, 148); ctx.lineTo(cyx + 22, 148); ctx.lineTo(cyx, 176);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = snap.cyclone.lsl151 ? C.green : C.amber; ctx.lineWidth = 1.6;
    ctx.strokeRect(cyx - 22, 96, 44, 52);
    ctx.fillStyle = C.textDim; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('CY-101', cyx, 118);
    ctx.fillText('LSL151 ' + (snap.cyclone.lsl151 ? 'OK' : 'FULL'), cyx, 130);
    // valvola rotativa + ghigliottina
    drawValve(ctx, cyx, 186, snap.knifeGate.open, snap.knifeGate.open);
    ctx.fillStyle = C.textDim; ctx.fillText('EV-101', cyx + 30, 190);
    ctx.fillStyle = snap.airlock.run ? C.green : '#22303e';
    ctx.beginPath(); ctx.arc(cyx, 208, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = snap.airlock.run ? C.green : C.steelDark; ctx.stroke();
    ctx.fillStyle = C.textDim; ctx.fillText('M-101', cyx + 30, 212);

    // tubazioni soffiante-ciclone
    ctx.strokeStyle = C.pipe; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 26, 122); ctx.lineTo(cyx + 22, 122);
    ctx.moveTo(cyx, 176); ctx.lineTo(cyx, 200);
    ctx.moveTo(cyx - 22, 170); ctx.lineTo(padX + 20, manifoldY + 0);
    ctx.stroke();

    // animazione flusso
    if (snap.blower.run && snap.airlock.run && snap.diverter.some((d) => d)) {
      ctx.save();
      ctx.setLineDash([6, 8]); ctx.lineDashOffset = -anim * 70;
      ctx.strokeStyle = C.pipeActive; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cyx - 22, 170); ctx.lineTo(padX + 20, manifoldY);
      ctx.stroke();
      ctx.restore();
      const di = snap.diverter.findIndex((d) => d);
      const cx = padX + siloW * (di + 0.5);
      ctx.save();
      ctx.setLineDash([6, 8]); ctx.lineDashOffset = -anim * 70;
      ctx.strokeStyle = C.pipeActive; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx, manifoldY); ctx.lineTo(cx, siloTopY); ctx.stroke();
      ctx.restore();
    }
    const actSilo = snap.silos.findIndex((s) => s.valveOpen);
    if (actSilo >= 0) {
      const cx = padX + siloW * (actSilo + 0.5);
      ctx.save();
      ctx.setLineDash([6, 8]); ctx.lineDashOffset = -anim * 70;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, collY); ctx.lineTo(W * 0.5, collY);
      ctx.moveTo(W * 0.5, collY); ctx.lineTo(W * 0.5, hopperY - 26);
      ctx.stroke();
      ctx.restore();
    }

    // barra stato
    ctx.textAlign = 'left';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = C.textDim;
    ctx.fillText('MODALITÀ ' + snap.mode + '   |   VUOTO ' + snap.blower.vacuumKpa.toFixed(1) + ' kPa   |   CORRENTE ' + snap.blower.currentA.toFixed(1) + ' A', padX, H - 12);
  }

  function drawValve(ctx, x, y, open, active) {
    const col = active ? C.green : (open ? C.green : C.steelDark);
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.fillStyle = open ? 'rgba(55,214,122,0.25)' : 'rgba(120,140,160,0.12)';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 6); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x + 8, y - 6); ctx.lineTo(x - 8, y + 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ═══════════════ trend ═══════════════ */
  function drawTrends(canvas, history, dpr) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1319'; ctx.fillRect(0, 0, W, H);

    // griglia
    ctx.strokeStyle = '#18242f'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = (H / 6) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!history.length) { ctx.fillStyle = C.textDim; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('in attesa di dati…', 12, 20); return; }
    const n = history.length;
    const series = [
      { key: 'vacuum', color: C.pipeActive, max: 55, label: 'vuoto kPa' },
      { key: 'weight', color: C.gold, max: 120, label: 'peso kg' },
      { key: 'current', color: C.blue, max: 20, label: 'corrente A' },
      { key: 'dp', color: C.amber, max: 6, label: 'ΔP filtro' },
    ];
    series.forEach((s) => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.8;
      ctx.beginPath();
      history.forEach((h, i) => {
        const x = (i / Math.max(1, n - 1)) * W;
        const y = H - Math.min(1, (h[s.key] || 0) / s.max) * (H - 14) - 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    // legenda
    ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left';
    series.forEach((s, i) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(10 + i * 118, 8, 9, 3);
      ctx.fillStyle = C.textDim;
      ctx.fillText(s.label, 24 + i * 118, 12);
    });
  }

  return { drawIso, drawMimic, drawTrends, C, SILO_GEOM };
});
