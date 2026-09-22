// js/lantern.js — Lantern class and floating logic

import { PHYSICS } from './data.js';

export class Lantern {
  constructor(x, y, type, inhabitant) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.color = type.color;
    this.glow = type.glow;
    this.inhabitant = inhabitant || null;
    this.id = Math.random().toString(36).substr(2, 9);
    this.baseY = y;
    this.time = Math.random() * Math.PI * 2;
    this.alive = true;
    this.size = 25 + Math.random() * 8;
    this.captured = false;
  }

  update(dt) {
    if (this.captured) return;
    this.time += dt;
    this.y = this.baseY + Math.sin(this.time * PHYSICS.lanternSwayFrequency) * PHYSICS.lanternSwayAmplitude;
    this.x += Math.sin(this.time * 0.5) * 0.3;
    this.baseY += PHYSICS.lanternFloatSpeed * dt;

    if (this.baseY > window.innerHeight + 50) {
      this.alive = false;
    }
  }

  containsPoint(px, py, radius) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < radius + this.size * 0.5;
  }
}

export class LanternManager {
  constructor(renderer) {
    this.r = renderer;
    this.floating = [];
  }

  reset() {
    this.floating = [];
  }

  spawn(x, y, type, inhabitant) {
    this.floating.push(new Lantern(x, y, type, inhabitant));
  }

  remove(lantern) {
    lantern.captured = true;
    this.floating = this.floating.filter(l => l.id !== lantern.id);
  }

  checkCatch(x, y, radius) {
    for (let i = this.floating.length - 1; i >= 0; i--) {
      if (this.floating[i].containsPoint(x, y, radius)) {
        return this.floating[i];
      }
    }
    return null;
  }

  update(dt) {
    for (const l of this.floating) {
      l.update(dt);
    }
    this.floating = this.floating.filter(l => l.alive);
  }

  render() {
    for (const l of this.floating) {
      this.r.drawLantern(l.x, l.y, l.size, l.color, l.glow, 0.6);
    }
  }
}
