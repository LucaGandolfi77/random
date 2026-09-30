import { describe, expect, it } from 'vitest';
import { createRng, tierForRoll, rollHouseDie, rngFrom } from './rng';
import { describeIntent, parseIntent } from './intent';
import { createWorld, itemsIn, presentIn, resolveItem, resolveNpc, resolveRoom, roomOf } from './world';
import { applyEffects } from './effects';
import { resolveIntent, resolveGo, resolveAsk, resolveAttack, resolveOffer, statusFor } from './rules';
import { advanceNight, briefFrom, endingFor, takeTurn } from './chronicle';
import { clearSave, deserialise, loadGame, progressOf, saveGame, serialise, SAVE_VERSION } from './save';
import { analyse } from '../../spike/metrics';
import { narrateTemplate } from '../narrator/template';
import { buildMessages } from '../narrator/prompt';
import type { GameState, World } from './types';

function playingWorld(seed = 7): World {
  return createWorld(seed);
}

function play(world: World, input: string): GameState {
  return takeTurn({ world, last: null, status: 'playing' }, parseIntent(input));
}

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produces different streams for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('stays in range', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('never returns a zero, which would break the state', () => {
    const rng = createRng(0);
    expect(rng.next()).not.toBeNaN();
  });

  it('rolls within the die bounds', () => {
    const rng = createRng(3);
    for (let i = 0; i < 300; i += 1) {
      const roll = rng.die(6);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});

describe('tierForRoll', () => {
  it('inverts low rolls', () => {
    expect(tierForRoll(1)).toBe('inverted');
    expect(tierForRoll(2)).toBe('inverted');
  });

  it('complicates middling rolls', () => {
    expect(tierForRoll(3)).toBe('complicated');
    expect(tierForRoll(4)).toBe('complicated');
  });

  it('lets high rolls succeed', () => {
    expect(tierForRoll(5)).toBe('successful');
    expect(tierForRoll(6)).toBe('successful');
  });
});

describe('rollHouseDie', () => {
  it('maps every possible roll onto a tier', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i += 1) {
      const dice = rollHouseDie(rng);
      expect(['inverted', 'complicated', 'successful']).toContain(dice.tier);
      expect(dice.sides).toBe(6);
    }
  });
});

describe('rngFrom', () => {
  it('advances with the turn count', () => {
    expect(rngFrom({ seed: 1, turn: 0 }).next()).not.toBe(rngFrom({ seed: 1, turn: 1 }).next());
  });
});

describe('parseIntent', () => {
  const cases: Array<[string, string, string | null, number | null]> = [
    ['look around', 'look', 'around', null],
    ['go to the cellar', 'go', 'cellar', null],
    ['attack the dog', 'attack', 'dog', null],
    ['bribe the innkeeper two silver', 'offer', 'innkeeper', 2],
    ['take the spoon', 'take', 'spoon', null],
    ['go upstairs', 'go', 'up', null],
    ['head down', 'go', 'down', null],
    ['ask about Sergeant Malk', 'ask', 'sergeant malk', null],
    ['pick up the ledger', 'take', 'ledger', null],
    ['drink', 'drink', null, null],
    ['inv', 'inventory', null, null],
    ['leave', 'leave', null, null],
  ];

  for (const [input, kind, target, amount] of cases) {
    it(`parses ${JSON.stringify(input)}`, () => {
      const intent = parseIntent(input);
      expect(intent.kind).toBe(kind);
      expect(intent.target).toBe(target);
      expect(intent.amount).toBe(amount);
    });
  }

  it('falls back to waiting on unrecognised input', () => {
    const intent = parseIntent('cast fireball at the innkeeper');
    expect(intent.kind).toBe('wait');
    expect(intent.confidence).toBeLessThan(0.5);
  });

  it('reads written numbers', () => {
    expect(parseIntent('offer the barkeep 7 silver').amount).toBe(7);
  });

  it('does not treat a stray number as an offer amount', () => {
    expect(parseIntent('attack the dog 3').amount).toBeNull();
  });

  it('never returns a target for a bare verb', () => {
    expect(parseIntent('rest').target).toBeNull();
    expect(parseIntent('wait').target).toBeNull();
  });
});

describe('describeIntent', () => {
  it('renders directions as phrases', () => {
    expect(describeIntent(parseIntent('go upstairs'))).toBe('go upstairs');
    expect(describeIntent(parseIntent('head down'))).toBe('go downstairs');
  });

  it('renders amounts', () => {
    expect(describeIntent(parseIntent('bribe the innkeeper two silver'))).toBe('offer 2 silver to innkeeper');
  });

  it('renders a topic', () => {
    expect(describeIntent(parseIntent('ask about the price'))).toBe('ask about price');
  });
});

