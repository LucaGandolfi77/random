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

// --- Nemici (sprite procedurali dedicati) ---------------------------------
// Ogni tipo di nemico ha una sagoma diversa (`sprite` nei dati NPC):
// pirati = navi agili, cristalli = alieni geometrici, elites = corazzate.
// Il muso punta lungo +X ad angolo 0 (come drawShip). `scale` ~ lunghezza.
SPRITE.drawNpc = function (ctx, kind, x, y, angle, color, scale, thrust) {
  var s = scale;
  var dark = shadeColor(color, -30);
  var light = shadeColor(color, 28);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // fiamma propulsore comune (dietro, lungo -X)
  if (thrust) {
    var fl = s * (0.4 + 0.4 * Math.random());
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.14);
    ctx.lineTo(-s * 0.75 - fl, 0);
    ctx.lineTo(-s * 0.75, s * 0.14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,180,60,0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.08);
    ctx.lineTo(-s * 0.75 - fl * 0.55, 0);
    ctx.lineTo(-s * 0.75, s * 0.08);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,240,180,0.85)';
    ctx.fill();
  }

  var i;
  switch (kind) {
    // --- STREUNER: piccolo caccia a freccia ---------------------------------
    case 'streuner':
      SPRITE._poly(ctx, [[1.05 * s, 0], [0.3 * s, -0.32 * s], [-0.95 * s, -0.5 * s], [-0.6 * s, 0], [-0.95 * s, 0.5 * s], [0.3 * s, 0.32 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.3 * s, 0, 0.14 * s, 0, Math.PI * 2);
      ctx.fillStyle = light; ctx.fill();
      break;

    // --- LORDAKIA: caccia con doppia forcella anteriore ----------------------
    case 'lordakia':
      SPRITE._poly(ctx, [[1.25 * s, -0.5 * s], [0.15 * s, -0.4 * s], [-0.85 * s, -0.3 * s], [-0.95 * s, 0], [-0.85 * s, 0.3 * s], [0.15 * s, 0.4 * s], [1.25 * s, 0.5 * s], [0.55 * s, 0]]);
      ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(0.15 * s, -0.14 * s, 0.5 * s, 0.28 * s);
      ctx.beginPath();
      ctx.moveTo(0.4 * s, -0.24 * s); ctx.lineTo(0.7 * s, -0.34 * s); ctx.lineTo(0.7 * s, 0.34 * s); ctx.lineTo(0.4 * s, 0.24 * s);
      ctx.closePath(); ctx.fillStyle = light; ctx.fill();
      break;

    // --- SAIMON: raider spinato (forma a X) ---------------------------------
    case 'saimon':
      SPRITE._poly(ctx, [[1.1 * s, 0], [0.1 * s, -0.5 * s], [-0.9 * s, -0.7 * s], [-0.3 * s, 0], [-0.9 * s, 0.7 * s], [0.1 * s, 0.5 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      for (i = -1; i <= 1; i += 2) {
        SPRITE._poly(ctx, [[0.25 * s, 0.12 * s * i], [0.55 * s, 0.3 * s * i], [0.1 * s, 0.3 * s * i]]);
        ctx.fillStyle = dark; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(-0.1 * s, 0, 0.16 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- DEVOLARIUM: cacciatore esagonale con becco -------------------------
    case 'devolarium':
      SPRITE._poly(ctx, [[1.15 * s, 0], [0.5 * s, -0.45 * s], [-0.4 * s, -0.5 * s], [-0.9 * s, -0.25 * s], [-0.9 * s, 0.25 * s], [-0.4 * s, 0.5 * s], [0.5 * s, 0.45 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.7 * s, -0.1 * s); ctx.lineTo(1.15 * s, 0); ctx.lineTo(0.7 * s, 0.1 * s); ctx.closePath();
      ctx.fillStyle = light; ctx.fill();
      ctx.beginPath(); ctx.arc(-0.15 * s, 0, 0.15 * s, 0, Math.PI * 2); ctx.fillStyle = '#0a0e1a'; ctx.fill();
      break;

    // --- SIBELON: fregata pesante ad ali larghe ------------------------------
    case 'sibelon':
      SPRITE._poly(ctx, [[1.1 * s, 0], [0.3 * s, -0.35 * s], [-0.4 * s, -0.35 * s], [-1.1 * s, -0.75 * s], [-0.7 * s, 0], [-1.1 * s, 0.75 * s], [-0.4 * s, 0.35 * s], [0.3 * s, 0.35 * s]]);
      ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.95 * s, 0); ctx.lineTo(0.1 * s, -0.28 * s); ctx.lineTo(-0.5 * s, 0); ctx.lineTo(0.1 * s, 0.28 * s);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(0.55 * s, 0, 0.13 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- KRISTALLIN: frammento cristallino a losanga --------------------------
    case 'kristallin':
      SPRITE._poly(ctx, [[1.1 * s, 0], [0.35 * s, -0.6 * s], [-0.9 * s, -0.1 * s], [-0.9 * s, 0.1 * s], [0.35 * s, 0.6 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.35 * s, -0.6 * s); ctx.lineTo(-0.4 * s, 0); ctx.lineTo(0.35 * s, 0.6 * s); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.1 * s, 0); ctx.lineTo(-0.9 * s, 0); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0.15 * s, 0, 0.12 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- KRISTALLON: cristallo grande con spuntoni ----------------------------
    case 'kristallon':
      SPRITE._poly(ctx, [[1.15 * s, 0], [0.4 * s, -0.55 * s], [-0.2 * s, -0.85 * s], [-0.5 * s, -0.25 * s], [-1.0 * s, -0.15 * s], [-1.0 * s, 0.15 * s], [-0.5 * s, 0.25 * s], [-0.2 * s, 0.85 * s], [0.4 * s, 0.55 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.4 * s, -0.55 * s); ctx.lineTo(-0.5 * s, 0); ctx.lineTo(0.4 * s, 0.55 * s); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.85 * s); ctx.lineTo(0.3 * s, 0); ctx.lineTo(-0.2 * s, 0.85 * s); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-0.15 * s, 0, 0.14 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- PALLADION: incrociatore con doppi bracci -----------------------------
    case 'palladion':
      SPRITE._poly(ctx, [[1.3 * s, -0.4 * s], [0.5 * s, -0.4 * s], [-0.5 * s, -0.35 * s], [-1.0 * s, 0], [-0.5 * s, 0.35 * s], [0.5 * s, 0.4 * s], [1.3 * s, 0.4 * s], [0.7 * s, 0]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = dark;
      ctx.fillRect(-0.7 * s, -0.15 * s, 1.0 * s, 0.3 * s);
      ctx.beginPath(); ctx.arc(-0.15 * s, 0, 0.16 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- HALON: nave con anello energetico -----------------------------------
    case 'halon':
      SPRITE._poly(ctx, [[0.9 * s, 0], [0.25 * s, -0.3 * s], [-0.7 * s, -0.25 * s], [-0.7 * s, 0.25 * s], [0.25 * s, 0.3 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.85 * s, 0.5 * s, 0, 0, Math.PI * 2);
      ctx.strokeStyle = light; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(-0.15 * s, 0, 0.13 * s, 0, Math.PI * 2); ctx.fillStyle = '#0a0e1a'; ctx.fill();
      break;

    // --- DESMO: distruttore a punta di freccia con denti ----------------------
    case 'desmo':
      SPRITE._poly(ctx, [[1.2 * s, 0], [0.4 * s, -0.5 * s], [-0.5 * s, -0.4 * s], [-1.0 * s, -0.8 * s], [-0.7 * s, 0], [-1.0 * s, 0.8 * s], [-0.5 * s, 0.4 * s], [0.4 * s, 0.5 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = dark;
      ctx.fillRect(-0.45 * s, -0.22 * s, 0.7 * s, 0.44 * s);
      ctx.beginPath(); ctx.arc(0.15 * s, 0, 0.15 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      break;

    // --- STREUNER (elite): intercettore a muso lungo ---------------------------
    case 'elite':
      SPRITE._poly(ctx, [[1.5 * s, 0], [0.6 * s, -0.3 * s], [-0.4 * s, -0.35 * s], [-1.0 * s, -0.15 * s], [-1.0 * s, 0.15 * s], [-0.4 * s, 0.35 * s], [0.6 * s, 0.3 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.35 * s, 0); ctx.lineTo(0.7 * s, -0.14 * s); ctx.lineTo(0.7 * s, 0.14 * s); ctx.closePath();
      ctx.fillStyle = dark; ctx.fill();
      ctx.beginPath(); ctx.arc(0.1 * s, 0, 0.17 * s, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      ctx.beginPath(); ctx.arc(0.1 * s, 0, 0.08 * s, 0, Math.PI * 2); ctx.fillStyle = '#0a0e1a'; ctx.fill();
      break;

    // --- BOSS (Mindfire Behemoth): bestia demoniaca ----------------------------
    case 'boss':
      SPRITE._poly(ctx, [[1.2 * s, 0], [0.5 * s, -0.45 * s], [-0.6 * s, -0.5 * s], [-1.2 * s, -0.7 * s], [-0.9 * s, 0], [-1.2 * s, 0.7 * s], [-0.6 * s, 0.5 * s], [0.5 * s, 0.45 * s]]);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();
      // corna frontali
      SPRITE._poly(ctx, [[1.1 * s, -0.28 * s], [1.5 * s, -0.5 * s], [0.75 * s, -0.3 * s]]);
      ctx.fillStyle = dark; ctx.fill();
      SPRITE._poly(ctx, [[1.1 * s, 0.28 * s], [1.5 * s, 0.5 * s], [0.75 * s, 0.3 * s]]);
      ctx.fillStyle = dark; ctx.fill();
      // occhi incandescenti
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath(); ctx.arc(0.55 * s, -0.18 * s, 0.1 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.55 * s, 0.18 * s, 0.1 * s, 0, Math.PI * 2); ctx.fill();
      // fauci
      SPRITE._poly(ctx, [[0.9 * s, -0.1 * s], [1.2 * s, 0], [0.9 * s, 0.1 * s]]);
      ctx.fillStyle = '#0a0e1a'; ctx.fill();
      break;

    default:
      SPRITE.drawShip(ctx, 0, 0, 0, color, scale, false);
      break;
  }

  ctx.restore();
};

// Helper: disegna un poligono chiuso dalla lista di punti [[x,y],...]
SPRITE._poly = function (ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
};

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