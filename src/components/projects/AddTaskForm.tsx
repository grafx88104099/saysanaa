"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTaskAction,
  type CreateTaskState,
} from "@/app/(app)/admin/projects/[id]/tasks/actions";
import type { EmpOption } from "@/components/EmployeeMultiPicker";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[11px] text-white/65 hover:text-white transition disabled:opacity-50 px-2 py-1"
    >
      {pending ? "Хадгалж байна…" : "↵ Нэмэх"}
    </button>
  );
}

export default function AddTaskForm({
  projectId,
  phaseId,
  assignees,
}: {
  projectId: string;
  phaseId: string;
  assignees: EmpOption[];
}) {
  const [show, setShow] = useState(false);
  const action = createTaskAction.bind(null, projectId);
  const [state, formAction] = useActionState<CreateTaskState, FormData>(action, undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (show) titleRef.current?.focus();
  }, [show]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state?.ok]);

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="block w-full text-left px-3 py-2 text-[12px] text-white/40 hover:text-white hover:bg-white/[0.02] transition"
      >
        + Task нэмэх
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="px-3 py-2.5 border-t border-white/10 bg-white/[0.015]"
      onKeyDown={(e) => {
        if (e.key === "Escape") setShow(false);
      }}
    >
      <input type="hidden" name="phaseId" value={phaseId} />
      <div className="grid grid-cols-[1fr_140px_100px_70px_60px_auto] gap-2 items-center">
        <input
          ref={titleRef}
          name="title"
          placeholder="Task гарчиг..."
          required
          className="h-8 bg-transparent border border-white/12 rounded px-2 text-[12px] focus:outline-none focus:border-white/45"
        />
        <select
          name="assigneeId"
          defaultValue=""
          className="h-8 bg-transparent border border-white/12 rounded px-2 text-[11px] focus:outline-none focus:border-white/45 [color-scheme:dark]"
        >
          <option value="">Хариуцагч —</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
        <input
          name="dueDate"
          type="date"
          className="h-8 bg-transparent border border-white/12 rounded px-2 text-[11px] focus:outline-none focus:border-white/45 [color-scheme:dark]"
        />
        <input
          name="estimatedHours"
          type="number"
          step="0.5"
          min="0"
          max="500"
          placeholder="ц"
          className="h-8 bg-transparent border border-white/12 rounded px-2 text-[11px] text-right tabular-nums focus:outline-none focus:border-white/45"
        />
        <select
          name="priority"
          defaultValue="NORMAL"
          className="h-8 bg-transparent border border-white/12 rounded px-2 text-[11px] focus:outline-none focus:border-white/45 [color-scheme:dark]"
        >
          <option value="LOW">Бага</option>
          <option value="NORMAL">Дунд</option>
          <option value="HIGH">Өндөр</option>
        </select>
        <div className="flex items-center gap-1">
          <Submit />
          <button
            type="button"
            onClick={() => setShow(false)}
            className="text-[11px] text-white/35 hover:text-white px-2 py-1"
          >
            ✕
          </button>
        </div>
      </div>
      {state?.error && (
        <div className="text-[11px] text-white/70 mt-1">{state.error}</div>
      )}
    </form>
  );
}
