// js/lanternTrails.js — Particle effects behind thrown lanterns

export class LanternTrail {
  constructor() {
    this.particles = [];
    this.maxParticles = 50;
    this.emitRate = 0.02;
    this.emitTimer = 0;
    this.active = false;
    this.lastX = 0;
    this.lastY = 0;
  }

  start(x, y) {
    this.active = true;
    this.lastX = x;
    this.lastY = y;
    this.emit(x, y, '#ffd700');
  }

  stop() {
    this.active = false;
  }

  emit(x, y, color) {
    if (this.particles.length >= this.maxParticles) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return;

    this.particles.push({
      x,
      y,
      vx: -dx * 0.1 + (Math.random() - 0.5) * 20,
      vy: -dy * 0.1 + (Math.random() - 0.5) * 20 - 10,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color: color || '#ffd700'
    });

    this.lastX = x;
    this.lastY = y;
  }

  update(dt) {
    // Emit new particles
    if (this.active) {
      this.emitTimer += dt;
      if (this.emitTimer >= this.emitRate) {
        this.emitTimer = 0;
        this.emit(this.lastX, this.lastY, '#ffd700');
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 20 * dt; // Float upward
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.lineCap = 'round';

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.active = false;
  }
}

export class LanternTrailManager {
  constructor() {
    this.trails = new Map();
  }

  startTrail(lanternId, x, y, color) {
    if (!this.trails.has(lanternId)) {
      this.trails.set(lanternId, new LanternTrail());
    }
    const trail = this.trails.get(lanternId);
    trail.emit(x, y, color);
  }

  stopTrail(lanternId) {
    if (this.trails.has(lanternId)) {
      this.trails.get(lanternId).stop();
    }
  }

  removeTrail(lanternId) {
    this.trails.delete(lanternId);
  }

  update(dt) {
    for (const [id, trail] of this.trails) {
      trail.update(dt);
      if (!trail.active && trail.particles.length === 0) {
        this.trails.delete(id);
      }
    }
  }

  render(ctx) {
    for (const [id, trail] of this.trails) {
      trail.render(ctx);
    }
  }

  clear() {
    this.trails.clear();
  }
}
