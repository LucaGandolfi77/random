from __future__ import annotations

import json
from html import escape

from .models import TownState


def render_explorer_html(state: TownState) -> str:
    return """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#19352c" />
    <meta name="description" content="A portable cemetery explorer for the literary town simulation of {town}." />
    <title>{title}</title>
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icon-192.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="./styles.css" />
    <script defer src="./app.js"></script>
  </head>
  <body>
    <div class="app-shell">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Portable cemetery explorer</p>
          <h1>{title}</h1>
          <p class="lede">
            Walk the exported memory of {town}: epitaphs, family weather, scandals, inheritances,
            and the public timeline that made private griefs intelligible.
          </p>
        </div>
        <div class="hero-actions">
          <button id="installButton" class="ghost-button" hidden>Install App</button>
          <a class="ghost-button" href="./report.html">Open Static Report</a>
          <a class="ghost-button" href="./anthology.md">Read Markdown Anthology</a>
        </div>
        <div id="heroStats" class="hero-stats"></div>
      </header>

      <section class="control-bar panel">
        <label class="control">
          <span>Search the town</span>
          <input id="searchInput" type="search" placeholder="Search names, secrets, districts, events" />
        </label>
        <label class="control">
          <span>Family</span>
          <select id="familyFilter">
            <option value="all">All families</option>
          </select>
        </label>
        <div class="control status-control">
          <span>Status</span>
          <div class="segmented" id="statusFilter">
            <button type="button" class="is-active" data-status="all">All</button>
            <button type="button" data-status="living">Living</button>
            <button type="button" data-status="dead">Dead</button>
          </div>
        </div>
        <button id="reloadButton" class="ghost-button">Reload Bundle</button>
      </section>

      <div class="main-layout">
        <aside class="rail panel">
          <div class="section-heading">
            <h2>Town Voices</h2>
            <p>Choose a life to inspect its kinship, reputation, secrets, and after-voice.</p>
          </div>
          <div id="characterRail" class="character-rail"></div>
        </aside>

        <main class="content-stack">
          <section class="panel">
            <div class="section-heading">
              <h2>Overview</h2>
              <p>The town as a shared machine of weather, class, memory, and inheritance.</p>
            </div>
            <div id="overviewCards" class="overview-grid"></div>
            <div id="townMetadata" class="metadata-grid"></div>
          </section>

          <section class="panel">
            <div class="section-heading">
              <h2>Cemetery Chorus</h2>
              <p>Dead voices speaking from the simulation state, not from generic improvisation.</p>
            </div>
            <div id="chorusGrid" class="chorus-grid"></div>
          </section>

          <section class="panel">
            <div class="section-heading">
              <h2>Family Weather</h2>
              <p>Alliances, feuds, inherited secrets, and the domestic climate each line carries.</p>
            </div>
            <div id="familyGrid" class="family-grid"></div>
          </section>

          <section class="panel">
            <div class="section-heading">
              <h2>Town Timeline</h2>
              <p>Public events, crises, courtships, and the slow accumulation of consequences.</p>
            </div>
            <ol id="timelineList" class="timeline"></ol>
          </section>
        </main>

        <aside class="rail panel detail-shell">
          <div class="section-heading">
            <h2>Selected Life</h2>
            <p>Relationship graph fragments, recent events, and the pressure between private and public story.</p>
          </div>
          <div id="detailPanel" class="detail-panel"></div>
        </aside>
      </div>

      <div id="appNotice" class="notice" hidden></div>
    </div>
  </body>
</html>
""".format(title=escape(state.config.anthology_title), town=escape(state.town_name))


def render_run_archive_html() -> str:
    return """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#19352c" />
    <meta name="description" content="A multi-run archive for Graveyard Chorus exports." />
    <title>Graveyard Chorus Run Archive</title>
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icon-192.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="./runs.css" />
    <script defer src="./runs.js"></script>
  </head>
  <body>
    <div class="archive-shell">
      <header class="archive-hero archive-panel">
        <div>
          <p class="archive-eyebrow">Graveyard Chorus Archive</p>
          <h1>Different runs, different cemeteries, different weather.</h1>
          <p class="archive-lede">
            Browse exported runs as a single PWA archive: compare who survived, what scandals held,
            how many epitaphs were written, and open any run’s full explorer or report.
          </p>
        </div>
        <div class="archive-actions">
          <button id="archiveInstallButton" class="archive-button" hidden>Install Archive</button>
          <button id="archiveReloadButton" class="archive-button archive-button-secondary">Reload Runs</button>
        </div>
        <div id="archiveHeroStats" class="archive-hero-stats"></div>
      </header>

      <section class="archive-toolbar archive-panel">
        <label class="archive-control">
          <span>Search runs</span>
          <input id="archiveSearchInput" type="search" placeholder="Search town, folder, families, motifs" />
        </label>
      </section>

      <div class="archive-layout">
        <aside class="archive-panel archive-list-shell">
          <div class="archive-section-heading">
            <h2>Runs</h2>
            <p>Each card summarizes one exported simulation bundle.</p>
          </div>
          <div id="runList" class="run-list"></div>
        </aside>

        <main class="archive-panel archive-detail-shell">
          <div class="archive-section-heading">
            <h2>Selected Run</h2>
            <p>High-level results, live archive links, and the exported family atmosphere.</p>
          </div>
          <div id="runDetail" class="run-detail"></div>
        </main>
      </div>

      <div id="archiveNotice" class="archive-notice" hidden></div>
    </div>
  </body>
</html>
"""


