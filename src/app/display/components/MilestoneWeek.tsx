import Panel from "./Panel";

type Milestone = {
  id: string;
  projectCode: string;
  projectName: string;
  phaseName: string;
  date: string; // yyyy-mm-dd
};

const WD = ["Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям", "Ням"];

function getWeekDays() {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MilestoneWeek({ milestones }: { milestones?: Milestone[] }) {
  const days = getWeekDays();
  const todayKey = dateKey(new Date());

  const byDay = new Map<string, Milestone[]>();
  for (const m of milestones ?? []) {
    if (!byDay.has(m.date)) byDay.set(m.date, []);
    byDay.get(m.date)!.push(m);
  }

  return (
    <Panel
      title="Энэ долоо хоногийн milestone"
      hint={milestones ? `${milestones.length}` : ""}
    >
      <div className="h-full grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const k = dateKey(d);
          const isToday = k === todayKey;
          const items = byDay.get(k) ?? [];
          return (
            <div
              key={i}
              className={`rounded-md border flex flex-col p-2 overflow-hidden ${
                isToday ? "border-white/35 bg-white/[0.03]" : "border-white/8"
              }`}
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <div
                  className={`text-[10px] uppercase tracking-wider ${
                    isToday ? "text-white" : "text-white/40"
                  }`}
                >
                  {WD[i]}
                </div>
                <div
                  className={`text-[14px] font-semibold tabular-nums ${
                    isToday ? "text-white" : "text-white/60"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
              <div className="flex-1 space-y-1 overflow-hidden">
                {items.length === 0 ? (
                  <div className="text-[10px] text-white/20 flex items-center justify-center h-full">
                    —
                  </div>
                ) : (
                  items.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 truncate"
                      title={`${m.projectCode} · ${m.phaseName}`}
                    >
                      <span className="text-white/55 font-mono">{m.projectCode}</span>{" "}
                      <span className="text-white/80">{m.phaseName}</span>
                    </div>
                  ))
                )}
                {items.length > 3 && (
                  <div className="text-[9px] text-white/40">+{items.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
