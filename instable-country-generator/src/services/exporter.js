import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { METRIC_LABELS } from '../simulation/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, '../../exports');

function ensureExportsDir() {
  fs.mkdirSync(exportsDir, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function formatMetricTable(state) {
  return Object.entries(METRIC_LABELS)
    .map(
      ([key, label]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(state[key])}</td>
        </tr>
      `
    )
    .join('');
}

function renderTurnCard(turn) {
  const actions = (turn.actions || [])
    .map(
      (action) => `
        <li>
          <strong>${escapeHtml(action.agentName)}</strong>: ${escapeHtml(action.actionType.replaceAll('_', ' '))}
          targeting ${escapeHtml(action.target)} at intensity ${escapeHtml(action.intensity)}.
          ${escapeHtml(action.rationale)}
        </li>
      `
    )
    .join('');

  const events = (turn.events || [])
    .map(
      (event) => `
        <li>
          <strong>${escapeHtml(event.headline)}</strong>
          <span>${escapeHtml(event.detail)}</span>
        </li>
      `
    )
    .join('');

  return `
    <section class="turn-card">
      <header>
        <h3>Turn ${escapeHtml(turn.index)}</h3>
        <p>${escapeHtml(turn.summary?.headline || 'No summary available')}</p>
      </header>
      <p>${escapeHtml(turn.summary?.summary || '')}</p>
      <div class="turn-grid">
        <div>
          <h4>Actions</h4>
          <ul>${actions || '<li>No actions recorded.</li>'}</ul>
        </div>
        <div>
          <h4>Events</h4>
          <ul>${events || '<li>No events recorded.</li>'}</ul>
        </div>
      </div>
    </section>
  `;
}

export function buildSessionExportPayload(session) {
  return {
    appName: 'Unstable Imaginary Countries Generator',
    exportedAt: new Date().toISOString(),
    sessionId: session.id,
    meta: session.meta || null,
    country: session.country,
    settings: session.settings,
    status: session.status,
    actorProfiles: session.actorProfiles || {},
    factionDynamics: session.factionDynamics || {},
    currentState: session.state,
    latestTurn: session.latestTurn,
    history: session.history
  };
}

export function buildSessionReportHtml(session) {
  const outcome = session.status?.outcome?.label || 'Simulation in progress';
  const turnCards = (session.history || []).map((turn) => renderTurnCard(turn)).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(session.country.name)} Simulation Report</title>
    <style>
      body { margin: 0; font-family: "Segoe UI", sans-serif; color: #142326; background: linear-gradient(135deg, #f1e7d0, #d2ded3); }
      main { width: min(1100px, calc(100vw - 32px)); margin: 24px auto; padding: 28px; border-radius: 24px; background: rgba(255, 252, 245, 0.94); box-shadow: 0 24px 60px rgba(20,35,38,0.16); }
      h1, h2, h3, h4 { margin: 0 0 12px; }
      p, li, td { line-height: 1.55; }
      .meta, .profiles, .turn-grid { display: grid; gap: 16px; }
      .meta { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 20px 0; }
      .card, .turn-card { padding: 18px; border-radius: 18px; border: 1px solid rgba(20,35,38,0.1); background: rgba(255, 251, 240, 0.85); }
      .profiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 10px 0; border-bottom: 1px solid rgba(20,35,38,0.08); }
      ul { padding-left: 18px; }
      @media (max-width: 800px) { .meta, .profiles, .turn-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p>Unstable Imaginary Countries Generator</p>
      <h1>${escapeHtml(session.country.name)}</h1>
      <p>${escapeHtml(session.country.description)}</p>
      <div class="meta">
        <article class="card"><h3>Outcome</h3><p>${escapeHtml(outcome)}</p></article>
        <article class="card"><h3>Turns Played</h3><p>${escapeHtml(session.state.turn)}</p></article>
        <article class="card"><h3>Model Mode</h3><p>${escapeHtml(session.settings.useMock ? 'Mock' : session.settings.model || 'OpenRouter')}</p></article>
      </div>
      <section class="card">
        <h2>Current Metrics</h2>
        <table>${formatMetricTable(session.state)}</table>
      </section>
      <section>
        <h2>Faction Profiles</h2>
        <div class="profiles">
          ${Object.entries(session.actorProfiles || {})
            .map(
              ([agentKey, profile]) => `
                <article class="card">
                  <h3>${escapeHtml(agentKey.replaceAll('_', ' '))}</h3>
                  <p><strong>Ideology:</strong> ${escapeHtml(profile.ideology)}</p>
                  <p><strong>Long game:</strong> ${escapeHtml(profile.longGame)}</p>
                  <p><strong>Red lines:</strong> ${escapeHtml((profile.redLines || []).join(', '))}</p>
                  <p><strong>Preferred levers:</strong> ${escapeHtml((profile.preferredLevers || []).join(', '))}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>
      <section>
        <h2>Faction Currents</h2>
        <div class="profiles">
          ${Object.entries(session.factionDynamics || {})
            .map(
              ([agentKey, dynamics]) => `
                <article class="card">
                  <h3>${escapeHtml(agentKey.replaceAll('_', ' '))}</h3>
                  <p><strong>Dominant current:</strong> ${escapeHtml(dynamics.dominantCurrentName || 'None')}</p>
                  <p><strong>Cohesion:</strong> ${escapeHtml(dynamics.cohesion)}</p>
                  <p><strong>Split risk:</strong> ${escapeHtml(dynamics.splitRisk)}</p>
                  <p><strong>Fault line:</strong> ${escapeHtml(dynamics.faultLine || 'No fault line recorded.')}</p>
                  <p><strong>Active split:</strong> ${escapeHtml(dynamics.activeSplit?.currentName || 'No active split')}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>
      <section>
        <h2>Turn History</h2>
        ${turnCards}
      </section>
    </main>
  </body>
</html>`;
}

export function writeSessionExports(session) {
  ensureExportsDir();

  const baseName = `${slugify(session.country?.name || 'country')}-${String(session.id || '').slice(0, 8)}`;
  const jsonFileName = `${baseName}-simulation.json`;
  const htmlFileName = `${baseName}-report.html`;
  const jsonPath = path.join(exportsDir, jsonFileName);
  const htmlPath = path.join(exportsDir, htmlFileName);

  fs.writeFileSync(jsonPath, `${JSON.stringify(buildSessionExportPayload(session), null, 2)}\n`, 'utf8');
  fs.writeFileSync(htmlPath, buildSessionReportHtml(session), 'utf8');

  return {
    jsonFileName,
    htmlFileName,
    jsonUrl: `/exports/${jsonFileName}`,
    htmlUrl: `/exports/${htmlFileName}`
  };
}