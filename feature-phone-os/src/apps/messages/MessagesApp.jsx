import { useState, useEffect, useCallback } from 'react'

const CONTACTS = [
  { name: 'Mamma', number: '3331234567' },
  { name: 'Paolo', number: '3389876543' },
  { name: 'Maria', number: '3475551212' },
]

function loadConvs(sys) {
  try {
    const data = sys.fs.read('/data/messages/conversations.json')
    return data ? JSON.parse(data) : defaultConvs()
  } catch { return defaultConvs() }
}

function defaultConvs() {
  return [
    { id: 1, contact: 'Mamma', number: '3331234567', messages: [
      { from: 'Mamma', text: 'Ciao! Vieni a pranzo domenica?', time: Date.now() - 3600000 * 2 },
      { from: 'me', text: 'Certo, ci sono! Porto il dolce?', time: Date.now() - 3600000 },
      { from: 'Mamma', text: 'Perfetto, ti aspetto alle 13!', time: Date.now() - 1800000 },
    ]},
    { id: 2, contact: 'Paolo', number: '3389876543', messages: [
      { from: 'Paolo', text: 'Hai visto l\'ultimo film di fantascienza?', time: Date.now() - 86400000 },
      { from: 'me', text: 'Non ancora, mi dice che è bello?', time: Date.now() - 43200000 },
    ]},
  ]
}

export default function MessagesApp({ sys }) {
  const [convs, setConvs] = useState(() => loadConvs(sys))
  const [view, setView] = useState('list')
  const [activeConv, setActiveConv] = useState(null)
  const [draft, setDraft] = useState('')

  const save = useCallback((c) => {
    sys.fs.write('/data/messages/conversations.json', JSON.stringify(c))
  }, [sys.fs])

  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'list') {
        if (key === 'ok' && convs.length > 0) {
          setActiveConv(convs[0])
          setView('thread')
        }
      } else if (view === 'thread') {
        if (key === 'softRight') {
          setView('list')
          setActiveConv(null)
          setDraft('')
        }
        if (key === 'enter') {
          if (draft.trim()) {
            const updated = convs.map(c => {
              if (c.id === activeConv.id) {
                return { ...c, messages: [...c.messages, { from: 'me', text: draft.trim(), time: Date.now() }] }
              }
              return c
            })
            setConvs(updated)
            save(updated)
            setActiveConv(updated.find(c => c.id === activeConv.id))
            setDraft('')
          }
        }
        if (key === 'backspace' && draft.length > 0) {
          setDraft(d => d.slice(0, -1))
        }
        if (/^[0-9a-zA-Z .,!?]$/.test(key) && draft.length < 120) {
          setDraft(d => d + key)
        }
        if (key === 'space') {
          setDraft(d => d + ' ')
        }
      }
    })
    return () => sys.onKey(null)
  }, [sys, view, convs, activeConv, draft, save])

  if (view === 'list') {
    return (
      <div className="app-messages">
        <div className="msg-title">Messaggi</div>
        {convs.map(c => (
          <div key={c.id} className="msg-conv-row" onClick={() => { setActiveConv(c); setView('thread') }}>
            <div className="msg-conv-name">{c.contact}</div>
            <div className="msg-conv-preview">{c.messages[c.messages.length - 1].text.slice(0, 30)}</div>
          </div>
        ))}
      </div>
    )
  }

  if (view === 'thread') {
    return (
      <div className="app-messages">
        <div className="msg-title">{activeConv.contact}</div>
        <div className="msg-thread">
          {activeConv.messages.map((m, i) => (
            <div key={i} className={`msg-bubble ${m.from === 'me' ? 'msg-mine' : 'msg-theirs'}`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="msg-input-row">
          <input className="msg-input" value={draft} readOnly placeholder="Scrivi SMS..." />
          <button className="msg-send-btn" onClick={() => {
            if (draft.trim()) {
              const updated = convs.map(c => {
                if (c.id === activeConv.id) {
                  return { ...c, messages: [...c.messages, { from: 'me', text: draft.trim(), time: Date.now() }] }
                }
                return c
              })
              setConvs(updated)
              save(updated)
              setActiveConv(updated.find(c => c.id === activeConv.id))
              setDraft('')
            }
          }}>OK</button>
        </div>
      </div>
    )
  }

  return null
}
