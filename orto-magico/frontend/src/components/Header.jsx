export default function Header({ user, collectionKnown, collectionTotal }) {
  const pct = user.xp_next ? Math.min(100, (user.xp / user.xp_next) * 100) : 0
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">Orto Magico</span>
      </div>
      <div className="header-stats">
        <span className="stat" title="Monete">{'\u{1FA99}'} {user.coins.toLocaleString('it-IT')}</span>
        <span className="stat gems" title="Gemme">{'\u{1F48E}'} {user.gems.toLocaleString('it-IT')}</span>
        <span className="stat" title="Album">{'\u{1F4D6}'} {collectionKnown}/{collectionTotal}</span>
      </div>
      <div className="header-level">
        <div className="lvl-badge">Liv. {user.level}</div>
        <div className="lvl-bar"><div className="lvl-fill" style={{ width: pct + '%' }} /></div>
      </div>
    </header>
  )
}