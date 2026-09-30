import { describeIntent } from './intent';
import { rollHouseDie, rngFrom } from './rng';
import { inventoryOf, presentIn, presentNpc, resolveItem, resolveNpc, resolveRoom, roomOf } from './world';
import { NIGHTS_TO_WIN, SILVER_TO_WIN } from './types';
import type { Effect, Intent, OutcomeTier, Resolution, SceneBeat, World } from './types';

interface Twist {
  facts: string[];
  effects: Effect[];
}

const EMPTY_TWIST: Twist = { facts: [], effects: [] };

function twistFor(subject: string, tier: OutcomeTier, table: Record<string, Partial<Record<OutcomeTier, Twist>>>): Twist {
  const entry = table[subject]?.[tier];
  return entry ?? EMPTY_TWIST;
}

interface ResolutionInit {
  ok: boolean;
  beat: SceneBeat;
  facts: string[];
  dice?: Resolution['dice'];
  effects?: Effect[];
}

function resolution(intent: Intent, init: ResolutionInit): Resolution {
  return {
    intent,
    ok: init.ok,
    beat: init.beat,
    facts: init.facts,
    effects: init.effects ?? [],
    present: [],
    dice: init.dice ?? null,
    notice: init.ok ? null : init.facts[0] ?? 'Nothing happens.',
  };
}

export function resolveGo(world: World, intent: Intent): Resolution {
  const here = roomOf(world, world.roomId);
  if (here === null) return resolution(intent, { ok: false, beat: 'awkward', facts: ['You are nowhere in particular.'] });

  const target = intent.target;
  if (target === null) {
    return resolution(intent, { ok: false, beat: 'awkward', facts: ['You did not go anywhere.'] });
  }

  const byExit = here.exits[target as keyof typeof here.exits];
  if (typeof byExit === 'string') {
    const next = roomOf(world, byExit);
    if (next === null) return resolution(intent, { ok: false, beat: 'refused', facts: [`There is no way to go ${target} from here.`] });
    return resolution(intent, { ok: true, beat: 'awkward', facts: [`You went to ${next.name}.`] });
  }

  const named = resolveRoom(world, target);
  if (named === null) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`Nothing here is called ${target}.`] });
  }

  const reachable = Object.values(here.exits).includes(named.id);
  if (!reachable) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`You cannot reach ${named.name} from here.`] });
  }

  return resolution(intent, { ok: true, beat: 'awkward', facts: [`You went to ${named.name}.`] });
}

const SURROUNDINGS = new Set(['around', 'here', 'room', 'place', 'about', 'everywhere']);

export function resolveLook(world: World, intent: Intent): Resolution {
  const here = roomOf(world, world.roomId);
  if (here === null) return resolution(intent, { ok: false, beat: 'awkward', facts: ['You look at nothing.'] });

  if (intent.target === null || SURROUNDINGS.has(intent.target)) {
    return resolution(intent, { ok: true, beat: 'discovery', facts: [`You are in ${here.name}.`, here.description] });
  }

  const npc = resolveNpc(world, intent.target);
  if (npc !== null) {
    const tell = npc.tells[world.turn % npc.tells.length] ?? npc.name;
    return resolution(intent, { ok: true, beat: 'discovery', facts: [`You look at ${npc.name}.`, tell] });
  }

  const item = resolveItem(world, intent.target);
  if (item !== null) {
    return resolution(intent, { ok: true, beat: 'discovery', facts: [`You look at ${item.name}.`, item.description] });
  }

  return resolution(intent, { ok: false, beat: 'refused', facts: [`There is nothing here called ${intent.target}.`] });
}

const TOPIC_FACTS: Record<string, string> = {
  dog: 'The dog is called Legal.',
  price: 'The innkeeper quoted three silver for a room.',
  cellar: 'There are eleven barrels and one crate in the cellar.',
  woodshed: 'The regular says the innkeeper has buried three tenants behind the woodshed.',
  malk: 'Nobody in the room has heard of Sergeant Malk.',
  room: 'The room upstairs is above a well and has never been described as dry.',
  spine: 'The room key is a bent spoon.',
};

