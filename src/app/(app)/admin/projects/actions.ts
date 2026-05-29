"use server";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { calcEndDate, calcWorkDaysBetween, loadHolidayKeys } from "@/lib/calendar";
import {
  createProjectWithUniqueCode,
  generateProjectCode,
  getPhaseTemplate,
  recalcProjectStats,
} from "@/lib/projects";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProjectStatus, ProjectType } from "@prisma/client";

const baseProjectSchema = z.object({
  type: z.nativeEnum(ProjectType),
  code: z
    .string()
    .min(3, "Код хэт богино")
    .max(20, "Код хэт урт")
    .regex(/^[A-Z0-9-]+$/i, "Зөвхөн үсэг, тоо, зураас"),
  name: z.string().min(1, "Объектын нэр оруулна уу").max(160),
  purpose: z.string().max(40).optional().or(z.literal("")),
  clientName: z.string().min(1, "Захиалагч оруулна уу").max(120),
  location: z.string().max(160).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1, "Priority 1-ээс бага байж болохгүй").max(10),
  areaM2: z.coerce.number().min(0).max(100000).optional().nullable(),
  contractValue: z.coerce.number().min(0).max(1e12).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Эхлэх огноо буруу"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

const MAX_PHASE_HOURS = 2000;

export type ProjectFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function readPhases(formData: FormData) {
  // formData has phaseHours[0..N] / phaseNormHours[ord] / phaseKpiId[ord] / phaseName[ord]
  const byOrd = new Map<
    number,
    { hours?: number; normHours?: number; kpiPhaseId?: string; name?: string }
  >();
  const ensure = (ord: number) => {
    if (!byOrd.has(ord)) byOrd.set(ord, {});
    return byOrd.get(ord)!;
  };
  const clampHrs = (n: number) =>
    Math.max(0, Math.min(MAX_PHASE_HOURS, Math.round(n)));
  formData.forEach((v, k) => {
    let m = k.match(/^phaseHours\[(\d+)\]$/);
    if (m) {
      const ord = parseInt(m[1], 10);
      ensure(ord).hours = clampHrs(parseFloat(String(v)) || 0);
      return;
    }
    m = k.match(/^phaseNormHours\[(\d+)\]$/);
    if (m) {
      ensure(parseInt(m[1], 10)).normHours = clampHrs(parseFloat(String(v)) || 0);
      return;
    }
    m = k.match(/^phaseKpiId\[(\d+)\]$/);
    if (m) {
      ensure(parseInt(m[1], 10)).kpiPhaseId = String(v) || undefined;
      return;
    }
    m = k.match(/^phaseName\[(\d+)\]$/);
    if (m) {
      ensure(parseInt(m[1], 10)).name = String(v) || undefined;
    }
  });
  const result: {
    ordinal: number;
    hours: number;
    normHours: number;
    kpiPhaseId: string | null;
    name: string | null;
  }[] = [];
  for (const [ord, x] of byOrd.entries()) {
    result.push({
      ordinal: ord,
      hours: x.hours ?? 0,
      normHours: x.normHours ?? 0,
      kpiPhaseId: x.kpiPhaseId ?? null,
      name: x.name ?? null,
    });
  }
  return result.sort((a, b) => a.ordinal - b.ordinal);
}

function readGradeScores(formData: FormData) {
  const scores: { criterionId: string; score: number }[] = [];
  formData.forEach((v, k) => {
    const m = k.match(/^gradeScore\[([^\]]+)\]$/);
    if (m) {
      const s = parseInt(String(v), 10) || 0;
      if (s > 0) scores.push({ criterionId: m[1], score: Math.max(1, Math.min(10, s)) });
    }
  });
  return scores;
}

