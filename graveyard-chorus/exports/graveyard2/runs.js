const RUN_ARCHIVE_INDEX = './graveyard-chorus-runs.json';

const archiveStore = {
  runs: [],
  selectedRunId: null,
  query: '',
  installPrompt: null
};

document.addEventListener('DOMContentLoaded', archiveBootstrap);
window.addEventListener('beforeinstallprompt', handleArchiveInstallPrompt);
window.addEventListener('appinstalled', () => showArchiveNotice('Run archive installed for offline browsing.'));

async function archiveBootstrap() {
  bindArchiveControls();
  registerArchiveServiceWorker();

  if (window.location.protocol === 'file:') {
    showArchiveNotice('Serve this folder over HTTP for full PWA support and reliable multi-run loading.', true);
  }

  await loadRunArchive();
}

function bindArchiveControls() {
  document.getElementById('archiveSearchInput').addEventListener('input', (event) => {
    archiveStore.query = event.target.value.trim().toLowerCase();
    renderRunArchive();
  });

  document.getElementById('archiveReloadButton').addEventListener('click', () => loadRunArchive());
  document.getElementById('archiveInstallButton').addEventListener('click', async () => {
    if (!archiveStore.installPrompt) {
      return;
    }
    archiveStore.installPrompt.prompt();
    await archiveStore.installPrompt.userChoice;
    archiveStore.installPrompt = null;
    document.getElementById('archiveInstallButton').hidden = true;
  });
}

function handleArchiveInstallPrompt(event) {
  event.preventDefault();
  archiveStore.installPrompt = event;
  document.getElementById('archiveInstallButton').hidden = false;
}

async function registerArchiveServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
    return;
  }

  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Archive service worker registration failed', error);
  }
}

async function loadRunArchive() {
  try {
    const payload = await fetchArchiveJson(RUN_ARCHIVE_INDEX);
    archiveStore.runs = payload.runs || [];
    const filtered = getFilteredRuns();
    const existing = archiveStore.runs.find((run) => run.id === archiveStore.selectedRunId);
    archiveStore.selectedRunId = existing?.id || filtered[0]?.id || archiveStore.runs[0]?.id || null;
    renderRunArchive();
    showArchiveNotice(`Loaded ${archiveStore.runs.length} exported runs.`);
  } catch (error) {
    renderArchiveFailure(error);
  }
}

async function fetchArchiveJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function getFilteredRuns() {
  if (!archiveStore.query) {
    return archiveStore.runs;
  }

  return archiveStore.runs.filter((run) => {
    const haystack = [
      run.title,
      run.town_name,
      run.slug,
      ...(run.families || []),
      ...(run.shared_motifs || []),
      ...(run.gossip_themes || [])
    ].join(' ').toLowerCase();
    return haystack.includes(archiveStore.query);
  });
}

function renderRunArchive() {
  renderArchiveHeroStats();
  renderRunList();
  renderRunDetail();
}

function renderArchiveHeroStats() {
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
    .map(([label, value]) => `<article class="archive-stat-card"><span class="archive-stat-label">${escapeArchiveHtml(label)}</span><strong>${escapeArchiveHtml(value)}</strong></article>`)
    .join('');
}

function renderRunList() {
  const target = document.getElementById('runList');
  const runs = getFilteredRuns();
  if (!runs.length) {
    target.innerHTML = '<div class="archive-empty">No runs match the current filter.</div>';
    return;
  }

  if (!runs.some((run) => run.id === archiveStore.selectedRunId)) {
    archiveStore.selectedRunId = runs[0].id;
  }

  target.innerHTML = runs.map((run) => {
    const activeClass = run.id === archiveStore.selectedRunId ? 'is-active' : '';
    return `
      <article class="run-card ${activeClass}" data-run-id="${escapeArchiveHtml(run.id)}">
        <div class="run-card-header">
          <div>
            <span class="archive-label">${escapeArchiveHtml(run.slug)}</span>
            <h3>${escapeArchiveHtml(run.town_name)}</h3>
          </div>
          <span class="archive-chip">Year ${escapeArchiveHtml(String(run.current_year))}</span>
        </div>
        <p>${escapeArchiveHtml(run.title)}</p>
        <div class="run-card-stats">
          ${renderSummaryCard('Living', String(run.living_count))}
          ${renderSummaryCard('Dead', String(run.deceased_count))}
          ${renderSummaryCard('Epitaphs', String(run.epitaph_count))}
          ${renderSummaryCard('Chronicles', String(run.chronicle_count))}
        </div>
        <div class="run-card-actions">
          <a class="run-link" href="${escapeArchiveHtml(run.paths.explorer)}">Open Explorer</a>
          <a class="run-link run-link-secondary" href="${escapeArchiveHtml(run.paths.report)}">Static Report</a>
        </div>
      </article>
    `;
  }).join('');

  for (const card of target.querySelectorAll('[data-run-id]')) {
    card.addEventListener('click', () => {
      archiveStore.selectedRunId = card.dataset.runId;
      renderRunArchive();
    });
  }
}

