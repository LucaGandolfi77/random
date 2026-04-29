function handleAction(characterId, actionType) {
  const game = appState.game;
  if (!game || game.outcome) {
    return;
  }

  if (game.localPlay.handoffPending || characterId !== getCurrentPlayableCharacterId(game)) {
    return;
  }

  const member = game.team.find((unit) => unit.id === characterId);
  const character = getCharacter(characterId);
  if (!member || member.ap < (actionType === "special" ? 2 : 1)) {
    return;
  }

  const actionTurn = game.turnsTaken + 1;
  game.currentLogTurn = actionTurn;
  const tags = new Set(character.tags);
  let summary = "";

  applyRoundFlaw(member, actionType);

  if (actionType === "work") {
    member.ap -= 1;
    applyEffects({ progress: 3, career: 1 }, `${character.name} spinge il dossier con ostinazione burocraticamente sospetta.`);
    tags.add("mission");
    tags.add("career");
    if (characterId === "teo") {
      applyEffects({ progress: 2, chaos: 1 }, `${character.name} apre una finestra di debug interdimensionale: utile ma socialmente instabile.`);
      registerSolidarityPenance("Teo ha aperto una dimensione laterale durante un lavoro che sembrava normale.", "bug di Teo");
    }
    if (characterId === "brando") {
      applyEffects({ progress: 1 }, `${character.name} trasforma una parete concettuale in un gradino operativo.`);
    }
    summary = `${character.name} lavora sul dossier con il coraggio di chi non ha letto le note in piccolo.`;
  }

  if (actionType === "calm") {
    member.ap -= 1;
    applyEffects({ chaos: -1, dignity: 1 }, `${character.name} tampona il dramma del gruppo con stile quasi professionale.`);
    tags.add("social");
    tags.add("wellbeing");
    if (characterId === "aldo") {
      applyEffects({ career: 1 }, `${character.name} ricostruisce la reputazione del team con un'obiezione servita al banco.`);
      tags.add("law");
    }
    if (characterId === "evarista") {
      applyEffects({ stability: 1 }, `${character.name} dosa la calma con precisione farmaceutica e sarcasmo misurato.`);
    }
    summary = `${character.name} contiene il dramma prima che il dramma apra una newsletter.`;
  }

  if (actionType === "recover") {
    member.ap -= 1;
    member.resource = clamp(member.resource + 1, 0, character.statMax);
    applyEffects({ stability: 1 }, `${character.name} recupera fiato, postura e un minimo di rapporto col reale.`);
    tags.add("wellbeing");
    tags.add("prep");
    if (characterId === "miro") {
      applyEffects({ funds: 1 }, `${character.name} dice di aver trovato un margine operativo sotto una sedia.`);
      tags.add("logistics");
    }
    if (characterId === "ubaldo") {
      applyEffects({ documents: 1 }, `${character.name} impila carte a spirale e trova un allegato che non ricordavate.`);
      tags.add("bureaucracy");
    }
    summary = `${character.name} si ricarica con la disciplina emotiva di un tostapane monastico.`;
  }

  if (actionType === "special") {
    member.ap -= 2;
    member.resource -= 1;
    summary = useSpecialAbility(characterId, tags);
  }

  if (actionType === "snack") {
    if (game.resources.snacks < 1 || member.ap >= 2) {
      return;
    }
    game.resources.snacks -= 1;
    member.ap += 1;
    applyEffects({ stability: 1 }, `${character.name} riceve uno snack tattico e ricorda di essere un mammifero.`);
    tags.add("wellbeing");
    summary = `${character.name} mastica strategia e recupera un punto azione.`;
  }

  member.quoteIndex += 1;
  game.turnsTaken = actionTurn;
  addLog(summary, "action");
  advanceMissions(Array.from(tags));
  triggerSynergies(Array.from(tags));
  maybeAddFlavorLog();
  delete game.currentLogTurn;
  updateLocalPlayAfterAction(characterId);
  playSound(actionType === "special" ? "special" : "action");
  evaluateGameState();
  saveGame();
  renderGame();
}

