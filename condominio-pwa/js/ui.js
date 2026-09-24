/* Scala B, Civico 0 — interfaccia */

import {
  APTS_PER_FLOOR,
  BOARD_REACTIONS,
  COMBOS,
  EPISODES,
  FLOORS,
  FURN_BY_ID,
  FURN_SLOTS,
  FURN_STORIES,
  FURNITURE,
  GOALS,
  LEVEL_COST,
  MAX_FLOOR,
  MAX_LEVEL,
  PITY_MAX,
  PULLS_PER_MULTI,
  RARITY,
  SAVE_KEY,
  seasonEvent,
  TENANT_BY_ID,
  TENANTS,
  TOUR_INTRO,
  TOUR_OUTRO,
} from "./data.js";
import {
  advanceTour,
  assemblyMinutes,
  availableStamps,
  boardNotices,
  canLevelUp,
  canPull,
  canUnlockFloor,
  checkCombos,
  claimDaily,
  claimGoal,
  checkEpisodes,
  collectionStats,
  dailyAvailable,
  doFavor,
  elevatorAvailable,
  ensureDiary,
  favorReady,
  favorRemaining,
  favorReward,
  findTenantHome,
  goalDone,
  goalProgress,
  grisLine,
  levelName,
  levelUp,
  ownedFurniture,
  placeFurniture,
  placeTenant,
  placedFurnitureIds,
  pull,
  reactToNotice,
  refreshStamps,
  removeFurnitureAt,
  removeTenant,
  selectStamp,
  startTour,
  tenantLine,
  tourStepData,
  unplacedTenants,
  unlockFloor,
  unlockedElevatorDests,
  visitElevator,
} from "./game.js";
import { load, save, reset, exportSave, importSave } from "./save.js";
import { sharePostcard } from "./postcard.js";
import { haptic, setSound, sfx } from "./audio.js";

/* ------------------------------------------------------------------ state */

let state = load();
let currentView = "palazzo";
let albumTab = "tenants";
let scrolledToBottom = false;
let toastTimer = null;
let favorTimer = null;
let favorTimerCtx = null;
let tickTimer = null;
let saveWarned = false;
let lastFocus = null;

const $ = (id) => document.getElementById(id);
const el = {
  resCrumbs: $("res-crumbs"),
  resFragments: $("res-fragments"),
  tower: $("tower"),
  viewPalazzo: $("view-palazzo"),
  doormanSay: $("doorman-say"),
  btnDaily: $("btn-daily"),
  dailySub: $("daily-sub"),
  btnVerbale: $("btn-verbale"),
  pityText: $("pity-text"),
  pityFill: $("pity-fill"),
  btnPull1: $("btn-pull-1"),
  btnPull10: $("btn-pull-10"),
  mailStats: $("mail-stats"),
  albumSub: $("album-sub"),
  albumBody: $("album-body"),
  albumTabs: $("album-tabs"),
  tabbar: $("tabbar"),
  backdrop: $("backdrop"),
  sheet: $("sheet"),
  sheetBody: $("sheet-body"),
  toast: $("toast"),
  toastText: $("toast-text"),
  reveal: $("reveal"),
  capsule: $("capsule"),
  revealStage: $("reveal-stage"),
  revealCard: $("reveal-card"),
  revealHint: $("reveal-hint"),
  revealSkip: $("reveal-skip"),
  revealSummary: $("reveal-summary"),
  summaryGrid: $("summary-grid"),
  summaryTitle: $("summary-title"),
  summaryClose: $("summary-close"),
  mailbox: $("mailbox"),
  btnSettings: $("btn-settings"),
  seasonBadge: $("season-badge"),
  btnBoard: $("btn-board"),
  btnElevator: $("btn-elevator"),
  btnTour: $("btn-tour"),
};

function persist() {
  if (save(state)) return true;
  if (!saveWarned) {
    saveWarned = true;
    toast("⚠️ Salvataggio non riuscito: spazio esaurito o archiviazione bloccata.", 4000);
  }
  return false;
}

function bump() {
  for (const pill of document.querySelectorAll(".pill")) {
    pill.classList.add("bump");
    setTimeout(() => pill.classList.remove("bump"), 200);
  }
}

function toast(msg, ms = 2400) {
  if (toastTimer) clearTimeout(toastTimer);
  el.toastText.textContent = msg;
  el.toast.hidden = false;
  el.toast.classList.remove("hide");
  toastTimer = setTimeout(() => {
    el.toast.classList.add("hide");
    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 260);
  }, ms);
}

function confetti(n = 26) {
  const colors = ["#f2b84b", "#d97757", "#7fa98b", "#a97bd1", "#5e93c9", "#fff6d8"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = 50 + (Math.random() * 40 - 20) + "%";
    c.style.top = "46%";
    c.style.background = colors[i % colors.length];
    c.style.setProperty("--dx", (Math.random() * 320 - 160) + "px");
    c.style.setProperty("--dy", (Math.random() * -260 - 90) + "px");
    c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    c.style.animationDelay = Math.random() * 0.14 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1800);
  }
}

/* ------------------------------------------------------------- rendering */

function renderHeader() {
  el.resCrumbs.textContent = state.crumbs.toLocaleString("it-IT");
  el.resFragments.textContent = state.fragments.toLocaleString("it-IT");
}

function aptMarkup(floor, index) {
  const apt = state.apartments[floor][index];
  if (!apt.tenant) {
    return `
      <button class="apt empty" data-floor="${floor}" data-index="${index}">
        <span class="win"><span class="tenant-face">＋</span></span>
        <span class="apt-empty-txt">Appartamento<br>vuoto</span>
      </button>`;
  }
  const t = TENANT_BY_ID[apt.tenant];
  const ready = favorReady(state, t.id);
  const furn = apt.furniture.filter(Boolean);
  return `
    <button class="apt" data-floor="${floor}" data-index="${index}">
      ${ready ? '<span class="ready">✦</span>' : ""}
      <span class="win"><span class="tenant-face">${t.emoji}</span></span>
      <span class="apt-name">${t.name}</span>
      <span class="furn-dots">${furn.map((f) => FURN_BY_ID[f].emoji).join("") || "&nbsp;"}</span>
    </button>`;
}

function renderTower() {
  const html = [];
  for (let f = MAX_FLOOR; f >= 1; f--) {
    if (f <= state.unlockedFloors) {
      html.push(`
        <section class="floor" data-floor="${f}">
          <div class="floor-tab">${f === state.unlockedFloors && f === MAX_FLOOR ? "Attico" : "Piano " + f}</div>
          <div class="apts">
            ${Array.from({ length: APTS_PER_FLOOR }, (_, i) => aptMarkup(f, i)).join("")}
          </div>
        </section>`);
    } else {
      const cost = FLOORS.find((x) => x.floor === f);
      const nextCost = FLOORS.find((x) => x.floor === state.unlockedFloors + 1);
      const can = f === state.unlockedFloors + 1 && canUnlockFloor(state);
      const isNext = f === state.unlockedFloors + 1;
      const c = isNext ? nextCost : cost;
      html.push(`
        <section class="floor locked" data-floor="${f}">
          <button class="unlock-btn ${can ? "can" : ""}" data-unlock="${f}" ${isNext ? "" : "disabled"}>
            <span class="ul-title">🔒 ${f === MAX_FLOOR ? "Attico" : "Piano " + f}</span>
            <span class="ul-note">${isNext ? c.note : "Sblocca prima i piani sottostanti."}</span>
            ${isNext ? `<span class="ul-cost">🌰 ${c.crumbs} 🧩 ${c.fragments}</span>` : ""}
          </button>
        </section>`);
    }
  }
  el.tower.innerHTML = html.join("");

  if (!scrolledToBottom && el.viewPalazzo) {
    requestAnimationFrame(() => {
      el.viewPalazzo.scrollTop = el.viewPalazzo.scrollHeight;
      scrolledToBottom = true;
    });
  }
}

