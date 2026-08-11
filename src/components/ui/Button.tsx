"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-flame-gradient text-ink glow-flame hover:brightness-105",
  secondary: "bg-surface-2 text-text border border-line hover:bg-surface-3",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-rose/15 text-rose border border-rose/30 hover:bg-rose/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-5 text-[15px] rounded-2xl",
  lg: "h-14 px-6 text-base rounded-2xl",
};

function classes(variant: Variant, size: Size, fullWidth?: boolean, className?: string) {
  return [
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
    "active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame",
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    className ?? "",
  ].join(" ");
}

interface BaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: BaseProps & ComponentProps<"button">) {
  return (
    <button className={classes(variant, size, fullWidth, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link className={classes(variant, size, fullWidth, className)} {...props}>
      {children}
    </Link>
  );
}