function useSpecialAbility(characterId, tags) {
  const abilities = {
    ubaldo() {
      applyEffects({ chaos: -2, dignity: 1, progress: 8 }, "Ubaldo apre il bilancio da cortile e il gruppo ritrova ordine, timbri e fierezza agricola.");
      applyEffects({ documents: 1 }, "Tra i faldoni compare un documento con ancora un po' di fede residua.");
      tags.add("bureaucracy");
      tags.add("logistics");
      return "Ubaldo Fiscozappa compila il destino a quadretti e lo rende sorprendentemente presentabile.";
    },
    evarista() {
      applyEffects({ stability: 3, chaos: -1, dignity: 1 }, "Evarista somministra calma, acqua e dosi cavalleresche di realismo.");
      appState.game.team.filter((member) => member.ap === 0).forEach((member) => {
        member.ap = 1;
      });
      tags.add("wellbeing");
      tags.add("social");
      return "Evarista Cerottini distribuisce camomilla d'urto e il gruppo smette di tremare in sans serif.";
    },
    brando() {
      applyEffects({ progress: 10, career: 1, chaos: -1 }, "Brando arrampica il progetto su una parete concettuale e torna con risultati, vento e un piano migliore.");
      tags.add("tech");
      tags.add("climb");
      tags.add("mission");
      return "Brando Arrampicrispr scala l'impossibile e pianta una bandierina sul vostro backlog emotivo.";
    },
    aldo() {
      applyEffects({ chaos: -2, career: 2, dignity: 1, stability: -1 }, "Aldo recita il codice civile come fosse jazz e zittisce l'eco dell'HR con un solo sopracciglio.");
      tags.add("law");
      tags.add("career");
      tags.add("social");
      return "Aldo Spritzforense fa un'arringa al negroni della verita' e perfino il caos chiede una pausa.";
    },
    miro() {
      applyEffects({ funds: 2, documents: 1, progress: 6, dignity: -1 }, "Miro ottimizza l'aria, il budget e un cassetto incustodito. Eticamente discutibile, strategicamente delizioso.");
      registerSolidarityPenance("Miro ha ottimizzato anche il concetto di proprieta' privata morale.", "abilita' di Miro");
      tags.add("logistics");
      tags.add("bureaucracy");
      return "Miro KPI Lupin effettua un prelievo creativo dal continuum delle risorse condivise.";
    },
    teo() {
      applyEffects({ progress: 8, chaos: -2, career: 1 }, "Teo riscalda una patch oracolare nel microonde e il progetto smette di fumare per qualche minuto.");
      appState.game.team.forEach((member) => {
        if (member.id === "teo") {
          return;
        }
        member.resource = clamp(member.resource + 1, 0, getCharacter(member.id).statMax);
      });
      tags.add("tech");
      tags.add("mission");
      return "Teo Kernel Tempesta corregge la realta' con una patch beta e il gruppo finge che sia normale.";
    }
  };

  return abilities[characterId]();
}

function applyRoundFlaw(member, actionType) {
  if (member.flawTriggeredRound || actionType === "snack") {
    return;
  }

  member.flawTriggeredRound = true;
  const character = getCharacter(member.id);

  if (member.id === "ubaldo") {
    member.resource = clamp(member.resource - 1, 0, character.statMax);
    addLog("Ubaldo sente la parola bonus, apre un faldone e sacrifica una Scartoffia Fertile all'ordine cosmico.", "warning");
    registerSolidarityPenance("Ubaldo ha aperto il faldone sbagliato per entusiasmo fiscale.", "difetto di Ubaldo");
  }

  if (member.id === "evarista" && appState.game.resources.documents > 0) {
    appState.game.resources.documents -= 1;
    addLog("Evarista legge il bugiardino fino in fondo e consuma un Documento per scrupolo professionale.", "warning");
    registerSolidarityPenance("Evarista ha perso tempo prezioso nel bugiardino cosmico.", "difetto di Evarista");
  }

  if (member.id === "brando" && actionType === "recover") {
    applyEffects({ stability: -1, progress: 1 }, "Brando si riposa su un parapetto immaginario. E' inquietante ma leggermente utile.");
    registerSolidarityPenance("Brando ha trasformato il recupero in una performance da cornicione interiore.", "difetto di Brando");
  }

  if (member.id === "aldo" && actionType === "special") {
    applyEffects({ stability: -1 }, "La voce di Aldo rimbalza nel quartiere. La legge vince, i timpani no.");
    registerSolidarityPenance("Aldo ha vinto la disputa ma ha maltrattato l'acustica del quartiere.", "difetto di Aldo");
  }
}

