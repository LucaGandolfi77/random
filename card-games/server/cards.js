const ITALIAN_RANKS = [
  { rank: 'A', value: 1, briscolaValue: 11 },
  { rank: '2', value: 2, briscolaValue: 0 },
  { rank: '3', value: 3, briscolaValue: 10 },
  { rank: '4', value: 4, briscolaValue: 0 },
  { rank: '5', value: 5, briscolaValue: 0 },
  { rank: '6', value: 6, briscolaValue: 0 },
  { rank: '7', value: 7, briscolaValue: 0 },
  { rank: 'J', value: 8, briscolaValue: 2 },
  { rank: 'C', value: 9, briscolaValue: 3 },
  { rank: 'R', value: 10, briscolaValue: 4 },
];

const ITALIAN_SUITS = [
  { suit: 'denari', label: 'Denari', symbol: '♦', color: '#D4A017' },
  { suit: 'coppe', label: 'Coppe', symbol: '♥', color: '#D32F2F' },
  { suit: 'spade', label: 'Spade', symbol: '♠', color: '#212121' },
  { suit: 'bastoni', label: 'Bastoni', symbol: '♣', color: '#2E7D32' },
];

function createItalianDeck() {
  const deck = [];
  let id = 0;
  for (const { suit, label, symbol, color } of ITALIAN_SUITS) {
    for (const { rank, value, briscolaValue } of ITALIAN_RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        uid: id++,
        suit,
        rank,
        value,
        briscolaValue,
        deckType: 'italian40',
        suitSymbol: symbol,
        suitColor: color,
        suitLabel: label,
      });
    }
  }
  return deck;
}

function createFrenchDeck() {
  const suits = [
    { suit: 'hearts', symbol: '♥', color: '#D32F2F' },
    { suit: 'diamonds', symbol: '♦', color: '#D4A017' },
    { suit: 'clubs', symbol: '♣', color: '#212121' },
    { suit: 'spades', symbol: '♠', color: '#212121' },
  ];
  const ranks = [
    { rank: 'A', value: 1 },
    { rank: '2', value: 2 },
    { rank: '3', value: 3 },
    { rank: '4', value: 4 },
    { rank: '5', value: 5 },
    { rank: '6', value: 6 },
    { rank: '7', value: 7 },
    { rank: '8', value: 8 },
    { rank: '9', value: 9 },
    { rank: '10', value: 10 },
    { rank: 'J', value: 10 },
    { rank: 'Q', value: 10 },
    { rank: 'K', value: 10 },
  ];
  const deck = [];
  let id = 0;
  for (const { suit, symbol, color } of suits) {
    for (const { rank, value } of ranks) {
      deck.push({
        id: `${suit}-${rank}`,
        uid: id++,
        suit,
        rank,
        value,
        deckType: 'french52',
        suitSymbol: symbol,
        suitColor: color,
      });
    }
  }
  return deck;
}

function shuffle(deck) {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(deck, playerCount, cardsPerHand) {
  const total = playerCount * cardsPerHand;
  const hands = [];
  let idx = 0;
  for (let p = 0; p < playerCount; p++) {
    hands.push(deck.slice(idx, idx + cardsPerHand));
    idx += cardsPerHand;
  }
  return { hands, remaining: deck.slice(idx) };
}

function createDeck(type) {
  if (type === 'italian40') return createItalianDeck();
  if (type === 'french52') return createFrenchDeck();
  throw new Error(`Unknown deck type: ${type}`);
}

module.exports = { createItalianDeck, createFrenchDeck, shuffle, deal, createDeck, ITALIAN_RANKS, ITALIAN_SUITS };
