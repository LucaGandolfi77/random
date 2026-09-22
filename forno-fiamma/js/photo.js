const PHOTO_GALLERY_MAX = 20;
const PHOTO_SIZE = { width: 400, height: 400 };

const FILTERS = {
  none: { name: 'Naturale', emoji: '📷' },
  sepia: { name: 'Sepia', emoji: '🟤' },
  noir: { name: 'Nero & Bianco', emoji: '⚫' },
  watercolor: { name: 'Acquerello', emoji: '🎨' },
  sketch: { name: 'Bozetto', emoji: '✏️' },
  dreamy: { name: 'Sognante', emoji: '🌙' },
  vintage: { name: 'Vintage', emoji: '📷' },
};

const BACKGROUNDS = {
  bakery: { name: 'Fornaio', emoji: '🔥', color: '#f4e4c1' },
  field: { name: 'Campo', emoji: '🌾', color: '#c8e6c9' },
  night: { name: 'Stella', emoji: '⭐', color: '#1a1a3e' },
  garden: { name: 'Giardino', emoji: '🌸', color: '#fce4ec' },
  market: { name: 'Mercato', emoji: '🏪', color: '#fff3e0' },
};

const FRAME_STYLES = {
  none: { name: 'Nessuna', color: 'transparent' },
  wooden: { name: 'Legno', color: '#8B5A2B' },
  golden: { name: 'Oro', color: '#FFD700' },
  silver: { name: 'Argento', color: '#C0C0C0' },
  dreamy: { name: 'Sognante', color: '#E8B4F8' },
};

let _gallery = [];
let _currentFilter = 'none';
let _currentBackground = 'bakery';
let _currentFrame = 'none';
let _photosTaken = 0;

function seededRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function drawBread(ctx, x, y, size, recipeEmoji, recipeName) {
  const breadSize = size * 0.6;

  ctx.save();
  ctx.translate(x, y);

  // Bread body
  const gradient = ctx.createRadialGradient(0, -breadSize * 0.2, breadSize * 0.1, 0, 0, breadSize);
  gradient.addColorStop(0, '#f5d6a0');
  gradient.addColorStop(0.7, '#d4a55a');
  gradient.addColorStop(1, '#b8860b');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, breadSize * 0.2, breadSize, breadSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bread crust pattern
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * breadSize * 0.3, Math.sin(angle) * breadSize * 0.2, breadSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Emoji on bread
  ctx.font = breadSize * 0.8 + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(recipeEmoji || '🍞', 0, breadSize * 0.2);

  // Recipe name
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(recipeName || 'Pane', 0, breadSize * 0.9);

  ctx.restore();
}

function drawBackground(ctx, bg, w, h) {
  const bgColor = BACKGROUNDS[bg]?.color || '#f4e4c1';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (bg === 'night') {
    const stars = 20;
    for (let i = 0; i < stars; i++) {
      const sx = seededRand(i + 1000) * w;
      const sy = seededRand(i + 2000) * h * 0.5;
      const sr = seededRand(i + 3000) * 2 + 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4a4a8a';
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.3, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0e68c';
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.3, 35, 0, Math.PI * 2);
    ctx.fill();
  } else if (bg === 'field') {
    ctx.fillStyle = '#4a8c3f';
    for (let i = 0; i < 10; i++) {
      const lx = seededRand(i + 5000) * w;
      ctx.fillRect(lx, h * 0.7, 3, h * 0.3);
    }
  } else if (bg === 'bakery') {
    ctx.fillStyle = '#d4a55a';
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.8, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(w * 0.3 - 15, h * 0.8 - 10, 30, 15);
    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect(w * 0.7, h * 0.8 - 5, 40, 20);
  } else if (bg === 'garden') {
    ctx.fillStyle = '#2d8b4e';
    for (let i = 0; i < 6; i++) {
      const fx = seededRand(i + 7000) * w;
      ctx.fillRect(fx, h * 0.8, 4, 25);
      ctx.fillStyle = '#ff69b4';
      ctx.beginPath();
      ctx.arc(fx + 2, h * 0.8 - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d8b4e';
    }
  } else if (bg === 'market') {
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, h * 0.5 + 10, w - 40, h * 0.5 - 20);
  }
  ctx.restore();
}

