export const UNLOCKABLES = [
  {
    id: 'sala-riflessi', nameIT: 'Sala dei Riflessi', nameEN: 'Hall of Reflections',
    descIT: 'Una stanza segreta per chi conosce il proprio valore.', descEN: 'A secret room for those who know their worth.',
    type: 'room', target: 'sala-specchi', require: { fame: 3, riflesso: 12 },
  },
  {
    id: 'set-sera', nameIT: 'Set Sera', nameEN: 'Sera Set',
    descIT: 'Un outfit completo ispirato alla sera.', descEN: 'A full outfit inspired by the evening.',
    type: 'outfit', cost: 40, give: ['capelli-rosa', 'top-stella', 'bottom-vestito', 'accessorio-occhiali'],
    require: { fame: 4 },
  },
  {
    id: 'aura-riflesso', nameIT: 'Aura Riflesso', nameEN: 'Reflection Aura',
    descIT: 'I cittadini ti vedono sotto una nuova luce.', descEN: 'Citizens see you under a new light.',
    type: 'feature', cost: 50, giveAura: true, require: { fame: 5, riflesso: 25 },
  },
];
