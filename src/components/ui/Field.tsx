"use client";

import { useState, type ComponentProps, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "../icons";

const CONTROL =
  "w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-text placeholder:text-faint " +
  "transition-colors focus:border-gold/60 focus:outline-none";

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

/** Password field with a reveal toggle — typing one on a phone is error-prone. */
export function PasswordInput({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input
        type={visible ? "text" : "password"}
        className={`${CONTROL} h-12 pr-12 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-faint transition-colors hover:text-muted"
      >
        {visible ? <EyeOffIcon width={19} height={19} /> : <EyeIcon width={19} height={19} />}
      </button>
    </span>
  );
}

export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <select className={`${CONTROL} h-12 appearance-none ${className}`} {...props}>
      {children}
    </select>
  );
}
