function renderGame() {
  appState.game = normalizeGameState(appState.game);
  const game = appState.game;
  if (!game) {
    return;
  }

  dom.gameTitle.textContent = game.missionTitle;
  dom.gameObjective.textContent = `${game.missionText} Obiettivo attuale: ${game.resources.progress}/${game.missionGoal} Progresso.${game.modes.charityPenance ? ` Modalita' penitenza solidale attiva: ${game.donations.pending.length}/${DONATION_PENDING_CAP} penitenze pendenti.` : ""}`;
  dom.roundCounter.textContent = String(game.round);
  dom.turnCounter.textContent = String(game.turnsTaken + 1);
  dom.teamSizeCounter.textContent = String(game.selectedIds.length);

  renderResourceBars();
  renderSharedResources();
  renderBoard();
  renderLocalPlayPanel();
  renderTeam();
  renderCurrentEvent();
  renderMissions();
  renderSolidarityPanel();
  renderLog();

  const tipLines = [
    "Usa le abilita' speciali quando il Caos sale o quando una missione sta per scadere.",
    "Le missioni secondarie completate ribaltano la partita piu' in fretta di un messaggio \"possiamo parlare?\".",
    "Se il gruppo ha snack, tienili per recuperare AP nei momenti piu' patetici."
  ];
  dom.teamTip.textContent = tipLines[(game.round - 1) % tipLines.length];
  dom.endRound.disabled = game.outcome !== null;
  dom.drawChaosNow.disabled = game.outcome !== null;
}

function renderResourceBars() {
  const { resources, missionGoal } = appState.game;
  const bars = [
    { key: "chaos", label: "Caos", value: resources.chaos, max: MAX_VALUES.chaos, fillClass: "fill-chaos" },
    { key: "dignity", label: "Dignita'", value: resources.dignity, max: MAX_VALUES.dignity, fillClass: "fill-dignity" },
    { key: "career", label: "Carriera", value: resources.career, max: MAX_VALUES.career, fillClass: "fill-career" },
    { key: "stability", label: "Stabilita' mentale", value: resources.stability, max: MAX_VALUES.stability, fillClass: "fill-stability" },
    { key: "progress", label: "Progresso missione", value: resources.progress, max: missionGoal, fillClass: "fill-progress" }
  ];

  dom.resourceBars.innerHTML = bars.map((bar) => `
    <div class="resource-bar">
      <div class="resource-head">
        <strong>${bar.label}</strong>
        <span>${bar.value}/${bar.max}</span>
      </div>
      <div class="resource-track">
        <div class="resource-fill ${bar.fillClass}" style="width: ${Math.max(0, Math.min(100, (bar.value / bar.max) * 100))}%"></div>
      </div>
    </div>
  `).join("");
}

function renderSharedResources() {
  const { resources, modes, donations } = appState.game;
  const pills = [
    { label: "Fondi", value: resources.funds },
    { label: "Snack tattici", value: resources.snacks },
    { label: "Documenti", value: resources.documents }
  ];

  if (modes.charityPenance) {
    pills.push({ label: "Penitenze", value: `${donations.pending.length}/${DONATION_PENDING_CAP}` });
  }

  dom.sharedResources.innerHTML = pills.map((pill) => `<span class="shared-pill">${pill.label}: ${pill.value}</span>`).join("");
}

function renderSolidarityPanel() {
  const game = appState.game;
  dom.solidarityPanel.hidden = !game.modes.charityPenance;
  if (!game.modes.charityPenance) {
    return;
  }

  dom.solidaritySummary.innerHTML = [
    `<span class="shared-pill">Pendenti: ${game.donations.pending.length}/${DONATION_PENDING_CAP}</span>`,
    `<span class="shared-pill">Suggerite: ${game.donations.totalSuggested} x ${DONATION_AMOUNT} euro</span>`,
    `<span class="shared-pill">Segnate come donate: ${game.donations.completed}</span>`
  ].join("");

  dom.solidarityList.innerHTML = game.donations.pending.length
    ? game.donations.pending.map((entry) => `
      <article class="mission-card donation-card">
        <header>
          <div>
            <p class="mission-meta">Round ${entry.round} • ${entry.source}</p>
            <h4>${entry.reason}</h4>
          </div>
          <span class="status-pill urgent">${DONATION_AMOUNT} euro</span>
        </header>
        <p><strong>Destinazione suggerita:</strong> ${entry.cause}</p>
        <p>Penitenza micro e volontaria: segnala qui solo se l'avete davvero fatta, senza bonus furbissimi.</p>
        <button class="mini-button" type="button" data-donation-complete="${entry.id}">Segna come donata<small>Nessun bonus numerico, solo ordine morale.</small></button>
      </article>
    `).join("")
    : `<article class="mission-card donation-card"><p>Nessuna penitenza pendente. Miracolo raro: state sbagliando con una certa compostezza.</p></article>`;

  dom.solidarityList.querySelectorAll("[data-donation-complete]").forEach((button) => {
    button.addEventListener("click", () => completeDonation(button.dataset.donationComplete));
  });
}

