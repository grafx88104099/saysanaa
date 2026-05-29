"use server";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AttendanceStatus, LeaveType, LeaveStatus } from "@prisma/client";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const recordSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(dateRe),
  status: z.nativeEnum(AttendanceStatus),
  checkInAt: z.string().optional().nullable(),
  checkOutAt: z.string().optional().nullable(),
  hoursWorked: z.number().min(0).max(24).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
});

export type AttState = { ok?: boolean; error?: string } | undefined;

/** Insert or update one day's attendance. */
export async function recordAttendanceAction(
  _prev: AttState,
  formData: FormData
): Promise<AttState> {
  const me = await requireUser();
  const parsed = recordSchema.safeParse({
    employeeId: String(formData.get("employeeId") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    status: String(formData.get("status") || "PRESENT").trim() as AttendanceStatus,
    checkInAt: (String(formData.get("checkInAt") || "").trim() || null) as string | null,
    checkOutAt: (String(formData.get("checkOutAt") || "").trim() || null) as string | null,
    hoursWorked: formData.get("hoursWorked")
      ? parseFloat(String(formData.get("hoursWorked")))
      : null,
    note: (String(formData.get("note") || "").trim() || null) as string | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Auth: own record OR ADMIN/PM
  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  const isManager = me.role === "ADMIN" || me.role === "PM";
  if (!isManager && (!myEmp || myEmp.id !== d.employeeId)) {
    return { error: "Эрх дутуу" };
  }

  // Compose datetimes
  const baseDate = new Date(d.date);
  const checkInDate = d.checkInAt
    ? new Date(`${d.date}T${d.checkInAt}:00`)
    : null;
  const checkOutDate = d.checkOutAt
    ? new Date(`${d.date}T${d.checkOutAt}:00`)
    : null;
  // Auto-compute hoursWorked if not provided but both times present
  let computedHours = d.hoursWorked ?? null;
  if (computedHours == null && checkInDate && checkOutDate) {
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    if (diffMs > 0) computedHours = Math.round((diffMs / 3_600_000) * 10) / 10;
  }

  const upserted = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: d.employeeId, date: baseDate } },
    update: {
      status: d.status,
      checkInAt: checkInDate,
      checkOutAt: checkOutDate,
      hoursWorked: computedHours,
      note: d.note,
    },
    create: {
      employeeId: d.employeeId,
      date: baseDate,
      status: d.status,
      checkInAt: checkInDate,
      checkOutAt: checkOutDate,
      hoursWorked: computedHours,
      note: d.note,
      createdBy: me.uid,
    },
  });
  await audit("attendance.upsert", me.uid, upserted.id, {
    employee: d.employeeId,
    date: d.date,
    status: d.status,
  });
  revalidatePath("/me/attendance");
  revalidatePath("/admin/attendance");
  return { ok: true };
}

export async function deleteAttendanceAction(id: string): Promise<AttState> {
  const me = await requireUser();
  const entry = await prisma.attendance.findUnique({ where: { id } });
  if (!entry) return { ok: true };
  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  const isManager = me.role === "ADMIN" || me.role === "PM";
  if (!isManager && (!myEmp || myEmp.id !== entry.employeeId)) {
    return { error: "Эрх дутуу" };
  }
  await prisma.attendance.delete({ where: { id } });
  await audit("attendance.delete", me.uid, id, { employee: entry.employeeId });
  revalidatePath("/me/attendance");
  revalidatePath("/admin/attendance");
  return { ok: true };
}

// ── Leave requests ───────────────────────────────────────────────────────────

const leaveCreateSchema = z.object({
  fromDate: z.string().regex(dateRe),
  toDate: z.string().regex(dateRe),
  type: z.nativeEnum(LeaveType),
  reason: z.string().max(300).optional().nullable(),
});

export async function requestLeaveAction(
  _prev: AttState,
  formData: FormData
): Promise<AttState> {
  const me = await requireUser();
  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!myEmp) return { error: "Employee бүртгэлгүй" };
  if (!myEmp.active) return { error: "Идэвхгүй бүртгэл" };

  const parsed = leaveCreateSchema.safeParse({
    fromDate: String(formData.get("fromDate") || "").trim(),
    toDate: String(formData.get("toDate") || "").trim(),
    type: String(formData.get("type") || "VACATION").trim() as LeaveType,
    reason: (String(formData.get("reason") || "").trim() || null) as string | null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (new Date(d.fromDate) > new Date(d.toDate)) {
    return { error: "Эхлэх огноо нь дуусах огнооноос их байж болохгүй" };
  }

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId: myEmp.id,
      fromDate: new Date(d.fromDate),
      toDate: new Date(d.toDate),
      type: d.type,
      reason: d.reason,
      status: "PENDING",
    },
  });
  await audit("leave.request", me.uid, created.id, {
    from: d.fromDate,
    to: d.toDate,
    type: d.type,
  });
  revalidatePath("/me/attendance");
  revalidatePath("/admin/attendance");
  return { ok: true };
}

export async function approveLeaveAction(
  id: string,
  status: "APPROVED" | "REJECTED",
  rejectedReason: string | null = null
): Promise<AttState> {
  const me = await requireRole("ADMIN", "PM");
  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req) return { error: "Олдсонгүй" };
  if (req.status !== "PENDING") return { error: "Аль хэдийн шийдвэрлэгдсэн" };
  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: status as LeaveStatus,
      approvedBy: me.uid,
      approvedAt: new Date(),
      rejectedReason: status === "REJECTED" ? rejectedReason?.slice(0, 300) ?? null : null,
    },
  });
  await audit(status === "APPROVED" ? "leave.approve" : "leave.reject", me.uid, id);
  revalidatePath("/me/attendance");
  revalidatePath("/admin/attendance");
  return { ok: true };
}

export async function cancelOwnLeaveAction(id: string): Promise<AttState> {
  const me = await requireUser();
  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req) return { ok: true };
  if (!myEmp || req.employeeId !== myEmp.id) return { error: "Эрх дутуу" };
  if (req.status !== "PENDING") return { error: "Зөвхөн PENDING хүсэлтийг цуцлана" };
  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await audit("leave.cancel", me.uid, id);
  revalidatePath("/me/attendance");
  revalidatePath("/admin/attendance");
  return { ok: true };
}
