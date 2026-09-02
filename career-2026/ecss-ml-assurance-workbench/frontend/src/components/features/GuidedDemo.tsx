import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

interface DemoStep {
  title: string;
  detail: string;
  why: string;
  path: string;
}

const STEPS: DemoStep[] = [
  { title: "Portfolio overview", detail: "The Workbench tracks four aerospace-oriented AI demonstration projects.", why: "Shows the scope before the details.", path: "/portfolio" },
  { title: "Project detail", detail: "Every project exposes requirements, tests, evidence, FMEA, risks, ODD and monitoring.", why: "Assurance data is structured, not prose.", path: "/portfolio/PRJ-TAD-001" },
  { title: "Test verdicts", detail: "PASS, FAIL, BLOCKED and NOT_EXECUTED are distinct — a missing result is never a pass.", why: "Verification must be explicit.", path: "/portfolio/PRJ-SEU-001" },
  { title: "Residual risk & decision", detail: "Acceptance statuses, rationale, and the official deployment decision are visible.", why: "Recommendation and approval stay separate.", path: "/portfolio/PRJ-LLS-001" },
  { title: "Gap analysis", detail: "Deterministic gap rules surface missing documents, unverified requirements and open risks.", why: "Gaps are visible, not hidden by scores.", path: "/portfolio/PRJ-TAD-001/assurance" },
  { title: "Deployment gate", detail: "The gate produces a recommendation and flags inconsistencies with the official decision.", why: "Automatic support, human approval.", path: "/portfolio/PRJ-SEU-001/assurance" },
  { title: "Monitoring strategy", detail: "Metrics, thresholds and pending definitions are listed per project.", why: "Runtime assurance is planned, not assumed.", path: "/portfolio/PRJ-TAD-001/assurance" },
  { title: "Evidence package", detail: "Versioned ZIP packages with manifests and SHA-256 checksums; validation is one click.", why: "Evidence must be verifiable.", path: "/portfolio/PRJ-QNT-001" },
  { title: "Cross-project comparison", detail: "Compare readiness dimensions across the four projects without a single winner score.", why: "Differences are measurable, not ranked.", path: "/portfolio" },
  { title: "Back to the start", detail: "You have seen the core loop: data, model, tests, gaps, gate, evidence.", why: "That is the assurance workflow.", path: "/" },
];

export function StartDemoButton({ label = "Start Guided Demo" }: { label?: string }) {
  return <GuidedDemoLauncher label={label} />;
}

function GuidedDemoLauncher({ label }: { label: string }) {
  const [active, setActive] = useState(false);
  if (!active) {
    return (
      <button className="btn-primary" onClick={() => setActive(true)}>
        <Play className="h-4 w-4" aria-hidden /> {label}
      </button>
    );
  }
  return <GuidedDemo onExit={() => setActive(false)} />;
}

export function GuidedDemo({ onExit }: { onExit: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    setIndex(clamped);
    navigate(STEPS[clamped].path);
  };

  const close = () => {
    setIndex(0);
    onExit();
  };

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-50 border-t border-accent-500/40 bg-base-900/98 p-4 shadow-2xl"
      aria-label={`Guided demo step ${index + 1} of ${STEPS.length}`}
      role="region"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-widest text-accent-300">
            Guided demo — {index + 1}/{STEPS.length}
          </p>
          <button className="text-slate-400 hover:text-white" onClick={close} aria-label="Exit guided demo">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label="Demo progress"
          className="h-1 overflow-hidden rounded bg-base-700"
        >
          <div className="h-full bg-accent-400" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
        <h2 className="text-base font-semibold text-slate-100">{step.title}</h2>
        <p className="text-sm text-slate-300">{step.detail}</p>
        <p className="text-xs text-slate-500">Why it matters: {step.why}</p>
        <p className="text-[10px] italic text-slate-500">
          Demo mode uses synthetic engineering data for demonstration purposes.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button className="btn-secondary" onClick={() => go(index - 1)} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
          </button>
          {index < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={() => go(index + 1)}>
              Next <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button className="btn-primary" onClick={close}>
              Finish demo
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
