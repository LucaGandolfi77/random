import { describeIntent } from './intent';
import { applyEffects } from './effects';
import { resolveIntent, statusFor } from './rules';
import type { GameState, Intent, Resolution, World } from './types';
import { NIGHTS_TO_WIN, SILVER_TO_WIN } from './types';

export function briefFrom(world: World, resolution: Resolution): {
  beat: Resolution['beat'];
  facts: string[];
  present: string[];
  history: string[];
  action: string;
} {
  return {
    beat: resolution.beat,
    facts: resolution.facts,
    present: resolution.present,
    history: world.chronicle.slice(-4),
    action: describeIntent(resolution.intent),
  };
}

export function takeTurn(state: GameState, intent: Intent): GameState {
  const resolution = resolveIntent(state.world, intent);
  const world: World = applyEffects(state.world, resolution.effects);
  world.turn = state.world.turn + 1;
  return { world, last: resolution, status: statusFor(world) };
}

export function advanceNight(state: GameState): GameState {
  const world: World = {
    ...state.world,
    night: state.world.night + 1,
    turn: state.world.turn + 1,
    chronicle: [...state.world.chronicle, `Night ${state.world.night} ended.`],
  };
  return { world, last: state.last, status: statusFor(world) };
}

export function endingFor(state: GameState): string {
  const { world } = state;
  if (world.nerve <= 0) return 'You stopped being able to stand up, and the inn got on with it.';
  if (world.night > NIGHTS_TO_WIN && world.silver >= SILVER_TO_WIN) {
    return `You survived ${NIGHTS_TO_WIN} nights and had ${SILVER_TO_WIN} silver. The Drowned Ox is yours, which the Fettle had not planned for.`;
  }
  return `You did not finish. You got to night ${world.night} with ${world.silver} silver.`;
}

export function winConditionMet(world: World): boolean {
  return world.night > NIGHTS_TO_WIN && world.silver >= SILVER_TO_WIN;
}