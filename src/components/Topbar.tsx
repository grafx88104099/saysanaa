import UserMenu from "@/components/UserMenu";
import QuickLog from "@/components/QuickLog";
import { prisma } from "@/lib/db";
import { isoDate } from "@/lib/timeentry";
import type { Role } from "@prisma/client";

export default async function Topbar({
  me,
}: {
  me: {
    uid: string;
    employeeId?: string | null;
    email: string;
    role: Role;
    fullName: string;
    initials: string;
    photoUrl?: string | null;
  };
}) {
  // Load assigned active projects + today's total for the QuickLog widget
  let projects: Awaited<ReturnType<typeof prisma.project.findMany>> = [];
  let todayTotal = 0;
  if (me.employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [ps, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          status: { in: ["ACTIVE", "DRAFT", "ON_HOLD"] },
          assignments: { some: { employeeId: me.employeeId } },
        },
        include: {
          phases: { orderBy: { ordinal: "asc" }, select: { id: true, name: true, ordinal: true } },
        },
        orderBy: [{ priority: "desc" }, { code: "asc" }],
        take: 20,
      }),
      prisma.timeEntry.aggregate({
        where: {
          employeeId: me.employeeId,
          date: { gte: today, lt: tomorrow },
        },
        _sum: { hours: true },
      }),
    ]);
    projects = ps;
    todayTotal = total._sum.hours ?? 0;
  }

  return (
    <header className="h-14 bg-black/70 backdrop-blur-xl border-b border-bd flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-[11px] tracking-[0.18em] uppercase text-sub">
        <span className="text-gradient font-semibold">Saysanaa</span>
        <span className="ml-2 text-white/40">· artify · Internal OS</span>
      </div>
      <div className="flex items-center gap-3">
        <QuickLog
          projects={projects.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            type: p.type,
            phases: (p as { phases?: { id: string; name: string; ordinal: number }[] })
              .phases ?? [],
          }))}
          todayTotal={todayTotal}
        />
        <UserMenu me={me} />
      </div>
    </header>
  );
}

export { Topbar };
