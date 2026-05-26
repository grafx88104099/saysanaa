"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TimeKind } from "@prisma/client";

const entrySchema = z.object({
  projectId: z.string().min(1),
  phaseId: z.string().min(1).nullable(),
  taskId: z.string().min(1).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо буруу"),
  hours: z.number().positive().max(24, "Нэг өдөр 24 цагаас хэтрэхгүй"),
  kind: z.nativeEnum(TimeKind),
  note: z.string().max(300).nullable(),
});

export type TEState = { ok?: boolean; error?: string; id?: string } | undefined;

async function getMyEmployee() {
  const me = await requireUser();
  const emp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!emp) throw new Error("Employee бүртгэлгүй");
  if (!emp.active) throw new Error("Бүртгэл идэвхгүй — цаг бүртгэх боломжгүй");
  return { me, emp };
}

export async function createTimeEntryAction(
  _prev: TEState,
  formData: FormData
): Promise<TEState> {
  let me: Awaited<ReturnType<typeof getMyEmployee>>["me"];
  let emp: Awaited<ReturnType<typeof getMyEmployee>>["emp"];
  try {
    ({ me, emp } = await getMyEmployee());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const parsed = entrySchema.safeParse({
    projectId: String(formData.get("projectId") || "").trim(),
    phaseId: (String(formData.get("phaseId") || "").trim() || null) as string | null,
    taskId: (String(formData.get("taskId") || "").trim() || null) as string | null,
    date: String(formData.get("date") || "").trim(),
    hours: parseFloat(String(formData.get("hours") || "0")) || 0,
    kind: (String(formData.get("kind") || "WORK").trim() as TimeKind) || "WORK",
    note: (String(formData.get("note") || "").trim() || null) as string | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Validate project exists & is assigned to this employee OR user is ADMIN/PM
  const project = await prisma.project.findUnique({
    where: { id: d.projectId },
    include: { assignments: true },
  });
  if (!project) return { error: "Төсөл олдсонгүй" };
  const assigned = project.assignments.some((a) => a.employeeId === emp.id);
  const canLog = assigned || me.role === "ADMIN" || me.role === "PM";
  if (!canLog) return { error: "Энэ төсөлд хариуцагчаар бүртгэлгүй байна" };

  // If phaseId provided, validate it belongs to project
  if (d.phaseId) {
    const phase = await prisma.projectPhase.findUnique({ where: { id: d.phaseId } });
    if (!phase || phase.projectId !== d.projectId) return { error: "Фаз буруу" };
  }
  if (d.taskId) {
    const t = await prisma.task.findUnique({
      where: { id: d.taskId },
      include: { phase: true },
    });
    if (!t || t.phase.projectId !== d.projectId) return { error: "Task буруу" };
  }

  const entry = await prisma.timeEntry.create({
    data: {
      projectId: d.projectId,
      phaseId: d.phaseId,
      taskId: d.taskId,
      employeeId: emp.id,
      date: new Date(d.date),
      hours: d.hours,
      kind: d.kind,
      note: d.note,
      createdBy: me.uid,
    },
  });

  await audit("time.create", me.uid, entry.id, {
    projectId: d.projectId,
    hours: d.hours,
    kind: d.kind,
  });
  revalidatePath("/time");
  revalidatePath(`/admin/projects/${d.projectId}`);
  revalidatePath(`/projects/${d.projectId}`);
  return { ok: true, id: entry.id };
}

export async function updateTimeEntryAction(
  id: string,
  hours: number,
  note: string | null
): Promise<TEState> {
  let me: Awaited<ReturnType<typeof getMyEmployee>>["me"];
  let emp: Awaited<ReturnType<typeof getMyEmployee>>["emp"];
  try {
    ({ me, emp } = await getMyEmployee());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return { error: "Олдсонгүй" };
  const canEdit =
    entry.employeeId === emp.id || me.role === "ADMIN" || me.role === "PM";
  if (!canEdit) return { error: "Эрх дутуу" };
  if (hours <= 0 || hours > 24) return { error: "Цаг 0–24 байх ёстой" };
  await prisma.timeEntry.update({
    where: { id },
    data: { hours, note: note?.slice(0, 300) ?? null },
  });
  await audit("time.update", me.uid, id, { hours });
  revalidatePath("/time");
  revalidatePath(`/admin/projects/${entry.projectId}`);
  return { ok: true };
}

export async function deleteTimeEntryAction(id: string): Promise<TEState> {
  let me: Awaited<ReturnType<typeof getMyEmployee>>["me"];
  let emp: Awaited<ReturnType<typeof getMyEmployee>>["emp"];
  try {
    ({ me, emp } = await getMyEmployee());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return { ok: true };
  const canDelete =
    entry.employeeId === emp.id || me.role === "ADMIN" || me.role === "PM";
  if (!canDelete) return { error: "Эрх дутуу" };
  await prisma.timeEntry.delete({ where: { id } });
  await audit("time.delete", me.uid, id, { projectId: entry.projectId });
  revalidatePath("/time");
  revalidatePath(`/admin/projects/${entry.projectId}`);
  return { ok: true };
}
