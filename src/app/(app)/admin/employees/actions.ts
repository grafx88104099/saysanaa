"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role, SkillLevel } from "@prisma/client";

const employeeSchema = z.object({
  email: z.string().email("И-мэйл буруу"),
  firstName: z.string().min(1, "Нэр оруулна уу"),
  lastName: z.string().min(1, "Овог оруулна уу"),
  phone: z.string().optional().or(z.literal("")),
  registerNumber: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[А-ЯӨҮа-яөү]{2}\d{8}$/.test(v), {
      message: "Регистрийн дугаар буруу формат (Жш: УБ12345678)",
    }),
  photoUrl: z.string().url("URL буруу").optional().or(z.literal("")),
  role: z.nativeEnum(Role),
  profession: z.string().optional().or(z.literal("")),
  autocadLevel: z.nativeEnum(SkillLevel),
  sketchupLevel: z.nativeEnum(SkillLevel),
  languages: z.array(z.string()).default([]),
});

function parseForm(formData: FormData) {
  return employeeSchema.safeParse({
    email: String(formData.get("email") || "").trim().toLowerCase(),
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    registerNumber: String(formData.get("registerNumber") || "").trim().toUpperCase(),
    photoUrl: String(formData.get("photoUrl") || "").trim(),
    role: formData.get("role") as Role,
    profession: String(formData.get("profession") || "").trim(),
    autocadLevel: formData.get("autocadLevel") as SkillLevel,
    sketchupLevel: formData.get("sketchupLevel") as SkillLevel,
    languages: formData.getAll("languages").map(String),
  });
}

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function createEmployeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const k = i.path[0]?.toString() ?? "_";
      fe[k] = i.message;
    });
    return { error: "Талбар бөглөгдөөгүй эсвэл буруу байна", fieldErrors: fe };
  }
  const data = parsed.data;
  const tempPassword = String(formData.get("tempPassword") || "").trim();
  if (tempPassword.length < 8) {
    return { error: "Түр нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой" };
  }

  // Uniqueness
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return { error: "Энэ и-мэйлээр ажилтан бүртгэлтэй байна" };
  if (data.registerNumber) {
    const reg = await prisma.employee.findUnique({ where: { registerNumber: data.registerNumber } });
    if (reg) return { error: "Энэ регистрийн дугаараар ажилтан бүртгэлтэй байна" };
  }

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const created = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      employee: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          registerNumber: data.registerNumber || null,
          photoUrl: data.photoUrl || null,
          role: data.role,
          profession: data.profession || null,
          autocadLevel: data.autocadLevel,
          sketchupLevel: data.sketchupLevel,
          languages: data.languages,
        },
      },
    },
    include: { employee: true },
  });
  await audit("employee.create", me.uid, created.employee!.id, { email: data.email });
  revalidatePath("/admin/employees");
  redirect(`/admin/employees/${created.employee!.id}`);
}

export async function updateEmployeeAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireRole("ADMIN", "PM");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const k = i.path[0]?.toString() ?? "_";
      fe[k] = i.message;
    });
    return { error: "Талбар буруу байна", fieldErrors: fe };
  }
  const data = parsed.data;
  const existing = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!existing) return { error: "Олдсонгүй" };

  if (data.email !== existing.user.email) {
    const dup = await prisma.user.findUnique({ where: { email: data.email } });
    if (dup) return { error: "Энэ и-мэйл өөр хэрэглэгчид бүртгэлтэй" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: existing.userId }, data: { email: data.email } }),
    prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        registerNumber: data.registerNumber || null,
        photoUrl: data.photoUrl || null,
        role: data.role,
        profession: data.profession || null,
        autocadLevel: data.autocadLevel,
        sketchupLevel: data.sketchupLevel,
        languages: data.languages,
      },
    }),
  ]);
  await audit("employee.update", me.uid, id);
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
  redirect(`/admin/employees/${id}`);
}

export async function toggleActiveAction(id: string) {
  const me = await requireRole("ADMIN");
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return;
  await prisma.employee.update({ where: { id }, data: { active: !emp.active } });
  await audit(emp.active ? "employee.deactivate" : "employee.activate", me.uid, id);
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
}

export async function resetPasswordAction(id: string, formData: FormData) {
  const me = await requireRole("ADMIN");
  const newPw = String(formData.get("newPassword") || "");
  if (newPw.length < 8) return { error: "8+ тэмдэгт оруулна уу" } as const;
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return { error: "Олдсонгүй" } as const;
  const hash = await bcrypt.hash(newPw, 10);
  await prisma.user.update({
    where: { id: emp.userId },
    data: { passwordHash: hash, twoFactorEnabled: false, twoFactorSecret: null },
  });
  await audit("employee.reset_password", me.uid, id);
  revalidatePath(`/admin/employees/${id}`);
  return { ok: true } as const;
}