function applyFilter(ctx, filter, w, h) {
  if (filter === 'none') return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;

    switch (filter) {
      case 'sepia':
        data[i] = Math.min(255, avg * 1.2);
        data[i + 1] = Math.min(255, avg * 1.0);
        data[i + 2] = Math.min(255, avg * 0.8);
        break;
      case 'noir':
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
        break;
      case 'watercolor':
        data[i] = Math.min(255, r * 0.9 + 20);
        data[i + 1] = Math.min(255, g * 0.8 + 30);
        data[i + 2] = Math.min(255, b * 1.1);
        break;
      case 'sketch':
        data[i] = Math.min(255, avg * 1.3);
        data[i + 1] = Math.min(255, avg * 0.9);
        data[i + 2] = Math.min(255, avg * 0.7);
        break;
      case 'dreamy':
        data[i] = Math.min(255, r * 1.2);
        data[i + 1] = Math.min(255, g * 0.9);
        data[i + 2] = Math.min(255, b * 1.1);
        break;
      case 'vintage':
        data[i] = Math.min(255, r * 0.9 + 20);
        data[i + 1] = Math.min(255, g * 0.85);
        data[i + 2] = Math.min(255, b * 0.7);
        break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawFrame(ctx, frame, w, h) {
  if (frame === 'none') return;
  const frameColor = FRAME_STYLES[frame]?.color || 'transparent';
  if (frameColor === 'transparent') return;

  const frameWidth = 10;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = frameWidth;
  ctx.strokeRect(frameWidth / 2, frameWidth / 2, w - frameWidth, h - frameWidth);

  if (frame === 'golden') {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(frameWidth / 2 + 5, frameWidth / 2 + 5, w - frameWidth - 10, h - frameWidth - 10);
  }
}

function generatePhoto(recipeEmoji, recipeName, filter, bg, frame) {
  const { width: w, height: h } = PHOTO_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, bg, w, h);

  const x = w / 2;
  const y = h / 2 + 20;
  const size = Math.min(w, h) * 0.5;
  drawBread(ctx, x, y, size, recipeEmoji, recipeName);

  applyFilter(ctx, filter, w, h);

  drawFrame(ctx, frame, w, h);

  const timestamp = new Date().toLocaleString('it-IT');
  const watermark = 'Forno & Fiamma';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'right';
  ctx.fillText(watermark + ' — ' + timestamp, w - 15, h - 15);

  const seed = Math.floor(Math.random() * 999999);
  const photoId = 'photo_' + Date.now() + '_' + seed;
  const dataUrl = canvas.toDataURL('image/png');

  return {
    id: photoId,
    dataUrl,
    recipeEmoji: recipeEmoji || '🍞',
    recipeName: recipeName || 'Pane',
    filter,
    background: bg,
    frame,
    timestamp,
    width: w,
    height: h,
  };
}

export function capturePhoto(recipeEmoji, recipeName, filter, bg, frame) {
  const photo = generatePhoto(recipeEmoji, recipeName, filter, bg, frame);
  _gallery.unshift(photo);
  _photosTaken++;

  if (_gallery.length > PHOTO_GALLERY_MAX) {
    _gallery.pop();
  }

  return photo;
}

export function getGallery() {
  return _gallery;
}

export function getGalleryPhoto(id) {
  return _gallery.find(p => p.id === id) || null;
}

export function removeFromGallery(id) {
  const idx = _gallery.findIndex(p => p.id === id);
  if (idx !== -1) {
    _gallery.splice(idx, 1);
    return true;
  }
  return false;
}

export function getCurrentFilter() {
  return _currentFilter;
}

export function setCurrentFilter(filter) {
  if (FILTERS[filter]) {
    _currentFilter = filter;
  }
  return _currentFilter;
}

export function getCurrentBackground() {
  return _currentBackground;
}

export function setCurrentBackground(bg) {
  if (BACKGROUNDS[bg]) {
    _currentBackground = bg;
  }
  return _currentBackground;
}

export function getCurrentFrame() {
  return _currentFrame;
}

export function setCurrentFrame(frame) {
  if (FRAME_STYLES[frame]) {
    _currentFrame = frame;
  }
  return _currentFrame;
}

export function getPhotosTaken() {
  return _photosTaken;
}

export function getFilterOptions() {
  return FILTERS;
}

export function getBackgroundOptions() {
  return BACKGROUNDS;
}

export function getFrameOptions() {
  return FRAME_STYLES;
}

export function getPhotoById(id) {
  return _gallery.find(p => p.id === id) || null;
}

export function clearGallery() {
  _gallery = [];
  _photosTaken = 0;
}

export function loadGallery(saved) {
  if (!saved) return;
  if (saved._gallery) _gallery = saved._gallery;
  if (saved._photosTaken !== undefined) _photosTaken = saved._photosTaken;
  if (saved._currentFilter) _currentFilter = saved._currentFilter;
  if (saved._currentBackground) _currentBackground = saved._currentBackground;
  if (saved._currentFrame) _currentFrame = saved._currentFrame;
}

export function getGallerySaveState() {
  return { _gallery, _photosTaken, _currentFilter, _currentBackground, _currentFrame };
}

export function resetGallery() {
  _gallery = [];
  _photosTaken = 0;
  _currentFilter = 'none';
  _currentBackground = 'bakery';
  _currentFrame = 'none';
}

export function getPreviewPhoto(recipeEmoji, recipeName) {
  return generatePhoto(recipeEmoji, recipeName, _currentFilter, _currentBackground, _currentFrame);
}

export const BACKGROUND_TYPES = BACKGROUNDS;
export const FILTER_DEFINITIONS = FILTERS;
export const FRAME_DEFINITIONS = FRAME_STYLES;
export const PHOTO_CONFIG = PHOTO_SIZE;
