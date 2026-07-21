"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-1 font-display font-bold", className)}>
      <span className={cn("text-reel", sizes[size])}>REEL</span>
      <span className={cn("text-foreground", sizes[size])}>TV</span>
    </Link>
  );
}