def render_run_archive_css() -> str:
    return """
:root {
  --paper: #efe7d7;
  --paper-strong: rgba(255, 249, 240, 0.92);
  --ink: #1f1b17;
  --muted: #64594d;
  --forest: #19352c;
  --copper: #9c4a32;
  --gold: #d3ab63;
  --border: rgba(31, 27, 23, 0.12);
  --shadow: rgba(20, 25, 20, 0.18);
  --serif: "Baskerville", "Palatino Linotype", "Book Antiqua", serif;
  --sans: "Avenir Next", "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font-family: var(--sans);
  background:
    radial-gradient(circle at 12% 18%, rgba(156, 74, 50, 0.16), transparent 22%),
    radial-gradient(circle at 82% 8%, rgba(25, 53, 44, 0.19), transparent 24%),
    linear-gradient(180deg, #e8dbc8 0%, #efe7d7 45%, #e5d7c4 100%);
}

.archive-shell {
  max-width: 1460px;
  margin: 0 auto;
  padding: 28px 18px 72px;
}

.archive-panel {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.9), rgba(250, 244, 235, 0.78));
  box-shadow: 0 24px 60px var(--shadow);
  backdrop-filter: blur(8px);
}

.archive-hero {
  padding: 28px;
  display: grid;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.archive-hero::after {
  content: "";
  position: absolute;
  inset: auto -72px -96px auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(211, 171, 99, 0.28), transparent 70%);
}

.archive-eyebrow,
.archive-label,
.archive-chip,
.archive-stat-label {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.73rem;
  color: var(--copper);
}

.archive-hero h1,
.archive-section-heading h2,
.run-card h3,
.run-detail h3 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 600;
  line-height: 1.04;
}

.archive-hero h1 {
  font-size: clamp(2.3rem, 4vw, 4.2rem);
  max-width: 12ch;
}

.archive-lede,
.archive-section-heading p,
.run-card p,
.run-detail p,
.archive-control span {
  color: var(--muted);
}

.archive-actions,
.archive-hero-stats,
.run-card-actions,
.archive-chip-row,
.run-detail-links,
.run-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.archive-button,
.run-link {
  appearance: none;
  border: 1px solid rgba(25, 53, 44, 0.18);
  background: rgba(25, 53, 44, 0.9);
  color: #f7efe4;
  text-decoration: none;
  padding: 0.78rem 1rem;
  font: inherit;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.archive-button-secondary,
.run-link-secondary {
  background: rgba(255, 250, 243, 0.86);
  color: var(--forest);
}

.archive-button:hover,
.archive-button:focus-visible,
.run-link:hover,
.run-link:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(25, 53, 44, 0.18);
}

.archive-hero-stats {
  gap: 14px;
}

.archive-stat-card,
.run-summary-card {
  min-width: 150px;
  padding: 14px 16px;
  border: 1px solid rgba(25, 53, 44, 0.08);
  background: var(--paper-strong);
}

.archive-stat-card strong,
.run-summary-card strong {
  display: block;
  font-size: 1.45rem;
  color: var(--forest);
  margin-top: 0.3rem;
}

.archive-toolbar,
.archive-layout,
.run-card,
.run-detail-grid {
  margin-top: 22px;
}

.archive-toolbar {
  padding: 18px 20px;
}

.archive-control {
  display: grid;
  gap: 8px;
}

.archive-control input {
  width: 100%;
  border: 1px solid rgba(31, 27, 23, 0.14);
  background: rgba(255, 252, 246, 0.88);
  padding: 0.85rem 0.95rem;
  color: var(--ink);
  font: inherit;
}

.archive-layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 22px;
}

.archive-list-shell,
.archive-detail-shell {
  padding: 22px;
}

.archive-section-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.run-list {
  display: grid;
  gap: 16px;
}

.run-card {
  padding: 18px;
  border: 1px solid rgba(31, 27, 23, 0.1);
  background: rgba(255, 251, 246, 0.88);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.run-card:hover,
.run-card.is-active {
  transform: translateY(-1px);
  border-color: rgba(25, 53, 44, 0.25);
  box-shadow: 0 18px 34px rgba(20, 25, 20, 0.12);
}

.run-card-header,
.run-detail-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.run-card-header h3,
.run-detail-header h3 {
  font-size: 1.55rem;
}

.archive-chip {
  border: 1px solid rgba(25, 53, 44, 0.14);
  background: rgba(25, 53, 44, 0.06);
  color: var(--forest);
  padding: 0.32rem 0.55rem;
}

.run-card-stats,
.run-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.run-detail {
  display: grid;
  gap: 18px;
}

.run-detail-section {
  display: grid;
  gap: 10px;
}

.archive-notice {
  position: fixed;
  right: 18px;
  bottom: 18px;
  max-width: 460px;
  padding: 14px 16px;
  color: #f7efe4;
  background: rgba(25, 53, 44, 0.94);
  box-shadow: 0 20px 36px rgba(20, 25, 20, 0.22);
}

.archive-empty {
  padding: 18px;
  border: 1px dashed rgba(31, 27, 23, 0.16);
  background: rgba(255, 252, 246, 0.72);
  color: var(--muted);
}

@media (max-width: 1040px) {
  .archive-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .archive-shell {
    padding: 18px 12px 58px;
  }

  .archive-hero,
  .archive-toolbar,
  .archive-list-shell,
  .archive-detail-shell {
    padding: 18px;
  }
}
""".strip() + "\n"


