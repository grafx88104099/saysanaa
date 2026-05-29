"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import ProgressBar from "@/components/ProgressBar";
import { togglePhaseLockAction } from "@/app/(app)/admin/projects/[id]/tasks/actions";
import { updatePhaseProgressAction } from "@/app/(app)/admin/projects/actions";
import AddTaskForm from "./AddTaskForm";
import TaskRow, { type TaskListItem } from "./TaskRow";
import type { EmpOption } from "@/components/EmployeeMultiPicker";

type Phase = {
  id: string;
  ordinal: number;
  name: string;
  hours: number;
  progressPct: number;
  progressLocked: boolean;
};

export default function PhaseRow({
  projectId,
  phase,
  unit = "HOURS",
  tasks,
  assignees,
  canManage,
  canChangeStatus,
  expanded: defaultExpanded = false,
  onOpenTask,
  myEmpId,
}: {
  projectId: string;
  phase: Phase;
  unit?: "HOURS" | "DAYS";
  tasks: TaskListItem[];
  assignees: EmpOption[];
  canManage: boolean;
  canChangeStatus: boolean;
  expanded?: boolean;
  onOpenTask: (taskId: string) => void;
  myEmpId: string | null;
}) {
  const [open, setOpen] = useState(defaultExpanded || tasks.length > 0);
  const [pending, start] = useTransition();
  // Optimistic local progress for snappy slider UX
  const [localPct, setLocalPct] = useState<number>(phase.progressPct);
  // Dragging flag — guards the useEffect prop-sync so an in-flight server
  // commit cannot snap the slider back while the user is mid-drag.
  const draggingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draggingRef.current) return;
    setLocalPct(phase.progressPct);
  }, [phase.progressPct]);
  const pct = localPct;
  const done = pct === 100;

  const cancelDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const commitProgress = (next: number) => {
    draggingRef.current = true;
    setLocalPct(next);
    cancelDebounce();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      start(async () => {
        await updatePhaseProgressAction(phase.id, next);
        draggingRef.current = false;
      });
    }, 250);
  };

  const onLockToggle = () => {
    // Cancel any pending manual commit so a stale value isn't written after
    // the phase has been flipped back to Auto mode.
    cancelDebounce();
    draggingRef.current = false;
    start(() => togglePhaseLockAction(phase.id, !phase.progressLocked));
  };

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <div className="grid grid-cols-[28px_40px_1fr_120px_60px_220px_120px] items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-white/40 hover:text-white text-[12px] transition"
          aria-label={open ? "Хаах" : "Нээх"}
        >
          {open ? "▾" : "▸"}
        </button>
        <div className="text-[11px] font-mono text-white/35 tabular-nums">
          {String(phase.ordinal).padStart(2, "0")}
        </div>
        <div className={`text-[13px] ${done ? "text-white/55 line-through" : "text-white/90"}`}>
          {phase.name}
        </div>
        <div className="text-[12px] text-white/55 tabular-nums">
          {unit === "DAYS"
            ? `${(phase.hours / 8).toLocaleString("mn-MN", { maximumFractionDigits: 1 })} өдөр`
            : `${phase.hours} ц`}
        </div>
        <div className="text-[11px] tabular-nums text-white/55 text-right">
          {tasks.length} task
        </div>
        {phase.progressLocked && canManage ? (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={pct}
              onChange={(e) => commitProgress(parseInt(e.target.value, 10))}
              className="flex-1 accent-brand"
              title="Прогрэсс гараар тохируулах"
            />
            <span
              className="text-[11px] font-semibold tabular-nums w-9 text-right"
              style={{
                color: done ? "#22C55E" : pct >= 50 ? "#6AA6FF" : "#F59E0B",
              }}
            >
              {pct}%
            </span>
          </div>
        ) : (
          <ProgressBar
            value={pct}
            showLabel
            color={done ? "#22C55E" : pct >= 50 ? "#6AA6FF" : "#F59E0B"}
          />
        )}
        <div className="flex items-center justify-end gap-2">
          {canManage && (
            <button
              type="button"
              onClick={onLockToggle}
              disabled={pending}
              title={
                phase.progressLocked
                  ? "Гар хяналт идэвхтэй — товшиж автомат болгох"
                  : "Автомат тооцоо — товшиж гараар хянах"
              }
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                phase.progressLocked
                  ? "border-white/45 text-white"
                  : "border-white/10 text-white/40 hover:text-white"
              }`}
            >
              {phase.progressLocked ? "🔒 Гар" : "⚙ Авто"}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="bg-white/[0.015] border-t border-white/8">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              canManage={canManage}
              canChangeStatus={canChangeStatus || t.assignee?.id === myEmpId}
              onOpen={() => onOpenTask(t.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="px-4 py-3 text-[12px] text-white/30 text-center">
              Task алга
            </div>
          )}
          {canManage && (
            <AddTaskForm projectId={projectId} phaseId={phase.id} assignees={assignees} />
          )}
        </div>
      )}
    </div>
  );
}
