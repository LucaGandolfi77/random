function setupPwa() {
  let deferredPrompt = null;

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('SW registered:', reg.scope);
      if (reg.pushManager) {
        reg.pushManager.getSubscription().then(sub => {
          if (!sub) {
            console.log('Push available, subscribe when user opts in');
          }
        }).catch(e => console.warn('Push check failed:', e));
      }
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const canvas = document.getElementById('tree-canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        renderTreeCanvas();
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install available');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showToast('App installata! 🌳');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  });

  if ('share' in navigator) {
    console.log('Web Share API available');
  }

  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      console.log('Push notifications available (need permission)');
    }
  }
}

async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs73eZq2ij6R5IEM3sO2-a8zZ4v35o2dZ0vq7E')
    });
    console.log('Push subscribed:', sub);
  } catch (e) {
    console.warn('Push subscription failed:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function shareBook(bookTitle) {
  if (!('share' in navigator)) {
    showToast('Condivisione non supportata');
    return;
  }
  try {
    await navigator.share({
      title: '📖 Radice — ' + bookTitle,
      text: 'Ho appena scoperto questo libro nell\'albero! Leggi la tua storia su Radice.',
      url: window.location.href
    });
    showToast('Condiviso! 📤');
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.warn('Share failed:', e);
    }
  }
}
