#!/usr/bin/env node
/**
 * finance.js — modello finanziario del prodotto GreenBatch GB-8S.
 * Legge la distinta base reale (data/bom.csv) e calcola: costo unitario,
 * prezzo, margine, P&L a 5 anni, break-even, cash flow, NPV/IRR e sensitivity.
 *
 * Uso: node tools/finance.js
 * Output: tabelle markdown su stdout + data/financial-model.csv
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DATA = path.join(ROOT, 'data')

/* ── BOM ────────────────────────────────────────────────────── */
function readBom() {
  const raw = fs.readFileSync(path.join(DATA, 'bom.csv'), 'utf8').trim().split(/\r?\n/)
  const head = raw.shift().split(';')
  const idx = (n) => head.indexOf(n)
  const rows = raw.map((line) => {
    const c = line.split(';')
    return {
      categoria: c[idx('Categoria')],
      voce: c[idx('Voce')],
      qty: Number(c[idx('Qty')]),
      unit: Number(c[idx('PrezzoUnitarioEUR')]),
      totale: Number(c[idx('Qty')]) * Number(c[idx('PrezzoUnitarioEUR')]),
    }
  })
  const byCat = {}
  for (const r of rows) byCat[r.categoria] = (byCat[r.categoria] || 0) + r.totale
  return { rows, byCat, total: rows.reduce((a, r) => a + r.totale, 0) }
}

/* ── assunzioni ─────────────────────────────────────────────── */
const A = {
  // ingegneria e gestione interne (non nella BOM)
  engineeringPM: 4.0,          // persona-mese ingegneria (fasi A–C)
  engineeringCostPM: 9000,     // € per PM
  pmPM: 1.5, pmCostPM: 9500,
  qualityPM: 0.3, qualityCostPM: 8000,
  // prezzo e volumi
  listPrice: 219000,
  discountAvg: 0.06,           // sconto medio di trattativa
  units: [4, 7, 11, 14, 16],   // unità vendute anni 1..5
  // ricavi ricorrenti
  serviceAttach: 0.85,         // % parco installato con contratto service
  serviceFeePerUnit: 9800,     // €/anno per unità installata (Service Plus)
  serviceDeliveryCostPct: 0.45,// costo erogazione servizio
  // costi fissi annui
  opex: {
    rnd:        [90000, 110000, 130000, 150000, 160000],
    salesMktg:  [70000,  95000, 130000, 160000, 185000],
    gna:        [55000,  70000,  90000, 105000, 120000],
  },
  capex0: 180000,              // prototipo, certificazioni, unità demo
  depreciationYears: 5,
  taxRate: 0.279,              // IRES 24% + IRAP ~3,9% effettivo
  discountRate: 0.10,
  warrantyPct: 0.015,          // accantonamento garanzia su ricavi unità
}

const bom = readBom()
const internalEng = A.engineeringPM * A.engineeringCostPM + A.pmPM * A.pmCostPM + A.qualityPM * A.qualityCostPM
const unitCost = bom.total + internalEng
const netPrice = A.listPrice * (1 - A.discountAvg)
const unitMargin = netPrice - unitCost
const unitMarginPct = unitMargin / netPrice

/* ── P&L 5 anni ─────────────────────────────────────────────── */
const years = [1, 2, 3, 4, 5]
let installedBase = 0
const pl = years.map((y, i) => {
  const units = A.units[i]
  const revenueUnits = units * netPrice
  installedBase += units
  const serviceRevenue = Math.round(installedBase * A.serviceAttach * A.serviceFeePerUnit)
  const revenue = revenueUnits + serviceRevenue

  const cogsUnits = units * unitCost
  const cogsService = serviceRevenue * A.serviceDeliveryCostPct
  const warranty = revenueUnits * A.warrantyPct
  const cogs = cogsUnits + cogsService + warranty
  const grossProfit = revenue - cogs

  const rnd = A.opex.rnd[i], sales = A.opex.salesMktg[i], gna = A.opex.gna[i]
  const opex = rnd + sales + gna
  const ebitda = grossProfit - opex
  const depreciation = i < A.depreciationYears ? A.capex0 / A.depreciationYears : 0
  const ebit = ebitda - depreciation
  const taxes = Math.max(0, ebit) * A.taxRate
  const net = ebit - taxes
  const cashFlow = net + depreciation
  return {
    year: y, units, installedBase, revenueUnits, serviceRevenue, revenue,
    cogsUnits, cogsService, warranty, cogs, grossProfit,
    rnd, sales, gna, opex, ebitda, depreciation, ebit, taxes, net, cashFlow,
  }
})

