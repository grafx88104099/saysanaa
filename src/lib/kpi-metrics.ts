import { prisma } from "./db";

export type KpiMetric = {
  key: "efficiency" | "onTime" | "quality" | "lowRevision" | "gradeMatch";
  label: string;
  value: number;      // 0..1 (already normalized)
  display: string;    // human readable
  weight: number;     // 0..1, sums to 1
};

export type EmployeeKpiResult = {
  employeeId: string;
  closedCount: number;        // completed projects in window
  activeCount: number;        // active assignments
  metrics: KpiMetric[];
  composite: number;          // 0..100
  letter: "A+" | "A" | "B" | "C" | "—";
  totals: {
    workHours: number;
    clientWaitHours: number;
    revisionHours: number;
    normHours: number;
    actualHours: number;
  };
  projects: Array<{
    id: string;
    code: string;
    name: string;
    closedAt: string;
    normHours: number;
    actualHours: number;       // per-employee actual hours (work+revision)
    efficiency: number;        // project-level efficiency
    qualityRating: number | null;
    onTime: boolean;
    expectedGradeKey: string | null;
    actualGradeKey: string | null;
    revisionHours: number;     // per-employee
    workHours: number;         // per-employee
  }>;
};

const WEIGHTS = {
  efficiency: 0.30,
  onTime: 0.20,
  quality: 0.25,
  lowRevision: 0.15,
  gradeMatch: 0.10,
};

const GRADE_RANK: Record<string, number> = { APLUS: 4, A: 3, B: 2, C: 1 };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Ажилтны KPI тооцоолно.
 * - Хаалт хийгдсэн төслүүдэд тулгуурлана (project.status=COMPLETED, has snapshot).
 * - workHours/revisionHours/clientWaitHours нь ажилтан тухайн төсөл дээр өөрөө бүртгэсэн
 *   TimeEntry-н нийлбэр (privacy + correctness).
 * - efficiency, qualityRating, onTime нь project-level snapshot-аас ирнэ (тэр нь багийн
 *   гүйцэтгэл — нэг ажилтан биш бүх багт хамаатай).
 */
