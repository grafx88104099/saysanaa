"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  savePptTextAction,
  uploadPptImageAction,
  removePptImageAction,
  updatePptCaptionAction,
} from "./actions";
import type { PptSlotKind } from "@prisma/client";

type Slot = {
  id: string;
  kind: PptSlotKind;
  ordinal: number;
  imageUrl: string;
  imageName: string | null;
  caption: string | null;
};

const KIND_INFO: Record<
  PptSlotKind,
  { title: string; subtitle: string; max: number; emoji: string }
> = {
  MOODBOARD: {
    title: "Moodboard",
    subtitle: "Дизайны санаа, өнгө, материалын мэдрэмж",
    max: 12,
    emoji: "🎨",
  },
  PLAN: {
    title: "Plan",
    subtitle: "Талбайн зохион байгуулалт (floor plan)",
    max: 4,
    emoji: "📐",
  },
  SKETCH: {
    title: "3D Sketch",
    subtitle: "Эхэн үеийн санааны 3D скеч",
    max: 4,
    emoji: "✏️",
  },
  RENDER: {
    title: "3D Render",
    subtitle: "Эцсийн дизайны үзүүлэлт",
    max: 12,
    emoji: "🖼️",
  },
  MATERIALS: {
    title: "Materials",
    subtitle: "Сонгосон материал, өнгө, тавилгын зураг",
    max: 4,
    emoji: "🧱",
  },
};

const KIND_ORDER: PptSlotKind[] = [
  "MOODBOARD",
  "PLAN",
  "SKETCH",
  "RENDER",
  "MATERIALS",
];

export default function PptManager({
  projectId,
  projectName,
  projectCode,
  briefText: briefInit,
  materialsText: matInit,
  lastGeneratedAt,
  slots,
}: {
  projectId: string;
  projectName: string;
  projectCode: string;
  briefText: string;
  materialsText: string;
  lastGeneratedAt: string | null;
  slots: Slot[];
}) {
  const slotsByKind = useMemo(() => {
    const m: Record<PptSlotKind, Slot[]> = {
      MOODBOARD: [],
      PLAN: [],
      SKETCH: [],
      RENDER: [],
      MATERIALS: [],
    };
    for (const s of slots) m[s.kind].push(s);
    return m;
  }, [slots]);

  const [brief, setBrief] = useState(briefInit);
  const [materials, setMaterials] = useState(matInit);
  const [textMsg, setTextMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [textPending, startText] = useTransition();

  const saveText = () => {
    setTextMsg(null);
    const fd = new FormData();
    fd.set("briefText", brief);
    fd.set("materialsText", materials);
    startText(async () => {
      const r = await savePptTextAction(projectId, undefined, fd);
      if (r?.ok) setTextMsg({ type: "ok", text: "Хадгалагдлаа" });
      else setTextMsg({ type: "err", text: r?.error ?? "Алдаа" });
    });
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">
            Презентэйшн
          </h1>
          <p className="text-sub text-[12px] mt-1">
            {projectCode} — {projectName} · Зураг upload + brief текст → .pptx татах
          </p>
          {lastGeneratedAt && (
            <p className="text-[11px] text-sub mt-0.5">
              Сүүлд татсан: {new Date(lastGeneratedAt).toLocaleString("mn-MN")}
            </p>
          )}
        </div>
        <a
          href={`/api/projects/${projectId}/ppt`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          📥 PPT татах
        </a>
      </div>

      {/* Brief */}
      <section className="panel p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-tx">
            🎯 Brief / Зорилго (Слайд 3)
          </h2>
          {textMsg && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded ${
                textMsg.type === "ok"
                  ? "bg-success/15 text-successInk border border-success/30"
                  : "bg-danger/15 text-dangerInk border border-danger/30"
              }`}
            >
              {textMsg.text}
            </span>
          )}
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder="Төслийн зорилго, концепц, хүрэх үр дүн… (хэдэн догол)"
          className="input min-h-[120px] py-2 text-[13px] leading-relaxed"
        />
      </section>

      {/* Materials text */}
      <section className="panel p-5 mb-6">
        <h2 className="text-[14px] font-semibold text-tx mb-2">
          🧱 Material текст (Слайд 8)
        </h2>
        <textarea
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          rows={4}
          placeholder="Сонгосон материал, өнгөний тайлбар… (заавал биш)"
          className="input min-h-[100px] py-2 text-[13px] leading-relaxed"
        />
        <div className="flex items-center justify-end mt-2">
          <button
            onClick={saveText}
            disabled={textPending}
            className="btn-primary h-9 px-4"
          >
            {textPending ? "Хадгалж байна…" : "Текстийг хадгалах"}
          </button>
        </div>
      </section>

      {/* Image slots */}
      {KIND_ORDER.map((kind) => (
        <SlotGroup
          key={kind}
          projectId={projectId}
          kind={kind}
          info={KIND_INFO[kind]}
          slots={slotsByKind[kind]}
        />
      ))}
    </div>
  );
}

function SlotGroup({
  projectId,
  kind,
  info,
  slots,
}: {
  projectId: string;
  kind: PptSlotKind;
  info: { title: string; subtitle: string; max: number; emoji: string };
  slots: Slot[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const remaining = info.max - slots.length;

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    start(async () => {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.set("file", f);
        const r = await uploadPptImageAction(projectId, kind, fd);
        if (r?.error) {
          setError(r.error);
          break;
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="text-[14px] font-semibold text-tx">
            {info.emoji} {info.title}{" "}
            <span className="text-sub font-normal">
              · {slots.length}/{info.max}
            </span>
          </h3>
          <p className="text-[11px] text-sub">{info.subtitle}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending || remaining <= 0}
          className={remaining > 0 ? "btn-ghost h-9 px-3" : "btn-ghost h-9 px-3 opacity-50"}
        >
          {pending ? "Ачаалж байна…" : `+ Зураг (${remaining})`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error && (
        <div className="mb-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
          {error}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="panel p-6 text-center text-sub text-[12px] border-dashed">
          Зураг ачаалаагүй
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slots.map((s) => (
            <SlotCard key={s.id} projectId={projectId} slot={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function SlotCard({ projectId, slot }: { projectId: string; slot: Slot }) {
  const [caption, setCaption] = useState(slot.caption ?? "");
  const [pending, start] = useTransition();

  const saveCaption = () => {
    if (caption === (slot.caption ?? "")) return;
    start(async () => {
      await updatePptCaptionAction(projectId, slot.id, caption.trim() || null);
    });
  };
  const remove = () => {
    if (!confirm("Зургийг устгах уу?")) return;
    start(async () => {
      await removePptImageAction(projectId, slot.id);
    });
  };

  return (
    <div className="panel overflow-hidden">
      <div className="relative aspect-[4/3] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.imageUrl}
          alt={slot.imageName ?? ""}
          className="w-full h-full object-cover"
        />
        <button
          onClick={remove}
          disabled={pending}
          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-[12px] hover:bg-danger transition"
          title="Устгах"
        >
          ✕
        </button>
      </div>
      <div className="p-2">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveCaption}
          placeholder="Caption (заавал биш)"
          className="w-full bg-transparent text-[11px] text-tx focus:outline-none border-b border-bd focus:border-brand pb-1"
        />
      </div>
    </div>
  );
}
