import { useState, useEffect } from 'react'

function fmtTime(s) {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export default function Plot({ plot, busy, selectedSeed, seeds, onPlant, onWater, onFertilize, onSpeedup, onHarvest, onClear }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const empty = plot.status === 'empty'
  const growing = plot.status === 'growing'
  const thirsty = plot.status === 'thirsty'
  const ready = plot.status === 'ready'

  const remaining = plot.growth_total ? Math.max(0, plot.growth_total - plot.grown) : 0
  const pct = plot.growth_total ? Math.min(100, (plot.grown / plot.growth_total) * 100) : 0
  const waterPct = Math.max(0, Math.min(100, plot.water))

  return (
    <div className={plot.fertilized ? 'plot plot-fertilized' : 'plot'}
         style={plot.color && !empty ? { borderColor: plot.color } : undefined}>
      <div className="plot-emoji">
        {ready ? <span className="plot-ready-glow">{plot.emoji}</span> : empty ? '\u{1F7E9}' : thirsty ? '\u{1F625}' : plot.emoji}
      </div>
      {!empty && (
        <div className="plot-bars">
          <div className="bar bar-growth"><div className="bar-fill" style={{ width: pct + '%' }} /></div>
          <div className="bar bar-water"><div className="bar-fill water-fill" style={{ width: waterPct + '%' }} /></div>
        </div>
      )}
      {growing && <div className="plot-timer">{fmtTime(remaining)}</div>}
      {ready && <div className="plot-ready-label">Pronta!</div>}
      {thirsty && <div className="plot-thirsty-label">Assettata! annaffia</div>}
      {empty && <div className="plot-empty-label">campo vuoto</div>}

      <div className="plot-actions">
        {empty && selectedSeed && (
          <button disabled={busy} onClick={() => onPlant(plot.idx, selectedSeed)}>Pianta {seeds.find(s => s.key === selectedSeed)?.emoji}</button>
        )}
        {empty && !selectedSeed && <span className="hint">seleziona un seme</span>}
        {!empty && <button disabled={busy} onClick={() => onWater(plot.idx)} title="Annaffia">{'\u{1F4A7}'}</button>}
        {growing && <button disabled={busy} onClick={() => onFertilize(plot.idx)} title="Fertilizza (100 monete, 2x)">{'\u{1F4A9}'}</button>}
        {(growing || thirsty) && <button disabled={busy} onClick={() => onSpeedup(plot.idx)} title="Accelera con gemme">{'\u{1F48E}'}</button>}
        {ready && <button disabled={busy} className="btn-harvest" onClick={() => onHarvest(plot.idx)}>{'\u{1F33E}'} Raccogli</button>}
        {(growing || thirsty) && <button disabled={busy} className="btn-clear" onClick={() => onClear(plot.idx)} title="Erpice (togli)">{'\u{1F5D1}'}</button>}
      </div>
    </div>
  )
}