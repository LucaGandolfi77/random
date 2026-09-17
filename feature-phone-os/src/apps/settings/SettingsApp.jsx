import { useState, useEffect } from 'react'
import sound from '../../os/sound.js'
import { THEMES } from './themes.js'
import { OS_VERSION, OS_NAME, OS_CODENAME } from '../../os/defaults.js'

export default function SettingsApp({ sys, kernel }) {
  const [activeTheme, setActiveTheme] = useState(() => {
    return sys.fs.read('/data/settings/theme.txt') || 'midnight'
  })
  const [soundIdx, setSoundIdx] = useState(() => {
    const s = sys.fs.read('/data/settings/sound.txt')
    return s ? parseInt(s, 10) : 2
  })
  const [volume, setVolume] = useState(() => {
    const v = sys.fs.read('/data/settings/volume.txt')
    return v !== null ? parseInt(v, 10) : 6
  })
  const [vibrate, setVibrate] = useState(() => {
    const v = sys.fs.read('/data/settings/vibrate.txt')
    return v !== null ? v === '1' : true
  })
  const [view, setView] = useState('main')
  const [cursor, setCursor] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [procCursor, setProcCursor] = useState(0)
  const [tick, setTick] = useState(0)

  const SOUNDS = ['Silenzioso', 'Vibrazione', 'Suoneria']

  const mainItems = [
    { id: 'theme', label: 'Tema schermo', value: THEMES.find(t => t.id === activeTheme)?.name || activeTheme },
    { id: 'sound', label: 'Profilo suono', value: SOUNDS[soundIdx] || 'Suoneria' },
    { id: 'volume', label: 'Volume', value: '▮'.repeat(Math.round(volume / 2)) },
    { id: 'vibrate', label: 'Vibrazione', value: vibrate ? 'On' : 'Off' },
    { id: 'about', label: 'Info telefono', value: '' },
    { id: 'reset', label: 'Ripristino', value: '' },
  ]

  // refresh per uptime in About
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'end') { sys.exit(); return true }
      if (view === 'main') {
        if (key === 'up') { setCursor(c => (c - 1 + mainItems.length) % mainItems.length); return true }
        if (key === 'down') { setCursor(c => (c + 1) % mainItems.length); return true }
        if (key === 'ok') { setView(mainItems[cursor].id); setConfirmReset(false); return true }
        return false // back non consumato → chiudi l'app
      }

      if (view === 'theme') {
        const themeIds = THEMES.map(t => t.id)
        if (key === 'up' || key === 'down') {
          const idx = themeIds.indexOf(activeTheme)
          const next = key === 'up'
            ? (idx - 1 + themeIds.length) % themeIds.length
            : (idx + 1) % themeIds.length
          const newTheme = themeIds[next]
          setActiveTheme(newTheme)
          sys.fs.write('/data/settings/theme.txt', newTheme)
          return true
        }
        if (key === 'softRight' || key === 'back') { setView('main'); return true }
        return false
      }

      if (view === 'sound') {
        if (key === 'up' || key === 'down') {
          const n = key === 'up'
            ? (soundIdx - 1 + SOUNDS.length) % SOUNDS.length
            : (soundIdx + 1) % SOUNDS.length
          setSoundIdx(n)
          sys.fs.write('/data/settings/sound.txt', String(n))
          sound.setProfile(n)
          if (n === 2) sound.notify() // demo!
          return true
        }
        if (key === 'softRight' || key === 'back') { setView('main'); return true }
        return false
      }

      if (view === 'volume') {
        if (key === 'up') {
          const n = Math.min(10, volume + 1)
          setVolume(n); sys.fs.write('/data/settings/volume.txt', String(n)); sound.setVolume(n)
          sound.notify() // demo beep
          return true
        }
        if (key === 'down') {
          const n = Math.max(0, volume - 1)
          setVolume(n); sys.fs.write('/data/settings/volume.txt', String(n)); sound.setVolume(n)
          if (n > 0) sound.notify()
          return true
        }
        if (key === 'softRight' || key === 'back') { setView('main'); return true }
        return false
      }

      if (view === 'vibrate') {
        if (key === 'up' || key === 'down') {
          const nv = !vibrate
          setVibrate(nv)
          sys.fs.write('/data/settings/vibrate.txt', nv ? '1' : '0')
          if (nv) sound.vibrate(300) // test!
          return true
        }
        if (key === 'softRight' || key === 'back') { setView('main'); return true }
        return false
      }

      if (view === 'about') {
        const procs = kernel.ps()
        if (key === 'up') { setProcCursor(c => (c - 1 + Math.max(1, procs.length)) % Math.max(1, procs.length)); return true }
        if (key === 'down') { setProcCursor(c => (c + 1) % Math.max(1, procs.length)); return true }
        if (key === 'ok' && procs.length > 0) {
          // kill processi (anche te stesso, se osi)
          const target = procs[procCursor]
          sys.notify('Kernel', `kill PID ${target.pid} (${target.name})`)
          kernel.kill(target.pid)
          setProcCursor(0)
          return true
        }
        if (key === 'softRight' || key === 'back') { setView('main'); return true }
        return false
      }

      if (view === 'reset') {
        if (confirmReset) {
          if (key === 'ok') {
            setResetting(true)
            setTimeout(() => kernel.nuke(), 1200)
            return true
          }
          setConfirmReset(false)
          return true
        }
        if (key === 'ok') { setConfirmReset(true); return true }
        if (key === 'softRight' || key === 'back') { setView('main'); setConfirmReset(false); return true }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, view, cursor, activeTheme, soundIdx, volume, vibrate, confirmReset, procCursor, mainItems, kernel])

  // tema applicato globalmente
  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0]
    document.documentElement.style.setProperty('--theme-bg', theme.bg)
    document.documentElement.style.setProperty('--theme-fg', theme.fg)
    document.documentElement.style.setProperty('--theme-accent', theme.accent)
  }, [activeTheme])

  if (resetting) {
    return (
      <div className="app-settings settings-resetting">
        <div className="reset-title">⚠ Reset in corso...</div>
        <div className="reset-sub">Polverizzazione dell'archivio</div>
        <div className="reset-bar">▰▰▱▱▱▱▱▱▱▱</div>
        <div className="reset-fun">Addio, cari ricordi. 👋</div>
      </div>
    )
  }

  if (view === 'theme') {
    const current = THEMES.find(t => t.id === activeTheme) || THEMES[0]
    return (
      <div className="app-settings">
        <div className="settings-title">Tema schermo</div>
        <div className="theme-preview" style={{ background: current.bg, color: current.fg, border: '2px solid ' + current.accent }}>
          <div className="theme-preview-text">Anteprima</div>
          <div className="theme-preview-bar" style={{ background: current.accent }} />
        </div>
        <div className="settings-current">{current.name}</div>
        <div className="settings-hint">Su/Giù per cambiare</div>
      </div>
    )
  }

  if (view === 'sound') {
    return (
      <div className="app-settings">
        <div className="settings-title">Profilo suono</div>
        <div className="settings-current">{SOUNDS[soundIdx]}</div>
        <div className="settings-hint">Su/Giù per cambiare (demo inclusa)</div>
      </div>
    )
  }

  if (view === 'volume') {
    return (
      <div className="app-settings">
        <div className="settings-title">Volume</div>
        <div className="settings-current volume-display">{volume}/10</div>
        <div className="volume-bar">{'▮'.repeat(volume)}{'▯'.repeat(10 - volume)}</div>
        <div className="settings-hint">Su/Giù per cambiare (demo beep)</div>
      </div>
    )
  }

  if (view === 'vibrate') {
    return (
      <div className="app-settings">
        <div className="settings-title">Vibrazione</div>
        <div className="settings-current">{vibrate ? 'On 📳' : 'Off'}</div>
        <div className="settings-hint">Su/Giù per cambiare (test incluso)</div>
      </div>
    )
  }

  if (view === 'about') {
    const uptime = kernel.getUptime()
    const secs = Math.floor(uptime / 1000)
    const mins = Math.floor(secs / 60)
    const hrs = Math.floor(mins / 60)
    const uptimeStr = `${hrs}h ${mins % 60}m ${secs % 60}s`
    const procs = kernel.ps()
    const duBytes = sys.fs.du()

    return (
      <div className="app-settings">
        <div className="settings-title">Info telefono</div>
        <div className="about-info">
          <div className="about-line"><span>OS:</span><span>{OS_NAME} v{OS_VERSION}</span></div>
          <div className="about-line"><span>Codename:</span><span>{OS_CODENAME}</span></div>
          <div className="about-line"><span>Modello:</span><span>OP-2000</span></div>
          <div className="about-line"><span>Uptime:</span><span>{uptimeStr}</span></div>
          <div className="about-line"><span>Batteria:</span><span>{kernel.battery}%</span></div>
          <div className="about-line"><span>Storage:</span><span>{duBytes} bytes</span></div>
        </div>
        <div className="about-ps-title">Processi attivi (OK per killare):</div>
        <div className="about-ps">
          {procs.length === 0 ? <div className="about-ps-none">(nessun processo)</div> :
            procs.map((p, i) => (
              <div key={p.pid} className={`about-ps-row ${i === procCursor ? 'about-ps-focus' : ''}`}>
                <span>PID {p.pid}</span>
                <span>{p.name}</span>
                <span>{p.state}</span>
              </div>
            ))
          }
        </div>
        <div className="settings-hint">Su/Giù: seleziona · OK: kill · Indietro: torna</div>
      </div>
    )
  }

  if (view === 'reset') {
    return (
      <div className="app-settings">
        <div className="settings-title">Ripristino</div>
        {confirmReset ? (
          <div className="contact-confirm">
            <div>⚠ Reset di fabbrica?</div>
            <div>Tutti i dati andranno persi!</div>
            <div className="contact-confirm-hint">OK: conferma · altro: annulla</div>
          </div>
        ) : (
          <div className="contact-confirm">
            <div>Ripristina il telefono allo stato di fabbrica.</div>
            <div className="contact-confirm-hint">OK: continua · Indietro: annulla</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-settings">
      <div className="settings-title">Impostazioni</div>
      {mainItems.map((item, i) => (
        <div key={item.id}
          className={`settings-row ${i === cursor ? 'settings-row-focus' : ''}`}
          onClick={() => setView(item.id)}
          onMouseEnter={() => setCursor(i)}
        >
          <span>{item.label}</span>
          <span className="settings-value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
