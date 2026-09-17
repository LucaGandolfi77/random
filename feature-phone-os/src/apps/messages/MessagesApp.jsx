import { useState, useEffect, useCallback, useRef } from 'react'
import { createMultiTap } from '../../os/input.js'
import { KEY_LETTERS, SYMBOLS, t9Candidates } from '../../os/t9.js'

const MAX_LEN = 120

export default function MessagesApp({ sys }) {
  const [convs, setConvs] = useState(() => {
    try {
      const data = sys.fs.read('/data/messages/conversations.json')
      const list = data ? JSON.parse(data) : null
      return Array.isArray(list) && list.length ? list : []
    } catch { return [] }
  })
  const [view, setView] = useState('list') // list | thread | pick
  const [activeConv, setActiveConv] = useState(null)
  const [draft, setDraft] = useState('')
  const [cursor, setCursor] = useState(0)
  const [mode, setModeState] = useState('abc') // abc | ABC | 123 | T9
  const modeRef = useRef('abc') // specchio per le closure (fix stale closure)
  const mt = useRef(createMultiTap(() => (modeRef.current === 'ABC' ? UPPER_LETTERS : modeRef.current === 'abc' ? LOWER_LETTERS : SYMBOLS)))
  const t9 = useRef({ buf: '', len: 0, idx: 0 })
  const threadRef = useRef(null)

  const LOWER_LETTERS = KEY_LETTERS
  const UPPER_LETTERS = Object.fromEntries(Object.entries(KEY_LETTERS).map(([k, v]) => [k, v.toUpperCase()]))
  // tutti i contatti per il pick (nuova conversazione)
  const allContacts = (() => {
    try {
      const data = sys.fs.read('/data/contacts/list.json')
      const list = data ? JSON.parse(data) : []
      return Array.isArray(list) ? list : []
    } catch { return [] }
  })()

  const save = useCallback((c) => {
    sys.fs.write('/data/messages/conversations.json', JSON.stringify(c))
  }, [sys.fs])

  // autoscroll del thread
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [activeConv?.messages?.length, view])

  // auto-scroll lista
  useEffect(() => {
    const el = document.querySelector('.msg-conv-row-focus')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [cursor, view])

  function commitT9(spaceAfter) {
    const t = t9.current
    if (t.buf && spaceAfter) setDraft(d => d + ' ')
    t.buf = ''
    t.len = 0
    t.idx = 0
  }

  function switchMode() {
    commitT9(false)
    mt.current.reset()
    setModeState(m => {
      const next = m === 'abc' ? 'ABC' : m === 'ABC' ? '123' : m === '123' ? 'T9' : 'abc'
      modeRef.current = next
      return next
    })
  }

  function pushChar(ch) {
    setDraft(d => d.length < MAX_LEN ? d + ch : d)
  }

  function deleteChar() {
    const t = t9.current
    if (t.buf.length > 1) {
      // backtrack dentro il T9
      t.buf = t.buf.slice(0, -1)
      const cands = t9Candidates(t.buf)
      const rep = cands.length ? cands[0] : t.buf
      setDraft(d => d.slice(0, d.length - t.len) + rep)
      t.len = rep.length
      t.idx = 0
    } else if (t.buf.length === 1) {
      t.buf = ''
      t.len = 0
      t.idx = 0
      setDraft(d => d.slice(0, -1))
    } else if (mt.current.pending()) {
      mt.current.reset()
      setDraft(d => d.slice(0, -1))
    } else {
      setDraft(d => d.slice(0, -1))
    }
  }

  function sendMessage() {
    if (!draft.trim() || !activeConv) return
    commitT9(false)
    mt.current.reset()
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

  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'list') {
        if (key === 'up') { setCursor(c => (c - 1 + Math.max(1, convs.length)) % Math.max(1, convs.length)); return true }
        if (key === 'down') { setCursor(c => (c + 1) % Math.max(1, convs.length)); return true }
        if (key === 'ok' && convs.length > 0) {
          setActiveConv(convs[cursor])
          setView('thread')
          return true
        }
        if (key === 'softLeft') { setView('pick'); setCursor(0); return true }
        return false // 'back' non consumato → chiudi l'app (fallback elegante)
      }

      if (view === 'pick') {
        if (key === 'up') { setCursor(c => (c - 1 + Math.max(1, allContacts.length)) % Math.max(1, allContacts.length)); return true }
        if (key === 'down') { setCursor(c => (c + 1) % Math.max(1, allContacts.length)); return true }
        if (key === 'ok' && allContacts.length > 0) {
          // apri o crea la conversazione col contatto scelto
          const c = allContacts[cursor]
          let conv = convs.find(x => x.number === c.number)
          if (!conv) {
            conv = { id: Date.now(), contact: c.name, number: c.number, messages: [] }
            const updated = [...convs, conv]
            setConvs(updated)
            save(updated)
          }
          setActiveConv(conv)
          setView('thread')
          return true
        }
        if (key === 'softRight') { setView('list'); return true }
        return false
      }

      if (view === 'thread') {
        if (key === 'softRight') {
          // esci dal thread salvando il draft (autosave folle)
          if (draft.trim() && activeConv) {
            sys.fs.write('/data/messages/draft.txt', JSON.stringify({ convId: activeConv.id, text: draft }))
          }
          setView('list')
          setActiveConv(null)
          setDraft('')
          commitT9(false)
          mt.current.reset()
          return true
        }
        if (key === 'softLeft') {
          if (draft.trim()) sendMessage()
          return true
        }
        if (key === 'ok') { sendMessage(); return true }
        if (key === 'back') {
          if (draft.length > 0 || t9.current.buf) { deleteChar(); return true }
          // draft vuoto: torna alla lista
          setView('list')
          setActiveConv(null)
          return true
        }
        if (key === 'space') {
          if (mode === 'T9' && t9.current.buf) { commitT9(true); return true }
          pushChar(' ')
          return true
        }
        if (key === '#') { switchMode(); return true }

        // simboli da tastiera fisica
        if (/^[.,!?;:@'()/-]$/.test(key)) { pushChar(key); return true }

        // lettere QWERTY da tastiera fisica: sempre scritte direttamente
        if (/^[a-zA-Z]$/.test(key)) { pushChar(key.toLowerCase()); return true }

        // tastierino: T9 / multitap / numeri
        if (/^[0-9]$/.test(key)) {
          if (key === '1') { pushChar('1'); return true }
          if (mode === '123') { pushChar(key); return true }
          if (mode === 'T9') {
            const t = t9.current
            const buf = t.buf + key
            const cands = t9Candidates(buf)
            const rep = cands.length ? cands[t.idx % cands.length] : buf
            setDraft(d => d.slice(0, d.length - t.len) + rep)
            t.buf = buf
            t.len = rep.length
            t.idx = 0
            return true
          }
          // multitap (abc/ABC/simboli con '*')
          const next = mt.current.press(key, draft)
          if (next !== null) setDraft(next)
          return true
        }

        if (key === '*') {
          // multitap sui simboli
          const next = mt.current.press('*', draft)
          if (next !== null) setDraft(next)
          return true
        }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, view, convs, activeConv, draft, cursor, mode, allContacts, save])

  if (view === 'list') {
    return (
      <div className="app-messages">
        <div className="msg-title">Messaggi</div>
        {convs.length === 0 && <div className="msg-empty">Nessuna conversazione.<br />Sel: scrivi a qualcuno</div>}
        {convs.map((c, i) => (
          <div key={c.id}
            className={`msg-conv-row ${i === cursor ? 'msg-conv-row-focus' : ''}`}
            onClick={() => { setCursor(i); setActiveConv(c); setView('thread') }}>
            <div className="msg-conv-name">{c.contact}</div>
            <div className="msg-conv-preview">{c.messages.length ? c.messages[c.messages.length - 1].text.slice(0, 30) : '(vuota)'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (view === 'pick') {
    return (
      <div className="app-messages">
        <div className="msg-title">A chi?</div>
        <div className="contacts-list">
          {allContacts.map((c, i) => (
            <div key={c.number}
              className={`contact-row ${i === cursor ? 'contact-row-focus' : ''}`}
              onClick={() => {
                let conv = convs.find(x => x.number === c.number)
                if (!conv) {
                  conv = { id: Date.now(), contact: c.name, number: c.number, messages: [] }
                  const updated = [...convs, conv]
                  setConvs(updated)
                  save(updated)
                }
                setActiveConv(conv)
                setView('thread')
              }}>
              <div className="contact-avatar">{c.name[0]}</div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className="contact-number">{c.number}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="contacts-add-hint">OK: scrivi · Opz: torna alla lista</div>
      </div>
    )
  }

  // thread
  const modeLabel = mode === 'abc' ? 'abc' : mode === 'ABC' ? 'ABC' : mode === '123' ? '123' : 'T9'
  return (
    <div className="app-messages">
      <div className="msg-title">{activeConv?.contact || '...'}</div>
      <div className="msg-thread" ref={threadRef}>
        {(activeConv?.messages || []).map((m, i) => (
          <div key={i} className={`msg-bubble ${m.from === 'me' ? 'msg-mine' : 'msg-theirs'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="msg-mode-bar">
        <span className="msg-mode">[{modeLabel}]</span>
        <span className="msg-count">{draft.length}/{MAX_LEN}</span>
      </div>
      <div className="msg-input-row">
        <input className="msg-input" value={draft} readOnly placeholder="Scrivi SMS..." />
        <button className="msg-send-btn" onClick={sendMessage}>OK</button>
      </div>
    </div>
  )
}
