import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from "@/lib/labels";
import { fmtMoney } from "@/lib/format";
import type { ProjectStatus, ProjectType } from "@prisma/client";

const STATUS_COLOR: Record<ProjectStatus, string> = {
  DRAFT: "#6B7390",
  ACTIVE: "#6AA6FF",
  ON_HOLD: "#FBBF24",
  COMPLETED: "#22C55E",
  CANCELLED: "#EF4444",
};

export default async function InsightsPage() {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/dashboard");

  // Aggregates
  const [
    byStatusRaw,
    byTypeRaw,
    employeeCount,
    activeEmployeeCount,
    totalRevenue,
    avgKpiSnapshot,
    monthlyClosedRaw,
    recentClosed,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.employee.count(),
    prisma.employee.count({ where: { active: true } }),
    prisma.project.aggregate({
      _sum: { contractValue: true },
      where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    }),
    prisma.projectKpiSnapshot.aggregate({
      _avg: {
        efficiency: true,
        qualityRating: true,
        clientSatisfaction: true,
      },
      _count: { _all: true },
    }),
    // closed projects by month for last 12 months
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT to_char("closedAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
      FROM "Project"
      WHERE "closedAt" IS NOT NULL
        AND "closedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.project.findMany({
      where: { status: "COMPLETED" },
      orderBy: { closedAt: "desc" },
      take: 5,
      select: { id: true, code: true, name: true, closedAt: true, type: true },
    }),
  ]);

  const byStatus = new Map<ProjectStatus, number>();
  for (const r of byStatusRaw) byStatus.set(r.status, r._count._all);
  const byType = new Map<ProjectType, number>();
  for (const r of byTypeRaw) byType.set(r.type, r._count._all);

  const totalProjects = byStatusRaw.reduce((s, r) => s + r._count._all, 0);
  const onTimeRateRaw = await prisma.projectKpiSnapshot.aggregate({
    _count: { _all: true },
    where: { onTime: true },
  });
  const onTimeRate =
    avgKpiSnapshot._count._all > 0
      ? Math.round((onTimeRateRaw._count._all / avgKpiSnapshot._count._all) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
          Компанийн статистик
        </h1>
        <p className="text-sub text-[12px] mt-1">Удирдлагын зориулалттай товч хураангуй</p>
      </div>

      {/* Top KPI tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Tile label="Нийт төсөл" value={String(totalProjects)} color="#6AA6FF" />
        <Tile
          label="Идэвхтэй ажилтан"
          value={`${activeEmployeeCount} / ${employeeCount}`}
          color="#22C55E"
        />
        <Tile
          label="Идэвхтэй гэрээний үнэ"
          value={fmtMoney(totalRevenue._sum.contractValue ? Number(totalRevenue._sum.contractValue) : null)}
          color="#FBBF24"
        />
        <Tile
          label="Цаг тухайд биелэлт"
          value={avgKpiSnapshot._count._all > 0 ? `${onTimeRate}%` : "—"}
          color="#8B5CF6"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Status breakdown */}
        <section className="panel p-5">
          <h2 className="text-[13px] font-semibold mb-3 text-tx">Төслийн төлөв</h2>
          <div className="space-y-2">
            {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => {
              const status = k as ProjectStatus;
              const count = byStatus.get(status) ?? 0;
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
              return (
                <div key={k} className="flex items-center gap-3 text-[12px]">
                  <span className="w-24 text-sub">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-bd overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: STATUS_COLOR[status] }}
                    />
                  </div>
                  <span
                    className="w-12 text-right tabular-nums font-semibold"
                    style={{ color: STATUS_COLOR[status] }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Type breakdown */}
        <section className="panel p-5">
          <h2 className="text-[13px] font-semibold mb-3 text-tx">Төслийн төрөл</h2>
          <div className="space-y-3">
            {Object.entries(PROJECT_TYPE_LABEL).map(([k, label]) => {
              const t = k as ProjectType;
              const count = byType.get(t) ?? 0;
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
              const color = t === "DESIGN" ? "#6AA6FF" : "#F59E0B";
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[13px] text-tx">{label}</span>
                    <span className="text-[12px] text-sub tabular-nums">
                      {count} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bd overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* KPI averages */}
      <section className="panel p-5 mb-6">
        <h2 className="text-[13px] font-semibold mb-3 text-tx">
          KPI snapshot дундаж{" "}
          <span className="text-sub font-normal">
            · {avgKpiSnapshot._count._all} төсөл хаагдсан
          </span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <SmallTile
            label="Цагийн үр ашиг"
            value={
              avgKpiSnapshot._avg.efficiency != null
                ? `${Math.round(avgKpiSnapshot._avg.efficiency * 100)}%`
                : "—"
            }
            color="#22C55E"
          />
          <SmallTile
            label="Чанарын үнэлгээ"
            value={
              avgKpiSnapshot._avg.qualityRating != null
                ? `${avgKpiSnapshot._avg.qualityRating.toFixed(1)}/5`
                : "—"
            }
            color="#FBBF24"
          />
          <SmallTile
            label="Захиалагч сэтгэл"
            value={
              avgKpiSnapshot._avg.clientSatisfaction != null
                ? `${avgKpiSnapshot._avg.clientSatisfaction.toFixed(1)}/5`
                : "—"
            }
            color="#22D3EE"
          />
        </div>
      </section>

      {/* 12-month closed trend */}
      <section className="panel p-5 mb-6">
        <h2 className="text-[13px] font-semibold mb-3 text-tx">
          Сар бүрийн хаагдсан төсөл (12 сар)
        </h2>
        {monthlyClosedRaw.length === 0 ? (
          <div className="text-sub text-[12px] py-6 text-center">Дата хангалттай биш</div>
        ) : (
          <MonthlyChart data={monthlyClosedRaw.map((r) => ({ month: r.month, count: Number(r.count) }))} />
        )}
      </section>

      {/* Recent closed */}
      <section>
        <h2 className="text-[13px] font-semibold mb-3 text-tx">Сүүлд хаагдсан төслүүд</h2>
        {recentClosed.length === 0 ? (
          <div className="panel p-6 text-center text-sub text-[12px]">
            Хаагдсан төсөл алга
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Код</th>
                  <th className="text-left px-3 py-2 font-medium">Нэр</th>
                  <th className="text-left px-3 py-2 font-medium">Төрөл</th>
                  <th className="text-right px-3 py-2 font-medium">Хаасан</th>
                </tr>
              </thead>
              <tbody>
                {recentClosed.map((p) => (
                  <tr key={p.id} className="border-t border-bd/40">
                    <td className="px-3 py-2 font-mono text-[11px] text-brand">{p.code}</td>
                    <td className="px-3 py-2 truncate max-w-[400px]">{p.name}</td>
                    <td className="px-3 py-2 text-sub">{PROJECT_TYPE_LABEL[p.type]}</td>
                    <td className="px-3 py-2 text-right text-sub tabular-nums">
                      {p.closedAt?.toISOString().slice(0, 10) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => {
        const h = Math.max(6, Math.round((d.count / max) * 100));
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-brand to-brand2"
              style={{ height: `${h}%` }}
              title={`${d.month}: ${d.count} төсөл`}
            />
            <div className="text-[9px] text-sub tabular-nums">
              {d.month.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="panel px-5 py-4"
      style={{
        background: `radial-gradient(140% 110% at 0% 0%, ${color}1F 0%, transparent 55%), linear-gradient(180deg, #121A33 0%, #18224A 100%)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">{label}</div>
      <div
        className="text-[20px] font-bold tabular-nums tracking-tight"
        style={{ color, textShadow: `0 0 14px ${color}55` }}
      >
        {value}
      </div>
    </div>
  );
}

function SmallTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-bd rounded-md px-3 py-2.5 bg-white/[0.02]">
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
