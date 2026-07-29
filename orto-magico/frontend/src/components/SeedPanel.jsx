export default function SeedPanel({ seeds, selected, onSelect }) {
  const owned = seeds.filter(s => s.owned > 0)
  return (
    <div className="seed-panel">
      <p className="panel-hint">Tocca un seme per sceglierlo, poi piantalo in un campo vuoto.</p>
      {owned.length === 0 ? (
        <p className="empty-note">Non hai semi! Visita il Negozio.</p>
      ) : (
        <div className="seed-grid">
          {owned.map(s => (
            <button key={s.key} className={selected === s.key ? 'seed-card seed-selected' : 'seed-card'} onClick={() => onSelect(s.key)}>
              <span className="seed-emoji">{s.emoji}</span>
              <span className="seed-name">{s.name}</span>
              <span className="seed-qty">x{s.owned}</span>
              {s.tree && <span className="seed-tag">albero</span>}
              {s.seasonal && <span className="seed-tag seed-seasonal">{s.seasonal === 'Halloween' ? '\u{1F383}' : '\u{1F384}'}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}