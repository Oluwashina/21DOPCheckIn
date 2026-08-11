const PALETTE = [
  "from-[#ff8a3d] to-[#ff5a0f]",
  "from-[#8f74ff] to-[#6a45ff]",
  "from-[#2fd6a5] to-[#12a67d]",
  "from-[#ff5c8a] to-[#e0316a]",
  "from-[#48b8ff] to-[#1f7ee0]",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-lg",
  }[size];

  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${paletteFor(
        name,
      )} ${dimensions}`}
    >
      {initialsOf(name)}
    </div>
  );
}
