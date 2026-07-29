import SnakeApp from '../apps/snake/SnakeApp.jsx'
import MessagesApp from '../apps/messages/MessagesApp.jsx'
import ContactsApp from '../apps/contacts/ContactsApp.jsx'
import CalculatorApp from '../apps/calculator/CalculatorApp.jsx'
import ClockApp from '../apps/clock/ClockApp.jsx'
import SettingsApp from '../apps/settings/SettingsApp.jsx'

const registry = [
  { id: 'messages',  name: 'Messaggi',  icon: '\u2709\uFE0F', component: MessagesApp },
  { id: 'contacts',  name: 'Contatti',  icon: '\uD83D\uDCD1', component: ContactsApp },
  { id: 'snake',     name: 'Snake',     icon: '\uD83D\uDC0D', component: SnakeApp },
  { id: 'calculator',name: 'Calcolatrice', icon: '\uD83E\uDEE8', component: CalculatorApp },
  { id: 'clock',     name: 'Orologio',  icon: '\u23F0',      component: ClockApp },
  { id: 'settings',  name: 'Impostazioni', icon: '\u2699\uFE0F', component: SettingsApp },
]

export default registry
