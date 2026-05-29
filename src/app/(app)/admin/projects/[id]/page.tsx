import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  priorityAccent,
} from "@/lib/labels";
import ProgressBar from "@/components/ProgressBar";
import ProgressRing from "@/components/ProgressRing";
import PhasesBoard from "@/components/projects/PhasesBoard";
import ContractCard from "@/components/projects/ContractCard";
import StatusMenu from "./StatusMenu";
import CloseModal from "./CloseModal";
import { fmtDate, fmtMoney } from "@/lib/format";
import { loadHolidayKeys } from "@/lib/calendar";
import {
  computeExpectedProgress,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/projectProgress";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await readSession();
  if (!me) redirect("/login");

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
      areaBand: true,
      gradeLevel: true,
      gradeScores: { include: { criterion: true } },
      timeEntries: { select: { hours: true, kind: true, phaseId: true } },
      kpiSnapshot: true,
      actualGradeLevel: true,
    },
  });
  if (!p) notFound();

  const myEmp = await prisma.employee.findUnique({ where: { userId: me.uid } });
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
  const allLevels = await prisma.kpiGradeLevel.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, label: true },
  });
  const holidayKeys = await loadHolidayKeys();

  const canEdit = me.role === "ADMIN" || me.role === "PM";

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

  // Aggregate time entries by phase + kind
  const phaseHoursMap = new Map<
    string | null,
    { work: number; clientWait: number; revision: number }
  >();
  let totalWork = 0;
  let totalClientWait = 0;
  let totalRevision = 0;
  for (const te of p.timeEntries) {
    const key = te.phaseId;
    if (!phaseHoursMap.has(key))
      phaseHoursMap.set(key, { work: 0, clientWait: 0, revision: 0 });
    const slot = phaseHoursMap.get(key)!;
    if (te.kind === "WORK") {
      slot.work += te.hours;
      totalWork += te.hours;
    } else if (te.kind === "CLIENT_WAIT") {
      slot.clientWait += te.hours;
      totalClientWait += te.hours;
    } else {
      slot.revision += te.hours;
      totalRevision += te.hours;
    }
  }
  const actualHours = totalWork + totalRevision; // CLIENT_WAIT хасагдана
  const acc = priorityAccent(p.priority);
  const cv = p.contractValue ? Number(p.contractValue) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = p.endDate
    ? Math.max(0, Math.ceil((+p.endDate - +today) / 86400000))
    : null;
  const ringColor =
    p.progressPct >= 100 ? "#3FCF8E" : p.progressPct >= 50 ? "#8B95FF" : "#E5B85C";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-white/45 mb-5">
        <Link href="/admin/projects" className="hover:text-white transition">Төсөл</Link>
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
        {canEdit && (
          <div className="flex flex-col gap-2 self-start">
            <Link href={`/admin/projects/${p.id}/edit`} className="btn-ghost">
              Засах
            </Link>
            <Link
              href={`/admin/projects/${p.id}/ppt`}
              className="btn-ghost"
              title="Презентэйшн үүсгэх"
            >
              🎯 Презентэйшн
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-px bg-white/8 border border-white/10 rounded-lg overflow-hidden mb-8">
        <Stat label="Эхлэх огноо" value={fmtDate(p.startDate)} />
        <Stat label="Дуусах огноо" value={fmtDate(p.endDate)} />
        <Stat
          label="Үлдсэн өдөр"
          value={daysLeft !== null ? `${daysLeft} өдөр` : "—"}
          accent={daysLeft !== null && daysLeft < 7 ? "#E07474" : undefined}
        />
        <Stat label="Гэрээний үнэ" value={fmtMoney(cv)} />
      </div>

      {p.status !== "DRAFT" && p.status !== "CANCELLED" && expected.daysTotal > 0 && (
        <ExpectedProgressCard expected={expected} />
      )}

      <div className="grid grid-cols-4 gap-px bg-white/8 border border-white/10 rounded-lg overflow-hidden mb-10">
        <Stat label="Нийт цаг" value={`${p.totalHours} ц`} />
        <Stat label="Нийт ажлын өдөр" value={`${p.totalWorkDays} өдөр`} />
        <Stat label="Талбай" value={p.areaM2 ? `${p.areaM2} м²` : "—"} />
        <Stat label="Багийнхан" value={`${p.assignments.length} хүн`} />
      </div>

      {p.type === "DESIGN" && (p.gradeLevel || p.areaBand || p.expectedHours > 0 || p.kpiSnapshot) && (
        <KpiSummary
          gradeLevel={p.gradeLevel}
          areaBand={p.areaBand}
          expectedHours={p.expectedHours}
          actualHours={actualHours}
          workHours={totalWork}
          clientWaitHours={totalClientWait}
          revisionHours={totalRevision}
          snapshot={
            p.kpiSnapshot
              ? {
                  efficiency: p.kpiSnapshot.efficiency,
                  qualityRating: p.kpiSnapshot.qualityRating,
                  clientSatisfaction: p.kpiSnapshot.clientSatisfaction,
                  onTime: p.kpiSnapshot.onTime,
                  expectedGradeKey: p.kpiSnapshot.expectedGradeKey,
                  actualGradeKey: p.kpiSnapshot.actualGradeKey,
                  actualGradeLabel: p.actualGradeLevel?.label ?? null,
                  closedAt: p.kpiSnapshot.closedAt.toISOString(),
                }
              : null
          }
          scores={p.gradeScores
            .sort((a, b) => a.criterion.sortOrder - b.criterion.sortOrder)
            .map((s) => ({
              label: s.criterion.label,
              score: s.score,
            }))}
        />
      )}

      <div className="mb-6">
        <ContractCard
          projectId={p.id}
          canManage={canEdit}
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

      {canEdit && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <StatusMenu projectId={p.id} status={p.status} />
          {p.status !== "COMPLETED" && p.status !== "CANCELLED" && (
            <CloseModal
              projectId={p.id}
              expectedGradeLevel={p.gradeLevel}
              allLevels={allLevels}
              estimatedEfficiency={
                p.expectedHours > 0 && actualHours > 0
                  ? p.expectedHours / actualHours
                  : null
              }
            />
          )}
        </div>
      )}

      <section className="mb-10">
        <PhasesBoard
          projectId={p.id}
          projectType={p.type}
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
          canManage={canEdit}
          canChangeStatus={canEdit}
          myEmpId={myEmp?.id ?? null}
        />
      </section>

      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">
          Хариуцагч баг{" "}
          <span className="text-white/40 font-normal">· {p.assignments.length} хүн</span>
        </h2>
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
          {p.assignments.length === 0 && (
            <div className="col-span-full text-[12px] text-white/40 border border-dashed border-white/10 rounded-md p-4 text-center">
              Хариуцагч сонгогдоогүй
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ExpectedProgressCard({
  expected,
}: {
  expected: import("@/lib/projectProgress").ExpectedProgress;
}) {
  const statusColor = STATUS_COLOR[expected.status];
  const statusLabel = STATUS_LABEL[expected.status];
  const deltaSign = expected.delta > 0 ? "+" : "";
  return (
    <div className="mb-8 panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-sub font-medium">
          Хуваарийн ахиц
        </div>
        <div
          className="inline-flex items-center gap-2 text-[12px] font-semibold px-2.5 py-1 rounded"
          style={{
            color: statusColor,
            background: `${statusColor}1A`,
            border: `1px solid ${statusColor}40`,
          }}
        >
          <span>{statusLabel}</span>
          {expected.status !== "NOT_STARTED" && expected.status !== "COMPLETED" && (
            <span className="tabular-nums">
              {deltaSign}
              {Math.abs(expected.delta)}%
            </span>
          )}
        </div>
      </div>

      {/* Dual progress bar */}
      <div className="relative h-3 rounded-full bg-bd overflow-hidden mb-3">
        {/* Expected = dashed indicator behind */}
        <div
          className="absolute inset-y-0 left-0 bg-white/15"
          style={{ width: `${expected.expectedPct}%` }}
          aria-label={`Хүлээгдэх ${expected.expectedPct}%`}
        />
        {/* Actual = solid colored bar in front */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${expected.actualPct}%`,
            background: statusColor,
          }}
          aria-label={`Бодит ${expected.actualPct}%`}
        />
        {/* Today marker */}
        <div
          className="absolute inset-y-0 w-px bg-white"
          style={{ left: `${expected.expectedPct}%` }}
          title={`Өнөөдөр (${expected.expectedPct}%)`}
        />
      </div>

      <div className="grid grid-cols-4 gap-3 text-[11px]">
        <div className="border border-bd rounded-md px-3 py-2 bg-white/[0.02]">
          <div className="text-sub uppercase tracking-wider mb-1">Бодит</div>
          <div className="text-[15px] font-semibold tabular-nums">
            {expected.actualPct}%
          </div>
        </div>
        <div className="border border-bd rounded-md px-3 py-2 bg-white/[0.02]">
          <div className="text-sub uppercase tracking-wider mb-1">Хүлээгдэх</div>
          <div className="text-[15px] font-semibold tabular-nums">
            {expected.expectedPct}%
          </div>
        </div>
        <div className="border border-bd rounded-md px-3 py-2 bg-white/[0.02]">
          <div className="text-sub uppercase tracking-wider mb-1">Өнгөрсөн өдөр</div>
          <div className="text-[15px] font-semibold tabular-nums">
            {expected.daysElapsed} / {expected.daysTotal}
          </div>
        </div>
        <div className="border border-bd rounded-md px-3 py-2 bg-white/[0.02]">
          <div className="text-sub uppercase tracking-wider mb-1">Үлдсэн</div>
          <div className="text-[15px] font-semibold tabular-nums">
            {expected.daysLeft} өдөр
          </div>
        </div>
      </div>

      {expected.currentPhase && (
        <div className="mt-3 text-[12px] text-sub border-t border-bd pt-3 flex items-center gap-2">
          <span className="text-white/70">📍 Өнөөдөр байх ёстой фаз:</span>
          <span className="text-tx font-medium">
            {String(expected.currentPhase.ordinal + 1).padStart(2, "0")}. {expected.currentPhase.name}
          </span>
          <span className="text-sub">·</span>
          <span className="tabular-nums">{expected.currentPhase.phaseExpectedPct}%</span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-black px-4 py-3.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </div>
      <div
        className="text-[16px] font-semibold tracking-tight tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function KpiSummary({
  gradeLevel,
  areaBand,
  expectedHours,
  actualHours,
  workHours,
  clientWaitHours,
  revisionHours,
  scores,
  snapshot,
}: {
  gradeLevel: { id: string; key: string; label: string } | null;
  areaBand: { id: string; label: string; totalPriceMnt: unknown } | null;
  expectedHours: number;
  actualHours: number;
  workHours: number;
  clientWaitHours: number;
  revisionHours: number;
  scores: { label: string; score: number }[];
  snapshot: {
    efficiency: number;
    qualityRating: number | null;
    clientSatisfaction: number | null;
    onTime: boolean;
    expectedGradeKey: string | null;
    actualGradeKey: string | null;
    actualGradeLabel: string | null;
    closedAt: string;
  } | null;
}) {
  // Efficiency convention (matches server-side snapshot): normHours / actualHours.
  // efficiency >= 1 → on/under budget (good). When snapshot exists, prefer the persisted value.
  const efficiency =
    snapshot?.efficiency ??
    (expectedHours > 0 && actualHours > 0 ? expectedHours / actualHours : 0);
  const efficiencyPct = efficiency > 0 ? Math.round(efficiency * 100) : 0;
  const onBudget = efficiency >= 1.0;

  const gradeBg =
    gradeLevel?.key === "APLUS"
      ? "linear-gradient(135deg,#6AA6FF,#8B5CF6)"
      : gradeLevel?.key === "A"
      ? "#6AA6FF"
      : gradeLevel?.key === "B"
      ? "#F59E0B"
      : gradeLevel?.key === "C"
      ? "#6B7390"
      : "transparent";

  return (
    <div className="mb-6 panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-sub font-medium">
          KPI үнэлгээ {snapshot && <span className="text-tx ml-2">· Хаалт хийгдсэн</span>}
        </div>
        <div className="flex items-center gap-2">
          {gradeLevel && (
            <div className="text-[11px] text-sub">Хүлээгдсэн:</div>
          )}
          {gradeLevel && (
            <div
              className="text-[14px] font-bold px-2.5 py-0.5 rounded text-white"
              style={{ background: gradeBg }}
            >
              {gradeLevel.label}
            </div>
          )}
          {snapshot?.actualGradeLabel && (
            <>
              <span className="text-sub text-[12px]">→</span>
              <div className="text-[11px] text-sub">Бодит:</div>
              <div
                className="text-[14px] font-bold px-2.5 py-0.5 rounded text-white"
                style={{
                  background:
                    snapshot.actualGradeKey === "APLUS"
                      ? "linear-gradient(135deg,#6AA6FF,#8B5CF6)"
                      : snapshot.actualGradeKey === "A"
                      ? "#6AA6FF"
                      : snapshot.actualGradeKey === "B"
                      ? "#F59E0B"
                      : "#6B7390",
                }}
              >
                {snapshot.actualGradeLabel}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiTile label="KPI муж" value={areaBand?.label ?? "—"} />
        <KpiTile label="Норм цаг" value={`${expectedHours} ц`} />
        <KpiTile label="Бодит цаг" value={`${actualHours.toFixed(1)} ц`} />
        <KpiTile
          label="Биелэлт"
          value={efficiency > 0 ? `${efficiencyPct}%` : "—"}
          accent={
            efficiency === 0
              ? undefined
              : onBudget
              ? "#22C55E"
              : efficiency >= 0.85
              ? "#F59E0B"
              : "#EF4444"
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-[11px]">
        <KpiPill label="Ажилласан" value={workHours} color="#22C55E" />
        <KpiPill label="Захиалагч хүлээсэн" value={clientWaitHours} color="#6AA6FF" />
        <KpiPill label="Засвар" value={revisionHours} color="#F59E0B" />
      </div>
      {snapshot && (
        <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-bd">
          <RatingTile
            label="Гүйцэтгэлийн чанар"
            rating={snapshot.qualityRating}
            color="#FBBF24"
          />
          <RatingTile
            label="Захиалагч сэтгэл"
            rating={snapshot.clientSatisfaction}
            color="#22D3EE"
          />
          <div className="border border-bd rounded-md px-3 py-2.5 bg-white/[0.02]">
            <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">
              Хугацааны биелэлт
            </div>
            <div
              className="text-[16px] font-semibold tabular-nums"
              style={{ color: snapshot.onTime ? "#22C55E" : "#EF4444" }}
            >
              {snapshot.onTime ? "✓ Цаг тухайд" : "⚠ Хоцорсон"}
            </div>
          </div>
        </div>
      )}

      {scores.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[12px] text-sub hover:text-tx">
            7 шалгуурын оноо
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {scores.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <div className="text-sub w-5">{i + 1}.</div>
                <div className="flex-1 truncate">{s.label}</div>
                <div className="tabular-nums font-semibold text-brand">{s.score}/10</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function RatingTile({
  label,
  rating,
  color,
}: {
  label: string;
  rating: number | null;
  color: string;
}) {
  return (
    <div className="border border-bd rounded-md px-3 py-2.5 bg-white/[0.02]">
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        {rating != null ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="text-[14px]"
                style={{ color: i <= rating ? color : "#2A3145" }}
              >
                ★
              </span>
            ))}
            <span
              className="ml-1 text-[12px] font-semibold tabular-nums"
              style={{ color }}
            >
              {rating}/5
            </span>
          </>
        ) : (
          <span className="text-sub text-[13px]">—</span>
        )}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="border border-bd rounded-md px-3 py-2.5 bg-white/[0.02]">
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">
        {label}
      </div>
      <div
        className="text-[16px] font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function KpiPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-md border"
      style={{ borderColor: `${color}40`, background: `${color}10` }}
    >
      <span className="text-sub">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {value.toFixed(1)} ц
      </span>
    </div>
  );
}
