"use client";
import { useState, useTransition } from "react";
import { fmtDate } from "@/lib/format";
import { TASK_STATUSES, TASK_STATUS_COLOR, TASK_STATUS_LABEL } from "@/lib/labels";
import { updateTaskStatusAction } from "@/app/(app)/admin/projects/[id]/tasks/actions";
import type { TaskStatus } from "@prisma/client";
import type { TaskListItem } from "./TaskRow";

type TaskWithPhase = TaskListItem & {
  phaseId: string;
  phaseOrdinal: number;
  phaseName: string;
};

export default function TaskKanban({
  tasks,
  canDrag,
  onOpen,
}: {
  tasks: TaskWithPhase[];
  canDrag: boolean;
  onOpen: (taskId: string) => void;
}) {
  const [hover, setHover] = useState<TaskStatus | null>(null);
  const [local, setLocal] = useState<TaskWithPhase[]>(tasks);
  const [pending, start] = useTransition();

  // sync if upstream changes
  if (tasks !== undefined && tasks.length !== local.length) {
    // simple refresh on count change
    setLocal(tasks);
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropTo(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const current = local.find((t) => t.id === id);
    if (!current || current.status === status) return;
    setLocal((arr) => arr.map((t) => (t.id === id ? { ...t, status } : t)));
    start(async () => {
      const r = await updateTaskStatusAction(id, status);
      if ("error" in r) {
        setLocal(tasks); // revert
        alert(r.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {TASK_STATUSES.map((status) => {
        const list = local.filter((t) => t.status === status);
        const color = TASK_STATUS_COLOR[status];
        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              setHover(status);
            }}
            onDragLeave={() => setHover((h) => (h === status ? null : h))}
            onDrop={(e) => canDrag && onDropTo(e, status)}
            className={`flex flex-col rounded-lg border transition ${
              hover === status
                ? "border-white/45 bg-white/[0.04]"
                : "border-white/10 bg-white/[0.015]"
            }`}
          >
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  {TASK_STATUS_LABEL[status]}
                </span>
              </div>
              <span className="text-[10px] text-white/40 tabular-nums">{list.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[120px]">
              {list.map((t) => (
                <div
                  key={t.id}
                  draggable={canDrag}
                  onDragStart={(e) => onDragStart(e, t.id)}
                  onClick={() => onOpen(t.id)}
                  className="border border-white/10 rounded p-2.5 bg-bg hover:border-white/30 cursor-pointer transition"
                >
                  <div className="text-[10px] font-mono text-white/35 mb-1">
                    {String(t.phaseOrdinal).padStart(2, "0")} · {t.phaseName}
                  </div>
                  <div className="text-[12px] font-medium leading-snug mb-2 line-clamp-2">
                    {t.title}
                    {t.priority === "HIGH" && (
                      <span className="ml-1 text-[9px] text-amber-300">★</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/45">
                    <div className="flex items-center gap-1.5">
                      {t.assignee ? (
                        t.assignee.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.assignee.photoUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover border border-white/15"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[9px]">
                            {t.assignee.initials}
                          </div>
                        )
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.checklistTotal > 0 && (
                        <span title="Checklist">
                          ☑ {t.checklistDone}/{t.checklistTotal}
                        </span>
                      )}
                      {t.commentCount > 0 && <span>💬 {t.commentCount}</span>}
                      {t.attachmentCount > 0 && <span>📎 {t.attachmentCount}</span>}
                      {t.dueDate && (
                        <span className="tabular-nums">{fmtDate(t.dueDate).slice(5)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="text-center text-[11px] text-white/25 py-4">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
