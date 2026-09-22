import { describe, it, expect } from 'vitest';
import { WeatherSystem } from '../js/weather.js';

describe('WeatherSystem', () => {
  it('should initialize with clear weather', () => {
    const ws = new WeatherSystem();
    expect(ws.currentWeather).toBe('clear');
    expect(ws.wind).toBe(0);
  });

  it('should update without errors', () => {
    const ws = new WeatherSystem();
    ws.update(0.016);
    expect(ws.currentWeather).toBe('clear');
  });

  it('should set weather', () => {
    const ws = new WeatherSystem();
    ws.setWeather('rain');
    expect(ws.currentWeather).toBe('rain');
  });

  it('should ignore invalid weather', () => {
    const ws = new WeatherSystem();
    ws.setWeather('invalid');
    expect(ws.currentWeather).toBe('clear');
  });

  it('should return visibility', () => {
    const ws = new WeatherSystem();
    expect(ws.getVisibility()).toBe(1.0);
    ws.setWeather('fog');
    expect(ws.getVisibility()).toBe(0.6);
  });

  it('should report active status', () => {
    const ws = new WeatherSystem();
    expect(ws.isActive()).toBe(false);
    ws.setWeather('rain');
    expect(ws.isActive()).toBe(true);
  });

  it('should serialize and deserialize', () => {
    const ws = new WeatherSystem();
    ws.setWeather('snow');
    const data = ws.serialize();
    expect(data.currentWeather).toBe('snow');

    const ws2 = new WeatherSystem();
    ws2.deserialize(data);
    expect(ws2.currentWeather).toBe('snow');
  });
});
