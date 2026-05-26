import Link from "next/link";
import { redirect, notFound } from "next/navigation";
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

export default async function EmployeeKpiDrilldown({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;
  const periodKey = sp.period ?? "90d";
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];
  const rangeStart =
    period.days > 0 ? new Date(Date.now() - period.days * 86400000) : undefined;

  const emp = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      profession: true,
      photoUrl: true,
      createdAt: true,
    },
  });
  if (!emp) notFound();

  const kpi = await computeEmployeeKpi(emp.id, rangeStart);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12px] text-sub">
        <Link href="/admin/kpi/team" className="hover:text-tx">Багийн KPI</Link>
        <span>/</span>
        <span className="text-tx">
          {emp.lastName} {emp.firstName}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {emp.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emp.photoUrl}
              alt=""
              className="w-14 h-14 rounded-full object-cover border border-bd"
            />
          ) : (
            <div className="w-14 h-14 rounded-full border border-bd flex items-center justify-center text-[16px] font-medium">
              {(emp.lastName[0] ?? "") + (emp.firstName[0] ?? "")}
            </div>
          )}
          <div>
            <div className="text-[20px] font-semibold text-tx">
              {emp.lastName} {emp.firstName}
            </div>
            <div className="text-sub text-[12px]">
              {emp.profession ?? emp.role} · {period.label}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/kpi/team/${emp.id}?period=${p.key}`}
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

      <div className="panel p-6">
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
              {kpi.closedCount} дууссан · {kpi.activeCount} идэвхтэй
            </div>
          </div>

          <div className="col-span-9 space-y-3">
            {kpi.metrics.map((m) => {
              const pct = Math.round(m.value * 100);
              const color =
                m.value >= 0.85
                  ? "#22C55E"
                  : m.value >= 0.6
                  ? "#FBBF24"
                  : m.value >= 0.3
                  ? "#F59E0B"
                  : "#EF4444";
              return (
                <div key={m.key} className="flex items-center gap-4">
                  <div className="w-[28%]">
                    <div className="text-[13px] text-tx">{m.label}</div>
                    <div className="text-[10px] text-sub uppercase tracking-wider">
                      Жин {Math.round(m.weight * 100)}%
                    </div>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-bd overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div
                    className="w-[80px] text-right text-[14px] font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {m.display}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
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

      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-3">
          Хаагдсан төслүүд{" "}
          <span className="text-sub font-normal">· {kpi.projects.length}</span>
        </h2>

        {kpi.projects.length === 0 ? (
          <div className="panel p-6 text-center text-sub text-[12px]">
            Энэ хугацаанд хаалт хийгдсэн төсөл алга.
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
                      <td className="px-3 py-2 text-center text-[11px]">
                        {p.expectedGradeKey && p.actualGradeKey
                          ? `${p.expectedGradeKey} → ${p.actualGradeKey}`
                          : "—"}
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
