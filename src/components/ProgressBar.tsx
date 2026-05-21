export default function ProgressBar({
  value,
  size = "md",
  color = "#EBEDF0",
  showLabel = false,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  showLabel?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  const h = { sm: "h-1", md: "h-1.5", lg: "h-2" }[size];
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${h} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className="text-[11px] tabular-nums text-white/70 w-9 text-right">{v}%</div>
      )}
    </div>
  );
}
