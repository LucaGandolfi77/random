import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from './api.js'
import Header from './components/Header.jsx'
import Garden from './components/Garden.jsx'
import SeedPanel from './components/SeedPanel.jsx'
import Shop from './components/Shop.jsx'
import Goals from './components/Goals.jsx'
import Collection from './components/Collection.jsx'
import Toasts from './components/Toasts.jsx'

const TABS = [
  { id: 'seeds', label: 'Semi', emoji: '\u{1F33E}' },
  { id: 'shop', label: 'Negozio', emoji: '\u{1F6D2}' },
  { id: 'goals', label: 'Obiettivi', emoji: '\u{1F3AF}' },
  { id: 'album', label: 'Album', emoji: '\u{1F4D6}' },
]

export default function App() {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('seeds')
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])
  const [busy, setBusy] = useState(false)
  const pollRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const s = await api.state()
      setState(s)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, 2000)
    return () => clearInterval(pollRef.current)
  }, [refresh])

  const toast = useCallback((msg, kind = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }, [])

  const act = useCallback(async (fn, successMsg) => {
    setBusy(true)
    try {
      const ns = await fn()
      setState(ns)
      setError(null)
      if (successMsg) toast(successMsg)
    } catch (e) {
      toast(e.message, 'err')
      refresh()
    } finally {
      setBusy(false)
    }
  }, [refresh, toast])

  if (error && !state) {
    return <div className="loading">Connessione al backend...<br /><small>{error}</small></div>
  }
  if (!state) return <div className="loading">Caricamento dell'orto...</div>

  return (
    <div className="app">
      <Header user={state.user} collectionKnown={state.collection_known} collectionTotal={state.collection_total} />
      <Garden
        plots={state.plots}
        nextCost={state.next_plot_cost}
        maxPlots={state.max_plots}
        seeds={state.seeds}
        busy={busy}
        selectedSeed={state.user.selected_seed}
        onPlant={(idx, seed) => act(() => api.plant(idx, seed), 'Piantato!')}
        onWater={(idx) => act(() => api.water(idx), 'Gluglu... annaffiato!')}
        onFertilize={(idx) => act(() => api.fertilize(idx), 'Fertilizzato (2x)!')}
        onSpeedup={(idx) => act(() => api.speedup(idx), 'Accelerato con gemme!')}
        onHarvest={(idx) => act(() => api.harvest(idx), 'Raccolto!')}
        onClear={(idx) => act(() => api.clear(idx), 'Campo ripulito')}
        onBuyPlot={() => act(() => api.buyPlot(), 'Nuovo campo sbloccato!')}
        onSelectSeed={(seed) => act(() => api.setSelected(seed))}
      />
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'tab tab-active' : 'tab'} onClick={() => setTab(t.id)}>
            <span className="tab-emoji">{t.emoji}</span> {t.label}
          </button>
        ))}
      </nav>
      <div className="panel">
        {tab === 'seeds' && <SeedPanel seeds={state.seeds} selected={state.user.selected_seed} onSelect={(s) => act(() => api.setSelected(s))} />}
        {tab === 'shop' && <Shop seeds={state.seeds} user={state.user} onBuy={(s, q) => act(() => api.buySeed(s, q), 'Semi comprati!')} />}
        {tab === 'goals' && <Goals achievements={state.achievements} onClaim={(id) => act(() => api.claimAch(id), 'Ricompensa riscossa!')} />}
        {tab === 'album' && <Collection collection={state.collection} seeds={state.seeds} />}
      </div>
      <Toasts toasts={toasts} />
      <footer className="footer">
        {state.user.is_test ? '\u{1FAE6} Account di test \u2014 gemme infinite!' : '\u{1F33F}'}
      </footer>
    </div>
  )
}