// Generates dist/robots.txt and (when VITE_SITE_URL is configured) dist/sitemap.xml.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "dist");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /api/\n");

const siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL;
const staticPaths = ["/", "/expertise", "/site-projects", "/flagship", "/publications", "/cv", "/contact", "/workbench"];
const publicationDir = join(process.cwd(), "src/content/publications");
const publications = existsSync(publicationDir)
  ? readdirSync(publicationDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(publicationDir, f), "utf-8")))
  : [];
const projectSlugs = ["telemetry-anomaly-detector", "onboard-vision-quantization-lab", "seu-fault-injector", "lunar-landing-safety-cage"];

if (siteUrl) {
  const base = siteUrl.replace(/\/$/, "");
  const paths = [
    ...staticPaths,
    ...projectSlugs.map((s) => `/site-projects/${s}`),
    ...publications.map((p) => `/publications/${p.slug}`),
  ];
  const urls = paths
    .map((p) => `  <url><loc>${base}${p}</loc></url>`)
    .join("\n");
  writeFileSync(
    join(out, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  console.log(`sitemap.xml written (${paths.length} urls) to ${siteUrl}`);
} else {
  console.log("VITE_SITE_URL not set — sitemap.xml skipped (domain is configurable, not hardcoded).");
}
