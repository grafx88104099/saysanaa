"use client";
import { useMemo, useState, useTransition } from "react";
import { saveTimelineAction } from "./actions";

type Cell = {
  phaseId: string;
  hours: number;
  pct: number;
  rateMnt: number;
  quantityNote: string | null;
};
type Band = {
  id: string;
  label: string;
  minM2: number;
  maxM2: number | null;
  totalPriceMnt: number;
  cells: Cell[];
};
type Phase = { id: string; key: string; label: string };

const fmtMnt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2) + "M"
    : n.toLocaleString("mn-MN");

export default function Editor({
  bands: initialBands,
  phases,
}: {
  bands: Band[];
  phases: Phase[];
}) {
  const [bands, setBands] = useState(initialBands);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Short phase labels (Mongolian only) for column headers
  const phaseShort = useMemo(
    () =>
      phases.map((p) => {
        const mn = p.label.split("/")[0].trim();
        return { ...p, short: mn };
      }),
    [phases]
  );

  const updateCell = (bandId: string, phaseId: string, patch: Partial<Cell>) => {
    setBands((bs) =>
      bs.map((b) =>
        b.id === bandId
          ? {
              ...b,
              cells: b.cells.map((c) =>
                c.phaseId === phaseId ? { ...c, ...patch } : c
              ),
            }
          : b
      )
    );
  };

  const updateBandPrice = (bandId: string, totalPriceMnt: number) => {
    setBands((bs) =>
      bs.map((b) => {
        if (b.id !== bandId) return b;
        // recompute rateMnt for cells with pct > 0
        const newCells = b.cells.map((c) =>
          c.pct > 0 ? { ...c, rateMnt: Math.round(totalPriceMnt * c.pct) } : c
        );
        return { ...b, totalPriceMnt, cells: newCells };
      })
    );
  };

  const onSave = () => {
    setMsg(null);
    const payload = {
      cells: bands.flatMap((b) =>
        b.cells.map((c) => ({
          bandId: b.id,
          phaseId: c.phaseId,
          hours: Number(c.hours) || 0,
          pct: Number(c.pct) || 0,
          rateMnt: Number(c.rateMnt) || 0,
          quantityNote: c.quantityNote ?? null,
        }))
      ),
      bandPrices: bands.map((b) => ({
        bandId: b.id,
        totalPriceMnt: Number(b.totalPriceMnt) || 0,
      })),
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    start(async () => {
      const r = await saveTimelineAction(undefined, fd);
      if (r?.ok) setMsg({ type: "ok", text: "Хадгалагдлаа" });
      else setMsg({ type: "err", text: r?.error ?? "Алдаа гарлаа" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sub text-[12px]">
          Талбайн муж тус бүрд 10 фазын норматив цаг, нэгж үнэлгээ, нийт төсвийг тохируулна.
          Sketch / Render / PPT-ийн төгрөгөөр үнэлгээ нь нийт төсвөөс хувиар бодогдоно.
        </p>
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
            onClick={onSave}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-[12px] border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-white/[0.03]">
              <th className="text-left px-3 py-2 text-sub font-medium w-[110px] sticky left-0 bg-surf z-10 border-r border-bd">
                Талбай (м²)
              </th>
              {phaseShort.map((p) => (
                <th
                  key={p.id}
                  className="px-2 py-2 text-sub font-medium text-center min-w-[80px] border-l border-bd/60"
                  title={p.label}
                >
                  {p.short}
                </th>
              ))}
              <th className="px-3 py-2 text-sub font-medium text-right w-[140px] border-l border-bd">
                Нийт төсөв ₮
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b, bi) => (
              <tr key={b.id} className={bi % 2 ? "bg-white/[0.012]" : ""}>
                <td className="px-3 py-1.5 sticky left-0 bg-surf z-10 border-r border-bd font-medium">
                  <div className="text-tx">{b.label}</div>
                </td>
                {b.cells.map((c) => (
                  <td key={c.phaseId} className="px-1 py-1 border-l border-bd/40 align-middle">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={c.hours}
                      onChange={(e) =>
                        updateCell(b.id, c.phaseId, {
                          hours: e.target.value === "" ? 0 : parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-8 bg-white/[0.02] border border-bd rounded px-1.5 text-center text-[12px] tabular-nums focus:outline-none focus:border-brand focus:bg-white/[0.04]"
                    />
                  </td>
                ))}
                <td className="px-2 py-1 border-l border-bd align-middle">
                  <input
                    type="number"
                    step="50000"
                    min={0}
                    value={b.totalPriceMnt}
                    onChange={(e) =>
                      updateBandPrice(
                        b.id,
                        e.target.value === "" ? 0 : parseFloat(e.target.value)
                      )
                    }
                    className="w-full h-8 bg-white/[0.02] border border-bd rounded px-1.5 text-right text-[12px] tabular-nums focus:outline-none focus:border-brand focus:bg-white/[0.04]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-white/[0.02]">
              <td className="px-3 py-2 text-sub text-[11px] sticky left-0 bg-surf border-r border-bd">
                Нэгж үнэлгээ ₮
              </td>
              {phaseShort.map((p) => {
                const samplePct = bands[0]?.cells.find((c) => c.phaseId === p.id)?.pct ?? 0;
                return (
                  <td key={p.id} className="px-1 py-2 text-center text-[11px] text-sub border-l border-bd/40">
                    {samplePct > 0 ? `${Math.round(samplePct * 100)}%` : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right text-[11px] text-sub border-l border-bd">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details className="panel p-4">
        <summary className="cursor-pointer text-[13px] text-tx font-medium">
          Тайлбар / Тоо хэмжээ
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          {phaseShort.map((p) => {
            const samplePct = bands[0]?.cells.find((c) => c.phaseId === p.id)?.pct ?? 0;
            const sampleNote =
              bands[0]?.cells.find((c) => c.phaseId === p.id)?.quantityNote ?? "—";
            return (
              <div key={p.id} className="flex gap-2 border border-bd rounded px-3 py-2">
                <div className="flex-1">
                  <div className="text-tx font-medium">{p.short}</div>
                  <div className="text-sub text-[11px]">{p.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-brand tabular-nums">
                    {samplePct > 0 ? `${Math.round(samplePct * 100)}%` : "—"}
                  </div>
                  <div className="text-sub text-[11px]">{sampleNote || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </details>

      <p className="text-sub text-[11px]">
        Эх сурвалж: <code className="text-tx">Time.xlsx</code>,{" "}
        <code className="text-tx">Төслийн технологийн карт.xlsx</code>
      </p>
    </div>
  );
}
