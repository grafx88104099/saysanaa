"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  saveGoalAction,
  updateGoalProgressAction,
  deleteGoalAction,
} from "./actions";
import { renderMarkdown } from "@/lib/markdown";

type Goal = {
  id: string;
  title: string;
  body: string | null;
  parentId: string | null;
  progress: number;
  sortOrder: number;
};

export default function GoalsView({
  isManager,
  isAdmin,
  year,
  years,
  goals,
}: {
  isManager: boolean;
  isAdmin: boolean;
  year: number;
  years: number[];
  goals: Goal[];
}) {
  const roots = useMemo(() => goals.filter((g) => !g.parentId), [goals]);
  const childrenOf = useMemo(() => {
    const m = new Map<string, Goal[]>();
    for (const g of goals) {
      if (g.parentId) {
        if (!m.has(g.parentId)) m.set(g.parentId, []);
        m.get(g.parentId)!.push(g);
      }
    }
    return m;
  }, [goals]);

  // Auto-derived parent progress = avg(children) if children exist
  const derivedProgress = useMemo(() => {
    const m = new Map<string, number>();
    for (const root of roots) {
      const ch = childrenOf.get(root.id) ?? [];
      if (ch.length > 0) {
        const avg = ch.reduce((s, c) => s + c.progress, 0) / ch.length;
        m.set(root.id, Math.round(avg));
      } else {
        m.set(root.id, root.progress);
      }
    }
    return m;
  }, [roots, childrenOf]);

  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Зорилго ба зорилт
          </h1>
          <p className="text-sub text-[12px] mt-1">
            {year} оны компанийн зорилго · {goals.length} нийт
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {years.map((y) => (
            <Link
              key={y}
              href={`/goals?year=${y}`}
              className={`px-2.5 py-1 text-[11px] rounded transition tabular-nums ${
                y === year
                  ? "bg-brand text-white"
                  : "text-sub hover:text-tx border border-bd"
              }`}
            >
              {y}
            </Link>
          ))}
          {isManager && (
            <button
              onClick={() => setCreating({ parentId: null })}
              className="btn-primary h-8 px-3 ml-2"
            >
              + Шинэ зорилго
            </button>
          )}
        </div>
      </div>

      {creating && (
        <GoalEditor
          year={year}
          parentId={creating.parentId}
          existing={null}
          onCancel={() => setCreating(null)}
          onSaved={() => setCreating(null)}
        />
      )}
      {editing && (
        <GoalEditor
          year={year}
          parentId={editing.parentId}
          existing={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {roots.length === 0 ? (
        <div className="panel p-10 text-center text-sub text-[12px]">
          {isManager
            ? `${year} он-д зорилго бүртгэгдээгүй. "+ Шинэ зорилго" дарж эхлүүлнэ`
            : "Энэ оны зорилго оруулаагүй байна"}
        </div>
      ) : (
        <div className="space-y-3">
          {roots.map((g) => {
            const children = childrenOf.get(g.id) ?? [];
            const dpct = derivedProgress.get(g.id) ?? g.progress;
            return (
              <GoalCard
                key={g.id}
                goal={g}
                progress={dpct}
                children={children}
                isManager={isManager}
                isAdmin={isAdmin}
                onAddChild={() => setCreating({ parentId: g.id })}
                onEdit={(target) => setEditing(target)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  progress,
  children,
  isManager,
  isAdmin,
  onAddChild,
  onEdit,
}: {
  goal: Goal;
  progress: number;
  children: Goal[];
  isManager: boolean;
  isAdmin: boolean;
  onAddChild: () => void;
  onEdit: (g: Goal) => void;
}) {
  const color =
    progress >= 100 ? "#22C55E" : progress >= 50 ? "#6AA6FF" : "#F59E0B";
  return (
    <div className="panel p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-tx">{goal.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[14px] font-bold tabular-nums"
            style={{ color }}
          >
            {progress}%
          </span>
          {isManager && (
            <>
              <button
                onClick={onAddChild}
                className="text-[11px] text-sub hover:text-tx px-2 py-0.5 border border-bd rounded"
                title="Дэд зорилт нэмэх"
              >
                + Дэд
              </button>
              <button
                onClick={() => onEdit(goal)}
                className="text-[11px] text-sub hover:text-tx px-2 py-0.5 border border-bd rounded"
              >
                Засах
              </button>
              {isAdmin && <DeleteBtn goalId={goal.id} />}
            </>
          )}
        </div>
      </div>

      <div className="h-2 rounded-full bg-bd overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, background: color }}
        />
      </div>

      {goal.body && (
        <div
          className="prose-content text-[13px] text-sub leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(goal.body) }}
        />
      )}

      {children.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-bd">
          {children.map((c) => (
            <SubGoalRow
              key={c.id}
              goal={c}
              isManager={isManager}
              isAdmin={isAdmin}
              onEdit={() => onEdit(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubGoalRow({
  goal,
  isManager,
  isAdmin,
  onEdit,
}: {
  goal: Goal;
  isManager: boolean;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const setPct = (next: number) => {
    start(async () => {
      await updateGoalProgressAction(goal.id, next);
    });
  };
  const color =
    goal.progress >= 100 ? "#22C55E" : goal.progress >= 50 ? "#6AA6FF" : "#F59E0B";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sub text-[11px]">↳</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-tx truncate">{goal.title}</div>
        {goal.body && (
          <div className="text-[11px] text-sub truncate">
            {goal.body.split("\n")[0].slice(0, 120)}
          </div>
        )}
      </div>
      {isManager ? (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={goal.progress}
          disabled={pending}
          onChange={(e) => setPct(parseInt(e.target.value))}
          className="w-32 accent-brand"
          title="Гүйцэтгэлийн хувь"
        />
      ) : (
        <div className="w-32 h-1.5 rounded-full bg-bd overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${goal.progress}%`, background: color }}
          />
        </div>
      )}
      <span
        className="w-10 text-right text-[12px] font-semibold tabular-nums"
        style={{ color }}
      >
        {goal.progress}%
      </span>
      {isManager && (
        <button
          onClick={onEdit}
          className="text-[11px] text-sub hover:text-tx"
        >
          Засах
        </button>
      )}
      {isAdmin && <DeleteBtn goalId={goal.id} small />}
    </div>
  );
}

function DeleteBtn({ goalId, small }: { goalId: string; small?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Зорилгыг устгах уу?")) return;
        start(async () => {
          await deleteGoalAction(goalId);
        });
      }}
      disabled={pending}
      className={`text-sub hover:text-dangerInk ${
        small ? "text-[11px]" : "text-[11px] px-2 py-0.5 border border-bd rounded"
      }`}
    >
      ✕
    </button>
  );
}

function GoalEditor({
  year,
  parentId,
  existing,
  onCancel,
  onSaved,
}: {
  year: number;
  parentId: string | null;
  existing: Goal | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [yearN, setYearN] = useState<number>(year);
  const [sortOrder, setSortOrder] = useState<number>(existing?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    if (!title.trim()) return setError("Гарчиг шаардлагатай");
    const fd = new FormData();
    if (existing) fd.set("id", existing.id);
    fd.set("year", String(yearN));
    fd.set("title", title);
    fd.set("body", body);
    if (parentId) fd.set("parentId", parentId);
    fd.set("sortOrder", String(sortOrder));
    start(async () => {
      const r = await saveGoalAction(undefined, fd);
      if (r?.ok) onSaved();
      else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="panel p-5 mb-4 border-brand/30 bg-brand/[0.04]">
      <div className="text-[11px] text-sub uppercase tracking-wider mb-3">
        {existing ? "Зорилго засах" : parentId ? "Дэд зорилт нэмэх" : "Үндсэн зорилго нэмэх"}
      </div>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Зорилгын гарчиг"
          className="input text-[14px] font-medium"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Дэлгэрэнгүй тайлбар (Markdown)"
          className="input min-h-[120px] py-2 font-mono text-[13px]"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label">Жил</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={yearN}
              onChange={(e) => setYearN(parseInt(e.target.value) || year)}
              className="input h-9 tabular-nums"
            />
          </div>
          <div>
            <label className="label">Эрэмбэ</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="input h-9 tabular-nums"
            />
          </div>
        </div>
      </div>
      {error && (
        <div className="text-[12px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-3 py-2 mt-3">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button onClick={onCancel} className="btn-ghost">Цуцлах</button>
        <button onClick={submit} disabled={pending} className="btn-primary">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </div>
  );
}
