// Motore T9 predittivo + mappatura tasti per il dizionario italiano
// Il cuore folle del progetto: scrivere SMS come nel 2003

export const KEY_LETTERS = {
  '2': 'abc',
  '3': 'def',
  '4': 'ghi',
  '5': 'jkl',
  '6': 'mno',
  '7': 'pqrs',
  '8': 'tuv',
  '9': 'wxyz',
}

// '*' cicla questi simboli (multitap)
export const SYMBOLS = ['.', ',', '?', '!', "'", '-', '@', '(', ')', ':', '/']

// Dizionario italiano: parole comuni, ordine = priorità (le prime vincono)
const WORDS = [
  'si', 'no', 'ok', 'ciao', 'salve', 'pronto', 'grazie', 'prego', 'bene', 'male',
  'me', 'ti', 'ci', 'vi', 'mi', 'ci', 'si', 'no', 'te', 'se', 'ne',
  'cosi', 'domani', 'oggi', 'ieri', 'notte', 'mattina', 'sera', 'amore', 'bella',
  'bello', 'casa', 'cane', 'gatto', 'vita', 'voi', 'noi', 'lui', 'lei', 'loro',
  'mamma', 'papa', 'figlio', 'figlia', 'fratello', 'sorella', 'nonno', 'nonna',
  'zio', 'zia', 'amico', 'amica', 'lavoro', 'ufficio', 'scuola', 'esame', 'voto',
  'studiare', 'mangiare', 'bere', 'dormire', 'sveglia', 'sonno', 'fame', 'sete',
  'acqua', 'vino', 'birra', 'pizza', 'pasta', 'gelato', 'dolce', 'caffe', 'latte',
  'te', 'telefono', 'sms', 'messaggio', 'messaggi', 'chat', 'chiamata', 'chiamate',
  'numero', 'rubrica', 'contatto', 'contatti', 'appuntamento', 'riunione', 'festa',
  'compleanno', 'regalo', 'sorpresa', 'viaggio', 'vacanza', 'mare', 'montagna',
  'citta', 'paese', 'strada', 'auto', 'macchina', 'treno', 'aereo', 'bicicletta',
  'soldi', 'denaro', 'euro', 'prezzo', 'conto', 'banca', 'tempo', 'ora', 'minuto',
  'secondo', 'sempre', 'mai', 'forse', 'certo', 'vero', 'falso', 'tutto', 'niente',
  'qualcosa', 'qualcuno', 'piccolo', 'grande', 'nuovo', 'vecchio', 'facile',
  'difficile', 'possibile', 'importante', 'urgente', 'subito', 'dopo', 'prima',
  'adesso', 'appena', 'ancora', 'anche', 'pero', 'quindi', 'mentre', 'invece',
  'dunque', 'ecco', 'boh', 'mah', 'ahia', 'wow', 'top', 'forte', 'fantastico',
  'che', 'chi', 'come', 'dove', 'quando', 'perche', 'quanto', 'cosa', 'gia',
  'solo', 'molto', 'poco', 'tanto', 'tanta', 'troppo', 'troppa', 'piu', 'meno',
  'quasi', 'proprio', 'insieme', 'vicino', 'lontano', 'dentro', 'fuori', 'sopra',
  'sotto', 'tra', 'fra', 'con', 'senza', 'verso', 'davanti', 'dietro', 'stasera',
  'buongiorno', 'buonanotte', 'arrivederci', 'aurevoir', 'scusa', 'scusi',
  'di', 'il', 'lo', 'la', 'un', 'uno', 'una', 'e', 'o', 'ma', 'se', 'per',
  'sono', 'sei', 'siamo', 'siete', 'ho', 'hai', 'ha', 'abbiamo', 'avete',
  'faccio', 'fai', 'fa', 'facciamo', 'voglio', 'vuoi', 'vuole', 'possiamo',
  'devo', 'devi', 'deve', 'posso', 'andiamo', 'vado', 'vai', 'viene', 'viene',
  'sto', 'stai', 'sta', 'abbiamo', 'andranno', 'verra', 'sarà', 'sara',
]

function toDigits(word) {
  let out = ''
  for (const ch of word.toLowerCase()) {
    let digit = ''
    for (const [k, letters] of Object.entries(KEY_LETTERS)) {
      if (letters.includes(ch)) { digit = k; break }
    }
    if (digit) out += digit
    else return '' // parola con caratteri non mappabili: scartata
  }
  return out
}

// T9_DICT: { '2426': ['ciao'], '62662': ['mamma'], ... }
export const T9_DICT = (() => {
  const d = {}
  const seen = new Set()
  for (const w of WORDS) {
    if (seen.has(w)) continue
    seen.add(w)
    const k = toDigits(w)
    if (k) {
      if (!d[k]) d[k] = []
      if (!d[k].includes(w)) d[k].push(w)
    }
  }
  return d
})()

export function countWords() {
  let n = 0
  for (const list of Object.values(T9_DICT)) n += list.length
  return n
}

/** Candidati per un buffer di cifre: array di parole (prima = più probabile) */
export function t9Candidates(digitBuffer) {
  return T9_DICT[digitBuffer] || []
}
