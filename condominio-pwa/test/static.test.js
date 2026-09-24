/* Verifica statica: id HTML usati dal JS, e coerenza dei selettori. */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "style.css"), "utf8");
const jsFiles = readdirSync(join(root, "js")).map((f) => join(root, "js", f));
const js = jsFiles.map((f) => readFileSync(f, "utf8")).join("\n");

let fail = 0;
const ok = (m) => console.log("  ✓", m);
const bad = (m) => {
  console.error("  ✗", m);
  fail = 1;
};

console.log("\nVerifica statica\n");

/* 1. ogni $('id') / getElementById esiste nell'HTML */
const ids = new Set();
for (const m of js.matchAll(/\$\("([^"]+)"\)/g)) ids.add(m[1]);
for (const m of js.matchAll(/getElementById\("([^"]+)"\)/g)) ids.add(m[1]);
/* id creati dinamicamente nelle sheet */
const dynamic = new Set([
  "btn-reset",
  "btn-install",
  "btn-verbale-new",
  "btn-verbale-close",
  "btn-postcard",
  "btn-export",
  "btn-import",
  "import-file",
  "btn-tour-next",
  "btn-tour-restart",
  "btn-tour-close",
  "stamps-row",
]);
const htmlIds = new Set();
for (const m of html.matchAll(/\bid="([^"]+)"/g)) htmlIds.add(m[1]);

const missing = [...ids].filter((i) => !htmlIds.has(i) && !dynamic.has(i));
missing.length ? bad(`id mancanti in index.html: ${missing.join(", ")}`) : ok(`tutti gli ${ids.size} id referenziati esistono`);

/* 2. id dell'HTML mai referenziati? (informativo) */
const unused = [...htmlIds].filter((i) => !ids.has(i) && !js.includes(`"${i}"`));
ok(`id HTML totali: ${htmlIds.size} (non referenziati: ${unused.join(", ") || "nessuno"})`);

/* 3. ogni data-* gestito ha un corrispettivo markup */
const handled = new Set();
for (const m of js.matchAll(/\[data-([a-z-]+)[\]=]/g)) handled.add(m[1]);
const emitted = new Set();
for (const m of js.matchAll(/data-([a-z-]+)="/g)) emitted.add(m[1]);
const handledNotEmitted = [...handled].filter((h) => !emitted.has(h));
handledNotEmitted.length
  ? bad(`handler senza markup: ${handledNotEmitted.join(", ")}`)
  : ok(`tutti i ${handled.size} attributi data-* gestiti vengono emessi`);

const emittedNotHandled = [...emitted].filter((e) => !handled.has(e) && e !== "view" && e !== "tab" && e !== "floor" && e !== "index" && e !== "slot" && e !== "unlock");
ok(`data-* emessi: ${[...emitted].sort().join(", ")}`);

/* 4. classi usate nel JS presenti nel CSS o nell'HTML */
const cssClasses = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) cssClasses.add(m[1]);
const jsClasses = new Set();
for (const m of js.matchAll(/classList\.(?:add|toggle|remove)\("([\w-]+)"/g)) jsClasses.add(m[1]);
for (const m of js.matchAll(/class="([^"{]+)"/g)) m[1].split(/\s+/).forEach((c) => c && jsClasses.add(c));
const noStyle = [...jsClasses].filter((c) => !cssClasses.has(c));
noStyle.length ? bad(`classi senza regola CSS: ${noStyle.join(", ")}`) : ok(`tutte le ${jsClasses.size} classi hanno una regola CSS`);

/* 5. asset precache del service worker */
const sw = readFileSync(join(root, "sw.js"), "utf8");
const assets = [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]);
const missingAsset = assets.filter((a) => a && !existsSync(join(root, a)));
missingAsset.length ? bad(`asset precache mancanti: ${missingAsset.join(", ")}`) : ok(`service worker: ${assets.length} asset presenti su disco`);

/* 5b. manifest PWA: share_target relativo e icon esistenti */
try {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const st = manifest.share_target;
  if (!st || st.method !== "GET" || !st.action) bad("manifest: share_target GET mancante");
  else if (/^https?:/i.test(st.action)) bad("manifest: share_target deve essere un path relativo");
  else ok("manifest: share_target GET relativo presente");
  const iconMissing = (manifest.icons || []).filter((i) => !existsSync(join(root, i.src)));
  iconMissing.length ? bad(`manifest: icone mancanti ${iconMissing.map((i) => i.src).join(", ")}`) : ok(`manifest: ${(manifest.icons || []).length} icone su disco`);
} catch (e) {
  bad("manifest.json non leggibile: " + e.message);
}

/* 6. nessun riferimento a URL esterni */
const external = [...js.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
external.length ? bad(`URL esterni nel JS: ${external.join(", ")}`) : ok("nessuna dipendenza da rete: giocabile offline");

console.log("");
process.exit(fail);
