import { useEffect, useState } from 'react'

export default function Boot({ onComplete }) {
  const [step, setStep] = useState(0)
  const lines = [
    '',
    '  \u25B2  \u25B2  \u25B2  \u25B2  \u25B2  \u25B2',
    ' \u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0\u25A0',
    '',
    '   OpenPhone OS',
    '   v1.0.0',
    '',
    '   Caricamento...',
  ]

  useEffect(() => {
    if (step >= lines.length) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep(s => s + 1), 120)
    return () => clearTimeout(t)
  }, [step, lines.length, onComplete])

  return (
    <div className="boot-screen">
      <pre className="boot-text">
        {lines.slice(0, step).join('\n')}
      </pre>
    </div>
  )
}
