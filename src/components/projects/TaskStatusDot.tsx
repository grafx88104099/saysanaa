import { TASK_STATUS_COLOR } from "@/lib/labels";
import type { TaskStatus } from "@prisma/client";

export default function TaskStatusDot({
  status,
  size = 12,
}: {
  status: TaskStatus;
  size?: number;
}) {
  const color = TASK_STATUS_COLOR[status];
  const filled = status === "DONE" || status === "DOING";
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}`,
        background: filled ? color : "transparent",
      }}
      title={status}
    >
      {status === "DONE" && (
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0B0D10"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {status === "BLOCKED" && (
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      )}
    </span>
  );
}
