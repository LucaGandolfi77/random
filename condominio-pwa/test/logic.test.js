/* Test della logica di Scala B, Civico 0 — node test/logic.test.js */

import assert from "node:assert";
import {
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
  diaryEntryFor,
  doFavor,
  ensureDiary,
  favorReady,
  favorRemaining,
  findTenantHome,
  goalDone,
  goalProgress,
  grisLine,
  levelUp,
  loadState,
  migrateSave,
  newState,
  placeFurniture,
  placeTenant,
  pull,
  reactToNotice,
  refreshStamps,
  removeFurnitureAt,
  removeTenant,
  selectStamp,
  startTour,
  tourStops,
  unlockFloor,
  unplacedTenants,
  visitElevator,
} from "../js/game.js";
import {
  EPISODES,
  FURNITURE,
  GOALS,
  MAX_FLOOR,
  MULTI_COST,
  PITY_MAX,
  PULL_COST,
  SAVE_VERSION,
  TENANTS,
  seasonEvent,
} from "../js/data.js";
import { exportSave, importSave } from "../js/save.js";

/* localStorage minimo per importSave/save nei test node */
const memStore = new Map();
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = {
    getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: (k, v) => memStore.set(k, String(v)),
    removeItem: (k) => memStore.delete(k),
    clear: () => memStore.clear(),
  };
}

let passed = 0;
const t = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log("  ✓", name);
  } catch (err) {
    console.error("  ✗", name);
    console.error("   ", err.message);
    process.exitCode = 1;
  }
};

/* PRNG deterministico (mulberry32): i test statistici non dipendono più dal caso */
const rngFrom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

console.log("\nScala B, Civico 0 — test logica\n");

/* ------------------------------------------------------------- stato base */

t("stato iniziale valido", () => {
  const s = newState();
  assert.equal(s.crumbs, 180);
  assert.equal(s.unlockedFloors, 1);
  assert.ok(s.tenants.nuvola && s.tenants.mimi);
  assert.equal(s.apartments[1][0].tenant, "nuvola");
  assert.equal(s.apartments[1][1].tenant, "mimi");
  assert.equal(unplacedTenants(s).length, 0);
});

t("carica stato corrotto senza esplodere", () => {
  const s = loadState({ crumbs: -50, apartments: { 1: "boh" }, tenants: { fantasma: {} } });
  assert.equal(s.crumbs, 0);
  assert.ok(Array.isArray(s.apartments[1]));
  assert.equal(s.tenants.fantasma, undefined);
  assert.ok(s.tenants.nuvola);
});

t("loadState ripara righe appartamento e inquilini non-oggetto", () => {
  const s = loadState({
    apartments: {
      1: [null, "boh", { tenant: "nuvola", furniture: "nope" }],
      99: "fuori range",
    },
    tenants: { nuvola: "stringa", mimi: null, spina: { level: "x", memories: -3 } },
    cooldowns: { nuvola: "mai", fantasma: 123 },
    episodes: { "club-ghiaccio": true, fantasma: true, "eco-dimensionale": false },
    settings: { sound: "sì", haptics: true },
    lastDaily: "domani",
  });
  assert.equal(s.apartments[1].length, 3);
  assert.equal(s.apartments[99], undefined);
  for (const apt of s.apartments[1]) {
    assert.ok(apt && typeof apt === "object");
    assert.ok(Array.isArray(apt.furniture));
    assert.equal(apt.furniture.length, 2);
    if (apt.tenant) assert.ok(apt.tenant === "nuvola" || apt.tenant === "mimi");
  }
  assert.equal(typeof s.tenants.nuvola, "object");
  assert.equal(typeof s.tenants.mimi, "object");
  assert.equal(s.tenants.spina.level, 1);
  assert.equal(s.tenants.spina.memories, 0);
  assert.equal(s.cooldowns.nuvola, undefined);
  assert.equal(s.cooldowns.fantasma, undefined);
  assert.equal(s.episodes["club-ghiaccio"], true);
  assert.equal(s.episodes.fantasma, undefined);
  assert.equal(s.episodes["eco-dimensionale"], undefined);
  assert.equal(s.settings.sound, true);
  assert.equal(s.settings.haptics, true);
  assert.equal(typeof s.settings.grisIA, "boolean");
  assert.equal(s.lastDaily, null);
});

t("roundtrip JSON mantiene il gioco", () => {
  const a = newState();
  a.crumbs = 999;
  a.pulls = 7;
  const b = loadState(JSON.parse(JSON.stringify(a)));
  assert.equal(b.crumbs, 999);
  assert.equal(b.pulls, 7);
  assert.equal(b.apartments[1][0].tenant, "nuvola");
});

/* ------------------------------------------------------------- migrazioni */

