/* Audit Lighthouse su una copia locale dell'app.
   Avvia uno static server, lancia Lighthouse con Chromium di Playwright
   e stampa i punteggi (performance, accessibility, best-practices, seo). */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { readFile } from "node:fs/promises";

const PORT = 8261;
const BASE = `http://127.0.0.1:${PORT}`;
const root = new URL("..", import.meta.url).pathname;
const outPath = new URL("../lighthouse-report.json", import.meta.url).pathname;

let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  try {
    const { chromium } = await import("playwright");
    chromePath = chromium.executablePath();
  } catch {
    /* playwright non installato: Lighthouse userà il Chrome di default */
  }
}

async function waitForServer(url, ms = 10000) {
  const deadline = Date.now() + ms;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok) return;
      last = "HTTP " + r.status;
    } catch (e) {
      last = e.message;
    }
    await sleep(150);
  }
  throw new Error(`server non pronto: ${last}`);
}

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: "ignore",
});

try {
  await waitForServer(BASE + "/");

  const args = [
    BASE + "/",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    "--output-path=" + outPath,
    "--quiet",
  ];
  if (chromePath) {
    args.push(`--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage`);
  }

  const lh = spawn("npx", ["lighthouse", ...args], {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ...(chromePath ? { CHROME_PATH: chromePath } : {}) },
  });
  const code = await new Promise((res) => lh.on("exit", res));
  if (code !== 0) throw new Error("Lighthouse exit " + code);

  const report = JSON.parse(await readFile(outPath, "utf8"));
  console.log("\nLighthouse — punteggi");
  for (const [k, v] of Object.entries(report.categories)) {
    console.log(`  ${k.padEnd(16)} ${Math.round(v.score * 100)}`);
  }
  console.log(`\nReport completo: lighthouse-report.json\n`);
} catch (err) {
  console.error("audit fallito:", err.message);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
