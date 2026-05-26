"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const cellSchema = z.object({
  bandId: z.string().min(1),
  phaseId: z.string().min(1),
  hours: z.number().nonnegative(),
  pct: z.number().min(0).max(1),
  rateMnt: z.number().nonnegative(),
  quantityNote: z.string().max(120).nullable(),
});

const bandPriceSchema = z.object({
  bandId: z.string().min(1),
  totalPriceMnt: z.number().nonnegative(),
});

const payloadSchema = z.object({
  cells: z.array(cellSchema),
  bandPrices: z.array(bandPriceSchema),
});

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function saveTimelineAction(
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

  const { cells, bandPrices } = parsed.data;

  // DoS guard
  if (cells.length > 500 || bandPrices.length > 50) {
    return { error: "Payload хэт том" };
  }

  await prisma.$transaction(async (tx) => {
    for (const bp of bandPrices) {
      await tx.kpiAreaBand.update({
        where: { id: bp.bandId },
        data: { totalPriceMnt: bp.totalPriceMnt },
      });
    }
    for (const c of cells) {
      await tx.kpiBandPhase.update({
        where: { bandId_phaseId: { bandId: c.bandId, phaseId: c.phaseId } },
        data: {
          estimatedHours: c.hours,
          unitRatePct: c.pct,
          unitRateMnt: c.rateMnt,
          quantityNote: c.quantityNote ?? null,
        },
      });
    }
  });

  await audit("kpi.timeline.save", me.uid, "all", {
    cells: cells.length,
    bands: bandPrices.length,
  });
  revalidatePath("/admin/kpi/timeline");
  return { ok: true };
}
