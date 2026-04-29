import fs from 'node:fs/promises';
import path from 'node:path';

import { readJson, writeJson } from './utils.js';

const MEMORY_DIR = 'memory';
const BOOKS_DIR = path.join(MEMORY_DIR, 'books');
const SERIES_STATE_FILE = path.join(MEMORY_DIR, 'series_state.json');
const LEGACY_FILES = ['book_bible.json', 'timeline.json', 'style_guide.json', 'outline_memory.json'];

export async function loadAllSeriesBooks(rootPath, defaults) {
  const { state } = await ensureSeriesMemory(rootPath, defaults);
  const books = [];

  for (const book of state.books || []) {
    const bookDir = getBookDir(rootPath, book.id);
    const [bookBible, timeline, styleGuide, outlineMemory] = await Promise.all([
      readJson(path.join(bookDir, 'book_bible.json'), defaults.bookBible),
      readJson(path.join(bookDir, 'timeline.json'), defaults.timeline),
      readJson(path.join(bookDir, 'style_guide.json'), defaults.styleGuide),
      readJson(path.join(bookDir, 'outline_memory.json'), defaults.outlineMemory)
    ]);

    books.push({
      book: normalizeBookRecord(book, bookBible),
      bookDir,
      bookBible,
      timeline,
      styleGuide,
      outlineMemory
    });
  }

  return books;
}

export async function analyzeSeriesContinuity(rootPath, defaults) {
  const seriesBooks = await loadAllSeriesBooks(rootPath, defaults);
  const issues = [];
  const characterIndex = new Map();
  const worldRuleIndex = new Map();
  const unresolvedIndex = [];

  for (const entry of seriesBooks) {
    for (const [name, details] of Object.entries(entry.bookBible.characters || {})) {
      characterIndex.set(name, [...(characterIndex.get(name) || []), {
        bookId: entry.book.id,
        title: entry.book.title,
        role: details.role || '',
        wound: details.wound || '',
        arc: details.arc || ''
      }]);
    }

    for (const rule of entry.bookBible.world_rules || []) {
      worldRuleIndex.set(rule, [...(worldRuleIndex.get(rule) || []), entry.book.id]);
    }

    unresolvedIndex.push({
      bookId: entry.book.id,
      title: entry.book.title,
      threads: collectBookThreads(entry.bookBible, entry.outlineMemory)
    });
  }

  for (const [name, appearances] of characterIndex.entries()) {
    const signatures = [...new Set(appearances.map((item) => `${item.role}|${item.wound}|${item.arc}`))];
    if (signatures.length > 1) {
      issues.push({
        severity: 'medium',
        type: 'character-drift',
        message: `Character ${name} has conflicting roles or arcs across books.`,
        books: appearances.map((item) => `${item.bookId}:${item.title}`)
      });
    }
  }

  const allRules = [...worldRuleIndex.entries()];
  for (const [rule, books] of allRules) {
    if (books.length === 1 && seriesBooks.length > 1) {
      issues.push({
        severity: 'low',
        type: 'isolated-world-rule',
        message: `World rule appears in only one book: ${rule}`,
        books
      });
    }
  }

  for (let index = 0; index < unresolvedIndex.length - 1; index += 1) {
    const current = unresolvedIndex[index];
    const next = unresolvedIndex[index + 1];
    for (const thread of current.threads) {
      const referenced = next.threads.some((candidate) => overlap(thread, candidate));
      if (!referenced) {
        issues.push({
          severity: 'low',
          type: 'thread-drop',
          message: `Thread from ${current.title} is not echoed in ${next.title}: ${thread}`,
          books: [current.bookId, next.bookId]
        });
      }
    }
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'high'),
    issueCount: issues.length,
    booksChecked: seriesBooks.length,
    issues
  };
}

