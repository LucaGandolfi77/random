import { getAllCards, createUnit, applyAbility, createEvolvedUnit, getFusablePairs } from './card-engine.js';
import { NATURE_ULTIMATE } from '../data/nature.js';
import { getNextWeather, getSeason, WEATHER_TYPES, applyWeatherEffect } from '../data/weather.js';
import { getCompanion } from '../data/companions.js';
import { getBoss, getNextBoss } from '../data/bosses.js';
import { getUnlockedAchievements, getNewAchievements } from '../data/achievements.js';
import { AIController } from './ai-controller.js';
import { Deck, Arena } from './arena.js';
import { ParticleSystem } from './particles.js';
import { AudioManager } from './audio.js';
import { saveStats, loadStats, addWinToStats, addLossToStats, addThreeStarWin, trackCardPlay, saveHighScore, addToLeaderboard } from './save.js';
import { showToast } from './utils.js';
import { canFuse, getFusionRecipe } from '../data/fusions.js';

const EMAX = 4;
const SUPER_EMAX = 2;
const FIELD_WIDTH = 3;

export class Game {
  constructor() {
    this.audio = new AudioManager();
    this.particles = null;
    this.ai = null;
    this.arena = new Arena();
    this.playerDeck = null;
    this.elixir = 2;
    this.superElixir = 0;
    this.gameState = 'menu';
    this.difficulty = 'medium';
    this.turnCount = 0;
    this.isProcessing = false;
    this.menuAnims = null;
     this.fusionSlots = [null, null];
     this.fusionActive = false;
     this.natureMeter = 0;
     this.selectedCompanion = null;
     this.weather = getNextWeather('SUNNY', 0);
     this.season = getSeason(0);
     this.weatherTimer = 0;
     this.weatherTransition = false;
     this.boss = null;
     this.bossActive = false;
     this.bossShield = 0;
     this.bossPowerLevel = 0;
     this.bossStolenCard = null;
     this.ultimateCooldown = 0;
     this.fusionBoost = 0;
     this.fusionsThisGame = 0;
     this.ultimateUsesThisGame = 0;
     this.bossAttackProcessed = false;
     this.volume = 0.8;
     this.muted = false;
     this.paused = false;
     this.battleLog = [];
     this.lastFrameTime = 0;
     this.secondAccum = 0;
     this.turnDiscountReady = false;
     this.superElixirTurnMark = 0;
     this.gameOverHandled = false;
  }

  init(canvas) {
    this.particles = new ParticleSystem(canvas);
    this.particles.resize();
    window.addEventListener('resize', () => this.particles.resize());
    this.stats = loadStats();
    this.particles.start();
    this.animateMenu();
  }

  animateMenu() {
    // Particle rendering runs continuously via particles.start();
    // this only ensures any stale menu animation handle is cleared.
    if (this.menuAnims) {
      cancelAnimationFrame(this.menuAnims);
      this.menuAnims = null;
    }
  }

  startGame(difficulty, companionId = null) {
    if (this.menuAnims) { cancelAnimationFrame(this.menuAnims); this.menuAnims = null; }
    this.difficulty = difficulty;
    this.selectedCompanion = companionId || this.selectedCompanion || null;
    this.audio.init();
    this.gameState = 'playing';
    this.turnCount = 0;
    this.elixir = 2;
    this.superElixir = 0;
    this.superElixirTurnMark = 0;
    this.isProcessing = false;
    this.fusionSlots = [null, null];
    this.fusionActive = false;
    this.natureMeter = 0;
    this.weather = getNextWeather('SUNNY', 0);
    this.season = getSeason(0);
    this.weatherTimer = 0;
    this.battleLog = [];
    this.lastFrameTime = 0;
    this.secondAccum = 0;
    this.turnDiscountReady = false;
    this.ultimateCooldown = 0;
    this.fusionBoost = 0;
    this.bossActive = false;
    this.boss = null;
    this.bossShield = 0;
    this.bossPowerLevel = 0;
    this.bossStolenCard = null;
    this.gameOverHandled = false;

    this.ai = new AIController(difficulty);
    this.ai.hand = [];
    this.ai.elixir = 2;
    this.ai.refillHand(this.ai.hand);

    this.playerDeck = new Deck();
    const deckIds = (this.stats && this.stats.currentDeck && this.stats.currentDeck.length)
      ? this.stats.currentDeck
      : ['moss_wisp', 'spore_sprout', 'dartling', 'starling_scout', 'elder_tree', 'moon_fox', 'acorn_bomber', 'breeze_lark'];
    this.playerDeck.cards = deckIds
      .map(id => getAllCards().find(c => c.id === id))
      .filter(c => c);
    if (this.playerDeck.cards.length === 0) {
      this.playerDeck.cards = getAllCards().slice(0, 8);
    }
    this.playerDeck.shuffle();
    this.playerDeck.hand = [];
    this.playerDeck.drawInitial();
    this.playerDeck.discard = [];

    this.arena.reset();

    this.bossAttackProcessed = false;
    this.fusionsThisGame = 0;
    this.ultimateUsesThisGame = 0;
    this.bossPowerLevel = 0;
    this.paused = false;

    const dialogue = this.ai.getDialogue();
    showToast(dialogue.intro, 3000);
    this.renderCompanionHUD();

    // Position all units
    this.positionUnits();

    this.gameLoop();
    this.renderHand();
    this.renderAIHand();
    this.renderHUD();
    this.renderArena();
    this.renderFusionBar();
    this.renderBossHUD();
  }

