"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { MN_HOLIDAYS_2026, invalidateHolidayCache } from "@/lib/calendar";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо буруу"),
  name: z.string().min(1, "Нэр оруулна уу").max(80),
});

export type AddState = { error?: string; ok?: boolean } | undefined;

export async function addHolidayAction(_prev: AddState, formData: FormData): Promise<AddState> {
  const me = await requireRole("ADMIN");
  const parsed = addSchema.safeParse({
    date: String(formData.get("date") || "").trim(),
    name: String(formData.get("name") || "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { date, name } = parsed.data;
  const exists = await prisma.holiday.findUnique({ where: { date: new Date(date) } });
  if (exists) return { error: "Энэ огноо бүртгэгдсэн байна" };
  await prisma.holiday.create({
    data: { date: new Date(date), name, createdBy: me.uid },
  });
  invalidateHolidayCache();
  await audit("holiday.add", me.uid, date, { name });
  revalidatePath("/admin/holidays");
  return { ok: true };
}

/**
 * Календарийн day cell дээр товшоод оруулсан амралт.
 */
export async function quickAddHolidayAction(date: string, name: string) {
  const me = await requireRole("ADMIN");
  const parsed = addSchema.safeParse({ date, name: name.trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message } as const;
  const exists = await prisma.holiday.findUnique({
    where: { date: new Date(parsed.data.date) },
  });
  if (exists) return { error: "Энэ огноо аль хэдийн бүртгэгдсэн" } as const;
  await prisma.holiday.create({
    data: {
      date: new Date(parsed.data.date),
      name: parsed.data.name,
      createdBy: me.uid,
    },
  });
  invalidateHolidayCache();
  await audit("holiday.add", me.uid, parsed.data.date, { name: parsed.data.name });
  revalidatePath("/admin/holidays");
  return { ok: true } as const;
}

export async function deleteHolidayAction(id: string) {
  const me = await requireRole("ADMIN");
  const h = await prisma.holiday.findUnique({ where: { id } });
  if (!h) return;
  await prisma.holiday.delete({ where: { id } });
  invalidateHolidayCache();
  await audit("holiday.delete", me.uid, h.id, { date: h.date.toISOString() });
  revalidatePath("/admin/holidays");
}

export async function importPresetAction() {
  const me = await requireRole("ADMIN");
  let added = 0;
  for (const h of MN_HOLIDAYS_2026) {
    const d = new Date(h.date);
    const existing = await prisma.holiday.findUnique({ where: { date: d } });
    if (existing) continue;
    await prisma.holiday.create({ data: { date: d, name: h.name, createdBy: me.uid } });
    added++;
  }
  invalidateHolidayCache();
  await audit("holiday.bulk_import", me.uid, "2026", { added });
  revalidatePath("/admin/holidays");
  return { added };
}
