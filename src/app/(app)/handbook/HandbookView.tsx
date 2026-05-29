"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  saveHandbookSectionAction,
  deleteHandbookSectionAction,
} from "./actions";
import { renderMarkdown } from "@/lib/markdown";

type Section = {
  id: string;
  slug: string;
  title: string;
  body: string;
  sortOrder: number;
  updatedAt: string;
};

export default function HandbookView({
  isAdmin,
  sections,
  activeSlug,
}: {
  isAdmin: boolean;
  sections: Section[];
  activeSlug: string | null;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const active = sections.find((s) => s.slug === activeSlug) ?? null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Дүрэм журам
          </h1>
          <p className="text-sub text-[12px] mt-1">
            Байгууллагын философи, эрхэм зорилго, ажиллах журам
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setCreating(true);
              setEditId(null);
            }}
            className="btn-primary"
          >
            + Шинэ хэсэг
          </button>
        )}
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="panel p-3 h-fit sticky top-4">
          {sections.length === 0 ? (
            <div className="text-sub text-[12px] py-4 text-center">
              Хэсэг алга
            </div>
          ) : (
            <nav className="space-y-1">
              {sections.map((s) => {
                const on = s.slug === activeSlug;
                return (
                  <Link
                    key={s.id}
                    href={`/handbook?section=${s.slug}`}
                    className={`block px-3 py-2 rounded text-[13px] transition ${
                      on
                        ? "bg-gradient-to-r from-brand/15 via-brand2/10 to-transparent text-tx border-l-2 border-brand2"
                        : "text-sub hover:text-tx hover:bg-white/[0.03] border-l-2 border-transparent"
                    }`}
                  >
                    {s.title}
                  </Link>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Content */}
        <main>
          {creating ? (
            <SectionEditor
              section={null}
              onCancel={() => setCreating(false)}
              onSaved={() => setCreating(false)}
            />
          ) : editId && active ? (
            <SectionEditor
              section={active}
              onCancel={() => setEditId(null)}
              onSaved={() => setEditId(null)}
            />
          ) : active ? (
            <article className="panel p-6">
              <header className="flex items-center justify-between mb-4 pb-3 border-b border-bd">
                <div>
                  <h2 className="text-[20px] font-semibold text-tx">{active.title}</h2>
                  <div className="text-[11px] text-sub mt-1">
                    Шинэчилсэн: {new Date(active.updatedAt).toLocaleDateString("mn-MN")}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditId(active.id)}
                      className="btn-ghost h-9 px-3"
                    >
                      Засах
                    </button>
                    <DeleteButton sectionId={active.id} />
                  </div>
                )}
              </header>
              <div
                className="prose-content text-[14px] leading-relaxed text-tx"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }}
              />
            </article>
          ) : (
            <div className="panel p-10 text-center text-sub text-[12px]">
              {sections.length === 0 && isAdmin
                ? "Шинэ хэсэг нэмж эхлүүлээрэй"
                : "Хэсэг сонгоно уу"}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onCancel,
  onSaved,
}: {
  section: Section | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(section?.title ?? "");
  const [slug, setSlug] = useState(section?.slug ?? "");
  const [body, setBody] = useState(section?.body ?? "");
  const [sortOrder, setSortOrder] = useState<number>(section?.sortOrder ?? 0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const submit = () => {
    setError(null);
    const fd = new FormData();
    if (section) fd.set("id", section.id);
    fd.set("slug", slug);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("sortOrder", String(sortOrder));
    start(async () => {
      const r = await saveHandbookSectionAction(undefined, fd);
      if (r?.ok) onSaved();
      else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="panel p-5">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Гарчиг *</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!section && !slug) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")
                );
              }
            }}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Slug (URL) *</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="philosophy"
            className="input font-mono"
            required
          />
        </div>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="label">Контент (Markdown)</label>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-[11px] text-sub hover:text-tx"
          >
            {preview ? "Засварлах" : "Урьдчилан харах"}
          </button>
        </div>
        {preview ? (
          <div
            className="prose-content text-[14px] leading-relaxed text-tx min-h-[300px] panel p-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="input min-h-[300px] py-2 font-mono text-[13px] leading-relaxed"
            placeholder="# Гарчиг&#10;Энд markdown бичнэ үү..."
          />
        )}
        <div className="text-[10px] text-sub mt-1">
          # Гарчиг · **bold** · *italic* · `code` · [text](url) · - / 1. жагсаалт · ---
          зураас
        </div>
      </div>
      <div className="mb-3 w-40">
        <label className="label">Эрэмбэ</label>
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
          className="input h-9 tabular-nums"
        />
      </div>
      {error && (
        <div className="text-[12px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-3 py-2 mb-3">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-bd">
        <button onClick={onCancel} className="btn-ghost">Цуцлах</button>
        <button onClick={submit} disabled={pending} className="btn-primary">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </div>
  );
}

function DeleteButton({ sectionId }: { sectionId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Энэ хэсгийг устгах уу?")) return;
        start(async () => {
          await deleteHandbookSectionAction(sectionId);
        });
      }}
      disabled={pending}
      className="btn-danger h-9 px-3"
    >
      {pending ? "..." : "Устгах"}
    </button>
  );
}
