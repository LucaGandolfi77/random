const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const SETTINGS_KEY = "signal-check-settings-v1";
const APP_TITLE = "Signal Check";
const ANALYSIS_IDLE_MS = 2600;
const MAX_TRANSCRIPT_SEGMENTS = 40;
const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const DEFAULT_FREE_MODELS = [
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free"
];

const state = {
  recognition: null,
  supportsRecognition: Boolean(RecognitionCtor),
  shouldKeepListening: false,
  isListening: false,
  isAnalyzing: false,
  pendingAnalyze: false,
  analyzeTimer: null,
  transcriptSegments: [],
  interimTranscript: "",
  analysisHistory: [],
  lastAnalyzedSegmentCount: 0,
  freeModels: [...DEFAULT_FREE_MODELS],
  deferredInstallPrompt: null,
  lastError: "",
  settingsHint: "The API key is stored locally in this browser only.",
  settingsHintIsError: false,
  settings: loadSettings()
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindEvents();
  renderModelSuggestions();
  renderSettings();
  renderTranscript();
  renderAnalysis();
  renderStatus();
  setupPwa();

  if (navigator.onLine) {
    refreshFreeModels({ silent: true }).catch(() => {
      // The UI already retains default suggestions if discovery fails.
    });
  }
});

function cacheDom() {
  dom.installButton = document.getElementById("installButton");
  dom.startButton = document.getElementById("startButton");
  dom.stopButton = document.getElementById("stopButton");
  dom.analyzeButton = document.getElementById("analyzeButton");
  dom.clearButton = document.getElementById("clearButton");
  dom.statusText = document.getElementById("statusText");
  dom.signalDot = document.getElementById("signalDot");
  dom.micSupportBadge = document.getElementById("micSupportBadge");
  dom.onlineBadge = document.getElementById("onlineBadge");
  dom.modelBadge = document.getElementById("modelBadge");
  dom.segmentCount = document.getElementById("segmentCount");
  dom.transcriptFeed = document.getElementById("transcriptFeed");
  dom.transcriptEmpty = document.getElementById("transcriptEmpty");
  dom.interimBox = document.getElementById("interimBox");
  dom.interimText = document.getElementById("interimText");
  dom.settingsForm = document.getElementById("settingsForm");
  dom.apiKeyInput = document.getElementById("apiKeyInput");
  dom.modelInput = document.getElementById("modelInput");
  dom.languageSelect = document.getElementById("languageSelect");
  dom.autoAnalyzeInput = document.getElementById("autoAnalyzeInput");
  dom.refreshModelsButton = document.getElementById("refreshModelsButton");
  dom.modelSuggestions = document.getElementById("modelSuggestions");
  dom.settingsHint = document.getElementById("settingsHint");
  dom.analysisStateBadge = document.getElementById("analysisStateBadge");
  dom.analysisEmpty = document.getElementById("analysisEmpty");
  dom.analysisContent = document.getElementById("analysisContent");
  dom.summaryText = document.getElementById("summaryText");
  dom.notesText = document.getElementById("notesText");
  dom.reliabilityBadge = document.getElementById("reliabilityBadge");
  dom.factCheckList = document.getElementById("factCheckList");
  dom.extraContextList = document.getElementById("extraContextList");
  dom.followUpList = document.getElementById("followUpList");
  dom.historyList = document.getElementById("historyList");
}

function bindEvents() {
  dom.installButton.addEventListener("click", promptInstall);
  dom.startButton.addEventListener("click", startListening);
  dom.stopButton.addEventListener("click", stopListening);
  dom.analyzeButton.addEventListener("click", () => {
    queueAnalysis({ force: true, immediate: true });
  });
  dom.clearButton.addEventListener("click", clearSession);
  dom.refreshModelsButton.addEventListener("click", () => {
    refreshFreeModels({ silent: false }).catch(() => {
      // Errors are rendered in the UI.
    });
  });
  dom.settingsForm.addEventListener("input", handleSettingsChange);
  window.addEventListener("online", handleNetworkChange);
  window.addEventListener("offline", handleNetworkChange);
}

