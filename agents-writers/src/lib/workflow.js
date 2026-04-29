import fs from 'node:fs/promises';
import path from 'node:path';

import { recordActionLog, withActionLog } from './action-log.js';
import { callOpenRouter } from './openrouter.js';
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
const VOTE_PROMPT_FILE = 'vote.txt';

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
    const defaults = buildDefaultMemorySet({ title: options.title || 'Untitled Project' });
    const seriesState = await createSeriesBook(rootPath, options, defaults);

    if (options.title || options.genre || options.premise || options.theme?.length || options.themes || options.exportBaseName || options.author || options.subtitle || options.tagline || options.coverColor) {
      await initBook(rootPath, options);
    }

    return {
      message: 'Created a new book in the series.',
      activeBookId: seriesState.activeBookId,
      books: seriesState.books || []
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
        books: state.seriesState.books || []
      },
      title: state.bookBible.title,
      genre: state.bookBible.genre,
      environment: {
        openrouterApiKeyConfigured: Boolean(env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY),
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
    const count = Number(options.count || options.chapters || 3);
    const startChapter = Number(options.startChapter || (state.timeline.chapters?.length || 0) + 1);

    if (!count || count < 1) {
      throw new Error('Provide a positive chapter count with --count <n>.');
    }

    const results = [];

    for (let offset = 0; offset < count; offset += 1) {
      const chapterNumber = startChapter + offset;
      const previous = results.at(-1);
      const idea = buildAutomaticIdea(options.idea || state.bookBible.premise || 'Escalate the central conflict.', chapterNumber, previous);

      const result = await generateChapter(rootPath, {
        ...options,
        chapter: chapterNumber,
        idea,
        notes: buildAutomaticNotes(options.notes || '', chapterNumber, offset)
      });

      results.push(result);
    }

    return {
      message: `Generated ${count} chapter${count === 1 ? '' : 's'}.`,
      activeBookId: state.activeBook.id,
      startChapter,
      count,
      chapters: results
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
    const outlineSnapshot = buildOutlineSnapshot(state, chapter, options);
    const baseInput = {
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
      SERIES_BOOKS: buildSeriesShelf(state.allSeriesBooks, state.activeBook.id),
      SERIES_CONTINUITY: state.seriesContinuity,
      LAST_CHAPTER: state.timeline.chapters?.slice(-1)[0] || null,
      WRITERS_ROOM: buildRoomState(state.effectiveAgents.agents)
    };

    const architect = await runAgent(rootPath, state, env, 'architect', baseInput, options.dryRun);
    const characterMaster = await runAgent(rootPath, state, env, 'character_master', {
      ...baseInput,
      ARCHITECT: architect
    }, options.dryRun);
    const chapterPlanner = await runAgent(rootPath, state, env, 'chapter_planner', {
      ...baseInput,
      ARCHITECT: architect,
      CHARACTER_MASTER: characterMaster
    }, options.dryRun);

    let writer = await runAgent(rootPath, state, env, 'writer', {
      ...baseInput,
      ARCHITECT: architect,
      CHARACTER_MASTER: characterMaster,
      CHAPTER_PLANNER: chapterPlanner,
      REVISION_REQUEST: null,
      PREVIOUS_DRAFT: null
    }, options.dryRun);

    let critic = null;
    let continuity = null;
    let editor = null;
    let votes = null;
    let revisionRound = 0;

    while (revisionRound <= maxRevisionRounds) {
      critic = await runAgent(rootPath, state, env, 'critic', {
        ...baseInput,
        CHAPTER_PLANNER: chapterPlanner,
        DRAFT: writer
      }, options.dryRun);

      continuity = await runAgent(rootPath, state, env, 'continuity_keeper', {
        ...baseInput,
        CHAPTER_PLANNER: chapterPlanner,
        DRAFT: writer
      }, options.dryRun);

      editor = await runAgent(rootPath, state, env, 'editor', {
        ...baseInput,
        CHAPTER_PLANNER: chapterPlanner,
        DRAFT: writer,
        CRITIC: critic,
        CONTINUITY: continuity
      }, options.dryRun);

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

      if (!needsRevision(critic, continuity, votes, approval) || revisionRound === maxRevisionRounds) {
        break;
      }

      revisionRound += 1;
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
    }

    const finalMarkdown = editor.final_markdown || writer.draft_markdown || '';
    const chapterTitle = editor.chapter_title || writer.chapter_title || chapterPlanner.chapter_title || `Chapter ${chapter}`;

    await persistChapter(rootPath, chapterId, {
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

    return {
      message: `Chapter ${chapter} generated.`,
      activeBookId: state.activeBook.id,
      chapter,
      chapterTitle,
      revisionRound,
      voteSummary: votes?.summary || null,
      files: {
        plan: `${CHAPTERS_DIR}/chapter_${chapterId}_plan.json`,
        draft: `${CHAPTERS_DIR}/chapter_${chapterId}_draft.md`,
        review: `${CHAPTERS_DIR}/chapter_${chapterId}_review.json`,
        final: `${CHAPTERS_DIR}/chapter_${chapterId}_final.md`
      }
    };
  });
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

function needsRevision(critic, continuity, votes, approval) {
  const highIssues = (critic?.issues || []).filter((issue) => issue.severity === 'high').length;
  const criticTooWeak = highIssues > Number(approval.critic_max_high_issues ?? 1);
  const rejected = ['reject', 'revise'].includes(critic?.verdict);
  const continuityFailed = approval.continuity_must_pass !== false && continuity?.pass === false;
  const voteFailed = votes?.summary?.approved === false;

  return Boolean(criticTooWeak || continuityFailed || rejected || voteFailed);
}

async function persistChapter(rootPath, chapterId, payload) {
  await Promise.all([
    fs.rm(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_it.md`), { force: true }),
    fs.rm(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_translation.json`), { force: true }),
    writeJson(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_plan.json`), {
      outline_snapshot: payload.outlineSnapshot,
      architect: payload.architect,
      character_master: payload.characterMaster,
      chapter_planner: payload.chapterPlanner
    }),
    writeText(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_draft.md`), `${payload.writer.draft_markdown || ''}\n`),
    writeJson(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_review.json`), {
      critic: payload.critic,
      continuity_keeper: payload.continuity,
      editor: payload.editor,
      votes: payload.votes,
      revision_round: payload.revisionRound
    }),
    writeText(path.join(rootPath, CHAPTERS_DIR, `chapter_${chapterId}_final.md`), `${payload.finalMarkdown}\n`)
  ]);
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
