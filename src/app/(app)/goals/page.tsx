import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import GoalsView from "./GoalsView";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");

  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const requestedYear = parseInt(sp.year ?? String(currentYear));
  const year = isNaN(requestedYear) ? currentYear : requestedYear;

  const [goals, allYears] = await Promise.all([
    prisma.companyGoal.findMany({
      where: { year },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.companyGoal.findMany({
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    }),
  ]);

  const yearsSet = new Set<number>([currentYear, year]);
  for (const g of allYears) yearsSet.add(g.year);
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return (
    <GoalsView
      isManager={s.role === "ADMIN" || s.role === "PM"}
      isAdmin={s.role === "ADMIN"}
      year={year}
      years={years}
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title,
        body: g.body,
        parentId: g.parentId,
        progress: g.progress,
        sortOrder: g.sortOrder,
      }))}
    />
  );
}
