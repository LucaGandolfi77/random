import fs from 'node:fs/promises';
import path from 'node:path';

import { recordActionLog, withActionLog } from './action-log.js';
import { callOpenRouter } from './openrouter.js';
import { emitProgress } from './progress.js';
import {
  analyzeSeriesContinuity,
  createSeriesBook,
  loadAllSeriesBooks,
  loadSeriesBundle,
  saveSeriesBundle,
  selectActiveBook
} from './series-memory.js';
import {
  appendUniqueStrings,
  deepMerge,
  loadEnv,
  padChapter,
  parseScalarValue,
  readJson,
  readText,
  setNestedValue,
  writeJson,
  writeText
} from './utils.js';

const CONFIG_DIR = 'config';
const MEMORY_DIR = 'memory';
const PROMPTS_DIR = 'prompts';
const CHAPTERS_DIR = 'chapters';
const GENERATION_STATE_FILE = 'generation_state.json';
const VOTE_PROMPT_FILE = 'vote.txt';

function hasUsableOpenRouterKey(value) {
  const normalized = String(value ?? '').trim();
  return Boolean(normalized) && normalized !== 'your_openrouter_api_key_here' && normalized.startsWith('sk-or-');
}

export async function initBook(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'init-book',
    input: { options }
  }, async () => {
    const state = await loadState(rootPath);
    const themes = normalizeThemesInput(options.theme ?? options.themes ?? state.bookBible.themes ?? []);

    const nextBookBible = {
      ...state.bookBible,
      title: options.title || state.bookBible.title || 'Untitled Project',
      genre: options.genre || state.bookBible.genre || 'speculative fiction',
      premise: options.premise || state.bookBible.premise || '',
      themes,
      exportBaseName: slugify(options.exportBaseName || state.bookBible.exportBaseName || options.title || state.bookBible.title || 'Untitled Project'),
      cover: {
        ...(state.bookBible.cover || {}),
        title: options.coverTitle || options.title || state.bookBible.cover?.title || state.bookBible.title || 'Untitled Project',
        subtitle: options.subtitle || state.bookBible.cover?.subtitle || '',
        author: options.author || state.bookBible.cover?.author || 'OpenRouter Book Agents',
        tagline: options.tagline || options.premise || state.bookBible.cover?.tagline || state.bookBible.premise || '',
        color: options.coverColor || state.bookBible.cover?.color || '#7c9cff'
      },
      world_rules: state.bookBible.world_rules || [],
      characters: state.bookBible.characters || {},
      chapter_registry: state.bookBible.chapter_registry || []
    };

    const nextOutlineMemory = {
      ...defaultOutlineMemory(nextBookBible),
      ...state.outlineMemory,
      story_arc: {
        ...defaultOutlineMemory(nextBookBible).story_arc,
        ...(state.outlineMemory.story_arc || {})
      }
    };

    await saveStateBundle(rootPath, state, {
      bookBible: nextBookBible,
      timeline: state.timeline,
      styleGuide: state.styleGuide,
      outlineMemory: nextOutlineMemory
    });

    return {
      message: 'Book bible initialized.',
      activeBookId: state.activeBook.id,
      book: nextBookBible
    };
  });
}

export async function createBook(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'create-book',
    input: { options }
  }, async () => {
    const automate = shouldAutomateBookCreation(options);
    const planned = automate ? await planBookInternal(rootPath, options) : null;
    const bookOptions = planned ? mergePlannedBookOptions(planned.nextBook, options) : options;
    const defaults = buildDefaultMemorySet({ title: bookOptions.title || 'Untitled Project' });
    const seriesState = await createSeriesBook(rootPath, bookOptions, defaults);

    if (bookOptions.title || bookOptions.genre || bookOptions.premise || bookOptions.theme?.length || bookOptions.themes || bookOptions.exportBaseName || bookOptions.author || bookOptions.subtitle || bookOptions.tagline || bookOptions.coverColor) {
      await initBook(rootPath, bookOptions);
    }

    if (planned) {
      await applyPlannedBookPattern(rootPath, planned);
    }

    return {
      message: planned ? 'Created a new automated book in the series.' : 'Created a new book in the series.',
      activeBookId: seriesState.activeBookId,
      books: seriesState.books || [],
      automation: planned ? {
        agent: 'series_architect',
        pattern: planned.seriesPattern,
        nextBook: planned.nextBook
      } : null
    };
  });
}

export async function writeBook(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'write-book',
    input: { options }
  }, async () => {
    const initialState = await loadState(rootPath);
    const initialProgress = await readJson(getGenerationStatePath(rootPath, initialState.activeBook.id), null);
    const count = resolveTargetChapterCount(options, initialProgress, 20);

    if (!count || count < 1) {
      throw new Error('Provide a positive chapter count with --count <n>.');
    }

    const createFreshBook = shouldCreateBookForWrite(options);
    const creation = createFreshBook ? await createBook(rootPath, options) : null;
    const generation = await generateBook(rootPath, {
      ...options,
      count
    });
    const state = await loadState(rootPath);

    let message = `Generated ${generation.generatedCount} chapter${generation.generatedCount === 1 ? '' : 's'} for the active book.`;

    if (generation.stopped) {
      const generatedLabel = `${generation.generatedCount} chapter${generation.generatedCount === 1 ? '' : 's'}`;

      if (createFreshBook) {
        message = generation.generatedCount > 0
          ? `Created a new book and generated ${generatedLabel} before stopping at chapter ${generation.failedChapter}.`
          : `Created a new book but stopped before chapter ${generation.failedChapter} could be generated.`;
      } else {
        message = generation.generatedCount > 0
          ? `Generated ${generatedLabel} before stopping at chapter ${generation.failedChapter}.`
          : `Stopped before chapter ${generation.failedChapter} could be generated for the active book.`;
      }
    } else if (createFreshBook) {
      message = `Created a new book and generated ${generation.generatedCount} chapter${generation.generatedCount === 1 ? '' : 's'}.`;
    } else if (generation.generatedCount === 0) {
      message = `Active book already reached ${count} chapter${count === 1 ? '' : 's'}. Use --new-book to start the next book.`;
    }

    return {
      message,
      activeBookId: state.activeBook.id,
      book: {
        id: state.activeBook.id,
        title: state.bookBible.title,
        genre: state.bookBible.genre,
        premise: state.bookBible.premise || '',
        themes: state.bookBible.themes || [],
        exportBaseName: state.bookBible.exportBaseName || state.activeBook.exportBaseName || state.activeBook.slug
      },
      count,
      generatedCount: generation.generatedCount,
      chapters: generation.chapters || [],
      stopped: Boolean(generation.stopped),
      failedChapter: generation.failedChapter || null,
      stopReason: generation.stopReason || null,
      automation: creation?.automation || null
    };
  });
}

export async function planBook(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'plan-book',
    input: { options }
  }, async () => {
    const planned = await planBookInternal(rootPath, options);

    return {
      message: 'Planned the next automated book pattern.',
      automation: {
        agent: 'series_architect',
        pattern: planned.seriesPattern,
        nextBook: planned.nextBook
      }
    };
  });
}

export async function selectBook(rootPath, bookId) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'select-book',
    input: { bookId }
  }, async () => {
    const defaults = buildDefaultMemorySet();
    const seriesState = await selectActiveBook(rootPath, bookId, defaults);
    const state = await loadState(rootPath);

    return {
      message: `Active book switched to ${bookId}.`,
      activeBookId: seriesState.activeBookId,
      title: state.bookBible.title
    };
  });
}

export async function setBehavior(rootPath, agentName, key, rawValue) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'set-behavior',
    input: { agentName, key, rawValue }
  }, async () => {
    const statePath = path.join(rootPath, MEMORY_DIR, 'agent_state.json');
    const state = await readJson(statePath, { activePresets: [], overrides: { agents: {} }, notes: {} });
    const value = parseScalarValue(rawValue);

    setNestedValue(state, ['overrides', 'agents', agentName, 'behavior', key], value);
    state.notes ??= {};
    state.notes[agentName] ??= {};
    state.notes[agentName].last_override = `${key}=${JSON.stringify(value)}`;

    await writeJson(statePath, state);

    return {
      message: `Updated ${agentName}.${key}.`,
      value
    };
  });
}