const DOORMAN_LINES = [
  "La posta è arrivata in tre epoche diverse. Ho tenuto solo quelle di oggi.",
  "Nessun buco nero nel corridoio. È già qualcosa.",
  "Il gatto del portiere mi guarda male. Io sono il gatto del portiere.",
  "Assemblea rinviata: il martedì è ancora un pesce.",
  "Briciole? Ce ne sono. Burocrazia? Non ancora.",
  "Se sentite un tuono, non è un tuono. È Nuvola che sbadiglia.",
];

function doormanLine() {
  if (state.settings.grisIA) {
    const composed = grisLine(state, state.pulls + state.favorsDone);
    if (composed) return composed;
  }
  return DOORMAN_LINES[state.pulls % DOORMAN_LINES.length];
}

function renderEntrance() {
  const diaryAdded = ensureDiary(state);
  refreshStamps(state);
  const fresh = checkCombos(state);
  if (diaryAdded || fresh.length) persist();
  if (fresh.length) {
    const scene = fresh.find((x) => x.kind === "furnPast");
    if (scene) toast(`🛋️ Vita precedente: ${scene.title}`, 3200);
    else if (fresh[0].title) toast(`✨ Combinazione: ${fresh[0].title}`, 3200);
  }
  const can = dailyAvailable(state);
  el.btnDaily.disabled = !can;
  el.dailySub.textContent = can
    ? "90 briciole e 2 frammenti, senza moduli"
    : "Tornate domani: la buca fa pausa";
  const ev = seasonEvent();
  const base = doormanLine();
  el.doormanSay.textContent = `${ev.line} ${base}`;
  if (el.seasonBadge) el.seasonBadge.textContent = ev.label;
}

function renderCassetta() {
  el.pityText.textContent = `${state.pity}/${PITY_MAX}`;
  el.pityFill.style.width = Math.round((state.pity / PITY_MAX) * 100) + "%";
  el.btnPull1.disabled = !canPull(state, 1);
  el.btnPull10.disabled = !canPull(state, PULLS_PER_MULTI);

  const stats = collectionStats(state);
  el.mailStats.innerHTML = `
    <div class="stat"><b>${state.pulls}</b><span>bustine aperte</span></div>
    <div class="stat"><b>${state.favorsDone}</b><span>favori fatti</span></div>
    <div class="stat"><b>${stats.tenantsOwned + stats.furnitureOwned}</b><span>oggetti in album</span></div>`;
}

function renderAlbum() {
  const stats = collectionStats(state);
  el.albumSub.textContent = `${stats.tenantsOwned}/${stats.tenantsTotal} inquilini · ${stats.furnitureOwned}/${stats.furnitureTotal} arredi · ${stats.episodesDone}/${stats.episodesTotal} episodi`;

  if (albumTab === "tenants") {
    el.albumBody.innerHTML = `<div class="grid">${TENANTS.map((t) => {
      const owned = state.tenants[t.id];
      const rar = RARITY[t.rarity];
      return `
        <button class="card ${owned ? "" : "locked"}" style="--rar:${rar.color}" data-tenant="${t.id}">
          ${owned && owned.memories > 0 ? `<span class="badge-lvl">L${owned.level}</span>` : ""}
          ${owned && owned.memories > 0 ? "" : ""}
          <span class="c-emoji">${t.emoji}</span>
          <span class="c-name">${owned ? t.name : "? ? ?"}</span>
          <span class="c-rarity">${rar.label}</span>
          <span class="c-sub">${owned ? `Ricordi ${owned.memories}` : t.title.slice(0, 22) + "…"}</span>
        </button>`;
    }).join("")}</div>`;
  } else if (albumTab === "furniture") {
    const placed = placedFurnitureIds(state);
    el.albumBody.innerHTML = `<div class="grid">${FURNITURE.map((f) => {
      const count = state.furniture[f.id] || 0;
      const rar = RARITY[f.rarity];
      const owned = count > 0 || placed.has(f.id);
      return `
        <button class="card ${owned ? "" : "locked"}" style="--rar:${rar.color}" data-furn="${f.id}">
          <span class="c-emoji">${f.emoji}</span>
          <span class="c-name">${owned ? f.name : "? ? ?"}</span>
          <span class="c-rarity">${rar.label}</span>
          <span class="c-sub">${owned ? (placed.has(f.id) ? "In uso" : `×${count}`) : "Da scoprire"}</span>
        </button>`;
    }).join("")}</div>`;
  } else if (albumTab === "goals") {
    el.albumBody.innerHTML = `<div class="ep-list">${GOALS.map((g) => {
      const done = !!state.goals[g.id];
      const cur = goalProgress(state, g);
      const ready = !done && goalDone(state, g);
      const pct = Math.min(100, Math.round((cur / Math.max(1, g.target)) * 100));
      const reward = `🌰 ${g.crumbs}${g.fragments ? ` · 🧩 ${g.fragments}` : ""}`;
      return `
        <article class="ep ${done ? "done" : ready ? "ready" : "todo"}" data-goal="${g.id}">
          <h4>${done ? "✅" : ready ? "🎯" : "○"} ${g.title}</h4>
          <p>${g.desc}</p>
          ${
            done
              ? `<div class="ep-reward">Riscosso: ${reward}</div>`
              : `<div class="goal-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
                 <div class="goal-row">
                   <span class="ep-need">${cur}/${g.target}</span>
                   ${
                     ready
                       ? `<button class="btn-claim" data-claim="${g.id}">Riscuoti ${reward}</button>`
                       : `<span class="ep-reward">${reward}</span>`
                   }
                 </div>`
          }
        </article>`;
    }).join("")}</div>`;
  } else if (albumTab === "diary") {
    ensureDiary(state);
    const entries = [...(state.diary || [])].reverse();
    if (!entries.length) {
      el.albumBody.innerHTML = `<article class="ep todo"><h4>📝 Diario vuoto</h4><p>Il primo appunto arriva oggi. Il palazzo si ricorda una voce al giorno, senza fretta e senza penalità.</p></article>`;
    } else {
      el.albumBody.innerHTML = `<div class="ep-list diary-list">${entries
        .map(
          (e) => `
        <article class="ep done diary-entry">
          <h4>${e.emoji || "📝"} ${e.day}${e.season ? ` · ${e.season}` : ""}</h4>
          <p>${e.text}</p>
        </article>`
        )
        .join("")}</div>`;
    }
  } else if (albumTab === "memories") {
    const comboRows = COMBOS.map((c) => {
      const done = !!(state.combos && state.combos[c.id]);
      return `
        <article class="ep ${done ? "done" : "todo"}">
          <h4>${done ? "✨" : "🔒"} ${done ? c.title : "Combinazione impossibile"}</h4>
          <p>${done ? c.text : "Metti in relazione inquilino e arredo come indica la leggenda (stessa casa o stesso piano)."}</p>
          ${done ? "" : `<div class="ep-need">${TENANT_BY_ID[c.tenant].emoji} ${TENANT_BY_ID[c.tenant].name} + ${FURN_BY_ID[c.furniture].emoji} ${FURN_BY_ID[c.furniture].name} · ${c.where === "same-apt" ? "stessa casa" : "stesso piano"}</div>`}
        </article>`;
    }).join("");
    const pastRows = FURN_STORIES.map((s) => {
      const done = !!(state.furnPast && state.furnPast[s.id]);
      return `
        <article class="ep ${done ? "done" : "todo"}">
          <h4>${done ? "🛋️" : "🔒"} ${done ? s.title : "Vita precedente"}</h4>
          <p>${done ? s.text : "Arreda la casa di un inquilino specifico per scoprire il suo passato."}</p>
          ${done ? "" : `<div class="ep-need">${FURN_BY_ID[s.furniture].emoji} ${FURN_BY_ID[s.furniture].name} con ${TENANT_BY_ID[s.withTenant].emoji} ${TENANT_BY_ID[s.withTenant].name}</div>`}
        </article>`;
    }).join("");
    const nCombo = COMBOS.filter((c) => state.combos && state.combos[c.id]).length;
    const nPast = FURN_STORIES.filter((s) => state.furnPast && state.furnPast[s.id]).length;
    el.albumBody.innerHTML = `
      <div class="sh-section">Combinazioni ${nCombo}/${COMBOS.length}</div>
      <div class="ep-list">${comboRows}</div>
      <div class="sh-section">Vita precedente ${nPast}/${FURN_STORIES.length}</div>
      <div class="ep-list">${pastRows}</div>`;
  } else {
    el.albumBody.innerHTML = `<div class="ep-list">${EPISODES.map((ep) => {
      const done = !!state.episodes[ep.id];
      const need = ep.tenants
        ? ep.tenants.map((id) => TENANT_BY_ID[id].emoji + " " + TENANT_BY_ID[id].name).join(" + ")
        : `${TENANT_BY_ID[ep.tenant].emoji} ${TENANT_BY_ID[ep.tenant].name} + ${FURN_BY_ID[ep.furniture].emoji} ${FURN_BY_ID[ep.furniture].name}`;
      return `
        <article class="ep ${done ? "done" : "todo"}">
          <h4>${done ? "✅" : "🔒"} ${ep.title}</h4>
          <p>${ep.text}</p>
          ${done
            ? `<div class="ep-reward">Riscosso: 🌰 ${ep.crumbs} · 🧩 ${ep.fragments}</div>`
            : `<div class="ep-need">Servono nello stesso appartamento/piano:<br>${need}</div>`}
        </article>`;
    }).join("")}</div>`;
  }
}