  positionUnits() {
    const playerLaneX = [100, 200, 300];
    const enemyLaneX = [100, 200, 300];
    this.arena.playerUnits.forEach((u, i) => {
      u.x = playerLaneX[u.lane] || 200;
      u.y = 420;
    });
    this.arena.enemyUnits.forEach((u, i) => {
      u.x = enemyLaneX[u.lane] || 200;
      u.y = 140;
    });
  }

  refillHands() {
    if (this.gameState !== 'playing') return;
    if (this.ai) this.ai.refillHand(this.ai.hand);
    while (this.playerDeck.getHandSize() < 4 && (this.playerDeck.cards.length > 0 || (this.playerDeck.discard && this.playerDeck.discard.length > 0))) {
      if (!this.playerDeck.draw()) break;
    }
    this.renderHand();
    this.renderAIHand();
  }

  async playCard(index) {
    if (this.gameState !== 'playing' || this.isProcessing) return;
    if (this.paused) return;

    const card = this.playerDeck.play(index);
    if (!card) return;

    let cost = card.elixir;
    if (this.selectedCompanion === 'moon_spirit' && this.turnDiscountReady) {
      cost = Math.max(0, cost - 1);
    }

    if (this.elixir < cost) {
      this.playerDeck.unplay(index, card);
      return;
    }

    this.elixir -= cost;
    if (this.selectedCompanion === 'moon_spirit') this.turnDiscountReady = false;
    this.audio.cardPlay();
    trackCardPlay(this.stats, card.id);

    const lane = this.chooseLane();
    const unit = createUnit(card, 'player', lane);
    this.applyWeatherToUnit(unit);
    unit.x = [100, 200, 300][lane] || 200;
    unit.y = 420;
    this.arena.addUnit(unit, 'player');

    const allUnits = this.arena.playerUnits.concat(this.arena.enemyUnits);
    applyAbility(card.ability, unit, allUnits);

    this.particles.addBurst(unit.x, unit.y, unit.color, 12);
    this.particles.addFloatText(unit.x, unit.y - 30, unit.emoji + '!', unit.color);

    this.battleLog.push(`${card.name} played in lane ${lane}`);
    this.turnCount++;
    this.natureMeter = Math.min(100, this.natureMeter + 8);

    this.ai.updateEmotion(card.ability && card.ability.includes('heal') ? 'heal' : 'damage', { enemyTauntCount: 0, playedCards: [] });
    this.isProcessing = true;
    await this.handleAIturn();
    this.isProcessing = false;
    this.turnDiscountReady = true;
    this.refillHands();
    this.checkFusions();
    this.renderHand();
    this.renderHUD();
    this.renderFusionBar();
    this.renderArena();
  }

  applyWeatherToUnit(unit) {
    const src = getAllCards().find(c => c.id === unit.cardId);
    if (!src) return;
    const eff = applyWeatherEffect(src, this.weather);
    unit.dmg = eff.dmg;
    unit.hp = eff.hp;
    unit.maxHp = eff.hp;
    unit.speed = eff.speed;
  }

  chooseLane() {
    const slots = this.arena.getLaneSlots('player');
    const emptyLanes = slots.filter(s => !s.unit).map(s => s.lane);
    if (emptyLanes.length > 0) {
      return emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
    }
    return slots[Math.floor(Math.random() * slots.length)].lane;
  }

  async handleAIturn() {
    this.isProcessing = true;
    await this.sleep(600);

    let safety = 0;
    while (this.gameState === 'playing' && this.ai.canPlay(this.ai.hand, this.ai.elixir) && this.ai.hand.length > 0 && safety < 10) {
      safety++;
      this.ai.updateEmotion('damage', { enemyTauntCount: 0, playedCards: [] });
      const card = this.ai.chooseCard(this.ai.hand, {
        enemyUnits: this.arena.playerUnits.filter(u => u.alive),
        enemyTauntCount: 0,
        playedCards: []
      });

      if (!card || this.ai.elixir < card.elixir) break;

      this.ai.elixir -= card.elixir;
      const lane = this.ai.chooseLane([0, 1, 2], { enemyUnits: this.arena.playerUnits.filter(u => u.alive), enemyTauntCount: 0, playedCards: [] });
      const unit = createUnit(card, 'enemy', lane);
      this.applyWeatherToUnit(unit);
      unit.x = [100, 200, 300][lane] || 200;
      unit.y = 140;
      this.arena.addUnit(unit, 'enemy');
      const allUnits = this.arena.playerUnits.concat(this.arena.enemyUnits);
      applyAbility(card.ability, unit, allUnits);
      this.ai.hand.splice(this.ai.hand.indexOf(card), 1);

      // Thorn Spirit: enemy takes damage when entering a lane with a player taunt
      if (this.selectedCompanion === 'thorn_spirit') {
        const tauntInLane = this.arena.playerUnits.find(u => u.alive && u.lane === lane && u.ability === 'taunt');
        if (tauntInLane) {
          unit.hp -= 5;
          this.particles.addFloatText(unit.x, unit.y - 20, '-5', '#ffd93d');
          if (unit.hp <= 0) unit.alive = false;
        }
      }

      this.particles.addBurst(unit.x, unit.y, unit.color, 8);
      this.audio.unitAttack();
      this.battleLog.push(`AI played ${card.name}`);
      if (this.gameState !== 'playing') break;
      await this.sleep(400);
    }

    this.ai.refillHand(this.ai.hand);
    this.isProcessing = false;
    if (this.gameState !== 'playing') return;
    // Show emotion dialogue periodically
    if (Math.random() < 0.3 && this.ai) {
      const emo = this.ai.getEmotion();
      const emoDialogue = this.ai.getEmotionDialogue();
      if (emoDialogue.think) {
        showToast(`${emo.emoji} The Hollow ${emo.state}: "${emoDialogue.think}"`, 2000);
      }
    }
    // Boss mechanics during turn
    if (this.bossActive && this.boss) {
      this.updateBossMechanics();
    }
    this.arena.clearDead();
    this.checkBattleState();
    this.renderAIHand();
    this.renderHUD();
    this.renderArena();
  }

