"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

type Item = { href: string; label: string; icon: string; roles?: Role[] };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Хяналт", icon: "▦" },
  { href: "/employees", label: "Ажилтан", icon: "◉", roles: ["ADMIN", "PM"] },
  // Future modules (disabled placeholders):
  // { href: "/projects", label: "Төсөл", icon: "◇" },
  // { href: "/clients", label: "Захиалагч", icon: "○" },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="w-[56px] bg-surf border-r border-bd flex flex-col items-center py-3 flex-shrink-0">
      <Link
        href="/dashboard"
        className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center font-extrabold text-white text-[11px] mb-5"
      >
        S
      </Link>
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-1">
        {visible.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`w-full h-11 rounded-md flex flex-col items-center justify-center gap-0.5 border transition ${
                active
                  ? "bg-blue/10 border-blue/30 text-blue"
                  : "border-transparent text-sub/50 hover:text-tx hover:border-bd"
              }`}
              title={it.label}
            >
              <span className="text-[13px] leading-none">{it.icon}</span>
              <span className="text-[7px] font-bold tracking-wider uppercase">
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
