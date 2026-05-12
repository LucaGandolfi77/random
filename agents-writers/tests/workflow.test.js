import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildChapterBaseInput,
  buildFallbackWriterDraft,
  buildForcedReviewBundle,
  resolveNextChapterNumber,
  resolveRemainingChapterCount,
  resolveTargetChapterCount,
  shouldStopBookGenerationGracefully,
  shouldCreateBookForWrite,
  shouldRequestRevision
} from '../src/lib/workflow.js';

async function makeTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'workflow-progress-'));
}

test('shouldRequestRevision ignores non-blocking critic revise votes after approval passes', () => {
  const critic = {
    verdict: 'revise',
    issues: [{ severity: 'high' }]
  };
  const continuity = { pass: true };
  const votes = {
    summary: {
      approved: true,
      averageScore: 0.76
    }
  };
  const approval = {
    critic_max_high_issues: 1,
    continuity_must_pass: true
  };

  assert.equal(shouldRequestRevision(critic, continuity, votes, approval), false);
});

test('shouldRequestRevision still blocks when approval thresholds fail', () => {
  const critic = {
    verdict: 'approve',
    issues: [{ severity: 'high' }, { severity: 'high' }]
  };
  const continuity = { pass: true };
  const votes = {
    summary: {
      approved: true,
      averageScore: 0.8
    }
  };
  const approval = {
    critic_max_high_issues: 1,
    continuity_must_pass: true
  };

  assert.equal(shouldRequestRevision(critic, continuity, votes, approval), true);
});

