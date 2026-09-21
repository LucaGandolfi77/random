class UI {
  constructor(game) {
    this.game = game;
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }

  showToast(msg, duration = 2000) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,212,255,0.9);color:#000;padding:10px 25px;border-radius:10px;font-weight:bold;z-index:100;transition:opacity 0.5s;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '0', duration);
    setTimeout(() => toast.remove(), duration + 500);
  }

  updateHUD(ship, level, elapsed) {
    document.getElementById('hud-level').textContent = `${level.name} - Lv.${level.id}`;
    document.getElementById('hud-fuel').textContent = `⛽ ${Math.round(ship.fuel)}`;
    document.getElementById('hud-time').textContent = level.timeLimit > 0 ? `⏱ ${this.formatTime(elapsed)}/${this.formatTime(level.timeLimit)}` : `⏱ ${this.formatTime(elapsed)}`;
    document.getElementById('hud-score').textContent = `⭐ ${ship.score || 0}`;
  }

  formatTime(t) {
    const m = Math.floor(t/60);
    const s = Math.floor(t%60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  }
}
