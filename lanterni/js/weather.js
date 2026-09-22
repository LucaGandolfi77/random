// js/weather.js — Weather effects system

const WEATHER_TYPES = {
  clear: {
    name: 'Sereno',
    particles: 0,
    wind: 0,
    visibility: 1.0
  },
  rain: {
    name: 'Pioggia',
    particles: 100,
    wind: 0.3,
    visibility: 0.8,
    colors: ['#4a90d9', '#5dade2', '#85c1e9'],
    speed: 400,
    angle: 0.1
  },
  snow: {
    name: 'Neve',
    particles: 80,
    wind: 0.2,
    visibility: 0.9,
    colors: ['#ffffff', '#eeeeff', '#ddddee'],
    speed: 100,
    angle: 0.05
  },
  fog: {
    name: 'Nebbia',
    particles: 30,
    wind: 0.1,
    visibility: 0.6,
    colors: ['#cccccc', '#dddddd', '#eeeeee'],
    speed: 20,
    angle: 0
  },
  wind: {
    name: 'Vento',
    particles: 0,
    wind: 0.8,
    visibility: 1.0
  },
  storm: {
    name: 'Tempesta',
    particles: 150,
    wind: 1.2,
    visibility: 0.5,
    colors: ['#2c3e50', '#34495e', '#5d6d7e'],
    speed: 600,
    angle: 0.2,
    lightning: true
  }
};

class WeatherParticle {
  constructor(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.x = Math.random() * 1200 - 200;
    this.y = -10;
    this.alive = true;
    this.alpha = 0.5 + Math.random() * 0.5;
    this.size = 1 + Math.random() * 3;

    const weather = WEATHER_TYPES[this.type];
    this.color = weather.colors[Math.floor(Math.random() * weather.colors.length)];
    this.speed = weather.speed * (0.8 + Math.random() * 0.4);
    this.angle = weather.angle * (Math.random() - 0.5);
  }

  update(dt, wind) {
    if (!this.alive) return;

    this.y += this.speed * dt;
    this.x += Math.sin(this.angle) * this.speed * dt + wind * 50 * dt;

    if (this.y > 700 || this.x < -50 || this.x > 1250) {
      this.alive = false;
    }
  }

  render(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    if (this.type === 'snow') {
      // Snowflake: small circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'rain') {
      // Raindrop: thin line
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - 2, this.y + 10);
      ctx.stroke();
    } else {
      // Fog: soft circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class WeatherSystem {
  constructor() {
    this.currentWeather = 'clear';
    this.particles = [];
    this.maxParticles = 150;
    this.wind = 0;
    this.targetWind = 0;
    this.windChangeTimer = 0;
    this.lightningTimer = 0;
    this.lightningFlash = false;
    this.transitionTimer = 0;
    this.transitionDuration = 2;
    this.nextWeather = null;
    this.weatherChangeTimer = 0;
    this.weatherChangeInterval = 30; // Change weather every 30 seconds
  }

  update(dt) {
    // Wind变化
    this.windChangeTimer += dt;
    if (this.windChangeTimer > 3) {
      this.windChangeTimer = 0;
      this.targetWind = (Math.random() - 0.5) * WEATHER_TYPES[this.currentWeather].wind;
    }
    this.wind += (this.targetWind - this.wind) * dt * 2;

    // 天气变化
    this.weatherChangeTimer += dt;
    if (this.weatherChangeTimer >= this.weatherChangeInterval) {
      this.weatherChangeTimer = 0;
      this.startTransition();
    }

    // 过渡
    if (this.nextWeather) {
      this.transitionTimer += dt;
      if (this.transitionTimer >= this.transitionDuration) {
        this.currentWeather = this.nextWeather;
        this.nextWeather = null;
        this.transitionTimer = 0;
        this.particles = [];
      }
    }

    // 闪电
    if (WEATHER_TYPES[this.currentWeather].lightning) {
      this.lightningTimer += dt;
      if (this.lightningTimer > 2 + Math.random() * 5) {
        this.lightningTimer = 0;
        this.lightningFlash = true;
        setTimeout(() => { this.lightningFlash = false; }, 100);
      }
    }

    // 生成粒子
    const weather = WEATHER_TYPES[this.currentWeather];
    if (weather.particles > 0 && this.particles.length < this.maxParticles) {
      const spawnCount = Math.min(3, weather.particles - this.particles.length);
      for (let i = 0; i < spawnCount; i++) {
        this.particles.push(new WeatherParticle(this.currentWeather));
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt, this.wind);
      if (!this.particles[i].alive) {
        this.particles[i].reset();
      }
    }
  }

  startTransition() {
    const types = Object.keys(WEATHER_TYPES);
    const currentIdx = types.indexOf(this.currentWeather);
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * types.length);
    } while (nextIdx === currentIdx);

    this.nextWeather = types[nextIdx];
    this.transitionTimer = 0;
  }

  setWeather(type) {
    if (WEATHER_TYPES[type]) {
      this.currentWeather = type;
      this.particles = [];
    }
  }

  render(ctx) {
    // Render particles
    for (const p of this.particles) {
      p.render(ctx);
    }

    // Lightning flash
    if (this.lightningFlash) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    // Fog overlay
    if (this.currentWeather === 'fog') {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  getVisibility() {
    return WEATHER_TYPES[this.currentWeather].visibility;
  }

  getWind() {
    return this.wind;
  }

  isActive() {
    return this.currentWeather !== 'clear';
  }

  serialize() {
    return {
      currentWeather: this.currentWeather,
      wind: this.wind
    };
  }

  deserialize(data) {
    if (data) {
      this.currentWeather = data.currentWeather || 'clear';
      this.wind = data.wind || 0;
    }
  }
}
