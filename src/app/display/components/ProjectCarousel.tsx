"use client";
import { memo, useEffect, useState } from "react";
import PhaseDot from "./PhaseDot";

type Phase = { ordinal: number; name: string; progressPct: number };

export type CarouselProject = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  type: "DESIGN" | "BUILD";
  typeLabel: string;
  priority: number;
  progressPct: number;
  currentPhaseName: string;
  currentPhaseOrdinal: number | null;
  totalPhases: number;
  completedPhases: number;
  daysLeft: number | null;
  phases: Phase[];
  team: { initials: string; photoUrl: string | null }[];
  teamExtra: number;
};

const PAGE_SIZE = 3;
const ROTATE_MS = 8_000;

function pAcc(p: number) {
  if (p >= 9) return "#E07474";
  if (p >= 7) return "#E5B85C";
  if (p >= 4) return "#8B95FF";
  return "#8B919C";
}

function progressColor(p: number) {
  if (p >= 100) return "#3FCF8E";
  if (p >= 50) return "#8B95FF";
  return "#E5B85C";
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function ProjectCarousel({
  projects,
}: {
  projects?: CarouselProject[];
}) {
  const pages = projects ? chunk(projects, PAGE_SIZE) : [];
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pages.length <= 1) return;
    const iv = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, ROTATE_MS);
    return () => clearInterval(iv);
  }, [pages.length]);

  useEffect(() => {
    if (page >= pages.length) setPage(0);
  }, [page, pages.length]);

  if (!projects) {
    return (
      <div className="h-full border border-white/10 rounded-lg flex items-center justify-center bg-white/[0.015]">
        <div className="text-white/30 text-[13px]">Уншиж байна…</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="h-full border border-white/10 rounded-lg flex flex-col items-center justify-center bg-white/[0.015]">
        <div className="text-[14px] text-white/55">Идэвхтэй төсөл алга</div>
        <div className="text-[12px] text-white/30 mt-1">
          Шинэ төсөл нэмэхэд энд харагдана
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          Идэвхтэй төслүүд · хяналт
        </div>
        <div className="text-[10px] text-white/30">
          {projects.length} төсөл · {pages.length} цонх
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-[1200ms] ease-in-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((group, gi) => (
            <div
              key={gi}
              className="w-full flex-shrink-0 grid grid-cols-3 gap-4 h-full"
            >
              {group.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
              {/* fill missing slots so layout stable */}
              {Array.from({ length: PAGE_SIZE - group.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="border border-dashed border-white/[0.06] rounded-lg"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`h-1 rounded-full transition-all ${
                i === page ? "w-8 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ProjectCard = memo(function ProjectCardInner({ p }: { p: CarouselProject }) {
  const accent = pAcc(p.priority);
  const ringColor = progressColor(p.progressPct);

  return (
    <div className="border border-white/10 rounded-lg p-4 flex flex-col bg-white/[0.015]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums"
              style={{ background: accent, color: "#0B0D10" }}
            >
              P{p.priority}
            </span>
            <span className="text-[11px] font-mono text-white/55">{p.code}</span>
            <span className="text-[10px] text-white/40 ml-auto">{p.typeLabel}</span>
          </div>
          <h3 className="text-[14px] font-semibold leading-tight line-clamp-1" title={p.name}>
            {p.name}
          </h3>
          <div className="text-[11px] text-white/45 truncate">{p.clientName}</div>
        </div>
        <OverallRing value={p.progressPct} color={ringColor} />
      </div>

      {/* Current phase */}
      <div className="text-[11px] text-white/55 mb-3 border-l-2 border-white/15 pl-2">
        <span className="text-white/35 font-mono mr-1">
          {p.currentPhaseOrdinal !== null
            ? String(p.currentPhaseOrdinal).padStart(2, "0")
            : "✓"}
        </span>
        {p.currentPhaseName}
      </div>

      {/* Phase dots grid */}
      <div className="flex-1 mb-3">
        <div
          className={`grid gap-2 justify-items-center ${
            p.phases.length > 8 ? "grid-cols-7" : "grid-cols-4"
          }`}
        >
          {p.phases.map((ph) => (
            <PhaseDot
              key={ph.ordinal}
              ordinal={ph.ordinal}
              name={ph.name}
              progressPct={ph.progressPct}
              size={p.phases.length > 8 ? 38 : 48}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/8">
        <div className="flex -space-x-1.5">
          {p.team.map((t, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-bg overflow-hidden bg-white/5 flex items-center justify-center text-[10px] font-medium"
            >
              {t.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                t.initials
              )}
            </div>
          ))}
          {p.teamExtra > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-bg bg-white/10 flex items-center justify-center text-[9px] text-white/60">
              +{p.teamExtra}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/35 uppercase tracking-wider">
            Үлдсэн
          </div>
          <div className="text-[14px] font-semibold tabular-nums">
            {p.daysLeft !== null ? `${p.daysLeft} өдөр` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
});

const OverallRing = memo(function OverallRingInner({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          fill="none"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-[14px] font-semibold tabular-nums leading-none"
          style={{ color }}
        >
          {value}
          <span className="text-[9px] text-white/45 ml-0.5">%</span>
        </div>
      </div>
    </div>
  );
});
