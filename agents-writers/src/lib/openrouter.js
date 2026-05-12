import fs from 'node:fs/promises';
import path from 'node:path';

import { jsonrepair } from 'jsonrepair';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_LOG_DIR = path.join('logs', 'openrouter');
const OPENROUTER_LOG_FILE = 'openrouter-live.jsonl';
const DEFAULT_OPENROUTER_TIMEOUT_MS = 500_000;
const JSON_LIST_FIELD_NAMES = new Set([
  'active_arcs',
  'arc_focus',
  'arc_payoffs',
  'arc_targets',
  'automation_notes',
  'blockingVotes',
  'canon_notes',
  'carry_over_threads',
  'celebrate',
  'character_notes',
  'chapter_registry',
  'conflict_upgrades',
  'constraints',
  'dialogue_instructions',
  'emotional_targets',
  'endgame_promises',
  'global_targets',
  'issues',
  'memory_updates',
  'motif_cycle',
  'must_fix',
  'next_arc_targets',
  'next_chapter_seed',
  'next_targets',
  'outline_memory_updates',
  'outline_notes',
  'planned_payoffs',
  'recommended_beats',
  'recent_adjustments',
  'rivalries',
  'risks',
  'scene_cards',
  'scene_summaries',
  'sequence_beats',
  'themes',
  'timeline_events',
  'unresolved_threads',
  'world_rules',
  'world_rules_to_echo'
]);

let openRouterRequestSequence = 0;

function normalizeOpenRouterApiKey(apiKey) {
  const normalized = String(apiKey ?? '').trim();

  if (!normalized) {
    throw new Error('Missing OPENROUTER_API_KEY. Copy .env.example to .env and set a real key.');
  }

  if (normalized === 'your_openrouter_api_key_here') {
    throw new Error('Invalid OPENROUTER_API_KEY. Replace the placeholder value in .env with a real OpenRouter key.');
  }

  if (!normalized.startsWith('sk-or-')) {
    throw new Error('Invalid OPENROUTER_API_KEY. The key should start with "sk-or-". Remove surrounding quotes if present and check your .env value.');
  }

  return normalized;
}

function buildOpenRouterRequestBody({
  model,
  systemPrompt,
  input,
  temperature,
  maxTokens
}) {
  return {
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: JSON.stringify(input, null, 2)
      }
    ]
  };
}

function nextOpenRouterRequestId() {
  openRouterRequestSequence += 1;
  return `openrouter-${process.pid}-${Date.now()}-${openRouterRequestSequence}`;
}

function normalizeOpenRouterLogRoot(rootPath) {
  return rootPath ? path.resolve(rootPath) : process.cwd();
}

