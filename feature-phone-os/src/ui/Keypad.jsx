const LABELS = {
  'softLeft': 'Seleziona',
  'softRight': 'Opzioni',
  'up': '\u25B2',
  'down': '\u25BC',
  'left': '\u25C0',
  'right': '\u25B6',
  'ok': 'OK',
  'call': 'Call',
  'end': 'End',
}

export default function Keypad({ onKey }) {
  const keys = [
    ['softLeft', 'softRight'],
    ['call', 'up', 'end'],
    [null, 'left', 'ok', 'right', null],
    [null, 'down', null],
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ]

  function btnClass(k) {
    const c = ['key-btn']
    if (k === 'call') c.push('key-call')
    if (k === 'end') c.push('key-end')
    if (['up', 'down', 'left', 'right'].includes(k)) c.push('key-dir')
    if (k === 'ok') c.push('key-ok')
    if (['softLeft', 'softRight'].includes(k)) c.push('key-soft')
    if (/^[0-9*#]$/.test(k)) c.push('key-num')
    return c.join(' ')
  }

  return (
    <div className="keypad">
      {keys.map((row, ri) => (
        <div className="keypad-row" key={ri}>
          {row.map((k, ci) => {
            if (k === null) return <div className="key-btn key-empty" key={ci} />
            return (
              <button className={btnClass(k)} key={ci} onClick={() => onKey(k)}>
                {LABELS[k] || k}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