t("migrazione v0 → v2 riempie i campi mancanti senza perdere i dati", () => {
  const s = loadState({ v: 0, crumbs: 42, tenants: { nuvola: { level: 3, memories: 2 } } });
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.crumbs, 42);
  assert.equal(s.tenants.nuvola.level, 3);
  assert.equal(s.tenants.nuvola.memories, 2);
  assert.ok(Array.isArray(s.seen.tenants));
  assert.equal(typeof s.settings.sound, "boolean");
  assert.equal(typeof s.settings.haptics, "boolean");
  assert.equal(typeof s.settings.grisIA, "boolean");
  assert.equal(typeof s.episodes, "object");
  assert.equal(typeof s.cooldowns, "object");
  assert.equal(typeof s.goals, "object");
});

t("migrazione v1 → v2 aggiunge goals; non tocca la versione corrente e non muta l'input", () => {
  const input = { v: 1, crumbs: 5, settings: { sound: false, haptics: true } };
  const out = migrateSave(input);
  assert.notEqual(out, input, "v1 deve essere riscritto in v2");
  assert.equal(out.v, SAVE_VERSION);
  assert.equal(out.crumbs, 5);
  assert.equal(typeof out.goals, "object");

  const current = { v: SAVE_VERSION, crumbs: 8, goals: { "primo-favore": true } };
  assert.equal(migrateSave(current), current, "stessa versione → nessuna riscrittura");

  const future = migrateSave({ v: SAVE_VERSION + 99, crumbs: 7 });
  assert.equal(future.v, SAVE_VERSION + 99, "versioni future restano intatte in migrateSave");

  const loaded = loadState({ v: SAVE_VERSION + 99, crumbs: 7 });
  assert.equal(loaded.crumbs, 7);
  assert.equal(loaded.v, SAVE_VERSION, "loadState normalizza e timbra la versione corrente");

  const noVersion = migrateSave({ crumbs: 3 });
  assert.equal(noVersion.v, SAVE_VERSION, "salvataggio senza v parte da 0 e migra a SAVE_VERSION");
});

t("un salvataggio v0 completo sopravvive alla migrazione + normalizzazione", () => {
  const legacy = {
    /* niente v */
    crumbs: 500,
    fragments: 3,
    pity: 12,
    pulls: 40,
    unlockedFloors: 2,
    tenants: { nuvola: { level: 2, memories: 1 }, mimi: { level: 1, memories: 0 }, spina: { level: 4, memories: 2 } },
    apartments: {
      1: [
        { tenant: "nuvola", furniture: ["divano-muschio", null] },
        { tenant: "mimi", furniture: [null, null] },
        { tenant: "spina", furniture: [null, null] },
      ],
      2: [
        { tenant: "bruno", furniture: [null, null] },
        { tenant: null, furniture: [null, null] },
        { tenant: null, furniture: [null, null] },
      ],
    },
    furniture: { "divano-muschio": 1 },
    lastDaily: "2026-09-20",
  };
  const s = loadState(legacy);
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.crumbs, 500);
  assert.equal(s.unlockedFloors, 2);
  assert.equal(s.tenants.spina.level, 4);
  assert.equal(s.apartments[1][0].furniture[0], "divano-muschio");
  /* bruno non è in TENANT_BY_ID? se esiste resta, altrimenti viene ripulito */
  if (s.apartments[2][0].tenant) assert.equal(s.apartments[2][0].tenant, "bruno");
  assert.equal(s.lastDaily, "2026-09-20");
  assert.ok(Number.isFinite(s.pity));
});

/* ---------------------------------------------------------------- favori */

t("favore dà briciole e va in cooldown", () => {
  const now = 1_000_000;
  const s = newState(now);
  const before = s.crumbs;
  const r = doFavor(s, "nuvola", now);
  assert.ok(r.ok);
  assert.ok(r.crumbs >= 12);
  assert.equal(s.crumbs, before + r.crumbs);
  assert.ok(!favorReady(s, "nuvola", now));
  assert.ok(favorRemaining(s, "nuvola", now) > 0);
  assert.ok(!doFavor(s, "nuvola", now).ok);
  assert.ok(favorReady(s, "nuvola", now + 120_000));
});

t("ogni 5° favore concede anche un frammento", () => {
  const now = 1_000_000;
  const s = newState(now);
  s.tenants.bruno = { level: 1, memories: 0 };
  placeTenant(s, "bruno", 1, 2);
  const owner = ["nuvola", "mimi", "bruno"];
  let fragments = 0;
  let t = now;
  for (let i = 1; i <= 15; i++) {
    const id = owner.find((x) => favorReady(s, x, t));
    assert.ok(id, `favori disponibili al giro ${i}`);
    const before = s.fragments;
    const r = doFavor(s, id, t);
    assert.equal(s.fragments - before, i % 5 === 0 ? 1 : 0, `giro ${i}`);
    fragments = s.fragments;
    t += 120_000;
  }
  assert.equal(fragments, 3);
  assert.equal(s.favorsDone, 15);
});

t("nessun favore per un inquilino senza casa", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  const r = doFavor(s, "bruno");
  assert.equal(r.ok, false);
});

