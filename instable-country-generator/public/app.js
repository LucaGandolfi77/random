const dom = {
  seedSelect: document.querySelector('#seedSelect'),
  modelSelect: document.querySelector('#modelSelect'),
  mockToggle: document.querySelector('#mockToggle'),
  newSessionButton: document.querySelector('#newSessionButton'),
  nextTurnButton: document.querySelector('#nextTurnButton'),
  exportJsonButton: document.querySelector('#exportJsonButton'),
  exportHtmlButton: document.querySelector('#exportHtmlButton'),
  exportStatus: document.querySelector('#exportStatus'),
  resumeSearch: document.querySelector('#resumeSearch'),
  resumeStatusFilter: document.querySelector('#resumeStatusFilter'),
  refreshSessionsButton: document.querySelector('#refreshSessionsButton'),
  resumeCount: document.querySelector('#resumeCount'),
  resumeSessionsList: document.querySelector('#resumeSessionsList'),
  modeBanner: document.querySelector('#modeBanner'),
  sessionState: document.querySelector('#sessionState'),
  turnBadge: document.querySelector('#turnBadge'),
  countryOutcome: document.querySelector('#countryOutcome'),
  countryName: document.querySelector('#countryName'),
  countryTagline: document.querySelector('#countryTagline'),
  capitalValue: document.querySelector('#capitalValue'),
  systemValue: document.querySelector('#systemValue'),
  mediaFreedomValue: document.querySelector('#mediaFreedomValue'),
  foreignInfluenceValue: document.querySelector('#foreignInfluenceValue'),
  countryDescription: document.querySelector('#countryDescription'),
  resourcesList: document.querySelector('#resourcesList'),
  tensionsList: document.querySelector('#tensionsList'),
  flagPreview: document.querySelector('#flagPreview'),
  mapSvg: document.querySelector('#mapSvg'),
  mapLegend: document.querySelector('#mapLegend'),
  regionInspector: document.querySelector('#regionInspector'),
  primaryMetrics: document.querySelector('#primaryMetrics'),
  secondaryMetrics: document.querySelector('#secondaryMetrics'),
  foreignPressureBadge: document.querySelector('#foreignPressureBadge'),
  internationalPressureValue: document.querySelector('#internationalPressureValue'),
  exposedRegionValue: document.querySelector('#exposedRegionValue'),
  foreignPressureTrack: document.querySelector('#foreignPressureTrack span'),
  exposureList: document.querySelector('#exposureList'),
  summaryHeadline: document.querySelector('#summaryHeadline'),
  summaryBody: document.querySelector('#summaryBody'),
  summaryReasons: document.querySelector('#summaryReasons'),
  actionsList: document.querySelector('#actionsList'),
  currentsList: document.querySelector('#currentsList'),
  timelineList: document.querySelector('#timelineList')
};

const primaryMetricConfig = [
  ['stability', 'Stability'],
  ['protestIntensity', 'Protests'],
  ['propagandaIntensity', 'Propaganda'],
  ['coupRisk', 'Coup risk']
];

const secondaryMetricConfig = [
  ['corruption', 'Corruption'],
  ['inflation', 'Inflation'],
  ['treasuryPressure', 'Treasury'],
  ['internationalPressure', 'External pressure'],
  ['publicTrust', 'Public trust'],
  ['militaryLoyalty', 'Military'],
  ['regimeLegitimacy', 'Legitimacy']
];

const state = {
  bootstrap: null,
  session: null,
  busy: false,
  resumeBusy: false,
  resumeSessions: []
};

let resumeSearchTimer = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
}

function triggerDownload(url) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function badgeTone(value, reverse = false) {
  const dangerous = reverse ? value < 35 : value > 65;
  const warning = reverse ? value < 55 : value > 45;

  if (dangerous) {
    return 'danger';
  }

  if (warning) {
    return 'warning';
  }

  return 'success';
}

function deltaMarkup(delta) {
  if (!delta) {
    return '<span class="delta flat">0</span>';
  }

  const tone = delta > 0 ? 'up' : 'down';
  const sign = delta > 0 ? '+' : '';
  return `<span class="delta ${tone}">${sign}${delta}</span>`;
}