export async function applyPreset(rootPath, presetName) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'apply-preset',
    input: { presetName }
  }, async () => {
    const statePath = path.join(rootPath, MEMORY_DIR, 'agent_state.json');
    const presetsPath = path.join(rootPath, CONFIG_DIR, 'presets.json');
    const state = await readJson(statePath, { activePresets: [], overrides: { agents: {} }, notes: {} });
    const presets = await readJson(presetsPath, { presets: {} });
    const preset = presets.presets?.[presetName];

    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }

    state.overrides ??= { agents: {} };
    state.overrides.agents ??= {};

    for (const [agentName, behaviorPatch] of Object.entries(preset)) {
      const currentBehavior = state.overrides.agents[agentName]?.behavior || {};
      state.overrides.agents[agentName] = {
        ...(state.overrides.agents[agentName] || {}),
        behavior: deepMerge(currentBehavior, behaviorPatch)
      };

      state.notes ??= {};
      state.notes[agentName] ??= {};
      state.notes[agentName].current_preset = presetName;
    }

    state.activePresets = appendUniqueStrings(state.activePresets, [presetName]);

    await writeJson(statePath, state);

    return {
      message: `Applied preset ${presetName}.`,
      preset: presetName
    };
  });
}

export async function getStatus(rootPath) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'get-status'
  }, async () => {
    const state = await loadState(rootPath);
    const env = await loadEnv(rootPath);
    const translations = await collectTranslationStatus(rootPath, state.timeline.chapters || []);

    return {
      activeBookId: state.activeBook.id,
      series: {
        title: state.seriesState.series?.title || 'Untitled Series',
        description: state.seriesState.series?.description || '',
        pattern: state.seriesState.series?.pattern || null,
        books: state.seriesState.books || []
      },
      title: state.bookBible.title,
      genre: state.bookBible.genre,
      environment: {
        openrouterApiKeyConfigured: hasUsableOpenRouterKey(env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY),
        openrouterAppTitleConfigured: Boolean(env.OPENROUTER_APP_TITLE || process.env.OPENROUTER_APP_TITLE)
      },
      currentBook: {
        id: state.activeBook.id,
        title: state.bookBible.title,
        genre: state.bookBible.genre,
        premise: state.bookBible.premise || '',
        themes: state.bookBible.themes || [],
        exportBaseName: state.bookBible.exportBaseName || state.activeBook.exportBaseName || state.activeBook.slug,
        cover: state.bookBible.cover || state.activeBook.cover || {}
      },
      activePresets: state.agentState.activePresets || [],
      availablePresets: Object.keys(state.presets.presets || {}),
      chaptersWritten: state.timeline.chapters?.length || 0,
      translations,
      recentChapters: (state.timeline.chapters || []).slice(-5),
      outline: {
        currentPhase: state.outlineMemory.story_arc?.current_phase || 'opening',
        activeArcs: state.outlineMemory.active_arcs || [],
        nextTargets: state.outlineMemory.next_targets || [],
        latestOutline: state.outlineMemory.chapter_outlines?.slice(-1)[0] || null,
        lastVoteSummary: state.outlineMemory.last_vote_summary || null,
        arcMetrics: ensureArcMetrics(state.outlineMemory.arc_metrics || {}, state.outlineMemory.active_arcs || [])
      },
      seriesContinuity: state.seriesContinuity,
      agents: Object.fromEntries(
        Object.entries(state.effectiveAgents.agents).map(([name, config]) => [
          name,
          {
            model: config.model,
            persona: config.persona,
            private_agenda: config.private_agenda,
            rivalries: config.rivalries || [],
            behavior: config.behavior
          }
        ])
      )
    };
  });
}

export async function generateBook(rootPath, options) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'generate-book',
    input: { options }
  }, async () => {
    const state = await loadState(rootPath);
    const progress = await readJson(getGenerationStatePath(rootPath, state.activeBook.id), null);
    const count = resolveTargetChapterCount(options, progress, 3);
    const startChapter = await resolveNextChapterNumber(rootPath, state.activeBook.id, state.timeline, options.startChapter);
    const remainingCount = resolveRemainingChapterCount(startChapter, count);

    if (!count || count < 1) {
      throw new Error('Provide a positive chapter count with --count <n>.');
    }

    await recordChapterProgress(rootPath, state.activeBook.id, {
      targetChapterCount: count
    });

    if (remainingCount === 0) {
      return {
        message: `Active book already reached ${count} chapter${count === 1 ? '' : 's'}.`,
        activeBookId: state.activeBook.id,
        startChapter,
        count,
        generatedCount: 0,
        chapters: []
      };
    }

    const results = [];
    let failedChapter = null;
    let stopReason = null;

    for (let offset = 0; offset < remainingCount; offset += 1) {
      const chapterNumber = startChapter + offset;
      const previous = results.at(-1);
      const idea = buildAutomaticIdea(options.idea || state.bookBible.premise || 'Escalate the central conflict.', chapterNumber, previous);

      try {
        const result = await generateChapter(rootPath, {
          ...options,
          chapter: chapterNumber,
          idea,
          notes: buildAutomaticNotes(options.notes || '', chapterNumber, offset)
        });

        results.push(result);
      } catch (error) {
        if (!shouldStopBookGenerationGracefully(error)) {
          throw error;
        }

        failedChapter = chapterNumber;
        stopReason = getErrorMessage(error);
        break;
      }
    }

    const stopped = Boolean(stopReason);
    const message = stopped
      ? results.length > 0
        ? `Generated ${results.length} chapter${results.length === 1 ? '' : 's'} before stopping at chapter ${failedChapter}.`
        : `Stopped before chapter ${failedChapter} could be generated.`
      : `Generated ${results.length} chapter${results.length === 1 ? '' : 's'} toward a ${count}-chapter target.`;

    return {
      message,
      activeBookId: state.activeBook.id,
      startChapter,
      count,
      generatedCount: results.length,
      chapters: results,
      stopped,
      failedChapter,
      stopReason
    };
  });
}

