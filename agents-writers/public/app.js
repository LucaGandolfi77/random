const statusBadge = document.getElementById('statusBadge');
const projectSummary = document.getElementById('projectSummary');
const seriesSummary = document.getElementById('seriesSummary');
const continuitySummary = document.getElementById('continuitySummary');
const exportSummary = document.getElementById('exportSummary');
const apiKeySummary = document.getElementById('apiKeySummary');
const presetSelect = document.getElementById('presetSelect');
const bookSelect = document.getElementById('bookSelect');
const arcMetrics = document.getElementById('arcMetrics');
const agentsGrid = document.getElementById('agentsGrid');
const activityLog = document.getElementById('activityLog');
const bookMetadataForm = document.getElementById('bookMetadataForm');
const apiKeyForm = document.getElementById('apiKeyForm');

async function main() {
  bindEvents();
  await refreshStatus();
}

function bindEvents() {
  document.getElementById('refreshStatus').addEventListener('click', refreshStatus);
  document.getElementById('applyPreset').addEventListener('click', async () => {
    const presetName = presetSelect.value;
    if (!presetName) return;
    await post('/api/preset', { presetName });
    log(`Applied preset: ${presetName}`);
    await refreshStatus();
  });

  document.getElementById('generateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/generate', payload);
    log(result);
    await refreshStatus();
  });

  document.getElementById('generateBookForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/generate-book', payload);
    log(result);
    await refreshStatus();
  });

  document.getElementById('exportMarkdown').addEventListener('click', () => runExport('markdown'));
  document.getElementById('exportEpub').addEventListener('click', () => runExport('epub'));
  document.getElementById('exportAll').addEventListener('click', () => runExport('all'));

  document.getElementById('switchBook').addEventListener('click', async () => {
    if (!bookSelect.value) return;
    const result = await post('/api/select-book', { bookId: bookSelect.value });
    log(result);
    await refreshStatus();
  });

  document.getElementById('newBookForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/books', payload);
    log(result);
    event.currentTarget.reset();
    await refreshStatus();
  });

  bookMetadataForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/book-metadata', payload);
    log(result);
    await refreshStatus();
  });

  apiKeyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/openrouter-key', payload);
    log(result);
    apiKeyForm.reset();
    await refreshStatus();
  });
}

async function refreshStatus() {
  setBusy('loading');
  try {
    const status = await get('/api/status');
    renderSummary(status);
    renderApiKey(status.environment || {});
    renderSeries(status);
    renderContinuity(status.seriesContinuity || {});
    renderPresets(status.availablePresets || []);
    renderArcMetrics(status.outline?.arcMetrics || {});
    renderAgents(status.agents || {});
    log(status);
    setBusy('ready');
  } catch (error) {
    setBusy('error');
    log({ error: error.message });
  }
}

function renderApiKey(environment) {
  const configured = Boolean(environment.openrouterApiKeyConfigured);
  apiKeySummary.innerHTML = `
    <div class="summary-grid">
      <div><span>OpenRouter key</span><strong>${configured ? 'configured' : 'missing'}</strong></div>
      <div><span>App title</span><strong>${environment.openrouterAppTitleConfigured ? 'configured' : 'optional'}</strong></div>
    </div>
  `;
}