/* ── break-even e payback ───────────────────────────────────── */
const contributionPerUnit = unitMargin
// costi fissi medi annui (anno 3 come riferimento di regime)
const fixedY3 = A.opex.rnd[2] + A.opex.salesMktg[2] + A.opex.gna[2]
const breakEvenUnitsY3 = Math.ceil(fixedY3 / contributionPerUnit)

// payback cumulato (anno 0 = -capex0)
let cum = -A.capex0
let payback = null
for (const p of pl) {
  const prev = cum
  cum += p.cashFlow
  if (payback === null && cum >= 0) {
    const frac = -prev / p.cashFlow
    payback = p.year - 1 + frac
  }
}

/* ── NPV / IRR ──────────────────────────────────────────────── */
const flows = [-A.capex0].concat(pl.map((p) => p.cashFlow))
function npv(rate, f) { return f.reduce((a, v, i) => a + v / Math.pow(1 + rate, i), 0) }
const npv10 = npv(A.discountRate, flows)
function irr(f) {
  let lo = -0.9, hi = 3
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid, f) > 0) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}
const irrVal = irr(flows)

/* ── sensitivity ────────────────────────────────────────────── */
function ebitdaWith(mult) {
  // ricalcola l'anno 3 con moltiplicatori
  const i = 2
  const units = Math.round(A.units[i] * (mult.units || 1))
  const price = netPrice * (mult.price || 1)
  const cost = (bom.total * (mult.bom || 1)) + internalEng
  const revenueUnits = units * price
  const installed = A.units[0] + A.units[1] + units
  const serviceRevenue = Math.round(installed * A.serviceAttach * A.serviceFeePerUnit)
  const cogs = units * cost + serviceRevenue * A.serviceDeliveryCostPct + revenueUnits * A.warrantyPct
  const opex = A.opex.rnd[i] + A.opex.salesMktg[i] + A.opex.gna[i]
  return { ebitda: revenueUnits + serviceRevenue - cogs - opex, units, revenue: revenueUnits + serviceRevenue }
}
const base3 = ebitdaWith({})
const sens = [
  ['Base', '', base3.ebitda],
  ['Volumi −30%', 'unità ' + Math.round(A.units[2] * 0.7), ebitdaWith({ units: 0.7 }).ebitda],
  ['Volumi +30%', 'unità ' + Math.round(A.units[2] * 1.3), ebitdaWith({ units: 1.3 }).ebitda],
  ['Prezzo −10%', '', ebitdaWith({ price: 0.9 }).ebitda],
  ['Prezzo +10%', '', ebitdaWith({ price: 1.1 }).ebitda],
  ['BOM +10%', '', ebitdaWith({ bom: 1.1 }).ebitda],
  ['BOM −10%', '', ebitdaWith({ bom: 0.9 }).ebitda],
]

/* ── output ─────────────────────────────────────────────────── */
const eur = (v) => '€ ' + Math.round(v).toLocaleString('it-IT')
const eurK = (v) => '€ ' + Math.round(v / 1000) + 'k'
const pct = (v) => (v * 100).toFixed(1) + '%'

console.log('# Modello finanziario GreenBatch GB-8S\n')
console.log('## 1. Distinta base (data/bom.csv)\n')
console.log('| Categoria | Costo |')
console.log('|---|---|')
for (const [k, v] of Object.entries(bom.byCat).sort((a, b) => b[1] - a[1])) console.log('| ' + k + ' | ' + eur(v) + ' |')
console.log('| **Totale BOM** | **' + eur(bom.total) + '** |')
console.log('| Ingegneria e gestione interne | ' + eur(internalEng) + ' |')
console.log('| **Costo unitario completo** | **' + eur(unitCost) + '** |\n')

console.log('## 2. Unit economics\n')
console.log('| Voce | Valore |')
console.log('|---|---|')
console.log('| Prezzo di listino | ' + eur(A.listPrice) + ' |')
console.log('| Sconto medio ' + pct(A.discountAvg) + ' → prezzo netto | ' + eur(netPrice) + ' |')
console.log('| Costo unitario | ' + eur(unitCost) + ' |')
console.log('| **Margine di contribuzione** | **' + eur(unitMargin) + ' (' + pct(unitMarginPct) + ')** |')
console.log('| Break-even (unità/anno a costi fissi anno 3) | **' + breakEvenUnitsY3 + '** |')
console.log('| Payback cumulato | ' + (payback ? 'anno ' + payback.toFixed(2) : 'oltre 5 anni') + ' |')
console.log('| NPV @' + pct(A.discountRate) + ' (5 anni) | ' + eur(npv10) + ' |')
console.log('| IRR | ' + pct(irrVal) + ' |\n')

