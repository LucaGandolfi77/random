export default function SoftkeyBar({ left, center, right }) {
  return (
    <div className="softkey-bar">
      <span className="softkey-left">{left || ''}</span>
      <span className="softkey-center">{center || ''}</span>
      <span className="softkey-right">{right || ''}</span>
    </div>
  )
}
