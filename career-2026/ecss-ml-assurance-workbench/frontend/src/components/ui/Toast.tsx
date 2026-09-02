import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { ToastContext, type ToastKind } from "../../hooks/useToast";
import { joinClassName } from "../../utils/format";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = {
    push,
    success: (message: string) => push("success", message),
    error: (message: string) => push("error", message),
    info: (message: string) => push("info", message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={joinClassName(
              "pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg",
              toast.kind === "success" && "border-emerald-500/40 bg-base-800 text-emerald-200",
              toast.kind === "error" && "border-red-500/40 bg-base-800 text-red-200",
              toast.kind === "info" && "border-sky-500/40 bg-base-800 text-sky-200",
            )}
          >
            {toast.kind === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {toast.kind === "error" && <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button className="text-slate-400 hover:text-white" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
