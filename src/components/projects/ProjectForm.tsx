"use client";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Select from "@/components/Select";
import PriorityPicker from "@/components/PriorityPicker";
import EmployeeMultiPicker, { type EmpOption } from "@/components/EmployeeMultiPicker";
import { PROJECT_TYPE_LABEL, PURPOSE_OPTIONS } from "@/lib/labels";
import {
  HOURS_PER_DAY,
  WD_SHORT,
  fmtDate,
  fmtMoney,
  isWeekend,
  dateKey,
} from "@/lib/format";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from "@/app/(app)/admin/projects/actions";
import type { ProjectType } from "@prisma/client";

type PhaseT = { ordinal: number; name: string; hours: number };

function calcEndDateClient(
  startStr: string,
  totalHours: number,
  holidaySet: Set<string>,
): { end: Date; workDays: number } | null {
  if (!startStr || totalHours <= 0) return null;
  const start = new Date(startStr);
  if (isNaN(+start)) return null;
  start.setHours(0, 0, 0, 0);
  const needed = Math.ceil(totalHours / HOURS_PER_DAY);
  const cursor = new Date(start);
  let work = 0;
  const isWork = (d: Date) => !isWeekend(d) && !holidaySet.has(dateKey(d));
  if (isWork(cursor)) work = 1;
  while (work < needed) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWork(cursor)) work++;
    if (work > 5000) break;
  }
  return { end: cursor, workDays: needed };
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Хадгалж байна…" : label}
    </button>
  );
}

export type ProjectFormInitial = {
  id?: string;
  type: ProjectType;
  code: string;
  name?: string;
  purpose?: string | null;
  clientName?: string;
  location?: string | null;
  priority?: number;
  areaM2?: number | null;
  contractValue?: string | null;
  startDate?: string;
  endDate?: string;
  notes?: string | null;
  phases: PhaseT[];
  assigneeIds?: string[];
  leadId?: string | null;
};

