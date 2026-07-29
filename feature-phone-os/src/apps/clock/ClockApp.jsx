import { useState, useEffect } from 'react'

export default function ClockApp({ sys }) {
  const [time, setTime] = useState(new Date())
  const [stopwatch, setStopwatch] = useState(0)
  const [swRunning, setSwRunning] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!swRunning) return
    const t = setInterval(() => setStopwatch(s => s + 100), 100)
    return () => clearInterval(t)
  }, [swRunning])

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return }
      if (key === 'ok') {
        if (swRunning) setSwRunning(false)
        else setSwRunning(true)
      }
      if (key === 'c' || key === 'C') {
        setStopwatch(0)
        setSwRunning(false)
      }
    })
    return () => sys.onKey(null)
  }, [sys, swRunning])

  const fmt = (n) => String(n).padStart(2, '0')
  const h = fmt(time.getHours())
  const m = fmt(time.getMinutes())
  const s = fmt(time.getSeconds())

  const swSecs = Math.floor(stopwatch / 1000)
  const swMins = Math.floor(swSecs / 60)
  const swSec = swSecs % 60
  const swMs = Math.floor((stopwatch % 1000) / 100)

  return (
    <div className="app-clock">
      <div className="clock-big">{h}:{m}</div>
      <div className="clock-sec">{s}</div>
      <div className="clock-date">
        {time.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="clock-divider" />
      <div className="clock-stopwatch-label">Cronometro</div>
      <div className="clock-stopwatch">{swMins}:{fmt(swSec)}.{swMs}</div>
      <div className="clock-stopwatch-controls">
        <button className="clock-sw-btn" onClick={() => setSwRunning(!swRunning)}>
          {swRunning ? 'Stop' : 'Avvia'}
        </button>
        <button className="clock-sw-btn" onClick={() => { setStopwatch(0); setSwRunning(false) }}>
          Reset
        </button>
      </div>
    </div>
  )
}
