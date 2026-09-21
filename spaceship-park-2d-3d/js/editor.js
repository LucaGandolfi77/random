class LevelEditor {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.currentLevel = null;
    this.selectedTool = 'obstacle';
    this.dragging = false;
    this.startPos = null;
  }

  open(level) {
    this.active = true;
    this.currentLevel = JSON.parse(JSON.stringify(level));
    this.currentLevel.movingObstacles = this.currentLevel.movingObstacles || [];
    this.selectedTool = 'obstacle';
    this.game.showToast('Level Editor aperto! Click per posizionare, trascina per dimensioni.');
  }

  close() {
    this.active = false;
  }

  getToolUI() {
    return `
      <div id="editor-panel" style="position:fixed;top:60px;left:10px;background:rgba(0,0,0,0.9);border:2px solid #00d4ff;border-radius:10px;padding:15px;z-index:20;color:#e0e0ff;font-family:sans-serif;">
        <h3 style="color:#ffd700;margin:0 0 10px;font-size:16px;">🔧 Level Editor</h3>
        <div style="margin-bottom:8px;">
          <button class="tool-btn" data-tool="obstacle" style="padding:5px 10px;margin:2px;border:1px solid #00d4ff;background:${this.selectedTool==='obstacle'?'#00d4ff':'transparent'};color:#000;border-radius:5px;cursor:pointer;">Blocco</button>
          <button class="tool-btn" data-tool="circle" style="padding:5px 10px;margin:2px;border:1px solid #00d4ff;background:${this.selectedTool==='circle'?'#00d4ff':'transparent'};color:#000;border-radius:5px;cursor:pointer;">Asteroide</button>
          <button class="tool-btn" data-tool="mo" style="padding:5px 10px;margin:2px;border:1px solid #00d4ff;background:${this.selectedTool==='mo'?'#00d4ff':'transparent'};color:#000;border-radius:5px;cursor:pointer;">Movibile</button>
        </div>
        <div style="margin-bottom:8px;">
          <button id="editor-save" style="padding:5px 15px;margin:2px;border:1px solid #33ff66;background:#33ff66;color:#000;border-radius:5px;cursor:pointer;">💾 Salva</button>
          <button id="editor-test" style="padding:5px 15px;margin:2px;border:1px solid #ffd700;background:#ffd700;color:#000;border-radius:5px;cursor:pointer;">🧪 Test</button>
          <button id="editor-close" style="padding:5px 15px;margin:2px;border:1px solid #ff3333;background:#ff3333;color:#fff;border-radius:5px;cursor:pointer;">✖ Chiudi</button>
        </div>
        <div style="font-size:11px;color:#888;">
          Click & trascina per creare ostacoli.<br>
          Livello: ${this.currentLevel ? this.currentLevel.name : 'N/A'} | Ostacoli: ${(this.currentLevel ? this.currentLevel.obstacles.length : 0) + (this.currentLevel ? this.currentLevel.movingObstacles.length : 0)}
        </div>
      </div>
    `;
  }

  handleClick(x, y) {
    if (!this.active || !this.currentLevel) return;
    const scaleX = this.game.physics.level.width / (this.game.renderer2d.canvas.width || 800);
    const scaleY = this.game.physics.level.height / (this.game.renderer2d.canvas.height || 600);
    const worldX = x * scaleX;
    const worldY = y * scaleY;

    if (this.selectedTool === 'obstacle' || this.selectedTool === 'circle') {
      const size = 50 + Math.random() * 50;
      if (this.selectedTool === 'circle') {
        this.currentLevel.obstacles.push({ x: worldX, y: worldY, w: size, h: size, type: 'circle', r: size/2 });
      } else {
        this.currentLevel.obstacles.push({ x: worldX, y: worldY, w: size, h: size, type: 'rect' });
      }
      this.game.showToast(`Ostacolo aggiunto in (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
    } else if (this.selectedTool === 'mo') {
      this.currentLevel.movingObstacles.push({
        x: worldX, y: worldY, w: 40, h: 200, type: 'rect',
        axis: Math.random() > 0.5 ? 'y' : 'x',
        range: 300 + Math.random() * 300,
        speed: 0.5 + Math.random() * 1.5,
        originX: worldX, originY: worldY
      });
      this.game.showToast('Ostacolo mobile creato!');
    }
  }

  save() {
    if (!this.currentLevel) return;
    try {
      const data = JSON.stringify(this.currentLevel);
      localStorage.setItem('stardock_editor_level', data);
      this.game.showToast('Livello salvato! ✅');
    } catch(e) {
      this.game.showToast('Errore salvataggio! ❌');
    }
  }

  render(ctx, game) {
    if (!this.active || !this.currentLevel) return;
    // Render editor overlay
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    // Could add grid snap indicator, etc.
  }
}
