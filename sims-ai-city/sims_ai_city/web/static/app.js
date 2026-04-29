const state = {
  snapshot: null,
  loading: false,
};

const townNameEl = document.querySelector('#town-name');
const townMottoEl = document.querySelector('#town-motto');
const lastRecapEl = document.querySelector('#last-recap');
const heroStatsEl = document.querySelector('#hero-stats');
const timelineEl = document.querySelector('#timeline');
const timelineNoteEl = document.querySelector('#timeline-note');
const charactersEl = document.querySelector('#characters');
const familiesEl = document.querySelector('#families');
const memoriesEl = document.querySelector('#memories');
const yearSummariesEl = document.querySelector('#year-summaries');

document.querySelectorAll('[data-days]').forEach((button) => {
  button.addEventListener('click', () => advanceSimulation(Number(button.dataset.days)));
});

document.querySelector('#reset-button').addEventListener('click', async () => {
  const seed = window.prompt('Reset the city with which seed?', '17');
  if (seed === null) {
    return;
  }
  await resetSimulation(Number(seed) || 17);
});

loadStatus();

async function loadStatus() {
  state.loading = true;
  try {
    const response = await fetch('/api/status');
    state.snapshot = await response.json();
    render();
  } finally {
    state.loading = false;
  }
}

async function advanceSimulation(days) {
  if (state.loading) {
    return;
  }
  state.loading = true;
  timelineNoteEl.textContent = `Advancing ${days} day${days > 1 ? 's' : ''} through the civic melodrama...`;
  try {
    const response = await fetch(`/api/step?days=${days}`, { method: 'POST' });
    state.snapshot = await response.json();
    render();
  } finally {
    state.loading = false;
  }
}

async function resetSimulation(seed) {
  if (state.loading) {
    return;
  }
  state.loading = true;
  timelineNoteEl.textContent = `Resetting Mosswhistle with seed ${seed}...`;
  try {
    const response = await fetch(`/api/reset?seed=${seed}`, { method: 'POST' });
    state.snapshot = await response.json();
    render();
  } finally {
    state.loading = false;
  }
}

function render() {
  const snapshot = state.snapshot;
  if (!snapshot) {
    return;
  }

  townNameEl.textContent = snapshot.town_name;
  townMottoEl.textContent = snapshot.town_motto;
  lastRecapEl.textContent = snapshot.last_yearly_recap || 'The town is warming up its feelings.';
  timelineNoteEl.textContent = snapshot.new_headlines?.length
    ? `Newest disturbance: ${snapshot.new_headlines.at(-1)}`
    : 'Recent movements from the town ledger.';

  heroStatsEl.innerHTML = [
    statCard('Date', snapshot.date),
    statCard('Population', String(snapshot.population)),
    statCard('Families', String(snapshot.families)),
    statCard('Memories tracked', String(snapshot.memory_records.length)),
  ].join('');

  timelineEl.innerHTML = snapshot.recent_events.length
    ? snapshot.recent_events.slice().reverse().map(renderEvent).join('')
    : emptyCard('No events yet. The town is suspiciously calm.');

  charactersEl.innerHTML = snapshot.characters.length
    ? snapshot.characters.map(renderCharacter).join('')
    : emptyCard('No residents available.');

  familiesEl.innerHTML = snapshot.families_detail.length
    ? snapshot.families_detail.map((family) => renderFamily(family, snapshot.characters)).join('')
    : emptyCard('No lineages formed yet.');

  memoriesEl.innerHTML = snapshot.memory_records.length
    ? snapshot.memory_records.slice().reverse().map(renderMemory).join('')
    : emptyCard('Nobody has managed to remember anything dramatic yet.');

  yearSummariesEl.innerHTML = snapshot.year_summaries.length
    ? snapshot.year_summaries.slice().reverse().map(renderYearSummary).join('')
    : emptyCard('The first annual summary will appear after a full year.');
}

function statCard(label, value) {
  return `
    <article class="stat-card">
      <p class="stat-label">${escapeHtml(label)}</p>
      <p class="stat-value">${escapeHtml(value)}</p>
    </article>
  `;
}

function renderEvent(event) {
  return `
    <article class="timeline-entry">
      <div>
        <p class="event-type">${escapeHtml(event.type.replaceAll('_', ' '))}</p>
        <h3>${escapeHtml(event.headline)}</h3>
      </div>
      <p>${escapeHtml(event.description)}</p>
    </article>
  `;
}

function renderCharacter(character) {
  const memoryChips = (character.notable_memories || []).slice(-3).map((memory) => `<span class="chip">${escapeHtml(memory)}</span>`).join('');
  return `
    <article class="character-card ${character.alive ? '' : 'character-card--departed'}">
      <div class="character-header">
        <div>
          <h3>${escapeHtml(character.full_name)}</h3>
          <p>${escapeHtml(character.age_stage)} · age ${escapeHtml(String(character.age_years))}</p>
        </div>
        <span class="mood-pill">${escapeHtml(character.mood)}</span>
      </div>
      <p class="character-reputation">${escapeHtml(character.reputation)}</p>
      <p>${escapeHtml(character.family_background)}</p>
      <p><strong>Traits:</strong> ${escapeHtml(character.traits.temperament)}, ${escapeHtml(character.traits.social_style)}</p>
      <div class="chip-row">${memoryChips || '<span class="chip">No iconic memory yet</span>'}</div>
    </article>
  `;
}

function renderFamily(family, characters) {
  const members = family.member_ids
    .map((memberId) => characters.find((resident) => resident.id === memberId))
    .filter(Boolean)
    .map((resident) => resident.full_name)
    .join(', ');

  return `
    <article class="family-card">
      <p class="event-type">House ${escapeHtml(family.surname)}</p>
      <h3>${escapeHtml(family.legendary_hook)}</h3>
      <p>${escapeHtml((family.traditions || []).join(' · ') || 'No tradition registered yet')}</p>
      <p class="muted">Members: ${escapeHtml(members || 'none')}</p>
      <p class="muted">Scandals: ${escapeHtml((family.scandals || []).join(' · ') || 'no public scandal currently logged')}</p>
    </article>
  `;
}

function renderMemory(memory) {
  return `
    <article class="memory-entry">
      <p class="event-type">${escapeHtml(memory.category)}</p>
      <p>${escapeHtml(memory.summary)}</p>
      <p class="muted">Intensity ${escapeHtml(memory.intensity.toFixed(2))} · day ${escapeHtml(String(memory.created_day_index))}</p>
    </article>
  `;
}

function renderYearSummary(summary) {
  const highlights = (summary.highlights || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  const legends = (summary.gossip_legends || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  const spotlights = (summary.family_spotlights || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  return `
    <article class="summary-card">
      <h3>Year ${escapeHtml(String(summary.year))}</h3>
      <p>${escapeHtml(summary.title)}</p>
      <p class="muted">Births ${escapeHtml(String(summary.births))} · Marriages ${escapeHtml(String(summary.marriages))} · Feuds ${escapeHtml(String(summary.feuds))} · Reconciliations ${escapeHtml(String(summary.reconciliations))} · Departures ${escapeHtml(String(summary.departures))}</p>
      <ul>${highlights || '<li>No highlights were recorded.</li>'}</ul>
      <ul>${legends || '<li>No gossip legends were recorded.</li>'}</ul>
      <ul>${spotlights || '<li>No family spotlights were recorded.</li>'}</ul>
    </article>
  `;
}

function emptyCard(message) {
  return `<article class="empty-card">${escapeHtml(message)}</article>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