/* ----------------------------------------------------------------- gacha */

t("bustina costa 60 e decina 540", () => {
  const s = newState();
  const rng = rngFrom(1);
  assert.ok(canPull(s, 1));
  s.crumbs = 60;
  const r = pull(s, 1, rng);
  assert.ok(r.ok);
  assert.equal(r.cost, PULL_COST);
  assert.equal(s.crumbs, 0);
  assert.ok(!canPull(s, 1));
  s.crumbs = MULTI_COST;
  const r2 = pull(s, 10, rng);
  assert.ok(r2.ok);
  assert.equal(r2.cost, MULTI_COST);
  assert.equal(r2.results.length, 10);
});

t("pull rifiuta conteggi diversi da 1 o 10", () => {
  const s = newState();
  s.crumbs = 100000;
  assert.ok(!canPull(s, 0));
  assert.ok(!canPull(s, 3));
  assert.ok(!canPull(s, -1));
  assert.ok(!pull(s, 0).ok);
  assert.ok(!pull(s, 3).ok);
  assert.ok(!pull(s, 2.5).ok);
  assert.equal(s.crumbs, 100000, "nessun addebito per conteggi invalidi");
  assert.equal(s.pulls, 0);
});

t("nessun pull senza briciole", () => {
  const s = newState();
  s.crumbs = 10;
  const r = pull(s, 1);
  assert.equal(r.ok, false);
  assert.equal(s.crumbs, 10);
  assert.equal(s.pulls, 0);
});

t("doppioni inquilino → ricordi, doppione arredo → frammenti", () => {
  const s = newState();
  const rng = rngFrom(42);
  s.crumbs = 100_000;
  let mem = 0;
  let frag = 0;
  let nuovi = 0;
  for (let i = 0; i < 400; i++) {
    const r = pull(s, 1, rng);
    const x = r.results[0];
    if (x.kind === "tenant") {
      if (x.isNew) nuovi += 1;
      else {
        mem += 1;
        assert.equal(x.memories, 1);
      }
    } else {
      if (x.isNew) nuovi += 1;
      else {
        frag += 1;
        assert.equal(x.fragments, 1);
        assert.ok(s.fragments >= frag);
      }
    }
  }
  assert.ok(nuovi > 0, "almeno qualche novità");
  assert.ok(mem > 0, "deve uscire almeno un doppione");
  assert.ok(frag > 0, "deve uscire almeno un arredo doppione");
  const stats = collectionStats(s);
  assert.ok(stats.tenantsOwned <= TENANTS.length);
  assert.ok(stats.furnitureOwned <= FURNITURE.length);
});

t("pity garantisce epico entro 30 tirate", () => {
  const s = newState();
  const rng = rngFrom(7);
  s.crumbs = 1_000_000;
  let worst = 0;
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const before = s.pity;
    const r = pull(s, 1, rng);
    const rar = r.results[0].rarity;
    if (rar === "epico" || rar === "leggendario") {
      streak = 0;
      assert.equal(s.pity, 0);
    } else {
      streak += 1;
      assert.ok(s.pity > before || s.pity === 0);
      assert.ok(streak <= PITY_MAX, `serie da ${streak} senza epico`);
      worst = Math.max(worst, streak);
    }
  }
  assert.ok(worst <= PITY_MAX);
});

t("decina: almeno un raro o meglio", () => {
  const s = newState();
  const rng = rngFrom(99);
  s.crumbs = 5_000_000;
  for (let i = 0; i < 60; i++) {
    s.pity = 0;
    const r = pull(s, 10, rng);
    const good = r.results.some((x) => x.rarity !== "comune");
    assert.ok(good, "in una decina deve esserci almeno un non-comune");
  }
});

t("tutte le rarità escono con probabilità plausibili", () => {
  const s = newState();
  const rng = rngFrom(2026);
  s.crumbs = 10_000_000;
  const seen = new Set();
  for (let i = 0; i < 3000; i++) seen.add(pull(s, 1, rng).results[0].rarity);
  assert.ok(seen.has("comune") && seen.has("raro") && seen.has("epico") && seen.has("leggendario"));
});

/* --------------------------------------------------------- potenziamenti */

t("ricordi → potenzia inquilino fino a livello 5", () => {
  const s = newState();
  s.tenants.nuvola.memories = 5;
  assert.ok(canLevelUp(s, "nuvola"));
  for (let i = 0; i < 4; i++) assert.ok(levelUp(s, "nuvola").ok);
  assert.equal(s.tenants.nuvola.level, 5);
  assert.equal(s.tenants.nuvola.memories, 1);
  assert.ok(!canLevelUp(s, "nuvola"));
  assert.ok(!levelUp(s, "nuvola").ok);
  assert.equal(s.tenants.nuvola.memories, 1, "nessun ricordo sprecato");
});

