import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import {
  ROLE_LABEL,
  SKILL_LABEL,
  languageLabel,
  roleChip,
} from "@/lib/labels";
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
    <div className="max-w-[1000px] mx-auto">
      <div className="flex items-center gap-2 text-[11px] text-sub mb-3">
        <Link href="/employees" className="hover:text-tx">← Ажилтан</Link>
        <span>/</span>
        <span className="text-tx">{emp.lastName} {emp.firstName}</span>
      </div>

      <div className="card p-6 mb-4">
        <div className="flex items-start gap-5">
          {emp.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emp.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-bd" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue/15 border border-blue/30 flex items-center justify-center text-[22px] font-extrabold text-blue">
              {(emp.lastName[0] || "") + (emp.firstName[0] || "")}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[20px] font-extrabold tracking-tight">
                {emp.lastName} {emp.firstName}
              </h1>
              <span className={roleChip(emp.role)}>{ROLE_LABEL[emp.role]}</span>
              {emp.active ? (
                <span className="chip-green">Идэвхтэй</span>
              ) : (
                <span className="chip-gray">Идэвхгүй</span>
              )}
            </div>
            <div className="text-sub text-[13px]">{emp.profession || "Албан тушаал тодорхойгүй"}</div>
            <div className="grid grid-cols-3 gap-4 mt-5">
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
                value={emp.user.lastLoginAt ? new Date(emp.user.lastLoginAt).toLocaleString("mn-MN") : "—"}
              />
              <Info
                label="Бүртгэгдсэн"
                value={new Date(emp.createdAt).toLocaleDateString("mn-MN")}
              />
            </div>
          </div>
          {canManage && (
            <Link href={`/employees/${emp.id}/edit`} className="btn-ghost">
              Засах
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-sub mb-3">
              Статус
            </div>
            <p className="text-sub text-[12px] mb-3">
              Идэвхгүй болгосон ажилтан нэвтрэх боломжгүй болно. Бүртгэл нь хадгалагдсаар үлдэнэ.
            </p>
            <ActiveToggle id={emp.id} active={emp.active} />
          </div>
          <div className="card p-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-sub mb-3">
              Нууц үг шинэчлэх
            </div>
            <p className="text-sub text-[12px] mb-3">
              Шинэ түр нууц үг өгөх. 2FA-г автоматаар цуцалж, ажилтан дахин тохируулна.
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
      <div className="text-[10px] font-semibold uppercase tracking-widest text-sub mb-1">
        {label}
      </div>
      <div className="text-[13px]">{value}</div>
    </div>
  );
}