function renderSummary(status) {
  projectSummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Title</span><strong>${escapeHtml(status.title || 'Untitled')}</strong></div>
      <div><span>Genre</span><strong>${escapeHtml(status.genre || 'Unknown')}</strong></div>
      <div><span>Active presets</span><strong>${escapeHtml((status.activePresets || []).join(', ') || 'none')}</strong></div>
      <div><span>Chapters written</span><strong>${status.chaptersWritten ?? 0}</strong></div>
    </div>
    <div class="recent">
      <h3>Recent chapters</h3>
      ${(status.recentChapters || []).map((chapter) => `<div class="recent-item"><strong>${escapeHtml(chapter.title || `Chapter ${chapter.chapter}`)}</strong><span>${escapeHtml(chapter.summary || 'No summary yet.')}</span></div>`).join('') || '<p>No chapters yet.</p>'}
    </div>
  `;
}

function renderSeries(status) {
  const books = status.series?.books || [];
  seriesSummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Series</span><strong>${escapeHtml(status.series?.title || 'Untitled Series')}</strong></div>
      <div><span>Active book</span><strong>${escapeHtml(status.activeBookId || 'unknown')}</strong></div>
    </div>
    <div class="recent top-gap">
      <h3>Books</h3>
      ${books.map((book) => `
        <div class="recent-item book-item ${book.id === status.activeBookId ? 'is-active' : ''}">
          <div>
            <strong>${escapeHtml(book.title)}</strong>
            <span>${escapeHtml(book.id)} · ${escapeHtml(book.status || 'draft')} · ${escapeHtml(book.genre || 'unknown')}</span>
            ${book.premise ? `<span>${escapeHtml(book.premise)}</span>` : ''}
            ${(book.themes || []).length ? `<span>Themes: ${escapeHtml((book.themes || []).join(', '))}</span>` : ''}
          </div>
          <button type="button" class="secondary switch-inline" data-book-id="${escapeAttr(book.id)}">${book.id === status.activeBookId ? 'Active' : 'Use book'}</button>
        </div>
      `).join('') || '<p>No books yet.</p>'}
    </div>
  `;

  bookSelect.innerHTML = books.map((book) => `<option value="${escapeAttr(book.id)}" ${book.id === status.activeBookId ? 'selected' : ''}>${escapeHtml(book.title)} (${escapeHtml(book.id)})</option>`).join('');

  seriesSummary.querySelectorAll('.switch-inline').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookId = button.dataset.bookId;
      if (!bookId || bookId === status.activeBookId) return;
      const result = await post('/api/select-book', { bookId });
      log(result);
      await refreshStatus();
    });
  });

  hydrateBookMetadataForm(status.currentBook || {});
}

