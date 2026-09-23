export function ambientInit(stateRef) {
  syncColorScheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncColorScheme);
  matchMedia('(prefers-contrast: more)').addEventListener('change', syncContrast);
  batterySaver();
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    navigator.getBattery().then(battery).catch(() => {});
  }
  if (typeof Sensor !== 'undefined' && 'AmbientLightSensor' in window) {
    try {
      const sensor = new AmbientLightSensor();
      sensor.addEventListener('reading', () => {
        document.body.style.setProperty('--brightness', sensor.illuminance < 50 ? '0.85' : '1');
      });
      sensor.start();
    } catch { /* not supported */ }
  }
}

function syncColorScheme() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark', dark);
}
function syncContrast() {
  const more = matchMedia('(prefers-contrast: more)').matches;
  document.body.classList.toggle('high-contrast', more);
}
function batterySaver() {
  if (!('getBattery' in navigator)) return;
  navigator.getBattery().then((b) => {
    if (b.level < 0.15) {
      document.body.classList.add('power-saver');
      stopMusic();
    }
  }).catch(() => {});
}
function battery(e) {
  if (e.level < 0.15) document.body.classList.add('power-saver');
}

export async function requestNotification(stateRef) {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function scheduleGentleNotify(text, stateRef) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if ('notify' in Notification.prototype) {
    try { new Notification(text, { tag: 'caffe-sospeso', renotify: true, silent: false }); } catch { /* ignore */ }
  }
  const ms = Math.min(36000000, 24 * 3600000);
  setTimeout(() => {
    try { new Notification(text, { tag: 'caffe-sospeso' }); } catch { /* ignore */ }
  }, ms).unref?.();
}

export function updateBadge(count) {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) navigator.setAppBadge(count).catch(() => {});
  else navigator.clearAppBadge().catch(() => {});
}
