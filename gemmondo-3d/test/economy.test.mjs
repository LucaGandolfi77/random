/* economy.test.mjs — l'economia non deve mai regalare energia.
   Ogni test qui blocca una regressione che a occhio non si vede. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZONES, UPGRADES, RESOURCES, RECIPES, PRICES, EXCHANGE,
  defaultState, migrate, loadState, saveState, serialize,
  upgradeValue, upgradeCost, toolStats, toolLevel, toolLabel,
  canCraft, isRecipeDone, recipeUnlocked, haveOf, craftInto,
  TOOL_LEVELS, TOOL_NAMES,
  sellPrice, buyPrice, zonePriceBonus,
  starMult, prestigeGain, applyPrestige,
  incomePerSec, droneRate, gemValue, offlineGain, offlineSeconds,
  harvestYield, nodeCounts, safeZoneIndex, fmt, SAVE_KEY, SAVE_VERSION,
} from '../core.js';

const storageStub = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
};

/* ── formattazione ──────────────────────────────────────── */
test('fmt: numeri compatti e casi limite', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1234), '1.23K');
  assert.equal(fmt(1500), '1.50K');
  assert.equal(fmt(1e6), '1.00M');
  assert.equal(fmt(-5000), '-5.00K');
  assert.equal(fmt(Infinity), '∞');
  assert.equal(fmt(NaN), '∞');
});

/* ── upgrade ────────────────────────────────────────────── */
test('upgradeValue: ogni id noto risponde, id ignoto è neutro', () => {
  for (const u of UPGRADES) assert.equal(typeof upgradeValue(u.id, 3), 'number');
  assert.equal(upgradeValue('inesistente', 5), 1);
});

test('upgradeValue: luck è limitato al 60%', () => {
  assert.ok(upgradeValue('luck', 999) <= 0.6);
});

test('upgradeCost: cresce di livello in livolo', () => {
  let prev = -1;
  for (let l = 0; l < 30; l++) {
    const c = upgradeCost('value', l);
    assert.ok(c > prev, `costo deve crescere al livello ${l}`);
    prev = c;
  }
});

test('upgradeCost: id ignosto costa Infinity (non lancia, ma rende il bottone disabilitato)', () => {
  assert.equal(upgradeCost('inesistente', 0), Infinity);
});

/* ── attrezzi ────────────────────────────────────────────── */
test('toolStats: il livello effettivo è clampato anche con save corrotti', () => {
  const rotto = { tools: { axe: 99, pick: 42 } };
  assert.equal(toolLevel(rotto, 'axe'), 3);
  assert.equal(toolLevel(rotto, 'pick'), 3);
  assert.equal(toolStats(rotto, 'axe').yield, toolStats({ tools: { axe: 3 } }, 'axe').yield);
});

test('toolStats e toolLabel concordano sempre sul livello', () => {
  for (const axe of [0, 1, 2, 3, 7]) {
    for (const pick of [0, 1, 2, 3, 7]) {
      const s = { tools: { axe, pick } };
      const label = toolLabel(s, 'axe');
      if (axe === 0) assert.match(label, /Mani Nude/);
      // mai oltre Lv3, nemmeno se il save dice 7
      assert.doesNotMatch(label, /Lv[4-9]/);
      assert.ok(toolStats(s, 'axe').yield > 0);
      assert.ok(toolStats(s, 'pick').yield > 0);
    }
  }
});

test('toolStats: rendimenti e tempi crescono col livello', () => {
  let y = 0, iv = Infinity;
  for (let l = 0; l <= 3; l++) {
    const st = toolStats({ tools: { axe: l } }, 'axe');
    assert.ok(st.yield > y, 'resa deve crescere');
    assert.ok(st.interval <= iv, 'intervallo deve accorciarsi');
    y = st.yield; iv = st.interval;
  }
});

/* ── mercante: nessun arbitrage ─────────────────────────── */
test('Nessun arbitrage: vendere una risorsa rende MENO oro di quanto costa comprarla', () => {
  for (let z = 0; z < ZONES.length; z++) {
    for (const id of Object.keys(PRICES)) {
      const s = sellPrice(id, z);
      const b = buyPrice(id, z);
      assert.ok(s < b, `zona ${z}: vendere ${id} a ${s} ≥ comprarlo a ${b} → ciclo infinito`);
    }
  }
});

