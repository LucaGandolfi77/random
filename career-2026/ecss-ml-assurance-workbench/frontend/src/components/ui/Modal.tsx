import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { joinClassName } from "../../utils/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={joinClassName(
          "relative max-h-[90vh] w-full overflow-y-auto rounded-lg border border-slate-700 bg-base-850 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
