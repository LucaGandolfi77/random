import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { callOpenRouter } from '../src/lib/openrouter.js';

const TEST_API_KEY = 'sk-or-test-key';

function makePayload(rawContent) {
  return {
    choices: [
      {
        message: {
          content: rawContent
        }
      }
    ]
  };
}

async function makeTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'openrouter-log-'));
}

async function readJsonLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('callOpenRouter repairs control characters inside JSON strings', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const malformedJson = `{
  "type": "series_pattern",
  "pattern_overview": "Line one
line two",
  "next_book": {
    "title": "The Glass Regent",
    "premise": "A council fractures
under moonlight."
  }
}`;

  globalThis.fetch = async () => ({
    ok: true,
    statusText: 'OK',
    json: async () => makePayload(malformedJson)
  });

  try {
    const result = await callOpenRouter({
      rootPath: tempRoot,
      apiKey: TEST_API_KEY,
      appTitle: 'Test',
      httpReferer: 'https://localhost',
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'Return JSON only.',
      input: { ping: true },
      temperature: 0.2,
      maxTokens: 120
    });

    assert.equal(result.data.type, 'series_pattern');
    assert.equal(result.data.pattern_overview, 'Line one\nline two');
    assert.equal(result.data.next_book.title, 'The Glass Regent');
    assert.equal(result.data.next_book.premise, 'A council fractures\nunder moonlight.');
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter still throws on genuinely non-JSON content', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();

  globalThis.fetch = async () => ({
    ok: true,
    statusText: 'OK',
    json: async () => makePayload('not json at all')
  });

  try {
    await assert.rejects(
      () => callOpenRouter({
        rootPath: tempRoot,
        apiKey: TEST_API_KEY,
        appTitle: 'Test',
        httpReferer: 'https://localhost',
        model: 'openai/gpt-oss-20b:free',
        systemPrompt: 'Return JSON only.',
        input: { ping: true },
        temperature: 0.2,
        maxTokens: 120
      }),
      /Could not parse JSON from model response/
    );
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter retries when the model returns an empty response', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;

    if (calls === 1) {
      return {
        ok: true,
        statusText: 'OK',
        json: async () => makePayload('')
      };
    }

    return {
      ok: true,
      statusText: 'OK',
      json: async () => makePayload('{"type":"series_pattern","next_book":{"title":"Recovered"}}')
    };
  };

  try {
    const result = await callOpenRouter({
      rootPath: tempRoot,
      apiKey: TEST_API_KEY,
      appTitle: 'Test',
      httpReferer: 'https://localhost',
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'Return JSON only.',
      input: { ping: true },
      temperature: 0.2,
      maxTokens: 120
    });

    assert.equal(calls, 2);
    assert.equal(result.data.next_book.title, 'Recovered');
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter repairs missing commas between JSON array elements', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const malformedJson = `{
  "type": "chapter_plan",
  "arc_targets": [
    "Protect Elisa's grief thread"
    "Escalate the Rift's cost"
  ],
  "next_arc_targets": [
    "Recover the void fragment"
    "Show the Hall of Mirrors breaking"
  ]
}`;

  globalThis.fetch = async () => ({
    ok: true,
    statusText: 'OK',
    json: async () => makePayload(malformedJson)
  });

  try {
    const result = await callOpenRouter({
      rootPath: tempRoot,
      apiKey: TEST_API_KEY,
      appTitle: 'Test',
      httpReferer: 'https://localhost',
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'Return JSON only.',
      input: { ping: true },
      temperature: 0.2,
      maxTokens: 120
    });

    assert.deepEqual(result.data.arc_targets, [
      "Protect Elisa's grief thread",
      "Escalate the Rift's cost"
    ]);
    assert.deepEqual(result.data.next_arc_targets, [
      'Recover the void fragment',
      'Show the Hall of Mirrors breaking'
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter repairs an unterminated array before the next object property', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const malformedJson = `{
  "type": "proposal",
  "chapter_goal": "Introduce the Aetheric Quill and its cost.",
  "outline_notes": [
    "Use the Glass of Memory's bound signatures as a visual motif after each major scene.",
    "Introduce procedural list of Quill-strokes in brackets for later automation.",
    "Keep dialogue sparse; let the ink's description carry tension.",
    "Tie the living-ink's hue to the emotional weight of the erased memory (e.g.,{red-scarlet} for grief)."


  "risks": "Potential for the memory-loss mechanic to feel mechanical; mitigate by attaching vivid sensory detail to each lost fragment.",
  "handoff_for": "character_master"
}`;

  globalThis.fetch = async () => ({
    ok: true,
    statusText: 'OK',
    json: async () => makePayload(malformedJson)
  });

  try {
    const result = await callOpenRouter({
      rootPath: tempRoot,
      apiKey: TEST_API_KEY,
      appTitle: 'Test',
      httpReferer: 'https://localhost',
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'Return JSON only.',
      input: { ping: true },
      temperature: 0.2,
      maxTokens: 120
    });

    assert.equal(result.data.type, 'proposal');
    assert.equal(result.data.handoff_for, 'character_master');
    assert.equal(Array.isArray(result.data.outline_notes), true);
    assert.match(result.data.outline_notes.at(-1), /red-scarlet/);
    assert.match(String(result.data.risks), /memory-loss mechanic/);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter appends request and response entries to the live log in real time', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const logPath = path.join(tempRoot, 'logs', 'openrouter', 'openrouter-live.jsonl');
  let requestLoggedBeforeResponse = false;

  globalThis.fetch = async () => {
    const entries = await readJsonLines(logPath);
    requestLoggedBeforeResponse = entries.some((entry) => entry.phase === 'request' && entry.model === 'openai/gpt-oss-20b:free');

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => makePayload('{"type":"series_pattern","next_book":{"title":"Logged live"}}')
    };
  };

  try {
    const result = await callOpenRouter({
      rootPath: tempRoot,
      apiKey: TEST_API_KEY,
      appTitle: 'Test',
      httpReferer: 'https://localhost',
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'Return JSON only.',
      input: { ping: true },
      temperature: 0.2,
      maxTokens: 120
    });

    const entries = await readJsonLines(logPath);

    assert.equal(result.data.next_book.title, 'Logged live');
    assert.equal(requestLoggedBeforeResponse, true);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].phase, 'request');
    assert.equal(entries[1].phase, 'response');
    assert.equal(entries[1].status, 200);
    assert.equal(entries[0].headers.Authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter appends an error entry when fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const logPath = path.join(tempRoot, 'logs', 'openrouter', 'openrouter-live.jsonl');

  globalThis.fetch = async () => {
    throw new Error('socket hang up');
  };

  try {
    await assert.rejects(
      () => callOpenRouter({
        rootPath: tempRoot,
        apiKey: TEST_API_KEY,
        appTitle: 'Test',
        httpReferer: 'https://localhost',
        model: 'openai/gpt-oss-20b:free',
        systemPrompt: 'Return JSON only.',
        input: { ping: true },
        temperature: 0.2,
        maxTokens: 120
      }),
      /socket hang up/
    );

    const entries = await readJsonLines(logPath);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].phase, 'request');
    assert.equal(entries[1].phase, 'error');
    assert.equal(entries[1].error.message, 'socket hang up');
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('callOpenRouter times out while reading the response body', async () => {
  const originalFetch = globalThis.fetch;
  const tempRoot = await makeTempRoot();
  const logPath = path.join(tempRoot, 'logs', 'openrouter', 'openrouter-live.jsonl');

  globalThis.fetch = async (_url, options = {}) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => new Promise((resolve, reject) => {
      const abortSignal = options.signal;

      if (abortSignal?.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
        return;
      }

      abortSignal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    })
  });

  try {
    await assert.rejects(
      () => callOpenRouter({
        rootPath: tempRoot,
        apiKey: TEST_API_KEY,
        appTitle: 'Test',
        httpReferer: 'https://localhost',
        model: 'openai/gpt-oss-20b:free',
        systemPrompt: 'Return JSON only.',
        input: { ping: true },
        temperature: 0.2,
        maxTokens: 120,
        timeoutMs: 10
      }),
      /timed out after 10ms/
    );

    const entries = await readJsonLines(logPath);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].phase, 'request');
    assert.equal(entries[1].phase, 'error');
    assert.match(entries[1].error.message, /timed out after 10ms/);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});