function renderRunDetail() {
  const target = document.getElementById('runDetail');
  const run = archiveStore.runs.find((item) => item.id === archiveStore.selectedRunId);
  if (!run) {
    target.innerHTML = '<div class="archive-empty">Choose a run to inspect its exported results.</div>';
    return;
  }

  const motifs = (run.shared_motifs || []).length ? run.shared_motifs.map(renderArchiveChip).join('') : '<span class="archive-chip">No shared motifs exported</span>';
  const families = (run.families || []).length ? run.families.map(renderArchiveChip).join('') : '<span class="archive-chip">No families recorded</span>';
  const gossipThemes = (run.gossip_themes || []).length ? run.gossip_themes.map(renderArchiveChip).join('') : '<span class="archive-chip">No gossip themes recorded</span>';
  const districts = (run.districts || []).length ? run.districts.map(renderArchiveChip).join('') : '<span class="archive-chip">No districts recorded</span>';

  target.innerHTML = `
    <section class="run-detail-section">
      <div class="run-detail-header">
        <div>
          <span class="archive-label">${escapeArchiveHtml(run.slug)}</span>
          <h3>${escapeArchiveHtml(run.title)}</h3>
          <p>${escapeArchiveHtml(run.town_name)} ran from ${escapeArchiveHtml(String(run.start_year))} to ${escapeArchiveHtml(String(run.current_year))}.</p>
        </div>
        <span class="archive-chip">${run.llm_enabled ? 'LLM enabled' : 'Offline or deterministic'}</span>
      </div>
      <div class="run-detail-grid">
        ${renderSummaryCard('Years simulated', String(run.years_simulated))}
        ${renderSummaryCard('Families', String(run.family_count))}
        ${renderSummaryCard('Events', String(run.event_count))}
        ${renderSummaryCard('Epitaphs', String(run.epitaph_count))}
      </div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Linked results</span>
      <div class="run-detail-links">
        <a class="run-link" href="${escapeArchiveHtml(run.paths.explorer)}">Open bundle explorer</a>
        <a class="run-link run-link-secondary" href="${escapeArchiveHtml(run.paths.report)}">Open static report</a>
        <a class="run-link run-link-secondary" href="${escapeArchiveHtml(run.paths.anthology)}">Read anthology</a>
        <a class="run-link run-link-secondary" href="${escapeArchiveHtml(run.paths.chronicle)}">Read town chronicle</a>
      </div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Shared motifs</span>
      <div class="archive-chip-row">${motifs}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Families</span>
      <div class="archive-chip-row">${families}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Gossip themes</span>
      <div class="archive-chip-row">${gossipThemes}</div>
    </section>

    <section class="run-detail-section">
      <span class="archive-label">Districts</span>
      <div class="archive-chip-row">${districts}</div>
    </section>
  `;
}

function renderSummaryCard(label, value) {
  return `<article class="run-summary-card"><span class="archive-stat-label">${escapeArchiveHtml(label)}</span><strong>${escapeArchiveHtml(value)}</strong></article>`;
}

function renderArchiveChip(value) {
  return `<span class="archive-chip">${escapeArchiveHtml(value)}</span>`;
}

function renderArchiveFailure(error) {
  document.getElementById('runList').innerHTML = `<div class="archive-empty">${escapeArchiveHtml(error.message || String(error))}</div>`;
  document.getElementById('runDetail').innerHTML = '<div class="archive-empty">The archive could not load exported runs.</div>';
}

function showArchiveNotice(message, persistent = false) {
  const notice = document.getElementById('archiveNotice');
  notice.textContent = message;
  notice.hidden = false;
  if (persistent) {
    return;
  }
  window.clearTimeout(showArchiveNotice.timeoutId);
  showArchiveNotice.timeoutId = window.setTimeout(() => {
    notice.hidden = true;
  }, 3200);
}

function escapeArchiveHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
