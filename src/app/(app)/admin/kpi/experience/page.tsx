import { prisma } from "@/lib/db";
import Editor from "./Editor";

export default async function ExperiencePage() {
  const [tiers, levels] = await Promise.all([
    prisma.kpiExperienceTier.findMany({
      include: { allowedLevels: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.kpiGradeLevel.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <Editor
      tiers={tiers.map((t) => ({
        id: t.id,
        label: t.label,
        minYears: t.minYears,
        maxYears: t.maxYears,
        sortOrder: t.sortOrder,
        allowedLevelIds: t.allowedLevels.map((a) => a.levelId),
      }))}
      levels={levels.map((l) => ({ id: l.id, key: l.key, label: l.label }))}
    />
  );
}
