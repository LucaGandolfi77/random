import { useState, useEffect } from 'react'
import registry from '../os/registry.js'

export default function Launcher({ onLaunchApp, onKeyRef }) {
  const [cursor, setCursor] = useState(0)
  const cols = 3

  useEffect(() => {
    onKeyRef.current = (key) => {
      if (key === 'up') setCursor(c => Math.max(0, c - cols))
      if (key === 'down') setCursor(c => Math.min(registry.length - 1, c + cols))
      if (key === 'left') setCursor(c => Math.max(0, c - 1))
      if (key === 'right') setCursor(c => Math.min(registry.length - 1, c + 1))
      if (key === 'ok') onLaunchApp(registry[cursor].id)
    }
    return () => { onKeyRef.current = null }
  }, [cursor, onLaunchApp, onKeyRef])

  return (
    <div className="launcher">
      <div className="launcher-time">
        <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      <div className="launcher-grid">
        {registry.map((app, i) => (
          <button
            key={app.id}
            className={`launcher-app ${i === cursor ? 'launcher-app-focus' : ''}`}
            onClick={() => onLaunchApp(app.id)}
            onMouseEnter={() => setCursor(i)}
          >
            <span className="launcher-icon">{app.icon}</span>
            <span className="launcher-name">{app.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