test('Nessun arbitrage anche passando per il cambio energia↔oro', () => {
  // Il percorso più redditizio: compra risorsa → rivendi → converti in energia.
  for (let z = 0; z < ZONES.length; z++) {
    for (const id of Object.keys(PRICES)) {
      const oroPerEnergia = EXCHANGE.buy / EXCHANGE.energy;
      const energiaDaUnaUnita = (sellPrice(id, z) - buyPrice(id, z)) * oroPerEnergia;
      assert.ok(energiaDaUnaUnita < 0, `zona ${z}: ${id} genera energia netta a ogni ciclo`);
    }
  }
});

test('I prezzi restano monotoni crescendo con la zona', () => {
  let prevBonus = -1;
  for (let z = 0; z < ZONES.length; z++) {
    const bonus = zonePriceBonus(z);
    assert.ok(bonus > prevBonus, 'il bonus deve crescere per zona');
    prevBonus = bonus;
  }
  assert.equal(zonePriceBonus(0), 1);
});

test('oro non è comprabile né vendibile come risorsa', () => {
  assert.ok(!('oro' in PRICES));
  assert.equal(sellPrice('oro', 6), 0);
  assert.equal(buyPrice('oro', 6), 0);
});

/* ── reddito ────────────────────────────────────────────── */
test('incomePerSec parte a zero e cresce coi droni', () => {
  assert.equal(incomePerSec(defaultState()), 0);
  let prev = -1;
  for (let l = 0; l <= 6; l++) {
    const s = { ...defaultState(), upgrades: { drone: l } };
    const v = incomePerSec(s);
    assert.ok(v > prev, `il reddito deve crescere col livello ${l}`);
    prev = v;
  }
});

test('Il reddito passivo scala anche col valore gemma e con le Stelle', () => {
  const base = { ...defaultState(), upgrades: { drone: 3 } };
  const conValue = { ...base, upgrades: { drone: 3, value: 2 } };
  const conStelle = { ...base, stars: 5 };
  assert.ok(incomePerSec(conValue) > incomePerSec(base));
  assert.ok(incomePerSec(conStelle) > incomePerSec(base));
});

test('safeZoneIndex protegge da indici fuori range', () => {
  assert.equal(safeZoneIndex(-5), 0);
  assert.equal(safeZoneIndex(999), ZONES.length - 1);
  assert.equal(safeZoneIndex('ciao'), 0);
  assert.equal(safeZoneIndex(undefined), 0);
  assert.ok(Number.isInteger(gemValue({ zone: 999 })));
});

/* ── rinascita ──────────────────────────────────────────── */
test('prestigeGain: zero sotto la soglia, cresce oltre', () => {
  assert.equal(prestigeGain({ totalEarned: 999_999 }), 0);
  assert.ok(prestigeGain({ totalEarned: 1e6 }) >= 1);
  assert.ok(prestigeGain({ totalEarned: 1e12 }) > prestigeGain({ totalEarned: 1e6 }));
});

test('applyPrestige azzera davvero tutto, tenendo solo Stelle e preferenze', () => {
  const ricco = {
    ...defaultState(),
    energy: 5e9, totalEarned: 9e9, gemsCollected: 4000, zone: 4, unlockedZone: 5,
    stars: 12, upgrades: { value: 20, drone: 8 },
    resources: { legno: 999, oro: 500, cristallo: 42 },
    tools: { axe: 3, pick: 3 },
    started: true, muted: true,
  };
  const dopo = applyPrestige(ricco, 7);

  assert.equal(dopo.stars, 19, 'le Stelle si accumulano');
  assert.equal(dopo.energy, 0);
  assert.equal(dopo.totalEarned, 0);
  assert.equal(dopo.gemsCollected, 0);
  assert.equal(dopo.zone, 0);
  assert.equal(dopo.unlockedZone, 0);
  assert.deepEqual(dopo.upgrades, {});
  assert.deepEqual(dopo.resources, {}, 'le risorse devono azzerarsi: la rinascita è una rinascita');
  assert.deepEqual(dopo.tools, { axe: 0, pick: 0 }, 'gli attrezzi devono azzerarsi');
  assert.equal(dopo.started, true);
  assert.equal(dopo.muted, true);
});