console.log('## 3. P&L a 5 anni\n')
console.log('| Voce | ' + years.map((y) => 'Anno ' + y).join(' | ') + ' |')
console.log('|---|' + years.map(() => '---:').join('|') + '|')
const line = (label, getter, fmt) => console.log('| ' + label + ' | ' + pl.map((p) => (fmt || eurK)(getter(p))).join(' | ') + ' |')
line('Unità vendute', (p) => p.units, (v) => v)
line('Parco installato', (p) => p.installedBase, (v) => v)
line('Ricavi unità', (p) => p.revenueUnits)
line('Ricavi service', (p) => p.serviceRevenue)
line('**Ricavi totali**', (p) => p.revenue)
line('Costi variabili', (p) => p.cogs)
line('Margine lordo', (p) => p.grossProfit)
line('R&S', (p) => p.rnd)
line('Vendite e marketing', (p) => p.sales)
line('G&A', (p) => p.gna)
line('**EBITDA**', (p) => p.ebitda)
line('Ammortamenti', (p) => p.depreciation)
line('EBIT', (p) => p.ebit)
line('Imposte', (p) => p.taxes)
line('**Utile netto**', (p) => p.net)
line('Cash flow operativo', (p) => p.cashFlow)

let cum2 = -A.capex0
console.log('\n| Cassa cumulata | anno 0: ' + eurK(-A.capex0) + ' | ' + pl.map((p) => { cum2 += p.cashFlow; return 'anno ' + p.year + ': ' + eurK(cum2) }).join(' | ') + ' |\n')

console.log('## 4. Sensitivity (EBITDA anno 3)\n')
console.log('| Scenario | Note | EBITDA | Δ vs base |')
console.log('|---|---|---:|---:|')
for (const [name, note, v] of sens) {
  const d = v - base3.ebitda
  console.log('| ' + name + ' | ' + note + ' | ' + eurK(v) + ' | ' + (d >= 0 ? '+' : '') + eurK(d) + ' |')
}

console.log('\n## 5. Fabbisogno e sostenibilità\n')
const minCash = Math.min.apply(null, pl.map((p, i) => {
  let c = -A.capex0
  for (let k = 0; k <= i; k++) c += pl[k].cashFlow
  return c
}))
console.log('- Investimento iniziale (anno 0): **' + eur(A.capex0) + '**')
console.log('- Punto di cassa minima: **' + eur(minCash) + '**')
console.log('- Fabbisogno di finanziamento consigliato: **' + eur(Math.abs(Math.min(0, minCash)) + 60000) + '** (cassa minima + 60k di margine)')
console.log('- Il modello è profittevole dal **' + (pl.find((p) => p.ebitda > 0) ? 'anno ' + pl.find((p) => p.ebitda > 0).year : 'n/d') + '** a livello di EBITDA')

/* ── CSV ────────────────────────────────────────────────────── */
const csv = []
csv.push('sezione;voce;' + years.map((y) => 'anno' + y).join(';'))
const push = (label, getter) => csv.push('P&L;' + label + ';' + pl.map((p) => Math.round(getter(p))).join(';'))
csv.push('Unit economics;prezzo_listino;' + A.listPrice)
csv.push('Unit economics;prezzo_netto;' + Math.round(netPrice))
csv.push('Unit economics;costo_unitario;' + Math.round(unitCost))
csv.push('Unit economics;margine_contribuzione;' + Math.round(unitMargin))
csv.push('Unit economics;margine_pct;' + (unitMarginPct * 100).toFixed(1))
csv.push('Unit economics;break_even_unita;' + breakEvenUnitsY3)
csv.push('Investimenti;capex_anno0;' + A.capex0)
csv.push('Indicatori;npv10;' + Math.round(npv10))
csv.push('Indicatori;irr_pct;' + (irrVal * 100).toFixed(1))
csv.push('Indicatori;payback_anni;' + (payback ? payback.toFixed(2) : 'n/d'))
push('unita_vendute', (p) => p.units)
push('parco_installato', (p) => p.installedBase)
push('ricavi_unita', (p) => p.revenueUnits)
push('ricavi_service', (p) => p.serviceRevenue)
push('ricavi_totali', (p) => p.revenue)
push('costi_variabili', (p) => p.cogs)
push('margine_lordo', (p) => p.grossProfit)
push('rnd', (p) => p.rnd)
push('sales_marketing', (p) => p.sales)
push('gna', (p) => p.gna)
push('ebitda', (p) => p.ebitda)
push('ammortamenti', (p) => p.depreciation)
push('ebit', (p) => p.ebit)
push('imposte', (p) => p.taxes)
push('utile_netto', (p) => p.net)
push('cash_flow', (p) => p.cashFlow)
for (const [name, , v] of sens) csv.push('Sensitivity;' + name + ';' + Math.round(v))
fs.writeFileSync(path.join(DATA, 'financial-model.csv'), csv.join('\n') + '\n')
console.log('\n→ scritto data/financial-model.csv (' + csv.length + ' righe)')
