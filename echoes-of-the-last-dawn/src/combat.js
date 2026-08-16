import { PARTY_INFO, TUTORIAL_LOG } from "./story.js";

const $ = (id) => document.getElementById(id);

const ENEMIES = {
  echo: { key: "echo", name: "L'Eco del Guardiano", hp: 185, atk: [16, 22], accent: 0xb78ad4 },
  dimenticata: {
    key: "dimenticata", name: "La Dimenticata", hp: 245, atk: [17, 23], accent: 0x7ad4d0,
    mid: { pct: 0.5, heal: 0 }, phase2Banner: "IL LAMENTO", phase2Mul: 1.15
  },
  velma: {
    key: "velma", name: "La Maestra del Chiaroscuro", hp: 300, atk: [19, 26], accent: 0xcfd4e6,
    mid: { pct: 0.5, heal: 45 }, phase2Banner: "LA TELA DEL GIUDIZIO", phase2Mul: 1.2
  },
  giudice: {
    key: "giudice", name: "Il Giudice di Bronzo", hp: 280, atk: [18, 24], accent: 0xd4c48a,
    mid: { pct: 0.5, heal: 30 }, phase2Banner: "IL VERSO DEL COLPEVOLE", phase2Mul: 1.2
  },
  custode: {
    key: "custode", name: "Il Custode del Rintocco", hp: 350, atk: [20, 30], accent: 0xf2d389,
    mid: { pct: 0.5, heal: 60 }, phase2Banner: "L'ULTIMO GIUDIZIO", phase2Mul: 1.25
  }
};

const SKILLS = {
  elia: [
    { id: "strike", name: "Lama del Ricordo", cost: 0, kind: "damage", power: [16, 22] },
    { id: "perduto", name: "Rintocco Perduto", cost: 18, kind: "damage", power: [33, 41] }
  ],
  toma: [
    { id: "pugno", name: "Pugno della Vigilanza", cost: 0, kind: "damage", power: [10, 14] },
    { id: "shield", name: "Scudo del Guardiano", cost: 10, kind: "shield", dur: 1 },
    { id: "oblio", name: "Oblio", cost: 14, kind: "damage", power: [20, 27], debuff: 1 }
  ],
  iria: [
    { id: "nota", name: "Nota Tagliente", cost: 0, kind: "damage", power: [9, 13] },
    { id: "melody", name: "Melodia", cost: 12, kind: "heal", power: [22, 28] },
    { id: "risonanza", name: "Risonanza", cost: 14, kind: "buff", dur: 2 }
  ]
};

const BONUS_SKILLS = {
  renzo: { key: "toma", skill: { id: "vigilia", name: "Veglia Infinita", cost: 12, kind: "buff", dur: 2 } },
  nino: { key: "iria", skill: { id: "ninna", name: "Ninna Nanna", cost: 16, kind: "heal", power: [40, 48] } },
  argo: { key: "elia", skill: { id: "nome", name: "Nome Scolpito", cost: 16, kind: "damage", power: [30, 38] } },
  araldo: { key: "toma", skill: { id: "redenzione", name: "Redenzione", cost: 18, kind: "heal", power: [26, 32], all: true } },
  notturno: { key: "elia", skill: { id: "mezzanotte", name: "Rintocco della Mezzanotte", cost: 22, kind: "damage", power: [42, 50] } }
};

const PARTY_KEYS = ["elia", "toma", "iria"];

const GOLD_LO = 0.35, GOLD_HI = 0.65;

