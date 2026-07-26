const elementMap: Record<string, string> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
}

const elementCompat: Record<string, string> = {
  fire_fire: 'A passionate and energetic match. You inspire each other but may compete.',
  fire_earth: 'Fire meets earth — passion meets stability. Challenging but deeply grounding.',
  fire_air: 'Fire needs air to burn. This is an exciting, dynamic, and growth-oriented pairing.',
  fire_water: 'Steam and passion. Intense emotions that can either create magic or conflict.',
  earth_earth: 'A stable and reliable foundation. You build a life of security and shared values.',
  earth_air: 'Earth grounds air\'s ideas. A practical and thoughtful partnership with good balance.',
  earth_water: 'Earth and water create fertile ground. Nurturing, supportive, and deeply connected.',
  air_air: 'Intellectual stimulation and freedom define this bond. Great friends and partners.',
  air_water: 'Air stirs water\'s depths. Emotional depth meets intellectual curiosity — a fascinating mix.',
  water_water: 'Deep emotional waters. Intense, empathic, and profoundly connected on a soul level.',
}

export function getCompatibility(sign1: string, sign2: string): string {
  const el1 = elementMap[sign1] || 'fire'
  const el2 = elementMap[sign2] || 'fire'
  const key = [el1, el2].sort().join('_')
  return elementCompat[key] || 'A unique cosmic connection. Explore it with an open heart.'
}

export const ZODIAC_NAMES: Record<string, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
}
