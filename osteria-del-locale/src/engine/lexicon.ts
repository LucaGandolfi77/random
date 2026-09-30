import type { IntentKind } from './types';

export const VERBS: Record<IntentKind, readonly string[]> = {
  go: ['go', 'walk', 'head', 'move', 'enter', 'climb', 'descend', 'travel', 'run', 'leave for'],
  look: ['look', 'examine', 'inspect', 'look at', 'study', 'watch', 'read', 'check'],
  ask: ['ask', 'question', 'query', 'inquire', 'enquire', 'interrogate'],
  take: ['take', 'grab', 'pick up', 'steal', 'pocket', 'lift', 'collect', 'acquire'],
  offer: ['offer', 'bribe', 'pay', 'give', 'hand', 'tip', 'buy'],
  drink: ['drink', 'quaff', 'swallow', 'down', 'sip'],
  attack: ['attack', 'hit', 'strike', 'swing', 'punch', 'kick', 'attack the'],
  rest: ['rest', 'sleep', 'wait until morning', 'turn in', 'doze', 'sit'],
  wait: ['wait', 'listen', 'stand', 'linger', 'hold'],
  inventory: ['inventory', 'inv', 'pockets', 'i'],
  leave: ['leave', 'quit', 'escape', 'flee', 'run away', 'go home'],
};

export const DIRECTION_WORDS: Record<string, 'north' | 'south' | 'up' | 'down' | 'in' | 'out'> = {
  north: 'north',
  n: 'north',
  south: 'south',
  s: 'south',
  upstairs: 'up',
  up: 'up',
  above: 'up',
  top: 'up',
  downstairs: 'down',
  down: 'down',
  below: 'down',
  bottom: 'down',
  inside: 'in',
  in: 'in',
  into: 'in',
  outside: 'out',
  out: 'out',
  leave: 'out',
};

export const AMOUNT_WORDS: Record<string, number> = {
  one: 1,
  a: 1,
  an: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export const TARGET_HINTS: Record<string, string[]> = {
  dog: ['dog', 'hound', 'mutt'],
  innkeeper: ['innkeeper', 'owner', 'fettle', 'landlord', 'host'],
  regular: ['regular', 'drunk', 'man', 'patron'],
  barkeep: ['barkeep', 'tender'],
  cellar: ['cellar', 'basement', 'underneath'],
  common: ['common', 'room', 'bar', 'floor'],
  kitchen: ['kitchen', 'scullery'],
  landing: ['landing', 'hall', 'stairs'],
  upstairs: ['upstairs', 'attic'],
  woodshed: ['woodshed', 'shed'],
  dogName: ['legal'],
  sergeant: ['malk', 'sergeant'],
};

export const FILLER = new Set([
  'the',
  'a',
  'an',
  'to',
  'at',
  'for',
  'with',
  'my',
  'your',
  'i',
  'please',
  'want',
  'would',
  'like',
  'try',
  'let',
  'now',
  'then',
  'just',
  'and',
]);

export const TOPIC_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'about',
  'on',
  'of',
  'is',
  'are',
  'was',
  'do',
  'does',
  'you',
  'i',
  'me',
  'he',
  'she',
  'it',
  'tell',
  'please',
]);

export function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  return normalise(input).split(' ').filter((token) => token.length > 0);
}