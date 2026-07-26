export type MoonPhase = {
  phase: string
  emoji: string
  illumination: number
}

const phases = [
  { name: 'New Moon', emoji: '🌑' },
  { name: 'Waxing Crescent', emoji: '🌒' },
  { name: 'First Quarter', emoji: '🌓' },
  { name: 'Waxing Gibbous', emoji: '🌔' },
  { name: 'Full Moon', emoji: '🌕' },
  { name: 'Waning Gibbous', emoji: '🌖' },
  { name: 'Third Quarter', emoji: '🌗' },
  { name: 'Waning Crescent', emoji: '🌘' },
]

export function getMoonPhase(date: Date): MoonPhase {
  const knownNewMoon = new Date(2000, 0, 6, 18, 14)
  const synodic = 29.53058867
  const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
  const age = ((diff % synodic) + synodic) % synodic
  const index = Math.floor((age / synodic) * 8) % 8
  const illumination = Math.min(1, Math.max(0, (1 - Math.cos(2 * Math.PI * age / synodic)) / 2))

  return {
    phase: phases[index].name,
    emoji: phases[index].emoji,
    illumination: Math.round(illumination * 100),
  }
}
