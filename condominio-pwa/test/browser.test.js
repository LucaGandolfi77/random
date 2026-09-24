/* Test su browser reale: Playwright + Chromium headless.
   Avvia un server statico locale, carica la PWA e verifica:
   shell, service worker, loop di gioco, gacha e funzionamento offline. */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = 8247;
const BASE = `http://127.0.0.1:${PORT}`;
const root = new URL("..", import.meta.url).pathname;

let passed = 0;
let failed = 0;

async function t(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log("  ✓", name);
  } catch (err) {
    failed += 1;
    console.error("  ✗", name);
    console.error("   ", err.message);
  }
}

async function waitForServer(url, ms = 10000) {
  const deadline = Date.now() + ms;
  let lastErr = "";
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok) return;
      lastErr = "HTTP " + r.status;
    } catch (e) {
      lastErr = e.message;
    }
    await sleep(150);
  }
  throw new Error(`server non pronto (${url}): ${lastErr}`);
}

const num = async (page, sel) =>
  Number((await page.locator(sel).textContent()).replace(/\D/g, ""));

console.log("\nTest browser reale (Playwright + Chromium)\n");

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: "ignore",
});

let browser = null;

try {
  await waitForServer(BASE + "/");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  /* waitForSelector di default aspetta la visibilità: per gli elementi
     con [hidden] serve lo stato esplicito "hidden" */
  const waitHidden = (sel) => page.locator(sel).waitFor({ state: "hidden" });
  const waitVisible = (sel) => page.locator(sel).waitFor({ state: "visible" });

  await t("la shell si carica: titolo, viewport zoomabile, torre e briciole", async () => {
    await page.goto(BASE + "/", { waitUntil: "load" });
    const title = await page.title();
    if (!title.includes("Scala B")) throw new Error("titolo errato: " + title);
    const vw = await page.locator('meta[name="viewport"]').getAttribute("content");
    if (vw && vw.includes("maximum-scale")) throw new Error("zoom ancora bloccato");
    await page.waitForSelector("#tower .apt", { timeout: 5000 });
    const crumbs = await num(page, "#res-crumbs");
    if (crumbs !== 180) throw new Error("briciole iniziali: " + crumbs);
    if (!(await page.locator("#tower .apt:not(.empty)").count())) throw new Error("nessun inquilino iniziale");
  });

  await t("manifest e service worker: PWA installabile e attiva", async () => {
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    if (!href) throw new Error("link manifest assente");
    const swOk = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });
    if (!swOk) throw new Error("service worker non attivo");
    const cacheOk = await page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith("civico0-")));
    if (!cacheOk) throw new Error("cache civico0 assente");
  });

  await t("favore: sheet, incasso briciole, sheet richiuso", async () => {
    const before = await num(page, "#res-crumbs");
    await page.locator("#tower .apt:not(.empty)").first().click();
    await waitVisible("#sheet");
    const favor = page.locator("#sheet [data-favor]");
    if (!(await favor.isEnabled())) throw new Error("favore non disponibile all'apertura");
    await favor.click();
    await waitHidden("#sheet");
    const after = await num(page, "#res-crumbs");
    if (!(after > before)) throw new Error(`briciole non incassate (${before} → ${after})`);
  });

  await t("accessibilità: Escape chiude lo sheet aperto", async () => {
    await page.locator("#tower .apt").first().click();
    await waitVisible("#sheet");
    await page.keyboard.press("Escape");
    await waitHidden("#sheet");
  });

  await t("gacha: bustina, carta, riepilogo e chiusura", async () => {
    await page.locator('.tab-btn[data-view="cassetta"]').click();
    const pity = await page.locator("#pity-text").textContent();
    if (pity !== "0/30") throw new Error("pity iniziale: " + pity);
    await page.locator("#btn-pull-1").click();
    await waitVisible("#reveal");
    /* la capsula vibra di continuo (wobble infinito): serve un click forzato */
    await page.locator("#capsule").click({ force: true });
    await waitVisible("#reveal-card");
    const card = await page.locator("#reveal-card").textContent();
    if (!/Comune|Raro|Epico|Leggendario/.test(card)) throw new Error("rarità assente sulla carta");
    await page.locator("#reveal-skip").click();
    await waitVisible("#reveal-summary");
    if ((await page.locator("#summary-grid .sum-item").count()) !== 1)
      throw new Error("attesa 1 carta nel riepilogo");
    await page.locator("#summary-close").click();
    await waitHidden("#reveal");
    const after = await num(page, "#res-crumbs");
    if (after >= 180) throw new Error("il costo della bustina non è stato addebitato");
  });

  await t("tastiera: il reveal avanza con lo spazio, Escape lo chiude", async () => {
    const multi = page.locator("#btn-pull-10");
    const single = page.locator("#btn-pull-1");
    if (await multi.isEnabled()) await multi.click();
    else await single.click();
    await waitVisible("#reveal");
    await page.keyboard.press("Space");
    await waitVisible("#reveal-card");
    await page.locator("#reveal-skip").click();
    await waitVisible("#reveal-summary");
    await page.keyboard.press("Escape");
    await waitHidden("#reveal");
  });

  await t("salvataggio: lo stato persiste nel localStorage con versione", async () => {
    const raw = await page.evaluate(() => localStorage.getItem("civico0.save.v1"));
    if (!raw) throw new Error("nessun salvataggio scritto");
    const parsed = JSON.parse(raw);
    if (parsed.v !== 3) throw new Error("versione salvataggio: " + parsed.v);
    if (!Number.isFinite(parsed.crumbs)) throw new Error("salvataggio corrotto");
  });

  await t("offline: la shell e i progressi sopravvivono senza rete", async () => {
    await sleep(600); /* lascia finire il precache/put dello SW */
    const crumbsBefore = await num(page, "#res-crumbs");
    await context.setOffline(true);
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#tower .apt", { timeout: 8000 });
    const crumbsAfter = await num(page, "#res-crumbs");
    if (crumbsAfter !== crumbsBefore)
      throw new Error(`progressi persi offline (${crumbsBefore} → ${crumbsAfter})`);
    await context.setOffline(false);
  });

  await t("niente errori JS non catturati durante la sessione", async () => {
    if (pageErrors.length) throw new Error(pageErrors.join(" | "));
  });
} catch (err) {
  failed += 1;
  console.error("  ✗ errore fatale del test browser");
  console.error("   ", err.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill("SIGTERM");
}

console.log(`\n${passed} superati, ${failed} falliti\n`);
process.exit(failed ? 1 : 0);
