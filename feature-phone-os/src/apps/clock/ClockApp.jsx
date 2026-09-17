import { useState, useEffect } from 'react'
import sound from '../../os/sound.js'

export default function ClockApp({ sys }) {
  const [time, setTime] = useState(new Date())
  const [stopwatch, setStopwatch] = useState(0)
  const [swRunning, setSwRunning] = useState(false)
  const [tab, setTab] = useState('clock') // clock | stopwatch | timer
  const [timerDur, setTimerDur] = useState(180) // secondi
  const [timerLeft, setTimerLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)

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
    if (!timerRunning) return
    const t = setInterval(() => {
      setTimerLeft(s => {
        if (s <= 1) {
          setTimerRunning(false)
          setTimerDone(true)
          sound.alarmLoopStart()
          sys.notify('Timer', 'Il timer è scaduto!')
          setTimeout(() => sound.alarmLoopStop(), 4000)
          sound.vibrate([400, 100, 400])
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timerRunning, sys])

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return true }
      if (key === 'left') { setTab('clock'); return true }
      if (key === 'right') { setTab('timer'); return true }

      if (tab === 'clock') {
        if (key === 'up' || key === 'down') { setTab('stopwatch'); return true }
        return false
      }
      if (tab === 'stopwatch') {
        if (key === 'ok') { setSwRunning(r => !r); return true }
        if (key === 'c' || key === 'back') { setStopwatch(0); setSwRunning(false); return true }
        if (key === 'down') { setTab('timer'); return true }
        return false
      }
      if (tab === 'timer') {
        if (key === 'up') {
          setTimerDur(d => { const nd = Math.min(600, d + 60); if (!timerRunning) setTimerLeft(nd); return nd })
          return true
        }
        if (key === 'down') {
          setTimerDur(d => { const nd = Math.max(60, d - 60); if (!timerRunning) setTimerLeft(nd); return nd })
          return true
        }
        if (key === 'ok') {
          if (timerDone) { setTimerDone(false); setTimerLeft(timerDur); return true }
          setTimerRunning(r => !r)
          return true
        }
        if (key === 'c' || key === 'back') { setTimerLeft(timerDur); setTimerRunning(false); setTimerDone(false); sound.alarmLoopStop(); return true }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, tab, timerDur, timerRunning, timerDone])

  const fmt = (n) => String(n).padStart(2, '0')
  const h = fmt(time.getHours())
  const m = fmt(time.getMinutes())
  const s = fmt(time.getSeconds())

  const swSecs = Math.floor(stopwatch / 1000)
  const swMins = Math.floor(swSecs / 60)
  const swSec = swSecs % 60
  const swMs = Math.floor((stopwatch % 1000) / 100)

  const tMins = Math.floor(timerLeft / 60)
  const tSecs = timerLeft % 60

  const tabs = [
    { id: 'clock', label: 'Ora' },
    { id: 'stopwatch', label: 'Crono' },
    { id: 'timer', label: 'Timer' },
  ]

  return (
    <div className="app-clock">
      <div className="clock-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`clock-tab ${tab === t.id ? 'clock-tab-active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'clock' && (
        <>
          <div className="clock-big">{h}:{m}</div>
          <div className="clock-sec">{s}</div>
          <div className="clock-date">
            {time.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </>
      )}
      {tab === 'stopwatch' && (
        <>
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
        </>
      )}
      {tab === 'timer' && (
        <>
          <div className="clock-stopwatch-label">Timer</div>
          <div className={`clock-stopwatch ${timerDone ? 'clock-alarm' : ''}`}>
            {fmt(tMins)}:{fmt(tSecs)}
          </div>
          {timerDone && <div className="clock-alarm-text">⏰ IL TIMER È SCADUTO!</div>}
          <div className="clock-stopwatch-controls">
            <button className="clock-sw-btn" onClick={() => {
              if (timerDone) { setTimerDone(false); setTimerLeft(timerDur); return }
              setTimerRunning(!timerRunning)
            }}>
              {timerRunning ? 'Stop' : timerDone ? 'Di nuovo' : 'Avvia'}
            </button>
            <button className="clock-sw-btn" onClick={() => { setTimerLeft(timerDur); setTimerRunning(false); setTimerDone(false); sound.alarmLoopStop() }}>
              Reset
            </button>
          </div>
          <div className="clock-timer-dur">Durata: {Math.floor(timerDur / 60)} min (↑/↓ per cambiare)</div>
        </>
      )}
    </div>
  )
}