async function appendOpenRouterLog(rootPath, entry) {
  const logRoot = normalizeOpenRouterLogRoot(rootPath);
  const logDir = path.join(logRoot, OPENROUTER_LOG_DIR);
  const logPath = path.join(logDir, OPENROUTER_LOG_FILE);
  const payload = {
    timestamp: new Date().toISOString(),
    processId: process.pid,
    source: 'openrouter',
    ...entry
  };

  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(payload)}\n`, 'utf8');

  return logPath;
}

async function appendOpenRouterLogSafe(rootPath, entry) {
  try {
    return await appendOpenRouterLog(rootPath, entry);
  } catch {
    return null;
  }
}

function sanitizeOpenRouterHeaders(headers) {
  return {
    'Content-Type': headers['Content-Type'],
    'HTTP-Referer': headers['HTTP-Referer'],
    'X-Title': headers['X-Title']
  };
}

function normalizeErrorForLog(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}

async function readOpenRouterPayload(response) {
  if (typeof response.text === 'function') {
    const rawBody = await response.text();

    if (!rawBody) {
      return {
        payload: {},
        rawBody: ''
      };
    }

    try {
      return {
        payload: JSON.parse(rawBody),
        rawBody
      };
    } catch {
      return {
        payload: {},
        rawBody
      };
    }
  }

  const payload = await response.json().catch(() => ({}));
  return {
    payload,
    rawBody: JSON.stringify(payload)
  };
}

function extractJsonObject(content) {
  const normalized = String(content ?? '').trim();

  if (!normalized) {
    throw new Error('Model returned an empty response.');
  }

  try {
    return ensureJsonObject(parseJsonWithRepair(normalized));
  } catch {
    // Continue.
  }

  const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    try {
      return ensureJsonObject(parseJsonWithRepair(fencedMatch[1].trim()));
    } catch {
      // Continue.
    }
  }

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = normalized.slice(firstBrace, lastBrace + 1);
    return ensureJsonObject(parseJsonWithRepair(candidate));
  }

  throw new Error(`Could not parse JSON from model response:\n${normalized}`);
}

function ensureJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeRecoveredJsonValue(value);
  }

  throw new Error('Model did not return a JSON object.');
}

function normalizeRecoveredJsonValue(value, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRecoveredJsonValue(item));
  }

  if (value && typeof value === 'object') {
    const normalized = {};

    for (const [currentKey, currentValue] of Object.entries(value)) {
      let nextValue = normalizeRecoveredJsonValue(currentValue, currentKey);

      if (Array.isArray(nextValue)) {
        const extractedEntries = extractSpilledObjectEntries(nextValue);

        if (extractedEntries) {
          nextValue = extractedEntries.arrayItems;
          Object.assign(normalized, normalizeRecoveredJsonValue(extractedEntries.objectEntries));
        }
      }

      normalized[currentKey] = normalizeFieldShape(currentKey, nextValue);
    }

    return normalized;
  }

  return normalizeFieldShape(key, value);
}

function extractSpilledObjectEntries(values) {
  for (let index = 0; index <= values.length - 3; index += 1) {
    const remainder = values.length - index;

    if (remainder % 3 !== 0) {
      continue;
    }

    if (!isSpilledPropertyKey(values[index]) || values[index + 1] !== ':') {
      continue;
    }

    const objectEntries = {};
    let offset = index;
    let valid = true;

    while (offset < values.length) {
      const entryKey = values[offset];
      const separator = values[offset + 1];
      const entryValue = values[offset + 2];

      if (!isSpilledPropertyKey(entryKey) || separator !== ':' || entryValue === undefined) {
        valid = false;
        break;
      }

      objectEntries[entryKey] = entryValue;
      offset += 3;
    }

    if (valid) {
      return {
        arrayItems: values.slice(0, index),
        objectEntries
      };
    }
  }

  return null;
}

function isSpilledPropertyKey(value) {
  return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value.trim());
}

function normalizeFieldShape(key, value) {
  if (JSON_LIST_FIELD_NAMES.has(key) && typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return value;
}

function parseJsonWithRepair(input) {
  let lastError = null;

  try {
    return JSON.parse(input);
  } catch (error) {
    lastError = error;
    const repaired = escapeControlCharactersInStrings(input);

    if (repaired !== input) {
      try {
        return JSON.parse(repaired);
      } catch {
        // Continue into structural repair.
      }
    }

    const structuralRepair = insertMissingCommasBetweenJsonValues(repaired);

    if (structuralRepair !== repaired) {
      try {
        return JSON.parse(structuralRepair);
      } catch (structuralError) {
        lastError = structuralError;
      }
    }

    const arrayBoundaryRepair = closeUnterminatedArraysBeforeObjectProperties(structuralRepair);

    if (arrayBoundaryRepair !== structuralRepair) {
      try {
        return JSON.parse(arrayBoundaryRepair);
      } catch (arrayBoundaryError) {
        lastError = arrayBoundaryError;
      }
    }

    const repairCandidates = [...new Set([input, repaired, structuralRepair, arrayBoundaryRepair])]
      .filter((candidate) => looksLikeJsonCandidate(candidate));

    for (const candidate of repairCandidates) {
      try {
        const repairedByLibrary = jsonrepair(candidate);
        return JSON.parse(repairedByLibrary);
      } catch {
        // Continue trying the next candidate.
      }
    }

    throw lastError;
  }
}

function looksLikeJsonCandidate(input) {
  const normalized = String(input ?? '').trim();
  return normalized.startsWith('{') || normalized.startsWith('[');
}

function closeUnterminatedArraysBeforeObjectProperties(input) {
  let result = '';
  let inString = false;
  let escaping = false;
  const stack = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      result += char;

      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (
      char === '"' &&
      stack.at(-1) === '[' &&
      stack.at(-2) === '{' &&
      isObjectPropertyToken(input, index)
    ) {
      result += '],';
      stack.pop();
    }

    result += char;

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }

    if (char === '}' || char === ']') {
      stack.pop();
    }
  }

  return result;
}

function isObjectPropertyToken(input, startIndex) {
  let index = startIndex + 1;
  let escaping = false;

  for (; index < input.length; index += 1) {
    const char = input[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      index += 1;
      break;
    }
  }

  while (index < input.length && /\s/.test(input[index])) {
    index += 1;
  }

  return input[index] === ':';
}

function escapeControlCharactersInStrings(input) {
  let result = '';
  let inString = false;
  let escaping = false;

  for (const char of input) {
    const code = char.charCodeAt(0);

    if (!inString) {
      if (char === '"') {
        inString = true;
      }

      if (code <= 0x1f && !['\n', '\r', '\t', ' '].includes(char)) {
        continue;
      }

      result += char;
      continue;
    }

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaping = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = false;
      continue;
    }

    if (code <= 0x1f) {
      result += escapeControlCharacter(char, code);
      continue;
    }

    result += char;
  }

  return result;
}

function escapeControlCharacter(char, code) {
  switch (char) {
    case '\n':
      return '\\n';
    case '\r':
      return '\\r';
    case '\t':
      return '\\t';
    case '\b':
      return '\\b';
    case '\f':
      return '\\f';
    default:
      return `\\u${code.toString(16).padStart(4, '0')}`;
  }
}

function insertMissingCommasBetweenJsonValues(input) {
  let result = '';
  let inString = false;
  let escaping = false;
  const stack = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      result += char;

      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      result += char;
      continue;
    }

    if (char === '}' || char === ']') {
      stack.pop();
      result += char;
      continue;
    }

    if (/\s/.test(char)) {
      let end = index;
      while (end + 1 < input.length && /\s/.test(input[end + 1])) {
        end += 1;
      }

      const whitespaceChunk = input.slice(index, end + 1);
      const previousSignificant = findPreviousSignificantCharacter(result);
      const nextSignificant = findNextSignificantCharacter(input, end + 1);
      const currentContainer = stack.at(-1);

      if (
        currentContainer &&
        isJsonValueBoundary(previousSignificant, nextSignificant)
      ) {
        result += `,${whitespaceChunk}`;
      } else {
        result += whitespaceChunk;
      }

      index = end;
      continue;
    }

    result += char;
  }

  return result;
}

function findPreviousSignificantCharacter(text) {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (!/\s/.test(text[index])) {
      return text[index];
    }
  }

  return '';
}

function findNextSignificantCharacter(text, startIndex) {
  for (let index = startIndex; index < text.length; index += 1) {
    if (!/\s/.test(text[index])) {
      return text[index];
    }
  }

  return '';
}

function isJsonValueBoundary(previousCharacter, nextCharacter) {
  const previousEndsValue = /["}\]0-9el]/.test(previousCharacter);
  const nextStartsValue = /["{\[\-0-9tfn]/.test(nextCharacter);
  return previousEndsValue && nextStartsValue;
}

export async function callOpenRouter({
  rootPath,
  apiKey,
  appTitle,
  httpReferer,
  model,
  systemPrompt,
  input,
  temperature,
  maxTokens,
  timeoutMs = DEFAULT_OPENROUTER_TIMEOUT_MS,
  dryRun = false
}) {
  if (dryRun) {
    return {
      model,
      raw: JSON.stringify({ dryRun: true, input }, null, 2),
      data: {
        type: 'dry_run',
        model,
        echoed_input: input
      }
    };
  }

  const normalizedApiKey = normalizeOpenRouterApiKey(apiKey);

  const maxAttempts = 3;
  let lastRecoverableError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const payload = await requestOpenRouterCompletion({
      rootPath,
      apiKey: normalizedApiKey,
      appTitle,
      httpReferer,
      model,
      systemPrompt,
      input,
      temperature,
      maxTokens,
      timeoutMs,
      attempt
    });

    const raw = extractMessageText(payload);

    try {
      return {
        model,
        raw,
        data: extractJsonObject(raw)
      };
    } catch (error) {
      if (attempt === maxAttempts || !isRecoverableModelOutputError(error)) {
        throw error;
      }

      lastRecoverableError = error;
    }
  }

  throw lastRecoverableError || new Error(`OpenRouter returned no usable JSON for ${model}.`);
}

async function requestOpenRouterCompletion({
  rootPath,
  apiKey,
  appTitle,
  httpReferer,
  model,
  systemPrompt,
  input,
  temperature,
  maxTokens,
  timeoutMs,
  attempt
}) {

  const requestBody = buildOpenRouterRequestBody({
    model,
    systemPrompt,
    input,
    temperature,
    maxTokens
  });
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': httpReferer || 'https://localhost',
    'X-Title': appTitle || 'Book Agents Lab'
  };
  const requestId = nextOpenRouterRequestId();
  const startedAt = Date.now();

  // Keep the timeout active until the response body has been fully read.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let payload = {};
  let rawBody = '';

  await appendOpenRouterLogSafe(rootPath, {
    phase: 'request',
    requestId,
    attempt,
    model,
    method: 'POST',
    url: OPENROUTER_URL,
    headers: sanitizeOpenRouterHeaders(headers),
    body: requestBody
  });

  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(requestBody)
    });

    ({ payload, rawBody } = await readOpenRouterPayload(response));
  } catch (fetchError) {
    const normalizedError = fetchError.name === 'AbortError'
      ? new Error(`OpenRouter request timed out after ${formatDurationLabel(timeoutMs)} for model ${model}.`)
      : fetchError;

    await appendOpenRouterLogSafe(rootPath, {
      phase: 'error',
      requestId,
      attempt,
      model,
      durationMs: Date.now() - startedAt,
      error: normalizeErrorForLog(normalizedError)
    });

    throw normalizedError;
  } finally {
    clearTimeout(timeoutId);
  }

  await appendOpenRouterLogSafe(rootPath, {
    phase: 'response',
    requestId,
    attempt,
    model,
    durationMs: Date.now() - startedAt,
    status: response.status ?? null,
    ok: Boolean(response.ok),
    body: payload,
    rawBody: rawBody || null
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed for ${model}: ${payload.error?.message || response.statusText}`);
  }

  return payload;
}

function formatDurationLabel(durationMs) {
  return Number(durationMs) % 1000 === 0
    ? `${Number(durationMs) / 1000}s`
    : `${durationMs}ms`;
}

function extractMessageText(payload) {
  const choice = payload.choices?.[0] || {};
  const message = choice.message || {};
  const content = message.content;

  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      return part?.text || part?.content || part?.arguments || '';
    }).join('\n');
  }

  if (typeof content === 'string') {
    return content;
  }

  if (typeof choice.text === 'string') {
    return choice.text;
  }

  if (Array.isArray(message.tool_calls)) {
    return message.tool_calls
      .map((call) => call?.function?.arguments || '')
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function isRecoverableModelOutputError(error) {
  if (!error) {
    return false;
  }

  if (error instanceof SyntaxError) {
    return true;
  }

  const message = String(error.message || '');
  return message === 'Model returned an empty response.' || message.startsWith('Could not parse JSON from model response:');
}
