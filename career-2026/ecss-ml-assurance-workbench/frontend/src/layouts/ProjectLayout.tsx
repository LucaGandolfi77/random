import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Boxes,
  Database,
  FileCheck2,
  FileJson,
  FileWarning,
  FlaskConical,
  Gauge,
  Hexagon,
  LayoutDashboard,
  Menu,
  Radar,
  Satellite,
  Settings,
  ShieldCheck,
  Siren,
  X,
} from "lucide-react";
import { useHealth, useProject, useDataset } from "../hooks/useProjectData";
import { joinClassName, shortId } from "../utils/format";
import { STATUS_LABEL } from "../types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
}

const CORE_NAV: NavItem[] = [
  { to: "overview", label: "Overview", icon: LayoutDashboard },
  { to: "project", label: "Project Information", icon: FileCheck2 },
  { to: "dataset", label: "Dataset", icon: Database },
  { to: "data-readiness", label: "Data Readiness", icon: Gauge },
  { to: "findings", label: "Findings", icon: FileWarning },
  { to: "reports", label: "Reports", icon: FileJson },
  { to: "settings", label: "Settings", icon: Settings },
];

const FUTURE_NAV: NavItem[] = [
  { to: "odd", label: "Operational Design Domain", icon: Boxes, soon: true },
  { to: "model-verification", label: "Model Verification", icon: FlaskConical, soon: true },
  { to: "robustness", label: "Robustness", icon: Radar, soon: true },
  { to: "ood", label: "OOD Detection", icon: Activity, soon: true },
  { to: "fmea", label: "FMEA / FMECA", icon: Siren, soon: true },
  { to: "safety-cage", label: "Safety Cage", icon: ShieldCheck, soon: true },
  { to: "runtime-monitoring", label: "Runtime Monitoring", icon: Hexagon, soon: true },
];

function StatusPill({ backendOk }: { backendOk: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 sm:inline-flex">
      <span className={joinClassName("h-1.5 w-1.5 rounded-full", backendOk ? "bg-emerald-400" : "bg-red-400")} />
      {backendOk ? "Backend online" : "Backend offline"}
    </span>
  );
}

function SidebarContent({ projectId, onNavigate }: { projectId: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: dataset } = useDataset(projectId);
  const status = project?.status ?? "";
  const statusColor =
    status === "Review Required"
      ? "text-amber-300 border-amber-500/40"
      : status === "Analysis Completed" || status === "Ready for Next Stage"
        ? "text-emerald-300 border-emerald-500/40"
        : "text-slate-300 border-slate-600/50";

  const go = (to: string) => {
    onNavigate?.();
    navigate(to);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      {project && (
        <div className="rounded-md border border-slate-800 bg-base-900/60 px-3 py-2">
          <p className="truncate text-xs font-semibold text-slate-100">{project.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
            <span className={joinClassName("rounded border px-1", statusColor)}>{STATUS_LABEL[status] ?? status}</span>
            <span className="font-mono">v{project.version}</span>
            {dataset && <span>{dataset.row_count.toLocaleString()} rows</span>}
          </p>
        </div>
      )}
      <nav aria-label="Project sections">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Assurance modules</p>
        <ul className="space-y-0.5">
          {CORE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    joinClassName(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition",
                      isActive ? "bg-accent-600/15 text-accent-300" : "text-slate-300 hover:bg-base-800 hover:text-white",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
        <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Planned (week 2+)</p>
        <ul className="space-y-0.5">
          {FUTURE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <button
                  type="button"
                  onClick={() => go(`/projects/${projectId}/coming-soon/${item.label}`)}
                  className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-600"
                  aria-disabled="true"
                  title={`${item.label} — planned for a later iteration`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="rounded border border-slate-700 px-1 text-[9px] uppercase text-slate-500">soon</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: project } = useProject(projectId);
  const { data: health } = useHealth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-slate-800 bg-base-900/95 px-3 backdrop-blur">
        <button
          className="rounded-md border border-slate-700 p-1.5 text-slate-300 lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Satellite className="h-5 w-5 text-accent-400" />
          <span className="hidden text-sm font-semibold text-slate-100 sm:inline">ML Assurance Workbench</span>
          <span className="rounded border border-slate-700 px-1 text-[9px] uppercase text-slate-500">week 1</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusPill backendOk={health?.status === "ok"} />
          <button
            onClick={() => navigate("/projects")}
            className="btn-secondary !py-1 !text-xs"
            title="Change project"
            aria-label="Change project"
          >
            {project ? `${shortId(project.id)}` : "Projects"}
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-base-900/50 lg:block">
          <SidebarContent projectId={projectId} />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-slate-800 bg-base-900">
              <div className="flex justify-end p-2">
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent projectId={projectId} onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
