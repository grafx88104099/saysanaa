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
import ScheduleBadge from "@/components/projects/ScheduleBadge";
import { loadHolidayKeys } from "@/lib/calendar";
import { computeExpectedProgress } from "@/lib/projectProgress";

const PAGE_SIZE = 24;

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");

  const me = await prisma.employee.findUnique({ where: { userId: s.uid } });
  if (!me) redirect("/login");

  const sp = await searchParams;
  const pageReq = parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(pageReq) && pageReq > 0 ? pageReq : 1;

  // ADMIN/PM-д бүх төсөл, бусдад зөвхөн өөртэй холбоотой
  const isManager = s.role === "ADMIN" || s.role === "PM";
  const where = isManager ? {} : { assignments: { some: { employeeId: me.id } } };
  // Sequential — connection_limit=1 means parallel risks pool starvation here.
  const totalCount = await prisma.project.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const projects = await prisma.project.findMany({
    where,
    include: {
      assignments: { include: { employee: true } },
      phases: { orderBy: { ordinal: "asc" } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: PAGE_SIZE,
    skip: (safePage - 1) * PAGE_SIZE,
  });
  const holidayKeys = await loadHolidayKeys();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight">
          {isManager ? "Бүх төсөл" : "Миний төсөл"}
        </h1>
        <p className="text-white/45 text-[12px] mt-1">
          {isManager
            ? `Удирдлагын хувьд бүх төсөл харна · ${totalCount} нийт`
            : `Танд оногдсон ${totalCount} төсөл`}
          {totalPages > 1 && (
            <span className="text-sub">
              {" "}· {safePage}/{totalPages} хуудас
            </span>
          )}
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
            const expected = computeExpectedProgress(
              {
                startDate: p.startDate,
                endDate: p.endDate,
                totalWorkDays: p.totalWorkDays,
                totalHours: p.totalHours,
                progressPct: p.progressPct,
                phases: p.phases.map((ph) => ({
                  ordinal: ph.ordinal,
                  name: ph.name,
                  hours: ph.hours,
                  progressPct: ph.progressPct,
                })),
              },
              holidayKeys
            );
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card-hover rounded-lg p-5 group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: acc.color, color: "#0B0D10" }}
                  >
                    P{p.priority}
                  </span>
                  <span className="text-[11px] font-mono text-white/55">{p.code}</span>
                  <ScheduleBadge expected={expected} size="xs" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-[12px]">
          <div className="text-sub">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, totalCount)} / {totalCount}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={safePage > 1 ? `/projects?page=${safePage - 1}` : "#"}
              className={`px-3 py-1.5 rounded border text-[12px] transition ${
                safePage > 1
                  ? "border-bd text-tx hover:bg-white/[0.03]"
                  : "border-bd/40 text-sub/40 pointer-events-none"
              }`}
            >
              ← Өмнөх
            </Link>
            <span className="text-sub tabular-nums px-2">
              {safePage} / {totalPages}
            </span>
            <Link
              href={safePage < totalPages ? `/projects?page=${safePage + 1}` : "#"}
              className={`px-3 py-1.5 rounded border text-[12px] transition ${
                safePage < totalPages
                  ? "border-bd text-tx hover:bg-white/[0.03]"
                  : "border-bd/40 text-sub/40 pointer-events-none"
              }`}
            >
              Дараах →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
