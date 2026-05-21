import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateProjectCode, DESIGN_PHASES, BUILD_PHASES } from "@/lib/projects";
import { loadHolidayKeys, MN_HOLIDAYS_2026 } from "@/lib/calendar";
import ProjectForm from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/admin/projects");

  const [nextCodeBuild, nextCodeDesign, employees, holidayKeys] = await Promise.all([
    generateProjectCode("BUILD"),
    generateProjectCode("DESIGN"),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profession: true,
        photoUrl: true,
      },
    }),
    loadHolidayKeys(),
  ]);

  const holidayList =
    holidayKeys.size > 0
      ? Array.from(holidayKeys)
      : MN_HOLIDAYS_2026.map((h) => h.date);

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-[22px] font-semibold tracking-tight mb-6">Шинэ төсөл нэмэх</h1>
      <ProjectForm
        mode="create"
        initial={{
          type: "BUILD",
          code: nextCodeBuild,
          phases: BUILD_PHASES,
        }}
        nextCodes={{ DESIGN: nextCodeDesign, BUILD: nextCodeBuild }}
        templates={{ DESIGN: DESIGN_PHASES, BUILD: BUILD_PHASES }}
        employees={employees.map((e) => ({
          id: e.id,
          initials: ((e.lastName[0] ?? "") + (e.firstName[0] ?? "")).toUpperCase(),
          fullName: `${e.lastName} ${e.firstName}`,
          role: e.role,
          profession: e.profession,
          photoUrl: e.photoUrl,
        }))}
        holidayList={holidayList}
      />
    </div>
  );
}
