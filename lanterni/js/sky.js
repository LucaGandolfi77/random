// js/sky.js — Night sky, stars, dawn transition

import { COLORS, SKY } from './data.js';

class Star {
  constructor(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h * 0.6;
    this.size = 0.5 + Math.random() * 1.5;
    this.brightness = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 0.5 + Math.random() * 2;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.type = Math.random() < 0.2 ? 'gold' : Math.random() < 0.3 ? 'blue' : 'white';
  }
}

class BackgroundCloud {
  constructor(w, h) {
    this.x = -200 + Math.random() * (w + 400);
    this.y = h * 0.3 + Math.random() * h * 0.4;
    this.w = 80 + Math.random() * 120;
    this.h = 25 + Math.random() * 20;
    this.speed = 3 + Math.random() * 5;
    this.alpha = 0.08 + Math.random() * 0.12;
  }

  update(dt, w) {
    this.x += this.speed * dt;
    if (this.x > w + 200) this.x = -200 - this.w;
  }
}

export class Sky {
  constructor(renderer) {
    this.r = renderer;
    this.time = 0;
    this.dawnProgress = 0;
    this.isDawning = false;
    this.stars = [];
    this.clouds = [];
    this.cityLights = [];
    this.reset();
  }

  reset() {
    this.time = 0;
    this.dawnProgress = 0;
    this.isDawning = false;
    this.stars = [];
    this.clouds = [];

    for (let i = 0; i < SKY.starCount; i++) {
      this.stars.push(new Star(this.r.w, this.r.h));
    }
    for (let i = 0; i < 6; i++) {
      this.clouds.push(new BackgroundCloud(this.r.w, this.r.h));
    }
  }

  startDawn() {
    this.isDawning = true;
    this.dawnProgress = 0;
  }

  setCityLights(lights) {
    this.cityLights = lights;
  }

  update(dt) {
    this.time += dt;
    for (const c of this.clouds) {
      c.update(dt, this.r.w);
    }
    if (this.isDawning) {
      this.dawnProgress = Math.min(1, this.dawnProgress + dt / SKY.dawnDuration);
    }
  }

  render(dt) {
    const r = this.r;
    const ctx = r.ctx;
    const w = r.w;
    const h = r.h;

    // Sky gradient
    if (this.dawnProgress > 0) {
      const topR = this.lerp(10, 255, this.dawnProgress);
      const topG = this.lerp(14, 126, this.dawnProgress);
      const topB = this.lerp(26, 95, this.dawnProgress);
      const botR = this.lerp(26, 254, this.dawnProgress);
      const botG = this.lerp(26, 180, this.dawnProgress);
      const botB = this.lerp(62, 123, this.dawnProgress);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
      grad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      r.drawGradientBg(COLORS.skyTop, COLORS.skyBottom);
    }

    // Stars (fade out during dawn)
    const starAlpha = 1 - this.dawnProgress * 0.9;
    for (const star of this.stars) {
      const twinkle = 0.5 + Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset) * 0.5;
      const alpha = star.brightness * twinkle * starAlpha;
      if (alpha < 0.02) continue;

      let color;
      if (star.type === 'gold') color = COLORS.starGold;
      else if (star.type === 'blue') color = COLORS.starBlue;
      else color = COLORS.starWhite;

      r.drawCircle(star.x, star.y, star.size, color, alpha);
    }

    // City light stars (reflected from city)
    for (const light of this.cityLights) {
      const reflectedY = light.y * 0.3;
      const alpha = starAlpha * 0.5;
      if (alpha > 0.02) {
        r.drawGlow(light.x, reflectedY, 4, light.color, alpha);
        r.drawCircle(light.x, reflectedY, 1.5, light.color, alpha);
      }
    }
  }

  renderClouds(dt) {
    for (const c of this.clouds) {
      this.r.drawCloud(c.x, c.y, c.w, c.h, c.alpha);
    }
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}
