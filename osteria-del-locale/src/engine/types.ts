export type Direction = 'north' | 'south' | 'up' | 'down' | 'in' | 'out';

export const DIRECTIONS: readonly Direction[] = ['north', 'south', 'up', 'down', 'in', 'out'];

export interface Room {
  id: string;
  name: string;
  description: string;
  exits: Partial<Record<Direction, string>>;
  itemIds: string[];
  npcIds: string[];
}

export interface Npc {
  id: string;
  name: string;
  aliases: string[];
  roomId: string;
  tells: string[];
}

export interface Item {
  id: string;
  name: string;
  aliases: string[];
  roomId: string | null;
  portable: boolean;
  description: string;
}

export type FlagValue = boolean | number | string;

export interface World {
  seed: number;
  night: number;
  turn: number;
  roomId: string;
  silver: number;
  nerve: number;
  flags: Record<string, FlagValue>;
  rooms: Record<string, Room>;
  npcs: Record<string, Npc>;
  items: Record<string, Item>;
  known: string[];
  chronicle: string[];
}

export type IntentKind =
  | 'go'
  | 'look'
  | 'ask'
  | 'take'
  | 'offer'
  | 'drink'
  | 'attack'
  | 'rest'
  | 'wait'
  | 'inventory'
  | 'leave';

export interface Intent {
  kind: IntentKind;
  target: string | null;
  amount: number | null;
  raw: string;
  confidence: number;
}

export type OutcomeTier = 'inverted' | 'complicated' | 'successful';

export type Effect =
  | { kind: 'silver'; delta: number }
  | { kind: 'nerve'; delta: number }
  | { kind: 'move'; roomId: string }
  | { kind: 'flag'; key: string; value: FlagValue }
  | { kind: 'take'; itemId: string }
  | { kind: 'drop'; itemId: string }
  | { kind: 'learn'; topic: string }
  | { kind: 'chronicle'; line: string };

export interface DiceResult {
  sides: number;
  roll: number;
  tier: OutcomeTier;
}

export interface Resolution {
  intent: Intent;
  ok: boolean;
  beat: SceneBeat;
  facts: string[];
  effects: Effect[];
  present: string[];
  dice: DiceResult | null;
  notice: string | null;
}

export type SceneBeat =
  | 'deal'
  | 'refused'
  | 'discovery'
  | 'danger'
  | 'awkward'
  | 'chaos';

export interface SceneBrief {
  beat: SceneBeat;
  facts: string[];
  present: string[];
  history: string[];
  action: string;
}

export interface GameState {
  world: World;
  last: Resolution | null;
  status: 'playing' | 'won' | 'lost';
}

export const NIGHTS_TO_WIN = 3;
export const SILVER_TO_WIN = 20;
export const STARTING_NERVE = 6;
export const STARTING_SILVER = 5;