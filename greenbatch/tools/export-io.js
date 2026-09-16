#!/usr/bin/env node
/**
 * export-io.js — esporta la lista I/O e il layout impianto dal modello dati.
 * Fonte unica: simulator/js/tags.js (nessuna duplicazione nei documenti).
 *
 * Genera:
 *   data/io-list.csv        lista punti I/O con modulo/canale assegnati
 *   data/plant-layout.json  layout 3D + tubazioni + ricette (per CAD/documenti)
 *
 * Uso: node tools/export-io.js
 */
'use strict'

const fs = require('fs')
const path = require('path')
const TAGS = require(path.join(__dirname, '..', 'simulator', 'js', 'tags.js'))

const ROOT = path.join(__dirname, '..')
const DATA = path.join(ROOT, 'data')
fs.mkdirSync(DATA, { recursive: true })

/* assegnazione moduli/canali realistica (rack ET200SP-like) */
const MODULE_PLAN = {
  DI: { prefix: 'DI', perModule: 16, model: 'DI 16x24VDC (6ES7131-6BH01-0BA0)' },
  DO: { prefix: 'DQ', perModule: 16, model: 'DQ 16x24VDC/0.5A (6ES7132-6BH01-0BA0)' },
  AI: { prefix: 'AI', perModule: 8, model: 'AI 8xI 2-/4-wire (6ES7134-6GF00-0AA1)' },
  AO: { prefix: 'AQ', perModule: 4, model: 'AQ 4xI (6ES7135-6HD00-0BA1)' },
  MB: { prefix: 'MB', perModule: 16, model: 'Modbus RTU master (CP 341 / CM PtP)' },
}

const counters = {}
const rows = []
for (const tag of TAGS.IO) {
  const plan = MODULE_PLAN[tag.type]
  counters[tag.type] = (counters[tag.type] || 0) + 1
  const idx = counters[tag.type]
  const moduleNo = Math.ceil(idx / plan.perModule)
  const channel = ((idx - 1) % plan.perModule)
  rows.push({
    tag: tag.tag,
    descrizione: tag.desc,
    tipo: tag.type,
    segnale: tag.signal,
    area: tag.area,
    modulo: plan.prefix + '-' + String(moduleNo).padStart(2, '0'),
    canale: tag.type === 'MB' ? 'addr ' + (idx + 1) : String(channel).padStart(2, '0'),
    note: tag.notes,
  })
}

const modules = Object.entries(counters).map(([type, count]) => {
  const plan = MODULE_PLAN[type]
  return {
    type,
    punti: count,
    moduli: Math.ceil(count / plan.perModule),
    modello: plan.model,
  }
})

/* CSV */
const head = ['Tag', 'Descrizione', 'Tipo', 'Segnale', 'Area', 'Modulo', 'Canale', 'Note']
const csv = [head.join(';')]
  .concat(rows.map((r) => [r.tag, r.descrizione, r.tipo, r.segnale, r.area, r.modulo, r.canale, r.note].map((v) => String(v).replace(/;/g, ',')).join(';')))
  .join('\n') + '\n'
fs.writeFileSync(path.join(DATA, 'io-list.csv'), csv)

/* riepilogo moduli */
const summary = ['Tipo;Punti;Moduli;Modello'].concat(modules.map((m) => [m.type, m.punti, m.moduli, m.modello].join(';'))).join('\n') + '\n'
fs.writeFileSync(path.join(DATA, 'io-modules.csv'), summary)

/* layout impianto */
const layout = {
  meta: TAGS.META,
  parametri: TAGS.PARAMS,
  layout_3d: TAGS.LAYOUT,
  piping_network_connections: TAGS.PIPING,
  silos: TAGS.SILOS,
  ricette: TAGS.RECIPES,
  note_modellazione_3d: {
    structure: 'Telaio in acciaio a due livelli con 8 silos cilindrici verticali (Ø1000 mm, corpo 2000 mm, cono 60° alto 866 mm).',
    pipes: 'Tubazioni in acciaio inox AISI 304 DN80 con curve a raggio lungo, valvole deviatrici pneumatiche e serrande a ghigliottina.',
    scale: 'Tramoggia di pesa su 3 celle di carico posta sotto il collettore di raccolta, con valvola di scarico EV-250 verso la torrefattrice.',
  },
}
fs.writeFileSync(path.join(DATA, 'plant-layout.json'), JSON.stringify(layout, null, 2) + '\n')

console.log('io-list.csv      ' + rows.length + ' punti I/O')
for (const m of modules) console.log('  ' + m.type + ': ' + m.punti + ' punti → ' + m.moduli + ' moduli (' + m.modello + ')')
console.log('io-modules.csv   riepilogo moduli')
console.log('plant-layout.json layout 3D + tubazioni + ricette')
