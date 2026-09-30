import { STARTING_NERVE, STARTING_SILVER } from './types';
import type { Item, Npc, Room, World } from './types';

export const ROOMS: Record<string, Room> = {
  common: {
    id: 'common',
    name: 'the common room',
    description: 'Nine tables, four of them occupied. The fire is out and has been for some time.',
    exits: { up: 'landing', down: 'cellar', south: 'woodshed', out: 'woodshed' },
    itemIds: ['spoon_key', 'ledger'],
    npcIds: ['fettle', 'regular'],
  },
  kitchen: {
    id: 'kitchen',
    name: 'the kitchen',
    description: 'A long table, one stove, and a smell you will learn to stop noticing.',
    exits: { out: 'common' },
    itemIds: ['knife', 'bottle'],
    npcIds: [],
  },
  cellar: {
    id: 'cellar',
    name: 'the cellar',
    description: 'Eleven barrels and one crate. The damp has opinions about everything down here.',
    exits: { out: 'common' },
    itemIds: ['crate'],
    npcIds: [],
  },
  landing: {
    id: 'landing',
    name: 'the landing',
    description: 'Nine stairs to a landing with two doors. One is painted. One has a spoon-shaped keyhole.',
    exits: { down: 'common' },
    itemIds: ['knife'],
    npcIds: [],
  },
  woodshed: {
    id: 'woodshed',
    name: 'the woodshed',
    description: 'A shed behind the inn. It is a shed. It has been a shed for a long time.',
    exits: { in: 'common' },
    itemIds: [],
    npcIds: [],
  },
};

export const NPCS: Record<string, Npc> = {
  fettle: {
    id: 'fettle',
    name: 'the innkeeper',
    aliases: ['fettle', 'owner', 'landlord', 'host', 'innkeeper'],
    roomId: 'common',
    tells: ['He does not look up when he answers.', 'He counts twice, out loud.'],
  },
  regular: {
    id: 'regular',
    name: 'the regular',
    aliases: ['regular', 'drunk', 'man', 'patron'],
    roomId: 'common',
    tells: ['He is drunk in a way that seems practised.', 'He looks at the door when he says your name.'],
  },
  malk: {
    id: 'malk',
    name: 'Sergeant Malk',
    aliases: ['malk', 'sergeant'],
    roomId: 'woodshed',
    tells: ['Nobody has heard of him.', 'One man by the fire did not look up.'],
  },
  hound: {
    id: 'hound',
    name: 'the dog',
    aliases: ['dog', 'hound', 'mutt', 'legal'],
    roomId: 'common',
    tells: ['The dog has a name and nobody wants to say it.', 'The dog looks at people the way a clerk does.'],
  },
};

export const ITEMS: Record<string, Item> = {
  spoon_key: {
    id: 'spoon_key',
    name: 'a bent spoon',
    aliases: ['spoon', 'key'],
    roomId: 'common',
    portable: true,
    description: 'The room key. It is a spoon.',
  },
  ledger: {
    id: 'ledger',
    name: 'the ledger',
    aliases: ['ledger', 'book'],
    roomId: 'common',
    portable: true,
    description: 'Numbers in three hands. Two of the hands stopped writing.',
  },
  knife: {
    id: 'knife',
    name: 'the kitchen knife',
    aliases: ['knife'],
    roomId: 'kitchen',
    portable: true,
    description: 'Sharp enough. That is the whole of its appeal.',
  },
  crate: {
    id: 'crate',
    name: 'a crate',
    aliases: ['crate', 'box'],
    roomId: 'cellar',
    portable: false,
    description: 'Stamped with a name that has been sanded off.',
  },
  bottle: {
    id: 'bottle',
    name: 'a green bottle',
    aliases: ['bottle', 'whiskey', 'whisky', 'drink'],
    roomId: 'kitchen',
    portable: true,
    description: 'Unlabelled. A third of it is missing.',
  },
};

export function createWorld(seed: number): World {
  return {
    seed,
    night: 1,
    turn: 0,
    roomId: 'common',
    silver: STARTING_SILVER,
    nerve: STARTING_NERVE,
    flags: {},
    rooms: structuredClone(ROOMS),
    npcs: structuredClone(NPCS),
    items: structuredClone(ITEMS),
    known: [],
    chronicle: [],
  };
}

export function roomOf(world: World, roomId: string): Room | null {
  return world.rooms[roomId] ?? null;
}

export function presentIn(world: World, roomId: string): string[] {
  const room = roomOf(world, roomId);
  if (room === null) return [];
  return room.npcIds.map((id) => world.npcs[id]?.name).filter((name): name is string => name !== undefined);
}

export function itemsIn(world: World, roomId: string): Item[] {
  const room = roomOf(world, roomId);
  if (room === null) return [];
  return room.itemIds.map((id) => world.items[id]).filter((item): item is Item => item !== undefined);
}

export function presentNpc(world: World, roomId: string): Npc | null {
  const names = presentIn(world, roomId);
  const first = names[0];
  if (first === undefined) return null;
  return Object.values(world.npcs).find((npc) => npc.name === first) ?? null;
}

export function inventoryOf(world: World): Item[] {
  return Object.values(world.items).filter((item) => item.roomId === null);
}

export function resolveNpc(world: World, target: string | null): Npc | null {
  if (target === null) return null;
  const haystack = target.toLowerCase();
  for (const npc of Object.values(world.npcs)) {
    if (npc.aliases.some((alias) => haystack.includes(alias))) return npc;
  }
  return null;
}

export function resolveItem(world: World, target: string | null): Item | null {
  if (target === null) return null;
  const haystack = target.toLowerCase();
  for (const item of Object.values(world.items)) {
    if (item.aliases.some((alias) => haystack.includes(alias))) return item;
  }
  return null;
}

export function resolveRoom(world: World, target: string | null): Room | null {
  if (target === null) return null;
  const haystack = target.toLowerCase();
  for (const room of Object.values(world.rooms)) {
    if (haystack.includes(room.id) || haystack.includes(room.name)) return room;
  }
  return null;
}