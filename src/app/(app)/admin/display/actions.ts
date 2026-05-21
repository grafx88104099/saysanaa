"use server";
import { requireRole } from "@/lib/session";
import { createKioskToken, deleteKioskToken, revokeKioskToken } from "@/lib/kiosk";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const labelSchema = z.string().min(1, "Нэр оруулна уу").max(60);

export type CreateState =
  | { error?: string; created?: { id: string; token: string; label: string } }
  | undefined;

export async function createTokenAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const me = await requireRole("ADMIN");
  const parsed = labelSchema.safeParse(String(formData.get("label") || "").trim());
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Нэр буруу" };
  }
  const row = await createKioskToken({ label: parsed.data, createdBy: me.uid });
  await audit("kiosk.create", me.uid, row.id, { label: row.label });
  revalidatePath("/admin/display");
  return { created: { id: row.id, token: row.token, label: row.label } };
}

export async function revokeTokenAction(id: string) {
  const me = await requireRole("ADMIN");
  await revokeKioskToken(id);
  await audit("kiosk.revoke", me.uid, id);
  revalidatePath("/admin/display");
}

export async function deleteTokenAction(id: string) {
  const me = await requireRole("ADMIN");
  await deleteKioskToken(id);
  await audit("kiosk.delete", me.uid, id);
  revalidatePath("/admin/display");
}