export function createCombat({ scene, enemyKey, onWin, onDefeat, onMidFight, bonus = {} }) {
  const DBG = (...a) => console.log("[BATTLE]", ...a);
  DBG("createCombat enemyKey=", enemyKey, "bonus=", Object.keys(bonus).join(",") || "none");
  const B = bonus || {};
  const essenceMax = 100 + (B.adele ? 10 : 0) + (B.renzo ? 15 : 0) + (B.sibilla ? 10 : 0);
  const skills = {};
  for (const k of PARTY_KEYS) skills[k] = [...SKILLS[k]];
  for (const b in BONUS_SKILLS) {
    if (B[b]) skills[BONUS_SKILLS[b].key].push(BONUS_SKILLS[b].skill);
  }
  const enemy = { ...ENEMIES[enemyKey] };
  enemy._maxHp = enemy.hp;
  const partyHp = B.cera ? 12 : 0;
  const party = {};
  for (const k of PARTY_KEYS) {
    const max = { elia: 120, toma: 150, iria: 110 }[k] + partyHp;
    party[k] = { key: k, name: PARTY_INFO[k].name, maxHp: max, hp: max, acted: false };
  }

  const state = {
    phase: "player",
    essence: 60,
    essenceMax,
    shield: 0,
    atkUp: 0,
    atkUpDur: 0,
    enemyAtkDown: 0,
    enemyAtkDownDur: 0,
    phase2Done: false,
    phase2: false,
    tutorialDone: false,
    round: 1
  };

  let parry = { t: 0, dur: 900, pressed: false, done: false };
  let midPaused = false;
  let paused = false;
  let midDone = false;
  let _lastHud = 0;

  spawnCharacters();
  renderParty();
  renderEnemy();
  renderEssence();
  renderActions();
  showBanner("Il tuo turno");
  DBG("createCombat done, phase=", state.phase);

  const api = {
    state,
    enemy,
    party,
    update,
    onPrimary,
    setPaused,
    isDone: () => state.phase === "victory" || state.phase === "defeat"
  };

  return api;

  /* ---------- scene spawn ---------- */

  function spawnCharacters() {
    scene.clearCharacters();
    const partySpawn = [
      { key: "elia", x: -1.25, z: 1.7, cloth: 0x7a3030, accent: 0xd4af5a, skin: 0xe3c09b, accessory: "scarf" },
      { key: "toma", x: 0, z: 2.0, cloth: 0x3b4a77, accent: 0x1b1f2a, skin: 0x8a6a4f, accessory: "hood" },
      { key: "iria", x: 1.25, z: 1.7, cloth: 0x2f6b4a, accent: 0xe0b45f, skin: 0xdeb887, accessory: "hair" }
    ];
    for (const s of partySpawn) scene.addCharacter(s.key, { kind: "person", ...s });
    const FIG = {
      echo: { kind: "echo", cloth: 0x4a3a63, accent: 0xb78ad4 },
      dimenticata: { kind: "lament", cloth: 0x2f5f6b, accent: 0x7ad4d0 },
      velma: { kind: "painter", cloth: 0x3a3f55, accent: 0xcfd4e6 },
      giudice: { kind: "judge", cloth: 0x4a3a28, accent: 0xd4c48a },
      custode: { kind: "keeper", cloth: 0x241b33, accent: 0xf2d389 }
    };
    const cfg = FIG[enemyKey] || FIG.echo;
    scene.addCharacter("enemy", {
      key: "enemy", kind: cfg.kind,
      x: 0, z: -2.3, cloth: cfg.cloth,
      accent: cfg.accent, skin: 0xb8c0d4
    });
  }

  /* ---------- rendering ---------- */

  function renderParty() {
    const wrap = $("party-bars");
    wrap.innerHTML = "";
    for (const k of PARTY_KEYS) {
      const p = party[k];
      const row = document.createElement("div");
      row.className = "party-row";
      const dot = document.createElement("div");
      dot.className = "party-dot";
      dot.style.background = PARTY_INFO[k].color;
      const info = document.createElement("div");
      info.className = "party-info";
      const name = document.createElement("div");
      name.className = "party-name";
      name.textContent = `${p.name}  ${p.hp}/${p.maxHp}`;
      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill hp-fill";
      fill.id = `hp-${k}`;
      fill.style.width = pct(p.hp, p.maxHp);
      track.appendChild(fill);
      info.appendChild(name);
      info.appendChild(track);
      row.appendChild(dot);
      row.appendChild(info);
      wrap.appendChild(row);
    }
  }

  function updateHp(k) {
    const p = party[k];
    const fill = $(`hp-${k}`);
    if (fill) fill.style.width = pct(p.hp, p.maxHp);
    const rows = document.querySelectorAll("#party-bars .party-name");
    for (const r of rows) {
      if (r.textContent.startsWith(p.name)) r.textContent = `${p.name}  ${p.hp}/${p.maxHp}`;
    }
  }

  function renderEnemy() {
    $("enemy-name").textContent = enemy.name;
    const fill = $("enemy-hp");
    fill.style.width = pct(enemy.hp, enemy._maxHp || enemy.hp);
  }

  function updateEnemy() {
    const fill = $("enemy-hp");
    fill.style.width = pct(enemy.hp, enemy._maxHp || enemy.hp);
  }

  function renderEssence() {
    $("essence-hp").style.width = pct(state.essence, state.essenceMax);
  }

  function pct(v, m) {
    return Math.max(0, Math.min(100, (v / m) * 100)) + "%";
  }

  function renderActions() {
    const grid = $("action-grid");
    grid.innerHTML = "";
    if (state.phase !== "player") { DBG("renderActions skip (phase=", state.phase, ")"); return; }
    let n = 0;
    for (const k of PARTY_KEYS) {
      const p = party[k];
      if (p.hp <= 0) continue;
      if (p.acted) continue;
      for (const skill of skills[k]) {
        n++;
        const btn = document.createElement("button");
        btn.className = "action-btn";
        btn.disabled = state.essence < skill.cost;
        const owner = document.createElement("span");
        owner.className = "ab-owner";
        owner.style.color = PARTY_INFO[k].color;
        owner.textContent = p.name;
        const label = document.createElement("span");
        label.textContent = skill.name;
        const cost = document.createElement("span");
        cost.className = "ab-cost";
        cost.textContent = skill.cost > 0 ? `Essenza ${skill.cost}` : "gratis";
        btn.appendChild(owner);
        btn.appendChild(label);
        btn.appendChild(cost);
        btn.addEventListener("click", () => runAction(k, skill));
        grid.appendChild(btn);
      }
    }
    DBG("renderActions built", n, "buttons");
  }

  function log(msg, cls = "") {
    const box = $("battle-log");
    DBG("log enter len=", box.children.length, "msg=", msg);
    const line = document.createElement("div");
    line.className = "log-line " + cls;
    line.textContent = msg;
    box.appendChild(line);
    DBG("log appended len=", box.children.length);
    let guard = 0;
    while (box.children.length > 8) {
      const fc = box.firstChild;
      DBG("log trim len=", box.children.length, "firstTxt=", fc && fc._txt, "isChild0=", fc === box.children[0], "tag=", fc && fc.tag, "boxCtor=", box.constructor.name);
      box.removeChild(fc);
      if (++guard > 50) { DBG("log TRIM GUARD HIT, breaking"); break; }
    }
    DBG("log exit len=", box.children.length);
  }

  function showBanner(msg, ms = 1500) {
    const b = $("phase-banner");
    b.textContent = msg;
    b.classList.add("show");
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove("show"), ms);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function roll([a, b]) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  /* ---------- player action ---------- */

  async function runAction(key, skill) {
    DBG("runAction start key=", key, "skill=", skill.id, "phase=", state.phase, "essence=", state.essence);
    if (state.phase !== "player") { DBG("runAction ignored (not player phase)"); return; }
    const p = party[key];
    if (p.hp <= 0 || p.acted || state.essence < skill.cost) { DBG("runAction ignored (hp/acted/cost)"); return; }

    state.phase = "animating";
    p.acted = true;
    state.essence -= skill.cost;
    DBG("runAction phase->animating, essence=", state.essence);
    renderEssence();
    renderActions();

    if (skill.kind === "damage") {
      const raw = roll(skill.power);
      DBG("runAction rolled", raw, "atkUp=", state.atkUp);
      let dmg = state.atkUp > 0 ? Math.round(raw * 1.35) : raw;
      if (skill.debuff) {
        state.enemyAtkDownDur = Math.max(state.enemyAtkDownDur, 2);
        state.enemyAtkDown = state.enemyAtkDownDur;
      }
      DBG("runAction awaiting scene.play attack...");
      await scene.play(key, "attack", 500);
      DBG("runAction scene.play done, applying damage", dmg);
      DBG("runAction CALL applyEnemyDamage");
      applyEnemyDamage(dmg, true);
      DBG("runAction RETURNED applyEnemyDamage, calling log");
      log(`${p.name} colpisce: ${dmg} danni`, "strong");
      DBG("runAction RETURNED log");
    } else if (skill.kind === "heal") {
      DBG("runAction awaiting scene.play heal...");
      await scene.play(key, "idle", 400);
      const amt = roll(skill.power);
      if (skill.all) {
        for (const k of PARTY_KEYS) {
          const t = party[k];
          if (t.hp <= 0) continue;
          const wasDead = t.hp <= 0;
          t.hp = Math.min(t.maxHp, t.hp + amt);
          if (wasDead) scene.resetPose(k);
          updateHp(k);
        }
        scene.healGlow(key);
        DBG("runAction heal all +", amt);
        log(`${p.name} redime: tutto il party recupera ${amt} PV`, "good");
      } else {
        const target = lowestHp();
        const wasDead = party[target].hp <= 0;
        party[target].hp = Math.min(party[target].maxHp, party[target].hp + amt);
        if (wasDead) scene.resetPose(target);
        scene.healGlow(target);
        updateHp(target);
        DBG("runAction heal", target, "+", amt);
        log(`${p.name} suona: ${party[target].name} recupera ${amt} PV`, "good");
      }
    } else if (skill.kind === "shield") {
      DBG("runAction awaiting scene.play shield...");
      await scene.play(key, "idle", 400);
      state.shield = Math.max(state.shield, skill.dur + 1);
      DBG("runAction shield set", state.shield);
      log(`${p.name} alza lo Scudo del Guardiano`, "good");
    } else if (skill.kind === "buff") {
      DBG("runAction awaiting scene.play buff...");
      await scene.play(key, "idle", 400);
      state.atkUpDur = Math.max(state.atkUpDur, skill.dur);
      state.atkUp = state.atkUpDur;
      DBG("runAction buff atkUp=", state.atkUp);
      log(`${p.name} desta la Risonanza: attacco potenziato`, "good");
    }

    DBG("runAction awaiting sleep(350)...");
    await sleep(350);
    DBG("runAction sleep done. victory=", isVictory(), "defeat=", isDefeat(), "phase2Done=", state.phase2Done, "paused=", paused);

    if (isVictory()) { DBG("runAction -> victory"); await handleVictory(); return; }
    if (isDefeat()) { DBG("runAction -> defeat"); await handleDefeat(); return; }

    if (state.phase2Done && !midPaused) { DBG("runAction -> maybeMid"); await maybeMid(); }
    if (!paused && !isVictory() && !isDefeat()) { DBG("runAction -> nextStep"); nextStep(); }
  }

  function lowestHp() {
    return PARTY_KEYS.reduce((best, k) => (party[k].hp < party[best].hp ? k : best), PARTY_KEYS[0]);
  }

  function applyEnemyDamage(dmg, fromPlayer) {
    enemy.hp -= dmg;
    if (fromPlayer) scene.flash("enemy");
    updateEnemy();
    if (enemy.mid && !state.phase2Done && enemy.hp <= enemy._maxHp * enemy.mid.pct) {
      state.phase2Done = true;
      state.phase2 = true;
    }
  }

  function nextStep() {
    DBG("nextStep phase=", state.phase);
    if (state.phase === "victory" || state.phase === "defeat") { DBG("nextStep return (ended)"); return; }
    const allActed = PARTY_KEYS.every((k) => party[k].acted);
    DBG("nextStep allActed=", allActed);
    if (allActed) {
      beginEnemyTurn();
    } else {
      state.phase = "player";
      DBG("nextStep -> player phase, renderActions");
      renderActions();
    }
  }

  /* ---------- enemy turn ---------- */

  async function beginEnemyTurn() {
    DBG("beginEnemyTurn round++");
    state.round++;
    state.essence = Math.min(state.essenceMax, state.essence + 5);
    renderEssence();
    for (const k of PARTY_KEYS) party[k].acted = false;
    state.shield = Math.max(0, state.shield - 1);
    if (state.atkUpDur > 0) { state.atkUpDur--; state.atkUp = state.atkUpDur; }
    if (state.enemyAtkDownDur > 0) { state.enemyAtkDownDur--; state.enemyAtkDown = state.enemyAtkDownDur; }
    DBG("beginEnemyTurn essence=", state.essence, "phase2=", state.phase2);

    if (!state.tutorialDone) {
      for (const line of TUTORIAL_LOG) log(line);
      state.tutorialDone = true;
    }

    renderActions();
    showBanner(state.phase2 ? (enemy.phase2Banner || "L'ULTIMO GIUDIZIO") : "L'attacco nemico");
    DBG("beginEnemyTurn awaiting sleep(700)...");
    await sleep(700);
    DBG("beginEnemyTurn sleep done, paused=", paused);

    if (paused) { DBG("beginEnemyTurn return (paused)"); return; }

    state.phase = "enemyParry";
    parry = { t: 0, dur: 900, pressed: false, done: false };
    showParry(true);
    scene.play("enemy", "attack", 900);
    DBG("beginEnemyTurn phase->enemyParry, window open");
  }

  function onPrimary() {
    DBG("onPrimary phase=", state.phase, "paused=", paused, "parry.pressed=", parry.pressed);
    if (paused) return;
    if (state.phase === "enemyParry" && !parry.pressed) {
      const pr = parry.t / parry.dur;
      const perfect = pr >= GOLD_LO && pr <= GOLD_HI;
      DBG("onPrimary parry at pr=", pr.toFixed(3), "perfect=", perfect);
      resolveParry(perfect, true);
    }
  }

  async function resolveParry(perfect, wasPressed) {
    DBG("resolveParry perfect=", perfect, "wasPressed=", wasPressed, "phase=", state.phase);
    parry.pressed = true;
    state.phase = "enemyResolve";
    showParry(false);

    const target = randomAlive();
    const raw = roll(enemy.atk) * (state.phase2 ? (enemy.phase2Mul || 1.25) : 1);
    let dmg = Math.round(raw);
    DBG("resolveParry raw=", raw, "target=", target);

    if (perfect) {
      scene.burst(scene.getPos("enemy"));
      scene.flash("enemy");
      const counter = Math.round(raw * 0.55);
      DBG("resolveParry counter=", counter);
      applyEnemyDamage(counter, true);
      log("PARATA PERFETTA! Colpo annullato.", "good");
      if (counter > 0) log(`Contrattacco: ${counter} danni al nemico.`, "strong");
    } else {
      if (state.shield > 0) {
        dmg = Math.round(dmg * 0.3);
        state.shield = 0;
        log("Lo Scudo del Guardiano assorbe il colpo.", "good");
      }
      if (state.enemyAtkDown > 0) {
        dmg = Math.round(dmg * 0.7);
        log("Oblio indebolisce l'attacco.", "good");
      }
      if (wasPressed) {
        dmg = Math.round(dmg * 0.4);
        log(`Parata imperfetta: subisci ${dmg} danni.`, "strong");
      } else {
        log(`${party[target].name} subisce ${dmg} danni.`, "danger");
      }
      DBG("resolveParry damageParty", target, dmg);
      damageParty(target, dmg);
    }

    DBG("resolveParry awaiting sleep(650)...");
    await sleep(650);
    DBG("resolveParry sleep done. victory=", isVictory(), "defeat=", isDefeat(), "phase2Done=", state.phase2Done, "paused=", paused, "midPaused=", midPaused);

    if (isVictory()) { DBG("resolveParry -> victory"); await handleVictory(); return; }
    if (isDefeat()) { DBG("resolveParry -> defeat"); await handleDefeat(); return; }

    if (!paused && !midPaused) {
      if (state.phase2Done) { DBG("resolveParry -> maybeMid"); await maybeMid(); }
      if (!paused && !isVictory() && !isDefeat()) {
        showBanner("Il tuo turno");
        state.phase = "player";
        DBG("resolveParry -> player phase, renderActions");
        renderActions();
      }
    }
  }

  function randomAlive() {
    const alive = PARTY_KEYS.filter((k) => party[k].hp > 0);
    return alive[Math.floor(Math.random() * alive.length)] || PARTY_KEYS[0];
  }

  function damageParty(target, dmg) {
    const p = party[target];
    p.hp = Math.max(0, p.hp - dmg);
    if (p.hp <= 0) {
      scene.ko(target);
    } else {
      scene.flash(target);
    }
    updateHp(target);
  }

  function isVictory() {
    return enemy.hp <= 0;
  }

  function isDefeat() {
    return PARTY_KEYS.every((k) => party[k].hp <= 0);
  }

  async function maybeMid() {
    DBG("maybeMid start midPaused=", midPaused, "phase2Done=", state.phase2Done, "midDone=", midDone);
    if (midPaused || !state.phase2Done || midDone) { DBG("maybeMid return (already done or not phase2)"); return; }
    midPaused = true;
    paused = true;
    state.phase = "mid";
    DBG("maybeMid awaiting onMidFight...");
    await onMidFight();
    DBG("maybeMid onMidFight resolved");
    midPaused = false;
    paused = false;
    midDone = true;
    if (enemy.mid && enemy.mid.heal) {
      enemy.hp = Math.min(enemy._maxHp, enemy.hp + enemy.mid.heal);
      updateEnemy();
      log(`${enemy.name} si rialza, più feroce di prima.`, "strong");
    }
    state.phase2 = true;
    DBG("maybeMid done, enemy.hp=", enemy.hp);
  }

  /* ---------- frame update ---------- */

  function update(dt) {
    if (paused) return;
    const now = performance.now();
    if (now - _lastHud > 500) {
      _lastHud = now;
      DBG("tick phase=", state.phase, "parry.t=", Math.round(parry.t), "hp[enemy]=", enemy.hp);
    }
    if (state.phase === "enemyParry") {
      parry.t += dt * 1000;
      drawParry(parry.t / parry.dur);
      if (parry.t >= parry.dur) {
        DBG("parry window timed out");
        parry.pressed = true;
        resolveParry(false, false);
      }
    }
    if (state.phase === "player" || state.phase === "animating") {
      if (state.phase === "player") drawParry(-1);
    }
  }

  /* ---------- parry UI ---------- */

  function showParry(on) {
    $("parry-overlay").classList.toggle("active", on);
    if (!on) {
      const ctx = $("parry-canvas").getContext("2d");
      ctx.clearRect(0, 0, 220, 220);
      $("parry-prompt").classList.remove("gold");
    }
  }

  function drawParry(pr) {
    const cv = $("parry-canvas");
    const ctx = cv.getContext("2d");
    const cx = 110, cy = 110, r = 88;
    ctx.clearRect(0, 0, 220, 220);

    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(232,228,216,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(193,75,63,0.9)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, Math.min(pr, 1)));
    ctx.stroke();

    ctx.strokeStyle = "rgba(242,211,137,1)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2 + Math.PI * 2 * GOLD_LO, -Math.PI / 2 + Math.PI * 2 * GOLD_HI);
    ctx.stroke();

    ctx.strokeStyle = "rgba(242,211,137,0.25)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2 + Math.PI * 2 * GOLD_LO, -Math.PI / 2 + Math.PI * 2 * GOLD_HI);
    ctx.stroke();

    const inGold = pr >= GOLD_LO && pr <= GOLD_HI;
    $("parry-prompt").classList.toggle("gold", inGold);
  }

  function setPaused(v) {
    paused = v;
  }

  async function handleVictory() {
    DBG("handleVictory");
    state.phase = "victory";
    log("Il nemico crolla.", "strong");
    scene.ko("enemy");
    await sleep(900);
    DBG("handleVictory calling onWin");
    onWin();
  }

  async function handleDefeat() {
    DBG("handleDefeat");
    state.phase = "defeat";
    log("Il gruppo è caduto…", "danger");
    await sleep(700);
    DBG("handleDefeat calling onDefeat");
    onDefeat();
  }
}