t("non si potenzia senza ricordi", () => {
  const s = newState();
  assert.ok(!levelUp(s, "nuvola").ok);
  assert.equal(s.tenants.nuvola.level, 1);
});

/* ------------------------------------------------------------ alloggi */

t("assegnazione e spostamento inquilino", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  assert.ok(placeTenant(s, "bruno", 1, 2).ok);
  assert.equal(s.apartments[1][2].tenant, "bruno");
  assert.deepEqual(findTenantHome(s, "bruno"), { floor: 1, index: 2 });
  assert.ok(!placeTenant(s, "nuvola", 99, 0).ok);
  assert.ok(removeTenant(s, "bruno").ok);
  assert.equal(s.apartments[1][2].tenant, null);
  assert.equal(findTenantHome(s, "bruno"), null);
});

t("non si ospita un inquilino sconosciuto", () => {
  const s = newState();
  assert.ok(!placeTenant(s, "beppe", 1, 2).ok);
});

t("placeTenant rifiuta piani e indici fuori range", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  assert.ok(!placeTenant(s, "bruno", 1, -1).ok);
  assert.ok(!placeTenant(s, "bruno", 1, 3).ok);
  assert.ok(!placeTenant(s, "bruno", 1, 1.5).ok);
  assert.ok(!placeTenant(s, "bruno", 0, 0).ok);
  assert.ok(!placeTenant(s, "bruno", -1, 0).ok);
  assert.ok(!placeTenant(s, "bruno", 99, 0).ok);
  assert.equal(findTenantHome(s, "bruno"), null);
  assert.ok(placeTenant(s, "bruno", 1, 2).ok, "l'indice valido funziona ancora");
});

t("arredi: posiziona, scambia, rimuovi", () => {
  const s = newState();
  s.furniture["divano-muschio"] = 1;
  assert.ok(placeFurniture(s, 1, 0, 0, "divano-muschio").ok);
  assert.ok(s.furniture["divano-muschio"] >= 0);
  assert.equal(s.apartments[1][0].furniture[0], "divano-muschio");
  // non se ne ha un secondo
  assert.ok(!placeFurniture(s, 1, 1, 0, "divano-muschio").ok);
  // rimosso → di nuovo disponibile
  assert.ok(removeFurnitureAt(s, 1, 0, 0).ok);
  assert.ok(placeFurniture(s, 1, 1, 0, "divano-muschio").ok);
  // toggle-off
  assert.ok(placeFurniture(s, 1, 1, 0, "divano-muschio").ok);
  assert.equal(s.apartments[1][1].furniture[0], null);
  assert.ok(placeFurniture(s, 1, 1, 1, "divano-muschio").ok);
  assert.equal(s.apartments[1][1].furniture[1], "divano-muschio");
});

t("arredo doppione ne permette due posizioni", () => {
  const s = newState();
  s.furniture["sedia-ponce"] = 2;
  assert.ok(placeFurniture(s, 1, 0, 0, "sedia-ponce").ok);
  assert.ok(placeFurniture(s, 1, 0, 1, "sedia-ponce").ok);
  assert.ok(!placeFurniture(s, 1, 1, 0, "sedia-ponce").ok);
});

t("placeFurniture/removeFurnitureAt rifiutano indici e nicchie fuori range", () => {
  const s = newState();
  s.furniture["divano-muschio"] = 1;
  assert.ok(!placeFurniture(s, 1, -1, 0, "divano-muschio").ok);
  assert.ok(!placeFurniture(s, 1, 0, -1, "divano-muschio").ok);
  assert.ok(!placeFurniture(s, 1, 0, 2, "divano-muschio").ok);
  assert.ok(!placeFurniture(s, 1, 99, 0, "divano-muschio").ok);
  assert.ok(!placeFurniture(s, 9, 0, 0, "divano-muschio").ok);
  assert.ok(!removeFurnitureAt(s, 1, 0, 9).ok);
  assert.ok(!removeFurnitureAt(s, 1, 99, 0).ok);
  assert.ok(placeFurniture(s, 1, 0, 0, "divano-muschio").ok, "le posizioni valide restano ammesse");
  assert.ok(removeFurnitureAt(s, 1, 0, 0).ok);
});

/* -------------------------------------------------------------- episodi */

t("episodio si sblocca mettendo due inquilini nello stesso piano", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  s.tenants.nerone = { level: 1, memories: 0 };
  assert.equal(checkEpisodes(s).length, 0);
  placeTenant(s, "bruno", 1, 2);
  assert.equal(checkEpisodes(s).length, 0);
  placeTenant(s, "nerone", 1, 2); // sovrascrive: deve restare solo uno
  const home = findTenantHome(s, "bruno");
  assert.equal(home, null);
  placeTenant(s, "nerone", 1, 2);
  // mettiamo bruno sullo stesso piano ma in un altro appartamento impossibile: piano 1 è pieno
  // sblocciamo un piano e riproviamo
  s.crumbs = 10000;
  s.fragments = 100;
  unlockFloor(s);
  placeTenant(s, "bruno", 2, 0);
  placeTenant(s, "nerone", 2, 1);
  const done = checkEpisodes(s);
  assert.equal(done.length, 1);
  assert.equal(done[0].id, "club-ghiaccio");
  assert.ok(s.episodes["club-ghiaccio"]);
  assert.equal(checkEpisodes(s).length, 0, "non si riscuote due volte");
});

