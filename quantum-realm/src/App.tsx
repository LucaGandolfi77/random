import { useEffect } from 'react'
import { useGame } from './game/store'
import { SECTORS } from './game/content'
import { FoamBackdrop } from './ui/FoamBackdrop'
import { CodexScreen, MapScreen, PlayScreen, SettingsScreen, TitleScreen } from './ui/screens'

const hueFor = (screen: string, active: string | null) => {
  if (screen === 'play' && active) {
    const idx = SECTORS.findIndex((s) => s.id === active)
    return idx * 0.07
  }
  if (screen === 'map') return 0.05
  if (screen === 'codex') return 0.55
  if (screen === 'settings') return 0.75
  return 0
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const active = useGame((s) => s.active)

  // Keep the tab title in step with where you are.
  useEffect(() => {
    const sector = SECTORS.find((s) => s.id === active)
    document.title =
      screen === 'play' && sector
        ? `${sector.name} — QBIT`
        : 'QBIT — Adventures in the Uncertainty'
  }, [screen, active])

  return (
    <div className="app" data-screen={screen}>
      <FoamBackdrop hue={hueFor(screen, active)} energy={screen === 'play' ? 0.9 : 0.35} />
      {screen === 'title' && <TitleScreen />}
      {screen === 'map' && <MapScreen />}
      {screen === 'codex' && <CodexScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'play' && <PlayScreen />}
    </div>
  )
}
