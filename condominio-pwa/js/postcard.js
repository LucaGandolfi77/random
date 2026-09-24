/* Scala B, Civico 0 — cartoline condominiali (PNG locale + Web Share) */

import { collectionStats } from "./game.js";
import { FLOORS, MAX_FLOOR, APTS_PER_FLOOR, TENANT_BY_ID, STAMPS } from "./data.js";

/* Disegna la scala su un canvas: niente rete, solo Canvas 2D */
export function drawPostcard(state) {
  const stats = collectionStats(state);
  const canvas = document.createElement("canvas");
  const W = 720;
  const H = 960;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* sfondo carta crema */
  ctx.fillStyle = "#fbf3e4";
  ctx.fillRect(0, 0, W, H);

  /* cielo di prugna in alto */
  const sky = ctx.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, "#2a1d36");
  sky.addColorStop(1, "#3b2a4a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 340);

  /* stelle fisse */
  ctx.fillStyle = "#ffd98a";
  const stars = [
    [60, 50],
    [140, 90],
    [220, 40],
    [310, 110],
    [400, 55],
    [520, 80],
    [640, 45],
    [680, 130],
    [90, 160],
    [480, 150],
  ];
  for (const [x, y] of stars) {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffd98a";
  ctx.font = "36px serif";
  ctx.fillText("🌙", 620, 200);

  /* titolo */
  ctx.fillStyle = "#fbf3e4";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText("Scala B, Civico 0", 36, 120);
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillStyle = "rgba(251,243,228,0.85)";
  ctx.fillText("Il Condominio dei Fenomeni Impossibili", 36, 160);

  /* corpo: torre stilizzata */
  const towerTop = 380;
  const floorH = 72;
  const towerW = 420;
  const towerX = (W - towerW) / 2;
  const unlocked = Math.min(state.unlockedFloors || 1, MAX_FLOOR);

  for (let f = MAX_FLOOR; f >= 1; f--) {
    const y = towerTop + (MAX_FLOOR - f) * floorH;
    const open = f <= unlocked;
    ctx.fillStyle = open ? "#efe0c6" : "rgba(51,38,63,0.18)";
    ctx.strokeStyle = "rgba(51,38,63,0.35)";
    ctx.lineWidth = 2;
    const r = 12;
    roundRect(ctx, towerX, y, towerW, floorH - 8, r);
    ctx.fill();
    ctx.stroke();

    if (!open) {
      ctx.fillStyle = "rgba(51,38,63,0.45)";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(`Piano ${f} · chiuso`, towerX + 20, y + 42);
      continue;
    }

    /* finestre */
    for (let i = 0; i < APTS_PER_FLOOR; i++) {
      const apt = state.apartments?.[f]?.[i];
      const wx = towerX + 16 + i * ((towerW - 32) / APTS_PER_FLOOR);
      const ww = (towerW - 40) / APTS_PER_FLOOR;
      const wy = y + 12;
      const wh = floorH - 32;
      const has = apt && apt.tenant && TENANT_BY_ID[apt.tenant];
      ctx.fillStyle = has ? "#ffd98a" : "rgba(51,38,63,0.12)";
      roundRect(ctx, wx, wy, ww, wh, 6);
      ctx.fill();
      if (has) {
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.fillText(TENANT_BY_ID[apt.tenant].emoji, wx + ww / 2, wy + wh - 8);
        ctx.textAlign = "left";
      }
    }

    ctx.fillStyle = "#33263f";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(`${f}`, towerX - 28, y + 42);
  }

  /* fascia statistiche */
  const footerY = towerTop + MAX_FLOOR * floorH + 24;
  ctx.fillStyle = "#3b2a4a";
  roundRect(ctx, 36, footerY, W - 72, 140, 18);
  ctx.fill();

  ctx.fillStyle = "#fbf3e4";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("La tua scala", 56, footerY + 40);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(
    `🌰 ${state.crumbs}  ·  🧩 ${state.fragments}  ·  piani ${unlocked}/${MAX_FLOOR}`,
    56,
    footerY + 78
  );
  ctx.fillText(
    `Inquilini ${stats.tenantsOwned}/${stats.tenantsTotal}  ·  Arredi ${stats.furnitureOwned}/${stats.furnitureTotal}  ·  Episodi ${stats.episodesDone}/${stats.episodesTotal}`,
    56,
    footerY + 112
  );

  /* bordo */
  ctx.strokeStyle = "rgba(51,38,63,0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  /* francobollo scelto (alto a destra) */
  const stamp = STAMPS.find((s) => s.id === state.selectedStamp);
  if (stamp) {
    ctx.save();
    const sx = W - 150;
    const sy = 40;
    ctx.fillStyle = "#fffdf6";
    ctx.strokeStyle = "rgba(51,38,63,0.45)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    roundRect(ctx, sx, sy, 110, 130, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "48px serif";
    ctx.textAlign = "center";
    ctx.fillText(stamp.emoji, sx + 55, sy + 70);
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = "#33263f";
    const label = stamp.label.length > 16 ? stamp.label.slice(0, 15) + "…" : stamp.label;
    ctx.fillText(label, sx + 55, sy + 105);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("CIVICO 0", sx + 55, sy + 122);
    ctx.textAlign = "left";
    ctx.restore();
  }

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Condivide la cartolina come PNG (Web Share → fallback download) */
export async function sharePostcard(state) {
  const canvas = drawPostcard(state);
  if (!canvas || typeof canvas.toBlob !== "function") {
    return { ok: false, msg: "Canvas non disponibile su questo browser." };
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return { ok: false, msg: "Non sono riuscito a fare il PNG." };

  const file = typeof File === "function" ? new File([blob], "scala-b-civico0.png", { type: "image/png" }) : null;
  const text = "La mia Scala B, Civico 0 — un condominio di fenomeni impossibili.";

  if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: "Scala B, Civico 0", text, files: [file] });
      return { ok: true, mode: "share" };
    } catch (err) {
      if (err && err.name === "AbortError") return { ok: false, aborted: true, msg: "Condivisione annullata." };
      /* fallisci e prova download */
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scala-b-civico0.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, mode: "download" };
  } catch {
    return { ok: false, msg: "Download non riuscito." };
  }
}