function renderBoard() {
  const { resources, missionGoal } = appState.game;
  const progressRatio = resources.progress / missionGoal;
  const activeIndex = Math.min(BOARD_STAGES.length - 1, Math.floor(progressRatio * BOARD_STAGES.length));
  const safeIndex = Math.max(0, activeIndex);

  dom.stageLabel.textContent = `Scenario attuale: ${BOARD_STAGES[safeIndex].label}`;
  dom.boardTrack.innerHTML = BOARD_STAGES.map((stage, index) => {
    let stateClass = "";
    if (index < safeIndex) {
      stateClass = "done";
    } else if (index === safeIndex) {
      stateClass = "active";
    }
    return `
      <article class="board-node ${stateClass}">
        <strong>${stage.icon} ${stage.label}</strong>
        <small>${stage.text}</small>
      </article>
    `;
  }).join("");
}

function renderTeam() {
  const game = appState.game;
  const currentPlayableId = getCurrentPlayableCharacterId(game);
  const awaitingHandoff = game.localPlay.handoffPending;
  dom.teamGrid.innerHTML = game.team.map((member, index) => {
    const character = getCharacter(member.id);
    const quote = character.quotes[member.quoteIndex % character.quotes.length];
    const playerLabel = getLocalPlayerLabel(game, member.id, index);
    const isCurrentSeat = member.id === currentPlayableId;
    const isLocked = awaitingHandoff || !isCurrentSeat;

    return `
      <article class="team-card ${isCurrentSeat ? "active-seat" : "waiting-seat"}">
        <header>
          <div>
            <p class="team-meta">${character.title}</p>
            <h3>${character.name}</h3>
            <p class="team-meta">${playerLabel}</p>
          </div>
          <div class="team-block">
            <span class="status-pill ${isCurrentSeat ? "good" : ""}">${playerLabel}</span>
            <span class="resource-pill">${character.statLabel}</span>
            <div class="resource-meter">${renderDots(member.resource, character.statMax, "resource-dot")}</div>
          </div>
        </header>
        <p class="team-copy">${character.role}</p>
        <div class="team-block">
          <span class="status-pill">PA</span>
          <div class="ap-meter">${renderDots(member.ap, 2, "ap-dot")}</div>
        </div>
        <ul>
          <li><strong>Abilita':</strong> ${character.specialName}</li>
          <li><strong>Difetto:</strong> ${character.flaw}</li>
          <li><strong>Battuta tipica:</strong> "${quote}"</li>
        </ul>
        <div class="card-actions">
          <button class="action-button" type="button" data-action="work" data-character-id="${member.id}" ${(isLocked || member.ap < 1) ? "disabled" : ""}>Lavora sul dossier<small>+3 Progresso, +1 Carriera</small></button>
          <button class="action-button" type="button" data-action="calm" data-character-id="${member.id}" ${(isLocked || member.ap < 1) ? "disabled" : ""}>Tappa il dramma<small>-1 Caos, +1 Dignita'</small></button>
          <button class="action-button" type="button" data-action="recover" data-character-id="${member.id}" ${(isLocked || member.ap < 1) ? "disabled" : ""}>Recupera equilibrio<small>+1 Stabilita', +1 risorsa</small></button>
          <button class="action-button" type="button" data-action="special" data-character-id="${member.id}" ${(isLocked || member.ap < 2 || member.resource < 1) ? "disabled" : ""}>${character.specialName}<small>2 PA, 1 ${character.statLabel}</small></button>
        </div>
        <button class="mini-button" type="button" data-action="snack" data-character-id="${member.id}" ${(isLocked || game.resources.snacks < 1 || member.ap >= 2) ? "disabled" : ""}>Snack tattico<small>Spendi 1 Snack per +1 PA e +1 Stabilita'</small></button>
      </article>
    `;
  }).join("");

  dom.teamGrid.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.characterId, button.dataset.action));
  });
}

