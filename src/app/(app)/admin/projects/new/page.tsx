import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateProjectCode, DESIGN_PHASES, BUILD_PHASES } from "@/lib/projects";
import { loadHolidayKeys, MN_HOLIDAYS_2026 } from "@/lib/calendar";
import { approximateYearsOfService } from "@/lib/kpi";
import ProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/admin/projects");

  const [
    nextCodeBuild,
    nextCodeDesign,
    employees,
    holidayKeys,
    kpiBands,
    kpiCriteria,
    kpiLevels,
    kpiTiers,
  ] = await Promise.all([
    generateProjectCode("BUILD"),
    generateProjectCode("DESIGN"),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profession: true,
        photoUrl: true,
        createdAt: true,
        startedWorkAt: true,
      },
    }),
    loadHolidayKeys(),
    prisma.kpiAreaBand.findMany({
      include: {
        phases: { include: { phase: true }, orderBy: { phase: { sortOrder: "asc" } } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.kpiGradeCriterion.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.kpiGradeLevel.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.kpiExperienceTier.findMany({
      include: { allowedLevels: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const holidayList =
    holidayKeys.size > 0
      ? Array.from(holidayKeys)
      : MN_HOLIDAYS_2026.map((h) => h.date);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-[24px] font-semibold tracking-tight mb-6 text-gradient">
        Шинэ төсөл нэмэх
      </h1>
      <ProjectForm
        mode="create"
        initial={{
          type: "BUILD",
          code: nextCodeBuild,
          phases: BUILD_PHASES,
        }}
        nextCodes={{ DESIGN: nextCodeDesign, BUILD: nextCodeBuild }}
        templates={{ DESIGN: DESIGN_PHASES, BUILD: BUILD_PHASES }}
        employees={employees.map((e) => ({
          id: e.id,
          initials: ((e.lastName[0] ?? "") + (e.firstName[0] ?? "")).toUpperCase(),
          fullName: `${e.lastName} ${e.firstName}`,
          role: e.role,
          profession: e.profession,
          photoUrl: e.photoUrl,
          yearsOfService: approximateYearsOfService(e),
        }))}
        holidayList={holidayList}
        kpi={{
          bands: kpiBands.map((b) => ({
            id: b.id,
            label: b.label,
            minM2: b.minM2,
            maxM2: b.maxM2,
            totalPriceMnt: Number(b.totalPriceMnt),
            phases: b.phases.map((bp) => ({
              kpiPhaseId: bp.phaseId,
              name: bp.phase.label.split("/")[0].trim(),
              normHours: Math.round(bp.estimatedHours),
            })),
          })),
          criteria: kpiCriteria.map((c) => ({ id: c.id, label: c.label, description: c.description })),
          levels: kpiLevels.map((l) => ({
            id: l.id,
            key: l.key,
            label: l.label,
            minScore: l.minScore,
            maxScore: l.maxScore,
          })),
          tiers: kpiTiers.map((t) => ({
            id: t.id,
            label: t.label,
            minYears: t.minYears,
            maxYears: t.maxYears,
            allowedLevelIds: t.allowedLevels.map((a) => a.levelId),
          })),
        }}
      />
    </div>
  );
}
