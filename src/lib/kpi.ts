import { prisma } from "./db";

export type KpiPhaseSnapshot = {
  ordinal: number;
  name: string;
  hours: number;          // editable hours (starts equal to normHours)
  normHours: number;      // frozen reference
  kpiPhaseId: string;
};

export type KpiBandWithPhases = {
  id: string;
  label: string;
  minM2: number;
  maxM2: number | null;
  totalPriceMnt: number;
  phases: KpiPhaseSnapshot[];
};

/**
 * Хамгийн ойрхон areaM2-д тохирох KPI муж олно.
 * - Хэрэв muж олдвол {band, phases} буцаана.
 * - Хэрэв areaM2 null/0 эсвэл муж байхгүй бол null.
 */
export async function getBandForArea(
  areaM2: number | null | undefined
): Promise<KpiBandWithPhases | null> {
  if (!areaM2 || areaM2 <= 0) return null;
  const bands = await prisma.kpiAreaBand.findMany({
    include: {
      phases: {
        include: { phase: true },
        orderBy: { phase: { sortOrder: "asc" } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  const match = bands.find(
    (b) => areaM2 >= b.minM2 && (b.maxM2 === null || areaM2 <= b.maxM2)
  );
  if (!match) return null;
  return {
    id: match.id,
    label: match.label,
    minM2: match.minM2,
    maxM2: match.maxM2,
    totalPriceMnt: Number(match.totalPriceMnt),
    phases: match.phases.map((bp, i) => ({
      ordinal: i,
      name: bp.phase.label.split("/")[0].trim(),
      hours: Math.round(bp.estimatedHours),
      normHours: Math.round(bp.estimatedHours),
      kpiPhaseId: bp.phaseId,
    })),
  };
}

/**
 * 7 шалгуурын онооноос grade level түвшинг тогтооно.
 * Дундаж онооноос level-ийн min/max-д тааруулна.
 */
export async function computeGradeFromScores(
  scoresByCriterionId: Record<string, number>
): Promise<{
  levelId: string | null;
  levelKey: string | null;
  levelLabel: string | null;
  avgScore: number;
  totalScore: number;
}> {
  const values = Object.values(scoresByCriterionId);
  if (values.length === 0) {
    return { levelId: null, levelKey: null, levelLabel: null, avgScore: 0, totalScore: 0 };
  }
  const totalScore = values.reduce((s, x) => s + (x || 0), 0);
  const avgScore = totalScore / values.length;
  // Round to integer so fractional averages always land in a band (e.g. 6.5 → 7 → A).
  const lookup = Math.round(avgScore);
  const levels = await prisma.kpiGradeLevel.findMany({ orderBy: { sortOrder: "asc" } });
  const match = levels.find((l) => lookup >= l.minScore && lookup <= l.maxScore);
  if (match) {
    return {
      levelId: match.id,
      levelKey: match.key,
      levelLabel: match.label,
      avgScore,
      totalScore,
    };
  }
  // Out of range (e.g. all-zero avg=0, or score > all band maxes). Choose nearest band.
  const closest = [...levels].sort(
    (a, b) =>
      Math.min(Math.abs(lookup - a.minScore), Math.abs(lookup - a.maxScore)) -
      Math.min(Math.abs(lookup - b.minScore), Math.abs(lookup - b.maxScore))
  )[0];
  return {
    levelId: closest?.id ?? null,
    levelKey: closest?.key ?? null,
    levelLabel: closest?.label ?? null,
    avgScore,
    totalScore,
  };
}

/**
 * Ажилтны туршлагын жилд зөвшөөрөгдөх grade level-уудыг буцаана.
 */
export async function getAllowedLevelsForExperience(years: number): Promise<{
  tierId: string | null;
  tierLabel: string | null;
  levelIds: string[];
  levelKeys: string[];
}> {
  if (years < 0) years = 0;
  // Floor so fractional tenure (2.5y) matches integer-bounded tiers ("1-2 жил" or "2-5 жил").
  const wholeYears = Math.floor(years);
  const tiers = await prisma.kpiExperienceTier.findMany({
    include: { allowedLevels: { include: { level: true } } },
    orderBy: { sortOrder: "asc" },
  });
  const match = tiers.find(
    (t) =>
      wholeYears >= t.minYears &&
      (t.maxYears === null || wholeYears <= t.maxYears)
  );
  if (!match) return { tierId: null, tierLabel: null, levelIds: [], levelKeys: [] };
  return {
    tierId: match.id,
    tierLabel: match.label,
    levelIds: match.allowedLevels.map((a) => a.levelId),
    levelKeys: match.allowedLevels.map((a) => a.level.key),
  };
}

/**
 * Ажилтны туршлагын жилийн тоо. `startedWorkAt` тавьсан бол түүнийг ашиглана,
 * үгүй бол DB-д бүртгэгдсэн огноог fallback ашиглана.
 *
 * Хуучин код-той нийцтэй байх үүднээс хоёр signature-ыг хүлээн авна:
 *   approximateYearsOfService(emp)  → { startedWorkAt?, createdAt }
 *   approximateYearsOfService(date) → Date (legacy createdAt)
 */
export function approximateYearsOfService(
  input: Date | { startedWorkAt: Date | null; createdAt: Date }
): number {
  let ref: Date;
  if (input instanceof Date) {
    ref = input;
  } else {
    ref = input.startedWorkAt ?? input.createdAt;
  }
  const ms = Date.now() - ref.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Туршлага vs grade тааруулга шалгана. mismatch үед soft-warning буцаана.
 */
export async function checkExperienceMatch(
  employeeIds: string[],
  gradeLevelId: string | null
): Promise<{ ok: boolean; warnings: string[] }> {
  if (!gradeLevelId || employeeIds.length === 0) return { ok: true, warnings: [] };
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, firstName: true, lastName: true, createdAt: true, startedWorkAt: true },
  });
  const level = await prisma.kpiGradeLevel.findUnique({ where: { id: gradeLevelId } });
  const warnings: string[] = [];
  for (const emp of employees) {
    const years = approximateYearsOfService(emp);
    const allowed = await getAllowedLevelsForExperience(years);
    if (allowed.levelIds.length === 0) continue;
    if (!allowed.levelIds.includes(gradeLevelId)) {
      const yrLabel = years.toFixed(1);
      warnings.push(
        `${emp.lastName} ${emp.firstName} (${yrLabel} жил, ${allowed.tierLabel ?? "?"}) → ${level?.label} грейдийн төсөл оноосон`
      );
    }
  }
  return { ok: warnings.length === 0, warnings };
}
