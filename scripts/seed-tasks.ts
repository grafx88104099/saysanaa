import { PrismaClient, TaskStatus, TaskPriority } from "@prisma/client";
import { recalcAllPhasesForProject } from "../src/lib/tasks";

const prisma = new PrismaClient();

type SeedTask = {
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  estimatedHours?: number;
  dueOffset?: number; // days from project start
};

const TASK_TEMPLATES: { phaseOrd: number; tasks: SeedTask[] }[] = [
  // Засал гүйцэтгэлийн нэгдсэн жишээ
  {
    phaseOrd: 0,
    tasks: [
      { title: "Захиалагчтай уулзалт", status: "DONE", estimatedHours: 4, dueOffset: 1 },
      { title: "Үнийн санал илгээх", status: "DONE", estimatedHours: 6, dueOffset: 2 },
      { title: "Гэрээ батлуулах", status: "DONE", estimatedHours: 6, dueOffset: 3, priority: "HIGH" },
    ],
  },
  {
    phaseOrd: 1,
    tasks: [
      { title: "Талбайн зургийг сүүлийн байдалд оруулах", status: "DONE", estimatedHours: 8, dueOffset: 5 },
      { title: "Materials list бэлдэх", status: "DONE", estimatedHours: 8, dueOffset: 6 },
      { title: "Багаа танилцуулах", status: "DONE", estimatedHours: 4, dueOffset: 6 },
    ],
  },
  {
    phaseOrd: 2,
    tasks: [
      { title: "Хуучин таазыг буулгах", status: "DONE", estimatedHours: 16, dueOffset: 10 },
      { title: "Хуучин шалыг буулгах", status: "DONE", estimatedHours: 16, dueOffset: 12 },
      { title: "Хана буулгалт", status: "DONE", estimatedHours: 8, dueOffset: 13 },
    ],
  },
  {
    phaseOrd: 3,
    tasks: [
      { title: "Тоосго хог тээвэрлэх", status: "DONE", estimatedHours: 8, dueOffset: 14 },
      { title: "Талбай цэвэрлэх", status: "DONE", estimatedHours: 8, dueOffset: 14 },
    ],
  },
  {
    phaseOrd: 4,
    tasks: [
      { title: "Гипсэн хана татах", status: "REVIEW", estimatedHours: 16, dueOffset: 16 },
      { title: "Цементийн нэмэгдэл захиалах", status: "DOING", estimatedHours: 8, dueOffset: 17, priority: "HIGH" },
      { title: "Тавилгын material ачуулах", status: "DOING", estimatedHours: 8, dueOffset: 18 },
    ],
  },
  {
    phaseOrd: 5,
    tasks: [
      { title: "Гипсэн хана профиль татах", status: "DOING", estimatedHours: 24, dueOffset: 21 },
      { title: "Гипсэн ханан дотроос цахилгаан татах", status: "TODO", estimatedHours: 16, dueOffset: 23 },
      { title: "Хана өөрчлөлт батлуулах", status: "TODO", estimatedHours: 8, dueOffset: 24 },
      { title: "Гипсэн хавтан суулгах", status: "TODO", estimatedHours: 8, dueOffset: 25 },
    ],
  },
  {
    phaseOrd: 6,
    tasks: [
      { title: "Гипсэн тааз профиль татах", status: "TODO", estimatedHours: 16, dueOffset: 28 },
      { title: "Гипсэн таазыг угсрах", status: "TODO", estimatedHours: 24, dueOffset: 31 },
      { title: "LED line bracket suulgah", status: "TODO", estimatedHours: 8, dueOffset: 32 },
    ],
  },
  {
    phaseOrd: 7,
    tasks: [
      { title: "Гэрэлтүүлгийн төлөвлөгөө батлуулах", status: "TODO", estimatedHours: 8, dueOffset: 34 },
      { title: "Цахилгаан утас татах", status: "TODO", estimatedHours: 16, dueOffset: 37 },
      { title: "Switch + розетка байршил тогтоох", status: "BLOCKED", estimatedHours: 8, dueOffset: 38 },
    ],
  },
];

