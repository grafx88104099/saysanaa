import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  priorityAccent,
} from "@/lib/labels";
import ProgressBar from "@/components/ProgressBar";

export default async function Dashboard() {
  const s = await readSession();
  const me = s ? await prisma.employee.findUnique({ where: { userId: s.uid } }) : null;
  const isManager = s?.role === "ADMIN" || s?.role === "PM";

  const [employees, active, activeProjects, myActiveProjects, recentMine] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { active: true } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    me
      ? prisma.project.count({
          where: {
            assignments: { some: { employeeId: me.id } },
            status: "ACTIVE",
          },
        })
      : Promise.resolve(0),
    me
      ? prisma.project.findMany({
          where: {
            assignments: { some: { employeeId: me.id } },
            status: { in: ["ACTIVE", "DRAFT", "ON_HOLD"] },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-2">
      <div className="mb-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-gradient">Хяналтын самбар</h1>
        <p className="text-white/45 text-[13px] mt-1">Системийн ерөнхий байдал</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-10">
        <Stat label="Идэвхтэй төсөл" value={activeProjects} accent="#6AA6FF" />
        <Stat label="Миний төсөл" value={myActiveProjects} accent="#22C55E" />
        <Stat label="Идэвхтэй ажилтан" value={active} accent="#F59E0B" />
        <Stat label="Нийт ажилтан" value={employees} accent="#8B5CF6" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[14px] font-semibold tracking-tight">
              {isManager ? "Сүүлийн төсөл" : "Миний төслүүд"}
            </h2>
            <Link
              href={isManager ? "/admin/projects" : "/projects"}
              className="text-[12px] text-white/55 hover:text-white transition"
            >
              Бүгдийг харах →
            </Link>
          </div>
          {recentMine.length === 0 ? (
            <div className="text-[13px] text-white/40 border border-dashed border-white/10 rounded-md p-8 text-center">
              Танд оногдсон идэвхтэй төсөл байхгүй
            </div>
          ) : (
            <div className="space-y-2">
              {recentMine.map((p) => {
                const acc = priorityAccent(p.priority);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block card-hover rounded-md p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: acc.color, color: "#0B0D10" }}
                      >
                        P{p.priority}
                      </span>
                      <span className="text-[11px] font-mono text-white/55">{p.code}</span>
                      <span className="text-[11px] text-white/45 ml-1">
                        {PROJECT_TYPE_LABEL[p.type]}
                      </span>
                      <span className="ml-auto text-[10px] text-white/45">
                        {PROJECT_STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <div className="text-[13px] font-medium mb-2 truncate">{p.name}</div>
                    <ProgressBar
                      value={p.progressPct}
                      showLabel
                      color={
                        p.progressPct >= 100
                          ? "#34D399"
                          : p.progressPct >= 50
                          ? "#818CF8"
                          : "#FBBF24"
                      }
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[14px] font-semibold tracking-tight mb-4">Шуурхай</h2>
          <div className="space-y-2">
            <QuickLink href="/projects" label="Миний төсөл" />
            <QuickLink href="/profile" label="Профайл" />
            {isManager && <QuickLink href="/admin/projects/new" label="+ Шинэ төсөл" />}
            {isManager && <QuickLink href="/admin/employees" label="Ажилтан удирдлага" />}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="relative panel px-5 py-5 overflow-hidden"
      style={{
        background: `radial-gradient(140% 110% at 0% 0%, ${accent}1F 0%, transparent 55%), linear-gradient(180deg, #121A33 0%, #18224A 100%)`,
      }}
    >
      <div className="text-[11px] font-medium text-sub mb-2 uppercase tracking-wider">{label}</div>
      <div
        className="text-[30px] font-bold tracking-tight leading-none tabular-nums"
        style={{ color: accent, textShadow: `0 0 22px ${accent}55` }}
      >
        {value}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block card-hover rounded-md px-4 py-3 text-[13px] text-white/75 hover:text-white"
    >
      {label}
    </Link>
  );
}
