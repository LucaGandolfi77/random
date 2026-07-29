const BASE = '/api'

async function req(path, method = 'GET', body = null) {
  const opts = { method, headers: {} }
  if (body) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    let msg = `Errore ${res.status}`
    try { const e = await res.json(); msg = e.detail || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  state: () => req('/state'),
  buyPlot: () => req('/plots/buy', 'POST'),
  plant: (idx, seed) => req(`/plots/${idx}/plant`, 'POST', { seed }),
  water: (idx) => req(`/plots/${idx}/water`, 'POST'),
  fertilize: (idx) => req(`/plots/${idx}/fertilize`, 'POST'),
  speedup: (idx) => req(`/plots/${idx}/speedup`, 'POST'),
  harvest: (idx) => req(`/plots/${idx}/harvest`, 'POST'),
  clear: (idx) => req(`/plots/${idx}/clear`, 'POST'),
  buySeed: (seed, qty) => req('/seeds/buy', 'POST', { seed, qty }),
  setSelected: (seed) => req('/selected', 'POST', { seed }),
  claimAch: (id) => req(`/achievements/${id}/claim`, 'POST'),
}