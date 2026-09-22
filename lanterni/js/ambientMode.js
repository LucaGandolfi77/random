// js/ambientMode.js — Real-time day/night cycle based on local time

export class AmbientMode {
  constructor() {
    this.enabled = false;
    this.isNight = true;
    this.sunriseHour = 6;
    this.sunsetHour = 20;
    this.lastCheck = 0;
    this.checkInterval = 60000;
  }

  update(dt) {
    if (!this.enabled) return false;

    this.lastCheck += dt * 1000;
    if (this.lastCheck < this.checkInterval) return false;
    this.lastCheck = 0;

    const wasNight = this.isNight;
    this.checkTime();
    return wasNight !== this.isNight;
  }

  checkTime() {
    const now = new Date();
    const hour = now.getHours();
    this.isNight = hour < this.sunriseHour || hour >= this.sunsetHour;
  }

  getTimePhase() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour + minute / 60;

    if (time < this.sunriseHour) return 'night';
    if (time < this.sunriseHour + 1) return 'dawn';
    if (time < this.sunsetHour - 1) return 'day';
    if (time < this.sunsetHour) return 'dusk';
    return 'night';
  }

  canCatchLanterns() {
    const phase = this.getTimePhase();
    return phase === 'night' || phase === 'dawn' || phase === 'dusk';
  }

  canBuildCity() {
    return true;
  }

  enable() {
    this.enabled = true;
    this.checkTime();
  }

  disable() {
    this.enabled = false;
  }

  serialize() {
    return {
      enabled: this.enabled,
      sunriseHour: this.sunriseHour,
      sunsetHour: this.sunsetHour
    };
  }

  deserialize(data) {
    if (data) {
      this.enabled = data.enabled || false;
      this.sunriseHour = data.sunriseHour || 6;
      this.sunsetHour = data.sunsetHour || 20;
      this.checkTime();
    }
  }
}
