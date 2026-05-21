"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

type Item = { href: string; label: string; roles?: Role[] };
type Group = { title?: string; roles?: Role[]; items: Item[] };

const GROUPS: Group[] = [
  {
    items: [
      { href: "/dashboard", label: "Хяналт" },
      { href: "/projects", label: "Миний төсөл" },
    ],
  },
  {
    title: "Удирдлага",
    roles: ["ADMIN", "PM"],
    items: [
      { href: "/admin/projects", label: "Төсөл" },
      { href: "/admin/employees", label: "Ажилтан" },
      { href: "/admin/holidays", label: "Амралтын өдөр", roles: ["ADMIN"] },
      { href: "/admin/display", label: "Дэлгэц", roles: ["ADMIN"] },
    ],
  },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-black border-r border-white/10 flex flex-col flex-shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-white/10">
        <Link href="/dashboard" className="text-[14px] font-semibold tracking-tight">
          SayaSanaa
        </Link>
      </div>
      <nav className="flex-1 py-3 space-y-4">
        {GROUPS.filter((g) => !g.roles || g.roles.includes(role)).map((g, i) => (
          <div key={i}>
            {g.title && (
              <div className="px-5 mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/30">
                {g.title}
              </div>
            )}
            {g.items.filter((it) => !it.roles || it.roles.includes(role)).map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`block px-5 py-2 text-[13px] transition border-l-2 ${
                    active
                      ? "text-white border-white bg-white/[0.03]"
                      : "text-white/55 border-transparent hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
