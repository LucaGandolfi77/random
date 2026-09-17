import { useState, useEffect, useRef } from 'react'
import registry from '../os/registry.js'

export default function Launcher({ onLaunchApp, onKeyRef, kernel }) {
  const [cursor, setCursor] = useState(0)
  const [now, setNow] = useState(new Date())
  const [imeiPopup, setImei] = useState(null)
  const seqRef = useRef('')
  const cols = 3

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    onKeyRef.current = (key) => {
      // Easter egg IMEI: digita *#06# come sui veri Nokia
      if (/^[0-9*#]$/.test(key)) {
        seqRef.current = (seqRef.current + key).slice(-8)
        if (seqRef.current.endsWith('*#06#')) {
          setImei(kernel.getImei())
          seqRef.current = ''
          return
        }
      }
      if (imeiPopup) { setImei(null); return }
      if (key === 'call') { onLaunchApp('dialer'); return }
      if (key === 'up') setCursor(c => (c - cols + registry.length * cols) % registry.length)
      if (key === 'down') setCursor(c => (c + cols) % registry.length)
      if (key === 'left') setCursor(c => (c - 1 + registry.length) % registry.length)
      if (key === 'right') setCursor(c => (c + 1) % registry.length)
      if (key === 'ok') onLaunchApp(registry[cursor].id)
    }
    return () => { onKeyRef.current = null }
  }, [cursor, onLaunchApp, onKeyRef, kernel, imeiPopup])

  return (
    <div className="launcher">
      <div className="launcher-time">
        <span>{now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
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
      {imeiPopup && (
        <div className="imei-popup">
          <div className="imei-title">IMEI</div>
          <div className="imei-value">{imeiPopup}</div>
          <div className="imei-hint">Ora vai a dormire. 😴</div>
        </div>
      )}
    </div>
  )
}