def render_run_archive_app(*, index_file: str) -> str:
    return f"""
const RUN_ARCHIVE_INDEX = './{index_file}';

const archiveStore = {{
  runs: [],
  selectedRunId: null,
  query: '',
  installPrompt: null
}};

document.addEventListener('DOMContentLoaded', archiveBootstrap);
window.addEventListener('beforeinstallprompt', handleArchiveInstallPrompt);
window.addEventListener('appinstalled', () => showArchiveNotice('Run archive installed for offline browsing.'));

async function archiveBootstrap() {{
  bindArchiveControls();
  registerArchiveServiceWorker();

  if (window.location.protocol === 'file:') {{
    showArchiveNotice('Serve this folder over HTTP for full PWA support and reliable multi-run loading.', true);
  }}

  await loadRunArchive();
}}

function bindArchiveControls() {{
  document.getElementById('archiveSearchInput').addEventListener('input', (event) => {{
    archiveStore.query = event.target.value.trim().toLowerCase();
    renderRunArchive();
  }});

  document.getElementById('archiveReloadButton').addEventListener('click', () => loadRunArchive());
  document.getElementById('archiveInstallButton').addEventListener('click', async () => {{
    if (!archiveStore.installPrompt) {{
      return;
    }}
    archiveStore.installPrompt.prompt();
    await archiveStore.installPrompt.userChoice;
    archiveStore.installPrompt = null;
    document.getElementById('archiveInstallButton').hidden = true;
  }});
}}

function handleArchiveInstallPrompt(event) {{
  event.preventDefault();
  archiveStore.installPrompt = event;
  document.getElementById('archiveInstallButton').hidden = false;
}}

async function registerArchiveServiceWorker() {{
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {{
    return;
  }}

  try {{
    await navigator.serviceWorker.register('./sw.js');
  }} catch (error) {{
    console.warn('Archive service worker registration failed', error);
  }}
}}

async function loadRunArchive() {{
  try {{
    const payload = await fetchArchiveJson(RUN_ARCHIVE_INDEX);
    archiveStore.runs = payload.runs || [];
    const filtered = getFilteredRuns();
    const existing = archiveStore.runs.find((run) => run.id === archiveStore.selectedRunId);
    archiveStore.selectedRunId = existing?.id || filtered[0]?.id || archiveStore.runs[0]?.id || null;
    renderRunArchive();
    showArchiveNotice(`Loaded ${{archiveStore.runs.length}} exported runs.`);
  }} catch (error) {{
    renderArchiveFailure(error);
  }}
}}

async function fetchArchiveJson(path) {{
  const response = await fetch(path, {{ cache: 'no-store' }});
  if (!response.ok) {{
    throw new Error(`Failed to load ${{path}}: ${{response.status}}`);
  }}
  return response.json();
}}

function getFilteredRuns() {{
  if (!archiveStore.query) {{
    return archiveStore.runs;
  }}

  return archiveStore.runs.filter((run) => {{
    const haystack = [
      run.title,
      run.town_name,
      run.slug,
      ...(run.families || []),
      ...(run.shared_motifs || []),
      ...(run.gossip_themes || [])
    ].join(' ').toLowerCase();
    return haystack.includes(archiveStore.query);
  }});
}}

function renderRunArchive() {{
  renderArchiveHeroStats();
  renderRunList();
  renderRunDetail();
}}

function renderArchiveHeroStats() {{
  const runs = archiveStore.runs;
  const totalEpitaphs = runs.reduce((sum, run) => sum + (run.epitaph_count || 0), 0);
  const totalEvents = runs.reduce((sum, run) => sum + (run.event_count || 0), 0);
  const llmRuns = runs.filter((run) => run.llm_enabled).length;
  const stats = [
    ['Runs', String(runs.length)],
    ['LLM runs', String(llmRuns)],
    ['Epitaphs across runs', String(totalEpitaphs)],
    ['Logged events', String(totalEvents)]
  ];

  document.getElementById('archiveHeroStats').innerHTML = stats
    .map(([label, value]) => `<article class="archive-stat-card"><span class="archive-stat-label">${{escapeArchiveHtml(label)}}</span><strong>${{escapeArchiveHtml(value)}}</strong></article>`)
    .join('');
}}

function renderRunList() {{
  const target = document.getElementById('runList');
  const runs = getFilteredRuns();
  if (!runs.length) {{
    target.innerHTML = '<div class="archive-empty">No runs match the current filter.</div>';
    return;
  }}

  if (!runs.some((run) => run.id === archiveStore.selectedRunId)) {{
    archiveStore.selectedRunId = runs[0].id;
  }}

  target.innerHTML = runs.map((run) => {{
    const activeClass = run.id === archiveStore.selectedRunId ? 'is-active' : '';
    return `
      <article class="run-card ${{activeClass}}" data-run-id="${{escapeArchiveHtml(run.id)}}">
        <div class="run-card-header">
          <div>
            <span class="archive-label">${{escapeArchiveHtml(run.slug)}}</span>
            <h3>${{escapeArchiveHtml(run.town_name)}}</h3>
          </div>
          <span class="archive-chip">Year ${{escapeArchiveHtml(String(run.current_year))}}</span>
        </div>
        <p>${{escapeArchiveHtml(run.title)}}</p>
        <div class="run-card-stats">
          ${{renderSummaryCard('Living', String(run.living_count))}}
          ${{renderSummaryCard('Dead', String(run.deceased_count))}}
          ${{renderSummaryCard('Epitaphs', String(run.epitaph_count))}}
          ${{renderSummaryCard('Chronicles', String(run.chronicle_count))}}
        </div>
        <div class="run-card-actions">
          <a class="run-link" href="${{escapeArchiveHtml(run.paths.explorer)}}">Open Explorer</a>
          <a class="run-link run-link-secondary" href="${{escapeArchiveHtml(run.paths.report)}}">Static Report</a>
        </div>
      </article>
    `;
  }}).join('');

  for (const card of target.querySelectorAll('[data-run-id]')) {{
    card.addEventListener('click', () => {{
      archiveStore.selectedRunId = card.dataset.runId;
      renderRunArchive();
    }});
  }}
}}

function renderRunDetail() {{
  const target = document.getElementById('runDetail');
  const run = archiveStore.runs.find((item) => item.id === archiveStore.selectedRunId);
  if (!run) {{
    target.innerHTML = '<div class="archive-empty">Choose a run to inspect its exported results.</div>';
    return;
  }}

  const motifs = (run.shared_motifs || []).length ? run.shared_motifs.map(renderArchiveChip).join('') : '<span class="archive-chip">No shared motifs exported</span>';
  const families = (run.families || []).length ? run.families.map(renderArchiveChip).join('') : '<span class="archive-chip">No families recorded</span>';
  const gossipThemes = (run.gossip_themes || []).length ? run.gossip_themes.map(renderArchiveChip).join('') : '<span class="archive-chip">No gossip themes recorded</span>';
  const districts = (run.districts || []).length ? run.districts.map(renderArchiveChip).join('') : '<span class="archive-chip">No districts recorded</span>';

  target.innerHTML = `
    <section class="run-detail-section">
      <div class="run-detail-header">
        <div>
          <span class="archive-label">${{escapeArchiveHtml(run.slug)}}</span>
          <h3>${{escapeArchiveHtml(run.title)}}</h3>
          <p>${{escapeArchiveHtml(run.town_name)}} ran from ${{escapeArchiveHtml(String(run.start_year))}} to ${{escapeArchiveHtml(String(run.current_year))}}.</p>
        </div>
        <span class="archive-chip">${{run.llm_enabled ? 'LLM enabled' : 'Offline or deterministic'}}</span>
      </div>
      <div class="run-detail-grid">
        ${{renderSummaryCard('Years simulated', String(run.years_simulated))}}
        ${{renderSummaryCard('Families', String(run.family_count))}}
        ${{renderSummaryCard('Events', String(run.event_count))}}
        ${{renderSummaryCard('Epitaphs', String(run.epitaph_count))}}
      </div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Linked results</span>
      <div class="run-detail-links">
        <a class="run-link" href="${{escapeArchiveHtml(run.paths.explorer)}}">Open bundle explorer</a>
        <a class="run-link run-link-secondary" href="${{escapeArchiveHtml(run.paths.report)}}">Open static report</a>
        <a class="run-link run-link-secondary" href="${{escapeArchiveHtml(run.paths.anthology)}}">Read anthology</a>
        <a class="run-link run-link-secondary" href="${{escapeArchiveHtml(run.paths.chronicle)}}">Read town chronicle</a>
        ${{run.paths.poetry_book ? `<a class="run-link run-link-secondary" href="${{escapeArchiveHtml(run.paths.poetry_book)}}">Read poetry book</a>` : ''}}
      </div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Shared motifs</span>
      <div class="archive-chip-row">${{motifs}}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Families</span>
      <div class="archive-chip-row">${{families}}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Gossip themes</span>
      <div class="archive-chip-row">${{gossipThemes}}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Districts</span>
      <div class="archive-chip-row">${{districts}}</div>
    </section>
  `;
}}

function renderSummaryCard(label, value) {{
  return `<article class="run-summary-card"><span class="archive-stat-label">${{escapeArchiveHtml(label)}}</span><strong>${{escapeArchiveHtml(value)}}</strong></article>`;
}}

function renderArchiveChip(value) {{
  return `<span class="archive-chip">${{escapeArchiveHtml(value)}}</span>`;
}}

function renderArchiveFailure(error) {{
  document.getElementById('runList').innerHTML = `<div class="archive-empty">${{escapeArchiveHtml(error.message || String(error))}}</div>`;
  document.getElementById('runDetail').innerHTML = '<div class="archive-empty">The archive could not load exported runs.</div>';
}}

function showArchiveNotice(message, persistent = false) {{
  const notice = document.getElementById('archiveNotice');
  notice.textContent = message;
  notice.hidden = false;
  if (persistent) {{
    return;
  }}
  window.clearTimeout(showArchiveNotice.timeoutId);
  showArchiveNotice.timeoutId = window.setTimeout(() => {{
    notice.hidden = true;
  }}, 3200);
}}

function escapeArchiveHtml(value) {{
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}}
""".strip() + "\n"


