// Content validation for the week-4 professional site.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const fail = (msg) => { failures.push(msg); console.error("FAIL: " + msg); };

const profile = JSON.parse(readFileSync(join(process.cwd(), "src/content/profile.json"), "utf-8"));
if (!profile.professionalTitle) fail("professional title is missing");
if (profile.competencies.length !== 12) fail(`expected 12 competencies, got ${profile.competencies.length}`);
const projectIds = new Set(profile.projects.map((p) => p.id));
if (profile.projects.length !== 4) fail("expected 4 projects");
for (const comp of profile.competencies) {
  if (!projectIds.has(comp.project)) fail(`competency ${comp.id} points to unknown project ${comp.project}`);
}
for (const project of profile.projects) {
  if (!project.title || !project.shortDescription || !project.deploymentDecision || !project.topMetric || !project.mainLimitation) {
    fail(`project ${project.id} missing card fields`);
  }
  if (!/synthetic|simulat/i.test(project.topMetric) && !/synthetic|simulat/i.test(project.shortDescription + project.contribution)) {
    fail(`project ${project.id}: synthetic/simulated origin is not labelled`);
  }
}

const publicationDir = join(process.cwd(), "src/content/publications");
const slugs = new Set(profile.publicationSlugs);
const files = readdirSync(publicationDir).filter((f) => f.endsWith(".json"));
if (files.length !== 4) fail(`expected 4 article files, got ${files.length}`);
for (const file of files) {
  const article = JSON.parse(readFileSync(join(publicationDir, file), "utf-8"));
  if (!slugs.has(article.slug)) fail(`${file}: slug not listed in profile`);
  for (const required of ["title", "description", "publicationDate", "updatedDate", "author", "category", "seoTitle", "seoDescription"]) {
    if (!article[required]) fail(`${file}: missing ${required}`);
  }
  const headings = article.content.filter((s) => s.type === "h2").map((s) => s.title);
  if (!headings.some((h) => /conclusion/i.test(h))) fail(`${file}: missing conclusion`);
  if (!headings.some((h) => /limit/i.test(h))) fail(`${file}: missing limitations section`);
  if (!headings.some((h) => /reference/i.test(h))) fail(`${file}: missing references section`);
  const hasChecklist = article.content.some((s) => s.type === "checklist");
  if (!hasChecklist) fail(`${file}: missing practical checklist`);
  if (!projectIds.has(article.featuredProject)) fail(`${file}: featured project unknown`);
}
for (const slug of slugs) {
  if (!existsSync(join(publicationDir, `${slug}.json`))) fail(`missing article file for ${slug}`);
}
for (const project of profile.projects) {
  if (!existsSync(join(process.cwd(), "src/pages/site/site-pages.tsx"))) fail("site pages missing");
}
if (failures.length) {
  console.error(`\nContent validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log("Content validation passed: profile (12 competencies, 4 projects) and 4 articles OK.");
