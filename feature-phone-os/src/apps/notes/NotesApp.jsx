import { useState, useEffect, useRef, useCallback } from 'react'
import { createMultiTap } from '../../os/input.js'
import { KEY_LETTERS, SYMBOLS } from '../../os/t9.js'

const MAX_LEN = 500

function noteTitle(content) {
  const first = (content || '').split('\n')[0].trim()
  return first ? first.slice(0, 22) : 'Senza titolo'
}

export default function NotesApp({ sys }) {
  const [notes, setNotes] = useState(() => {
    try {
      const files = sys.fs.ls('/data/notes')
      return files
        .filter(f => f.type === 'file')
        .map(f => ({ file: '/data/notes/' + f.name, content: sys.fs.read('/data/notes/' + f.name) || '' }))
    } catch { return [] }
  })
  const [view, setView] = useState('list') // list | edit | confirm-del
  const [cursor, setCursor] = useState(0)
  const [editing, setEditing] = useState(null) // { file, content }
  const [text, setText] = useState('')
  const mt = useRef(createMultiTap(() => KEY_LETTERS))

  const refreshNotes = useCallback(() => {
    try {
      const files = sys.fs.ls('/data/notes')
      setNotes(files.filter(f => f.type === 'file').map(f => ({
        file: '/data/notes/' + f.name,
        content: sys.fs.read('/data/notes/' + f.name) || '',
      })))
    } catch { setNotes([]) }
  }, [sys.fs])

  function saveNote() {
    if (editing) {
      sys.fs.write(editing.file, text)
    } else {
      const file = `/data/notes/n-${Date.now()}.txt`
      sys.fs.write(file, text)
      setEditing({ file, content: text })
    }
    sys.notify('Note', 'Nota salvata')
    refreshNotes()
  }

  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'list') {
        if (key === 'up') { setCursor(c => (c - 1 + Math.max(1, notes.length)) % Math.max(1, notes.length)); return true }
        if (key === 'down') { setCursor(c => (c + 1) % Math.max(1, notes.length)); return true }
        if (key === 'softLeft') {
          setEditing(null)
          setText('')
          setView('edit')
          return true
        }
        if (key === 'ok' && notes.length > 0) {
          setEditing(notes[cursor])
          setText(notes[cursor].content)
          setView('edit')
          return true
        }
        if (key === '*' && notes.length > 0) { setView('confirm-del'); return true }
        return false
      }

      if (view === 'confirm-del') {
        if (key === 'ok') {
          sys.fs.rm(notes[cursor].file)
          sys.notify('Note', 'Nota eliminata')
          setCursor(0)
          refreshNotes()
          setView('list')
          return true
        }
        setView('list')
        return true
      }

      if (view === 'edit') {
        if (key === 'softRight') {
          // salva e torna (autosave folle)
          if (text.trim()) saveNote()
          setView('list')
          setEditing(null)
          setText('')
          return true
        }
        if (key === 'softLeft' || key === 'ok') { saveNote(); return true }
        if (key === 'back') {
          if (mt.current.pending()) { mt.current.reset(); setText(t => t.slice(0, -1)); return true }
          setText(t => t.slice(0, -1))
          return true
        }
        if (key === 'space') { setText(t => t.length < MAX_LEN ? t + ' ' : t); return true }
        // lettere QWERTY
        if (/^[a-zA-Z]$/.test(key)) { setText(t => t.length < MAX_LEN ? t + key.toLowerCase() : t); return true }
        // simboli
        if (/^[.,!?;:@'()/-]$/.test(key)) { setText(t => t.length < MAX_LEN ? t + key : t); return true }
        // tastierino: multitap
        if (/^[0-9]$/.test(key)) {
          const next = mt.current.press(key, text)
          if (next !== null && next.length <= MAX_LEN) setText(next)
          return true
        }
        if (key === '*') {
          const next = mt.current.press('*', text)
          if (next !== null && next.length <= MAX_LEN) setText(next)
          return true
        }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, view, notes, cursor, editing, text, refreshNotes])

  if (view === 'confirm-del') {
    return (
      <div className="app-notes">
        <div className="msg-title">Eliminare?</div>
        <div className="contact-confirm">
          <div>«{noteTitle(notes[cursor]?.content)}»</div>
          <div className="contact-confirm-hint">OK: elimina · altro: annulla</div>
        </div>
      </div>
    )
  }

  if (view === 'edit') {
    return (
      <div className="app-notes">
        <div className="msg-title">{editing ? 'Modifica nota' : 'Nuova nota'}</div>
        <textarea
          className="note-editor"
          value={text}
          readOnly
          placeholder="Scrivi qui... (Sel: salva, Opz: indietro)"
        />
        <div className="note-status">{text.length}/{MAX_LEN} caratteri</div>
      </div>
    )
  }

  return (
    <div className="app-notes">
      <div className="msg-title">Note</div>
      <div className="contacts-list">
        {notes.length === 0 && (
          <div className="msg-empty">Nessuna nota.<br />Sel: scrivi la prima</div>
        )}
        {notes.map((n, i) => (
          <div key={n.file}
            className={`contact-row ${i === cursor ? 'contact-row-focus' : ''}`}
            onClick={() => { setCursor(i); setEditing(n); setText(n.content); setView('edit') }}>
            <div className="contact-avatar note-avatar-note">📝</div>
            <div className="contact-info">
              <div className="contact-name">{noteTitle(n.content)}</div>
              <div className="contact-number">{n.content.length} caratteri</div>
            </div>
          </div>
        ))}
      </div>
      <div className="contacts-add-hint">OK: apri · Sel: nuova · *: elimina</div>
    </div>
  )
}
