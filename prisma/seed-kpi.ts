import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Phases (10) ────────────────────────────────────────────────────────────
const PHASES: {
  key: string;
  label: string;
  sortOrder: number;
  isClientWait?: boolean;
  isRevision?: boolean;
}[] = [
  { key: "research",        label: "Ерөнхий судалгаа / Research",          sortOrder: 1 },
  { key: "space_planning",  label: "План төлөвлөлт / Space Planning",      sortOrder: 2 },
  { key: "moodboard",       label: "Мүүдбоард / Moodboard",                sortOrder: 3 },
  { key: "sketch",          label: "3D Скеч / Sketch",                     sortOrder: 4 },
  { key: "modeling",        label: "3D Моделинг / Modeling",               sortOrder: 5 },
  { key: "rendering",       label: "3D Рендер / Rendering",                sortOrder: 6 },
  { key: "tech_drawings",   label: "Ажлын зураг / Technical Drawings",     sortOrder: 7 },
  { key: "ppt",             label: "Танилцуулга / PPT Presentation",       sortOrder: 8 },
  { key: "client_response", label: "Захиалагчийн хариу / Client Response", sortOrder: 9, isClientWait: true },
  { key: "revision",        label: "Засвар / нэмэлт хугацаа",              sortOrder: 10, isRevision: true },
];

// ─── Bands (13) ─────────────────────────────────────────────────────────────
const BANDS: { label: string; minM2: number; maxM2: number | null; totalPriceMnt: number; sortOrder: number }[] = [
  { label: "20-49",     minM2: 20,   maxM2: 49,   totalPriceMnt:  500_000, sortOrder: 1 },
  { label: "50-99",     minM2: 50,   maxM2: 99,   totalPriceMnt: 1_000_000, sortOrder: 2 },
  { label: "100-149",   minM2: 100,  maxM2: 149,  totalPriceMnt: 1_250_000, sortOrder: 3 },
  { label: "150-199",   minM2: 150,  maxM2: 199,  totalPriceMnt: 1_500_000, sortOrder: 4 },
  { label: "200-249",   minM2: 200,  maxM2: 249,  totalPriceMnt: 1_750_000, sortOrder: 5 },
  { label: "250-299",   minM2: 250,  maxM2: 299,  totalPriceMnt: 2_000_000, sortOrder: 6 },
  { label: "300-399",   minM2: 300,  maxM2: 399,  totalPriceMnt: 2_500_000, sortOrder: 7 },
  { label: "400-499",   minM2: 400,  maxM2: 499,  totalPriceMnt: 3_000_000, sortOrder: 8 },
  { label: "500-749",   minM2: 500,  maxM2: 749,  totalPriceMnt: 3_500_000, sortOrder: 9 },
  { label: "750-999",   minM2: 750,  maxM2: 999,  totalPriceMnt: 4_000_000, sortOrder: 10 },
  { label: "1000-1499", minM2: 1000, maxM2: 1499, totalPriceMnt: 4_500_000, sortOrder: 11 },
  { label: "1500-1999", minM2: 1500, maxM2: 1999, totalPriceMnt: 5_000_000, sortOrder: 12 },
  { label: "2000+",     minM2: 2000, maxM2: null, totalPriceMnt: 5_500_000, sortOrder: 13 },
];

// hours[bandIndex][phaseIndex] — taken from Time.xlsx
const HOURS: number[][] = [
  [ 4,  8, 3,  4, 16,  8, 16, 4, 16, 12   ],
  [ 8,  8, 3,  3, 20, 10, 20, 4, 16, 15   ],
  [ 8, 10, 3,  3, 22, 12, 22, 4, 16, 17   ],
  [ 8, 12, 3,  3, 24, 12, 24, 4, 16, 18   ],
  [ 8, 14, 3,  4, 26, 12, 26, 4, 24, 19   ],
  [ 8, 16, 3,  4, 26, 15, 26, 4, 24, 20.5 ],
  [ 8, 20, 4,  4, 40, 18, 40, 4, 32, 29   ],
  [ 8, 24, 4,  4, 42, 20, 42, 8, 32, 31   ],
  [ 8, 24, 4,  8, 48, 15, 48, 8, 40, 31.5 ],
  [ 8, 32, 8,  8, 48, 15, 48, 8, 40, 31.5 ],
  [ 8, 40, 8, 16, 56, 17, 56, 8, 40, 36.5 ],
  [16, 48, 8, 24, 64, 24, 64, 8, 80, 44   ],
  [24, 56, 8, 32, 72, 31, 72, 8, 80, 51.5 ],
];

// per-phase % of total band price (only sketch/rendering/ppt are non-zero)
const RATE_PCT: Record<string, number> = {
  research: 0,        space_planning: 0,  moodboard: 0,
  sketch: 0.2,        modeling: 0,        rendering: 0.5,
  tech_drawings: 0,   ppt: 0.3,           client_response: 0, revision: 0,
};

