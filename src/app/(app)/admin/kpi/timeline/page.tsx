import { prisma } from "@/lib/db";
import Editor from "./Editor";

export default async function TimelinePage() {
  const [bands, phases] = await Promise.all([
    prisma.kpiAreaBand.findMany({
      include: { phases: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.kpiPhase.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const data = bands.map((b) => ({
    id: b.id,
    label: b.label,
    minM2: b.minM2,
    maxM2: b.maxM2,
    totalPriceMnt: Number(b.totalPriceMnt),
    cells: phases.map((ph) => {
      const c = b.phases.find((x) => x.phaseId === ph.id);
      return {
        phaseId: ph.id,
        hours: c?.estimatedHours ?? 0,
        pct: c?.unitRatePct ?? 0,
        rateMnt: Number(c?.unitRateMnt ?? 0),
        quantityNote: c?.quantityNote ?? null,
      };
    }),
  }));

  const phaseCols = phases.map((p) => ({ id: p.id, key: p.key, label: p.label }));

  return <Editor bands={data} phases={phaseCols} />;
}
