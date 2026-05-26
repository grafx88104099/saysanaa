import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  currentPeriodKey,
  formatPeriodLabel,
  listRecentPeriodKeys,
} from "@/lib/kpi-period";
import type { KpiPeriodType } from "@prisma/client";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; key?: string }>;
}) {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/dashboard");

  const sp = await searchParams;
  const type = (sp.type as KpiPeriodType) || "MONTH";
  const key = sp.key || currentPeriodKey(type);

  const [snapshots, allPeriods] = await Promise.all([
    prisma.employeeKpiPeriod.findMany({
      where: { periodType: type, periodKey: key },
      include: { employee: { select: { firstName: true, lastName: true, photoUrl: true, role: true } } },
      orderBy: { composite: "desc" },
    }),
    prisma.employeeKpiPeriod.findMany({
      select: { periodType: true, periodKey: true, computedAt: true },
      distinct: ["periodType", "periodKey"],
      orderBy: { computedAt: "desc" },
      take: 50,
    }),
  ]);

  const periodChoices = listRecentPeriodKeys(type, 12);

  return (
    <ReportsClient
      type={type}
      periodKey={key}
      periodLabel={formatPeriodLabel(type, key)}
      periodChoices={periodChoices}
      snapshots={snapshots.map((s) => ({
        employeeId: s.employeeId,
        firstName: s.employee.firstName,
        lastName: s.employee.lastName,
        photoUrl: s.employee.photoUrl,
        role: s.employee.role,
        composite: s.composite,
        letter: s.letter,
        efficiency: s.efficiency,
        onTime: s.onTime,
        quality: s.quality,
        lowRevision: s.lowRevision,
        gradeMatch: s.gradeMatch,
        closedCount: s.closedCount,
        activeCount: s.activeCount,
        normHours: s.normHours,
        actualHours: s.actualHours,
        workHours: s.workHours,
        clientWaitHours: s.clientWaitHours,
        revisionHours: s.revisionHours,
        computedAt: s.computedAt.toISOString(),
      }))}
      history={allPeriods.map((p) => ({
        type: p.periodType,
        key: p.periodKey,
        label: formatPeriodLabel(p.periodType, p.periodKey),
        computedAt: p.computedAt.toISOString(),
      }))}
    />
  );
}
