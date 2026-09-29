import type { SceneId } from './types'

/**
 * Anomalies.
 *
 * Before every region the Lattice offers you three ways for the region to be
 * misbehaving. Take one and the physics actually change; leave them all on the
 * table and the region is worth less. This is the whole risk dial of the game,
 * and it is why replaying a region you have already beaten is not the same as
 * beating it the first time.
 */

export interface Anomaly {
  id: string
  name: string
  /** What it does to the world, in the game's own voice. */
  brief: string
  /** What it costs you. */
  cost: string
  /** Which region it applies to. */
  region: SceneId
  /** Score multiplier, applied centrally by the engine. */
  scoreMul: number
  /** Anomalies that make no sense alongside this one. */
  conflicts?: string[]
}

export const ANOMALIES: Anomaly[] = [
  {
    id: 'thin_air',
    name: 'Thin Air',
    brief: 'Gravity is 40% weaker. Everything hangs, and your jumps overshoot.',
    cost: 'Nothing. It is only upside if you can steer.',
    region: 'flux',
    scoreMul: 1.3,
  },
  {
    id: 'heavy_water',
    name: 'Heavy Water',
    brief: 'Gravity is 40% stronger. Short hops, hard landings.',
    cost: 'Your jump arc is roughly half as tall.',
    region: 'flux',
    scoreMul: 1.3,
  },
  {
    id: 'certain_walls',
    name: 'Certain Walls',
    brief: 'Shutter slats become genuinely solid. Momentum will not break them.',
    cost: 'You must phase every full-height shutter, and a wave tires fast.',
    region: 'flux',
    scoreMul: 1.45,
  },
  {
    id: 'brutal_breeze',
    name: 'Brutal Breeze',
    brief: 'The barrier wind comes out of nowhere. Thinness leaks 2.5× faster.',
    cost: 'Commit early, or do not commit at all.',
    region: 'tunnel',
    scoreMul: 1.4,
  },
  {
    id: 'thick_reef',
    name: 'Thick Reef',
    brief: 'Every barrier is 40% thicker than the survey said.',
    cost: 'The odds were never good. Now they are worse.',
    region: 'tunnel',
    scoreMul: 1.45,
  },
  {
    id: 'resonance',
    name: 'Resonance',
    brief: 'A failed pass costs twice the energy, and the reef remembers.',
    cost: 'Commit to the right thinness or pay for it twice.',
    region: 'tunnel',
    scoreMul: 1.4,
  },
  {
    id: 'extra_mass',
    name: 'Extra Mass',
    brief: 'Your body is heavier, so it drops out of the marsh faster than the crests lift it.',
    cost: 'Narrower window to stay airborne on a crest.',
    region: 'tunnel',
    scoreMul: 1.35,
  },
  {
    id: 'phase_echo',
    name: 'Phase Echo',
    brief: 'Inverting your phase is inverted. Nodes become air and crests become ballast.',
    cost: 'You must read the field before you leap.',
    region: 'interference',
    scoreMul: 1.4,
  },
  {
    id: 'beating',
    name: 'Beating',
    brief: 'The emitters drift twice as fast. The crests will not wait for you.',
    cost: 'You have to read a pattern that is already moving.',
    region: 'interference',
    scoreMul: 1.4,
  },
  {
    id: 'short_marsh',
    name: 'Short Marsh',
    brief: 'The marsh is half as deep, and the shards sit lower to compensate.',
    cost: 'Less air between you and the ground.',
    region: 'interference',
    scoreMul: 1.3,
  },
  {
    id: 'loud_field',
    name: 'Loud Field',
    brief: 'The emitters double their output. Crests are twice as strong.',
    cost: 'Nodes eat your definiteness in half the time.',
    region: 'interference',
    scoreMul: 1.45,
  },
  {
    id: 'static_lens',
    name: 'Static Lens',
    brief: 'The Astronomer never quite looks away: the lull is 70% shorter.',
    cost: 'The gate is much harder to hold.',
    region: 'entanglement',
    scoreMul: 1.5,
  },
  {
    id: 'narrow_window',
    name: 'Narrow Window',
    brief: 'The gate has to be held 80% longer before it admits anything.',
    cost: 'Two lusses will not do it. You will need three.',
    region: 'entanglement',
    scoreMul: 1.4,
  },
  {
    id: 'long_memory',
    name: 'Long Memory',
    brief: 'Qubit-two holds the tether 30% longer, so the plates are further apart.',
    cost: 'A longer correlation is a harder thing to seat.',
    region: 'entanglement',
    scoreMul: 1.45,
  },
  {
    id: 'echo_chamber',
    name: 'Echo Chamber',
    brief: 'Qubit-two starts 80° out of line, and the tether resists settling.',
    cost: 'You have to swing the dumbbell before you can seat it.',
    region: 'entanglement',
    scoreMul: 1.4,
  },
  {
    id: 'hard_mercury',
    name: 'Hard Mercury',
    brief: 'Every stall in the bazaar insists on being real, whether you are vague or not.',
    cost: 'You lose the only trick the region had.',
    region: 'uncertainty',
    scoreMul: 1.5,
  },
  {
    id: 'sharp_practice',
    name: 'Sharp Practice',
    brief: 'You stay crisp for far longer, so the foggy stalls stay solid almost as long.',
    cost: 'You must earn your blur back every single jump.',
    region: 'uncertainty',
    scoreMul: 1.4,
  },
  {
    id: 'heavy_pockets',
    name: 'Heavy Pockets',
    brief: 'Dashes cost a third of their speed, but the momentum still shows on the readout.',
    cost: 'The heavy stands are much harder to knock over.',
    region: 'uncertainty',
    scoreMul: 1.45,
  },
  {
    id: 'eager_eye',
    name: 'Eager Eye',
    brief: 'The Collapser measures 60% faster and sweeps its beams 50% quicker.',
    cost: 'Being pinned is a real possibility.',
    region: 'collapser',
    scoreMul: 1.6,
  },
  {
    id: 'redacted',
    name: 'Redacted',
    brief: 'The measurement gauge on your HUD is no longer connected to the machine.',
    cost: 'You will have to watch beams with your own eyes, not the bar.',
    region: 'collapser',
    scoreMul: 1.5,
  },
  {
    id: 'thick_shield',
    name: 'Thick Shield',
    brief: 'The shield has doubled in thickness. Getting thin no longer suffices.',
    cost: 'You must hold PHASE for nearly two seconds at a standstill.',
    region: 'collapser',
    scoreMul: 1.55,
  },
]

