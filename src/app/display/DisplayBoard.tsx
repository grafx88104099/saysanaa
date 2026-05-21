"use client";
import { useEffect, useState } from "react";
import Clock from "./components/Clock";
import KpiGrid from "./components/KpiGrid";
import ProjectCarousel, { type CarouselProject } from "./components/ProjectCarousel";
import MilestoneWeek from "./components/MilestoneWeek";
import ActivityFeed from "./components/ActivityFeed";
import TeamGrid from "./components/TeamGrid";

export type DisplayData = {
  ts: string;
  kpis: {
    employees: number;
    active: number;
    inactive: number;
    admins: number;
    activeProjects: number;
  };
  activity: { id: string; action: string; label: string; actor: string; at: string }[];
  team: { id: string; name: string; initials: string; role: string; photoUrl: string | null }[];
  projects: CarouselProject[];
  milestones: { id: string; projectCode: string; projectName: string; phaseName: string; date: string }[];
};

const REFRESH_MS = 30_000;

export default function DisplayBoard({ label }: { label: string }) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/display/data", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as DisplayData;
        if (!alive) return;
        setData(json);
        setLastSync(Date.now());
        setStale(false);
      } catch {
        if (alive) setStale(true);
      }
    }
    load();
    const iv = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const agoSec = lastSync ? Math.floor((Date.now() - lastSync) / 1000) : null;

  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-4 select-none">
      <header className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Wall display · {label}
          </div>
          <div className="text-[20px] font-semibold tracking-tight mt-0.5">
            SayaSanaa · Төслийн хяналт
          </div>
        </div>
        <Clock />
      </header>

      {/* TOP: Project carousel */}
      <section className="flex-[1.4] min-h-0">
        <ProjectCarousel projects={data?.projects} />
      </section>

      {/* MID: KPI + Milestone week */}
      <section className="flex-[0.9] min-h-0 grid grid-cols-12 gap-4">
        <div className="col-span-4">
          <KpiGrid kpis={data?.kpis} />
        </div>
        <div className="col-span-8">
          <MilestoneWeek milestones={data?.milestones} />
        </div>
      </section>

      {/* BOTTOM: Activity + Team */}
      <section className="flex-[0.85] min-h-0 grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <ActivityFeed items={data?.activity} />
        </div>
        <div className="col-span-5">
          <TeamGrid team={data?.team} />
        </div>
      </section>

      <footer className="flex items-center justify-between text-[11px] text-white/35 flex-shrink-0">
        <div>
          {data
            ? `${data.kpis.activeProjects} идэвхтэй төсөл · ${data.kpis.active}/${data.kpis.employees} ажилтан`
            : "Холболт хүлээж байна…"}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              stale ? "bg-white/30" : "bg-green-400"
            } ${stale ? "" : "animate-pulse"}`}
          />
          {stale
            ? "Холболт тасарсан"
            : agoSec === null
            ? "Синк хийж байна…"
            : `Шинэчлэгдсэн: ${agoSec}с өмнө`}
        </div>
      </footer>
    </div>
  );
}
