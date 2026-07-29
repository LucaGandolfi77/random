import { useState, useEffect } from 'react'

export default function CalculatorApp({ sys }) {
  const [display, setDisplay] = useState('0')
  const [expr, setExpr] = useState('')

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return }

      if (key === 'ok' || key === 'enter') {
        handleEquals()
        return
      }

      if (key === 'c' || key === 'C' || key === 'clear') {
        setDisplay('0')
        setExpr('')
        return
      }

      if (key === 'backspace') {
        if (display.length > 1) setDisplay(d => d.slice(0, -1))
        else setDisplay('0')
        return
      }

      const ops = { '+': '+', '-': '-', '*': '\u00D7', '/': '\u00F7' }

      if (ops[key]) {
        setExpr(display + ' ' + ops[key] + ' ')
        setDisplay('0')
        return
      }

      if (key === '.') {
        if (!display.includes('.')) setDisplay(d => d + '.')
        return
      }

      if (/^[0-9]$/.test(key)) {
        setDisplay(d => d === '0' ? key : d + key)
      }
    })

    return () => sys.onKey(null)
  }, [sys, display, expr])

  function handleEquals() {
    try {
      const full = expr + display
      let sanitized = full.replace(/\u00D7/g, '*').replace(/\u00F7/g, '/')
      let result = Function('"use strict"; return (' + sanitized + ')')()
      if (!isFinite(result)) throw new Error()
      setDisplay(String(result))
      setExpr('')
    } catch {
      setDisplay('Errore')
      setExpr('')
    }
  }

  return (
    <div className="app-calculator">
      <div className="calc-expr">{expr}</div>
      <div className="calc-display">{display}</div>
      <div className="calc-grid">
        {[['7','8','9','/'], ['4','5','6','*'], ['1','2','3','-'], ['C','0','.','+']].map((row, ri) => (
          <div className="calc-row" key={ri}>
            {row.map(k => (
              <button key={k} className={`calc-btn ${'+-*/'.includes(k) ? 'calc-op' : k === 'C' ? 'calc-clear' : ''}`}
                onClick={() => {
                  if (k === 'C') { setDisplay('0'); setExpr('') }
                  else if ('+-*/'.includes(k)) { setExpr(display + ' ' + k + ' '); setDisplay('0') }
                  else if (k === '.') { if (!display.includes('.')) setDisplay(d => d + '.') }
                  else { setDisplay(d => d === '0' ? k : d + k) }
                }}>
                {k}
              </button>
            ))}
          </div>
        ))}
        <button className="calc-btn calc-eq" onClick={handleEquals}>=</button>
      </div>
    </div>
  )
}
