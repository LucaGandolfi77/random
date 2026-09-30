import type { DiceResult, OutcomeTier } from './types';

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  die(sides: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(maxExclusive: number): number {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    die(sides: number): number {
      return 1 + this.int(sides);
    },
  };
}

export function tierForRoll(roll: number): OutcomeTier {
  if (roll <= 2) return 'inverted';
  if (roll <= 4) return 'complicated';
  return 'successful';
}

export function rollHouseDie(rng: Rng, sides = 6): DiceResult {
  const roll = rng.die(sides);
  return { sides, roll, tier: tierForRoll(roll) };
}

export function rngFrom(world: { seed: number; turn: number }): Rng {
  return createRng(world.seed + world.turn * 2654435761);
}