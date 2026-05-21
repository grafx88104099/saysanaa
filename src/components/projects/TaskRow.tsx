"use client";
import { useState, useTransition } from "react";
import { fmtDate } from "@/lib/format";
import { TASK_STATUSES, TASK_STATUS_COLOR, TASK_STATUS_LABEL } from "@/lib/labels";
import { updateTaskStatusAction } from "@/app/(app)/admin/projects/[id]/tasks/actions";
import TaskStatusDot from "./TaskStatusDot";
import type { TaskStatus } from "@prisma/client";

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "LOW" | "NORMAL" | "HIGH";
  assignee: {
    id: string;
    initials: string;
    fullName: string;
    photoUrl: string | null;
  } | null;
  dueDate: string | null;
  estimatedHours: number | null;
  attachmentCount: number;
  commentCount: number;
  checklistDone: number;
  checklistTotal: number;
};

export default function TaskRow({
  task,
  canManage,
  canChangeStatus,
  onOpen,
}: {
  task: TaskListItem;
  canManage: boolean;
  canChangeStatus: boolean;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<TaskStatus>(task.status);

  function pick(s: TaskStatus) {
    if (s === status) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setStatus(s);
    start(async () => {
      const r = await updateTaskStatusAction(task.id, s);
      if ("error" in r) {
        setStatus(task.status);
        alert(r.error);
      }
    });
  }

  const done = status === "DONE";
  const dueOver =
    task.dueDate && new Date(task.dueDate) < new Date() && status !== "DONE";

  return (
    <div className="group relative grid grid-cols-[28px_1fr_24px_120px_60px_48px] items-center gap-2 py-2 px-3 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.02] text-[12px]">
      {/* Status dot — clickable */}
      <div className="relative">
        <button
          type="button"
          onClick={() => canChangeStatus && setOpen((o) => !o)}
          disabled={!canChangeStatus || pending}
          className="flex items-center justify-center p-1 -m-1 rounded hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default"
        >
          <TaskStatusDot status={status} size={14} />
        </button>
        {open && (
          <div className="absolute left-0 top-7 z-20 bg-bg border border-white/15 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.6)] py-1 min-w-[140px]">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 hover:bg-white/[0.05]"
              >
                <TaskStatusDot status={s} size={12} />
                <span style={{ color: TASK_STATUS_COLOR[s] }}>{TASK_STATUS_LABEL[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <button
        type="button"
        onClick={onOpen}
        className={`text-left truncate transition ${
          done ? "text-white/40 line-through" : "text-white/90 hover:text-white"
        }`}
        title={task.title}
      >
        {task.title}
        {task.priority === "HIGH" && (
          <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-300">
            ★
          </span>
        )}
      </button>

      {/* indicators (attach, comment, checklist) */}
      <div className="flex items-center gap-1.5 text-[10px] text-white/35 justify-end">
        {task.checklistTotal > 0 && (
          <span title="Checklist" className="tabular-nums">
            ☑ {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.commentCount > 0 && <span title="Сэтгэгдэл">💬 {task.commentCount}</span>}
        {task.attachmentCount > 0 && <span title="Хавсралт">📎 {task.attachmentCount}</span>}
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2 min-w-0">
        {task.assignee ? (
          <>
            {task.assignee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.assignee.photoUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover border border-white/15"
              />
            ) : (
              <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[9px]">
                {task.assignee.initials}
              </div>
            )}
            <span className="text-[11px] truncate text-white/65">
              {task.assignee.fullName}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-white/30">—</span>
        )}
      </div>

      {/* Due date */}
      <div
        className={`text-[11px] tabular-nums text-right ${
          dueOver ? "text-red-300" : "text-white/45"
        }`}
      >
        {task.dueDate ? fmtDate(task.dueDate) : "—"}
      </div>

      {/* Hours */}
      <div className="text-[11px] tabular-nums text-right text-white/45">
        {task.estimatedHours ? `${task.estimatedHours}ц` : "—"}
      </div>
    </div>
  );
}