describe('createWorld', () => {
  it('starts the player in the common room with silver and nerve', () => {
    const world = playingWorld();
    expect(world.roomId).toBe('common');
    expect(world.silver).toBe(5);
    expect(world.nerve).toBeGreaterThan(0);
  });

  it('has no chronicle yet', () => {
    expect(playingWorld().chronicle).toEqual([]);
  });

  it('deep clones its rooms so two worlds never share state', () => {
    const a = playingWorld();
    const b = playingWorld();
    a.rooms['common']!.itemIds.push('intruder');
    expect(b.rooms['common']!.itemIds).not.toContain('intruder');
  });
});

describe('lookups', () => {
  const world = playingWorld();

  it('resolves npcs by alias', () => {
    expect(resolveNpc(world, 'the landlord')?.id).toBe('fettle');
    expect(resolveNpc(world, 'the hound')?.id).toBe('hound');
  });

  it('resolves items by alias', () => {
    expect(resolveItem(world, 'take the key')?.id).toBe('spoon_key');
  });

  it('resolves rooms by name', () => {
    expect(resolveRoom(world, 'the cellar')?.id).toBe('cellar');
  });

  it('returns null for unknown targets', () => {
    expect(resolveNpc(world, 'the sous-chef')).toBeNull();
    expect(resolveItem(world, 'nothing')).toBeNull();
    expect(resolveRoom(world, 'nothing')).toBeNull();
  });

  it('lists who is present', () => {
    expect(presentIn(world, 'common')).toContain('the innkeeper');
  });

  it('lists items in a room', () => {
    expect(itemsIn(world, 'common').map((item) => item.id)).toContain('ledger');
  });

  it('returns an empty list for a room that does not exist', () => {
    expect(presentIn(world, 'nowhere')).toEqual([]);
    expect(itemsIn(world, 'nowhere')).toEqual([]);
  });
});

describe('applyEffects', () => {
  it('adds and removes silver', () => {
    const world = applyEffects(playingWorld(), [
      { kind: 'silver', delta: 3 },
      { kind: 'silver', delta: -10 },
    ]);
    expect(world.silver).toBe(0);
  });

  it('floors nerve at zero', () => {
    expect(applyEffects(playingWorld(), [{ kind: 'nerve', delta: -99 }]).nerve).toBe(0);
  });

  it('takes an item out of the room and into inventory', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'take', itemId: 'ledger' }]);
    expect(world.items['ledger']?.roomId).toBeNull();
    expect(roomOf(world, 'common')?.itemIds).not.toContain('ledger');
  });

  it('drops an item into the current room', () => {
    const world = applyEffects(playingWorld(), [
      { kind: 'take', itemId: 'ledger' },
      { kind: 'drop', itemId: 'ledger' },
    ]);
    expect(world.items['ledger']?.roomId).toBe('common');
    expect(roomOf(world, 'common')?.itemIds).toContain('ledger');
  });

  it('records flags', () => {
    expect(applyEffects(playingWorld(), [{ kind: 'flag', key: 'k', value: 3 }]).flags['k']).toBe(3);
  });

  it('learns topics without duplicating them', () => {
    const world = applyEffects(playingWorld(), [
      { kind: 'learn', topic: 'dog' },
      { kind: 'learn', topic: 'dog' },
    ]);
    expect(world.known).toEqual(['dog']);
  });

  it('moves the player', () => {
    expect(applyEffects(playingWorld(), [{ kind: 'move', roomId: 'cellar' }]).roomId).toBe('cellar');
  });

  it('ignores an unknown item', () => {
    expect(() => applyEffects(playingWorld(), [{ kind: 'take', itemId: 'ghost' }])).not.toThrow();
  });

  it('does not mutate the world it was given', () => {
    const before = playingWorld();
    const snapshot = JSON.stringify(before);
    applyEffects(before, [{ kind: 'silver', delta: -5 }, { kind: 'take', itemId: 'ledger' }]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('resolveGo', () => {
  it('follows an exit', () => {
    const world = playingWorld();
    const result = resolveGo(world, parseIntent('go down'));
    expect(result.ok).toBe(true);
    expect(result.facts[0]).toContain('the cellar');
  });

  it('refuses a direction with no exit', () => {
    const result = resolveGo(playingWorld(), parseIntent('go north'));
    expect(result.ok).toBe(false);
    expect(result.beat).toBe('refused');
  });

  it('refuses a place that does not exist', () => {
    const result = resolveGo(playingWorld(), parseIntent('go to the moon'));
    expect(result.ok).toBe(false);
  });

  it('refuses an unreachable room', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'move', roomId: 'cellar' }]);
    const result = resolveGo(world, parseIntent('go to the landing'));
    expect(result.ok).toBe(false);
    expect(result.beat).toBe('refused');
  });

  it('refuses a non-portable item', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'move', roomId: 'cellar' }]);
    const result = resolveIntent(world, parseIntent('take the crate'));
    expect(result.ok).toBe(false);
  });
});

