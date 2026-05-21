import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, SKILL_LABEL } from "@/lib/labels";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import TwoFactorPanel from "./TwoFactorPanel";

export default async function ProfilePage() {
  const s = await readSession();
  if (!s) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    include: { employee: true },
  });
  if (!user?.employee) redirect("/login");
  const emp = user.employee;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-tight">Миний профайл</h1>
        <p className="text-white/45 text-[12px] mt-1">
          Өөрийн мэдээллээ удирдах, нууц үгээ солих
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-8 gap-y-5 pb-8 border-b border-white/10 mb-8">
        <Info label="И-мэйл" value={user.email} />
        <Info label="Эрх" value={ROLE_LABEL[emp.role]} />
        <Info label="Албан тушаал" value={emp.profession || "—"} />
        <Info label="Регистр" value={emp.registerNumber || "—"} />
        <Info label="AutoCAD" value={SKILL_LABEL[emp.autocadLevel]} />
        <Info label="SketchUp" value={SKILL_LABEL[emp.sketchupLevel]} />
      </div>

      <Section title="Үндсэн мэдээлэл">
        <ProfileForm
          initial={{
            firstName: emp.firstName,
            lastName: emp.lastName,
            phone: emp.phone,
            photoUrl: emp.photoUrl,
            languages: emp.languages,
          }}
        />
      </Section>

      <Section title="Нууц үг солих">
        <PasswordForm />
      </Section>

      <Section title="Хоёр шаттай баталгаажуулалт (2FA)" last>
        <TwoFactorPanel enabled={user.twoFactorEnabled} />
      </Section>
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

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "mb-4" : "mb-10 pb-10 border-b border-white/10"}>
      <h2 className="text-[14px] font-semibold tracking-tight mb-1">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