test('applyPrestige: dopo il reset gli attrezdi ripartono da zero', () => {
  const dopo = applyPrestige({ ...defaultState(), tools: { axe: 3, pick: 3 } }, 1);
  const ascia1 = RECIPES.find((r) => r.id === 'axe1');
  assert.equal(toolLevel(dopo, 'axe'), 0);
  assert.match(toolLabel(dopo, 'axe'), /Mani Nude/);
  assert.ok(!isRecipeDone(dopo, ascia1), 'l\'Ascia del Multiverso non deve più essere "fatta"');
  assert.equal(recipeUnlocked(dopo, ascia1), true, 'la ricetta base resta sbloccata');
  assert.equal(canCraft(dopo, ascia1), false, 'mancano legno e pietra');
});

test('craftInto: spende i materiali una volta sola e produce il risultato', () => {
  const st = { ...defaultState(), resources: { legno: 3 } };
  const tavole = RECIPES.find((r) => r.id === 'tavole');
  assert.equal(craftInto(st, tavole), true);
  assert.equal(st.resources.legno, 0);
  assert.equal(st.resources.tavole, 1);
  assert.equal(craftInto(st, tavole), false, 'il secondo click non deve spendere ancora');
  assert.equal(st.resources.tavole, 1);
});

test('craftInto: craft che consuma anche energia scala l\'attrezzo', () => {
  const st = { ...defaultState(), zone: 1, unlockedZone: 1, energy: 50, resources: { legno: 3, pietra: 2 }, tools: { axe: 0, pick: 0 } };
  const axe1 = RECIPES.find((r) => r.id === 'axe1');
  assert.equal(craftInto(st, axe1), true);
  assert.equal(st.tools.axe, 1);
  assert.equal(st.resources.legno, 0);
  assert.equal(st.resources.pietra, 0);
  assert.equal(toolStats(st, 'axe').yield, 3, 'resa Lv1');
  assert.equal(craftInto(st, axe1), false, 'non si ricrafta la stessa ricetta');
});

test('craftInto: ricetta bloccata per zona non consuma nulla', () => {
  const st = { ...defaultState(), energy: 500, resources: { tavole: 99, mattoni: 99 } };
  const ingranaggio = RECIPES.find((r) => r.id === 'ingranaggio');
  assert.equal(recipeUnlocked(st, ingranaggio), false);
  assert.equal(craftInto(st, ingranaggio), false);
  assert.equal(st.energy, 500, 'l\'energia non deve essere sfiorata');
  assert.equal(st.resources.tavole, 99);
});

/* ── salvataggio ────────────────────────────────────────── */
test('migrate: JSON corrotto o assente → stato nuovo pulito', () => {
  for (const rotto of [null, undefined, 'testo', 42, [], NaN]) {
    const s = migrate(rotto);
    assert.equal(s.energy, 0);
    assert.equal(s.version, SAVE_VERSION);
  }
});

test('migrate: un save sabotato non può far crashare il boot', () => {
  const sabotato = {
    version: 99,
    energy: -500, totalEarned: NaN, gemsCollected: -3,
    zone: 999, unlockedZone: -10, stars: 'molte',
    upgrades: { value: -4, drone: 3, inesistente: 99 },
    resources: { legno: -10, oro: 5, sconosciuta: 7 },
    tools: { axe: 99, pick: -2 },
    started: 'sì', muted: 1, lastSave: 'ieri',
  };
  const s = migrate(sabotato);

  assert.equal(s.energy, 0);
  assert.equal(s.totalEarned, 0);
  assert.equal(s.gemsCollected, 0);
  assert.equal(s.stars, 0);
  assert.equal(s.zone, ZONES.length - 1);
  assert.equal(s.unlockedZone, 0, 'non si può essere sbloccato più in alto di dove si è');
  assert.equal(s.upgrades.value, undefined, 'livelli negativi scartati');
  assert.equal(s.upgrades.drone, 3);
  assert.equal('inesistente' in s.upgrades, false, 'id upgrade sconosciuti scartati');
  assert.equal(s.resources.legno, undefined, 'risorse negative scartate');
  assert.equal(s.resources.oro, 5);
  assert.equal('sconosciuta' in s.resources, false);
  assert.equal(s.tools.axe, 3);
  assert.equal(s.tools.pick, 0);
  assert.equal(s.started, true);
  assert.equal(s.muted, true);
  assert.ok(Number.isFinite(s.lastSave));
});

