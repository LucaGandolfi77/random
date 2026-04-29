import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRuntimeConfig, normalizeRequestedModel } from './src/config.js';
import { getBootstrapSeeds, MAP_LAYOUT } from './src/data/worldSeeds.js';
import { buildSessionExportPayload, buildSessionReportHtml, writeSessionExports } from './src/services/exporter.js';
import { describeAgentModes, buildSession, advanceSession } from './src/simulation/engine.js';
import { discoverFreeModels } from './src/services/openrouter.js';
import { createSession, getSession, getSessionStoreInfo, listSessions, updateSession } from './src/state/sessionStore.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelCache = {
  models: [],
  fetchedAt: 0
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

async function getAvailableModels() {
  const runtimeConfig = getRuntimeConfig();
  const maxAgeMs = 10 * 60 * 1000;

  if (Date.now() - modelCache.fetchedAt < maxAgeMs && modelCache.models.length > 0) {
    return modelCache.models;
  }

  try {
    const models = await discoverFreeModels(runtimeConfig);
    modelCache.models = models;
    modelCache.fetchedAt = Date.now();
    return models;
  } catch {
    modelCache.models = runtimeConfig.configuredModels;
    modelCache.fetchedAt = Date.now();
    return modelCache.models;
  }
}

app.get('/api/health', (_request, response) => {
  const runtimeConfig = getRuntimeConfig();
  response.json({
    ok: true,
    mode: runtimeConfig.apiKey ? 'openrouter-ready' : 'mock-only'
  });
});

app.get('/api/bootstrap', async (_request, response) => {
  const runtimeConfig = getRuntimeConfig();
  const availableModels = await getAvailableModels();
  const storeInfo = getSessionStoreInfo();

  response.json({
    appName: 'Unstable Imaginary Countries Generator',
    seeds: getBootstrapSeeds(),
    mapLayout: MAP_LAYOUT,
    recentSessions: listSessions({ limit: 8 }),
    ...describeAgentModes(runtimeConfig, availableModels),
    storageMode: storeInfo.mode
  });
});

app.get('/api/sessions', (request, response) => {
  const sessions = listSessions({
    search: String(request.query.q || ''),
    status: String(request.query.status || 'all'),
    countryId: String(request.query.countryId || ''),
    limit: request.query.limit,
    offset: request.query.offset
  });

  response.json({
    sessions,
    storageMode: getSessionStoreInfo().mode
  });
});

app.post('/api/sessions', async (request, response) => {
  const runtimeConfig = getRuntimeConfig();
  const availableModels = await getAvailableModels();
  const model = normalizeRequestedModel(request.body?.model, availableModels);
  const useMock = Boolean(request.body?.useMock) || !runtimeConfig.apiKey;
  const session = createSession(
    buildSession({
      seedId: request.body?.seedId || 'veloria',
      model,
      useMock
    })
  );

  response.status(201).json({
    session,
    availableModels,
    apiEnabled: Boolean(runtimeConfig.apiKey)
  });
});

app.get('/api/sessions/:sessionId', (request, response) => {
  const session = getSession(request.params.sessionId);

  if (!session) {
    response.status(404).json({ error: 'Session not found.' });
    return;
  }

  response.json({ session });
});

app.get('/api/sessions/:sessionId/export.json', (request, response) => {
  const session = getSession(request.params.sessionId);

  if (!session) {
    response.status(404).json({ error: 'Session not found.' });
    return;
  }

  response.json(buildSessionExportPayload(session));
});

app.get('/api/sessions/:sessionId/report.html', (request, response) => {
  const session = getSession(request.params.sessionId);

  if (!session) {
    response.status(404).send('Session not found.');
    return;
  }

  response.type('html').send(buildSessionReportHtml(session));
});

app.post('/api/sessions/:sessionId/export', (request, response) => {
  const session = getSession(request.params.sessionId);

  if (!session) {
    response.status(404).json({ error: 'Session not found.' });
    return;
  }

  const files = writeSessionExports(session);
  response.status(201).json({
    sessionId: session.id,
    files
  });
});

app.post('/api/sessions/:sessionId/turn', async (request, response) => {
  const session = getSession(request.params.sessionId);

  if (!session) {
    response.status(404).json({ error: 'Session not found.' });
    return;
  }

  const runtimeConfig = getRuntimeConfig();
  const availableModels = await getAvailableModels();
  const updatedSession = await advanceSession({
    session,
    model: request.body?.model,
    useMock: Boolean(request.body?.useMock),
    runtimeConfig,
    availableModels
  });

  updateSession(updatedSession);
  response.json({
    session: updatedSession,
    availableModels,
    apiEnabled: Boolean(runtimeConfig.apiKey)
  });
});

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Unstable Imaginary Countries Generator listening on http://localhost:${port}`);
});