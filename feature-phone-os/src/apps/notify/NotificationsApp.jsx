import { useState, useEffect } from 'react'

export default function NotificationsApp({ sys, kernel }) {
  const [cursor, setCursor] = useState(0)
  const [tick, setTick] = useState(0)

  // all'apertura: tutte lette
  useEffect(() => {
    kernel.markAllRead()
    return () => {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const notifs = [...kernel.notifications].reverse() // più recenti in cima

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'up') { setCursor(c => Math.max(0, c - 1)); return true }
      if (key === 'down') { setCursor(c => Math.min(Math.max(0, notifs.length - 1), c + 1)); return true }
      if (key === 'softLeft') {
        kernel.clearNotifications()
        setCursor(0)
        return true
      }
      if (key === 'ok') {
        // tocca la notifica: la marca come letta (già fatto) e mostra popup
        if (notifs[cursor]) {
          kernel.lastPopup = { ...notifs[cursor], id: Math.random().toString(36).slice(2), at: Date.now() }
        }
        return true
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, notifs, cursor, kernel])

  const fmtTime = (t) => {
    const d = new Date(t)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const iconFor = (title) => {
    if (!title) return '·'
    if (title.toLowerCase().includes('chiamata')) return '✆'
    if (title.toLowerCase().includes('batteria')) return '▯'
    if (title.toLowerCase().includes('timer')) return '⏰'
    if (title.toLowerCase().includes('snake')) return '🐍'
    return '✉'
  }

  return (
    <div className="app-notifications">
      <div className="msg-title">Avvisi</div>
      <div className="notif-list">
        {notifs.length === 0 && (
          <div className="msg-empty">Nessun avviso.<br />Il telefono tace come un monaco.</div>
        )}
        {notifs.map((n, i) => (
          <div key={i} className={`notif-row ${i === cursor ? 'notif-row-focus' : ''}`}>
            <div className="notif-icon">{iconFor(n.title)}</div>
            <div className="notif-body">
              <div className="notif-row-title">{n.title}</div>
              <div className="notif-row-text">{n.text}</div>
            </div>
            <div className="notif-time">{fmtTime(n.time)}</div>
          </div>
        ))}
      </div>
      <div className="contacts-add-hint">Sel: pulisci tutto · OK: mostra</div>
    </div>
  )
}
