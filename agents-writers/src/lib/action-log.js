import fs from 'node:fs/promises';
import path from 'node:path';

const LOGS_DIR = path.join('logs', 'actions');
const INDEX_FILE = 'index.jsonl';

export async function withActionLog(rootPath, metadata, operation) {
  const startedAt = new Date().toISOString();

  try {
    const result = await operation();
    await recordActionLog(rootPath, {
      ...metadata,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'success',
      output: result
    });
    return result;
  } catch (error) {
    await recordActionLog(rootPath, {
      ...metadata,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'error',
      error
    });
    throw error;
  }
}

export async function recordActionLog(rootPath, entry) {
  const logsDir = path.join(rootPath, LOGS_DIR);
  await fs.mkdir(logsDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileName = `${compactTimestamp(timestamp)}-${slugify(entry.source || 'system')}-${slugify(entry.action || 'action')}.json`;
  const filePath = path.join(logsDir, fileName);
  const payload = {
    id: fileName.replace(/\.json$/, ''),
    timestamp,
    ...normalizeEntry(entry)
  };

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.appendFile(path.join(logsDir, INDEX_FILE), `${JSON.stringify({
    id: payload.id,
    timestamp: payload.timestamp,
    source: payload.source,
    action: payload.action,
    status: payload.status,
    file: path.relative(rootPath, filePath)
  })}\n`, 'utf8');

  return {
    filePath,
    id: payload.id
  };
}

function normalizeEntry(entry) {
  return {
    source: entry.source || 'system',
    action: entry.action || 'action',
    status: entry.status || 'success',
    startedAt: entry.startedAt || null,
    finishedAt: entry.finishedAt || null,
    input: safeValue(entry.input),
    output: safeValue(entry.output),
    context: safeValue(entry.context),
    error: normalizeError(entry.error)
  };
}

function normalizeError(error) {
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

  return safeValue(error);
}

function safeValue(value) {
  if (value === undefined) {
    return null;
  }

  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(value, (key, current) => {
    if (typeof current === 'bigint') {
      return current.toString();
    }

    if (typeof current === 'function') {
      return `[Function ${current.name || 'anonymous'}]`;
    }

    if (current instanceof Error) {
      return normalizeError(current);
    }

    if (current && typeof current === 'object') {
      if (seen.has(current)) {
        return '[Circular]';
      }
      seen.add(current);
    }

    return current;
  }));
}

function compactTimestamp(value) {
  return String(value).replace(/[:.]/g, '-');
}

function slugify(value) {
  return String(value || 'action')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'action';
}
