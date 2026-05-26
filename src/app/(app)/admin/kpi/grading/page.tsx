import { prisma } from "@/lib/db";
import Editor from "./Editor";

export default async function GradingPage() {
  const [levels, criteria, descs] = await Promise.all([
    prisma.kpiGradeLevel.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.kpiGradeCriterion.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.kpiCriterionLevelDesc.findMany(),
  ]);

  return (
    <Editor
      levels={levels.map((l) => ({
        id: l.id,
        key: l.key,
        label: l.label,
        minScore: l.minScore,
        maxScore: l.maxScore,
      }))}
      criteria={criteria.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description,
      }))}
      cells={descs.map((d) => ({ criterionId: d.criterionId, levelId: d.levelId, body: d.body }))}
    />
  );
}
