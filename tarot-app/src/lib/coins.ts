export function computeLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export interface ReadingReward {
  coins: number
  xp: number
}

export function getReadingReward(cardCount: number): ReadingReward {
  const base = cardCount >= 7
    ? { coins: 15, xp: 25 }
    : { coins: 10, xp: 15 }
  return base
}

export function getDailyLoginReward(streak: number): number {
  return 5 + Math.min(streak - 1, 15)
}

export const DAILY_CARD_COINS = 3
