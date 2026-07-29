import { useState, useEffect } from 'react'

export default function StatusBar({ kernel }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (n) => String(n).padStart(2, '0')
  const h = fmt(time.getHours())
  const m = fmt(time.getMinutes())

  const notifCount = kernel.notifications.length

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-icon">\u25E1</span>
      </div>
      <div className="status-center">
        {h}:{m}
      </div>
      <div className="status-right">
        {notifCount > 0 && <span className="status-notif-badge">{notifCount}</span>}
        <span className="status-icon">\u25A0</span>
      </div>
    </div>
  )
}
