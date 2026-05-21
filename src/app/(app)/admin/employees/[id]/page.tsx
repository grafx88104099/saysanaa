import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { ROLE_LABEL, SKILL_LABEL, languageLabel } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import ActiveToggle from "./ActiveToggle";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await readSession();
  if (!me) redirect("/login");
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!emp) notFound();
  const canManage = me.role === "ADMIN" || me.role === "PM";
  const isAdmin = me.role === "ADMIN";

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-white/45 mb-5">
        <Link href="/admin/employees" className="hover:text-white transition">Ажилтан</Link>
        <span>/</span>
        <span className="text-white/80">{emp.lastName} {emp.firstName}</span>
      </div>

      <div className="flex items-start gap-6 pb-8 border-b border-white/10 mb-8">
        {emp.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={emp.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-white/15" />
        ) : (
          <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center text-[22px] font-medium text-white/70">
            {(emp.lastName[0] || "") + (emp.firstName[0] || "")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {emp.lastName} {emp.firstName}
            </h1>
            {emp.active ? (
              <span className="chip-on">Идэвхтэй</span>
            ) : (
              <span className="chip-off">Идэвхгүй</span>
            )}
          </div>
          <div className="text-white/55 text-[13px]">
            {ROLE_LABEL[emp.role]}{emp.profession ? ` · ${emp.profession}` : ""}
          </div>
        </div>
        {canManage && (
          <Link href={`/admin/employees/${emp.id}/edit`} className="btn-ghost">
            Засах
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-x-8 gap-y-6 mb-10">
        <Info label="И-мэйл" value={emp.user.email} />
        <Info label="Утас" value={emp.phone || "—"} />
        <Info label="Регистр" value={emp.registerNumber || "—"} />
        <Info label="AutoCAD" value={SKILL_LABEL[emp.autocadLevel]} />
        <Info label="SketchUp" value={SKILL_LABEL[emp.sketchupLevel]} />
        <Info
          label="Хэл"
          value={emp.languages.length ? emp.languages.map(languageLabel).join(", ") : "—"}
        />
        <Info label="2FA" value={emp.user.twoFactorEnabled ? "Идэвхжсэн" : "Тохируулаагүй"} />
        <Info
          label="Сүүлд нэвтэрсэн"
          value={fmtDateTime(emp.user.lastLoginAt)}
        />
        <Info
          label="Бүртгэгдсэн"
          value={fmtDate(emp.createdAt)}
        />
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-2">
              Статус
            </div>
            <p className="text-white/55 text-[12px] mb-3 leading-relaxed">
              Идэвхгүй болгосон ажилтан нэвтрэх боломжгүй болно. Бүртгэл хадгалагдсаар үлдэнэ.
            </p>
            <ActiveToggle id={emp.id} active={emp.active} />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-2">
              Нууц үг шинэчлэх
            </div>
            <p className="text-white/55 text-[12px] mb-3 leading-relaxed">
              2FA автоматаар цуцлагдаж, ажилтан дахин тохируулна.
            </p>
            <ResetPasswordForm id={emp.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </div>
      <div className="text-[13px] text-white/90">{value}</div>
    </div>
  );
}
