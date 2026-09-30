import { NIGHTS_TO_WIN, SILVER_TO_WIN, STARTING_SILVER } from './types';
import type { World } from './types';

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'drowned-ox-save';

export interface SaveEnvelope {
  saveVersion: number;
  savedAt: string;
  world: World;
}

export function serialise(world: World, now: Date): string {
  const envelope: SaveEnvelope = { saveVersion: SAVE_VERSION, savedAt: now.toISOString(), world };
  return JSON.stringify(envelope);
}

export interface RestoreResult {
  world: World | null;
  status: 'ok' | 'missing' | 'corrupt' | 'outdated';
}

function migrate(raw: Record<string, unknown>): World | null {
  const version = raw['saveVersion'];
  if (typeof version !== 'number') return null;

  const candidate = raw['world'];
  if (typeof candidate !== 'object' || candidate === null) return null;

  const world = candidate as Partial<World>;
  if (
    typeof world.seed !== 'number' ||
    typeof world.turn !== 'number' ||
    typeof world.night !== 'number' ||
    typeof world.roomId !== 'string' ||
    typeof world.silver !== 'number' ||
    typeof world.nerve !== 'number' ||
    typeof world.rooms !== 'object' ||
    typeof world.npcs !== 'object' ||
    typeof world.items !== 'object'
  ) {
    return null;
  }

  return {
    seed: world.seed,
    turn: world.turn,
    night: world.night,
    roomId: world.roomId,
    silver: world.silver,
    nerve: world.nerve,
    flags: world.flags ?? {},
    rooms: world.rooms,
    npcs: world.npcs,
    items: world.items,
    known: world.known ?? [],
    chronicle: world.chronicle ?? [],
  };
}

export function deserialise(text: string | null): RestoreResult {
  if (text === null || text.length === 0) return { world: null, status: 'missing' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { world: null, status: 'corrupt' };
  }

  if (typeof parsed !== 'object' || parsed === null) return { world: null, status: 'corrupt' };

  const raw = parsed as Record<string, unknown>;
  const version = raw['saveVersion'];
  if (typeof version === 'number' && version > SAVE_VERSION) return { world: null, status: 'outdated' };

  const world = migrate(raw);
  if (world === null) return { world: null, status: 'corrupt' };

  return { world, status: 'ok' };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveGame(storage: StorageLike, world: World, now: Date): boolean {
  try {
    storage.setItem(SAVE_KEY, serialise(world, now));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage: StorageLike): RestoreResult {
  try {
    return deserialise(storage.getItem(SAVE_KEY));
  } catch {
    return { world: null, status: 'corrupt' };
  }
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    return;
  }
}

export function progressOf(world: World): number {
  const nightsPart = Math.min(world.night - 1, NIGHTS_TO_WIN) / NIGHTS_TO_WIN;
  const silverPart = Math.min(Math.max(0, world.silver - STARTING_SILVER), SILVER_TO_WIN) / SILVER_TO_WIN;
  return Math.max(0, Math.min(1, nightsPart * 0.6 + silverPart * 0.4));
}