function renderLocalPlayPanel() {
  const game = appState.game;
  const activeId = getCurrentPlayableCharacterId(game);
  const activeMember = game.team.find((member) => member.id === activeId);
  const activeCharacter = activeMember ? getCharacter(activeMember.id) : null;
  const nextCharacter = game.localPlay.nextCharacterId ? getCharacter(game.localPlay.nextCharacterId) : null;
  const activeIndex = game.team.findIndex((member) => member.id === activeId);
  const nextIndex = game.team.findIndex((member) => member.id === game.localPlay.nextCharacterId);
  const activePlayerLabel = activeMember ? getLocalPlayerLabel(game, activeMember.id, activeIndex) : "";
  const nextPlayerLabel = nextCharacter ? getLocalPlayerLabel(game, nextCharacter.id, nextIndex) : "";
  const canPassEarly = !game.localPlay.handoffPending && Boolean(findNextPlayableCharacter(game, activeId));

  dom.localPlayPanel.innerHTML = `
    <div class="local-play-header">
      <div>
        <p class="eyebrow">Pass-and-play locale</p>
        <h4>${game.localPlay.handoffPending && nextCharacter ? `Passa il device a ${nextPlayerLabel} · ${nextCharacter.name}` : activeCharacter ? `Device in mano a ${activePlayerLabel} · ${activeCharacter.name}` : "Tavolo in riordino"}</h4>
        <p>${game.localPlay.handoffPending && nextCharacter ? `${nextPlayerLabel} e' il prossimo a muovere con ${nextCharacter.name}. Finche' non passate il device, le azioni restano bloccate.` : activeCharacter ? `${activePlayerLabel} gioca adesso con ${activeCharacter.name}. Quando finisce o decide di fermarsi, passa il device al prossimo personaggio con punti azione.` : "Nessun personaggio pronto a muovere in questo momento."}</p>
      </div>
      ${game.localPlay.handoffPending
        ? `<button id="confirm-handoff" class="primary-button" type="button">Passa il device</button>`
        : `<button id="pass-device" class="secondary-button" type="button" ${canPassEarly ? "" : "disabled"}>Passa volontariamente</button>`}
    </div>
    <div class="seat-pills">${game.team.map((member, index) => {
      const character = getCharacter(member.id);
      const playerLabel = getLocalPlayerLabel(game, member.id, index);
      const seatClass = member.id === game.localPlay.nextCharacterId && game.localPlay.handoffPending
        ? "pending"
        : member.id === activeId
          ? "active"
          : "";
      return `<span class="status-pill seat-pill ${seatClass}">${playerLabel}: ${character.name}</span>`;
    }).join("")}</div>
  `;

  const passButton = document.getElementById("pass-device");
  if (passButton) {
    passButton.addEventListener("click", queueLocalHandoff);
  }

  const confirmButton = document.getElementById("confirm-handoff");
  if (confirmButton) {
    confirmButton.addEventListener("click", confirmLocalHandoff);
  }
}

function renderCurrentEvent() {
  const event = appState.game.currentEvent;
  if (!event) {
    dom.currentEventCard.innerHTML = `<article class="event-card"><p>Nessun evento attivo. Il silenzio e' sospetto ma elegante.</p></article>`;
    return;
  }

  dom.currentEventCard.innerHTML = `
    <article class="event-card">
      <header>
        <div>
          <p class="mission-meta">${event.source}</p>
          <h4>${event.title}</h4>
        </div>
        <span class="status-pill ${event.isSpecial ? "urgent" : "good"}">${event.isSpecial ? "Evento speciale" : "Evento"}</span>
      </header>
      <p>${event.text}</p>
      <div class="event-effects">${formatEffectsAsPills(event.effects)}</div>
    </article>
  `;
}

function renderMissions() {
  const missions = appState.game.activeMissions;
  dom.missionsList.innerHTML = missions.length
    ? missions.map((mission) => `
      <article class="mission-card">
        <header>
          <div>
            <p class="mission-meta">Scade tra ${mission.expiresIn} round</p>
            <h4>${mission.title}</h4>
          </div>
          <span class="status-pill ${mission.expiresIn === 1 ? "urgent" : "good"}">${mission.progress}/${mission.target}</span>
        </header>
        <p>${mission.description}</p>
        <p><strong>Tag utili:</strong> ${mission.tags.join(", ")}</p>
        <div class="mission-reward">
          <span class="effect-pill positive">Ricompensa: ${effectSummary(mission.reward)}</span>
          <span class="effect-pill negative">Penalita': ${effectSummary(mission.penalty)}</span>
        </div>
      </article>
    `).join("")
    : `<article class="mission-card"><p>Tutte le missioni collaterali sono state temporaneamente sedate. Approfittatene prima che la vita se ne accorga.</p></article>`;
}

function renderLog() {
  dom.logList.innerHTML = appState.game.log.slice().reverse().map((entry) => `
    <article class="log-entry ${entry.type}">
      <small>Round ${entry.round} - Turno ${entry.turn}</small>
      <div>${entry.text}</div>
    </article>
  `).join("");
}