describe('resolveLook', () => {
  it('describes the room', () => {
    const result = resolveIntent(playingWorld(), parseIntent('look around'));
    expect(result.ok).toBe(true);
    expect(result.facts.join(' ')).toContain('common room');
  });

  it('survives a room with no description target', () => {
    const world = playingWorld();
    const result = resolveIntent(world, parseIntent('look around'));
    expect(result.facts.length).toBeGreaterThan(0);
  });
});

describe('resolveAsk', () => {
  it('never asks the subject of the question', () => {
    const result = resolveAsk(playingWorld(), parseIntent('ask about Sergeant Malk'));
    expect(result.facts.join(' ')).toContain('the regular');
    expect(result.facts.join(' ')).not.toContain('You asked Sergeant Malk');
  });

  it('admits when nobody has heard of the topic', () => {
    const result = resolveAsk(playingWorld(), parseIntent('ask about the mayor'));
    expect(result.facts.join(' ')).toContain('has heard of');
  });

  it('reveals a known topic once, then changes its story', () => {
    let world = playingWorld();
    const first = resolveAsk(world, parseIntent('ask about the dog'));
    expect(first.facts.join(' ')).toContain('Legal');

    world = applyEffects(world, [{ kind: 'learn', topic: 'dog' }]);
    const second = resolveAsk(world, parseIntent('ask about the dog'));
    expect(second.facts.join(' ')).toContain('different answer');
  });

});

describe('resolveAttack and resolveOffer', () => {
  it('rejects attacking nothing', () => {
    const result = resolveAttack(playingWorld(), parseIntent('attack the door'));
    expect(result.ok).toBe(false);
  });

  it('refuses an offer larger than the purse', () => {
    const result = resolveOffer(playingWorld(), parseIntent('offer the innkeeper 40 silver'));
    expect(result.ok).toBe(false);
    expect(result.beat).toBe('refused');
  });

  it('never produces a negative purse', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'silver', delta: -4 }]);
    const result = resolveOffer(world, parseIntent('offer the innkeeper 3 silver'));
    expect(result.ok).toBe(false);
  });

  it('spends silver when an offer is taken', () => {
    const world = playingWorld();
    const result = resolveOffer(world, parseIntent('offer the innkeeper 2 silver'));
    expect(result.ok).toBe(true);
    expect(result.effects.some((effect) => effect.kind === 'silver' && effect.delta === -2)).toBe(true);
  });
});

describe('resolveIntent', () => {
  it('writes a chronicle line for a successful turn', () => {
    const state = play(playingWorld(), 'take the spoon');
    expect(state.world.chronicle.length).toBe(1);
  });

  it('advances the turn counter', () => {
    expect(play(playingWorld(), 'wait').world.turn).toBe(1);
  });

  it('always returns a beat', () => {
    const beats = new Set(['deal', 'refused', 'discovery', 'danger', 'awkward', 'chaos']);
    for (const input of ['look around', 'attack the dog', 'ask about the price', 'go down', 'inv']) {
      expect(beats.has(play(playingWorld(), input).last?.beat ?? 'x')).toBe(true);
    }
  });

  it('costs nerve when the house dice invert', () => {
    let inverted = false;
    for (let turn = 0; turn < 30 && !inverted; turn += 1) {
      const state = play(playingWorld(turn + 1), 'wait');
      if (state.last?.dice?.tier === 'inverted') {
        expect(state.world.nerve).toBeLessThan(state.last !== null ? 6 : 6);
        inverted = true;
      }
    }
    expect(inverted).toBe(true);
  });
});

describe('statusFor', () => {
  it('is playing at the start', () => {
    expect(statusFor(playingWorld())).toBe('playing');
  });

  it('is lost when nerve runs out', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'nerve', delta: -99 }]);
    expect(statusFor(world)).toBe('lost');
  });

  it('is won after the nights and the silver', () => {
    let world = playingWorld();
    world = { ...world, night: 99, silver: 99 };
    expect(statusFor(world)).toBe('won');
  });
});