function advanceMissions(tags) {
  const missionsToComplete = [];
  appState.game.activeMissions.forEach((mission) => {
    if (mission.completed) {
      return;
    }

    const matches = mission.tags.some((tag) => tags.includes(tag));
    if (!matches) {
      return;
    }

    mission.progress = Math.min(mission.target, mission.progress + 1);
    if (mission.progress >= mission.target) {
      mission.completed = true;
      missionsToComplete.push(mission);
    }
  });

  missionsToComplete.forEach((mission) => {
    applyEffects(mission.reward, `Missione completata: ${mission.title}. Il gruppo applaude con moderazione isterica.`);
    addLog(`Missione secondaria completata: ${mission.title}. Ricompensa incassata senza farsi scoprire dai vocali di famiglia.`, "synergy");
  });

  if (missionsToComplete.length) {
    appState.game.activeMissions = appState.game.activeMissions.filter((mission) => !mission.completed);
    fillActiveMissions();
  }
}

function triggerSynergies(tags) {
  const selectedIds = appState.game.selectedIds;
  const used = appState.game.synergyUsedThisRound;
  getActiveSynergies(selectedIds).forEach((synergy) => {
    const matches = synergy.tags.some((tag) => tags.includes(tag));
    if (!matches || used.includes(synergy.id)) {
      return;
    }

    applyEffects(synergy.effects, `Sinergia attiva: ${synergy.title}. La cooperazione smette per un attimo di sembrare un errore.`);
    addLog(`Sinergia attivata: ${synergy.title}. ${synergy.description}`, "synergy");
    used.push(synergy.id);
  });
}

function fillActiveMissions() {
  const activeIds = new Set(appState.game.activeMissions.map((mission) => mission.id));
  while (appState.game.activeMissions.length < 2) {
    const candidates = SIDE_MISSION_TEMPLATES.filter((mission) => !activeIds.has(mission.id));
    if (!candidates.length) {
      break;
    }

    const template = randomItem(candidates);
    appState.game.activeMissions.push({
      ...template,
      progress: 0,
      expiresIn: template.duration,
      completed: false
    });
    activeIds.add(template.id);
  }
}

function drawEventCard(source, forceSpecial = false) {
  const hadCurrentLogTurn = Object.prototype.hasOwnProperty.call(appState.game, "currentLogTurn");
  const previousLogTurn = appState.game.currentLogTurn;
  if (!hadCurrentLogTurn) {
    appState.game.currentLogTurn = appState.game.turnsTaken + 1;
  }

  const triggeredByHighChaos = appState.game.resources.chaos >= 13;
  const useSpecial = forceSpecial || appState.game.specialEventRounds.includes(appState.game.round) || triggeredByHighChaos;
  const deck = useSpecial ? SPECIAL_EVENTS : EVENT_CARDS;
  const template = randomItem(deck);
  const intensity = 1 + Math.floor((appState.game.round - 1) / 3);
  const effects = scaleEffects(template.effects, intensity);

  appState.game.currentEvent = {
    title: template.title,
    text: template.text,
    tags: template.tags,
    effects,
    source,
    isSpecial: useSpecial
  };

  applyEffects(effects, `${template.title}: ${template.text}`);
  addLog(`${source}: ${template.title}. ${template.text}`, "event");
  if (triggeredByHighChaos) {
    registerSolidarityPenance("Il caos e' salito cosi' tanto da evocare un evento speciale non richiesto.", "gestione caos del gruppo");
  }
  if (hadCurrentLogTurn) {
    appState.game.currentLogTurn = previousLogTurn;
  } else {
    delete appState.game.currentLogTurn;
  }
  playSound(useSpecial ? "warning" : "event");
}

