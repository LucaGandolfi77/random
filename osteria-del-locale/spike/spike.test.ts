import { describe, expect, it } from 'vitest';
import { analyse, countSentences, formatBytes, repetitionIndex } from './metrics';
import { narrateTemplate } from '../src/narrator/template';
import { SYSTEM_PROMPT, buildUserMessage } from '../src/narrator/prompt';
import { CASES, type BenchCase } from './cases';

function caseAt(index: number): BenchCase {
  const found = CASES[index];
  if (found === undefined) throw new Error(`no bench case at index ${index}`);
  return found;
}

describe('countSentences', () => {
  it('counts terminated sentences', () => {
    expect(countSentences('One. Two. Three.')).toBe(3);
  });

  it('counts an unterminated tail', () => {
    expect(countSentences('One. Two. Three')).toBe(3);
  });

  it('ignores empty fragments', () => {
    expect(countSentences('   ')).toBe(0);
    expect(countSentences('')).toBe(0);
  });

  it('treats an ellipsis as one sentence', () => {
    expect(countSentences('  ...  ')).toBe(1);
  });

  it('handles question and exclamation marks', () => {
    expect(countSentences('Is it? Yes! No.')).toBe(3);
  });
});

describe('repetitionIndex', () => {
  it('is zero for text with no repeated n-grams', () => {
    expect(repetitionIndex('the quick brown fox jumps over the lazy dog again')).toBe(0);
  });

  it('is high for looping text', () => {
    const loop = 'you wait and wait and wait and wait and wait and wait and wait';
    expect(repetitionIndex(loop)).toBeGreaterThan(0.4);
  });

  it('is zero when there are fewer words than the n-gram size', () => {
    expect(repetitionIndex('too short')).toBe(0);
  });
});

describe('analyse', () => {
  it('passes a clean deadpan paragraph', () => {
    const text =
      'The innkeeper counts three silver into your palm one coin at a time, then hands you a bent spoon. You climb nine steps and find a door the spoon fits perfectly. The mattress is fresh straw.';
    const result = analyse(text);
    expect(result.pass).toBe(true);
    expect(result.sentences).toBe(3);
    expect(result.failures).toEqual([]);
  });

  it('flags a single sentence', () => {
    expect(analyse('Nothing happens at all here.').sentenceCountOk).toBe(false);
  });

  it('flags too many sentences', () => {
    const text = 'One. Two. Three. Four. Five. Six.';
    expect(analyse(text).sentenceCountOk).toBe(false);
  });

  it('flags system language', () => {
    const result = analyse('You rolled a 4. The dog is unharmed. The dog sat down.');
    expect(result.mentionsSystem).toBe(true);
    expect(result.pass).toBe(false);
  });

  it('flags markdown', () => {
    const result = analyse('The fire is **out**. The room is cold. Nobody says anything.');
    expect(result.hasMarkdown).toBe(true);
  });

  it('flags meta talk', () => {
    const result = analyse('You can attack the dog. You could also leave. What do you do?');
    expect(result.metaTalk).toBe(true);
  });

  it('flags empty output', () => {
    expect(analyse('   ').empty).toBe(true);
  });

  it('does not flag ordinary words containing digits as system language', () => {
    const result = analyse('You climb nine stairs. The key is a spoon. The dog waits.');
    expect(result.mentionsSystem).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats megabytes', () => {
    expect(formatBytes(460 * 1024 * 1024)).toBe('460.0 MB');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('carries both worked examples', () => {
    expect(SYSTEM_PROMPT).toContain('EXAMPLE 1');
    expect(SYSTEM_PROMPT).toContain('EXAMPLE 2');
  });

  it('states the sentence cap', () => {
    expect(SYSTEM_PROMPT).toContain('2 to 4 sentences');
  });
});

describe('buildUserMessage', () => {
  const brief = caseAt(0).brief;

  it('omits empty sections', () => {
    const message = buildUserMessage({ ...brief, history: [], present: [], action: undefined });
    expect(message).not.toContain('## HISTORY');
    expect(message).not.toContain('## PRESENT');
    expect(message).not.toContain('## ACTION');
    expect(message.trimEnd().endsWith('## WRITE')).toBe(true);
  });

  it('includes every populated section and ends with the write marker', () => {
    const message = buildUserMessage(brief);
    expect(message).toContain('## SCENE');
    expect(message).toContain('## PRESENT');
    expect(message).toContain('## ACTION');
    expect(message.trimEnd().endsWith('## WRITE')).toBe(true);
  });

  it('prefixes history lines as a list', () => {
    const message = buildUserMessage({ ...brief, history: ['first', 'second'] });
    expect(message).toContain('- first\n- second');
  });
});

describe('narrateTemplate', () => {
  it('passes the format gate for every case in the bench', () => {
    for (const benchCase of CASES) {
      const text = narrateTemplate(benchCase.brief);
      const result = analyse(text);
      expect(`${benchCase.id}: ${result.failures.join(',')}`).toBe(`${benchCase.id}: `);
    }
  });

  it('is deterministic for the same brief', () => {
    const brief = caseAt(0).brief;
    expect(narrateTemplate(brief)).toBe(narrateTemplate(brief));
  });

  it('varies across different briefs', () => {
    const first = narrateTemplate(caseAt(0).brief);
    const second = narrateTemplate(caseAt(3).brief);
    expect(first).not.toBe(second);
  });

  it('never echoes the engine account, which is the rule the model is given', () => {
    const hits: string[] = [];
    const N = 4;
    for (const benchCase of CASES) {
      const who = (benchCase.brief.present[0] ?? '').toLowerCase();
      const prose = narrateTemplate(benchCase.brief).toLowerCase();
      const words = prose.split(/\W+/).filter((word) => word.length > 0);

      for (const fact of benchCase.brief.facts) {
        const factWords = fact.toLowerCase().split(/\W+/).filter((word) => word.length > 0);
        for (let i = 0; i + N <= factWords.length; i += 1) {
          const gram = factWords.slice(i, i + N).join(' ');
          if (who.length > 0 && who.includes(gram)) continue;
          for (let j = 0; j + N <= words.length; j += 1) {
            const shared = words.slice(j, j + N).join(' ') === gram;
            if (shared) hits.push(benchCase.id + ' :: ' + gram);
          }
        }
      }
    }
    expect(hits, `narration echoed the engine account: ${hits.join(' | ')}`).toEqual([]);
  });

  it('uses two distinct frames so a turn is not one sentence', () => {
    for (const benchCase of CASES) {
      const text = narrateTemplate(benchCase.brief);
      expect(`${benchCase.id}: ${countSentences(text)}`).toBe(`${benchCase.id}: ${countSentences(text)}`);
      expect(countSentences(text)).toBeGreaterThanOrEqual(2);
    }
  });

  it('survives an empty brief', () => {
    const text = narrateTemplate({ beat: 'awkward', facts: [], present: [], history: [] });
    expect(analyse(text).empty).toBe(false);
  });
});

describe('bench cases', () => {
  it('covers every group', () => {
    const groups = new Set(CASES.map((benchCase) => benchCase.group));
    expect([...groups].sort()).toEqual(['adversarial', 'dialogue', 'entry', 'outcome', 'stress']);
  });

  it('has unique ids', () => {
    expect(new Set(CASES.map((benchCase) => benchCase.id)).size).toBe(CASES.length);
  });

  it('always declares at least one fact', () => {
    for (const benchCase of CASES) {
      expect(benchCase.brief.facts.length).toBeGreaterThan(0);
    }
  });
});