import { useState } from 'react'

export default function Shop({ seeds, user, onBuy }) {
  const [qty, setQty] = useState(1)
  const sorted = [...seeds].sort((a, b) => a.lvl - b.lvl)

  return (
    <div className="shop">
      <div className="npc-banner">
        <span className="npc-emoji">{'\u{1F9D1}\u{200D}\u{1F33E}'}</span>
        <span className="npc-text"><b>Nonna Ortensia</b> ti saluta! <i>"Piacere di rivederti, fiorellino. Cosa desidera oggi?"</i></span>
      </div>
      <div className="shop-list">
        {sorted.map(s => {
          const locked = !s.unlocked
          const total = s.cost * qty
          const canBuy = !locked && user.coins >= total
          return (
            <div key={s.key} className={locked ? 'shop-item shop-locked' : 'shop-item'}>
              <span className="shop-emoji">{locked ? '\u{1F512}' : s.emoji}</span>
              <div className="shop-info">
                <div className="shop-name">{s.name} {s.seasonal && <span className="seed-seasonal">{s.seasonal === 'Halloween' ? '\u{1F383}' : '\u{1F384}'}</span>}</div>
                <div className="shop-desc">{locked ? `Si sblocca al livello ${s.lvl}` : s.shop}</div>
                <div className="shop-stats">
                  {'\u{23F1}'} {s.growth >= 86400 ? Math.round(s.growth/86400) + 'g' : s.growth >= 3600 ? Math.round(s.growth/3600) + 'h' : Math.round(s.growth/60) + 'm'}
                  {' \u{1FA99}'} vendi {s.sell}
                  {' \u{1F33F}'} liv.{s.lvl}
                  {s.tree ? ' \u{1F333} albero' : ''}
                </div>
              </div>
              <div className="shop-buy">
                {locked ? null : (
                  <>
                    <div className="qty">x{qty} = {'\u{1FA99}'}{total.toLocaleString('it-IT')}</div>
                    <button disabled={!canBuy} onClick={() => onBuy(s.key, qty)}>Compra</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}