import Link from "next/link";

const TABS = [
  { href: "/admin/kpi/team",       label: "Багийн KPI" },
  { href: "/admin/kpi/reports",    label: "Тайлан" },
  { href: "/admin/kpi/timeline",   label: "Хугацааны норматив" },
  { href: "/admin/kpi/grading",    label: "Зэрэглэлийн матриц" },
  { href: "/admin/kpi/experience", label: "Туршлагын муж" },
];

export default function KpiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
          KPI аргачлал
        </h1>
        <p className="text-sub text-[12px] mt-1">
          Төслийн норматив хугацаа, зэрэглэл, дизайнерийн туршлагын тааруулга
        </p>
      </div>
      <div className="flex gap-1 border-b border-bd mb-6">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-[13px] text-sub hover:text-tx border-b-2 border-transparent hover:border-brand/40 transition -mb-px"
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
