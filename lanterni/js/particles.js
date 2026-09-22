// js/particles.js — Visual effects with object pool

class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.color = '#fff';
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 1;
    this.alive = false;
  }

  reset(x, y, color, vx, vy, life, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 30 * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class Particles {
  constructor(renderer, maxParticles = 500) {
    this.r = renderer;
    this.pool = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = new Particle();
    }
  }

  _spawn(x, y, color, vx, vy, life, size) {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].alive) {
        this.pool[i].reset(x, y, color, vx, vy, life, size);
        return;
      }
    }
  }

  clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].alive = false;
    }
  }

  burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 40 + Math.random() * 80;
      this._spawn(
        x, y, color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 30,
        0.5 + Math.random() * 0.8,
        2 + Math.random() * 3
      );
    }
  }

  sparkle(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 30;
      this._spawn(
        x, y, color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.5,
        1 + Math.random() * 2
      );
    }
  }

  dust(x, y) {
    for (let i = 0; i < 3; i++) {
      this._spawn(
        x, y, '#ffd70066',
        (Math.random() - 0.5) * 20,
        -10 - Math.random() * 20,
        0.8 + Math.random() * 1,
        1 + Math.random() * 1.5
      );
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].alive) {
        this.pool[i].update(dt);
      }
    }
  }

  render() {
    const ctx = this.r.ctx;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].alive) {
        this.pool[i].render(ctx);
      }
    }
  }
}
