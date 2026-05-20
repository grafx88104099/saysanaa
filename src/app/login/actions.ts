"use server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("И-мэйл буруу"),
  password: z.string().min(6, "Нууц үг хэт богино"),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Буруу өгөгдөл" };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });
  if (!user || !user.employee?.active) {
    return { error: "И-мэйл эсвэл нууц үг буруу байна" };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await audit("login.fail", user.id, email);
    return { error: "И-мэйл эсвэл нууц үг буруу байна" };
  }

  if (user.twoFactorEnabled) {
    await createSession(
      { uid: user.id, email: user.email, role: user.employee.role, pending2fa: true },
      { maxAge: 60 * 10 },
    );
    await audit("login.password_ok", user.id, email);
    redirect("/2fa");
  }

  await createSession({ uid: user.id, email: user.email, role: user.employee.role });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit("login.success", user.id, email);
  redirect("/2fa/setup");
}
