import store from '../../core/store.js';

const ROOMS = window.ROOMS;
const ROOM_TYPES = window.ROOM_TYPES;

function renderTree() {
  const state = store.get();
  const view = document.getElementById('view');
  if (!view) return;

  const unlocked = state.roomsUnlocked || [];
  const totalRooms = ROOM_TYPES.length;
  const stats = state.stats || {};

  let html = '<section id="view-tree" class="screen active tree-view">';
  html += '<h2 class="section-title">Il tuo Albero</h2>';
  html += '<div class="panel"><p class="panel-text">Ogni stanza sbloccata è una storia che hai letto.</p></div>';

  ROOM_TYPES.forEach(type => {
    const room = ROOMS[type];
    const isUnlocked = unlocked.includes(type);
    html += '<div class="room-card ' + (isUnlocked ? '' : 'locked') + '">';
    html += '<span class="room-icon">' + room.icon + '</span><div>';
    html += '<div class="room-name">' + room.name + '</div>';
    if (isUnlocked) {
      html += '<div class="room-count">' + (stats.booksPerRoom && stats.booksPerRoom[type] ? stats.booksPerRoom[type] : 0) + ' storie · Illuminata</div>';
    } else {
      html += '<div class="room-count" style="color:var(--ink-light)">Sblocca leggendo</div>';
    }
    html += '</div></div>';
  });

  html += '<div class="tree-stats">';
  html += '<div class="tree-stat-card"><div class="tree-stat-value">' + state.totalReads + '</div><div class="tree-stat-label">Storie lette</div></div>';
  html += '<div class="tree-stat-card"><div class="tree-stat-value">' + state.chaptersCollected.length + '</div><div class="tree-stat-label">Capitoli</div></div>';
  html += '<div class="tree-stat-card"><div class="tree-stat-value">' + state.seeds + '</div><div class="tree-stat-label">Semi</div></div>';
  html += '</div>';
  html += '</section>';

  view.innerHTML = html;
}

function renderTreeCanvas() {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = window.innerWidth;
  const h = canvas.height = window.innerHeight;
  const state = store.get();
  const unlocked = state.roomsUnlocked || [];

  ctx.clearRect(0, 0, w, h);

  const groundY = h * 0.85;
  const trunkX = w / 2;

  ctx.fillStyle = 'rgba(45, 80, 22, 0.3)';
  ctx.fillRect(0, groundY, w, h - groundY);

  const trunkGrad = ctx.createLinearGradient(trunkX - 30, 0, trunkX + 30, 0);
  trunkGrad.addColorStop(0, '#5D4037');
  trunkGrad.addColorStop(0.5, '#795548');
  trunkGrad.addColorStop(1, '#4E342E');
  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(trunkX - 25, groundY);
  ctx.quadraticCurveTo(trunkX - 35, groundY - 150, trunkX - 20, groundY - 300);
  ctx.lineTo(trunkX + 20, groundY - 300);
  ctx.quadraticCurveTo(trunkX + 35, groundY - 150, trunkX + 25, groundY);
  ctx.fill();

  const branchColors = ['#4caf50', '#8bc34a', '#26a69a'];
  const roomIcons = ['🛋️', '🏛️', '🌿'];

  unlocked.forEach((type, i) => {
    const room = ROOMS[type];
    const angle = -Math.PI / 2 + (i - (unlocked.length - 1) / 2) * 0.4;
    const branchLen = 80 + i * 20;
    const endX = trunkX + Math.cos(angle) * branchLen;
    const endY = groundY - 200 - Math.sin(angle) * branchLen;

    ctx.strokeStyle = branchColors[i % branchColors.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(trunkX - 10, groundY - 200 - i * 30);
    ctx.quadraticCurveTo(trunkX + Math.cos(angle) * branchLen * 0.5, groundY - 150 - Math.sin(angle) * branchLen * 0.5 - i * 20, endX, endY);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(endX, endY, 0, endX, endY, 30);
    gradient.addColorStop(0, 'rgba(245, 166, 35, 0.3)');
    gradient.addColorStop(1, 'rgba(245, 166, 35, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(endX - 30, endY - 30, 60, 60);
    ctx.fillStyle = room.color || '#f5a623';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(roomIcons[i % 3], endX, endY - 5);
  });

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(trunkX, groundY);
  ctx.lineTo(trunkX - 80, groundY + 20);
  ctx.moveTo(trunkX, groundY);
  ctx.lineTo(trunkX + 80, groundY + 20);
  ctx.stroke();

  if (unlocked.length > 0) {
    const owlX = trunkX + 60;
    const owlY = groundY - 320;
    const time = Date.now() / 1000;
    const bob = Math.sin(time * 0.8) * 3;
    ctx.fillStyle = '#8B7355';
    ctx.beginPath(); ctx.ellipse(owlX, owlY + bob, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(owlX - 8, owlY - 4 + bob, 7, 0, Math.PI * 2); ctx.arc(owlX + 8, owlY - 4 + bob, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f1f27';
    ctx.beginPath(); ctx.arc(owlX - 8, owlY - 4 + bob, 3, 0, Math.PI * 2); ctx.arc(owlX + 8, owlY - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8B7355';
    ctx.beginPath(); ctx.moveTo(owlX - 14, owlY - 8 + bob); ctx.lineTo(owlX - 8, owlY - 20 + bob); ctx.lineTo(owlX, owlY - 8 + bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(owlX + 14, owlY - 8 + bob); ctx.lineTo(owlX + 8, owlY - 20 + bob); ctx.lineTo(owlX, owlY - 8 + bob); ctx.fill();
  }
}

function animateTree() { renderTreeCanvas(); requestAnimationFrame(animateTree); }

function getState() { return store.get(); }

export { renderTree, renderTreeCanvas, animateTree, getState };
