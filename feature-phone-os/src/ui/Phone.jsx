import { useEffect, useRef } from 'react'
import Screen from './Screen.jsx'
import StatusBar from './StatusBar.jsx'
import SoftkeyBar from './SoftkeyBar.jsx'
import Keypad from './Keypad.jsx'

const KEY_MAP = {
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'Enter': 'ok',
  'Escape': 'end',
  'Backspace': 'end',
  'F1': 'softLeft',
  'F2': 'softRight',
  ' ': 'space',
}

for (let i = 0; i <= 9; i++) {
  KEY_MAP[`Digit${i}`] = String(i)
  KEY_MAP[`Numpad${i}`] = String(i)
}
KEY_MAP['NumpadAdd'] = '+'
KEY_MAP['NumpadSubtract'] = '-'
KEY_MAP['NumpadMultiply'] = '*'
KEY_MAP['NumpadDivide'] = '/'
KEY_MAP['NumpadDecimal'] = '.'
KEY_MAP['Period'] = '.'
KEY_MAP['Comma'] = ','
KEY_MAP['Slash'] = '/'
KEY_MAP['Minus'] = '-'
KEY_MAP['Equal'] = '+'
KEY_MAP['KeyC'] = 'c'
KEY_MAP['KeyS'] = 's'

export default function Phone({ children, kernel, onKey, softkeys }) {
  const keyHandlerRef = useRef(onKey)
  keyHandlerRef.current = onKey

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.repeat) return
      const code = e.code
      const mapped = KEY_MAP[code]
      if (mapped) {
        e.preventDefault()
        keyHandlerRef.current(mapped)
        return
      }
      if (code.startsWith('Key')) {
        const letter = code[3].toLowerCase()
        if (/^[a-zA-Z]$/.test(letter)) {
          e.preventDefault()
          keyHandlerRef.current(letter)
        }
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="phone-frame">
      <div className="phone-speaker" />
      <div className="phone-screen-area">
        <StatusBar kernel={kernel} />
        <Screen>{children}</Screen>
        <SoftkeyBar left={softkeys?.left} center={softkeys?.center} right={softkeys?.right} />
      </div>
      <Keypad onKey={onKey} />
    </div>
  )
}
