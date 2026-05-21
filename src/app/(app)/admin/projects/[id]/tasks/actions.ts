"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { recalcPhaseAndProject } from "@/lib/tasks";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

/** Project-руу хандах эрх шалгана: ADMIN/PM эсвэл уг төслийн lead/assignee */
async function ensureProjectAccess(projectId: string, level: "manage" | "view") {
  const me = await requireUser();
  if (me.role === "ADMIN" || me.role === "PM") return { me, isManager: true, myEmpId: null as string | null };

  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!myEmp) throw new Error("Эрх дутуу байна");
  const assn = await prisma.projectAssignment.findFirst({
    where: { projectId, employeeId: myEmp.id },
  });
  if (!assn) throw new Error("Эрх дутуу байна");

  if (level === "manage" && !assn.isLead) {
    // зөвхөн lead manage хийнэ; бусад нь зөвхөн status update + comment-д хязгаарлагдмал
    throw new Error("Зөвхөн төслийн лид task үүсгэх/устгах эрхтэй");
  }
  return { me, isManager: false, myEmpId: myEmp.id };
}

async function ensureProjectAccessSoft(projectId: string) {
  // assigneeId-р статусаа өөрчилж буй хүн зүгээр assignee нь байж болно
  const me = await requireUser();
  if (me.role === "ADMIN" || me.role === "PM") return { me, isManager: true, myEmpId: null as string | null };
  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!myEmp) throw new Error("Эрх дутуу байна");
  const assn = await prisma.projectAssignment.findFirst({
    where: { projectId, employeeId: myEmp.id },
  });
  if (!assn) throw new Error("Эрх дутуу байна");
  return { me, isManager: false, myEmpId: myEmp.id, isLead: assn.isLead };
}

const createSchema = z.object({
  phaseId: z.string().min(1),
  title: z.string().min(1, "Гарчиг оруулна уу").max(160),
  assigneeId: z.string().optional().or(z.literal("")),
  priority: z.nativeEnum(TaskPriority).default("NORMAL"),
  estimatedHours: z.coerce.number().min(0).max(500).optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо буруу")
    .optional()
    .or(z.literal("")),
});

export type CreateTaskState =
  | { error?: string; ok?: boolean }
  | undefined;

export async function createTaskAction(
  projectId: string,
  _prev: CreateTaskState,
  formData: FormData,
): Promise<CreateTaskState> {
  const parsed = createSchema.safeParse({
    phaseId: String(formData.get("phaseId") || ""),
    title: String(formData.get("title") || "").trim(),
    assigneeId: String(formData.get("assigneeId") || "").trim(),
    priority: (formData.get("priority") as TaskPriority) ?? "NORMAL",
    estimatedHours: formData.get("estimatedHours") || null,
    dueDate: String(formData.get("dueDate") || "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Verify phase belongs to project
  const phase = await prisma.projectPhase.findUnique({ where: { id: d.phaseId } });
  if (!phase || phase.projectId !== projectId) return { error: "Phase олдсонгүй" };

  const { me } = await ensureProjectAccess(projectId, "manage");

  const maxOrdinal = await prisma.task.aggregate({
    where: { phaseId: d.phaseId },
    _max: { ordinal: true },
  });
  const ordinal = (maxOrdinal._max.ordinal ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      phaseId: d.phaseId,
      ordinal,
      title: d.title,
      assigneeId: d.assigneeId || null,
      priority: d.priority,
      estimatedHours: d.estimatedHours ?? null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      createdBy: me.uid,
    },
  });
  await recalcPhaseAndProject(d.phaseId);
  await audit("task.create", me.uid, task.id, { title: task.title });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return { error: "Олдсонгүй" } as const;

  const access = await ensureProjectAccessSoft(task.phase.projectId);
  // Assignee өөрийнхөөрөө статус өөрчилж болно, бусад нь PM/ADMIN/lead л
  if (!access.isManager && !access.isLead && task.assigneeId !== access.myEmpId) {
    return { error: "Зөвхөн өөрийн оногдсон task-ийн статус өөрчилнө" } as const;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      startedAt:
        status === "DOING" && !task.startedAt ? new Date() : task.startedAt,
      completedAt:
        status === "DONE" ? new Date() : task.completedAt ? null : null,
    },
  });
  await recalcPhaseAndProject(task.phaseId);
  await audit("task.status", access.me.uid, taskId, { status });
  revalidatePath(`/admin/projects/${task.phase.projectId}`);
  revalidatePath(`/projects/${task.phase.projectId}`);
  return { ok: true } as const;
}

const updateSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(5000).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  priority: z.nativeEnum(TaskPriority),
  estimatedHours: z.coerce.number().min(0).max(500).optional().nullable(),
  actualHours: z.coerce.number().min(0).max(500).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  blockedReason: z.string().max(500).optional().or(z.literal("")),
});

export async function updateTaskAction(taskId: string, formData: FormData) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return { error: "Олдсонгүй" } as const;
  const access = await ensureProjectAccess(task.phase.projectId, "manage");

  const parsed = updateSchema.safeParse({
    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    assigneeId: String(formData.get("assigneeId") || ""),
    priority: formData.get("priority") as TaskPriority,
    estimatedHours: formData.get("estimatedHours") || null,
    actualHours: formData.get("actualHours") || null,
    dueDate: String(formData.get("dueDate") || ""),
    blockedReason: String(formData.get("blockedReason") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message } as const;
  const d = parsed.data;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: d.title,
      description: d.description || null,
      assigneeId: d.assigneeId || null,
      priority: d.priority,
      estimatedHours: d.estimatedHours ?? null,
      actualHours: d.actualHours ?? null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      blockedReason: d.blockedReason || null,
    },
  });
  await recalcPhaseAndProject(task.phaseId);
  await audit("task.update", access.me.uid, taskId);
  revalidatePath(`/admin/projects/${task.phase.projectId}`);
  revalidatePath(`/projects/${task.phase.projectId}`);
  return { ok: true } as const;
}

