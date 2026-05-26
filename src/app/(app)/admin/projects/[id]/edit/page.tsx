import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { DESIGN_PHASES, BUILD_PHASES } from "@/lib/projects";
import { loadHolidayKeys, MN_HOLIDAYS_2026 } from "@/lib/calendar";
import { approximateYearsOfService } from "@/lib/kpi";
import ProjectForm from "@/components/projects/ProjectForm";
import { fmtDate } from "@/lib/format";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.role !== "ADMIN" && s.role !== "PM") redirect(`/admin/projects/${id}`);

  const [
    p,
    employees,
    holidayKeys,
    kpiBands,
    kpiCriteria,
    kpiLevels,
    kpiTiers,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        phases: { orderBy: { ordinal: "asc" } },
        assignments: true,
        gradeScores: true,
      },
    }),
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
  if (!p) notFound();

  const holidayList =
    holidayKeys.size > 0 ? Array.from(holidayKeys) : MN_HOLIDAYS_2026.map((h) => h.date);

  const initialGradeScores: Record<string, number> = {};
  for (const gs of p.gradeScores) initialGradeScores[gs.criterionId] = gs.score;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-white/45 mb-5">
        <Link href="/admin/projects" className="hover:text-white transition">Төсөл</Link>
        <span>/</span>
        <Link href={`/admin/projects/${p.id}`} className="hover:text-white transition font-mono">
          {p.code}
        </Link>
        <span>/</span>
        <span className="text-white/80">Засах</span>
      </div>
      <h1 className="text-[24px] font-semibold tracking-tight mb-6 text-gradient">Төсөл засах</h1>
      <ProjectForm
        mode="edit"
        initial={{
          id: p.id,
          type: p.type,
          code: p.code,
          name: p.name,
          purpose: p.purpose,
          clientName: p.clientName,
          location: p.location,
          priority: p.priority,
          areaM2: p.areaM2,
          contractValue: p.contractValue ? String(p.contractValue) : null,
          startDate: p.startDate ? fmtDate(p.startDate) : "",
          endDate: p.endDate ? fmtDate(p.endDate) : "",
          notes: p.notes,
          phases: p.phases.map((ph) => ({
            ordinal: ph.ordinal,
            name: ph.name,
            hours: ph.hours,
            normHours: ph.normHours,
            kpiPhaseId: ph.kpiPhaseId ?? undefined,
          })),
          assigneeIds: p.assignments.map((a) => a.employeeId),
          leadId: p.assignments.find((a) => a.isLead)?.employeeId ?? null,
          areaBandId: p.areaBandId,
          gradeLevelId: p.gradeLevelId,
          gradeScores: initialGradeScores,
        }}
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
