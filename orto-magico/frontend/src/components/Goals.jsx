export default function Goals({ achievements, onClaim }) {
  const sorted = [...achievements].sort((a, b) => a.goal - b.goal || (a.final ? 1 : 0))
  return (
    <div className="goals">
      <p className="panel-hint">Obiettivi a lungo termine. Riscuoti i premi quando completi!</p>
      {sorted.map(a => {
        const done = a.progress >= a.goal
        return (
          <div key={a.id} className={a.final ? 'goal goal-final' : 'goal'}>
            <span className="goal-emoji">{a.claimed ? '\u{2705}' : a.emoji}</span>
            <div className="goal-body">
              <div className="goal-name">{a.name} {a.final && <span className="final-tag">FINALE</span>}</div>
              <div className="goal-desc">{a.desc}</div>
              <div className="goal-prog">
                <div className="goal-bar"><div className="goal-fill" style={{ width: Math.min(100, (a.progress / a.goal) * 100) + '%' }} /></div>
                <span className="goal-count">{a.progress}/{a.goal}</span>
              </div>
              <div className="goal-reward">Premio: {'\u{1FA99}'} {a.reward_coins} {a.reward_gems > 0 && `+ \u{1F48E} ${a.reward_gems}`}</div>
            </div>
            <button className="goal-claim" disabled={!done || a.claimed} onClick={() => onClaim(a.id)}>
              {a.claimed ? 'Riscosso' : done ? 'Riscuoti!' : 'In corso'}
            </button>
          </div>
        )
      })}
    </div>
  )
}