export async function deleteTaskAction(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return;
  const access = await ensureProjectAccess(task.phase.projectId, "manage");
  const projectId = task.phase.projectId;
  const phaseId = task.phaseId;
  await prisma.task.delete({ where: { id: taskId } });
  await recalcPhaseAndProject(phaseId);
  await audit("task.delete", access.me.uid, taskId);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function togglePhaseLockAction(phaseId: string, locked: boolean) {
  const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase) return;
  const access = await ensureProjectAccess(phase.projectId, "manage");
  await prisma.projectPhase.update({
    where: { id: phaseId },
    data: { progressLocked: locked },
  });
  if (!locked) await recalcPhaseAndProject(phaseId);
  await audit(locked ? "phase.lock" : "phase.unlock", access.me.uid, phaseId);
  revalidatePath(`/admin/projects/${phase.projectId}`);
  revalidatePath(`/projects/${phase.projectId}`);
}

// ── Checklist ──────────────────────────────────────────────────────────────
export async function addChecklistItemAction(taskId: string, text: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return { error: "Олдсонгүй" } as const;
  await ensureProjectAccessSoft(task.phase.projectId);
  const max = await prisma.taskChecklist.aggregate({
    where: { taskId },
    _max: { ordinal: true },
  });
  await prisma.taskChecklist.create({
    data: { taskId, text: text.slice(0, 200), ordinal: (max._max.ordinal ?? -1) + 1 },
  });
  revalidatePath(`/admin/projects/${task.phase.projectId}`);
  revalidatePath(`/projects/${task.phase.projectId}`);
  return { ok: true } as const;
}

export async function toggleChecklistItemAction(itemId: string, done: boolean) {
  const item = await prisma.taskChecklist.findUnique({
    where: { id: itemId },
    include: { task: { include: { phase: true } } },
  });
  if (!item) return;
  await ensureProjectAccessSoft(item.task.phase.projectId);
  await prisma.taskChecklist.update({ where: { id: itemId }, data: { done } });
  revalidatePath(`/admin/projects/${item.task.phase.projectId}`);
  revalidatePath(`/projects/${item.task.phase.projectId}`);
}

export async function deleteChecklistItemAction(itemId: string) {
  const item = await prisma.taskChecklist.findUnique({
    where: { id: itemId },
    include: { task: { include: { phase: true } } },
  });
  if (!item) return;
  await ensureProjectAccess(item.task.phase.projectId, "manage");
  await prisma.taskChecklist.delete({ where: { id: itemId } });
  revalidatePath(`/admin/projects/${item.task.phase.projectId}`);
}

// ── Comments ───────────────────────────────────────────────────────────────
export async function addCommentAction(taskId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Сэтгэгдэл хоосон байж болохгүй" } as const;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return { error: "Олдсонгүй" } as const;
  const access = await ensureProjectAccessSoft(task.phase.projectId);
  const myEmp = access.myEmpId
    ? await prisma.employee.findUnique({ where: { id: access.myEmpId } })
    : await prisma.employee.findUnique({ where: { userId: access.me.uid } });
  if (!myEmp) return { error: "Бүртгэлгүй ажилтан" } as const;
  await prisma.taskComment.create({
    data: { taskId, authorId: myEmp.id, body: trimmed.slice(0, 2000) },
  });
  await audit("task.comment", access.me.uid, taskId);
  revalidatePath(`/admin/projects/${task.phase.projectId}`);
  revalidatePath(`/projects/${task.phase.projectId}`);
  return { ok: true } as const;
}

export async function deleteCommentAction(commentId: string) {
  const c = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { include: { phase: true } } },
  });
  if (!c) return;
  const access = await ensureProjectAccessSoft(c.task.phase.projectId);
  // зөвхөн өөрийн сэтгэгдлийг устгана (эсвэл admin/pm)
  const myEmp = access.myEmpId
    ? { id: access.myEmpId }
    : await prisma.employee.findUnique({ where: { userId: access.me.uid }, select: { id: true } });
  if (!access.isManager && (!myEmp || myEmp.id !== c.authorId)) {
    throw new Error("Зөвхөн өөрийн сэтгэгдлийг устгана");
  }
  await prisma.taskComment.delete({ where: { id: commentId } });
  revalidatePath(`/admin/projects/${c.task.phase.projectId}`);
}

// ── Attachments ────────────────────────────────────────────────────────────
export async function addAttachmentAction(
  taskId: string,
  url: string,
  name: string,
  size: number | null,
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return { error: "Олдсонгүй" } as const;
  const access = await ensureProjectAccessSoft(task.phase.projectId);
  await prisma.taskAttachment.create({
    data: { taskId, url, name, size, uploadedBy: access.me.uid },
  });
  await audit("task.attach", access.me.uid, taskId, { name });
  revalidatePath(`/admin/projects/${task.phase.projectId}`);
  revalidatePath(`/projects/${task.phase.projectId}`);
  return { ok: true } as const;
}

export async function removeAttachmentAction(attachmentId: string) {
  const a = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { phase: true } } },
  });
  if (!a) return;
  await ensureProjectAccess(a.task.phase.projectId, "manage");
  try {
    const { deleteFromBucket } = await import("@/lib/storage");
    await deleteFromBucket("task-files", a.url);
  } catch {}
  await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/admin/projects/${a.task.phase.projectId}`);
}
