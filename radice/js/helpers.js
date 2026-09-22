function showToast(msg, duration) {
  duration = duration || 2500;
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  toast.style.animation = 'none';
  void toast.offsetHeight;
  toast.style.animation = 'toastIn 300ms ease, toastOut 300ms ease ' + duration + 'ms forwards';
  setTimeout(() => { toast.hidden = true; }, duration + 100);
}

function showModal(html, onClose) {
  const modal = document.getElementById('modal');
  modal.innerHTML = '<div class="modal-content">' + html + '</div>';
  modal.hidden = false;
  if (onClose) {
    modal.onclick = (e) => { if (e.target === modal) { modal.hidden = true; modal.onclick = null; onClose(); } };
  } else {
    modal.onclick = (e) => { if (e.target === modal) modal.hidden = true; };
  }
  return modal;
}

function hideModal() {
  document.getElementById('modal').hidden = true;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return mins + 'm ' + secs + 's';
  return secs + 's';
}

function getTimeLabel() {
  const h = new Date().getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function animateGachaCircle(el, callback) {
  el.classList.add('spinning');
  setTimeout(() => {
    el.classList.remove('spinning');
    if (callback) callback();
  }, 800);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
