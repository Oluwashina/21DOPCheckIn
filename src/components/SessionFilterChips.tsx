"use client";

import { shortTimeLabel } from "@/lib/program";
import type { Session } from "@/lib/types";

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              active
                ? "border-gold/50 bg-gold/15 text-gold-soft"
                : "border-line bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {option.label}
            {option.hint ? (
              <span className="ml-1.5 text-[11px] font-medium opacity-70">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function sessionChipOptions(sessions: Session[]) {
  return [
    { value: "all", label: "All day" },
    ...sessions.map((session) => ({
      value: session.id,
      label: session.name.replace(" Series", ""),
      hint: shortTimeLabel(session.time),
    })),
  ];
}
