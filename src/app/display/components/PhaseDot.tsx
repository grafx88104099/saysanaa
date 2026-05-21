function color(pct: number) {
  if (pct >= 100) return "#3FCF8E";
  if (pct >= 50) return "#8B95FF";
  if (pct > 0) return "#E5B85C";
  return "rgba(235,237,240,0.15)";
}

export default function PhaseDot({
  ordinal,
  progressPct,
  name,
  size = 44,
}: {
  ordinal: number;
  progressPct: number;
  name: string;
  size?: number;
}) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, progressPct)) / 100) * c;
  const accent = color(progressPct);

  return (
    <div
      className="flex flex-col items-center gap-1"
      title={`${String(ordinal).padStart(2, "0")} · ${name} · ${progressPct}%`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
            fill="none"
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums"
          style={{ color: progressPct > 0 ? accent : "rgba(235,237,240,0.35)" }}
        >
          {String(ordinal).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
