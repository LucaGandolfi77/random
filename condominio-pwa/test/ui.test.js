/* Test UI con jsdom: avvia davvero l'app e simula i tocchi. */

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

let passed = 0;
let failed = 0;
const t = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log("  ✓", name);
  } catch (err) {
    failed += 1;
    console.error("  ✗", name);
    console.error("   ", err.message);
  }
};

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8").replace(
  '<script type="module" src="js/main.js"></script>',
  ""
);

const dom = new JSDOM(html, {
  url: "http://localhost/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});

const w = dom.window;
const setGlobal = (k, v) => {
  if (v === undefined) return;
  try {
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  } catch {
    /* proprietà non sostituibile: si ignora */
  }
};
for (const k of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Node",
  "Event",
  "MouseEvent",
  "CustomEvent",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  const v = w[k];
  if (typeof v === "function" && /Request|Cancel|getComputed/.test(k)) setGlobal(k, v.bind(w));
  else setGlobal(k, v);
}
setGlobal("confirm", () => true);

/* PRNG con seme: le bustine dei test devono essere riproducibili */
(() => {
  let seed = 0x5eed01;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
})();

localStorage.clear();

const click = (elm, label = "click") => {
  if (!elm) throw new Error(`elemento mancante per ${label}`);
  elm.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
};
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

console.log("\nTest UI (jsdom)\n");

const ui = await import("../js/ui.js");
const saveMod = await import("../js/save.js");
ui.init();
const state = ui.getState();

t("init: la torre ha i piani e gli appartamenti", () => {
  const floors = $$("#tower .floor");
  if (!floors.length) throw new Error("nessun piano renderizzato");
  if ($$("#tower .apt").length !== 3) throw new Error("atteso 1 appartamento per piano sbloccato ×3");
  if (!$$("#tower .apt:not(.empty)").length) throw new Error("gli inquilini di partenza non compaiono");
});

t("init: risorse e viste iniziali", () => {
  if ($("#res-crumbs").textContent !== "180") throw new Error("briciole iniziali errate");
  if (!$("#view-palazzo").classList.contains("active")) throw new Error("vista palazzo non attiva");
  if ($$(".view").length !== 3) throw new Error("servono 3 viste");
  if ($$(".tab-btn").length !== 3) throw new Error("servono 3 tab");
});

t("aprire un appartamento mostra lo sheet con il favore", () => {
  click($("#tower .apt:not(.empty)"), "apt occupato");
  if ($("#sheet").hidden) throw new Error("sheet non aperto");
  if (!$("[data-favor]")) throw new Error("bottone favore assente");
  if (!$(".bubble")) throw new Error("balloon dialogo assente");
});

t("favore: +briciole, sheet chiuso, risorse aggiornate", () => {
  const before = state.crumbs;
  click($("[data-favor]"), "favore");
  if (state.crumbs <= before) throw new Error("briciole non aumentate");
  if (!$("#sheet").hidden) throw new Error("sheet non si è chiuso");
  if ($("#res-crumbs").textContent !== String(state.crumbs))
    throw new Error("header non aggiornato: " + $("#res-crumbs").textContent);
  if (state.favorsDone !== 1) throw new Error("conteggio favori errato");
});

t("il favore ora è in cooldown (nessun doppio guadagno)", () => {
  click($("#tower .apt:not(.empty)"), "apt");
  const btn = $("[data-favor]");
  if (!btn.disabled) throw new Error("doveva essere disabilitato");
  if (!/s\b/.test(btn.textContent)) throw new Error("manca il conto alla rovescia");
  click($("#backdrop"), "chiudi");
  if (!$("#sheet").hidden) throw new Error("backdrop non chiude");
});

t("appartamento vuoto → assegnazione", () => {
  const empty = $("#tower .apt.empty");
  if (!empty) throw new Error("nessun appartamento libero al primo piano");
  click(empty, "apt vuoto");
  if (!$("#sheet").hidden && !$("#sheet-body").textContent.includes("ospitare"))
    throw new Error("sheet assegnazione mancante");
  click($("#backdrop"));
});

t("vista Cassetta: pity, pulsanti e statistiche", () => {
  click($('.tab-btn[data-view="cassetta"]'));
  if (!$("#view-cassetta").classList.contains("active")) throw new Error("vista non attiva");
  if ($("#pity-text").textContent !== "0/30") throw new Error("pity iniziale errato");
  if ($("#btn-pull-1").disabled) throw new Error("1 bustina dovrebbe essere acquistabile");
  if (!$("#mail-stats .stat")) throw new Error("statistiche mancanti");
});

t("bustina: overlay, cartone, carta e riepilogo", () => {
  click($("#btn-pull-1"));
  if ($("#reveal").hidden) throw new Error("overlay non aperto");
  if (state.pulls !== 1) throw new Error("tiro non registrato");
  click($("#capsule"), "capsula");
  if ($("#reveal-card").hidden) throw new Error("carta non mostrata");
  if (!$("#reveal-card").textContent.match(/Comune|Raro|Epico|Leggendario/))
    throw new Error("rarità mancante sulla carta");
  click($("#reveal-skip"), "salta");
  if ($("#reveal-summary").hidden) throw new Error("riepilogo mancante");
  if (!$("#summary-grid").children.length) throw new Error("griglia vuota");
  click($("#summary-close"), "chiudi");
  if (!$("#reveal").hidden) throw new Error("overlay non si chiude");
});

t("decina di bustine: 10 carte", () => {
  state.crumbs = 5000;
  ui.refresh();
  if ($("#btn-pull-10").disabled) throw new Error("decina non disponibile nonostante le briciole");
  click($("#btn-pull-10"));
  if (state.pulls !== 11) throw new Error("attese 11 tirate totali, " + state.pulls);
  click($("#capsule"));
  if ($("#reveal-card").hidden) throw new Error("prima carta non mostrata");
  click($("#reveal-skip"));
  if ($("#summary-grid").children.length !== 10) throw new Error("servono 10 elementi");
  click($("#summary-close"));
});

t("nuovi inquilini finiscono in album", () => {
  click($('.tab-btn[data-view="album"]'));
  click($('.tab[data-tab="tenants"]'));
  const cards = $$("#album-body .card");
  if (cards.length !== 10) throw new Error("10 inquilini nell'album, " + cards.length);
  const owned = cards.filter((c) => !c.classList.contains("locked"));
  if (owned.length !== Object.keys(state.tenants).length)
    throw new Error("carte sbloccate ≠ inquilini posseduti");
});

t("scheda inquilino e potenziamento con ricordo", () => {
  state.tenants.nuvola.memories = 3;
  ui.refresh();
  click($('[data-tenant="nuvola"]'), "card nuvola");
  if ($("#sheet").hidden) throw new Error("sheet inquilino non aperto");
  const lvl = $("[data-levelup]");
  if (!lvl || lvl.disabled) throw new Error("potenziamento non disponibile");
  click(lvl);
  if (state.tenants.nuvola.level !== 2) throw new Error("livello non salito");
  if (state.tenants.nuvola.memories !== 2) throw new Error("ricordo non speso");
  click($("#backdrop"));
});

t("album arredi ed episodi", () => {
  click($('.tab[data-tab="furniture"]'));
  if ($$("#album-body .card").length !== 12) throw new Error("12 arredi attesi");
  click($('.tab[data-tab="episodes"]'));
  if ($$("#album-body .ep").length !== 8) throw new Error("8 episodi attesi");
  if (!$("#album-body .ep.todo")) throw new Error("episodi non sbloccati non mostrati");
});

t("sblocco piano 2 e nuovi appartamenti", () => {
  click($('.tab-btn[data-view="palazzo"]'));
  state.crumbs = 5000;
  state.fragments = 50;
  ui.refresh();
  const btn = $('#tower [data-unlock="2"]');
  if (!btn) throw new Error("pulsante sblocco piano 2 assente");
  if (!btn.classList.contains("can")) throw new Error("doveva essere attivo con le risorse");
  click(btn, "sblocca");
  if (state.unlockedFloors !== 2) throw new Error("piano non sbloccato");
  if ($$("#tower .apt").length !== 6) throw new Error("servono 6 appartamenti");
  if ($("#res-crumbs").textContent !== String(state.crumbs)) throw new Error("header non aggiornato");
});

t("assegnazione di un nuovo inquilino in un appartamento libero", () => {
  /* garantisce sempre qualcuno da ospitare, indipendentemente dalle bustine */
  const unplaced = () => {
    const used = new Set();
    for (let f = 1; f <= state.unlockedFloors; f++)
      for (const a of state.apartments[f]) if (a.tenant) used.add(a.tenant);
    return Object.keys(state.tenants).filter((id) => !used.has(id));
  };
  if (!unplaced().length) {
    const spare = ["bruno", "nerone", "beppe", "spina", "lasagna", "pesce", "calzini", "topo"].find(
      (id) => !state.tenants[id]
    );
    if (spare) state.tenants[spare] = { level: 1, memories: 0 };
    else {
      const home = state.apartments[1][0];
      state.apartments[1][0] = { tenant: null, furniture: [null, null] };
      void home;
    }
    ui.refresh();
  }
  const free = $$("#tower .apt.empty")[0];
  if (!free) throw new Error("nessun appartamento libero dopo lo sblocco");
  click(free, "apt vuoto");
  const rows = $$("#sheet-body [data-place]");
  if (!rows.length) throw new Error("nessun inquilino da ospitare");
  const id = rows[0].dataset.place;
  click(rows[0], "ospita");
  if (!$("#sheet").hidden) throw new Error("sheet non chiuso dopo l'assegnazione");
  const f = +free.dataset.floor;
  const i = +free.dataset.index;
  if (state.apartments[f][i].tenant !== id) throw new Error("inquilino non assegnato");
});

t("episodio: due inquilini sullo stesso piano", () => {
  /* predisponi due appartamenti liberi sul piano 1 e libera bruno/nerone ovunque */
  for (const idx of [0, 1, 2]) {
    state.apartments[1][idx] = { tenant: null, furniture: [null, null] };
  }
  for (const id of ["bruno", "nerone"]) {
    if (!state.tenants[id]) state.tenants[id] = { level: 1, memories: 0 };
    for (let f = 1; f <= state.unlockedFloors; f++)
      for (const a of state.apartments[f])
        if (a.tenant === id) a.tenant = null;
  }
  ui.refresh();
  const before = Object.keys(state.episodes).length;

  const free = $$("#tower .apt.empty").find((b) => +b.dataset.floor === 1);
  if (!free) throw new Error("servono appartamenti liberi sul piano 1");
  click(free, "apt1");
  const rowB = $$("#sheet-body [data-place]").find((r) => r.dataset.place === "bruno");
  if (!rowB) throw new Error("Bruno non proponibile");
  click(rowB, "ospita bruno");

  const free2 = $$("#tower .apt.empty").find((b) => +b.dataset.floor === 1);
  if (!free2) throw new Error("serve un secondo appartamento libero");
  click(free2, "apt2");
  const rowN = $$("#sheet-body [data-place]").find((r) => r.dataset.place === "nerone");
  if (!rowN) throw new Error("Nerone non proponibile");
  click(rowN, "ospita nerone");

  const after = Object.keys(state.episodes).length;
  if (after <= before) throw new Error(`episodio non sbloccato (${before} → ${after})`);
  if (!state.episodes["club-ghiaccio"]) throw new Error("atteso club-ghiaccio");

  /* rileggere l'episodio non deve riscuotere due volte */
  const crumbs = state.crumbs;
  ui.refresh();
  if (Object.keys(state.episodes).length !== after) throw new Error("episodio duplicato");
  if (state.crumbs !== crumbs) throw new Error("ricompensa duplicata");
  click($('.tab-btn[data-view="album"]'));
  click($('.tab[data-tab="episodes"]'));
  if (!$$("#album-body .ep.done").length) throw new Error("episodio non compare fra i completati");
});

t("regalo del portiere una volta al giorno", () => {
  click($('.tab-btn[data-view="palazzo"]'));
  const before = state.crumbs;
  const btn = $("#btn-daily");
  if (btn.disabled) throw new Error("regalo dovrebbe essere disponibile");
  click(btn);
  if (state.crumbs <= before) throw new Error("regalo non erogato");
  if (!btn.disabled) throw new Error("dopo il ritiro deve disattivarsi");
  if (!btn.textContent.includes("domani")) throw new Error("mancano le avvertenze del gatto");
});

t("impostazioni: suoni, vibrazione e reset", () => {
  click($("#btn-settings"));
  if ($("#sheet").hidden) throw new Error("sheet impostazioni non aperto");
  const sound = $('[data-toggle="sound"]');
  click(sound);
  if (state.settings.sound !== false) throw new Error("suono non disattivato");
  click($('[data-toggle="sound"]'));
  if (state.settings.sound !== true) throw new Error("suono non riattivato");
  const gris = $('[data-toggle="grisIA"]');
  if (!gris) throw new Error("toggle Gris IA mancante");
  const before = $("#doorman-say").textContent;
  if (state.settings.grisIA !== true) throw new Error("Gris IA dovrebbe essere on di default");
  click(gris);
  if (state.settings.grisIA !== false) throw new Error("Gris IA non disattivato");
  const classic = $("#doorman-say").textContent;
  if (!classic) throw new Error("battuta classica vuota");
  click($('[data-toggle="grisIA"]'));
  if (state.settings.grisIA !== true) throw new Error("Gris IA non riattivato");
  if (!$("#btn-reset")) throw new Error("pulsante reset mancante");
  click($("#btn-reset"));
  if (state.crumbs !== 180) throw new Error("reset non riporta allo stato iniziale: " + state.crumbs);
  if (state.unlockedFloors !== 1) throw new Error("reset piani errato");
});

t("persistenza: il salvataggio survive a un reload", () => {
  const raw = localStorage.getItem("civico0.save.v1");
  if (!raw) throw new Error("nessun salvataggio scritto");
  const parsed = JSON.parse(raw);
  if (parsed.v !== 3) throw new Error("versione salvataggio errata: " + parsed.v);
  if (typeof parsed.crumbs !== "number") throw new Error("salvataggio corrotto");
});

t("visibilitychange: sospende animazioni e timer quando la scheda è nascosta", () => {
  /* jsdom: document.hidden è solo-leggibile, lo ridefiniamo per il test */
  let hidden = false;
  Object.defineProperty(document, "hidden", { get: () => hidden, configurable: true });
  const body = document.body;

  hidden = true;
  document.dispatchEvent(new w.Event("visibilitychange"));
  if (!body.classList.contains("anim-paused"))
    throw new Error("classe anim-paused assente quando la scheda è nascosta");

  hidden = false;
  document.dispatchEvent(new w.Event("visibilitychange"));
  if (body.classList.contains("anim-paused"))
    throw new Error("anim-paused non rimossa al ritorno della scheda");

  /* ripristina la proprietà originale per i test successivi */
  delete document.hidden;
});

t("verbale dell'assemblea: si apre, si rigenera e si chiude", () => {
  const btn = $("#btn-verbale");
  if (!btn) throw new Error("bottone verbale assente");
  click(btn, "verbale");
  if ($("#sheet").hidden) throw new Error("sheet verbale non aperto");
  const bodyText = $("#sheet-body").textContent;
  if (!bodyText.includes("Ordine del giorno")) throw new Error("verbale senza ordine del giorno");
  const first = bodyText;
  click($("#btn-verbale-new"), "altro verbale");
  const second = $("#sheet-body").textContent;
  if (second === first) throw new Error("altro verbale non ha cambiato il testo");
  click($("#btn-verbale-close"), "chiudi verbale");
  if (!$("#sheet").hidden) throw new Error("sheet verbale non si è chiuso");
});

t("obiettivi: quarta tab, progresso e riscossione una tantum", () => {
  click($('.tab-btn[data-view="album"]'));
  click($('.tab[data-tab="goals"]'));
  const cards = $$("#album-body [data-goal]");
  if (cards.length < 10) throw new Error("almeno 10 obiettivi attesi, " + cards.length);
  if ($("#album-body .btn-claim")) throw new Error("nessun claim dovrebbe essere pronto all'inizio");

  /* forza un traguardo raggiungibile: primo favore */
  state.favorsDone = 1;
  ui.refresh();
  const claim = $('[data-claim="primo-favore"]');
  if (!claim) throw new Error("bottone riscossione mancante per traguardo pronto");
  const before = state.crumbs;
  click(claim, "riscuoti");
  if (!state.goals["primo-favore"]) throw new Error("goal non marcato come riscosso");
  if (state.crumbs !== before + 30) throw new Error("ricompensa non assegnata");
  if ($('[data-claim="primo-favore"]')) throw new Error("claim non scomparso dopo riscossione");
  if (!$(`[data-goal="primo-favore"]`).classList.contains("done")) throw new Error("card non in done");
});

t("stagione: badge aggiornato e non vuoto in ingresso", () => {
  const badge = $("#season-badge");
  if (!badge) throw new Error("badge stagione mancante");
  if (!badge.textContent.trim()) throw new Error("badge stagione vuoto");
  if (!$("#doorman-say").textContent.trim()) throw new Error("battuta portiere vuota");
});

t("impostazioni ecosistema: cartolina, export/import e toggle opt-in", () => {
  click($("#btn-settings"));
  if ($("#sheet").hidden) throw new Error("impostazioni non aperte");
  if (!$("#btn-postcard")) throw new Error("bottone cartolina mancante");
  if (!$("#btn-export")) throw new Error("bottone export mancante");
  if (!$("#btn-import")) throw new Error("bottone import mancante");
  if (!$("#import-file")) throw new Error("input file import mancante");

  const rem = $('[data-toggle="reminders"]');
  if (!rem) throw new Error("toggle promemoria mancante");
  if (state.settings.reminders !== false) throw new Error("promemoria deve partire spento");
  click(rem);
  /* senza Notification (jsdom) resta solo lo stato locale */
  if (typeof Notification === "undefined" && state.settings.reminders !== true)
    throw new Error("toggle promemoria non attivato");
  if (state.settings.reminders === true) click($('[data-toggle="reminders"]'));
  if (state.settings.reminders !== false) throw new Error("promemoria non spento di nuovo");

  const tilt = $('[data-toggle="skyTilt"]');
  if (!tilt) throw new Error("toggle sensore mancante");
  if (state.settings.skyTilt !== false) throw new Error("sensore deve partire spento");
  click(tilt);
  if (state.settings.skyTilt !== true) throw new Error("sensore non attivato");
  click($('[data-toggle="skyTilt"]'));
  if (state.settings.skyTilt !== false) throw new Error("sensore non spento di nuovo");

  /* export + import roundtrip via moduli save */
  const exp = saveMod.exportSave(state);
  const res = saveMod.importSave(exp.data);
  if (!res.ok) throw new Error("roundtrip import fallito: " + res.msg);

  click($("#backdrop"));
  if (!$("#sheet").hidden) throw new Error("impostazioni non chiuse");
});

t("album diario: tab presente, voce del giorno rileggibile", () => {
  const diaryTab = [...$("#album-tabs").children].find((b) => b.dataset.tab === "diary");
  if (!diaryTab) throw new Error("tab Diario mancante");
  click(diaryTab);
  const text = $("#album-body").textContent;
  if (!text.includes("2") && !text.includes("📝")) throw new Error("diario vuoto o mancante");
  if (!$("#album-body").querySelector(".diary-entry") && !text.includes("Diario vuoto"))
    throw new Error("niente voce diario");
});

t("album ricordi: combinazioni e vita precedente elencate", () => {
  const memTab = [...$("#album-tabs").children].find((b) => b.dataset.tab === "memories");
  if (!memTab) throw new Error("tab Ricordi mancante");
  click(memTab);
  const text = $("#album-body").textContent;
  if (!text.includes("Combinazioni")) throw new Error("sezione combinazioni mancante");
  if (!text.includes("Vita precedente")) throw new Error("sezione vita precedente mancante");
  if (!text.includes("Sotto l'Acquario") && !text.includes("Combinazione impossibile"))
    throw new Error("catalogo combinazioni non mostrato");
});

t("bacheca: avvisi del giorno e timbro reattivo", () => {
  click($("#btn-board"));
  if ($("#sheet").hidden) throw new Error("bacheca non aperta");
  const body = $("#sheet-body").textContent;
  if (!body.includes("Bacheca")) throw new Error("titolo bacheca mancante");
  const react = $("#sheet-body [data-react='approvato']");
  if (!react) throw new Error("timbro Approvato mancante");
  const before = state.boardReactions && Object.keys(state.boardReactions).length;
  click(react);
  const keys = Object.keys(state.boardReactions || {});
  if (keys.length <= (before || 0)) throw new Error("reazione non salvata");
  click($("#backdrop"));
  if (!$("#sheet").hidden) throw new Error("bacheca non chiusa");
});

t("ascensore: destinazione sbloccata visitabile, tour avanza", () => {
  click($("#btn-elevator"));
  if ($("#sheet").hidden) throw new Error("ascensore non aperto");
  const visit = $("#sheet-body [data-visit='piano-non-esiste']");
  if (!visit) throw new Error("destinazione base mancante");
  click(visit);
  if (!state.elevator["piano-non-esiste"]) throw new Error("visita non registrata");
  click($("#backdrop"));

  click($("#btn-tour"));
  if ($("#sheet").hidden) throw new Error("visita non aperta");
  if (!$("#btn-tour-next")) throw new Error("avanzamento visita mancante");
  const step0 = state.tourStep;
  click($("#btn-tour-next"));
  if ((state.tourStep | 0) <= step0 && !state.tourDone) throw new Error("tour non avanza");
  click($("#backdrop"));
});

console.log(`\n${passed} superati, ${failed} falliti\n`);

/* ferma i timer dell'app e chiudi */
process.exit(failed ? 1 : 0);
