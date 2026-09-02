import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClassName } from "../../utils/format";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "btn text-slate-300 hover:bg-base-800",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button className={joinClassName(variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}
