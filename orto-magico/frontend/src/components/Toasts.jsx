export default function Toasts({ toasts }) {
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={t.kind === 'err' ? 'toast toast-err' : 'toast'}>
          {t.kind === 'err' ? '\u{26A0}' : '\u{2705}'} {t.msg}
        </div>
      ))}
    </div>
  )
}