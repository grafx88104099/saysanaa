"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FinanceKind } from "@prisma/client";

async function requireFinance() {
  const me = await requireUser();
  if (me.role !== "ADMIN" && me.role !== "ACCOUNTANT") {
    throw new Error("Эрх дутуу — зөвхөн ADMIN/Нягтлан");
  }
  return me;
}

const entrySchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо буруу"),
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  projectId: z.string().nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

export type FState = { ok?: boolean; error?: string } | undefined;

export async function saveFinanceEntryAction(
  _prev: FState,
  formData: FormData
): Promise<FState> {
  let me: Awaited<ReturnType<typeof requireFinance>>;
  try {
    me = await requireFinance();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const parsed = entrySchema.safeParse({
    id: String(formData.get("id") || "").trim() || undefined,
    date: String(formData.get("date") || "").trim(),
    categoryId: String(formData.get("categoryId") || "").trim(),
    amount: parseFloat(String(formData.get("amount") || "0")) || 0,
    projectId: (String(formData.get("projectId") || "").trim() || null) as string | null,
    note: (String(formData.get("note") || "").trim() || null) as string | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const cat = await prisma.financeCategory.findUnique({ where: { id: d.categoryId } });
  if (!cat) return { error: "Категори олдсонгүй" };

  if (d.id) {
    await prisma.financeEntry.update({
      where: { id: d.id },
      data: {
        date: new Date(d.date),
        categoryId: d.categoryId,
        amount: d.amount,
        projectId: d.projectId,
        note: d.note,
      },
    });
    await audit("finance.update", me.uid, d.id);
  } else {
    const created = await prisma.financeEntry.create({
      data: {
        date: new Date(d.date),
        categoryId: d.categoryId,
        amount: d.amount,
        projectId: d.projectId,
        note: d.note,
        createdBy: me.uid,
      },
    });
    await audit("finance.create", me.uid, created.id, {
      category: cat.name,
      amount: d.amount,
    });
  }
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function deleteFinanceEntryAction(id: string): Promise<FState> {
  let me: Awaited<ReturnType<typeof requireFinance>>;
  try {
    me = await requireFinance();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  await prisma.financeEntry.delete({ where: { id } });
  await audit("finance.delete", me.uid, id);
  revalidatePath("/admin/finance");
  return { ok: true };
}

// Category management — ADMIN only
const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  kind: z.nativeEnum(FinanceKind),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export async function saveCategoryAction(
  _prev: FState,
  formData: FormData
): Promise<FState> {
  const me = await requireUser();
  if (me.role !== "ADMIN") return { error: "Зөвхөн ADMIN категори засна" };
  const parsed = categorySchema.safeParse({
    id: String(formData.get("id") || "").trim() || undefined,
    name: String(formData.get("name") || "").trim(),
    kind: String(formData.get("kind") || "EXPENSE") as FinanceKind,
    sortOrder: parseInt(String(formData.get("sortOrder") || "0")) || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.id) {
    await prisma.financeCategory.update({
      where: { id: d.id },
      data: { name: d.name, kind: d.kind, sortOrder: d.sortOrder },
    });
  } else {
    const dup = await prisma.financeCategory.findUnique({
      where: { name_kind: { name: d.name, kind: d.kind } },
    });
    if (dup) return { error: "Энэ нэр аль хэдийн байна" };
    await prisma.financeCategory.create({
      data: { name: d.name, kind: d.kind, sortOrder: d.sortOrder },
    });
  }
  await audit("finance.category.save", me.uid, "category", { name: d.name });
  revalidatePath("/admin/finance");
  return { ok: true };
}
