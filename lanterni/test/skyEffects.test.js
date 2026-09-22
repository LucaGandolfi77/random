import { describe, it, expect } from 'vitest';
import { SkyEffects } from '../js/skyEffects.js';

describe('SkyEffects', () => {
  it('should initialize', () => {
    const fx = new SkyEffects();
    expect(fx.activeEffect).toBeNull();
    expect(fx.moonPhase.phase).toBeGreaterThanOrEqual(0);
    expect(fx.moonPhase.phase).toBeLessThan(1);
  });

  it('should update without errors', () => {
    const fx = new SkyEffects();
    fx.update(0.016);
  });

  it('should serialize and deserialize', () => {
    const fx = new SkyEffects();
    fx.activeEffect = 'aurora';
    const data = fx.serialize();
    expect(data.activeEffect).toBe('aurora');

    const fx2 = new SkyEffects();
    fx2.deserialize(data);
    expect(fx2.activeEffect).toBe('aurora');
  });
});
