import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES: { name: string; kind: "INCOME" | "EXPENSE"; sortOrder: number }[] = [
  // Income
  { name: "Гэрээний орлого", kind: "INCOME", sortOrder: 1 },
  { name: "Зөвлөгөөний орлого", kind: "INCOME", sortOrder: 2 },
  { name: "Бусад орлого", kind: "INCOME", sortOrder: 99 },
  // Expense
  { name: "Цалин", kind: "EXPENSE", sortOrder: 1 },
  { name: "НДШ / татвар", kind: "EXPENSE", sortOrder: 2 },
  { name: "Түрээс", kind: "EXPENSE", sortOrder: 3 },
  { name: "Хангамжийн материал", kind: "EXPENSE", sortOrder: 4 },
  { name: "Технологи / тоног төхөөрөмж", kind: "EXPENSE", sortOrder: 5 },
  { name: "Маркетинг / зар сурталчилгаа", kind: "EXPENSE", sortOrder: 6 },
  { name: "Програм хангамжийн төлбөр", kind: "EXPENSE", sortOrder: 7 },
  { name: "Зам зардал / томилолт", kind: "EXPENSE", sortOrder: 8 },
  { name: "Бусад зардал", kind: "EXPENSE", sortOrder: 99 },
];

async function main() {
  console.log("⚙ Finance category seed эхэлж байна…");
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.financeCategory.upsert({
      where: { name_kind: { name: c.name, kind: c.kind } },
      update: { sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log(`✓ ${DEFAULT_CATEGORIES.length} категори.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
