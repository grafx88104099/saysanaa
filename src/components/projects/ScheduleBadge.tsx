import { STATUS_COLOR, STATUS_LABEL, type ExpectedProgress } from "@/lib/projectProgress";

/**
 * Compact ahead/behind chip for project list rows.
 * Hides itself when the project hasn't started or is already done — keeps lists clean.
 */
export default function ScheduleBadge({
  expected,
  size = "sm",
}: {
  expected: ExpectedProgress;
  size?: "xs" | "sm";
}) {
  if (
    expected.status === "NOT_STARTED" ||
    expected.status === "COMPLETED" ||
    expected.daysTotal === 0
  ) {
    return null;
  }
  const color = STATUS_COLOR[expected.status];
  const label = STATUS_LABEL[expected.status];
  const showDelta =
    expected.status === "AHEAD" ||
    expected.status === "BEHIND" ||
    expected.status === "OVERDUE";
  const deltaSign = expected.delta > 0 ? "+" : "";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${
        size === "xs"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-0.5 text-[10px]"
      }`}
      style={{
        color,
        background: `${color}1A`,
        border: `1px solid ${color}40`,
      }}
      title={`Бодит ${expected.actualPct}% / Хүлээгдэх ${expected.expectedPct}%`}
    >
      <span className="uppercase tracking-wider">{label}</span>
      {showDelta && (
        <span className="tabular-nums">
          {deltaSign}
          {Math.abs(expected.delta)}%
        </span>
      )}
    </span>
  );
}