function drawMiniDrama() {
  if (!appState.game || appState.game.outcome) {
    return;
  }
  registerSolidarityPenance("Avete cliccato volontariamente un mini-drama. Questo e' spirito d'iniziativa discutibile.", "bravata collettiva");
  drawEventCard("Mini-drama volontario", false);
  evaluateGameState();
  saveGame();
  renderGame();
}

function endRound() {
  const game = appState.game;
  if (!game || game.outcome) {
    return;
  }

  game.activeMissions.forEach((mission) => {
    mission.expiresIn -= 1;
  });

  const failed = game.activeMissions.filter((mission) => mission.expiresIn <= 0 && !mission.completed);
  failed.forEach((mission) => {
    applyEffects(mission.penalty, `Missione fallita: ${mission.title}. La vita ride senza discrezione.`);
    addLog(`Missione scaduta: ${mission.title}. Penalita' applicata con ricevuta morale allegata.`, "warning");
    registerSolidarityPenance(`Missione fallita: ${mission.title}.`, "missione secondaria ignorata");
  });

  game.activeMissions = game.activeMissions.filter((mission) => mission.expiresIn > 0 && !mission.completed);
  fillActiveMissions();

  const upkeepChaos = 1 + Math.floor(game.round / 3);
  applyEffects({ chaos: upkeepChaos }, "Fine round: il caos generale aumenta per inerzia sociale, digitale e salariale.");

  if (game.resources.stability <= 4) {
    applyEffects({ dignity: -1 }, "La stabilita' bassa rende il gruppo piu' fragile e teatralmente suscettibile.");
  }

  if (game.resources.career <= 4) {
    applyEffects({ chaos: 1 }, "La carriera traballa e il caos se ne accorge immediatamente.");
  }

  game.round += 1;
  game.team.forEach((member) => {
    member.ap = 2;
    member.flawTriggeredRound = false;
  });
  game.synergyUsedThisRound = [];
  game.localPlay.activeCharacterId = game.team[0]?.id ?? null;
  game.localPlay.nextCharacterId = null;
  game.localPlay.handoffPending = false;

  if (game.round > 8) {
    evaluateGameState();
    saveGame();
    renderGame();
    return;
  }

  addLog(`Inizia il round ${game.round}. Nessuno sa chi sia pronto, ma tutti fingono di esserlo.`, "event");
  drawEventCard(`Apertura round ${game.round}`);
  maybeAddFlavorLog(true);
  evaluateGameState();
  saveGame();
  renderGame();
}

function evaluateGameState() {
  const game = appState.game;
  if (!game || game.outcome) {
    return;
  }

  const { resources, missionGoal, round } = game;
  if (resources.progress >= missionGoal && resources.chaos < MAX_VALUES.chaos && resources.dignity > 0 && resources.career > 0 && resources.stability > 0) {
    finishGame("victory");
    return;
  }

  const defeated = resources.chaos >= MAX_VALUES.chaos || resources.dignity <= 0 || resources.career <= 0 || resources.stability <= 0 || round > 8;
  if (defeated) {
    finishGame("defeat");
  }
}

function finishGame(outcome) {
  const game = appState.game;
  game.outcome = outcome;
  appState.lastTeamSelection = game.selectedIds.slice();
  if (outcome === "defeat") {
    registerSolidarityPenance("Il gruppo e' imploso prima del traguardo. Penitenza finale da sit-com tragica.", "sconfitta di squadra");
  }
  updateBestResults(game, outcome);
  saveGame();

  const summaryHtml = createOutcomeSummary(game);
  if (outcome === "victory") {
    dom.victoryText.textContent = randomItem(GAME_TEXT.victoryLines);
    dom.victorySummary.innerHTML = summaryHtml;
    showScreen("victory");
  } else {
    dom.defeatText.textContent = randomItem(GAME_TEXT.defeatLines);
    dom.defeatSummary.innerHTML = summaryHtml;
    showScreen("defeat");
  }

  playSound(outcome === "victory" ? "victory" : "warning");
}

