import { useState, useEffect, useRef } from 'react'
import sound from '../../os/sound.js'

export default function CallScreen({ kernel, onKeyRef }) {
  const call = kernel.call
  const [now, setNow] = useState(Date.now())
  const profile = sound.getProfile()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    onKeyRef.current = (key) => {
      if (key === 'end' || key === 'softRight') { kernel.endCall(); return true }
      if (key === 'ok' || key === 'call' || key === 'softLeft') {
        if (call.state === 'incoming') { kernel.acceptCall(); return true }
        if (call.state === 'active') { kernel.endCall(); return true }
        return true
      }
      return true // durante una chiamata, tutto l'input viene catturato
    }
    return () => { onKeyRef.current = null }
  }, [kernel, call])

  if (!call) return null

  const duration = call.state === 'active' ? now - call.startTime : 0
  const secs = Math.floor(duration / 1000)
  const durStr = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  const stateText = {
    dialing: 'Chiamata in corso...',
    incoming: 'ti sta chiamando!',
    active: durStr,
  }

  const isIncoming = call.state === 'incoming'
  const isDialing = call.state === 'dialing'

  return (
    <div className={`app-call ${isIncoming ? 'call-incoming' : ''}`}>
      <div className={`call-avatar ${call.state}`}>{(call.name || '#')[0]}</div>
      <div className="call-name">{call.name || call.number}</div>
      {call.name && <div className="call-number">{call.number}</div>}
      <div className={`call-state ${call.state}`}>{stateText[call.state]}</div>
      {isIncoming && <div className="call-ringing">♪ ♪ ♪</div>}
      <div className="call-hint">
        {isIncoming ? 'OK/✆: accetta · ✕: rifiuta' : isDialing ? '✕: riaggancia' : '✕: riaggancia'}
      </div>
    </div>
  )
}
