import { describe, it, expect } from 'vitest';
import { City } from '../js/city.js';

describe('City', () => {
  const mockRenderer = { w: 800, h: 600, ctx: {} };

  it('should convert world <-> grid coordinates', () => {
    const city = new City(mockRenderer);
    const world = city.toWorld(0, 0);
    expect(world.x).toBe(400);
    expect(world.y).toBe(390);

    const grid = city.toGrid(400, 390);
    expect(grid.gx).toBe(0);
    expect(grid.gy).toBe(0);
  });

  it('should place lanterns', () => {
    const city = new City(mockRenderer);
    const type = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a' };
    const lantern = { type, color: type.color, glow: type.glow, inhabitant: null };
    city.placeLantern(lantern, 400, 390);
    expect(city.placed.length).toBe(1);
  });

  it('should serialize and deserialize', () => {
    const city = new City(mockRenderer);
    const type = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a' };
    const lantern = { type, color: type.color, glow: type.glow, inhabitant: null };
    city.placeLantern(lantern, 400, 390);

    const serialized = city.serialize();
    expect(serialized.length).toBe(1);
    expect(serialized[0].typeId).toBe('warm');

    const city2 = new City(mockRenderer);
    city2.deserialize(serialized);
    expect(city2.placed.length).toBe(1);
  });

  it('should clear', () => {
    const city = new City(mockRenderer);
    const type = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a' };
    const lantern = { type, color: type.color, glow: type.glow, inhabitant: null };
    city.placeLantern(lantern, 400, 390);
    city.clear();
    expect(city.placed.length).toBe(0);
    expect(Object.keys(city.grid).length).toBe(0);
  });

  it('should find snap position', () => {
    const city = new City(mockRenderer);
    const pos = city.findSnapPosition(400, 390);
    expect(pos).toBeTruthy();
    expect(pos.x).toBe(400);
    expect(pos.y).toBe(390);
  });

  it('should get placed lanterns', () => {
    const city = new City(mockRenderer);
    const type = { id: 'warm', color: '#ff6b35', glow: '#ff8c5a' };
    const lantern = { type, color: type.color, glow: type.glow, inhabitant: null };
    city.placeLantern(lantern, 400, 390);
    const placed = city.getPlacedLanterns();
    expect(placed.length).toBe(1);
    expect(placed[0].color).toBe('#ff6b35');
  });
});