function renderOptions() {
  const seeds = [{ id: 'random', name: 'Random synthesis', tagline: 'Blend seed tensions into a fresh country.' }, ...(state.bootstrap?.seeds || [])];

  dom.seedSelect.innerHTML = seeds
    .map((seed) => `<option value="${escapeHtml(seed.id)}">${escapeHtml(seed.name)}</option>`)
    .join('');

  const models = state.bootstrap?.availableModels || [];
  dom.modelSelect.innerHTML = models.length
    ? models.map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`).join('')
    : '<option value="">No free models discovered</option>';

  if (state.bootstrap?.defaultModel) {
    dom.modelSelect.value = state.bootstrap.defaultModel;
  }

  dom.modelSelect.disabled = !state.bootstrap?.apiEnabled || dom.mockToggle.checked || models.length === 0;
}

function renderResumeSessions() {
  dom.resumeCount.textContent = state.resumeBusy
    ? 'Loading...'
    : `${state.resumeSessions.length} stored`;

  if (state.resumeSessions.length === 0) {
    dom.resumeSessionsList.innerHTML = '<div class="empty-state">No persisted sessions match the current filters.</div>';
    return;
  }

  dom.resumeSessionsList.innerHTML = state.resumeSessions
    .map((sessionSummary) => {
      const active = state.session?.id === sessionSummary.id;
      const statusTone = sessionSummary.ended ? 'danger' : 'success';
      const modeLabel = sessionSummary.useMock ? 'mock' : (sessionSummary.model || 'live');

      return `
        <article class="resume-card${active ? ' active' : ''}">
          <div class="resume-meta">
            <strong>${escapeHtml(sessionSummary.countryName)}</strong>
            <span>${escapeHtml(sessionSummary.capital || 'Unknown capital')}</span>
            <span>Updated ${escapeHtml(formatTimestamp(sessionSummary.updatedAt))}</span>
          </div>
          <p>${escapeHtml(sessionSummary.summaryHeadline || 'No headline recorded yet.')}</p>
          <footer>
            <div class="resume-badges">
              <span class="badge ${statusTone}">${sessionSummary.ended ? 'ended' : 'active'}</span>
              <span class="badge neutral">turn ${sessionSummary.turn}</span>
              <span class="badge neutral">${escapeHtml(modeLabel)}</span>
            </div>
            <button class="secondary-button" type="button" data-session-id="${escapeHtml(sessionSummary.id)}">Resume</button>
          </footer>
        </article>
      `;
    })
    .join('');
}

function renderFlag(flag) {
  if (!flag || !Array.isArray(flag.colors)) {
    dom.flagPreview.innerHTML = '';
    return;
  }

  const direction = flag.orientation === 'vertical' ? 'row' : 'column';
  dom.flagPreview.style.display = 'flex';
  dom.flagPreview.style.flexDirection = direction;
  dom.flagPreview.innerHTML = flag.colors
    .map((color) => `<span class="flag-stripe" style="background:${escapeHtml(color)}"></span>`)
    .join('');
}

function renderTagList(element, items) {
  element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderMap(layout, regions) {
  const svgContent = layout
    .map((shape) => {
      const region = regions.find((entry) => entry.slot === shape.slot);
      if (!region) {
        return '';
      }

      const heat = Math.min(100, Math.round(region.unrest * 0.45 + region.repression * 0.25 + region.foreignPressure * 0.3));
      const hue = 160 - Math.round(heat * 1.25);
      const fill = `hsl(${Math.max(7, hue)} 54% ${Math.max(34, 70 - heat * 0.28)}%)`;
      const centroid = {
        north: [140, 58],
        west: [86, 136],
        central: [198, 134],
        east: [305, 124],
        south: [176, 214]
      }[shape.slot];

      return `
        <g>
          <path class="map-region" d="${shape.path}" fill="${fill}"></path>
          <text class="map-region-label" x="${centroid[0]}" y="${centroid[1]}" text-anchor="middle">${escapeHtml(region.name)}</text>
        </g>
      `;
    })
    .join('');

  dom.mapSvg.innerHTML = `<rect x="0" y="0" width="400" height="260" fill="transparent"></rect>${svgContent}`;

  dom.mapLegend.innerHTML = [
    { label: 'Unrest', note: 'Drives fill intensity and protest spillover.' },
    { label: 'Repression', note: 'Raises foreign attention and short-term control.' },
    { label: 'Foreign pressure', note: 'Shows regions most exposed to outside narratives.' }
  ]
    .map((item) => `<div class="legend-row"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.note)}</span></div>`)
    .join('');

  dom.regionInspector.innerHTML = regions
    .map(
      (region) => `
        <article class="inspector-card">
          <strong>${escapeHtml(region.name)}</strong>
          <p>${escapeHtml(region.resource)}</p>
          <p>Unrest ${region.unrest} | Repression ${region.repression} | Foreign ${region.foreignPressure} | Separatism ${region.separatistPressure}</p>
        </article>
      `
    )
    .join('');
}

function renderMetricSection(container, config, session) {
  const deltas = session.latestTurn.metricDeltas || {};

  container.innerHTML = config
    .map(([key, label]) => {
      const value = session.state[key];
      return `
        <article class="metric-card">
          <header>
            <span>${escapeHtml(label)}</span>
            ${deltaMarkup(deltas[key] || 0)}
          </header>
          <strong>${value}</strong>
          <div class="meter-track"><span style="width:${value}%"></span></div>
        </article>
      `;
    })
    .join('');
}

function renderForeignPressure(session) {
  const internationalPressure = session.state.internationalPressure;
  const exposedRegions = [...session.state.regions].sort((left, right) => right.foreignPressure - left.foreignPressure);
  const exposedRegion = exposedRegions[0];
  const tone = badgeTone(internationalPressure);

  dom.foreignPressureBadge.className = `badge ${tone}`;
  dom.foreignPressureBadge.textContent = tone === 'danger' ? 'Escalating' : tone === 'warning' ? 'Sensitive' : 'Contained';
  dom.internationalPressureValue.textContent = internationalPressure;
  dom.exposedRegionValue.textContent = exposedRegion ? exposedRegion.name : '-';
  dom.foreignPressureTrack.style.width = `${internationalPressure}%`;
  dom.exposureList.innerHTML = exposedRegions
    .slice(0, 3)
    .map(
      (region) => `
        <div class="rank-row">
          <strong>${escapeHtml(region.name)}</strong>
          <span>${region.foreignPressure} foreign pressure</span>
        </div>
      `
    )
    .join('');
}

function renderSummary(session) {
  const summary = session.latestTurn.summary;
  dom.summaryHeadline.textContent = summary.headline;
  dom.summaryBody.textContent = summary.summary;
  dom.summaryReasons.innerHTML = summary.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
}

function humanizeAction(actionType) {
  return actionType.replaceAll('_', ' ');
}

function renderActions(session) {
  const actions = session.latestTurn.actions || [];

  if (actions.length === 0) {
    dom.actionsList.innerHTML = '<div class="empty-state">Generate a country and advance a turn to see the five agents act.</div>';
    return;
  }

  dom.actionsList.innerHTML = actions
    .map((action) => {
      const sourceLabel = action.source === 'openrouter' ? 'live' : action.source === 'fallback' ? 'fallback' : 'mock';
      return `
        <article class="action-card">
          <header>
            <strong>${escapeHtml(action.agentName)}</strong>
            <span class="badge neutral">${escapeHtml(sourceLabel)}</span>
          </header>
          <p><strong>${escapeHtml(humanizeAction(action.actionType))}</strong> targeting ${escapeHtml(action.target)} at intensity ${action.intensity}.</p>
          <p>${escapeHtml(action.rationale)}</p>
        </article>
      `;
    })
    .join('');
}

function renderFactionDynamics(session) {
  const dynamicsEntries = Object.entries(session.factionDynamics || {});

  if (dynamicsEntries.length === 0) {
    dom.currentsList.innerHTML = '<div class="empty-state">Faction current data will appear once the simulation initializes internal coalition dynamics.</div>';
    return;
  }

  dom.currentsList.innerHTML = dynamicsEntries
    .map(([agentKey, dynamics]) => {
      const splitTone = dynamics.activeSplit ? 'danger' : dynamics.splitRisk > 60 ? 'warning' : 'success';
      const currentRows = (dynamics.currents || [])
        .map(
          (current) => `
            <div class="current-row">
              <header>
                <strong>${escapeHtml(current.name)}</strong>
                <span>${current.influence}% influence</span>
              </header>
              <div class="current-bar"><span style="width:${current.influence}%"></span></div>
            </div>
          `
        )
        .join('');

      return `
        <article class="current-card">
          <header>
            <strong>${escapeHtml(agentKey.replaceAll('_', ' '))}</strong>
            <span class="badge ${splitTone}">${dynamics.activeSplit ? 'split active' : `risk ${dynamics.splitRisk}`}</span>
          </header>
          <p><strong>Dominant:</strong> ${escapeHtml(dynamics.dominantCurrentName || 'No dominant current')}</p>
          <p><strong>Cohesion:</strong> ${escapeHtml(dynamics.cohesion)} | <strong>Mood:</strong> ${escapeHtml(dynamics.campaignMood || 'tense')}</p>
          <p>${escapeHtml(dynamics.faultLine || 'No visible fault line.')}</p>
          <p><strong>Split:</strong> ${escapeHtml(dynamics.activeSplit?.currentName || 'No active split')}</p>
          <div class="current-bars">${currentRows}</div>
        </article>
      `;
    })
    .join('');
}

function flattenTimeline(session) {
  return [...session.history]
    .reverse()
    .flatMap((turn) =>
      (turn.events || []).map((event) => ({
        ...event,
        turn: turn.index
      }))
    )
    .slice(0, 9);
}

function renderTimeline(session) {
  const items = flattenTimeline(session);
  dom.timelineList.innerHTML = items
    .map(
      (item) => `
        <article class="timeline-item severity-${escapeHtml(item.severity)}">
          <header>
            <strong>Turn ${item.turn}</strong>
            <span class="badge ${item.severity === 'low' ? 'neutral' : item.severity === 'medium' ? 'warning' : 'danger'}">${escapeHtml(item.type.replaceAll('_', ' '))}</span>
          </header>
          <p><strong>${escapeHtml(item.headline)}</strong></p>
          <p>${escapeHtml(item.detail)}</p>
        </article>
      `
    )
    .join('');
}

function renderSession(session) {
  const outcome = session.status.outcome;
  const critical = session.state.coupRisk > 70 || session.state.stability < 35;
  const tone = outcome ? (outcome.key === 'stabilized_state' ? 'success' : outcome.key === 'democratic_transition' ? 'success' : 'danger') : critical ? 'danger' : 'warning';
  const modeLabel = session.settings.useMock ? 'Mock simulation active' : `OpenRouter live mode: ${session.settings.model}`;

  dom.modeBanner.textContent = `${modeLabel}${state.bootstrap.apiEnabled ? '' : ' | No API key detected, live mode unavailable.'}`;
  dom.sessionState.textContent = outcome ? outcome.label : critical ? 'High volatility' : 'Monitoring';
  dom.turnBadge.textContent = `${session.state.turn} / ${session.settings.maxTurns}`;

  dom.countryOutcome.className = `badge ${tone}`;
  dom.countryOutcome.textContent = outcome ? outcome.label : critical ? 'Acute stress' : 'Monitoring';

  dom.countryName.textContent = session.country.name;
  dom.countryTagline.textContent = session.country.tagline;
  dom.capitalValue.textContent = session.country.capital;
  dom.systemValue.textContent = session.country.politicalSystem;
  dom.mediaFreedomValue.textContent = `${session.country.mediaFreedom}/100`;
  dom.foreignInfluenceValue.textContent = `${session.country.foreignInfluence}/100`;
  dom.countryDescription.textContent = session.country.description;
  renderFlag(session.country.flag);
  renderTagList(dom.resourcesList, session.country.resources);
  renderTagList(dom.tensionsList, session.country.socialTensions);
  renderMap(state.bootstrap.mapLayout, session.state.regions);
  renderMetricSection(dom.primaryMetrics, primaryMetricConfig, session);
  renderMetricSection(dom.secondaryMetrics, secondaryMetricConfig, session);
  renderForeignPressure(session);
  renderSummary(session);
  renderActions(session);
  renderFactionDynamics(session);
  renderTimeline(session);

  dom.nextTurnButton.disabled = state.busy || session.status.ended;
  dom.nextTurnButton.textContent = session.status.ended ? 'Simulation ended' : 'Advance turn';
  dom.exportJsonButton.disabled = state.busy;
  dom.exportHtmlButton.disabled = state.busy;
  renderResumeSessions();
}

function syncControlState() {
  const apiReady = Boolean(state.bootstrap?.apiEnabled);
  const hasModels = (state.bootstrap?.availableModels || []).length > 0;
  dom.modelSelect.disabled = !apiReady || dom.mockToggle.checked || !hasModels;
}

async function createSession() {
  state.busy = true;
  syncControlState();
  dom.newSessionButton.disabled = true;
  dom.nextTurnButton.disabled = true;
  dom.exportJsonButton.disabled = true;
  dom.exportHtmlButton.disabled = true;

  try {
    const payload = {
      seedId: dom.seedSelect.value || 'random',
      model: dom.modelSelect.value,
      useMock: dom.mockToggle.checked || !state.bootstrap.apiEnabled
    };
    const data = await requestJson('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.session = data.session;
    state.bootstrap.availableModels = data.availableModels;
    dom.exportStatus.textContent = 'No export generated yet.';
    renderOptions();
    renderSession(state.session);
    await loadSessionIndex();
  } finally {
    state.busy = false;
    dom.newSessionButton.disabled = false;
    syncControlState();
    if (state.session) {
      dom.nextTurnButton.disabled = state.session.status.ended;
    }
  }
}

async function advanceTurn() {
  if (!state.session || state.busy || state.session.status.ended) {
    return;
  }

  state.busy = true;
  dom.nextTurnButton.disabled = true;
  dom.exportJsonButton.disabled = true;
  dom.exportHtmlButton.disabled = true;

  try {
    const payload = {
      model: dom.modelSelect.value,
      useMock: dom.mockToggle.checked || !state.bootstrap.apiEnabled
    };
    const data = await requestJson(`/api/sessions/${state.session.id}/turn`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.session = data.session;
    state.bootstrap.availableModels = data.availableModels;
    renderOptions();
    renderSession(state.session);
    await loadSessionIndex();
  } finally {
    state.busy = false;
    dom.nextTurnButton.disabled = state.session?.status.ended || false;
  }
}

async function openSession(sessionId) {
  if (!sessionId || state.busy) {
    return;
  }

  state.busy = true;
  dom.nextTurnButton.disabled = true;
  dom.exportJsonButton.disabled = true;
  dom.exportHtmlButton.disabled = true;

  try {
    const data = await requestJson(`/api/sessions/${sessionId}`);
    state.session = data.session;
    dom.exportStatus.textContent = `Loaded persisted session ${state.session.id.slice(0, 8)}.`;
    renderSession(state.session);
  } finally {
    state.busy = false;
    renderResumeSessions();
  }
}

async function loadSessionIndex() {
  state.resumeBusy = true;
  renderResumeSessions();

  try {
    const params = new URLSearchParams();
    const query = dom.resumeSearch?.value?.trim() || '';
    const status = dom.resumeStatusFilter?.value || 'all';

    if (query) {
      params.set('q', query);
    }

    if (status !== 'all') {
      params.set('status', status);
    }

    params.set('limit', '12');
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const data = await requestJson(`/api/sessions${suffix}`);
    state.resumeSessions = data.sessions || [];
    renderResumeSessions();
  } finally {
    state.resumeBusy = false;
    renderResumeSessions();
  }
}

async function exportSession(format) {
  if (!state.session || state.busy) {
    return;
  }

  state.busy = true;
  dom.exportJsonButton.disabled = true;
  dom.exportHtmlButton.disabled = true;
  dom.exportStatus.textContent = 'Generating export files...';

  try {
    const data = await requestJson(`/api/sessions/${state.session.id}/export`, {
      method: 'POST'
    });
    const url = format === 'json' ? data.files.jsonUrl : data.files.htmlUrl;
    dom.exportStatus.textContent = format === 'json'
      ? `JSON export ready at ${data.files.jsonFileName}`
      : `HTML report ready at ${data.files.htmlFileName}`;
    triggerDownload(url);
  } finally {
    state.busy = false;
    dom.exportJsonButton.disabled = false;
    dom.exportHtmlButton.disabled = false;
  }
}

async function bootstrap() {
  state.bootstrap = await requestJson('/api/bootstrap');
  state.resumeSessions = state.bootstrap.recentSessions || [];
  dom.mockToggle.checked = !state.bootstrap.apiEnabled;
  renderOptions();
  syncControlState();
  renderResumeSessions();

  if (state.resumeSessions.length > 0) {
    await openSession(state.resumeSessions[0].id);
  } else {
    await createSession();
  }

  await loadSessionIndex();
}

dom.newSessionButton.addEventListener('click', () => {
  void createSession();
});

dom.nextTurnButton.addEventListener('click', () => {
  void advanceTurn();
});

dom.resumeSessionsList.addEventListener('click', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const sessionId = target.dataset.sessionId;

  if (sessionId) {
    void openSession(sessionId);
  }
});

dom.refreshSessionsButton.addEventListener('click', () => {
  void loadSessionIndex();
});

dom.resumeStatusFilter.addEventListener('change', () => {
  void loadSessionIndex();
});

dom.resumeSearch.addEventListener('input', () => {
  window.clearTimeout(resumeSearchTimer);
  resumeSearchTimer = window.setTimeout(() => {
    void loadSessionIndex();
  }, 180);
});

dom.exportJsonButton.addEventListener('click', () => {
  void exportSession('json');
});

dom.exportHtmlButton.addEventListener('click', () => {
  void exportSession('html');
});

dom.mockToggle.addEventListener('change', () => {
  syncControlState();
});

window.addEventListener('load', () => {
  void bootstrap();
});