import fs from 'node:fs/promises';
import path from 'node:path';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_LOG_DIR = path.join('logs', 'openrouter');
const OPENROUTER_LOG_FILE = 'openrouter-live.jsonl';
const DEFAULT_OPENROUTER_TIMEOUT_MS = 90_000;

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
    return parseJsonWithRepair(normalized);
  } catch {
    // Continue.
  }

  const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    try {
      return parseJsonWithRepair(fencedMatch[1].trim());
    } catch {
      // Continue.
    }
  }

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = normalized.slice(firstBrace, lastBrace + 1);
    return parseJsonWithRepair(candidate);
  }

  throw new Error(`Could not parse JSON from model response:\n${normalized}`);
}

function parseJsonWithRepair(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
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
      return JSON.parse(structuralRepair);
    }

    throw error;
  }
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
