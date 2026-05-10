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
const translateForm = document.getElementById('translateForm');
const translationSummary = document.getElementById('translationSummary');
const openQuickstartButton = document.getElementById('openQuickstart');
const quickstartModal = document.getElementById('quickstartModal');
const quickstartDialog = document.getElementById('quickstartDialog');
const quickstartEnvironmentSummary = document.getElementById('quickstartEnvironmentSummary');
const quickstartProgressMeta = document.getElementById('quickstartProgressMeta');
const quickstartSteps = document.getElementById('quickstartSteps');
const quickstartStepEyebrow = document.getElementById('quickstartStepEyebrow');
const quickstartStepTitle = document.getElementById('quickstartStepTitle');
const quickstartStepStatus = document.getElementById('quickstartStepStatus');
const quickstartStepDescription = document.getElementById('quickstartStepDescription');
const quickstartStepTarget = document.getElementById('quickstartStepTarget');
const quickstartStepCode = document.getElementById('quickstartStepCode');
const focusQuickstartTargetButton = document.getElementById('focusQuickstartTarget');
const copyQuickstartCodeButton = document.getElementById('copyQuickstartCode');
const toggleQuickstartMinimizeButton = document.getElementById('toggleQuickstartMinimize');
const closeQuickstartButton = document.getElementById('closeQuickstart');
const dismissQuickstartButton = document.getElementById('dismissQuickstart');
const quickstartPrevButton = document.getElementById('quickstartPrev');
const quickstartNextButton = document.getElementById('quickstartNext');

const QUICKSTART_STORAGE_KEY = 'bookAgentsQuickstartSeen';
const QUICKSTART_STEPS = [
  {
    id: 'server',
    label: 'UI live',
    title: 'Confirm the local UI is already running',
    description: 'If this page is open, the local server is live. Use Refresh to sync the dashboard with the current project state. If you need to relaunch outside the browser, run the command below.',
    targetSelectors: ['#refreshStatus', '#statusBadge'],
    targetLabel: 'Refresh button and live status badge',
    code: 'cd /workspaces/random/agents-writers\nnpm run auto',
    isComplete: () => statusBadge.dataset.state !== 'error'
  },
  {
    id: 'api-key',
    label: 'API key',
    title: 'Save the OpenRouter API key',
    description: 'Generation will not call the models until this key is configured. Paste the key into the form that is highlighted and submit it once.',
    targetSelectors: ['#apiKeyForm', '#apiKeySummary'],
    targetLabel: 'OpenRouter API key form',
    code: 'OPENROUTER_API_KEY=your_openrouter_key_here\nOPENROUTER_HTTP_REFERER=https://localhost\nOPENROUTER_APP_TITLE=Book Agents Lab',
    isComplete: (status) => Boolean(status.environment?.openrouterApiKeyConfigured)
  },
  {
    id: 'book',
    label: 'Active book',
    title: 'Create a book or switch to one',
    description: 'The generators run against the active book only. Create a fresh book from the form, or switch to an existing one from the shelf.',
    targetSelectors: ['#newBookForm', '#bookSelect', '#switchBook'],
    targetLabel: 'Series shelf and active book controls',
    code: 'npm run init-book -- --title "The Glass Orchard" --genre "dark fantasy" --theme grief --theme ambition --premise "A daughter inherits a memory orchard that burns lies into glass."',
    isComplete: (status) => Boolean(status.activeBookId) && (status.series?.books || []).length > 0
  },
  {
    id: 'generate',
    label: 'Generate',
    title: 'Run the first chapter generation',
    description: 'Fill the single-chapter form and submit it. Once Chapters written rises above zero, the project is actually producing manuscript output.',
    targetSelectors: ['#generateForm', '#projectSummary'],
    targetLabel: 'Generate one chapter form',
    code: 'Chapter: 1\nIdea: a strong opening hook\nNotes: constraints, tone, rivalries\nLength: short chapter',
    isComplete: (status) => Number(status.chaptersWritten || 0) > 0
  },
  {
    id: 'export',
    label: 'Export',
    title: 'Export the manuscript bundle',
    description: 'After generation looks good, save the active book metadata and export Markdown or EPUB from the bundle panel.',
    targetSelectors: ['#bookMetadataForm', '#exportAll'],
    targetLabel: 'Metadata form and export actions',
    code: 'npm run export -- --format all',
    isComplete: () => exportSummary.textContent.trim().length > 0,
    optional: true
  }
];

