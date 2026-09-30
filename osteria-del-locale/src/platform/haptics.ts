type Pattern = number | number[];

const SUPPORTED = new Set(['inverted', 'chaos', 'deal', 'refused', 'discovery', 'danger', 'awkward']);

const PATTERNS: Record<string, Pattern> = {
  deal: [12],
  refused: [18, 40, 60],
  discovery: [8, 12],
  inverted: [30, 60, 90],
  danger: [40],
  awkward: [10],
};

export type HapticKind = keyof typeof PATTERNS;

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(kind: HapticKind): boolean {
  if (!canVibrate()) return false;
  const pattern = PATTERNS[kind];
  if (pattern === undefined) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function hapticForBeat(beat: string): HapticKind {
  return SUPPORTED.has(beat) ? (beat as HapticKind) : 'awkward';
}