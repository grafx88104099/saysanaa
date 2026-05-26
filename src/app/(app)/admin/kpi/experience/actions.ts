"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tierSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(40),
  minYears: z.number().int().min(0).max(99),
  maxYears: z.number().int().min(0).max(99).nullable(),
  allowedLevelIds: z.array(z.string()),
  sortOrder: z.number().int(),
});

const payloadSchema = z.object({
  tiers: z.array(tierSchema),
  deletedTierIds: z.array(z.string()),
});

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function saveExperienceAction(
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

  const { tiers, deletedTierIds } = parsed.data;

  // Validate label uniqueness within payload
  const labels = new Set<string>();
  for (const t of tiers) {
    if (labels.has(t.label)) return { error: `Давхардсан нэр: ${t.label}` };
    labels.add(t.label);
  }

  await prisma.$transaction(async (tx) => {
    if (deletedTierIds.length) {
      await tx.kpiExperienceTier.deleteMany({ where: { id: { in: deletedTierIds } } });
    }
    for (const t of tiers) {
      let tierId = t.id;
      if (tierId) {
        await tx.kpiExperienceTier.update({
          where: { id: tierId },
          data: {
            label: t.label,
            minYears: t.minYears,
            maxYears: t.maxYears,
            sortOrder: t.sortOrder,
          },
        });
        await tx.kpiExperienceTierLevel.deleteMany({ where: { tierId } });
      } else {
        const created = await tx.kpiExperienceTier.create({
          data: {
            label: t.label,
            minYears: t.minYears,
            maxYears: t.maxYears,
            sortOrder: t.sortOrder,
          },
        });
        tierId = created.id;
      }
      for (const lvId of t.allowedLevelIds) {
        await tx.kpiExperienceTierLevel.create({
          data: { tierId: tierId!, levelId: lvId },
        });
      }
    }
  });

  await audit("kpi.experience.save", me.uid, "all", {
    tiers: tiers.length,
    deleted: deletedTierIds.length,
  });
  revalidatePath("/admin/kpi/experience");
  return { ok: true };
}