function loadSettings() {
  const defaults = {
    apiKey: "",
    modelId: DEFAULT_FREE_MODELS[0],
    language: "en-US",
    autoAnalyze: true
  };

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : defaults.apiKey,
      modelId: typeof parsed.modelId === "string" ? parsed.modelId : defaults.modelId,
      language: typeof parsed.language === "string" ? parsed.language : defaults.language,
      autoAnalyze: typeof parsed.autoAnalyze === "boolean" ? parsed.autoAnalyze : defaults.autoAnalyze
    };
  } catch (error) {
    return defaults;
  }
}

function saveSettings() {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function renderSettings() {
  dom.apiKeyInput.value = state.settings.apiKey;
  dom.modelInput.value = state.settings.modelId;
  dom.languageSelect.value = state.settings.language;
  dom.autoAnalyzeInput.checked = state.settings.autoAnalyze;
  dom.settingsHint.textContent = state.settingsHint;
  dom.settingsHint.classList.toggle("is-error", state.settingsHintIsError);
}

function handleSettingsChange() {
  state.settings.apiKey = dom.apiKeyInput.value.trim();
  state.settings.modelId = dom.modelInput.value.trim();
  state.settings.language = dom.languageSelect.value;
  state.settings.autoAnalyze = dom.autoAnalyzeInput.checked;
  state.settingsHint = "The API key is stored locally in this browser only.";
  state.settingsHintIsError = false;
  state.lastError = "";

  if (state.recognition) {
    state.recognition.lang = state.settings.language;
  }

  saveSettings();
  renderSettings();
  renderStatus();
}

function handleNetworkChange() {
  renderStatus();
}

function renderModelSuggestions() {
  const uniqueModels = [...new Set(state.freeModels.filter(Boolean))].sort((left, right) => left.localeCompare(right));
  dom.modelSuggestions.innerHTML = uniqueModels
    .map((modelId) => `<option value="${escapeHtml(modelId)}"></option>`)
    .join("");
}

async function refreshFreeModels({ silent }) {
  if (!navigator.onLine) {
    if (!silent) {
      setSettingsHint("You are offline. Model discovery needs a network connection.", true);
    }
    return;
  }

  dom.refreshModelsButton.disabled = true;
  dom.refreshModelsButton.textContent = "Loading...";

  const headers = {
    Accept: "application/json"
  };

  if (state.settings.apiKey) {
    headers.Authorization = `Bearer ${state.settings.apiKey}`;
  }

  try {
    const payload = await requestWithRetries(
      OPENROUTER_MODELS_URL,
      {
        method: "GET",
        headers
      },
      1
    );

    const remoteModels = Array.isArray(payload?.data)
      ? payload.data
          .map((entry) => entry?.id)
          .filter((modelId) => typeof modelId === "string" && modelId.endsWith(":free"))
      : [];

    state.freeModels = [...new Set([...DEFAULT_FREE_MODELS, ...remoteModels])];
    renderModelSuggestions();

    if (!state.settings.modelId && state.freeModels.length > 0) {
      state.settings.modelId = state.freeModels[0];
      saveSettings();
      renderSettings();
    }

    if (!silent) {
      setSettingsHint(`Loaded ${state.freeModels.length} free models from OpenRouter.`, false);
    }
    renderStatus();
  } catch (error) {
    if (!silent) {
      setSettingsHint(error.message || "Could not load free models from OpenRouter.", true);
    }
  } finally {
    dom.refreshModelsButton.disabled = false;
    dom.refreshModelsButton.textContent = "Load free models";
  }
}

function startListening() {
  if (!state.supportsRecognition) {
    state.lastError = "This browser does not expose the Web Speech API. Use a recent Chrome or Edge build.";
    renderStatus();
    return;
  }

  if (!state.recognition) {
    state.recognition = buildRecognition();
  }

  state.shouldKeepListening = true;
  state.lastError = "";
  state.recognition.lang = state.settings.language;

  try {
    state.recognition.start();
  } catch (error) {
    if (!String(error?.message || error).includes("already started")) {
      state.lastError = "Microphone start failed. If the prompt was blocked, allow microphone access and try again.";
    }
  }

  renderStatus();
}

function stopListening() {
  state.shouldKeepListening = false;
  state.interimTranscript = "";

  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (error) {
      // Stopping an idle recognizer can throw in some implementations.
    }
  }

  state.isListening = false;
  renderTranscript();
  renderStatus();
}

