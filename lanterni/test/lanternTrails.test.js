import { describe, it, expect } from 'vitest';
import { LanternTrail, LanternTrailManager } from '../js/lanternTrails.js';

describe('LanternTrail', () => {
  it('should initialize', () => {
    const trail = new LanternTrail();
    expect(trail.active).toBe(false);
    expect(trail.particles).toHaveLength(0);
  });

  it('should start', () => {
    const trail = new LanternTrail();
    trail.start(100, 100);
    expect(trail.active).toBe(true);
  });

  it('should stop', () => {
    const trail = new LanternTrail();
    trail.start(100, 100);
    trail.stop();
    expect(trail.active).toBe(false);
  });

  it('should emit particles', () => {
    const trail = new LanternTrail();
    trail.start(100, 100);
    trail.emit(150, 150, '#ffd700');
    expect(trail.particles.length).toBeGreaterThan(0);
  });

  it('should update particles', () => {
    const trail = new LanternTrail();
    trail.start(100, 100);
    trail.emit(150, 150, '#ffd700');
    const count = trail.particles.length;
    trail.update(0.016);
    expect(trail.particles.length).toBe(count);
  });

  it('should clear particles', () => {
    const trail = new LanternTrail();
    trail.start(100, 100);
    trail.emit(150, 150, '#ffd700');
    trail.clear();
    expect(trail.particles).toHaveLength(0);
  });
});

describe('LanternTrailManager', () => {
  it('should start and stop trails', () => {
    const mgr = new LanternTrailManager();
    mgr.startTrail('l1', 100, 100, '#ffd700');
    expect(mgr.trails.size).toBe(1);

    mgr.stopTrail('l1');
    expect(mgr.trails.get('l1').active).toBe(false);
  });

  it('should remove trails', () => {
    const mgr = new LanternTrailManager();
    mgr.startTrail('l1', 100, 100, '#ffd700');
    mgr.removeTrail('l1');
    expect(mgr.trails.size).toBe(0);
  });

  it('should clear all trails', () => {
    const mgr = new LanternTrailManager();
    mgr.startTrail('l1', 100, 100, '#ffd700');
    mgr.startTrail('l2', 200, 200, '#ff0000');
    mgr.clear();
    expect(mgr.trails.size).toBe(0);
  });
});
