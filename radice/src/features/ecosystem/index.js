import store from '../../core/store.js';
import { showToast } from '../../utils/helpers.js';
import AchievementSystem from './gamification.js';
import Leaderboard from './leaderboard.js';
import ShareTarget from './share.js';
import VoiceController from './voice.js';
import SensorManager from './sensors.js';

const achievementSystem = new AchievementSystem();
const leaderboard = new Leaderboard();
const shareTarget = new ShareTarget();
const voiceController = new VoiceController();
const sensorManager = new SensorManager();

function renderEcosystem() {
  const view = document.getElementById('view');
  if (!view) return;

  const state = store.get();
  const progress = achievementSystem.getProgress();

  const badges = [
    { id: 'first_read', icon: '📖', name: 'Prima Lettura' },
    { id: 'reader_5', icon: '📚', name: 'Lettore Frequente' },
    { id: 'chapter_first', icon: '⭐', name: 'Capitolo Raro' },
    { id: 'streak_3', icon: '🔥', name: 'Diligente' },
    { id: 'owl_meet', icon: '🦉', name: 'Incontro col Gufo' },
    { id: 'legendary_found', icon: '🏆', name: 'Leggendario!' }
  ];

  let html = '<section id="view-ecosystem" class="screen active ecosystem-view">';
  html += '<h2 class="section-title">🌿 L\'Albero della Biblioteca</h2>';
  html += '<div class="ecosystem-stats">';
  html += '<div class="stat-box"><span class="stat-value">' + state.totalReads + '</span><span class="stat-label">Storie Lette</span></div>';
  html += '<div class="stat-box"><span class="stat-value">' + state.chaptersCollected.length + '</span><span class="stat-label">Capitoli Rari</span></div>';
  html += '<div class="stat-box"><span class="stat-value">' + state.seeds + '</span><span class="stat-label">Semi Raccolti</span></div>';
  html += '<div class="stat-box"><span class="stat-value">' + progress.percentage + '%</span><span class="stat-label">Traguardi</span></div>';
  html += '</div>';

  html += '<div class="achievements-grid">';
  html += '<h3 class="panel-title">🏆 Traguardi Sbloccati</h3>';
  badges.forEach(b => {
    const unlocked = achievementSystem.achievements[b.id];
    html += '<div class="achievement ' + (unlocked ? 'unlocked' : 'locked') + '" data-id="' + b.id + '">';
    html += '<span class="achievement-icon">' + (unlocked ? b.icon : '🔒') + '</span>';
    html += '<span class="achievement-name">' + b.name + '</span>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="eco-actions">';
  html += '<button class="btn btn-primary" id="btn-voice" aria-label="Comandi vocali">🎤 Comandi Vocali</button>';
  html += '<button class="btn btn-secondary" id="btn-share" aria-label="Condividi">📤 Condividi</button>';
  html += '<button class="btn btn-ghost" id="btn-sensors" aria-label="Sensori">📡 Sensori</button>';
  html += '</div>';

  html += '<div class="eco-leaderboard">';
  html += '<h3 class="panel-title">📊 Classifica</h3>';
  const top = leaderboard.getTop(5);
  if (top.length === 0) {
    html += '<p class="panel-text">Nessun punteggio ancora. Inizia a leggere!</p>';
  } else {
    top.forEach((entry, i) => {
      html += '<div class="leaderboard-entry"><span class="rank">' + (i + 1) + '</span><span class="score">' + entry.score + '</span></div>';
    });
  }
  html += '</div>';

  html += '</section>';

  view.innerHTML = html;

  const voiceBtn = document.getElementById('btn-voice');
  if (voiceBtn) voiceBtn.addEventListener('click', () => voiceController.startListening((transcript) => {
    const cmd = voiceController.processCommand(transcript);
    console.log('[Radice] Voice:', cmd);
    showToast('Comando: ' + transcript);
  }));
  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) shareBtn.addEventListener('click', () => shareTarget.shareContent('Radice', 'Sto leggendo nell\'albero!', window.location.href));
  const sensorsBtn = document.getElementById('btn-sensors');
  if (sensorsBtn) sensorsBtn.addEventListener('click', async () => {
    const growth = await sensorManager.getAmbientData();
    showToast('📡 Sensori: Luce=' + (growth.lightLevel || 'N/A') + ' Accel=' + growth.acceleration.x.toFixed(1));
  });
}

function handleVoiceCommand() {
  if (voiceController.isListening) {
    voiceController.stopListening();
    showToast('🎤 Ascolto sospeso');
  } else {
    voiceController.startListening((transcript) => {
      const cmd = voiceController.processCommand(transcript);
      console.log('[Radice] Voice command:', cmd);
      showToast('Comando: "' + transcript + '" → ' + cmd.action);
    });
  }
}

function handleShare() {
  shareTarget.shareContent('Radice', 'Sto leggendo nell\'albero antico!', window.location.href);
}

async function handleSensors() {
  const ambient = await sensorManager.getAmbientData();
  const growth = sensorManager.getTreeGrowthEffect();
  showToast('📡 Tilt: ' + growth.tilt.y.toFixed(0) + '° | Crescita: ' + (growth.growthRate * 100).toFixed(0) + '%');
}

function submitScore(score) {
  const state = store.get();
  return leaderboard.submitScore('player', score, {
    totalReads: state.totalReads,
    chaptersCollected: state.chaptersCollected.length
  });
}

function getProgress() {
  return achievementSystem.getProgress();
}

export {
  renderEcosystem,
  handleVoiceCommand,
  handleShare,
  handleSensors,
  submitScore,
  getProgress,
  achievementSystem,
  leaderboard,
  shareTarget,
  voiceController,
  sensorManager
};
export default { renderEcosystem, handleVoiceCommand, handleShare, handleSensors };