function buildRecognition() {
  const recognition = new RecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = state.settings.language;

  recognition.onstart = () => {
    state.isListening = true;
    state.lastError = "";
    renderStatus();
  };

  recognition.onresult = (event) => {
    handleRecognitionResult(event);
  };

  recognition.onerror = (event) => {
    const userInitiatedSession = state.shouldKeepListening || state.isListening;
    if (!userInitiatedSession) {
      return;
    }

    if (event.error === "no-speech") {
      state.lastError = "";
      renderStatus();
      return;
    }

    const message = recognitionErrorMessage(event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      state.shouldKeepListening = false;
    }
    state.lastError = message;
    renderStatus();
  };

  recognition.onend = () => {
    state.isListening = false;
    renderStatus();

    if (!state.shouldKeepListening) {
      return;
    }

    window.setTimeout(() => {
      if (!state.shouldKeepListening) {
        return;
      }

      try {
        recognition.lang = state.settings.language;
        recognition.start();
      } catch (error) {
        state.lastError = "The browser stopped continuous recognition. Press Start listening again.";
        renderStatus();
      }
    }, 450);
  };

  return recognition;
}

function handleRecognitionResult(event) {
  let interimText = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = normalizeTranscript(result?.[0]?.transcript);

    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      appendTranscriptSegment(transcript);
    } else {
      interimText += `${transcript} `;
    }
  }

  state.interimTranscript = normalizeTranscript(interimText);
  renderTranscript();

  if (state.settings.autoAnalyze) {
    queueAnalysis({ force: false, immediate: false });
  }
}

function appendTranscriptSegment(text) {
  const cleaned = normalizeTranscript(text);
  if (!cleaned) {
    return;
  }

  const previous = state.transcriptSegments[state.transcriptSegments.length - 1];
  if (previous && previous.text === cleaned) {
    return;
  }

  state.transcriptSegments.push({
    id: createId(),
    text: cleaned,
    createdAt: new Date().toISOString()
  });

  if (state.transcriptSegments.length > MAX_TRANSCRIPT_SEGMENTS) {
    const overflow = state.transcriptSegments.length - MAX_TRANSCRIPT_SEGMENTS;
    state.transcriptSegments.splice(0, overflow);
    state.lastAnalyzedSegmentCount = Math.max(0, state.lastAnalyzedSegmentCount - overflow);
  }
}

function clearSession() {
  state.transcriptSegments = [];
  state.interimTranscript = "";
  state.analysisHistory = [];
  state.lastAnalyzedSegmentCount = 0;
  state.pendingAnalyze = false;
  state.lastError = "";

  if (state.analyzeTimer) {
    window.clearTimeout(state.analyzeTimer);
    state.analyzeTimer = null;
  }

  renderTranscript();
  renderAnalysis();
  renderStatus();
}

function queueAnalysis({ force, immediate }) {
  if (state.analyzeTimer) {
    window.clearTimeout(state.analyzeTimer);
  }

  state.analyzeTimer = window.setTimeout(() => {
    state.analyzeTimer = null;
    analyzeTranscript({ force }).catch(() => {
      // Errors are surfaced through renderStatus.
    });
  }, immediate ? 0 : ANALYSIS_IDLE_MS);

  renderStatus();
}

