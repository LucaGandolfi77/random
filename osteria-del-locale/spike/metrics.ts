export interface TextMetrics {
  chars: number;
  sentences: number;
  repetitionIndex: number;
  hasMarkdown: boolean;
  mentionsSystem: boolean;
  metaTalk: boolean;
  empty: boolean;
  tooLong: boolean;
  sentenceCountOk: boolean;
  failures: string[];
  pass: boolean;
}

const SYSTEM_WORDS = /\b(dice|die|rolled|rolls?|stats?|experience|xp|player|narrator|prompt|game|turn|system|token)\b/i;
const META_TALK = /\b(you can|you could|you should|would you like|choose (an|a) option|what do you do|let me know|please try again)\b/i;
const MARKDOWN = /[*#`_]|\[[^\]]*\]\([^)]*\)|^\s*[-*\d]\.\s/m;

export function countSentences(text: string): number {
  const matches = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g);
  if (matches === null) return 0;
  return matches.map((part) => part.trim()).filter((part) => part.length > 0).length;
}

export function repetitionIndex(text: string, n = 4): number {
  const words = text.toLowerCase().split(/[^a-z0-9']+/).filter((word) => word.length > 0);
  if (words.length < n) return 0;
  const seen = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i += 1) {
    const gram = words.slice(i, i + n).join(' ');
    seen.set(gram, (seen.get(gram) ?? 0) + 1);
  }
  const total = words.length - n + 1;
  let repeated = 0;
  for (const count of seen.values()) {
    if (count > 1) repeated += count - 1;
  }
  return repeated / total;
}

export function analyse(text: string): TextMetrics {
  const trimmed = text.trim();
  const sentences = countSentences(trimmed);
  const repetition = repetitionIndex(trimmed);
  const hasMarkdown = MARKDOWN.test(trimmed);
  const mentionsSystem = SYSTEM_WORDS.test(trimmed);
  const metaTalk = META_TALK.test(trimmed);
  const empty = trimmed.length < 20;
  const tooLong = trimmed.length > 900;
  const sentenceCountOk = sentences >= 2 && sentences <= 4;

  const failures: string[] = [];
  if (empty) failures.push('empty');
  if (!sentenceCountOk) failures.push(`sentences=${sentences}`);
  if (hasMarkdown) failures.push('markdown');
  if (mentionsSystem) failures.push('system-language');
  if (metaTalk) failures.push('meta-talk');
  if (repetition > 0.25) failures.push(`repetition=${repetition.toFixed(2)}`);
  if (tooLong) failures.push('too-long');

  return {
    chars: trimmed.length,
    sentences,
    repetitionIndex: repetition,
    hasMarkdown,
    mentionsSystem,
    metaTalk,
    empty,
    tooLong,
    sentenceCountOk,
    failures,
    pass: failures.length === 0,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}