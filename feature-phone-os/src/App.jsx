import { useState, useEffect, useCallback, useRef } from 'react'
import kernel from './os/kernel.js'
import sound from './os/sound.js'
import Boot from './shell/Boot.jsx'
import Launcher from './shell/Launcher.jsx'
import CallScreen from './apps/dialer/CallScreen.jsx'
import Phone from './ui/Phone.jsx'

const APP_SOFTKEYS = {
  dialer:       { left: 'Registro', right: 'Esci' },
  messages:     { left: 'Scrivi',   right: 'Indietro' },
  contacts:     { left: 'Nuovo',    right: 'Indietro' },
  notes:        { left: 'Nuova',    right: 'Indietro' },
  snake:        { left: 'Nuova',    right: 'Esci' },
  music:        { left: '',         right: 'Esci' },
  calculator:   { left: '',         right: 'Esci' },
  clock:        { left: '',         right: 'Esci' },
  notifications:{ left: 'Pulisci',  right: 'Indietro' },
  terminal:     { left: '',         right: 'Esci' },
  settings:     { left: '',         right: 'Indietro' },
}

export default function App() {
  const [phase, setPhase] = useState('boot')
  const [, setRefresh] = useState(0)
  const [popup, setPopup] = useState(null)
  const launcherKeyRef = useRef(null)
  const callKeyRef = useRef(null)
  const shownPopupRef = useRef(null)

  useEffect(() => {
    kernel.init()
    const unsub = kernel.subscribe(() => {
      setRefresh(n => n + 1)
      // popup live per notifiche appena arrivate
      const lp = kernel.lastPopup
      if (lp && lp.id !== shownPopupRef.current && Date.now() - lp.at < 500) {
        shownPopupRef.current = lp.id
        setPopup(lp)
        setTimeout(() => setPopup(p => (p && p.id === lp.id ? null : p)), 3500)
      }
    })
    return () => { unsub() }
  }, [])

  const handleKey = useCallback((key) => {
    // Il tasto End riaggancia prima di ogni altra cosa
    if (key === 'end') {
      if (kernel.call) { kernel.endCall(); return }
      if (kernel.getForeground()) {
        kernel.killForeground()
        sound.click()
      }
      return
    }
    // Una chiamata attiva cattura TUTTO l'input
    if (kernel.call) {
      if (callKeyRef.current) callKeyRef.current(key)
      return
    }
    const fg = kernel.getForeground()
    if (fg && fg.keyHandler) {
      const consumed = fg.keyHandler(key)
      // fallback: 'back' non consumato = chiudi l'app (protocollo elegante)
      if (!consumed && key === 'back') {
        kernel.killForeground()
        sound.click()
      }
    } else if (launcherKeyRef.current) {
      launcherKeyRef.current(key)
    }
  }, [])

  const handleLaunchApp = useCallback((appId) => {
    kernel.launch(appId)
    sound.confirm()
  }, [])

  if (phase === 'boot') {
    return <Boot onComplete={() => setPhase('ready')} />
  }

  const fg = kernel.getForeground()
  const inCall = !!kernel.call
  const sk = inCall
    ? { left: '', right: 'Riaggancia' }
    : fg ? (APP_SOFTKEYS[fg.appId] || { left: '', right: '' }) : { left: '', right: '' }

  let content
  if (inCall) {
    content = <CallScreen kernel={kernel} onKeyRef={callKeyRef} />
  } else if (fg) {
    const AppComponent = fg.component
    content = <AppComponent sys={fg.sys} kernel={kernel} appState={fg.appState} />
  } else {
    content = <Launcher kernel={kernel} onLaunchApp={handleLaunchApp} onKeyRef={launcherKeyRef} />
  }

  return (
    <Phone kernel={kernel} onKey={handleKey} softkeys={{ left: sk.left, center: '', right: sk.right }}>
      {content}
      {popup && (
        <div className="notif-popup">
          <div className="notif-popup-title">✉ {popup.title}</div>
          <div className="notif-popup-text">{popup.text}</div>
        </div>
      )}
    </Phone>
  )
}
