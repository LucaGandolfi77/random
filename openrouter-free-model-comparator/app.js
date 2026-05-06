const DEFAULT_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'baidu/qianfan-ocr-fast:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openrouter/owl-alpha',
  'poolside/laguna-m.1:free',
  'poolside/laguna-xs.2:free',
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-235b-a22b:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemini-2.0-flash-exp:free'
];

const STORAGE_KEY = 'or-free-comparator-preferences-v1';
const MODEL_CATALOG_PATH = './openrouter-models-free.txt';
const EXAMPLE_PROMPT = `Compare the trade-offs of edge AI vs cloud AI for a small robotics startup.

Return:
1. A concise recommendation
2. A bullet list of pros and cons
3. A final verdict in one sentence`;

const state = {
  availableModels: [],
  models: [],
  runs: [],
  runLog: [],
  openrouterTrafficLogs: [],
  isRunning: false,
  cancelRequested: false,
  deferredInstallPrompt: null,
  runStartTime: 0,
  wallTimerId: null,
  charts: { latency: null, token: null, tps: null },
  showDiff: false,
  savedQueueModels: []
};

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  loadPreferences();
  setupTheme();
  await loadModelCatalog();
  hydrateInitialQueue();
  bindEvents();
  updateConnectivity();
  updateInstallState();
  renderCatalogOptions();
  renderModels();
  renderAllResults();
  updateRunState('Idle', 'idle');
  updateSummary();
  syncDiffToggle();
  registerServiceWorker();
});

function cacheElements() {
  [
    'apiKey','toggleKeyBtn','temperature','maxTokens','timeoutSeconds','appTitle','systemPrompt','userPrompt',
    'runButton','cancelButton','clearResultsButton','examplePromptBtn','modelList','newModelInput','saveNewModelBtn',
    'addCatalogModelBtn','catalogModelSelect','saveCatalogModelBtn','selectAllBtn','selectNoneBtn','progressSummary','currentModel','elapsedWallTime','successCount',
    'errorCount','runLog','clearLogBtn','aggregateStats','summaryBody','resultsList','exportJsonBtn','exportCsvBtn',
    'sortSelect','installButton','networkStatus','networkDot','installStatus','installDot','runState','runDot','themeToggle',
    'diffToggleBtn','trafficLogsButton','trafficModal','trafficLogList','closeTrafficModalBtn','copyTrafficLogsBtn','clearTrafficLogsBtn'
  ].forEach(id => els[id] = document.getElementById(id));
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.temperature !== 'undefined') els.temperature.value = data.temperature;
    if (typeof data.maxTokens !== 'undefined') els.maxTokens.value = data.maxTokens;
    if (typeof data.timeoutSeconds !== 'undefined') els.timeoutSeconds.value = data.timeoutSeconds;
    if (typeof data.systemPrompt === 'string') els.systemPrompt.value = data.systemPrompt;
    if (typeof data.userPrompt === 'string') els.userPrompt.value = data.userPrompt;
    if (typeof data.appTitle === 'string') els.appTitle.value = data.appTitle;
    if (Array.isArray(data.queueModels)) state.savedQueueModels = data.queueModels;
    if (Array.isArray(data.customModels)) state.savedCustomModels = data.customModels;
    if (typeof data.theme === 'string') document.documentElement.setAttribute('data-theme', data.theme);
    if (typeof data.showDiff === 'boolean') state.showDiff = data.showDiff;
  } catch (_) {}
}

