const meanings: Record<number, string> = {
  1: 'Leadership, independence, and originality define your path. You are a pioneer meant to forge new ways.',
  2: 'Cooperation, balance, and diplomacy are your strengths. You bring harmony to every situation.',
  3: 'Creativity, self-expression, and joy flow through you. You are meant to inspire others with your art.',
  4: 'Stability, hard work, and discipline are your foundation. You build lasting structures with dedication.',
  5: 'Freedom, adventure, and versatility define your journey. You thrive on change and new experiences.',
  6: 'Love, responsibility, and nurturing are your gifts. You are a caretaker and source of harmony.',
  7: 'Wisdom, introspection, and spiritual depth guide you. You seek truth through contemplation.',
  8: 'Power, ambition, and abundance are your domain. You master the material world with confidence.',
  9: 'Compassion, wisdom, and universal love define your purpose. You are a humanitarian at heart.',
  11: 'Intuition and spiritual insight are heightened in you. You are a visionary with deep inner knowing.',
  22: 'You are a master builder capable of turning dreams into reality. Your vision has practical power.',
}

export function getLifePathNumber(birthdate: Date): { number: number; meaning: string } {
  const dateStr = birthdate.toISOString().slice(0, 10).replace(/-/g, '')
  let sum = 0
  for (const char of dateStr) sum += parseInt(char)

  while (sum > 9 && sum !== 11 && sum !== 22) {
    let s = 0
    for (const c of String(sum)) s += parseInt(c)
    sum = s
  }

  return {
    number: sum,
    meaning: meanings[sum] || 'A unique and undefined path awaits you.',
  }
}
