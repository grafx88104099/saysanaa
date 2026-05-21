import Panel from "./Panel";

type Kpis = {
  employees: number;
  active: number;
  inactive: number;
  admins: number;
  activeProjects: number;
};

export default function KpiGrid({ kpis }: { kpis?: Kpis }) {
  const cards = [
    { label: "Идэвхтэй төсөл", value: kpis?.activeProjects, accent: "#8B95FF" },
    { label: "Идэвхтэй ажилтан", value: kpis?.active, accent: "#3FCF8E" },
    { label: "Нийт ажилтан", value: kpis?.employees, accent: "#E5B85C" },
    { label: "Идэвхгүй", value: kpis?.inactive, accent: "#E07474" },
  ];
  return (
    <Panel title="Үндсэн KPI">
      <div className="h-full grid grid-cols-2 grid-rows-2 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-col justify-between">
            <div className="text-[11px] text-white/45 leading-tight">
              {c.label}
            </div>
            <div
              className="text-[64px] font-semibold tracking-tight leading-none tabular-nums"
              style={{ color: c.value === undefined ? "rgba(255,255,255,0.15)" : c.accent }}
            >
              {c.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