function renderAll() {
  renderHeader();
  renderTower();
  renderEntrance();
  renderCassetta();
  renderAlbum();
}

/* spille "✦" sui finestroni, senza ricostruire il DOM */
function refreshReady() {
  for (const btn of el.tower.querySelectorAll(".apt[data-floor]")) {
    const floor = +btn.dataset.floor;
    const index = +btn.dataset.index;
    const apt = state.apartments[floor]?.[index];
    if (!apt || !apt.tenant) continue;
    const isReady = favorReady(state, apt.tenant);
    const badge = btn.querySelector(".ready");
    if (isReady && !badge) {
      const s = document.createElement("span");
      s.className = "ready";
      s.textContent = "✦";
      btn.prepend(s);
    } else if (!isReady && badge) {
      badge.remove();
    }
  }
}

/* ---------------------------------------------------------------- sheet */

function stopFavorTimer() {
  if (favorTimer !== null) {
    clearInterval(favorTimer);
    favorTimer = null;
  }
  favorTimerCtx = null;
}

/* promemoria locale del regalo: solo se l'utente ha attivato il toggle */
let lastDailyNudge = 0;
function maybeRemindDaily() {
  if (!state.settings.reminders) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!dailyAvailable(state)) return;
  const now = Date.now();
  if (now - lastDailyNudge < 60 * 60 * 1000) return;
  lastDailyNudge = now;
  try {
    new Notification("📬 Regalo del portiere", {
      body: "Gris ha lasciato 90 briciole e 2 frammenti. Senza moduli.",
      tag: "civico0-daily",
    });
  } catch {
    /* notifiche non supportate in questo contesto */
  }
}