function createOutcomeSummary(game) {
  const panels = [
    summaryPanel("Progresso finale", `${Math.min(999, game.resources.progress)}/${game.missionGoal}`),
    summaryPanel("Caos finale", `${game.resources.chaos}/${MAX_VALUES.chaos}`),
    summaryPanel("Dignita' residua", game.resources.dignity),
    summaryPanel("Carriera residua", game.resources.career),
    summaryPanel("Stabilita' residua", game.resources.stability),
    summaryPanel("Round raggiunto", game.round)
  ];

  if (game.modes.charityPenance) {
    panels.push(summaryPanel("Micro-donazioni suggerite", `${game.donations.totalSuggested} x ${DONATION_AMOUNT} euro`));
    panels.push(summaryPanel("Segnate come donate", game.donations.completed));
  }

  return panels.join("");
}

function updateBestResults(game, outcome) {
  if (outcome === "victory") {
    appState.bestResults.wins += 1;
  } else {
    appState.bestResults.losses += 1;
  }

  const progressPercent = Math.round((game.resources.progress / game.missionGoal) * 100);
  appState.bestResults.bestProgress = Math.max(appState.bestResults.bestProgress, progressPercent);
  appState.bestResults.bestDignity = Math.max(appState.bestResults.bestDignity, game.resources.dignity);
  appState.bestResults.bestCareer = Math.max(appState.bestResults.bestCareer, game.resources.career);
  appState.bestResults.longestRun = Math.max(appState.bestResults.longestRun, Math.min(game.round, 8));
  saveToStorage(STORAGE_KEYS.bestResults, appState.bestResults);
  renderHome();
}

function showScreen(name) {
  Object.entries(dom.screens).forEach(([screenName, element]) => {
    element.classList.toggle("is-active", screenName === name);
  });

  if (name === "home") {
    renderHome();
  }
  if (name === "select") {
    renderSelection();
  }
  if (name === "game") {
    renderGame();
  }
}

function toggleCharacterSelection(characterId) {
  if (appState.selection.has(characterId)) {
    appState.selection.delete(characterId);
  } else {
    appState.selection.add(characterId);
  }
  renderSelection();
}

function toggleSound() {
  appState.preferences.soundOn = !appState.preferences.soundOn;
  updateSoundToggle();
  saveToStorage(STORAGE_KEYS.preferences, appState.preferences);
  if (appState.preferences.soundOn) {
    playSound("action");
  }
}

function updateSoundToggle() {
  dom.soundToggle.textContent = `Suoni: ${appState.preferences.soundOn ? "ON" : "OFF"}`;
  dom.soundToggle.setAttribute("aria-pressed", String(appState.preferences.soundOn));
}

function toggleSolidarityMode() {
  appState.preferences.charityModeOn = !appState.preferences.charityModeOn;
  saveToStorage(STORAGE_KEYS.preferences, appState.preferences);
  renderSelection();
}

function queueLocalHandoff() {
  const game = appState.game;
  if (!game || game.outcome || game.localPlay.handoffPending) {
    return;
  }

  const nextCharacterId = findNextPlayableCharacter(game, getCurrentPlayableCharacterId(game));
  if (!nextCharacterId) {
    return;
  }

  game.localPlay.nextCharacterId = nextCharacterId;
  game.localPlay.handoffPending = true;
  addLog(`Passa il device: tocca a ${getCharacter(nextCharacterId).name}. Il tavolo coopera anche fisicamente.`, "event");
  saveGame();
  renderGame();
}

function confirmLocalHandoff() {
  const game = appState.game;
  if (!game?.localPlay?.handoffPending || !game.localPlay.nextCharacterId) {
    return;
  }

  game.localPlay.activeCharacterId = game.localPlay.nextCharacterId;
  game.localPlay.nextCharacterId = null;
  game.localPlay.handoffPending = false;
  addLog(`Device consegnato: ora manovra ${getCharacter(game.localPlay.activeCharacterId).name}.`, "event");
  saveGame();
  renderGame();
}

