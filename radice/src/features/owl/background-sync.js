class BackgroundSyncManager {
  constructor() {
    this.registration = null;
    this.pendingSyncs = [];
  }

  async init() {
    if (!('serviceWorker' in navigator)) return false;
    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (e) {
      console.warn('Background Sync init failed:', e);
      return false;
    }
  }

  async registerSync(tag, data) {
    if (!this.registration || !('sync' in this.registration)) {
      this.pendingSyncs.push({ tag, data });
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      this.pendingSyncs = this.pendingSyncs.filter(s => s.tag !== tag);
      return true;
    } catch (e) {
      console.warn('Sync registration failed:', e);
      this.pendingSyncs.push({ tag, data });
      return false;
    }
  }

  async saveGameState(state) {
    const tag = 'radice-save';
    const syncData = { type: 'save', state, timestamp: Date.now() };

    try {
      await this.registerSync(tag, syncData);
      return true;
    } catch (e) {
      console.warn('Background save failed:', e);
      return false;
    }
  }

  async syncAnalytics() {
    const tag = 'radice-analytics';
    const analyticsData = { type: 'analytics', data: await this.getAnalyticsData() };
    return this.registerSync(tag, analyticsData);
  }

  async getAnalyticsData() {
    try {
      const raw = localStorage.getItem('radice-analytics-v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  getPendingSyncs() {
    return this.pendingSyncs;
  }

  async periodicSync() {
    if (!this.registration || !('periodicSync' in this.registration)) return false;
    try {
      await this.registration.periodicSync.register('radice-new-chapters', {
        minInterval: 12 * 60 * 60 * 1000
      });
      return true;
    } catch (e) {
      console.warn('Periodic sync failed:', e);
      return false;
    }
  }
}

const syncManager = new BackgroundSyncManager();
export default syncManager;
export { BackgroundSyncManager };
