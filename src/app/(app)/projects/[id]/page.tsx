import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  priorityAccent,
} from "@/lib/labels";
import ProgressRing from "@/components/ProgressRing";
import PhasesBoard from "@/components/projects/PhasesBoard";
import ContractCard from "@/components/projects/ContractCard";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function MyProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await readSession();
  if (!me) redirect("/login");

  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
  if (!myEmp) redirect("/login");

  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: {
        orderBy: { ordinal: "asc" },
        include: {
          tasks: {
            orderBy: { ordinal: "asc" },
            include: {
              assignee: true,
              checklist: { orderBy: { ordinal: "asc" } },
              attachments: { orderBy: { createdAt: "asc" } },
              comments: {
                orderBy: { createdAt: "asc" },
                include: { author: true },
              },
            },
          },
        },
      },
      assignments: { include: { employee: true } },
    },
  });
  if (!p) notFound();

  const activeEmployees = await prisma.employee.findMany({
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
  });

  const isManager = me.role === "ADMIN" || me.role === "PM";
  const isAssigned = p.assignments.some((a) => a.employeeId === myEmp.id);
  const isLead = p.assignments.some((a) => a.employeeId === myEmp.id && a.isLead);
  if (!isManager && !isAssigned) redirect("/projects");
  const canEditPhases = isManager || isLead;

  const acc = priorityAccent(p.priority);
  const cv = p.contractValue ? Number(p.contractValue) : null;
  const ringColor =
    p.progressPct >= 100 ? "#3FCF8E" : p.progressPct >= 50 ? "#8B95FF" : "#E5B85C";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-white/45 mb-5">
        <Link href="/projects" className="hover:text-white transition">Миний төсөл</Link>
        <span>/</span>
        <span className="text-white/80 font-mono">{p.code}</span>
      </div>

      <div className="flex items-start gap-6 pb-8 border-b border-white/10 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-[11px] font-bold px-2 py-1 rounded"
              style={{ background: acc.color, color: "#0B0D10" }}
            >
              P{p.priority}
            </span>
            <span className="text-[12px] font-mono text-white/60">{p.code}</span>
            <span
              className={
                p.status === "ACTIVE"
                  ? "chip-on"
                  : p.status === "COMPLETED" || p.status === "CANCELLED"
                  ? "chip-off"
                  : "chip-soft"
              }
            >
              {PROJECT_STATUS_LABEL[p.status]}
            </span>
            <span className="text-[11px] text-white/45">{PROJECT_TYPE_LABEL[p.type]}</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight">{p.name}</h1>
          <div className="text-white/55 text-[13px] mt-1">
            {p.clientName}
            {p.location && <> · {p.location}</>}
            {p.purpose && <> · {p.purpose}</>}
          </div>
        </div>
        <ProgressRing value={p.progressPct} size={92} strokeWidth={8} color={ringColor} />
      </div>

      <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-10">
        <Info label="Эхлэх" value={fmtDate(p.startDate)} />
        <Info label="Дуусах" value={fmtDate(p.endDate)} />
        <Info label="Талбай" value={p.areaM2 ? `${p.areaM2} м²` : "—"} />
        <Info label="Үнэ" value={fmtMoney(cv)} />
      </div>

      <div className="mb-8">
        <ContractCard
          projectId={p.id}
          canManage={isManager}
          contract={
            p.contractUrl && p.contractName && p.contractAt
              ? {
                  url: p.contractUrl,
                  name: p.contractName,
                  at: p.contractAt.toISOString(),
                }
              : null
          }
        />
      </div>

      <section className="mb-10">
        <PhasesBoard
          projectId={p.id}
          phases={p.phases.map((ph) => ({
            id: ph.id,
            ordinal: ph.ordinal,
            name: ph.name,
            hours: ph.hours,
            progressPct: ph.progressPct,
            progressLocked: ph.progressLocked,
          }))}
          tasks={p.phases.flatMap((ph) =>
            ph.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              assignee: t.assignee
                ? {
                    id: t.assignee.id,
                    initials: ((t.assignee.lastName[0] ?? "") + (t.assignee.firstName[0] ?? "")).toUpperCase(),
                    fullName: `${t.assignee.lastName} ${t.assignee.firstName}`,
                    photoUrl: t.assignee.photoUrl,
                  }
                : null,
              dueDate: t.dueDate ? t.dueDate.toISOString() : null,
              estimatedHours: t.estimatedHours,
              actualHours: t.actualHours,
              description: t.description,
              blockedReason: t.blockedReason,
              attachmentCount: t.attachments.length,
              commentCount: t.comments.length,
              checklistDone: t.checklist.filter((c) => c.done).length,
              checklistTotal: t.checklist.length,
              phaseId: ph.id,
              phaseOrdinal: ph.ordinal,
              phaseName: ph.name,
              assigneeId: t.assigneeId,
              createdAt: t.createdAt.toISOString(),
              updatedAt: t.updatedAt.toISOString(),
              checklist: t.checklist.map((c) => ({
                id: c.id,
                text: c.text,
                done: c.done,
                ordinal: c.ordinal,
              })),
              attachments: t.attachments.map((a) => ({
                id: a.id,
                url: a.url,
                name: a.name,
                size: a.size,
                createdAt: a.createdAt.toISOString(),
              })),
              comments: t.comments.map((c) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt.toISOString(),
                authorId: c.authorId,
                authorName: `${c.author.lastName} ${c.author.firstName}`,
              })),
            })),
          )}
          assignees={activeEmployees.map((e) => ({
            id: e.id,
            initials: ((e.lastName[0] ?? "") + (e.firstName[0] ?? "")).toUpperCase(),
            fullName: `${e.lastName} ${e.firstName}`,
            role: e.role,
            profession: e.profession,
            photoUrl: e.photoUrl,
          }))}
          canManage={canEditPhases}
          canChangeStatus={canEditPhases || isAssigned}
          myEmpId={myEmp.id}
        />
        {!canEditPhases && isAssigned && (
          <div className="text-[11px] text-white/40 mt-2">
            💡 Та өөрт оногдсон task-уудын статусыг өөрчилж болно
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">Багийнхан</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {p.assignments.map((a) => (
            <div
              key={a.id}
              className={`border rounded-md p-3 ${
                a.isLead ? "border-white/45 bg-white/[0.04]" : "border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {a.employee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.employee.photoUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-white/15"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-[12px] font-medium">
                    {(a.employee.lastName[0] ?? "") + (a.employee.firstName[0] ?? "")}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {a.employee.lastName} {a.employee.firstName}
                  </div>
                  <div className="text-[11px] text-white/45 truncate">
                    {a.employee.profession ?? "—"}
                  </div>
                </div>
              </div>
              {a.isLead && (
                <div className="text-[9px] font-semibold uppercase tracking-widest text-white mt-2">
                  ★ Лид
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </div>
      <div className="text-[14px] tabular-nums">{value}</div>
    </div>
  );
}