const QTY_NOTE: Record<string, string | null> = {
  research: null,
  space_planning: "2 хувилбар",
  moodboard: "3 хувилбар",
  sketch: null,
  modeling: null,
  rendering: "10-25 ширхэг",
  tech_drawings: null,
  ppt: null,
  client_response: null,
  revision: null,
};

// ─── Grade levels ───────────────────────────────────────────────────────────
const LEVELS: { key: string; label: string; minScore: number; maxScore: number; sortOrder: number }[] = [
  { key: "APLUS", label: "A+", minScore: 9, maxScore: 10, sortOrder: 1 },
  { key: "A",     label: "A",  minScore: 7, maxScore: 8,  sortOrder: 2 },
  { key: "B",     label: "B",  minScore: 4, maxScore: 6,  sortOrder: 3 },
  { key: "C",     label: "C",  minScore: 1, maxScore: 3,  sortOrder: 4 },
];

// ─── 7 шалгуур + 4 түвшний матриц ──────────────────────────────────────────
type RubricRow = { label: string; description?: string; cells: Record<string, string> };
const RUBRIC: RubricRow[] = [
  {
    label: "Харилцагчийн (компанийн) хэмжээ, нэр хүнд",
    cells: {
      APLUS: "Олон улсын нэр хүнд бүхий байгууллагууд\nМонголын томоохон групп компаниуд\nТусгай хувь захиалагч",
      A:     "Олон улсын нэр хүнд бүхий байгууллагууд\nМонголын томоохон групп компаниуд\nТусгай хувь захиалагч",
      B:     "Монголын жижиг дунд хэмжээний компаниуд\nХувь захиалагч",
      C:     "Жижиг компаниуд\nХувь захиалагч",
    },
  },
  {
    label: "Харилцагчийн зан төлөв",
    cells: {
      APLUS: "Шаардлага маш өндөртэй\nДизайн болон урлагын мэдрэмж өндөр\nӨөрийн юу хүсэж байгааг бүрэн ойлгосон",
      A:     "Шаардлага өндөр\nДизайны мэдлэг өндөр\nӨөрийн юу хүсэж байгааг ойлгосон",
      B:     "Стандартын шаардлага тавих\nДизайны мэдлэгтэй\nӨөрийн юу хүсэж байгааг ерөнхийд нь мэддэг",
      C:     "Шаардлага бага\nТөслийг гүйцэтгэгчид бүрэн даатгах хандлагатай",
    },
  },
  {
    label: "Талбайн хэмжээ м²",
    cells: {
      APLUS: "Хамааралгүй",
      A:     "100+ м²",
      B:     "50+ м²",
      C:     "50- м²",
    },
  },
  {
    label: "Төслийн цар хүрээ",
    cells: {
      APLUS: "Ач холбогдол маш өндөр\nОлон улсын стандартад нийцэх",
      A:     "Ач холбогдол өндөр\nСтандарт дүрмүүдэд нийцэх",
      B:     "Энгийн",
      C:     "Энгийн",
    },
  },
  {
    label: "Төслийн төрөл",
    cells: {
      APLUS: "Оффис, Хаус, Апартмент, Ресторан, Лоунж, Үйлчилгээ/худалдааны газар",
      A:     "Оффис, Хаус, Апартмент, Ресторан, Лоунж, Үйлчилгээ/худалдааны газар",
      B:     "Оффис, Хаус, Апартмент, Ресторан, Лоунж, Үйлчилгээ/худалдааны газар",
      C:     "Оффис, Лоунж, Апартмент, Үйлчилгээ/худалдааны газар",
    },
  },
  {
    label: "Төвөгшил",
    description: "Хугацаа · Хорших · Олон талын харилцаа",
    cells: {
      APLUS: "Хугацаа маш давчуу\nХорших зурагнуудтай\n3+ харилцагч талуудтай",
      A:     "Хугацаа бага\nХорших зурагнуудтай\n3+ харилцагч талуудтай",
      B:     "Энгийн гэрээт хугацаатай\nХорших зурагнуудгүй\nНэг харилцагч талтай",
      C:     "Энгийн гэрээт хугацаатай\nХорших зурагнуудгүй\nНэг харилцагч талтай",
    },
  },
  {
    label: "Төслийн дизайн",
    cells: {
      APLUS: "Маш өвөрмөц, онцгой\nХийцлэл ихтэй\nХэт классик\nӨрөө бүрт өөр дизайнтай",
      A:     "Онцгой\nШинэлэг",
      B:     "Энгийн\nХэт минимал",
      C:     "Энгийн",
    },
  },
];

// ─── Туршлагын муж ────────────────────────────────────────────────────────
const TIERS: { label: string; minYears: number; maxYears: number | null; allowed: string[]; sortOrder: number }[] = [
  { label: "1-2 жил",       minYears: 1, maxYears: 2,    allowed: ["C", "B"],         sortOrder: 1 },
  { label: "2-5 жил",       minYears: 2, maxYears: 5,    allowed: ["C", "B", "A"],    sortOrder: 2 },
  { label: "5-аас дээш жил", minYears: 5, maxYears: null, allowed: ["APLUS"],         sortOrder: 3 },
];

