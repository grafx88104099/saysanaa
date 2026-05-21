import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readKioskCookie, touchKioskToken, validateKioskToken } from "@/lib/kiosk";
import { PROJECT_TYPE_LABEL, ROLE_LABEL } from "@/lib/labels";
import { loadHolidayKeys, calcEndDate } from "@/lib/calendar";

const ACTION_LABEL: Record<string, string> = {
  "login.success": "нэвтэрсэн",
  "login.password_ok": "нэвтрэх (2FA хүлээлт)",
  "login.fail": "нэвтрэх амжилтгүй",
  "2fa.success": "2FA баталгаажуулсан",
  "2fa.fail": "2FA буруу код",
  "2fa.enabled": "2FA идэвхжүүлсэн",
  logout: "гарсан",
  "employee.create": "ажилтан нэмсэн",
  "employee.update": "ажилтны мэдээлэл засварласан",
  "employee.activate": "ажилтан идэвхжүүлсэн",
  "employee.deactivate": "ажилтан идэвхгүй болгосон",
  "employee.reset_password": "ажилтны нууц үг шинэчилсэн",
  "profile.update": "өөрийн мэдээлэл шинэчилсэн",
  "profile.password_change": "нууц үгээ сольсон",
  "profile.password_fail": "нууц үг буруу оруулсан",
  "profile.2fa_reset": "өөрийн 2FA reset хийсэн",
  "kiosk.create": "kiosk дэлгэц нэмсэн",
  "kiosk.revoke": "kiosk дэлгэц зогсоосон",
  "project.create": "шинэ төсөл нэмсэн",
  "project.update": "төсөл засварласан",
  "project.status_change": "төслийн статус өөрчилсөн",
  "project.phase_progress": "фазын ахицыг бичсэн",
  "project.contract_upload": "гэрээ оруулсан",
  "project.contract_remove": "гэрээ устгасан",
  "task.create": "шинэ task үүсгэсэн",
  "task.update": "task мэдээлэл засварласан",
  "task.status": "task статус өөрчилсөн",
  "task.delete": "task устгасан",
  "task.comment": "task-д сэтгэгдэл бичсэн",
  "task.attach": "task-д файл хавсаргасан",
  "phase.lock": "фазыг гар хяналт болгосон",
  "phase.unlock": "фазыг автомат хяналт болгосон",
  "holiday.add": "амралтын өдөр бүртгэсэн",
  "holiday.delete": "амралтын өдөр устгасан",
  "holiday.bulk_import": "баяр амралтыг түрхэрхэн нэмсэн",
};

export async function GET() {
  const token = await readKioskCookie();
  const row = await validateKioskToken(token);
  if (!row) {
    return NextResponse.json({ error: "Эрхгүй хандалт" }, { status: 401 });
  }
  touchKioskToken(row.id);

  const [employees, active, admins, projectsActive, recentAudit, activeEmployees, allProjects] =
    await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { active: true } }),
      prisma.employee.count({ where: { role: "ADMIN" } }),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          profession: true,
        },
      }),
      prisma.project.findMany({
        where: { status: "ACTIVE" },
        include: {
          phases: { orderBy: { ordinal: "asc" } },
          assignments: {
            include: {
              employee: {
                select: { firstName: true, lastName: true, photoUrl: true },
              },
            },
          },
        },
        orderBy: [{ priority: "desc" }, { startDate: "asc" }],
        take: 12,
      }),
    ]);

  const actorIds = Array.from(
    new Set(recentAudit.map((a) => a.actorId).filter(Boolean) as string[]),
  );
  const actors = actorIds.length
    ? await prisma.employee.findMany({
        where: { userId: { in: actorIds } },
        select: { userId: true, firstName: true, lastName: true },
      })
    : [];
  const actorMap = new Map(
    actors.map((a) => [a.userId, `${a.lastName} ${a.firstName}`.trim()]),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projects = allProjects.map((p) => {
    const currentPhase = p.phases.find((ph) => ph.progressPct < 100) ?? null;
    const daysLeft = p.endDate
      ? Math.max(0, Math.ceil((+p.endDate - +today) / 86400000))
      : null;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.clientName,
      type: p.type,
      typeLabel: PROJECT_TYPE_LABEL[p.type],
      priority: p.priority,
      progressPct: p.progressPct,
      currentPhaseName: currentPhase?.name ?? "Бүх фаз дууссан",
      currentPhaseOrdinal: currentPhase?.ordinal ?? null,
      totalPhases: p.phases.length,
      completedPhases: p.phases.filter((ph) => ph.progressPct === 100).length,
      daysLeft,
      phases: p.phases.map((ph) => ({
        ordinal: ph.ordinal,
        name: ph.name,
        progressPct: ph.progressPct,
      })),
      team: p.assignments.slice(0, 5).map((a) => ({
        initials: ((a.employee.lastName[0] ?? "") + (a.employee.firstName[0] ?? "")).toUpperCase(),
        photoUrl: a.employee.photoUrl,
      })),
      teamExtra: Math.max(0, p.assignments.length - 5),
    };
  });

  // Phase milestones in next 7 days
  const holidayKeys = await loadHolidayKeys();
  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);
  const milestones: {
    id: string;
    projectCode: string;
    projectName: string;
    phaseName: string;
    date: string;
  }[] = [];
  for (const p of allProjects) {
    if (!p.startDate) continue;
    // compute end date of each phase from startDate + cumulative hours
    let cumHours = 0;
    for (const ph of p.phases) {
      cumHours += ph.hours;
      const phaseEnd = calcEndDate(p.startDate, cumHours, holidayKeys);
      if (!phaseEnd) continue;
      if (phaseEnd >= today && phaseEnd <= inSevenDays) {
        milestones.push({
          id: ph.id,
          projectCode: p.code,
          projectName: p.name,
          phaseName: ph.name,
          date: phaseEnd.toISOString().slice(0, 10),
        });
      }
    }
  }

  return NextResponse.json({
    ts: new Date().toISOString(),
    kpis: {
      employees,
      active,
      inactive: employees - active,
      admins,
      activeProjects: projectsActive,
    },
    activity: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      label: ACTION_LABEL[a.action] ?? a.action,
      actor: a.actorId ? actorMap.get(a.actorId) ?? "—" : "—",
      at: a.createdAt.toISOString(),
    })),
    team: activeEmployees.map((e) => ({
      id: e.id,
      name: `${e.lastName} ${e.firstName}`.trim(),
      initials: ((e.lastName[0] ?? "") + (e.firstName[0] ?? "")).toUpperCase(),
      role: ROLE_LABEL[e.role],
      photoUrl: e.photoUrl,
    })),
    projects,
    milestones,
  });
}
