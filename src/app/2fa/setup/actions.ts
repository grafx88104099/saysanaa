"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { generateSecret, otpauthUrl, qrSvg, verifyToken } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function startSetup() {
  const s = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user) throw new Error("User not found");

  let secret = user.twoFactorSecret;
  // Generate a fresh secret each time we enter setup if not yet confirmed
  if (!user.twoFactorEnabled || !secret) {
    secret = generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
  }
  const url = otpauthUrl(user.email, secret);
  const qr = await qrSvg(url);
  return { secret, qr };
}

export type ConfirmState = { error?: string } | undefined;

export async function confirmSetup(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const s = await requireUser();
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "6 оронтой код оруулна уу" };
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user?.twoFactorSecret) return { error: "Тохиргоо олдсонгүй. Дахин эхлүүлнэ үү." };
  if (!verifyToken(code, user.twoFactorSecret)) return { error: "Код буруу байна" };
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  await audit("2fa.enabled", user.id);
  redirect("/dashboard");
}