export const SAFE_SCORE_MUL = 1

/** The multiplier that applies when you decline every anomaly. */
export const safeMultiplier = (recursion: number) =>
  SAFE_SCORE_MUL + recursion * 0.5

/** Deterministic from a seed, so a run can be reproduced. */
export const draftAnomalies = (region: SceneId, seed: number): Anomaly[] => {
  const pool = ANOMALIES.filter((a) => a.region === region)
  // one player can only be one kind of wrong at a time
  const picked: Anomaly[] = []
  const bag = [...pool]
  let n = seed
  while (picked.length < 3 && bag.length) {
    n = (n * 1664525 + 1013904223) >>> 0
    const idx = n % bag.length
    const [choice] = bag.splice(idx, 1)
    if (choice.conflicts?.some((c) => picked.some((p) => p.id === c))) continue
    picked.push(choice)
  }
  return picked
}

export interface RunConfig {
  /** Active anomaly ids. */
  anomalies: string[]
  /** 0 on the first pass; each full clear of the Lattice adds one. */
  recursion: number
  /** Applied centrally to every addScore() call. */
  scoreMul: number
}

export const makeRun = (anomalies: string[], recursion: number): RunConfig => {
  // the Recursion bonus stacks on top of whatever you chose, not instead of it
  const product = anomalies.reduce(
    (m, id) => m * (ANOMALIES.find((a) => a.id === id)?.scoreMul ?? 1),
    1,
  )
  return { anomalies, recursion, scoreMul: product * safeMultiplier(recursion) }
}

/** Convenience for scenes: is a particular anomaly switched on? */
export const has = (run: RunConfig | undefined, id: string) =>
  !!run?.anomalies.includes(id)

/**
 * Global pressure from the Recursion layer. Applied on top of anything the
 * player chose, and never mentioned in the region briefing.
 */
export const recursionPressure = (run: RunConfig | undefined) => 1 + (run?.recursion ?? 0) * 0.22
