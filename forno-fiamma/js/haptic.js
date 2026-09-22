export function haptic(pattern = 'light') {
  if (!navigator.vibrate) return;
  const patterns = {
    light: [30],
    medium: [50],
    heavy: [100],
    success: [30, 50, 100],
    error: [100, 30, 100, 30, 100],
  };
  try { navigator.vibrate(patterns[pattern] || patterns.light); } catch {}
}

export function hapticBake() { haptic('medium'); }
export function hapticCollect() { haptic('success'); }
export function hapticError() { haptic('error'); }
export function hapticGacha() { haptic('heavy'); }
