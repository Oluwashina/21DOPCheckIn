export function ProgressBar({
  value,
  tone = "flame",
  height = "h-2",
  label,
}: {
  /** 0–100 */
  value: number;
  tone?: "flame" | "violet" | "mint";
  height?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = {
    flame: "bg-flame-gradient",
    violet: "bg-violet-gradient",
    mint: "bg-mint",
  }[tone];

  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="font-semibold text-text">{clamped}%</span>
        </div>
      ) : null}
      <div
        className={`w-full overflow-hidden rounded-full bg-surface-3 ${height}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${fill}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 12,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-flame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd96b" />
            <stop offset="100%" stopColor="#f5a524" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-surface-3)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ring-flame)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
