"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { Role, SkillLevel } from "@prisma/client";
import {
  ROLE_LABEL,
  ROLES,
  SKILL_LABEL,
  SKILL_LEVELS,
  LANGUAGE_OPTIONS,
} from "@/lib/labels";
import type { FormState } from "@/app/(app)/employees/actions";

type Initial = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  registerNumber?: string | null;
  photoUrl?: string | null;
  role?: Role;
  profession?: string | null;
  autocadLevel?: SkillLevel;
  sketchupLevel?: SkillLevel;
  languages?: string[];
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Хадгалж байна…" : label}
    </button>
  );
}

export default function EmployeeForm({
  action,
  initial,
  mode,
  cancelHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Initial;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="text-[12px] text-red bg-red/10 border border-red/25 rounded-md px-3 py-2">
          {state.error}
        </div>
      )}

      <Section title="Үндсэн мэдээлэл">
        <Row>
          <Field label="Овог" error={fe.lastName} required>
            <input name="lastName" defaultValue={initial?.lastName ?? ""} className="input" required />
          </Field>
          <Field label="Нэр" error={fe.firstName} required>
            <input name="firstName" defaultValue={initial?.firstName ?? ""} className="input" required />
          </Field>
        </Row>
        <Row>
          <Field label="И-мэйл (нэвтрэх нэр)" error={fe.email} required>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              className="input"
              required
            />
          </Field>
          <Field label="Утас" error={fe.phone}>
            <input
              name="phone"
              defaultValue={initial?.phone ?? ""}
              placeholder="99112233"
              className="input"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Регистрийн дугаар" error={fe.registerNumber}>
            <input
              name="registerNumber"
              defaultValue={initial?.registerNumber ?? ""}
              placeholder="УБ12345678"
              className="input uppercase"
            />
          </Field>
          <Field label="Зургийн URL" error={fe.photoUrl}>
            <input
              name="photoUrl"
              defaultValue={initial?.photoUrl ?? ""}
              placeholder="https://..."
              className="input"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Эрх ба албан тушаал">
        <Row>
          <Field label="Системийн эрх (Role)" required>
            <select name="role" defaultValue={initial?.role ?? "DESIGNER"} className="input" required>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </Field>
          <Field label="Мэргэжил / Албан тушаал">
            <input
              name="profession"
              defaultValue={initial?.profession ?? ""}
              placeholder="Интерьер дизайнер"
              className="input"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Ур чадвар">
        <Row>
          <Field label="AutoCAD түвшин">
            <select name="autocadLevel" defaultValue={initial?.autocadLevel ?? "NONE"} className="input">
              {SKILL_LEVELS.map((s) => (
                <option key={s} value={s}>{SKILL_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="SketchUp түвшин">
            <select name="sketchupLevel" defaultValue={initial?.sketchupLevel ?? "NONE"} className="input">
              {SKILL_LEVELS.map((s) => (
                <option key={s} value={s}>{SKILL_LABEL[s]}</option>
              ))}
            </select>
          </Field>
        </Row>
        <Field label="Эзэмшсэн хэл">
          <div className="flex flex-wrap gap-2 pt-1">
            {LANGUAGE_OPTIONS.map((l) => {
              const checked = initial?.languages?.includes(l.code);
              return (
                <label
                  key={l.code}
                  className="flex items-center gap-2 px-3 py-1.5 border border-bd rounded-md text-[12px] cursor-pointer hover:border-blue/40 has-[:checked]:bg-blue/10 has-[:checked]:border-blue/40 has-[:checked]:text-blue"
                >
                  <input
                    type="checkbox"
                    name="languages"
                    value={l.code}
                    defaultChecked={checked}
                    className="accent-blue"
                  />
                  {l.label}
                </label>
              );
            })}
          </div>
        </Field>
      </Section>

      {mode === "create" && (
        <Section title="Анхны нэвтрэх нууц үг">
          <Field label="Түр нууц үг (8+ тэмдэгт)" required>
            <input
              name="tempPassword"
              type="text"
              minLength={8}
              required
              defaultValue=""
              className="input font-mono"
              placeholder="Saysanaa@2026"
            />
            <div className="text-[11px] text-sub mt-1.5">
              Ажилтан анх удаа нэвтрэхдээ энэ нууц үгийг ашиглаад, 2FA-аа тохируулна.
            </div>
          </Field>
        </Section>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Link href={cancelHref} className="btn-ghost">Цуцлах</Link>
        <Submit label={mode === "create" ? "Бүртгэх" : "Хадгалах"} />
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-sub mb-4 pb-2 border-b border-bd">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red">*</span>}
      </label>
      {children}
      {error && <div className="text-[11px] text-red mt-1">{error}</div>}
    </div>
  );
}