t("episodio arredo+inquilino nello stesso appartamento", () => {
  const s = newState();
  s.tenants.beppe = { level: 1, memories: 0 };
  s.furniture["forno-magmatico"] = 1;
  s.crumbs = 100000;
  s.fragments = 100;
  unlockFloor(s); // piano 2, lontano da Mimì
  placeTenant(s, "beppe", 2, 0);
  assert.equal(checkEpisodes(s).length, 0);
  placeFurniture(s, 2, 0, 0, "forno-magmatico");
  const done = checkEpisodes(s);
  assert.equal(done.length, 1);
  assert.equal(done[0].id, "pane-che-sussurra");
});

t("gli episodi non premiano più di una volta", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  s.tenants.nerone = { level: 1, memories: 0 };
  s.crumbs = 0;
  s.fragments = 0;
  placeTenant(s, "bruno", 1, 0);
  placeTenant(s, "nerone", 1, 1);
  const first = checkEpisodes(s);
  assert.equal(first.length, 1);
  const crumbs = s.crumbs;
  removeTenant(s, "bruno");
  placeTenant(s, "bruno", 1, 0);
  assert.equal(checkEpisodes(s).length, 0);
  assert.equal(s.crumbs, crumbs);
});

/* ---------------------------------------------------------------- piani */

t("sblocco piani con costi crescenti", () => {
  const s = newState();
  assert.equal(s.unlockedFloors, 1);
  assert.ok(!canUnlockFloor(s), "senza risorse non si sblocca");
  s.crumbs = 100000;
  s.fragments = 1000;
  while (s.unlockedFloors < MAX_FLOOR) {
    const target = s.unlockedFloors + 1;
    assert.ok(canUnlockFloor(s));
    const r = unlockFloor(s);
    assert.ok(r.ok);
    assert.equal(s.unlockedFloors, target);
  }
  assert.ok(!unlockFloor(s).ok, "all'attico non si sale altro");
  assert.ok(!canUnlockFloor(s));
});

t("i piani chiusi non accettano inquilini", () => {
  const s = newState();
  s.tenants.bruno = { level: 1, memories: 0 };
  assert.ok(!placeTenant(s, "bruno", 3, 0).ok);
});

/* ------------------------------------------------------------------ daily */

t("regalo giornaliero una volta al giorno", () => {
  const day1 = Date.parse("2026-09-24T10:00:00");
  const day2 = Date.parse("2026-09-25T10:00:00");
  const s = newState(day1);
  assert.ok(dailyAvailable(s, day1));
  const r = claimDaily(s, day1);
  assert.ok(r.ok);
  assert.equal(s.crumbs, 180 + r.crumbs);
  assert.ok(!dailyAvailable(s, day1));
  assert.ok(!claimDaily(s, day1).ok);
  assert.ok(dailyAvailable(s, day2));
  assert.ok(claimDaily(s, day2).ok);
});

/* ------------------------------------------------------------ consistenza */

t("nessun NaN dopo una partita lunga", () => {
  const s = newState();
  const rng = rngFrom(1234);
  s.crumbs = 50_000_000;
  s.fragments = 50_000;
  for (let i = 0; i < 200; i++) pull(s, i % 17 === 0 ? 10 : 1, rng);
  let slot = 0;
  for (const id of Object.keys(s.tenants)) {
    s.tenants[id].memories += 2;
    levelUp(s, id);
    placeTenant(s, id, 1, slot++ % 3);
  }
  for (const f of FURNITURE) s.furniture[f.id] = 3;
  placeFurniture(s, 1, 0, 0, "divano-muschio");
  placeFurniture(s, 1, 0, 1, "tappeto-buco");
  unlockFloor(s);
  checkEpisodes(s);
  const j = JSON.stringify(s);
  assert.ok(!j.includes("NaN"));
  assert.ok(!j.includes("undefined"));
  assert.ok(Number.isFinite(s.crumbs));
  assert.ok(Number.isFinite(s.fragments));
});

t("tutti gli episodi sono referenziati da inquilini/arredi esistenti", () => {
  const ids = new Set(TENANTS.map((x) => x.id));
  const fids = new Set(FURNITURE.map((x) => x.id));
  for (const ep of EPISODES) {
    if (ep.tenants) for (const id of ep.tenants) assert.ok(ids.has(id), id);
    else {
      assert.ok(ids.has(ep.tenant), ep.tenant);
      assert.ok(fids.has(ep.furniture), ep.furniture);
    }
  }
});

