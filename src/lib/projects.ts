import { prisma } from "./db";
import { ProjectType } from "@prisma/client";
import { calcEndDate, calcWorkDays, loadHolidayKeys } from "./calendar";

export type PhaseTemplate = { ordinal: number; name: string; hours: number };

export const DESIGN_PHASES: PhaseTemplate[] = [
  { ordinal: 0, name: "Хөтөлбөр, scope тогтоох", hours: 8 },
  { ordinal: 1, name: "Талбайн хэмжээ авалт", hours: 16 },
  { ordinal: 2, name: "Концепц боловсруулалт", hours: 40 },
  { ordinal: 3, name: "Mood board, материал сонголт", hours: 24 },
  { ordinal: 4, name: "Зураг боловсруулалт (DD)", hours: 48 },
  { ordinal: 5, name: "3D render, презентац", hours: 40 },
  { ordinal: 6, name: "Ажлын зураг, спецификаци", hours: 56 },
  { ordinal: 7, name: "Хүлээлгэн өгөх, презентац", hours: 8 },
];

export const BUILD_PHASES: PhaseTemplate[] = [
  { ordinal: 0, name: "Гэрээ, үнийн санал", hours: 16 },
  { ordinal: 1, name: "Талбайн бэлтгэл", hours: 24 },
  { ordinal: 2, name: "Буулгалтын ажил", hours: 40 },
  { ordinal: 3, name: "Хог хаягдал", hours: 16 },
  { ordinal: 4, name: "Материал татан авалт", hours: 32 },
  { ordinal: 5, name: "Гипсэн ханын угсралт", hours: 56 },
  { ordinal: 6, name: "Гипсэн таазны угсралт", hours: 48 },
  { ordinal: 7, name: "Цахилгааны монтаж", hours: 40 },
  { ordinal: 8, name: "Хана, таазны засал", hours: 48 },
  { ordinal: 9, name: "Тавилгын захиалга", hours: 24 },
  { ordinal: 10, name: "Хаалга, шилэн хана", hours: 32 },
  { ordinal: 11, name: "Шалны ажил", hours: 40 },
  { ordinal: 12, name: "Талбайн цэвэрлэгээ", hours: 16 },
  { ordinal: 13, name: "Гэрээ, төлбөр хаах", hours: 8 },
];

export function getPhaseTemplate(type: ProjectType): PhaseTemplate[] {
  return type === "DESIGN" ? DESIGN_PHASES : BUILD_PHASES;
}

export const PROJECT_TYPE_PREFIX: Record<ProjectType, string> = {
  DESIGN: "ZR",
  BUILD: "ZG",
};

/**
 * Шинэ дотоод код үүсгэх: {PREFIX}{YY}-{NN}
 * Жш: ZG26-02
 *
 * Тэмдэглэл: Энэ функц нь зөвхөн **препозиц preview** (next code preview)-руу зориулагдсан.
 * Жинхэнэ үүсгэхдээ `createProjectWithUniqueCode` ашиглах нь зөв — collision-ий үед retry хийнэ.
 */
export async function generateProjectCode(type: ProjectType, year?: number): Promise<string> {
  const yy = String((year ?? new Date().getFullYear()) % 100).padStart(2, "0");
  const prefix = `${PROJECT_TYPE_PREFIX[type]}${yy}-`;
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (last) {
    const m = last.code.match(/-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(2, "0")}`;
}

/**
 * Code давхцах race condition-аас хамгаалах ерөнхий тусгай helper.
 * `userCode` (хэрэглэгчийн заасан) байгаа бол түүнийг ашиглана; үгүй бол auto generate-аас эхэлж,
 * collision (P2002) гарвал дугаарыг нэмж +1 хийгээд хамгийн ихдээ 50 удаа дахин оролдоно.
 */
export async function createProjectWithUniqueCode<T>(
  type: ProjectType,
  userCode: string | undefined,
  factory: (code: string) => Promise<T>,
  year?: number,
): Promise<T> {
  if (userCode && userCode.trim().length > 0) {
    return factory(userCode.trim());
  }
  const yy = String((year ?? new Date().getFullYear()) % 100).padStart(2, "0");
  const prefix = `${PROJECT_TYPE_PREFIX[type]}${yy}-`;
  let attempt = 0;
  // эхлэх дугаарыг олно
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (last) {
    const m = last.code.match(/-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  while (attempt < 50) {
    const code = `${prefix}${String(next + attempt).padStart(2, "0")}`;
    try {
      return await factory(code);
    } catch (e: any) {
      // Prisma P2002 = Unique constraint failed
      if (e?.code === "P2002") {
        attempt++;
        continue;
      }
      throw e;
    }
  }
  throw new Error("Дотоод код үүсгэх боломжгүй (50 удаа давтсан). Дахин оролдоно уу.");
}

/**
 * Төслийн гүйцэтгэлийн %-г бодож шинэчлэнэ. Phase progressPct-ийг weight=hours-ээр
 * жигнэсэн дундажаар тооцоолно.
 *
 * BUILD төсөл: totalHours/totalWorkDays/endDate нь гэрээт зүйл — захиалагч
 * хариуцсан endDate-ээс тооцогддог. recalc нь зөвхөн progressPct-г шинэчилнэ.
 *
 * DESIGN төсөл: totalHours = phase-sum (KPI норм); endDate нь гар оруулсан
 * утга байвал хэвээр үлдээнэ, эс бол totalHours-аас тооцно.
 */
export async function recalcProjectStats(projectId: string) {
  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    orderBy: { ordinal: "asc" },
  });
  const phaseSumHours = phases.reduce((s, p) => s + p.hours, 0);
  const weighted = phases.reduce((s, p) => s + p.hours * p.progressPct, 0);
  const progressPct = phaseSumHours > 0 ? Math.round(weighted / phaseSumHours) : 0;

  const proj = await prisma.project.findUnique({ where: { id: projectId } });
  if (!proj) return null;

  // BUILD: контрактын зүйлийг хадгал — зөвхөн progressPct шинэчлэнэ.
  if (proj.type === "BUILD") {
    return prisma.project.update({
      where: { id: projectId },
      data: { progressPct },
    });
  }

  // DESIGN: phase-sum = totalHours. endDate нь хэрэглэгчээс байвал хадгална.
  const totalHours = phaseSumHours;
  const totalWorkDays = calcWorkDays(totalHours);
  let endDate = proj.endDate;
  if (proj.startDate && !proj.endDate) {
    const holidayKeys = await loadHolidayKeys();
    endDate = calcEndDate(proj.startDate, totalHours, holidayKeys);
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { totalHours, totalWorkDays, progressPct, endDate },
  });
}

