import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '../../storage');
const legacyStorageDir = path.join(storageRoot, 'sessions');
const databasePath = path.join(storageRoot, 'sessions.sqlite');

fs.mkdirSync(storageRoot, { recursive: true });

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    country_id TEXT,
    country_name TEXT,
    capital TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    turn INTEGER NOT NULL,
    ended INTEGER NOT NULL,
    outcome_key TEXT,
    outcome_label TEXT,
    use_mock INTEGER NOT NULL,
    model TEXT,
    summary_headline TEXT,
    payload_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_country_id ON sessions(country_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_ended ON sessions(ended);
`);

const sessionSelect = db.prepare('SELECT payload_json AS payloadJson FROM sessions WHERE id = ?');
const sessionExists = db.prepare('SELECT 1 FROM sessions WHERE id = ? LIMIT 1');
const sessionUpsert = db.prepare(`
  INSERT INTO sessions (
    id,
    country_id,
    country_name,
    capital,
    created_at,
    updated_at,
    turn,
    ended,
    outcome_key,
    outcome_label,
    use_mock,
    model,
    summary_headline,
    payload_json
  ) VALUES (
    @id,
    @country_id,
    @country_name,
    @capital,
    @created_at,
    @updated_at,
    @turn,
    @ended,
    @outcome_key,
    @outcome_label,
    @use_mock,
    @model,
    @summary_headline,
    @payload_json
  )
  ON CONFLICT(id) DO UPDATE SET
    country_id = excluded.country_id,
    country_name = excluded.country_name,
    capital = excluded.capital,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    turn = excluded.turn,
    ended = excluded.ended,
    outcome_key = excluded.outcome_key,
    outcome_label = excluded.outcome_label,
    use_mock = excluded.use_mock,
    model = excluded.model,
    summary_headline = excluded.summary_headline,
    payload_json = excluded.payload_json
`);

function serializeSession(session) {
  const createdAt = session.meta?.createdAt || new Date().toISOString();
  const updatedAt = session.meta?.updatedAt || createdAt;
  const persisted = {
    ...session,
    meta: {
      ...(session.meta || {}),
      createdAt,
      updatedAt,
      storageMode: 'sqlite'
    }
  };

  return {
    id: persisted.id,
    country_id: persisted.country?.id || '',
    country_name: persisted.country?.name || '',
    capital: persisted.country?.capital || '',
    created_at: createdAt,
    updated_at: updatedAt,
    turn: Number(persisted.state?.turn || 0),
    ended: persisted.status?.ended ? 1 : 0,
    outcome_key: persisted.status?.outcome?.key || null,
    outcome_label: persisted.status?.outcome?.label || null,
    use_mock: persisted.settings?.useMock ? 1 : 0,
    model: persisted.settings?.model || '',
    summary_headline: persisted.latestTurn?.summary?.headline || '',
    payload_json: JSON.stringify(persisted)
  };
}

function persistSession(session) {
  const serialized = serializeSession(session);
  sessionUpsert.run(serialized);
  return JSON.parse(serialized.payload_json);
}

function hydrateSession(sessionId) {
  const row = sessionSelect.get(sessionId);

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.payloadJson);
  } catch {
    return null;
  }
}

function migrateLegacyJsonSessions() {
  if (!fs.existsSync(legacyStorageDir)) {
    return;
  }

  for (const entry of fs.readdirSync(legacyStorageDir)) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(legacyStorageDir, entry);

    try {
      const payload = fs.readFileSync(filePath, 'utf8');
      const session = JSON.parse(payload);

      if (!session?.id || sessionExists.get(session.id)) {
        continue;
      }

      persistSession(session);
    } catch {
      // Ignore malformed legacy files and keep startup resilient.
    }
  }
}

migrateLegacyJsonSessions();

export function createSession(sessionPayload) {
  const timestamp = new Date().toISOString();
  return persistSession({
    ...sessionPayload,
    id: crypto.randomUUID(),
    meta: {
      ...(sessionPayload.meta || {}),
      createdAt: sessionPayload.meta?.createdAt || timestamp,
      updatedAt: timestamp,
      storageMode: 'sqlite'
    }
  });
}

export function getSession(sessionId) {
  return hydrateSession(sessionId);
}

export function updateSession(session) {
  return persistSession({
    ...session,
    meta: {
      ...(session.meta || {}),
      createdAt: session.meta?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storageMode: 'sqlite'
    }
  });
}

export function listSessions({ search = '', status = 'all', countryId = '', limit = 12, offset = 0 } = {}) {
  const clauses = [];
  const params = {
    limit: Math.max(1, Math.min(Number(limit) || 12, 100)),
    offset: Math.max(0, Number(offset) || 0)
  };

  if (status === 'ended') {
    clauses.push('ended = 1');
  } else if (status === 'active') {
    clauses.push('ended = 0');
  }

  if (countryId) {
    clauses.push('country_id = @countryId');
    params.countryId = countryId;
  }

  if (search.trim()) {
    clauses.push('(country_name LIKE @search OR capital LIKE @search OR summary_headline LIKE @search)');
    params.search = `%${search.trim()}%`;
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT
      id,
      country_id AS countryId,
      country_name AS countryName,
      capital,
      created_at AS createdAt,
      updated_at AS updatedAt,
      turn,
      ended,
      outcome_key AS outcomeKey,
      outcome_label AS outcomeLabel,
      use_mock AS useMock,
      model,
      summary_headline AS summaryHeadline
    FROM sessions
    ${whereClause}
    ORDER BY updated_at DESC
    LIMIT @limit OFFSET @offset
  `).all(params);

  return rows.map((row) => ({
    ...row,
    ended: Boolean(row.ended),
    useMock: Boolean(row.useMock)
  }));
}

export function getSessionStoreInfo() {
  return {
    mode: 'sqlite',
    databasePath
  };
}