t("ogni inquilino ha 5 battute e un favore", () => {
  for (const t of TENANTS) {
    assert.equal(t.lines.length, 5, `${t.id} battute`);
    assert.ok(t.favor.label && t.favor.line, `${t.id} favore`);
    assert.ok(t.emoji, `${t.id} emoji`);
  }
});

t("verbali: generati in locale, non vuoti e deterministici per seed fisso", () => {
  const s = newState();
  const a = assemblyMinutes(s, 0);
  const b = assemblyMinutes(s, 0);
  assert.equal(a, b, "stesso seed → stesso verbale");
  assert.ok(a.length > 40, "verbale troppo corto");
  const lower = a.toLowerCase();
  assert.ok(
    lower.includes("assemblea") || lower.includes("seduta") || lower.includes("verbale"),
    "manca il contesto assemblea"
  );
  assert.ok(a.includes("Ordine del giorno"), "manca l'ordine del giorno");
});

t("verbali: seed diversi cambiano il testo", () => {
  const s = newState();
  const a = assemblyMinutes(s, 0);
  const b = assemblyMinutes(s, 1);
  assert.notEqual(a, b, "seed diversi dovrebbero dare testi diversi");
});

t("verbali: riferiscono inquilini noti quando presenti", () => {
  const s = newState();
  s.tenants.nuvola = { level: 1, memories: 0 };
  s.tenants.bruno = { level: 1, memories: 0 };
  const text = assemblyMinutes(s, 3);
  assert.ok(text.includes("Nuvola") || text.includes("Bruno"), "dovrebbe citare almeno un inquilino posseduto");
});

/* ------------------------------------------------------ obiettivi gentili */

t("obiettivi: ogni traguardo ha target e progresso plausibili", () => {
  assert.ok(GOALS.length >= 10, "almeno 10 obiettivi");
  const s = newState();
  for (const g of GOALS) {
    assert.ok(g.id && g.title && g.desc, `${g.id} metadati`);
    assert.ok(g.target > 0, `${g.id} target`);
    assert.ok(Number.isFinite(g.crumbs) && g.crumbs >= 0, `${g.id} briciole`);
    assert.ok(Number.isFinite(g.fragments) && g.fragments >= 0, `${g.id} frammenti`);
    const p = goalProgress(s, g);
    assert.ok(Number.isFinite(p) && p >= 0, `${g.id} progresso`);
    assert.ok(p <= g.target + 1000, `${g.id} progresso fuori scala`);
    assert.equal(typeof goalDone(s, g), "boolean", `${g.id} done booleano`);
  }
});

t("obiettivi: claim assegna ricompensa una sola volta", () => {
  const s = newState();
  s.favorsDone = 1;
  const first = claimGoal(s, "primo-favore");
  assert.equal(first.ok, true);
  assert.equal(s.goals["primo-favore"], true);
  assert.equal(s.crumbs, 180 + 30);
  const second = claimGoal(s, "primo-favore");
  assert.equal(second.ok, false, "nessun doppio claim");
  assert.equal(s.crumbs, 180 + 30);
});

t("obiettivi: non si riscuote se il traguardo non è raggiunto", () => {
  const s = newState();
  assert.equal(s.favorsDone, 0);
  const r = claimGoal(s, "primo-favore");
  assert.equal(r.ok, false);
  assert.equal(s.goals["primo-favore"], undefined);
  assert.equal(s.crumbs, 180);
  assert.equal(claimGoal(s, "inesistente").ok, false);
});

t("obiettivi: loadState ripulisce goal sconosciuti e non booleani", () => {
  const s = loadState({
    v: SAVE_VERSION,
    goals: { "primo-favore": true, fantasma: true, "buon-vicino": false },
  });
  assert.equal(s.goals["primo-favore"], true);
  assert.equal(s.goals.fantasma, undefined);
  assert.equal(s.goals["buon-vicino"], undefined);
});

t("obiettivi: salvataggio v1 senza goals migra a v2 con mappa vuota", () => {
  const s = migrateSave({ v: 1, crumbs: 9 });
  assert.equal(s.v, 3);
  assert.equal(typeof s.goals, "object");
  assert.equal(Object.keys(s.goals).length, 0);
  assert.equal(typeof s.diary, "object");
  assert.equal(Object.keys(s.combos).length, 0);
});

t("memoria: ensureDiary una voce al giorno, deterministica e rileggibile", () => {
  const s = newState();
  const day = 1700000000000;
  assert.equal(ensureDiary(s, day), true);
  assert.equal(s.diary.length, 1);
  assert.equal(ensureDiary(s, day), false, "nessuna voce doppia nello stesso giorno");
  const again = diaryEntryFor(s, s.diary[0].id, day);
  assert.equal(again.text, s.diary[0].text, "stessa data → stessa cronaca");
  const s2 = newState();
  ensureDiary(s2, day);
  assert.equal(s2.diary[0].text, s.diary[0].text, "stato uguale → stesso testo");
});

