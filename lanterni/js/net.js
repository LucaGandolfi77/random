// js/net.js — Net physics and throwing

import { NET } from './data.js';

export class Net {
  constructor(renderer) {
    this.r = renderer;
    this.state = 'idle'; // idle, charging, flying, retracting, caught
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.chargeX = 0;
    this.chargeY = 0;
    this.power = 0;
    this.angle = 0;
    this.size = 30;
    this.capturedLantern = null;
    this.returnX = 0;
    this.returnY = 0;
    this.catchTimer = 0;
  }

  startCharge(x, y) {
    this.state = 'charging';
    this.chargeX = x;
    this.chargeY = y;
    this.x = x;
    this.y = y;
    this.power = 0;
  }

  setChargePower(p) {
    this.power = p;
  }

  cancelCharge() {
    this.state = 'idle';
    this.power = 0;
  }

  throw(x, y, angle, power) {
    this.state = 'flying';
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * power * NET.throwMultiplier;
    this.vy = Math.sin(angle) * power * NET.throwMultiplier - 200;
    this.returnX = x;
    this.returnY = y;
  }

  update(dt, game) {
    if (this.state === 'flying') {
      this.vy += NET.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= NET.drag;

      // Check collision with floating lanterns
      const hit = game.lanterns.checkCatch(this.x, this.y, NET.catchRadius);
      if (hit) {
        this.state = 'caught';
        this.capturedLantern = hit;
        game.lanterns.remove(hit);
        game.audio.play('catch');
        game.particles.burst(this.x, this.y, hit.color, 8);
        this.catchTimer = 0.5;
      }

      // Off screen — return
      if (this.y > game.renderer.h + 50 || this.x < -100 || this.x > game.renderer.w + 100) {
        this.state = 'retracting';
      }
    }

    if (this.state === 'retracting' || this.state === 'caught') {
      const dx = this.returnX - this.x;
      const dy = this.returnY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.state = 'idle';
        this.x = this.returnX;
        this.y = this.returnY;
        if (this.catchTimer > 0 && game.state === 'caught') {
          game.throwLanternUp(this.capturedLantern);
          this.catchTimer = 0;
        }
      } else {
        const speed = NET.retractSpeed * dt;
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
      }
      if (this.catchTimer > 0) {
        this.catchTimer -= dt;
        if (this.catchTimer <= 0 && game.state !== 'dawn' && game.state !== 'paused') {
          game.throwLanternUp(this.capturedLantern);
        }
      }
    }
  }

  render() {
    if (this.state === 'idle') return;

    if (this.state === 'charging') {
      const glow = this.power * 0.6;
      this.r.drawCircle(this.chargeX, this.chargeY, 15 + this.power * 10, '#ffd700', 0.15 + glow * 0.2);
      this.r.drawNet(this.chargeX, this.chargeY - 20, this.size * (0.5 + this.power * 0.5), 0.5 + this.power * 0.5);
      return;
    }

    this.r.drawNet(this.x, this.y, this.size, this.state === 'caught' ? 0.6 : 1);

    if (this.state === 'caught' && this.capturedLantern) {
      this.r.drawLantern(this.x, this.y + 15, 20, this.capturedLantern.color, this.capturedLantern.glow || '#ffd700', 0.6);
    }
  }
}
