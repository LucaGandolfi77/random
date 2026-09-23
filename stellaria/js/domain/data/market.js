// domain/data/market.js — oggetti rari del Mercato del Riflesso.
// Ogni giorno ne appaiono 3 (vedi model.marketStock). Costo in Stelle o Riflesso.
export const MARKET_ITEMS = [
  { id: 'm-fiore-stellare', kind: 'furniture', room: 'serra', cost: 30, currency: 'stelle',
    nameIT: 'Fiore stellare', nameEN: 'Stellar flower', tags: ['notte', 'fiori', 'raro'], descIT: 'Un fiore che brilla della luce delle stelle.' },
  { id: 'm-vetro-mare', kind: 'furniture', room: 'boutique', cost: 40, currency: 'stelle',
    nameIT: 'Vetro di mare', nameEN: 'Sea glass', tags: ['specchio', 'stile', 'raro'], descIT: ' Vetro levigato dalle onde, con riflessi azzurri.' },
  { id: 'm-ninna-nanna', kind: 'collectible', cost: 25, currency: 'stelle',
    nameIT: 'Ninna nanna antica', nameEN: 'Ancient lullaby', tags: ['cura', 'dolce', 'raro'], descIT: 'Una melodia che si perde tra le pagine.' },
  { id: 'm-lume-notte', kind: 'outfit', slot: 'accessorio', cost: 35, currency: 'stelle',
    nameIT: 'Lume della notte', nameEN: 'Nightlight', tags: ['notte', 'stile', 'raro'], descIT: 'Un accessorio che serda la luce del buio.' },
  { id: 'm-bussola-aurora', kind: 'collectible', cost: 50, currency: 'riflesso', requireRiflesso: 15,
    nameIT: 'Bussola dell\'aurora', nameEN: 'Aurora compass', tags: ['avventura', 'raro'], descIT: 'Punta sempre verso l\'alba.' },
  { id: 'm-grembiule-stelle', kind: 'outfit', slot: 'top', cost: 45, currency: 'stelle',
    nameIT: 'Grembiule delle stelle', nameEN: 'Star apron', tags: ['cura', 'stile', 'raro'], descIT: 'Indossalo per cucinare sotto le stelle.' },
  { id: 'm-schermo-nebbia', kind: 'furniture', room: 'caffè', cost: 55, currency: 'riflesso', requireRiflesso: 20,
    nameIT: 'Schermo della nebbia', nameEN: 'Fog screen', tags: ['quiete', 'raro'], descIT: 'Filtra il mondo come la nebbia.' },
  { id: 'm-corona-nebbia', kind: 'outfit', slot: 'bottom', cost: 60, currency: 'riflesso', requireRiflesso: 25,
    nameIT: 'Corona della nebbia', nameEN: 'Mist crown', tags: ['audace', 'raro'], descIT: 'Indossa la nebbia come diadema.' },
];
