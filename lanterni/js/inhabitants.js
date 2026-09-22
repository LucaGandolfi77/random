// js/inhabitants.js — Cloud cats, moths, paper mice

import { PHYSICS } from './data.js';

class CloudCat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.time = 0;
    this.state = 'idle'; // idle, walking, sleeping
    this.stateTimer = 2 + Math.random() * 4;
    this.direction = 1;
    this.zzz = [];
  }

  update(dt, lanterns) {
    this.time += dt;
    this.stateTimer -= dt;

    if (this.stateTimer <= 0) {
      if (this.state === 'idle' || this.state === 'sleeping') {
        this.state = 'walking';
        // Pick a nearby lantern to walk to
        if (lanterns.length > 0) {
          const nearby = lanterns[Math.floor(Math.random() * lanterns.length)];
          this.targetX = nearby.x + (Math.random() - 0.5) * 20;
          this.targetY = nearby.y - 15;
          this.direction = this.targetX > this.x ? 1 : -1;
        }
        this.stateTimer = 1 + Math.random() * 2;
      } else {
        this.state = Math.random() < 0.4 ? 'sleeping' : 'idle';
        this.stateTimer = 2 + Math.random() * 5;
      }
    }

    if (this.state === 'walking') {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        this.x += (dx / dist) * PHYSICS.catSpeed * dt;
        this.y += (dy / dist) * PHYSICS.catSpeed * dt;
      } else {
        this.state = 'idle';
        this.stateTimer = 1 + Math.random() * 3;
      }
    }

    if (this.state === 'sleeping') {
      if (Math.random() < 0.02) {
        this.zzz.push({ x: this.x + 10, y: this.y - 15, life: 1.5 });
      }
    }

    this.zzz = this.zzz.filter(z => {
      z.y -= 15 * dt;
      z.life -= dt;
      return z.life > 0;
    });
  }

  render(ctx) {
    // Body — cloud shape
    ctx.fillStyle = 'rgba(200, 210, 230, 0.7)';
    const s = 8;
    const dirs = this.direction;

    // Head
    ctx.beginPath();
    ctx.arc(this.x + dirs * 6, this.y - 4, s * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(this.x, this.y, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(this.x + dirs * 4, this.y - 8);
    ctx.lineTo(this.x + dirs * 8, this.y - 14);
    ctx.lineTo(this.x + dirs * 10, this.y - 6);
    ctx.fill();

    // Eyes
    if (this.state !== 'sleeping') {
      ctx.fillStyle = '#2a2a4a';
      ctx.beginPath();
      ctx.arc(this.x + dirs * 5, this.y - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Closed eyes
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + dirs * 3, this.y - 4);
      ctx.lineTo(this.x + dirs * 7, this.y - 4);
      ctx.stroke();
    }

    // Zzz
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.font = '10px serif';
    for (const z of this.zzz) {
      ctx.globalAlpha = z.life / 1.5;
      ctx.fillText('z', z.x, z.y);
    }
    ctx.globalAlpha = 1;
  }
}

class Moth {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.time = Math.random() * Math.PI * 2;
    this.radius = 15 + Math.random() * 25;
    this.centerX = x;
    this.centerY = y;
    this.wingPhase = 0;
  }

  update(dt) {
    this.time += dt;
    this.wingPhase += dt * 12;
    this.angle += dt * 1.5;
    this.x = this.centerX + Math.cos(this.angle) * this.radius;
    this.y = this.centerY + Math.sin(this.angle * 0.7) * this.radius * 0.5;
  }

  render(ctx) {
    const wing = Math.sin(this.wingPhase) * 0.4;

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wings
    ctx.fillStyle = 'rgba(255, 200, 100, 0.7)';
    ctx.save();
    ctx.translate(this.x, this.y);

    // Left wing
    ctx.beginPath();
    ctx.ellipse(-4, -2, 6, 3 + wing * 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.ellipse(4, -2, 6, 3 + wing * 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#8a7050';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class PaperMouse {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.time = 0;
    this.letters = [];
    this.writeTimer = 2 + Math.random() * 3;
  }

  update(dt) {
    this.time += dt;
    this.writeTimer -= dt;

    if (this.writeTimer <= 0) {
      this.writeTimer = 3 + Math.random() * 4;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      this.letters.push({
        x: this.x,
        y: this.y - 10,
        char: letters[Math.floor(Math.random() * letters.length)],
        vx: (Math.random() - 0.5) * 15,
        vy: -20 - Math.random() * 20,
        life: 2 + Math.random() * 2,
        rot: (Math.random() - 0.5) * 0.5
      });
    }

    this.letters = this.letters.filter(l => {
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.vy += 5 * dt;
      l.rot += dt * 0.5;
      l.life -= dt;
      return l.life > 0;
    });
  }

  render(ctx) {
    // Mouse body
    ctx.fillStyle = '#c4a882';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y - 1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + 9, this.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#2a2a4a';
    ctx.beginPath();
    ctx.arc(this.x + 7, this.y - 1, 1, 0, Math.PI * 2);
    ctx.fill();

    // Quill pen
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x + 3, this.y - 6);
    ctx.lineTo(this.x + 8, this.y - 12);
    ctx.stroke();

    // Floating letters
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    for (const l of this.letters) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = Math.min(1, l.life);
      ctx.fillStyle = '#f5e6d3';
      ctx.fillText(l.char, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

export class Inhabitants {
  constructor(renderer) {
    this.r = renderer;
    this.entities = [];
  }

  update(dt, cityLanterns) {
    // Spawn new inhabitants based on city lanterns
    for (const cl of cityLanterns) {
      if (cl.inhabitant && !this.entities.find(e => e.lanternId === cl.gx + ',' + cl.gy)) {
        const type = cl.inhabitant.id;
        if (type === 'cloud_cat') {
          this.entities.push(new CloudCat(cl.x, cl.y - 15));
          this.entities[this.entities.length - 1].lanternId = cl.gx + ',' + cl.gy;
        } else if (type === 'moth') {
          this.entities.push(new Moth(cl.x, cl.y - 10));
          this.entities[this.entities.length - 1].lanternId = cl.gx + ',' + cl.gy;
        } else if (type === 'paper_mouse') {
          this.entities.push(new PaperMouse(cl.x, cl.y - 8));
          this.entities[this.entities.length - 1].lanternId = cl.gx + ',' + cl.gy;
        }
      }
    }

    for (const e of this.entities) {
      e.update(dt, cityLanterns);
    }
  }

  render() {
    const ctx = this.r.ctx;
    for (const e of this.entities) {
      e.render(ctx);
    }
  }
}
