import { useState, useEffect } from 'react'

const THEMES = [
  { id: 'midnight', name: 'Notte', bg: '#1a1a2e', fg: '#e0e0e0', accent: '#0f3460' },
  { id: 'forest', name: 'Foresta', bg: '#1a3a1a', fg: '#d4e4c4', accent: '#2a5a2a' },
  { id: 'retro', name: 'Retrò', bg: '#2d1b00', fg: '#e8d4a0', accent: '#5a3a1a' },
  { id: 'ocean', name: 'Oceano', bg: '#0a1628', fg: '#c0d8e8', accent: '#1a3a5a' },
  { id: 'default', name: 'Default', bg: '#1a1a2e', fg: '#ffffff', accent: '#2a2a4e' },
]

const SOUNDS = ['Silenzioso', 'Vibrazione', 'Suoneria']

export default function SettingsApp({ sys, kernel }) {
  const [activeTheme, setActiveTheme] = useState(() => {
    return sys.fs.read('/data/settings/theme.txt') || 'midnight'
  })
  const [soundIdx, setSoundIdx] = useState(() => {
    const s = sys.fs.read('/data/settings/sound.txt')
    return s ? parseInt(s, 10) : 0
  })
  const [view, setView] = useState('main')
  const [cursor, setCursor] = useState(0)

  const mainItems = [
    { id: 'theme', label: 'Tema schermo', value: THEMES.find(t => t.id === activeTheme)?.name || activeTheme },
    { id: 'sound', label: 'Profilo suono', value: SOUNDS[soundIdx] || 'Silenzioso' },
    { id: 'about', label: 'Info telefono', value: '' },
  ]

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'end') { sys.exit(); return }
      if (key === 'softRight') { setView('main'); return }

      if (view === 'main') {
        if (key === 'up') setCursor(c => Math.max(0, c - 1))
        if (key === 'down') setCursor(c => Math.min(mainItems.length - 1, c + 1))
        if (key === 'ok') setView(mainItems[cursor].id)
      } else if (view === 'theme') {
        const themeKeys = THEMES.map(t => t.id)
        if (key === 'up') {
          const idx = themeKeys.indexOf(activeTheme)
          const next = (idx - 1 + themeKeys.length) % themeKeys.length
          const newTheme = themeKeys[next]
          setActiveTheme(newTheme)
          sys.fs.write('/data/settings/theme.txt', newTheme)
        }
        if (key === 'down') {
          const idx = themeKeys.indexOf(activeTheme)
          const next = (idx + 1) % themeKeys.length
          const newTheme = themeKeys[next]
          setActiveTheme(newTheme)
          sys.fs.write('/data/settings/theme.txt', newTheme)
        }
      } else if (view === 'sound') {
        if (key === 'up') { const n = (soundIdx - 1 + SOUNDS.length) % SOUNDS.length; setSoundIdx(n); sys.fs.write('/data/settings/sound.txt', String(n)) }
        if (key === 'down') { const n = (soundIdx + 1) % SOUNDS.length; setSoundIdx(n); sys.fs.write('/data/settings/sound.txt', String(n)) }
      }
    })
    return () => sys.onKey(null)
  }, [sys, view, cursor, activeTheme, soundIdx, mainItems])

  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0]
    document.documentElement.style.setProperty('--theme-bg', theme.bg)
    document.documentElement.style.setProperty('--theme-fg', theme.fg)
    document.documentElement.style.setProperty('--theme-accent', theme.accent)
  }, [activeTheme])

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
        <div className="settings-hint">Su/Gi\uf8ff per cambiare</div>
      </div>
    )
  }

  if (view === 'sound') {
    return (
      <div className="app-settings">
        <div className="settings-title">Profilo suono</div>
        <div className="settings-current">{SOUNDS[soundIdx]}</div>
        <div className="settings-hint">Su/Gi\uf8ff per cambiare</div>
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

    return (
      <div className="app-settings">
        <div className="settings-title">Info telefono</div>
        <div className="about-info">
          <div className="about-line"><span>OS:</span><span>OpenPhone OS</span></div>
          <div className="about-line"><span>Versione:</span><span>1.0.0</span></div>
          <div className="about-line"><span>Uptime:</span><span>{uptimeStr}</span></div>
          <div className="about-line"><span>Processi:</span><span>{procs.length}</span></div>
        </div>
        <div className="about-ps-title">Processi attivi:</div>
        <div className="about-ps">
          {procs.length === 0 ? <div className="about-ps-none">(nessun processo in foreground)</div> :
            procs.map(p => (
              <div key={p.pid} className="about-ps-row">
                <span>PID {p.pid}</span>
                <span>{p.name}</span>
                <span>{p.state}</span>
              </div>
            ))
          }
        </div>
        <div className="settings-hint">SoftRight: Indietro</div>
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
