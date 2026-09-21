class Game {
  constructor() {
    this.levels = LEVELS;
    this.currentLevel = 0;
    this.shipType = 0;
    this.viewMode = '2d';
    this.paused = false;
    this.gameActive = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.score = 0;
    this.totalScore = 0;
    this.physics = null;
    this.renderer2d = null;
    this.renderer3d = null;
    this.particles = null;
    this.sound = null;
    this.economy = null;
    this.shop = null;
    this.editor = null;
    this.animFrame = null;
    this.keys = {};
    this.touchState = { up: false, down: false, left: false, right: false, brake: false };
    this.shake = { x: 0, y: 0 };
    this.cockpitMode = false;
  }

  init() {
    this.economy = new Economy();
    this.physics = new PhysicsEngine();
    this.particles = new ParticleSystem();
    this.sound = new SoundEngine();
    this.shop = new Shop(this, this.economy);
    this.editor = new LevelEditor(this);
    this.renderer2d = new Renderer2D(document.getElementById('canvas2d'));
    this.renderer3d = new Renderer3D(document.getElementById('canvas3d'));
    this.renderer3d.init();
    this.buildMenu();
    this.bindEvents();
    this.bindMobileControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.game = this;
    this.loop();
  }

  buildMenu() {
    const shipContainer = document.getElementById('ship-options');
    shipContainer.innerHTML = '';
    SHIP_TYPES.forEach((st, i) => {
      const unlocked = this.economy.isShipUnlocked(i);
      const btn = document.createElement('button');
      btn.className = 'ship-btn' + (i === this.shipType ? ' selected' : '');
      btn.style.opacity = unlocked ? 1 : 0.4;
      btn.textContent = `${unlocked ? st.name : '🔒 ' + st.name} (${['Piccola','Media','Grande','Veloce'][i]})`;
      btn.onclick = () => {
        if (unlocked) {
          shipContainer.querySelectorAll('.ship-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.shipType = i;
        } else {
          this.showToast('🔒 Nave bloccata! Sbloccala nell\'Officina!');
        }
      };
      shipContainer.appendChild(btn);
    });

    const lvlContainer = document.getElementById('level-options');
    lvlContainer.innerHTML = '';
    this.levels.forEach((lv, i) => {
      const stars = this.economy.starRatings[lv.id] || 0;
      const best = this.economy.getBestTime(lv.id);
      const btn = document.createElement('button');
      btn.className = 'level-btn' + (i === this.currentLevel ? ' selected' : '');
      btn.textContent = `L${lv.id} ${'⭐'.repeat(stars)}`;
      btn.title = `${lv.name}${best !== Infinity ? ' | Best: ' + Math.floor(best) + 's' : ''}`;
      btn.onclick = () => {
        lvlContainer.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.currentLevel = i;
      };
      lvlContainer.appendChild(btn);
    });

    const creditsDiv = document.createElement('div');
    creditsDiv.style.cssText = 'display:flex;justify-content:center;gap:20px;margin-top:15px;flex-wrap:wrap;';
    creditsDiv.innerHTML = `
      <div style="color:#ffd700;font-size:1.1rem;">💰 Credits: ${this.economy.credits}</div>
      <div style="color:#33ff66;font-size:1.1rem;">🏆 ${this.economy.achievements.length} Achievements</div>
      <div style="color:#ff6b35;font-size:1.1rem;">🅿️ ${this.economy.totalParks} Parks</div>
    `;
    creditsDiv.id = 'menu-credits';
    const menuContent = document.querySelector('.menu-content');
    const existing = document.getElementById('menu-credits');
    if (existing) existing.remove();
    menuContent.appendChild(creditsDiv);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px;';
    btnRow.innerHTML = `
      <button id="shop-btn" class="btn-secondary" style="padding:10px 20px;font-size:0.9rem;">🔧 OFFICINA</button>
      <button id="stats-btn" class="btn-secondary" style="padding:10px 20px;font-size:0.9rem;">📊 Stats</button>
    `;
    menuContent.appendChild(btnRow);

    document.getElementById('shop-btn').onclick = () => this.shop.open('upgrades');
    document.getElementById('stats-btn').onclick = () => this.shop.open('achievements');
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer2d.resize(w, h);
    this.renderer3d.resize(w, h);
  }

  startLevel() {
    const level = this.levels[this.currentLevel];
    level.ship = this.shipType;
    const stats = this.economy.getShipStats(this.shipType);
    level.ship = this.shipType;
    this.physics.loadLevel(level);
    this.physics.level._particles = this.particles;
    this.physics.level._economy = this.economy;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.gameActive = true;
    this.paused = false;
    this.score = 0;
    this.cockpitMode = false;
    this.particles.clear();

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('hud-level').textContent = `${level.name} - Lv.${level.id}`;
    document.getElementById('view-btn').textContent = this.viewMode === '2d' ? '3D' : '2D';

    if ('ontouchstart' in window) {
      document.getElementById('mobile-controls').classList.remove('hidden');
    }
    this.sound.init();
    this.sound.resume();
  }

  toggleView() {
    this.viewMode = this.viewMode === '2d' ? '3d' : '2d';
    document.getElementById('canvas2d').classList.toggle('hidden', this.viewMode === '3d');
    document.getElementById('canvas3d').classList.toggle('hidden', this.viewMode === '2d');
    document.getElementById('view-btn').textContent = this.viewMode === '2d' ? '3D' : '2D';
    if (this.viewMode === '3d') {
      this.renderer3d.resize(window.innerWidth, window.innerHeight);
    } else {
      this.renderer2d.resize(window.innerWidth, window.innerHeight);
    }
  }

  toggleCockpit() {
    this.cockpitMode = !this.cockpitMode;
    this.showToast(this.cockpitMode ? '🔍 Cockpit View!' : '🔓 Vista standard');
  }

  pause() {
    this.paused = true;
    document.getElementById('pause-screen').classList.remove('hidden');
  }

  resume() {
    this.paused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    this.startTime = Date.now() - this.elapsedTime * 1000;
  }

  restart() {
    document.getElementById('pause-screen').classList.add('hidden');
    this.startLevel();
  }

  quit() {
    this.gameActive = false;
    this.paused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    this.buildMenu();
  }

  victory() {
    this.gameActive = false;
    const level = this.levels[this.currentLevel];
    const timeBonus = level.timeLimit > 0 ? Math.max(0, Math.floor((level.timeLimit - this.elapsedTime) * 10)) : 50;
    const fuelBonus = Math.round(this.physics.getFuel() * 2);
    const comboBonus = Math.floor(this.physics.maxCombo * 5);
    this.score = 100 + timeBonus + fuelBonus + comboBonus;
    this.totalScore += this.score;
    this.economy.totalParks++;

    const creditsEarned = Math.floor(this.score / 10);
    this.economy.addCredits(creditsEarned);
    this.economy.setBestTime(level.id, this.elapsedTime);

    const stars = this.economy.calculateStars(level, this.elapsedTime, this.physics.getFuel(), this.physics.ship.bumpCount, true);
    const totalBumps = this.physics.ship.bumpCount;
    this.economy.totalBumps += totalBumps;

    const newAch = this.economy.checkAchievements(level.id, {
      parked: true,
      totalParks: this.economy.totalParks,
      combo: this.physics.maxCombo,
      totalBumps: this.economy.totalBumps,
      stars: stars,
      levelsCompleted: Object.keys(this.economy.starRatings).filter(k => this.economy.starRatings[k] >= 1).length,
      boostUsed: this.physics.ship.boostActive
    });

    this.sound.play('park');

    const statsEl = document.getElementById('victory-stats');
    statsEl.innerHTML = `
      🏆 PARCHEGGIO COMPLETATO!<br>
      ⏱ Tempo: ${this.formatTime(this.elapsedTime)}<br>
      ⛽ Fuel: ${Math.round(this.physics.getFuel())}%<br>
      🔥 Combo: x${Math.floor(this.physics.maxCombo)}<br>
      🛑 Bump: ${totalBumps}<br>
      ⭐ Stelle: ${'⭐'.repeat(stars)}<br>
      💰 Credits: +${creditsEarned}<br>
      💰 Totale: ${this.economy.credits}
      ${newAch.length > 0 ? '<br>🏆 ' + newAch.join('<br>🏆 ') : ''}
    `;
    document.getElementById('victory-screen').classList.remove('hidden');
  }

  gameOver() {
    this.gameActive = false;
    this.economy.totalBumps += 5;
    this.sound.play('gameover');
    document.getElementById('gameover-screen').classList.remove('hidden');
  }

  formatTime(t) {
    const m = Math.floor(t/60);
    const s = Math.floor(t%60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,212,255,0.9);color:#000;padding:10px 25px;border-radius:10px;font-weight:bold;z-index:100;transition:opacity 0.5s;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '0', 2000);
    setTimeout(() => toast.remove(), 2500);
  }

  loop() {
    const dt = 1/60;
    if (this.gameActive && !this.paused) {
      this.elapsedTime = (Date.now() - this.startTime) / 1000;

      const thrust = this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchState.up;
      const reverse = this.keys['ArrowDown'] || this.keys['KeyS'] || this.touchState.down;
      const rotateL = this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchState.left;
      const rotateR = this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchState.right;
      const brake = this.keys['Space'] || this.touchState.brake;
      const boost = this.keys['ShiftLeft'] || this.keys['ShiftRight'];

      if (thrust) this.physics.applyThrust('forward');
      if (reverse) this.physics.applyThrust('backward');
      if (rotateL) this.physics.rotate(-1);
      if (rotateR) this.physics.rotate(1);
      if (brake) this.physics.brake();
      if (boost) {
        if (this.physics.activateBoost()) {
          this.sound.play('boost');
        }
      }

      this.physics.update(dt);
      this.physics.updateBoost(dt);
      this.particles.update(dt);

      if (Math.abs(this.physics.ship.vx) + Math.abs(this.physics.ship.vy) > 0.3 && this.physics.ship.fuel > 0) {
        this.particles.addThrust(this.physics.ship);
      }

      this.shake = this.physics.getScreenShake();

      if (Math.random() < 0.1) {
        this.sound.playEngineLoop(this.physics.ship);
      }

      if (this.physics.getFuel() <= 0 && !this.physics.isParked()) {
        this.gameOver();
      }

      const level = this.levels[this.currentLevel];
      if (level.timeLimit > 0 && this.elapsedTime >= level.timeLimit && !this.physics.isParked()) {
        this.gameOver();
      }

      if (this.physics.isParked()) {
        this.victory();
      }

      document.getElementById('hud-fuel').textContent = `⛽ ${Math.round(this.physics.getFuel())}`;
      document.getElementById('hud-time').textContent = level.timeLimit > 0 ? `⏱ ${this.formatTime(this.elapsedTime)}/${this.formatTime(level.timeLimit)}` : `⏱ ${this.formatTime(this.elapsedTime)}`;
      document.getElementById('hud-score').textContent = `⭐ ${this.score}`;
      const boostPct = Math.round(this.physics.getBoostFuel());
      let boostBar = document.getElementById("boost-bar-fill");
      let boostContainer = document.getElementById("boost-bar-container");
      let boostLabel = document.getElementById("boost-label");
      if (!boostContainer) {
        const bc = document.createElement("div");
        bc.id = "boost-bar-container";
        const bf = document.createElement("div");
        bf.id = "boost-bar-fill";
        bf.style.width = boostPct + "%";
        bc.appendChild(bf);
        document.body.appendChild(bc);
        const bl = document.createElement("div");
        bl.id = "boost-label";
        bl.textContent = "🚀 BOOST: " + boostPct + "%";
        document.body.appendChild(bl);
      }
      if (boostBar) boostBar.style.width = boostPct + "%";
      if (boostLabel) boostLabel.textContent = "🚀 BOOST: " + boostPct + "%";
      const cockpit = document.getElementById("cockpit-indicator");
      if (cockpit) cockpit.classList.toggle("active", this.cockpitMode);

      const speed = Math.sqrt(this.physics.ship.vx**2 + this.physics.ship.vy**2);
      this.renderer2d.camera.zoom = Math.max(0.5, Math.min(2, 1.5 - speed * 0.5));
    }

    if (this.viewMode === '2d') {
      this.renderer2d.render(this.physics.level, this.physics.ship, this.elapsedTime, this.particles, this.shake);
    } else {
      this.renderer3d.render(this.physics.level, this.physics.ship, this.elapsedTime);
    }

    this.animFrame = requestAnimationFrame(() => this.loop());
  }

  bindMobileControls() {
    const bindings = [
      { id: 'ctrl-up', key: 'up' },
      { id: 'ctrl-down', key: 'down' },
      { id: 'ctrl-left', key: 'left' },
      { id: 'ctrl-right', key: 'right' },
      { id: 'ctrl-brake', key: 'brake' }
    ];
    bindings.forEach(({id, key}) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', e => { e.preventDefault(); this.touchState[key] = true; });
      el.addEventListener('touchend', e => { e.preventDefault(); this.touchState[key] = false; });
      el.addEventListener('touchcancel', e => { this.touchState[key] = false; });
      el.addEventListener('mousedown', () => { this.touchState[key] = true; });
      el.addEventListener('mouseup', () => { this.touchState[key] = false; });
      el.addEventListener('mouseleave', () => { this.touchState[key] = false; });
    });
  }

  bindEvents() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyC') this.toggleView();
      if (e.code === 'KeyV') this.toggleCockpit();
      if (e.code === 'KeyR' && this.gameActive && !this.paused) {
        const lvl = this.physics.level;
        this.physics.ship.x = lvl.shipStart.x;
        this.physics.ship.y = lvl.shipStart.y;
        this.physics.ship.angle = lvl.shipStart.angle;
        this.physics.ship.vx = 0; this.physics.ship.vy = 0;
        this.physics.ship.angularVel = 0;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.gameActive) this.paused ? this.resume() : this.pause();
      }
      e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.getElementById('start-btn').onclick = () => this.startLevel();
    document.getElementById('howto-btn').onclick = () => {
      document.getElementById('menu-screen').classList.add('hidden');
      document.getElementById('howto-screen').classList.remove('hidden');
    };
    document.getElementById('howto-back').onclick = () => {
      document.getElementById('howto-screen').classList.add('hidden');
      document.getElementById('menu-screen').classList.remove('hidden');
    };
    document.getElementById('pause-btn').onclick = () => this.pause();
    document.getElementById('resume-btn').onclick = () => this.resume();
    document.getElementById('restart-btn').onclick = () => this.restart();
    document.getElementById('quit-btn').onclick = () => this.quit();
    document.getElementById('view-btn').onclick = () => this.toggleView();
    document.getElementById('next-level-btn').onclick = () => {
      document.getElementById('victory-screen').classList.add('hidden');
      if (this.currentLevel < this.levels.length - 1) {
        this.currentLevel++;
        this.startLevel();
      } else {
        this.quit();
      }
    };
    document.getElementById('victory-menu').onclick = () => this.quit();
    document.getElementById('retry-btn').onclick = () => {
      document.getElementById('gameover-screen').classList.add('hidden');
      this.startLevel();
    };
    document.getElementById('gameover-menu').onclick = () => this.quit();
  }
}

const game = new Game();
window.addEventListener('load', () => game.init());