/* sensore di orientamento: solo se l'utente ha attivato skyTilt */
function onDeviceOrientation(e) {
  if (!state.settings.skyTilt) return;
  const g = typeof e.gamma === "number" ? e.gamma : 0;
  const b = typeof e.beta === "number" ? e.beta : 0;
  const x = Math.max(-12, Math.min(12, g * 0.35));
  const y = Math.max(-8, Math.min(8, (b - 45) * 0.15));
  const sky = document.querySelector(".sky");
  if (sky) sky.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function applySkyTilt(on) {
  const sky = document.querySelector(".sky");
  if (on && typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  } else {
    if (typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("deviceorientation", onDeviceOrientation);
    }
    if (sky) sky.style.transform = "";
  }
}

function startTick() {
  if (tickTimer !== null) return;
  tickTimer = setInterval(() => {
    refreshReady();
    renderEntrance();
    maybeRemindDaily();
  }, 1000);
}

function stopTick() {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

/* sospende i timer senza dimenticare il contesto del foglio aperto,
   così al ritorno si può riprendere il countdown dove si era interrotto */
function pauseTimers() {
  stopTick();
  if (favorTimer !== null) {
    clearInterval(favorTimer);
    favorTimer = null;
  }
}

function resumeTimers() {
  startTick();
  refreshReady();
  renderEntrance();
  if (favorTimerCtx && !el.sheet.hidden) {
    const { floor, index } = favorTimerCtx;
    apartmentSheet(floor, index);
  }
}

function openSheet(html) {
  stopFavorTimer();
  lastFocus = document.activeElement;
  el.sheetBody.innerHTML = html;
  el.sheet.hidden = false;
  el.backdrop.hidden = false;
  const first = el.sheet.querySelector(
    "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
  );
  (first || el.sheet).focus({ preventScroll: true });
}

function closeSheet() {
  stopFavorTimer();
  const wasOpen = !el.sheet.hidden;
  el.sheet.hidden = true;
  el.backdrop.hidden = true;
  el.sheetBody.innerHTML = "";
  if (wasOpen && lastFocus && document.contains(lastFocus)) {
    lastFocus.focus({ preventScroll: true });
  }
  lastFocus = null;
}

function episodesJustDone(before) {
  const fresh = checkEpisodes(state);
  if (fresh.length) {
    const total = fresh.reduce((s, e) => s + e.crumbs, 0);
    const frag = fresh.reduce((s, e) => s + e.fragments, 0);
    confetti(30);
    toast(`✨ Episodio: ${fresh[0].title} · +${total} 🌰 +${frag} 🧩`, 3400);
    sfx.rare();
    return true;
  }
  return false;
}

function apartmentSheet(floor, index) {
  const apt = state.apartments[floor][index];
  if (!apt.tenant) return assignSheet(floor, index);
  const t = TENANT_BY_ID[apt.tenant];
  const info = state.tenants[t.id];
  const rar = RARITY[t.rarity];
  const ready = favorReady(state, t.id);
  const remain = favorRemaining(state, t.id);
  const reward = favorReward(state, t.id);
  const line = tenantLine(state, t.id);

  openSheet(`
    <div class="sh-head">
      <div class="sh-face">${t.emoji}</div>
      <div class="sh-titles">
        <h3>${t.name}</h3>
        <p>${t.title}</p>
        <span class="chip" style="--rar:${rar.color}">${rar.label} · L${info.level}</span>
      </div>
    </div>
    <div class="bubble">${line}</div>

    <div class="sh-actions">
      <button class="btn-soft ${ready ? "hot" : ""}" data-favor="${t.id}" ${ready ? "" : "disabled"}>
        <span>${ready ? "✦ " : "⏳ "}${t.favor.label}</span>
        <span class="cost">${ready ? `+${reward} 🌰` : Math.ceil(remain / 1000) + "s"}</span>
      </button>
    </div>

    <div class="sh-section">Arredo (${apt.furniture.filter(Boolean).length}/${FURN_SLOTS})</div>
    <div class="slots">
      ${apt.furniture.map((fid, s) => {
        const f = fid ? FURN_BY_ID[fid] : null;
        return `<button class="slot ${f ? "filled" : ""}" data-slot="${s}" data-floor="${floor}" data-index="${index}">
          ${f ? f.emoji : "＋"}<small>${f ? f.name : "vuoto"}</small>
        </button>`;
      }).join("")}
      <button class="slot" data-floor="${floor}" data-index="${index}" data-slot="${FURN_SLOTS}" disabled style="opacity:.45;pointer-events:none">
        <span>🚪</span><small>corridoio</small>
      </button>
    </div>

    <div class="sh-section">Gestione</div>
    <div class="sh-actions">
      <button class="btn-soft" data-move="${t.id}" data-floor="${floor}" data-index="${index}">
        <span>Cambia inquilino</span><span>→</span>
      </button>
      <button class="btn-soft danger" data-free-apt="${t.id}" data-floor="${floor}" data-index="${index}">
        <span>Libera l'appartamento</span><span>×</span>
      </button>
    </div>
    <p class="note">Livello ${info.level} · ${levelName(info.level)}. Più è alto, più il favore rende briciole. Ricordi a disposizione: ${info.memories}.</p>
  `);

  /* solo in cooldown serve un tick: quando era già pronto il bottone
     è abilitato e ri-renderizzare ogni secondo causava un loop */
  if (!ready) {
    favorTimerCtx = { floor, index };
    favorTimer = setInterval(() => {
      const btn = el.sheetBody.querySelector(`[data-favor="${t.id}"]`);
      if (el.sheet.hidden || !btn) return stopFavorTimer();
      if (favorReady(state, t.id)) {
        stopFavorTimer();
        apartmentSheet(floor, index);
        return;
      }
      const cost = btn.querySelector(".cost");
      if (cost) cost.textContent = Math.ceil(favorRemaining(state, t.id) / 1000) + "s";
    }, 1000);
  }
}

function assignSheet(floor, index) {
  const list = unplacedTenants(state);
  const apt = state.apartments[floor][index];
  const current = apt.tenant ? TENANT_BY_ID[apt.tenant] : null;

  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">🚪</div>
      <div class="sh-titles">
        <h3>Piano ${floor}, porta ${index + 1}</h3>
        <p>${current ? `Oggi ci abita ${current.name}` : "Appartamento libero, affitto invisibile"}</p>
      </div>
    </div>

    <div class="sh-section">Chi puoi ospitare</div>
    ${
      list.length
        ? `<div class="list">${list.map((t) => {
            const rar = RARITY[t.rarity];
            const info = state.tenants[t.id];
            return `
              <button class="row" data-place="${t.id}" data-floor="${floor}" data-index="${index}">
                <span class="row-emoji">${t.emoji}</span>
                <span class="row-main"><b>${t.name}</b><span>${t.title}</span></span>
                <span class="row-end">L${info.level}</span>
              </button>`;
          }).join("")}</div>`
        : `<p class="note">Non hai altri inquilini da sistemare. Apri una bustina nella Cassetta: la posta interdimensionale non delude mai (o quasi).</p>`
    }
    ${
      current
        ? `<div class="sh-actions"><button class="btn-soft danger" data-free-apt="${current.id}" data-floor="${floor}" data-index="${index}"><span>Libera per altri</span><span>×</span></button></div>`
        : ""
    }
    <p class="note">Suggerimento: metti sullo stesso piano gli inquilini che si sopportano a vicenda e potresti scoprire un episodio.</p>
  `);
}

function furniturePickerSheet(floor, index, slot) {
  const owned = ownedFurniture(state);
  const apt = state.apartments[floor][index];
  const currentId = apt.furniture[slot];

  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">🛋️</div>
      <div class="sh-titles">
        <h3>Cosa mettiamo qui?</h3>
        <p>Piano ${floor}, porta ${index + 1}, nicchia ${slot + 1}</p>
      </div>
    </div>
    ${
      owned.length
        ? `<div class="list">${owned.map((f) => {
            const isHere = apt.furniture.includes(f.id);
            const usable = isHere || f.available > 0;
            return `
              <button class="row" data-furn-place="${f.id}" data-floor="${floor}" data-index="${index}" data-slot="${slot}"
                ${usable ? "" : "disabled"}>
                <span class="row-emoji">${f.emoji}</span>
                <span class="row-main"><b>${f.name}</b><span>${f.blurb}</span></span>
                <span class="row-end ${usable ? "" : "cool"}">${isHere ? "qui" : f.available > 0 ? "libero " + f.available : "altrove"}</span>
              </button>`;
          }).join("")}</div>`
        : `<p class="note">Non hai ancora arredi. Alcuni escono dalle bustine, altri arrivano con gli episodi.</p>`
    }
    ${
      currentId
        ? `<div class="sh-actions"><button class="btn-soft danger" data-furn-remove="${currentId}" data-floor="${floor}" data-index="${index}" data-slot="${slot}"><span>Rimuovi ${FURN_BY_ID[currentId].name}</span><span>×</span></button></div>`
        : ""
    }
  `);
}

function tenantSheet(tenantId) {
  const t = TENANT_BY_ID[tenantId];
  const info = state.tenants[tenantId];
  if (!info) {
    openSheet(`
      <div class="sh-head">
        <div class="sh-face plain">${t.emoji}</div>
        <div class="sh-titles">
          <h3>? ? ?</h3>
          <p>${t.title}</p>
          <span class="chip" style="--rar:${RARITY[t.rarity].color}">${RARITY[t.rarity].label}</span>
        </div>
      </div>
      <div class="bubble">Questo inquilino non ha ancora sbussato alla porta. Cerca la sua bustina nella Cassetta.</div>
      <div class="sh-actions">
        <button class="btn-soft" data-goto="cassetta"><span>Vai alla Cassetta</span><span>📬</span></button>
      </div>`);
    return;
  }
  const home = findTenantHome(state, tenantId);
  const canGo = canLevelUp(state, tenantId);
  openSheet(`
    <div class="sh-head">
      <div class="sh-face">${t.emoji}</div>
      <div class="sh-titles">
        <h3>${t.name}</h3>
        <p>${t.title}</p>
        <span class="chip" style="--rar:${RARITY[t.rarity].color}">${RARITY[t.rarity].label} · L${info.level}</span>
      </div>
    </div>
    <div class="bubble">${tenantLine(state, tenantId)}</div>

    <div class="sh-section">Livello ${info.level} — ${levelName(info.level)}</div>
    <div class="sh-actions">
      <button class="btn-soft ${canGo ? "hot" : ""}" data-levelup="${tenantId}" ${canGo ? "" : "disabled"}>
        <span>${info.level >= MAX_LEVEL ? "Già al massimo" : `Potenzia con ${LEVEL_COST} ricordo`}</span>
        <span class="cost">${info.memories} ricordi</span>
      </button>
      ${
        home
          ? `<button class="btn-soft" data-goto-apt="${tenantId}"><span>Casa: piano ${home.floor}, porta ${home.index + 1}</span><span>→</span></button>`
          : `<button class="btn-soft" data-goto="palazzo"><span>Non ha ancora una casa</span><span>→</span></button>`
      }
    </div>
    <p class="note">I doppioni diventano ricordi: servono a far salire di livello l'inquilino, sbloccando nuove battute e favori più redditizi.</p>
  `);
}

function furnitureSheet(furnitureId) {
  const f = FURN_BY_ID[furnitureId];
  const count = state.furniture[furnitureId] || 0;
  const placed = placedFurnitureIds(state).has(furnitureId);
  const owned = count > 0 || placed;
  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">${f.emoji}</div>
      <div class="sh-titles">
        <h3>${owned ? f.name : "? ? ?"}</h3>
        <p>${owned ? f.blurb : "Arredo ancora sconosciuto"}</p>
        <span class="chip" style="--rar:${RARITY[f.rarity].color}">${RARITY[f.rarity].label}</span>
      </div>
    </div>
    ${
      owned
        ? `<div class="bubble">In cantina: ${count} · In uso: ${placed ? "sì" : "no"}. Gli arredi non fanno niente di magico, ma un appartamento arredato è un appartamento che sembra vissuto.</div>`
        : `<div class="bubble">Non lo hai ancora. Le probabilità sono nella Cassetta, scritte in caratteri leggibili.</div>`
    }
    <div class="sh-actions">
      <button class="btn-soft" data-goto="palazzo"><span>Vai al palazzo</span><span>🏢</span></button>
    </div>`);
}

function settingsSheet() {
  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">⚙️</div>
      <div class="sh-titles"><h3>Impostazioni</h3><p>La vita privata del condominio</p></div>
    </div>

    <div class="setting-row">
      <span>🔔 Suoni</span>
      <button class="switch ${state.settings.sound ? "on" : ""}" data-toggle="sound" aria-label="Suoni"></button>
    </div>
    <div class="setting-row">
      <span>📳 Vibrazione</span>
      <button class="switch ${state.settings.haptics ? "on" : ""}" data-toggle="haptics" aria-label="Vibrazione"></button>
    </div>
    <div class="setting-row">
      <span>🐱 Gris IA locale</span>
      <button class="switch ${state.settings.grisIA ? "on" : ""}" data-toggle="grisIA" aria-label="Gris IA locale"></button>
    </div>
    <p class="note">Gris componi le battute in locale (niente rete, niente modelli). Se lo spegni, torna alle battute classiche.</p>
    <div class="setting-row">
      <span>🔔 Promemoria regalo (notifiche)</span>
      <button class="switch ${state.settings.reminders ? "on" : ""}" data-toggle="reminders" aria-label="Promemoria regalo"></button>
    </div>
    <p class="note">Notifiche locali del solo dispositivo, solo se le autorizzi. Nessun server, nessun account.</p>
    <div class="setting-row">
      <span>📿 Inclina il cielo (sensore)</span>
      <button class="switch ${state.settings.skyTilt ? "on" : ""}" data-toggle="skyTilt" aria-label="Inclina il cielo"></button>
    </div>
    <p class="note">Sensore di orientamento solo se lo attivi tu. Se lo lasci spento, il cielo resta fermo.</p>

    <div class="sh-section">Condividi e salva</div>
    <div class="sh-actions stamps-row" id="stamps-row">
      ${
        availableStamps(state).length
          ? availableStamps(state)
              .map(
                (s) =>
                  `<button class="stamp-chip ${state.selectedStamp === s.id ? "on" : ""}" data-stamp="${s.id}" aria-pressed="${state.selectedStamp === s.id}">${s.emoji}<span>${s.label}</span></button>`
              )
              .join("") +
          `<button class="stamp-chip ${!state.selectedStamp ? "on" : ""}" data-stamp="" aria-pressed="${!state.selectedStamp}">🚫<span>Nessuno</span></button>`
          : `<p class="note">Francobolli: ancora nessuno sbloccato. Combinazioni, episodi e diario ne aprono qualcuno.</p>`
      }
    </div>
    <div class="sh-actions">
      <button class="btn-soft" id="btn-postcard"><span>🖼️ Cartolina PNG</span><span>↗</span></button>
      <button class="btn-soft" id="btn-export"><span>⬇️ Esporta salvataggio</span><span>↓</span></button>
      <button class="btn-soft" id="btn-import"><span>⬆️ Importa salvataggio</span><span>↑</span></button>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <p class="note">La cartolina e il salvataggio restano su questo dispositivo finché non li condividi tu (Web Share API). Il francobollo selezionato appare sulla PNG.</p>

    <div class="sh-section">Il palazzo</div>
    <div class="sh-actions">
      <button class="btn-soft" id="btn-install"><span>📲 Installa sul telefono</span><span>›</span></button>
      <button class="btn-soft danger" id="btn-reset"><span>Azzera la partita</span><span>×</span></button>
    </div>
    <p class="note">Scala B, Civico 0 · v${state.v || 3} — tutto resta sul tuo dispositivo, niente account, niente acquisti. Gioca offline quanto vuoi: il gatto del portiere non manda bollette.</p>
  `);

  $("btn-reset").onclick = () => {
    if (!confirm("Davvero azzerare? Inquilini, arredi ed episodi spariranno nel nulla (così come il martedì).")) return;
    const fresh = reset();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, fresh);
    persist();
    closeSheet();
    renderAll();
    toast("Palazzo svuotato. Si riparte da 180 briciole.");
    haptic([20, 40, 20]);
  };

  $("btn-install").onclick = () => {
    closeSheet();
    if (window.__deferredPrompt) {
      window.__deferredPrompt.prompt();
      window.__deferredPrompt = null;
    } else {
      toast("Apri il menu del browser → “Aggiungi a Home”. Funziona anche offline.");
    }
  };

  $("btn-postcard").onclick = async () => {
    sfx.tap();
    const res = await sharePostcard(state);
    if (res.ok) toast(res.mode === "share" ? "Cartolina condivisa! 🖼️" : "Cartolina scaricata! 🖼️");
    else if (res.aborted) toast("Cartolina non condivisa.");
    else toast(res.msg || "Cartolina non riuscita.");
  };

  $("btn-export").onclick = () => {
    sfx.tap();
    const exp = exportSave(state);
    if (!exp.ok) return toast("Esportazione fallita.");
    try {
      const blob = new Blob([exp.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `civico0-save-v${state.v}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Salvataggio esportato. ⬇️");
    } catch {
      toast("Download non riuscito.");
    }
  };

  $("btn-import").onclick = () => {
    sfx.tap();
    const input = $("import-file");
    if (input) input.click();
  };

  const stampRow = $("stamps-row");
  if (stampRow) {
    stampRow.onclick = (e) => {
      const chip = e.target.closest("[data-stamp]");
      if (!chip) return;
      sfx.tap();
      const id = chip.dataset.stamp || null;
      const res = selectStamp(state, id);
      if (!res.ok) return toast(res.msg || "Francobollo non disponibile.");
      persist();
      for (const c of stampRow.querySelectorAll("[data-stamp]")) {
        const on = (c.dataset.stamp || null) === (state.selectedStamp || null);
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      }
      toast(res.stamp ? `${res.stamp.emoji} Francobollo: ${res.stamp.label}` : "Francobollo rimosso.");
    };
  }

  const importInput = $("import-file");
  if (importInput) {
    importInput.onchange = async () => {
      const file = importInput.files && importInput.files[0];
      importInput.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const res = importSave(text);
        if (!res.ok) return toast(res.msg);
        for (const k of Object.keys(state)) delete state[k];
        Object.assign(state, res.state);
        persist();
        closeSheet();
        renderAll();
        toast("Salvataggio importato. Benvenuto! ⬆️");
        haptic([16, 30, 16]);
      } catch {
        toast("Lettura file fallita.");
      }
    };
  }
}

/* ------------------------------------------------------------- verbali */

let verbaleSeed = 0;

function verbaleSheet() {
  const text = assemblyMinutes(state, verbaleSeed);
  const html = text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `<p>${line}</p>`))
    .join("");
  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">📋</div>
      <div class="sh-titles">
        <h3>Verbale dell'assemblea</h3>
        <p>Scala B · seduta di data incerta</p>
      </div>
    </div>
    <div class="verbale-body">${html}</div>
    <div class="sh-actions">
      <button class="btn-soft" id="btn-verbale-new"><span>Altro verbale</span><span>↻</span></button>
      <button class="btn-soft" id="btn-verbale-close"><span>Chiudi</span><span>×</span></button>
    </div>
    <p class="note">Generato in locale dai tuoi inquilini, episodi e arredi: nessuna rete, nessuna cloud, solo burocrazia assurda.</p>
  `);
  $("btn-verbale-new").onclick = () => {
    verbaleSeed += 1;
    sfx.tap();
    verbaleSheet();
  };
  $("btn-verbale-close").onclick = () => {
    sfx.tap();
    closeSheet();
  };
}

/* ------------------------------------------- bacheca / ascensore / visita */

function boardSheet() {
  const day = new Date();
  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const notices = boardNotices(state, dayKey);
  const stamped = state.boardReactions && state.boardReactions[dayKey];
  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">📌</div>
      <div class="sh-titles"><h3>Bacheca condominiale</h3><p>${dayKey}${stamped ? " · timbrato" : ""}</p></div>
    </div>
    <div class="board-list">
      ${notices
        .map(
          (n) => `
        <article class="ep board-notice" data-notice="${n.id}">
          <h4>${n.from ? n.from.emoji : "📌"} Avviso</h4>
          <p>${n.text}</p>
        </article>`
        )
        .join("")}
    </div>
    <div class="sh-section">Timbra</div>
    <div class="sh-actions stamps-row">
      ${BOARD_REACTIONS.map(
        (r) =>
          `<button class="stamp-chip ${stamped === r.id ? "on" : ""}" data-react="${r.id}" aria-pressed="${stamped === r.id}">${r.emoji}<span>${r.label}</span></button>`
      ).join("")}
    </div>
    <p class="note">I timbri restano solo su questo dispositivo. Nessuna assemblea, nessun voto online.</p>
  `);
}

function elevatorSheet() {
  const dests = unlockedElevatorDests(state);
  const visited = state.elevator || {};
  openSheet(`
    <div class="sh-head">
      <div class="sh-face plain">🛗</div>
      <div class="sh-titles"><h3>Ascensore impossibile</h3><p>Destinazioni fuori dalla geometria</p></div>
    </div>
    <div class="ep-list">
      ${dests
        .map(
          (d) => `
        <article class="ep ${visited[d.id] ? "done" : "todo"}">
          <h4>${d.emoji} ${d.title}</h4>
          <p>${visited[d.id] ? d.text : "Tocca per salire. Nessuna penalità se resti chiuso dentro."}</p>
          <div class="sh-actions">
            <button class="btn-soft ${visited[d.id] ? "" : "hot"}" data-visit="${d.id}"><span>${visited[d.id] ? "Rivisita" : "Sali"}</span><span>→</span></button>
          </div>
        </article>`
        )
        .join("")}
    </div>
    <p class="note">Piani sbloccati con i progressi: più piani apri, più porte dell'ascensore funzionano (male).</p>
  `);
}

function tourSheet() {
  const stop = tourStepData(state, state.tourStep | 0);
  const done = state.tourDone || !stop;
  if (done) {
    openSheet(`
      <div class="sh-head">
        <div class="sh-face plain">👣</div>
        <div class="sh-titles"><h3>Visita finita</h3><p>${TOUR_OUTRO}</p></div>
      </div>
      <div class="sh-actions">
        <button class="btn-soft" id="btn-tour-restart"><span>Ricomincia la visita</span><span>↻</span></button>
        <button class="btn-soft" id="btn-tour-close"><span>Chiudi</span><span>×</span></button>
      </div>`);
    const r = $("btn-tour-restart");
    if (r)
      r.onclick = () => {
        startTour(state);
        persist();
        sfx.tap();
        tourSheet();
      };
    const c = $("btn-tour-close");
    if (c)
      c.onclick = () => {
        sfx.tap();
        closeSheet();
      };
    return;
  }

  let body = "";
  let action = "";
  if (stop.kind === "intro") {
    body = `<div class="bubble">${TOUR_INTRO}</div>`;
    action = `<button class="btn-soft hot" id="btn-tour-next"><span>Inizia dal piano 1</span><span>→</span></button>`;
  } else if (stop.kind === "floor") {
    const res = (stop.residents || [])
      .map((id) => (TENANT_BY_ID[id] ? `${TENANT_BY_ID[id].emoji} ${TENANT_BY_ID[id].name}` : null))
      .filter(Boolean);
    const line = res.length
      ? `Al piano ${stop.floor} abitano ${res.join(", ")}. Gris sussurra: ${tenantLine(state, res[0])}`
      : `Al piano ${stop.floor} c'è silenzio. Anche le scale hanno bisogno di una pausa.`;
    body = `
      <div class="sh-head">
        <div class="sh-face plain">🏢</div>
        <div class="sh-titles"><h3>Piano ${stop.floor}</h3><p>${res.length ? res.join(" · ") : "vuoto"}</p></div>
      </div>
      <div class="bubble">${line}</div>`;
    action = `<button class="btn-soft hot" id="btn-tour-next"><span>Avanti</span><span>→</span></button>`;
  } else {
    body = `<div class="bubble">${TOUR_OUTRO}</div>`;
    action = `<button class="btn-soft" id="btn-tour-close"><span>Fine visita</span><span>×</span></button>`;
  }

  openSheet(`
    ${body}
    <div class="sh-actions">${action}</div>
    <p class="note">Visita guidata basata sullo stato attuale: niente contenuti missabili.</p>
  `);

  const next = $("btn-tour-next");
  if (next)
    next.onclick = () => {
      sfx.tap();
      advanceTour(state);
      persist();
      tourSheet();
    };
  const cl = $("btn-tour-close");
  if (cl)
    cl.onclick = () => {
      sfx.tap();
      closeSheet();
      renderAll();
    };
}

/* --------------------------------------------------------------- gacha UI */

let revealQueue = [];
let revealIndex = 0;

function startReveal(results) {
  revealQueue = results;
  revealIndex = 0;
  el.reveal.hidden = false;
  el.capsule.hidden = false;
  el.revealCard.hidden = true;
  el.revealHint.hidden = true;
  el.revealSummary.hidden = true;
  el.capsule.style.animation = "";
  el.revealStage.focus({ preventScroll: true });
}

function showCard() {
  const r = revealQueue[revealIndex];
  const rar = RARITY[r.rarity];
  const isTenant = r.kind === "tenant";
  const title = r.item.name;
  const sub = isTenant ? r.item.title : r.item.blurb;
  let flag = "";
  if (r.isNew) flag = `<span class="rc-flag">NUOVO!</span>`;
  else if (r.memories) flag = `<span class="rc-flag dup">doppione → +1 ricordo</span>`;
  else if (r.fragments) flag = `<span class="rc-flag dup">doppione → +1 frammento</span>`;

  el.revealCard.style.setProperty("--rar", rar.color);
  el.revealCard.innerHTML = `
    <span class="rc-tag">${rar.label} · ${revealIndex + 1}/${revealQueue.length}</span>
    <span class="rc-emoji">${r.item.emoji}</span>
    <h3>${title}</h3>
    <p class="rc-title">${sub}</p>
    ${flag}
  `;
  el.capsule.hidden = true;
  el.revealCard.hidden = false;
  el.revealHint.hidden = false;
  el.revealStage.focus({ preventScroll: true });
  haptic(r.rarity === "epico" || r.rarity === "leggendario" ? [18, 30, 18] : 12);
  if (r.rarity === "leggendario") sfx.epic();
  else if (r.rarity === "epico") sfx.rare();
  else sfx.pop();
}

function showSummary() {
  el.capsule.hidden = true;
  el.revealCard.hidden = true;
  el.revealHint.hidden = true;
  el.revealSummary.hidden = false;
  const anyGood = revealQueue.some((r) => r.rarity === "epico" || r.rarity === "leggendario");
  const anyNew = revealQueue.some((r) => r.isNew);
  el.summaryTitle.textContent = anyGood
    ? "La posta è stata generosa"
    : anyNew
      ? "Qualcuno ha bussato alla porta"
      : "Busta aperta";
  el.summaryGrid.innerHTML = revealQueue
    .map((r, i) => {
      const rar = RARITY[r.rarity];
      return `<div class="sum-item" style="--rar:${rar.color};animation-delay:${i * 60}ms">
        <span class="si-emoji">${r.item.emoji}</span>
        <span class="si-name">${r.item.name}</span>
        <span class="si-flag">${r.isNew ? "nuovo" : r.memories ? "ricordo" : r.fragments ? "frammento" : rar.label}</span>
      </div>`;
    })
    .join("");
  if (anyGood) confetti(34);
  el.summaryClose.focus({ preventScroll: true });
}

function advanceReveal() {
  if (el.reveal.hidden) return;
  if (!el.capsule.hidden) {
    sfx.pop();
    haptic(14);
    showCard();
    return;
  }
  if (!el.revealCard.hidden) {
    revealIndex += 1;
    if (revealIndex >= revealQueue.length) showSummary();
    else showCard();
  }
}

function endReveal() {
  el.reveal.hidden = true;
  persist();
  renderAll();
}

function doPull(count) {
  if (!canPull(state, count)) {
    sfx.error();
    toast("Briciole insufficienti. Fai qualche favore in palazzo.");
    haptic(60);
    return;
  }
  const res = pull(state, count);
  if (!res.ok) {
    toast(res.msg);
    return;
  }
  el.mailbox.classList.remove("shake");
  void el.mailbox.offsetWidth;
  el.mailbox.classList.add("shake");
  sfx.favor();
  haptic(18);
  renderHeader();
  persist();
  startReveal(res.results);
}

/* --------------------------------------------------------------- events */

function setView(name) {
  currentView = name;
  for (const v of document.querySelectorAll(".view")) v.classList.toggle("active", v.id === "view-" + name);
  for (const b of el.tabbar.querySelectorAll(".tab-btn")) {
    const on = b.dataset.view === name;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  sfx.tap();
}

function bind() {
  el.tabbar.addEventListener("click", (e) => {
    const b = e.target.closest(".tab-btn");
    if (b) setView(b.dataset.view);
  });

  el.albumTabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    albumTab = b.dataset.tab;
    for (const t of el.albumTabs.children) {
      const on = t === b;
      t.classList.toggle("active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    }
    renderAlbum();
    sfx.tap();
  });

  el.btnSettings.onclick = () => {
    sfx.tap();
    settingsSheet();
  };

  el.btnVerbale.onclick = () => {
    sfx.tap();
    verbaleSheet();
  };

  el.btnBoard.onclick = () => {
    sfx.tap();
    boardSheet();
  };

  el.btnElevator.onclick = () => {
    sfx.tap();
    elevatorSheet();
  };

  el.btnTour.onclick = () => {
    sfx.tap();
    tourSheet();
  };

  el.btnPull1.onclick = () => doPull(1);
  el.btnPull10.onclick = () => doPull(PULLS_PER_MULTI);

  el.btnDaily.onclick = () => {
    const r = claimDaily(state);
    if (!r.ok) {
      toast(r.msg);
      return;
    }
    sfx.rare();
    haptic([14, 26, 14]);
    confetti(18);
    toast("📬 " + r.msg);
    persist();
    renderAll();
    bump();
  };

  el.tower.addEventListener("click", (e) => {
    const unlock = e.target.closest("[data-unlock]");
    if (unlock && !unlock.disabled) {
      const r = unlockFloor(state);
      if (!r.ok) {
        sfx.error();
        toast(r.msg);
        haptic(60);
        return;
      }
      sfx.unlock();
      haptic([16, 30, 16, 30, 40]);
      confetti(24);
      toast("🏢 " + r.msg);
      persist();
      renderAll();
      return;
    }
    const apt = e.target.closest(".apt");
    if (!apt) return;
    sfx.tap();
    haptic(8);
    const floor = +apt.dataset.floor;
    const index = +apt.dataset.index;
    if (state.apartments[floor][index].tenant) apartmentSheet(floor, index);
    else assignSheet(floor, index);
  });

  el.albumBody.addEventListener("click", (e) => {
    const c = e.target.closest("[data-claim]");
    if (c) {
      sfx.tap();
      haptic(12);
      const res = claimGoal(state, c.dataset.claim);
      if (res.ok) {
        toast(`Obiettivo! 🌰 +${res.crumbs}${res.fragments ? ` 🧩 +${res.fragments}` : ""}`);
        persist();
        renderAll();
      } else toast(res.msg);
      return;
    }
    const t = e.target.closest("[data-tenant]");
    if (t) {
      sfx.tap();
      return tenantSheet(t.dataset.tenant);
    }
    const f = e.target.closest("[data-furn]");
    if (f) {
      sfx.tap();
      return furnitureSheet(f.dataset.furn);
    }
  });

  el.backdrop.addEventListener("click", closeSheet);
  el.sheet.addEventListener("click", (e) => handleSheetClick(e));

  /* reveal */
  el.revealStage.addEventListener("click", advanceReveal);
  el.revealSkip.onclick = (e) => {
    e.stopPropagation();
    showSummary();
  };
  el.summaryClose.onclick = endReveal;

  /* tastiera: Escape chiuse, spazio/invio/freccia avanzano il reveal */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el.reveal.hidden) {
        e.preventDefault();
        if (el.revealSummary.hidden) showSummary();
        else endReveal();
        return;
      }
      if (!el.sheet.hidden) {
        e.preventDefault();
        closeSheet();
      }
      return;
    }
    if (el.reveal.hidden) return;
    if (e.key !== " " && e.key !== "Enter" && e.key !== "ArrowRight") return;
    const ae = document.activeElement;
    const onButton = ae && ae.tagName === "BUTTON";
    /* non rubare l'attivazione ai pulsanti già in focus */
    if (onButton && (e.key === " " || e.key === "Enter")) return;
    e.preventDefault();
    advanceReveal();
  });
}

