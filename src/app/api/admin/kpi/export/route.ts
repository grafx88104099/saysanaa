import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatPeriodLabel } from "@/lib/kpi-period";
import type { KpiPeriodType } from "@prisma/client";

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
  // Excel formula injection prevention: prefix risky leading chars with apostrophe
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  await requireRole("ADMIN", "PM");
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") as KpiPeriodType) || "MONTH";
  const key = url.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const snaps = await prisma.employeeKpiPeriod.findMany({
    where: { periodType: type, periodKey: key },
    include: { employee: { select: { firstName: true, lastName: true, role: true, profession: true } } },
    orderBy: { composite: "desc" },
  });

  const headers = [
    "#",
    "Овог",
    "Нэр",
    "Role",
    "Мэргэжил",
    "Оноо",
    "Letter",
    "Үр ашиг %",
    "Цаг тухайд %",
    "Чанар %",
    "Засваргүй %",
    "Grade %",
    "Дууссан",
    "Идэвхтэй",
    "Норм цаг",
    "Бодит цаг",
    "Ажилласан",
    "Хүлээсэн",
    "Засвар",
  ];

  const rows = snaps.map((s, i) => [
    i + 1,
    s.employee.lastName,
    s.employee.firstName,
    s.employee.role,
    s.employee.profession ?? "",
    s.composite,
    s.letter,
    Math.round(s.efficiency * 100),
    Math.round(s.onTime * 100),
    Math.round(s.quality * 100),
    Math.round(s.lowRevision * 100),
    Math.round(s.gradeMatch * 100),
    s.closedCount,
    s.activeCount,
    s.normHours,
    s.actualHours.toFixed(1),
    s.workHours.toFixed(1),
    s.clientWaitHours.toFixed(1),
    s.revisionHours.toFixed(1),
  ]);

  const csv = [
    `# KPI Snapshot · ${formatPeriodLabel(type, key)}`,
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");

  // UTF-8 BOM for Excel
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kpi-${type}-${key}.csv"`,
    },
  });
}