test('resolveNextChapterNumber resumes from persisted chapter progress when timeline is stale', async () => {
  const tempRoot = await makeTempRoot();

  try {
    await fs.mkdir(path.join(tempRoot, 'memory', 'books', 'book-16'), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, 'memory', 'books', 'book-16', 'generation_state.json'),
      `${JSON.stringify({ lastPersistedChapter: 2, lastCompletedChapter: 1 }, null, 2)}\n`,
      'utf8'
    );

    const nextChapter = await resolveNextChapterNumber(tempRoot, 'book-16', { chapters: [] });

    assert.equal(nextChapter, 3);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('resolveNextChapterNumber respects explicit startChapter overrides', async () => {
  const nextChapter = await resolveNextChapterNumber('/tmp/unused-root', 'book-16', {
    chapters: [{ chapter: 4 }]
  }, 2);

  assert.equal(nextChapter, 2);
});

test('buildChapterBaseInput excludes bulky series continuity payloads from chapter agents', () => {
  const state = {
    bookBible: {
      title: 'Book 17',
      premise: 'Test premise'
    },
    timeline: {
      chapters: [{ chapter: 1, title: 'Pilot' }],
      events: [{ chapter: 1, summary: 'Pilot event' }]
    },
    styleGuide: {
      voice: 'lyrical but readable'
    },
    outlineMemory: {
      chapter_outlines: [],
      story_arc: {},
      active_arcs: [],
      next_targets: [],
      arc_metrics: {}
    },
    effectiveAgents: {
      agents: {
        architect: {
          role: 'Story Architect',
          persona: 'Strategist',
          private_agenda: 'Escalate',
          rivalries: ['critic']
        },
        critic: {
          role: 'Adversarial Critic',
          persona: 'Professor',
          private_agenda: 'Break weak drafts',
          rivalries: []
        }
      }
    },
    allSeriesBooks: new Array(20).fill(null),
    seriesContinuity: {
      issues: new Array(70).fill({ severity: 'low', message: 'continuity issue' })
    }
  };

  const input = buildChapterBaseInput(state, 2, {
    idea: 'Escalate the conflict',
    notes: 'Prefer stronger consequences',
    length: 'short chapter'
  });

  assert.equal(input.USER_INTENT.chapter, 2);
  assert.equal(input.LAST_CHAPTER.chapter, 1);
  assert.ok(!('SERIES_BOOKS' in input));
  assert.ok(!('SERIES_CONTINUITY' in input));
});

test('buildFallbackWriterDraft synthesizes a usable chapter draft from planner beats', () => {
  const draft = buildFallbackWriterDraft(1, {
    chapter_title: 'The Veil\'s First Whisper',
    chapter_hook: 'Elisa paints the first wall and pays for it.',
    arc_payoffs: ['Elisa learns the cost of the first stroke.'],
    next_chapter_seed: ['Elisa must decide whether to paint again.'],
    cliffhanger: 'The chorus begins rewriting the orchard.',
    scene_cards: [{
      scene: 1,
      goal: 'Elisa finds the shard.',
      conflict: 'The shard pulls at her grief.',
      turn: 'She decides to paint the wall.',
      image: 'A silver ribbon of ink unfurls into the courtyard.'
    }]
  }, {
    chapter_goal: 'Introduce the living veil.',
    next_arc_targets: ['The chorus demands a forgotten word.']
  }, {
    emotional_targets: ['grief', 'ambition']
  }, new Error('writer timeout'));

  assert.equal(draft.chapter_title, 'The Veil\'s First Whisper');
  assert.match(draft.draft_markdown, /Scene 1/);
  assert.match(draft.draft_markdown, /Conflict: The shard pulls at her grief/);
  assert.deepEqual(draft.unresolved_threads, [
    'Elisa must decide whether to paint again.',
    'The chorus demands a forgotten word.'
  ]);
  assert.equal(draft._meta.forced, true);
});

test('buildForcedReviewBundle preserves the draft and forces approval when review fails', () => {
  const bundle = buildForcedReviewBundle({
    chapter_title: 'Forced Chapter',
    summary: 'Fallback summary',
    draft_markdown: 'Fallback draft body',
    unresolved_threads: ['Keep going']
  }, {
    chapter_title: 'Planner Title',
    next_chapter_seed: ['Seed thread']
  }, new Error('editor failed'), {
    critic: {
      verdict: 'approve',
      issues: []
    }
  });

  assert.equal(bundle.critic.verdict, 'approve');
  assert.equal(bundle.continuity.pass, true);
  assert.equal(bundle.editor.final_markdown, 'Fallback draft body');
  assert.equal(bundle.votes.summary.approved, true);
  assert.equal(bundle.votes.summary.forced, true);
  assert.match(bundle.votes.summary.reason, /editor failed/);
});

test('write-book defaults to resuming the active book unless a new book is explicitly requested', () => {
  assert.equal(shouldCreateBookForWrite({}), false);
  assert.equal(shouldCreateBookForWrite({ newBook: true }), true);
  assert.equal(shouldCreateBookForWrite({ title: 'Fresh title' }), true);
});

test('resolveTargetChapterCount reuses the saved target when no explicit count is provided', () => {
  assert.equal(resolveTargetChapterCount({}, { targetChapterCount: 12 }, 3), 12);
  assert.equal(resolveTargetChapterCount({ count: 5 }, { targetChapterCount: 12 }, 3), 5);
  assert.equal(resolveTargetChapterCount({}, null, 3), 3);
});

test('resolveRemainingChapterCount keeps count as a total target during resume', () => {
  assert.equal(resolveRemainingChapterCount(2, 20), 19);
  assert.equal(resolveRemainingChapterCount(21, 20), 0);
});

test('shouldStopBookGenerationGracefully treats OpenRouter runtime failures as non-fatal stops', () => {
  assert.equal(shouldStopBookGenerationGracefully(new Error('OpenRouter request timed out after 500s for model openai/gpt-oss-120b:free.')), true);
  assert.equal(shouldStopBookGenerationGracefully(new Error('OpenRouter request failed for openai/gpt-oss-120b:free: No endpoints found.')), true);
  assert.equal(shouldStopBookGenerationGracefully(new Error('Could not parse JSON from model response:\nnot json at all')), true);
});

test('shouldStopBookGenerationGracefully keeps configuration failures fatal', () => {
  assert.equal(shouldStopBookGenerationGracefully(new Error('Missing OPENROUTER_API_KEY. Copy .env.example to .env and set a real key.')), false);
});