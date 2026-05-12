import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildFastCharacterMaster,
  buildFastPlannerArtifacts,
  buildChapterBaseInput,
  buildFallbackWriterDraft,
  buildForcedReviewBundle,
  buildSkippedReviewBundle,
  resolveNextChapterNumber,
  resolveRemainingChapterCount,
  resolveTargetChapterCount,
  shouldStopBookGenerationGracefully,
  shouldCreateBookForWrite,
  shouldUseDeepReview,
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

test('shouldRequestRevision ignores continuity and vote placeholders in the slim deep-review path', () => {
  const critic = {
    verdict: 'approve',
    issues: [{ severity: 'medium' }]
  };
  const continuity = { pass: false };
  const votes = {
    summary: {
      approved: false,
      averageScore: 0.2
    }
  };
  const approval = {
    critic_max_high_issues: 1,
    continuity_must_pass: true
  };

  assert.equal(shouldRequestRevision(critic, continuity, votes, approval), false);
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

test('buildChapterBaseInput compresses book bible, timeline, and style guide context windows', () => {
  const state = {
    bookBible: {
      title: 'Book 18',
      genre: 'dark fantasy',
      premise: 'Test premise',
      themes: Array.from({ length: 10 }, (_, index) => `theme-${index + 1}`),
      world_rules: Array.from({ length: 12 }, (_, index) => `rule-${index + 1}`),
      characters: Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `Character-${index + 1}`,
          {
            role: 'support',
            wound: `wound-${index + 1}`,
            arc: `arc-${index + 1}`,
            secrets: [`secret-a-${index + 1}`, `secret-b-${index + 1}`, `secret-c-${index + 1}`, `secret-d-${index + 1}`]
          }
        ])
      ),
      chapter_registry: Array.from({ length: 7 }, (_, index) => ({
        chapter: index + 1,
        title: `Chapter ${index + 1}`,
        summary: `Summary ${index + 1}`,
        unresolved_threads: [`thread-${index + 1}`],
        arc_targets: [`arc-${index + 1}`],
        next_arc_targets: [`next-${index + 1}`],
        vote_summary: { approved: true }
      }))
    },
    timeline: {
      chapters: Array.from({ length: 8 }, (_, index) => ({
        chapter: index + 1,
        title: `Timeline Chapter ${index + 1}`,
        summary: `Timeline Summary ${index + 1}`,
        unresolved_threads: [`timeline-thread-${index + 1}`],
        arc_targets: [`timeline-arc-${index + 1}`],
        next_arc_targets: [`timeline-next-${index + 1}`],
        createdAt: `2026-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
      })),
      events: Array.from({ length: 20 }, (_, index) => `event-${index + 1}`)
    },
    styleGuide: {
      voice: 'lyrical but readable',
      recent_adjustments: Array.from({ length: 20 }, (_, index) => `adjustment-${index + 1}`)
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
    }
  };

  const input = buildChapterBaseInput(state, 9, {
    idea: 'Escalate the conflict',
    notes: 'Prefer stronger consequences',
    length: 'short chapter'
  });

  assert.equal(input.BOOK_BIBLE.themes.length, 6);
  assert.equal(input.BOOK_BIBLE.world_rules.length, 8);
  assert.equal(Object.keys(input.BOOK_BIBLE.characters).length, 8);
  assert.equal(input.BOOK_BIBLE.chapter_registry.length, 4);
  assert.equal(input.BOOK_BIBLE.chapter_registry[0].chapter, 4);
  assert.equal('vote_summary' in input.BOOK_BIBLE.chapter_registry[0], false);
  assert.equal(input.BOOK_BIBLE._meta.totalChapterRegistry, 7);
  assert.equal(input.TIMELINE.chapters.length, 5);
  assert.equal(input.TIMELINE.chapters[0].chapter, 4);
  assert.equal('createdAt' in input.TIMELINE.chapters[0], false);
  assert.equal(input.TIMELINE.events.length, 12);
  assert.equal(input.TIMELINE.events[0], 'event-9');
  assert.equal(input.TIMELINE._meta.totalEvents, 20);
  assert.equal(input.STYLE_GUIDE.recent_adjustments.length, 12);
  assert.equal(input.STYLE_GUIDE.recent_adjustments[0], 'adjustment-9');
  assert.equal(input.LAST_CHAPTER.chapter, 8);
});

test('shouldUseDeepReview stays opt-in for the slower full review pipeline', () => {
  assert.equal(shouldUseDeepReview({}), false);
  assert.equal(shouldUseDeepReview({ deepReview: true }), true);
  assert.equal(shouldUseDeepReview({ reviewMode: 'deep' }), true);
});

test('buildFastCharacterMaster synthesizes usable character pressure from book bible and architect notes', () => {
  const proposal = buildFastCharacterMaster({
    themes: ['grief', 'ambition'],
    characters: {
      Elisa: {
        role: 'heir',
        wound: 'mother\'s disappearance',
        arc: 'control to surrender',
        secrets: ['She caused the orchard fire.']
      }
    }
  }, {
    chapter_goal: 'Force Elisa to choose between power and memory.',
    theme_progress: 'grief turns into appetite for control',
    arc_targets: ['Escalate the cost of using the veil.'],
    constraints: ['Do not let Elisa feel safe for long.'],
    risks: ['The cost mechanic could feel abstract without personal consequence.'],
    recommended_beats: ['Make the choice irreversible.']
  });

  assert.equal(proposal.handoff_for, 'chapter_planner');
  assert.equal(proposal._meta.synthetic, true);
  assert.equal(proposal.character_notes[0].name, 'Elisa');
  assert.match(proposal.dialogue_instructions[0], /Elisa/);
  assert.match(proposal.character_notes[0].secret_pressure, /orchard fire/);
  assert.match(proposal.conflict_upgrades.join(' '), /irreversible|cost/);
});

test('buildFastPlannerArtifacts splits a merged planner response into architect and chapter planner payloads', () => {
  const artifacts = buildFastPlannerArtifacts({
    chapter_goal: 'Force Elisa to spend a memory to cross the veil.',
    theme_progress: 'ambition starts to outrun grief',
    arc_targets: ['Escalate the price of using the veil.'],
    next_arc_targets: ['Show the chorus learning Elisa\'s voice.'],
    recommended_beats: ['Make the public cost visible.'],
    constraints: ['Do not let the crossing feel easy.'],
    outline_notes: ['The veil should feel hungry, not passive.'],
    risks: ['Too much explanation will flatten the dread.'],
    chapter_title: 'The Crossing Tax',
    chapter_hook: 'Elisa reaches the veil gate as the oath collapses.',
    arc_payoffs: ['Elisa loses a cherished memory to gain access.'],
    next_chapter_seed: ['The chorus repeats Elisa\'s missing word.'],
    scene_cards: [{
      scene: 1,
      goal: 'Cross the veil gate.',
      conflict: 'The gate demands a memory in public.',
      turn: 'Elisa pays and hears the chorus imitate her.',
      image: 'Ink frost climbs the oath-stone.'
    }],
    cliffhanger: 'The missing word returns in the chorus mouth.',
    outline_memory_updates: ['Record the public cost of the crossing.'],
    _meta: {
      agent: 'chapter_planner',
      model: 'openai/gpt-oss-20b:free'
    }
  }, 3, {
    idea: 'Push Elisa through the veil gate.'
  });

  assert.equal(artifacts.architect.chapter_goal, 'Force Elisa to spend a memory to cross the veil.');
  assert.equal(artifacts.architect._meta.synthetic, true);
  assert.equal(artifacts.architect._meta.sourceAgent, 'chapter_planner');
  assert.equal(artifacts.chapterPlanner.chapter_title, 'The Crossing Tax');
  assert.equal(artifacts.chapterPlanner.scene_cards[0].scene, 1);
  assert.match(artifacts.chapterPlanner.cliffhanger, /missing word/);
  assert.match(artifacts.chapterPlanner.outline_memory_updates.join(' '), /public cost|hungry/);
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

test('buildSkippedReviewBundle keeps the draft intact without marking a forced completion', () => {
  const bundle = buildSkippedReviewBundle({
    chapter_title: 'Fast Chapter',
    summary: 'Fast summary',
    draft_markdown: 'Fast draft body',
    unresolved_threads: ['Next thread']
  }, {
    chapter_title: 'Planner Title',
    next_chapter_seed: ['Seed thread']
  });

  assert.equal(bundle.critic.verdict, 'approve');
  assert.equal(bundle.continuity.pass, true);
  assert.equal(bundle.editor.final_markdown, 'Fast draft body');
  assert.equal(bundle.votes.summary.approved, true);
  assert.equal(bundle.votes.summary.skipped, true);
  assert.equal('forced' in bundle.votes.summary, false);
});

test('buildSkippedReviewBundle preserves existing critic and editor when used as a deep-review placeholder', () => {
  const critic = {
    verdict: 'revise',
    issues: [{ severity: 'high', problem: 'stakes too soft' }]
  };
  const editor = {
    chapter_title: 'Edited Chapter',
    final_markdown: 'Edited draft body',
    final_summary: 'Edited summary',
    unresolved_threads: ['Thread A'],
    memory_updates: {
      timeline_events: [],
      style_adjustments: []
    }
  };

  const bundle = buildSkippedReviewBundle({
    chapter_title: 'Writer Chapter',
    summary: 'Writer summary',
    draft_markdown: 'Writer draft body',
    unresolved_threads: ['Writer thread']
  }, {
    chapter_title: 'Planner Title'
  }, 'Deep review now runs critic and editor only.', {
    critic,
    editor
  });

  assert.equal(bundle.critic, critic);
  assert.equal(bundle.editor, editor);
  assert.equal(bundle.continuity.pass, true);
  assert.equal(bundle.votes.summary.skipped, true);
  assert.match(bundle.votes.summary.reason, /critic and editor only/);
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