test('migrate: un save v1 senza versione migra senza perdere i dati', () => {
  const v1 = {
    energy: 1234, totalEarned: 5678, gemsCollected: 42,
    zone: 2, unlockedZone: 3, stars: 4,
    upgrades: { value: 3, drone: 1 },
    resources: { legno: 10, pietra: 4 },
    tools: { axe: 1, pick: 0 },
    lastSave: 1700000000000, started: true,
  };
  const s = migrate(v1);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.energy, 1234);
  assert.equal(s.totalEarned, 5678);
  assert.equal(s.zone, 2);
  assert.equal(s.unlockedZone, 2, 'unlocked non può superare la zona corrente');
  assert.equal(s.upgrades.value, 3);
  assert.equal(s.resources.legno, 10);
  assert.equal(s.tools.axe, 1);
});

test('saveState + loadState fanno un giro completo', () => {
  const st = { ...defaultState(), energy: 555, resources: { legno: 3 } };
  const store = storageStub();
  assert.equal(saveState(store, st, 1700000000000), null);
  const riletto = loadState(store);
  assert.equal(riletto.energy, 555);
  assert.equal(riletto.resources.legno, 3);
  assert.equal(riletto.lastSave, 1700000000000);
});

test('saveState restituisce l\'errore invece di perderlo in silenzio', () => {
  const pieno = {
    setItem() { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; },
  };
  const err = saveState(pieno, defaultState(), 123);
  assert.ok(err, 'un errore di scrittura deve arrivare al chiamante, non sparire');
});

test('loadState su JSON corrotto non lancia', () => {
  const store = storageStub({ [SAVE_KEY]: '{rotto' });
  assert.equal(loadState(store).energy, 0);
});

test('loadState senza storage non lancia', () => {
  assert.equal(loadState(undefined).energy, 0);
});

test('serialize produce JSON valido', () => {
  const s = defaultState();
  assert.deepEqual(JSON.parse(serialize(s)).energy, 0);
});

/* ── progresso offline ──────────────────────────────────── */
test('offlineSeconds: sotto i 30s non dà nulla, sopra sì con tetto a 8h', () => {
  const now = 10_000_000;
  assert.equal(offlineSeconds({ lastSave: now - 10_000 }, now), 0);
  assert.equal(offlineSeconds({ lastSave: now - 60_000 }, now), 60);
  assert.equal(offlineSeconds({ lastSave: now - 100 * 3600_000 }, now), 8 * 3600);
});

test('offlineGain: riprodotto dall\'ultimo salvataggio, non riapplicato due volte', () => {
  const now = 10_000_000;
  const st = { ...defaultState(), upgrades: { drone: 3 }, tools: { axe: 2, pick: 1 } };
  st.lastSave = now - 3600_000;

  const g = offlineGain(st, now);
  assert.ok(g.energy > 0);
  assert.ok(g.wood > 0);
  assert.ok(g.stone > 0);

  // Applicato e risalvato: il secondo calcolo deve dare zero.
  st.energy += g.energy;
  st.lastSave = now;
  assert.equal(offlineSeconds(st, now), 0);
});

test('offlineGain con zero droni dà energia zero ma può dare legno', () => {
  const now = 10_000_000;
  const g = offlineGain({ ...defaultState(), lastSave: now - 7200_000 }, now);
  assert.equal(g.energy, 0, 'senza droni non c\'è reddito passivo');
  assert.ok(g.wood > 0, 'gli attrezzi lavorano comunque');
});

test('offlineGain non regala nulla a uno stato vergine chiuso un secondo', () => {
  const now = 10_000_000;
  assert.deepEqual(offlineGain({ ...defaultState(), lastSave: now - 5_000 }, now),
    { seconds: 0, energy: 0, wood: 0, stone: 0 });
});

/* ── risorse nel mondo ──────────────────────────────────── */
test('harvestYield: i cristalli rendono meno dei nodi normali', () => {
  const s = { tools: { axe: 3, pick: 3 } };
  assert.ok(harvestYield(s, 'tree') > 0);
  assert.ok(harvestYield(s, 'rock') > 0);
  assert.ok(harvestYield(s, 'crystal') > 0);
  assert.ok(harvestYield(s, 'crystal') < harvestYield(s, 'rock'));
});