export async function generateChapter(rootPath, options) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'generate-chapter',
    input: { options }
  }, async () => {
    const chapter = Number(options.chapter);
    if (!chapter) {
      throw new Error('Provide a chapter number with --chapter <n>.');
    }

    const state = await loadState(rootPath);
    const env = await loadEnv(rootPath);
    const chapterId = padChapter(chapter);
    const approval = state.routing.approval || {};
    const maxRevisionRounds = Number(options.maxRevisions || approval.max_revision_rounds || 2);
    const baseInput = buildChapterBaseInput(state, chapter, options);
    const outlineSnapshot = baseInput.OUTLINE_MEMORY;

    emitProgress('chapter-start', { chapter });

    emitProgress('agent-start', { agent: 'architect', chapter });
    const architect = await runAgent(rootPath, state, env, 'architect', baseInput, options.dryRun);
    emitProgress('agent-done', { agent: 'architect', chapter });

    emitProgress('agent-start', { agent: 'character_master', chapter });
    const characterMaster = await runAgent(rootPath, state, env, 'character_master', {
      ...baseInput,
      ARCHITECT: architect
    }, options.dryRun);
    emitProgress('agent-done', { agent: 'character_master', chapter });

    emitProgress('agent-start', { agent: 'chapter_planner', chapter });
    const chapterPlanner = await runAgent(rootPath, state, env, 'chapter_planner', {
      ...baseInput,
      ARCHITECT: architect,
      CHARACTER_MASTER: characterMaster
    }, options.dryRun);
    emitProgress('agent-done', { agent: 'chapter_planner', chapter });

    let forcedCompletionReason = null;
    let usedWriterFallback = false;

    emitProgress('agent-start', { agent: 'writer', chapter, revision: 0 });
    let writer;

    try {
      writer = await runAgent(rootPath, state, env, 'writer', {
        ...baseInput,
        ARCHITECT: architect,
        CHARACTER_MASTER: characterMaster,
        CHAPTER_PLANNER: chapterPlanner,
        REVISION_REQUEST: null,
        PREVIOUS_DRAFT: null
      }, options.dryRun);
      emitProgress('agent-done', { agent: 'writer', chapter, revision: 0 });
    } catch (error) {
      writer = buildFallbackWriterDraft(chapter, chapterPlanner, architect, characterMaster, error);
      usedWriterFallback = true;
      forcedCompletionReason = `Writer fallback applied: ${getErrorMessage(error)}`;
      await recordForcedChapterFallback(rootPath, chapter, 'writer', error, {
        chapterTitle: writer.chapter_title
      });
      emitProgress('agent-done', { agent: 'writer', chapter, revision: 0, forced: true, error: getErrorMessage(error) });
    }

    let critic = null;
    let continuity = null;
    let editor = null;
    let votes = null;
    let revisionRound = 0;

    while (!usedWriterFallback && !forcedCompletionReason && revisionRound <= maxRevisionRounds) {
      // critic and continuity_keeper read the same inputs — run them in parallel.
      const reviewInput = { ...baseInput, CHAPTER_PLANNER: chapterPlanner, DRAFT: writer };

      try {
        emitProgress('agent-start', { agent: 'critic', chapter, revision: revisionRound });
        emitProgress('agent-start', { agent: 'continuity_keeper', chapter, revision: revisionRound });

        [critic, continuity] = await Promise.all([
          runAgent(rootPath, state, env, 'critic', reviewInput, options.dryRun),
          runAgent(rootPath, state, env, 'continuity_keeper', reviewInput, options.dryRun)
        ]);

        emitProgress('agent-done', { agent: 'critic', chapter, revision: revisionRound, verdict: critic.verdict });
        emitProgress('agent-done', { agent: 'continuity_keeper', chapter, revision: revisionRound, pass: continuity.pass });

        emitProgress('agent-start', { agent: 'editor', chapter, revision: revisionRound });
        editor = await runAgent(rootPath, state, env, 'editor', {
          ...baseInput,
          CHAPTER_PLANNER: chapterPlanner,
          DRAFT: writer,
          CRITIC: critic,
          CONTINUITY: continuity
        }, options.dryRun);
        emitProgress('agent-done', { agent: 'editor', chapter, revision: revisionRound });

        emitProgress('vote-start', { chapter, revision: revisionRound });
        votes = await runApprovalVote(rootPath, state, env, {
          ...baseInput,
          ARCHITECT: architect,
          CHARACTER_MASTER: characterMaster,
          CHAPTER_PLANNER: chapterPlanner,
          DRAFT: writer,
          CRITIC: critic,
          CONTINUITY: continuity,
          EDITOR: editor
        }, options.dryRun);
        emitProgress('vote-done', { chapter, revision: revisionRound, approved: votes?.summary?.approved, score: votes?.summary?.averageScore });
      } catch (error) {
        forcedCompletionReason = `Review fallback applied: ${getErrorMessage(error)}`;
        await recordForcedChapterFallback(rootPath, chapter, 'review', error, {
          revisionRound
        });
        break;
      }

      if (!shouldRequestRevision(critic, continuity, votes, approval) || revisionRound === maxRevisionRounds) {
        break;
      }

      revisionRound += 1;
      emitProgress('agent-start', { agent: 'writer', chapter, revision: revisionRound });
      try {
        writer = await runAgent(rootPath, state, env, 'writer', {
          ...baseInput,
          ARCHITECT: architect,
          CHARACTER_MASTER: characterMaster,
          CHAPTER_PLANNER: chapterPlanner,
          PREVIOUS_DRAFT: writer,
          CRITIC: critic,
          CONTINUITY: continuity,
          EDITOR: editor,
          VOTES: votes,
          REVISION_REQUEST: 'Revise the chapter to fix all high-severity issues first, then medium issues, while preserving the strongest voice and scene images.'
        }, options.dryRun);
        emitProgress('agent-done', { agent: 'writer', chapter, revision: revisionRound });
      } catch (error) {
        if (!writer?.draft_markdown) {
          writer = buildFallbackWriterDraft(chapter, chapterPlanner, architect, characterMaster, error);
        }

        forcedCompletionReason = `Revision fallback applied: ${getErrorMessage(error)}`;
        await recordForcedChapterFallback(rootPath, chapter, 'writer-revision', error, {
          revisionRound,
          chapterTitle: writer.chapter_title
        });
        emitProgress('agent-done', { agent: 'writer', chapter, revision: revisionRound, forced: true, error: getErrorMessage(error) });
        break;
      }
    }

    if (usedWriterFallback || forcedCompletionReason) {
      ({ critic, continuity, editor, votes } = buildForcedReviewBundle(writer, chapterPlanner, forcedCompletionReason, {
        critic,
        continuity,
        editor,
        votes
      }));
    }

    const finalMarkdown = editor.final_markdown || writer.draft_markdown || '';
    const chapterTitle = editor.chapter_title || writer.chapter_title || chapterPlanner.chapter_title || `Chapter ${chapter}`;
    const forcedCompletion = Boolean(usedWriterFallback || forcedCompletionReason);

    await persistChapter(rootPath, chapterId, {
      activeBookId: state.activeBook.id,
      bookTitle: state.bookBible.title,
      architect,
      characterMaster,
      chapterPlanner,
      writer,
      critic,
      continuity,
      editor,
      votes,
      outlineSnapshot,
      finalMarkdown,
      revisionRound
    });

    await recordChapterProgress(rootPath, state.activeBook.id, {
      lastPersistedChapter: chapter
    });

    await updateMemory(rootPath, chapter, {
      activeBook: state.activeBook,
      bookBible: state.bookBible,
      timeline: state.timeline,
      styleGuide: state.styleGuide,
      agentState: state.agentState,
      outlineMemory: state.outlineMemory,
      chapterTitle,
      architect,
      chapterPlanner,
      writer,
      critic,
      continuity,
      editor,
      votes,
      outlineSnapshot
    });

    await recordChapterProgress(rootPath, state.activeBook.id, {
      lastPersistedChapter: chapter,
      lastCompletedChapter: chapter
    });

    const result = {
      message: forcedCompletion ? `Chapter ${chapter} generated with forced fallback.` : `Chapter ${chapter} generated.`,
      activeBookId: state.activeBook.id,
      chapter,
      chapterTitle,
      revisionRound,
      forcedCompletion,
      forcedCompletionReason,
      voteSummary: votes?.summary || null,
      files: {
        plan: `${CHAPTERS_DIR}/chapter_${chapterId}_plan.json`,
        draft: `${CHAPTERS_DIR}/chapter_${chapterId}_draft.md`,
        review: `${CHAPTERS_DIR}/chapter_${chapterId}_review.json`,
        final: `${CHAPTERS_DIR}/chapter_${chapterId}_final.md`
      }
    };

    emitProgress('chapter-done', { chapter, chapterTitle, revisionRound, approved: votes?.summary?.approved, forced: forcedCompletion });

    return result;
  });
}

export async function resolveNextChapterNumber(rootPath, activeBookId, timeline, explicitStartChapter) {
  const requestedStartChapter = Number(explicitStartChapter);

  if (requestedStartChapter > 0) {
    return requestedStartChapter;
  }

  const progress = await readJson(getGenerationStatePath(rootPath, activeBookId), null);
  const highestTrackedChapter = getHighestTrackedChapter(timeline?.chapters || []);
  const highestPersistedChapter = Math.max(
    Number(progress?.lastPersistedChapter || 0),
    Number(progress?.lastCompletedChapter || 0)
  );

  return Math.max(highestTrackedChapter, highestPersistedChapter) + 1;
}

export function resolveTargetChapterCount(options = {}, existingProgress = null, defaultCount = 3) {
  const requestedCount = Number(options.count || options.chapters);

  if (requestedCount > 0) {
    return requestedCount;
  }

  const savedTarget = Number(existingProgress?.targetChapterCount || 0);
  return savedTarget > 0 ? savedTarget : defaultCount;
}

export function resolveRemainingChapterCount(startChapter, targetChapterCount) {
  return Math.max(Number(targetChapterCount || 0) - Number(startChapter || 0) + 1, 0);
}

