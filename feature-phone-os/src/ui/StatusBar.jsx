import { useState, useEffect } from 'react'
import sound from '../os/sound.js'

export default function StatusBar({ kernel }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (n) => String(n).padStart(2, '0')
  const h = fmt(time.getHours())
  const m = fmt(time.getMinutes())

  const notifCount = kernel.unreadCount ? kernel.unreadCount() : 0
  const battery = kernel.battery
  const batteryClass = battery > 30 ? 'batt-ok' : battery > 15 ? 'batt-low' : 'batt-crit'
  const profile = sound.getProfile()

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-icon">▂▄▆</span>
        <span className="status-icon">{profile === 0 ? '✕' : profile === 1 ? '≈' : '♪'}</span>
      </div>
      <div className="status-center">
        {h}:{m}
      </div>
      <div className="status-right">
        {notifCount > 0 && <span className="status-notif-badge">{notifCount}</span>}
        <span className={`status-icon ${batteryClass}`}>▮{battery}%</span>
      </div>
    </div>
  )
}
