import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { computeEmployeeKpi } from "@/lib/kpi-metrics";

const PERIODS = [
  { key: "30d", label: "30 хоног", days: 30 },
  { key: "90d", label: "90 хоног", days: 90 },
  { key: "365d", label: "1 жил", days: 365 },
  { key: "all", label: "Бүгд", days: 0 },
];

const LETTER_BG: Record<string, string> = {
  "A+": "linear-gradient(135deg,#6AA6FF,#8B5CF6)",
  A: "#6AA6FF",
  B: "#F59E0B",
  C: "#6B7390",
  "—": "#1F2333",
};

export default async function TeamKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; role?: string }>;
}) {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/dashboard");

  const sp = await searchParams;
  const periodKey = sp.period ?? "90d";
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];
  const rangeStart =
    period.days > 0 ? new Date(Date.now() - period.days * 86400000) : undefined;

  const roleFilter = sp.role && sp.role !== "all" ? sp.role : null;

  const employees = await prisma.employee.findMany({
    where: {
      active: true,
      ...(roleFilter ? { role: roleFilter as "DESIGNER" | "PM" | "ADMIN" | "ACCOUNTANT" | "CLIENT" } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      profession: true,
      photoUrl: true,
    },
  });

  // Sequential — DATABASE_URL is configured with connection_limit=1, so parallel
  // computeEmployeeKpi calls would deadlock waiting for connections.
  const rows: { emp: typeof employees[number]; kpi: Awaited<ReturnType<typeof computeEmployeeKpi>> }[] = [];
  for (const e of employees) {
    const k = await computeEmployeeKpi(e.id, rangeStart);
    rows.push({ emp: e, kpi: k });
  }

  rows.sort((a, b) => b.kpi.composite - a.kpi.composite);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sub text-[12px] max-w-[760px]">
          Ажилтан тус бүрийн KPI оноо болон 5 метрикийг харна. Onoo нь зөвхөн хаалт
          хийгдсэн төслүүдээс тооцогдоно.
        </p>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/kpi/team?period=${p.key}${roleFilter ? `&role=${roleFilter}` : ""}`}
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

      {/* Role filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "DESIGNER", "PM", "ADMIN", "ACCOUNTANT"] as const).map((r) => {
          const on = (roleFilter ?? "all") === r;
          const labels: Record<string, string> = {
            all: "Бүгд",
            DESIGNER: "Дизайнер",
            PM: "PM",
            ADMIN: "Админ",
            ACCOUNTANT: "Нягтлан",
          };
          return (
            <Link
              key={r}
              href={`/admin/kpi/team?period=${periodKey}&role=${r}`}
              className={`px-2.5 py-1 text-[11px] rounded transition ${
                on
                  ? "bg-white/[0.06] text-tx border border-brand/40"
                  : "text-sub hover:text-tx border border-bd"
              }`}
            >
              {labels[r]}
            </Link>
          );
        })}
      </div>

      {/* Team table */}
      <div className="panel overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Ажилтан</th>
              <th className="text-center px-3 py-2 font-medium">Оноо</th>
              <th className="text-center px-3 py-2 font-medium" title="Цагийн үр ашиг">
                Үр ашиг
              </th>
              <th className="text-center px-3 py-2 font-medium" title="Хуваарийн биелэлт">
                Цаг тухайд
              </th>
              <th className="text-center px-3 py-2 font-medium" title="Чанарын дундаж">
                Чанар
              </th>
              <th className="text-center px-3 py-2 font-medium" title="Засваргүй ажил">
                Засваргүй
              </th>
              <th className="text-center px-3 py-2 font-medium" title="Grade биелэлт">
                Grade
              </th>
              <th className="text-right px-3 py-2 font-medium">Төсөл</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-sub">
                  Ажилтан олдсонгүй
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const m = Object.fromEntries(r.kpi.metrics.map((x) => [x.key, x]));
              return (
                <tr
                  key={r.emp.id}
                  className="border-t border-bd/40 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 text-sub tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.emp.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.emp.photoUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-bd"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-bd flex items-center justify-center text-[10px] font-medium">
                          {(r.emp.lastName[0] ?? "") + (r.emp.firstName[0] ?? "")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-tx truncate">
                          {r.emp.lastName} {r.emp.firstName}
                        </div>
                        <div className="text-sub text-[10px] truncate">
                          {r.emp.profession ?? r.emp.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="inline-flex items-center justify-center min-w-[60px] h-7 rounded px-2 text-white text-[12px] font-bold tabular-nums"
                      style={{ background: LETTER_BG[r.kpi.letter] ?? "#1F2333" }}
                    >
                      {r.kpi.closedCount > 0
                        ? `${r.kpi.composite} · ${r.kpi.letter}`
                        : "—"}
                    </div>
                  </td>
                  <MetricCell metric={m.efficiency} />
                  <MetricCell metric={m.onTime} />
                  <MetricCell metric={m.quality} />
                  <MetricCell metric={m.lowRevision} />
                  <MetricCell metric={m.gradeMatch} />
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="text-tx">{r.kpi.closedCount}</span>
                    <span className="text-sub"> / {r.kpi.activeCount}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/kpi/team/${r.emp.id}?period=${periodKey}`}
                      className="text-brand text-[12px] hover:underline"
                    >
                      →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sub text-[11px]">
        Оноо = (Үр ашиг 30% · Цаг тухайд 20% · Чанар 25% · Засваргүй 15% · Grade 10%) ×
        100. Хоосон бол ажилтан хаалт хийгдсэн төсөлгүй.
      </p>
    </div>
  );
}

function MetricCell({
  metric,
}: {
  metric?: { value: number; display: string };
}) {
  if (!metric) {
    return <td className="px-3 py-2 text-center text-sub">—</td>;
  }
  const v = metric.value;
  const color =
    v >= 0.85
      ? "#22C55E"
      : v >= 0.6
      ? "#FBBF24"
      : v >= 0.3
      ? "#F59E0B"
      : "#EF4444";
  return (
    <td className="px-3 py-2 text-center">
      <span
        className="text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {metric.display}
      </span>
    </td>
  );
}
