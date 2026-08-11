import Image from "next/image";

import { CHURCH_NAME } from "@/lib/program";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/the-new-logo.png"
      alt={CHURCH_NAME}
      width={size}
      height={size}
      priority
      className="shrink-0"
    />
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 30 : 38} />
      <span className="leading-tight">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
          {CHURCH_NAME}
        </span>
        <span
          className={`block font-extrabold leading-tight ${
            compact ? "text-[15px]" : "text-lg"
          }`}
        >
          21 Days of <span className="text-gradient-gold">Power</span>
        </span>
      </span>
    </span>
  );
}
