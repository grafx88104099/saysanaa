"use server";
import { prisma } from "@/lib/db";
import { createSession, readSession, clearSession } from "@/lib/session";
import { verifyToken } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";

export type VerifyState = { error?: string } | undefined;

export async function verify2faAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const session = await readSession();
  if (!session || !session.pending2fa) {
    redirect("/login");
  }
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { error: "6 оронтой код оруулна уу" };
  }
  const user = await prisma.user.findUnique({
    where: { id: session!.uid },
    include: { employee: true },
  });
  if (!user || !user.twoFactorSecret || !user.employee) {
    return { error: "2FA тохиргоо олдсонгүй" };
  }
  if (!verifyToken(code, user.twoFactorSecret)) {
    await audit("2fa.fail", user.id);
    return { error: "Код буруу эсвэл хугацаа дууссан байна" };
  }
  await createSession({ uid: user.id, email: user.email, role: user.employee.role });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit("2fa.success", user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  const s = await readSession();
  if (s) await audit("logout", s.uid);
  await clearSession();
  redirect("/login");
}