function savePreferences() {
  const customModels = state.models.filter(m => m.type === 'custom').map(({id, enabled}) => ({ id, enabled }));
  const queueModels = state.models.map(({ id, enabled, type }) => ({ id, enabled, type }));
  const payload = {
    temperature: els.temperature.value,
    maxTokens: els.maxTokens.value,
    timeoutSeconds: els.timeoutSeconds.value,
    systemPrompt: els.systemPrompt.value,
    userPrompt: els.userPrompt.value,
    appTitle: els.appTitle.value,
    queueModels,
    customModels,
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    showDiff: state.showDiff
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function setupTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (!current) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

async function loadModelCatalog() {
  try {
    const response = await fetch(MODEL_CATALOG_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    const models = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => !line.startsWith('#'));
    state.availableModels = dedupeModels(models.length ? models : DEFAULT_MODELS);
  } catch (_) {
    state.availableModels = dedupeModels(DEFAULT_MODELS);
  }
}

function hydrateInitialQueue() {
  if (Array.isArray(state.savedQueueModels) && state.savedQueueModels.length) {
    state.models = state.savedQueueModels.map((item, index) => ({
      uid: crypto.randomUUID(),
      id: item.id,
      enabled: item.enabled !== false,
      type: item.type || inferModelType(item.id),
      order: index
    }));
    return;
  }

  if (Array.isArray(state.savedCustomModels) && state.savedCustomModels.length) {
    const baseModel = pickInitialModel();
    state.models = [buildQueueModel(baseModel, 0)];
    state.savedCustomModels.forEach((item, i) => {
      state.models.push({
        uid: crypto.randomUUID(),
        id: item.id,
        enabled: item.enabled !== false,
        type: 'custom',
        order: i + 1
      });
    });
    return;
  }

  state.models = [buildQueueModel(pickInitialModel(), 0)];
}

function pickInitialModel() {
  return state.availableModels.find(model => model === 'openrouter/free') || state.availableModels[0] || DEFAULT_MODELS[0];
}

function buildQueueModel(id, order, enabled = true) {
  return {
    uid: crypto.randomUUID(),
    id,
    enabled,
    type: inferModelType(id),
    order
  };
}

function inferModelType(id) {
  return state.availableModels.includes(id) ? 'catalog' : 'custom';
}

function dedupeModels(models) {
  return [...new Set(models)];
}

function renderCatalogOptions() {
  if (!els.catalogModelSelect) return;
  els.catalogModelSelect.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.availableModels.forEach(modelId => {
    const option = document.createElement('option');
    option.value = modelId;
    option.textContent = modelId;
    fragment.appendChild(option);
  });
  els.catalogModelSelect.appendChild(fragment);

  const nextAvailable = state.availableModels.find(id => !state.models.some(model => model.id === id));
  if (nextAvailable) {
    els.catalogModelSelect.value = nextAvailable;
  }
}

function bindEvents() {
  els.toggleKeyBtn.addEventListener('click', () => {
    const isPassword = els.apiKey.type === 'password';
    els.apiKey.type = isPassword ? 'text' : 'password';
    els.toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  els.examplePromptBtn.addEventListener('click', () => {
    els.userPrompt.value = EXAMPLE_PROMPT;
    if (!els.systemPrompt.value.trim()) {
      els.systemPrompt.value = 'You are a concise, technical assistant.';
    }
    savePreferences();
  });

  ['temperature','maxTokens','timeoutSeconds','systemPrompt','userPrompt','appTitle'].forEach(id => {
    els[id].addEventListener('input', savePreferences);
  });

  els.saveNewModelBtn.addEventListener('click', addCustomModel);
  els.saveCatalogModelBtn.addEventListener('click', addCatalogModel);
  els.addCatalogModelBtn.addEventListener('click', addCatalogModel);
  els.newModelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomModel();
    }
  });

  els.selectAllBtn.addEventListener('click', () => { setAllModels(true); });
  els.selectNoneBtn.addEventListener('click', () => { setAllModels(false); });
  els.runButton.addEventListener('click', runComparison);
  els.cancelButton.addEventListener('click', () => {
    state.cancelRequested = true;
    logMessage('Cancellation requested. The current request will finish or timeout before the queue stops.');
  });
  els.clearResultsButton.addEventListener('click', clearResults);
  els.clearLogBtn.addEventListener('click', () => { state.runLog = []; renderLog(); });
  els.exportJsonBtn.addEventListener('click', exportJson);
  els.exportCsvBtn.addEventListener('click', exportCsv);
  els.sortSelect.addEventListener('change', renderSummaryTable);
  els.themeToggle.addEventListener('click', toggleTheme);
  els.installButton.addEventListener('click', handleInstall);
  els.trafficLogsButton?.addEventListener('click', openTrafficModal);
  els.closeTrafficModalBtn?.addEventListener('click', closeTrafficModal);
  els.copyTrafficLogsBtn?.addEventListener('click', copyTrafficLogs);
  els.clearTrafficLogsBtn?.addEventListener('click', clearTrafficLogs);
  els.trafficModal?.addEventListener('click', (event) => {
    if (event.target === els.trafficModal) {
      closeTrafficModal();
    }
  });
  if (els.diffToggleBtn) {
    els.diffToggleBtn.addEventListener('click', () => {
      state.showDiff = !state.showDiff;
      savePreferences();
      syncDiffToggle();
      renderResultsList();
    });
  }

  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.trafficModal && !els.trafficModal.hidden) {
      closeTrafficModal();
    }
  });
  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    els.installButton.hidden = true;
    updateInstallState();
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  savePreferences();
  renderCharts();
}

function syncDiffToggle() {
  if (!els.diffToggleBtn) return;
  els.diffToggleBtn.textContent = state.showDiff ? 'Hide side-by-side' : 'Show side-by-side';
}

