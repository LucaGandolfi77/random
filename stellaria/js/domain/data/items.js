// I tag influenzano il vibe (vedi world.js). Ogni elemento ha un costo (stelle) e appartiene a una categoria.
export const OUTFIT_SLOTS = ['capelli', 'top', 'bottom', 'accessorio'];

export const ITEMS = [
  // — Outfit —
  { id: 'capelli-mora', slot: 'capelli', nameIT: 'Capelli morbidi', nameEN: 'Soft hair', cost: 0, tags: ['natura'], isOutfit: true },
  { id: 'capelli-rosa', slot: 'capelli', nameIT: 'Capelli rosa', nameEN: 'Pink hair', cost: 6, tags: ['audace', 'stile'], isOutfit: true },
  { id: 'top-lavoro', slot: 'top', nameIT: 'Maglietta del bar', nameEN: 'Bar tee', cost: 0, tags: ['calore', 'dolce'], isOutfit: true },
  { id: 'top-tè', slot: 'top', nameIT: 'Maglia del tè', nameEN: 'Tea sweater', cost: 8, tags: ['cura', 'dolce'], isOutfit: true },
  { id: 'top-stella', slot: 'top', nameIT: 'Top stellato', nameEN: 'Starry top', cost: 14, tags: ['notte', 'stile'], isOutfit: true },
  { id: 'bottom-vestito', slot: 'bottom', nameIT: 'Vestito lungo', nameEN: 'Long dress', cost: 0, tags: ['quiete', 'fiori'], isOutfit: true },
  { id: 'bottom-pantalone', slot: 'bottom', nameIT: 'Pantaloni comodi', nameEN: 'Comfy pants', cost: 4, tags: ['natura', 'quiete'], isOutfit: true },
  { id: 'accessorio-occhiali', slot: 'accessorio', nameIT: 'Occhiali da sole', nameEN: 'Sunglasses', cost: 10, tags: ['audace', 'stile'], isOutfit: true },
  { id: 'accessorio-fiocco', slot: 'accessorio', nameIT: 'Fiocco', nameEN: 'Bow', cost: 5, tags: ['dolce', 'fiori'], isOutfit: true },
  // — Furniture (per stanza, cambia decor + vibe) —
  { id: 'f-vaso', slot: 'furniture', room: 'piazza', nameIT: 'Vaso di fiori', nameEN: 'Flower pot', cost: 5, tags: ['natura', 'fiori'], isOutfit: false },
  { id: 'f-lanterna', slot: 'furniture', room: 'piazza', nameIT: 'Lanterna', nameEN: 'Lantern', cost: 8, tags: ['calore', 'notte'], isOutfit: false },
  { id: 'f-tazza', slot: 'furniture', room: 'caffè', nameIT: 'Tazza fumante', nameEN: 'Steaming cup', cost: 4, tags: ['dolce', 'calore', 'cura'], isOutfit: false },
  { id: 'f-libri', slot: 'furniture', room: 'caffè', nameIT: 'Pile di libri', nameEN: 'Book stack', cost: 9, tags: ['quiete', 'cose'], isOutfit: false },
  { id: 'f-fiori-serra', slot: 'furniture', room: 'serra', nameIT: 'Glicine', nameEN: 'Wisteria', cost: 6, tags: ['fiori', 'natura'], isOutfit: false },
  { id: 'f-specchio', slot: 'furniture', room: 'boutique', nameIT: 'Specchio antico', nameEN: 'Antique mirror', cost: 12, tags: ['specchio', 'stile'], isOutfit: false },
  { id: 'f-tenda', slot: 'furniture', room: 'serra', nameIT: 'Tenda leggera', nameEN: 'Light tent', cost: 7, tags: ['quiete', 'vento'], isOutfit: false },
  { id: 'f-tegola', slot: 'furniture', room: 'mercato', nameIT: 'Tegola decorativa', nameEN: 'Decorative tile', cost: 5, tags: ['cose', 'calore'], isOutfit: false },
  // — Upgrades —
  { id: 'upg-lanterna', slot: 'upgrade', nameIT: 'Luci della piazza', nameEN: 'Plaza lights', cost: 20, tags: ['calore', 'notte'], isOutfit: false, requireFame: 2 },
  { id: 'upg-sedie', slot: 'upgrade', nameIT: 'Sedie comode', nameEN: 'Comfy chairs', cost: 15, tags: ['calore', 'comunità'], isOutfit: false, requireFame: 1 },
  { id: 'upg-acqua', slot: 'upgrade', nameIT: 'Fontana d\'acqua', nameEN: 'Water fountain', cost: 25, tags: ['cura', 'natura'], isOutfit: false, requireFame: 3 },
];

import { MARKET_ITEMS } from './market.js';
export const ALL_ITEMS = [...ITEMS, ...MARKET_ITEMS];

export const GESTURES = [
  { id: 'annuire', nameIT: 'Un sorriso', nameEN: 'A smile', tag: 'dolce' },
  { id: 'danza', nameIT: 'Una danza', nameEN: 'A dance', tag: 'audace' },
  { id: 'cucina', nameIT: 'Offri un tè', nameEN: 'Offer tea', tag: 'cura' },
  { id: 'canta', nameIT: 'Canta', nameEN: 'Sing', tag: 'notte' },
  { id: 'annaffia', nameIT: 'Annaffia', nameEN: 'Water plants', tag: 'natura' },
];
