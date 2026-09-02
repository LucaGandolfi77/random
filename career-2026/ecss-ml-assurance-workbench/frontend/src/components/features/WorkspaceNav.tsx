import { Link } from "react-router-dom";
import { ArrowLeft, Boxes, Hexagon, Layers, Satellite } from "lucide-react";

/** Small top navigation shared by the workspace-level pages (projects + assurance registry). */
export function WorkspaceNav() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-base-900/60 p-1 text-xs">
        <Link
          to="/projects"
          className="flex items-center gap-2 rounded px-2 py-1 text-slate-300 hover:bg-base-800 hover:text-white"
        >
          <Satellite className="h-3.5 w-3.5 text-accent-400" />
          Workbench projects
        </Link>
        <Link to="/assurance" className="flex items-center gap-2 rounded px-2 py-1 text-slate-300 hover:bg-base-800 hover:text-white">
          <Boxes className="h-3.5 w-3.5" />
          Assurance registry
        </Link>
        <Link to="/portfolio" className="flex items-center gap-2 rounded bg-accent-600/15 px-2 py-1 text-accent-300">
          <Layers className="h-3.5 w-3.5" />
          Portfolio (week 3)
        </Link>
        <span className="ml-auto hidden items-center gap-1 pr-2 text-slate-500 sm:flex">
          <Hexagon className="h-3 w-3" /> ECSS-informed · not certified
        </span>
      </div>
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-accent-300">
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}
