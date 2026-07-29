import Plot from './Plot.jsx'

export default function Garden({ plots, nextCost, maxPlots, seeds, busy, selectedSeed, onPlant, onWater, onFertilize, onSpeedup, onHarvest, onClear, onBuyPlot, onSelectSeed }) {
  return (
    <div className="garden">
      <div className="garden-soil">
        {plots.map(p => (
          <Plot key={p.id} plot={p} busy={busy} selectedSeed={selectedSeed} seeds={seeds}
            onPlant={onPlant} onWater={onWater} onFertilize={onFertilize}
            onSpeedup={onSpeedup} onHarvest={onHarvest} onClear={onClear} />
        ))}
        {nextCost != null && (
          <button className="plot plot-buy" disabled={busy} onClick={onBuyPlot}>
            <span className="plot-buy-emoji">{'\u{1F331}'}</span>
            <span className="plot-buy-label">Nuovo campo</span>
            <span className="plot-buy-cost">{'\u{1FA99}'} {nextCost.toLocaleString('it-IT')}</span>
          </button>
        )}
      </div>
    </div>
  )
}