"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

type Item = { href: string; label: string; icon: React.ReactNode; roles?: Role[] };
type Group = { title?: string; roles?: Role[]; items: Item[] };

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icons = {
  Dashboard: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Folder: (
    <svg {...ICON_PROPS}>
      <path d="M4 6a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </svg>
  ),
  Kanban: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Users: (
    <svg {...ICON_PROPS}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Calendar: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Monitor: (
    <svg {...ICON_PROPS}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Gauge: (
    <svg {...ICON_PROPS}>
      <path d="M12 14l4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  ),
  Clock: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const GROUPS: Group[] = [
  {
    items: [
      { href: "/dashboard", label: "Хяналт", icon: Icons.Dashboard },
      { href: "/projects", label: "Миний төсөл", icon: Icons.Folder },
      { href: "/time", label: "Цагийн бүртгэл", icon: Icons.Clock },
      { href: "/me/kpi", label: "Миний KPI", icon: Icons.Gauge },
    ],
  },
  {
    title: "Удирдлага",
    roles: ["ADMIN", "PM"],
    items: [
      { href: "/admin/projects", label: "Төсөл", icon: Icons.Kanban },
      { href: "/admin/employees", label: "Ажилтан", icon: Icons.Users },
      { href: "/admin/holidays", label: "Амралтын өдөр", icon: Icons.Calendar, roles: ["ADMIN"] },
      { href: "/admin/display", label: "Дэлгэц", icon: Icons.Monitor, roles: ["ADMIN"] },
    ],
  },
  {
    title: "KPI аргачлал",
    roles: ["ADMIN", "PM"],
    items: [
      { href: "/admin/kpi/team",       label: "Багийн KPI",          icon: Icons.Users },
      { href: "/admin/kpi/reports",    label: "Тайлан",              icon: Icons.Gauge },
      { href: "/admin/kpi/timeline",   label: "Хугацааны норматив", icon: Icons.Gauge, roles: ["ADMIN"] },
      { href: "/admin/kpi/grading",    label: "Зэрэглэл",           icon: Icons.Gauge, roles: ["ADMIN"] },
      { href: "/admin/kpi/experience", label: "Туршлагын муж",       icon: Icons.Gauge, roles: ["ADMIN"] },
    ],
  },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-black/80 backdrop-blur-xl border-r border-bd flex flex-col flex-shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-bd">
        <Link href="/dashboard" className="flex items-center justify-center w-full" aria-label="SAYSANAA">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="SAYSANAA"
            className="logo-invert h-7 w-auto select-none pointer-events-none"
            draggable={false}
          />
        </Link>
      </div>
      <nav className="flex-1 py-3 space-y-4">
        {GROUPS.filter((g) => !g.roles || g.roles.includes(role)).map((g, i) => (
          <div key={i}>
            {g.title && (
              <div className="px-5 mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                {g.title}
              </div>
            )}
            {g.items
              .filter((it) => !it.roles || it.roles.includes(role))
              .map((it) => {
                const active =
                  pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`relative flex items-center gap-3 px-5 py-2 text-[13px] transition border-l-2 ${
                      active
                        ? "text-white border-brand2 bg-gradient-to-r from-brand/15 via-brand2/10 to-transparent shadow-[inset_0_0_24px_rgba(99,102,241,0.10)]"
                        : "text-white/55 border-transparent hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 transition ${
                        active ? "text-brand2 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" : "text-white/40"
                      }`}
                    >
                      {it.icon}
                    </span>
                    <span>{it.label}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
