export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.fireflies = [];
    this.petals = [];
    this.running = false;
    this.resize();
    this.initFireflies();
    this.initPetals();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initWeatherParticles(weather) {
    this.weatherParticles = [];
    const count = weather === 'RAIN' ? 50 : weather === 'FOG' ? 20 : weather === 'STORM' ? 15 : 10;
    for (let i = 0; i < count; i++) {
      this.weatherParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        type: weather,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  initFireflies() {
    this.fireflies = [];
    for (let i = 0; i < 30; i++) {
      this.fireflies.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#ffd93d' : '#ff6bff'
      });
    }
  }

  initPetals() {
    this.petals = [];
    const colors = ['#ff8fa3', '#ff6b6b', '#ffd93d', '#4ecdc4', '#9b6dff'];
    for (let i = 0; i < 20; i++) {
      this.petals.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.2 + Math.random() * 0.5,
        radius: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  addBurst(x, y, color = '#ffd93d', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 2 + Math.random() * 3,
        color,
        life: 1,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  addFloatText(x, y, text, color = '#ff6b6b') {
    this.particles.push({
      x, y,
      vx: 0,
      vy: -1.5,
      text,
      color,
      life: 1,
      decay: 0.015,
      isText: true,
      fontSize: 16
    });
  }

  addFusionBurst(x, y, color = '#ffd93d', count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 4,
        color: [color, '#ff6bff', '#ffffff', '#4ecdc4'][i % 4],
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        isText: false
      });
    }
  }

  addFusionRing(x, y) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.particles.push({
          x, y,
          vx: 0, vy: 0,
          radius: 20 + i * 15,
          color: '#ffd93d',
          life: 0.8,
          decay: 0.03,
          isRing: true
        });
      }, i * 100);
    }
  }

  update() {
    // Fireflies
    this.fireflies.forEach(f => {
      f.x += f.vx + Math.sin(f.phase) * 0.3;
      f.y += f.vy + Math.cos(f.phase) * 0.2;
      f.phase += 0.02;
      if (f.x < 0) f.x = this.canvas.width;
      if (f.x > this.canvas.width) f.x = 0;
      if (f.y < 0) f.y = this.canvas.height;
      if (f.y > this.canvas.height) f.y = 0;
    });

    // Petals
    this.petals.forEach(p => {
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.wobble += 0.02;
      if (p.y > this.canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -20) p.x = this.canvas.width + 20;
      if (p.x > this.canvas.width + 20) p.x = -20;
    });

    // Weather particles
    if (this.weatherParticles) {
      this.weatherParticles.forEach(p => {
        if (p.type === 'RAIN') {
          p.y += p.speed * 3;
          p.x += Math.sin(p.y * 0.01) * 0.5;
          if (p.y > this.canvas.height) { p.y = -10; p.x = Math.random() * this.canvas.width; }
        } else if (p.type === 'FOG') {
          p.x += p.speed * 0.3;
          p.y += Math.sin(p.x * 0.005) * 0.2;
          if (p.x > this.canvas.width + 20) { p.x = -20; p.y = Math.random() * this.canvas.height; }
        } else if (p.type === 'STORM') {
          p.y += p.speed * 2;
          p.x += Math.sin(Date.now() * 0.001) * 2;
          if (p.y > this.canvas.height) { p.y = -10; p.x = Math.random() * this.canvas.width; }
        } else if (p.type === 'MOONLIGHT') {
          p.y -= p.speed * 0.5;
          p.x += Math.sin(p.y * 0.01) * 0.3;
          if (p.y < -10) { p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
        } else if (p.type === 'SUNNY') {
          p.y -= p.speed * 0.2;
          if (p.y < -10) { p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
        } else if (p.type === 'DAWN') {
          p.y -= p.speed * 0.3;
          p.x += Math.sin(Date.now() * 0.001) * 0.5;
          if (p.y < -10) { p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
        }
      });
    }

    // Burst particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (!p.isText) p.vy += 0.05;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Petals (background layer)
    this.petals.forEach(p => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, p.radius, p.radius * 0.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Fireflies
    this.fireflies.forEach(f => {
      const glow = Math.sin(f.phase) * 0.3 + 0.7;
      const r = f.radius * glow;
      this.ctx.beginPath();
      const gradient = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 4);
      gradient.addColorStop(0, f.color);
      gradient.addColorStop(0.5, f.color + '40');
      gradient.addColorStop(1, f.color + '00');
      this.ctx.fillStyle = gradient;
      this.ctx.arc(f.x, f.y, r * 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.fillStyle = '#fff';
      this.ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Weather particles
    if (this.weatherParticles) {
      this.weatherParticles.forEach(p => {
        this.ctx.globalAlpha = p.opacity;
        if (p.type === 'RAIN') {
          this.ctx.strokeStyle = '#74b9ff';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p.x - 1, p.y + 8);
          this.ctx.stroke();
        } else if (p.type === 'FOG') {
          this.ctx.fillStyle = 'rgba(178, 190, 195, 0.3)';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.type === 'STORM') {
          this.ctx.fillStyle = 'rgba(99, 110, 114, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.type === 'MOONLIGHT') {
          this.ctx.fillStyle = '#9b6dff';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.type === 'SUNNY') {
          this.ctx.fillStyle = '#ffe066';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.type === 'DAWN') {
          this.ctx.fillStyle = '#ff7675';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
      this.ctx.globalAlpha = 1;
    }

    // Burst particles (foreground layer)
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      if (p.isText) {
        this.ctx.fillStyle = p.color;
        this.ctx.font = `bold ${p.fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.text, p.x, p.y);
      } else if (p.isRing) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, Math.max(1, p.radius * p.life), 0, Math.PI * 2);
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, p.color + '00');
        this.ctx.fillStyle = gradient;
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.globalAlpha = 1;
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }
}