let quickstartAutoShown = false;
let quickstartStepIndex = 0;
let latestStatus = null;
let focusedQuickstartElements = [];
let quickstartMinimized = false;

async function main() {
  bindEvents();
  connectProgressStream();
  await refreshStatus();
}

function bindEvents() {
  openQuickstartButton.addEventListener('click', () => {
    quickstartStepIndex = getSuggestedQuickstartStepIndex(latestStatus);
    setQuickstartOpen(true, { markSeen: true });
  });

  toggleQuickstartMinimizeButton.addEventListener('click', () => {
    setQuickstartMinimized(!quickstartMinimized);
  });

  closeQuickstartButton.addEventListener('click', () => {
    setQuickstartOpen(false, { markSeen: true });
  });

  dismissQuickstartButton.addEventListener('click', () => {
    setQuickstartOpen(false, { markSeen: true });
  });

  quickstartPrevButton.addEventListener('click', () => {
    setQuickstartStepIndex(quickstartStepIndex - 1);
  });

  quickstartNextButton.addEventListener('click', () => {
    if (quickstartStepIndex >= QUICKSTART_STEPS.length - 1) {
      setQuickstartOpen(false, { markSeen: true });
      return;
    }

    setQuickstartStepIndex(quickstartStepIndex + 1);
  });

  focusQuickstartTargetButton.addEventListener('click', () => {
    focusQuickstartStepTargets(QUICKSTART_STEPS[quickstartStepIndex]);
  });

  copyQuickstartCodeButton.addEventListener('click', async () => {
    const step = QUICKSTART_STEPS[quickstartStepIndex];
    if (!step?.code || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(step.code);
    copyQuickstartCodeButton.textContent = 'Copied';
    window.setTimeout(() => {
      copyQuickstartCodeButton.textContent = 'Copy command';
    }, 1200);
  });

  quickstartSteps.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quickstart-step]');
    if (!button) {
      return;
    }

    setQuickstartStepIndex(Number(button.dataset.quickstartStep));
  });

  quickstartModal.addEventListener('click', (event) => {
    if (event.target === quickstartModal && !quickstartMinimized) {
      setQuickstartMinimized(true, { markSeen: true });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !quickstartModal.hidden) {
      setQuickstartOpen(false, { markSeen: true });
    }
  });

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

  translateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = formToObject(event.currentTarget);
    const result = await post('/api/translate', payload);
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

  document.getElementById('generateWholeBook').addEventListener('click', async () => {
    const result = await post('/api/books', { auto: true });
    log(result);
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
    latestStatus = status;
    renderSummary(status);
    renderApiKey(status.environment || {});
    renderQuickstart(status);
    renderTranslations(status.translations || {});
    renderSeries(status);
    renderContinuity(status.seriesContinuity || {});
    renderPresets(status.availablePresets || []);
    renderArcMetrics(status.outline?.arcMetrics || {});
    renderAgents(status.agents || {});
    log(status);
    maybeShowQuickstart(status.environment || {});
    setBusy('ready');
  } catch (error) {
    setBusy('error');
    log({ error: error.message });
  }
}

