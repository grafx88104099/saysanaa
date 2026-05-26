"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { computeEmployeeKpi } from "@/lib/kpi-metrics";
import { periodKeyToRange } from "@/lib/kpi-period";
import { revalidatePath } from "next/cache";
import type { KpiPeriodType } from "@prisma/client";

export type PersistState = { ok?: boolean; error?: string; count?: number } | undefined;

export async function persistSnapshotAction(
  type: KpiPeriodType,
  key: string
): Promise<PersistState> {
  const me = await requireRole("ADMIN", "PM");
  const range = periodKeyToRange(type, key);
  if (!range) return { error: "Period key буруу" };

  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true },
  });

  let count = 0;
  for (const e of employees) {
    const k = await computeEmployeeKpi(e.id, range.start, range.end);
    const m = Object.fromEntries(k.metrics.map((x) => [x.key, x.value]));
    await prisma.employeeKpiPeriod.upsert({
      where: {
        employeeId_periodType_periodKey: {
          employeeId: e.id,
          periodType: type,
          periodKey: key,
        },
      },
      update: {
        composite: k.composite,
        letter: k.letter,
        closedCount: k.closedCount,
        activeCount: k.activeCount,
        efficiency: m.efficiency ?? 0,
        onTime: m.onTime ?? 0,
        quality: m.quality ?? 0,
        lowRevision: m.lowRevision ?? 0,
        gradeMatch: m.gradeMatch ?? 0,
        normHours: k.totals.normHours,
        actualHours: k.totals.actualHours,
        workHours: k.totals.workHours,
        clientWaitHours: k.totals.clientWaitHours,
        revisionHours: k.totals.revisionHours,
        computedAt: new Date(),
        computedBy: me.uid,
      },
      create: {
        employeeId: e.id,
        periodType: type,
        periodKey: key,
        composite: k.composite,
        letter: k.letter,
        closedCount: k.closedCount,
        activeCount: k.activeCount,
        efficiency: m.efficiency ?? 0,
        onTime: m.onTime ?? 0,
        quality: m.quality ?? 0,
        lowRevision: m.lowRevision ?? 0,
        gradeMatch: m.gradeMatch ?? 0,
        normHours: k.totals.normHours,
        actualHours: k.totals.actualHours,
        workHours: k.totals.workHours,
        clientWaitHours: k.totals.clientWaitHours,
        revisionHours: k.totals.revisionHours,
        computedBy: me.uid,
      },
    });
    count++;
  }

  await audit("kpi.snapshot.persist", me.uid, `${type}:${key}`, { count });
  revalidatePath("/admin/kpi/reports");
  return { ok: true, count };
}

export async function deleteSnapshotAction(
  type: KpiPeriodType,
  key: string
): Promise<PersistState> {
  const me = await requireRole("ADMIN");
  const r = await prisma.employeeKpiPeriod.deleteMany({
    where: { periodType: type, periodKey: key },
  });
  await audit("kpi.snapshot.delete", me.uid, `${type}:${key}`, { count: r.count });
  revalidatePath("/admin/kpi/reports");
  return { ok: true, count: r.count };
}
