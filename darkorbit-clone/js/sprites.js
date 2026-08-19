// DARK ORBIT CLONE - Disegno procedurale in canvas
// Tutte le forme (navi, asteroidi, laser, esplosioni, stelle) sono disegnate
// via codice, senza asset esterni.

var SPRITE = {};

// Selettore colore: torna il colore della nave per l'account (admin = oro)
SPRITE.adminColor = '#ffd54a';

// --- Stelle fisse di sfondo -----------------------------------------------
SPRITE.stars = [];
SPRITE.initStars = function () {
  var i;
  SPRITE.stars = [];
  for (i = 0; i < 260; i++) {
    SPRITE.stars.push({
      x: Math.random() * DATA.WORLD_W,
      y: Math.random() * DATA.WORLD_H,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.7 + 0.25
    });
  }
};

// --- Nave -----------------------------------------------------------------
// Modello 2D dettagliato. Il muso punta lungo +X (destra) ad angolo 0,
// coerente con l'angolo di volo (atan2). `scale` ~ lunghezza meta'.
// Le navi si muovono in tutte le direzioni ruotando il modello.
SPRITE.drawShip = function (ctx, x, y, angle, color, scale, thrust) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // fiamma propulsore (dietro, lungo -X)
  if (thrust) {
    var fl = scale * (0.5 + 0.45 * Math.random());
    ctx.beginPath();
    ctx.moveTo(-scale * 0.75, -scale * 0.16);
    ctx.lineTo(-scale * 0.75 - fl, 0);
    ctx.lineTo(-scale * 0.75, scale * 0.16);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,180,60,0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-scale * 0.75, -scale * 0.1);
    ctx.lineTo(-scale * 0.75 - fl * 0.6, 0);
    ctx.lineTo(-scale * 0.75, scale * 0.1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.fill();
  }

  // ali posteriori (swept back verso -X)
  ctx.beginPath();
  ctx.moveTo(-scale * 0.25, -scale * 0.1);
  ctx.lineTo(-scale * 0.95, -scale * 0.55);
  ctx.lineTo(-scale * 0.6, 0);
  ctx.lineTo(-scale * 0.95, scale * 0.55);
  ctx.lineTo(-scale * 0.25, scale * 0.1);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // scafo principale
  ctx.beginPath();
  ctx.moveTo(scale * 1.05, 0);                  // muso
  ctx.lineTo(scale * 0.35, -scale * 0.38);      // spalla sx
  ctx.lineTo(-scale * 0.5, -scale * 0.3);       // fianco sx
  ctx.lineTo(-scale * 0.7, 0);                  // coda
  ctx.lineTo(-scale * 0.5, scale * 0.3);        // fianco dx
  ctx.lineTo(scale * 0.35, scale * 0.38);       // spalla dx
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // linea di accento sul dorso
  ctx.beginPath();
  ctx.moveTo(scale * 0.85, 0);
  ctx.lineTo(-scale * 0.45, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = scale * 0.06;
  ctx.stroke();

  // cabina/ponte di pilotaggio
  ctx.beginPath();
  ctx.moveTo(scale * 0.45, -scale * 0.18);
  ctx.quadraticCurveTo(scale * 0.7, 0, scale * 0.45, scale * 0.18);
  ctx.closePath();
  ctx.fillStyle = 'rgba(170,230,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // retro motori (ugelli)
  ctx.fillStyle = shadeColor(color, -40);
  ctx.fillRect(-scale * 0.75, -scale * 0.2, scale * 0.12, scale * 0.4);

  ctx.restore();
};

// Schiarisce/scurisce un colore esadecimale di `pct` percento
function shadeColor(hex, pct) {
  var num = parseInt(hex.slice(1), 16);
  var r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, Math.min(255, Math.round(r + (pct / 100) * 255)));
  g = Math.max(0, Math.min(255, Math.round(g + (pct / 100) * 255)));
  b = Math.max(0, Math.min(255, Math.round(b + (pct / 100) * 255)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// --- Asteroide -------------------------------------------------------------
SPRITE.drawAsteroid = function (ctx, x, y, r, oreColor) {
  ctx.save();
  ctx.translate(x, y);
  var rot = r * 0.7, n = 9, i;
  ctx.beginPath();
  for (i = 0; i <= n; i++) {
    var a = (i / n) * Math.PI * 2 + rot;
    var rad = r * (0.75 + 0.25 * Math.abs(Math.sin(a * 3 + rot)));
    var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#6b5b4e';
  ctx.fill();
  // venature del minerale
  if (oreColor) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = oreColor;
    ctx.lineWidth = 1.5;
    for (i = 0; i < 3; i++) {
      var va = rot + i * 2.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(va) * r * 0.25, Math.sin(va) * r * 0.25);
      ctx.lineTo(Math.cos(va) * r * 0.85, Math.sin(va) * r * 0.85);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#3d3128';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
};

// --- Laser (raggio in volo) ------------------------------------------------
SPRITE.drawLaser = function (ctx, x, y, angle, color, len) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

// --- Esplosione ------------------------------------------------------------
// particles: [{x,y,vx,vy,life,maxLife,color}]
SPRITE.drawExplosion = function (ctx, ex) {
  var i, p;
  for (i = 0; i < ex.particles.length; i++) {
    p = ex.particles[i];
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + 3 * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// --- Drop (risorsa da raccogliere) -----------------------------------------
SPRITE.drawDrop = function (ctx, d) {
  var pulse = 1 + 0.3 * Math.sin(Date.now() / 200 + d.x);
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(pulse, pulse);
  if (d.type === 'credits') {
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe97a';
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#8a6d00';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 2);
  } else if (d.type === 'ore') {
    var ore = DATA.ORES[d.ore] || { color: '#c58bff', name: '?' };
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = ore.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fillStyle = '#c58bff';
    ctx.fill();
    ctx.strokeStyle = '#7a4fd0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
};