// js/main.js — Game Loop & State Machine

import { Renderer } from './renderer.js';
import { Net } from './net.js';
import { LanternManager } from './lantern.js';
import { City } from './city.js';
import { Sky } from './sky.js';
import { Particles } from './particles.js';
import { LilyPadManager } from './lilyPad.js';
import { SeasonManager } from './seasons.js';
import { WeatherSystem } from './weather.js';
import { SkyEffects } from './skyEffects.js';
import { LanternTrailManager } from './lanternTrails.js';
import { AmbientMode } from './ambientMode.js';
import { NotificationManager } from './notifications.js';
import { LanternEditor } from './lanternEditor.js';
import { Leaderboard } from './leaderboard.js';
import { Marketplace } from './marketplace.js';
import { UI } from './ui.js';
import { SaveManager } from './save.js';
import { SKY, LANTERN_TYPES, INHABITANT_TYPES, FURNITURE_TYPES, PROGRESSION } from './data.js';

const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  CHARGING: 'charging',
  THROWING: 'throwing',
  RETRACTING: 'retracting',
  CATCHING: 'catching',
  PLACING: 'placing',
  DAWN: 'dawn',
  PAUSED: 'paused',
  MEDITATION: 'meditation'
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.ui = new UI();
    this.save = new SaveManager();
    this.sky = new Sky(this.renderer);
    this.particles = new Particles(this.renderer);
    this.city = new City(this.renderer);
    this.lanterns = new LanternManager(this.renderer);
    this.lilyPads = new LilyPadManager(this.renderer);
    this.seasons = new SeasonManager();
    this.weather = new WeatherSystem();
    this.skyEffects = new SkyEffects();
    this.lanternTrails = new LanternTrailManager();
    this.ambientMode = new AmbientMode();
    this.notifications = new NotificationManager();
    this.lanternEditor = new LanternEditor();
    this.leaderboard = new Leaderboard();
    this.marketplace = new Marketplace();
    this.net = new Net(this.renderer);

    // Lazy-loaded modules
    this.audio = null;
    this.inhabitants = null;
    this._initPromise = this._lazyInit();

    this.state = STATES.MENU;
    this.level = 1;
    this.totalLanterns = 0;
    this.sessionLanterns = 0;
    this.nightTimer = 0;
    this.dawnTimer = 0;
    this.spawnTimer = 0;
    this.lastT = 0;
    this.rafId = null;

    this.touch = { active: false, pointerId: null, startX: 0, startY: 0, x: 0, y: 0, chargeStart: 0 };

    this.setupEvents();
    this._init();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW registration failed:', e));
    }

    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    const errorScreen = document.getElementById('error-screen');
    const errorMsg = document.getElementById('error-message');
    const retryBtn = document.getElementById('btn-retry');

    window.onerror = (msg, src, line, col, err) => {
      console.error('Global error:', err);
      if (errorScreen && errorMsg) {
        errorMsg.textContent = String(msg || 'Errore sconosciuto');
        errorScreen.classList.remove('hidden');
      }
      return true;
    };

    window.addEventListener('unhandledrejection', e => {
      console.error('Unhandled rejection:', e.reason);
      if (errorScreen && errorMsg) {
        errorMsg.textContent = String(e.reason?.message || e.reason || 'Operazione fallita');
        errorScreen.classList.remove('hidden');
      }
    });

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        errorScreen.classList.add('hidden');
        this.recover();
      });
    }
  }

  recover() {
    try {
      this.state = STATES.MENU;
      this.sky.reset();
      this.lanterns.reset();
      this.particles.clear();
      this.lilyPads.clear();
      this.net.cancelCharge();
      this.loadGame().then(() => {
        this.ui.showMenu(this.save.data !== null);
      });
    } catch (e) {
      console.error('Recovery failed:', e);
      location.reload();
    }
  }

  async _init() {
    await this.loadGame();
    this.ui.showMenu(this.save.data !== null);
    this.notifications.init();
  }

  async _lazyInit() {
    const [{ AudioEngine }, { Inhabitants }] = await Promise.all([
      import('./audio.js'),
      import('./inhabitants.js')
    ]);
    this.audio = new AudioEngine();
    this.inhabitants = new Inhabitants(this.renderer);
  }

  vibrate(pattern) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  async shareScreenshot() {
    try {
      const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'lanterni-citta.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'La mia città di Lanterni',
          text: 'Guarda la mia città sospesa tra le nuvole! 🏮',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lanterni-citta.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed:', e);
    }
  }

  setupEvents() {
    const c = this.canvas;

    c.addEventListener('pointerdown', e => this.onPointerDown(e));
    c.addEventListener('pointermove', e => this.onPointerMove(e));
    c.addEventListener('pointerup', e => this.onPointerUp(e));
    c.addEventListener('pointercancel', e => this.onPointerUp(e));
    c.addEventListener('pointerleave', e => {
      if (this.touch.active && e.pointerId === this.touch.pointerId) {
        this.net.cancelCharge();
        this.state = STATES.PLAYING;
        this.touch.active = false;
        this.ui.hidePowerIndicator();
      }
    });

    // Pinch-to-zoom
    this.pinch = { active: false, startDist: 0, startZoom: 1 };
    c.addEventListener('pointerdown', e => {
      if (this.state !== STATES.PLAYING && this.state !== STATES.PLACING) return;
      if (this.pointers) {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 2) {
          const pts = [...this.pointers.values()];
          this.pinch.startDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          this.pinch.startZoom = this.renderer.zoom;
          this.pinch.active = true;
        }
      } else {
        this.pointers = new Map();
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
    });
    c.addEventListener('pointermove', e => {
      if (!this.pinch.active || !this.pointers) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const scale = this.pinch.startZoom * (dist / this.pinch.startDist);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        this.renderer.setZoom(scale, cx, cy);
      }
    });
    c.addEventListener('pointerup', e => {
      if (this.pointers) {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) {
          this.pinch.active = false;
        }
      }
    });

    // Keyboard controls
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && this.state === STATES.PLAYING) {
        e.preventDefault();
        const cx = this.renderer.w / 2;
        const cy = this.renderer.h - 100;
        this.touch.active = true;
        this.touch.startX = cx;
        this.touch.startY = cy;
        this.touch.chargeStart = performance.now();
        this.state = STATES.CHARGING;
        this.net.startCharge(cx, cy);
        this.ui.showPowerIndicator();
      }
      if (e.code === 'Space' && this.state === STATES.PLACING) {
        e.preventDefault();
        this.placeLantern(this.renderer.w / 2, this.renderer.h * 0.65);
      }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'Space' && this.state === STATES.CHARGING) {
        const elapsed = (performance.now() - this.touch.chargeStart) / 1000;
        const power = Math.min(1, elapsed * 1.8);
        this.throwNet(0, -1, power * 200);
      }
    });

    this.ui.on('play', () => this.startGame(false));
    this.ui.on('continue', () => this.startGame(true));
    this.ui.on('newDay', () => this.startGame(false));
    this.ui.on('share', () => this.shareScreenshot());
    this.ui.on('menu', () => this.toggleMenu());
  }

  onPointerDown(e) {
    if (this.state !== STATES.PLAYING) return;
    if (this.touch.active) return; // ignore secondary touches
    this.touch.active = true;
    this.touch.pointerId = e.pointerId;
    this.touch.startX = e.clientX;
    this.touch.startY = e.clientY;
    this.touch.x = e.clientX;
    this.touch.y = e.clientY;
    this.touch.chargeStart = performance.now();
    this.state = STATES.CHARGING;
    this.net.startCharge(e.clientX, e.clientY);
    this.ui.showPowerIndicator();
    e.preventDefault();
  }

  onPointerMove(e) {
    if (!this.touch.active || e.pointerId !== this.touch.pointerId) return;
    this.touch.x = e.clientX;
    this.touch.y = e.clientY;
  }

  onPointerUp(e) {
    if (e.pointerId !== this.touch.pointerId) return;
    if (this.state === STATES.CHARGING) {
      const dx = e.clientX - this.touch.startX;
      const dy = e.clientY - this.touch.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30) {
        this.throwNet(dx, dy, dist);
      } else {
        this.net.cancelCharge();
        this.state = STATES.PLAYING;
        this.ui.hidePowerIndicator();
      }
    } else if (this.state === STATES.PLACING) {
      this.placeLantern(e.clientX, e.clientY);
    }

    this.touch.active = false;
    this.touch.pointerId = null;
  }

  throwNet(dx, dy, dist) {
    const power = Math.min(1, dist / 200);
    const angle = Math.atan2(dy, dx);
    this.net.throw(this.touch.startX, this.touch.startY, angle, power);
    this.state = STATES.THROWING;
    this.ui.hidePowerIndicator();
    if (this.audio) this.audio.play('throw');
    this.vibrate(30);
  }

  placeLantern(x, y) {
    if (this.net.capturedLantern) {
      const lantern = this.net.capturedLantern;
      const pos = this.city.findSnapPosition(x, y);
      if (pos) {
        this.city.placeLantern(lantern, pos.x, pos.y);
        this.totalLanterns++;
        this.sessionLanterns++;
        this.updateLevel();
        if (this.audio) this.audio.play('place');
        this.vibrate([50, 30, 50]);
        this.particles.burst(x, y, lantern.color, 12);
        this.save.save(this.getState());
      }
      this.net.capturedLantern = null;
      this.state = STATES.PLAYING;
    }
  }

  throwLanternUp(lantern) {
    this.net.capturedLantern = lantern;
    this.state = STATES.PLACING;
    if (this.audio) this.audio.play('open');
  }

  async startGame(isContinue = false) {
    await this._initPromise;
    this.ui.hideAllScreens();
    this.state = STATES.PLAYING;
    this.sessionLanterns = 0;
    this.nightTimer = SKY.nightDuration;
    this.spawnTimer = 0;
    this.sky.reset();
    this.lanterns.reset();
    this.particles.clear();
    this.lilyPads.clear();

    if (isContinue) {
      await this.loadGame();
    } else {
      this.level = 1;
      this.totalLanterns = 0;
      this.city.clear();
    }

    if (this.audio) this.audio.startAmbient();
    this.ui.updateHUD(this.level, this.totalLanterns);
  }

  toggleMenu() {
    if (this.state === STATES.MENU) return;
    if (this.ui.isPaused()) {
      this.ui.hidePause();
      this.state = this._prevState || STATES.PLAYING;
    } else {
      this._prevState = this.state;
      this.state = STATES.PAUSED;
      this.ui.showPause();
    }
  }

  toggleMeditation() {
    if (this.state === STATES.MEDITATION) {
      this.state = STATES.PLAYING;
      if (this.audio) this.audio.stopZenDrone();
    } else if (this.state === STATES.PLAYING || this.state === STATES.MEDITATION) {
      this._prevState = this.state;
      this.state = STATES.MEDITATION;
      if (this.audio) this.audio.playZenDrone();
    }
  }

  updateLevel() {
    for (let i = PROGRESSION.length - 1; i >= 0; i--) {
      if (this.totalLanterns >= PROGRESSION[i].lanternsNeeded) {
        if (this.level !== PROGRESSION[i].level) {
          this.level = PROGRESSION[i].level;
          this.ui.updateHUD(this.level, this.totalLanterns);
          if (this.audio) this.audio.play('levelUp');
          this.vibrate([30, 50, 30, 50, 30]);
        }
        break;
      }
    }
  }

  spawnFloatingLantern() {
    const x = Math.random() * this.renderer.w;
    const y = -30;
    const typeRoll = Math.random();
    let cumulative = 0;
    let type = LANTERN_TYPES[0];
    const totalWeight = LANTERN_TYPES.reduce((a, b) => a + b.weight, 0);
    for (const t of LANTERN_TYPES) {
      cumulative += t.weight;
      if (typeRoll < cumulative / totalWeight) {
        type = t;
        break;
      }
    }

    const inhabitantRoll = Math.random();
    let inhabitant = null;
    if (inhabitantRoll < 0.35) {
      // Level-gated inhabitants
      const available = INHABITANT_TYPES.filter(i => {
        if (i.id === 'cloud_cat') return this.level >= 3;
        if (i.id === 'moth') return this.level >= 5;
        if (i.id === 'paper_mouse') return this.level >= 7;
        return true;
      });
      if (available.length > 0) {
        const iCumulative = available.reduce((a, b) => a + b.weight, 0);
        let iRoll = Math.random() * iCumulative;
        for (const it of available) {
          iRoll -= it.weight;
          if (iRoll <= 0) {
            inhabitant = it;
            break;
          }
        }
      }
    } else if (inhabitantRoll < 0.55 && this.level >= 6) {
      inhabitant = FURNITURE_TYPES[Math.floor(Math.random() * FURNITURE_TYPES.length)];
    }

    this.lanterns.spawn(x, y, type, inhabitant);
  }

  getState() {
    return {
      level: this.level,
      totalLanterns: this.totalLanterns,
      city: this.city.serialize(),
      lilyPads: this.lilyPads.serialize(),
      seasons: this.seasons.serialize(),
      weather: this.weather.serialize(),
      skyEffects: this.skyEffects.serialize(),
      ambientMode: this.ambientMode.serialize()
    };
  }

  async loadGame() {
    const data = await this.save.load();
    if (data) {
      this.level = data.level || 1;
      this.totalLanterns = data.totalLanterns || 0;
      if (data.city) this.city.deserialize(data.city);
      if (data.lilyPads) this.lilyPads.deserialize(data.lilyPads);
      if (data.seasons) this.seasons.deserialize(data.seasons);
      if (data.weather) this.weather.deserialize(data.weather);
      if (data.skyEffects) this.skyEffects.deserialize(data.skyEffects);
      if (data.ambientMode) this.ambientMode.deserialize(data.ambientMode);
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;

    this.update(dt);
    this.render(dt);

    this.rafId = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    if (this.state === STATES.PAUSED || this.state === STATES.MENU || this.state === STATES.DAWN) {
      this.sky.update(dt);
      return;
    }

    this.sky.update(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.state !== STATES.PLACING) {
      this.spawnFloatingLantern();
      this.spawnTimer = SKY.spawnInterval;
    }

    this.lanterns.update(dt);
    this.net.update(dt, this);
    this.particles.update(dt);
    this.lilyPads.update(dt);
    this.seasons.update(dt);
    this.weather.update(dt);
    if (this.audio && this.weather.currentWeather !== this._lastWeather) {
      this._lastWeather = this.weather.currentWeather;
      this.audio.playWeatherSound(this.weather.currentWeather);
    }
    this.skyEffects.update(dt);
    this.lanternTrails.update(dt);
    this.ambientMode.update(dt);
    if (this.inhabitants) this.inhabitants.update(dt, this.city.getPlacedLanterns());
    this.city.update(dt);

    this.nightTimer -= dt;
    if (this.nightTimer <= 0) {
      this.triggerDawn();
    }

    if (this.state === STATES.CHARGING) {
      const elapsed = (performance.now() - this.touch.chargeStart) / 1000;
      const power = Math.min(1, elapsed * 1.8);
      this.net.setChargePower(power);
      this.ui.updatePowerBar(power);
    }
  }

  triggerDawn() {
    this.state = STATES.DAWN;
    this.dawnTimer = SKY.dawnDuration;
    this.sky.startDawn();
    if (this.audio) this.audio.play('dawn');
    this.vibrate(100);

    const stars = this.city.getPlacedLanterns().length + this.totalLanterns;
    this.ui.showDawn(this.sessionLanterns, this.totalLanterns, stars);

    this.saveScreenshot();
    this.notifications.scheduleNightReminder();

    this.leaderboard.addEntry('Giocatore', stars, this.level);
  }

  async saveScreenshot() {
    try {
      const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
      if (blob) await this.save.saveScreenshot(blob);
    } catch (_) {}
  }

  render(dt) {
    const r = this.renderer;
    r.clear();

    this.sky.render(dt);

    // Background clouds
    this.sky.renderClouds(dt);

    // Apply zoom transform
    r.applyZoom();

    // Sky effects (aurora, meteor shower, moon)
    this.skyEffects.render(this.renderer.ctx, this.sky.progress);

    // Weather effects
    this.weather.render(this.renderer.ctx);

    // Floating lanterns (in sky)
    this.lanterns.render();

    // Lantern trails
    this.lanternTrails.render(this.renderer.ctx);

    // Net
    this.net.render();

    // City
    this.city.render();

    // Lily pads
    this.lilyPads.render();

    // Inhabitants in city
    if (this.inhabitants) this.inhabitants.render();

    // Particles
    this.particles.render();

    // Reset zoom transform
    r.resetTransform();
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.lastT = performance.now();
    this.rafId = requestAnimationFrame(t => this.loop(t));
  }
}

const game = new Game();
game.start();
