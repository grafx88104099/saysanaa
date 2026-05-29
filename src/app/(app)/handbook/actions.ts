"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const sectionSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/i, "Зөвхөн үсэг/тоо/зураас"),
  title: z.string().min(1).max(120),
  body: z.string().max(20000),
  sortOrder: z.number().int().min(0).max(1000),
});

export type HState = { ok?: boolean; error?: string } | undefined;

export async function saveHandbookSectionAction(
  _prev: HState,
  formData: FormData
): Promise<HState> {
  const me = await requireRole("ADMIN");
  const parsed = sectionSchema.safeParse({
    id: String(formData.get("id") || "").trim() || undefined,
    slug: String(formData.get("slug") || "").trim().toLowerCase(),
    title: String(formData.get("title") || "").trim(),
    body: String(formData.get("body") || ""),
    sortOrder: parseInt(String(formData.get("sortOrder") || "0")) || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  if (d.id) {
    await prisma.handbookSection.update({
      where: { id: d.id },
      data: {
        slug: d.slug,
        title: d.title,
        body: d.body,
        sortOrder: d.sortOrder,
        updatedBy: me.uid,
      },
    });
    await audit("handbook.update", me.uid, d.id, { slug: d.slug });
  } else {
    const dup = await prisma.handbookSection.findUnique({ where: { slug: d.slug } });
    if (dup) return { error: "Энэ slug аль хэдийн байна" };
    const created = await prisma.handbookSection.create({
      data: {
        slug: d.slug,
        title: d.title,
        body: d.body,
        sortOrder: d.sortOrder,
        updatedBy: me.uid,
      },
    });
    await audit("handbook.create", me.uid, created.id, { slug: d.slug });
  }
  revalidatePath("/handbook");
  return { ok: true };
}

export async function deleteHandbookSectionAction(id: string): Promise<HState> {
  const me = await requireRole("ADMIN");
  await prisma.handbookSection.delete({ where: { id } });
  await audit("handbook.delete", me.uid, id);
  revalidatePath("/handbook");
  return { ok: true };
}
