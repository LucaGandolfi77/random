// Defaults condivisi fra kernel e app: un'unica fonte di verità

export const DEFAULT_CONTACTS = [
  { id: 1, name: 'Mamma',    number: '3331234567' },
  { id: 2, name: 'Paolo',    number: '3389876543' },
  { id: 3, name: 'Maria',    number: '3475551212' },
  { id: 4, name: 'Ufficio',  number: '025551234' },
  { id: 5, name: 'Snake Bot', number: '9999999999' },
]

export function defaultConvs() {
  return [
    { id: 1, contact: 'Mamma', number: '3331234567', messages: [
      { from: 'Mamma', text: 'Ciao! Vieni a pranzo domenica?', time: Date.now() - 3600000 * 2 },
      { from: 'me', text: 'Certo, ci sono! Porto il dolce?', time: Date.now() - 3600000 },
      { from: 'Mamma', text: 'Perfetto, ti aspetto alle 13!', time: Date.now() - 1800000 },
    ]},
    { id: 2, contact: 'Paolo', number: '3389876543', messages: [
      { from: 'Paolo', text: 'Hai visto l\'ultimo film di fantascienza?', time: Date.now() - 86400000 },
      { from: 'me', text: 'Non ancora, dicono che è bello?', time: Date.now() - 43200000 },
    ]},
    { id: 3, contact: 'Snake Bot', number: '9999999999', messages: [
      { from: 'Snake Bot', text: 'Sono il tuo telefono. E sono vivo. 🐍', time: Date.now() - 900000 },
    ]},
  ]
}

// Il daemon SMS pesca da qui per scriverti: il telefono è VIVO
export const INCOMING_SMS_POOL = [
  'Ehi, come va?',
  'Ci vediamo più tardi?',
  'Hai visto che ora è? Son le tre di notte',
  'Porta il caricabatterie, ti serve',
  'Il telefono nuovo? Bello!',
  'Il mio record a Snake è imbattibile',
  'Pranzo domenica alle 13, ci sei?',
  'Rispondi, non è muto il tuo!',
  'Ti ho mandato un MEME. Non hai Instagram? Peccato.',
  '01101100 01101111 01101100 (traducilo tu)',
  'Il terminale è il miglior social network',
  'sudo make me a sandwich',
  'Batteria al 15%? Classico.',
  'Hai provato a digitare *#06#?',
  'Il T9 capisce me meglio di quanto capisci te',
  'Ho sognato un telefono a conchiglia. Eravo noi.',
  'STO USANDO LE MAIUSCOLE PER FARTI PAGARE ATTENZIONE',
  'Domani sveglia alle 6. Scherzava. Alle 6:30.',
]

export const SETTINGS_DEFAULTS = {
  theme: 'midnight',
  sound: 2,     // 0=Silenzioso, 1=Vibrazione, 2=Suoneria
  volume: 6,    // 0-10
  vibrate: true,
}

export const OS_VERSION = '2.0.0'
export const OS_NAME = 'OpenPhone OS'
export const OS_CODENAME = 'Crazy Frog Edition'