function readAssignments(formData: FormData) {
  const ids = formData.getAll("assigneeIds").map(String).filter(Boolean);
  const lead = String(formData.get("leadId") || "").trim() || null;
  return { ids: Array.from(new Set(ids)).slice(0, 5), lead };
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = baseProjectSchema.safeParse({
    type: formData.get("type"),
    code: String(formData.get("code") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    purpose: String(formData.get("purpose") || "").trim(),
    clientName: String(formData.get("clientName") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    priority: formData.get("priority"),
    areaM2: formData.get("areaM2") || null,
    contractValue: formData.get("contractValue") || null,
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[i.path[0]?.toString() ?? "_"] = i.message));
    return { error: "Талбар буруу байна", fieldErrors: fe };
  }
  const d = parsed.data;

  const phaseInput = readPhases(formData);
  const template = getPhaseTemplate(d.type);
  const isDesign = d.type === "DESIGN";

  // For DESIGN: if KPI phases were used (kpiPhaseId present), trust the form's phase list.
  // For BUILD or DESIGN without KPI: use the static template as the source of truth.
  const usingKpi = isDesign && phaseInput.some((p) => p.kpiPhaseId);
  const phases = usingKpi
    ? phaseInput.map((p) => ({
        ordinal: p.ordinal,
        name: p.name || `Фаз ${p.ordinal + 1}`,
        hours: p.hours,
        normHours: p.normHours,
        kpiPhaseId: p.kpiPhaseId,
      }))
    : template.map((t) => {
        const ph = phaseInput.find((p) => p.ordinal === t.ordinal);
        return {
          ordinal: t.ordinal,
          name: t.name,
          hours: ph?.hours ?? t.hours,
          normHours: 0,
          kpiPhaseId: null as string | null,
        };
      });

  if (!usingKpi && phaseInput.length !== template.length) {
    return { error: "Фазын мэдээлэл бүрэн биш байна" };
  }
  const isBuild = d.type === "BUILD";
  if (isBuild && !d.endDate) {
    return { error: "Засал гүйцэтгэлийн төсөлд дуусах огноо заавал оруулна уу" };
  }
  const expectedHours = phases.reduce((s, p) => s + (p.normHours || 0), 0);

  const { ids: assigneeIds, lead } = readAssignments(formData);
  if (assigneeIds.length === 0) return { error: "Дор хаяж 1 хариуцагч сонгоно уу" };

  // KPI grading
  const areaBandId = String(formData.get("areaBandId") || "").trim() || null;
  const gradeLevelId = String(formData.get("gradeLevelId") || "").trim() || null;
  const gradeScores = readGradeScores(formData);

  const holidayKeys = await loadHolidayKeys();
  const startDate = new Date(d.startDate);
  // Compute total hours/days:
  //   DESIGN — sum of phase hours; endDate auto-derived if absent.
  //   BUILD  — workdays(start, end) × 8; endDate is required user input.
  let totalHours: number;
  let endDate: Date | null;
  let totalWorkDays: number;
  if (isBuild) {
    endDate = new Date(d.endDate!);
    totalWorkDays = calcWorkDaysBetween(startDate, endDate, holidayKeys);
    totalHours = totalWorkDays * 8;
    // BUILD: distribute phase hours so that sum(phases.hours) === totalHours.
    // Each phase's form-supplied hours become a proportional share of the
    // calendar-derived total; if user-entered values are zero or undefined,
    // distribute evenly. This keeps phase-sum and project total consistent.
    const userSum = phases.reduce((s, p) => s + p.hours, 0);
    if (userSum > 0 && phases.length > 0) {
      const scale = totalHours / userSum;
      let running = 0;
      for (let i = 0; i < phases.length; i++) {
        const v = i === phases.length - 1
          ? totalHours - running
          : Math.round(phases[i].hours * scale);
        phases[i].hours = Math.max(0, v);
        running += phases[i].hours;
      }
    } else if (phases.length > 0) {
      const per = Math.floor(totalHours / phases.length);
      const remainder = totalHours - per * phases.length;
      for (let i = 0; i < phases.length; i++) {
        phases[i].hours = per + (i === phases.length - 1 ? remainder : 0);
      }
    }
  } else {
    totalHours = phases.reduce((s, p) => s + p.hours, 0);
    endDate = d.endDate
      ? new Date(d.endDate)
      : calcEndDate(startDate, totalHours, holidayKeys);
    totalWorkDays = Math.ceil(totalHours / 8);
  }

  // Snapshot criterion labels for grading history (defends against criterion rename/delete)
  let gradeScoreData: { criterionId: string; criterionLabel: string; score: number }[] = [];
  if (isDesign && gradeScores.length > 0) {
    const criteria = await prisma.kpiGradeCriterion.findMany({
      where: { id: { in: gradeScores.map((g) => g.criterionId) } },
      select: { id: true, label: true },
    });
    const labelMap = new Map(criteria.map((c) => [c.id, c.label]));
    gradeScoreData = gradeScores
      .filter((g) => labelMap.has(g.criterionId))
      .map((g) => ({
        criterionId: g.criterionId,
        criterionLabel: labelMap.get(g.criterionId) ?? "",
        score: g.score,
      }));
  }

  const project = await createProjectWithUniqueCode(d.type, d.code, (code) =>
    prisma.project.create({
      data: {
        code,
        type: d.type,
        name: d.name,
        purpose: d.purpose || null,
        clientName: d.clientName,
        location: d.location || null,
        priority: d.priority,
        areaM2: d.areaM2 ?? null,
        contractValue: d.contractValue ? String(d.contractValue) : null,
        startDate,
        endDate,
        totalHours,
        totalWorkDays,
        notes: d.notes || null,
        createdBy: me.uid,
        areaBandId: isDesign ? areaBandId : null,
        gradeLevelId: isDesign ? gradeLevelId : null,
        gradeScoredAt: isDesign && gradeLevelId ? new Date() : null,
        expectedHours,
        phases: { create: phases },
        assignments: {
          create: assigneeIds.map((id) => ({
            employeeId: id,
            isLead: id === lead,
          })),
        },
        ...(gradeScoreData.length > 0
          ? { gradeScores: { create: gradeScoreData } }
          : {}),
      },
    }),
  );
  await audit("project.create", me.uid, project.id, {
    code: project.code,
    type: project.type,
    grade: gradeLevelId,
    band: areaBandId,
  });
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${project.id}`);
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = baseProjectSchema.safeParse({
    type: formData.get("type"),
    code: String(formData.get("code") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    purpose: String(formData.get("purpose") || "").trim(),
    clientName: String(formData.get("clientName") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    priority: formData.get("priority"),
    areaM2: formData.get("areaM2") || null,
    contractValue: formData.get("contractValue") || null,
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[i.path[0]?.toString() ?? "_"] = i.message));
    return { error: "Талбар буруу байна", fieldErrors: fe };
  }
  const d = parsed.data;
  const existing = await prisma.project.findUnique({
    where: { id },
    include: { phases: true, assignments: true },
  });
  if (!existing) return { error: "Олдсонгүй" };
  if (d.code !== existing.code) {
    const dup = await prisma.project.findUnique({ where: { code: d.code } });
    if (dup) return { error: "Код давхцаж байна" };
  }

  const phaseInput = readPhases(formData);
  const template = getPhaseTemplate(d.type);
  const isDesign = d.type === "DESIGN";
  const usingKpi = isDesign && phaseInput.some((p) => p.kpiPhaseId);

  const phases = usingKpi
    ? phaseInput.map((p) => ({
        ordinal: p.ordinal,
        name: p.name || `Фаз ${p.ordinal + 1}`,
        hours: p.hours,
        normHours: p.normHours,
        kpiPhaseId: p.kpiPhaseId,
      }))
    : template.map((t) => {
        const ph = phaseInput.find((p) => p.ordinal === t.ordinal);
        return {
          ordinal: t.ordinal,
          name: t.name,
          hours: ph?.hours ?? t.hours,
          normHours: 0,
          kpiPhaseId: null as string | null,
        };
      });

  const isBuild = d.type === "BUILD";
  if (isBuild && !d.endDate) {
    return { error: "Засал гүйцэтгэлийн төсөлд дуусах огноо заавал оруулна уу" };
  }
  const expectedHours = phases.reduce((s, p) => s + (p.normHours || 0), 0);
  const { ids: assigneeIds, lead } = readAssignments(formData);

  // KPI grading on edit (DESIGN only)
  const areaBandId = String(formData.get("areaBandId") || "").trim() || null;
  const gradeLevelId = String(formData.get("gradeLevelId") || "").trim() || null;
  const gradeScores = readGradeScores(formData);

  // Recompute total hours/days. BUILD: derived from dates. DESIGN: phase-sum.
  const startDateD = new Date(d.startDate);
  let editTotalHours: number;
  let editTotalWorkDays: number;
  let editEndDate: Date | null;
  if (isBuild) {
    const holidayKeys = await loadHolidayKeys();
    editEndDate = new Date(d.endDate!);
    editTotalWorkDays = calcWorkDaysBetween(startDateD, editEndDate, holidayKeys);
    editTotalHours = editTotalWorkDays * 8;
    // Distribute phase hours so sum(phases.hours) === editTotalHours (same as create flow).
    const userSum = phases.reduce((s, p) => s + p.hours, 0);
    if (userSum > 0 && phases.length > 0) {
      const scale = editTotalHours / userSum;
      let running = 0;
      for (let i = 0; i < phases.length; i++) {
        const v =
          i === phases.length - 1
            ? editTotalHours - running
            : Math.round(phases[i].hours * scale);
        phases[i].hours = Math.max(0, v);
        running += phases[i].hours;
      }
    } else if (phases.length > 0) {
      const per = Math.floor(editTotalHours / phases.length);
      const remainder = editTotalHours - per * phases.length;
      for (let i = 0; i < phases.length; i++) {
        phases[i].hours = per + (i === phases.length - 1 ? remainder : 0);
      }
    }
  } else {
    editTotalHours = phases.reduce((s, p) => s + p.hours, 0);
    editEndDate = d.endDate ? new Date(d.endDate) : null;
    editTotalWorkDays = Math.ceil(editTotalHours / 8);
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        code: d.code,
        type: d.type,
        name: d.name,
        purpose: d.purpose || null,
        clientName: d.clientName,
        location: d.location || null,
        priority: d.priority,
        areaM2: d.areaM2 ?? null,
        contractValue: d.contractValue ? String(d.contractValue) : null,
        startDate: startDateD,
        endDate: editEndDate,
        totalHours: editTotalHours,
        totalWorkDays: editTotalWorkDays,
        notes: d.notes || null,
        // KPI metadata (DESIGN only — BUILD always clears)
        areaBandId: isDesign ? areaBandId : null,
        expectedHours: isDesign ? expectedHours : 0,
        gradeLevelId: isDesign ? gradeLevelId : null,
        gradeScoredAt: isDesign && gradeLevelId ? new Date() : null,
      },
    });
    // upsert phases by ordinal, keep progressPct
    for (const p of phases) {
      const found = existing.phases.find((x) => x.ordinal === p.ordinal);
      if (found) {
        await tx.projectPhase.update({
          where: { id: found.id },
          data: {
            name: p.name,
            hours: p.hours,
            normHours: p.normHours,
            kpiPhaseId: p.kpiPhaseId,
          },
        });
      } else {
        await tx.projectPhase.create({
          data: {
            projectId: id,
            ordinal: p.ordinal,
            name: p.name,
            hours: p.hours,
            normHours: p.normHours,
            kpiPhaseId: p.kpiPhaseId,
          },
        });
      }
    }
    // remove orphan phases (if type changed → fewer ordinals)
    const keepOrds = phases.map((p) => p.ordinal);
    await tx.projectPhase.deleteMany({
      where: { projectId: id, ordinal: { notIn: keepOrds } },
    });

    // sync grade scores (DESIGN only)
    if (isDesign) {
      await tx.projectGradeScore.deleteMany({ where: { projectId: id } });
      if (gradeScores.length > 0) {
        // Fetch criterion labels to snapshot them
        const criteria = await tx.kpiGradeCriterion.findMany({
          where: { id: { in: gradeScores.map((g) => g.criterionId) } },
          select: { id: true, label: true },
        });
        const labelMap = new Map(criteria.map((c) => [c.id, c.label]));
        await tx.projectGradeScore.createMany({
          data: gradeScores
            .filter((g) => labelMap.has(g.criterionId))
            .map((g) => ({
              projectId: id,
              criterionId: g.criterionId,
              criterionLabel: labelMap.get(g.criterionId) ?? "",
              score: g.score,
            })),
        });
      }
    }

    // sync assignments
    await tx.projectAssignment.deleteMany({ where: { projectId: id } });
    if (assigneeIds.length > 0) {
      await tx.projectAssignment.createMany({
        data: assigneeIds.map((eid) => ({
          projectId: id,
          employeeId: eid,
          isLead: eid === lead,
        })),
      });
    }
  });

  await recalcProjectStats(id);
  await audit("project.update", me.uid, id, {
    grade: gradeLevelId,
    band: areaBandId,
  });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  redirect(`/admin/projects/${id}`);
}

export async function changeStatusAction(id: string, status: ProjectStatus) {
  const me = await requireRole("ADMIN", "PM");
  await prisma.project.update({ where: { id }, data: { status } });
  await audit("project.status_change", me.uid, id, { status });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
}

const closeSchema = z.object({
  qualityRating: z.number().int().min(1).max(5),
  clientSatisfaction: z.number().int().min(1).max(5).nullable(),
  actualGradeLevelId: z.string().nullable(),
  closingNote: z.string().max(500).nullable(),
});

export type CloseState = { ok?: boolean; error?: string } | undefined;

export async function closeProjectAction(
  projectId: string,
  _prev: CloseState,
  formData: FormData
): Promise<CloseState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = closeSchema.safeParse({
    qualityRating: parseInt(String(formData.get("qualityRating") || "0")) || 0,
    clientSatisfaction: formData.get("clientSatisfaction")
      ? parseInt(String(formData.get("clientSatisfaction")))
      : null,
    actualGradeLevelId: (String(formData.get("actualGradeLevelId") || "").trim() || null) as
      | string
      | null,
    closingNote: (String(formData.get("closingNote") || "").trim() || null) as string | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Resolve actualGrade (validation outside transaction for fast error return)
  let actualGrade = null as { id: string; key: string; label: string } | null;
  if (d.actualGradeLevelId) {
    const lv = await prisma.kpiGradeLevel.findUnique({ where: { id: d.actualGradeLevelId } });
    if (!lv) return { error: "Зэрэглэл буруу" };
    actualGrade = { id: lv.id, key: lv.key, label: lv.label };
  }

  const now = new Date();
  // Mutable box pattern: TS does not narrow object property assignments inside async callbacks,
  // so the values written inside the transaction stay typed for the post-tx audit log.
  const result = {
    workHours: 0,
    clientWaitHours: 0,
    revisionHours: 0,
    efficiency: 0,
    onTime: true,
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Re-read inside transaction to defeat TOCTOU race
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: {
          gradeLevel: true,
          timeEntries: { select: { hours: true, kind: true } },
          kpiSnapshot: true,
        },
      });
      if (!project) throw new Error("NOT_FOUND");
      if (project.status === "COMPLETED" || project.status === "CANCELLED") {
        throw new Error("ALREADY_CLOSED");
      }

      // Fallback: if PM didn't override actualGrade, use the existing expected gradeLevel
      if (!actualGrade && project.gradeLevel) {
        actualGrade = {
          id: project.gradeLevel.id,
          key: project.gradeLevel.key,
          label: project.gradeLevel.label,
        };
      }

      // Aggregate time entries
      let workHours = 0;
      let clientWaitHours = 0;
      let revisionHours = 0;
      for (const te of project.timeEntries) {
        if (te.kind === "WORK") workHours += te.hours;
        else if (te.kind === "CLIENT_WAIT") clientWaitHours += te.hours;
        else revisionHours += te.hours;
      }
      const totalActualHours = workHours + revisionHours;
      const normHours = project.expectedHours || project.totalHours;
      const efficiency = totalActualHours > 0 ? normHours / totalActualHours : 0;
      // onTime: compare against end-of-day on endDate so closing on deadline day counts as on-time
      let onTime = true;
      if (project.endDate) {
        const endOfDay = new Date(project.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        onTime = now <= endOfDay;
      }
      result.workHours = workHours;
      result.clientWaitHours = clientWaitHours;
      result.revisionHours = revisionHours;
      result.efficiency = efficiency;
      result.onTime = onTime;

      await tx.project.update({
        where: { id: projectId },
        data: {
          status: "COMPLETED",
          closedAt: now,
          qualityRating: d.qualityRating,
          clientSatisfaction: d.clientSatisfaction,
          actualGradeLevelId: actualGrade?.id ?? null,
          notes: d.closingNote
            ? `${project.notes ? project.notes + "\n\n" : ""}— Хаалт (${now.toISOString().slice(0, 10)}): ${d.closingNote}`
            : project.notes,
        },
      });

      const snapshotData = {
        normHours,
        workHours,
        clientWaitHours,
        revisionHours,
        totalActualHours,
        efficiency,
        onTime,
        expectedGradeKey: project.gradeLevel?.key ?? null,
        actualGradeKey: actualGrade?.key ?? null,
        qualityRating: d.qualityRating,
        clientSatisfaction: d.clientSatisfaction,
        closedAt: now,
        createdBy: me.uid,
      };
      if (project.kpiSnapshot) {
        await tx.projectKpiSnapshot.update({
          where: { projectId },
          data: snapshotData,
        });
      } else {
        await tx.projectKpiSnapshot.create({
          data: { projectId, ...snapshotData },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "ALREADY_CLOSED") return { error: "Төсөл аль хэдийн хаагдсан" };
    if (msg === "NOT_FOUND") return { error: "Олдсонгүй" };
    throw e;
  }

  await audit("project.close", me.uid, projectId, {
    qualityRating: d.qualityRating,
    clientSatisfaction: d.clientSatisfaction,
    actualGrade: actualGrade?.key,
    efficiency: result.efficiency.toFixed(2),
    onTime: result.onTime,
  });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updatePhaseProgressAction(phaseId: string, progressPct: number) {
  const me = await requireUser();
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));
  const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase) return { error: "Олдсонгүй" } as const;

  // The drag slider in PhaseRow renders only when progressLocked. If the phase
  // is in Auto mode, refuse manual writes — they would be overwritten by
  // recalcProjectStats anyway, and an audit trail of "manual change to an auto
  // phase" is misleading.
  if (!phase.progressLocked) {
    return {
      error: "Фаз нь автомат — эхлээд '🔒 Гар' горимд шилжүүлнэ үү",
    } as const;
  }

  // Эрхийн зураглал: ADMIN/PM — бүх фаз; өөр role-уудаас зөвхөн төслийн LEAD л фаз progress-ийг өөрчилнө.
  // Энэ нь хувь хувийн ажилтан санамсаргүй ахицыг гажуудуулахаас сэргийлнэ.
  if (me.role !== "ADMIN" && me.role !== "PM") {
    const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
    if (!myEmp) return { error: "Эрх дутуу байна" } as const;
    const lead = await prisma.projectAssignment.findFirst({
      where: {
        projectId: phase.projectId,
        employeeId: myEmp.id,
        isLead: true,
      },
    });
    if (!lead) {
      return {
        error: "Зөвхөн төслийн лид эсвэл удирдлага фазын ахицыг өөрчилнө",
      } as const;
    }
  }

  await prisma.projectPhase.update({
    where: { id: phaseId },
    data: {
      progressPct: pct,
      startedAt: pct > 0 && !phase.startedAt ? new Date() : phase.startedAt,
      completedAt: pct === 100 ? new Date() : pct < 100 && phase.completedAt ? null : phase.completedAt,
    },
  });
  await recalcProjectStats(phase.projectId);
  await audit("project.phase_progress", me.uid, phase.id, { pct });
  revalidatePath(`/admin/projects/${phase.projectId}`);
  revalidatePath(`/projects/${phase.projectId}`);
  return { ok: true } as const;
}

export async function fetchNextCode(type: ProjectType) {
  await requireRole("ADMIN", "PM");
  return generateProjectCode(type);
}

export async function setContractAction(
  projectId: string,
  url: string,
  name: string,
) {
  const me = await requireRole("ADMIN", "PM");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Олдсонгүй" } as const;

  // delete previous file if exists
  if (project.contractUrl) {
    try {
      const { deleteFromBucket, CONTRACTS_BUCKET } = await import("@/lib/storage");
      await deleteFromBucket(CONTRACTS_BUCKET, project.contractUrl);
    } catch {}
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { contractUrl: url, contractName: name, contractAt: new Date() },
  });
  await audit("project.contract_upload", me.uid, projectId, { name });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true } as const;
}

export async function removeContractAction(projectId: string) {
  const me = await requireRole("ADMIN", "PM");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.contractUrl) return;
  try {
    const { deleteFromBucket, CONTRACTS_BUCKET } = await import("@/lib/storage");
    await deleteFromBucket(CONTRACTS_BUCKET, project.contractUrl);
  } catch {}
  await prisma.project.update({
    where: { id: projectId },
    data: { contractUrl: null, contractName: null, contractAt: null },
  });
  await audit("project.contract_remove", me.uid, projectId);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
}