async function main() {
  console.log("⚙  KPI seed эхэлж байна…");

  // Phases
  for (const p of PHASES) {
    await prisma.kpiPhase.upsert({
      where: { key: p.key },
      update: { label: p.label, sortOrder: p.sortOrder, isClientWait: !!p.isClientWait, isRevision: !!p.isRevision },
      create: { key: p.key, label: p.label, sortOrder: p.sortOrder, isClientWait: !!p.isClientWait, isRevision: !!p.isRevision },
    });
  }
  console.log(`✓ Phases: ${PHASES.length}`);

  const phaseByKey = Object.fromEntries(
    (await prisma.kpiPhase.findMany()).map((p) => [p.key, p])
  );

  // Bands + BandPhase
  for (let bi = 0; bi < BANDS.length; bi++) {
    const b = BANDS[bi];
    const band = await prisma.kpiAreaBand.upsert({
      where: { label: b.label },
      update: { minM2: b.minM2, maxM2: b.maxM2, totalPriceMnt: b.totalPriceMnt, sortOrder: b.sortOrder },
      create: { label: b.label, minM2: b.minM2, maxM2: b.maxM2, totalPriceMnt: b.totalPriceMnt, sortOrder: b.sortOrder },
    });

    for (let pi = 0; pi < PHASES.length; pi++) {
      const ph = phaseByKey[PHASES[pi].key];
      const hrs = HOURS[bi][pi];
      const pct = RATE_PCT[PHASES[pi].key] ?? 0;
      const rateMnt = pct > 0 ? Math.round(b.totalPriceMnt * pct) : 0;
      await prisma.kpiBandPhase.upsert({
        where: { bandId_phaseId: { bandId: band.id, phaseId: ph.id } },
        update: { estimatedHours: hrs, unitRatePct: pct, unitRateMnt: rateMnt, quantityNote: QTY_NOTE[PHASES[pi].key] ?? null },
        create: {
          bandId: band.id,
          phaseId: ph.id,
          estimatedHours: hrs,
          unitRatePct: pct,
          unitRateMnt: rateMnt,
          quantityNote: QTY_NOTE[PHASES[pi].key] ?? null,
        },
      });
    }
  }
  console.log(`✓ Bands: ${BANDS.length} × Phases: ${PHASES.length} = ${BANDS.length * PHASES.length} BandPhase`);

  // Grade Levels
  for (const lv of LEVELS) {
    await prisma.kpiGradeLevel.upsert({
      where: { key: lv.key },
      update: { label: lv.label, minScore: lv.minScore, maxScore: lv.maxScore, sortOrder: lv.sortOrder },
      create: { key: lv.key, label: lv.label, minScore: lv.minScore, maxScore: lv.maxScore, sortOrder: lv.sortOrder },
    });
  }
  console.log(`✓ Grade levels: ${LEVELS.length}`);

  const levelByKey = Object.fromEntries(
    (await prisma.kpiGradeLevel.findMany()).map((l) => [l.key, l])
  );

  // Criteria + rubric cells
  // Delete + recreate criteria so order is clean (idempotent re-seed)
  await prisma.kpiCriterionLevelDesc.deleteMany();
  await prisma.kpiGradeCriterion.deleteMany();
  for (let i = 0; i < RUBRIC.length; i++) {
    const r = RUBRIC[i];
    const crit = await prisma.kpiGradeCriterion.create({
      data: { label: r.label, description: r.description ?? null, sortOrder: i + 1 },
    });
    for (const [lvKey, body] of Object.entries(r.cells)) {
      const lv = levelByKey[lvKey];
      if (!lv) continue;
      await prisma.kpiCriterionLevelDesc.create({
        data: { criterionId: crit.id, levelId: lv.id, body },
      });
    }
  }
  console.log(`✓ Criteria: ${RUBRIC.length}, cells: ${RUBRIC.length * LEVELS.length}`);

  // Experience tiers
  await prisma.kpiExperienceTierLevel.deleteMany();
  for (const t of TIERS) {
    const tier = await prisma.kpiExperienceTier.upsert({
      where: { label: t.label },
      update: { minYears: t.minYears, maxYears: t.maxYears, sortOrder: t.sortOrder },
      create: { label: t.label, minYears: t.minYears, maxYears: t.maxYears, sortOrder: t.sortOrder },
    });
    for (const lvKey of t.allowed) {
      const lv = levelByKey[lvKey];
      if (!lv) continue;
      await prisma.kpiExperienceTierLevel.create({
        data: { tierId: tier.id, levelId: lv.id },
      });
    }
  }
  console.log(`✓ Experience tiers: ${TIERS.length}`);

  console.log("✅ KPI seed дууслаа");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
