// js/skyEffects.js — Dynamic sky effects (aurora, meteor shower, moon phases)

export class SkyEffects {
  constructor() {
    this.aurora = new Aurora();
    this.meteorShower = new MeteorShower();
    this.moonPhase = new MoonPhase();
    this.activeEffect = null;
    this.effectTimer = 0;
    this.effectDuration = 30;
    this.nextEffectTimer = 0;
    this.nextEffectInterval = 60;
  }

  update(dt) {
    // Update current effect
    if (this.activeEffect) {
      this.effectTimer += dt;
      if (this.effectTimer >= this.effectDuration) {
        this.activeEffect = null;
        this.effectTimer = 0;
      }
    }

    // Check for new effect
    this.nextEffectTimer += dt;
    if (this.nextEffectTimer >= this.nextEffectInterval) {
      this.nextEffectTimer = 0;
      this.startRandomEffect();
    }

    // Update effects
    this.aurora.update(dt);
    this.meteorShower.update(dt);
    this.moonPhase.update(dt);
  }

  startRandomEffect() {
    const effects = ['aurora', 'meteorShower'];
    const idx = Math.floor(Math.random() * effects.length);
    this.activeEffect = effects[idx];
    this.effectTimer = 0;
  }

  render(ctx, skyProgress) {
    if (skyProgress < 0.3) return; // Only render at night

    if (this.activeEffect === 'aurora') {
      this.aurora.render(ctx, skyProgress);
    } else if (this.activeEffect === 'meteorShower') {
      this.meteorShower.render(ctx);
    }

    this.moonPhase.render(ctx, skyProgress);
  }

  serialize() {
    return {
      activeEffect: this.activeEffect,
      moonPhase: this.moonPhase.phase
    };
  }

  deserialize(data) {
    if (data) {
      this.activeEffect = data.activeEffect;
      if (data.moonPhase !== undefined) {
        this.moonPhase.phase = data.moonPhase;
      }
    }
  }
}

class Aurora {
  constructor() {
    this.waves = [];
    this.maxWaves = 5;
    this.alpha = 0;
    this.targetAlpha = 0;
    this.colors = ['#7c4dff', '#00bcd4', '#4caf50', '#ff9800'];
    this.time = 0;
  }

  update(dt) {
    this.time += dt;

    // Fade in/out
    if (this.alpha < this.targetAlpha) {
      this.alpha = Math.min(this.alpha + dt * 0.5, this.targetAlpha);
    } else if (this.alpha > this.targetAlpha) {
      this.alpha = Math.max(this.alpha - dt * 0.5, this.targetAlpha);
    }

    // Generate waves
    if (this.waves.length < this.maxWaves && Math.random() < 0.02) {
      this.waves.push({
        x: Math.random() * 1200,
        y: 50 + Math.random() * 150,
        width: 200 + Math.random() * 300,
        height: 30 + Math.random() * 50,
        speed: 10 + Math.random() * 20,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        alpha: 0.3 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Update waves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.x += w.speed * dt;
      w.phase += dt * 2;
      if (w.x > 1400) {
        this.waves.splice(i, 1);
      }
    }
  }

  render(ctx, skyProgress) {
    if (this.alpha < 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    for (const w of this.waves) {
      const yOffset = Math.sin(w.phase) * 20;

      ctx.beginPath();
      ctx.ellipse(w.x, w.y + yOffset, w.width / 2, w.height / 2, 0, 0, Math.PI * 2);

      const gradient = ctx.createRadialGradient(
        w.x, w.y + yOffset, 0,
        w.x, w.y + yOffset, w.width / 2
      );
      gradient.addColorStop(0, w.color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }
}

class MeteorShower {
  constructor() {
    this.meteors = [];
    this.maxMeteors = 10;
    this.spawnTimer = 0;
    this.spawnInterval = 0.5;
  }

  update(dt) {
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnInterval && this.meteors.length < this.maxMeteors) {
      this.spawnTimer = 0;
      this.spawnMeteor();
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;

      if (m.life <= 0 || m.y > 700) {
        this.meteors.splice(i, 1);
      }
    }
  }

  spawnMeteor() {
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
    const speed = 300 + Math.random() * 200;

    this.meteors.push({
      x: Math.random() * 800,
      y: -10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 30 + Math.random() * 50,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.5 + Math.random() * 0.5,
      color: `hsl(${40 + Math.random() * 20}, 100%, ${80 + Math.random() * 20}%)`
    });
  }

  render(ctx) {
    ctx.save();
    ctx.lineCap = 'round';

    for (const m of this.meteors) {
      const alpha = m.life / m.maxLife;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;

      const tailX = m.x - (m.vx / Math.sqrt(m.vx * m.vx + m.vy * m.vy)) * m.length;
      const tailY = m.y - (m.vy / Math.sqrt(m.vx * m.vx + m.vy * m.vy)) * m.length;

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class MoonPhase {
  constructor() {
    this.phase = this.calculatePhase();
    this.x = 0;
    this.y = 80;
    this.radius = 25;
  }

  calculatePhase() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Simple moon phase calculation
    const c = Math.floor(365.25 * year);
    const e = Math.floor(30.6 * month);
    const jd = c + e + day - 694039.09;
    const phase = jd / 29.5305882;
    return phase - Math.floor(phase);
  }

  update(dt) {
    // Moon phase updates slowly (once per day is enough)
  }

  render(ctx, skyProgress) {
    if (skyProgress < 0.3) return;

    ctx.save();

    const x = 100;
    const y = 80;
    const r = 25;

    // Moon glow
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Moon body
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f5dc';
    ctx.fill();

    // Shadow (phase)
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    const shadowOffset = (this.phase - 0.5) * r * 2;
    ctx.arc(x + shadowOffset, y, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a3e';
    ctx.fill();

    ctx.restore();
  }
}