export default function ProjectForm({
  mode,
  initial,
  nextCodes,
  templates,
  employees,
  holidayList,
}: {
  mode: "create" | "edit";
  initial: ProjectFormInitial;
  nextCodes?: Record<ProjectType, string>;
  templates: Record<ProjectType, PhaseT[]>;
  employees: EmpOption[];
  holidayList: string[];
}) {
  const holidaySet = useMemo(() => new Set(holidayList), [holidayList]);
  const today = useMemo(() => fmtDate(new Date()), []);

  const [type, setType] = useState<ProjectType>(initial.type);
  const [code, setCode] = useState<string>(initial.code);
  const [phases, setPhases] = useState<PhaseT[]>(initial.phases);
  const [startDate, setStartDate] = useState<string>(initial.startDate || today);
  const [endDateOverride, setEndDateOverride] = useState<string>(initial.endDate || "");
  const [contractValue, setContractValue] = useState<string>(
    initial.contractValue ?? "",
  );

  const action =
    mode === "edit" && initial.id
      ? updateProjectAction.bind(null, initial.id)
      : createProjectAction;

  const [state, formAction] = useActionState<ProjectFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  function changeType(t: ProjectType) {
    if (t === type) return;
    if (
      mode === "edit" &&
      !confirm(
        "Төрөл өөрчилбөл фазын жагсаалт солигдоно. Одоогийн progress хадгалагдахгүй. Үргэлжлүүлэх үү?",
      )
    )
      return;
    setType(t);
    setPhases(templates[t]);
    if (mode === "create" && nextCodes) setCode(nextCodes[t]);
  }

  function setPhaseHours(ord: number, h: number) {
    setPhases((arr) =>
      arr.map((p) => (p.ordinal === ord ? { ...p, hours: Math.max(0, h) } : p)),
    );
  }

  const totalHours = phases.reduce((s, p) => s + p.hours, 0);
  const calc = calcEndDateClient(startDate, totalHours, holidaySet);
  const autoEnd = calc ? fmtDate(calc.end) : "";
  const effectiveEnd = endDateOverride || autoEnd;
  const workDays = calc?.workDays ?? 0;
  const contractNum = parseFloat(contractValue.replace(/[^\d.]/g, "")) || 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="type" value={type} />

      {/* Type chooser */}
      <div className="grid grid-cols-2 gap-3">
        {(["DESIGN", "BUILD"] as ProjectType[]).map((t) => {
          const sel = t === type;
          return (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={`text-left p-5 rounded-lg border transition ${
                sel
                  ? "border-white/55 bg-white/[0.04]"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="text-[24px] mb-1.5">{t === "DESIGN" ? "🎨" : "🔨"}</div>
              <div className={`text-[15px] font-semibold ${sel ? "text-white" : "text-white/70"}`}>
                {PROJECT_TYPE_LABEL[t]}
              </div>
              <div className="text-[12px] text-white/45 mt-0.5">
                {t === "DESIGN"
                  ? `${templates.DESIGN.length} шатны дизайн · Оффис, апартмент, ресторан...`
                  : `${templates.BUILD.length} шатны засал · Гэрээ, хана, шал, таз...`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Section 01: Basic */}
      <Section title="01 — Үндсэн мэдээлэл">
        <Row>
          <Field label="Дотоод код" hint={mode === "create" ? "auto" : ""}>
            <div className="relative">
              <input
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input pr-28 font-mono"
              />
              {mode === "create" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-green-400/80">
                  ✓ Давхцахгүй
                </div>
              )}
            </div>
          </Field>
          <Field label="Зориулалт">
            <Select
              name="purpose"
              defaultValue={initial.purpose ?? ""}
              options={[
                { value: "", label: "—" },
                ...PURPOSE_OPTIONS.map((p) => ({ value: p, label: p })),
              ]}
            />
          </Field>
        </Row>
        <Field label="Объектын нэр" required error={fe.name}>
          <input
            name="name"
            defaultValue={initial.name ?? ""}
            placeholder="Жш: Sky Business Center — 4-р давхар"
            className="input"
            required
          />
        </Field>
        <Row>
          <Field label="Захиалагч" required error={fe.clientName}>
            <input
              name="clientName"
              defaultValue={initial.clientName ?? ""}
              placeholder="Жш: Sky Properties"
              className="input"
              required
            />
          </Field>
          <Field label="Байршил">
            <input
              name="location"
              defaultValue={initial.location ?? ""}
              placeholder="Жш: Хан-Уул, Зайсан"
              className="input"
            />
          </Field>
        </Row>
      </Section>

      {/* Section 02: Priority */}
      <Section title="02 — Чухлын эрэмбэ" hint="1 = хэвийн · 10 = яаралтай">
        <PriorityPicker name="priority" defaultValue={initial.priority ?? 5} />
      </Section>

      {/* Section 03: Date & area */}
      <Section title="03 — Талбай & огноо">
        <Row>
          <Field label="Эхлэх огноо" required>
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input [color-scheme:dark]"
              required
            />
            <div className="text-[11px] text-white/45 mt-1">
              {startDate && WD_SHORT[new Date(startDate).getDay()]} · ажлын өдөр
            </div>
          </Field>
          <Field label="Дуусах огноо" hint="auto">
            <input
              name="endDate"
              type="date"
              value={effectiveEnd}
              onChange={(e) => setEndDateOverride(e.target.value)}
              className="input [color-scheme:dark] text-white/80"
            />
            <div className="text-[11px] text-white/45 mt-1">
              {effectiveEnd &&
                `${WD_SHORT[new Date(effectiveEnd).getDay()]} · ${workDays} ажлын өдөр`}
            </div>
          </Field>
        </Row>
        <Row>
          <Field label="Нийт талбай (м²)">
            <div className="relative">
              <input
                name="areaM2"
                type="number"
                min="0"
                step="0.1"
                defaultValue={initial.areaM2 ?? ""}
                placeholder="380"
                className="input pr-8"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/40">
                м²
              </div>
            </div>
          </Field>
          <Field label="Гэрээний үнэ (₮)">
            <div className="relative">
              <input
                name="contractValue"
                type="number"
                min="0"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                placeholder="95000000"
                className="input pr-8"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/40">
                ₮
              </div>
            </div>
          </Field>
        </Row>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Pill label="Нийт ажлын өдөр" value={`${workDays} өдөр`} />
          <Pill label="Нийт цаг" value={`${totalHours} цаг`} />
          <Pill label="Гэрээний үнэ" value={contractNum > 0 ? fmtMoney(contractNum) : "—"} />
        </div>
      </Section>

      {/* Section 04: Phase hours */}
      <Section
        title={`04 — ${phases.length} шатны тооцоолсон цаг`}
        hint="оруулмагц дуусах огноо автомат"
      >
        <div className="grid grid-cols-2 gap-3">
          {phases.map((p) => (
            <div
              key={p.ordinal}
              className="flex items-center gap-3 border border-white/10 rounded-md p-3"
            >
              <div className="text-[10px] font-mono text-white/40 w-8">
                {String(p.ordinal).padStart(2, "0")}
              </div>
              <div className="flex-1 text-[13px] text-white/85">{p.name}</div>
              <input
                type="number"
                min="0"
                step="1"
                name={`phaseHours[${p.ordinal}]`}
                value={p.hours}
                onChange={(e) => setPhaseHours(p.ordinal, parseInt(e.target.value, 10) || 0)}
                className="w-20 h-9 bg-transparent border border-white/15 rounded px-2 text-[13px] tabular-nums text-right focus:outline-none focus:border-white/45 [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-white/40">ц</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div className="text-[12px] text-white/55">Нийт тооцолсон цаг</div>
          <div className="text-[14px] font-semibold tabular-nums">
            {totalHours} цаг · {workDays} ажлын өдөр
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-white/55 border border-white/10 rounded-md px-3 py-2">
          🇲🇳 Монгол улсын ажлын хуанли · Да–Ба · 09:00–18:00 · 8ц/өдөр · Баяр амралтын өдрүүд хасагдсан
        </div>
      </Section>

      {/* Section 05: Team */}
      <Section title="05 — Хариуцагч" hint="1–5 хүн сонгох боломжтой">
        <EmployeeMultiPicker
          name="assigneeIds"
          leadName="leadId"
          options={employees}
          defaultIds={initial.assigneeIds ?? []}
          defaultLeadId={initial.leadId ?? null}
          max={5}
        />
      </Section>

      {state?.error && (
        <div className="text-[12px] text-white/80 border border-white/25 rounded-md px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-4 bg-bg/80 backdrop-blur-sm py-3 -mx-2 px-2 rounded">
        <Link
          href={mode === "edit" && initial.id ? `/admin/projects/${initial.id}` : "/admin/projects"}
          className="btn-ghost"
        >
          Цуцлах
        </Link>
        <SubmitBtn label={mode === "create" ? "Төсөл үүсгэх" : "Хадгалах"} />
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-white/10">
        <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
          {title}
        </div>
        {hint && <div className="text-[10px] text-white/30">{hint}</div>}
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
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label">
          {label} {required && <span className="text-white/70">*</span>}
        </label>
        {hint && (
          <span className="text-[10px] uppercase tracking-wider text-white/30">{hint}</span>
        )}
      </div>
      {children}
      {error && <div className="text-[11px] text-white/70 mt-1">{error}</div>}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
