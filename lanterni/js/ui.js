// js/ui.js — HUD, menu, overlays with accessibility

export class UI {
  constructor() {
    this.callbacks = {};
    this.els = {
      hud: document.getElementById('hud'),
      levelDisplay: document.getElementById('level-display'),
      lanternCount: document.getElementById('lantern-count'),
      btnMenu: document.getElementById('btn-menu'),
      powerIndicator: document.getElementById('power-indicator'),
      powerBar: document.getElementById('power-bar'),
      menuScreen: document.getElementById('menu-screen'),
      btnPlay: document.getElementById('btn-play'),
      btnContinue: document.getElementById('btn-continue'),
      dawnScreen: document.getElementById('dawn-screen'),
      dawnStats: document.getElementById('dawn-stats'),
      starsPreview: document.getElementById('stars-preview'),
      btnNewDay: document.getElementById('btn-new-day'),
      installBtn: document.getElementById('install-btn'),
      canvas: document.getElementById('game')
    };

    this.setupListeners();
  }

  setupListeners() {
    this.els.btnMenu.addEventListener('click', () => this.emit('menu'));
    this.els.btnPlay.addEventListener('click', () => this.emit('play'));
    this.els.btnContinue.addEventListener('click', () => this.emit('continue'));
    this.els.btnNewDay.addEventListener('click', () => this.emit('newDay'));

    // Install prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      this.els.installBtn.classList.remove('hidden');
    });
    this.els.installBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
        this.els.installBtn.classList.add('hidden');
      }
    });

    // Keyboard: Escape to close menus
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const menuVisible = !this.els.menuScreen.classList.contains('hidden');
        const dawnVisible = !this.els.dawnScreen.classList.contains('hidden');
        if (menuVisible || dawnVisible) {
          this.emit('menu');
        }
      }
    });

    // Focus trap for modals
    this.els.menuScreen.addEventListener('keydown', e => this._trapFocus(e, this.els.menuScreen));
    this.els.dawnScreen.addEventListener('keydown', e => this._trapFocus(e, this.els.dawnScreen));
  }

  _trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll('button:not(.hidden)');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  on(event, cb) {
    this.callbacks[event] = cb;
  }

  emit(event) {
    if (this.callbacks[event]) this.callbacks[event]();
  }

  updateHUD(level, lanterns) {
    this.els.levelDisplay.textContent = `Lv. ${level}`;
    this.els.lanternCount.textContent = `🏮 ${lanterns}`;
  }

  showPowerIndicator() {
    this.els.powerIndicator.classList.remove('hidden');
  }

  hidePowerIndicator() {
    this.els.powerIndicator.classList.add('hidden');
    this.els.powerBar.style.width = '0%';
  }

  updatePowerBar(power) {
    this.els.powerBar.style.width = (power * 100) + '%';
    this.els.powerIndicator.setAttribute('aria-valuenow', Math.round(power * 100));
  }

  showMenu(hasSave) {
    this.els.menuScreen.classList.remove('hidden');
    this.els.dawnScreen.classList.add('hidden');
    if (hasSave) {
      this.els.btnContinue.classList.remove('hidden');
    }
    this.els.btnPlay.focus();
  }

  hideAllScreens() {
    this.els.menuScreen.classList.add('hidden');
    this.els.dawnScreen.classList.add('hidden');
    if (this.els.canvas) this.els.canvas.focus();
  }

  showDawn(sessionLanterns, totalLanterns, starCount) {
    this.els.dawnScreen.classList.remove('hidden');

    // Build stats safely with DOM
    this.els.dawnStats.textContent = '';
    const lines = [
      `Lanterne catturate oggi: ${sessionLanterns}`,
      `Totale: ${totalLanterns}`,
      `Stelle nel cielo: ${starCount}`
    ];
    lines.forEach((text, i) => {
      const strong = document.createElement('strong');
      strong.textContent = text.split(': ')[1];
      const span = document.createElement('span');
      span.textContent = text.split(': ')[0] + ': ';
      span.appendChild(strong);
      this.els.dawnStats.appendChild(span);
      if (i < lines.length - 1) {
        this.els.dawnStats.appendChild(document.createElement('br'));
      }
    });

    // Generate star preview
    let stars = '';
    for (let i = 0; i < Math.min(starCount, 30); i++) {
      stars += '✦ ';
    }
    if (starCount > 30) stars += `+${starCount - 30}`;
    this.els.starsPreview.textContent = stars;

    // Add share button if supported
    const existingShare = this.els.dawnScreen.querySelector('.btn-share');
    if (existingShare) existingShare.remove();

    if (navigator.share || navigator.clipboard) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn btn-share';
      shareBtn.textContent = 'Condividi';
      shareBtn.setAttribute('aria-label', 'Condividi screenshot della città');
      shareBtn.addEventListener('click', () => this.emit('share'));
      this.els.dawnScreen.querySelector('.btn-group').insertBefore(shareBtn, this.els.btnNewDay);
    }

    this.els.btnNewDay.focus();
  }

  showPause() {
    this.els.menuScreen.classList.remove('hidden');
    this.els.btnPlay.textContent = 'Riprendi';
    this.els.btnPlay.focus();
  }

  hidePause() {
    this.els.menuScreen.classList.add('hidden');
    this.els.btnPlay.textContent = 'Gioca';
    if (this.els.canvas) this.els.canvas.focus();
  }

  isPaused() {
    return !this.els.menuScreen.classList.contains('hidden');
  }
}
