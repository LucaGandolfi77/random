import store from '../../core/store.js';
import { showToast } from '../../utils/helpers.js';

const SENSORS_KEY = 'radice-sensors-v1';

class SensorManager {
  constructor() {
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.gyroscope = { alpha: 0, beta: 0, gamma: 0 };
    this.proximity = null;
    this.lightLevel = null;
    this.supportsAccelerometer = false;
    this.supportsGyroscope = false;
    this.supportsProximity = false;
    this.listeners = new Set();
    this._interval = null;
  }

  async init() {
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window;
    const hasDeviceMotion = 'DeviceMotionEvent' in window;
    const hasProximity = 'IntersectionObserver' in window;

    this.supportsAccelerometer = hasDeviceMotion;
    this.supportsGyroscope = hasDeviceOrientation;
    this.supportsProximity = hasProximity;

    if (hasDeviceMotion) {
      this._initAccelerometer();
    }

    if (hasDeviceOrientation) {
      this._initGyroscope();
    }

    if (hasProximity) {
      this._initProximity();
    }

    // Start ambient sensor reading
    this._startReading();

    console.log('[Radice] Sensors initialized:', {
      accelerometer: this.supportsAccelerometer,
      gyroscope: this.supportsGyroscope,
      proximity: this.supportsProximity
    });

    return {
      accelerometer: this.supportsAccelerometer,
      gyroscope: this.supportsGyroscope,
      proximity: this.supportsProximity
    };
  }

  _initAccelerometer() {
    try {
      window.addEventListener('devicemotion', (e) => {
        if (e.accelerationIncludingGravity) {
          this.acceleration = {
            x: e.accelerationIncludingGravity.x || 0,
            y: e.accelerationIncludingGravity.y || 0,
            z: e.accelerationIncludingGravity.z || 0
          };
          this._notify('acceleration', this.acceleration);
        }
      });
    } catch (e) {
      console.warn('[Radice] Accelerometer init failed:', e);
    }
  }

  _initGyroscope() {
    try {
      window.addEventListener('deviceorientation', (e) => {
        this.gyroscope = {
          alpha: e.alpha || 0,
          beta: e.beta || 0,
          gamma: e.gamma || 0
        };
        this._notify('gyroscope', this.gyroscope);
      });
    } catch (e) {
      console.warn('[Radice] Gyroscope init failed:', e);
    }
  }

  _initProximity() {
    try {
      // Proximity sensor is often limited
      // Use light sensor or other ambient data
    } catch (e) {
      console.warn('[Radice] Proximity sensor not available');
    }
  }

  _startReading() {
    this._interval = setInterval(() => {
      const sensorData = {
        acceleration: { ...this.acceleration },
        gyroscope: { ...this.gyroscope },
        lightLevel: this.lightLevel,
        proximity: this.proximity,
        timestamp: Date.now()
      };

      // Grow tree based on movement
      const growth = this.calculateGrowth(sensorData);
      if (growth > 0) {
        this._notify('treeGrowth', growth);
      }
    }, 1000);
  }

  calculateGrowth(sensorData) {
    // Movement intensity affects tree growth
    const accelMagnitude = Math.sqrt(
      sensorData.acceleration.x ** 2 +
      sensorData.acceleration.y ** 2 +
      sensorData.acceleration.z ** 2
    );

    // Higher movement = more growth (within limits)
    const growth = Math.min(accelMagnitude / 20, 1);
    return growth;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(type, data) {
    this.listeners.forEach(cb => {
      try { cb(type, data); } catch (e) { /* ignore */ }
    });
  }

  getTreeGrowthEffect() {
    const state = store.get();
    const sensorData = { acceleration: this.acceleration, gyroscope: this.gyroscope };
    const growth = this.calculateGrowth(sensorData);
    return {
      growthRate: growth,
      currentRooms: state.roomsUnlocked?.length || 0,
      // Tree visual effects based on device orientation
      tilt: {
        x: this.gyroscope?.beta || 0,
        y: this.gyroscope?.gamma || 0
      },
      shake: {
        x: this.acceleration?.x || 0,
        y: this.acceleration?.y || 0,
        z: this.acceleration?.z || 0
      }
    };
  }

  async getAmbientData() {
    // Try to get light level if available
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new AmbientLightSensor();
        await sensor.start();
        this.lightLevel = sensor.illuminance;
        sensor.onchange = () => { this.lightLevel = sensor.illuminance; };
      } catch (e) {
        console.warn('[Radice] Light sensor not available');
      }
    }

    return {
      lightLevel: this.lightLevel,
      acceleration: this.acceleration,
      gyroscope: this.gyroscope,
      timestamp: Date.now()
    };
  }

  destroy() {
    if (this._interval) clearInterval(this._interval);
    this.listeners.clear();
  }
}

const sensorManager = new SensorManager();
export default sensorManager;
export { SensorManager };
