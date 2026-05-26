"use client";
import { useState, useTransition } from "react";
import { saveGradingAction } from "./actions";

type Level = { id: string; key: string; label: string; minScore: number; maxScore: number };
type Crit = { id: string; label: string; description: string | null };
type Cell = { criterionId: string; levelId: string; body: string };

const LEVEL_TONE: Record<string, string> = {
  APLUS: "from-brand to-brand2",
  A: "from-brand to-info",
  B: "from-warning to-amber-400",
  C: "from-sub to-muted",
};

export default function Editor({
  levels: initLevels,
  criteria: initCriteria,
  cells: initCells,
}: {
  levels: Level[];
  criteria: Crit[];
  cells: Cell[];
}) {
  const [levels, setLevels] = useState(initLevels);
  const [criteria, setCriteria] = useState(initCriteria);
  const [cells, setCells] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of initCells) m[`${c.criterionId}|${c.levelId}`] = c.body;
    return m;
  });

  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const getCell = (cid: string, lid: string) => cells[`${cid}|${lid}`] ?? "";
  const setCell = (cid: string, lid: string, body: string) =>
    setCells((m) => ({ ...m, [`${cid}|${lid}`]: body }));

  const onSave = () => {
    setMsg(null);
    const payload = {
      levels: levels.map((l) => ({
        id: l.id,
        label: l.label,
        minScore: l.minScore,
        maxScore: l.maxScore,
      })),
      criteria: criteria.map((c) => ({ id: c.id, label: c.label, description: c.description })),
      cells: criteria.flatMap((cr) =>
        levels.map((lv) => ({
          criterionId: cr.id,
          levelId: lv.id,
          body: getCell(cr.id, lv.id),
        }))
      ),
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    start(async () => {
      const r = await saveGradingAction(undefined, fd);
      if (r?.ok) setMsg({ type: "ok", text: "Хадгалагдлаа" });
      else setMsg({ type: "err", text: r?.error ?? "Алдаа гарлаа" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sub text-[12px] max-w-[760px]">
          7 шалгуурын дагуу төслийг A+ / A / B / C дөрвөн зэрэгт ангилна. Шалгуур бүрд
          оноо өгч, тэдгээрийн нийлбэрээр зэрэглэлийг тогтооно. Доорх матрицын нүд бүрт
          тухайн зэрэглэлд тохирох шалгуурын утга/тайлбарыг бичнэ.
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
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
          <button onClick={onSave} disabled={pending} className="btn-primary">
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      {/* Level header / score range editor */}
      <div className="grid grid-cols-4 gap-3">
        {levels.map((l) => (
          <div
            key={l.id}
            className={`panel p-4 bg-gradient-to-br ${LEVEL_TONE[l.key] ?? "from-bd to-surf"} bg-opacity-10`}
            style={{
              background:
                l.key === "APLUS"
                  ? "linear-gradient(135deg, rgba(106,166,255,0.18), rgba(139,92,246,0.18))"
                  : l.key === "A"
                  ? "linear-gradient(135deg, rgba(106,166,255,0.14), rgba(34,211,238,0.12))"
                  : l.key === "B"
                  ? "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.10))"
                  : "linear-gradient(135deg, rgba(154,166,207,0.12), rgba(154,166,207,0.06))",
            }}
          >
            <input
              value={l.label}
              onChange={(e) =>
                setLevels((ls) =>
                  ls.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x))
                )
              }
              className="bg-transparent border-0 text-[22px] font-semibold text-tx focus:outline-none focus:bg-white/5 rounded px-1 -mx-1 w-full"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min={0}
                max={10}
                value={l.minScore}
                onChange={(e) =>
                  setLevels((ls) =>
                    ls.map((x) =>
                      x.id === l.id ? { ...x, minScore: parseInt(e.target.value) || 0 } : x
                    )
                  )
                }
                className="w-12 h-8 bg-white/[0.04] border border-bd rounded px-1 text-center text-[12px] focus:outline-none focus:border-brand"
              />
              <span className="text-sub text-[12px]">–</span>
              <input
                type="number"
                min={0}
                max={10}
                value={l.maxScore}
                onChange={(e) =>
                  setLevels((ls) =>
                    ls.map((x) =>
                      x.id === l.id ? { ...x, maxScore: parseInt(e.target.value) || 0 } : x
                    )
                  )
                }
                className="w-12 h-8 bg-white/[0.04] border border-bd rounded px-1 text-center text-[12px] focus:outline-none focus:border-brand"
              />
              <span className="text-sub text-[11px]">оноо</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rubric matrix */}
      <div className="space-y-3">
        {criteria.map((cr, idx) => (
          <div key={cr.id} className="panel p-4">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-sub text-[11px] tabular-nums w-5">{idx + 1}.</span>
              <input
                value={cr.label}
                onChange={(e) =>
                  setCriteria((cs) =>
                    cs.map((x) => (x.id === cr.id ? { ...x, label: e.target.value } : x))
                  )
                }
                className="flex-1 bg-transparent text-[14px] font-medium text-tx focus:outline-none focus:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5"
              />
            </div>
            {cr.description !== null && (
              <input
                value={cr.description ?? ""}
                onChange={(e) =>
                  setCriteria((cs) =>
                    cs.map((x) =>
                      x.id === cr.id ? { ...x, description: e.target.value } : x
                    )
                  )
                }
                placeholder="Дэд тайлбар (заавал биш)"
                className="w-full mb-3 bg-transparent text-[11px] text-sub focus:outline-none focus:bg-white/5 rounded px-1.5 py-0.5"
              />
            )}
            <div className="grid grid-cols-4 gap-2">
              {levels.map((lv) => (
                <textarea
                  key={lv.id}
                  value={getCell(cr.id, lv.id)}
                  onChange={(e) => setCell(cr.id, lv.id, e.target.value)}
                  rows={4}
                  className="bg-white/[0.02] border border-bd rounded-md p-2 text-[12px] text-tx focus:outline-none focus:border-brand focus:bg-white/[0.04] resize-y"
                  placeholder={`${lv.label} зэрэглэлд тохирох тайлбар…`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
