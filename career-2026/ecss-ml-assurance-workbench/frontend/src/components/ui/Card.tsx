import type { ReactNode } from "react";
import { joinClassName } from "../../utils/format";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Card({ title, subtitle, actions, children, className, bodyClassName }: CardProps) {
  return (
    <section className={joinClassName("panel", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={joinClassName("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
