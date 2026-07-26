export function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function seededPicker<T>(arr: readonly T[], seed: string): T {
  const rng = mulberry32(hashString(seed))
  return arr[Math.floor(rng() * arr.length)]
}

export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  const rng = mulberry32(hashString(seed))
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function getTodaySeed(userId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `${userId}_${today}`
}
