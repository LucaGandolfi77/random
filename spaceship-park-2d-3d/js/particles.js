class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500;
  }

  emit(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * Math.PI * 2;
      const speed = (opts.speed || 2) * (0.5 + Math.random());
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: opts.decay || (0.02 + Math.random() * 0.02),
        size: opts.size || (2 + Math.random() * 3),
        color: opts.color || '#ff6600',
        type: opts.type || 'circle'
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= p.decay * dt * 60;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      const size = p.size * p.life;
      const screenX = (p.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
      const screenY = (p.y - camera.y) * camera.zoom + ctx.canvas.height / 2;
      
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.type === 'circle') {
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      } else {
        ctx.rect(screenX - size, screenY - size, size * 2, size * 2);
      }
      ctx.fill();
      
      // Glow
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Engine thrust particles
  addThrust(ship) {
    const s = ship.size;
    const bx = ship.x - s * 0.8 * Math.cos(ship.angle);
    const by = ship.y - s * 0.8 * Math.sin(ship.angle);
    const count = Math.floor(Math.abs(ship.vx) + Math.abs(ship.vy) > 0.5 ? 3 : 1);
    this.emit(bx, by, count, {
      angle: ship.angle + Math.PI,
      spread: 0.5,
      speed: 1 + Math.random(),
      decay: 0.03,
      size: 2 + Math.random() * 4,
      color: ship.fuel > 0 ? `rgba(255,${100+Math.random()*100|0},0,1)` : 'rgba(255,50,50,1)'
    });
  }

  // Collision sparks
  addCollision(x, y, intensity) {
    this.emit(x, y, Math.floor(5 + intensity * 5), {
      angle: undefined,
      spread: Math.PI * 2,
      speed: 2 + intensity,
      decay: 0.04,
      size: 2 + intensity,
      color: '#ffaa00'
    });
    this.emit(x, y, Math.floor(2 + intensity * 2), {
      angle: undefined,
      spread: Math.PI * 2,
      speed: 1,
      decay: 0.06,
      size: 1,
      color: '#ffffff'
    });
  }

  // Parking sparkles
  addParkingSparkles(x, y) {
    this.emit(x, y, 2, {
      angle: undefined,
      spread: Math.PI * 2,
      speed: 1,
      decay: 0.02,
      size: 2,
      color: '#ffd700'
    });
  }

  clear() {
    this.particles = [];
  }
}
