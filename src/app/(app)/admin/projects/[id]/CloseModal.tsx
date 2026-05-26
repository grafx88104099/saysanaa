"use client";
import { useState, useTransition } from "react";
import { closeProjectAction } from "../actions";

type Level = { id: string; key: string; label: string };

const LEVEL_BG: Record<string, string> = {
  APLUS: "linear-gradient(135deg,#6AA6FF,#8B5CF6)",
  A: "#6AA6FF",
  B: "#F59E0B",
  C: "#6B7390",
};

export default function CloseModal({
  projectId,
  expectedGradeLevel,
  allLevels,
  estimatedEfficiency,
}: {
  projectId: string;
  expectedGradeLevel: Level | null;
  allLevels: Level[];
  estimatedEfficiency: number | null; // for preview
}) {
  const [open, setOpen] = useState(false);
  const [qualityRating, setQualityRating] = useState(4);
  const [clientSat, setClientSat] = useState<number | null>(null);
  const [actualGradeId, setActualGradeId] = useState<string>(
    expectedGradeLevel?.id ?? ""
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    if (qualityRating < 1 || qualityRating > 5) {
      setError("Чанарын үнэлгээ 1-5 байх ёстой");
      return;
    }
    const fd = new FormData();
    fd.set("qualityRating", String(qualityRating));
    if (clientSat != null) fd.set("clientSatisfaction", String(clientSat));
    if (actualGradeId) fd.set("actualGradeLevelId", actualGradeId);
    fd.set("closingNote", note);
    start(async () => {
      const r = await closeProjectAction(projectId, undefined, fd);
      if (r?.ok) {
        setOpen(false);
      } else setError(r?.error ?? "Алдаа гарлаа");
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        ✓ Төсөл хаах ба үнэлэх
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="panel max-w-[560px] w-full p-6 shadow-[0_0_60px_rgba(106,166,255,0.20)]">
            <div className="mb-5">
              <h2 className="text-[18px] font-semibold text-gradient">
                Төслийг дуусгах
              </h2>
              <p className="text-[12px] text-sub mt-1">
                Эцсийн KPI snapshot үүсгэгдэж, статус нь "Дууссан" болно
              </p>
            </div>

            {/* Quality rating */}
            <div className="mb-4">
              <label className="text-[11px] uppercase tracking-wider text-sub font-medium block mb-2">
                Гүйцэтгэлийн чанар (заавал)
              </label>
              <StarPicker
                value={qualityRating}
                onChange={setQualityRating}
                labels={["Маш муу", "Муу", "Дунд", "Сайн", "Маш сайн"]}
              />
            </div>

            {/* Client satisfaction */}
            <div className="mb-4">
              <label className="text-[11px] uppercase tracking-wider text-sub font-medium block mb-2">
                Захиалагчийн сэтгэл ханамж (заавал биш)
              </label>
              <StarPicker
                value={clientSat ?? 0}
                onChange={(v) => setClientSat(v)}
                labels={["Их муу", "Муу", "Дунд", "Сайн", "Маш сайн"]}
              />
              {clientSat != null && (
                <button
                  type="button"
                  onClick={() => setClientSat(null)}
                  className="text-[11px] text-sub hover:text-tx mt-1"
                >
                  Цэвэрлэх
                </button>
              )}
            </div>

            {/* Actual grade */}
            {allLevels.length > 0 && (
              <div className="mb-4">
                <label className="text-[11px] uppercase tracking-wider text-sub font-medium block mb-2">
                  Эцсийн зэрэглэл
                  {expectedGradeLevel && (
                    <span className="ml-2 text-sub font-normal normal-case tracking-normal">
                      (хүлээгдэж байсан: <span className="text-tx">{expectedGradeLevel.label}</span>)
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  {allLevels.map((lv) => {
                    const on = actualGradeId === lv.id;
                    return (
                      <button
                        key={lv.id}
                        type="button"
                        onClick={() => setActualGradeId(lv.id)}
                        className={`flex-1 h-10 rounded text-[14px] font-bold transition ${
                          on ? "text-white" : "text-sub hover:text-tx border border-bd"
                        }`}
                        style={on ? { background: LEVEL_BG[lv.key] ?? "#6AA6FF" } : undefined}
                      >
                        {lv.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mb-4">
              <label className="text-[11px] uppercase tracking-wider text-sub font-medium block mb-2">
                Хаалтын тэмдэглэл (заавал биш)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Жш: Бүх ажил хүлээлгэн өгсөн. Захиалагч сэтгэл ханамжтай."
                className="w-full bg-white/[0.02] border border-bd rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-brand focus:bg-white/[0.04]"
              />
            </div>

            {estimatedEfficiency !== null && (
              <div className="mb-4 text-[11px] text-sub bg-white/[0.02] border border-bd rounded p-2">
                💡 Тооцоолсон биелэлт:{" "}
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color:
                      estimatedEfficiency >= 1
                        ? "#22C55E"
                        : estimatedEfficiency >= 0.85
                        ? "#F59E0B"
                        : "#EF4444",
                  }}
                >
                  {(estimatedEfficiency * 100).toFixed(0)}%
                </span>{" "}
                · KPI snapshot-д хадгалагдана
              </div>
            )}

            {error && (
              <div className="mb-3 text-[12px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-bd">
              <button onClick={() => setOpen(false)} className="btn-ghost">
                Цуцлах
              </button>
              <button onClick={submit} disabled={pending} className="btn-primary">
                {pending ? "Хадгалж байна…" : "Хаах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StarPicker({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (n: number) => void;
  labels: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`w-9 h-9 rounded text-[18px] transition ${
              i <= display
                ? "text-warning bg-warning/10 border border-warning/30"
                : "text-sub border border-bd hover:border-brand/40"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <div className="text-[12px] text-sub">
        {display > 0 ? labels[display - 1] : "—"}
      </div>
    </div>
  );
}