def render_run_archive_manifest() -> str:
    payload = {
        "name": "Graveyard Chorus Run Archive",
        "short_name": "Chorus Archive",
        "description": "A lightweight PWA for browsing multiple Graveyard Chorus runs.",
        "start_url": "./index.html",
        "scope": "./",
        "display": "standalone",
        "background_color": "#efe7d7",
        "theme_color": "#19352c",
        "icons": [
            {
                "src": "./icon-192.svg",
                "sizes": "192x192",
                "type": "image/svg+xml",
                "purpose": "any",
            },
            {
                "src": "./icon-512.svg",
                "sizes": "512x512",
                "type": "image/svg+xml",
                "purpose": "any",
            },
        ],
    }
    return json.dumps(payload, indent=2)


def render_run_archive_service_worker(*, index_file: str) -> str:
    return f"""
const CACHE_NAME = 'graveyard-chorus-run-archive-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './runs.css',
  './runs.js',
  './manifest.webmanifest',
  './{index_file}',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {{
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
}});

self.addEventListener('activate', (event) => {{
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', (event) => {{
  const request = event.request;
  if (request.method !== 'GET') {{
    return;
  }}

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {{
    return;
  }}

  event.respondWith(
    caches.match(request).then((cachedResponse) => {{
      const networkFetch = fetch(request)
        .then((response) => {{
          if (response && response.status === 200) {{
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
          }}
          return response;
        }})
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    }})
  );
}});
""".strip() + "\n"


