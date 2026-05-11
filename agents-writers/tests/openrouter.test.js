import assert from 'node:assert/strict';
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

test('callOpenRouter repairs control characters inside JSON strings', async () => {
  const originalFetch = globalThis.fetch;
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
  }
});

test('callOpenRouter still throws on genuinely non-JSON content', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    statusText: 'OK',
    json: async () => makePayload('not json at all')
  });

  try {
    await assert.rejects(
      () => callOpenRouter({
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
  }
});

test('callOpenRouter retries when the model returns an empty response', async () => {
  const originalFetch = globalThis.fetch;
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
  }
});

test('callOpenRouter repairs missing commas between JSON array elements', async () => {
  const originalFetch = globalThis.fetch;
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
  }
});