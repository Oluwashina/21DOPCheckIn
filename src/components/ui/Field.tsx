import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-text placeholder:text-faint " +
  "transition-colors focus:border-flame/60 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${CONTROL} h-12 ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <select className={`${CONTROL} h-12 appearance-none ${className}`} {...props}>
      {children}
    </select>
  );
}