function handleSheetClick(e) {
  const t = e.target;

  const react = t.closest("[data-react]");
  if (react) {
    const day = new Date();
    const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const r = reactToNotice(state, dayKey, react.dataset.react);
    if (!r.ok) return toast(r.msg);
    sfx.tap();
    haptic(14);
    persist();
    toast("📌 " + r.msg);
    boardSheet();
    return;
  }

  const visit = t.closest("[data-visit]");
  if (visit) {
    const r = visitElevator(state, visit.dataset.visit);
    if (!r.ok) {
      sfx.error();
      return toast(r.msg);
    }
    sfx.rare();
    haptic(16);
    if (r.first) confetti(16);
    persist();
    toast(`${r.dest.emoji} ${r.dest.text.slice(0, 90)}${r.dest.text.length > 90 ? "…" : ""}`, 4200);
    elevatorSheet();
    renderAll();
    return;
  }

  const goto = t.closest("[data-goto]");
  if (goto) {
    closeSheet();
    return setView(goto.dataset.goto);
  }

  const gotoApt = t.closest("[data-goto-apt]");
  if (gotoApt) {
    const home = findTenantHome(state, gotoApt.dataset.gotoApt);
    if (!home) return;
    closeSheet();
    setView("palazzo");
    setTimeout(() => apartmentSheet(home.floor, home.index), 180);
    return;
  }

  const fav = t.closest("[data-favor]");
  if (fav && !fav.disabled) {
    const r = doFavor(state, fav.dataset.favor);
    if (!r.ok) {
      sfx.error();
      toast(r.msg);
      return;
    }
    sfx.favor();
    haptic([12, 24, 12]);
    persist();
    renderAll();
    bump();
    closeSheet();
    return toast(`✦ ${r.msg}`);
  }

  const slot = t.closest(".slot[data-slot]");
  if (slot && slot.dataset.floor) {
    sfx.tap();
    return furniturePickerSheet(+slot.dataset.floor, +slot.dataset.index, +slot.dataset.slot);
  }

  const place = t.closest("[data-place]");
  if (place) {
    const r = placeTenant(state, place.dataset.place, +place.dataset.floor, +place.dataset.index);
    if (!r.ok) {
      sfx.error();
      return toast(r.msg);
    }
    sfx.rare();
    haptic(16);
    episodesJustDone();
    persist();
    closeSheet();
    renderAll();
    return toast("🏠 " + r.msg);
  }

  const move = t.closest("[data-move]");
  if (move) {
    const home = findTenantHome(state, move.dataset.move);
    if (home) removeTenant(state, move.dataset.move);
    persist();
    renderTower();
    return assignSheet(+move.dataset.floor, +move.dataset.index);
  }

  const freeApt = t.closest("[data-free-apt]");
  if (freeApt) {
    const r = removeTenant(state, freeApt.dataset.freeApt);
    if (!r.ok) return toast(r.msg);
    sfx.tap();
    persist();
    closeSheet();
    renderAll();
    return toast("🚪 " + r.msg);
  }

  const furnPlace = t.closest("[data-furn-place]");
  if (furnPlace && !furnPlace.disabled) {
    const r = placeFurniture(
      state,
      +furnPlace.dataset.floor,
      +furnPlace.dataset.index,
      +furnPlace.dataset.slot,
      furnPlace.dataset.furnPlace
    );
    if (!r.ok) {
      sfx.error();
      return toast(r.msg);
    }
    sfx.rare();
    haptic(14);
    episodesJustDone();
    persist();
    closeSheet();
    renderAll();
    return toast("🛋️ " + r.msg);
  }

  const furnRemove = t.closest("[data-furn-remove]");
  if (furnRemove) {
    const r = removeFurnitureAt(
      state,
      +furnRemove.dataset.floor,
      +furnRemove.dataset.index,
      +furnRemove.dataset.slot
    );
    if (!r.ok) return toast(r.msg);
    sfx.tap();
    persist();
    closeSheet();
    renderAll();
    return toast("🧺 " + r.msg);
  }

  const lvl = t.closest("[data-levelup]");
  if (lvl && !lvl.disabled) {
    const r = levelUp(state, lvl.dataset.levelup);
    if (!r.ok) {
      sfx.error();
      return toast(r.msg);
    }
    sfx.rare();
    haptic([14, 28, 14]);
    confetti(20);
    persist();
    renderAll();
    toast("⭐ " + r.msg);
    tenantSheet(lvl.dataset.levelup);
    return;
  }

  const tog = t.closest("[data-toggle]");
  if (tog) {
    const key = tog.dataset.toggle;
    state.settings[key] = !state.settings[key];
    tog.classList.toggle("on", state.settings[key]);
    if (key === "sound") setSound(state.settings.sound);
    window.__c0_haptics = state.settings.haptics;
    if (key === "haptics" && state.settings.haptics) haptic(20);
    if (key === "grisIA") renderEntrance();
    if (key === "skyTilt") applySkyTilt(state.settings.skyTilt);
    if (key === "reminders") {
      if (state.settings.reminders && typeof Notification !== "undefined" && Notification.requestPermission) {
        Notification.requestPermission().then((perm) => {
          if (perm !== "granted") {
            state.settings.reminders = false;
            const sw = document.querySelector('[data-toggle="reminders"]');
            if (sw) sw.classList.remove("on");
            persist();
          }
        }).catch(() => {
          state.settings.reminders = false;
          persist();
        });
      }
    }
    persist();
    sfx.tap();
  }
}

