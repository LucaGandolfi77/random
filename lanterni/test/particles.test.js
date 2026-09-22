import { describe, it, expect } from 'vitest';
import { Particles } from '../js/particles.js';

describe('Particles', () => {
  const mockRenderer = {
    ctx: {
      globalAlpha: 1,
      fillStyle: '',
      beginPath() {},
      arc() {},
      fill() {}
    }
  };

  it('should create particles in burst', () => {
    const p = new Particles(mockRenderer);
    p.burst(100, 100, '#ff0000', 5);
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(5);
  });

  it('should recycle dead particles', () => {
    const p = new Particles(mockRenderer, 10);
    p.burst(100, 100, '#ff0000', 10);
    p.update(10); // all should die
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(0);
  });

  it('should reuse slots after clear', () => {
    const p = new Particles(mockRenderer, 10);
    p.burst(100, 100, '#ff0000', 10);
    p.clear();
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(0);
    // Can spawn again
    p.burst(100, 100, '#00ff00', 5);
    alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(5);
  });

  it('should handle sparkle', () => {
    const p = new Particles(mockRenderer);
    p.sparkle(100, 100, '#ffd700');
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(5);
  });

  it('should handle dust', () => {
    const p = new Particles(mockRenderer);
    p.dust(100, 100);
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBe(3);
  });

  it('should not exceed pool size', () => {
    const p = new Particles(mockRenderer, 5);
    p.burst(100, 100, '#ff0000', 10);
    let alive = 0;
    for (const part of p.pool) {
      if (part.alive) alive++;
    }
    expect(alive).toBeLessThanOrEqual(5);
  });
});
