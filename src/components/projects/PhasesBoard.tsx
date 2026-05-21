"use client";
import { useState } from "react";
import PhaseRow from "./PhaseRow";
import TaskKanban from "./TaskKanban";
import TaskDrawer, { type TaskDetail } from "./TaskDrawer";
import type { TaskListItem } from "./TaskRow";
import type { EmpOption } from "@/components/EmployeeMultiPicker";

type Phase = {
  id: string;
  ordinal: number;
  name: string;
  hours: number;
  progressPct: number;
  progressLocked: boolean;
};

type TaskFull = TaskListItem & {
  phaseId: string;
  phaseOrdinal: number;
  phaseName: string;
  description: string | null;
  blockedReason: string | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  checklist: { id: string; text: string; done: boolean; ordinal: number }[];
  attachments: {
    id: string;
    url: string;
    name: string;
    size: number | null;
    createdAt: string;
  }[];
  comments: {
    id: string;
    body: string;
    createdAt: string;
    authorId: string;
    authorName: string;
  }[];
};

export default function PhasesBoard({
  projectId,
  phases,
  tasks,
  assignees,
  canManage,
  canChangeStatus,
  myEmpId,
}: {
  projectId: string;
  phases: Phase[];
  tasks: TaskFull[];
  assignees: EmpOption[];
  canManage: boolean;
  canChangeStatus: boolean;
  myEmpId: string | null;
}) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const opened: TaskDetail | null = (() => {
    if (!openTaskId) return null;
    const t = tasks.find((x) => x.id === openTaskId);
    if (!t) return null;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      dueDate: t.dueDate,
      blockedReason: t.blockedReason,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      phaseName: t.phaseName,
      phaseOrdinal: t.phaseOrdinal,
      checklist: t.checklist,
      attachments: t.attachments,
      comments: t.comments,
    };
  })();

  const tasksByPhase = new Map<string, TaskListItem[]>();
  for (const t of tasks) {
    if (!tasksByPhase.has(t.phaseId)) tasksByPhase.set(t.phaseId, []);
    tasksByPhase.get(t.phaseId)!.push(t);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold tracking-tight">
          Фазын гүйцэтгэл{" "}
          <span className="text-white/40 font-normal">
            · {phases.length} шат · {tasks.length} task
          </span>
        </h2>
        <div className="inline-flex border border-white/12 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-[11px] font-medium transition ${
              view === "list"
                ? "bg-white text-black"
                : "text-white/55 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Жагсаалт
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-[11px] font-medium transition border-l border-white/12 ${
              view === "kanban"
                ? "bg-white text-black"
                : "text-white/55 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Kanban
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[28px_40px_1fr_120px_60px_220px_120px] items-center gap-3 px-4 py-2 border-b border-white/10 text-[10px] font-medium uppercase tracking-wider text-white/40">
            <div></div>
            <div></div>
            <div>Фаз</div>
            <div>Цаг</div>
            <div className="text-right">Task</div>
            <div>Гүйцэтгэл</div>
            <div className="text-right">Хяналт</div>
          </div>
          {phases.map((p) => (
            <PhaseRow
              key={p.id}
              projectId={projectId}
              phase={p}
              tasks={tasksByPhase.get(p.id) ?? []}
              assignees={assignees}
              canManage={canManage}
              canChangeStatus={canChangeStatus}
              onOpenTask={(id) => setOpenTaskId(id)}
              myEmpId={myEmpId}
            />
          ))}
        </div>
      ) : (
        <TaskKanban
          tasks={tasks.map((t) => ({
            ...t,
            phaseId: t.phaseId,
            phaseOrdinal: t.phaseOrdinal,
            phaseName: t.phaseName,
          }))}
          canDrag={canChangeStatus}
          onOpen={(id) => setOpenTaskId(id)}
        />
      )}

      {opened && (
        <TaskDrawer
          task={opened}
          assignees={assignees}
          canManage={canManage}
          myEmpId={myEmpId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </>
  );
}
