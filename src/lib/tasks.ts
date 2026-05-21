import { prisma } from "./db";
import { TaskStatus } from "@prisma/client";

// Статус → ажил гүйцэтгэлийн жинхэнэ %
export const STATUS_TO_PCT: Record<TaskStatus, number> = {
  TODO: 0,
  DOING: 50,
  REVIEW: 90,
  DONE: 100,
  BLOCKED: 0,
};

/**
 * Phase-ийн progress-ийг task-уудаас тооцоолно.
 * - Хэрэв phase.progressLocked === true бол гар тохиргоог хадгална
 * - Task estimatedHours байгаа бол түүгээр жигнэнэ, үгүй бол тэнцүү жинтэй
 * - Task огт байхгүй бол одоогийн утгыг хадгална
 */
export async function recalcPhaseProgressFromTasks(phaseId: string): Promise<number | null> {
  const phase = await prisma.projectPhase.findUnique({
    where: { id: phaseId },
    include: { tasks: { select: { status: true, estimatedHours: true } } },
  });
  if (!phase) return null;
  if (phase.progressLocked) return phase.progressPct;
  if (phase.tasks.length === 0) return phase.progressPct;

  const useWeighted = phase.tasks.some((t) => (t.estimatedHours ?? 0) > 0);
  let total = 0;
  let weighted = 0;
  for (const t of phase.tasks) {
    const w = useWeighted ? t.estimatedHours ?? 0 : 1;
    if (w <= 0) continue;
    total += w;
    weighted += w * STATUS_TO_PCT[t.status];
  }
  const next = total > 0 ? Math.round(weighted / total) : phase.progressPct;

  await prisma.projectPhase.update({
    where: { id: phaseId },
    data: {
      progressPct: next,
      startedAt: next > 0 && !phase.startedAt ? new Date() : phase.startedAt,
      completedAt:
        next === 100
          ? new Date()
          : next < 100 && phase.completedAt
          ? null
          : phase.completedAt,
    },
  });
  return next;
}

/**
 * Phase-н тоонуудыг сэргээгээд project-ийн ерөнхий stats-ийг сэргээнэ.
 */
export async function recalcPhaseAndProject(phaseId: string) {
  const phase = await prisma.projectPhase.findUnique({
    where: { id: phaseId },
    select: { projectId: true },
  });
  if (!phase) return;
  await recalcPhaseProgressFromTasks(phaseId);
  const { recalcProjectStats } = await import("./projects");
  await recalcProjectStats(phase.projectId);
}

/**
 * Олон phase-ийг нэг дор сэргээх (phase progress-уудыг бүгдийг автоматжуулах).
 */
export async function recalcAllPhasesForProject(projectId: string) {
  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    select: { id: true },
  });
  for (const p of phases) {
    await recalcPhaseProgressFromTasks(p.id);
  }
  const { recalcProjectStats } = await import("./projects");
  await recalcProjectStats(projectId);
}