export async function computeEmployeeKpi(
  employeeId: string,
  rangeStart?: Date,
  rangeEnd?: Date  // exclusive
): Promise<EmployeeKpiResult> {
  const closedWhere = {
    employeeId,
    project: {
      status: "COMPLETED" as const,
      kpiSnapshot: { isNot: null },
      ...(rangeStart || rangeEnd
        ? {
            closedAt: {
              ...(rangeStart ? { gte: rangeStart } : {}),
              ...(rangeEnd ? { lt: rangeEnd } : {}),
            },
          }
        : {}),
    },
  };

  const [assignments, activeCount, perEmpAgg] = await Promise.all([
    prisma.projectAssignment.findMany({
      where: closedWhere,
      include: {
        project: {
          include: { kpiSnapshot: true },
        },
      },
    }),
    prisma.projectAssignment.count({
      where: {
        employeeId,
        project: { status: { in: ["ACTIVE", "DRAFT", "ON_HOLD"] } },
      },
    }),
    // All time entries by this employee in the window (any project)
    prisma.timeEntry.groupBy({
      by: ["projectId", "kind"],
      where: {
        employeeId,
        ...(rangeStart || rangeEnd
          ? {
              date: {
                ...(rangeStart ? { gte: rangeStart } : {}),
                ...(rangeEnd ? { lt: rangeEnd } : {}),
              },
            }
          : {}),
      },
      _sum: { hours: true },
    }),
  ]);

  // Map: projectId → { work, wait, rev } for THIS employee
  const myProjectHours = new Map<
    string,
    { work: number; wait: number; rev: number }
  >();
  for (const row of perEmpAgg) {
    const slot = myProjectHours.get(row.projectId) ?? {
      work: 0,
      wait: 0,
      rev: 0,
    };
    const h = row._sum.hours ?? 0;
    if (row.kind === "WORK") slot.work += h;
    else if (row.kind === "CLIENT_WAIT") slot.wait += h;
    else slot.rev += h;
    myProjectHours.set(row.projectId, slot);
  }

  // Period-level totals across ALL projects (not just closed ones) — for display
  let totalWork = 0;
  let totalWait = 0;
  let totalRev = 0;
  for (const slot of myProjectHours.values()) {
    totalWork += slot.work;
    totalWait += slot.wait;
    totalRev += slot.rev;
  }

  const projects = assignments
    .filter((a) => a.project.kpiSnapshot)
    .map((a) => {
      const snap = a.project.kpiSnapshot!;
      const mine = myProjectHours.get(a.projectId) ?? { work: 0, wait: 0, rev: 0 };
      return {
        id: a.project.id,
        code: a.project.code,
        name: a.project.name,
        closedAt: snap.closedAt.toISOString(),
        normHours: snap.normHours,
        actualHours: mine.work + mine.rev,
        efficiency: snap.efficiency,
        qualityRating: snap.qualityRating,
        onTime: snap.onTime,
        expectedGradeKey: snap.expectedGradeKey,
        actualGradeKey: snap.actualGradeKey,
        workHours: mine.work,
        revisionHours: mine.rev,
      };
    });

  const closedCount = projects.length;

  // Metrics
  let effSum = 0,
    quaSum = 0,
    quaCount = 0,
    onTimeCount = 0,
    revRateSum = 0,
    gradeMatchCount = 0,
    gradeMatchEligible = 0;
  let normSum = 0,
    actualSum = 0;

  for (const p of projects) {
    effSum += clamp01(p.efficiency);
    if (p.qualityRating != null) {
      quaSum += p.qualityRating / 5;
      quaCount++;
    }
    if (p.onTime) onTimeCount++;
    const total = p.workHours + p.revisionHours;
    if (total > 0) revRateSum += clamp01(1 - p.revisionHours / total);
    else revRateSum += 1;
    if (p.expectedGradeKey && p.actualGradeKey) {
      gradeMatchEligible++;
      const exp = GRADE_RANK[p.expectedGradeKey] ?? 0;
      const act = GRADE_RANK[p.actualGradeKey] ?? 0;
      if (act >= exp) gradeMatchCount++;
    }
    normSum += p.normHours;
    actualSum += p.actualHours;
  }

  const efficiency = closedCount > 0 ? effSum / closedCount : 0;
  const quality = quaCount > 0 ? quaSum / quaCount : 0;
  const onTime = closedCount > 0 ? onTimeCount / closedCount : 0;
  const lowRevision = closedCount > 0 ? revRateSum / closedCount : 1;
  const gradeMatch =
    gradeMatchEligible > 0 ? gradeMatchCount / gradeMatchEligible : 0;

  const metrics: KpiMetric[] = [
    {
      key: "efficiency",
      label: "Цагийн үр ашиг",
      value: efficiency,
      display: `${Math.round(efficiency * 100)}%`,
      weight: WEIGHTS.efficiency,
    },
    {
      key: "onTime",
      label: "Хуваарийн биелэлт",
      value: onTime,
      display: `${Math.round(onTime * 100)}%`,
      weight: WEIGHTS.onTime,
    },
    {
      key: "quality",
      label: "Чанарын дундаж",
      value: quality,
      display: quaCount > 0 ? `${(quality * 5).toFixed(1)}/5` : "—",
      weight: WEIGHTS.quality,
    },
    {
      key: "lowRevision",
      label: "Засваргүй ажил",
      value: lowRevision,
      display: `${Math.round(lowRevision * 100)}%`,
      weight: WEIGHTS.lowRevision,
    },
    {
      key: "gradeMatch",
      label: "Grade биелэлт",
      value: gradeMatch,
      display:
        gradeMatchEligible > 0 ? `${gradeMatchCount}/${gradeMatchEligible}` : "—",
      weight: WEIGHTS.gradeMatch,
    },
  ];

  const composite =
    closedCount > 0
      ? Math.round(
          metrics.reduce((s, m) => s + m.value * m.weight, 0) * 100
        )
      : 0;

  const letter: EmployeeKpiResult["letter"] =
    closedCount === 0
      ? "—"
      : composite >= 90
      ? "A+"
      : composite >= 75
      ? "A"
      : composite >= 60
      ? "B"
      : "C";

  return {
    employeeId,
    closedCount,
    activeCount,
    metrics,
    composite,
    letter,
    totals: {
      workHours: totalWork,
      clientWaitHours: totalWait,
      revisionHours: totalRev,
      normHours: normSum,
      actualHours: actualSum,
    },
    projects: projects.sort(
      (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
    ),
  };
}
