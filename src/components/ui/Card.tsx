import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`card ${padded ? "p-4 sm:p-5" : ""} ${className}`}>{children}</div>
  );
}

export function SectionTitle({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "gold" | "magenta" | "mint";
}) {
  const toneClass = {
    default: "text-text",
    gold: "text-gold-soft",
    magenta: "text-magenta",
    mint: "text-mint",
  }[tone];

  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">
        {label}
      </p>
      <p className={`mt-1.5 text-3xl font-extrabold tracking-tight ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
