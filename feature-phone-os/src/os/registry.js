import DialerApp from '../apps/dialer/DialerApp.jsx'
import MessagesApp from '../apps/messages/MessagesApp.jsx'
import ContactsApp from '../apps/contacts/ContactsApp.jsx'
import NotesApp from '../apps/notes/NotesApp.jsx'
import MusicApp from '../apps/music/MusicApp.jsx'
import SnakeApp from '../apps/snake/SnakeApp.jsx'
import CalculatorApp from '../apps/calculator/CalculatorApp.jsx'
import ClockApp from '../apps/clock/ClockApp.jsx'
import NotificationsApp from '../apps/notify/NotificationsApp.jsx'
import TerminalApp from '../apps/terminal/TerminalApp.jsx'
import SettingsApp from '../apps/settings/SettingsApp.jsx'

// L'ordine conta: Telefono per primo, come nei veri feature phone
const registry = [
  { id: 'dialer',        name: 'Telefono',     icon: '✆',   component: DialerApp },
  { id: 'messages',      name: 'Messaggi',     icon: '✉️',  component: MessagesApp },
  { id: 'contacts',      name: 'Contatti',     icon: '📒',  component: ContactsApp },
  { id: 'notes',         name: 'Note',         icon: '📝',  component: NotesApp },
  { id: 'music',         name: 'Musica',       icon: '🎵',  component: MusicApp },
  { id: 'snake',         name: 'Snake',        icon: '🐍',  component: SnakeApp },
  { id: 'calculator',    name: 'Calcolatrice', icon: '🧮',  component: CalculatorApp },
  { id: 'clock',         name: 'Orologio',     icon: '⏰',  component: ClockApp },
  { id: 'notifications', name: 'Avvisi',       icon: '🔔',  component: NotificationsApp },
  { id: 'terminal',      name: 'Terminale',    icon: '>_',  component: TerminalApp },
  { id: 'settings',      name: 'Impostazioni', icon: '⚙️',  component: SettingsApp },
]

export default registry
