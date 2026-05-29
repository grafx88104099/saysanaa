import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚙ Organization seed эхэлж байна…");
  await prisma.organization.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      name: "SAYSANAA",
      legalName: 'SAYSANAA "ХХК"',
      tagline: "Interior design that lasts",
      description:
        "SAYSANAA нь Монголд тэргүүлэгч интерьер дизайны компани юм. Бид зураг төсөл болон бүтээн байгуулалтын ажлыг олон улсын стандартад нийцүүлэн гүйцэтгэнэ.",
      website: "https://saysanaa.mn",
      address: "Улаанбаатар хот, Монгол улс",
      foundedYear: 2022,
    },
  });
  console.log("✓ Organization seed дууссан");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
