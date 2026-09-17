import { useState, useEffect } from 'react'

// Calcolatrice a stati classica: ZERO eval, catena vera (2+3-1=4)

export default function CalculatorApp({ sys }) {
  const [display, setDisplay] = useState('0')
  const [expr, setExpr] = useState('')
  const [acc, setAcc] = useState(null)   // accumulatore
  const [op, setOp] = useState(null)     // operatore in attesa
  const [justEval, setJustEval] = useState(false)

  const OPS = { '+': '+', '-': '-', '*': '×', '/': '÷' }

  function compute(a, b, operation) {
    switch (operation) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b === 0 ? NaN : a / b
      default: return b
    }
  }

  function fmtNum(n) {
    if (!isFinite(n)) return 'Errore'
    // arrotonda errori di virgola mobile (0.1+0.2 = 0.30000000000000004)
    const rounded = Math.round(n * 1e10) / 1e10
    let s = String(rounded)
    if (s.length > 14) s = rounded.toPrecision(10).replace(/\.?0+$/, '')
    return s
  }

  // logica centrale condivisa fra tastiera e bottoni
  function applyDigit(k) {
    if (justEval) {
      setDisplay(k)
      setJustEval(false)
      if (op === null) { setAcc(null); setExpr('') }
    } else {
      setDisplay(d => d === '0' ? k : (d.length < 14 ? d + k : d))
    }
  }

  function applyOperator(k) {
    let newAcc = acc
    if (acc === null) {
      newAcc = parseFloat(display)
    } else if (!justEval && op !== null) {
      const result = compute(acc, parseFloat(display), op)
      if (!isFinite(result)) { setDisplay('Errore'); setExpr(''); setAcc(null); setOp(null); return }
      newAcc = result
    } else if (justEval && op === null) {
      // dopo un "=", un operatore riparte dal display
      newAcc = parseFloat(display)
    }
    setAcc(newAcc)
    setOp(k)
    setExpr(fmtNum(newAcc) + ' ' + OPS[k] + ' ')
    setDisplay(fmtNum(newAcc))
    setJustEval(true) // il prossimo operatore fa il merge, la prossima cifra parte pulita
  }

  function applyEquals() {
    if (acc !== null && op !== null) {
      const result = compute(acc, parseFloat(display), op)
      setExpr('')
      setDisplay(fmtNum(result))
      setAcc(null)
      setOp(null)
      setJustEval(true)
    }
  }

  function applyClear() {
    setDisplay('0'); setExpr(''); setAcc(null); setOp(null); setJustEval(false)
  }

  function applyBack() {
    if (justEval) { setDisplay('0'); setJustEval(false); setExpr('') }
    else if (display.length > 1) setDisplay(d => d.slice(0, -1))
    else setDisplay('0')
  }

  function applyPercent() {
    const p = parseFloat(display)
    if (isNaN(p)) return
    const result = acc !== null && !justEval ? (acc * p / 100) : p / 100
    setDisplay(fmtNum(result))
    setJustEval(true)
  }

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return true }
      if (key === 'ok') { applyEquals(); return true }
      if (key === 'c') { applyClear(); return true }
      if (key === 'back') { applyBack(); return true }
      if (OPS[key]) { applyOperator(key); return true }
      if (key === '.') {
        if (justEval) { setDisplay('0.'); setJustEval(false) }
        else if (!display.includes('.')) setDisplay(d => d + '.')
        return true
      }
      if (key === '%') { applyPercent(); return true }
      if (/^[0-9]$/.test(key)) { applyDigit(key); return true }
      return false
    })

    return () => sys.onKey(null)
  }, [sys, display, expr, acc, op, justEval])

  function press(k) {
    if (k === 'C') { applyClear(); return }
    if ('+-*/'.includes(k) && k.length === 1) { applyOperator(k); return }
    if (/^[0-9]$/.test(k)) { applyDigit(k); return }
    if (k === '.') {
      if (justEval) { setDisplay('0.'); setJustEval(false) }
      else if (!display.includes('.')) setDisplay(d => d + '.')
      return
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
                onClick={() => press(k)}>
                {k}
              </button>
            ))}
          </div>
        ))}
        <button className="calc-btn calc-eq" onClick={applyEquals}>=</button>
      </div>
      <div className="calc-hint">C: reset · back: cancella · %: percentuale</div>
    </div>
  )
}
