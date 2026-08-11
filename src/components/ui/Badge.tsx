import type { ReactNode } from "react";

type Tone = "neutral" | "flame" | "violet" | "mint" | "muted" | "rose";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-text border-line",
  flame: "bg-flame/15 text-flame-soft border-flame/30",
  violet: "bg-violet/15 text-violet border-violet/30",
  mint: "bg-mint/15 text-mint border-mint/30",
  muted: "bg-surface-2 text-faint border-line",
  rose: "bg-rose/15 text-rose border-rose/30",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2 text-flame">
      <span className="absolute inset-0 rounded-full bg-flame" />
      <span className="pulse-ring absolute inset-0 rounded-full" />
    </span>
  );
}