async function analyzeTranscript({ force }) {
  if (state.isAnalyzing) {
    state.pendingAnalyze = true;
    return;
  }

  if (!state.settings.apiKey) {
    state.lastError = "Add an OpenRouter API key before running analysis.";
    renderStatus();
    return;
  }

  if (!state.settings.modelId) {
    state.lastError = "Pick an OpenRouter model id, ideally one ending in :free.";
    renderStatus();
    return;
  }

  if (!navigator.onLine) {
    state.lastError = "You are offline. Speech capture can continue, but model analysis needs a network connection.";
    renderStatus();
    return;
  }

  const windowToAnalyze = buildAnalysisWindow({ force });
  if (!windowToAnalyze) {
    renderStatus();
    return;
  }

  state.isAnalyzing = true;
  state.lastError = "";
  renderStatus();

  try {
    const response = await requestWithRetries(
      OPENROUTER_CHAT_URL,
      {
        method: "POST",
        headers: buildChatHeaders(),
        body: JSON.stringify({
          model: state.settings.modelId,
          temperature: 0.2,
          max_tokens: 700,
          messages: buildAnalysisMessages(windowToAnalyze)
        })
      },
      2
    );

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenRouter returned an empty analysis payload.");
    }

    const analysis = normalizeAnalysis(parseJsonPayload(content));
    state.analysisHistory.unshift({
      id: createId(),
      createdAt: new Date().toISOString(),
      model: state.settings.modelId,
      heardSummary: analysis.heard_summary,
      factChecks: analysis.fact_checks,
      extraContext: analysis.extra_context,
      followUp: analysis.follow_up,
      reliability: analysis.overall_reliability,
      notes: analysis.notes
    });
    state.analysisHistory = state.analysisHistory.slice(0, 8);
    state.lastAnalyzedSegmentCount = state.transcriptSegments.length;
  } catch (error) {
    state.lastError = error.message || "Analysis failed.";
  } finally {
    state.isAnalyzing = false;
    renderAnalysis();
    renderStatus();

    if (state.pendingAnalyze) {
      state.pendingAnalyze = false;
      queueAnalysis({ force: true, immediate: true });
    }
  }
}

function buildAnalysisWindow({ force }) {
  const pendingSegments = state.transcriptSegments.slice(state.lastAnalyzedSegmentCount);
  const sourceSegments = pendingSegments.length > 0 || !force
    ? pendingSegments
    : state.transcriptSegments.slice(-4);

  if (!sourceSegments.length) {
    return null;
  }

  const freshText = joinSegments(sourceSegments);
  if (!force && freshText.length < 80) {
    return null;
  }

  return {
    recentContext: joinSegments(state.transcriptSegments.slice(-10)),
    freshExcerpt: freshText
  };
}

function buildAnalysisMessages({ recentContext, freshExcerpt }) {
  return [
    {
      role: "system",
      content: [
        "You are a careful live transcript analyst.",
        "Return JSON only.",
        "Do not invent sources, quotes, or certainties.",
        "Separate opinions from factual claims.",
        "If a claim cannot be checked confidently from general knowledge, mark it as unclear.",
        "Use this exact schema:",
        JSON.stringify({
          heard_summary: "string",
          overall_reliability: "low|medium|high",
          fact_checks: [
            {
              claim: "string",
              status: "supported|unclear|likely_false|opinion",
              explanation: "string",
              confidence: "low|medium|high"
            }
          ],
          extra_context: ["string"],
          follow_up: ["string"],
          notes: "string"
        })
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "Analyze the following live speech transcript.",
        "Summarize what was heard in 1-2 sentences.",
        "Add up to 3 cautious fact checks.",
        "Add up to 3 short pieces of helpful context.",
        "Add up to 3 follow-up questions or search prompts.",
        "If there are no concrete factual claims, return an empty fact_checks array and say that in notes.",
        "Recent transcript context:",
        recentContext,
        "Fresh excerpt to prioritize:",
        freshExcerpt
      ].join("\n\n")
    }
  ];
}

function buildChatHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.settings.apiKey}`,
    "X-Title": APP_TITLE
  };

  if (window.location.protocol.startsWith("http")) {
    headers["HTTP-Referer"] = window.location.origin;
  }

  return headers;
}

async function requestWithRetries(url, options, retries) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Temporary OpenRouter failure: ${response.status}`);
        if (attempt < retries) {
          await delay(400 * (attempt + 1));
          continue;
        }
      }

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`OpenRouter request failed with ${response.status}: ${payload}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(400 * (attempt + 1));
      }
    }
  }

  throw lastError || new Error("Unknown request failure.");
}

function parseJsonPayload(content) {
  const stripped = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}$/);
  if (!jsonMatch) {
    throw new Error("The model did not return JSON.");
  }

  return JSON.parse(jsonMatch[0]);
}

function normalizeAnalysis(payload) {
  return {
    heard_summary: safeString(payload?.heard_summary, "No clear summary was produced."),
    overall_reliability: normalizeChoice(payload?.overall_reliability, ["low", "medium", "high"], "medium"),
    fact_checks: normalizeFactChecks(payload?.fact_checks),
    extra_context: normalizeStringArray(payload?.extra_context, 3),
    follow_up: normalizeStringArray(payload?.follow_up, 3),
    notes: safeString(payload?.notes, "No additional notes.")
  };
}

function normalizeFactChecks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 3).map((entry) => ({
    claim: safeString(entry?.claim, "Unnamed claim"),
    status: normalizeChoice(entry?.status, ["supported", "unclear", "likely_false", "opinion"], "unclear"),
    explanation: safeString(entry?.explanation, "No explanation returned."),
    confidence: normalizeChoice(entry?.confidence, ["low", "medium", "high"], "medium")
  }));
}

function normalizeStringArray(value, maxItems) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => safeString(entry, ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function renderTranscript() {
  dom.segmentCount.textContent = `${state.transcriptSegments.length} ${state.transcriptSegments.length === 1 ? "segment" : "segments"}`;
  dom.transcriptEmpty.hidden = state.transcriptSegments.length > 0 || Boolean(state.interimTranscript);
  dom.interimBox.hidden = !state.interimTranscript;
  dom.interimText.textContent = state.interimTranscript;

  const visibleSegments = [...state.transcriptSegments].slice(-10).reverse();
  dom.transcriptFeed.innerHTML = visibleSegments
    .map((segment, index) => `
      <article class="transcript-segment">
        <div class="segment-meta">
          <span>#${state.transcriptSegments.length - index}</span>
          <span>${formatClock(segment.createdAt)}</span>
        </div>
        <p class="segment-text">${escapeHtml(segment.text)}</p>
      </article>
    `)
    .join("");
}

function renderAnalysis() {
  const latest = state.analysisHistory[0];

  dom.analysisEmpty.hidden = Boolean(latest);
  dom.analysisContent.hidden = !latest;

  if (!latest) {
    dom.analysisStateBadge.textContent = state.isAnalyzing ? "Analyzing" : "Waiting";
    return;
  }

  dom.summaryText.textContent = latest.heardSummary;
  dom.notesText.textContent = latest.notes;
  dom.reliabilityBadge.textContent = `Reliability: ${capitalize(latest.reliability)}`;
  dom.reliabilityBadge.className = `badge-pill reliability-${latest.reliability}`;
  dom.analysisStateBadge.textContent = state.isAnalyzing ? "Analyzing" : `Updated ${formatRelativeTime(latest.createdAt)}`;

  if (latest.factChecks.length === 0) {
    dom.factCheckList.innerHTML = '<div class="fact-item unclear"><p>No concrete checkable claim was flagged in this pass.</p></div>';
  } else {
    dom.factCheckList.innerHTML = latest.factChecks
      .map((entry) => `
        <article class="fact-item ${entry.status.replace("_", "-")}">
          <div class="fact-topline">
            <span>${escapeHtml(entry.claim)}</span>
            <span class="fact-status">${escapeHtml(formatStatus(entry.status))}</span>
          </div>
          <p>${escapeHtml(entry.explanation)}</p>
          <p class="fact-confidence">Confidence: ${escapeHtml(capitalize(entry.confidence))}</p>
        </article>
      `)
      .join("");
  }

  dom.extraContextList.innerHTML = renderBulletList(latest.extraContext, "No extra context returned.");
  dom.followUpList.innerHTML = renderBulletList(latest.followUp, "No follow-up prompts returned.");
  dom.historyList.innerHTML = state.analysisHistory
    .slice(0, 4)
    .map((entry) => `
      <article class="history-item">
        <div class="history-meta">
          <span>${escapeHtml(shortModelId(entry.model))}</span>
          <span>${formatClock(entry.createdAt)}</span>
        </div>
        <p>${escapeHtml(entry.heardSummary)}</p>
      </article>
    `)
    .join("");
}

function renderBulletList(items, fallbackText) {
  if (!items.length) {
    return `<li>${escapeHtml(fallbackText)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderStatus() {
  setPillState(dom.micSupportBadge, state.supportsRecognition ? "Mic ready" : "Mic unsupported", state.supportsRecognition ? "good" : "danger");
  setPillState(dom.onlineBadge, navigator.onLine ? "Online" : "Offline", navigator.onLine ? "good" : "warn");
  setPillState(dom.modelBadge, state.settings.modelId ? shortModelId(state.settings.modelId) : "No model", state.settings.modelId ? "good" : "warn");

  dom.startButton.disabled = !state.supportsRecognition || state.isListening;
  dom.stopButton.disabled = !state.isListening && !state.shouldKeepListening;
  dom.analyzeButton.disabled = state.isAnalyzing || state.transcriptSegments.length === 0;

  let statusText = "Idle. Press Start listening to request microphone access.";
  let signalState = "idle";

  if (!state.supportsRecognition) {
    statusText = "Speech recognition is unavailable in this browser. Use recent Chrome or Edge over HTTPS or localhost.";
    signalState = "error";
  } else if (state.lastError) {
    statusText = state.lastError;
    signalState = "error";
  } else if (state.isAnalyzing) {
    statusText = "Sending the freshest transcript window to OpenRouter for context and fact-checking.";
    signalState = "busy";
  } else if (state.isListening) {
    statusText = state.settings.autoAnalyze
      ? "Listening continuously. Pause briefly and the app will analyze the last chunk automatically."
      : "Listening continuously. Press Analyze now whenever you want a context pass.";
    signalState = "live";
  } else if (state.analyzeTimer) {
    statusText = "Waiting for the speaker to pause before sending the next analysis request.";
    signalState = "busy";
  }

  dom.statusText.textContent = statusText;
  dom.signalDot.dataset.state = signalState;
  dom.analysisStateBadge.textContent = state.isAnalyzing
    ? "Analyzing"
    : state.analysisHistory[0]
      ? `Updated ${formatRelativeTime(state.analysisHistory[0].createdAt)}`
      : "Waiting";
}

function setPillState(element, label, variant) {
  element.textContent = label;
  element.className = `pill ${variant ? `is-${variant}` : ""}`.trim();
}

function setupPwa() {
  if (window.isSecureContext && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      state.lastError = "Service worker registration failed. The app still works online, but install/offline caching may be unavailable.";
      renderStatus();
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    dom.installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    dom.installButton.hidden = true;
  });
}