   gameLoop(timestamp = 0) {
     if (this.gameState !== 'playing') return;
     if (this.paused) {
       this.lastFrameTime = timestamp;
       requestAnimationFrame((t) => this.gameLoop(t));
       return;
     }

    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const dt = Math.min(250, timestamp - this.lastFrameTime);
    this.lastFrameTime = timestamp;
    this.secondAccum += dt;

    // Move units
    this.moveUnits();
    this.bossAttackProcessed = false;
    // Auto combat
    this.doCombat();
    // Clean dead
    this.arena.clearDead();
    // Apply companion passive effects (once per second)
    // Check for boss encounter
    this.checkBossEncounter();

    // Once-per-second balance ticks
    while (this.secondAccum >= 1000) {
      this.secondAccum -= 1000;
      this.tickSecond();
      if (this.gameState !== 'playing') return;
    }

    // Check game over
    this.checkBattleState();
    if (this.gameState !== 'playing') return;
    // Render
    this.renderArena();
    this.renderHUD();
    this.renderFusionBar();
    this.renderBossHUD();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  tickSecond() {
    // Elixir regen for both sides
    this.elixir = Math.min(EMAX, this.elixir + 0.5);
    if (this.ai) this.ai.elixir = Math.min(this.ai.maxElixir, this.ai.elixir + 0.5);

    // Companion passives
    this.applyCompanionEffects();

    // Ultimate cooldown
    if (this.ultimateCooldown > 0) {
      this.ultimateCooldown--;
    }

    // Nature meter decay (slow)
    this.natureMeter = Math.max(0, this.natureMeter - 1);

    // Weather cycle (every 8 seconds)
    this.weatherTimer++;
    if (this.weatherTimer >= 8) {
      const newWeather = getNextWeather(this.weather, this.turnCount);
      if (newWeather !== this.weather) {
        this.weather = newWeather;
        this.season = getSeason(this.turnCount);
        this.audio.weatherChange(this.weather);
        this.weatherTransition = true;
        if (this.particles) this.particles.initWeatherParticles(newWeather);
        const wt = WEATHER_TYPES[this.weather];
        showToast(`${wt.emoji} Weather: ${wt.name}!`, 2500);
      }
      this.weatherTimer = 0;
    }

    // Super elixir: gain 1 whenever turn count crosses a multiple of 5
    if (this.turnCount > 0 && Math.floor(this.turnCount / 5) > this.superElixirTurnMark) {
      this.superElixirTurnMark = Math.floor(this.turnCount / 5);
      this.superElixir = Math.min(SUPER_EMAX, this.superElixir + 1);
    }
  }

  moveUnits() {
    const allUnits = this.arena.playerUnits.concat(this.arena.enemyUnits);

    this.arena.playerUnits.forEach(u => {
      if (!u.alive) return;
      const enemy = this.findEnemyInLane(u);
      if (enemy) {
        const dist = Math.abs(enemy.x - u.x);
        if (dist > u.range * 40) {
          u.x = Math.min(enemy.x - 5, u.x + u.speed * 2);
        }
      } else {
        // Move toward enemy structure
        u.x = Math.min(500, u.x + u.speed * 1.5);
      }
    });

    this.arena.enemyUnits.forEach(u => {
      if (!u.alive) return;
      const enemy = this.findPlayerUnitInLane(u);
      if (enemy) {
        const dist = Math.abs(enemy.x - u.x);
        if (dist > u.range * 40) {
          u.x = Math.max(enemy.x + 5, u.x - u.speed * 2);
        }
      } else {
        u.x = Math.max(0, u.x - u.speed * 1.5);
      }
    });
  }

  findEnemyInLane(unit) {
    return this.arena.enemyUnits.find(e => e.alive && e.lane === unit.lane) || null;
  }

  findPlayerUnitInLane(unit) {
    return this.arena.playerUnits.find(e => e.alive && e.lane === unit.lane) || null;
  }

  doCombat() {
    const now = performance.now();
    [this.arena.playerUnits, this.arena.enemyUnits].forEach(units => {
      units.forEach(u => {
        if (!u.alive) return;
        if (!u.nextAttackAt) u.nextAttackAt = 0;
        if (now < u.nextAttackAt) return;

        const isPlayer = units === this.arena.playerUnits;
        const target = isPlayer ? this.findEnemyInLane(u) : this.findPlayerUnitInLane(u);

        if (!target || !target.alive) {
          // Attack structure only when close enough
          const struct = isPlayer ? this.arena.enemyStructure : this.arena.playerStructure;
          const structX = isPlayer ? 500 : 0;
          const distToStruct = Math.abs(structX - u.x);
          if (struct.alive && distToStruct <= u.range * 40 + 30) {
            let dmg = u.dmg;
            if (isPlayer) dmg = this.applyBossDamage(dmg);
            if (dmg > 0) {
              struct.hp = Math.max(0, struct.hp - dmg);
              this.audio.unitAttack();
              const labelX = isPlayer ? 500 : 0;
              this.particles.addFloatText(labelX, 80, `-${dmg}`, '#ff6b6b');
              if (struct.hp <= 0) struct.alive = false;
            }
            u.nextAttackAt = now + this.attackInterval(u);
          }
          return;
        }

        const dist = Math.abs(target.x - u.x);
        if (dist <= u.range * 40 + 15) {
          const dmg = u.dmg;
          target.hp -= dmg;
          this.audio.unitHit();
          this.particles.addFloatText(target.x, target.y - 20, `-${dmg}`, '#ff6b6b');

          if (target.hp <= 0) {
            target.alive = false;
            this.audio.unitDeath();
            this.particles.addBurst(target.x, target.y, target.color, 8);
          }
          u.nextAttackAt = now + this.attackInterval(u);
        }
      });
    });
    if (this.bossActive && this.boss && !this.bossAttackProcessed) {
      this.processBossAttack();
      this.bossAttackProcessed = true;
    }
  }

  attackInterval(unit) {
    // Faster units attack faster; base 900ms
    const speed = Math.max(0.2, unit.speed || 1);
    return Math.max(350, 900 / speed);
  }

  processBossAttack() {
    if (!this.boss || this.gameState !== 'playing') return;
    const playerAlive = this.arena.playerUnits.filter(u => u.alive);
    const bossDmg = this.boss.attackDmg || 12;
    if (playerAlive.length > 0) {
      const target = playerAlive[Math.floor(Math.random() * playerAlive.length)];
      target.hp -= bossDmg;
      this.audio.bossAttack();
      this.particles.addFloatText(target.x, target.y - 20, '-' + bossDmg, '#ff6b6b');
      if (target.hp <= 0) {
        target.alive = false;
        this.audio.unitDeath();
        this.particles.addBurst(target.x, target.y, target.color, 8);
      }
    } else if (this.arena.playerStructure.hp > 0) {
      this.arena.playerStructure.hp = Math.max(0, this.arena.playerStructure.hp - bossDmg);
      this.audio.bossAttack();
      this.particles.addFloatText(0, 60, '-' + bossDmg, '#ff6b6b');
    }
    this.arena.clearDead();
  }

  checkBattleState() {
    if (this.arena.isGameOver()) {
      const winner = this.arena.getWinner();
      this.endGame(winner);
    }
  }

  endGame(winner) {
    if (this.gameOverHandled || this.gameState === 'over') return;
    this.gameOverHandled = true;
    this.gameState = 'over';
    const dialogue = this.ai ? this.ai.getDialogue() : { win: 'Victory!', lose: 'Defeat...' };

    // Record boss defeat BEFORE clearing boss state
    if (this.bossActive && this.boss && winner === 'player' && this.stats) {
      this.stats.bossesDefeated = (this.stats.bossesDefeated || 0) + 1;
    }

    if (winner === 'player') {
      this.audio.victory();
      const hpRem = this.arena.enemyStructure.hp;
      const stars = hpRem > 150 ? 3 : hpRem > 75 ? 2 : 1;
      if (stars === 3) addThreeStarWin(this.stats);
      addWinToStats(this.stats);
      showToast(`${dialogue.win} ${stars}⭐!`, 3000);
      if (this.particles) this.particles.addBurst(window.innerWidth / 2, window.innerHeight / 2, '#ffd93d', 50);
    } else {
      this.audio.defeat();
      addLossToStats(this.stats);
      showToast(dialogue.lose, 3000);
    }

    if (this.bossActive) {
      this.endBossBattle(winner === 'player');
    }
    // Track stats for achievements
    this.trackAchievements();
    saveStats(this.stats);
    this.saveLeaderboard();
    // Check new achievements
    this.checkAchievements();
    this.renderEndScreen(winner);
  }

  renderHand() {
    const handContainer = document.getElementById('player-hand');
    if (!handContainer) return;
    handContainer.innerHTML = '';
    const hand = this.playerDeck.getHand();
    hand.forEach((card, index) => {
      const div = this.makeCardEl(card, index);
      let cost = card.elixir;
      if (this.selectedCompanion === 'moon_spirit' && this.turnDiscountReady) {
        cost = Math.max(0, cost - 1);
        div.style.borderColor = '#9b6dff';
        div.style.boxShadow = '0 0 12px rgba(155,109,255,0.45)';
      }
      if (this.elixir < cost) div.style.opacity = '0.55';
      div.addEventListener('click', () => this.playCard(index));
      handContainer.appendChild(div);
    });
  }

  makeCardEl(card, index) {
    const div = document.createElement('div');
    div.className = `card-element rarity-${card.rarity}`;
    div.style.borderColor = card.color;
    div.innerHTML = `
      <span class="rarity-badge ${card.rarity}">${card.rarity.charAt(0).toUpperCase()}</span>
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-stats">
        <span class="card-elixir">⚡${card.elixir}</span>
        <span class="card-hp">❤️${card.hp}</span>
        <span class="card-dmg">⚔️${card.dmg}</span>
      </div>
      <div class="card-rarity" style="color:${card.color}">${card.rarity}</div>
    `;
    return div;
  }

  renderAIHand() {
    const el = document.getElementById('enemy-hand');
    if (!el) return;
    const count = this.ai.hand.length;
    el.style.display = count > 0 ? 'flex' : 'none';
    el.textContent = count > 0 ? `${count} 🃏` : '';
  }

  renderArena() {
    const field = document.getElementById('battle-field');
    if (!field) return;
    field.innerHTML = '';

    // Enemy units
    this.arena.enemyUnits.filter(u => u.alive).forEach(u => {
      const el = this.makeUnitEl(u, 'enemy');
      el.style.left = `${u.x}px`;
      el.style.top = `${u.y}px`;
      field.appendChild(el);
    });

    // Player units
    this.arena.playerUnits.filter(u => u.alive).forEach(u => {
      const el = this.makeUnitEl(u, 'player');
      el.style.left = `${u.x}px`;
      el.style.top = `${u.y}px`;
      field.appendChild(el);
    });

    // Structures
    const pStruct = document.createElement('div');
    pStruct.className = 'structure-display player-struct-display';
    pStruct.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);';
    pStruct.innerHTML = `<span>🪵</span> <span style="font-weight:800;color:var(--accent-mint)">${Math.max(0, this.arena.playerStructure.hp)}</span>`;
    field.appendChild(pStruct);

    const eStruct = document.createElement('div');
    eStruct.className = 'structure-display enemy-struct-display';
    eStruct.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);';
    eStruct.innerHTML = `<span>🪵</span> <span style="font-weight:800;color:var(--accent-coral)">${Math.max(0, this.arena.enemyStructure.hp)}</span>`;
    field.appendChild(eStruct);
  }

  makeUnitEl(unit, side) {
    const el = document.createElement('div');
    el.className = `arena-unit ${side}-unit rarity-${unit.rarity}`;
    el.innerHTML = `
      <span class="rarity-badge ${unit.rarity}">${unit.rarity.charAt(0).toUpperCase()}</span>
      <div class="card-back"><div class="card-back-inner"></div></div>
      <div class="card-front">
        <span class="unit-emoji">${unit.emoji}</span>
        <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:${Math.max(0,(unit.hp/unit.maxHp)*100)}%"></div></div>
        <span class="unit-name">${unit.name}</span>
      </div>
    `;
    return el;
  }

  renderHUD() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('elixir-value', `${Math.floor(this.elixir)}/${EMAX}`);
    set('player-struct-hp', `${Math.max(0, this.arena.playerStructure.hp)}`);
    set('enemy-struct-hp', `${Math.max(0, this.arena.enemyStructure.hp)}`);
    set('turn-count', this.turnCount);
    // Emotion indicator
    const emoEl = document.getElementById('emotion-indicator');
    if (emoEl && this.ai) {
      const emo = this.ai.getEmotion();
      emoEl.textContent = `${emo.emoji} ${emo.state.charAt(0).toUpperCase() + emo.state.slice(1)}`;
      emoEl.style.color = emo.color;
    }
    // Weather indicator
    const weatherEl = document.getElementById('weather-indicator');
    if (weatherEl && this.weather) {
      const wt = WEATHER_TYPES[this.weather];
      if (wt) {
        weatherEl.textContent = `${wt.emoji} ${wt.name}`;
        weatherEl.style.color = wt.color;
        weatherEl.style.borderColor = wt.color + '40';
      }
    }
    // Season display
    const seasonEl = document.getElementById('season-display');
    if (seasonEl) {
      seasonEl.textContent = `${getSeason(this.turnCount)} 🌿`;
    }
  }

  renderEndScreen(winner) {
    const overlay = document.getElementById('end-overlay');
    const title = document.getElementById('end-title');
    const info = document.getElementById('end-info');
    const kills = document.getElementById('end-kills');
    const restartBtn = document.getElementById('restart-btn');

    if (!overlay) return;
    overlay.classList.remove('hidden');

    if (winner === 'player') {
      title.textContent = '🌿 Victory!';
      title.style.color = '#4ecdc4';
      info.textContent = `The Forest Guardian has fallen! 🌸`;
      kills.textContent = `Turns survived: ${this.turnCount}`;
    } else {
      title.textContent = '💔 Defeat';
      title.style.color = '#ff6b6b';
      info.textContent = `The Hollow proved too strong... 🌙`;
      kills.textContent = `Turns survived: ${this.turnCount}`;
    }

    if (restartBtn) {
      restartBtn.onclick = null;
    }
  }

  goToMenu() {
    this.gameState = 'menu';
    this.paused = false;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    this.animateMenu();
    hideEl('battle-screen');
    hideEl('end-overlay');
    showEl('menu-screen');
  }

  checkBossEncounter() {
    if (!this.stats) return;
    if (this.stats.wins % 5 === 4 && !this.bossActive) {
      const boss = getNextBoss(this.stats.wins);
      if (boss) {
        this.bossActive = true;
        this.boss = { ...boss };
        this.bossShield = boss.shield || 0;
        this.bossPowerLevel = 0;
        this.audio.bossEncounter(this.boss);
        showToast('WARNING: BOSS BATTLE: ' + this.boss.emoji + ' ' + this.boss.name + '!', 3000);
        this.arena.enemyStructure.hp = this.boss.hp;
        this.arena.enemyStructure.maxHp = this.boss.hp;
        this.arena.enemyStructure.alive = true;
        this.renderArena();
        this.renderHUD();
        this.renderBossHUD();
      }
    }
  }

  updateBossMechanics() {
    if (!this.boss || this.gameState !== 'playing') return;

    if (this.boss.id === 'shadow_queen') {
      // Steal a random card from the player's hand
      if (this.playerDeck && this.playerDeck.hand.length > 0) {
        const idx = Math.floor(Math.random() * this.playerDeck.hand.length);
        const stolen = this.playerDeck.hand.splice(idx, 1)[0];
        this.bossStolenCard = stolen;
        showToast(`👸 The Shadow Queen stole ${stolen.emoji} ${stolen.name}!`, 2500);
        this.renderHand();
      }
    } else if (this.boss.id === 'ancient_dragon') {
      // Doubles attack power every 3 boss turns
      this.bossPowerLevel++;
      if (this.bossPowerLevel % 3 === 0) {
        this.boss.attackDmg = (this.boss.attackDmg || 12) * 2;
        showToast(`🐉 ${this.boss.name} doubles its power! (ATK ${this.boss.attackDmg})`, 2500);
        this.audio.bossAttack();
      }
    }
    // thorn_king shield is handled in applyBossDamage
    this.renderBossHUD();
  }

  applyBossDamage(damage) {
    if (!this.bossActive || !this.boss) return damage;
    if (this.boss.id === 'thorn_king' && this.bossShield > 0) {
      this.bossShield--;
      showToast('🛡️ Shield absorbs the hit! (' + this.bossShield + ' remaining)', 1500);
      this.audio.bossAttack();
      return 0;
    }
    return damage;
  }

  endBossBattle(won) {
    if (!this.bossActive) return;
    const boss = this.boss;
    this.bossActive = false;
    this.bossShield = 0;
     this.bossPowerLevel = 0;
     this.bossStolenCard = null;
     if (won) {
      this.audio.bossDefeat(boss);
      showToast(boss.winDialogue + ' Reward unlocked!', 3000);
    } else {
      showToast(boss.loseDialogue, 3000);
    }
    this.boss = null;
    this.arena.enemyStructure.hp = 200;
    this.arena.enemyStructure.maxHp = 200;
  }

  renderBossHUD() {
    const hud = document.getElementById('boss-hud');
    if (!hud) return;
    if (!this.bossActive || !this.boss) {
      hud.style.display = 'none';
      return;
    }
    const boss = this.boss;
    const hpRatio = Math.max(0, this.arena.enemyStructure.hp / boss.maxHp * 100);
    hud.style.display = 'flex';
    let shieldHtml = '';
    if (this.bossShield > 0) {
      shieldHtml = '<span style="font-size:0.7rem">🛡' + this.bossShield + '</span>';
    }
    hud.innerHTML = '<span style="font-size:1.2rem">' + boss.emoji + '</span><span style="font-size:0.75rem;font-weight:800;color:' + boss.color + '">' + boss.name + '</span><div style="width:80px;height:6px;background:rgba(0,0,0,0.2);border-radius:99px;overflow:hidden;"><div style="width:' + hpRatio + '%;height:100%;background:' + boss.color + ';border-radius:99px;transition:width 300ms;"></div></div><span style="font-size:0.65rem;font-weight:700;color:' + boss.color + '">' + Math.max(0,this.arena.enemyStructure.hp) + '/' + boss.maxHp + '</span>' + shieldHtml;
  }

  activateUltimate() {
    if (this.natureMeter < NATURE_ULTIMATE.activationCost || this.ultimateCooldown > 0) return;
    this.ultimateUsesThisGame++;
    this.audio.ability();
    this.natureMeter = 0;
    this.ultimateCooldown = NATURE_ULTIMATE.cooldown;

    const allUnits = this.arena.playerUnits.concat(this.arena.enemyUnits);
    const aliveAllies = allUnits.filter(u => u.alive && u.owner === 'player');
    const aliveEnemies = allUnits.filter(u => u.alive && u.owner === 'enemy');

    // AOE damage to enemies
    aliveEnemies.forEach(e => {
      e.hp -= NATURE_ULTIMATE.effects.damage;
      this.particles.addBurst(e.x, e.y, '#ffd93d', 15);
      this.particles.addFloatText(e.x, e.y - 20, `-${NATURE_ULTIMATE.effects.damage}`, '#ff6b6b');
    });

    // Heal allies
    aliveAllies.forEach(a => {
      a.hp = Math.min(a.maxHp, a.hp + NATURE_ULTIMATE.effects.healAmount);
      this.particles.addBurst(a.x, a.y, '#4ecdc4', 15);
      this.particles.addFloatText(a.x, a.y - 20, `+${NATURE_ULTIMATE.effects.healAmount}`, '#4ecdc4');
    });

    // Fusion boost for next fusion
    this.fusionBoost = NATURE_ULTIMATE.effects.fusionBoost;
    this.particles.addFusionBurst(300, 250, '#ffd93d', 40);
    this.particles.addFusionRing(300, 250);
    showToast('🌿 NATURE WRATH! 🔥', 2000);
    this.audio.ultimateActivate();

    // Check battle state
    this.arena.clearDead();
    this.checkBattleState();
  }

  trackAchievements() {
    if (!this.stats) return;
    this.stats.fusions = (this.stats.fusions || 0) + (this.fusionsThisGame || 0);
    // Earn essences from battle
    const essences = this.stats.essences || {};
    if (this.arena.playerUnits.length > 0 || this.stats.wins > 0) {
      const rarityCounts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
      this.arena.playerUnits.forEach(u => { rarityCounts[u.rarity] = (rarityCounts[u.rarity] || 0) + 1; });
      for (const [r, count] of Object.entries(rarityCounts)) {
        if (count > 0) {
          essences[r] = (essences[r] || 0) + count;
        }
      }
    }
    this.stats.essences = essences;
    // Track essences from card rarity
    if (!this.stats.essences) this.stats.essences = {};
    if (this.weather && (!this.stats.weatherTypes || !this.stats.weatherTypes.includes(this.weather))) {
      if (!this.stats.weatherTypes) this.stats.weatherTypes = [];
      this.stats.weatherTypes.push(this.weather);
    }
    if (this.ultimateUsesThisGame > 0) {
      this.stats.ultimateUses = (this.stats.ultimateUses || 0) + this.ultimateUsesThisGame;
    }
    if (this.selectedCompanion && (!this.stats.companionsUsed || !this.stats.companionsUsed.includes(this.selectedCompanion))) {
      if (!this.stats.companionsUsed) this.stats.companionsUsed = [];
      this.stats.companionsUsed.push(this.selectedCompanion);
    }
    const score = this.stats.wins * 100 + this.stats.threeStarWins * 500;
    if (score > (this.stats.highScore || 0)) {
      this.stats.highScore = score;
      saveHighScore(this.stats);
    }
    this.stats.weatherTypes = this.stats.weatherTypes || [];
    this.stats.companionsUsed = this.stats.companionsUsed || [];
    this.stats.achievementsUnlocked = this.stats.achievementsUnlocked || [];
    this.stats.cardsPlayed = this.stats.cardsPlayed || {};
    this.stats.essences = this.stats.essences || {};
    this.stats.currentDeck = this.stats.currentDeck || [];
  }

  saveLeaderboard() {
    if (!this.stats) return;
    const name = 'Player';
    const score = this.stats.wins * 100 + this.stats.threeStarWins * 500;
    addToLeaderboard(name, score);
  }

  checkAchievements() {
    if (!this.stats) return;
    const unlocked = getUnlockedAchievements(this.stats);
    const newOnes = getNewAchievements(this.stats, this.stats.achievementsUnlocked || []);
    if (newOnes.length > 0) {
      newOnes.forEach(a => {
        showToast('🏆 Achievement unlocked: ' + a.icon + ' ' + a.name + '!', 3000);
        this.audio.ability();
      });
      if (!this.stats.achievementsUnlocked) this.stats.achievementsUnlocked = [];
      unlocked.forEach(a => {
        if (!this.stats.achievementsUnlocked.includes(a.id)) {
          this.stats.achievementsUnlocked.push(a.id);
        }
      });
    }
  }

  applyCompanionEffects() {
    if (!this.selectedCompanion || !this.ai) return;
    const comp = getCompanion(this.selectedCompanion);
    if (!comp) return;

    if (comp.ability === 'center_boost') {
      this.arena.playerUnits.forEach(u => {
        if (!u.alive) return;
        if (u.baseDmg === undefined) u.baseDmg = u.dmg;
        u.dmg = u.lane === 1 ? Math.floor(u.baseDmg * 1.15) : u.baseDmg;
      });
    } else if (comp.ability === 'regen') {
      this.arena.playerUnits.forEach(u => {
        if (u.alive) u.hp = Math.min(u.maxHp, u.hp + 2);
      });
    }
    // first_discount / thorn_retaliation / fusion_boost are handled in playCard / handleAIturn / activateFusion
  }

  renderCompanionHUD() {
    const compEl = document.getElementById('companion-hud');
    if (!compEl) return;
    if (!this.selectedCompanion) {
      compEl.style.display = 'none';
      return;
    }
    const comp = getCompanion(this.selectedCompanion);
    compEl.style.display = 'flex';
    compEl.innerHTML = `<span style="font-size:1.2rem">${comp.emoji}</span><span style="font-size:0.65rem;font-weight:800;color:${comp.color}">${comp.name}</span>`;
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  activateFusion(recipe, pair = null) {
    if (this.gameState !== 'playing' || this.isProcessing) return false;
    if (this.elixir < recipe.elixir) {
      showToast(`Need ⚡${recipe.elixir} elixir to fuse!`, 1500);
      return false;
    }

    let ingredients = pair
      ? [pair.card1, pair.card2]
      : getFusablePairs(this.arena.playerUnits).find(p => p.recipe.id === recipe.id) ? [
          getFusablePairs(this.arena.playerUnits).find(p => p.recipe.id === recipe.id).card1,
          getFusablePairs(this.arena.playerUnits).find(p => p.recipe.id === recipe.id).card2
        ] : null;

    if (!ingredients || ingredients.length < 2) return false;

    this.elixir -= recipe.elixir;
    this.fusionsThisGame++;

    // Remove ingredient units from the field
    ingredients.forEach(ing => {
      ing.alive = false;
    });
    this.arena.clearDead();

    const lane = ingredients[0].lane;
    const evolvedUnit = createEvolvedUnit(recipe, 'player', lane, ingredients[0].x, ingredients[1].x);
    this.applyWeatherToUnit(evolvedUnit);

    // Star Spirit / ultimate fusion boost
    let boost = 0;
    if (this.selectedCompanion === 'star_spirit') boost += 1;
    if (this.fusionBoost > 0) {
      boost += this.fusionBoost;
      this.fusionBoost = 0;
    }
    if (boost > 0) {
      const mult = 1 + 0.1 * boost;
      evolvedUnit.dmg = Math.floor(evolvedUnit.dmg * mult);
      evolvedUnit.hp = Math.floor(evolvedUnit.hp * mult);
      evolvedUnit.maxHp = evolvedUnit.hp;
    }

    this.arena.addUnit(evolvedUnit, 'player');
    applyAbility(recipe.ability, evolvedUnit, this.arena.playerUnits.concat(this.arena.enemyUnits));
    this.particles.addFusionBurst(evolvedUnit.x, evolvedUnit.y, recipe.color, 30);
    this.particles.addFusionRing(evolvedUnit.x, evolvedUnit.y);
    this.particles.addFloatText(evolvedUnit.x, evolvedUnit.y - 30, recipe.emoji + '!', recipe.color);
    this.audio.fusion && this.audio.fusion();

    this.fusionSlots = [null, null];
    this.fusionActive = false;
    this.turnCount++;
    this.natureMeter = Math.min(100, this.natureMeter + 15);
    if (this.ai) this.ai.updateEmotion('fuse', { enemyTauntCount: 0, playedCards: [] });
    this.battleLog.push(`Fused into ${recipe.name}`);

    this.checkBattleState();
    if (this.gameState !== 'playing') return true;

    // AI gets a turn after fusion
    this.isProcessing = true;
    this.handleAIturn().finally(() => {
      this.isProcessing = false;
      this.turnDiscountReady = true;
      if (this.gameState === 'playing') {
        this.renderHand();
        this.renderHUD();
        this.renderFusionBar();
        this.renderArena();
      }
    });
    return true;
  }

  checkFusions() {
    const pairs = getFusablePairs(this.arena.playerUnits);
    if (pairs.length > 0) {
      showToast('🔥 Fusion available! Tap the result in the fuse bar.', 2000);
      this.renderFusionBar();
    }
  }

  renderFusionBar() {
    const bar = document.getElementById('fusion-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'fusion-label';
    label.textContent = '⚡ FUSE:';
    bar.appendChild(label);

    const pairs = this.playerDeck ? getFusablePairs(this.arena.playerUnits) : [];
    if (pairs.length === 0) {
      const empty = document.createElement('span');
      empty.style.cssText = 'font-size:0.7rem;opacity:0.45;font-weight:700';
      empty.textContent = 'no pairs on field';
      bar.appendChild(empty);
    } else {
      pairs.slice(0, 3).forEach(pair => {
        const recipe = pair.recipe;
        const affordable = this.elixir >= recipe.elixir;
        const result = document.createElement('div');
        result.className = 'fusion-result' + (affordable ? '' : ' disabled');
        result.innerHTML = `<span class="fusion-emoji">${recipe.emoji}</span><span class="fusion-name">${recipe.name}</span><span class="fusion-elixir">⚡${recipe.elixir}</span>`;
        if (affordable) {
          result.addEventListener('click', () => this.activateFusion(recipe, pair));
        } else {
          result.title = `Need ${recipe.elixir} elixir`;
        }
        bar.appendChild(result);
      });
    }

    if (this.natureMeter > 0) {
      const nd = document.createElement('div');
      nd.style.cssText = 'margin-left:12px;display:flex;align-items:center;gap:4px;';
      nd.innerHTML = `<span style="font-size:0.65rem;font-weight:800;color:#4ecdc4">🌿</span><div style="width:60px;height:6px;background:rgba(78,205,196,0.2);border-radius:99px;overflow:hidden;"><div style="width:${this.natureMeter}%;height:100%;background:#4ecdc4;border-radius:99px;transition:width 300ms;"></div></div><span style="font-size:0.55rem;font-weight:700;color:#4ecdc4">${Math.floor(this.natureMeter)}</span>`;
      bar.appendChild(nd);
    }
    const ultBtn = document.getElementById('ultimate-btn');
    if (ultBtn) {
      ultBtn.style.display = 'block';
      ultBtn.disabled = this.natureMeter < 100 || this.ultimateCooldown > 0;
      ultBtn.classList.toggle('ready', this.natureMeter >= 100 && this.ultimateCooldown <= 0);
      ultBtn.textContent = this.ultimateCooldown > 0 ? '🌿 Ready in ' + this.ultimateCooldown + 's' : '🌿 NATURE WRATH';
    }
    if (this.fusionBoost > 0) {
      const fb = document.createElement('span');
      fb.style.cssText = 'margin-left:8px;font-size:0.65rem;font-weight:800;color:#ffd93d';
      fb.textContent = 'Fusion x' + this.fusionBoost;
      bar.appendChild(fb);
    }
  }

  togglePause() {
    this.paused = !this.paused;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !this.paused);
    }
    if (this.paused && this.audio.ctx && this.audio.ctx.state === 'running') {
      this.audio.ctx.suspend();
    } else if (!this.paused && this.audio.ctx && this.audio.ctx.state === 'suspended') {
      this.audio.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = vol;
    this.muted = vol <= 0;
    if (this.audio && typeof this.audio.setVolume === 'function') {
      this.audio.setVolume(vol);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = this.muted ? '🔇 Unmute' : '🔇 Mute';
  }
}
