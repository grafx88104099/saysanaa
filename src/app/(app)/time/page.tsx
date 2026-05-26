import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { startOfWeek, addDays, isoDate } from "@/lib/timeentry";
import Timesheet from "./Timesheet";

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");
  const me = await prisma.employee.findUnique({ where: { userId: s.uid } });
  if (!me) redirect("/dashboard");

  const sp = await searchParams;
  const weekStart = sp.week ? new Date(sp.week) : startOfWeek(new Date());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 7);

  const [entries, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        employeeId: me.id,
        date: { gte: weekStart, lt: weekEnd },
      },
      include: {
        project: { select: { id: true, code: true, name: true, type: true } },
        phase: { select: { id: true, name: true, ordinal: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.project.findMany({
      where: {
        status: { in: ["ACTIVE", "DRAFT", "ON_HOLD"] },
        assignments: { some: { employeeId: me.id } },
      },
      include: {
        phases: { orderBy: { ordinal: "asc" }, select: { id: true, name: true, ordinal: true } },
      },
      orderBy: [{ priority: "desc" }, { code: "asc" }],
    }),
  ]);

  return (
    <Timesheet
      weekStartIso={isoDate(weekStart)}
      entries={entries.map((e) => ({
        id: e.id,
        date: isoDate(e.date),
        hours: e.hours,
        kind: e.kind,
        note: e.note,
        project: e.project,
        phase: e.phase,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        phases: p.phases,
      }))}
    />
  );
}