/* ------------------------------------------------------------------ init */

export function init() {
  setSound(state.settings.sound);
  window.__c0_haptics = state.settings.haptics;
  bind();
  renderAll();
  startTick();
  if (state.settings.skyTilt) applySkyTilt(true);

  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      persist();
      document.body.classList.add("anim-paused");
      pauseTimers();
    } else {
      document.body.classList.remove("anim-paused");
      resumeTimers();
    }
  });

  /* altra scheda che salva: se il suo salvataggio è più recente, lo adottiamo */
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== SAVE_KEY) return;
    if (e.newValue) {
      let incoming;
      try {
        incoming = JSON.parse(e.newValue);
      } catch {
        return;
      }
      if (!incoming || typeof incoming !== "object") return;
      if (Number.isFinite(+incoming.lastSeen) && +incoming.lastSeen <= state.lastSeen) return;
    }
    const fresh = load();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, fresh);
    closeSheet();
    renderAll();
    toast("Partita sincronizzata dall'altra scheda.");
  });

  /* Web Share Target / import da main.js */
  window.addEventListener("civico0:share", (e) => {
    const text = (e.detail && e.detail.text) || "";
    if (!text) return;
    toast("📨 Messaggio ricevuto: " + text.slice(0, 80));
  });
  window.addEventListener("civico0:imported", () => {
    const fresh = load();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, fresh);
    closeSheet();
    renderAll();
    toast("Salvataggio ricevuto e importato. ⬆️");
    haptic([16, 30, 16]);
  });
}

/* accesso per i test e per il debug della partita */
export function getState() {
  return state;
}

export function refresh() {
  renderAll();
}
