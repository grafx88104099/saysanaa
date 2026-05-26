"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const levelSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(8),
  minScore: z.number().int().min(0).max(10),
  maxScore: z.number().int().min(0).max(10),
});

const cellSchema = z.object({
  criterionId: z.string(),
  levelId: z.string(),
  body: z.string().max(800),
});

const critSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(120),
  description: z.string().max(200).nullable(),
});

const payloadSchema = z.object({
  levels: z.array(levelSchema),
  criteria: z.array(critSchema),
  cells: z.array(cellSchema),
});

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function saveGradingAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const me = await requireRole("ADMIN");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") || "{}"));
  } catch {
    return { error: "JSON алдаа" };
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { levels, criteria, cells } = parsed.data;

  // Reject payloads larger than reasonable expected size (DoS guard)
  if (levels.length > 20 || criteria.length > 30 || cells.length > 200) {
    return { error: "Payload хэт том" };
  }

  // Verify every client-supplied ID actually exists; reject otherwise
  const [existingLevels, existingCriteria] = await Promise.all([
    prisma.kpiGradeLevel.findMany({ select: { id: true } }),
    prisma.kpiGradeCriterion.findMany({ select: { id: true } }),
  ]);
  const validLevelIds = new Set(existingLevels.map((l) => l.id));
  const validCriterionIds = new Set(existingCriteria.map((c) => c.id));

  for (const l of levels) {
    if (!validLevelIds.has(l.id)) return { error: `Үл мэдэгдэх level: ${l.id}` };
    if (l.minScore > l.maxScore)
      return { error: `${l.label}: minScore нь maxScore-оос их байж болохгүй` };
  }
  for (const c of criteria) {
    if (!validCriterionIds.has(c.id)) return { error: `Үл мэдэгдэх criterion: ${c.id}` };
  }
  for (const x of cells) {
    if (!validCriterionIds.has(x.criterionId) || !validLevelIds.has(x.levelId)) {
      return { error: "Үл мэдэгдэх cell ID" };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const l of levels) {
      await tx.kpiGradeLevel.update({
        where: { id: l.id },
        data: { label: l.label, minScore: l.minScore, maxScore: l.maxScore },
      });
    }
    for (const c of criteria) {
      await tx.kpiGradeCriterion.update({
        where: { id: c.id },
        data: { label: c.label, description: c.description ?? null },
      });
    }
    for (const x of cells) {
      await tx.kpiCriterionLevelDesc.upsert({
        where: { criterionId_levelId: { criterionId: x.criterionId, levelId: x.levelId } },
        update: { body: x.body },
        create: { criterionId: x.criterionId, levelId: x.levelId, body: x.body },
      });
    }
  });

  await audit("kpi.grading.save", me.uid, "all", {
    levels: levels.length,
    criteria: criteria.length,
    cells: cells.length,
  });
  revalidatePath("/admin/kpi/grading");
  return { ok: true };
}
