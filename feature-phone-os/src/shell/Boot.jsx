import { useEffect, useState } from 'react'
import { countWords } from '../os/t9.js'
import registry from '../os/registry.js'

const LOG_LINES = (dictWords, appCount) => [
  '  ┌──────────────────┐',
  '  │   OpenPhone OS   │',
  '  │      v2.0.0      │',
  '  │  Crazy Frog Ed.  │',
  '  └──────────────────┘',
  '',
  '[0.001] kernel  : init ok',
  '[0.014] vfs     : /data montato',
  '[0.038] sound   : motore audio pronto',
  `[0.052] t9      : dizionario IT (${dictWords} parole)`,
  '[0.077] daemon  : sms + chiamate + batteria',
  `[0.099] registry: ${appCount} app registrate`,
  '',
  '  🐸 Boot completo. Buon divertimento!',
]

export default function Boot({ onComplete }) {
  const [step, setStep] = useState(0)
  const lines = LOG_LINES(countWords(), registry.length)

  useEffect(() => {
    if (step >= lines.length) {
      const t = setTimeout(onComplete, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep(s => s + 1), 110)
    return () => clearTimeout(t)
  }, [step, lines.length, onComplete])

  const progress = Math.min(12, Math.round((step / lines.length) * 12))
  const bar = '▰'.repeat(progress) + '▱'.repeat(12 - progress)

  return (
    <div className="boot-screen">
      <pre className="boot-text">
        {lines.slice(0, step).join('\n')}
        {'\n'}
        {bar}
      </pre>
    </div>
  )
}
