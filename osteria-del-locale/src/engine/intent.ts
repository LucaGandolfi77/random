import { AMOUNT_WORDS, DIRECTION_WORDS, FILLER, TOPIC_STOPWORDS, VERBS, normalise, tokenize } from './lexicon';
import type { Direction, Intent, IntentKind } from './types';

interface VerbHit {
  kind: IntentKind;
  index: number;
  length: number;
}

const INTENT_PRIORITY: IntentKind[] = [
  'inventory',
  'leave',
  'offer',
  'take',
  'attack',
  'rest',
  'ask',
  'drink',
  'look',
  'wait',
  'go',
];

function matchVerbs(tokens: string[]): VerbHit[] {
  const hits: VerbHit[] = [];

  for (const kind of INTENT_PRIORITY) {
    for (const verb of VERBS[kind]) {
      const phrase = verb.split(' ');
      if (phrase.length === 1) continue;

      for (let start = 0; start + phrase.length <= tokens.length; start += 1) {
        const slice = tokens.slice(start, start + phrase.length).join(' ');
        if (slice === verb) hits.push({ kind, index: start, length: phrase.length });
      }
    }
  }

  for (const kind of INTENT_PRIORITY) {
    for (const verb of VERBS[kind]) {
      const index = tokens.indexOf(verb);
      if (index >= 0) hits.push({ kind, index, length: 1 });
    }
  }

  return hits;
}

function extractAmount(text: string): number | null {
  const numeric = text.match(/\b(\d+)\b/);
  if (numeric !== null) return Number(numeric[1]);

  for (const [word, value] of Object.entries(AMOUNT_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

function stripAmount(tokens: readonly string[]): string[] {
  return tokens.filter((token) => AMOUNT_WORDS[token] === undefined && token !== 'silver' && token !== 'coin' && token !== 'coins' && token !== 'gold');
}

function extractDirection(tokens: readonly string[], raw: string): Direction | null {
  for (const token of tokens) {
    const mapped = DIRECTION_WORDS[token];
    if (mapped !== undefined) return mapped;
  }
  for (const [word, mapped] of Object.entries(DIRECTION_WORDS)) {
    if (word.length > 2 && raw.includes(word)) return mapped;
  }
  return null;
}

function cleanTarget(tokens: readonly string[]): string | null {
  const kept = stripAmount(tokens).filter((token) => !FILLER.has(token));
  const joined = kept.join(' ').trim();
  return joined.length > 0 ? joined : null;
}

function extractTopic(tokens: readonly string[], startIndex: number, length: number): string | null {
  const tail = stripAmount(tokens.slice(startIndex + length));
  const kept = tail.filter((token) => !FILLER.has(token) && !TOPIC_STOPWORDS.has(token));
  const joined = kept.join(' ').trim();
  return joined.length > 0 ? joined : null;
}

const DIRECTION_PHRASES: Record<string, string> = {
  up: 'upstairs',
  down: 'downstairs',
  north: 'north',
  south: 'south',
  in: 'inside',
  out: 'outside',
};

function isDirection(value: string | null): value is Direction {
  return value !== null && Object.prototype.hasOwnProperty.call(DIRECTION_PHRASES, value);
}

export function parseIntent(input: string): Intent {
  const tokens = tokenize(input);
  const raw = normalise(input);
  const amount = extractAmount(raw);
  const hits = matchVerbs(tokens);

  if (hits.length === 0) {
    return { kind: 'wait', target: null, amount: null, raw, confidence: 0.2 };
  }

  const earliest = hits.reduce((best, hit) => (hit.index < best.index ? hit : best));

  if (tokens.length === 1 && (earliest.kind === 'wait' || earliest.kind === 'rest')) {
    return { kind: earliest.kind, target: null, amount: null, raw, confidence: 0.9 };
  }

  if (earliest.kind === 'inventory') {
    return { kind: 'inventory', target: null, amount: null, raw, confidence: 0.95 };
  }

  if (earliest.kind === 'ask') {
    const target = extractTopic(tokens, earliest.index, earliest.length);
    return { kind: 'ask', target, amount: null, raw, confidence: target === null ? 0.5 : 0.8 };
  }

  if (earliest.kind === 'leave') {
    const saysGoodbye = /(here|away|home|for good|inn|room|place|town)/.test(raw);
    return { kind: 'leave', target: null, amount: null, raw, confidence: saysGoodbye ? 0.85 : 0.8 };
  }

  if (earliest.kind === 'go') {
    const direction = extractDirection(tokens, raw);
    if (direction !== null) {
      return { kind: 'go', target: direction, amount: null, raw, confidence: 0.9 };
    }
    const target = cleanTarget(tokens.slice(earliest.index + earliest.length));
    return { kind: 'go', target, amount: null, raw, confidence: target === null ? 0.45 : 0.7 };
  }

  const target = cleanTarget(tokens.slice(earliest.index + earliest.length));
  const carriesAmount = earliest.kind === 'offer';
  return {
    kind: earliest.kind,
    target,
    amount: carriesAmount ? amount : null,
    raw,
    confidence: target === null ? 0.55 : 0.8,
  };
}

export function describeIntent(intent: Intent): string {
  if (intent.kind === 'ask') {
    return intent.target === null ? 'ask about nothing in particular' : `ask about ${intent.target}`;
  }
  if (intent.kind === 'go') {
    if (intent.target === null) return 'go nowhere in particular';
    const phrase = isDirection(intent.target) ? DIRECTION_PHRASES[intent.target] : intent.target;
    return `go ${phrase}`;
  }
  if (intent.kind === 'offer') {
    const amount = intent.amount === null ? 'nothing' : `${intent.amount} silver`;
    return intent.target === null ? `offer ${amount}` : `offer ${amount} to ${intent.target}`;
  }
  if (intent.target === null) return intent.kind;
  return `${intent.kind} ${intent.target}`;
}