def render_explorer_css() -> str:
    return """
:root {
  --paper: #efe7d7;
  --paper-strong: rgba(255, 249, 240, 0.9);
  --ink: #1f1b17;
  --muted: #64594d;
  --forest: #19352c;
  --copper: #9c4a32;
  --gold: #d3ab63;
  --border: rgba(31, 27, 23, 0.12);
  --shadow: rgba(20, 25, 20, 0.18);
  --serif: "Baskerville", "Palatino Linotype", "Book Antiqua", serif;
  --sans: "Avenir Next", "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font-family: var(--sans);
  background:
    radial-gradient(circle at 10% 15%, rgba(156, 74, 50, 0.16), transparent 24%),
    radial-gradient(circle at 85% 10%, rgba(25, 53, 44, 0.2), transparent 25%),
    linear-gradient(180deg, #e8dbc8 0%, #efe7d7 45%, #e5d7c4 100%);
}

.app-shell {
  max-width: 1520px;
  margin: 0 auto;
  padding: 28px 18px 72px;
}

.hero,
.panel {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.9), rgba(250, 244, 235, 0.78));
  box-shadow: 0 24px 60px var(--shadow);
  backdrop-filter: blur(8px);
}

.hero {
  padding: 28px;
  display: grid;
  gap: 20px;
  overflow: hidden;
  position: relative;
}

.hero::after {
  content: "";
  position: absolute;
  inset: auto -70px -90px auto;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(211, 171, 99, 0.28), transparent 70%);
}

.eyebrow,
.mood,
.detail-label,
.chip,
.timeline-tag {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.73rem;
}

.eyebrow,
.mood,
.detail-label,
.timeline-tag {
  color: var(--copper);
}

.hero h1,
.section-heading h2,
.detail-title h3,
.epitaph-card h3,
.family-card h3 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 600;
  line-height: 1.04;
}

.hero h1 { font-size: clamp(2.3rem, 4vw, 4.4rem); max-width: 12ch; }

.lede,
.section-heading p,
.detail-panel p,
.family-card p,
.epitaph-card p,
.timeline-body,
.empty-state,
.character-card p {
  color: var(--muted);
  line-height: 1.6;
}

.hero-actions,
.hero-stats,
.control-bar,
.main-layout,
.overview-grid,
.metadata-grid,
.chorus-grid,
.family-grid,
.detail-columns,
.chip-row,
.segmented {
  display: grid;
  gap: 12px;
}

.hero-actions {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.ghost-button,
.segmented button {
  appearance: none;
  border: 1px solid rgba(25, 53, 44, 0.18);
  background: rgba(255, 252, 248, 0.88);
  color: var(--forest);
  text-decoration: none;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
  transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.ghost-button:hover,
.segmented button:hover,
.ghost-button:focus-visible,
.segmented button:focus-visible {
  transform: translateY(-1px);
  background: rgba(255, 248, 238, 0.98);
  box-shadow: 0 12px 24px rgba(25, 53, 44, 0.12);
}

.hero-stats,
.overview-grid,
.metadata-grid,
.chorus-grid,
.family-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.stat-card,
.meta-card,
.epitaph-card,
.family-card,
.timeline li,
.character-card,
.detail-panel section {
  background: var(--paper-strong);
  border: 1px solid rgba(25, 53, 44, 0.12);
  box-shadow: 0 16px 35px rgba(31, 27, 23, 0.08);
}

.stat-card,
.meta-card,
.epitaph-card,
.family-card,
.timeline li,
.character-card,
.detail-panel section {
  padding: 16px;
  animation: rise-in 420ms ease both;
}

.stat-card strong,
.meta-card strong {
  display: block;
  margin-top: 8px;
  font-family: var(--serif);
  font-size: 1.6rem;
  color: var(--forest);
}

.control-bar {
  margin-top: 18px;
  padding: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  align-items: end;
}

.control {
  display: grid;
  gap: 8px;
}

.control span {
  color: var(--forest);
  font-weight: 600;
}

input,
select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(25, 53, 44, 0.18);
  background: rgba(255, 252, 248, 0.96);
  font: inherit;
  color: var(--ink);
}

.segmented {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.segmented .is-active {
  background: linear-gradient(135deg, rgba(25, 53, 44, 0.96), rgba(66, 92, 83, 0.94));
  color: #f6f0e4;
}

.main-layout {
  margin-top: 18px;
  grid-template-columns: minmax(250px, 0.95fr) minmax(0, 2.3fr) minmax(280px, 1.1fr);
  align-items: start;
}

.rail,
.content-stack,
.detail-shell {
  min-width: 0;
}

.rail,
.detail-shell {
  position: sticky;
  top: 18px;
  padding: 18px;
}

.content-stack {
  display: grid;
  gap: 18px;
}

.panel {
  padding: 18px;
}

.section-heading {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.character-rail,
.detail-panel {
  display: grid;
  gap: 12px;
}

.character-card {
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.character-card:hover,
.character-card.is-active {
  transform: translateX(4px);
  border-color: var(--copper);
  background: rgba(255, 248, 240, 0.98);
}

.character-card h3,
.epitaph-card h3,
.family-card h3 {
  font-size: 1.28rem;
}

.character-meta,
.timeline-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chip-row {
  grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
}

.chip {
  border: 1px solid rgba(156, 74, 50, 0.16);
  padding: 6px 10px;
  background: rgba(255, 244, 229, 0.92);
  color: var(--forest);
}

.chip button {
  all: unset;
  cursor: pointer;
}

.epitaph-card pre {
  margin: 14px 0;
  white-space: pre-wrap;
  font-family: var(--serif);
  font-size: 1.04rem;
  line-height: 1.7;
}

.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.timeline-title {
  font-family: var(--serif);
  font-size: 1.18rem;
  color: var(--forest);
}

.detail-title {
  display: grid;
  gap: 4px;
}

.detail-columns {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.detail-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--muted);
}

.detail-list li + li { margin-top: 6px; }

.notice {
  position: fixed;
  right: 18px;
  bottom: 18px;
  max-width: 340px;
  padding: 14px 16px;
  background: rgba(25, 53, 44, 0.96);
  color: #f8f2e7;
  box-shadow: 0 18px 35px rgba(19, 35, 30, 0.24);
}

.empty-state {
  padding: 18px;
  border: 1px dashed rgba(25, 53, 44, 0.22);
  background: rgba(255, 249, 242, 0.7);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1180px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .rail,
  .detail-shell {
    position: static;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 18px 12px 48px;
  }

  .hero,
  .panel {
    padding: 16px;
  }

  .hero h1 {
    max-width: none;
  }
}
""".strip() + "\n"


