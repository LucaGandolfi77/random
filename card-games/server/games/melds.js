const { shuffle } = require('../cards');

function rummyRank(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  const n = parseInt(rank);
  return isNaN(n) ? 0 : n;
}

function isJoker(card) {
  return card.rank === 'JOKER' || card.type === 'joker';
}

function isSet(cards) {
  if (cards.length < 3) return false;
  const reals = cards.filter(c => !isJoker(c));
  if (reals.length === 0) return true;
  const rank = reals[0].rank;
  const suits = new Set();
  for (const c of reals) {
    if (c.rank !== rank) return false;
    if (suits.has(c.suit)) return false;
    suits.add(c.suit);
  }
  return true;
}

function isRun(cards) {
  if (cards.length < 3) return false;
  const reals = cards.filter(c => !isJoker(c));
  if (reals.length === 0) return true;
  const jokers = cards.length - reals.length;
  const suit = reals[0].suit;
  if (!reals.every(c => c.suit === suit)) return false;
  const ranks = reals.map(c => rummyRank(c.rank)).sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < ranks.length; i++) {
    gaps += ranks[i] - ranks[i - 1] - 1;
    if (gaps > jokers) return false;
  }
  const totalCards = ranks[ranks.length - 1] - ranks[0] + 1;
  if (totalCards > cards.length) {
    const extraGaps = totalCards - cards.length;
    if (extraGaps > jokers - gaps) return false;
  }
  return !reals.some(c => rummyRank(c.rank) === rummyRank('A')) || ranks[0] >= 1;
}

function isValidMeld(cards) {
  if (cards.length < 3) return false;
  const hasJokers = cards.some(isJoker);
  if (!hasJokers) return isSet(cards) || isRun(cards);
  return isSet(cards) || isRun(cards);
}

function canAddToMeld(meld, card) {
  return isValidMeld([...meld, card]);
}

function cardPoints(card) {
  if (isJoker(card)) return 20;
  if (card.rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  const n = parseInt(card.rank);
  return isNaN(n) ? 0 : n;
}

function handPenalty(cards) {
  return cards.reduce((s, c) => s + cardPoints(c), 0);
}

function findFromHand(hand, cardIds) {
  const ids = new Set(cardIds);
  return hand.filter(c => ids.has(c.id));
}

function removeFromHand(hand, cardIds) {
  const ids = new Set(cardIds);
  return hand.filter(c => !ids.has(c.id));
}

function sameRank(card, rank) {
  return card.rank === rank || isJoker(card);
}

function rankIndex(rank) {
  const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return order.indexOf(rank);
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

module.exports = { rummyRank, isJoker, isSet, isRun, isValidMeld, canAddToMeld, cardPoints, handPenalty, findFromHand, removeFromHand, sameRank, rankIndex, shuffle, combinations };
