// js/lilyPad.js — Bioluminescent lily pads for water areas

import { COLORS, GRID } from './data.js';

export class LilyPad {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 25 + Math.random() * 15;
    this.glowIntensity = 0;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.color = COLORS.lilyPad;
    this.glowColor = COLORS.lilyPadGlow;
    this.active = true;
    this.pulseSpeed = 0.5 + Math.random() * 0.5;
    this.hasResident = false;
  }

  update(dt) {
    if (!this.active) return;
    this.glowPhase += dt * this.pulseSpeed;
    this.glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
  }

  containsPoint(px, py, tolerance = 0) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= (this.radius + tolerance) * (this.radius + tolerance);
  }

  attractParticle(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.radius * 2) {
      const force = 0.1 * (1 - dist / (this.radius * 2));
      return { fx: dx * force, fy: dy * force };
    }
    return { fx: 0, fy: 0 };
  }
}

export class LilyPadManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.pads = [];
    this.maxPads = 8;
  }

  spawn(x, y) {
    if (this.pads.length >= this.maxPads) return null;
    const pad = new LilyPad(x, y);
    this.pads.push(pad);
    return pad;
  }

  spawnRandom(centerX, centerY, radius) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    return this.spawn(x, y);
  }

  update(dt) {
    for (const pad of this.pads) {
      pad.update(dt);
    }
  }

  render() {
    const ctx = this.renderer.ctx;
    for (const pad of this.pads) {
      ctx.save();

      // Draw lily pad
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
      ctx.fillStyle = pad.color;
      ctx.fill();

      // Add notched edge (like real lily pad)
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y);
      ctx.arc(pad.x, pad.y, pad.radius, -0.2, 0.2);
      ctx.closePath();
      ctx.fillStyle = '#1a1a3e';
      ctx.fill();

      // Draw glow
      if (pad.glowIntensity > 0) {
        ctx.globalAlpha = pad.glowIntensity;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = pad.glowColor;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  checkInteraction(x, y) {
    for (const pad of this.pads) {
      if (pad.containsPoint(x, y, 10)) {
        return pad;
      }
    }
    return null;
  }

  clear() {
    this.pads = [];
  }

  serialize() {
    return this.pads.map(p => ({
      x: p.x,
      y: p.y,
      radius: p.radius,
      hasResident: p.hasResident
    }));
  }

  deserialize(data) {
    this.pads = [];
    for (const d of data) {
      const pad = new LilyPad(d.x, d.y);
      pad.radius = d.radius;
      pad.hasResident = d.hasResident;
      this.pads.push(pad);
    }
  }
}