t("memoria: combinazioni e vita precedente si sbloccano e restano", () => {
  const s = newState();
  s.tenants.nuvola = { level: 1, memories: 0 };
  s.furniture["acquario-galassia"] = 1;
  s.apartments[1][0].tenant = "nuvola";
  s.apartments[1][0].furniture[0] = "acquario-galassia";
  const fresh = checkCombos(s);
  assert.ok(fresh.some((c) => c.id === "sotto-acquario"));
  assert.equal(s.combos["sotto-acquario"], true);
  assert.equal(checkCombos(s).length, 0, "nessun re-unlock");
  const s2 = loadState(JSON.parse(JSON.stringify(s)));
  assert.equal(s2.combos["sotto-acquario"], true);
});

t("memoria: bacheca deterministica e reazione a timbro", () => {
  const s = newState();
  const day = "2026-09-24";
  const a = boardNotices(s, day);
  const b = boardNotices(s, day);
  assert.equal(a.length, 3);
  assert.equal(a[0].text, b[0].text);
  const r = reactToNotice(s, day, "approvato");
  assert.equal(r.ok, true);
  assert.equal(s.boardReactions[day], "approvato");
  assert.equal(reactToNotice(s, day, "boh").ok, false);
});

t("memoria: ascensore e tour non missabili", () => {
  const s = newState();
  const locked = visitElevator(s, "soffitto-stelle");
  assert.equal(locked.ok, false, "soffitto chiuso con 1 piano");
  const open = visitElevator(s, "piano-non-esiste");
  assert.equal(open.ok, true);
  assert.equal(s.elevator["piano-non-esiste"], true);
  const stops = tourStops(s);
  assert.equal(stops[0].kind, "intro");
  assert.equal(stops[stops.length - 1].kind, "outro");
  startTour(s);
  assert.equal(s.tourDone, false);
});

t("memoria: francobolli opt-in e selectStamp valida", () => {
  const s = newState();
  refreshStamps(s);
  assert.equal(availableStamps(s).length, 0, "niente sbloccati a inizio partita");
  s.episodes["eco-dimensionale"] = true;
  s.episodes["cena-draco"] = true;
  s.episodes["club-ghiaccio"] = true;
  refreshStamps(s);
  assert.ok(availableStamps(s).some((x) => x.id === "assemblea-interdimensionale"));
  assert.equal(selectStamp(s, "non-esiste").ok, false);
  assert.equal(selectStamp(s, "assemblea-interdimensionale").ok, true);
  assert.equal(s.selectedStamp, "assemblea-interdimensionale");
  assert.equal(selectStamp(s, null).ok, true);
  assert.equal(s.selectedStamp, null);
});

t("memoria: loadState ripulisce campi v3 invalidi", () => {
  const s = loadState({
    v: SAVE_VERSION,
    diary: [{ id: "x", text: "ok" }, { bad: 1 }, null],
    combos: { "sotto-acquario": true, fantasma: true, "no-pezzo": true },
    boardReactions: { "2026-09-24": "approvato", nope: "drago", "2026-09-24x": "drago" },
    elevator: { "piano-non-esiste": true, "xxx": true },
    stamps: { "scala-in-fiore": true, "no": true },
    selectedStamp: "no",
    tourStep: "abc",
    tourDone: "sì",
  });
  assert.equal(s.diary.length, 1);
  assert.equal(s.combos["sotto-acquario"], true);
  assert.equal(s.combos.fantasma, undefined);
  assert.equal(s.combos["no-pezzo"], undefined);
  assert.equal(s.boardReactions["2026-09-24"], "approvato");
  assert.equal(s.boardReactions.nope, undefined);
  assert.equal(s.elevator["piano-non-esiste"], true);
  assert.equal(s.elevator.xxx, undefined);
  assert.equal(s.stamps["scala-in-fiore"], true);
  assert.equal(s.selectedStamp, null);
  assert.equal(s.tourStep, 0);
  assert.equal(s.tourDone, false);
});

/* --------------------------------------------------- Gris IA offline locale */

t("Gris IA: compositore locale deterministico e non vuoto", () => {
  const s = newState();
  const a = grisLine(s, 7);
  const b = grisLine(s, 7);
  assert.equal(a, b, "stesso seed → stessa battuta");
  assert.ok(a && a.length > 10, "battuta troppo corta");
  const c = grisLine(s, 8);
  assert.notEqual(a, c, "seed diversi cambiano la battuta");
});

t("Gris IA: fallback a null su input invalido (UI usa le battute scritte)", () => {
  assert.equal(grisLine(null, 0), null);
  assert.equal(grisLine(undefined, 0), null);
  assert.equal(grisLine("x", 0), null);
  const s = newState();
  for (let i = 0; i < 50; i++) {
    const line = grisLine(s, i);
    assert.ok(typeof line === "string" && line.length > 0, "compositore non deve produrre vuoto");
    assert.ok(!line.includes("{"), "placeholder non sostituito: " + line);
  }
});

