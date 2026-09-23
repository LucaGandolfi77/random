export const PHASES = [
  { id: 'mattina', nameIT: 'Mattina', nameEN: 'Morning', range: [6, 11], ambient: 'ambientFountain', sky: '#f6c98a' },
  { id: 'pomeriggio', nameIT: 'Pomeriggio', nameEN: 'Afternoon', range: [11, 16], ambient: 'ambientCafe', sky: '#f4a26a' },
  { id: 'sera', nameIT: 'Sera', nameEN: 'Evening', range: [16, 20], ambient: 'ambientBoutique', sky: '#7d5c9f' },
  { id: 'notte', nameIT: 'Notte', nameEN: 'Night', range: [20, 6], ambient: 'ambientNight', sky: '#1a1530' },
];

export const WEATHERS = [
  { id: 'sereno', nameIT: 'Sereno', nameEN: 'Clear' },
  { id: 'stellato', nameIT: 'Stellato', nameEN: 'Starry' },
  { id: 'nebbia', nameIT: 'Nebbia', nameEN: 'Misty' },
  { id: 'vento', nameIT: 'Vento', nameEN: 'Windy' },
];

// Room graph. decor tags influence vibe.
export const ROOMS = [
  {
    id: 'piazza', nameIT: 'Piazza Centrale', nameEN: 'Central Plaza',
    decor: ['calore', 'comunità', 'natura'], descIT: 'La fontana brilla sotto le stelle.', descEN: 'The fountain glimmers under the stars.',
    exits: { sud: 'caffè', est: 'serra', ovest: 'boutique' },
    bg: 'piazza',
  },
  {
    id: 'caffè', nameIT: 'Caffè Sospeso', nameEN: 'Suspended Café',
    decor: ['dolce', 'calore', 'cura'], descIT: 'Vapori dolci e sedaccio caldo.', descEN: 'Sweet vapors and warm seating.',
    exits: { nord: 'piazza', est: 'mercato' },
    bg: 'caffe',
  },
  {
    id: 'serra', nameIT: 'Serra pensile', nameEN: 'Hanging Greenhouse',
    decor: ['natura', 'fiori', 'quiete'], descIT: 'I fiori si muovono senza vento.', descEN: 'Flowers move without wind.',
    exits: { ovest: 'piazza', nord: 'boutique' },
    bg: 'serra',
  },
  {
    id: 'boutique', nameIT: 'Boutique specchi', nameEN: 'Mirror Boutique',
    decor: ['stile', 'audace', 'stile'], descIT: 'Gli specchi delle vetrine ti osservano.', descEN: 'The mirrors watch you from the displays.',
    exits: { est: 'serra', sud: 'piazza', nord: 'sala-specchi' },
    bg: 'boutique',
  },
  {
    id: 'mercato', nameIT: 'Mercatino', nameEN: 'Little Market',
    decor: ['cose', 'calore', 'comunità'], descIT: 'Cose vecchie e nuove si abbracciano.', descEN: 'Old and new things embrace.',
    exits: { ovest: 'caffè' },
    bg: 'mercato',
  },
  {
    id: 'sala-specchi', nameIT: 'Sala dei Riflessi', nameEN: 'Hall of Reflections',
    decor: ['specchio', 'notte'], descIT: 'Qui si entra solo con un vero Riflesso.', descEN: 'Only entered with a true Reflection.',
    locked: true, unlockRequire: { fame: 3, riflesso: 12 },
    exits: { sud: 'boutique' },
    bg: 'specchi',
  },
];