def render_explorer_app() -> str:
    return """
const BUNDLE_FILES = {
  state: './town_state.json',
  events: './event_log.json',
  cemetery: './cemetery_record.json'
};

const store = {
  bundle: null,
  view: {
    query: '',
    family: 'all',
    status: 'all',
    selectedCharacterId: null
  },
  installPrompt: null
};

document.addEventListener('DOMContentLoaded', bootstrap);
window.addEventListener('beforeinstallprompt', handleInstallPrompt);
window.addEventListener('appinstalled', () => showNotice('Explorer installed for offline reading.'));

async function bootstrap() {
  bindControls();
  registerServiceWorker();

  if (window.location.protocol === 'file:') {
    showNotice('Serve this folder over HTTP for full PWA support and reliable JSON loading.', true);
  }

  await loadBundle();
}

async function loadBundle() {
  try {
    const [townState, eventLog, cemetery] = await Promise.all([
      fetchJson(BUNDLE_FILES.state),
      fetchJson(BUNDLE_FILES.events),
      fetchJson(BUNDLE_FILES.cemetery)
    ]);

    store.bundle = normalizeBundle(townState, eventLog, cemetery);
    store.view.selectedCharacterId =
      store.bundle.epitaphs[0]?.character_id || store.bundle.characters[0]?.id || null;

    populateFamilyFilter();
    renderAll();
    showNotice(`Loaded ${store.bundle.characters.length} lives, ${store.bundle.epitaphs.length} epitaphs, and ${store.bundle.events.length} recorded events.`);
  } catch (error) {
    renderFailure(error);
  }
}

function bindControls() {
  document.getElementById('searchInput').addEventListener('input', (event) => {
    store.view.query = event.target.value.trim().toLowerCase();
    renderAll();
  });

  document.getElementById('familyFilter').addEventListener('change', (event) => {
    store.view.family = event.target.value;
    renderAll();
  });

  document.getElementById('statusFilter').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-status]');
    if (!button) {
      return;
    }
    store.view.status = button.dataset.status;
    for (const peer of event.currentTarget.querySelectorAll('button')) {
      peer.classList.toggle('is-active', peer === button);
    }
    renderAll();
  });

  document.getElementById('reloadButton').addEventListener('click', () => loadBundle());
  document.getElementById('installButton').addEventListener('click', async () => {
    if (!store.installPrompt) {
      return;
    }
    store.installPrompt.prompt();
    await store.installPrompt.userChoice;
    store.installPrompt = null;
    document.getElementById('installButton').hidden = true;
  });
}

function handleInstallPrompt(event) {
  event.preventDefault();
  store.installPrompt = event;
  document.getElementById('installButton').hidden = false;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
    return;
  }

  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Service worker registration failed', error);
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function normalizeBundle(townState, eventLog, cemetery) {
  const characters = Object.values(townState.characters || {});
  const families = Object.values(townState.families || {});
  const households = townState.households || {};
  const characterById = Object.fromEntries(characters.map((character) => [character.id, character]));
  const familyById = Object.fromEntries(families.map((family) => [family.id, family]));
  const epitaphs = cemetery.epitaphs || [];

  const lifeEvents = (eventLog.life_events || []).map((event) => ({ ...event, event_kind: 'life' }));
  const townEvents = (eventLog.town_events || []).map((event) => ({ ...event, event_kind: 'town' }));
  const events = [...lifeEvents, ...townEvents].sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }
    return seasonOrder(left.season) - seasonOrder(right.season);
  });
  const eventById = Object.fromEntries(events.map((event) => [event.id, event]));

  return {
    townState,
    cemetery,
    characters,
    families,
    households,
    epitaphs,
    events,
    eventById,
    characterById,
    familyById
  };
}

function renderAll() {
  if (!store.bundle) {
    return;
  }
  renderHeroStats();
  renderOverview();
  renderCharacterRail();
  renderChorus();
  renderFamilies();
  renderTimeline();
  renderDetail();
}

function renderHeroStats() {
  const { townState, characters, epitaphs, events } = store.bundle;
  const livingCount = characters.filter((character) => character.alive).length;
  const deadCount = characters.length - livingCount;
  const stats = [
    ['Current year', String(townState.current_year)],
    ['Living voices', String(livingCount)],
    ['Dead voices', String(deadCount)],
    ['Epitaphs', String(epitaphs.length)],
    ['Events logged', String(events.length)]
  ];

  document.getElementById('heroStats').innerHTML = stats
    .map(([label, value]) => `<article class="stat-card"><span class="detail-label">${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderOverview() {
  const { townState, characters, epitaphs, events, families } = store.bundle;
  const scandalEvents = events.filter((event) => containsAny((event.tags || []).join(' '), ['scandal', 'feud', 'confession', 'reveal']));
  const cards = [
    ['Families', families.length, 'The domestic blocs that convert affection into history.'],
    ['Districts', townState.districts.length, townState.districts.join(', ')],
    ['Institutions', townState.institutions.length, townState.institutions.join(', ')],
    ['Collective scandals', scandalEvents.length, 'Letters, sluice disputes, confessions, public theatre.'],
    ['Shared motifs', store.bundle.cemetery.shared_motifs?.length || 0, (store.bundle.cemetery.shared_motifs || ['none']).join(', ')],
    ['Linked epitaphs', epitaphs.length, 'Every dead voice can point back into town history.']
  ];

  document.getElementById('overviewCards').innerHTML = cards
    .map(([label, value, body]) => {
      return `<article class="stat-card"><span class="detail-label">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p>${escapeHtml(body)}</p></article>`;
    })
    .join('');

  const meta = [
    ['Festivals', townState.festivals.join(', ')],
    ['Long feuds', townState.long_running_feuds.join(', ')],
    ['Unwritten customs', townState.unwritten_customs.join(' ')],
    ['Economic weather', (townState.economic_conditions || []).slice(-4).join(', ') || 'No economic notes exported.'],
    ['Political shifts', (townState.political_shifts || []).slice(-3).join(' ') || 'No political notes exported.'],
    ['Gossip themes', (townState.gossip_themes || []).slice(-6).join(', ') || 'No active gossip themes.']
  ];

  document.getElementById('townMetadata').innerHTML = meta
    .map(([label, body]) => `<article class="meta-card"><span class="detail-label">${escapeHtml(label)}</span><p>${escapeHtml(body)}</p></article>`)
    .join('');
}

function populateFamilyFilter() {
  const select = document.getElementById('familyFilter');
  const families = store.bundle.families.slice().sort((left, right) => left.name.localeCompare(right.name));
  select.innerHTML = '<option value="all">All families</option>' + families
    .map((family) => `<option value="${escapeHtml(family.id)}">${escapeHtml(family.name)}</option>`)
    .join('');
}

function renderCharacterRail() {
  const target = document.getElementById('characterRail');
  const characters = getFilteredCharacters();
  if (!characters.length) {
    target.innerHTML = '<div class="empty-state">No characters match the current filter.</div>';
    return;
  }

  target.innerHTML = characters
    .map((character) => {
      const family = store.bundle.familyById[character.family_id];
      const isActive = character.id === store.view.selectedCharacterId;
      return `
        <article class="character-card ${isActive ? 'is-active' : ''}" data-character-id="${escapeHtml(character.id)}">
          <div class="character-meta">
            <span class="timeline-tag">${character.alive ? 'Living' : 'Dead'}</span>
            <span class="timeline-tag">${escapeHtml(family?.name || 'Unknown family')}</span>
          </div>
          <h3>${escapeHtml(character.full_name)}</h3>
          <p>${escapeHtml(character.occupation)} • ${escapeHtml(character.life_stage)} • age ${escapeHtml(String(character.age))}</p>
          <p>${escapeHtml(character.reputation?.public_summary || 'No stable public story.')}</p>
        </article>
      `;
    })
    .join('');

  for (const card of target.querySelectorAll('[data-character-id]')) {
    card.addEventListener('click', () => {
      store.view.selectedCharacterId = card.dataset.characterId;
      renderCharacterRail();
      renderDetail();
    });
  }
}

function renderChorus() {
  const target = document.getElementById('chorusGrid');
  const query = store.view.query;
  const allowedCharacterIds = new Set(getFilteredCharacters().map((character) => character.id));
  const epitaphs = store.bundle.epitaphs.filter((epitaph) => {
    if (!allowedCharacterIds.has(epitaph.character_id)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return containsAny([epitaph.character_name, epitaph.text, epitaph.mood, ...(epitaph.hidden_truths || [])].join(' '), [query]);
  });

  if (!epitaphs.length) {
    target.innerHTML = '<div class="empty-state">No epitaphs survive under the current filter.</div>';
    return;
  }

  target.innerHTML = epitaphs
    .map((epitaph) => {
      const refs = (epitaph.referenced_character_ids || []).map((characterId) => renderCharacterChip(characterId)).join('');
      return `
        <article class="epitaph-card">
          <div class="character-meta">
            <span class="mood">${escapeHtml(epitaph.mood)}</span>
            <span class="timeline-tag">Year ${escapeHtml(String(epitaph.year_written))}</span>
          </div>
          <h3>${escapeHtml(epitaph.character_name)}</h3>
          <pre>${escapeHtml(epitaph.text)}</pre>
          <p>${escapeHtml((epitaph.public_contradictions || []).join(' ') || 'No explicit contradiction was archived.')}</p>
          <div class="chip-row">${refs || '<span class="chip">No cross references</span>'}</div>
        </article>
      `;
    })
    .join('');

  bindChipNavigation(target);
}

function renderFamilies() {
  const target = document.getElementById('familyGrid');
  const visibleCharacters = new Set(getFilteredCharacters().map((character) => character.id));
  const families = store.bundle.families.filter((family) => {
    if (store.view.family !== 'all' && family.id !== store.view.family) {
      return false;
    }
    if (!visibleCharacters.size) {
      return true;
    }
    return family.member_ids.some((memberId) => visibleCharacters.has(memberId));
  });

  target.innerHTML = families
    .map((family) => {
      const members = family.member_ids
        .map((memberId) => store.bundle.characterById[memberId])
        .filter(Boolean)
        .map((character) => renderCharacterChip(character.id))
        .join('');
      const alliances = (family.allied_family_ids || []).map((familyId) => store.bundle.familyById[familyId]?.name).filter(Boolean);
      const feuds = (family.feud_family_ids || []).map((familyId) => store.bundle.familyById[familyId]?.name).filter(Boolean);
      return `
        <article class="family-card">
          <span class="detail-label">${escapeHtml(family.class_status)}</span>
          <h3>${escapeHtml(family.name)}</h3>
          <p>${escapeHtml(family.origin)}</p>
          <p><strong>Motto:</strong> ${escapeHtml(family.motto)}</p>
          <p><strong>Inherited pressure:</strong> ${escapeHtml((family.inherited_secrets || []).join(' ') || 'No inherited secrets recorded.')}</p>
          <p><strong>Alliances:</strong> ${escapeHtml(alliances.join(', ') || 'None')}</p>
          <p><strong>Feuds:</strong> ${escapeHtml(feuds.join(', ') || 'None')}</p>
          <div class="chip-row">${members}</div>
        </article>
      `;
    })
    .join('') || '<div class="empty-state">No families match the current filter.</div>';

  bindChipNavigation(target);
}

function renderTimeline() {
  const target = document.getElementById('timelineList');
  const query = store.view.query;
  const events = store.bundle.events.filter((event) => {
    if (!query) {
      return true;
    }
    const participantNames = (event.participant_ids || []).map((id) => store.bundle.characterById[id]?.full_name || '').join(' ');
    return containsAny([event.title, event.description, participantNames, (event.tags || []).join(' ')].join(' '), [query]);
  });
  const selected = events.slice(-18).reverse();

  target.innerHTML = selected
    .map((event) => {
      const participants = (event.participant_ids || []).map((characterId) => renderCharacterChip(characterId)).join('');
      return `
        <li>
          <div class="timeline-header">
            <span class="timeline-tag">${escapeHtml(String(event.year))}</span>
            <span class="timeline-tag">${escapeHtml(event.season || 'unknown season')}</span>
            <span class="timeline-tag">${escapeHtml(event.event_kind)}</span>
          </div>
          <p class="timeline-title">${escapeHtml(event.title)}</p>
          <p class="timeline-body">${escapeHtml(event.description)}</p>
          <div class="chip-row">${participants || '<span class="chip">Public atmosphere only</span>'}</div>
        </li>
      `;
    })
    .join('') || '<li class="empty-state">No events match the current filter.</li>';

  bindChipNavigation(target);
}

function renderDetail() {
  const target = document.getElementById('detailPanel');
  const character = store.bundle.characterById[store.view.selectedCharacterId];
  if (!character) {
    target.innerHTML = '<div class="empty-state">Select a character to inspect the crossing of memory and reputation.</div>';
    return;
  }

  const family = store.bundle.familyById[character.family_id];
  const household = store.bundle.townState.households?.[character.household_id];
  const epitaph = store.bundle.epitaphs.find((item) => item.character_id === character.id);
  const recentEvents = store.bundle.events.filter((event) => (event.participant_ids || []).includes(character.id)).slice(-5).reverse();
  const strongestRelations = Object.values(character.relationships || {})
    .sort((left, right) => relationWeight(right) - relationWeight(left))
    .slice(0, 6);

  target.innerHTML = `
    <section>
      <div class="detail-title">
        <span class="detail-label">${character.alive ? 'Living archive' : 'Buried voice'}</span>
        <h3>${escapeHtml(character.full_name)}</h3>
        <p>${escapeHtml(character.occupation)} • ${escapeHtml(character.life_stage)} • ${escapeHtml(family?.name || 'Unknown family')}</p>
      </div>
      <div class="detail-columns">
        <div>
          <span class="detail-label">Private voice</span>
          <p>${escapeHtml(character.private_voice)}</p>
        </div>
        <div>
          <span class="detail-label">Public voice</span>
          <p>${escapeHtml(character.public_voice)}</p>
        </div>
      </div>
      <p>${escapeHtml(character.biography || 'No biography summary was exported.')}</p>
      <p><strong>Household:</strong> ${escapeHtml(household?.name || 'Unknown household')}</p>
      <p><strong>Desires:</strong> ${escapeHtml((character.desires || []).join(', ') || 'None recorded')}</p>
      <p><strong>Fears:</strong> ${escapeHtml((character.fears || []).join(', ') || 'None recorded')}</p>
      <p><strong>Virtues:</strong> ${escapeHtml((character.virtues || []).join(', ') || 'None recorded')}</p>
      <p><strong>Flaws:</strong> ${escapeHtml((character.flaws || []).join(', ') || 'None recorded')}</p>
      <p><strong>Public story:</strong> ${escapeHtml(character.reputation?.public_summary || 'No fixed public summary.')}</p>
      <p><strong>Dominant secret:</strong> ${escapeHtml(primarySecretSummary(character))}</p>
    </section>
    <section>
      <span class="detail-label">Strongest ties</span>
      <div class="chip-row">${strongestRelations.map((relation) => renderCharacterChip(relation.target_id, `${relation.kind} • trust ${formatScore(relation.trust)} • rivalry ${formatScore(relation.rivalry)}`)).join('') || '<span class="chip">No recorded ties</span>'}</div>
    </section>
    <section>
      <span class="detail-label">Recent events</span>
      <ul class="detail-list">${recentEvents.map((event) => `<li>${escapeHtml(`${event.year} ${event.season}: ${event.title}`)}</li>`).join('') || '<li>No recent events for this character.</li>'}</ul>
    </section>
    <section>
      <span class="detail-label">After-voice</span>
      ${epitaph ? `<pre>${escapeHtml(epitaph.text)}</pre>` : '<p>This life has not yet produced an epitaph in the exported bundle.</p>'}
    </section>
  `;

  bindChipNavigation(target);
}

function getFilteredCharacters() {
  const { characters } = store.bundle;
  return characters
    .filter((character) => {
      if (store.view.family !== 'all' && character.family_id !== store.view.family) {
        return false;
      }
      if (store.view.status === 'living' && !character.alive) {
        return false;
      }
      if (store.view.status === 'dead' && character.alive) {
        return false;
      }
      if (!store.view.query) {
        return true;
      }
      const family = store.bundle.familyById[character.family_id];
      const haystack = [
        character.full_name,
        character.occupation,
        character.private_voice,
        character.public_voice,
        character.poetic_voice,
        (character.desires || []).join(' '),
        (character.fears || []).join(' '),
        (character.virtues || []).join(' '),
        (character.flaws || []).join(' '),
        family?.name || '',
        family?.origin || '',
        primarySecretSummary(character)
      ].join(' ');
      return containsAny(haystack, [store.view.query]);
    })
    .sort((left, right) => {
      if (left.alive !== right.alive) {
        return left.alive ? -1 : 1;
      }
      return left.full_name.localeCompare(right.full_name);
    });
}

function bindChipNavigation(root) {
  for (const button of root.querySelectorAll('[data-jump-character]')) {
    button.addEventListener('click', () => {
      const characterId = button.dataset.jumpCharacter;
      if (!store.bundle.characterById[characterId]) {
        return;
      }
      store.view.selectedCharacterId = characterId;
      renderCharacterRail();
      renderDetail();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function renderCharacterChip(characterId, overrideTitle = '') {
  const character = store.bundle.characterById[characterId];
  if (!character) {
    return '';
  }
  const title = overrideTitle || `${character.occupation} • ${character.alive ? 'living' : 'dead'}`;
  return `<span class="chip"><button type="button" data-jump-character="${escapeHtml(character.id)}" title="${escapeHtml(title)}">${escapeHtml(character.full_name)}</button></span>`;
}

function renderFailure(error) {
  document.getElementById('overviewCards').innerHTML = `<div class="empty-state">${escapeHtml(error.message || String(error))}</div>`;
  document.getElementById('characterRail').innerHTML = '<div class="empty-state">The explorer could not load the exported bundle.</div>';
  document.getElementById('chorusGrid').innerHTML = '<div class="empty-state">Start a local HTTP server in the export folder and reload.</div>';
  document.getElementById('familyGrid').innerHTML = '';
  document.getElementById('timelineList').innerHTML = '';
  document.getElementById('detailPanel').innerHTML = '';
}

function primarySecretSummary(character) {
  const secrets = character.secrets || [];
  return secrets.length ? secrets.slice().sort((left, right) => right.severity - left.severity)[0].summary : 'No dominant secret archived.';
}

function relationWeight(relation) {
  return (relation.trust || 0) + (relation.affinity || 0) + (relation.intimacy || 0) + (relation.rivalry || 0);
}

function formatScore(value) {
  return Number(value || 0).toFixed(2);
}

function seasonOrder(season) {
  return { spring: 0, summer: 1, autumn: 2, winter: 3 }[season] ?? 4;
}

function containsAny(value, needles) {
  const haystack = String(value || '').toLowerCase();
  return needles.some((needle) => haystack.includes(String(needle).toLowerCase()));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showNotice(message, persistent = false) {
  const notice = document.getElementById('appNotice');
  notice.textContent = message;
  notice.hidden = false;
  if (persistent) {
    return;
  }
  window.clearTimeout(showNotice.timeoutId);
  showNotice.timeoutId = window.setTimeout(() => {
    notice.hidden = true;
  }, 3200);
}
""".strip() + "\n"


