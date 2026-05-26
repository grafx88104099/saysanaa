"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { persistSnapshotAction, deleteSnapshotAction } from "./actions";
import type { KpiPeriodType } from "@prisma/client";

const LETTER_BG: Record<string, string> = {
  "A+": "linear-gradient(135deg,#6AA6FF,#8B5CF6)",
  A: "#6AA6FF",
  B: "#F59E0B",
  C: "#6B7390",
  "—": "#1F2333",
};

type Snap = {
  employeeId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  composite: number;
  letter: string;
  efficiency: number;
  onTime: number;
  quality: number;
  lowRevision: number;
  gradeMatch: number;
  closedCount: number;
  activeCount: number;
  normHours: number;
  actualHours: number;
  workHours: number;
  clientWaitHours: number;
  revisionHours: number;
  computedAt: string;
};

type Hist = { type: KpiPeriodType; key: string; label: string; computedAt: string };

export default function ReportsClient({
  type,
  periodKey,
  periodLabel,
  periodChoices,
  snapshots,
  history,
}: {
  type: KpiPeriodType;
  periodKey: string;
  periodLabel: string;
  periodChoices: string[];
  snapshots: Snap[];
  history: Hist[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const runPersist = () => {
    setMsg(null);
    start(async () => {
      const r = await persistSnapshotAction(type, periodKey);
      if (r?.ok) setMsg({ type: "ok", text: `${r.count} ажилтны snapshot хадгалагдлаа` });
      else setMsg({ type: "err", text: r?.error ?? "Алдаа" });
    });
  };

  const runDelete = (t: KpiPeriodType, k: string) => {
    if (!confirm(`${k} snapshot устгах уу?`)) return;
    setMsg(null);
    start(async () => {
      const r = await deleteSnapshotAction(t, k);
      if (r?.ok) setMsg({ type: "ok", text: "Устгагдлаа" });
      else setMsg({ type: "err", text: r?.error ?? "Алдаа" });
    });
  };

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="panel p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            {(["MONTH", "QUARTER", "YEAR"] as KpiPeriodType[]).map((t) => {
              const on = t === type;
              return (
                <Link
                  key={t}
                  href={`/admin/kpi/reports?type=${t}`}
                  className={`px-3 py-1.5 text-[12px] rounded transition ${
                    on
                      ? "bg-brand text-white"
                      : "text-sub hover:text-tx border border-bd"
                  }`}
                >
                  {t === "MONTH" ? "Сарын" : t === "QUARTER" ? "Улирлын" : "Жилийн"}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {msg && (
              <span
                className={`text-[11px] px-2 py-1 rounded ${
                  msg.type === "ok"
                    ? "bg-success/15 text-successInk border border-success/30"
                    : "bg-danger/15 text-dangerInk border border-danger/30"
                }`}
              >
                {msg.text}
              </span>
            )}
            <button
              onClick={runPersist}
              disabled={pending}
              className="btn-primary h-9 px-3"
            >
              {pending ? "Хадгалж байна…" : `💾 ${periodLabel} snapshot үүсгэх`}
            </button>
            {snapshots.length > 0 && (
              <a
                href={`/api/admin/kpi/export?type=${type}&key=${periodKey}`}
                className="btn-ghost h-9 px-3"
                download
              >
                ⬇ CSV экспорт
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {periodChoices.map((p) => {
            const on = p === periodKey;
            return (
              <Link
                key={p}
                href={`/admin/kpi/reports?type=${type}&key=${p}`}
                className={`px-2 py-1 text-[11px] rounded tabular-nums transition ${
                  on
                    ? "bg-white/[0.06] text-tx border border-brand/40"
                    : "text-sub hover:text-tx border border-bd"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Snapshot table */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-tx">
            {periodLabel} ·{" "}
            <span className="text-sub font-normal">
              {snapshots.length} ажилтан
            </span>
          </h2>
          {snapshots.length > 0 && (
            <span className="text-[11px] text-sub">
              Сүүлд: {new Date(snapshots[0].computedAt).toLocaleString("mn-MN")}
            </span>
          )}
        </div>

        {snapshots.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="text-sub text-[13px] mb-3">
              Энэ хугацааны snapshot үүсгэгдээгүй байна
            </div>
            <button onClick={runPersist} disabled={pending} className="btn-primary">
              {pending ? "Хадгалж байна…" : `💾 ${periodLabel}-ийн snapshot үүсгэх`}
            </button>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Ажилтан</th>
                  <th className="text-center px-3 py-2 font-medium">Оноо</th>
                  <th className="text-center px-3 py-2 font-medium">Үр ашиг</th>
                  <th className="text-center px-3 py-2 font-medium">Цаг тухайд</th>
                  <th className="text-center px-3 py-2 font-medium">Чанар</th>
                  <th className="text-center px-3 py-2 font-medium">Засваргүй</th>
                  <th className="text-center px-3 py-2 font-medium">Grade</th>
                  <th className="text-right px-3 py-2 font-medium">Норм/Бодит</th>
                  <th className="text-right px-3 py-2 font-medium">Дууссан</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => (
                  <tr
                    key={s.employeeId}
                    className="border-t border-bd/40 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2 text-sub tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/kpi/team/${s.employeeId}`}
                        className="flex items-center gap-2 hover:text-brand transition"
                      >
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-bd"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full border border-bd flex items-center justify-center text-[10px] font-medium">
                            {(s.lastName[0] ?? "") + (s.firstName[0] ?? "")}
                          </div>
                        )}
                        <span className="text-tx">
                          {s.lastName} {s.firstName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className="inline-flex items-center justify-center min-w-[58px] h-7 rounded px-2 text-white text-[12px] font-bold tabular-nums"
                        style={{ background: LETTER_BG[s.letter] ?? "#1F2333" }}
                      >
                        {s.closedCount > 0
                          ? `${s.composite} · ${s.letter}`
                          : "—"}
                      </span>
                    </td>
                    <MetricCell value={s.efficiency} />
                    <MetricCell value={s.onTime} />
                    <MetricCell value={s.quality} hasData={s.closedCount > 0} />
                    <MetricCell value={s.lowRevision} />
                    <MetricCell value={s.gradeMatch} hasData={s.closedCount > 0} />
                    <td className="px-3 py-2 text-right tabular-nums text-sub">
                      {s.normHours}ц / {s.actualHours.toFixed(0)}ц
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="text-tx">{s.closedCount}</span>
                      <span className="text-sub"> / {s.activeCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className="text-[14px] font-semibold mb-2 text-tx">
            Хадгалсан snapshot-ууд{" "}
            <span className="text-sub font-normal">· {history.length}</span>
          </h2>
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Хугацаа</th>
                  <th className="text-left px-3 py-2 font-medium">Төрөл</th>
                  <th className="text-left px-3 py-2 font-medium">Үүсгэсэн</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={`${h.type}:${h.key}`} className="border-t border-bd/40">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/kpi/reports?type=${h.type}&key=${h.key}`}
                        className="text-tx hover:text-brand"
                      >
                        {h.label}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sub">{h.type}</td>
                    <td className="px-3 py-2 text-sub tabular-nums">
                      {new Date(h.computedAt).toLocaleString("mn-MN")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`/api/admin/kpi/export?type=${h.type}&key=${h.key}`}
                        className="text-[11px] text-brand hover:underline mr-3"
                        download
                      >
                        CSV
                      </a>
                      <button
                        onClick={() => runDelete(h.type, h.key)}
                        className="text-[11px] text-sub hover:text-dangerInk"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-sub text-[11px]">
        💡 Snapshot нь түр зуурын тооцоо биш — ажилтан гарсан/орсон, төсөл засагдсан ч
        хадгалсан тоо өөрчлөгдөхгүй. Сар/улирал/жил бүрд нэг удаа үүсгэснээр түүхэн
        харьцуулалт хийх боломжтой.
      </p>
    </div>
  );
}

function MetricCell({
  value,
  hasData = true,
}: {
  value: number;
  hasData?: boolean;
}) {
  if (!hasData) {
    return <td className="px-3 py-2 text-center text-sub">—</td>;
  }
  const pct = Math.round(value * 100);
  const color =
    value >= 0.85
      ? "#22C55E"
      : value >= 0.6
      ? "#FBBF24"
      : value >= 0.3
      ? "#F59E0B"
      : "#EF4444";
  return (
    <td className="px-3 py-2 text-center">
      <span
        className="text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </td>
  );
}
