import { describe, it, expect } from 'vitest';
import { COLORS, LANTERN_TYPES, INHABITANT_TYPES, FURNITURE_TYPES, PROGRESSION, GRID, SKY, PHYSICS } from '../js/data.js';

describe('Game Data', () => {
  describe('COLORS', () => {
    it('should have valid hex colors', () => {
      for (const [key, val] of Object.entries(COLORS)) {
        expect(val).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('LANTERN_TYPES', () => {
    it('should have 8 types', () => {
      expect(LANTERN_TYPES).toHaveLength(8);
    });

    it('each type should have valid color and glow', () => {
      for (const type of LANTERN_TYPES) {
        expect(type.id).toBeTruthy();
        expect(type.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(type.glow).toMatch(/^#[0-9a-f]{6}$/i);
        expect(type.weight).toBeGreaterThan(0);
      }
    });
  });

  describe('INHABITANT_TYPES', () => {
    it('should have 6 types', () => {
      expect(INHABITANT_TYPES).toHaveLength(6);
    });

    it('each type should have id, name, emoji', () => {
      for (const type of INHABITANT_TYPES) {
        expect(type.id).toBeTruthy();
        expect(type.name).toBeTruthy();
        expect(type.emoji).toBeTruthy();
      }
    });
  });

  describe('FURNITURE_TYPES', () => {
    it('should have 8 types', () => {
      expect(FURNITURE_TYPES).toHaveLength(8);
    });
  });

  describe('PROGRESSION', () => {
    it('should have 20 levels', () => {
      expect(PROGRESSION).toHaveLength(20);
    });

    it('should have increasing lantern requirements', () => {
      for (let i = 1; i < PROGRESSION.length; i++) {
        expect(PROGRESSION[i].lanternsNeeded).toBeGreaterThan(PROGRESSION[i - 1].lanternsNeeded);
      }
    });

    it('first level should start at 0', () => {
      expect(PROGRESSION[0].lanternsNeeded).toBe(0);
    });
  });

  describe('GRID', () => {
    it('should have cellSize > 0', () => {
      expect(GRID.cellSize).toBeGreaterThan(0);
    });

    it('should have 4 offsets', () => {
      expect(GRID.offsets).toHaveLength(4);
    });
  });

  describe('SKY', () => {
    it('should have positive values', () => {
      expect(SKY.starCount).toBeGreaterThan(0);
      expect(SKY.dawnDuration).toBeGreaterThan(0);
      expect(SKY.nightDuration).toBeGreaterThan(0);
      expect(SKY.spawnInterval).toBeGreaterThan(0);
    });
  });

  describe('PHYSICS', () => {
    it('should have positive values', () => {
      expect(PHYSICS.lanternFloatSpeed).toBeGreaterThan(0);
      expect(PHYSICS.catSpeed).toBeGreaterThan(0);
      expect(PHYSICS.mothSpeed).toBeGreaterThan(0);
    });
  });
});