async function handleInstall() {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  els.installButton.hidden = true;
}

function updateConnectivity() {
  const online = navigator.onLine;
  els.networkStatus.textContent = online ? 'Online' : 'Offline';
  els.networkDot.className = `dot ${online ? 'online' : 'idle'}`;
}

function updateInstallState() {
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  els.installStatus.textContent = installed ? 'Installed mode' : 'Browser mode';
  els.installDot.className = `dot ${installed ? 'installed' : 'idle'}`;
}

function updateRunState(label, cls) {
  els.runState.textContent = label;
  els.runDot.className = `dot ${cls}`;
}

function addCustomModel() {
  const id = els.newModelInput.value.trim();
  if (!id) return;
  if (state.models.some(model => model.id === id)) {
    els.newModelInput.value = '';
    return;
  }
  state.models.push({ uid: crypto.randomUUID(), id, enabled: true, type: 'custom', order: state.models.length });
  els.newModelInput.value = '';
  savePreferences();
  renderCatalogOptions();
  renderModels();
}

function addCatalogModel() {
  const id = els.catalogModelSelect?.value?.trim();
  if (!id || state.models.some(model => model.id === id)) return;
  state.models.push(buildQueueModel(id, state.models.length));
  savePreferences();
  renderCatalogOptions();
  renderModels();
}

function setAllModels(enabled) {
  state.models.forEach(model => { model.enabled = enabled; });
  savePreferences();
  renderModels();
}

function renderModels() {
  els.modelList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.models.forEach((model, index) => {
    const li = document.createElement('li');
    li.className = 'model-item';
    li.innerHTML = `
      <div class="model-row">
        <input type="checkbox" ${model.enabled ? 'checked' : ''} aria-label="Enable ${escapeHtml(model.id)}" ${state.isRunning ? 'disabled' : ''}>
        <div class="model-name" title="${escapeHtml(model.id)}">${escapeHtml(model.id)}</div>
      </div>
      <div class="model-actions">
        <button class="button ghost small" data-action="up" ${index === 0 || state.isRunning ? 'disabled' : ''}>Move up</button>
        <button class="button ghost small" data-action="down" ${index === state.models.length - 1 || state.isRunning ? 'disabled' : ''}>Move down</button>
        <button class="button ghost small" data-action="edit" ${state.isRunning ? 'disabled' : ''}>Edit</button>
        <button class="button danger small" data-action="delete" ${model.type === 'default' || state.isRunning ? 'disabled' : ''}>Delete</button>
      </div>
    `;

    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      model.enabled = checkbox.checked;
      savePreferences();
    });

    li.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleModelAction(model.uid, btn.dataset.action));
    });
    fragment.appendChild(li);
  });
  els.modelList.appendChild(fragment);
}

function handleModelAction(uid, action) {
  const index = state.models.findIndex(m => m.uid === uid);
  if (index === -1) return;
  if (action === 'up' && index > 0) {
    [state.models[index - 1], state.models[index]] = [state.models[index], state.models[index - 1]];
  } else if (action === 'down' && index < state.models.length - 1) {
    [state.models[index + 1], state.models[index]] = [state.models[index], state.models[index + 1]];
  } else if (action === 'edit') {
    const next = prompt('Edit model ID', state.models[index].id);
    if (next && next.trim()) state.models[index].id = next.trim();
  } else if (action === 'delete' && state.models[index].type === 'custom') {
    state.models.splice(index, 1);
  } else if (action === 'delete' && state.models[index].type === 'catalog') {
    state.models.splice(index, 1);
  }
  savePreferences();
  renderCatalogOptions();
  renderModels();
}

function selectedModels() {
  return state.models.filter(model => model.enabled);
}

function buildMessages() {
  const messages = [];
  if (els.systemPrompt.value.trim()) {
    messages.push({ role: 'system', content: els.systemPrompt.value.trim() });
  }
  messages.push({ role: 'user', content: els.userPrompt.value.trim() });
  return messages;
}