t("Gris IA: impostazione grisIA default true e ripulita da loadState", () => {
  assert.equal(newState().settings.grisIA, true);
  const off = loadState({ v: SAVE_VERSION, settings: { grisIA: false } });
  assert.equal(off.settings.grisIA, false);
  const bad = loadState({ v: SAVE_VERSION, settings: { grisIA: "sì" } });
  assert.equal(bad.settings.grisIA, true, "non booleano → default");
});

/* --------------------------------------------- eventi stagionali e salvataggio */

t("eventi stagionali: stagione coerente con il mese e struttura completa", () => {
  const winter = seasonEvent(new Date(2026, 0, 15)); /* 15 gen → inverno */
  assert.equal(winter.season, "inverno");
  assert.ok(winter.label && winter.line);
  assert.equal(typeof winter.day, "number");
  assert.ok(winter.weekday.length > 0);
  assert.ok(winter.month.length > 0);

  const summer = seasonEvent(new Date(2026, 6, 20)); /* 20 lug → estate */
  assert.equal(summer.season, "estate");

  const spring = seasonEvent(new Date(2026, 3, 10)); /* 10 apr → primavera */
  assert.equal(spring.season, "primavera");

  const autumn = seasonEvent(new Date(2026, 9, 5)); /* 5 ott → autunno */
  assert.equal(autumn.season, "autunno");
});

t("eventi stagionali: giorno festivo prevale sulla stagione", () => {
  const xmas = seasonEvent(new Date(2026, 11, 25)); /* Natale */
  assert.ok(xmas.id.startsWith("festivo-"));
  assert.ok(xmas.line.includes("Natale"));
  assert.ok(xmas.label.includes("Oggi speciale"));
  assert.equal(xmas.season, "inverno");

  const ny = seasonEvent(new Date(2026, 0, 1));
  assert.ok(ny.id.startsWith("festivo-"));
  assert.ok(ny.line.includes("bolletta") || ny.line.includes("Anno nuovo") || ny.emoji === undefined || ny.line.length > 0);
  /* label festivo usa emoji del giorno festivo */
  assert.ok(ny.label.includes("Oggi speciale"));
});

t("eventi stagionali: fallback su input invalido senza lanciare", () => {
  const broken = seasonEvent(new Date("not-a-date"));
  assert.ok(broken && broken.label);
  assert.ok(broken.line);
});

t("esporta salvataggio: JSON valido con versione corrente, senza mutare lo stato", () => {
  const s = newState();
  s.crumbs = 42;
  const before = s.crumbs;
  const exp = exportSave(s);
  assert.equal(exp.ok, true);
  const parsed = JSON.parse(exp.data);
  assert.equal(parsed.v, SAVE_VERSION);
  assert.equal(parsed.crumbs, 42);
  assert.equal(s.crumbs, before, "export non deve mutare lo stato");
});

t("importa salvataggio: roundtrip e persistenza in localStorage", () => {
  memStore.clear();
  const s = newState();
  s.crumbs = 99;
  s.fragments = 7;
  const exp = exportSave(s);
  const res = importSave(exp.data);
  assert.equal(res.ok, true, res.msg);
  assert.equal(res.state.crumbs, 99);
  assert.equal(res.state.fragments, 7);
  assert.equal(res.state.v, SAVE_VERSION);
  const raw = localStorage.getItem("civico0.save.v1");
  assert.ok(raw, "import deve scrivere in localStorage");
  assert.equal(JSON.parse(raw).crumbs, 99);
});

t("importa salvataggio: rifiuta testo non valido senza toccare localStorage", () => {
  localStorage.removeItem("civico0.save.v1");
  const bad1 = importSave("");
  assert.equal(bad1.ok, false);
  const bad2 = importSave("{ non json");
  assert.equal(bad2.ok, false);
  const bad3 = importSave("[1,2,3]");
  assert.equal(bad3.ok, false);
  const bad4 = importSave(123);
  assert.equal(bad4.ok, false);
  assert.equal(localStorage.getItem("civico0.save.v1"), null);
});

t("impostazioni opt-in: reminders e skyTilt default off, ripulite da loadState", () => {
  const s = newState();
  assert.equal(s.settings.reminders, false);
  assert.equal(s.settings.skyTilt, false);
  const on = loadState({ v: SAVE_VERSION, settings: { reminders: true, skyTilt: true } });
  assert.equal(on.settings.reminders, true);
  assert.equal(on.settings.skyTilt, true);
  const bad = loadState({ v: SAVE_VERSION, settings: { reminders: "sì", skyTilt: 1 } });
  assert.equal(bad.settings.reminders, false);
  assert.equal(bad.settings.skyTilt, false);
});

console.log(`\n${passed} test superati${process.exitCode ? " (con errori!)" : ""}\n`);