describe('chronicle and briefs', () => {
  it('builds a brief from a resolution', () => {
    const state = play(playingWorld(), 'ask about the dog');
    const brief = briefFrom(state.world, state.last!);
    expect(brief.facts.length).toBeGreaterThan(0);
    expect(brief.action.length).toBeGreaterThan(0);
  });

  it('caps history at four entries', () => {
    let state: GameState = { world: playingWorld(), last: null, status: 'playing' };
    for (let i = 0; i < 9; i += 1) state = play(state.world, 'wait');
    expect(state.world.chronicle.length).toBe(9);
    expect(briefFrom(state.world, state.last!).history.length).toBeLessThanOrEqual(4);
  });

  it('advances the night and records it', () => {
    const state = advanceNight({ world: playingWorld(), last: null, status: 'playing' });
    expect(state.world.night).toBe(2);
    expect(state.world.chronicle.at(-1)).toContain('Night 1 ended');
  });

  it('writes an ending for a loss', () => {
    const world = applyEffects(playingWorld(), [{ kind: 'nerve', delta: -99 }]);
    expect(endingFor({ world, last: null, status: 'lost' })).toContain('stopped being able to stand up');
  });
});

describe('save round trip', () => {
  it('restores an identical world', () => {
    const world = play(playingWorld(), 'take the spoon').world;
    const restored = deserialise(serialise(world, new Date(0)));
    expect(restored.status).toBe('ok');
    expect(restored.world).toEqual(world);
  });

  it('reports missing storage', () => {
    expect(deserialise(null).status).toBe('missing');
  });

  it('reports corrupt storage', () => {
    expect(deserialise('{not json').status).toBe('corrupt');
    expect(deserialise('{"saveVersion":3}').status).toBe('corrupt');
  });

  it('refuses a save from a newer version', () => {
    expect(deserialise(JSON.stringify({ saveVersion: SAVE_VERSION + 1, world: {} })).status).toBe('outdated');
  });

  it('fills in optional fields for older saves', () => {
    const text = JSON.stringify({
      saveVersion: SAVE_VERSION,
      world: { seed: 1, turn: 2, night: 1, roomId: 'common', silver: 3, nerve: 4, rooms: {}, npcs: {}, items: {} },
    });
    const result = deserialise(text);
    expect(result.status).toBe('ok');
    expect(result.world?.known).toEqual([]);
    expect(result.world?.flags).toEqual({});
  });

  it('saves and loads through storage', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    };
    const world = play(playingWorld(), 'ask about the dog').world;
    expect(saveGame(storage, world, new Date(0))).toBe(true);
    expect(loadGame(storage).world).toEqual(world);
    clearSave(storage);
    expect(loadGame(storage).status).toBe('missing');
  });

  it('reports failure when storage throws', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    expect(saveGame(storage, playingWorld(), new Date(0))).toBe(false);
  });
});

describe('progressOf', () => {
  it('is zero at the start', () => {
    expect(progressOf(playingWorld())).toBe(0);
  });

  it('is one at the win state', () => {
    expect(progressOf({ ...playingWorld(), night: 99, silver: 99 })).toBe(1);
  });

  it('never leaves the unit range', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const value = progressOf({ ...playingWorld(seed), night: seed, silver: seed * 3 });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('engine and narrator agree on the format', () => {
  const inputs = [
    'look around',
    'ask about the dog',
    'ask about the price',
    'ask about the woodshed',
    'attack the dog',
    'offer the innkeeper two silver',
    'go down',
    'take the spoon',
    'drink',
    'wait',
    'inventory',
    'nothing at all happens here',
  ];

  for (const input of inputs) {
    it(`keeps the template narrator inside the format gate for ${JSON.stringify(input)}`, () => {
      let state: GameState = { world: playingWorld(11), last: null, status: 'playing' };
      state = play(state.world, input);
      const brief = briefFrom(state.world, state.last!);
      const text = narrateTemplate(brief);
      const metrics = analyse(text);
      expect(`${input}: ${metrics.failures.join(',')}`).toBe(`${input}: `);
    });
  }

  it('produces a prompt that contains every fact', () => {
    const state = play(playingWorld(), 'ask about the dog');
    const brief = briefFrom(state.world, state.last!);
    const user = buildMessages(brief)[1]?.content ?? '';
    for (const fact of brief.facts) expect(user).toContain(fact);
  });
});

describe('the engine never lets the model contradict it', () => {
  it('applies effects before the narrator is ever called', () => {
    const state = play(playingWorld(), 'take the spoon');
    expect(state.world.items['spoon_key']?.roomId).toBeNull();
    expect(state.last?.facts.join(' ')).toContain('bent spoon');
  });

  it('keeps facts consistent with the resulting state', () => {
    let state: GameState = { world: playingWorld(3), last: null, status: 'playing' };
    state = play(state.world, 'take the spoon');
    state = play(state.world, 'inventory');
    expect(state.last?.facts.join(' ')).toContain('bent spoon');
  });

  it('never reports silver the player does not have', () => {
    let state: GameState = { world: playingWorld(5), last: null, status: 'playing' };
    for (let i = 0; i < 20; i += 1) {
      state = play(state.world, 'offer the innkeeper two silver');
      expect(state.world.silver).toBeGreaterThanOrEqual(0);
    }
  });
});