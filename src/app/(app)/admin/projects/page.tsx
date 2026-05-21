import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
  PROJECT_TYPE_LABEL,
  PROJECT_TYPES,
  priorityAccent,
} from "@/lib/labels";
import Select from "@/components/Select";
import ProgressBar from "@/components/ProgressBar";
import type { ProjectStatus, ProjectType } from "@prisma/client";

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; priority?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const type = sp.type && sp.type !== "all" ? (sp.type as ProjectType) : undefined;
  const status = sp.status && sp.status !== "all" ? (sp.status as ProjectStatus) : undefined;
  const minPriority = sp.priority ? parseInt(sp.priority, 10) : undefined;

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { clientName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        type ? { type } : {},
        status ? { status } : {},
        minPriority ? { priority: { gte: minPriority } } : {},
      ],
    },
    include: {
      assignments: { include: { employee: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Төсөл</h1>
          <div className="text-white/45 text-[12px] mt-1">Нийт {projects.length} төсөл</div>
        </div>
        <Link href="/admin/projects/new" className="btn-primary">
          Шинэ төсөл
        </Link>
      </div>

      <form className="border border-white/10 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-end bg-black">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Хайх</label>
          <input name="q" defaultValue={q} placeholder="Код, нэр, захиалагч..." className="input" />
        </div>
        <div className="min-w-[180px]">
          <label className="label">Төрөл</label>
          <Select
            name="type"
            defaultValue={type ?? "all"}
            options={[
              { value: "all", label: "Бүгд" },
              ...PROJECT_TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABEL[t] })),
            ]}
          />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Статус</label>
          <Select
            name="status"
            defaultValue={status ?? "all"}
            options={[
              { value: "all", label: "Бүгд" },
              ...PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] })),
            ]}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="label">Чухал ≥</label>
          <Select
            name="priority"
            defaultValue={sp.priority ?? ""}
            options={[
              { value: "", label: "Бүгд" },
              { value: "5", label: "P5+" },
              { value: "7", label: "P7+ (яаралтай)" },
              { value: "9", label: "P9+ (маш яаралтай)" },
            ]}
          />
        </div>
        <button type="submit" className="btn-ghost">Шүүх</button>
      </form>

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[120px_2fr_160px_1fr_160px_1.4fr_1fr] text-[10px] font-medium uppercase tracking-wider text-white/45 border-b border-white/10 px-4 py-2.5 items-center">
          <div>Код</div>
          <div>Төсөл</div>
          <div>Төрөл</div>
          <div>Захиалагч</div>
          <div>Статус</div>
          <div>Гүйцэтгэл</div>
          <div>Багийнхан</div>
        </div>
        {projects.length === 0 && (
          <div className="px-4 py-12 text-center text-white/40 text-[12px]">
            Төсөл олдсонгүй
          </div>
        )}
        {projects.map((p) => {
          const acc = priorityAccent(p.priority);
          return (
            <Link
              key={p.id}
              href={`/admin/projects/${p.id}`}
              className="grid grid-cols-[120px_2fr_160px_1fr_160px_1.4fr_1fr] items-center px-4 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: acc.color, color: "#0B0D10" }}
                  title={`P${p.priority}`}
                >
                  P{p.priority}
                </span>
                <span className="text-[12px] font-mono text-white/80">{p.code}</span>
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-white/40 truncate">{p.location ?? "—"}</div>
              </div>
              <div className="text-[12px] text-white/75">{PROJECT_TYPE_LABEL[p.type]}</div>
              <div className="text-[12px] text-white/75 truncate">{p.clientName}</div>
              <div>
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
              <div>
                <ProgressBar value={p.progressPct} showLabel />
              </div>
              <div className="flex -space-x-1.5">
                {p.assignments.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="w-7 h-7 rounded-full border-2 border-bg overflow-hidden bg-white/5 flex items-center justify-center text-[10px] font-medium"
                    title={`${a.employee.lastName} ${a.employee.firstName}`}
                  >
                    {a.employee.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.employee.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>{(a.employee.lastName[0] ?? "") + (a.employee.firstName[0] ?? "")}</>
                    )}
                  </div>
                ))}
                {p.assignments.length > 4 && (
                  <div className="w-7 h-7 rounded-full border-2 border-bg bg-white/10 flex items-center justify-center text-[10px] text-white/60">
                    +{p.assignments.length - 4}
                  </div>
                )}
                {p.assignments.length === 0 && (
                  <span className="text-[11px] text-white/30">—</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
