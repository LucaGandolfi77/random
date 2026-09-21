export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createEl(id, className = '', text = '') {
  const el = document.createElement('div');
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function getEl(id) {
  return document.getElementById(id);
}

export function showEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

export function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

export function showToast(text, duration = 2000) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  if (!toast || !toastText) return;
  toastText.textContent = text;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, duration);
}

export function createCardElement(card, onClick, index = 0) {
  const div = document.createElement('div');
  div.className = 'card-element';
  div.style.borderColor = card.color || '#a0a0a0';
  div.innerHTML = `
    <div class="card-emoji">${card.emoji}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-stats">
      <span class="card-elixir">⚡${card.elixir}</span>
      <span class="card-hp">❤️${card.hp}</span>
      <span class="card-dmg">⚔️${card.dmg}</span>
    </div>
    <div class="card-rarity" style="color:${card.color}">${card.rarity}</div>
  `;
  div.addEventListener('click', () => onClick(index));
  return div;
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