export async function translateChapter(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'workflow',
    action: 'translate-chapter',
    input: { options }
  }, async () => {
    const chapter = Number(options.chapter);

    if (!chapter) {
      throw new Error('Provide a chapter number with --chapter <n>.');
    }

    const state = await loadState(rootPath);
    const env = await loadEnv(rootPath);
    const chapterId = padChapter(chapter);
    const finalSourceFile = `${CHAPTERS_DIR}/chapter_${chapterId}_final.md`;
    const draftSourceFile = `${CHAPTERS_DIR}/chapter_${chapterId}_draft.md`;
    const translationFile = `${CHAPTERS_DIR}/chapter_${chapterId}_it.md`;
    const metadataFile = `${CHAPTERS_DIR}/chapter_${chapterId}_translation.json`;
    const finalMarkdown = String(await readText(path.join(rootPath, finalSourceFile), null) || '').trim();
    const draftMarkdown = String(await readText(path.join(rootPath, draftSourceFile), null) || '').trim();
    const sourceMarkdown = finalMarkdown || draftMarkdown;
    const sourceFile = finalMarkdown ? finalSourceFile : draftMarkdown ? draftSourceFile : null;

    if (!sourceMarkdown || !sourceFile) {
      throw new Error(`No chapter text found for chapter ${chapter}. Generate or edit ${finalSourceFile} first.`);
    }

    const chapterEntry = (state.timeline.chapters || []).find((entry) => Number(entry.chapter) === chapter) || null;
    const translation = await runAgent(rootPath, state, env, 'translator', {
      USER_INTENT: {
        task: 'translate_chapter',
        chapter,
        target_language: 'Italian',
        notes: options.notes || '',
        preserve_markdown: true
      },
      BOOK_BIBLE: state.bookBible,
      STYLE_GUIDE: state.styleGuide,
      OUTLINE_MEMORY: state.outlineMemory,
      SOURCE_CHAPTER: {
        title: chapterEntry?.title || `Chapter ${chapter}`,
        summary: chapterEntry?.summary || '',
        markdown: sourceMarkdown
      }
    }, Boolean(options.dryRun));

    if (options.dryRun) {
      return {
        message: `Dry run ready for Italian translation of chapter ${chapter}.`,
        activeBookId: state.activeBook.id,
        chapter,
        sourceFile,
        preview: translation
      };
    }

    const translatedMarkdown = String(translation.translated_markdown || '').trim();

    if (!translatedMarkdown) {
      throw new Error('Translator returned no translated_markdown field.');
    }

    await Promise.all([
      writeText(path.join(rootPath, translationFile), `${translatedMarkdown}\n`),
      writeJson(path.join(rootPath, metadataFile), {
        chapter,
        language: 'it',
        translatedAt: new Date().toISOString(),
        sourceFile,
        translator: translation
      })
    ]);

    return {
      message: `Chapter ${chapter} translated to Italian.`,
      activeBookId: state.activeBook.id,
      chapter,
      chapterTitle: chapterEntry?.title || `Chapter ${chapter}`,
      files: {
        source: sourceFile,
        translation: translationFile,
        metadata: metadataFile
      }
    };
  });
}

async function loadState(rootPath) {
  const defaults = buildDefaultMemorySet();
  const [agentsConfig, routing, presets, agentState, seriesBundle, allSeriesBooks, seriesContinuity] = await Promise.all([
    readJson(path.join(rootPath, CONFIG_DIR, 'agents.json'), { agents: {} }),
    readJson(path.join(rootPath, CONFIG_DIR, 'routing.json'), { routing: {}, approval: {} }),
    readJson(path.join(rootPath, CONFIG_DIR, 'presets.json'), { presets: {} }),
    readJson(path.join(rootPath, MEMORY_DIR, 'agent_state.json'), { activePresets: [], overrides: { agents: {} }, notes: {} }),
    loadSeriesBundle(rootPath, defaults),
    loadAllSeriesBooks(rootPath, defaults),
    analyzeSeriesContinuity(rootPath, defaults)
  ]);

  return {
    agentsConfig,
    routing,
    presets,
    bookBible: seriesBundle.bookBible,
    timeline: seriesBundle.timeline,
    styleGuide: seriesBundle.styleGuide,
    agentState,
    outlineMemory: seriesBundle.outlineMemory,
    seriesState: seriesBundle.seriesState,
    activeBook: seriesBundle.activeBook,
    allSeriesBooks,
    seriesContinuity,
    effectiveAgents: deepMerge(agentsConfig, agentState.overrides || {})
  };
}

async function planBookInternal(rootPath, options = {}) {
  const state = await loadState(rootPath);
  const env = await loadEnv(rootPath);
  const planned = await runAgent(rootPath, state, env, 'series_architect', buildSeriesPatternInput(state, options), false);

  return normalizeSeriesPlan(planned, state, options);
}

async function runAgent(rootPath, state, env, agentName, input, dryRun = false, taskOptions = {}) {
  const agentConfig = state.effectiveAgents.agents?.[agentName];
  if (!agentConfig) {
    throw new Error(`Missing agent config for ${agentName}`);
  }

  const promptPath = path.join(rootPath, PROMPTS_DIR, taskOptions.promptFile || agentConfig.prompt);
  const basePrompt = await readText(promptPath);
  const roomOpposition = summarizeRivalries(state.effectiveAgents.agents, agentName);
  const systemPrompt = `${basePrompt.trim()}\n\nCurrent role: ${agentConfig.role}\nPersona: ${agentConfig.persona || 'No persona provided.'}\nPrivate agenda: ${agentConfig.private_agenda || 'No private agenda provided.'}\nRivalries: ${roomOpposition || 'No named rivalries.'}\nBehavior:\n${JSON.stringify(agentConfig.behavior, null, 2)}\n\nReturn JSON only. No markdown fences.`;
  const route = [agentConfig.model, ...(state.routing.routing?.[agentName] || [])].filter(Boolean);
  let lastError = null;

  for (const model of [...new Set(route)]) {
    try {
      const response = await callOpenRouter({
        rootPath,
        apiKey: env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        appTitle: env.OPENROUTER_APP_TITLE || process.env.OPENROUTER_APP_TITLE,
        httpReferer: env.OPENROUTER_HTTP_REFERER || process.env.OPENROUTER_HTTP_REFERER,
        model,
        systemPrompt,
        input,
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.max_tokens,
        dryRun: Boolean(dryRun)
      });

      const result = {
        ...response.data,
        _meta: {
          agent: agentName,
          role: agentConfig.role,
          model: response.model
        }
      };

      await recordActionLog(rootPath, {
        source: 'agent',
        action: agentName,
        status: 'success',
        input: {
          dryRun: Boolean(dryRun),
          model: response.model,
          promptFile: taskOptions.promptFile || agentConfig.prompt,
          chapter: input?.USER_INTENT?.chapter || null
        },
        output: result
      });

      return result;
    } catch (error) {
      lastError = error;
    }
  }

  await recordActionLog(rootPath, {
    source: 'agent',
    action: agentName,
    status: 'error',
    input: {
      dryRun: Boolean(dryRun),
      modelsTried: [...new Set(route)],
      promptFile: taskOptions.promptFile || agentConfig.prompt,
      chapter: input?.USER_INTENT?.chapter || null
    },
    error: lastError
  });

  throw lastError || new Error(`No model succeeded for ${agentName}`);
}

async function runApprovalVote(rootPath, state, env, input, dryRun = false) {
  const voterNames = state.routing.approval?.voters || ['architect', 'character_master', 'critic', 'continuity_keeper', 'editor'];

  if (dryRun) {
    return buildDryRunVotes(voterNames);
  }

  const votes = [];

  for (const voterName of voterNames) {
    const vote = await runAgent(rootPath, state, env, voterName, input, dryRun, { promptFile: VOTE_PROMPT_FILE });
    votes.push({
      voter: voterName,
      role: state.effectiveAgents.agents?.[voterName]?.role || voterName,
      vote: vote.vote || 'revise',
      score: Number(vote.score || 0),
      reason: vote.reason || '',
      must_fix: vote.must_fix || [],
      celebrate: vote.celebrate || [],
      risk_note: vote.risk_note || ''
    });
  }

  return {
    votes,
    summary: summarizeVotes(votes, state.routing.approval || {})
  };
}