function renderContinuity(report) {
  const issues = report.issues || [];
  continuitySummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Books checked</span><strong>${report.booksChecked ?? 0}</strong></div>
      <div><span>Issues</span><strong>${report.issueCount ?? 0}</strong></div>
      <div><span>Status</span><strong>${report.ok === false ? 'needs review' : 'steady'}</strong></div>
    </div>
    <div class="recent top-gap">
      <h3>Continuity findings</h3>
      ${issues.length ? issues.map((issue) => `<div class="recent-item"><strong>${escapeHtml(issue.type || issue.severity || 'issue')}</strong><span>${escapeHtml(issue.message || '')}</span></div>`).join('') : '<p>No cross-book issues detected.</p>'}
    </div>
  `;
}

function hydrateBookMetadataForm(book) {
  bookMetadataForm.elements.title.value = book.title || '';
  bookMetadataForm.elements.genre.value = book.genre || '';
  bookMetadataForm.elements.premise.value = book.premise || '';
  bookMetadataForm.elements.themes.value = (book.themes || []).join(', ');
  bookMetadataForm.elements.exportBaseName.value = book.exportBaseName || '';
  bookMetadataForm.elements.subtitle.value = book.cover?.subtitle || '';
  bookMetadataForm.elements.author.value = book.cover?.author || '';
  bookMetadataForm.elements.tagline.value = book.cover?.tagline || '';
  bookMetadataForm.elements.coverColor.value = book.cover?.color || '#7c9cff';
}

function renderArcMetrics(metrics) {
  const entries = Object.entries(metrics);
  arcMetrics.innerHTML = entries.length
    ? entries.map(([arc, metric]) => `
      <article class="agent-card metric-card">
        <header>
          <h3>${escapeHtml(arc)}</h3>
          <p>${escapeHtml(metric.status || 'active')}</p>
        </header>
        <div class="metric-grid">
          <div><span>Success</span><strong>${metric.success ?? 0}</strong></div>
          <div><span>Momentum</span><strong>${metric.momentum ?? 0}</strong></div>
          <div><span>Decay</span><strong>${metric.decay ?? 0}</strong></div>
          <div><span>Appearances</span><strong>${metric.appearances ?? 0}</strong></div>
        </div>
      </article>
    `).join('')
    : '<p class="meta">No arc metrics yet.</p>';
}

function renderPresets(presets) {
  presetSelect.innerHTML = ['<option value="">Select a preset</option>', ...presets.map((preset) => `<option value="${escapeAttr(preset)}">${escapeHtml(preset)}</option>`)].join('');
}

function renderAgents(agents) {
  agentsGrid.innerHTML = Object.entries(agents).map(([name, agent]) => `
    <article class="agent-card">
      <header>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(agent.model || '')}</p>
      </header>
      <p class="meta"><strong>Persona:</strong> ${escapeHtml(agent.persona || 'n/a')}</p>
      <p class="meta"><strong>Private agenda:</strong> ${escapeHtml(agent.private_agenda || 'n/a')}</p>
      <p class="meta"><strong>Rivals:</strong> ${escapeHtml((agent.rivalries || []).join(', ') || 'none')}</p>
      <div class="controls">
        ${Object.entries(agent.behavior || {}).map(([key, value]) => renderControl(name, key, value)).join('')}
      </div>
    </article>
  `).join('');

  agentsGrid.querySelectorAll('[data-save]').forEach((button) => {
    button.addEventListener('click', async () => {
      const { agent, key, input } = button.dataset;
      const field = document.getElementById(input);
      const value = field.type === 'checkbox' ? field.checked : field.value;
      await post('/api/set', { agentName: agent, key, value });
      log(`Updated ${agent}.${key} -> ${value}`);
      await refreshStatus();
    });
  });

  agentsGrid.querySelectorAll('input[type="range"]').forEach((range) => {
    range.addEventListener('input', () => {
      const output = document.getElementById(`${range.id}_value`);
      if (output) output.textContent = range.value;
    });
  });
}

async function runExport(format) {
  const result = await post('/api/export', { format });
  exportSummary.innerHTML = `
    <div class="recent-item">
      <strong>${escapeHtml(result.message)}</strong>
      <span>${(result.outputs || []).map((output) => escapeHtml(`${output.format}: ${output.path}`)).join('<br />')}</span>
    </div>
  `;
  log(result);
}

function renderControl(agentName, key, value) {
  const inputId = `${agentName}_${key}`.replace(/[^a-z0-9_]/gi, '_');

  if (typeof value === 'number') {
    return `
      <label>
        <span>${escapeHtml(key)}</span>
        <div class="slider-row">
          <input id="${inputId}" type="range" min="0" max="1" step="0.01" value="${value}" />
          <output id="${inputId}_value">${value}</output>
          <button type="button" data-save="true" data-agent="${escapeAttr(agentName)}" data-key="${escapeAttr(key)}" data-input="${inputId}">Save</button>
        </div>
      </label>
    `;
  }

  if (typeof value === 'boolean') {
    return `
      <label>
        <span>${escapeHtml(key)}</span>
        <div class="slider-row">
          <input id="${inputId}" type="checkbox" ${value ? 'checked' : ''} />
          <button type="button" data-save="true" data-agent="${escapeAttr(agentName)}" data-key="${escapeAttr(key)}" data-input="${inputId}">Save</button>
        </div>
      </label>
    `;
  }

  const stringValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
  return `
    <label>
      <span>${escapeHtml(key)}</span>
      <div class="text-row">
        <input id="${inputId}" type="text" value="${escapeAttr(stringValue)}" />
        <button type="button" data-save="true" data-agent="${escapeAttr(agentName)}" data-key="${escapeAttr(key)}" data-input="${inputId}">Save</button>
      </div>
    </label>
  `;
}

function formToObject(form) {
  const data = new FormData(form);
  const payload = {};

  for (const [key, value] of data.entries()) {
    if (form.elements[key]?.type === 'checkbox') {
      payload[key] = form.elements[key].checked;
    } else {
      payload[key] = value;
    }
  }

  return payload;
}

async function get(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function post(url, payload) {
  setBusy('working');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    setBusy('error');
    throw new Error(data.error || 'Request failed');
  }
  setBusy('ready');
  return data;
}

function log(payload) {
  const next = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  activityLog.textContent = `${new Date().toLocaleTimeString()}\n${next}\n\n${activityLog.textContent}`.trim();
}

function setBusy(state) {
  statusBadge.textContent = state;
  statusBadge.dataset.state = state;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

main();
