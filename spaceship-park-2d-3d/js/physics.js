class PhysicsEngine {
  constructor() {
    this.ship = null;
    this.obstacles = [];
    this.parkingSpots = [];
    this.gravityWells = [];
    this.movingObstacles = [];
    this.level = null;
    this.screenShake = 0;
    this.shakeIntensity = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.blockedTime = 0;
  }

  loadLevel(level) {
    this.level = level;
    this.obstacles = level.obstacles || [];
    this.parkingSpots = level.parkingSpots || [];
    this.gravityWells = level.gravityWells || [];
    this.movingObstacles = level.movingObstacles || [];
    this.screenShake = 0;
    this.shakeIntensity = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.blockedTime = 0;
    const shipType = SHIP_TYPES[level.ship];
    this.ship = {
      x: level.shipStart.x, y: level.shipStart.y,
      angle: level.shipStart.angle,
      vx: 0, vy: 0, angularVel: 0,
      speed: shipType.speed, friction: shipType.friction,
      size: shipType.size, color: shipType.color, name: shipType.name,
      fuel: level.fuel || 100, fuelRate: 0.015,
      parked: false, score: 0,
      boostActive: false, boostFuel: 0,
      invincible: 0, bumpCount: 0,
      engineSoundTimer: 0
    };
  }

  update(dt) {
    if (!this.ship || this.ship.parked) return;
    const s = this.ship;

    // Moving obstacles update
    this.updateMovingObstacles(dt);

    s.vx *= Math.pow(s.friction, dt * 60);
    s.vy *= Math.pow(s.friction, dt * 60);
    s.angularVel *= Math.pow(0.95, dt * 60);
    s.angle += s.angularVel * dt * 60;

    s.x += s.vx * dt * 60;
    s.y += s.vy * dt * 60;

    if (this.gravityWells.length > 0) {
      for (const gw of this.gravityWells) {
        const dx = gw.x - s.x, dy = gw.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < gw.r && dist > 0.1) {
          const force = gw.strength * (1 - dist/gw.r) / dist;
          s.vx += dx * force * dt * 60;
          s.vy += dy * force * dt * 60;
        }
      }
    }

    const margin = s.size * 0.5;
    s.x = Math.max(margin, Math.min(this.level.width - margin, s.x));
    s.y = Math.max(margin, Math.min(this.level.height - margin, s.y));

    let blocked = true;
    for (const obs of this.obstacles) {
      if (this.handleCollision(s, obs)) { blocked = false; }
    }
    for (const mo of this.movingObstacles) {
      if (this.handleCollision(s, mo)) { blocked = false; }
    }

    if (s.invincible > 0) s.invincible -= dt * 60;

    if (blocked) {
      this.blockedTime += dt;
      if (this.blockedTime > 2 && Math.random() < 0.02) {
        this.combo = Math.max(0, this.combo - 1);
      }
    } else {
      this.blockedTime = 0;
    }

    if (Math.abs(s.vx) + Math.abs(s.vy) > 0.1) {
      this.combo += dt * 2;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    }

    if (s.fuel > 0) s.fuel -= s.fuelRate * dt * 60;
    if (s.fuel <= 0) { s.fuel = 0; }

    this.checkParking();
  }

  updateMovingObstacles(dt) {
    for (const mo of this.movingObstacles) {
      const speed = mo.speed * dt * 60;
      if (mo.axis === 'x') {
        mo.x += mo.vx || speed;
        if (mo.x > mo.originX + mo.range || mo.x < mo.originX) {
          mo.vx = -(mo.vx || speed);
          mo.x = Math.max(mo.originX, Math.min(mo.originX + mo.range, mo.x));
        }
        if (!mo.vx) mo.vx = speed;
      } else {
        mo.y += mo.vy || speed;
        if (mo.y > mo.originY + mo.range || mo.y < mo.originY) {
          mo.vy = -(mo.vy || speed);
          mo.y = Math.max(mo.originY, Math.min(mo.originY + mo.range, mo.y));
        }
        if (!mo.vy) mo.vy = speed;
      }
    }
  }

  handleCollision(s, obs) {
    if (s.invincible > 0) return false;
    if (obs.type === 'circle') {
      const dx = s.x - obs.x, dy = s.y - obs.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = obs.r + s.size * 0.5;
      if (dist < minDist && dist > 0.1) {
        const nx = dx / dist, ny = dy / dist;
        s.x = obs.x + nx * minDist;
        s.y = obs.y + ny * minDist;
        const dot = s.vx * nx + s.vy * ny;
        s.vx -= 2.0 * dot * nx;
        s.vy -= 2.0 * dot * ny;
        s.angularVel += dot * 0.02;
        this.addCollisionEffect(obs.x, obs.y, Math.abs(dot));
        s.bumpCount++;
        this.combo = Math.max(0, this.combo - 2);
        this.screenShake = 10;
        this.shakeIntensity = Math.abs(dot);
        s.invincible = 0.5;
        return true;
      }
    } else {
      const hw = s.size * 0.5, hh = s.size * 0.3;
      const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
      const localX = (s.x - obs.x) * cos + (s.y - obs.y) * sin;
      const localY = -(s.x - obs.x) * sin + (s.y - obs.y) * cos;
      const obsHW = obs.w / 2, obsHH = obs.h / 2;
      if (Math.abs(localX) < hw + obsHW && Math.abs(localY) < hh + obsHH) {
        const overlapX = (hw + obsHW) - Math.abs(localX);
        const overlapY = (hh + obsHH) - Math.abs(localY);
        if (overlapX < overlapY) {
          s.x += (localX > 0 ? overlapX : -overlapX) * 0.5;
          s.vx *= -0.2;
          s.angularVel += s.vx * 0.008;
        } else {
          s.y += (localY > 0 ? overlapY : -overlapY) * 0.5;
          s.vy *= -0.2;
          s.angularVel += s.vy * 0.008;
        }
        this.addCollisionEffect(s.x, s.y, 1);
        s.bumpCount++;
        this.combo = Math.max(0, this.combo - 2);
        this.screenShake = 8;
        this.shakeIntensity = 1;
        s.invincible = 0.3;
        return true;
      }
    }
    return false;
  }

  addCollisionEffect(x, y, intensity) {
    if (this.level && this.level._particles) {
      this.level._particles.addCollision(x, y, intensity);
    }
  }

  checkParking() {
    for (const spot of this.parkingSpots) {
      const dx = this.ship.x - spot.x, dy = this.ship.y - spot.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angleDiff = Math.abs(Math.atan2(Math.sin(this.ship.angle - spot.angle), Math.cos(this.ship.angle - spot.angle)));
      if (dist < 50 && angleDiff < 0.35 && this.ship.fuel > 0) {
        this.ship.parked = true;
        this.ship.score += 100 + Math.floor(this.combo * 10);
        if (this.level && this.level._particles) {
          this.level._particles.addParkingSparkles(spot.x, spot.y);
        }
        return true;
      }
    }
    return false;
  }

  applyThrust(direction) {
    if (!this.ship || this.ship.parked) return;
    const s = this.ship;
    let ax = Math.cos(s.angle) * s.speed * 0.12;
    let ay = Math.sin(s.angle) * s.speed * 0.12;
    if (direction === 'forward') {
      if (s.boostActive && s.boostFuel > 0) {
        ax *= 2.5; ay *= 2.5;
        s.boostFuel -= 0.08;
        if (s.boostFuel <= 0) { s.boostActive = false; s.boostFuel = 0; }
      }
      s.vx += ax; s.vy += ay;
    } else {
      s.vx -= ax * 0.6; s.vy -= ay * 0.6;
    }
    s.fuel = Math.max(0, s.fuel - 0.04);
  }

  activateBoost() {
    if (!this.ship || this.ship.parked) return false;
    const s = this.ship;
    if (s.boostFuel >= 20) {
      s.boostActive = true;
      return true;
    }
    return false;
  }

  updateBoost(dt) {
    if (!this.ship) return;
    const s = this.ship;
    if (s.boostFuel < 100 && Math.abs(s.vx) + Math.abs(s.vy) < 0.5) {
      s.boostFuel = Math.min(100, s.boostFuel + 0.05 * dt * 60);
    }
    if (s.boostFuel > 0 && s.boostActive) {
      // Already handled in applyThrust
    }
  }

  rotate(dir) {
    if (!this.ship || this.ship.parked) return;
    this.ship.angularVel += dir * 0.045;
  }

  brake() {
    if (!this.ship) return;
    this.ship.vx *= 0.4; this.ship.vy *= 0.4;
    this.ship.angularVel *= 0.4;
  }

  isParked() { return this.ship && this.ship.parked; }
  getFuel() { return this.ship ? this.ship.fuel : 0; }
  getBoostFuel() { return this.ship ? this.ship.boostFuel : 0; }
  getScreenShake() {
    const ss = { x: 0, y: 0 };
    if (this.screenShake > 0) {
      ss.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ss.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }
    return ss;
  }
}
