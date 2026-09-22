// js/city.js — Snap-and-go city grid

import { GRID, COLORS, LANTERN_TYPES, INHABITANT_TYPES, FURNITURE_TYPES } from './data.js';

class CityLantern {
  constructor(lantern, gx, gy) {
    this.lantern = lantern;
    this.gx = gx;
    this.gy = gy;
    this.x = 0;
    this.y = 0;
    this.connections = [];
    this.pulseTime = Math.random() * Math.PI * 2;
  }
}

export class City {
  constructor(renderer) {
    this.r = renderer;
    this.placed = [];
    this.grid = {};
    this.originX = 0;
    this.originY = 0;
    this.cityBottom = 0;
    this.recalcOrigin();
  }

  recalcOrigin() {
    this.originX = this.r.w / 2;
    this.originY = this.r.h * 0.65;
  }

  toWorld(gx, gy) {
    return {
      x: this.originX + gx * GRID.cellSize,
      y: this.originY + gy * GRID.cellSize
    };
  }

  toGrid(wx, wy) {
    return {
      gx: Math.round((wx - this.originX) / GRID.cellSize),
      gy: Math.round((wy - this.originY) / GRID.cellSize)
    };
  }

  findSnapPosition(x, y) {
    const { gx, gy } = this.toGrid(x, y);

    // Check if this cell is free
    const key = `${gx},${gy}`;
    if (!this.grid[key]) {
      return this.toWorld(gx, gy);
    }

    // Find nearest free adjacent cell
    let bestDist = Infinity;
    let best = null;
    for (const off of GRID.offsets) {
      const nx = gx + off.dx;
      const ny = gy + off.dy;
      const nk = `${nx},${ny}`;
      if (!this.grid[nk]) {
        const w = this.toWorld(nx, ny);
        const d = Math.hypot(w.x - x, w.y - y);
        if (d < bestDist && d < GRID.snapRange * 3) {
          bestDist = d;
          best = w;
        }
      }
    }

    return best || this.toWorld(gx, gy);
  }

  placeLantern(lantern, wx, wy) {
    const { gx, gy } = this.toGrid(wx, wy);
    const key = `${gx},${gy}`;

    const cl = new CityLantern(lantern, gx, gy);
    const pos = this.toWorld(gx, gy);
    cl.x = pos.x;
    cl.y = pos.y;

    this.placed.push(cl);
    this.grid[key] = cl;

    // Connect to neighbors
    for (const off of GRID.offsets) {
      const nk = `${gx + off.dx},${gy + off.dy}`;
      if (this.grid[nk]) {
        cl.connections.push(this.grid[nk]);
        this.grid[nk].connections.push(cl);
      }
    }

    // Update city bottom for sky reflection
    this.cityBottom = Math.max(this.cityBottom, pos.y + 50);
  }

  getPlacedLanterns() {
    return this.placed.map(cl => ({
      x: cl.x,
      y: cl.y,
      color: cl.lantern.color,
      glow: cl.lantern.glow,
      inhabitant: cl.lantern.inhabitant,
      gx: cl.gx,
      gy: cl.gy
    }));
  }

  getAllLights() {
    return this.placed.map(cl => ({ x: cl.x, y: cl.y, color: cl.lantern.glow }));
  }

  update(dt) {
    for (const cl of this.placed) {
      cl.pulseTime += dt;
    }
  }

  render() {
    const ctx = this.r.ctx;

    // Draw ropes between connected lanterns
    for (const cl of this.placed) {
      for (const conn of cl.connections) {
        if (this.placed.indexOf(conn) > this.placed.indexOf(cl)) continue;
        const dx = conn.x - cl.x;
        const dy = conn.y - cl.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sag = dist * 0.12;

        ctx.strokeStyle = COLORS.rope;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(cl.x, cl.y);
        ctx.quadraticCurveTo(
          (cl.x + conn.x) / 2,
          (cl.y + conn.y) / 2 + sag,
          conn.x, conn.y
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Draw lanterns
    for (const cl of this.placed) {
      const pulse = 0.7 + Math.sin(cl.pulseTime * 1.5) * 0.3;
      this.r.drawLantern(cl.x, cl.y, 28, cl.lantern.color, cl.lantern.glow, pulse);

      // Draw inhabitant indicator
      if (cl.lantern.inhabitant && cl.lantern.inhabitant.emoji) {
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText(cl.lantern.inhabitant.emoji, cl.x, cl.y - 22);
      }
    }
  }

  serialize() {
    return this.placed.map(cl => ({
      gx: cl.gx,
      gy: cl.gy,
      typeId: cl.lantern.type.id,
      inhabitantId: cl.lantern.inhabitant ? cl.lantern.inhabitant.id : null
    }));
  }

  deserialize(data) {
    this.clear();
    for (const entry of data) {
      const type = LANTERN_TYPES.find(t => t.id === entry.typeId) || LANTERN_TYPES[0];
      let inhabitant = null;
      if (entry.inhabitantId) {
        inhabitant = INHABITANT_TYPES.find(i => i.id === entry.inhabitantId)
          || FURNITURE_TYPES.find(f => f.id === entry.inhabitantId)
          || null;
      }
      const lantern = { type, color: type.color, glow: type.glow, inhabitant };
      const pos = this.toWorld(entry.gx, entry.gy);
      this.placeLantern(lantern, pos.x, pos.y);
    }
  }

  clear() {
    this.placed = [];
    this.grid = {};
    this.cityBottom = 0;
  }
}
