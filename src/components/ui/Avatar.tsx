/** Brand secondaries and accents, deepened — initials are white, so gold would wash out. */
const PALETTE = [
  "from-[#2b52a3] to-[#1f3d7b]",
  "from-[#e82d88] to-[#a81a60]",
  "from-[#8a5f92] to-[#5d3d66]",
  "from-[#5b5fd6] to-[#3a3ea3]",
  "from-[#f2555a] to-[#b52f38]",
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
