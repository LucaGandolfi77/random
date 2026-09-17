import { useState, useEffect, useRef } from 'react'
import { DEFAULT_CONTACTS } from '../../os/defaults.js'

export default function DialerApp({ sys, kernel }) {
  const [number, setNumber] = useState('')
  const [view, setView] = useState('compose') // compose | log
  const [log, setLog] = useState(() => {
    try {
      const raw = sys.fs.read('/data/calls/log.json')
      const list = raw ? JSON.parse(raw) : []
      return Array.isArray(list) ? list : []
    } catch { return [] }
  })
  const [cursor, setCursor] = useState(0)

  const contacts = (() => {
    try {
      const raw = sys.fs.read('/data/contacts/list.json')
      const list = raw ? JSON.parse(raw) : DEFAULT_CONTACTS
      return Array.isArray(list) ? list : DEFAULT_CONTACTS
    } catch { return DEFAULT_CONTACTS }
  })()

  // match contatto live durante la composizione
  const match = contacts.find(c => number.length >= 3 && c.number.startsWith(number))

  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'compose') {
        if (key === 'softRight') { sys.exit(); return true }
        if (key === 'softLeft' || key === 'back' && number.length === 0) {
          setView('log')
          setCursor(0)
          return true
        }
        if (key === 'back') { setNumber(n => n.slice(0, -1)); return true }
        if (key === 'ok' || key === 'call') {
          if (number.length >= 3) sys.call(number, match?.name)
          else sys.notify('Telefono', 'Numero troppo corto!')
          return true
        }
        if (/^[0-9+]$/.test(key) && number.length < 16) { setNumber(n => n + key); return true }
        if (key === '*' && number.length < 16) { setNumber(n => n + '*'); return true }
        if (key === '#' && number.length < 16) { setNumber(n => n + '#'); return true }
        return false
      }

      if (view === 'log') {
        if (key === 'up') { setCursor(c => (c - 1 + Math.max(1, log.length)) % Math.max(1, log.length)); return true }
        if (key === 'down') { setCursor(c => (c + 1) % Math.max(1, log.length)); return true }
        if (key === 'ok' && log.length > 0) {
          sys.call(log[cursor].number, log[cursor].name)
          return true
        }
        if (key === 'softLeft' || key === 'back') { setView('compose'); return true }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, view, number, match, log, cursor])

  function pressDigit(d) {
    setNumber(n => n.length < 16 ? n + d : n)
  }

  function fmtDuration(ms) {
    const secs = Math.floor(ms / 1000)
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }

  const fmtTime = (t) => {
    const d = new Date(t)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const dirIcon = { out: '↗', in: '↙', missed: '✕' }

  return (
    <div className="app-dialer">
      {view === 'compose' && (
        <>
          <div className="dialer-number">{number || '─'}</div>
          <div className="dialer-match">
            {match ? `✆ ${match.name}` : number.length >= 3 ? 'numero sconosciuto' : ''}
          </div>
          <div className="dialer-grid">
            {[['1','2','3'], ['4','5','6'], ['7','8','9'], ['*','0','#']].map((row, ri) => (
              <div className="dialer-row" key={ri}>
                {row.map(d => (
                  <button key={d} className="dialer-btn" onClick={() => pressDigit(d)}>{d}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="dialer-hint">OK/✆: chiama · Sel: registro</div>
        </>
      )}
      {view === 'log' && (
        <>
          <div className="msg-title">Registro chiamate</div>
          <div className="contacts-list">
            {log.length === 0 && <div className="msg-empty">Nessuna chiamata.<br />Il telefono aspetta...</div>}
            {log.map((c, i) => (
              <div key={i} className={`contact-row ${i === cursor ? 'contact-row-focus' : ''}`} onClick={() => sys.call(c.number, c.name)}>
                <div className={`call-dir ${c.direction}`}>{dirIcon[c.direction]}</div>
                <div className="contact-info">
                  <div className="contact-name">{c.name || c.number}</div>
                  <div className="contact-number">
                    {c.direction !== 'missed' ? `${fmtDuration(c.duration)} · ` : ''}{fmtTime(c.time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="contacts-add-hint">OK: richiama · Sel/Indietro: composizione</div>
        </>
      )}
    </div>
  )
}
