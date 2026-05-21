"use server";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { calcEndDate, loadHolidayKeys } from "@/lib/calendar";
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
  // formData has phaseHours[0..N] strings
  const result: { ordinal: number; hours: number }[] = [];
  formData.forEach((v, k) => {
    const m = k.match(/^phaseHours\[(\d+)\]$/);
    if (m) {
      const ord = parseInt(m[1], 10);
      const raw = parseInt(String(v), 10) || 0;
      const h = Math.max(0, Math.min(MAX_PHASE_HOURS, raw));
      result.push({ ordinal: ord, hours: h });
    }
  });
  return result.sort((a, b) => a.ordinal - b.ordinal);
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
  if (phaseInput.length !== template.length) {
    return { error: "Фазын мэдээлэл бүрэн биш байна" };
  }
  const phases = template.map((t) => {
    const ph = phaseInput.find((p) => p.ordinal === t.ordinal);
    return { ordinal: t.ordinal, name: t.name, hours: ph?.hours ?? t.hours };
  });
  const totalHours = phases.reduce((s, p) => s + p.hours, 0);

  const { ids: assigneeIds, lead } = readAssignments(formData);
  if (assigneeIds.length === 0) return { error: "Дор хаяж 1 хариуцагч сонгоно уу" };

  const holidayKeys = await loadHolidayKeys();
  const startDate = new Date(d.startDate);
  const endDate = d.endDate
    ? new Date(d.endDate)
    : calcEndDate(startDate, totalHours, holidayKeys);

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
        totalWorkDays: Math.ceil(totalHours / 8),
        notes: d.notes || null,
        createdBy: me.uid,
        phases: { create: phases },
        assignments: {
          create: assigneeIds.map((id) => ({
            employeeId: id,
            isLead: id === lead,
          })),
        },
      },
    }),
  );
  await audit("project.create", me.uid, project.id, { code: project.code, type: project.type });
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
  const phases = template.map((t) => {
    const ph = phaseInput.find((p) => p.ordinal === t.ordinal);
    return { ordinal: t.ordinal, name: t.name, hours: ph?.hours ?? t.hours };
  });
  const { ids: assigneeIds, lead } = readAssignments(formData);

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
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        notes: d.notes || null,
      },
    });
    // upsert phases by ordinal, keep progressPct
    for (const p of phases) {
      const found = existing.phases.find((x) => x.ordinal === p.ordinal);
      if (found) {
        await tx.projectPhase.update({
          where: { id: found.id },
          data: { name: p.name, hours: p.hours },
        });
      } else {
        await tx.projectPhase.create({
          data: { projectId: id, ordinal: p.ordinal, name: p.name, hours: p.hours },
        });
      }
    }
    // remove orphan phases (if type changed → fewer ordinals)
    const keepOrds = phases.map((p) => p.ordinal);
    await tx.projectPhase.deleteMany({
      where: { projectId: id, ordinal: { notIn: keepOrds } },
    });

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
  await audit("project.update", me.uid, id);
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

export async function updatePhaseProgressAction(phaseId: string, progressPct: number) {
  const me = await requireUser();
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));
  const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase) return { error: "Олдсонгүй" } as const;

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
