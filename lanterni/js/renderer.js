// js/renderer.js — Canvas 2D Rendering Engine

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = window.devicePixelRatio || 1;
    this._glowCache = new Map();
    this._hasOffscreen = typeof OffscreenCanvas !== 'undefined';
    this.zoom = 1;
    this.zoomX = 0;
    this.zoomY = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setZoom(scale, centerX, centerY) {
    this.zoom = Math.max(0.5, Math.min(3, scale));
    this.zoomX = centerX || this.w / 2;
    this.zoomY = centerY || this.h / 2;
  }

  resetZoom() {
    this.zoom = 1;
    this.zoomX = 0;
    this.zoomY = 0;
  }

  applyZoom() {
    if (this.zoom !== 1) {
      this.ctx.save();
      this.ctx.translate(this.zoomX, this.zoomY);
      this.ctx.scale(this.zoom, this.zoom);
      this.ctx.translate(-this.zoomX, -this.zoomY);
    }
  }

  resetTransform() {
    if (this.zoom !== 1) {
      this.ctx.restore();
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  fillBg(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  drawGradientBg(topColor, bottomColor) {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  drawCircle(x, y, r, color, alpha = 1) {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  drawGlow(x, y, r, color, intensity = 0.3) {
    if (this._hasOffscreen) {
      const qr = Math.round(r / 2) * 2;
      const key = `${color}_${qr}`;
      if (!this._glowCache.has(key)) {
        this._glowCache.set(key, this._createGlowTexture(color, qr));
      }
      const tex = this._glowCache.get(key);
      this.ctx.save();
      this.ctx.globalAlpha = intensity;
      this.ctx.drawImage(tex, x - tex.width / 2, y - tex.height / 2);
      this.ctx.restore();
    } else {
      this.ctx.save();
      this.ctx.globalAlpha = intensity;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = r * 2;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  _createGlowTexture(color, radius) {
    const size = radius * 2 + 4;
    const oc = new OffscreenCanvas(size, size);
    const octx = oc.getContext('2d');
    const half = size / 2;
    const grad = octx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color + '80');
    grad.addColorStop(1, 'transparent');
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(half, half, half, 0, Math.PI * 2);
    octx.fill();
    return oc;
  }

  drawPoly(points, color, alpha = 1) {
    if (points.length < 3) return;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  drawLine(x1, y1, x2, y2, color, width = 1, alpha = 1) {
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawText(text, x, y, color, size = 16, align = 'center') {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px 'Segoe UI', system-ui, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  drawLantern(x, y, size, color, glowColor, glowIntensity = 0.4) {
    const s = size;
    const hw = s * 0.4;
    const hh = s * 0.55;

    this.ctx.save();

    // Glow (cached)
    const glowR = s * 0.6;
    if (this._hasOffscreen) {
      const qr = Math.round(glowR / 2) * 2;
      const key = `${glowColor}_${qr}`;
      if (!this._glowCache.has(key)) {
        this._glowCache.set(key, this._createGlowTexture(glowColor, qr));
      }
      const tex = this._glowCache.get(key);
      this.ctx.globalAlpha = 0.15 * glowIntensity;
      this.ctx.drawImage(tex, x - tex.width / 2, y - tex.height / 2);
    } else {
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = s * 0.8 * glowIntensity;
      this.ctx.fillStyle = glowColor;
      this.ctx.globalAlpha = 0.15 * glowIntensity;
      this.ctx.beginPath();
      this.ctx.arc(x, y, glowR, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Main body — origami diamond shape
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = color;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y - hh);          // top
    this.ctx.lineTo(x + hw, y);          // right
    this.ctx.lineTo(x, y + hh * 0.3);   // bottom
    this.ctx.lineTo(x - hw, y);          // left
    this.ctx.closePath();
    this.ctx.fill();

    // Paper fold lines
    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - hh);
    this.ctx.lineTo(x, y + hh * 0.3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x - hw, y);
    this.ctx.lineTo(x + hw, y);
    this.ctx.stroke();

    // Top cap
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.fillRect(x - hw * 0.3, y - hh - 3, hw * 0.6, 4);

    // Tassel
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + hh * 0.3);
    this.ctx.lineTo(x, y + hh * 0.3 + 8);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawNet(x, y, size, alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = '#8b7355';
    this.ctx.lineWidth = 2;

    // Net bag
    const r = size;
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * 0.2 + t * Math.PI * 0.6;
      const nx = x + Math.cos(angle) * r;
      const ny = y + Math.sin(angle) * r;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - r * 0.2);
      this.ctx.lineTo(nx, ny);
      this.ctx.stroke();
    }

    // Cross lines
    for (let j = 1; j < 3; j++) {
      const ry = y - r * 0.1 + j * r * 0.25;
      this.ctx.beginPath();
      this.ctx.moveTo(x - r * 0.6, ry);
      this.ctx.lineTo(x + r * 0.6, ry);
      this.ctx.stroke();
    }

    // Ring
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y - r * 0.2, r * 0.15, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCloud(x, y, w, h, alpha = 0.3) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#2a2a4a';

    const circles = [
      { cx: x, cy: y, r: h * 0.6 },
      { cx: x - w * 0.25, cy: y + h * 0.1, r: h * 0.45 },
      { cx: x + w * 0.3, cy: y + h * 0.05, r: h * 0.5 },
      { cx: x + w * 0.1, cy: y - h * 0.15, r: h * 0.4 }
    ];

    for (const c of circles) {
      this.ctx.beginPath();
      this.ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }
}
