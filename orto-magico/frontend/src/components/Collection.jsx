export default function Collection({ collection, seeds }) {
  const collected = new Set(collection.map(c => c.key))
  const all = seeds
  return (
    <div className="album">
      <p className="panel-hint">L'album delle variet\u00E0 scoperte. Coltiva tutte per il diploma da giardiniere!</p>
      <div className="album-grid">
        {all.map(s => {
          const found = collected.has(s.key)
          const entry = collection.find(c => c.key === s.key)
          return (
            <div key={s.key} className={found ? 'album-card album-found' : 'album-card album-locked'}>
              <span className="album-emoji">{found ? s.emoji : '\u{2753}'}</span>
              <span className="album-name">{found ? s.name : '???'}</span>
              <span className="album-count">{found ? `x${entry.count}` : 'non ancora'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}