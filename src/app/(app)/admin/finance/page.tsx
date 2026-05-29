import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  currentMonthKey,
  parseMonthKey,
  monthRange,
} from "@/lib/attendance";
import FinanceView from "./FinanceView";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.role !== "ADMIN" && s.role !== "ACCOUNTANT") redirect("/dashboard");

  const sp = await searchParams;
  const key = sp.month ?? currentMonthKey();
  const parsed = parseMonthKey(key) ?? parseMonthKey(currentMonthKey())!;
  const { start, end } = monthRange(parsed.year, parsed.month);

  const [categories, entries, projects] = await Promise.all([
    prisma.financeCategory.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.financeEntry.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true, project: { select: { id: true, code: true, name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD", "COMPLETED"] } },
      select: { id: true, code: true, name: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  return (
    <FinanceView
      monthKey={key}
      year={parsed.year}
      month={parsed.month}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        sortOrder: c.sortOrder,
      }))}
      entries={entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        categoryId: e.categoryId,
        categoryName: e.category.name,
        categoryKind: e.category.kind,
        amount: Number(e.amount),
        projectId: e.projectId,
        projectLabel: e.project ? `${e.project.code} — ${e.project.name}` : null,
        note: e.note,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      }))}
      isAdmin={s.role === "ADMIN"}
    />
  );
}
