class Renderer2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.pov = 'top';
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render(level, ship, time, particles, screenShake) {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const zoom = this.camera.zoom;
    let camX = w/2 - ship.x * zoom + (screenShake ? screenShake.x : 0);
    let camY = h/2 - ship.y * zoom + (screenShake ? screenShake.y : 0);

    ctx.save();
    ctx.translate(camX, camY);
    ctx.scale(zoom, zoom);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(w/2/zoom, h/2/zoom, 0, w/2/zoom, h/2/zoom, Math.max(w,h)*0.7);
    bgGrad.addColorStop(0, '#0f1a30');
    bgGrad.addColorStop(1, '#050a15');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-w, -h, w*3, h*3);

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= level.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, level.height); ctx.stroke();
    }
    for (let y = 0; y <= level.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(level.width, y); ctx.stroke();
    }

    // Level bounds
    ctx.strokeStyle = 'rgba(255,107,53,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, level.width, level.height);

    // Moving obstacles
    for (const mo of (level.movingObstacles || [])) {
      if (mo.type === 'circle') {
        ctx.fillStyle = 'rgba(150,80,80,0.6)';
        ctx.strokeStyle = '#cc4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.r, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        // Direction indicator
        ctx.strokeStyle = 'rgba(255,100,100,0.5)';
        ctx.setLineDash([5,5]);
        ctx.beginPath();
        ctx.moveTo(mo.x, mo.y);
        ctx.lineTo(mo.x + (mo.vx || 1) * 30, mo.y + (mo.vy || 0) * 30);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const pulse = Math.sin(time * 3) * 0.1;
        ctx.fillStyle = `rgba(100,80,60,0.7${pulse > 0 ? '' : ''})`;
        ctx.strokeStyle = '#886644';
        ctx.lineWidth = 2;
        ctx.fillRect(mo.x - mo.w/2, mo.y - mo.h/2, mo.w, mo.h);
        ctx.strokeRect(mo.x - mo.w/2, mo.y - mo.h/2, mo.w, mo.h);
        // Moving arrow
        ctx.fillStyle = '#ff6633';
        const dir = mo.axis === 'x' ? (mo.vx > 0 ? 1 : -1) : 0;
        const arrowY = mo.y - mo.h/2 - 8;
        ctx.beginPath();
        ctx.moveTo(mo.x - 5, arrowY + 10);
        ctx.lineTo(mo.x, arrowY);
        ctx.lineTo(mo.x + 5, arrowY + 10);
        ctx.fill();
      }
    }

    // Static obstacles
    for (const obs of level.obstacles) {
      if (obs.type === 'circle') {
        ctx.fillStyle = 'rgba(80,60,60,0.7)';
        ctx.strokeStyle = '#996644';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#cc9966';
        ctx.font = Math.max(8, 14) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☄', obs.x, obs.y);
      } else {
        ctx.fillStyle = 'rgba(70,70,110,0.7)';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.fillRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
        ctx.strokeRect(obs.x - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
      }
    }

    // Gravity wells
    for (const gw of (level.gravityWells || [])) {
      const pulse = 0.2 + 0.15*Math.sin(time*3);
      ctx.strokeStyle = `rgba(255,50,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, gw.r, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      const grad = ctx.createRadialGradient(gw.x, gw.y, 0, gw.x, gw.y, gw.r);
      grad.addColorStop(0, 'rgba(255,0,255,0.1)');
      grad.addColorStop(1, 'rgba(255,0,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, gw.r, 0, Math.PI*2);
      ctx.fill();
    }

    // Parking spots
    for (const spot of level.parkingSpots) {
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.rotate(spot.angle);
      const pulse = 30 + 10 * Math.sin(time*4);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulse);
      grad.addColorStop(0, 'rgba(255,215,0,0.35)');
      grad.addColorStop(1, 'rgba(255,215,0,0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(-spot.w/2, -spot.h/2, spot.w, spot.h);
      ctx.strokeStyle = `rgba(255,215,0,${0.4 + 0.2*Math.sin(time*4)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(-spot.w/2, -spot.h/2, spot.w, spot.h);
      ctx.fillStyle = 'rgba(255,215,0,0.9)';
      ctx.font = Math.max(8, 12) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬛ PARK', 0, 0);
      ctx.restore();
    }

    // Ship
    this.drawShip(ctx, ship, time);

    // Particles
    if (particles) {
      particles.render(ctx, { x: ship.x, y: ship.y, zoom });
    }

    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = 'rgba(0,212,255,0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${level.name} | POV: ${this.pov}`, 10, 25);
    const speed = Math.sqrt(ship.vx**2+ship.vy**2);
    ctx.fillText(`Vel: ${speed.toFixed(1)} | Combo: ${Math.floor(this.combo||0)} | Boost: ${Math.floor(ship.boostFuel||0)}%`, 10, 45);
    if (ship.invincible > 0) {
      ctx.fillStyle = 'rgba(255,50,50,0.5)';
      ctx.fillText('INVINCIBLE!', 10, 65);
    }
    ctx.restore();
  }

  drawShip(ctx, ship, time) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Invincible flash
    if (ship.invincible > 0 && Math.sin(time * 20) > 0) {
      ctx.globalAlpha = 0.5;
    }

    const s = ship.size;

    // Engine glow
    if ((Math.abs(ship.vx) + Math.abs(ship.vy) > 0.5 || ship.boostActive) && ship.fuel > 0) {
      const intensity = ship.boostActive ? 2 : 1;
      ctx.fillStyle = ship.boostActive ? `rgba(255,50,0,${0.5+Math.random()*0.3})` : `rgba(255,${100+Math.random()*100|0},0,${0.5+Math.random()*0.3})`;
      ctx.beginPath();
      ctx.moveTo(-s*0.5, -s*0.25*intensity);
      ctx.lineTo(-s*1.2 - Math.random()*10*intensity, 0);
      ctx.lineTo(-s*0.5, s*0.25*intensity);
      ctx.closePath();
      ctx.fill();
    }

    // Ship body
    ctx.fillStyle = ship.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 1.2, 0);
    ctx.lineTo(-s * 0.5, -s * 0.5);
    ctx.lineTo(-s * 0.7, 0);
    ctx.lineTo(-s * 0.5, s * 0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Cockpit
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(s * 0.25, 0, s * 0.18, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * 0.25, 0, s * 0.08, 0, Math.PI*2);
    ctx.fill();

    // Wings
    ctx.fillStyle = ship.color + '88';
    ctx.beginPath();
    ctx.moveTo(s*0.1, -s*0.3);
    ctx.lineTo(-s*0.3, -s*0.6);
    ctx.lineTo(-s*0.5, -s*0.3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s*0.1, s*0.3);
    ctx.lineTo(-s*0.3, s*0.6);
    ctx.lineTo(-s*0.5, s*0.3);
    ctx.closePath(); ctx.fill();

    // Boost flame
    if (ship.boostActive) {
      ctx.fillStyle = 'rgba(255,100,0,0.8)';
      ctx.beginPath();
      ctx.moveTo(-s*0.5, -s*0.4);
      ctx.lineTo(-s*2 - Math.random()*15, 0);
      ctx.lineTo(-s*0.5, s*0.4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