export function resolveAsk(world: World, intent: Intent): Resolution {
  const asked = resolveNpc(world, intent.target);
  const npc = asked === null || !presentIn(world, world.roomId).includes(asked.name)
    ? (resolveNpc(world, 'regular') ?? presentNpc(world, world.roomId))
    : asked;
  if (npc === null) return resolution(intent, { ok: false, beat: 'awkward', facts: ['You ask the empty room a question.'] });

  if (intent.target === null) {
    return resolution(intent, { ok: false, beat: 'awkward', facts: [`You asked ${npc.name} nothing in particular.`] });
  }

  const subject = intent.target.toLowerCase();
  const topic = Object.keys(TOPIC_FACTS).find((key) => subject.includes(key));
  if (topic === undefined) {
    return resolution(intent, { ok: true, beat: 'discovery', facts: [
      `You asked ${npc.name} about ${intent.target}.`,
      `Nobody in the room has heard of ${intent.target}.`,
      `${npc.name} did not look up.`,
    ] });
  }

  const already = world.known.includes(topic);
  if (already) {
    return resolution(intent, { ok: true, beat: 'awkward', facts: [
      `You asked ${npc.name} about ${intent.target} again.`,
      `${npc.name} gave a different answer, and did not appear to notice.`,
    ] });
  }

  const fact = TOPIC_FACTS[topic] ?? `${npc.name} did not answer.`;
  return resolution(intent, { ok: true, beat: 'discovery', facts: [`You asked ${npc.name} about ${intent.target}.`, fact] });
}

export function resolveTake(world: World, intent: Intent): Resolution {
  const item = resolveItem(world, intent.target);
  if (item === null) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`There is nothing here called ${intent.target}.`] });
  }
  if (item.roomId === null) {
    return resolution(intent, { ok: false, beat: 'awkward', facts: [`You already have ${item.name}.`] });
  }
  if (item.roomId !== world.roomId) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`${item.name} is not in this room.`] });
  }
  if (!item.portable) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`${item.name} is not something you can carry.`] });
  }
  return resolution(intent, { ok: true, beat: 'deal', facts: [`You took ${item.name}.`], effects: [{ kind: 'take', itemId: item.id }] });
}

export function resolveAttack(world: World, intent: Intent): Resolution {
  const target = resolveNpc(world, intent.target);
  if (target === null) {
    return resolution(intent, { ok: false, beat: 'awkward', facts: ['You swung at nothing in particular.'] });
  }

  const dice = rollHouseDie(rngFrom(world));
  const twist = twistFor(target.id, dice.tier, ATTACK_TWISTS);
  return resolution(intent, {
    ok: true,
    beat: 'chaos',
    facts: twist.facts.length > 0 ? twist.facts : [`You swung at ${target.name}.`],
    effects: twist.effects,
    dice,
  });
}

export function resolveOffer(world: World, intent: Intent): Resolution {
  const npc = resolveNpc(world, intent.target) ?? resolveNpc(world, 'fettle');
  if (npc === null) return resolution(intent, { ok: false, beat: 'awkward', facts: ['You offered something to no one.'] });

  const amount = intent.amount ?? 1;
  if (world.silver < amount) {
    return resolution(intent, { ok: false, beat: 'refused', facts: [`You offered ${amount} silver, which you do not have.`] });
  }

  const dice = rollHouseDie(rngFrom(world));
  const twist = twistFor(npc.id, dice.tier, OFFER_TWISTS);
  return resolution(intent, {
    ok: true,
    beat: 'deal',
    facts: twist.facts.length > 0 ? twist.facts : [`You offered ${amount} silver to ${npc.name}.`],
    effects: twist.effects,
    dice,
  });
}

export function resolveDrink(world: World, intent: Intent): Resolution {
  const hasBottle = inventoryOf(world).some((item) => item.id === 'bottle');
  if (!hasBottle) {
    return resolution(intent, { ok: false, beat: 'refused', facts: ['You have nothing to drink.'] });
  }
  const dice = rollHouseDie(rngFrom(world));
  const twist = twistFor('bottle', dice.tier, DRINK_TWISTS);
  return resolution(intent, { ok: true, beat: 'chaos', facts: twist.facts, effects: twist.effects, dice });
}

export function resolveRest(_world: World, intent: Intent): Resolution {
  return resolution(intent, { ok: true, beat: 'awkward', facts: ['You rested. The night changed its mind about you.'] });
}

export function resolveWait(world: World, intent: Intent): Resolution {
  const dice = rollHouseDie(rngFrom(world));
  const tier = dice.tier;
  const facts = tier === 'inverted' ? ['You waited. Something waited back.'] : tier === 'complicated' ? ['You waited. It was long.'] : ['You waited. Nothing happened, which was the best available result.'];
  return resolution(intent, { ok: true, beat: 'awkward', facts: facts, dice: dice });
}

export function resolveInventory(world: World, intent: Intent): Resolution {
  const carried = inventoryOf(world);
  if (carried.length === 0) return resolution(intent, { ok: true, beat: 'awkward', facts: ['You are carrying nothing.'] });
  return resolution(intent, { ok: true, beat: 'awkward', facts: [`You are carrying ${carried.map((item) => item.name).join(', ')}.`] });
}

export function resolveLeave(_world: World, intent: Intent): Resolution {
  return resolution(intent, { ok: true, beat: 'refused', facts: ['You left. The inn did not notice.'] });
}

