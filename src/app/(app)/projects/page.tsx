import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  priorityAccent,
} from "@/lib/labels";
import ProgressBar from "@/components/ProgressBar";

export default async function MyProjectsPage() {
  const s = await readSession();
  if (!s) redirect("/login");

  const me = await prisma.employee.findUnique({ where: { userId: s.uid } });
  if (!me) redirect("/login");

  // ADMIN/PM-д бүх төсөл, бусдад зөвхөн өөртэй холбоотой
  const isManager = s.role === "ADMIN" || s.role === "PM";
  const projects = await prisma.project.findMany({
    where: isManager
      ? {}
      : { assignments: { some: { employeeId: me.id } } },
    include: {
      assignments: { include: { employee: true } },
      phases: { orderBy: { ordinal: "asc" } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {isManager ? "Бүх төсөл" : "Миний төсөл"}
        </h1>
        <p className="text-white/45 text-[12px] mt-1">
          {isManager
            ? "Удирдлагын хувьд бүх төсөл харна"
            : `Танд оногдсон ${projects.length} төсөл`}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-[13px] text-white/40 border border-dashed border-white/10 rounded-md p-10 text-center">
          Танд одоохондоо оногдсон төсөл байхгүй байна
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const acc = priorityAccent(p.priority);
            const currentPhase = p.phases.find((ph) => ph.progressPct < 100);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="border border-white/10 rounded-lg p-5 hover:border-white/25 hover:bg-white/[0.02] transition group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: acc.color, color: "#0B0D10" }}
                  >
                    P{p.priority}
                  </span>
                  <span className="text-[11px] font-mono text-white/55">{p.code}</span>
                  <span className="ml-auto text-[10px] text-white/45">
                    {PROJECT_TYPE_LABEL[p.type]}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight line-clamp-2 mb-1">
                  {p.name}
                </h3>
                <div className="text-[11px] text-white/45 mb-4 truncate">
                  {p.clientName}
                  {p.location && <> · {p.location}</>}
                </div>

                <div className="mb-3">
                  <ProgressBar
                    value={p.progressPct}
                    showLabel
                    color={
                      p.progressPct >= 100
                        ? "#3FCF8E"
                        : p.progressPct >= 50
                        ? "#8B95FF"
                        : "#E5B85C"
                    }
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/55">
                  <span>
                    {currentPhase ? `→ ${currentPhase.name}` : "Бүх фаз дууссан"}
                  </span>
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
