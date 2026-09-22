import analytics from './analytics.js';

class PushManager {
  constructor() {
    this.supported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = 'default';
  }

  async init() {
    if (!this.supported) return false;
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  async sendNotification(title, options = {}) {
    if (this.permission !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const registration = await reg.pushManager.getSubscription();

      if (!registration) {
        console.warn('No push subscription found');
        return false;
      }

      const payload = JSON.stringify({
        title,
        body: options.body || 'Il gufo ha una sorpresa per te!',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: options.tag || 'radice-notification',
        data: options.data || {}
      });

      await registration.showNotification(title, {
        body: options.body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: options.tag || 'radice-notification',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        renotify: options.renotify || false
      });

      return true;
    } catch (e) {
      console.warn('Push notification failed:', e);
      return false;
    }
  }

  async intelligentNotification() {
    if (this.permission !== 'granted') return false;

    const state = analytics.getReadingPattern();
    const summary = analytics.getSummary();
    let title = '🦉 Il Gufo';
    let body = '';

    if (state.streak >= 3) {
      title = '🔥 Radice - Streak!';
      body = `${state.streak} giorni di lettura consecutivi! Continua!`;
    } else if (state.totalReads > 0 && state.totalReads % 5 === 0) {
      title = '📖 Radice - Milestone!';
      body = `Hai letto ${state.totalReads} storie! Il tuo albero cresce!`;
    } else if (Date.now() - (state.lastReadAt || 0) > 86400000) {
      title = '📖 Radice - Ritorno!';
      body = "Sembra che non leggi da un po'. Il gufo ti sente!";
    } else {
      title = '🦉 Radice - Il Gufo';
      body = summary.favoriteRoom ? `Il tuo ${summary.favoriteRoom[0]} preferito ti aspetta!` : 'Nuove pagine ti aspettano!';
    }

    return this.sendNotification(title, {
      body,
      tag: 'radice-intelligent',
      requireInteraction: true
    });
  }

  async scheduleDailyReminder() {
    if (this.permission !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.periodicSync.register('radice-daily-reminder', {
        minInterval: 24 * 60 * 60 * 1000
      });
      return true;
    } catch (e) {
      console.warn('Daily reminder scheduling failed:', e);
      return false;
    }
  }

  getPermission() {
    return this.permission;
  }
}

const pushManager = new PushManager();
export default pushManager;
export { PushManager };
