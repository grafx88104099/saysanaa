"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addAttachmentAction,
  addChecklistItemAction,
  addCommentAction,
  deleteChecklistItemAction,
  deleteCommentAction,
  deleteTaskAction,
  removeAttachmentAction,
  toggleChecklistItemAction,
  updateTaskAction,
} from "@/app/(app)/admin/projects/[id]/tasks/actions";
import { fmtAgoRelative, fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/labels";
import type { EmpOption } from "@/components/EmployeeMultiPicker";
import Select from "@/components/Select";

export type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  assigneeId: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  dueDate: string | null;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
  phaseName: string;
  phaseOrdinal: number;
  checklist: { id: string; text: string; done: boolean; ordinal: number }[];
  attachments: { id: string; url: string; name: string; size: number | null; createdAt: string }[];
  comments: {
    id: string;
    body: string;
    createdAt: string;
    authorId: string;
    authorName: string;
  }[];
};

export default function TaskDrawer({
  task,
  assignees,
  canManage,
  myEmpId,
  onClose,
}: {
  task: TaskDetail | null;
  assignees: EmpOption[];
  canManage: boolean;
  myEmpId: string | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  async function save(formData: FormData) {
    setBusy(true);
    setErr(null);
    const r = await updateTaskAction(task!.id, formData);
    setBusy(false);
    if (r && "error" in r) setErr(r.error!);
  }

  function onDelete() {
    if (!confirm("Энэ task-ийг устгах уу?")) return;
    start(async () => {
      await deleteTaskAction(task!.id);
      onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] max-w-[90vw] bg-bg border-l border-white/15 z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-bg border-b border-white/10 px-5 py-3 flex items-center justify-between z-10">
          <div className="text-[11px] text-white/45">
            Фаз {String(task.phaseOrdinal).padStart(2, "0")} · {task.phaseName}
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="text-[11px] text-white/45 hover:text-white transition"
              >
                Устгах
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/55 hover:text-white text-[18px] leading-none"
              aria-label="Хаах"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Main edit form */}
          <form
            ref={formRef}
            action={save}
            className="space-y-3"
            onChange={(e) => {
              if (!canManage) e.preventDefault();
            }}
          >
            <input
              name="title"
              defaultValue={task.title}
              disabled={!canManage}
              className="w-full bg-transparent border-b border-white/10 pb-2 text-[17px] font-semibold focus:outline-none focus:border-white/40 disabled:cursor-default"
            />
            <textarea
              name="description"
              defaultValue={task.description ?? ""}
              placeholder="Тайлбар, тэмдэглэл..."
              disabled={!canManage}
              rows={4}
              className="w-full bg-transparent border border-white/12 rounded-md px-3 py-2 text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/45 disabled:cursor-default resize-y"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Хариуцагч">
                <Select
                  name="assigneeId"
                  defaultValue={task.assigneeId ?? ""}
                  size="sm"
                  disabled={!canManage}
                  options={[
                    { value: "", label: "—" },
                    ...assignees.map((a) => ({ value: a.id, label: a.fullName })),
                  ]}
                />
              </Field>
              <Field label="Чухал">
                <Select
                  name="priority"
                  defaultValue={task.priority}
                  size="sm"
                  disabled={!canManage}
                  options={TASK_PRIORITIES.map((p) => ({
                    value: p,
                    label: TASK_PRIORITY_LABEL[p],
                  }))}
                />
              </Field>
              <Field label="Дуусах огноо">
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  disabled={!canManage}
                  className="w-full h-9 bg-transparent border border-white/12 rounded px-2 text-[12px] focus:outline-none focus:border-white/45 [color-scheme:dark]"
                />
              </Field>
              <Field label="Тооцоолсон цаг">
                <input
                  name="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="500"
                  defaultValue={task.estimatedHours ?? ""}
                  disabled={!canManage}
                  className="w-full h-9 bg-transparent border border-white/12 rounded px-2 text-[12px] tabular-nums focus:outline-none focus:border-white/45"
                />
              </Field>
              <Field label="Бодит цаг">
                <input
                  name="actualHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="500"
                  defaultValue={task.actualHours ?? ""}
                  disabled={!canManage}
                  className="w-full h-9 bg-transparent border border-white/12 rounded px-2 text-[12px] tabular-nums focus:outline-none focus:border-white/45"
                />
              </Field>
              <Field label="Сүүлд шинэчилсэн">
                <div className="text-[11px] text-white/55 pt-2">
                  {fmtDateTime(task.updatedAt)}
                </div>
              </Field>
            </div>

            {task.status === "BLOCKED" && (
              <Field label="Саатсан шалтгаан">
                <textarea
                  name="blockedReason"
                  defaultValue={task.blockedReason ?? ""}
                  disabled={!canManage}
                  rows={2}
                  className="w-full bg-transparent border border-white/12 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:border-white/45 resize-y"
                />
              </Field>
            )}

            {canManage && (
              <div className="flex items-center justify-end gap-2 pt-2">
                {err && <div className="text-[11px] text-white/70 mr-auto">{err}</div>}
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary"
                >
                  {busy ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            )}
          </form>

          {/* Checklist */}
          <section className="pt-5 border-t border-white/10">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-3">
              Дэд жагсаалт
            </div>
            <ChecklistEditor
              taskId={task.id}
              items={task.checklist}
              canEdit={canManage || task.assigneeId === myEmpId}
              canDelete={canManage}
            />
          </section>

          {/* Attachments */}
          <section className="pt-5 border-t border-white/10">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-3">
              Хавсралт
            </div>
            <Attachments
              taskId={task.id}
              items={task.attachments}
              canDelete={canManage}
            />
          </section>

          {/* Comments */}
          <section className="pt-5 border-t border-white/10">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-3">
              Сэтгэгдэл
            </div>
            <Comments
              taskId={task.id}
              items={task.comments}
              myEmpId={myEmpId}
              canManage={canManage}
            />
          </section>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function ChecklistEditor({
  taskId,
  items,
  canEdit,
  canDelete,
}: {
  taskId: string;
  items: TaskDetail["checklist"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2 text-[13px] group">
          <input
            type="checkbox"
            checked={it.done}
            disabled={!canEdit}
            onChange={(e) => start(() => toggleChecklistItemAction(it.id, e.target.checked))}
            className="accent-white"
          />
          <span className={it.done ? "text-white/40 line-through" : "text-white/85"}>
            {it.text}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={() => start(() => deleteChecklistItemAction(it.id))}
              className="ml-auto text-[11px] text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            start(async () => {
              await addChecklistItemAction(taskId, t);
              setText("");
            });
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="+ Дэд зүйл нэмэх"
            className="flex-1 h-8 bg-transparent border-b border-white/10 px-1 text-[12px] focus:outline-none focus:border-white/40"
          />
          {text && (
            <button
              type="submit"
              disabled={pending}
              className="text-[11px] text-white/65 hover:text-white px-2"
            >
              ↵
            </button>
          )}
        </form>
      )}
    </div>
  );
}

function Attachments({
  taskId,
  items,
  canDelete,
}: {
  taskId: string;
  items: TaskDetail["attachments"];
  canDelete: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("taskId", taskId);
      const res = await fetch("/api/upload/task-attachment", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const r = await addAttachmentAction(taskId, data.url, data.name, data.size);
      if (r && "error" in r) throw new Error(r.error);
    } catch (e: any) {
      setErr(e.message || "Алдаа");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 border border-white/10 rounded px-3 py-1.5 text-[12px]"
        >
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-white/85 hover:text-white"
            title={a.name}
          >
            📎 {a.name}
          </a>
          <span className="text-[10px] text-white/35 tabular-nums">
            {a.size ? fmtBytes(a.size) : ""}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={() => start(() => removeAttachmentAction(a.id))}
              disabled={pending}
              className="text-[11px] text-white/35 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <input
        ref={fileRef}
        type="file"
        onChange={onPick}
        disabled={busy}
        id={`upload-task-${taskId}`}
        className="hidden"
      />
      <label
        htmlFor={`upload-task-${taskId}`}
        className={`block text-[12px] text-white/45 hover:text-white border border-dashed border-white/12 rounded px-3 py-2 cursor-pointer transition ${
          busy ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {busy ? "Илгээж байна…" : "+ Файл хавсаргах (max 20MB)"}
      </label>
      {err && <div className="text-[11px] text-white/70">{err}</div>}
    </div>
  );
}

function Comments({
  taskId,
  items,
  myEmpId,
  canManage,
}: {
  taskId: string;
  items: TaskDetail["comments"];
  myEmpId: string | null;
  canManage: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {items.map((c) => {
        const mine = c.authorId === myEmpId;
        return (
          <div key={c.id} className="text-[13px] group">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-medium">{c.authorName}</span>
              <span className="text-[10px] text-white/35">{fmtAgoRelative(c.createdAt)}</span>
              {(mine || canManage) && (
                <button
                  type="button"
                  onClick={() => start(() => deleteCommentAction(c.id))}
                  className="ml-auto text-[10px] text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition"
                >
                  Устгах
                </button>
              )}
            </div>
            <div className="text-white/80 whitespace-pre-wrap break-words">{c.body}</div>
          </div>
        );
      })}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = body.trim();
          if (!t) return;
          start(async () => {
            const r = await addCommentAction(taskId, t);
            if (r && "error" in r) alert(r.error);
            else setBody("");
          });
        }}
        className="pt-2 border-t border-white/8"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Сэтгэгдэл бичих..."
          className="w-full bg-transparent border border-white/12 rounded px-3 py-2 text-[12px] placeholder:text-white/25 focus:outline-none focus:border-white/45 resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn-primary"
          >
            {pending ? "Илгээж байна…" : "Илгээх"}
          </button>
        </div>
      </form>
    </div>
  );
}