test('harvestYield con mani nude rende almeno 1', () => {
  const s = { tools: { axe: 0, pick: 0 } };
  for (const t of ['tree', 'rock', 'crystal']) assert.ok(harvestYield(s, t) >= 1);
});

test('nodeCounts: i cristalli appaiono solo dalla Caverna in poi', () => {
  assert.equal(nodeCounts(0).crystal, 0);
  assert.equal(nodeCounts(1).crystal, 0);
  assert.ok(nodeCounts(2).crystal > 0);
  assert.ok(nodeCounts(6).crystal > 0);
});

/* ── craft ──────────────────────────────────────────────── */
test('canCraft: rispetta sblocco zona, livello attrezzo e materiali', () => {
  const s = { ...defaultState(), unlockedZone: 0, resources: { legno: 100, pietra: 100, tavole: 100, mattoni: 100, ingranaggio: 100, cristallo: 100 }, energy: 10000 };
  const ingranaggio = RECIPES.find((r) => r.id === 'ingranaggio');
  assert.equal(recipeUnlocked(s, ingranaggio), false, 'serve zona 1');
  assert.equal(canCraft(s, ingranaggio), false);

  const avanti = { ...s, unlockedZone: 1 };
  assert.ok(canCraft(avanti, ingranaggio));
});

test('canCraft: un attrezzo di livello superiore non è ricraftabile', () => {
  const conAscia = { ...defaultState(), tools: { axe: 2, pick: 0 }, resources: { legno: 999, pietra: 999, tavole: 999, mattoni: 999, ingranaggio: 999, cristallo: 999 } };
  const axe1 = RECIPES.find((r) => r.id === 'axe1');
  const axe3 = RECIPES.find((r) => r.id === 'axe3');
  assert.equal(canCraft(conAscia, axe1), false, 'hai già l\'ascia: livello non sequenziale');
  assert.equal(canCraft(conAscia, axe3), true, 'ascia 2 → puoi fare la 3');
});

test('canCraft: mancano materiali → false', () => {
  const vuoto = defaultState();
  for (const r of RECIPES) assert.equal(canCraft(vuoto, r), false, r.id);
});

test('haveOf distingue energia da risorse', () => {
  const s = { ...defaultState(), energy: 10, resources: { legno: 3 } };
  assert.equal(haveOf(s, 'energia'), 10);
  assert.equal(haveOf(s, 'legno'), 3);
  assert.equal(haveOf(s, 'inesistente'), 0);
});

/* ── invarianza generale dei dati ───────────────────────── */
test('Ogni risorsa usata nelle ricette esiste in RESOURCES', () => {
  for (const r of RECIPES) {
    assert.ok(r.id && r.name && r.icon && r.desc, `${r.id}: ricetta incompleta`);
    for (const id of Object.keys(r.cost)) {
      assert.ok(id === 'energia' || id in RESOURCES, `${r.id}: costo sconosciuto "${id}"`);
    }
    if (r.out.tool) {
      // out = { tool, lvl }: entrambi devono esistere nella tabella attrezzi
      assert.ok(r.out.tool in TOOL_NAMES, `${r.id}: attrezzo sconosciuto "${r.out.tool}"`);
      assert.ok(r.out.lvl >= 1 && r.out.lvl <= TOOL_LEVELS[r.out.tool], `${r.id}: livello fuori range`);
    } else {
      for (const id of Object.keys(r.out)) {
        assert.ok(id in RESOURCES, `${r.id}: output sconosciuto "${id}"`);
      }
    }
  }
});

test('Ogni zona ha i numeri con cui il boot può lavorare', () => {
  for (const [i, z] of ZONES.entries()) {
    assert.ok(z.name && z.tagline, `zona ${i} senza nome o tagline`);
    assert.ok(z.unlock >= 0);
    assert.ok(z.base > 0);
    assert.ok(z.radius > 10);
    assert.ok(Array.isArray(z.decor) && z.decor.length > 0, `zona ${i} senza decor`);
    assert.ok(z.exposure > 0 && z.bloom >= 0, `zona ${i} senza esposizione/bloom`);
  }
});

test('Gli sblocchi di zona sono crescenti', () => {
  for (let i = 1; i < ZONES.length; i++) {
    assert.ok(ZONES[i].unlock > ZONES[i - 1].unlock, `zona ${i} costa meno della precedente`);
  }
});