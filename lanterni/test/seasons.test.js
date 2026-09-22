import { describe, it, expect } from 'vitest';
import { SeasonManager } from '../js/seasons.js';

describe('SeasonManager', () => {
  it('should initialize with no season', () => {
    const mgr = new SeasonManager();
    expect(mgr.currentSeason).toBeNull();
    expect(mgr.specialLanterns).toHaveLength(0);
    expect(mgr.activeEffects).toHaveLength(0);
  });

  it('should check season', () => {
    const mgr = new SeasonManager();
    const changed = mgr.checkSeason();
    expect(typeof changed).toBe('boolean');
  });

  it('should return null when no season active', () => {
    const mgr = new SeasonManager();
    const data = mgr.getSeasonData();
    expect(data).toBeNull();
  });

  it('should return null for special lantern when inactive', () => {
    const mgr = new SeasonManager();
    const lantern = mgr.getSpecialLanternType();
    expect(lantern).toBeNull();
  });

  it('should report active status', () => {
    const mgr = new SeasonManager();
    expect(mgr.isActive()).toBe(false);
  });

  it('should serialize and deserialize', () => {
    const mgr = new SeasonManager();
    const data = mgr.serialize();
    expect(data).toHaveProperty('currentSeason');

    const mgr2 = new SeasonManager();
    mgr2.deserialize(data);
    expect(mgr2.currentSeason).toBe(data.currentSeason);
  });
});
