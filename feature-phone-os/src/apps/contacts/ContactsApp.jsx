import { useState, useEffect, useCallback } from 'react'

const DEFAULTS = [
  { id: 1, name: 'Mamma',    number: '3331234567' },
  { id: 2, name: 'Paolo',    number: '3389876543' },
  { id: 3, name: 'Maria',    number: '3475551212' },
  { id: 4, name: 'Ufficio',  number: '025551234' },
]

function loadContacts(sys) {
  try {
    const data = sys.fs.read('/data/contacts/list.json')
    return data ? JSON.parse(data) : DEFAULTS
  } catch { return DEFAULTS }
}

export default function ContactsApp({ sys }) {
  const [contacts, setContacts] = useState(() => loadContacts(sys))
  const [view, setView] = useState('list')
  const [editContact, setEditContact] = useState(null)
  const [formName, setFormName] = useState('')
  const [formNum, setFormNum] = useState('')
  const [search, setSearch] = useState('')

  const save = useCallback((c) => {
    sys.fs.write('/data/contacts/list.json', JSON.stringify(c))
  }, [sys.fs])

  useEffect(() => {
    sys.onKey((key) => {
      if (view === 'list') {
        if (key === 'softLeft') {
          setEditContact(null)
          setFormName('')
          setFormNum('')
          setView('edit')
        }
      } else if (view === 'edit') {
        if (key === 'softRight') setView('list')
        if (key === 'backspace') {
          if (formNum.length > 0) setFormNum(f => f.slice(0, -1))
          else if (formName.length > 0) setFormName(f => f.slice(0, -1))
        }
        if ((key >= '0' && key <= '9') || key === '+' || key === ' ') {
          if (formNum.length < 20) setFormNum(f => f + key)
        }
        if (key === 'enter') {
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
      }
    })
    return () => sys.onKey(null)
  }, [sys, view, contacts, formName, formNum, editContact, save])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handler = (key) => {
      if (view !== 'list') return
      if (key === 'backspace' && search.length > 0) setSearch(s => s.slice(0, -1))
      if (/^[a-zA-Z]$/.test(key)) setSearch(s => s + key.toLowerCase())
    }
    sys.onKey(handler)
    return () => sys.onKey(null)
  }, [sys, view, search])

  if (view === 'list') {
    return (
      <div className="app-contacts">
        <div className="contacts-title">Contatti</div>
        <div className="contacts-search">{search ? `Cerca: ${search}` : '\uD83D\uDD0D Cerca'}</div>
        <div className="contacts-list">
          {filtered.map(c => (
            <div key={c.id} className="contact-row" onClick={() => {
              setEditContact(c)
              setFormName(c.name)
              setFormNum(c.number)
              setView('edit')
            }}>
              <div className="contact-avatar">{c.name[0]}</div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className="contact-number">{c.number}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="contacts-add-hint">SoftLeft: Nuovo contatto</div>
      </div>
    )
  }

  return (
    <div className="app-contacts">
      <div className="contacts-title">{editContact ? 'Modifica' : 'Nuovo contatto'}</div>
      <div className="contact-form">
        <div className="contact-form-label">Nome</div>
        <div className="contact-form-value">{formName || '(scrivi con tastiera)'}</div>
        <div className="contact-form-label">Numero</div>
        <div className="contact-form-value">{formNum || '(usa tastierino)'}</div>
      </div>
      <button className="contact-save-btn" onClick={() => {
        if (formName.trim() && formNum.trim()) {
          const newId = Math.max(0, ...contacts.map(c => c.id)) + 1
          const updated = editContact
            ? contacts.map(c => c.id === editContact.id ? { ...c, name: formName.trim(), number: formNum.trim() } : c)
            : [...contacts, { id: newId, name: formName.trim(), number: formNum.trim() }]
          setContacts(updated)
          save(updated)
          setView('list')
        }
      }}>Salva</button>
    </div>
  )
}
