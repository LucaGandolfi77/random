// Eventi casuali. `apply(state)` viene interpretato dal controller/model.
export const EVENTS = [
  {
    id: 'gossip', nameIT: 'Onda di gossip', nameEN: 'Wave of gossip', weight: 4,
    apply: 'gossip',
  },
  {
    id: 'meteora', nameIT: 'Pioggia di meteore', nameEN: 'Meteor shower', weight: 2,
    apply: 'meteor',
  },
  {
    id: 'vip', nameIT: 'Visita illustre', nameEN: 'VIP visit', weight: 2,
    apply: 'vip',
  },
  {
    id: 'blackout', nameIT: 'Blackout', nameEN: 'Blackout', weight: 3,
    apply: 'blackout',
  },
];

export const AMBIENT_MESSAGES = [
  { id: 'fountain', key: 'ambientFountain' },
  { id: 'cafe', key: 'ambientCafe' },
  { id: 'greenhouse', key: 'ambientGreenhouse' },
  { id: 'boutique', key: 'ambientBoutique' },
  { id: 'night', key: 'ambientNight' },
];