async function promptInstall() {
  if (!state.deferredInstallPrompt) {
    setSettingsHint("No install prompt is available yet. On mobile Safari, use Share > Add to Home Screen.", false);
    return;
  }

  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice.catch(() => null);
  state.deferredInstallPrompt = null;
  dom.installButton.hidden = true;
}

function setSettingsHint(message, isError) {
  state.settingsHint = message;
  state.settingsHintIsError = isError;
  renderSettings();
}

function joinSegments(segments) {
  return segments.map((segment) => segment.text).join(" ");
}

function normalizeTranscript(value) {
  return safeString(value, "").replace(/\s+/g, " ").trim();
}

function safeString(value, fallback) {
  return typeof value === "string" ? value.trim() : fallback;
}

function shortModelId(modelId) {
  if (!modelId) {
    return "No model";
  }

  return modelId.length > 30 ? `${modelId.slice(0, 27)}...` : modelId;
}

function formatStatus(status) {
  switch (status) {
    case "likely_false":
      return "Likely false";
    case "supported":
      return "Supported";
    case "opinion":
      return "Opinion";
    default:
      return "Unclear";
  }
}

function recognitionErrorMessage(code) {
  switch (code) {
    case "audio-capture":
      return "No microphone was found. Connect a mic or check browser permissions.";
    case "network":
      return "The browser speech service hit a network problem.";
    case "no-speech":
      return "No speech was detected. The app will keep trying while listening stays enabled.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow microphone access and try again.";
    default:
      return "Speech recognition stopped unexpectedly.";
  }
}

function formatClock(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(value) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const seconds = Math.max(1, Math.round(deltaMs / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}