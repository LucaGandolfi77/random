'use strict'
/*
 * GreenBatch — test headless del motore di simulazione.
 * Verifica: interblocchi, caricamento silos in depressione, blocco livello alto,
 * ciclo di lotto completo con accuratezza di dose e apprendimento dell'anticipo,
 * arresto di emergenza, tracciabilità del report.
 *
 * Uso: node test/plant.test.js
 */
const path = require('path')
const TAGS = require(path.join(__dirname, '..', 'simulator', 'js', 'tags.js'))
const { Plant } = require(path.join(__dirname, '..', 'simulator', 'js', 'plant.js'))

let fails = 0
function ok(cond, label, extra) {
  if (cond) console.log('PASS ' + label + (extra ? ' — ' + extra : ''))
  else { fails++; console.error('FAIL ' + label + (extra ? ' — ' + extra : '')) }
}
function run(p, seconds, dt) {
  dt = dt || 0.05
  for (let t = 0; t < seconds; t += dt) p.step(dt)
}
function ready(p) {
  p.startBlower(); p.setAirlock(true); p.setKnifeGate(true)
  run(p, 6)
}

/* ── 1. interblocchi ───────────────────────────────────────── */
{
  const p = new Plant()
  const r1 = p.openDiverter(3)
  ok(!r1.ok, 'deviatore negato senza linea in vuoto', r1.reason)
  const r2 = p.openSiloValve(3)
  ok(!r2.ok, 'scarico silo negato senza linea di dosaggio', r2.reason)
  ready(p)
  const r3 = p.openDiverter(3)
  ok(r3.ok, 'deviatore G4 aperto con linea pronta')
  const r4 = p.openDiverter(0)
  ok(!r4.ok, 'deviatore G1 negato: livello alto (allarme foto)', r4.reason)
  ok(p.alarms.has('A-101'), 'allarme A-101 livello alto generato')
}

/* ── 2. caricamento pneumatico in depressione ──────────────── */
{
  const p = new Plant()
  ready(p)
  p.openDiverter(6) // G7
  const before = p.silos[6].weightKg
  run(p, 40)
  const added = p.silos[6].weightKg - before
  ok(added > 15, 'caricamento G7 in depressione', '+' + added.toFixed(1) + ' kg in 40 s')
  ok(p.blower.vacuumKpa > 35, 'vuoto di linea a regime', p.blower.vacuumKpa.toFixed(1) + ' kPa')
  ok(p.cyclone.bufferKg < TAGS.PARAMS.cyclone.bufferCapacityKg, 'ciclone non in sovraccarico', p.cyclone.bufferKg.toFixed(2) + ' kg')
  ok(p.diverter.filter((d) => d.open).length <= 1, 'un solo deviatore aperto per volta')
}

/* ── 3. ciclo di lotto completo + accuratezza ──────────────── */
{
  const p = new Plant()
  ready(p)
  const recipe = TAGS.RECIPES[0] // Espresso House Blend, 50 kg in 3 componenti
  const start = p.startBatch(recipe.id)
  ok(start.ok, 'lotto avviato: ' + recipe.name, start.reason || '')
  let elapsed = 0
  while (p.currentBatch && elapsed < 900) { p.step(0.05); elapsed += 0.05 }
  ok(p.batches.length === 1, 'lotto completato', 'durata ' + (p.batches[0] ? p.batches[0].durationS.toFixed(0) + ' s' : 'n/d'))
  const batch = p.batches[0]
  if (batch) {
    batch.components.forEach((c) => {
      const tol = Math.max((batch.tolerancePct / 100) * c.targetKg, TAGS.PARAMS.weigher.toleranceMinKg)
      ok(Math.abs(c.deltaKg) <= tol, 'dose ' + c.silo + ' entro tolleranza',
        'target ' + c.targetKg + ' kg, reale ' + c.actualKg.toFixed(3) + ' kg, scarto ' + c.deltaKg.toFixed(3) + ' kg (±' + tol.toFixed(2) + ')')
    })
    ok(batch.totalActualKg > recipe.batchKg * 0.995 && batch.totalActualKg < recipe.batchKg * 1.005,
      'totale lotto entro ±0,5%', batch.totalActualKg.toFixed(2) + ' kg su ' + recipe.batchKg + ' kg')
    ok(batch.components.every((c) => c.lot && c.variety), 'tracciabilità: varietà e lotto per ogni componente')
    ok(p.roaster.weightKg > recipe.batchKg * 0.99, 'materiale scaricato alla torrefattrice', p.roaster.weightKg.toFixed(1) + ' kg')
  }
}

