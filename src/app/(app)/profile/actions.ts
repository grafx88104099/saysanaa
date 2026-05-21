"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().min(1, "Нэр оруулна уу"),
  lastName: z.string().min(1, "Овог оруулна уу"),
  phone: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url("URL буруу").optional().or(z.literal("")),
  languages: z.array(z.string()).default([]),
});

export type ProfileState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> } | undefined;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    photoUrl: String(formData.get("photoUrl") || "").trim(),
    languages: formData.getAll("languages").map(String),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[i.path[0]?.toString() ?? "_"] = i.message));
    return { error: "Талбар буруу байна", fieldErrors: fe };
  }
  const d = parsed.data;
  const emp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!emp) return { error: "Бүртгэл олдсонгүй" };
  await prisma.employee.update({
    where: { id: emp.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      photoUrl: d.photoUrl || null,
      languages: d.languages,
    },
  });
  await audit("profile.update", me.uid, emp.id);
  revalidatePath("/profile");
  return { ok: true };
}

const passwordSchema = z.object({
  current: z.string().min(1, "Одоогийн нууц үг оруулна уу"),
  next: z.string().min(8, "Шинэ нууц үг 8+ тэмдэгт байх ёстой"),
  confirm: z.string(),
});

export type PasswordState =
  | { error?: string; ok?: boolean; fieldErrors?: Record<string, string> }
  | undefined;

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const me = await requireUser();
  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") || ""),
    next: String(formData.get("next") || ""),
    confirm: String(formData.get("confirm") || ""),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[i.path[0]?.toString() ?? "_"] = i.message));
    return { error: "Талбар буруу байна", fieldErrors: fe };
  }
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { error: "Шинэ нууц үг таарахгүй байна" };

  const user = await prisma.user.findUnique({ where: { id: me.uid } });
  if (!user) return { error: "Бүртгэл олдсонгүй" };
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) {
    await audit("profile.password_fail", me.uid);
    return { error: "Одоогийн нууц үг буруу байна" };
  }
  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  await audit("profile.password_change", me.uid);
  return { ok: true };
}

export async function reset2faAction(): Promise<{ ok: true }> {
  const me = await requireUser();
  await prisma.user.update({
    where: { id: me.uid },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await audit("profile.2fa_reset", me.uid);
  return { ok: true };
}
