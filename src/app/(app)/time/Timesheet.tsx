"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  TIME_KIND_LABEL,
  TIME_KIND_COLOR,
  fmtHours,
  isoDate,
  addDays,
} from "@/lib/timeentry";
import { createTimeEntryAction, deleteTimeEntryAction } from "./actions";
import type { TimeKind, ProjectType } from "@prisma/client";

type Entry = {
  id: string;
  date: string;
  hours: number;
  kind: TimeKind;
  note: string | null;
  project: { id: string; code: string; name: string; type: ProjectType };
  phase: { id: string; name: string; ordinal: number } | null;
};
type Project = {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  phases: { id: string; name: string; ordinal: number }[];
};

const WD_FULL = ["Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям", "Ням"];

export default function Timesheet({
  weekStartIso,
  entries,
  projects,
}: {
  weekStartIso: string;
  entries: Entry[];
  projects: Project[];
}) {
  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return { iso: isoDate(d), label: WD_FULL[i], num: d.getDate(), date: d };
      }),
    [weekStart]
  );

  const entriesByDay = useMemo(() => {
    const m: Record<string, Entry[]> = {};
    for (const e of entries) (m[e.date] ||= []).push(e);
    return m;
  }, [entries]);

  const totalByDay: Record<string, number> = {};
  let weekTotal = 0;
  for (const d of days) {
    const sum = (entriesByDay[d.iso] ?? []).reduce((s, e) => s + e.hours, 0);
    totalByDay[d.iso] = sum;
    weekTotal += sum;
  }

  const prevWeek = isoDate(addDays(weekStart, -7));
  const nextWeek = isoDate(addDays(weekStart, 7));
  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${addDays(
    weekStart,
    6
  ).getMonth() + 1}/${addDays(weekStart, 6).getDate()}`;

  const [adding, setAdding] = useState<string | null>(null); // date being added

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Цагийн бүртгэл
          </h1>
          <p className="text-sub text-[12px] mt-1">
            Долоо хоног: {weekLabel} · Нийт{" "}
            <span className="text-tx font-semibold">{fmtHours(weekTotal)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/time?week=${prevWeek}`} className="btn-ghost h-9">←</Link>
          <Link href="/time" className="btn-ghost h-9 px-3">Энэ долоо хоног</Link>
          <Link href={`/time?week=${nextWeek}`} className="btn-ghost h-9">→</Link>
        </div>
      </div>

      {/* Week summary header */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {days.map((d) => {
          const isToday = d.iso === isoDate(new Date());
          const hours = totalByDay[d.iso];
          return (
            <div
              key={d.iso}
              className={`panel p-2.5 text-center ${
                isToday ? "border-brand/60 shadow-[0_0_18px_rgba(106,166,255,0.15)]" : ""
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-sub">{d.label}</div>
              <div className="text-[16px] font-semibold tabular-nums">{d.num}</div>
              <div
                className={`text-[11px] tabular-nums ${
                  hours > 0 ? "text-success" : "text-sub"
                }`}
              >
                {hours > 0 ? fmtHours(hours) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day-by-day entries */}
      <div className="space-y-3">
        {days.map((d) => {
          const dayEntries = entriesByDay[d.iso] ?? [];
          return (
            <DayRow
              key={d.iso}
              day={d}
              entries={dayEntries}
              total={totalByDay[d.iso]}
              projects={projects}
              isAdding={adding === d.iso}
              onToggleAdd={(open) => setAdding(open ? d.iso : null)}
            />
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="mt-6 panel p-6 text-center text-sub text-[12px]">
          Танд оноогдсон идэвхтэй төсөл алга. Цаг бүртгэхийн тулд эхлээд төсөлд хариуцагчаар орох
          ёстой.
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  entries,
  total,
  projects,
  isAdding,
  onToggleAdd,
}: {
  day: { iso: string; label: string; num: number };
  entries: Entry[];
  total: number;
  projects: Project[];
  isAdding: boolean;
  onToggleAdd: (open: boolean) => void;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-semibold">
            {day.label} <span className="text-sub">· {day.num}</span>
          </div>
          {total > 0 && (
            <div className="text-[11px] text-success tabular-nums">{fmtHours(total)}</div>
          )}
        </div>
        <button
          onClick={() => onToggleAdd(!isAdding)}
          className={isAdding ? "btn-ghost h-8 px-3" : "btn-primary h-8 px-3"}
        >
          {isAdding ? "Хаах" : "+ Бүртгэх"}
        </button>
      </div>

      {entries.length === 0 && !isAdding && (
        <div className="text-[12px] text-sub italic">Бүртгэл алга</div>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}
      </div>

      {isAdding && (
        <AddForm
          date={day.iso}
          projects={projects}
          onDone={() => onToggleAdd(false)}
        />
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const [pending, start] = useTransition();
  const color = TIME_KIND_COLOR[entry.kind];
  return (
    <div className="flex items-center gap-3 border border-bd rounded-md px-3 py-2 bg-white/[0.02]">
      <div
        className="w-1 self-stretch rounded-full"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-mono text-sub text-[11px]">{entry.project.code}</span>
          <span className="truncate">{entry.project.name}</span>
          {entry.phase && (
            <span className="text-sub text-[11px] truncate">· {entry.phase.name}</span>
          )}
        </div>
        {entry.note && (
          <div className="text-[11px] text-sub mt-0.5 truncate">{entry.note}</div>
        )}
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        {TIME_KIND_LABEL[entry.kind]}
      </span>
      <div className="text-[14px] font-semibold tabular-nums" style={{ color }}>
        {fmtHours(entry.hours)}
      </div>
      <button
        onClick={() => {
          if (!confirm("Устгах уу?")) return;
          start(async () => {
            await deleteTimeEntryAction(entry.id);
          });
        }}
        disabled={pending}
        className="text-sub hover:text-dangerInk text-[14px] w-6 h-6 flex items-center justify-center"
        title="Устгах"
      >
        ✕
      </button>
    </div>
  );
}

function AddForm({
  date,
  projects,
  onDone,
}: {
  date: string;
  projects: Project[];
  onDone: () => void;
}) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [phaseId, setPhaseId] = useState<string>("");
  const [hours, setHours] = useState<string>("1");
  const [kind, setKind] = useState<TimeKind>("WORK");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const project = projects.find((p) => p.id === projectId);

  const submit = () => {
    setError(null);
    const h = parseFloat(hours);
    if (!projectId) return setError("Төсөл сонгоно уу");
    if (!h || h <= 0) return setError("Цаг буруу");
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("phaseId", phaseId);
    fd.set("taskId", "");
    fd.set("date", date);
    fd.set("hours", String(h));
    fd.set("kind", kind);
    fd.set("note", note);
    start(async () => {
      const r = await createTimeEntryAction(undefined, fd);
      if (r?.ok) {
        setNote("");
        setHours("1");
        onDone();
      } else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="mt-3 panel p-3 border-brand/30 bg-brand/[0.04]">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Төсөл
          </label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPhaseId("");
            }}
            className="input h-9 text-[12px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Фаз
          </label>
          <select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className="input h-9 text-[12px]"
          >
            <option value="">— Сонгох —</option>
            {project?.phases.map((ph) => (
              <option key={ph.id} value={ph.id}>
                {String(ph.ordinal + 1).padStart(2, "0")}. {ph.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Цаг
          </label>
          <input
            type="number"
            step="0.5"
            min={0}
            max={24}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="input h-9 text-[12px] tabular-nums text-center"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Төрөл
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TimeKind)}
            className="input h-9 text-[12px]"
          >
            <option value="WORK">Ажилласан</option>
            <option value="CLIENT_WAIT">Хүлээсэн</option>
            <option value="REVISION">Засвар</option>
          </select>
        </div>
        <div className="col-span-12">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Тэмдэглэл (заавал биш)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Жш: Хана зураг 1-2 байр шинэчилсэн"
            className="input h-9 text-[12px]"
          />
        </div>
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-3">
        <button onClick={onDone} className="btn-ghost h-8 px-3">
          Цуцлах
        </button>
        <button onClick={submit} disabled={pending} className="btn-primary h-8 px-4">
          {pending ? "Хадгалж байна…" : "Бүртгэх"}
        </button>
      </div>
    </div>
  );
}
