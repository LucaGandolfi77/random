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
    const loop = () => {
      if (this.gameState !== 'menu') return;
      if (!this.particles) return;
      this.particles.update();
      this.particles.draw();
      this.menuAnims = requestAnimationFrame(loop);
    };
    loop();
  }

  startGame(difficulty, companionId = null) {
    if (this.menuAnims) { cancelAnimationFrame(this.menuAnims); this.menuAnims = null; }
    this.difficulty = difficulty;
    this.selectedCompanion = companionId;
    this.audio.init();
    this.gameState = 'playing';
    this.turnCount = 0;
    this.elixir = 2;
    this.superElixir = 0;
    this.isProcessing = false;
    this.fusionSlots = [null, null];
    this.fusionActive = false;
    this.natureMeter = 0;
    this.selectedCompanion = null;
    this.weather = getNextWeather('SUNNY', 0);
    this.season = getSeason(0);
    this.weatherTimer = 0;

    this.ai = new AIController(difficulty);
    this.ai.hand = [];
    this.ai.refillHand(this.ai.hand);

    this.playerDeck = new Deck();
    this.playerDeck.cards = this.stats.currentDeck.map(id => {
      return getAllCards().find(c => c.id === id);
    }).filter(c => c);

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
    setTimeout(() => this.refillHands(), 600);
    this.renderHUD();
    this.renderArena();
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
    this.ai.refillHand(this.ai.hand);
    while (this.playerDeck.getHandSize() < 4 && this.playerDeck.cards.length > 0) {
      this.playerDeck.draw();
    }
    this.renderHand();
    this.renderAIHand();
  }

  async playCard(index) {
    if (this.gameState !== 'playing' || this.isProcessing) return;

    const card = this.playerDeck.play(index);
    if (!card || this.elixir < card.elixir) {
      if (card) this.playerDeck.cards.push(card);
      return;
    }

    this.elixir -= card.elixir;
    this.audio.cardPlay();
    trackCardPlay(this.stats, card.id);

    const lane = this.chooseLane();
    const unit = createUnit(card, 'player', lane);
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

    if (this.fusionActive) {
      this.handleFusionSelection(card);
      return;
    }

    this.checkFusions();
    this.ai.updateEmotion('damage', { enemyTauntCount: 0, playedCards: [] });
    this.isProcessing = true;
    await this.handleAIturn();
    this.isProcessing = false;
    this.renderHand();
    this.renderHUD();
    this.renderArena();
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

    while (this.ai.canPlay(this.ai.hand, this.elixir) && this.ai.hand.length > 0) {
      this.ai.updateEmotion('damage', { enemyTauntCount: 0, playedCards: [] });
      const card = this.ai.chooseCard(this.ai.hand, {
        enemyUnits: this.arena.playerUnits.filter(u => u.alive),
        enemyTauntCount: 0,
        playedCards: []
      });

      if (!card || this.elixir < card.elixir) break;

      this.elixir -= card.elixir;
      const lane = this.ai.chooseLane([0, 1, 2], { enemyUnits: [], enemyTauntCount: 0, playedCards: [] });
      const unit = createUnit(card, 'enemy', lane);
      unit.x = [100, 200, 300][lane] || 200;
      unit.y = 140;
      this.arena.addUnit(unit, 'enemy');
      const allUnits = this.arena.playerUnits.concat(this.arena.enemyUnits);
      applyAbility(card.ability, unit, allUnits);
      this.ai.hand.splice(this.ai.hand.indexOf(card), 1);

      this.particles.addBurst(unit.x, unit.y, unit.color, 8);
      this.audio.unitAttack();
      this.battleLog.push(`AI played ${card.name}`);
      await this.sleep(400);
    }

    this.ai.refillHand(this.ai.hand);
    this.isProcessing = false;
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
    this.checkBattleState();
    this.renderAIHand();
    this.renderHUD();
    this.renderArena();
  }

   gameLoop() {
     if (this.gameState !== 'playing' || this.paused) return;

     // Elixir regen
    this.elixir = Math.min(EMAX, this.elixir + 0.25);
    if (this.turnCount > 0 && this.turnCount % 5 === 0) {
      this.superElixir = Math.min(SUPER_EMAX, this.superElixir + 1);
    }

    // Move units
    this.moveUnits();
    this.bossAttackProcessed = false;
    // Auto combat
    this.doCombat();
    // Clean dead
    this.arena.clearDead();
    // Apply companion passive effects
    this.applyCompanionEffects();
    // Check for boss encounter
    this.checkBossEncounter();
    // Ultimate cooldown
    if (this.ultimateCooldown > 0) {
      this.ultimateCooldown--;
    }
    // Nature meter decay
    this.natureMeter = Math.max(0, this.natureMeter - 0.5);
    // Weather cycle
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
    // Check game over
    this.checkBattleState();
    // Render
    this.renderArena();
    this.renderHUD();
    this.renderFusionBar();

    requestAnimationFrame(() => this.gameLoop());
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
    [this.arena.playerUnits, this.arena.enemyUnits].forEach(units => {
      units.forEach(u => {
        if (!u.alive || u.attacking) return;
        u.attacking = true;

        const target = units === this.arena.playerUnits
          ? this.findEnemyInLane(u)
          : this.findPlayerUnitInLane(u);

        if (!target || !target.alive) {
          // Attack structure
          const struct = units === this.arena.playerUnits ? this.arena.enemyStructure : this.arena.playerStructure;
          if (struct.alive) {
            const dmg = u.dmg;
            struct.hp = Math.max(0, struct.hp - dmg);
            this.audio.unitAttack();
            this.particles.addFloatText(struct === this.arena.enemyStructure ? 500 : 100, struct === this.arena.enemyStructure ? 80 : 80, `-${dmg}`, '#ff6b6b');
            if (struct.hp <= 0) {
              struct.alive = false;
              this.checkBattleState();
            }
          }
          u.attacking = false;
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
        }
        u.attacking = false;
      });
    });
    if (this.bossActive && this.boss && !this.bossAttackProcessed) {
      this.processBossAttack();
      this.bossAttackProcessed = true;
    }
  }

  processBossAttack() {
    const playerAlive = this.arena.playerUnits.filter(u => u.alive);
    if (playerAlive.length === 0) return;
    const target = playerAlive[Math.floor(Math.random() * playerAlive.length)];
    const bossDmg = this.applyBossDamage(this.boss.attackDmg || 12);
    if (bossDmg > 0 && this.arena.playerStructure.hp > 0) {
      this.arena.playerStructure.hp = Math.max(0, this.arena.playerStructure.hp - bossDmg);
      this.audio.bossAttack();
      this.particles.addFloatText(300, 60, '-' + bossDmg, '#ff6b6b');
    }
  }

  checkBattleState() {
    if (this.arena.isGameOver()) {
      const winner = this.arena.getWinner();
      this.endGame(winner);
    }
  }

  endGame(winner) {
    this.gameState = 'over';
    const dialogue = this.ai.getDialogue();

    if (winner === 'player') {
      this.audio.victory();
      const hpRem = this.arena.enemyStructure.hp;
      const stars = hpRem > 150 ? 3 : hpRem > 75 ? 2 : 1;
      if (stars === 3) addThreeStarWin(this.stats);
      addWinToStats(this.stats);
      showToast(`${dialogue.win} ${stars}⭐!`, 3000);
      this.particles.addBurst(window.innerWidth / 2, window.innerHeight / 2, '#ffd93d', 50);
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
      if (this.fusionActive) {
        div.style.borderColor = this.fusionSlots[0] ? '#ffd93d' : '#4ecdc4';
        div.style.boxShadow = this.fusionSlots[0] ? '0 0 15px rgba(255,217,61,0.5)' : 'var(--shadow)';
        div.style.cursor = 'pointer';
      }
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
      restartBtn.onclick = () => {
        overlay.classList.add('hidden');
        this.startGame(this.difficulty);
      };
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
    if (this.stats.wins % 5 === 4 && !this.bossActive) {
      const boss = getNextBoss(this.stats.wins);
      if (boss) {
        this.bossActive = true;
        this.boss = boss;
        this.bossShield = boss.shield || 0;
        this.bossPowerLevel = 0;
        this.audio.bossEncounter(boss);
        showToast('WARNING: BOSS BATTLE: ' + boss.emoji + ' ' + boss.name + '!', 3000);
        this.arena.enemyStructure.hp = boss.hp;
        this.arena.enemyStructure.maxHp = boss.hp;
        this.arena.enemyStructure.alive = true;
        this.renderArena();
        this.renderHUD();
        this.renderBossHUD();
      }
    }
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
    if (this.bossActive && this.boss) {
      this.stats.bossesDefeated = (this.stats.bossesDefeated || 0) + 1;
    }
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

    // Apply passive effects to player units
    if (comp.ability === 'center_boost') {
      const centerUnits = this.arena.playerUnits.filter(u => u.lane === 1 && u.alive);
      centerUnits.forEach(u => { u.dmg = Math.floor(u.dmg * 1.15); });
    } else if (comp.ability === 'regen') {
      this.arena.playerUnits.forEach(u => {
        if (u.alive) { u.hp = Math.min(u.maxHp, u.hp + 2); }
      });
    }
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

  handleFusionSelection(card) {
    if (!this.fusionSlots[0]) {
      this.fusionSlots[0] = card;
      this.audio.fusionReady();
    } else if (!this.fusionSlots[1] && card.id !== this.fusionSlots[0].id) {
      this.fusionSlots[1] = card;
      const recipe = getFusionRecipe(this.fusionSlots[0], this.fusionSlots[1]);
      if (recipe && this.elixir >= recipe.elixir) {
        this.elixir -= recipe.elixir;
        this.activateFusion(recipe);
      } else if (!recipe) {
        showToast('These creatures cannot fuse!', 1500);
        this.fusionSlots = [this.fusionSlots[0], null];
      }
    } else {
      this.fusionSlots[0] = card;
    }
    this.fusionActive = this.fusionSlots[0] !== null && this.fusionSlots[1] === null;
    this.renderHand(); this.renderFusionBar(); this.renderHUD();
  }

  activateFusion(recipe) {
    this.fusionsThisGame++;
    const lane = this.chooseLane();
    const evolvedUnit = createEvolvedUnit(recipe, 'player', lane, 200, 300);
    this.arena.addUnit(evolvedUnit, 'player');
    applyAbility(recipe.ability, evolvedUnit, this.arena.playerUnits.concat(this.arena.enemyUnits));
    this.particles.addFusionBurst(evolvedUnit.x, evolvedUnit.y, recipe.color, 30);
    this.particles.addFusionRing(evolvedUnit.x, evolvedUnit.y);
    this.particles.addFloatText(evolvedUnit.x, evolvedUnit.y - 30, recipe.emoji + '!', recipe.color);
    this.fusionSlots = [null, null];
    this.fusionActive = false;
    this.turnCount++; this.natureMeter = Math.min(100, this.natureMeter + 15);
    this.ai.updateEmotion('heal', { enemyTauntCount: 0, playedCards: [] });
    this.arena.clearDead(); this.checkBattleState();
  }

  checkFusions() {
    if (getFusablePairs(this.arena.playerUnits).length > 0) {
      this.fusionActive = true;
      showToast('🔥 Tap a card, then another to fuse them!', 2000);
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
    for (let i = 0; i < 2; i++) {
      const slot = document.createElement('div');
      slot.className = 'fusion-slot' + (this.fusionSlots[i] ? ' has-card' : '');
      if (this.fusionSlots[i]) {
        const c = this.fusionSlots[i];
        slot.innerHTML = `<span class="fusion-emoji">${c.emoji}</span><span class="fusion-name">${c.name}</span><span class="fusion-elixir">⚡${c.elixir}</span>`;
      } else {
        slot.innerHTML = '<span style="font-size:1.2rem;opacity:0.3">+</span>';
      }
      slot.addEventListener('click', () => { this.fusionSlots[i] = null; this.renderFusionBar(); this.renderHand(); });
      bar.appendChild(slot);
    }
    if (this.fusionSlots[0] && !this.fusionSlots[1]) {
      const arrow = document.createElement('span');
      arrow.className = 'fusion-arrow';
      arrow.textContent = '→';
      bar.appendChild(arrow);
    }
    if (this.fusionSlots[0] && this.fusionSlots[1]) {
      const recipe = getFusionRecipe(this.fusionSlots[0], this.fusionSlots[1]);
      if (recipe && this.elixir >= recipe.elixir) {
        const result = document.createElement('div');
        result.className = 'fusion-result';
        result.innerHTML = `<span class="fusion-emoji">${recipe.emoji}</span><span class="fusion-name">${recipe.name}</span><span class="fusion-elixir">⚡${recipe.elixir}</span>`;
        result.addEventListener('click', () => { this.activateFusion(recipe); this.renderHand(); this.renderFusionBar(); this.renderHUD(); this.renderArena(); });
        bar.appendChild(result);
      } else if (recipe) {
        const info = document.createElement('span');
        info.className = 'fusion-info';
        info.textContent = `Need ⚡${recipe.elixir} more!`;
        bar.appendChild(info);
      }
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
      ultBtn.textContent = this.ultimateCooldown > 0 ? '🌿 Ready in ' + this.ultimateCooldown + 't' : '🌿 NATURE WRATH';
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
    if (this.audio.ctx) {
      this.audio.ctx.volume = vol;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.textContent = this.muted ? '🔇 Unmute' : '🔇 Mute';
  }
}