const ATTACK_TWISTS: Record<string, Partial<Record<OutcomeTier, Twist>>> = {
  hound: {
    inverted: {
      facts: ['You swung at the dog and missed.', 'The dog is unharmed.', 'The dog sat down and looked at you with respect.'],
      effects: [{ kind: 'flag', key: 'dogRespects', value: true }],
    },
    complicated: {
      facts: ['Your swing grazed the dog.', 'The dog considered this, then sat down beside you.', 'The dog has not moved since.'],
      effects: [{ kind: 'flag', key: 'dogBeside', value: true }],
    },
    successful: {
      facts: ['You hit the dog.', 'The dog did not stop.', 'The dog sat down beside you and stayed there, which was worse.'],
      effects: [{ kind: 'flag', key: 'dogBeside', value: true }, { kind: 'nerve', delta: -1 }],
    },
  },
  fettle: {
    inverted: {
      facts: ['You swung at the innkeeper and missed.', 'The innkeeper is still standing.', 'He looked at you with what you would call interest.'],
      effects: [{ kind: 'nerve', delta: -1 }],
    },
    successful: {
      facts: ['You hit the innkeeper.', 'The innkeeper sat down.', 'He got up, adjusted his coat, and asked about the price.'],
      effects: [{ kind: 'nerve', delta: -2 }],
    },
  },
  malk: {
    inverted: {
      facts: ['You swung at Sergeant Malk.', 'Sergeant Malk was not there.', 'He is not there now either, which is becoming a pattern.'],
      effects: [{ kind: 'learn', topic: 'malk' }],
    },
  },
};

const OFFER_TWISTS: Record<string, Partial<Record<OutcomeTier, Twist>>> = {
  fettle: {
    inverted: {
      facts: ['You offered the innkeeper two silver.', 'He took it.', 'He said the price of a room is now three silver.'],
      effects: [{ kind: 'silver', delta: -2 }, { kind: 'flag', key: 'priceRaised', value: true }],
    },
    complicated: {
      facts: ['You offered the innkeeper two silver.', 'He took it without looking at it.', 'He has not told you what it bought.'],
      effects: [{ kind: 'silver', delta: -2 }],
    },
    successful: {
      facts: ['You offered the innkeeper two silver.', 'He took it.', 'He told you where the good room is, which is not where you thought.'],
      effects: [{ kind: 'silver', delta: -2 }, { kind: 'learn', topic: 'room' }],
    },
  },
  regular: {
    inverted: {
      facts: ['You offered the regular two silver.', 'He took it.', 'He told you not to go behind the woodshed, and then went behind it himself.'],
      effects: [{ kind: 'silver', delta: -2 }, { kind: 'learn', topic: 'woodshed' }],
    },
    successful: {
      facts: ['You offered the regular two silver.', 'He took it.', 'He told you where the innkeeper keeps the ledger, which was under the bar the whole time.'],
      effects: [{ kind: 'silver', delta: -2 }, { kind: 'learn', topic: 'spine' }],
    },
  },
};

const DRINK_TWISTS: Record<string, Partial<Record<OutcomeTier, Twist>>> = {
  bottle: {
    inverted: {
      facts: ['You drank from the green bottle.', 'The bottle was stronger than it looked, which is what it had warned you about.'],
      effects: [{ kind: 'nerve', delta: -2 }],
    },
    successful: {
      facts: ['You drank from the green bottle.', 'It was not what it looked like, and not what the innkeeper called it.'],
      effects: [{ kind: 'nerve', delta: 2 }],
    },
  },
};

const RESOLVERS: Record<string, (world: World, intent: Intent) => Resolution> = {
  go: resolveGo,
  look: resolveLook,
  ask: resolveAsk,
  take: resolveTake,
  offer: resolveOffer,
  drink: resolveDrink,
  attack: resolveAttack,
  rest: resolveRest,
  wait: resolveWait,
  inventory: resolveInventory,
  leave: resolveLeave,
};

export function resolveIntent(world: World, intent: Intent): Resolution {
  const resolver = RESOLVERS[intent.kind] ?? resolveWait;
  const result = resolver(world, intent);
  const effects: Effect[] = [...result.effects];

  if (result.ok && result.facts.length > 0) {
    effects.push({ kind: 'chronicle', line: `${describeIntent(intent)}: ${result.facts[result.facts.length - 1] ?? ''}` });
  }

  if (result.dice !== null && result.dice.tier === 'inverted') {
    effects.push({ kind: 'nerve', delta: -1 });
  }

  return {
    ...result,
    effects,
    present: presentIn(world, world.roomId),
  };
}

export function statusFor(world: World): 'playing' | 'won' | 'lost' {
  if (world.nerve <= 0) return 'lost';
  if (world.night > NIGHTS_TO_WIN && world.silver >= SILVER_TO_WIN) return 'won';
  return 'playing';
}