"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { uploadPptImage, deleteFromBucket, PPT_IMAGES_BUCKET } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PptSlotKind } from "@prisma/client";

async function ensurePptAccess(projectId: string) {
  const me = await requireUser();
  if (me.role === "ADMIN" || me.role === "PM") return me;
  // Allow lead assignee
  const emp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!emp) throw new Error("Эрх дутуу");
  const a = await prisma.projectAssignment.findFirst({
    where: { projectId, employeeId: emp.id, isLead: true },
  });
  if (!a) throw new Error("Зөвхөн төслийн лид/PM/ADMIN");
  return me;
}

async function ensureDeck(projectId: string) {
  let deck = await prisma.projectPptDeck.findUnique({ where: { projectId } });
  if (!deck) {
    deck = await prisma.projectPptDeck.create({ data: { projectId } });
  }
  return deck;
}

const MAX_BY_KIND: Record<PptSlotKind, number> = {
  MOODBOARD: 12,
  RENDER: 12,
  PLAN: 4,
  SKETCH: 4,
  MATERIALS: 4,
};

const textSchema = z.object({
  briefText: z.string().max(5000).nullable().optional(),
  materialsText: z.string().max(5000).nullable().optional(),
});

export type PState = { ok?: boolean; error?: string } | undefined;

export async function savePptTextAction(
  projectId: string,
  _prev: PState,
  formData: FormData
): Promise<PState> {
  let me: Awaited<ReturnType<typeof requireUser>>;
  try {
    me = await ensurePptAccess(projectId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const parsed = textSchema.safeParse({
    briefText: (String(formData.get("briefText") || "").trim() || null) as string | null,
    materialsText: (String(formData.get("materialsText") || "").trim() || null) as
      | string
      | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const deck = await ensureDeck(projectId);
  await prisma.projectPptDeck.update({
    where: { id: deck.id },
    data: {
      briefText: parsed.data.briefText ?? null,
      materialsText: parsed.data.materialsText ?? null,
    },
  });
  await audit("ppt.text", me.uid, projectId);
  revalidatePath(`/admin/projects/${projectId}/ppt`);
  return { ok: true };
}

export async function uploadPptImageAction(
  projectId: string,
  kind: PptSlotKind,
  formData: FormData
): Promise<PState> {
  let me: Awaited<ReturnType<typeof requireUser>>;
  try {
    me = await ensurePptAccess(projectId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Файл олдсонгүй" };
  if (file.size > 15 * 1024 * 1024) return { error: "15MB-аас ихгүй" };
  if (!file.type.startsWith("image/")) return { error: "Зөвхөн зураг" };

  const deck = await ensureDeck(projectId);

  // Count existing of this kind
  const existing = await prisma.projectPptSlot.count({
    where: { deckId: deck.id, kind },
  });
  if (existing >= MAX_BY_KIND[kind]) {
    return { error: `${kind} төрөл ${MAX_BY_KIND[kind]} зурагнаас илүү байж болохгүй` };
  }

  // Upload to storage
  let url: string;
  try {
    const out = await uploadPptImage(file, file.name, projectId);
    url = out.url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload алдаа" };
  }

  const maxOrd = await prisma.projectPptSlot.aggregate({
    where: { deckId: deck.id, kind },
    _max: { ordinal: true },
  });

  await prisma.projectPptSlot.create({
    data: {
      deckId: deck.id,
      kind,
      ordinal: (maxOrd._max.ordinal ?? -1) + 1,
      imageUrl: url,
      imageName: file.name.slice(0, 200),
      uploadedBy: me.uid,
    },
  });
  await audit("ppt.image.add", me.uid, projectId, { kind });
  revalidatePath(`/admin/projects/${projectId}/ppt`);
  return { ok: true };
}

export async function removePptImageAction(
  projectId: string,
  slotId: string
): Promise<PState> {
  let me: Awaited<ReturnType<typeof requireUser>>;
  try {
    me = await ensurePptAccess(projectId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const slot = await prisma.projectPptSlot.findUnique({
    where: { id: slotId },
    include: { deck: true },
  });
  if (!slot || slot.deck.projectId !== projectId) return { error: "Олдсонгүй" };

  try {
    await deleteFromBucket(PPT_IMAGES_BUCKET, slot.imageUrl);
  } catch {}
  await prisma.projectPptSlot.delete({ where: { id: slotId } });
  await audit("ppt.image.remove", me.uid, projectId, { kind: slot.kind });
  revalidatePath(`/admin/projects/${projectId}/ppt`);
  return { ok: true };
}

export async function updatePptCaptionAction(
  projectId: string,
  slotId: string,
  caption: string | null
): Promise<PState> {
  try {
    await ensurePptAccess(projectId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Эрх дутуу" };
  }
  const slot = await prisma.projectPptSlot.findUnique({
    where: { id: slotId },
    include: { deck: true },
  });
  if (!slot || slot.deck.projectId !== projectId) return { error: "Олдсонгүй" };
  await prisma.projectPptSlot.update({
    where: { id: slotId },
    data: { caption: caption?.slice(0, 200) ?? null },
  });
  revalidatePath(`/admin/projects/${projectId}/ppt`);
  return { ok: true };
}
