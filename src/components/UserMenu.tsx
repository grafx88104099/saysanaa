"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/2fa/actions";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Админ",
  PM: "Төслийн менежер",
  DESIGNER: "Дизайнер",
  ACCOUNTANT: "Нягтлан",
  CLIENT: "Захиалагч",
};

export default function UserMenu({
  me,
}: {
  me: {
    email: string;
    role: Role;
    fullName: string;
    initials: string;
    photoUrl?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 group"
      >
        <div className="text-right hidden sm:block">
          <div className="text-[12px] font-medium leading-tight">
            {me.fullName || me.email}
          </div>
          <div className="text-[10px] text-white/45 leading-tight mt-0.5">
            {ROLE_LABEL[me.role]}
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center text-[11px] font-medium transition
                      ${open ? "border-white/45" : "border-white/20 group-hover:border-white/35"}`}
        >
          {me.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            me.initials.toUpperCase() || "?"
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 z-30 bg-bg border border-white/15 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.6)] py-1">
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="text-[12px] font-medium truncate">{me.fullName || me.email}</div>
            <div className="text-[11px] text-white/45 truncate">{me.email}</div>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[13px] text-white/80 hover:bg-white/[0.05] hover:text-white transition"
          >
            Миний профайл
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-[13px] text-white/80 hover:bg-white/[0.05] hover:text-white transition border-t border-white/10"
            >
              Гарах
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