function updateLocalPlayAfterAction(characterId) {
  const game = appState.game;
  const member = game.team.find((unit) => unit.id === characterId);
  if (!member) {
    return;
  }

  if (member.ap > 0) {
    game.localPlay.activeCharacterId = characterId;
    return;
  }

  const nextCharacterId = findNextPlayableCharacter(game, characterId);
  if (!nextCharacterId) {
    game.localPlay.activeCharacterId = characterId;
    game.localPlay.nextCharacterId = null;
    game.localPlay.handoffPending = false;
    return;
  }

  game.localPlay.nextCharacterId = nextCharacterId;
  game.localPlay.handoffPending = true;
}

function getCurrentPlayableCharacterId(game) {
  if (!game?.localPlay?.enabled) {
    return game?.team?.[0]?.id ?? null;
  }

  if (game.localPlay.handoffPending && game.localPlay.nextCharacterId) {
    return game.localPlay.nextCharacterId;
  }

  return game.localPlay.activeCharacterId ?? game.team[0]?.id ?? null;
}

function findNextPlayableCharacter(game, fromCharacterId) {
  const currentIndex = game.team.findIndex((member) => member.id === fromCharacterId);
  if (currentIndex === -1) {
    return null;
  }

  for (let offset = 1; offset < game.team.length + 1; offset += 1) {
    const member = game.team[(currentIndex + offset) % game.team.length];
    if (member.id !== fromCharacterId && member.ap > 0) {
      return member.id;
    }
  }

  return null;
}

function applyEffects(effects, narrative) {
  const resources = appState.game.resources;
  Object.entries(effects).forEach(([key, value]) => {
    const max = key === "progress" ? appState.game.missionGoal : MAX_VALUES[key];
    resources[key] = clamp(resources[key] + value, 0, max);
  });

  if (narrative) {
    addLog(narrative, effects.chaos && effects.chaos > 0 ? "warning" : "action");
  }
}

function addLog(text, type = "action") {
  appState.game.log.push({
    text,
    type,
    round: appState.game.round,
    turn: appState.game.currentLogTurn ?? (appState.game.turnsTaken + 1)
  });

  if (appState.game.log.length > 40) {
    appState.game.log = appState.game.log.slice(-40);
  }
}

function registerSolidarityPenance(reason, source) {
  const game = appState.game;
  if (!game?.modes?.charityPenance) {
    return;
  }

  if (game.donations.pending.length >= DONATION_PENDING_CAP) {
    game.donations.overflowBlocked += 1;
    addLog(`Cap morale raggiunto: avete gia' ${DONATION_PENDING_CAP} penitenze pendenti. La nuova penitenza per \"${reason}\" resta sospesa nel giudizio universale.`, "warning");
    return;
  }

  const entry = {
    id: String(game.donations.nextId),
    amount: DONATION_AMOUNT,
    round: game.round,
    reason,
    source,
    cause: randomItem(CHARITY_CAUSES)
  };

  game.donations.nextId += 1;
  game.donations.totalSuggested += 1;
  game.donations.pending.push(entry);
  addLog(`Penitenza solidale: per ${source} si suggerisce ${DONATION_AMOUNT} euro a ${entry.cause}. Tenete basso il volume: massimo ${DONATION_PENDING_CAP} pendenti.`, "warning");
}

function completeDonation(donationId) {
  const game = appState.game;
  if (!game?.modes?.charityPenance) {
    return;
  }

  const donation = game.donations.pending.find((entry) => entry.id === donationId);
  if (!donation) {
    return;
  }

  game.donations.pending = game.donations.pending.filter((entry) => entry.id !== donationId);
  game.donations.completed += 1;
  addLog(`Penitenza segnata come donata: ${DONATION_AMOUNT} euro a ${donation.cause}. Nessun bonus numerico, solo una coscienza leggermente meno spettinata.`, "synergy");
  saveGame();
  renderGame();
}