const DESIGN_TASKS: { phaseOrd: number; tasks: SeedTask[] }[] = [
  {
    phaseOrd: 0,
    tasks: [
      { title: "Захиалагчтай scope yarianan", status: "DONE", estimatedHours: 4, dueOffset: 1 },
      { title: "Brief баримтжуулах", status: "DONE", estimatedHours: 4, dueOffset: 2 },
    ],
  },
  {
    phaseOrd: 1,
    tasks: [
      { title: "Талбай хэмжих", status: "DONE", estimatedHours: 8, dueOffset: 3 },
      { title: "Зураг үндсэн оруулах", status: "DONE", estimatedHours: 8, dueOffset: 4 },
    ],
  },
  {
    phaseOrd: 2,
    tasks: [
      { title: "Концепц 3 хувилбар", status: "DONE", estimatedHours: 24, dueOffset: 8, priority: "HIGH" },
      { title: "Захиалагчтай танилцуулга", status: "DONE", estimatedHours: 8, dueOffset: 9 },
      { title: "Шинэчилсэн концепц", status: "DOING", estimatedHours: 8, dueOffset: 10 },
    ],
  },
  {
    phaseOrd: 3,
    tasks: [
      { title: "Mood board бэлдэх", status: "DOING", estimatedHours: 12, dueOffset: 12 },
      { title: "Тавилга, гэрэлтүүлгийн references", status: "TODO", estimatedHours: 12, dueOffset: 13 },
    ],
  },
];

async function seedForProject(projectId: string, templates: typeof TASK_TEMPLATES) {
  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    orderBy: { ordinal: "asc" },
  });
  const assigns = await prisma.projectAssignment.findMany({
    where: { projectId },
    select: { employeeId: true, isLead: true },
  });
  if (assigns.length === 0) return;
  const startDate = (await prisma.project.findUnique({ where: { id: projectId }, select: { startDate: true } }))?.startDate;

  let created = 0;
  for (const t of templates) {
    const phase = phases.find((p) => p.ordinal === t.phaseOrd);
    if (!phase) continue;
    const existing = await prisma.task.count({ where: { phaseId: phase.id } });
    if (existing > 0) continue;
    let ord = 0;
    for (const seed of t.tasks) {
      const assignee = assigns[Math.floor(Math.random() * assigns.length)];
      let due: Date | null = null;
      if (startDate && seed.dueOffset !== undefined) {
        due = new Date(startDate);
        due.setDate(due.getDate() + seed.dueOffset);
      }
      await prisma.task.create({
        data: {
          phaseId: phase.id,
          ordinal: ord++,
          title: seed.title,
          status: seed.status,
          priority: seed.priority ?? "NORMAL",
          estimatedHours: seed.estimatedHours ?? null,
          dueDate: due,
          assigneeId: assignee.employeeId,
          createdBy: assigns.find((a) => a.isLead)?.employeeId ?? assigns[0].employeeId,
          startedAt: seed.status !== "TODO" ? new Date() : null,
          completedAt: seed.status === "DONE" ? new Date() : null,
          blockedReason: seed.status === "BLOCKED" ? "Цахилгаан тоо тогтоогдоогүй" : null,
        },
      });
      created++;
    }
  }
  await recalcAllPhasesForProject(projectId);
  return created;
}

async function main() {
  const buildProjects = await prisma.project.findMany({ where: { type: "BUILD" } });
  const designProjects = await prisma.project.findMany({ where: { type: "DESIGN" } });

  let total = 0;
  for (const p of buildProjects) {
    const n = await seedForProject(p.id, TASK_TEMPLATES);
    if (n) {
      console.log(`✓ ${p.code} · ${p.name} · ${n} task`);
      total += n;
    }
  }
  for (const p of designProjects) {
    const n = await seedForProject(p.id, DESIGN_TASKS);
    if (n) {
      console.log(`✓ ${p.code} · ${p.name} · ${n} task`);
      total += n;
    }
  }
  console.log(`\n🎉 Дууслаа. ${total} task үүсгэв.`);
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
