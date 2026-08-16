(function () {
  'use strict';

  const STORAGE_KEY = 'ev-personale.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const KPI = [
    { id: 'eri', code: 'ERI', name: 'Energia', fullName: 'Energy Return on Investment', score: 8.1, delta: 0.6, category: 'performance', color: '#c4e76b', question: 'Cosa mi ha caricato o scaricato?', definition: "Quanta energia ti restituisce cio' in cui investi tempo." },
    { id: 'roh', code: 'ROH', name: 'Tempo', fullName: 'Return on Hours', score: 6.5, delta: -0.3, category: 'performance', color: '#72c8bd', question: 'Dove ho sprecato ore?', definition: 'Il ritorno qualitativo delle ore che hai investito.' },
    { id: 'bam', code: 'BAM', name: 'Salute', fullName: 'Body Asset Maintenance', score: 8.0, delta: 0.4, category: 'performance', color: '#c4e76b', question: 'Ho manutenuto il mio asset fisico?', definition: 'La manutenzione quotidiana del tuo asset fisico principale.' },
    { id: 'nps', code: 'NPS', name: 'Relazioni', fullName: 'Net People Score', score: 8.4, delta: 0.8, category: 'performance', color: '#72c8bd', question: 'Chi aumenta il mio valore umano?', definition: 'Quanto le persone della tua vita amplificano o riducono il tuo valore.' },
    { id: 'ltv', code: 'LTV', name: 'Crescita', fullName: 'Learning Trajectory Value', score: 7.1, delta: 0.3, category: 'performance', color: '#c4e76b', question: 'Cosa so fare oggi che non sapevo fare?', definition: 'Il valore della tua curva di apprendimento nel tempo.' },
    { id: 'pfs', code: 'PFS', name: 'Finanza', fullName: 'Personal Financial Stability', score: 7.2, delta: 0.2, category: 'performance', color: '#e1b35c', question: 'Ho aumentato il mio margine?', definition: "La stabilita' finanziaria e la capacita' di generare liberta'." },
    { id: 'bri', code: 'BRI', name: 'Reputazione', fullName: 'Brand Reputation Index', score: 8.7, delta: 0.4, category: 'performance', color: '#72c8bd', question: 'Sono stato affidabile?', definition: "La qualita' del tuo brand personale: fiducia, coerenza, promesse." },
    { id: 'dcr', code: 'DCR', name: 'Focus', fullName: 'Deep Concentration Ratio', score: 6.1, delta: -0.4, category: 'performance', color: '#ed725d', question: 'Ho lavorato profondamente?', definition: 'La percentuale di tempo in concentrazione reale.' },
    { id: 'dos', code: 'DOS', name: 'Felicita', fullName: 'Daily Operating Satisfaction', score: 7.9, delta: 0.5, category: 'performance', color: '#e1b35c', question: 'Sono soddisfatto della mia giornata?', definition: 'La soddisfazione operativa: utile, bello, coerente.' },
    { id: 'acs', code: 'ACS', name: 'Identita', fullName: 'Alignment with Core Strategy', score: 7.4, delta: 0.1, category: 'performance', color: '#c4e76b', question: 'Sono allineato alla mia strategia?', definition: 'Quanto le azioni significative sono coerenti con i tuoi valori.' },
    { id: 'pir', code: 'PIR', name: 'Innovazione', fullName: 'Personal Innovation Rate', score: 6.8, delta: 0.5, category: 'performance', color: '#72c8bd', question: 'Dove ho sperimentato?', definition: 'La frequenza con cui introduci micro-innovazioni nel sistema.' },
    { id: 'kri', code: 'KRI', name: 'Rischio', fullName: 'Key Risk Indicator', score: 6.6, delta: 0.5, category: 'risk', color: '#ed725d', question: "Quale vulnerabilita' sto ignorando?", definition: 'La resilienza del sistema davanti agli eventi che possono mandarlo in crisi.' },
  ];

  const DAILY_SEED = [6, 7, 8, 7, 8, 9, 8];
  const ALLOCATIONS = [
    { label: 'Lavoro profondo', value: 31, color: '#c4e76b' },
    { label: 'Salute e recupero', value: 22, color: '#72c8bd' },
    { label: 'Relazioni', value: 18, color: '#ed725d' },
    { label: 'Apprendimento', value: 16, color: '#e1b35c' },
    { label: 'Amministrazione', value: 13, color: '#aebaae' },
  ];

  let libraryFilter = 'all';
  let activeMealDay = 'training';
  let toastTimer;

  const TRAINING_DAYS = [
    { id: 'mon', short: 'Lun', name: 'Upper strength', type: 'Forza parte alta', focus: 'spinta + tirata', routine: 'piegamenti, floor press, rematore, curl', duration: 30 },
    { id: 'tue', short: 'Mar', name: 'Lower + core', type: 'Gambe e core', focus: 'base, postura, controllo', routine: 'squat, split squat, ponte, dead bug', duration: 30 },
    { id: 'wed', short: 'Mer', name: 'Back + arms', type: 'Schiena e braccia', focus: 'dorsali + bicipiti', routine: 'rematore, reverse fly, curl hammer, plank', duration: 30 },
    { id: 'thu', short: 'Gio', name: 'Bike + mobility', type: 'Cyclette e mobilita\'', focus: 'recupero attivo', routine: '25 min cyclette + anche e spalle', duration: 30 },
    { id: 'fri', short: 'Ven', name: 'Upper volume', type: 'Parte alta volume', focus: 'spalle + petto', routine: 'pike push-up, floor press, alzate, curl', duration: 30, optional: true },
    { id: 'sat', short: 'Sab', name: 'Recovery', type: 'Recupero', focus: 'camminata + sonno', routine: 'nessun allenamento programmato', duration: 0, rest: true },
    { id: 'sun', short: 'Dom', name: 'Full body', type: 'Full body', focus: 'enfasi parte alta', routine: 'circuito squat, push-up, rematore, core', duration: 30 },
  ];

  const OBJECTIVES = [
    { id: 'strength', label: 'Sessioni di forza', target: '4-5 feriali + domenica', value: 0, unit: 'sessioni', color: '#c4e76b' },
    { id: 'protein', label: 'Proteine giornaliere', target: '125-145 g / giorno', value: 0, unit: 'giorni', color: '#72c8bd' },
    { id: 'cardio', label: 'Cyclette / inverno', target: '1 sessione leggera', value: 0, unit: 'sessioni', color: '#e1b35c' },
    { id: 'waist', label: 'Girovita monitorato', target: '1 misura / settimana', value: 0, unit: 'misura', color: '#ed725d' },
    { id: 'sleep', label: 'Recupero notturno', target: '7+ ore di media', value: 0, unit: 'notti', color: '#72c8bd' },
    { id: 'alcohol', label: 'Cocktail registrati', target: 'conoscere il costo reale', value: 0, unit: 'cocktail', color: '#ed725d' },
  ];

  const SKILLS = [
    { id: 'diet', number: '03', label: 'Dieta', target: '1 batch prep / settimana', weeklyTarget: 1, category: 'body', action: 'Prepara due pasti base e aggiorna il log.', color: '#c4e76b' },
    { id: 'french', number: '04', label: 'Francese', target: '1 pratica / settimana', weeklyTarget: 1, category: 'language', action: '20 min di ascolto + 5 frasi scritte.', color: '#72c8bd' },
    { id: 'russian', number: '05', label: 'Russo', target: '1 pratica / settimana', weeklyTarget: 1, category: 'language', action: 'Ripassa 15 parole e pronunciale ad alta voce.', color: '#72c8bd' },
    { id: 'violin', number: '06', label: 'Violino', target: '1 pratica / settimana', weeklyTarget: 1, category: 'creative', action: 'Scale lente + un passaggio difficile.', color: '#e1b35c' },
    { id: 'piano', number: '07', label: 'Pianoforte', target: '1 pratica / settimana', weeklyTarget: 1, category: 'creative', action: 'Tecnica breve + 20 min su un brano.', color: '#e1b35c' },
    { id: 'training', number: '08', label: 'Allenamento', target: '2 sessioni / settimana', weeklyTarget: 2, category: 'body', action: 'Forza da 30 min, progressione controllata.', color: '#c4e76b' },
    { id: 'tenderness', number: '09', label: 'Tenerezza', target: '1 gesto / settimana', weeklyTarget: 1, category: 'relationship', action: 'Fai un gesto di cura senza aspettare un ritorno.', color: '#ed725d' },
    { id: 'ai', number: '10', label: 'AI', target: '2 sessioni / settimana', weeklyTarget: 2, category: 'cognitive', action: 'Costruisci o studia un piccolo caso d\'uso.', color: '#72c8bd' },
    { id: 'jb-love', number: '11', label: 'Amore per JB', target: 'già perfetto', weeklyTarget: 0, category: 'relationship', action: 'Non ottimizzare: riconosci il patrimonio.', color: '#ed725d', perfect: true },
    { id: 'photo', number: '12', label: 'Foto', target: '1 pratica / settimana', weeklyTarget: 1, category: 'creative', action: 'Scatta 10 foto con un vincolo preciso.', color: '#e1b35c' },
    { id: 'video', number: '13', label: 'Video', target: '1 pratica / settimana', weeklyTarget: 1, category: 'creative', action: 'Gira e monta una clip da 30-60 secondi.', color: '#e1b35c' },
    { id: 'gaming', number: '14', label: 'Videogiochi', target: '1 sessione intenzionale / settimana', weeklyTarget: 1, category: 'recreation', action: 'Gioca senza multitasking e nota cosa ti diverte.', color: '#a98bd4' },
  ];

  const SKILL_WEEK = [
    { id: 'mon', label: 'Lun', sessions: [
      { id: 'mon-training', skill: 'training', title: 'Upper strength', detail: 'Sessione collegata al piano forza', minutes: 30, linkTraining: 'mon' },
      { id: 'mon-french', skill: 'french', title: 'Francese', detail: 'Ascolto breve + 5 frasi', minutes: 20 },
    ] },
    { id: 'tue', label: 'Mar', sessions: [
      { id: 'tue-russian', skill: 'russian', title: 'Russo', detail: 'Parole nuove + pronuncia', minutes: 20 },
      { id: 'tue-ai', skill: 'ai', title: 'AI / laboratorio', detail: 'Un caso d\'uso piccolo e concreto', minutes: 25 },
    ] },
    { id: 'wed', label: 'Mer', sessions: [
      { id: 'wed-violin', skill: 'violin', title: 'Violino', detail: 'Scale + passaggio difficile', minutes: 20 },
      { id: 'wed-piano', skill: 'piano', title: 'Pianoforte', detail: 'Tecnica + un brano', minutes: 25 },
    ] },
    { id: 'thu', label: 'Gio', sessions: [
      { id: 'thu-photo', skill: 'photo', title: 'Foto', detail: '10 scatti con un vincolo', minutes: 25 },
      { id: 'thu-video', skill: 'video', title: 'Video', detail: 'Gira e monta una clip', minutes: 25 },
    ] },
    { id: 'fri', label: 'Ven', sessions: [
      { id: 'fri-ai', skill: 'ai', title: 'AI / sintesi', detail: 'Rivedi cosa hai imparato', minutes: 20 },
      { id: 'fri-tenderness', skill: 'tenderness', title: 'Tenerezza', detail: 'Un gesto di cura intenzionale', minutes: 15 },
    ] },
    { id: 'sat', label: 'Sab', sessions: [
      { id: 'sat-gaming', skill: 'gaming', title: 'Videogiochi', detail: 'Sessione libera, senza multitasking', minutes: 60 },
    ] },
    { id: 'sun', label: 'Dom', sessions: [
      { id: 'sun-diet', skill: 'diet', title: 'Dieta / batch prep', detail: 'Prepara la base dei pasti feriali', minutes: 45 },
      { id: 'sun-training', skill: 'training', title: 'Full body', detail: 'Sessione collegata al piano forza', minutes: 30, linkTraining: 'sun' },
    ] },
  ];

  const state = loadState();

  function defaultState() {
    return {
      scores: Object.fromEntries(KPI.map((metric) => [metric.id, metric.score])),
      notes: {
        weekly: "La qualita' della mia attenzione ha determinato la qualita' della settimana.",
        commitment: 'Proteggere due blocchi di lavoro profondo prima di accettare nuove richieste.',
        strategy: "Sto costruendo una vita con piu' margine: mentale, fisico e relazionale.",
      },
      daily: DAILY_SEED.slice(),
      profile: {
        age: 32,
        height: 179,
        weight: 72,
        weekdaySessions: 5,
        sundaySession: true,
        fridayCocktails: 6,
        saturdayCocktails: 1,
      },
      training: {},
      objectives: Object.fromEntries(OBJECTIVES.map((objective) => [objective.id, objective.id === 'alcohol' ? 7 : 0])),
      skills: {},
      lastSaved: null,
    };
  }

  function loadState() {
    const fallback = defaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return fallback;
      return {
        ...fallback,
        ...saved,
        scores: { ...fallback.scores, ...(saved.scores || {}) },
        notes: { ...fallback.notes, ...(saved.notes || {}) },
        daily: Array.isArray(saved.daily) && saved.daily.length === 7 ? saved.daily : fallback.daily,
        profile: { ...fallback.profile, ...(saved.profile || {}) },
        training: { ...fallback.training, ...(saved.training || {}) },
        objectives: { ...fallback.objectives, ...(saved.objectives || {}) },
        skills: { ...fallback.skills, ...(saved.skills || {}) },
      };
    } catch (error) {
      return fallback;
    }
  }

  function persist() {
    state.lastSaved = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* local-only app: storage may be unavailable */ }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clampScore(value) {
    return Math.max(1, Math.min(10, Number(value) || 1));
  }

  function scoreOf(id) {
    return clampScore(state.scores[id]);
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function currentAverage() { return average(KPI.map((metric) => scoreOf(metric.id))); }
  function previousAverage() { return average(KPI.map((metric) => scoreOf(metric.id) - metric.delta)); }

  function formatScore(value) { return Number(value).toFixed(1); }
  function formatDelta(value) { return `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}`; }

  function isoWeek(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  }

  function updateHeader() {
    const today = new Date();
    const dateText = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);
    $('#todayLabel').textContent = dateText.charAt(0).toUpperCase() + dateText.slice(1);
    $('#weekNumber').textContent = `SETTIMANA ${String(isoWeek(today)).padStart(2, '0')}`;
    $('.period-chip').textContent = `WEEK ${isoWeek(today)}`;
  }

  function renderEnterpriseValue() {
    const value = currentAverage();
    const delta = value - previousAverage();
    const rounded = formatScore(value);
    $('#evValue').textContent = rounded;
    $('#evDelta').textContent = `${formatDelta(delta)} vs settimana scorsa`;
    $('#evRing').style.setProperty('--ring-progress', `${value * 10}%`);
    $('#scorecardAverage').textContent = `${rounded} / 10`;
    $('#reviewAverage').textContent = `${rounded} / 10`;
    let status = 'Solido, con margine da costruire';
    if (value >= 8) status = 'In crescita, sistema ben capitalizzato';
    if (value < 6) status = 'Sotto pressione, serve riallocare';
    $('#evStatus').textContent = status;
  }

  function signalFor(score) {
    if (score >= 8) return { label: 'forte', color: '#72c8bd' };
    if (score >= 6.5) return { label: 'presidio', color: '#c4e76b' };
    return { label: 'attenzione', color: '#ed725d' };
  }

  function renderScorecard() {
    $('#scorecardList').innerHTML = KPI.map((metric, index) => {
      const score = scoreOf(metric.id);
      const signal = signalFor(score);
      return `<div class="score-row">
        <div class="score-name"><span class="score-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${metric.name}</strong><small>${metric.code}</small></span></div>
        <div class="signal-track" style="--bar-color:${signal.color}" title="${signal.label}"><span style="width:${score * 10}%"></span></div>
        <div class="score-value">${formatScore(score)}<em>/10</em></div>
      </div>`;
    }).join('');
  }

  function renderSignal() {
    const weakest = KPI.reduce((lowest, metric) => scoreOf(metric.id) < scoreOf(lowest.id) ? metric : lowest, KPI[0]);
    const score = scoreOf(weakest.id);
    const copy = weakest.id === 'dcr'
      ? "Il collo di bottiglia e il focus. Prima di cercare piu' output, proteggi la qualita' dell'attenzione."
      : `Il collo di bottiglia e ${weakest.name.toLowerCase()}. Prima di aggiungere obiettivi, proteggi questa area.`;
    $('#signalPanel').innerHTML = `<div class="signal-header"><div><p class="panel-kicker">Segnale della settimana</p><h2>${weakest.code} / ${weakest.name}</h2></div><span class="signal-symbol">!</span></div>
      <p class="signal-text">${copy}</p><div class="signal-footer"><span>Score attuale</span><strong>${formatScore(score)} / 10</strong></div>`;
  }

  function renderRhythm() {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const todayIndex = (new Date().getDay() + 6) % 7;
    const rhythmAverage = average(state.daily);
    $('#rhythmAverage').textContent = `media ${formatScore(rhythmAverage)}`;
    $('#rhythmChart').innerHTML = state.daily.map((score, index) => `<div class="day-column ${index === todayIndex ? 'today' : ''}">
      <div class="day-bar-wrap"><span class="day-bar" style="height:${Math.max(10, score * 10)}%" title="${score}/10"></span></div>
      <span class="day-label">${days[index]}</span>
    </div>`).join('');
  }

  function renderMemo() {
    $('#memoPreview').textContent = state.notes.weekly;
    $('#commitmentPreview').textContent = state.notes.commitment;
  }

  function renderAllocations() {
    $('#allocationList').innerHTML = ALLOCATIONS.map((item) => `<div class="allocation-row">
      <div class="allocation-label"><i style="--allocation-color:${item.color}"></i>${item.label}</div>
      <div class="allocation-bar"><span style="width:${item.value}%;--allocation-color:${item.color}"></span></div>
      <div class="allocation-value">${item.value}%</div>
    </div>`).join('');
  }

  function riskExposure() {
    const values = [
      10 - scoreOf('pfs'),
      10 - scoreOf('bam'),
      10 - scoreOf('nps'),
      10 - scoreOf('bam') + 1.4,
      10 - scoreOf('ltv'),
      10 - scoreOf('nps'),
      10 - scoreOf('acs'),
      10 - scoreOf('pir'),
    ];
    return average(values);
  }

  function renderRisk() {
    const exposure = riskExposure();
    $('#riskScore').textContent = formatScore(exposure);
    $('#riskMeterFill').style.width = `${exposure * 10}%`;
    $('#riskStatus').textContent = exposure <= 3 ? 'bassa esposizione' : exposure <= 5 ? 'da presidiare' : 'alta esposizione';
  }

  function renderOverview() {
    renderEnterpriseValue();
    renderScorecard();
    renderSignal();
    renderRhythm();
    renderMemo();
    renderAllocations();
    renderRisk();
  }

  function renderReview() {
    $('#weeklyNote').value = state.notes.weekly;
    $('#commitmentInput').value = state.notes.commitment;
    $('#reviewList').innerHTML = KPI.map((metric, index) => {
      const score = scoreOf(metric.id);
      const trendClass = metric.delta < 0 ? 'down' : '';
      return `<div class="review-list-row" data-review-row="${metric.id}">
        <div class="review-kpi-name"><span class="review-kpi-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${metric.code} / ${metric.name}</strong><small>${metric.fullName}</small></span></div>
        <div class="review-question">${metric.question}</div>
        <div class="score-control"><input class="score-range" type="range" min="1" max="10" step="0.1" value="${score}" data-score-id="${metric.id}" aria-label="Voto ${metric.name}"><output>${formatScore(score)}</output></div>
        <div class="row-trend ${trendClass}">${formatDelta(metric.delta)} <span aria-hidden="true">${metric.delta >= 0 ? '&#8593;' : '&#8595;'}</span></div>
      </div>`;
    }).join('');
  }

  function calculateNutrition() {
    const { age, height, weight, weekdaySessions } = state.profile;
    const bmr = (10 * Number(weight)) + (6.25 * Number(height)) - (5 * Number(age)) + 5;
    const activity = Number(weekdaySessions) >= 5 ? 1.52 : Number(weekdaySessions) >= 3 ? 1.46 : 1.38;
    const maintenance = bmr * activity;
    return {
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      trainingCalories: Math.round(maintenance + 100),
      restCalories: Math.round(maintenance - 180),
      protein: Math.round(Number(weight) * 1.85),
      fat: Math.round(Number(weight) * .95),
    };
  }

  function renderTraining() {
    const completed = Object.values(state.training).filter(Boolean).length;
    const target = Number(state.profile.weekdaySessions) + (state.profile.sundaySession ? 1 : 0);
    $('#trainingStatus').textContent = `${completed} / ${target} sessioni registrate`;
    $('#trainingWeek').innerHTML = TRAINING_DAYS.map((day) => {
      const isCompleted = Boolean(state.training[day.id]);
      const isRest = day.rest;
      return `<div class="training-day ${isCompleted ? 'completed' : ''} ${isRest ? 'rest-day' : ''}">
        <div class="training-day-name"><span>${day.short}</span><small>${day.optional ? 'opzionale' : isRest ? 'recupero' : 'slot'}</small></div>
        <div class="training-day-main"><strong>${day.name}</strong><span>${day.type} / ${day.focus}</span><small>${day.routine}</small></div>
        <span class="training-duration">${day.duration ? `${day.duration} min` : '—'}</span>
        ${isRest ? '<span class="training-rest-mark">rest</span>' : `<button class="training-toggle" data-training-id="${day.id}" aria-label="${isCompleted ? 'Segna non completata' : 'Segna completata'}" title="${isCompleted ? 'Segna non completata' : 'Segna completata'}">${isCompleted ? '&#10003;' : '+'}</button>`}
      </div>`;
    }).join('');
  }

  function renderObjectives() {
    const objectiveValues = {
      strength: Object.values(state.training).filter(Boolean).length,
      protein: Number(state.objectives.protein || 0),
      cardio: state.training.thu ? 1 : 0,
      waist: Number(state.objectives.waist || 0),
      sleep: Number(state.objectives.sleep || 0),
      alcohol: Number(state.profile.fridayCocktails || 0) + Number(state.profile.saturdayCocktails || 0),
    };
    const targets = { strength: Number(state.profile.weekdaySessions) + 1, protein: 5, cardio: 1, waist: 1, sleep: 5, alcohol: 7 };
    const completeCount = Object.entries(objectiveValues).filter(([id, value]) => id === 'alcohol' ? value <= targets[id] : value >= targets[id]).length;
    $('#objectiveProgress').textContent = `${completeCount} / ${OBJECTIVES.length}`;
    $('#objectiveList').innerHTML = OBJECTIVES.map((objective) => {
      const value = objectiveValues[objective.id];
      const target = targets[objective.id];
      const done = objective.id === 'alcohol' ? value <= target : value >= target;
      const progress = objective.id === 'alcohol' ? Math.min(100, (value / target) * 100) : Math.min(100, (value / target) * 100);
      return `<div class="objective-row ${done ? 'done' : ''}">
        <span class="objective-check">${done ? '&#10003;' : objective.id === 'alcohol' ? '!' : '0'}</span>
        <div class="objective-copy"><strong>${objective.label}</strong><small>${objective.target}</small></div>
        <div class="objective-progress"><div class="progress-track"><span style="width:${progress}%;--bar-color:${objective.color}"></span></div><small>${value}${objective.id === 'protein' ? ' giorni' : ` / ${target} ${objective.unit}`}</small></div>
        <button class="icon-button small objective-edit" data-objective-id="${objective.id}" aria-label="Modifica ${objective.label}" title="Modifica obiettivo">&#8599;</button>
      </div>`;
    }).join('');
  }

  function renderTrainingProfile() {
    $('#profileWeight').textContent = state.profile.weight;
    $('#profileHeight').textContent = state.profile.height;
    $('#profileAge').textContent = state.profile.age;
  }

  function mealData(nutrition) {
    return {
      training: [
        { label: 'Colazione in treno', timing: 'portatile / 300-400 kcal', title: 'Skyr, avena e banana', detail: '250 g skyr + 45 g avena + 1 banana + 10 g frutta secca', macros: '32 g proteine' },
        { label: 'Pranzo meal prep', timing: 'microonde / 900 kcal', title: 'Pollo al curry con riso', detail: '180 g pollo + 100 g riso secco + cipolla, verdure e curry + 10 g olio', macros: '55 g proteine' },
        { label: 'Cena meal prep', timing: 'microonde / 850 kcal', title: 'Couscous con ceci e seitan', detail: '80 g couscous secco + 150 g ceci + 150 g seitan + verdure', macros: '47 g proteine' },
      ],
      rest: [
        { label: 'Colazione in treno', timing: 'portatile / 300 kcal', title: 'Yogurt proteico e frutta', detail: '250 g yogurt greco + frutta + 25 g avena + 10 g mandorle', macros: '28 g proteine' },
        { label: 'Pranzo meal prep', timing: 'microonde / 800 kcal', title: 'Farro, tonno e ceci', detail: '90 g farro secco + 120 g tonno sgocciolato + 100 g ceci + cipolla', macros: '50 g proteine' },
        { label: 'Cena meal prep', timing: 'microonde / 800 kcal', title: 'Pesce, riso e verdure', detail: '200 g pesce + 80 g riso secco + verdure + 10 g olio', macros: '45 g proteine' },
      ],
      social: [
        { label: 'Colazione in treno', timing: 'proteica / 300 kcal', title: 'Skyr, avena e frutta', detail: 'Mantieni la colazione: non arrivare alla sera affamato.', macros: '30 g proteine' },
        { label: 'Pranzo meal prep', timing: 'microonde / 850 kcal', title: 'Pollo al curry con riso', detail: '180 g pollo + 90 g riso secco + verdure e cipolla.', macros: '52 g proteine' },
        { label: 'Serata sociale', timing: 'budget / 900-1.200 kcal', title: 'Pasto proteico + cocktail tracciati', detail: 'Cena leggera e completa prima di bere: pesce o pollo, verdure, carboidrati moderati. Acqua tra i drink.', macros: '40+ g proteine' },
      ],
    }[activeMealDay];
  }

  function renderNutrition() {
    const nutrition = calculateNutrition();
    const cocktailCount = Number(state.profile.fridayCocktails || 0) + Number(state.profile.saturdayCocktails || 0);
    const alcoholCalories = cocktailCount * 180;
    const dayCalories = activeMealDay === 'rest' ? nutrition.restCalories : activeMealDay === 'social' ? Math.round(nutrition.maintenance - 50) : nutrition.trainingCalories;
    const dayLabel = activeMealDay === 'rest' ? 'Giorno di riposo' : activeMealDay === 'social' ? 'Giorno sociale' : 'Giorno di allenamento';
    const trainingPercent = Math.round((dayCalories / 3000) * 100);
    $('#dietDayTitle').textContent = dayLabel;
    $('#nutritionStats').innerHTML = `<div class="nutrition-stat primary"><span>Calorie</span><strong>${dayCalories}</strong><small>kcal target</small><div class="stat-bar"><i style="width:${trainingPercent}%"></i></div></div>
      <div class="nutrition-stat"><span>Proteine</span><strong>${nutrition.protein}</strong><small>g / giorno</small><div class="stat-bar"><i style="width:${Math.min(100, nutrition.protein / 2)}%"></i></div></div>
      <div class="nutrition-stat"><span>Grassi</span><strong>${nutrition.fat}</strong><small>g / giorno</small><div class="stat-bar"><i style="width:${Math.min(100, nutrition.fat / 1.2)}%"></i></div></div>
      <div class="nutrition-stat"><span>Mantenimento</span><strong>${nutrition.maintenance}</strong><small>kcal stimato</small><div class="stat-bar"><i style="width:${Math.min(100, nutrition.maintenance / 28)}%"></i></div></div>`;
    $('#nutritionNote').innerHTML = `<strong>Logica del piano</strong><span>Leggero surplus nei giorni forza, deficit moderato nei giorni di riposo. Obiettivo: performance su, girovita stabile o in lieve calo.</span>`;
    $('#mealList').innerHTML = mealData(nutrition).map((meal) => `<div class="meal-row"><div class="meal-time"><strong>${meal.label}</strong><small>${meal.timing}</small></div><div class="meal-copy"><strong>${meal.title}</strong><span>${meal.detail}</span></div><span class="meal-macro">${meal.macros}</span></div>`).join('');
    $('#alcoholCalories').textContent = `${alcoholCalories} kcal`;
    $('#cocktailTotal').textContent = cocktailCount;
    $('#alcoholMeterFill').style.width = `${Math.min(100, (cocktailCount / 7) * 100)}%`;
    $('#dietPlanLabel').textContent = `${state.profile.weight} kg / ricomposizione`;
    $('#shoppingList').innerHTML = ['pollo 700 g', 'pesce 400 g', 'skyr / yogurt greco', 'riso + couscous + farro', 'ceci e seitan', 'cipolle e verdure', 'banane + frutta', 'olio, curry, frutta secca'].map((item) => `<span><i></i>${item}</span>`).join('');
  }

  function renderDietForm() {
    $('#dietAge').value = state.profile.age;
    $('#dietHeight').value = state.profile.height;
    $('#dietWeight').value = state.profile.weight;
    $('#weekdaySessions').value = state.profile.weekdaySessions;
    $('#fridayCocktails').value = state.profile.fridayCocktails;
    $('#saturdayCocktails').value = state.profile.saturdayCocktails;
  }

  function renderObjectivesView() {
    renderTraining();
    renderObjectives();
    renderTrainingProfile();
  }

  function isSkillSessionComplete(session) {
    if (session.linkTraining) return Boolean(state.training[session.linkTraining]);
    return Boolean(state.skills[session.id]);
  }

  function skillSessionsFor(id) {
    return SKILL_WEEK.flatMap((day) => day.sessions.filter((session) => session.skill === id));
  }

  function skillCompletedCount(id) {
    return skillSessionsFor(id).filter(isSkillSessionComplete).length;
  }

  function skillSessionTotal() {
    return SKILL_WEEK.reduce((sum, day) => sum + day.sessions.length, 0);
  }

  function renderSkills() {
    const allSessions = SKILL_WEEK.flatMap((day) => day.sessions);
    const completed = allSessions.filter(isSkillSessionComplete).length;
    const minutes = allSessions.filter(isSkillSessionComplete).reduce((sum, session) => sum + session.minutes, 0);
    const maxMinutes = allSessions.reduce((sum, session) => sum + session.minutes, 0);
    $('#skillStatus').textContent = `${completed} sessioni completate`;
    $('#skillCompletedCount').textContent = completed;
    $('#skillSessionCount').textContent = allSessions.length;
    $('#skillMinutes').textContent = minutes;
    $('#skillSessionBar').style.width = `${allSessions.length ? (completed / allSessions.length) * 100 : 0}%`;
    $('#skillMinuteBar').style.width = `${maxMinutes ? (minutes / maxMinutes) * 100 : 0}%`;
    $('#skillWeek').innerHTML = SKILL_WEEK.map((day) => `<div class="skill-day"><div class="skill-day-label"><strong>${day.label}</strong><small>${day.sessions.length} sessioni</small></div><div class="skill-day-sessions">${day.sessions.map((session) => {
      const skill = SKILLS.find((item) => item.id === session.skill);
      const done = isSkillSessionComplete(session);
      return `<div class="skill-session ${done ? 'completed' : ''}"><span class="skill-session-dot" style="--skill-color:${skill.color}"></span><div class="skill-session-copy"><strong>${session.title}</strong><small>${session.detail}</small></div><span class="skill-session-time">${session.minutes} min</span><button class="skill-session-toggle" data-skill-session="${session.id}" data-linked-training="${session.linkTraining || ''}" aria-label="${done ? 'Segna non completata' : 'Segna completata'}" title="${done ? 'Segna non completata' : 'Segna completata'}">${done ? '&#10003;' : '+'}</button></div>`;
    }).join('')}</div></div>`).join('');
    $('#skillBoard').innerHTML = SKILLS.map((skill) => {
      const value = skill.perfect ? 100 : Math.min(100, (skillCompletedCount(skill.id) / skill.weeklyTarget) * 100);
      const done = skill.perfect || skillCompletedCount(skill.id) >= skill.weeklyTarget;
      return `<div class="skill-card ${skill.perfect ? 'perfect' : ''} ${done ? 'done' : ''}"><div class="skill-card-head"><span class="skill-card-number">${skill.number}</span><span class="skill-category" style="--skill-color:${skill.color}">${skill.category}</span></div><div class="skill-card-name"><strong>${skill.label}</strong><small>${skill.target}</small></div>${skill.perfect ? '<span class="skill-perfect-label">PERFECT</span>' : `<div class="skill-card-progress"><div class="progress-track"><span style="width:${value}%;--bar-color:${skill.color}"></span></div><small>${skillCompletedCount(skill.id)} / ${skill.weeklyTarget}</small></div><p>${skill.action}</p>`}</div>`;
    }).join('');
  }

  function pillarData() {
    return [
      { name: 'Salute', hint: 'corpo + recupero', value: scoreOf('bam'), color: '#c4e76b' },
      { name: 'Competenze', hint: 'learning + focus', value: average([scoreOf('ltv'), scoreOf('dcr')]), color: '#72c8bd' },
      { name: 'Reputazione', hint: 'fiducia + promesse', value: scoreOf('bri'), color: '#e1b35c' },
      { name: 'Relazioni', hint: 'supply chain umana', value: scoreOf('nps'), color: '#ed725d' },
      { name: 'Energia', hint: "ritorno sull'investimento", value: scoreOf('eri'), color: '#c4e76b' },
      { name: "Liberta' finanziaria", hint: 'margine operativo', value: scoreOf('pfs'), color: '#e1b35c' },
      { name: 'Adattabilita', hint: 'sperimentazione + rischio', value: average([scoreOf('pir'), scoreOf('kri')]), color: '#72c8bd' },
      { name: 'Senso', hint: 'allineamento + gioia', value: average([scoreOf('acs'), scoreOf('dos')]), color: '#ed725d' },
    ];
  }

  function renderStrategy() {
    const pillars = pillarData();
    $('#pillarList').innerHTML = pillars.map((pillar) => `<div class="pillar-row">
      <div class="pillar-label">${pillar.name}<small>${pillar.hint}</small></div>
      <div class="pillar-bar"><span style="width:${pillar.value * 10}%;--pillar-color:${pillar.color}"></span></div>
      <div class="pillar-value">${formatScore(pillar.value)}</div>
    </div>`).join('');

    const alignment = scoreOf('acs');
    const verdict = alignment >= 8 ? 'Le azioni hanno una direzione chiara.' : alignment >= 6.5 ? 'Direzione presente, ma con troppe concessioni.' : 'La strategia va riscritta prima di accelerare.';
    $('#alignmentPanel').innerHTML = `<div class="panel-header compact"><div><p class="panel-kicker">10 / Identita'</p><h2>Alignment with core strategy</h2></div><span class="panel-meta">ACS</span></div>
      <div class="alignment-score-row"><div class="alignment-score">${formatScore(alignment)}<small>/10</small></div><div class="alignment-verdict">${verdict}</div></div>
      <div class="progress-track"><span style="width:${alignment * 10}%"></span></div>
      <div class="alignment-questions"><p>Sto vivendo secondo priorita' mie o altrui?</p><p>Le scelte quotidiane hanno una direzione?</p></div>`;

    const risks = [
      ['Dipendenza da una fonte di reddito', Math.max(1, 10 - scoreOf('pfs'))],
      ['Sedentarieta', Math.max(1, 10 - scoreOf('bam'))],
      ['Stress cronico', Math.min(10, Math.max(1, 10 - scoreOf('dos') + 1.3))],
      ['Competenze obsolete', Math.max(1, 10 - scoreOf('ltv'))],
      ['Routine troppo rigida', Math.max(1, 10 - scoreOf('pir'))],
      ['Mancanza di senso', Math.max(1, 10 - scoreOf('acs'))],
    ];
    const averageRisk = average(risks.map((risk) => risk[1]));
    $('#riskDeskMeta').textContent = `${formatScore(averageRisk)} / 10 esposizione`;
    $('#riskList').innerHTML = risks.map(([label, value]) => `<div class="risk-item"><span class="risk-item-label">${label}</span><div class="progress-track"><span style="width:${value * 10}%;background:${value >= 5 ? '#ed725d' : '#e1b35c'}"></span></div><strong class="risk-item-score">${formatScore(value)}</strong></div>`).join('');
     $('#strategyNote').value = state.notes.strategy;
  }

  function renderLibrary() {
    const search = ($('#librarySearch').value || '').trim().toLowerCase();
    const filtered = KPI.filter((metric) => {
      const inCategory = libraryFilter === 'all' || metric.category === libraryFilter;
      const haystack = `${metric.code} ${metric.name} ${metric.fullName} ${metric.question} ${metric.definition}`.toLowerCase();
      return inCategory && (!search || haystack.includes(search));
    });
    $('#libraryCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'metrica' : 'metriche'}`;
    $('#libraryGrid').innerHTML = filtered.length ? filtered.map((metric, index) => `<article class="kpi-card">
      <div class="kpi-card-top"><span class="kpi-number">${String(KPI.indexOf(metric) + 1).padStart(2, '0')} / 12</span><span class="kpi-tag ${metric.category === 'risk' ? 'risk' : ''}">${metric.category === 'risk' ? 'risk' : 'performance'}</span></div>
      <h2>${metric.name}</h2><span class="kpi-card-code">${metric.code} / ${metric.fullName}</span>
      <p class="kpi-card-definition">${metric.definition}</p>
      <div class="kpi-card-bottom"><span class="kpi-card-question">"${metric.question}"</span><strong class="kpi-card-score">${formatScore(scoreOf(metric.id))}<small>/10</small></strong></div>
    </article>`).join('') : '<div class="empty-library">Nessun KPI corrisponde alla ricerca.</div>';
  }

  function setupReviewEvents() {
    $('#reviewList').addEventListener('input', (event) => {
      if (!event.target.matches('[data-score-id]')) return;
      const id = event.target.dataset.scoreId;
      state.scores[id] = clampScore(event.target.value);
      const row = $(`[data-review-row="${id}"]`);
      if (row) $('output', row).textContent = formatScore(state.scores[id]);
      persist();
      renderOverview();
      renderLibrary();
      renderStrategy();
    });
  }

  function saveDietProfile() {
    state.profile.age = Math.max(18, Number($('#dietAge').value) || 32);
    state.profile.height = Math.max(140, Number($('#dietHeight').value) || 179);
    state.profile.weight = Math.max(40, Number($('#dietWeight').value) || 72);
    state.profile.weekdaySessions = Math.max(1, Math.min(5, Number($('#weekdaySessions').value) || 5));
    state.profile.fridayCocktails = Math.max(0, Math.min(12, Number($('#fridayCocktails').value) || 0));
    state.profile.saturdayCocktails = Math.max(0, Math.min(12, Number($('#saturdayCocktails').value) || 0));
    persist();
    renderDietForm();
    renderTrainingProfile();
    renderObjectivesView();
    renderNutrition();
    showToast('Profilo dieta aggiornato');
  }

  function editObjective(id) {
    if (id === 'alcohol') {
      goToView('diet');
      $('#fridayCocktails').focus();
      showToast('Aggiorna il numero di cocktail nel profilo dieta');
      return;
    }
    if (id === 'strength' || id === 'cardio') {
      openModal(`<p class="panel-kicker">${id === 'strength' ? 'Sessioni di forza' : 'Cyclette'}</p><h2>Registra dal calendario.</h2><p>${id === 'strength' ? 'Questo obiettivo si aggiorna segnando gli slot di allenamento completati.' : "La cyclette e' lo slot del giovedi': segna la sessione nel calendario della settimana."}</p><button class="primary-button full-width" id="modalOpenObjectives">Apri calendario <span aria-hidden="true">&#8594;</span></button>`);
      $('#modalOpenObjectives').addEventListener('click', () => { closeModal(); goToView('objectives'); });
      return;
    }
    const labels = { protein: 'Giorni in cui hai raggiunto le proteine', waist: 'Misurazioni del girovita questa settimana', sleep: 'Notti con almeno 7 ore di sonno' };
    const max = id === 'waist' ? 7 : 7;
    openModal(`<p class="panel-kicker">Objective ledger</p><h2>Aggiorna il dato.</h2><label class="field-label" for="modalObjectiveValue">${labels[id]}</label><input id="modalObjectiveValue" type="number" min="0" max="${max}" step="1" value="${Number(state.objectives[id] || 0)}"><button class="primary-button full-width" id="modalSaveObjective">Salva obiettivo <span aria-hidden="true">&#8594;</span></button>`);
    $('#modalSaveObjective').addEventListener('click', () => {
      state.objectives[id] = Math.max(0, Math.min(max, Number($('#modalObjectiveValue').value) || 0));
      persist();
      renderObjectivesView();
      closeModal();
      showToast('Obiettivo aggiornato');
    });
  }

  function saveReview() {
    state.notes.weekly = $('#weeklyNote').value.trim() || defaultState().notes.weekly;
    state.notes.commitment = $('#commitmentInput').value.trim() || defaultState().notes.commitment;
    persist();
    renderMemo();
    $('#reviewStatus').textContent = `Salvato alle ${new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    showToast('Review salvata sul dispositivo');
  }

  function goToView(view) {
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
    document.body.classList.remove('nav-mobile-open');
    $('#menuToggle').setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function openModal(content) {
    $('#modalContent').innerHTML = content;
    $('#modalShell').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('#modalShell').hidden = true;
    document.body.style.overflow = '';
  }

  function openHelp() {
    openModal(`<p class="panel-kicker">Metodo</p><h2>Misurare per scegliere.</h2><p>Questa dashboard non prova a trasformare la vita in un foglio Excel. Usa il linguaggio dell'impresa come una lente: rende visibili energia, manutenzione, rischio e direzione.</p><div class="method-list"><div class="method-row"><strong>1-10</strong><span>Dai un voto relativo alla tua settimana. Un 7 sostenibile vale piu' di un 10 ottenuto bruciando tutto.</span></div><div class="method-row"><strong>EV</strong><span>E' la media dei dodici segnali, non un verdetto sulla tua persona. Serve a vedere dove riallocare capitale.</span></div><div class="method-row"><strong>LOCALE</strong><span>I dati restano nel browser di questo dispositivo. Esporta un JSON quando vuoi conservarne una copia.</span></div></div>`);
  }

  function openMemoEditor() {
    openModal(`<p class="panel-kicker">Founder memo</p><h2>Scrivi dalla sala controllo.</h2><label class="field-label" for="modalWeeklyNote">Insight della settimana</label><textarea id="modalWeeklyNote" rows="5">${escapeHtml(state.notes.weekly)}</textarea><label class="field-label" for="modalCommitment">Decisione concreta</label><input id="modalCommitment" type="text" value="${escapeHtml(state.notes.commitment)}"><button class="primary-button full-width" id="modalSaveMemo">Salva memo <span aria-hidden="true">&#8594;</span></button>`);
    $('#modalSaveMemo').addEventListener('click', () => {
      state.notes.weekly = $('#modalWeeklyNote').value.trim() || defaultState().notes.weekly;
      state.notes.commitment = $('#modalCommitment').value.trim() || defaultState().notes.commitment;
      persist();
      renderMemo();
      closeModal();
      showToast('Founder memo aggiornato');
    });
  }

  function exportState() {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      week: isoWeek(new Date()),
      enterpriseValue: Number(formatScore(currentAverage())),
      kpi: KPI.map((metric) => ({ code: metric.code, area: metric.name, score: scoreOf(metric.id), delta: metric.delta })),
      notes: state.notes,
      dailySatisfaction: state.daily,
      profile: state.profile,
      training: state.training,
      skills: state.skills,
      nutritionTargets: calculateNutrition(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ev-personale-week-${isoWeek(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Export JSON scaricato');
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const viewTrigger = event.target.closest('[data-view]');
      if (viewTrigger) goToView(viewTrigger.dataset.view);
    });
    $('#reviewCta').addEventListener('click', () => goToView('review'));
    $('#checkinCta').addEventListener('click', () => goToView('review'));
    $('#saveReview').addEventListener('click', saveReview);
    $('#exportButton').addEventListener('click', exportState);
    $('#helpButton').addEventListener('click', openHelp);
    $('#editMemoButton').addEventListener('click', openMemoEditor);
    $('#modalClose').addEventListener('click', closeModal);
    $$('[data-close-modal]').forEach((item) => item.addEventListener('click', closeModal));
    $('#menuToggle').addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-mobile-open');
      $('#menuToggle').setAttribute('aria-expanded', String(open));
    });
    $('#librarySearch').addEventListener('input', renderLibrary);
    $('#libraryFilters').addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      libraryFilter = button.dataset.filter;
      $$('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      renderLibrary();
    });
    $('#saveStrategy').addEventListener('click', () => {
      state.notes.strategy = $('#strategyNote').value.trim() || defaultState().notes.strategy;
      persist();
      showToast('Strategia aggiornata');
    });
    $('#trainingWeek').addEventListener('click', (event) => {
      const button = event.target.closest('[data-training-id]');
      if (!button) return;
      const id = button.dataset.trainingId;
      state.training[id] = !state.training[id];
      persist();
      renderObjectivesView();
      renderSkills();
      showToast(state.training[id] ? 'Sessione registrata' : 'Sessione rimossa');
    });
    $('#objectiveList').addEventListener('click', (event) => {
      const button = event.target.closest('[data-objective-id]');
      if (button) editObjective(button.dataset.objectiveId);
    });
    $('#editProfileButton').addEventListener('click', () => {
      goToView('diet');
      $('#dietWeight').focus();
    });
    $('#saveDietProfile').addEventListener('click', saveDietProfile);
    $('#generateDietButton').addEventListener('click', () => {
      renderNutrition();
      showToast('Piano dieta rigenerato');
    });
    $('#mealTabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-meal-day]');
      if (!button) return;
      activeMealDay = button.dataset.mealDay;
      $$('.meal-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      renderNutrition();
    });
    $('#skillWeek').addEventListener('click', (event) => {
      const button = event.target.closest('[data-skill-session]');
      if (!button) return;
      if (button.dataset.linkedTraining) {
        const trainingId = button.dataset.linkedTraining;
        state.training[trainingId] = !state.training[trainingId];
      } else {
        const sessionId = button.dataset.skillSession;
        state.skills[sessionId] = !state.skills[sessionId];
      }
      persist();
      renderSkills();
      renderObjectivesView();
      showToast('Piano skill aggiornato');
    });
    setupReviewEvents();
  }

  function init() {
    updateHeader();
    renderOverview();
    renderReview();
    renderObjectivesView();
    renderDietForm();
    renderNutrition();
    renderSkills();
    renderLibrary();
    renderStrategy();
    bindEvents();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  init();
})();