async function runComparison() {
  const apiKey = els.apiKey.value.trim();
  const queue = selectedModels();
  const prompt = els.userPrompt.value.trim();

  if (!apiKey) return alert('Please provide your OpenRouter API key.');
  if (!prompt) return alert('Please provide a prompt.');
  if (!queue.length) return alert('Enable at least one model.');

  state.isRunning = true;
  state.cancelRequested = false;
  state.runs = [];
  state.runLog = [];
  state.openrouterTrafficLogs = [];
  state.runStartTime = performance.now();

  lockUi(true);
  updateRunState('Running', 'running');
  startWallTimer();
  logMessage(`Starting sequential comparison for ${queue.length} model(s).`);
  renderAllResults();

  for (let i = 0; i < queue.length; i++) {
    if (state.cancelRequested) {
      logMessage('Run cancelled before starting the next model.');
      break;
    }

    const model = queue[i];
    els.currentModel.textContent = model.id;
    els.progressSummary.textContent = `${i} / ${queue.length} complete`;
    logMessage(`Running ${model.id} (${i + 1}/${queue.length})...`);

    const run = await runModel(model.id, {
      apiKey,
      appTitle: els.appTitle.value.trim() || 'OpenRouter Free Model Comparator',
      temperature: Number(els.temperature.value),
      maxTokens: Number(els.maxTokens.value),
      timeoutSeconds: Number(els.timeoutSeconds.value),
      messages: buildMessages()
    });

    state.runs.push(run);
    logMessage(run.status === 'success'
      ? `Completed ${model.id} in ${formatMs(run.elapsedMs)}.`
      : `Failed ${model.id}: ${run.error || 'Unknown error'}`);

    updateLiveStats();
    renderAllResults();
  }

  stopWallTimer();
  state.isRunning = false;
  lockUi(false);
  els.progressSummary.textContent = `${state.runs.length} / ${queue.length} complete`;
  els.currentModel.textContent = state.cancelRequested ? 'Cancelled' : 'Done';
  updateRunState(state.cancelRequested ? 'Cancelled' : 'Completed', state.cancelRequested ? 'idle' : 'installed');
  updateLiveStats();
  renderAllResults();
}

function lockUi(locked) {
  [
    els.runButton, els.clearResultsButton, els.saveNewModelBtn, els.saveCatalogModelBtn, els.addCatalogModelBtn,
    els.selectAllBtn, els.selectNoneBtn, els.sortSelect
  ].filter(Boolean).forEach(el => el.disabled = locked);
  els.cancelButton.disabled = !locked;
  [els.temperature, els.maxTokens, els.timeoutSeconds, els.systemPrompt, els.userPrompt, els.newModelInput, els.catalogModelSelect].filter(Boolean).forEach(el => el.disabled = locked);
  renderModels();
}

async function runModel(modelId, config) {
  const startedAt = Date.now();
  const startedPerf = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(`Timed out after ${config.timeoutSeconds}s`), config.timeoutSeconds * 1000);

  const result = {
    model: modelId,
    status: 'error',
    startedAt,
    endedAt: startedAt,
    elapsedMs: 0,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    tokensPerSecond: null,
    outputText: '',
    chars: 0,
    words: 0,
    error: '',
    raw: null
  };

  const requestPayload = {
    model: modelId,
    messages: config.messages,
    temperature: Number.isFinite(config.temperature) ? config.temperature : undefined,
    max_tokens: Number.isFinite(config.maxTokens) ? config.maxTokens : undefined
  };
  const requestHeaders = buildOpenRouterHeaders(config.apiKey, config.appTitle);
  const trafficEntry = {
    id: crypto.randomUUID(),
    model: modelId,
    startedAt,
    endedAt: null,
    status: 'pending',
    request: {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      method: 'POST',
      headers: redactHeaders(requestHeaders),
      body: requestPayload
    },
    response: null,
    error: null
  };
  pushTrafficLog(trafficEntry);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: requestHeaders,
      body: JSON.stringify(requestPayload)
    });

    const payload = await response.json().catch(() => ({}));
    result.raw = payload;
    finalizeTrafficLog(trafficEntry.id, {
      endedAt: Date.now(),
      status: response.ok ? 'success' : 'error',
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: serializeHeaders(response.headers),
        body: payload
      },
      error: response.ok ? null : (payload?.error?.message || payload?.message || `HTTP ${response.status}`)
    });

    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
    }

    const outputText = extractText(payload);
    const usage = payload?.usage || {};
    const promptTokens = asNumber(usage.prompt_tokens);
    const completionTokens = asNumber(usage.completion_tokens);
    const totalTokens = asNumber(usage.total_tokens ?? ((promptTokens ?? 0) + (completionTokens ?? 0)));
    const elapsedMs = performance.now() - startedPerf;
    const elapsedSeconds = elapsedMs / 1000;

    result.status = 'success';
    result.outputText = outputText;
    result.promptTokens = promptTokens;
    result.completionTokens = completionTokens;
    result.totalTokens = totalTokens;
    result.elapsedMs = elapsedMs;
    result.tokensPerSecond = completionTokens && elapsedSeconds > 0 ? completionTokens / elapsedSeconds : null;
    result.chars = outputText.length;
    result.words = countWords(outputText);
  } catch (error) {
    result.error = normalizeFetchError(error);
    result.elapsedMs = performance.now() - startedPerf;
    finalizeTrafficLog(trafficEntry.id, {
      endedAt: Date.now(),
      status: 'error',
      error: result.error,
      response: trafficEntry.response
    });
  } finally {
    clearTimeout(timeoutId);
    result.endedAt = Date.now();
  }

  return result;
}

