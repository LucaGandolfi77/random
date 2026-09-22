import { describe, it, expect } from 'vitest';
import { LilyPad, LilyPadManager } from '../js/lilyPad.js';

describe('LilyPad', () => {
  it('should create with correct properties', () => {
    const pad = new LilyPad(100, 200);
    expect(pad.x).toBe(100);
    expect(pad.y).toBe(200);
    expect(pad.active).toBe(true);
    expect(pad.hasResident).toBe(false);
  });

  it('should update glow intensity', () => {
    const pad = new LilyPad(100, 200);
    const initialGlow = pad.glowIntensity;
    pad.update(1);
    expect(pad.glowIntensity).not.toBe(initialGlow);
  });

  it('should detect point containment', () => {
    const pad = new LilyPad(100, 100);
    pad.radius = 30;
    expect(pad.containsPoint(100, 100)).toBe(true);
    expect(pad.containsPoint(200, 200)).toBe(false);
  });

  it('should attract particles within range', () => {
    const pad = new LilyPad(100, 100);
    pad.radius = 30;
    const { fx, fy } = pad.attractParticle(80, 80);
    expect(fx).not.toBe(0);
    expect(fy).not.toBe(0);
  });

  it('should not attract particles outside range', () => {
    const pad = new LilyPad(100, 100);
    pad.radius = 30;
    const { fx, fy } = pad.attractParticle(500, 500);
    expect(fx).toBe(0);
    expect(fy).toBe(0);
  });
});

describe('LilyPadManager', () => {
  const mockRenderer = { ctx: {} };

  it('should spawn lily pads', () => {
    const mgr = new LilyPadManager(mockRenderer);
    const pad = mgr.spawn(100, 100);
    expect(mgr.pads.length).toBe(1);
    expect(pad.x).toBe(100);
  });

  it('should not exceed max pads', () => {
    const mgr = new LilyPadManager(mockRenderer);
    mgr.maxPads = 2;
    mgr.spawn(100, 100);
    mgr.spawn(200, 200);
    const third = mgr.spawn(300, 300);
    expect(third).toBeNull();
    expect(mgr.pads.length).toBe(2);
  });

  it('should spawn random pads', () => {
    const mgr = new LilyPadManager(mockRenderer);
    const pad = mgr.spawnRandom(400, 300, 100);
    expect(pad).toBeTruthy();
    expect(mgr.pads.length).toBe(1);
  });

  it('should update all pads', () => {
    const mgr = new LilyPadManager(mockRenderer);
    mgr.spawn(100, 100);
    mgr.spawn(200, 200);
    mgr.update(1);
    expect(mgr.pads.length).toBe(2);
  });

  it('should clear all pads', () => {
    const mgr = new LilyPadManager(mockRenderer);
    mgr.spawn(100, 100);
    mgr.spawn(200, 200);
    mgr.clear();
    expect(mgr.pads.length).toBe(0);
  });

  it('should serialize and deserialize', () => {
    const mgr = new LilyPadManager(mockRenderer);
    mgr.spawn(100, 200);
    mgr.spawn(300, 400);
    const data = mgr.serialize();
    expect(data.length).toBe(2);

    const mgr2 = new LilyPadManager(mockRenderer);
    mgr2.deserialize(data);
    expect(mgr2.pads.length).toBe(2);
    expect(mgr2.pads[0].x).toBe(100);
  });
});
