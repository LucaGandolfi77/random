import { describe, it, expect } from 'vitest';
import { Lantern, LanternManager } from '../js/lantern.js';

describe('Lantern', () => {
  const mockType = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a', weight: 1 };

  it('should create with correct properties', () => {
    const l = new Lantern(100, 200, mockType, null);
    expect(l.x).toBe(100);
    expect(l.y).toBe(200);
    expect(l.color).toBe('#ff6b35');
    expect(l.glow).toBe('#ff8c5a');
    expect(l.alive).toBe(true);
    expect(l.captured).toBe(false);
  });

  it('should generate unique id', () => {
    const l1 = new Lantern(0, 0, mockType);
    const l2 = new Lantern(0, 0, mockType);
    expect(l1.id).not.toBe(l2.id);
  });

  it('should detect point containment', () => {
    const l = new Lantern(100, 100, mockType);
    expect(l.containsPoint(100, 100, 10)).toBe(true);
    expect(l.containsPoint(200, 200, 10)).toBe(false);
  });

  it('should update position with sway', () => {
    const l = new Lantern(100, 100, mockType);
    const baseY = l.baseY;
    l.update(1);
    expect(l.y).not.toBe(baseY);
  });

  it('should die when below screen', () => {
    const l = new Lantern(100, 99999, mockType);
    l.update(0.1);
    expect(l.alive).toBe(false);
  });

  it('should not update when captured', () => {
    const l = new Lantern(100, 100, mockType);
    l.captured = true;
    const y = l.y;
    l.update(1);
    expect(l.y).toBe(y);
  });
});

describe('LanternManager', () => {
  const mockRenderer = { drawLantern() {} };
  const mockType = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a', weight: 1 };

  it('should spawn lanterns', () => {
    const mgr = new LanternManager(mockRenderer);
    mgr.spawn(100, 100, mockType);
    expect(mgr.floating.length).toBe(1);
  });

  it('should remove lanterns', () => {
    const mgr = new LanternManager(mockRenderer);
    mgr.spawn(100, 100, mockType);
    const l = mgr.floating[0];
    mgr.remove(l);
    mgr.update(0);
    expect(mgr.floating.length).toBe(0);
  });

  it('should detect catch', () => {
    const mgr = new LanternManager(mockRenderer);
    mgr.spawn(100, 100, mockType);
    const hit = mgr.checkCatch(100, 100, 50);
    expect(hit).toBeTruthy();
  });

  it('should return null for miss', () => {
    const mgr = new LanternManager(mockRenderer);
    mgr.spawn(100, 100, mockType);
    const hit = mgr.checkCatch(500, 500, 10);
    expect(hit).toBeNull();
  });

  it('should reset', () => {
    const mgr = new LanternManager(mockRenderer);
    mgr.spawn(100, 100, mockType);
    mgr.reset();
    expect(mgr.floating.length).toBe(0);
  });
});
