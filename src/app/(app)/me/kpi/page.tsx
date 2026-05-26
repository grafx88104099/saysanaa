import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { computeEmployeeKpi } from "@/lib/kpi-metrics";
import { fmtHours } from "@/lib/timeentry";

const PERIODS = [
  { key: "30d", label: "Сүүлийн 30 хоног", days: 30 },
  { key: "90d", label: "Сүүлийн 90 хоног", days: 90 },
  { key: "365d", label: "Сүүлийн жил", days: 365 },
  { key: "all", label: "Бүгд", days: 0 },
];

const LETTER_BG: Record<string, string> = {
  "A+": "linear-gradient(135deg,#6AA6FF,#8B5CF6)",
  A: "#6AA6FF",
  B: "#F59E0B",
  C: "#6B7390",
  "—": "#1F2333",
};

export default async function MyKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");
  const emp = await prisma.employee.findUnique({
    where: { userId: s.uid },
    select: { id: true, firstName: true, lastName: true, role: true, photoUrl: true, createdAt: true },
  });
  if (!emp) redirect("/dashboard");

  const sp = await searchParams;
  const periodKey = sp.period ?? "90d";
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];
  const rangeStart =
    period.days > 0
      ? new Date(Date.now() - period.days * 86400000)
      : undefined;

  const kpi = await computeEmployeeKpi(emp.id, rangeStart);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Миний KPI
          </h1>
          <p className="text-sub text-[12px] mt-1">
            {emp.lastName} {emp.firstName} · {period.label}
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/me/kpi?period=${p.key}`}
              className={`px-3 py-1.5 text-[12px] rounded transition ${
                periodKey === p.key
                  ? "bg-brand text-white"
                  : "text-sub hover:text-tx hover:bg-white/[0.04] border border-bd"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Composite score & letter */}
      <div className="panel p-6 mb-6">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-sub mb-2">
              Эцсийн оноо
            </div>
            <div
              className="inline-flex items-center justify-center w-32 h-32 rounded-full text-white"
              style={{ background: LETTER_BG[kpi.letter] ?? "#1F2333" }}
            >
              <div>
                <div className="text-[40px] font-bold tabular-nums leading-none">
                  {kpi.composite}
                </div>
                <div className="text-[14px] font-semibold mt-1 opacity-90">
                  {kpi.letter}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-sub mt-3">
              {kpi.closedCount} дууссан · {kpi.activeCount} идэвхтэй төсөл
            </div>
          </div>

          <div className="col-span-9 space-y-3">
            {kpi.metrics.map((m) => (
              <MetricBar key={m.key} metric={m} />
            ))}
          </div>
        </div>
      </div>

      {/* Time totals */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <SmallTile label="Норм цаг" value={`${kpi.totals.normHours}ц`} />
        <SmallTile
          label="Бодит цаг"
          value={fmtHours(kpi.totals.actualHours)}
          color="#22C55E"
        />
        <SmallTile
          label="Ажилласан"
          value={fmtHours(kpi.totals.workHours)}
          color="#22C55E"
        />
        <SmallTile
          label="Хүлээсэн"
          value={fmtHours(kpi.totals.clientWaitHours)}
          color="#6AA6FF"
        />
        <SmallTile
          label="Засвар"
          value={fmtHours(kpi.totals.revisionHours)}
          color="#F59E0B"
        />
      </div>

      {/* Projects list */}
      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-3">
          Хаагдсан төслүүд{" "}
          <span className="text-sub font-normal">· {kpi.projects.length}</span>
        </h2>

        {kpi.projects.length === 0 ? (
          <div className="panel p-6 text-center text-sub text-[12px]">
            Энэ хугацаанд хаалт хийгдсэн төсөл алга. Идэвхтэй төслүүд хаагдсаны дараа
            KPI-д тооцогдоно.
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider">
                <tr className="border-b border-bd">
                  <th className="text-left px-3 py-2 font-medium">Код</th>
                  <th className="text-left px-3 py-2 font-medium">Нэр</th>
                  <th className="text-right px-3 py-2 font-medium">Норм/Бодит</th>
                  <th className="text-right px-3 py-2 font-medium">Үр ашиг</th>
                  <th className="text-center px-3 py-2 font-medium">Цаг</th>
                  <th className="text-center px-3 py-2 font-medium">Чанар</th>
                  <th className="text-center px-3 py-2 font-medium">Grade</th>
                  <th className="text-right px-3 py-2 font-medium">Хаасан</th>
                </tr>
              </thead>
              <tbody>
                {kpi.projects.map((p) => {
                  const effPct = Math.round(p.efficiency * 100);
                  const effColor =
                    p.efficiency >= 1
                      ? "#22C55E"
                      : p.efficiency >= 0.85
                      ? "#F59E0B"
                      : "#EF4444";
                  return (
                    <tr key={p.id} className="border-t border-bd/40 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-[11px]">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="text-brand hover:underline"
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[260px]">{p.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.normHours}ц / {p.actualHours.toFixed(0)}ц
                      </td>
                      <td
                        className="px-3 py-2 text-right tabular-nums font-semibold"
                        style={{ color: effColor }}
                      >
                        {effPct}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.onTime ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-danger">⚠</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {p.qualityRating != null ? `${p.qualityRating}/5` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <GradeFlow
                          expected={p.expectedGradeKey}
                          actual={p.actualGradeKey}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sub tabular-nums">
                        {p.closedAt.slice(0, 10)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-sub text-[11px] mt-6">
        Эцсийн оноо = эрсэлбэйт жинжүүлсэн дундаж (Үр ашиг 30% · Хуваарь 20% · Чанар
        25% · Засваргүй 15% · Grade 10%). A+ ≥90, A 75-89, B 60-74, C &lt;60.
      </p>
    </div>
  );
}

function MetricBar({
  metric,
}: {
  metric: { key: string; label: string; value: number; display: string; weight: number };
}) {
  const pct = Math.round(metric.value * 100);
  const color =
    metric.value >= 0.85
      ? "#22C55E"
      : metric.value >= 0.6
      ? "#FBBF24"
      : metric.value >= 0.3
      ? "#F59E0B"
      : "#EF4444";
  return (
    <div className="flex items-center gap-4">
      <div className="w-[28%]">
        <div className="text-[13px] text-tx">{metric.label}</div>
        <div className="text-[10px] text-sub uppercase tracking-wider">
          Жин {Math.round(metric.weight * 100)}%
        </div>
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-bd overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div
        className="w-[80px] text-right text-[14px] font-semibold tabular-nums"
        style={{ color }}
      >
        {metric.display}
      </div>
    </div>
  );
}

function SmallTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">
        {label}
      </div>
      <div
        className="text-[15px] font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function GradeFlow({
  expected,
  actual,
}: {
  expected: string | null;
  actual: string | null;
}) {
  if (!actual) return <span className="text-sub">—</span>;
  const dot = (k: string | null) => {
    const c =
      k === "APLUS"
        ? "linear-gradient(135deg,#6AA6FF,#8B5CF6)"
        : k === "A"
        ? "#6AA6FF"
        : k === "B"
        ? "#F59E0B"
        : "#6B7390";
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-5 rounded text-white text-[10px] font-bold"
        style={{ background: c }}
      >
        {k === "APLUS" ? "A+" : k ?? "—"}
      </span>
    );
  };
  return (
    <span className="inline-flex items-center gap-1">
      {expected && dot(expected)}
      {expected && actual && <span className="text-sub text-[10px]">→</span>}
      {dot(actual)}
    </span>
  );
}
