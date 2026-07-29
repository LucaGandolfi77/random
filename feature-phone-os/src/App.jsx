import { useState, useEffect, useCallback, useRef } from 'react'
import kernel from './os/kernel.js'
import Boot from './shell/Boot.jsx'
import Launcher from './shell/Launcher.jsx'
import Phone from './ui/Phone.jsx'

const APP_SOFTKEYS = {
  snake:      { left: 'Nuova',  right: 'Esci' },
  messages:   { left: 'Apri',   right: 'Indietro' },
  contacts:   { left: 'Apri',   right: 'Indietro' },
  calculator: { left: '',       right: 'Esci' },
  clock:      { left: '',       right: 'Esci' },
  settings:   { left: 'Apri',   right: 'Indietro' },
}

export default function App() {
  const [phase, setPhase] = useState('boot')
  const [refresh, setRefresh] = useState(0)
  const launcherKeyRef = useRef(null)

  useEffect(() => {
    kernel.init()
    return kernel.subscribe(() => setRefresh(n => n + 1))
  }, [])

  const handleKey = useCallback((key) => {
    if (key === 'end') {
      if (kernel.getForeground()) {
        kernel.home()
      }
      return
    }
    const fg = kernel.getForeground()
    if (fg && fg.keyHandler) {
      fg.keyHandler(key)
    } else if (launcherKeyRef.current) {
      launcherKeyRef.current(key)
    }
  }, [])

  const handleLaunchApp = useCallback((appId) => {
    kernel.launch(appId)
  }, [])

  if (phase === 'boot') {
    return <Boot onComplete={() => setPhase('ready')} />
  }

  const fg = kernel.getForeground()
  const sk = fg ? (APP_SOFTKEYS[fg.appId] || { left: '', right: '' }) : { left: '', right: '' }

  let content
  if (fg) {
    const AppComponent = fg.component
    content = <AppComponent sys={fg.sys} kernel={kernel} appState={fg.appState} />
  } else {
    content = <Launcher kernel={kernel} onLaunchApp={handleLaunchApp} onKeyRef={launcherKeyRef} />
  }

  return (
    <Phone kernel={kernel} onKey={handleKey} softkeys={{ left: sk.left, center: '', right: sk.right }}>
      {content}
    </Phone>
  )
}
