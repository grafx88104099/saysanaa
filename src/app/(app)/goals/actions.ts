"use server";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const goalSchema = z.object({
  id: z.string().optional(),
  year: z.number().int().min(2000).max(2100),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export type GState = { ok?: boolean; error?: string } | undefined;

export async function saveGoalAction(
  _prev: GState,
  formData: FormData
): Promise<GState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = goalSchema.safeParse({
    id: String(formData.get("id") || "").trim() || undefined,
    year: parseInt(String(formData.get("year") || "0")) || 0,
    title: String(formData.get("title") || "").trim(),
    body: (String(formData.get("body") || "").trim() || null) as string | null,
    parentId: (String(formData.get("parentId") || "").trim() || null) as string | null,
    sortOrder: parseInt(String(formData.get("sortOrder") || "0")) || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.parentId) {
    const parent = await prisma.companyGoal.findUnique({ where: { id: d.parentId } });
    if (!parent) return { error: "Эх зорилго олдсонгүй" };
    if (parent.year !== d.year)
      return { error: "Дэд зорилгын жил эх зорилготой тохирох ёстой" };
  }
  if (d.id) {
    await prisma.companyGoal.update({
      where: { id: d.id },
      data: {
        year: d.year,
        title: d.title,
        body: d.body,
        parentId: d.parentId,
        sortOrder: d.sortOrder,
      },
    });
    await audit("goal.update", me.uid, d.id);
  } else {
    const created = await prisma.companyGoal.create({
      data: {
        year: d.year,
        title: d.title,
        body: d.body,
        parentId: d.parentId,
        sortOrder: d.sortOrder,
        createdBy: me.uid,
      },
    });
    await audit("goal.create", me.uid, created.id, { year: d.year, title: d.title });
  }
  revalidatePath("/goals");
  return { ok: true };
}

export async function updateGoalProgressAction(
  id: string,
  progress: number
): Promise<GState> {
  const me = await requireRole("ADMIN", "PM");
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  await prisma.companyGoal.update({ where: { id }, data: { progress: pct } });
  await audit("goal.progress", me.uid, id, { progress: pct });
  revalidatePath("/goals");
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<GState> {
  const me = await requireRole("ADMIN");
  // children become root by setNull (cascading already configured)
  await prisma.companyGoal.delete({ where: { id } });
  await audit("goal.delete", me.uid, id);
  revalidatePath("/goals");
  return { ok: true };
}
