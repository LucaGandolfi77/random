import type { Effect, World } from './types';

export function applyEffects(world: World, effects: readonly Effect[]): World {
  const next: World = {
    ...world,
    flags: { ...world.flags },
    known: [...world.known],
    chronicle: [...world.chronicle],
    rooms: structuredClone(world.rooms),
    npcs: structuredClone(world.npcs),
    items: structuredClone(world.items),
  };

  for (const effect of effects) {
    switch (effect.kind) {
      case 'silver':
        next.silver = Math.max(0, next.silver + effect.delta);
        break;
      case 'nerve':
        next.nerve = Math.max(0, next.nerve + effect.delta);
        break;
      case 'move':
        if (next.rooms[effect.roomId] !== undefined) next.roomId = effect.roomId;
        break;
      case 'flag':
        next.flags[effect.key] = effect.value;
        break;
      case 'take': {
        const item = next.items[effect.itemId];
        if (item === undefined) break;
        item.roomId = null;
        for (const room of Object.values(next.rooms)) {
          const index = room.itemIds.indexOf(effect.itemId);
          if (index >= 0) room.itemIds.splice(index, 1);
        }
        break;
      }
      case 'drop': {
        const item = next.items[effect.itemId];
        if (item === undefined) break;
        item.roomId = next.roomId;
        const room = next.rooms[next.roomId];
        if (room !== undefined && !room.itemIds.includes(effect.itemId)) {
          room.itemIds.push(effect.itemId);
        }
        break;
      }
      case 'learn':
        if (!next.known.includes(effect.topic)) next.known.push(effect.topic);
        break;
      case 'chronicle':
        next.chronicle.push(effect.line);
        break;
    }
  }

  return next;
}