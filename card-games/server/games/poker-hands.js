function cardRank(card) {
  if (card.rank === 'A') return 14;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  return parseInt(card.rank) || 0;
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function handRankName(rank) {
  const names = { 10: 'Scala Reale', 9: 'Scala Colore', 8: 'Poker', 7: 'Full', 6: 'Colore', 5: 'Scala', 4: 'Tris', 3: 'Doppia Coppia', 2: 'Coppia', 1: 'Carta Alta' };
  return names[rank] || '?';
}

function evaluate5(cards) {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const flush = suits.every(s => s === suits[0]);
  const rankCounts = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1;
  const groups = Object.entries(rankCounts).map(([r, c]) => ({ r: parseInt(r), c })).sort((a, b) => b.c - a.c || b.r - a.r);

  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let straight = false;
  let straightHigh = 0;
  if (uniqueRanks.length >= 5) {
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        straight = true;
        straightHigh = uniqueRanks[i];
        break;
      }
    }
  }
  if (!straight && uniqueRanks.includes(14) && uniqueRanks.slice(-4).join(',') === [5, 4, 3, 2].join(',')) {
    straight = true;
    straightHigh = 5;
  }

  if (flush && straight) return straightHigh === 14 ? { rank: 10, name: 'Scala Reale', kickers: [straightHigh] } : { rank: 9, name: 'Scala Colore', kickers: [straightHigh] };
  if (groups[0].c === 4) return { rank: 8, name: 'Poker', kickers: [groups[0].r, groups[1]?.r || 0] };
  if (groups[0].c === 3 && groups[1]?.c === 2) return { rank: 7, name: 'Full', kickers: [groups[0].r, groups[1].r] };
  if (flush) return { rank: 6, name: 'Colore', kickers: ranks };
  if (straight) return { rank: 5, name: 'Scala', kickers: [straightHigh] };
  if (groups[0].c === 3) return { rank: 4, name: 'Tris', kickers: [groups[0].r, ...ranks.filter(r => r !== groups[0].r).slice(0, 2)] };
  if (groups[0].c === 2 && groups[1]?.c === 2) {
    const pairRanks = [groups[0].r, groups[1].r].sort((a, b) => b - a);
    const kicker = ranks.find(r => r !== groups[0].r && r !== groups[1].r) || 0;
    return { rank: 3, name: 'Doppia Coppia', kickers: [...pairRanks, kicker] };
  }
  if (groups[0].c === 2) return { rank: 2, name: 'Coppia', kickers: [groups[0].r, ...ranks.filter(r => r !== groups[0].r).slice(0, 3)] };
  return { rank: 1, name: 'Carta Alta', kickers: ranks.slice(0, 5) };
}

function bestHand(cards) {
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluate5(combo);
    if (!best || compareHands(result, best) > 0) best = result;
  }
  return best;
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < a.kickers.length; i++) {
    if ((a.kickers[i] || 0) !== (b.kickers[i] || 0)) return (a.kickers[i] || 0) - (b.kickers[i] || 0);
  }
  return 0;
}

module.exports = { bestHand, evaluate5, cardRank, handRankName, compareHands };
