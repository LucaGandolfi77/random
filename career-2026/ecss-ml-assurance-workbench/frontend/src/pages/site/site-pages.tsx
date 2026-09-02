import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, BookOpen, Download, FileText, FlaskConical, Layers, Printer, Radio, ShieldCheck, Terminal } from "lucide-react";
import { Seo, JsonLd } from "../../components/seo/Seo";
import { endpoints } from "../../api/endpoints";
import { getPublication, profile, publications } from "../../content";
import type { Article } from "../../content";
import { useToast } from "../../hooks/useToast";
import { StartDemoButton } from "../../components/features/GuidedDemo";
import { joinClassName } from "../../utils/format";

const DECISION_TONE: Record<string, string> = {
  GO: "border-emerald-500/40 text-emerald-300",
  CONDITIONAL_GO: "border-amber-500/40 text-amber-300",
  REVIEW_REQUIRED: "border-amber-500/40 text-amber-300",
  DEFERRED: "border-sky-500/40 text-sky-300",
  NO_GO: "border-red-500/40 text-red-300",
};

export function DecisionChip({ value }: { value: string }) {
  return (
    <span className={joinClassName("rounded border px-1.5 py-0.5 text-[10px] font-semibold", DECISION_TONE[value] ?? "border-slate-600/60 text-slate-300")}>
      {value}
    </span>
  );
}

function ProjectCardMini({ id, className }: { id: string; className?: string }) {
  const project = profile.projects.find((p) => p.id === id);
  if (!project) return null;
  return (
    <Link to={`/site-projects/${project.slug}`} className={joinClassName("text-xs text-accent-300 hover:underline", className)}>
      {project.title}
    </Link>
  );
}

