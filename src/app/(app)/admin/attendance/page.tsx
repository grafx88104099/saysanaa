import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { loadHolidayKeys, isWorkDay } from "@/lib/calendar";
import {
  currentMonthKey,
  parseMonthKey,
  monthRange,
  isoDate,
} from "@/lib/attendance";
import TeamAttendance from "./TeamAttendance";

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/dashboard");

  const sp = await searchParams;
  const key = sp.month ?? currentMonthKey();
  const parsed = parseMonthKey(key) ?? parseMonthKey(currentMonthKey())!;
  const { start, end } = monthRange(parsed.year, parsed.month);

  const [holidayKeys, employees, attendance, pendingLeaves] = await Promise.all([
    loadHolidayKeys(),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, role: true, photoUrl: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        employeeId: true,
        date: true,
        status: true,
        hoursWorked: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true, photoUrl: true } },
      },
    }),
  ]);

  // Pre-compute workday flag per ISO date for client
  const workDayMap: Record<string, boolean> = {};
  const cursor = new Date(start);
  while (cursor < end) {
    workDayMap[isoDate(cursor)] = isWorkDay(cursor, holidayKeys);
    cursor.setDate(cursor.getDate() + 1);
  }

  // Flatten attendance map: emp -> iso -> status/hours
  const attByEmp: Record<
    string,
    Record<string, { id: string; status: string; hoursWorked: number | null }>
  > = {};
  for (const a of attendance) {
    if (!attByEmp[a.employeeId]) attByEmp[a.employeeId] = {};
    attByEmp[a.employeeId][isoDate(a.date)] = {
      id: a.id,
      status: a.status,
      hoursWorked: a.hoursWorked,
    };
  }

  return (
    <TeamAttendance
      monthKey={key}
      year={parsed.year}
      month={parsed.month}
      workDayMap={workDayMap}
      employees={employees.map((e) => ({
        id: e.id,
        fullName: `${e.lastName} ${e.firstName}`,
        photoUrl: e.photoUrl,
        role: e.role,
      }))}
      attendanceByEmp={attByEmp}
      pendingLeaves={pendingLeaves.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: `${l.employee.lastName} ${l.employee.firstName}`,
        photoUrl: l.employee.photoUrl,
        fromDate: isoDate(l.fromDate),
        toDate: isoDate(l.toDate),
        type: l.type,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
