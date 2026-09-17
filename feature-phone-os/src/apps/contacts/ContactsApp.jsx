import { useState, useEffect, useCallback, useRef } from 'react'
import { createMultiTap } from '../../os/input.js'
import { KEY_LETTERS } from '../../os/t9.js'
import { DEFAULT_CONTACTS } from '../../os/defaults.js'

export default function ContactsApp({ sys }) {
  const [contacts, setContacts] = useState(() => {
    try {
      const data = sys.fs.read('/data/contacts/list.json')
      const list = data ? JSON.parse(data) : DEFAULT_CONTACTS
      return Array.isArray(list) && list.length ? list : DEFAULT_CONTACTS
    } catch { return DEFAULT_CONTACTS }
  })
  const [view, setView] = useState('list') // list | detail | edit
  const [cursor, setCursor] = useState(0)
  const [detail, setDetail] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [formName, setFormName] = useState('')
  const [formNum, setFormNum] = useState('')
  const [field, setField] = useState('name') // name | num
  const [search, setSearch] = useState('')
  const mt = useRef(createMultiTap(() => LOWER_LETTERS))
  const LOWER_LETTERS = KEY_LETTERS

  const save = useCallback((c) => {
    sys.fs.write('/data/contacts/list.json', JSON.stringify(c))
  }, [sys.fs])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // UN SOLO handler: fix bug #3 (i due useEffect si litigavano sys.onKey)
  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'list') {
        if (key === 'up') { setCursor(c => (c - 1 + filtered.length) % Math.max(1, filtered.length)); return true }
        if (key === 'down') { setCursor(c => (c + 1) % Math.max(1, filtered.length)); return true }
        if (key === 'ok' && filtered.length > 0) {
          setDetail(filtered[cursor])
          setConfirmDel(false)
          setView('detail')
          return true
        }
        if (key === 'softLeft') {
          setEditContact(null)
          setFormName('')
          setFormNum('')
          setField('name')
          setView('edit')
          return true
        }
        // ricerca durante la lista (non confligge più con l'altro handler)
        if (key === 'back' && search.length > 0) { setSearch(s => s.slice(0, -1)); return true }
        if (/^[a-zA-Z]$/.test(key)) { setSearch(s => s + key.toLowerCase()); return true }
        return false
      }

      if (view === 'detail') {
        if (confirmDel) {
          if (key === 'ok') {
            const updated = contacts.filter(c => c.id !== detail.id)
            setContacts(updated)
            save(updated)
            setView('list')
            setDetail(null)
            setConfirmDel(false)
            sys.notify('Contatti', 'Contatto eliminato')
            return true
          }
          setConfirmDel(false)
          return true
        }
        if (key === 'softLeft' || key === 'call') {
          sys.call(detail.number, detail.name)
          return true
        }
        if (key === 'ok') {
          setEditContact(detail)
          setFormName(detail.name)
          setFormNum(detail.number)
          setField('name')
          setView('edit')
          return true
        }
        if (key === '*') { setConfirmDel(true); return true }
        if (key === 'softRight') { setView('list'); setDetail(null); return true }
        return false
      }

      if (view === 'edit') {
        if (key === 'softRight') { setView('list'); return true }
        if (key === 'ok') { setField(f => f === 'name' ? 'num' : 'name'); return true }
        if (key === 'back') {
          if (field === 'num' && formNum.length > 0) setFormNum(f => f.slice(0, -1))
          else if (field === 'name' && formName.length > 0) setFormName(f => f.slice(0, -1))
          else if (field === 'num') setField('name')
          return true
        }
        // campo nome: lettere QWERTY + multitap tastierino
        if (/^[a-zA-Z]$/.test(key) && field === 'name' && formName.length < 24) {
          setFormName(f => f + key.toLowerCase())
          return true
        }
        if (/^[0-9]$/.test(key) && field === 'name' && formName.length < 24) {
          const next = mt.current.press(key, formName)
          if (next !== null) setFormName(next)
          return true
        }
        // campo numero: cifre + ' ' + '+'
        if (((key >= '0' && key <= '9') || key === '+' || key === ' ') && field === 'num' && formNum.length < 20) {
          setFormNum(f => f + key)
          return true
        }
        if (key === '*' && field === 'num' && formNum.length < 20) { setFormNum(f => f + '+'); return true }
        if (key === 'softLeft') {
          // salva
          if (formName.trim() && formNum.trim()) {
            const newId = Math.max(0, ...contacts.map(c => c.id)) + 1
            const updated = editContact
              ? contacts.map(c => c.id === editContact.id ? { ...c, name: formName.trim(), number: formNum.trim() } : c)
              : [...contacts, { id: newId, name: formName.trim(), number: formNum.trim() }]
            setContacts(updated)
            save(updated)
            setView('list')
            sys.notify('Contatti', editContact ? 'Contatto aggiornato' : 'Contatto aggiunto')
            return true
          }
          sys.notify('Contatti', 'Nome e numero richiesti!')
          return true
        }
        return false
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, view, contacts, filtered, cursor, detail, confirmDel, editContact, formName, formNum, field, search, save])

  function saveContact() {
    if (formName.trim() && formNum.trim()) {
      const newId = Math.max(0, ...contacts.map(c => c.id)) + 1
      const updated = editContact
        ? contacts.map(c => c.id === editContact.id ? { ...c, name: formName.trim(), number: formNum.trim() } : c)
        : [...contacts, { id: newId, name: formName.trim(), number: formNum.trim() }]
      setContacts(updated)
      save(updated)
      setView('list')
    }
  }

  if (view === 'list') {
    return (
      <div className="app-contacts">
        <div className="contacts-title">Contatti</div>
        <div className="contacts-search">{search ? `Cerca: ${search}` : '🔍 Cerca (scrivi lettere)'}</div>
        <div className="contacts-list">
          {filtered.map((c, i) => (
            <div key={c.id}
              className={`contact-row ${i === cursor ? 'contact-row-focus' : ''}`}
              onClick={() => {
                setCursor(i)
                setDetail(c)
                setConfirmDel(false)
                setView('detail')
              }}>
              <div className="contact-avatar">{c.name[0]}</div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className="contact-number">{c.number}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="msg-empty">Nessun contatto trovato</div>}
        </div>
        <div className="contacts-add-hint">OK: apri · Sel: nuovo · scrivi per cercare</div>
      </div>
    )
  }

  if (view === 'detail') {
    return (
      <div className="app-contacts">
        <div className="contacts-title">Contatto</div>
        <div className="contact-detail">
          <div className="contact-detail-avatar">{detail.name[0]}</div>
          <div className="contact-detail-name">{detail.name}</div>
          <div className="contact-detail-number">{detail.number}</div>
        </div>
        {confirmDel ? (
          <div className="contact-confirm">
            <div>Eliminare il contatto?</div>
            <div className="contact-confirm-hint">OK: elimina · altro: annulla</div>
          </div>
        ) : (
          <div className="contact-detail-actions">
            <button className="clock-sw-btn" onClick={() => sys.call(detail.number, detail.name)}>✆ Chiama</button>
            <button className="clock-sw-btn" onClick={() => {
              setEditContact(detail); setFormName(detail.name); setFormNum(detail.number); setField('name'); setView('edit')
            }}>Modifica</button>
          </div>
        )}
        <div className="contacts-add-hint">Sel/✆: chiama · OK: modifica · *: elimina</div>
      </div>
    )
  }

  return (
    <div className="app-contacts">
      <div className="contacts-title">{editContact ? 'Modifica' : 'Nuovo contatto'}</div>
      <div className="contact-form">
        <div className={`contact-form-label ${field === 'name' ? 'field-active' : ''}`}>Nome {field === 'name' ? '◀' : ''}</div>
        <div className="contact-form-value">{formName || '(OK per attivare)'}</div>
        <div className={`contact-form-label ${field === 'num' ? 'field-active' : ''}`}>Numero {field === 'num' ? '◀' : ''}</div>
        <div className="contact-form-value">{formNum || '(OK per attivare)'}</div>
      </div>
      <button className="contact-save-btn" onClick={saveContact}>Salva (Sel)</button>
      <div className="contacts-add-hint">OK: cambia campo · lettere/multitap per il nome</div>
    </div>
  )
}