/* ── 4. apprendimento dell'anticipo (in-flight) ────────────── */
{
  const p = new Plant()
  ready(p)
  const recipe = TAGS.RECIPES[2] // Moka Classica, 3 componenti da 20/10/10 kg
  p.startBatch(recipe.id)
  while (p.currentBatch) p.step(0.05)
  const first = p.batches[0].components.reduce((m, c) => Math.max(m, Math.abs(c.deltaKg)), 0)
  p.roaster.weightKg = 0 // la torrefattrice consuma il lotto precedente
  ready(p)
  ok(p.startBatch(recipe.id).ok, 'secondo lotto avviato')
  while (p.currentBatch) p.step(0.05)
  const second = p.batches[1].components.reduce((m, c) => Math.max(m, Math.abs(c.deltaKg)), 0)
  ok(first < 0.05 && second < 0.05, 'accuratezza stabile su due lotti consecutivi',
    'scarto massimo: ' + first.toFixed(3) + ' kg → ' + second.toFixed(3) + ' kg')
  const learned = Object.values(p.inflightFine)
  ok(learned.every((v) => v > 0.01 && v < 0.5), 'anticipo appreso (in-flight) in banda plausibile',
    learned.map((v) => v.toFixed(3)).join(' '))
}

/* ── 5. allarme livello basso e ricetta bloccata ───────────── */
{
  const p = new Plant()
  ready(p)
  p.silos[7].weightKg = 20 // G8 sotto la soglia di livello basso (8%)
  p.refreshLevels()
  const r = p.startBatch('RCP-DEC-04') // richiede G8
  ok(!r.ok, 'ricetta con silo quasi vuoto rifiutata', r.reason)
  ok(p.silos[7].lsLow, 'livello basso G8 rilevato')
}

/* ── 6. emergenza ──────────────────────────────────────────── */
{
  const p = new Plant()
  ready(p)
  p.openDiverter(4)
  p.startBatch('RCP-FIL-02')
  run(p, 3)
  p.emergencyStop()
  ok(p.estop && !p.blower.cmd && !p.airlock.run && !p.knifeGate.open, 'emergenza: attuatori in sicurezza')
  ok(p.diverter.every((d) => !d.open) && p.silos.every((s) => !s.valve.open), 'emergenza: tutte le valvole chiuse')
  ok(p.alarms.has('A-401'), 'allarme critico A-401 registrato')
  ok(p.currentBatch === null, 'lotto annullato dall\'emergenza')
}

/* ── 7. coerenza lista I/O e report ────────────────────────── */
{
  ok(TAGS.IO.length > 70, 'lista I/O popolata', TAGS.IO.length + ' tag')
  const counts = TAGS.IO_COUNTS
  ok(counts.DI > 40 && counts.DO > 15 && counts.AI >= 3, 'conteggio I/O coerente',
    'DI ' + counts.DI + ', DO ' + counts.DO + ', AI ' + counts.AI + ', AO ' + counts.AO + ', MB ' + counts.MB)
  const p = new Plant()
  const v = p.tagValues()
  const missing = TAGS.IO.filter((t) => v[t.tag] === undefined).map((t) => t.tag)
  ok(missing.length === 0, 'ogni tag I/O ha un valore live nel simulatore', missing.slice(0, 5).join(', '))
}

console.log(fails ? '\nPLANT TEST: ' + fails + ' FALLIMENTI' : '\nPLANT TEST OK')
process.exit(fails ? 1 : 0)