export function shouldRequestRevision(critic, continuity, votes, approval) {
  const highIssues = (critic?.issues || []).filter((issue) => issue.severity === 'high').length;
  const criticTooWeak = highIssues > Number(approval.critic_max_high_issues ?? 1);
  const criticRejected = critic?.verdict === 'reject';
  const continuityFailed = approval.continuity_must_pass !== false && continuity?.pass === false;
  const voteFailed = votes?.summary?.approved === false;

  return Boolean(criticTooWeak || continuityFailed || criticRejected || voteFailed);
}

export function buildFallbackWriterDraft(chapter, chapterPlanner = {}, architect = {}, characterMaster = {}, error = null) {
  const chapterTitle = chapterPlanner.chapter_title || `Chapter ${chapter}`;
  const sceneCards = Array.isArray(chapterPlanner.scene_cards) && chapterPlanner.scene_cards.length
    ? chapterPlanner.scene_cards
    : [{
        scene: 1,
        goal: architect.chapter_goal || `Advance the conflict in chapter ${chapter}.`,
        conflict: chapterPlanner.chapter_hook || '',
        turn: chapterPlanner.cliffhanger || '',
        image: ''
      }];
  const emotionalTargets = Array.isArray(characterMaster.emotional_targets)
    ? characterMaster.emotional_targets.filter(Boolean).slice(0, 4)
    : [];
  const summary = [
    architect.chapter_goal,
    ...(chapterPlanner.arc_payoffs || [])
  ].filter(Boolean).slice(0, 4).join(' ') || chapterPlanner.chapter_hook || `Forced fallback draft for chapter ${chapter}.`;
  const unresolvedThreads = appendUniqueStrings([], [
    ...(chapterPlanner.next_chapter_seed || []),
    ...(architect.next_arc_targets || [])
  ]).slice(0, 6);
  const draftMarkdown = [
    `# ${chapterTitle}`,
    emotionalTargets.length ? `Emotional focus: ${emotionalTargets.join(', ')}.` : '',
    chapterPlanner.chapter_hook || '',
    ...sceneCards.map((card, index) => renderFallbackSceneCard(card, index)),
    chapterPlanner.cliffhanger ? `## Cliffhanger\n\n${chapterPlanner.cliffhanger}` : ''
  ].filter(Boolean).join('\n\n');

  return {
    type: 'draft',
    chapter_title: chapterTitle,
    summary,
    draft_markdown: draftMarkdown,
    scene_summaries: sceneCards.map((card, index) => summarizeFallbackSceneCard(card, index)),
    unresolved_threads: unresolvedThreads.length ? unresolvedThreads : [chapterPlanner.cliffhanger || `Continue chapter ${chapter + 1}.`],
    voice_report: {
      tone: 'compressed fallback',
      pacing: 'fast',
      risk_taken: 'forced chapter completion after writer failure'
    },
    _meta: {
      agent: 'writer',
      role: 'Draft Writer',
      model: 'local-fallback',
      forced: true,
      reason: getErrorMessage(error)
    }
  };
}

export function buildForcedReviewBundle(writer, chapterPlanner = {}, reason = '', existing = {}) {
  const forcedReason = getErrorMessage(reason);
  const existingSummary = existing.votes?.summary || {};

  return {
    critic: existing.critic || {
      verdict: 'approve',
      issues: [],
      must_fix: [],
      summary: `Critic skipped: ${forcedReason}`,
      _meta: {
        agent: 'critic',
        role: 'Adversarial Critic',
        model: 'forced-skip',
        forced: true
      }
    },
    continuity: existing.continuity || {
      pass: true,
      issues: [],
      memory_updates: {
        timeline_events: [],
        canon_notes: []
      },
      summary: `Continuity skipped: ${forcedReason}`,
      _meta: {
        agent: 'continuity_keeper',
        role: 'Continuity Librarian',
        model: 'forced-skip',
        forced: true
      }
    },
    editor: existing.editor || {
      chapter_title: writer.chapter_title || chapterPlanner.chapter_title || 'Untitled Chapter',
      final_markdown: writer.draft_markdown || '',
      final_summary: writer.summary || chapterPlanner.chapter_hook || '',
      unresolved_threads: writer.unresolved_threads || chapterPlanner.next_chapter_seed || [],
      changes: [],
      memory_updates: {
        timeline_events: [],
        style_adjustments: []
      },
      summary: `Editor skipped: ${forcedReason}`,
      _meta: {
        agent: 'editor',
        role: 'Line Editor',
        model: 'forced-skip',
        forced: true
      }
    },
    votes: {
      votes: existing.votes?.votes || [],
      summary: {
        approvals: Number(existingSummary.approvals || 0),
        revises: Number(existingSummary.revises || 0),
        rejects: 0,
        averageScore: Number(existingSummary.averageScore || 1),
        approved: true,
        blockingVotes: [],
        forced: true,
        reason: forcedReason
      }
    }
  };
}

async function recordForcedChapterFallback(rootPath, chapter, stage, error, output = {}) {
  await recordActionLog(rootPath, {
    source: 'workflow',
    action: `force-${stage}`,
    status: 'success',
    input: {
      chapter,
      stage,
      reason: getErrorMessage(error)
    },
    output: {
      forced: true,
      ...output
    }
  });
}

async function persistChapter(rootPath, chapterId, payload) {
  await Promise.all([
    fs.rm(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_it.md`), { force: true }),
    fs.rm(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_translation.json`), { force: true }),
    writeJson(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_plan.json`), {
      active_book_id: payload.activeBookId,
      book_title: payload.bookTitle,
      outline_snapshot: payload.outlineSnapshot,
      architect: payload.architect,
      character_master: payload.characterMaster,
      chapter_planner: payload.chapterPlanner
    }),
    writeText(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_draft.md`), `${payload.writer.draft_markdown || ''}\n`),
    writeJson(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_review.json`), {
      active_book_id: payload.activeBookId,
      book_title: payload.bookTitle,
      critic: payload.critic,
      continuity_keeper: payload.continuity,
      editor: payload.editor,
      votes: payload.votes,
      revision_round: payload.revisionRound
    }),
    writeText(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_final.md`), `${payload.finalMarkdown}\n`)
  ]);
}

function getGenerationStatePath(rootPath, bookId) {
  return path.join(rootPath, MEMORY_DIR, 'books', bookId, GENERATION_STATE_FILE);
}

function getHighestTrackedChapter(chapters = []) {
  return chapters.reduce((highestChapter, entry) => Math.max(highestChapter, Number(entry?.chapter || 0)), 0);
}

async function recordChapterProgress(rootPath, bookId, updates) {
  const statePath = getGenerationStatePath(rootPath, bookId);
  const existing = await readJson(statePath, {
    lastPersistedChapter: 0,
    lastCompletedChapter: 0,
    targetChapterCount: 0,
    updatedAt: null
  });

  const nextTargetChapterCount = Number(updates.targetChapterCount || 0) > 0
    ? Number(updates.targetChapterCount)
    : Number(existing.targetChapterCount || 0);

  await writeJson(statePath, {
    ...existing,
    lastPersistedChapter: Math.max(Number(existing.lastPersistedChapter || 0), Number(updates.lastPersistedChapter || 0)),
    lastCompletedChapter: Math.max(Number(existing.lastCompletedChapter || 0), Number(updates.lastCompletedChapter || 0)),
    targetChapterCount: nextTargetChapterCount,
    updatedAt: new Date().toISOString()
  });
}

