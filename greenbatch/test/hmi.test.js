'use strict'
/*
 * GreenBatch — smoke test del rendering HMI con contesto canvas simulato.
 * Esegue i percorsi di disegno reali (iso, mimic, trend) su stati d'impianto
 * diversi per intercettare errori runtime senza browser.
 *
 * Uso: node test/hmi.test.js
 */
const path = require('path')
const TAGS = require(path.join(__dirname, '..', 'simulator', 'js', 'tags.js'))
const { Plant } = require(path.join(__dirname, '..', 'simulator', 'js', 'plant.js'))
const HMI = require(path.join(__dirname, '..', 'simulator', 'js', 'hmi.js'))

function makeCtx() {
  const store = {}
  return new Proxy(store, {
    get(t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} })
      if (p === 'measureText') return () => ({ width: 12 })
      if (p === 'canvas') return null
      if (!(p in t)) t[p] = () => {}
      return t[p]
    },
    set(t, p, v) { t[p] = v; return true },
  })
}
function makeCanvas(w, h) {
  return { width: w * 2, height: h * 2, style: {}, getContext: () => makeCtx(), getBoundingClientRect: () => ({ width: w, height: h }) }
}

let fails = 0
function ok(cond, label, extra) {
  if (cond) console.log('PASS ' + label + (extra ? ' — ' + extra : ''))
  else { fails++; console.error('FAIL ' + label + (extra ? ' — ' + extra : '')) }
}
function run(p, s, dt) { dt = dt || 0.05; for (let t = 0; t < s; t += dt) p.step(dt) }

const iso = makeCanvas(900, 380)
const mimic = makeCanvas(900, 380)
const trend = makeCanvas(600, 150)

// stato 1: impianto fermo
{
  const p = new Plant()
  const snap = p.snapshot()
  let err = null
  try {
    HMI.drawIso(iso, snap, TAGS.LAYOUT, 0, 2)
    HMI.drawMimic(mimic, snap, 0, 2)
    HMI.drawTrends(trend, p.history, 2)
  } catch (e) { err = e }
  ok(!err, 'rendering a impianto fermo', err ? err.message : '')
}

// stato 2: caricamento in depressione con flusso attivo
{
  const p = new Plant()
  p.startBlower(); p.setAirlock(true); p.setKnifeGate(true)
  run(p, 6)
  p.openDiverter(5)
  run(p, 25)
  const snap = p.snapshot()
  let err = null
  try {
    HMI.drawIso(iso, snap, TAGS.LAYOUT, 12.5, 2)
    HMI.drawMimic(mimic, snap, 12.5, 2)
    HMI.drawTrends(trend, p.history, 2)
  } catch (e) { err = e }
  ok(!err, 'rendering durante il caricamento silos', err ? err.message : '')
  ok(snap.blower.run && snap.diverter.some((d) => d), 'stato coerente: soffiante + deviatore attivi')
}

// stato 3: dosaggio lotto in corso (silo attivo, valvole, pesa)
{
  const p = new Plant()
  p.startBlower(); p.setAirlock(true); p.setKnifeGate(true)
  run(p, 6)
  p.startBatch('RCP-MOK-03')
  run(p, 40)
  const snap = p.snapshot()
  let err = null
  try {
    HMI.drawIso(iso, snap, TAGS.LAYOUT, 40, 2)
    HMI.drawMimic(mimic, snap, 40, 2)
    HMI.drawTrends(trend, p.history, 2)
  } catch (e) { err = e }
  ok(!err, 'rendering durante il dosaggio del lotto', err ? err.message : '')
  ok(snap.batch !== null, 'lotto attivo nello snapshot', snap.batch ? snap.batch.phase : '')
}

// stato 4: allarmi + emergenza + scarico
{
  const p = new Plant()
  p.startBlower(); p.setAirlock(true); p.setKnifeGate(true)
  run(p, 5)
  p.startBatch('RCP-ESP-01')
  while (p.currentBatch && p.currentBatch.phase !== 'DISCHARGE') p.step(0.05)
  const snap = p.snapshot()
  let err = null
  try {
    HMI.drawIso(iso, snap, TAGS.LAYOUT, 200, 2)
    HMI.drawMimic(mimic, snap, 200, 2)
    HMI.drawTrends(trend, p.history, 2)
  } catch (e) { err = e }
  ok(!err, 'rendering in fase di scarico alla torrefattrice', err ? err.message : '')
  ok(snap.weigher.valveOpen, 'EV-250 aperta in scarico')

  p.emergencyStop()
  const snap2 = p.snapshot()
  err = null
  try { HMI.drawIso(iso, snap2, TAGS.LAYOUT, 0, 2); HMI.drawMimic(mimic, snap2, 0, 2) } catch (e) { err = e }
  ok(!err, 'rendering in emergenza con allarme critico', err ? err.message : '')
}

// trend popolato
{
  const p = new Plant()
  p.startBlower(); p.setAirlock(true); p.setKnifeGate(true); run(p, 6); p.openDiverter(3); run(p, 120)
  ok(p.history.length > 50, 'storico trend popolato', p.history.length + ' campioni')
  let err = null
  try { HMI.drawTrends(trend, p.history, 2) } catch (e) { err = e }
  ok(!err, 'rendering trend con dati reali', err ? err.message : '')
}

console.log(fails ? '\nHMI TEST: ' + fails + ' FALLIMENTI' : '\nHMI TEST OK')
process.exit(fails ? 1 : 0)
