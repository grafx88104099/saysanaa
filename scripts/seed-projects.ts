import { PrismaClient, ProjectStatus, ProjectType } from "@prisma/client";
import {
  DESIGN_PHASES,
  BUILD_PHASES,
  generateProjectCode,
} from "../src/lib/projects";
import {
  calcEndDate,
  loadHolidayKeys,
  MN_HOLIDAYS_2026,
} from "../src/lib/calendar";

const prisma = new PrismaClient();

type Seed = {
  type: ProjectType;
  name: string;
  purpose: string;
  clientName: string;
  location: string;
  priority: number;
  areaM2: number;
  contractValue: number;
  startDate: string;
  status: ProjectStatus;
  progressTargets: number[]; // фаз бүрийн progress %
};

const SEEDS: Seed[] = [
  // ── Зураг төсөл (DESIGN) ─────────────────────────────────────
  {
    type: "DESIGN",
    name: "Tavan Bogd Tower — Гүйцэтгэх захирлын оффис",
    purpose: "Оффис",
    clientName: "Tavan Bogd Group",
    location: "Сүхбаатар, СБД-1",
    priority: 8,
    areaM2: 220,
    contractValue: 45_000_000,
    startDate: "2026-04-15",
    status: "ACTIVE",
    progressTargets: [100, 100, 100, 75, 50, 25, 0, 0],
  },
  {
    type: "DESIGN",
    name: "Olive Garden ресторан — гол танхим",
    purpose: "Ресторан",
    clientName: "Olive F&B LLC",
    location: "Хан-Уул, Зайсан",
    priority: 6,
    areaM2: 320,
    contractValue: 38_000_000,
    startDate: "2026-05-05",
    status: "ACTIVE",
    progressTargets: [100, 100, 100, 100, 50, 0, 0, 0],
  },
  {
    type: "DESIGN",
    name: "Zaisan Hill — 3-р давхар орон сууц",
    purpose: "Орон сууц",
    clientName: "Б.Анхбаяр",
    location: "Хан-Уул, Зайсан хилл",
    priority: 4,
    areaM2: 145,
    contractValue: 18_500_000,
    startDate: "2026-05-25",
    status: "DRAFT",
    progressTargets: [50, 0, 0, 0, 0, 0, 0, 0],
  },

  // ── Засал гүйцэтгэл (BUILD) ─────────────────────────────────
  {
    type: "BUILD",
    name: "Sky Business Center — 4-р давхар",
    purpose: "Оффис",
    clientName: "Sky Properties",
    location: "Хан-Уул, Зайсан",
    priority: 9,
    areaM2: 380,
    contractValue: 95_000_000,
    startDate: "2026-05-04",
    status: "ACTIVE",
    progressTargets: [100, 100, 100, 100, 75, 50, 25, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    type: "BUILD",
    name: "Shangri-La residence — 12B apartments",
    purpose: "Апартмент",
    clientName: "Shangri-La Mongolia",
    location: "Сүхбаатар, төв талбай",
    priority: 7,
    areaM2: 510,
    contractValue: 142_000_000,
    startDate: "2026-05-18",
    status: "ACTIVE",
    progressTargets: [100, 100, 75, 50, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
];

async function ensureHolidays(adminId: string) {
  const count = await prisma.holiday.count();
  if (count > 0) return;
  console.log("→ 2026 Монгол баяр амралтыг нэмж байна...");
  for (const h of MN_HOLIDAYS_2026) {
    await prisma.holiday.create({
      data: { date: new Date(h.date), name: h.name, createdBy: adminId },
    });
  }
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@saysanaa.mn" },
  });
  if (!admin) throw new Error("admin@saysanaa.mn олдсонгүй. Эхлээд seed хийнэ үү.");

  await ensureHolidays(admin.id);

  const allEmployees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  if (allEmployees.length === 0) {
    throw new Error("Ажилтан бүртгэлгүй байна. Эхлээд хэдэн ажилтан үүсгэнэ үү.");
  }

  const holidayKeys = await loadHolidayKeys();

  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    const template = s.type === "DESIGN" ? DESIGN_PHASES : BUILD_PHASES;
    if (s.progressTargets.length !== template.length) {
      throw new Error(
        `progressTargets length mismatch for "${s.name}": got ${s.progressTargets.length}, expected ${template.length}`,
      );
    }

    // Skip if a project with same name exists
    const dup = await prisma.project.findFirst({ where: { name: s.name } });
    if (dup) {
      console.log(`✓ "${s.name}" аль хэдийн бүртгэгдсэн → алгасав`);
      continue;
    }

    const code = await generateProjectCode(s.type);
    const totalHours = template.reduce((sum, p) => sum + p.hours, 0);
    const startDate = new Date(s.startDate);
    const endDate = calcEndDate(startDate, totalHours, holidayKeys);
    const weighted = template.reduce(
      (sum, p, idx) => sum + p.hours * s.progressTargets[idx],
      0,
    );
    const progressPct = Math.round(weighted / totalHours);

    // 2-4 хариуцагч санамсаргүй
    const teamCount = Math.min(allEmployees.length, 2 + (i % 3));
    const team = [...allEmployees]
      .sort(() => Math.random() - 0.5)
      .slice(0, teamCount);

    await prisma.project.create({
      data: {
        code,
        type: s.type,
        status: s.status,
        name: s.name,
        purpose: s.purpose,
        clientName: s.clientName,
        location: s.location,
        priority: s.priority,
        areaM2: s.areaM2,
        contractValue: String(s.contractValue),
        startDate,
        endDate,
        totalHours,
        totalWorkDays: Math.ceil(totalHours / 8),
        progressPct,
        createdBy: admin.id,
        phases: {
          create: template.map((p, idx) => ({
            ordinal: p.ordinal,
            name: p.name,
            hours: p.hours,
            progressPct: s.progressTargets[idx],
            startedAt: s.progressTargets[idx] > 0 ? new Date() : null,
            completedAt: s.progressTargets[idx] === 100 ? new Date() : null,
          })),
        },
        assignments: {
          create: team.map((emp, idx) => ({
            employeeId: emp.id,
            isLead: idx === 0,
          })),
        },
      },
    });

    console.log(`✓ ${code} · ${s.name} · ${progressPct}% · ${team.length} хүн`);
  }

  const total = await prisma.project.count();
  console.log(`\n🎉 Дууслаа. Системд нийт ${total} төсөл бүртгэгдсэн байна.`);
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
