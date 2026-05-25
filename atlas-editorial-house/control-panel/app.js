const state = {
  token: '',
  jobs: [],
  selectedJobId: null,
  agents: [],
};

const $ = (id) => document.getElementById(id);

const elements = {
  apiToken: $('api-token'),
  profile: $('profile'),
  scenario: $('scenario'),
  personalityHint: $('personality-hint'),
  translateIt: $('translate-it'),
  previewButton: $('preview-button'),
  runButton: $('run-button'),
  customRunButton: $('custom-run-button'),
  refreshJobsButton: $('refresh-jobs-button'),
  customPrompt: $('custom-prompt'),
  scenarioPreview: $('scenario-preview'),
  jobsList: $('jobs-list'),
  jobTitle: $('job-title'),
  jobMeta: $('job-meta'),
  jobPrompt: $('job-prompt'),
  jobStdout: $('job-stdout'),
  jobStderr: $('job-stderr'),
  agentsGrid: $('agents-grid'),
  healthStatus: $('health-status'),
  healthDetails: $('health-details'),
};

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = state.token.trim();
  if (token) {
    headers.set('X-Atlas-Token', token);
  }

  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function setPreview(text) {
  elements.scenarioPreview.textContent = text;
}

function setHealth(status, detail, cssClass) {
  elements.healthStatus.textContent = status;
  elements.healthStatus.className = cssClass || '';
  elements.healthDetails.textContent = detail;
}

function populateScenarioOptions(scenarios) {
  elements.scenario.innerHTML = '';
  for (const scenario of scenarios) {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = `${scenario.label} (${scenario.id})`;
    elements.scenario.appendChild(option);
  }
}

function populateAgentOptions(agents) {
  elements.personalityHint.innerHTML = '';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'No personality hint';
  elements.personalityHint.appendChild(emptyOption);

  for (const agent of agents) {
    const option = document.createElement('option');
    option.value = agent.slug;
    option.textContent = `${agent.slug} — ${agent.description}`;
    elements.personalityHint.appendChild(option);
  }
}

function renderAgents() {
  elements.agentsGrid.innerHTML = '';
  for (const agent of state.agents) {
    const card = document.createElement('article');
    card.className = 'agent-card';
    card.innerHTML = `
      <h3>${agent.slug}</h3>
      <p>${agent.description || 'No description available.'}</p>
      <div class="agent-meta">Tone: ${agent.tone || 'n/a'}<br>Style: ${agent.style || 'n/a'}</div>
    `;
    elements.agentsGrid.appendChild(card);
  }
}

function renderJobs() {
  elements.jobsList.innerHTML = '';

  if (!state.jobs.length) {
    const item = document.createElement('li');
    item.textContent = 'No jobs yet.';
    elements.jobsList.appendChild(item);
    return;
  }

  for (const job of state.jobs) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    if (job.job_id === state.selectedJobId) {
      button.classList.add('active');
    }
    button.innerHTML = `
      <strong>${job.scenario || 'custom'}</strong><br>
      <span>${job.job_id}</span><br>
      <span class="job-meta-chip">${job.status}</span>
    `;
    button.addEventListener('click', () => loadJob(job.job_id));
    item.appendChild(button);
    elements.jobsList.appendChild(item);
  }
}

function renderSelectedJob(job) {
  elements.jobTitle.textContent = job ? job.job_id : 'No job selected';
  elements.jobMeta.textContent = job
    ? `Status: ${job.status} | Scenario: ${job.scenario || 'custom'} | Profile: ${job.profile}`
    : 'Choose a job from the list.';
  elements.jobPrompt.textContent = job?.prompt || '';
  elements.jobStdout.textContent = job?.stdout_tail || '';
  elements.jobStderr.textContent = job?.stderr_tail || '';
}

async function loadHealth() {
  try {
    const data = await apiFetch('/api/health', { method: 'GET' });
    setHealth('Online', `Loopback server on ${data.host}:${data.port} | profile ${data.profile}`, 'status-ok');
  } catch (error) {
    setHealth('Offline', error.message, 'status-failed');
  }
}

async function loadScenariosAndAgents() {
  const [scenarioData, agentData] = await Promise.all([
    apiFetch('/api/scenarios', { method: 'GET' }),
    apiFetch('/api/agents', { method: 'GET' }),
  ]);

  state.agents = agentData.agents;
  populateScenarioOptions(scenarioData.scenarios);
  populateAgentOptions(state.agents);
  renderAgents();
}

async function previewScenario() {
  const payload = {
    scenario: elements.scenario.value,
    profile: elements.profile.value.trim() || 'atlas-editorial-house',
    translate_it: elements.translateIt.checked,
  };

  const data = await apiFetch('/api/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setPreview(`${data.prompt}\n\n---\n${data.command}`);
}

async function runScenario() {
  const payload = {
    scenario: elements.scenario.value,
    profile: elements.profile.value.trim() || 'atlas-editorial-house',
    translate_it: elements.translateIt.checked,
    personality: elements.personalityHint.value || null,
  };

  const job = await apiFetch('/api/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setPreview(`Started ${job.job_id} for scenario ${job.scenario || 'custom'}.`);
  await refreshJobs(job.job_id);
}

async function runCustomPrompt() {
  const prompt = elements.customPrompt.value.trim();
  if (!prompt) {
    throw new Error('Custom prompt is required');
  }

  const job = await apiFetch('/api/custom-run', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      profile: elements.profile.value.trim() || 'atlas-editorial-house',
      personality: elements.personalityHint.value || null,
    }),
  });

  setPreview(`Started ${job.job_id} for custom prompt.`);
  await refreshJobs(job.job_id);
}

async function refreshJobs(selectedJobId = state.selectedJobId) {
  const data = await apiFetch('/api/jobs', { method: 'GET' });
  state.jobs = data.jobs;
  state.selectedJobId = selectedJobId || data.jobs[0]?.job_id || null;
  renderJobs();
  if (state.selectedJobId) {
    await loadJob(state.selectedJobId);
  } else {
    renderSelectedJob(null);
  }
}

async function loadJob(jobId) {
  const job = await apiFetch(`/api/jobs/${jobId}?tail=120`, { method: 'GET' });
  state.selectedJobId = jobId;
  renderJobs();
  renderSelectedJob(job);
}

function wireEvents() {
  elements.apiToken.addEventListener('input', (event) => {
    state.token = event.target.value;
  });

  elements.previewButton.addEventListener('click', () => previewScenario().catch(reportError));
  elements.runButton.addEventListener('click', () => runScenario().catch(reportError));
  elements.customRunButton.addEventListener('click', () => runCustomPrompt().catch(reportError));
  elements.refreshJobsButton.addEventListener('click', () => refreshJobs().catch(reportError));
}

function reportError(error) {
  const message = error?.message || String(error);
  setPreview(`Error: ${message}`);
}

async function bootstrap() {
  wireEvents();
  await loadHealth();
  await loadScenariosAndAgents();
  await previewScenario();
  await refreshJobs();
  window.setInterval(() => refreshJobs().catch(() => {}), 7000);
}

bootstrap().catch(reportError);