export function PublicationCard({ article, index }: { article: Article; index: number }) {
  const project = profile.projects.find((p) => p.id === article.featuredProject);
  return (
    <article className="panel flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span>Engineering note {String(index + 1).padStart(2, "0")}</span>
        <span>·</span>
        <span>{article.category}</span>
        <span>·</span>
        <span>{article.publicationDate}</span>
        <span>·</span>
        <span>{article.readingTime} min</span>
        <span className="ml-auto rounded border border-emerald-500/40 px-1 text-emerald-300">{article.status}</span>
      </div>
      <h3 className="text-base font-semibold text-slate-100">
        <Link to={`/publications/${article.slug}`} className="hover:text-accent-300">
          {article.title}
        </Link>
      </h3>
      <p className="text-xs leading-relaxed text-slate-400">{article.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-500">Tags: {article.tags.join(", ")}</span>
        <Link to={`/publications/${article.slug}`} className="ml-auto text-accent-300 hover:underline">
          Read article →
        </Link>
      </div>
      {project && <ProjectCardMini id={project.id} className="self-start" />}
    </article>
  );
}

/* ---------------------------------------------------------------- Home */
export function HomePage() {
  return (
    <>
      <Seo
        title={profile.professionalTitle}
        description={profile.tagline}
        path="/"
      />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: profile.name || profile.professionalTitle,
        jobTitle: profile.professionalTitle,
        description: profile.summary,
      }} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10">
        {/* hero */}
        <section className="grid items-center gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-300">ML Assurance · Embedded AI · Aerospace software</p>
            <h1 className="text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">{profile.professionalTitle}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">{profile.tagline}</p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              {profile.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/site-projects" className="btn-primary">Explore Projects</Link>
              <Link to="/flagship" className="btn-secondary">View Flagship Project</Link>
              <Link to="/workbench" className="btn-secondary">Open ML Assurance Workbench</Link>
              <Link to="/publications" className="btn-secondary">Read Publications</Link>
              <Link to="/cv" className="btn-secondary">View CV</Link>
            </div>
            <p className="text-[11px] italic text-slate-500">
              Engineering portfolio. All projects are synthetic or simulated demonstration environments;
              results are marked accordingly. No ECSS certification is claimed.
            </p>
          </div>
          <div className="panel space-y-2 p-4 text-xs">
            <p className="field-label">Engineering focus</p>
            {[
              { icon: Terminal, label: "Embedded AI", detail: "inference on constrained hardware · memory and latency analysis · embedded Linux integration" },
              { icon: FlaskConical, label: "ML Verification and Validation", detail: "requirement-based verification · dataset traceability · robustness · OOD · evidence collection" },
              { icon: ShieldCheck, label: "Space AI Assurance", detail: "Operational Design Domain · FMEA/FMECA · SEU fault injection · residual risk · deployment decisions" },
              { icon: Activity, label: "Runtime Safety", detail: "deterministic safety cages · fallback logic · monitoring · drift detection" },
            ].map((item) => (
              <div key={item.label} className="flex gap-2 rounded border border-slate-800 p-2">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden />
                <div>
                  <p className="font-medium text-slate-200">{item.label}</p>
                  <p className="text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* featured projects */}
        <section aria-labelledby="featured-projects">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="featured-projects" className="text-xl font-semibold text-slate-100">Featured projects</h2>
              <p className="text-xs text-slate-400">Assurance-oriented engineering projects with explicit results and limits.</p>
            </div>
            <Link to="/site-projects" className="text-xs text-accent-300 hover:underline">All projects →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {profile.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        {/* flagship */}
        <section className="panel overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div className="space-y-3">
              <span className="rounded border border-accent-500/40 px-1.5 py-0.5 text-[10px] uppercase text-accent-300">Flagship case study</span>
              <h2 className="text-xl font-semibold text-slate-50">Lunar Landing Safety Cage</h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Designed and verified an ML-assisted lunar landing simulator using physics-based fallback,
                out-of-distribution detection and a deterministic runtime safety cage. Developed an
                operational design domain, functional FMEA and automated fault-injection campaign covering
                sensor faults, inference errors, timing failures and neural-network bit flips.
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                <li>0 released violations across 500 Monte Carlo profiles (simulation)</li>
                <li>OOD detection rate 0.94 on terrain subset</li>
                <li>Fallback activation at 74 ms median (delay injection)</li>
              </ul>
              <p className="text-[11px] italic text-slate-500">Results obtained in a synthetic or simulated engineering environment.</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/flagship" className="btn-primary">Read the case study</Link>
                <Link to="/portfolio/PRJ-LLS-001" className="btn-secondary">Open in Workbench</Link>
              </div>
            </div>
            <div className="space-y-2">
              <ArchitectureDiagram />
            </div>
          </div>
        </section>

        {/* publications preview */}
        <section aria-labelledby="publications">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="publications" className="text-xl font-semibold text-slate-100">Publications</h2>
              <p className="text-xs text-slate-400">Technical articles and engineering notes published on this portfolio.</p>
            </div>
            <Link to="/publications" className="text-xs text-accent-300 hover:underline">All articles →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {publications.map((article, index) => (
              <PublicationCard key={article.slug} article={article} index={index} />
            ))}
          </div>
        </section>

        {/* cta */}
        <section className="panel flex flex-col items-center gap-3 p-8 text-center">
          <Radio className="h-6 w-6 text-accent-400" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-100">Open to technical collaboration</h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Embedded AI · ML verification and validation · aerospace software · simulation · fault injection ·
            AI assurance. Contact details are configurable in the profile file.
          </p>
          <Link to="/contact" className="btn-primary">Contact</Link>
        </section>
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: (typeof profile.projects)[number] }) {
  return (
    <article className="panel flex h-full flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span>{project.category}</span>
        <span className="ml-auto rounded border border-slate-700 px-1 text-slate-400">{project.status}</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100">
        <Link to={`/site-projects/${project.slug}`} className="hover:text-accent-300">{project.title}</Link>
      </h3>
      <p className="text-xs text-slate-400">{project.shortDescription}</p>
      <dl className="mt-auto space-y-1 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Deployment decision</dt>
          <dd><DecisionChip value={project.deploymentDecision} /></dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Top metric</dt>
          <dd className="text-right text-accent-300">{project.topMetric}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Main limitation</dt>
          <dd className="text-right text-amber-300">{project.mainLimitation}</dd>
        </div>
      </dl>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link to={`/site-projects/${project.slug}`} className="btn-secondary !px-2 !py-1 !text-[11px]">View case study</Link>
        <Link to={`/portfolio/${project.id}`} className="btn-secondary !px-2 !py-1 !text-[11px]">Workbench</Link>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- Architecture diagram */
const FLOW: Array<{ label: string; kind: "input" | "ml" | "guard" | "output" }> = [
  { label: "Sensor Inputs", kind: "input" },
  { label: "Input Validation", kind: "guard" },
  { label: "OOD Detection", kind: "guard" },
  { label: "ML Estimator", kind: "ml" },
  { label: "Physics-Based Estimator", kind: "guard" },
  { label: "Consistency Check", kind: "guard" },
  { label: "Deterministic Safety Cage", kind: "guard" },
  { label: "Command Acceptance or Rejection", kind: "output" },
  { label: "Fallback Controller", kind: "output" },
  { label: "Runtime Monitoring and Logging", kind: "output" },
];

export function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto" aria-label="Safety cage architecture pipeline">
      <ol className="flex min-w-[420px] flex-col gap-1">
        {FLOW.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center font-mono text-[10px] text-slate-600">{index + 1}</span>
            <span
              className={joinClassName(
                "flex-1 rounded border px-2 py-1.5 text-[11px]",
                step.kind === "input" && "border-slate-600 bg-base-800 text-slate-300",
                step.kind === "ml" && "border-sky-500/50 bg-sky-500/10 text-sky-200",
                step.kind === "guard" && "border-cyan-500/50 bg-accent-600/10 text-accent-200",
                step.kind === "output" && "border-violet-500/40 bg-violet-500/10 text-violet-200",
              )}
            >
              {step.label}
            </span>
            {index < FLOW.length - 1 && <span className="text-slate-600" aria-hidden>↓</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- Expertise */
const AREAS = [
  { name: "Embedded AI Engineering", ids: ["embedded-inference", "quantization", "cpp-python-docker"] },
  { name: "ML Verification", ids: ["ml-vv", "data-quality", "robustness", "ood"] },
  { name: "Space AI Assurance", ids: ["odd-definition", "seu-injection", "fmea"] },
  { name: "Runtime Safety", ids: ["safety-cage", "monitoring"] },
];

export function ExpertisePage() {
  return (
    <>
      <Seo title="Expertise" description="Twelve engineering competencies demonstrated by the portfolio projects." path="/expertise" />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-slate-100">Expertise</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Every competency below is tied to a concrete artefact in this portfolio: a project, an evidence
            item, or an engineering note. Buzzwords are mapped to work.
          </p>
        </header>
        {AREAS.map((area) => (
          <section key={area.name} aria-labelledby={area.name.replace(/\s+/g, "-")}>
            <h2 id={area.name.replace(/\s+/g, "-")} className="mb-3 text-lg font-semibold text-accent-300">{area.name}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {area.ids.map((id) => {
                const comp = profile.competencies.find((c) => c.id === id);
                if (!comp) return null;
                return <CompetencyCard key={id} competency={comp} />;
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function CompetencyCard({ competency }: { competency: (typeof profile.competencies)[number] }) {
  return (
    <article className="panel flex h-full flex-col gap-2 p-4">
      <h3 className="text-sm font-semibold text-slate-100">{competency.label}</h3>
      <p className="text-xs leading-relaxed text-slate-400">{competency.definition}</p>
      <p className="text-[11px] text-slate-500">Techniques: {competency.techniques.join(" · ")}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px]">
        <ProjectCardMini id={competency.project} className="self-start" />
        {competency.article && (
          <Link to={`/publications/${competency.article}`} className="text-accent-300 hover:underline">
            related article
          </Link>
        )}
        {competency.evidence && <span className="font-mono text-slate-500">evidence: {competency.evidence}</span>}
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- Projects */
export function SiteProjectsPage() {
  return (
    <>
      <Seo title="Projects" description="Four assurance-oriented engineering projects with decisions, metrics and limits." path="/site-projects" />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-slate-100">Engineering projects</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Assurance-oriented engineering projects built with the ML Assurance Workbench. They are technical
            demonstrations and simulations — not flight systems. Decisions and limits from the Workbench are
            shown as-is.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {profile.projects.map((project) => (
            <article key={project.id} className="panel flex h-full flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                <span>{project.category}</span>
                <span className="rounded border border-slate-700 px-1">{project.status}</span>
                <span className="ml-auto font-mono normal-case">{project.id}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-100">{project.title}</h2>
              <p className="text-sm text-slate-300">{project.shortDescription}</p>
              <dl className="grid gap-2 text-xs">
                <div><dt className="field-label">Problem</dt><dd className="text-slate-300">{project.problem}</dd></div>
                <div><dt className="field-label">Contribution</dt><dd className="text-slate-300">{project.contribution}</dd></div>
                <div><dt className="field-label">Verification</dt><dd className="text-slate-300">{project.verification}</dd></div>
                <div><dt className="field-label">Stack</dt><dd className="text-slate-400">{project.stack.join(" · ")}</dd></div>
                <div><dt className="field-label">Top metric (synthetic)</dt><dd className="text-accent-300">{project.topMetric}</dd></div>
                <div><dt className="field-label">Main limitation</dt><dd className="text-amber-300">{project.mainLimitation}</dd></div>
                <div><dt className="field-label">Deployment decision</dt><dd><DecisionChip value={project.deploymentDecision} /></dd></div>
              </dl>
              <p className="text-[11px] italic text-slate-500">Results obtained in a synthetic or simulated engineering environment.</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link to={`/site-projects/${project.slug}`} className="btn-primary">View case study</Link>
                <Link to={`/portfolio/${project.id}`} className="btn-secondary">Open in Workbench</Link>
                <EvidencePackageButton projectId={project.id} label="Evidence package" variant="ghost" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

export function EvidencePackageButton({ projectId, label, variant = "secondary" }: {
  projectId: string; label?: string; variant?: "primary" | "secondary" | "ghost";
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const generateAndDownload = async () => {
    setBusy(true);
    try {
      const pkg = await endpoints.generatePortfolioPackage(projectId);
      const anchor = document.createElement("a");
      anchor.href = endpoints.portfolioPackageDownloadUrl(pkg.id);
      anchor.download = "";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success(`Evidence package v${pkg.package_version} generated and downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Evidence package generation failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className={variant === "ghost" ? "btn text-accent-300 hover:underline" : `btn-${variant}`} disabled={busy} onClick={() => void generateAndDownload()} aria-label={`Download evidence package for ${projectId}`}>
      <Download className="h-3.5 w-3.5" aria-hidden />
      {busy ? "Generating…" : (label ?? "Download evidence package")}
    </button>
  );
}

export function ProjectCaseStudyPage() {
  const { slug = "" } = useParams();
  const project = profile.projects.find((p) => p.slug === slug);
  if (!project) {
    return <div className="p-10 text-center text-sm text-slate-400">Project not found.</div>;
  }
  const article = publications.find((a) => a.featuredProject === project.id);
  return (
    <>
      <Seo title={project.title} description={project.shortDescription} path={`/site-projects/${slug}`} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Breadcrumb items={[{ label: "Projects", to: "/site-projects" }, { label: project.title }]} />
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">{project.category} · {project.id}</p>
          <h1 className="text-2xl font-semibold text-slate-100">{project.title}</h1>
          <p className="text-sm text-slate-300">{project.shortDescription}</p>
        </header>
        <dl className="panel grid gap-3 p-5 text-sm sm:grid-cols-2">
          <div><dt className="field-label">Problem</dt><dd className="text-slate-300">{project.problem}</dd></div>
          <div><dt className="field-label">Contribution</dt><dd className="text-slate-300">{project.contribution}</dd></div>
          <div className="sm:col-span-2"><dt className="field-label">Verification approach</dt><dd className="text-slate-300">{project.verification}</dd></div>
          <div><dt className="field-label">Top metric (synthetic)</dt><dd className="text-accent-300">{project.topMetric}</dd></div>
          <div><dt className="field-label">Main limitation</dt><dd className="text-amber-300">{project.mainLimitation}</dd></div>
          <div><dt className="field-label">Deployment decision</dt><dd><DecisionChip value={project.deploymentDecision} /></dd></div>
          <div><dt className="field-label">Stack</dt><dd className="text-slate-400">{project.stack.join(" · ")}</dd></div>
        </dl>
        <p className="text-[11px] italic text-slate-500">Results obtained in a synthetic or simulated engineering environment.</p>

        <section className="panel space-y-3 p-5">
          <h2 className="text-base font-semibold text-slate-100">What this demonstrates</h2>
          <p className="text-xs leading-relaxed text-slate-300">{project.verification}</p>
          <h2 className="text-base font-semibold text-slate-100">What remains unverified</h2>
          <p className="text-xs leading-relaxed text-amber-300">{project.mainLimitation}. Additional target/hardware or independent validation is required before any real deployment.</p>
          <h2 className="text-base font-semibold text-slate-100">Not a certification claim</h2>
          <p className="text-xs leading-relaxed text-slate-400">This is an ECSS-informed engineering demonstration. It does not constitute certification, qualification, formal approval, or proof of compliance, and it does not replace independent review.</p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link to={`/portfolio/${project.id}`} className="btn-primary">Full project data in Workbench</Link>
          {article && <Link to={`/publications/${article.slug}`} className="btn-secondary">Related article</Link>}
          <EvidencePackageButton projectId={project.id} />
        </div>
      </div>
    </>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden>/</span>}
            {item.to ? <Link to={item.to} className="hover:text-accent-300">{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------------- Flagship */
export function FlagshipPage() {
  return (
    <>
      <Seo title="Flagship Project — Lunar Landing Safety Cage" description="Case study: deterministic safety cage for an ML lunar landing simulator." path="/flagship" />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Flagship" }]} />
        <header className="space-y-3">
          <span className="rounded border border-accent-500/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-300">Flagship case study</span>
          <h1 className="text-3xl font-semibold text-slate-50">Lunar Landing Safety Cage</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            Designed and verified an ML-assisted lunar landing simulator using physics-based fallback,
            out-of-distribution detection and a deterministic runtime safety cage. Developed an operational
            design domain, functional FMEA and automated fault-injection campaign covering sensor faults,
            inference errors, timing failures and neural-network bit flips.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/portfolio/PRJ-LLS-001" className="btn-primary">Open in Workbench</Link>
            <EvidencePackageButton projectId="PRJ-LLS-001" />
          </div>
        </header>

        <section aria-labelledby="architecture">
          <h2 id="architecture" className="mb-3 text-xl font-semibold text-slate-100">Architecture</h2>
          <p className="mb-3 text-xs text-slate-400">
            Deterministic guards surround the ML estimator; the ML output is a candidate that must pass
            physical and operational checks before release.
          </p>
          <div className="panel p-4">
            <ArchitectureDiagram />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="Component details">
          {[
            ["ML component", "Proposes landing commands (vertical/horizontal velocity, throttle). Treated as a candidate generator, never as the authority."],
            ["Physics-based estimator", "Independent deterministic trajectory projection from state and fuel; shares preprocessing with ML in this design (documented common-mode risk)."],
            ["OOD detection", "Terrain/state features outside the trained regime raise a flag; cage responds with rejection and fallback (rate 0.94 on subset)."],
            ["Deterministic safety cage", "Hard, reviewable constraints: altitude, velocities, fuel margin, projected touchdown velocity."],
            ["Fallback controller", "Deterministic pre-planned guidance within a 100 ms budget (74 ms median on delay injection)."],
            ["Monitoring", "Rejected commands, fallback activations, ML-vs-physics divergence, OOD events, released constraint violations (invariant: zero)."],
          ].map(([title, text]) => (
            <div key={title} className="panel p-4">
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="faults">
          <h2 id="faults" className="mb-3 text-xl font-semibold text-slate-100">Fault-injection campaign</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <caption className="sr-only">Fault-injection campaign categories</caption>
              <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="px-2 py-2">Fault category</th><th className="px-2 py-2">Objective</th>
                  <th className="px-2 py-2">Result</th><th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Sensor dropout", "Pre-planned fallback on lost altimeter", "Fallback activated", "PASS"],
                  ["Sensor noise", "Stable rejection under noise", "False rejection ~1%", "PASS"],
                  ["Incoherent sensors", "Graceful degradation", "Fallback oscillation detected", "FAIL — mitigation open"],
                  ["Inference outlier", "Reject absurd commands", "40/40 rejected", "PASS"],
                  ["Delayed inference", "Fallback within budget", "74 ms median", "PASS"],
                  ["Terrain OOD", "Detect and reject", "Detection rate 0.94", "PASS"],
                  ["Physics divergence", "Reject beyond limit", "Within limit", "PASS"],
                  ["Model bit flips", "Contain corruption via cage", "Cage acts as second line", "PARTIAL — see SEU study"],
                ].map((row) => (
                  <tr key={String(row[0])} className="border-b border-slate-800/60">
                    {row.map((cell, i) => (
                      <td key={i} className={joinClassName("px-2 py-1.5", i === 3 && (cell === "PASS" ? "text-emerald-300" : cell.startsWith("FAIL") ? "text-red-300" : "text-amber-300"))}>{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="decision">
          <h2 id="decision" className="mb-2 text-xl font-semibold text-slate-100">Deployment decision</h2>
          <div className="panel space-y-3 p-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <DecisionChip value="CONDITIONAL_GO" /> <span className="text-slate-300">Demonstration / simulation environment</span>
              <DecisionChip value="REVIEW_REQUIRED" /> <span className="text-slate-300">Hardware-in-the-loop (not yet performed)</span>
              <DecisionChip value="NO_GO" /> <span className="text-slate-300">Real operational flight without independent V&amp;V and HIL</span>
            </div>
            <p className="text-xs text-slate-400">
              This is a simulator and engineering demonstration environment. It is not usable for a real
              landing. Monte Carlo sweep: 0 released violations across 500 synthetic profiles.
            </p>
          </div>
        </section>

        <section aria-labelledby="limits">
          <h2 id="limits" className="mb-2 text-xl font-semibold text-slate-100">Known limitations</h2>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
            <li>Simulator-only validation with simplified fuel and terrain physics.</li>
            <li>Common-mode dependency (shared preprocessing) between ML and physics estimator — INCONCLUSIVE.</li>
            <li>Fallback oscillation on incoherent sensors — mitigation in progress.</li>
            <li>No independent V&V and no hardware-in-the-loop performed.</li>
          </ul>
        </section>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Publications */
export function PublicationsIndexPage() {
  return (
    <>
      <Seo title="Publications" description="Technical articles and engineering notes on space ML verification." path="/publications" />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-slate-100">Publications</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Technical articles and engineering notes published on this portfolio. Original content based on
            the projects in this repository; not journal or conference publications.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {publications.map((article, index) => (
            <PublicationCard key={article.slug} article={article} index={index} />
          ))}
        </div>
      </div>
    </>
  );
}

export function PublicationPage() {
  const { slug = "" } = useParams();
  const article = getPublication(slug);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!article) {
    return <div className="p-10 text-center text-sm text-slate-400">Article not found.</div>;
  }
  const project = profile.projects.find((p) => p.id === article.featuredProject);
  const toc = article.content.filter((s) => s.type === "h2").map((s) => ({ id: s.id ?? "", title: s.title ?? "" }));
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };
  const renderSection = (section: Article["content"][number], index: number) => {
    switch (section.type) {
      case "h2":
        return <h2 key={index} id={section.id} className="mb-2 mt-8 text-lg font-semibold text-slate-100">{section.title}</h2>;
      case "p":
        return <p key={index} className="mb-3 text-sm leading-relaxed text-slate-300">{section.text}</p>;
      case "note":
        return (
          <div key={index} className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
            {section.text}
          </div>
        );
      case "ul":
        return (
          <ul key={index} className="mb-3 list-inside list-disc space-y-1 text-sm text-slate-300">
            {section.items?.map((item) => <li key={item}>{item}</li>)}
          </ul>
        );
      case "checklist":
        return (
          <ul key={index} className="mb-3 space-y-1 rounded border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-slate-300">
            {section.items?.map((item) => (
              <li key={item} className="flex items-start gap-2"><span aria-hidden className="mt-0.5 text-emerald-400">☐</span>{item}</li>
            ))}
          </ul>
        );
      case "table":
        return (
          <div key={index} className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <caption className="sr-only">{section.title ?? "Table"}</caption>
              <thead className="bg-base-800 text-[10px] uppercase text-slate-400">
                <tr>{section.headers?.map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {section.rows?.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-800/60">{row.map((cell, ci) => <td key={ci} className="px-2 py-1.5 text-slate-300">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <>
      <Seo title={article.seoTitle} description={article.seoDescription} path={`/publications/${slug}`} type="article" />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Article",
        headline: article.title, description: article.description,
        datePublished: article.publicationDate, dateModified: article.updatedDate,
        author: { "@type": "Person", name: article.author },
      }} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Breadcrumb items={[{ label: "Publications", to: "/publications" }, { label: article.title }]} />
        <article>
          <header className="space-y-3 border-b border-slate-800 pb-5">
            <p className="text-[10px] uppercase tracking-widest text-accent-300">{article.category} · {article.status}</p>
            <h1 className="text-2xl font-semibold leading-tight text-slate-50 sm:text-3xl">{article.title}</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{article.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>Published {article.publicationDate}</span>
              <span>Updated {article.updatedDate}</span>
              <span>{article.readingTime} min read</span>
              <span>by {article.author}</span>
              <button className="text-accent-300 hover:underline" onClick={() => void copyLink()} aria-live="polite">
                {copied ? "Link copied" : "Copy article link"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => <span key={tag} className="rounded bg-base-800 px-1.5 py-0.5 text-[10px] text-slate-400">{tag}</span>)}
            </div>
          </header>

          <div className="mt-4 flex flex-col gap-8 lg:flex-row">
            <nav aria-label="Table of contents" className="lg:w-60 lg:shrink-0">
              <p className="field-label">Table of contents</p>
              <ol className="space-y-1 border-l border-slate-800 text-xs">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="block border-l-2 border-transparent py-0.5 pl-3 text-slate-400 hover:border-accent-400 hover:text-accent-300">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0 max-w-none flex-1 [&>p]:max-w-[70ch]">
              {article.content.map((section, index) => renderSection(section, index))}
            </div>
          </div>
        </article>

        <aside className="panel flex flex-wrap items-center gap-3 p-4 text-xs">
          <BookOpen className="h-4 w-4 text-accent-400" aria-hidden />
          {project ? (
            <>
              <span className="text-slate-300">Related project:</span>
              <Link to={`/site-projects/${project.slug}`} className="text-accent-300 hover:underline">{project.title}</Link>
              <Link to={`/portfolio/${project.id}`} className="text-accent-300 hover:underline">Workbench</Link>
              <EvidencePackageButton projectId={project.id} label="Evidence package" variant="ghost" />
            </>
          ) : (
            <span className="text-slate-400">Related project: see Workbench.</span>
          )}
          <Link to="/workbench" className="ml-auto text-accent-300 hover:underline">ML Assurance Workbench →</Link>
        </aside>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- CV */
export function CvPage() {
  return (
    <>
      <Seo title="CV — Embedded AI & ML Verification Engineer" description="Curriculum vitae: embedded AI and ML verification for space systems." path="/cv" />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "CV" }]} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => window.print()} data-testid="print-cv">
              <Printer className="h-4 w-4" aria-hidden /> Print CV
            </button>
            <button
              className="btn-secondary"
              onClick={() => window.print()}
              title="Use your browser's Save as PDF destination to create a PDF."
            >
              <Download className="h-4 w-4" aria-hidden /> Download CV (PDF via print)
            </button>
          </div>
        </div>

        <article className="cv-page space-y-6 rounded-lg border border-slate-800 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none print:p-0" data-testid="cv">
          <header className="border-b-2 border-slate-800 pb-3 print:border-slate-900">
            <h1 className="text-xl font-bold text-slate-900">{profile.name || profile.professionalTitle}</h1>
            <p className="mt-1 text-sm font-semibold">{profile.professionalTitle}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
              CV version {profile.version} · updated {profile.lastUpdated}
            </p>
          </header>

          <section aria-labelledby="cv-summary">
            <h2 id="cv-summary" className="text-sm font-bold uppercase tracking-wide">Professional summary</h2>
            <p className="mt-1 text-xs leading-relaxed">{profile.summary}</p>
          </section>

          <section aria-labelledby="cv-competencies">
            <h2 id="cv-competencies" className="text-sm font-bold uppercase tracking-wide">Core competencies</h2>
            <ul className="mt-1 list-inside list-decimal space-y-0.5 text-xs">
              {profile.competencies.map((c) => (
                <li key={c.id}>
                  {c.label}
                  <span className="text-slate-500"> — demonstrated in {profile.projects.find((p) => p.id === c.project)?.title ?? "portfolio"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="cv-skills">
            <h2 id="cv-skills" className="text-sm font-bold uppercase tracking-wide">Technical skills</h2>
            {[
              ["Programming", profile.skills.programming],
              ["Embedded and systems", profile.skills.embeddedAndSystems],
              ["AI and ML", profile.skills.aiAndMl],
              ["Verification and assurance", profile.skills.verificationAndAssurance],
              ["Tools", profile.skills.tools],
            ].map(([title, items]) => (
              <div key={String(title)} className="mt-1">
                <h3 className="text-xs font-semibold">{String(title)}</h3>
                <p className="text-xs text-slate-800">{String((items as string[]).join(", "))}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="cv-projects">
            <h2 id="cv-projects" className="text-sm font-bold uppercase tracking-wide">Selected projects</h2>
            <div className="mt-2 space-y-3">
              {profile.projects.map((p) => (
                <div key={p.id} className="break-inside-avoid">
                  <p className="text-xs font-semibold">{p.title} <span className="font-normal text-slate-600">— {p.category}</span></p>
                  <p className="text-[11px] italic text-slate-700">{p.contribution}</p>
                  <p className="text-[11px] text-slate-700">Verification: {p.verification}</p>
                  <p className="text-[11px] text-slate-700">Stack: {p.stack.join(", ")}</p>
                  <p className="text-[11px] text-slate-700">Top metric: {p.topMetric} <em>(synthetic or simulated)</em></p>
                  <p className="text-[11px] text-slate-700">Deployment decision: {p.deploymentDecision} · Case study and evidence package in the portfolio repository.</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="cv-flagship">
            <h2 id="cv-flagship" className="text-sm font-bold uppercase tracking-wide">Flagship project</h2>
            <p className="mt-1 text-xs leading-relaxed">
              Designed and verified an ML-assisted lunar landing simulator using physics-based fallback,
              out-of-distribution detection and a deterministic runtime safety cage. Developed an operational
              design domain, functional FMEA and automated fault-injection campaign covering sensor faults,
              inference errors, timing failures and neural-network bit flips.
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              <li>Defined the Operational Design Domain and explicit nominal, degraded and prohibited operating regions.</li>
              <li>Implemented automated fault-injection scenarios for sensors, timing, inference outputs and model parameters.</li>
              <li>Connected requirements, test results, FMEA items, evidence and residual risks through an assurance workbench.</li>
              <li>Validated a deterministic fallback strategy while documenting remaining simulation and hardware-in-the-loop limitations.</li>
            </ul>
            <p className="mt-1 text-[11px] italic">Synthetic or simulated engineering environment; not a flight system.</p>
          </section>

          <section aria-labelledby="cv-education" className="print:hidden">
            <h2 id="cv-education" className="text-sm font-bold uppercase tracking-wide">Repository and portfolio</h2>
            <p className="mt-1 text-xs">
              Project data, evidence packages, technical articles and the ML Assurance Workbench live in the
              repository linked from this portfolio (see Contact). All claims in this CV correspond to
              artefacts that can be inspected there.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Workbench hub / Contact */
export function WorkbenchPage() {
  const capabilities = [
    "Data Readiness Review", "ODD definition", "requirements traceability", "model documentation",
    "robustness testing", "resilience testing", "OOD analysis", "fault injection", "SEU analysis",
    "FMEA", "residual risk", "deterministic safety cages", "deployment gates", "monitoring strategies",
    "Evidence Package generation",
  ];
  return (
    <>
      <Seo
        title="ML Assurance Workbench — Trustworthy AI for Embedded and Space Systems"
        description="An ML Assurance Workbench demonstrating data readiness, operational design domains, model verification, FMEA, runtime assurance and deployment evidence across four aerospace-oriented projects."
        path="/workbench"
      />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <section className="space-y-5">
          <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">Trustworthy AI for Embedded and Space Systems</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            An ML Assurance Workbench demonstrating data readiness, operational design domains, model
            verification, FMEA, runtime assurance and deployment evidence across four aerospace-oriented
            projects.
          </p>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-400">
            This project provides an ECSS-informed engineering demonstration for AI/ML assurance. It does
            not constitute certification, qualification, formal approval, or proof of compliance.
          </p>
          <div className="flex flex-wrap gap-2">
            <StartDemoButton />
            <a href="/portfolio" className="btn-secondary">Open four projects</a>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="btn-secondary">OpenAPI docs</a>
          </div>
        </section>

        <section aria-labelledby="problem">
          <h2 id="problem" className="text-xl font-semibold text-slate-100">Problem</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            ML components for embedded and space systems cannot be trusted on accuracy alone. Engineers
            need traceable requirements, explicit test verdicts, documented failure modes, residual-risk
            acceptance, monitoring plans and verifiable evidence — organized so that gaps stay visible
            and decisions stay human.
          </p>
        </section>

        <section aria-labelledby="capabilities">
          <h2 id="capabilities" className="mb-3 text-xl font-semibold text-slate-100">Key capabilities</h2>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <li key={capability} className="rounded border border-slate-800 px-3 py-2 text-slate-300">{capability}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="workbench-apps" className="space-y-4">
          <h2 id="workbench-apps" className="text-xl font-semibold text-slate-100">Explore the Workbench</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Layers, title: "Week-3 portfolio", description: "Full project data: requirements, tests, FMEA, risks, decisions and evidence packages.", to: "/portfolio" },
              { icon: Activity, title: "Workbench projects", description: "Data Readiness Inspector flows (upload CSV → analysis → report).", to: "/projects" },
              { icon: ShieldCheck, title: "Assurance registry", description: "Registry views for tracked projects and packages.", to: "/assurance" },
              { icon: FileText, title: "API docs", description: "OpenAPI documentation for the backend.", to: "/docs" },
            ].map((item) => {
              const card = (
                <div className="panel group flex h-full flex-col gap-2 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <item.icon className="h-4 w-4 text-accent-400" aria-hidden />
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                  <p className="mt-auto text-xs text-accent-300 group-hover:underline">Open →</p>
                </div>
              );
              return item.to === "/docs" ? (
                <a key={item.to} href="/docs" target="_blank" rel="noopener noreferrer">{card}</a>
              ) : (
                <Link key={item.to} to={item.to} className="flex">{card}</Link>
              );
            })}
          </div>
        </section>

        <p className="text-[11px] italic text-slate-500">
          Engineering portfolio — all projects are synthetic or simulated demonstration environments;
          no ECSS certification is claimed. Workbench release candidate v1.0.0-rc.1 (see /api/version).
        </p>
      </div>
    </>
  );
}

export function ContactPage() {
  const email = profile.contact.email;
  return (
    <>
      <Seo title="Contact" description="Contact the Embedded AI & ML Verification Engineer." path="/contact" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold text-slate-100">Contact</h1>
          <p className="text-sm text-slate-400">{profile.contact.availability}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {email ? (
            <a className="panel p-4 text-sm text-accent-300 hover:underline" href={`mailto:${email}`}>Email: {email}</a>
          ) : null}
          {profile.contact.linkedin ? (
            <a className="panel p-4 text-sm text-accent-300 hover:underline" href={profile.contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn profile</a>
          ) : null}
          {profile.contact.github ? (
            <a className="panel p-4 text-sm text-accent-300 hover:underline" href={profile.contact.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          ) : null}
          <p className="panel p-4 text-sm text-slate-300">Location: {profile.contact.location}</p>
        </div>
        {!email && !profile.contact.linkedin && !profile.contact.github && (
          <p className="text-xs italic text-slate-500">
            Contact details are not configured. Add them to <code>frontend/src/content/profile.json</code> —
            no placeholder contact is shown as real.
          </p>
        )}
        <p className="text-xs text-slate-500">
          No server-side contact form is used (no e-mail backend is configured), avoiding fake form
          submissions. Copy the e-mail address or use the link above once configured.
        </p>
      </div>
    </>
  );
}
