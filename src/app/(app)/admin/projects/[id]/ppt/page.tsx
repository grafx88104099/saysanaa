import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import PptManager from "./PptManager";

export default async function ProjectPptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await readSession();
  if (!s) redirect("/login");

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
  if (!isManager && !isLead) redirect(`/admin/projects/${id}`);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      pptDeck: { include: { slots: { orderBy: { ordinal: "asc" } } } },
    },
  });
  if (!project) notFound();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-sub mb-5">
        <Link href="/admin/projects" className="hover:text-tx">Төсөл</Link>
        <span>/</span>
        <Link href={`/admin/projects/${id}`} className="hover:text-tx font-mono">
          {project.code}
        </Link>
        <span>/</span>
        <span className="text-tx">Презентэйшн</span>
      </div>
      <PptManager
        projectId={id}
        projectName={project.name}
        projectCode={project.code}
        briefText={project.pptDeck?.briefText ?? ""}
        materialsText={project.pptDeck?.materialsText ?? ""}
        lastGeneratedAt={project.pptDeck?.lastGeneratedAt?.toISOString() ?? null}
        slots={(project.pptDeck?.slots ?? []).map((sl) => ({
          id: sl.id,
          kind: sl.kind,
          ordinal: sl.ordinal,
          imageUrl: sl.imageUrl,
          imageName: sl.imageName,
          caption: sl.caption,
        }))}
      />
    </div>
  );
}
