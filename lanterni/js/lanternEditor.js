// js/lanternEditor.js — Custom lantern design editor

export class LanternEditor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.active = false;
    this.tool = 'pencil';
    this.color = '#ff6b35';
    this.size = 3;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    this.palette = [
      '#ff6b35', '#5b8cff', '#ffd700', '#ff6b9d', '#4ecdc4',
      '#9b59b6', '#3498db', '#ffffff', '#000000'
    ];
  }

  open(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('hidden');

    const wrapper = document.createElement('div');
    wrapper.className = 'editor-wrapper';

    const toolbar = this._createToolbar();
    wrapper.appendChild(toolbar);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 200;
    this.canvas.height = 200;
    this.canvas.className = 'editor-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#1a1a3e';
    this.ctx.fillRect(0, 0, 200, 200);
    wrapper.appendChild(this.canvas);

    const palette = this._createPalette();
    wrapper.appendChild(palette);

    container.appendChild(wrapper);
    this._bindEvents();
    this.active = true;
    this._saveState();
  }

  _createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    const tools = [
      { id: 'pencil', label: '✏️' },
      { id: 'eraser', label: '🧹' },
      { id: 'fill', label: '🪣' }
    ];

    for (const t of tools) {
      const btn = document.createElement('button');
      btn.className = 'editor-btn';
      btn.textContent = t.label;
      btn.dataset.tool = t.id;
      btn.addEventListener('click', () => {
        this.tool = t.id;
        toolbar.querySelectorAll('.editor-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      toolbar.appendChild(btn);
    }

    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = '1';
    sizeInput.max = '10';
    sizeInput.value = '3';
    sizeInput.className = 'editor-size';
    sizeInput.addEventListener('input', () => {
      this.size = parseInt(sizeInput.value);
    });
    toolbar.appendChild(sizeInput);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'editor-btn';
    undoBtn.textContent = '↩️';
    undoBtn.addEventListener('click', () => this.undo());
    toolbar.appendChild(undoBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'editor-btn';
    clearBtn.textContent = '🗑️';
    clearBtn.addEventListener('click', () => this.clear());
    toolbar.appendChild(clearBtn);

    return toolbar;
  }

  _createPalette() {
    const palette = document.createElement('div');
    palette.className = 'editor-palette';

    for (const color of this.palette) {
      const swatch = document.createElement('button');
      swatch.className = 'editor-swatch';
      swatch.style.backgroundColor = color;
      if (color === this.color) swatch.classList.add('active');
      swatch.addEventListener('click', () => {
        this.color = color;
        palette.querySelectorAll('.editor-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
      palette.appendChild(swatch);
    }

    return palette;
  }

  _bindEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('pointerdown', e => {
      this.isDrawing = true;
      const rect = this.canvas.getBoundingClientRect();
      this.lastX = e.clientX - rect.left;
      this.lastY = e.clientY - rect.top;
      if (this.tool === 'fill') {
        this._floodFill(Math.round(this.lastX), Math.round(this.lastY), this.color);
      } else {
        this._draw(this.lastX, this.lastY);
      }
    });

    this.canvas.addEventListener('pointermove', e => {
      if (!this.isDrawing) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._drawLine(this.lastX, this.lastY, x, y);
      this.lastX = x;
      this.lastY = y;
    });

    this.canvas.addEventListener('pointerup', () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this._saveState();
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this._saveState();
      }
    });
  }

  _draw(x, y) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.tool === 'eraser' ? '#1a1a3e' : this.color;
    this.ctx.fill();
  }

  _drawLine(x1, y1, x2, y2) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = this.tool === 'eraser' ? '#1a1a3e' : this.color;
    this.ctx.lineWidth = this.size;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  _floodFill(startX, startY, fillColor) {
    if (!this.ctx) return;
    const imageData = this.ctx.getImageData(0, 0, 200, 200);
    const data = imageData.data;
    const targetColor = this._getPixel(data, startX, startY);

    if (targetColor === fillColor) return;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= 200 || y < 0 || y >= 200) continue;

      const currentColor = this._getPixel(data, x, y);
      if (currentColor !== targetColor) continue;

      visited.add(key);
      this._setPixel(data, x, y, fillColor);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  _getPixel(data, x, y) {
    const i = (y * 200 + x) * 4;
    return `#${data[i].toString(16).padStart(2, '0')}${data[i + 1].toString(16).padStart(2, '0')}${data[i + 2].toString(16).padStart(2, '0')}`;
  }

  _setPixel(data, x, y, color) {
    const i = (y * 200 + x) * 4;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }

  _saveState() {
    if (!this.ctx) return;
    const imageData = this.ctx.getImageData(0, 0, 200, 200);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(imageData);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
    }
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#1a1a3e';
    this.ctx.fillRect(0, 0, 200, 200);
    this._saveState();
  }

  toJSON() {
    if (!this.canvas) return null;
    return {
      width: 200,
      height: 200,
      data: this.canvas.toDataURL('image/png')
    };
  }

  fromJSON(json) {
    if (!json || !this.ctx) return;
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, 200, 200);
      this.ctx.drawImage(img, 0, 0);
      this._saveState();
    };
    img.src = json.data;
  }

  close() {
    this.active = false;
    this.canvas = null;
    this.ctx = null;
    this.history = [];
    this.historyIndex = -1;
  }
}