def render_explorer_manifest(state: TownState) -> str:
    payload = {
        "name": f"{state.config.anthology_title} Explorer",
        "short_name": f"{state.town_name} Chorus",
        "description": f"A lightweight PWA for browsing the exported literary town archive of {state.town_name}.",
        "start_url": "./index.html",
        "scope": "./",
        "display": "standalone",
        "background_color": "#efe7d7",
        "theme_color": "#19352c",
        "icons": [
            {
                "src": "./icon-192.svg",
                "sizes": "192x192",
                "type": "image/svg+xml",
                "purpose": "any",
            },
            {
                "src": "./icon-512.svg",
                "sizes": "512x512",
                "type": "image/svg+xml",
                "purpose": "any",
            },
        ],
    }
    return json.dumps(payload, indent=2)


def render_service_worker() -> str:
    return """
const CACHE_NAME = 'graveyard-chorus-pwa-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './report.html',
  './town_state.json',
  './event_log.json',
  './cemetery_record.json',
  './anthology.md',
  './biographies.md',
  './family_trees.md',
  './town_chronicle.md',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
""".strip() + "\n"


def render_icon_svg(*, size: int, town_name: str) -> str:
    initials = "".join(part[0] for part in town_name.split()[:2]).upper() or "GC"
    return """<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#19352c" />
      <stop offset="100%" stop-color="#315447" />
    </linearGradient>
    <linearGradient id="earth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9c4a32" />
      <stop offset="100%" stop-color="#5d2e20" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="#efe7d7" />
  <rect x="52" y="52" width="408" height="408" rx="80" fill="url(#sky)" />
  <path d="M104 368c44-26 96-38 152-38s110 12 152 38v66H104z" fill="url(#earth)" />
  <path d="M184 336v-98c0-40 32-72 72-72s72 32 72 72v98z" fill="#efe7d7" opacity="0.94" />
  <path d="M210 336v-98c0-25 21-46 46-46s46 21 46 46v98z" fill="#d3ab63" opacity="0.84" />
  <path d="M256 132c17 0 31 14 31 31v37h-62v-37c0-17 14-31 31-31z" fill="#f9f4ea" />
  <text x="256" y="418" text-anchor="middle" font-size="72" font-family="Baskerville, serif" fill="#efe7d7">{initials}</text>
</svg>
""".format(size=size, label=escape(f"{town_name} explorer icon"), initials=escape(initials))