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
