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
import MyAttendance from "./MyAttendance";

export default async function MyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");
  const emp = await prisma.employee.findUnique({
    where: { userId: s.uid },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      startedWorkAt: true,
      createdAt: true,
    },
  });
  if (!emp) redirect("/dashboard");

  const sp = await searchParams;
  const key = sp.month ?? currentMonthKey();
  const parsed = parseMonthKey(key) ?? parseMonthKey(currentMonthKey())!;
  const { start, end } = monthRange(parsed.year, parsed.month);

  const [holidayKeys, entries, leaves] = await Promise.all([
    loadHolidayKeys(),
    prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: emp.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  // Precompute work-day classification per date in this month
  const workDayMap: Record<string, boolean> = {};
  const cursor = new Date(start);
  while (cursor < end) {
    workDayMap[isoDate(cursor)] = isWorkDay(cursor, holidayKeys);
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <MyAttendance
      employeeId={emp.id}
      employeeName={`${emp.lastName} ${emp.firstName}`}
      monthKey={key}
      year={parsed.year}
      month={parsed.month}
      workDayMap={workDayMap}
      entries={entries.map((e) => ({
        id: e.id,
        date: isoDate(e.date),
        status: e.status,
        checkInAt: e.checkInAt ? e.checkInAt.toISOString().slice(11, 16) : null,
        checkOutAt: e.checkOutAt ? e.checkOutAt.toISOString().slice(11, 16) : null,
        hoursWorked: e.hoursWorked,
        note: e.note,
      }))}
      leaves={leaves.map((l) => ({
        id: l.id,
        fromDate: isoDate(l.fromDate),
        toDate: isoDate(l.toDate),
        type: l.type,
        reason: l.reason,
        status: l.status,
        rejectedReason: l.rejectedReason,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
