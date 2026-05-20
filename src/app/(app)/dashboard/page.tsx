import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export default async function Dashboard() {
  const s = await readSession();
  const [employees, active] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { active: true } }),
  ]);
  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-1">
        Module · Overview
      </div>
      <h1 className="text-[22px] font-extrabold tracking-tight mb-6">Хяналтын самбар</h1>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <Stat label="Нийт ажилтан" value={employees} accent="blue" />
        <Stat label="Идэвхтэй ажилтан" value={active} accent="green" />
        <Stat label="Идэвхгүй" value={employees - active} accent="amber" />
        <Stat label="Идэвхтэй төсөл" value={0} accent="blue" hint="Удахгүй..." />
      </div>

      <div className="card p-6">
        <div className="text-[11px] font-semibold text-sub uppercase tracking-wider mb-2">
          Тавтай морил, {s?.email}
        </div>
        <h2 className="text-[16px] font-bold mb-2">Эхний үе шат: Нэвтрэлт + Ажилтны бүртгэл</h2>
        <p className="text-sub text-[13px] leading-relaxed max-w-[680px]">
          Энэхүү модулыг суурь болгон цаашид{" "}
          <span className="text-tx">Төсөл / FF&E / Худалдан авалт / Санхүү / Захиалагчийн портал</span>{" "}
          модулиуд нэмэгдэх болно. Эхний хувилбарт нэвтрэлт (2FA), ажилтны бүртгэл, эрхийн систем
          (RBAC), audit log хэрэгжсэн.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent: "blue" | "green" | "amber" | "red";
  hint?: string;
}) {
  const colors = {
    blue: "text-blue after:bg-blue",
    green: "text-green after:bg-green",
    amber: "text-amber after:bg-amber",
    red: "text-red after:bg-red",
  }[accent];
  return (
    <div className={`relative card p-4 overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] ${colors}`}>
      <div className="text-[9px] font-semibold uppercase tracking-widest text-sub mb-2">
        {label}
      </div>
      <div className={`text-[26px] font-extrabold tracking-tight leading-none ${colors}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-sub mt-1.5">{hint}</div>}
    </div>
  );
}
