"use client";
import { useRef, useState, useTransition } from "react";
import {
  saveOrganizationAction,
  uploadOrgLogoAction,
  removeOrgLogoAction,
} from "./actions";
import { renderMarkdown } from "@/lib/markdown";

type Initial = {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  logoLightUrl: string | null;
  email: string;
  phone: string;
  website: string;
  address: string;
  registerNumber: string;
  foundedYear: number | null;
  facebook: string;
  instagram: string;
  linkedin: string;
  updatedAt: string | null;
};

export default function OrganizationView({ initial }: { initial: Initial }) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [previewDesc, setPreviewDesc] = useState(false);

  const update = (patch: Partial<Initial>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("legalName", form.legalName);
    fd.set("tagline", form.tagline);
    fd.set("description", form.description);
    fd.set("email", form.email);
    fd.set("phone", form.phone);
    fd.set("website", form.website);
    fd.set("address", form.address);
    fd.set("registerNumber", form.registerNumber);
    fd.set("foundedYear", form.foundedYear ? String(form.foundedYear) : "");
    fd.set("facebook", form.facebook);
    fd.set("instagram", form.instagram);
    fd.set("linkedin", form.linkedin);
    start(async () => {
      const r = await saveOrganizationAction(undefined, fd);
      if (r?.ok) setMsg({ type: "ok", text: "Хадгалагдлаа" });
      else setMsg({ type: "err", text: r?.error ?? "Алдаа" });
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Байгууллагын танилцуулга
          </h1>
          <p className="text-sub text-[12px] mt-1">
            Брэнд / холбоо / бүртгэлийн мэдээлэл. PPT, sidebar, handbook-д ашиглагдана.
          </p>
          {form.updatedAt && (
            <p className="text-[11px] text-sub mt-0.5">
              Шинэчилсэн: {new Date(form.updatedAt).toLocaleString("mn-MN")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={`text-[12px] px-2.5 py-1 rounded ${
                msg.type === "ok"
                  ? "bg-success/15 text-successInk border border-success/30"
                  : "bg-danger/15 text-dangerInk border border-danger/30"
              }`}
            >
              {msg.text}
            </span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      {/* Brand identity */}
      <Section title="01 — Үндсэн мэдээлэл">
        <Row>
          <Field label="Нэр" required>
            <input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              required
              maxLength={120}
              className="input"
              placeholder="SAYSANAA"
            />
          </Field>
          <Field label="Хуулийн нэр">
            <input
              value={form.legalName}
              onChange={(e) => update({ legalName: e.target.value })}
              maxLength={200}
              className="input"
              placeholder='SAYSANAA "ХХК"'
            />
          </Field>
        </Row>
        <Field label="Слоган">
          <input
            value={form.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
            maxLength={160}
            className="input"
            placeholder="Interior design that lasts"
          />
        </Field>
        <Field
          label="Танилцуулга (Markdown)"
          hint={previewDesc ? "preview" : "edit"}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-sub">
              # гарчиг · **bold** · *italic* · [link](url) · - / 1. жагсаалт
            </span>
            <button
              type="button"
              onClick={() => setPreviewDesc((v) => !v)}
              className="text-[11px] text-sub hover:text-tx"
            >
              {previewDesc ? "Засварлах" : "Урьдчилан харах"}
            </button>
          </div>
          {previewDesc ? (
            <div
              className="prose-content text-[13px] leading-relaxed text-tx min-h-[120px] panel p-3"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(form.description || "_(хоосон)_"),
              }}
            />
          ) : (
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={6}
              maxLength={5000}
              className="input min-h-[140px] py-2 font-mono text-[13px] leading-relaxed"
              placeholder="Компанийн товч танилцуулга, мэдрэмж, гол ажлын чиглэлүүд..."
            />
          )}
        </Field>
      </Section>

      {/* Logo upload */}
      <Section title="02 — Лого">
        <div className="grid grid-cols-2 gap-4">
          <LogoSlot
            kind="logo"
            label="Үндсэн лого"
            hint="Dark дэвсгэр дээр харагдах (sidebar, PPT cover)"
            url={form.logoUrl}
            onChange={(url) => update({ logoUrl: url })}
            bgClass="bg-bg"
          />
          <LogoSlot
            kind="logo-light"
            label="Light хувилбар (заавал биш)"
            hint="Цагаан дэвсгэр дээр харагдах"
            url={form.logoLightUrl}
            onChange={(url) => update({ logoLightUrl: url })}
            bgClass="bg-white"
          />
        </div>
      </Section>

      {/* Contact */}
      <Section title="03 — Холбоо барих">
        <Row>
          <Field label="И-мэйл">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              maxLength={200}
              className="input"
              placeholder="info@saysanaa.mn"
            />
          </Field>
          <Field label="Утас">
            <input
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              maxLength={40}
              className="input"
              placeholder="+976 9999 0000"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Вэбсайт">
            <input
              type="url"
              value={form.website}
              onChange={(e) => update({ website: e.target.value })}
              maxLength={200}
              className="input"
              placeholder="https://saysanaa.mn"
            />
          </Field>
          <Field label="Хаяг">
            <input
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              maxLength={400}
              className="input"
              placeholder="Улаанбаатар хот, Сүхбаатар дүүрэг..."
            />
          </Field>
        </Row>
      </Section>

      {/* Registration */}
      <Section title="04 — Бүртгэлийн мэдээлэл">
        <Row>
          <Field label="ТТД / Регистрийн дугаар">
            <input
              value={form.registerNumber}
              onChange={(e) => update({ registerNumber: e.target.value })}
              maxLength={40}
              className="input font-mono"
              placeholder="12345678"
            />
          </Field>
          <Field label="Үүсгэн байгуулагдсан он">
            <input
              type="number"
              min={1900}
              max={2100}
              value={form.foundedYear ?? ""}
              onChange={(e) =>
                update({ foundedYear: e.target.value ? parseInt(e.target.value) : null })
              }
              className="input tabular-nums"
              placeholder="2022"
            />
          </Field>
        </Row>
      </Section>

      {/* Social */}
      <Section title="05 — Сошиал сүлжээ">
        <Row>
          <Field label="Facebook">
            <input
              type="url"
              value={form.facebook}
              onChange={(e) => update({ facebook: e.target.value })}
              maxLength={200}
              className="input"
              placeholder="https://facebook.com/saysanaa"
            />
          </Field>
          <Field label="Instagram">
            <input
              type="url"
              value={form.instagram}
              onChange={(e) => update({ instagram: e.target.value })}
              maxLength={200}
              className="input"
              placeholder="https://instagram.com/saysanaa"
            />
          </Field>
        </Row>
        <Field label="LinkedIn">
          <input
            type="url"
            value={form.linkedin}
            onChange={(e) => update({ linkedin: e.target.value })}
            maxLength={200}
            className="input"
            placeholder="https://linkedin.com/company/saysanaa"
          />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-4 bg-bg/80 backdrop-blur-sm py-3 px-2 rounded">
        {msg && (
          <span
            className={`text-[12px] px-2.5 py-1 rounded ${
              msg.type === "ok"
                ? "bg-success/15 text-successInk border border-success/30"
                : "bg-danger/15 text-dangerInk border border-danger/30"
            }`}
          >
            {msg.text}
          </span>
        )}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </form>
  );
}

function LogoSlot({
  kind,
  label,
  hint,
  url,
  onChange,
  bgClass,
}: {
  kind: "logo" | "logo-light";
  label: string;
  hint: string;
  url: string | null;
  onChange: (url: string | null) => void;
  bgClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const upload = (file: File | null) => {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const r = await uploadOrgLogoAction(kind, fd);
      if (r?.ok) {
        // We don't have the URL back; rely on revalidatePath to refresh the parent.
        // Optimistic: blank the URL so the slot shows uploading state — server
        // will repopulate via the page refresh.
        location.reload();
      } else setError(r?.error ?? "Алдаа");
    });
  };

  const remove = () => {
    if (!confirm("Логог устгах уу?")) return;
    setError(null);
    start(async () => {
      const r = await removeOrgLogoAction(kind);
      if (r?.ok) {
        onChange(null);
        location.reload();
      } else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[13px] font-semibold text-tx">{label}</div>
        <div className="text-[10px] text-sub">{hint}</div>
      </div>
      <div
        className={`relative ${bgClass} border border-bd rounded-md p-4 flex items-center justify-center min-h-[120px]`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-20 max-w-full object-contain" />
        ) : (
          <div className="text-sub text-[12px]">Лого ачаалаагүй</div>
        )}
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="btn-ghost h-9 px-3 text-[12px]"
        >
          {pending ? "Ачаалж байна…" : url ? "Солих" : "Зураг сонгох"}
        </button>
        {url && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-[11px] text-sub hover:text-dangerInk"
          >
            ✕ Устгах
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-sub mb-4 pb-3 border-b border-bd">
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
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="label">
          {label} {required && <span className="text-white/70">*</span>}
        </label>
        {hint && (
          <span className="text-[10px] uppercase tracking-wider text-sub">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
