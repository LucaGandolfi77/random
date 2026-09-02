import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <p className="font-mono text-4xl text-accent-400">404</p>
      <p className="text-slate-300">This view does not exist.</p>
      <Link to="/projects" className="btn-primary">
        Back to projects
      </Link>
    </div>
  );
}
