import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-400" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}…
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center" role="alert">
      <CircleAlert className="h-6 w-6 text-red-400" />
      <p className="text-sm text-red-200">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon ?? <Inbox className="h-8 w-8 text-slate-600" />}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
