"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createTimeEntryAction } from "@/app/(app)/time/actions";
import { isoDate, fmtHours, TIME_KIND_COLOR } from "@/lib/timeentry";
import type { TimeKind, ProjectType } from "@prisma/client";

type Project = {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  phases: { id: string; name: string; ordinal: number }[];
};

export default function QuickLog({
  projects,
  todayTotal,
}: {
  projects: Project[];
  todayTotal: number;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [phaseId, setPhaseId] = useState<string>("");
  const [hours, setHours] = useState<string>("1");
  const [kind, setKind] = useState<TimeKind>("WORK");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const today = isoDate(new Date());

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const project = projects.find((p) => p.id === projectId);

  const submit = () => {
    setError(null);
    setSuccess(false);
    const h = parseFloat(hours);
    if (!projectId) return setError("Төсөл сонгоно уу");
    if (!h || h <= 0) return setError("Цаг буруу");
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("phaseId", phaseId);
    fd.set("taskId", "");
    fd.set("date", today);
    fd.set("hours", String(h));
    fd.set("kind", kind);
    fd.set("note", note);
    start(async () => {
      const r = await createTimeEntryAction(undefined, fd);
      if (r?.ok) {
        setSuccess(true);
        setNote("");
        setHours("1");
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 800);
      } else setError(r?.error ?? "Алдаа");
    });
  };

  if (projects.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-bd text-[12px] text-sub hover:text-tx hover:border-brand/50 hover:bg-brand/10 transition"
        title="Өнөөдрийн цаг бүртгэх"
      >
        <span className="text-success">⏱</span>
        <span>Өнөөдөр</span>
        <span
          className={`tabular-nums font-semibold ${
            todayTotal > 0 ? "text-success" : "text-tx"
          }`}
        >
          {todayTotal > 0 ? fmtHours(todayTotal) : "0ц"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] panel p-4 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-[13px] font-semibold text-tx">
              Цаг бүртгэх <span className="text-sub font-normal text-[11px]">· {today}</span>
            </div>
            {todayTotal > 0 && (
              <div className="text-[11px] text-success tabular-nums">
                Өнөөдөр: {fmtHours(todayTotal)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div>
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
            <div>
              <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
                Фаз
              </label>
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="input h-9 text-[12px]"
              >
                <option value="">— Сонгох (заавал биш) —</option>
                {project?.phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {String(ph.ordinal + 1).padStart(2, "0")}. {ph.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
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
              <div>
                <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
                  Төрөл
                </label>
                <div className="flex gap-1">
                  {(["WORK", "CLIENT_WAIT", "REVISION"] as TimeKind[]).map((k) => {
                    const on = kind === k;
                    const c = TIME_KIND_COLOR[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`flex-1 h-9 rounded text-[11px] font-semibold transition border ${
                          on ? "text-white" : "text-sub hover:text-tx border-bd"
                        }`}
                        style={
                          on
                            ? { borderColor: c, background: c }
                            : undefined
                        }
                      >
                        {k === "WORK" ? "Ажил" : k === "CLIENT_WAIT" ? "Хүл" : "Зас"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
                Тэмдэглэл
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Заавал биш"
                className="input h-9 text-[12px]"
              />
            </div>
          </div>

          {error && (
            <div className="mt-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-2 text-[11px] text-successInk bg-success/10 border border-success/30 rounded px-2 py-1">
              ✓ Хадгалагдлаа
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-bd">
            <a href="/time" className="text-[11px] text-sub hover:text-tx">
              Долоо хоногийн жагсаалт →
            </a>
            <div className="flex-1" />
            <button
              onClick={() => setOpen(false)}
              className="btn-ghost h-8 px-3 text-[12px]"
            >
              Цуцлах
            </button>
            <button
              onClick={submit}
              disabled={pending}
              className="btn-primary h-8 px-4 text-[12px]"
            >
              {pending ? "..." : "Бүртгэх"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