function extractText(payload) {
  const choice = payload?.choices?.[0];
  if (!choice) return '';
  const content = choice?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => typeof part === 'string' ? part : (part?.text || '')).join('');
  }
  return choice?.text || '';
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function countWords(text) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function startWallTimer() {
  stopWallTimer();
  state.wallTimerId = setInterval(() => {
    const elapsed = performance.now() - state.runStartTime;
    els.elapsedWallTime.textContent = `${(elapsed / 1000).toFixed(1)}s`;
  }, 100);
}

function stopWallTimer() {
  if (state.wallTimerId) {
    clearInterval(state.wallTimerId);
    state.wallTimerId = null;
  }
}

function updateLiveStats() {
  const successCount = state.runs.filter(r => r.status === 'success').length;
  const errorCount = state.runs.filter(r => r.status === 'error').length;
  els.successCount.textContent = String(successCount);
  els.errorCount.textContent = String(errorCount);
}

function logMessage(message) {
  state.runLog.unshift({ ts: new Date(), message });
  if (state.runLog.length > 120) {
    state.runLog.length = 120;
  }
  renderLog();
}

function renderLog() {
  els.runLog.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.runLog.slice(0, 60).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `[${item.ts.toLocaleTimeString()}] ${item.message}`;
    fragment.appendChild(li);
  });
  els.runLog.appendChild(fragment);
}

function clearResults() {
  state.runs = [];
  state.runLog = [];
  state.openrouterTrafficLogs = [];
  els.currentModel.textContent = '—';
  els.elapsedWallTime.textContent = '0.0s';
  els.progressSummary.textContent = '0 / 0 complete';
  updateLiveStats();
  renderAllResults();
  updateRunState('Idle', 'idle');
  renderTrafficLogs();
}

function renderAllResults() {
  renderAggregateStats();
  renderSummaryTable();
  renderResultsList();
  renderCharts();
  const hasRuns = state.runs.length > 0;
  els.exportJsonBtn.disabled = !hasRuns;
  els.exportCsvBtn.disabled = !hasRuns;
}

function renderAggregateStats() {
  els.aggregateStats.innerHTML = '';
  const runs = state.runs;
  if (!runs.length) {
    els.aggregateStats.innerHTML = '<div class="empty-state">Run a comparison to populate aggregate statistics.</div>';
    return;
  }

  const successful = runs.filter(r => r.status === 'success');
  const totalPromptTokens = sumBy(successful, 'promptTokens');
  const totalCompletionTokens = sumBy(successful, 'completionTokens');
  const totalTokens = sumBy(successful, 'totalTokens');
  const avgTps = average(successful.map(r => r.tokensPerSecond).filter(v => typeof v === 'number'));
  const totalWallClock = runs.reduce((acc, r) => acc + r.elapsedMs, 0);
  const fastest = minBy(successful, 'elapsedMs');
  const slowest = maxBy(successful, 'elapsedMs');
  const longest = maxBy(successful, 'chars');
  const shortest = minBy(successful, 'chars');
  const successRate = runs.length ? (successful.length / runs.length) * 100 : 0;

  const stats = [
    ['Total prompt tokens', formatNullableNumber(totalPromptTokens)],
    ['Total completion tokens', formatNullableNumber(totalCompletionTokens)],
    ['Total tokens', formatNullableNumber(totalTokens)],
    ['Average tokens/s', avgTps ? avgTps.toFixed(2) : '—'],
    ['Fastest model', fastest ? `${fastest.model} (${formatMs(fastest.elapsedMs)})` : '—'],
    ['Slowest model', slowest ? `${slowest.model} (${formatMs(slowest.elapsedMs)})` : '—'],
    ['Longest response', longest ? `${longest.model} (${longest.chars} chars)` : '—'],
    ['Shortest response', shortest ? `${shortest.model} (${shortest.chars} chars)` : '—'],
    ['Success rate', `${successRate.toFixed(1)}%`],
    ['Total wall-clock time', formatMs(totalWallClock)]
  ];

  const fragment = document.createDocumentFragment();
  stats.forEach(([label, value]) => {
    const div = document.createElement('div');
    div.className = 'metric-card';
    div.innerHTML = `<span class="metric-label">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong>`;
    fragment.appendChild(div);
  });
  els.aggregateStats.appendChild(fragment);
}

