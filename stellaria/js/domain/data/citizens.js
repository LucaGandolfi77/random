// Cittadini-NPC. Ognuno legato a un Riflesso collezionabile.
import { TAG_LABELS } from './tagMeta.js';

const I = (s) => s;

export const CITIZENS = [
  {
    id: 'mira', name: { IT: 'Mira', EN: 'Mira' }, collectible: 'Cura',
    home: 'caffè', tags: ['cura', 'dolce'], hours: [6, 18],
    agenda: [{ from: 6, to: 10, room: 'caffè' }, { from: 10, to: 18, room: 'piazza' }],
    portrait: '🍵', personality: { IT: 'Calda e premurosa.', EN: 'Warm and caring.' },
    greet: { IT: '"Buongiorno, abitante. Un tè?"', EN: '"Good day, newcomer. Tea?"' },
  },
  {
    id: 'orso', name: { IT: 'Orso', EN: 'Orso' }, collectible: 'Pane',
    home: 'piazza', tags: ['pane', 'calore'], hours: [5, 15],
    agenda: [{ from: 5, to: 10, room: 'piazza' }, { from: 10, to: 15, room: 'caffè' }],
    portrait: '🥐', personality: { IT: 'Generoso e affamato di storie.', EN: 'Generous, hungry for stories.' },
    greet: { IT: '"Ah, un volto nuovo! Siediti."', EN: '"Ah, a new face! Sit down."' },
  },
  {
    id: 'lila', name: { IT: 'Lila', EN: 'Lila' }, collectible: 'Fiori',
    home: 'serra', tags: ['natura', 'fiori'], hours: [9, 22],
    portrait: '🌸', personality: { IT: 'Sognatrice, parla con le piante.', EN: 'Dreamer, talks to plants.' },
    greet: { IT: '"I fiori ti aspettavano."', EN: '"The flowers were waiting for you."' },
  },
  {
    id: 'nuit', name: { IT: 'Nuit', EN: 'Nuit' }, collectible: 'Notte',
    home: 'sala-specchi', tags: ['notte', 'specchio'], hours: [20, 5],
    portrait: '🌙', personality: { IT: 'Silenziosa, riflette tutto.', EN: 'Quiet, reflects everything.' },
    greet: { IT: '"…Ti ho osservato."', EN: '"…I have watched you."' },
  },
  {
    id: 'ember', name: { IT: 'Ember', EN: 'Ember' }, collectible: 'Fuoco',
    home: 'caffè', tags: ['fuoco', 'calore'], hours: [14, 23],
    portrait: '🔥', personality: { IT: 'Inarrestabile e irriverente.', EN: 'unstoppable and irreverent.' },
    greet: { IT: '"Tieni, ci scaldiamo insieme!"', EN: '"Hold on, we warm up together!"' },
  },
  {
    id: 'zefiro', name: { IT: 'Zefiro', EN: 'Zefiro' }, collectible: 'Vento',
    home: 'piazza', tags: ['vento', 'natura'], hours: [7, 19],
    agenda: [{ from: 7, to: 13, room: 'piazza' }, { from: 13, to: 19, room: 'mercato' }],
    portrait: '🍃', personality: { IT: 'Incostante, sempre di corsa.', EN: 'Inconstant, always running.' },
    greet: { IT: '"Ho sentito il tuo passo!"', EN: '"I felt your footsteps!"' },
  },
  {
    id: 'sala', name: { IT: 'Sera', EN: 'Sera' }, collectible: 'Quiete',
    home: 'serra', tags: ['quiete', 'natura'], hours: [21, 6],
    portrait: '🦋', personality: { IT: 'Raccoglie il silenzio.', EN: 'Collects silence.' },
    greet: { IT: '"…Ssshhh. Benvenuto."', EN: '"…Ssshhh. Welcome."' },
  },
  {
    id: 'spec', name: { IT: 'Spec', EN: 'Spec' }, collectible: 'Specchio',
    home: 'sala-specchi', tags: ['specchio'], hours: [0, 24], // always in secret room
    portrait: '🪞', personality: { IT: 'Appare solo ai riflessi sinceri.', EN: 'Appears only to sincere reflections.' },
    greet: { IT: '"Essere te stesso è il mio specchio."', EN: '"Being yourself is my mirror."' },
  },
];

export const CITIZEN_BY_ID = Object.fromEntries(CITIZENS.map((c) => [c.id, c]));

export const COLLECTIBLES = CITIZENS.map((c) => ({ id: c.id, name: c.name, collectible: c.collectible }));