async function collectTranslationStatus(rootPath, chapters = []) {
  const translatedChapters = [];

  for (const chapter of chapters) {
    const chapterId = padChapter(chapter.chapter);
    const translationContent = String(await readText(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_it.md`), null) || '').trim();

    if (!translationContent) {
      continue;
    }

    translatedChapters.push({
      chapter: chapter.chapter,
      title: chapter.title || `Chapter ${chapter.chapter}`,
      file: `${CHAPTERS_DIR}/chapter_${chapterId}_it.md`
    });
  }

  translatedChapters.sort((left, right) => left.chapter - right.chapter);
  const translatedIds = new Set(translatedChapters.map((chapter) => Number(chapter.chapter)));
  const pendingChapters = chapters
    .filter((chapter) => !translatedIds.has(Number(chapter.chapter)))
    .map((chapter) => ({
      chapter: chapter.chapter,
      title: chapter.title || `Chapter ${chapter.chapter}`
    }));

  return {
    translatedCount: translatedChapters.length,
    pendingCount: pendingChapters.length,
    nextPendingChapter: pendingChapters[0] || null,
    chapters: translatedChapters.slice(-6)
  };
}

async function updateMemory(rootPath, chapter, payload) {
  const nextBookBible = {
    ...payload.bookBible,
    chapter_registry: Array.isArray(payload.bookBible.chapter_registry)
      ? payload.bookBible.chapter_registry.filter((entry) => entry.chapter !== chapter)
      : []
  };

  nextBookBible.chapter_registry.push({
    chapter,
    title: payload.chapterTitle,
    summary: payload.editor.final_summary || payload.writer.summary || '',
    unresolved_threads: payload.editor.unresolved_threads || payload.writer.unresolved_threads || [],
    arc_targets: collectArcTargets(payload),
    next_arc_targets: collectNextArcTargets(payload),
    vote_summary: payload.votes?.summary || null
  });

  const nextTimeline = {
    ...payload.timeline,
    chapters: Array.isArray(payload.timeline.chapters)
      ? payload.timeline.chapters.filter((entry) => entry.chapter !== chapter)
      : [],
    events: appendUniqueStrings(payload.timeline.events, [
      ...(payload.continuity.memory_updates?.timeline_events || []),
      ...(payload.editor.memory_updates?.timeline_events || [])
    ])
  };

  nextTimeline.chapters.push({
    chapter,
    title: payload.chapterTitle,
    summary: payload.editor.final_summary || payload.writer.summary || '',
    unresolved_threads: payload.editor.unresolved_threads || payload.writer.unresolved_threads || [],
    arc_targets: collectArcTargets(payload),
    next_arc_targets: collectNextArcTargets(payload),
    vote_summary: payload.votes?.summary || null,
    createdAt: new Date().toISOString()
  });

  const nextStyleGuide = {
    ...payload.styleGuide,
    recent_adjustments: appendUniqueStrings(payload.styleGuide.recent_adjustments, [
      ...(payload.editor.memory_updates?.style_adjustments || []),
      ...(payload.continuity.memory_updates?.canon_notes || [])
    ])
  };

  const nextAgentState = {
    ...payload.agentState,
    notes: {
      ...(payload.agentState.notes || {}),
      writer: {
        ...payload.agentState.notes?.writer,
        last_problem: payload.critic?.issues?.[0]?.problem || payload.agentState.notes?.writer?.last_problem || 'none'
      },
      critic: {
        ...payload.agentState.notes?.critic,
        last_verdict: payload.critic?.verdict || payload.agentState.notes?.critic?.last_verdict || 'unknown'
      },
      editor: {
        ...payload.agentState.notes?.editor,
        last_change_count: payload.editor?.changes?.length || 0
      },
      room_vote: {
        last_summary: payload.votes?.summary || null
      }
    }
  };

  const nextOutlineMemory = buildNextOutlineMemory(chapter, payload);

  await saveStateBundle(rootPath, { activeBook: payload.activeBook }, {
    bookBible: nextBookBible,
    timeline: nextTimeline,
    styleGuide: nextStyleGuide,
    outlineMemory: nextOutlineMemory
  });
  await writeJson(path.join(rootPath, MEMORY_DIR, 'agent_state.json'), nextAgentState);
}

function buildNextOutlineMemory(chapter, payload) {
  const chapterOutlines = Array.isArray(payload.outlineMemory.chapter_outlines)
    ? payload.outlineMemory.chapter_outlines.filter((entry) => entry.chapter !== chapter)
    : [];

  const outlineEntry = {
    chapter,
    title: payload.chapterTitle,
    chapter_goal: payload.architect?.chapter_goal || payload.outlineSnapshot.next_targets?.[0] || '',
    arc_targets: collectArcTargets(payload),
    next_arc_targets: collectNextArcTargets(payload),
    unresolved_threads: payload.editor?.unresolved_threads || payload.writer?.unresolved_threads || [],
    planned_payoffs: payload.chapterPlanner?.arc_payoffs || [],
    outline_notes: appendUniqueStrings([], [
      ...(payload.architect?.outline_notes || []),
      ...(payload.chapterPlanner?.outline_memory_updates || []),
      ...(payload.editor?.memory_updates?.outline_updates?.carry_forward_threads || [])
    ]),
    vote_summary: payload.votes?.summary || null,
    updatedAt: new Date().toISOString()
  };

  chapterOutlines.push(outlineEntry);

  return {
    ...defaultOutlineMemory(payload.bookBible),
    ...payload.outlineMemory,
    story_arc: {
      ...defaultOutlineMemory(payload.bookBible).story_arc,
      ...(payload.outlineMemory.story_arc || {}),
      current_phase: determineStoryPhase(chapter),
      global_targets: appendUniqueStrings(payload.outlineMemory.story_arc?.global_targets, collectArcTargets(payload))
    },
    active_arcs: appendUniqueStrings(payload.outlineMemory.active_arcs, collectArcTargets(payload)),
    arc_metrics: applyArcMetrics(ensureArcMetrics(payload.outlineMemory.arc_metrics || {}, payload.outlineMemory.active_arcs || []), chapter, {
      touchedArcs: collectArcTargets(payload),
      nextArcs: collectNextArcTargets(payload),
      approved: payload.votes?.summary?.approved !== false,
      averageVoteScore: payload.votes?.summary?.averageScore || 0,
      unresolvedThreads: payload.editor?.unresolved_threads || payload.writer?.unresolved_threads || [],
      allArcs: payload.outlineMemory.active_arcs || []
    }),
    next_targets: collectNextArcTargets(payload),
    chapter_outlines: chapterOutlines.sort((left, right) => left.chapter - right.chapter),
    last_vote_summary: payload.votes?.summary || null
  };
}

function buildRoomState(agents = {}) {
  return Object.fromEntries(
    Object.entries(agents).map(([name, config]) => [
      name,
      {
        role: config.role,
        persona: config.persona,
        private_agenda: config.private_agenda,
        rivalries: config.rivalries || []
      }
    ])
  );
}

function buildOutlineSnapshot(state, chapter, options) {
  const lastOutline = state.outlineMemory.chapter_outlines?.slice(-1)[0] || null;
  const requestedArcTargets = normalizeList(options.arcTarget);

  return {
    chapter,
    current_phase: state.outlineMemory.story_arc?.current_phase || determineStoryPhase(chapter),
    active_arcs: state.outlineMemory.active_arcs || [],
    next_targets: requestedArcTargets.length ? requestedArcTargets : state.outlineMemory.next_targets || [],
    global_targets: state.outlineMemory.story_arc?.global_targets || [],
    endgame_promises: state.outlineMemory.story_arc?.endgame_promises || [],
    previous_outline: lastOutline,
    arc_metrics: state.outlineMemory.arc_metrics || {}
  };
}

function renderFallbackSceneCard(card, index) {
  const sceneNumber = card?.scene || index + 1;
  const parts = [
    card?.goal ? `Goal: ${card.goal}` : '',
    card?.conflict ? `Conflict: ${card.conflict}` : '',
    card?.turn ? `Turn: ${card.turn}` : '',
    card?.image ? `Image: ${card.image}` : ''
  ].filter(Boolean);

  return `## Scene ${sceneNumber}\n\n${parts.join('. ')}.`;
}

function summarizeFallbackSceneCard(card, index) {
  return [
    card?.goal || `Scene ${card?.scene || index + 1}`,
    card?.conflict || '',
    card?.turn || ''
  ].filter(Boolean).join(' ');
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || 'forced fallback');
}

export function shouldStopBookGenerationGracefully(error) {
  const message = getErrorMessage(error);

  return [
    /^OpenRouter request timed out\b/i,
    /^OpenRouter request failed\b/i,
    /^OpenRouter returned no usable JSON\b/i,
    /^Model returned an empty response\b/i,
    /^Model did not return a JSON object\b/i,
    /^Could not parse JSON from model response\b/i
  ].some((pattern) => pattern.test(message));
}

export function buildChapterBaseInput(state, chapter, options = {}) {
  const outlineSnapshot = buildOutlineSnapshot(state, chapter, options);

  return {
    USER_INTENT: {
      chapter,
      idea: options.idea || '',
      notes: options.notes || '',
      requested_length: options.length || 'short chapter'
    },
    BOOK_BIBLE: state.bookBible,
    TIMELINE: state.timeline,
    STYLE_GUIDE: state.styleGuide,
    OUTLINE_MEMORY: outlineSnapshot,
    LAST_CHAPTER: state.timeline.chapters?.slice(-1)[0] || null,
    WRITERS_ROOM: buildRoomState(state.effectiveAgents.agents)
  };
}

export function shouldCreateBookForWrite(options = {}) {
  return Boolean(
    options.newBook
    || options.forceNewBook
    || options.auto
    || hasValue(options.title)
    || hasValue(options.premise)
    || hasValue(options.subtitle)
    || hasValue(options.tagline)
    || hasValue(options.genre)
    || hasValue(options.coverColor)
    || hasValue(options.exportBaseName)
    || hasValue(options.author)
    || hasValue(options.theme)
    || hasValue(options.themes)
  );
}

function summarizeRivalries(agents, agentName) {
  const rivals = agents?.[agentName]?.rivalries || [];
  if (!rivals.length) {
    return '';
  }

  return rivals
    .map((rival) => `${rival}: ${agents?.[rival]?.private_agenda || 'unknown agenda'}`)
    .join('; ');
}

function buildAutomaticIdea(baseIdea, chapterNumber, previousResult) {
  const previousTitle = previousResult?.chapterTitle ? `Previous chapter: ${previousResult.chapterTitle}.` : '';
  return `${baseIdea} Chapter ${chapterNumber} must escalate the pressure, deepen the theme, and leave one new unresolved thread. ${previousTitle}`.trim();
}

function buildAutomaticNotes(baseNotes, chapterNumber, offset) {
  return [
    baseNotes,
    `Automation note: this is auto-generated pass ${offset + 1} for chapter ${chapterNumber}.`,
    'Prefer stronger consequences than repetition.'
  ].filter(Boolean).join(' ');
}

function buildDryRunVotes(voterNames) {
  const votes = voterNames.map((voter) => ({
    voter,
    role: voter,
    vote: 'approve',
    score: 0.75,
    reason: 'Dry run vote defaults to approval for pipeline validation.',
    must_fix: [],
    celebrate: ['Pipeline structure is intact.'],
    risk_note: 'Dry run result only.'
  }));

  return {
    votes,
    summary: summarizeVotes(votes, {})
  };
}

function summarizeVotes(votes, approval) {
  const approvals = votes.filter((vote) => vote.vote === 'approve').length;
  const revises = votes.filter((vote) => vote.vote === 'revise').length;
  const rejects = votes.filter((vote) => vote.vote === 'reject').length;
  const averageScore = votes.length
    ? votes.reduce((total, vote) => total + Number(vote.score || 0), 0) / votes.length
    : 0;
  const approved = approvals >= Number(approval.min_approve_votes ?? 3)
    && rejects <= Number(approval.max_reject_votes ?? 0)
    && averageScore >= Number(approval.min_average_vote_score ?? 0.65);

  return {
    approvals,
    revises,
    rejects,
    averageScore: Number(averageScore.toFixed(2)),
    approved,
    blockingVotes: votes
      .filter((vote) => vote.vote !== 'approve')
      .map((vote) => ({ voter: vote.voter, vote: vote.vote, must_fix: vote.must_fix || [] }))
  };
}

function collectArcTargets(payload) {
  return appendUniqueStrings([], [
    ...(payload.architect?.arc_targets || []),
    ...(payload.outlineSnapshot?.next_targets || [])
  ]);
}

function collectNextArcTargets(payload) {
  return appendUniqueStrings([], [
    ...(payload.editor?.memory_updates?.outline_updates?.next_arc_targets || []),
    ...(payload.chapterPlanner?.next_chapter_seed || []),
    ...(payload.architect?.next_arc_targets || []),
    ...(payload.editor?.memory_updates?.outline_updates?.carry_forward_threads || []),
    ...(payload.editor?.unresolved_threads || payload.writer?.unresolved_threads || [])
  ]);
}

function determineStoryPhase(chapter) {
  if (chapter <= 3) {
    return 'opening';
  }

  if (chapter <= 9) {
    return 'escalation';
  }

  if (chapter <= 14) {
    return 'crisis';
  }

  return 'endgame';
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeList(item));
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultOutlineMemory(bookBible) {
  return {
    story_arc: {
      current_phase: 'opening',
      global_targets: bookBible?.themes || [],
      endgame_promises: []
    },
    active_arcs: [],
    arc_metrics: {},
    next_targets: [],
    chapter_outlines: [],
    last_vote_summary: null
  };
}

function applyArcMetrics(existingMetrics, chapter, context) {
  const next = { ...existingMetrics };
  const seenArcs = new Set([...Object.keys(existingMetrics || {}), ...(context.allArcs || []), ...(context.touchedArcs || []), ...(context.nextArcs || [])]);

  for (const arc of seenArcs) {
    const current = next[arc] || {
      success: 0,
      momentum: 0.5,
      decay: 0,
      appearances: 0,
      lastTouchedChapter: null,
      status: 'warming'
    };
    const touched = (context.touchedArcs || []).includes(arc);
    const carried = (context.nextArcs || []).includes(arc);
    const unresolvedPenalty = (context.unresolvedThreads || []).some((thread) => thread.includes(arc)) ? 0.08 : 0;
    const growth = touched ? 0.16 + (context.averageVoteScore * 0.08) : 0;
    const carryBonus = carried ? 0.04 : 0;
    const decay = touched ? Math.max(current.decay - 0.04, 0) : Math.min(current.decay + 0.1, 1);
    const success = clamp(current.success + growth + carryBonus - decay - unresolvedPenalty, 0, 1);
    const momentum = clamp((current.momentum * 0.7) + (touched ? 0.3 : 0.08) - (decay * 0.12), 0, 1);

    next[arc] = {
      success: round(success),
      momentum: round(momentum),
      decay: round(decay),
      appearances: current.appearances + (touched ? 1 : 0),
      lastTouchedChapter: touched ? chapter : current.lastTouchedChapter,
      status: deriveArcStatus(success, momentum, decay, context.approved, carried)
    };
  }

  return next;
}

function ensureArcMetrics(existingMetrics, arcs) {
  const next = { ...existingMetrics };

  for (const arc of arcs || []) {
    next[arc] ??= {
      success: 0.2,
      momentum: 0.4,
      decay: 0.1,
      appearances: 0,
      lastTouchedChapter: null,
      status: 'warming'
    };
  }

  return next;
}

function deriveArcStatus(success, momentum, decay, approved, carried) {
  if (!approved && decay > 0.5) return 'failing';
  if (success > 0.8 && momentum > 0.65) return carried ? 'surging' : 'stable';
  if (decay > 0.65) return 'cooling';
  if (momentum < 0.3) return 'fragile';
  return 'active';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(2));
}

function buildSeriesPatternInput(state, options = {}) {
  return {
    USER_INTENT: {
      automation_goal: 'Invent the next book so the series can keep running without manual naming or premise setup.',
      requested_book_index: Number(options.index || options.bookIndex || (state.seriesState.books?.length || 0) + 1),
      desired_genre: options.genre || state.bookBible.genre || 'dark fantasy',
      desired_themes: normalizeThemesInput(options.theme ?? options.themes ?? []),
      seed: options.seed || options.idea || '',
      notes: options.notes || ''
    },
    SERIES: {
      title: state.seriesState.series?.title || 'Untitled Series',
      description: state.seriesState.series?.description || '',
      pattern: state.seriesState.series?.pattern || null
    },
    CURRENT_BOOK: {
      id: state.activeBook.id,
      title: state.bookBible.title,
      genre: state.bookBible.genre,
      premise: state.bookBible.premise,
      themes: state.bookBible.themes || [],
      world_rules: state.bookBible.world_rules || [],
      chapter_registry: state.bookBible.chapter_registry || []
    },
    SERIES_SHELF: buildSeriesShelf(state.allSeriesBooks, state.activeBook.id),
    SERIES_CONTINUITY: state.seriesContinuity,
    OUTLINE_MEMORY: state.outlineMemory,
    STYLE_GUIDE: state.styleGuide
  };
}

function normalizeSeriesPlan(plan, state, options = {}) {
  const nextBook = plan.next_book || {};
  const nextIndex = Number(nextBook.index || plan.book_index || options.index || options.bookIndex || (state.seriesState.books?.length || 0) + 1);
  const nextTitle = String(nextBook.title || plan.book_title || options.title || `Book ${String(nextIndex).padStart(2, '0')}`).trim() || `Book ${String(nextIndex).padStart(2, '0')}`;
  const nextThemes = normalizeThemesInput(nextBook.themes || plan.themes || state.bookBible.themes || []);

  return {
    seriesPattern: {
      name: String(plan.pattern_name || state.seriesState.series?.pattern?.name || 'Escalating echo pattern').trim(),
      overview: String(plan.pattern_overview || state.seriesState.series?.pattern?.overview || '').trim(),
      bookCountTarget: Number(plan.book_count_target || state.seriesState.series?.pattern?.bookCountTarget || 3),
      sequenceBeats: normalizeStringArray(plan.sequence_beats || state.seriesState.series?.pattern?.sequenceBeats || []),
      motifCycle: normalizeStringArray(plan.motif_cycle || state.seriesState.series?.pattern?.motifCycle || []),
      escalationLogic: String(plan.escalation_logic || state.seriesState.series?.pattern?.escalationLogic || '').trim(),
      updatedAt: new Date().toISOString(),
      sourceAgent: 'series_architect'
    },
    series: {
      title: String(plan.series_title || state.seriesState.series?.title || `${nextTitle} Series`).trim() || `${nextTitle} Series`,
      description: String(plan.series_description || state.seriesState.series?.description || '').trim()
    },
    nextBook: {
      index: nextIndex,
      title: nextTitle,
      subtitle: String(nextBook.subtitle || plan.book_subtitle || options.subtitle || '').trim(),
      genre: String(nextBook.genre || plan.genre || options.genre || state.bookBible.genre || 'dark fantasy').trim() || 'dark fantasy',
      premise: String(nextBook.premise || plan.premise || options.premise || '').trim(),
      themes: nextThemes,
      tagline: String(nextBook.tagline || plan.tagline || options.tagline || nextBook.premise || plan.premise || '').trim(),
      coverColor: normalizeHexColor(nextBook.cover_color || plan.cover_color || options.coverColor || state.bookBible.cover?.color || '#7c9cff'),
      roleInPattern: String(nextBook.role_in_pattern || plan.role_in_pattern || '').trim(),
      arcFocus: normalizeStringArray(nextBook.arc_focus || plan.arc_focus || []),
      carryOverThreads: normalizeStringArray(nextBook.carry_over_threads || plan.carry_over_threads || []),
      worldRulesToEcho: normalizeStringArray(nextBook.world_rules_to_echo || plan.world_rules_to_echo || []),
      automationNotes: normalizeStringArray(nextBook.automation_notes || plan.automation_notes || []),
      exportBaseName: slugify(options.exportBaseName || nextTitle),
      author: String(options.author || state.bookBible.cover?.author || 'OpenRouter Book Agents').trim() || 'OpenRouter Book Agents'
    }
  };
}

function shouldAutomateBookCreation(options = {}) {
  return Boolean(options.auto) || (!String(options.title || '').trim() && !String(options.premise || '').trim());
}

function mergePlannedBookOptions(nextBook, options = {}) {
  const merged = {
    ...options,
    title: nextBook.title,
    genre: nextBook.genre,
    premise: nextBook.premise,
    themes: nextBook.themes,
    subtitle: nextBook.subtitle,
    tagline: nextBook.tagline,
    coverColor: nextBook.coverColor,
    exportBaseName: nextBook.exportBaseName,
    author: nextBook.author
  };

  if (options.auto) {
    for (const key of ['title', 'genre', 'premise', 'themes', 'subtitle', 'tagline', 'coverColor', 'exportBaseName', 'author']) {
      if (hasValue(options[key])) {
        merged[key] = options[key];
      }
    }
  }

  return merged;
}

async function applyPlannedBookPattern(rootPath, planned) {
  const seriesStatePath = path.join(rootPath, MEMORY_DIR, 'series_state.json');
  const seriesState = await readJson(seriesStatePath, { series: {}, books: [] });
  const nextSeriesState = {
    ...seriesState,
    series: {
      ...(seriesState.series || {}),
      title: planned.series.title,
      description: planned.series.description || seriesState.series?.description || '',
      pattern: planned.seriesPattern
    }
  };

  await writeJson(seriesStatePath, nextSeriesState);

  const state = await loadState(rootPath);
  const nextBookBible = {
    ...state.bookBible,
    series_role: planned.nextBook.roleInPattern,
    carry_over_threads: appendUniqueStrings(state.bookBible.carry_over_threads || [], planned.nextBook.carryOverThreads),
    automation_notes: appendUniqueStrings(state.bookBible.automation_notes || [], planned.nextBook.automationNotes),
    world_rules: appendUniqueStrings(state.bookBible.world_rules || [], planned.nextBook.worldRulesToEcho)
  };
  const nextStyleGuide = {
    ...state.styleGuide,
    recent_adjustments: appendUniqueStrings(state.styleGuide.recent_adjustments || [], planned.nextBook.automationNotes)
  };
  const nextOutlineMemory = {
    ...state.outlineMemory,
    next_targets: appendUniqueStrings(state.outlineMemory.next_targets || [], planned.nextBook.arcFocus, planned.nextBook.carryOverThreads),
    story_arc: {
      ...(state.outlineMemory.story_arc || {}),
      global_targets: appendUniqueStrings(state.outlineMemory.story_arc?.global_targets || [], planned.nextBook.themes || [])
    }
  };

  await saveStateBundle(rootPath, state, {
    bookBible: nextBookBible,
    timeline: state.timeline,
    styleGuide: nextStyleGuide,
    outlineMemory: nextOutlineMemory
  });
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeHexColor(value) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : '#7c9cff';
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return String(value || '').trim().length > 0;
}

function buildDefaultMemorySet(bookBibleOverrides = {}) {
  const bookBible = {
    title: 'Untitled Project',
    genre: 'dark fantasy',
    premise: 'A group of rival agents write a book while trying to outmaneuver each other.',
    themes: ['grief', 'ambition', 'memory'],
    world_rules: [
      'Glass can store emotions when cooled under moonlight.',
      'Breaking a glass fruit permanently alters one memory.'
    ],
    characters: {
      Elisa: {
        role: 'heir',
        wound: "mother's disappearance",
        arc: 'control to surrender',
        secrets: ['She caused the first orchard fire.']
      }
    },
    chapter_registry: [],
    exportBaseName: 'untitled-project',
    cover: {
      title: 'Untitled Project',
      subtitle: '',
      author: 'OpenRouter Book Agents',
      tagline: 'A collaborative novel forged by rival agents.',
      color: '#7c9cff'
    },
    ...bookBibleOverrides
  };

  const timeline = { chapters: [], events: [] };
  const styleGuide = {
    pov: 'close third person',
    tense: 'past',
    voice: 'lyrical but readable',
    metaphor_density: 0.65,
    dialogue_density: 0.45,
    profanity_level: 0.1,
    recent_adjustments: []
  };

  return {
    bookBible,
    timeline,
    styleGuide,
    outlineMemory: defaultOutlineMemory(bookBible)
  };
}

function buildSeriesShelf(seriesBooks, activeBookId) {
  return (seriesBooks || []).map((entry) => ({
    id: entry.book.id,
    title: entry.book.title,
    genre: entry.book.genre,
    premise: entry.book.premise,
    themes: entry.book.themes,
    chapterCount: entry.timeline.chapters?.length || 0,
    active: entry.book.id === activeBookId
  }));
}

function normalizeThemesInput(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeThemesInput(item));
  }

  return String(value || '')
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || 'untitled-project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-project';
}

async function saveStateBundle(rootPath, state, payload) {
  const activeBook = state.activeBook || { id: 'book-01', title: payload.bookBible.title || 'Untitled Project', slug: 'untitled-project' };
  await saveSeriesBundle(rootPath, {
    activeBook,
    bookBible: payload.bookBible,
    timeline: payload.timeline,
    styleGuide: payload.styleGuide,
    outlineMemory: payload.outlineMemory
  });
}
