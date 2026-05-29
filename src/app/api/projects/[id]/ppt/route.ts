import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { buildPresentation, type DeckProject } from "@/lib/pptx";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authorization — ADMIN/PM, or project lead assignee
  const isManager = s.role === "ADMIN" || s.role === "PM";
  let isLead = false;
  if (!isManager) {
    const emp = await prisma.employee.findUnique({ where: { userId: s.uid } });
    if (emp) {
      const a = await prisma.projectAssignment.findFirst({
        where: { projectId: id, employeeId: emp.id, isLead: true },
      });
      isLead = !!a;
    }
  }
  if (!isManager && !isLead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignments: { include: { employee: true } },
      gradeLevel: true,
      pptDeck: { include: { slots: { orderBy: { ordinal: "asc" } } } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deckProject: DeckProject = {
    code: project.code,
    name: project.name,
    clientName: project.clientName,
    location: project.location,
    purpose: project.purpose,
    type: project.type,
    areaM2: project.areaM2,
    contractValue: project.contractValue ? Number(project.contractValue) : null,
    startDate: project.startDate,
    endDate: project.endDate,
    totalWorkDays: project.totalWorkDays,
    progressPct: project.progressPct,
    assignments: project.assignments.map((a) => ({
      fullName: `${a.employee.lastName} ${a.employee.firstName}`.trim(),
      role: a.role ?? "",
      isLead: a.isLead,
    })),
    gradeLabel: project.gradeLevel?.label ?? null,
  };

  const deck = project.pptDeck
    ? {
        briefText: project.pptDeck.briefText,
        materialsText: project.pptDeck.materialsText,
        slots: project.pptDeck.slots.map((sl) => ({
          kind: sl.kind,
          ordinal: sl.ordinal,
          imageUrl: sl.imageUrl,
          caption: sl.caption,
        })),
      }
    : { briefText: null, materialsText: null, slots: [] };

  const buffer = await buildPresentation(deckProject, deck);

  // Update lastGeneratedAt
  if (project.pptDeck) {
    await prisma.projectPptDeck.update({
      where: { id: project.pptDeck.id },
      data: { lastGeneratedAt: new Date() },
    });
  }

  const safeName = `${project.code}_${project.name}`
    .replace(/[^\w\-]/g, "_")
    .slice(0, 80);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeName}.pptx"`,
      "Cache-Control": "no-store",
    },
  });
}