function renderSummaryTable() {
  els.summaryBody.innerHTML = '';
  const sorted = [...state.runs].sort(compareRuns(els.sortSelect.value));
  if (!sorted.length) {
    els.summaryBody.innerHTML = '<tr><td colspan="9">No runs yet.</td></tr>';
    return;
  }
  const fragment = document.createDocumentFragment();
  sorted.forEach(run => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(run.model)}</td>
      <td>${statusBadge(run.status)}</td>
      <td>${escapeHtml(formatMs(run.elapsedMs))}</td>
      <td>${escapeHtml(formatNullableNumber(run.promptTokens))}</td>
      <td>${escapeHtml(formatNullableNumber(run.completionTokens))}</td>
      <td>${escapeHtml(formatNullableNumber(run.totalTokens))}</td>
      <td>${escapeHtml(run.tokensPerSecond ? run.tokensPerSecond.toFixed(2) : '—')}</td>
      <td>${escapeHtml(String(run.chars))}</td>
      <td>${escapeHtml(String(run.words))}</td>
    `;
    fragment.appendChild(tr);
  });
  els.summaryBody.appendChild(fragment);
}

function renderResultsList() {
  els.resultsList.innerHTML = '';
  if (!state.runs.length) {
    els.resultsList.innerHTML = '<div class="empty-state">No model outputs yet. Configure your key, prompt, and models, then run the queue.</div>';
    return;
  }

  const successfulRuns = state.runs.filter(r => r.status === 'success');
  const fragment = document.createDocumentFragment();

  // If showing diff, render pairwise comparisons first
  if (state.showDiff && successfulRuns.length >= 2) {
    const diffSection = document.createElement('div');
    diffSection.className = 'diff-section';
    const title = document.createElement('h3');
    title.textContent = `Side-by-side comparison (${successfulRuns.length} models)`;
    diffSection.appendChild(title);

    for (let i = 0; i < successfulRuns.length - 1; i++) {
      const a = successfulRuns[i];
      const b = successfulRuns[i + 1];
      const diffCard = document.createElement('div');
      diffCard.className = 'diff-card';
      diffCard.innerHTML = `
        <div class="diff-header">${escapeHtml(a.model)} vs ${escapeHtml(b.model)}</div>
        <div class="diff-grid">
          <div class="diff-col">
            <h4>${escapeHtml(a.model)}</h4>
            <div class="diff-output">${escapeHtml(a.outputText)}</div>
          </div>
          <div class="diff-col">
            <h4>${escapeHtml(b.model)}</h4>
            <div class="diff-output">${escapeHtml(b.outputText)}</div>
          </div>
        </div>
      `;
      diffSection.appendChild(diffCard);
    }
    fragment.appendChild(diffSection);
  }

  // Individual result cards
  state.runs.forEach((run, index) => {
    const article = document.createElement('article');
    article.className = 'result-card';
    article.innerHTML = `
      <div class="result-top">
        <div>
          <h3>${escapeHtml(run.model)}</h3>
          ${statusBadge(run.status)}
        </div>
        <div class="model-actions">
          <button class="button ghost small" data-copy="${index}">Copy output</button>
          ${run.status === 'error' ? `<button class="button ghost small" data-retry="${index}">Retry</button>` : ''}
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><span>Latency</span><strong>${escapeHtml(formatMs(run.elapsedMs))}</strong></div>
        <div class="meta-item"><span>Prompt tokens</span><strong>${escapeHtml(formatNullableNumber(run.promptTokens))}</strong></div>
        <div class="meta-item"><span>Completion tokens</span><strong>${escapeHtml(formatNullableNumber(run.completionTokens))}</strong></div>
        <div class="meta-item"><span>Total tokens</span><strong>${escapeHtml(formatNullableNumber(run.totalTokens))}</strong></div>
        <div class="meta-item"><span>Tokens / second</span><strong>${escapeHtml(run.tokensPerSecond ? run.tokensPerSecond.toFixed(2) : '—')}</strong></div>
        <div class="meta-item"><span>Characters</span><strong>${escapeHtml(String(run.chars))}</strong></div>
        <div class="meta-item"><span>Words</span><strong>${escapeHtml(String(run.words))}</strong></div>
        <div class="meta-item"><span>Started</span><strong>${escapeHtml(new Date(run.startedAt).toLocaleTimeString())}</strong></div>
        <div class="meta-item"><span>Ended</span><strong>${escapeHtml(new Date(run.endedAt).toLocaleTimeString())}</strong></div>
        <div class="meta-item"><span>Error</span><strong>${escapeHtml(run.error || '—')}</strong></div>
      </div>
      <div class="output-box">${escapeHtml(run.outputText || '[no text returned]')}</div>
      <details data-raw-details="${index}">
        <summary>Raw JSON response</summary>
        <pre class="debug-box" data-raw-pre="${index}">Expand to load raw response.</pre>
      </details>
    `;
    fragment.appendChild(article);
  });
  els.resultsList.appendChild(fragment);

  els.resultsList.querySelectorAll('[data-raw-details]').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const index = Number(details.dataset.rawDetails);
      const pre = details.querySelector('[data-raw-pre]');
      if (!pre || pre.dataset.loaded === 'true') return;
      pre.textContent = JSON.stringify(state.runs[index]?.raw ?? {}, null, 2);
      pre.dataset.loaded = 'true';
    }, { once: true });
  });

  els.resultsList.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const run = state.runs[Number(btn.dataset.copy)];
      await navigator.clipboard.writeText(run.outputText || '');
      btn.textContent = 'Copied';
      setTimeout(() => btn.textContent = 'Copy output', 1200);
    });
  });

  els.resultsList.querySelectorAll('[data-retry]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (state.isRunning) return;
      const run = state.runs[Number(btn.dataset.retry)];
      if (!run) return;
      const apiKey = els.apiKey.value.trim();
      if (!apiKey) return alert('Please provide your API key before retrying.');
      state.isRunning = true;
      lockUi(true);
      updateRunState('Running', 'running');
      const retryRun = await runModel(run.model, {
        apiKey,
        appTitle: els.appTitle.value.trim() || 'OpenRouter Free Model Comparator',
        temperature: Number(els.temperature.value),
        maxTokens: Number(els.maxTokens.value),
        timeoutSeconds: Number(els.timeoutSeconds.value),
        messages: buildMessages()
      });
      state.runs[Number(btn.dataset.retry)] = retryRun;
      state.isRunning = false;
      lockUi(false);
      updateRunState('Completed', 'installed');
      renderAllResults();
    });
  });
}

function compareRuns(key) {
  return (a, b) => {
    const av = a[key];
    const bv = b[key];
    if (key === 'model' || key === 'status') return String(av).localeCompare(String(bv));
    return (bv ?? -Infinity) - (av ?? -Infinity);
  };
}

function renderCharts() {
  const labels = state.runs.map(r => truncateModel(r.model));
  const latency = state.runs.map(r => Math.round(r.elapsedMs));
  const tokens = state.runs.map(r => r.totalTokens ?? 0);
  const tps = state.runs.map(r => r.tokensPerSecond ? Number(r.tokensPerSecond.toFixed(2)) : 0);
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

  createOrUpdateChart('latency', 'latencyChart', labels, latency, 'Latency ms', '#4f8cff', textColor, borderColor);
  createOrUpdateChart('token', 'tokenChart', labels, tokens, 'Total tokens', '#52b788', textColor, borderColor);
  createOrUpdateChart('tps', 'tpsChart', labels, tps, 'Tokens/s', '#f4a261', textColor, borderColor);
}

function pushTrafficLog(entry) {
  state.openrouterTrafficLogs.unshift(entry);
  if (state.openrouterTrafficLogs.length > 120) {
    state.openrouterTrafficLogs.length = 120;
  }
  renderTrafficLogs();
}

function finalizeTrafficLog(id, updates) {
  const entry = state.openrouterTrafficLogs.find(item => item.id === id);
  if (!entry) return;
  Object.assign(entry, updates);
  renderTrafficLogs();
}

function renderTrafficLogs() {
  if (!els.trafficLogList) return;
  els.trafficLogList.innerHTML = '';
  if (!state.openrouterTrafficLogs.length) {
    els.trafficLogList.innerHTML = '<div class="empty-state">No OpenRouter traffic captured yet. Run a comparison to inspect request and response payloads.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  state.openrouterTrafficLogs.forEach(entry => {
    const article = document.createElement('article');
    article.className = 'traffic-entry';
    article.innerHTML = `
      <div class="traffic-entry-head">
        <div>
          <h3>${escapeHtml(entry.model)}</h3>
          <div class="traffic-entry-meta">
            <span class="metric-chip">${escapeHtml(entry.status || 'pending')}</span>
            <span class="metric-chip">${escapeHtml(new Date(entry.startedAt).toLocaleTimeString())}</span>
            ${entry.endedAt ? `<span class="metric-chip">${escapeHtml(formatMs(entry.endedAt - entry.startedAt))}</span>` : ''}
          </div>
        </div>
        ${entry.error ? `<span class="status-badge">${escapeHtml(entry.error)}</span>` : ''}
      </div>
      <div class="traffic-sections">
        <div class="traffic-block">
          <h4>Request</h4>
          <pre>${escapeHtml(JSON.stringify(entry.request, null, 2))}</pre>
        </div>
        <div class="traffic-block">
          <h4>Response</h4>
          <pre>${escapeHtml(JSON.stringify(entry.response ?? { error: entry.error || 'Pending response' }, null, 2))}</pre>
        </div>
      </div>
    `;
    fragment.appendChild(article);
  });
  els.trafficLogList.appendChild(fragment);
}

function openTrafficModal() {
  if (!els.trafficModal) return;
  renderTrafficLogs();
  els.trafficModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeTrafficModal() {
  if (!els.trafficModal) return;
  els.trafficModal.hidden = true;
  document.body.style.overflow = '';
}

async function copyTrafficLogs() {
  const payload = JSON.stringify(state.openrouterTrafficLogs, null, 2);
  await navigator.clipboard.writeText(payload);
  if (els.copyTrafficLogsBtn) {
    const previous = els.copyTrafficLogsBtn.textContent;
    els.copyTrafficLogsBtn.textContent = 'Copied';
    setTimeout(() => {
      els.copyTrafficLogsBtn.textContent = previous;
    }, 1200);
  }
}

function clearTrafficLogs() {
  state.openrouterTrafficLogs = [];
  renderTrafficLogs();
}

function redactHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase() === 'authorization' ? redactAuthorization(value) : value
    ])
  );
}

function buildOpenRouterHeaders(apiKey, appTitle) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-OpenRouter-Title': appTitle
  };

  const protocol = window.location.protocol;
  const origin = window.location.origin;
  if ((protocol === 'http:' || protocol === 'https:') && origin && origin !== 'null') {
    headers['HTTP-Referer'] = origin;
  }

  return headers;
}

function normalizeFetchError(error) {
  const message = error?.message || String(error);
  if (/failed to fetch/i.test(message)) {
    if (window.location.protocol === 'file:') {
      return 'Failed to fetch. The app is likely running from file://, which often causes browser/CORS failures. Serve it over http://localhost instead.';
    }
    if (!navigator.onLine) {
      return 'Failed to fetch. The browser appears to be offline.';
    }
    return 'Failed to fetch. This is usually a browser/network/CORS issue rather than a model-specific failure. Try serving the app from http://localhost and re-run.';
  }
  return message;
}

function redactAuthorization(value) {
  if (typeof value !== 'string') return value;
  const [scheme, token] = value.split(' ');
  if (!token) return 'Bearer [redacted]';
  return `${scheme} ${token.slice(0, 8)}…[redacted]`;
}

function serializeHeaders(headers) {
  return Object.fromEntries([...headers.entries()]);
}

function createOrUpdateChart(key, canvasId, labels, data, label, color, textColor, borderColor) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  if (state.charts[key]) state.charts[key].destroy();
  state.charts[key] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: borderColor } },
        y: { ticks: { color: textColor }, grid: { color: borderColor } }
      }
    }
  });
}

function exportJson() {
  downloadFile('openrouter-comparison-results.json', JSON.stringify(state.runs, null, 2), 'application/json');
}

function exportCsv() {
  const headers = ['model','status','elapsedMs','promptTokens','completionTokens','totalTokens','tokensPerSecond','chars','words','error'];
  const rows = state.runs.map(run => headers.map(h => csvEscape(run[h] ?? '')).join(','));
  const content = [headers.join(','), ...rows].join('\n');
  downloadFile('openrouter-comparison-results.csv', content, 'text/csv');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value).replaceAll('"', '""');
  return `"${str}"`;
}

function sumBy(arr, key) {
  return arr.reduce((sum, item) => sum + (Number.isFinite(item[key]) ? item[key] : 0), 0);
}

function average(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function minBy(arr, key) {
  return arr.length ? arr.reduce((min, item) => item[key] < min[key] ? item : min) : null;
}

function maxBy(arr, key) {
  return arr.length ? arr.reduce((max, item) => item[key] > max[key] ? item : max) : null;
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatNullableNumber(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : '—';
}

function truncateModel(model) {
  return model.length > 24 ? `${model.slice(0, 24)}…` : model;
}

function statusBadge(status) {
  const label = status === 'success' ? 'Success' : 'Error';
  return `<span class="status-badge">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (_) {}
}

function updateSummary() {
  // For initial state
}
