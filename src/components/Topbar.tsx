import { logoutAction } from "@/app/2fa/actions";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Админ",
  PM: "Төслийн менежер",
  DESIGNER: "Дизайнер",
  ACCOUNTANT: "Нягтлан",
  CLIENT: "Захиалагч",
};

export default function Topbar({
  me,
}: {
  me: { email: string; role: Role; fullName: string; initials: string };
}) {
  return (
    <header className="h-[52px] bg-surf border-b border-bd flex items-center justify-between px-5 flex-shrink-0">
      <div>
        <div className="text-[14px] font-bold tracking-tight">SayaSanaa OS</div>
        <div className="text-[10px] text-sub font-mono uppercase tracking-widest">
          Internal Operating System · v0.1
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[12px] font-semibold">{me.fullName || me.email}</div>
          <div className="text-[10px] text-sub">{ROLE_LABEL[me.role]}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue/15 border border-blue/30 flex items-center justify-center font-bold text-blue text-[12px]">
          {me.initials.toUpperCase() || "?"}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-ghost text-[11px] py-1.5 px-3">
            Гарах
          </button>
        </form>
      </div>
    </header>
  );
}
