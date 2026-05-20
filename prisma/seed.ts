import { PrismaClient, Role, SkillLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@saysanaa.mn";
  const password = "Admin@123";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin аль хэдийн үүсгэгдсэн:", email);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      employee: {
        create: {
          firstName: "Систем",
          lastName: "Админ",
          role: Role.ADMIN,
          profession: "Системийн администратор",
          autocadLevel: SkillLevel.NONE,
          sketchupLevel: SkillLevel.NONE,
          languages: ["mn", "en"],
        },
      },
    },
  });
  console.log("✓ Admin үүсгэлээ:");
  console.log("  email:   ", email);
  console.log("  password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
