// js/notifications.js — Push notification support

export class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.enabled = false;
  }

  async init() {
    if (!('Notification' in window)) return false;
    this.permission = Notification.permission;
    return this.permission === 'granted';
  }

  async requestPermission() {
    if (!('Notification' in window)) return false;
    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch {
      return false;
    }
  }

  async subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      this.subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          'BEl62iUYcUvqYoh7XPMGGCCv1rIjHhEBhOKqKpM0dG5TJDBbYnMgdWDJDkVBpHJRAiNUFVIxl8vJwzvRGS5ZXI'
        )
      });
      this.enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        this.enabled = false;
      } catch {}
    }
  }

  scheduleLocalNotification(title, body, delayMs) {
    if (this.permission !== 'granted') return;
    setTimeout(() => {
      new Notification(title, {
        body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'lanterni-reminder'
      });
    }, delayMs);
  }

  scheduleNightReminder() {
    const now = new Date();
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0);
    if (tonight <= now) tonight.setDate(tonight.getDate() + 1);

    const delay = tonight.getTime() - now.getTime();
    this.scheduleLocalNotification(
      'Lanterni 🏮',
      'Le tue lanterne ti aspettano nel cielo notturno!',
      delay
    );
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  serialize() {
    return {
      enabled: this.enabled,
      permission: this.permission
    };
  }

  deserialize(data) {
    if (data) {
      this.enabled = data.enabled || false;
      this.permission = data.permission || 'default';
    }
  }
}