export async function ensureSeriesMemory(rootPath, defaults) {
  const statePath = path.join(rootPath, SERIES_STATE_FILE);
  const existingState = await readJson(statePath, null);

  if (!existingState) {
    const initialState = {
      activeBookId: 'book-01',
      series: {
        title: defaults.bookBible?.title ? `${defaults.bookBible.title} Series` : 'Untitled Series',
        description: 'A shelf of interconnected book projects managed by the writer room.'
      },
      books: [
        {
          id: 'book-01',
          title: defaults.bookBible?.title || 'Untitled Project',
          slug: slugify(defaults.bookBible?.title || 'Untitled Project'),
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    await writeJson(statePath, initialState);
  }

  const rawState = await readJson(statePath, null);
  const state = {
    ...rawState,
    books: (rawState.books || []).map((book) => normalizeBookRecord(book, defaults.bookBible))
  };
  const activeBookId = state.activeBookId || state.books?.[0]?.id || 'book-01';
  const activeBook = normalizeBookRecord(state.books?.find((book) => book.id === activeBookId) || state.books?.[0] || {
    id: activeBookId,
    title: defaults.bookBible?.title || 'Untitled Project',
    slug: slugify(defaults.bookBible?.title || 'Untitled Project')
  }, defaults.bookBible);

  await migrateLegacyFiles(rootPath, activeBook.id, defaults);

  return {
    state,
    activeBook
  };
}

export async function loadSeriesBundle(rootPath, defaults) {
  const { state, activeBook } = await ensureSeriesMemory(rootPath, defaults);
  const bookDir = getBookDir(rootPath, activeBook.id);
  const [bookBible, timeline, styleGuide, outlineMemory] = await Promise.all([
    readJson(path.join(bookDir, 'book_bible.json'), defaults.bookBible),
    readJson(path.join(bookDir, 'timeline.json'), defaults.timeline),
    readJson(path.join(bookDir, 'style_guide.json'), defaults.styleGuide),
    readJson(path.join(bookDir, 'outline_memory.json'), defaults.outlineMemory)
  ]);

  return {
    seriesState: state,
    activeBook,
    bookDir,
    bookBible,
    timeline,
    styleGuide,
    outlineMemory
  };
}

export async function saveSeriesBundle(rootPath, payload) {
  const statePath = path.join(rootPath, SERIES_STATE_FILE);
  const existingState = await readJson(statePath, {
    activeBookId: payload.activeBook.id,
    series: { title: `${payload.bookBible.title || 'Untitled Project'} Series`, description: '' },
    books: []
  });
  const bookDir = getBookDir(rootPath, payload.activeBook.id);

  await fs.mkdir(bookDir, { recursive: true });
  await Promise.all([
    writeJson(path.join(bookDir, 'book_bible.json'), payload.bookBible),
    writeJson(path.join(bookDir, 'timeline.json'), payload.timeline),
    writeJson(path.join(bookDir, 'style_guide.json'), payload.styleGuide),
    writeJson(path.join(bookDir, 'outline_memory.json'), payload.outlineMemory)
  ]);

  const nextBooks = Array.isArray(existingState.books)
    ? existingState.books.filter((book) => book.id !== payload.activeBook.id)
    : [];
  nextBooks.push(normalizeBookRecord({
    ...payload.activeBook,
    title: payload.bookBible.title || payload.activeBook.title,
    slug: slugify(payload.bookBible.title || payload.activeBook.title || payload.activeBook.id),
    updatedAt: new Date().toISOString(),
    genre: payload.bookBible.genre,
    premise: payload.bookBible.premise,
    themes: payload.bookBible.themes,
    exportBaseName: payload.bookBible.exportBaseName,
    cover: payload.bookBible.cover
  }, payload.bookBible));

  const nextState = {
    ...existingState,
    activeBookId: payload.activeBook.id,
    books: nextBooks.sort((left, right) => left.createdAt?.localeCompare?.(right.createdAt || '') || 0)
  };

  await writeJson(statePath, nextState);
  await mirrorLegacyFiles(rootPath, payload);

  return nextState;
}

export async function selectActiveBook(rootPath, bookId, defaults) {
  const { state } = await ensureSeriesMemory(rootPath, defaults);
  const target = state.books?.find((book) => book.id === bookId);

  if (!target) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const nextState = {
    ...state,
    activeBookId: bookId
  };

  await writeJson(path.join(rootPath, SERIES_STATE_FILE), nextState);
  const bundle = await loadSeriesBundle(rootPath, defaults);
  await mirrorLegacyFiles(rootPath, bundle);

  return nextState;
}

export async function createSeriesBook(rootPath, options, defaults) {
  const { state } = await ensureSeriesMemory(rootPath, defaults);
  const nextId = options.bookId || `book-${String((state.books?.length || 0) + 1).padStart(2, '0')}`;
  const now = new Date().toISOString();
  const title = options.title || `Book ${String((state.books?.length || 0) + 1).padStart(2, '0')}`;
  const themes = normalizeThemes(options.theme || options.themes || defaults.bookBible.themes || []);
  const book = normalizeBookRecord({
    id: nextId,
    title,
    slug: slugify(title),
    status: 'draft',
    genre: options.genre || defaults.bookBible.genre,
    premise: options.premise || defaults.bookBible.premise,
    themes,
    exportBaseName: slugify(options.exportBaseName || title),
    cover: buildCoverMetadata({
      title,
      subtitle: options.subtitle,
      author: options.author,
      tagline: options.tagline || options.premise || defaults.bookBible.premise,
      color: options.coverColor
    }, defaults.bookBible),
    createdAt: now,
    updatedAt: now
  }, defaults.bookBible);

  const nextState = {
    ...state,
    activeBookId: nextId,
    books: [...(state.books || []).filter((item) => item.id !== nextId), book]
  };

  await writeJson(path.join(rootPath, SERIES_STATE_FILE), nextState);
  const bookDir = getBookDir(rootPath, nextId);
  await fs.mkdir(bookDir, { recursive: true });
  await Promise.all([
    writeJson(path.join(bookDir, 'book_bible.json'), {
      ...defaults.bookBible,
      title,
      genre: book.genre,
      premise: book.premise,
      themes: book.themes,
      exportBaseName: book.exportBaseName,
      cover: book.cover,
      chapter_registry: []
    }),
    writeJson(path.join(bookDir, 'timeline.json'), defaults.timeline),
    writeJson(path.join(bookDir, 'style_guide.json'), defaults.styleGuide),
    writeJson(path.join(bookDir, 'outline_memory.json'), defaults.outlineMemory)
  ]);

  return nextState;
}

function getBookDir(rootPath, bookId) {
  return path.join(rootPath, BOOKS_DIR, bookId);
}

async function migrateLegacyFiles(rootPath, bookId, defaults) {
  const bookDir = getBookDir(rootPath, bookId);
  await fs.mkdir(bookDir, { recursive: true });

  for (const fileName of LEGACY_FILES) {
    const legacyPath = path.join(rootPath, MEMORY_DIR, fileName);
    const targetPath = path.join(bookDir, fileName);
    const existing = await readJson(targetPath, null);
    if (existing) {
      continue;
    }

    const fallbackKey = fileName.replace('.json', '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const legacyValue = await readJson(legacyPath, defaults[fallbackKey] || null);
    if (legacyValue) {
      await writeJson(targetPath, legacyValue);
    }
  }
}

async function mirrorLegacyFiles(rootPath, payload) {
  await Promise.all([
    writeJson(path.join(rootPath, MEMORY_DIR, 'book_bible.json'), payload.bookBible),
    writeJson(path.join(rootPath, MEMORY_DIR, 'timeline.json'), payload.timeline),
    writeJson(path.join(rootPath, MEMORY_DIR, 'style_guide.json'), payload.styleGuide),
    writeJson(path.join(rootPath, MEMORY_DIR, 'outline_memory.json'), payload.outlineMemory)
  ]);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-project';
}

function normalizeBookRecord(book, bookBible = {}) {
  const resolvedTitle = book.title || bookBible.title || 'Untitled Project';
  return {
    ...book,
    title: resolvedTitle,
    slug: book.slug || slugify(resolvedTitle),
    status: book.status || 'draft',
    genre: book.genre || bookBible.genre || 'speculative fiction',
    premise: book.premise || bookBible.premise || '',
    themes: normalizeThemes(book.themes || bookBible.themes || []),
    exportBaseName: slugify(book.exportBaseName || resolvedTitle || bookBible.exportBaseName || 'untitled-project'),
    cover: buildCoverMetadata(book.cover, bookBible, resolvedTitle),
    createdAt: book.createdAt || new Date().toISOString(),
    updatedAt: book.updatedAt || new Date().toISOString()
  };
}

function buildCoverMetadata(cover = {}, bookBible = {}, fallbackTitle = 'Untitled Project') {
  return {
    title: cover.title || bookBible.cover?.title || fallbackTitle || bookBible.title || 'Untitled Project',
    subtitle: cover.subtitle || bookBible.cover?.subtitle || '',
    author: cover.author || bookBible.cover?.author || 'OpenRouter Book Agents',
    tagline: cover.tagline || bookBible.cover?.tagline || bookBible.premise || '',
    color: cover.color || bookBible.cover?.color || '#7c9cff'
  };
}

function normalizeThemes(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeThemes(item));
  }

  return String(value || '')
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectBookThreads(bookBible, outlineMemory) {
  return appendUniqueStrings(
    (bookBible.chapter_registry || []).flatMap((chapter) => chapter.unresolved_threads || []),
    (outlineMemory.next_targets || [])
  );
}

function overlap(left, right) {
  const l = String(left || '').toLowerCase();
  const r = String(right || '').toLowerCase();
  return l.includes(r) || r.includes(l);
}

function appendUniqueStrings(...groups) {
  return [...new Set(groups.flat().map((item) => String(item || '').trim()).filter(Boolean))];
}