function renderQuickstart(status) {
  const requiredSteps = QUICKSTART_STEPS.filter((step) => !step.optional);
  const completedRequired = requiredSteps.filter((step) => isQuickstartStepComplete(step, status)).length;
  const suggestedIndex = getSuggestedQuickstartStepIndex(status);

  if (quickstartStepIndex >= QUICKSTART_STEPS.length) {
    quickstartStepIndex = suggestedIndex;
  }

  quickstartEnvironmentSummary.textContent = completedRequired >= requiredSteps.length
    ? 'Core setup is complete. You can keep generating chapters or move straight to export.'
    : `${completedRequired}/${requiredSteps.length} required steps complete. Next: ${QUICKSTART_STEPS[suggestedIndex].title}.`;

  quickstartProgressMeta.textContent = `${completedRequired}/${requiredSteps.length} required steps done`;

  quickstartSteps.innerHTML = QUICKSTART_STEPS.map((step, index) => {
    const meta = getQuickstartStepMeta(step, status, index);
    return `
      <button
        type="button"
        class="guide-progress-item ${index === quickstartStepIndex ? 'is-active' : ''}"
        data-quickstart-step="${index}"
      >
        <strong>${escapeHtml(`Step ${index + 1}: ${step.label}`)}</strong>
        <span>${escapeHtml(meta.label)}</span>
      </button>
    `;
  }).join('');

  renderQuickstartStep(status);
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

function hasSeenQuickstart() {
  try {
    return localStorage.getItem(QUICKSTART_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markQuickstartSeen() {
  try {
    localStorage.setItem(QUICKSTART_STORAGE_KEY, 'true');
  } catch {
    // Ignore localStorage failures and keep the guide usable.
  }
}

function setQuickstartOpen(open, options = {}) {
  quickstartModal.hidden = !open;
  quickstartModal.setAttribute('aria-hidden', String(!open));

  if (open) {
    setQuickstartMinimized(Boolean(options.minimized), { markSeen: options.markSeen, skipRender: true });
    renderQuickstart(latestStatus || {});
  } else {
    quickstartMinimized = false;
    quickstartModal.classList.remove('is-minimized');
    quickstartDialog.setAttribute('aria-modal', 'true');
    toggleQuickstartMinimizeButton.textContent = 'Minimize';
    document.body.classList.remove('modal-open');
    clearQuickstartTargets();
  }

  if (options.markSeen) {
    markQuickstartSeen();
  }
}

function setQuickstartMinimized(minimized, options = {}) {
  quickstartMinimized = minimized;
  quickstartModal.classList.toggle('is-minimized', minimized);
  quickstartDialog.setAttribute('aria-modal', String(!minimized));
  toggleQuickstartMinimizeButton.textContent = minimized ? 'Expand' : 'Minimize';
  document.body.classList.toggle('modal-open', !quickstartModal.hidden && !minimized);

  if (minimized) {
    clearQuickstartTargets();
  } else if (!options.skipRender && !quickstartModal.hidden) {
    renderQuickstart(latestStatus || {});
  }

  if (options.markSeen) {
    markQuickstartSeen();
  }
}

function maybeShowQuickstart(environment) {
  if (quickstartAutoShown) {
    return;
  }

  quickstartAutoShown = true;

  if (!hasSeenQuickstart() || !environment.openrouterApiKeyConfigured) {
    quickstartStepIndex = getSuggestedQuickstartStepIndex(latestStatus);
    setQuickstartOpen(true, { markSeen: true });
  }
}

function renderQuickstartStep(status) {
  const step = QUICKSTART_STEPS[quickstartStepIndex];
  const meta = getQuickstartStepMeta(step, status, quickstartStepIndex);

  quickstartStepEyebrow.textContent = `Step ${quickstartStepIndex + 1} of ${QUICKSTART_STEPS.length}`;
  quickstartStepTitle.textContent = step.title;
  quickstartStepDescription.textContent = step.description;
  quickstartStepStatus.textContent = meta.label;
  quickstartStepStatus.dataset.tone = meta.tone;
  quickstartStepTarget.textContent = step.targetLabel ? `Highlighted area: ${step.targetLabel}` : '';
  quickstartStepCode.textContent = step.code || '';
  quickstartStepCode.hidden = !step.code;
  focusQuickstartTargetButton.hidden = !(step.targetSelectors || []).length;
  copyQuickstartCodeButton.hidden = !step.code;
  quickstartPrevButton.disabled = quickstartStepIndex === 0;
  quickstartNextButton.textContent = quickstartStepIndex === QUICKSTART_STEPS.length - 1 ? 'Close guide' : 'Next step';

  if (!quickstartModal.hidden && !quickstartMinimized) {
    focusQuickstartStepTargets(step);
  }
}

function getSuggestedQuickstartStepIndex(status) {
  const nextRequiredIndex = QUICKSTART_STEPS.findIndex((step) => !step.optional && !isQuickstartStepComplete(step, status));
  return nextRequiredIndex === -1 ? QUICKSTART_STEPS.length - 1 : nextRequiredIndex;
}

function isQuickstartStepComplete(step, status) {
  return Boolean(step.isComplete?.(status || {}));
}

function getQuickstartStepMeta(step, status, index) {
  const complete = isQuickstartStepComplete(step, status);

  if (complete) {
    return { tone: 'complete', label: 'done' };
  }

  if (step.optional) {
    return { tone: 'optional', label: 'optional' };
  }

  return {
    tone: index === getSuggestedQuickstartStepIndex(status) ? 'active' : 'pending',
    label: index === getSuggestedQuickstartStepIndex(status) ? 'next required' : 'required'
  };
}

function setQuickstartStepIndex(index) {
  const nextIndex = Math.max(0, Math.min(index, QUICKSTART_STEPS.length - 1));
  if (Number.isNaN(nextIndex)) {
    return;
  }

  quickstartStepIndex = nextIndex;
  renderQuickstart(latestStatus || {});
}

function focusQuickstartStepTargets(step) {
  clearQuickstartTargets();

  const targets = (step.targetSelectors || [])
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  if (!targets.length) {
    return;
  }

  focusedQuickstartElements = targets;

  targets.forEach((element, index) => {
    element.classList.add('guide-focus-target');
    if (index === 0) {
      element.dataset.guideLabel = step.label;
    }
  });

  const [firstTarget] = targets;
  firstTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

function clearQuickstartTargets() {
  focusedQuickstartElements.forEach((element) => {
    element.classList.remove('guide-focus-target');
    element.removeAttribute('data-guide-label');
  });

  focusedQuickstartElements = [];
}

function renderSummary(status) {
  projectSummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Title</span><strong>${escapeHtml(status.title || 'Untitled')}</strong></div>
      <div><span>Genre</span><strong>${escapeHtml(status.genre || 'Unknown')}</strong></div>
      <div><span>Active presets</span><strong>${escapeHtml((status.activePresets || []).join(', ') || 'none')}</strong></div>
      <div><span>Chapters written</span><strong>${status.chaptersWritten ?? 0}</strong></div>
      <div><span>Italian chapters</span><strong>${status.translations?.translatedCount ?? 0}</strong></div>
      <div><span>Pending translation</span><strong>${status.translations?.pendingCount ?? 0}</strong></div>
    </div>
    <div class="recent">
      <h3>Recent chapters</h3>
      ${(status.recentChapters || []).map((chapter) => `<div class="recent-item"><strong>${escapeHtml(chapter.title || `Chapter ${chapter.chapter}`)}</strong><span>${escapeHtml(chapter.summary || 'No summary yet.')}</span></div>`).join('') || '<p>No chapters yet.</p>'}
    </div>
  `;
}

function renderTranslations(report) {
  translationSummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Translated</span><strong>${report.translatedCount ?? 0}</strong></div>
      <div><span>Still pending</span><strong>${report.pendingCount ?? 0}</strong></div>
    </div>
    <div class="recent top-gap">
      <h3>Italian files</h3>
      ${(report.chapters || []).length
        ? report.chapters.map((chapter) => `<div class="recent-item"><strong>${escapeHtml(chapter.title || `Chapter ${chapter.chapter}`)}</strong><span>${escapeHtml(`Chapter ${chapter.chapter} -> ${chapter.file}`)}</span></div>`).join('')
        : '<p>No Italian translations yet.</p>'}
    </div>
  `;

  const chapterField = translateForm?.elements?.chapter;
  if (chapterField && document.activeElement !== chapterField) {
    chapterField.value = report.nextPendingChapter?.chapter || latestStatus?.chaptersWritten || 1;
  }
}

function renderSeries(status) {
  const books = status.series?.books || [];
  const pattern = status.series?.pattern || null;
  seriesSummary.innerHTML = `
    <div class="summary-grid">
      <div><span>Series</span><strong>${escapeHtml(status.series?.title || 'Untitled Series')}</strong></div>
      <div><span>Active book</span><strong>${escapeHtml(status.activeBookId || 'unknown')}</strong></div>
    </div>
    ${pattern ? `
      <div class="recent top-gap">
        <h3>Automation pattern</h3>
        <div class="recent-item">
          <div>
            <strong>${escapeHtml(pattern.name || 'Series pattern')}</strong>
            ${pattern.overview ? `<span>${escapeHtml(pattern.overview)}</span>` : ''}
            ${(pattern.sequenceBeats || []).length ? `<span>Sequence: ${escapeHtml((pattern.sequenceBeats || []).join(' -> '))}</span>` : ''}
          </div>
        </div>
      </div>
    ` : ''}
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

function logProgress(event, data) {
  const AGENT_LABELS = {
    architect: '🏛 Architect',
    character_master: '🎭 Character Master',
    chapter_planner: '📋 Chapter Planner',
    writer: '✍️  Writer',
    critic: '🔍 Critic',
    continuity_keeper: '🧵 Continuity Keeper',
    editor: '📝 Editor',
    translator: '🌐 Translator'
  };

  let line = '';

  if (event === 'chapter-start') {
    line = `▶ Chapter ${data.chapter} — generation started`;
  } else if (event === 'chapter-done') {
    const approved = data.approved === false ? '✗ not approved' : '✓ approved';
    line = `✅ Chapter ${data.chapter} "${data.chapterTitle}" done (${data.revisionRound} revision${data.revisionRound === 1 ? '' : 's'}, ${approved})`;
  } else if (event === 'agent-start') {
    const label = AGENT_LABELS[data.agent] || data.agent;
    const rev = data.revision > 0 ? ` rev.${data.revision}` : '';
    line = `  → ${label}${rev} running…`;
  } else if (event === 'agent-done') {
    const label = AGENT_LABELS[data.agent] || data.agent;
    const detail = data.verdict ? ` [${data.verdict}]` : data.pass === false ? ' [continuity ✗]' : '';
    line = `  ✓ ${label}${detail}`;
  } else if (event === 'vote-start') {
    line = `  🗳 Vote round ${data.revision + 1} in progress…`;
  } else if (event === 'vote-done') {
    const result = data.approved ? '✓ approved' : '✗ needs revision';
    line = `  🗳 Vote: ${result} (avg score: ${data.score ?? '?'})`;
  } else {
    line = `[${event}] ${JSON.stringify(data)}`;
  }

  activityLog.textContent = `${new Date().toLocaleTimeString()}  ${line}\n${activityLog.textContent}`.trim();
}

function connectProgressStream() {
  let source = null;
  let reconnectDelay = 1000;

  function connect() {
    if (source) {
      source.close();
    }

    source = new EventSource('/api/events');

    source.addEventListener('message', (event) => {
      try {
        const { event: name, data } = JSON.parse(event.data);
        logProgress(name, data);

        // Auto-refresh the dashboard after a chapter or translation completes.
        if (name === 'chapter-done') {
          refreshStatus();
        }
      } catch {
        // Ignore malformed events.
      }
    });

    source.addEventListener('open', () => {
      reconnectDelay = 1000;
    });

    source.addEventListener('error', () => {
      source.close();
      // Reconnect with capped exponential back-off.
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      setTimeout(connect, reconnectDelay);
    });
  }

  connect();
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
