"use client";
import { useState, useTransition } from "react";
import { saveExperienceAction } from "./actions";

type Tier = {
  id?: string;
  _key: string; // local key for react list
  label: string;
  minYears: number;
  maxYears: number | null;
  sortOrder: number;
  allowedLevelIds: string[];
};
type Level = { id: string; key: string; label: string };

export default function Editor({
  tiers: initTiers,
  levels,
}: {
  tiers: Omit<Tier, "_key">[];
  levels: Level[];
}) {
  const [tiers, setTiers] = useState<Tier[]>(
    initTiers.map((t, i) => ({ ...t, _key: t.id ?? `new-${i}` }))
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const updateTier = (key: string, patch: Partial<Tier>) =>
    setTiers((ts) => ts.map((t) => (t._key === key ? { ...t, ...patch } : t)));

  const toggleLevel = (key: string, levelId: string) =>
    setTiers((ts) =>
      ts.map((t) =>
        t._key === key
          ? {
              ...t,
              allowedLevelIds: t.allowedLevelIds.includes(levelId)
                ? t.allowedLevelIds.filter((x) => x !== levelId)
                : [...t.allowedLevelIds, levelId],
            }
          : t
      )
    );

  const addTier = () => {
    const sortOrder = Math.max(0, ...tiers.map((t) => t.sortOrder)) + 1;
    setTiers((ts) => [
      ...ts,
      {
        _key: `new-${Date.now()}`,
        label: "",
        minYears: 0,
        maxYears: null,
        sortOrder,
        allowedLevelIds: [],
      },
    ]);
  };

  const removeTier = (key: string) => {
    const t = tiers.find((x) => x._key === key);
    if (t?.id) setDeletedIds((d) => [...d, t.id!]);
    setTiers((ts) => ts.filter((x) => x._key !== key));
  };

  const onSave = () => {
    setMsg(null);
    for (const t of tiers) {
      if (!t.label.trim()) {
        setMsg({ type: "err", text: "Бүх мужид нэр оруулна уу" });
        return;
      }
    }
    const payload = {
      tiers: tiers.map((t, i) => ({
        id: t.id,
        label: t.label.trim(),
        minYears: t.minYears,
        maxYears: t.maxYears,
        allowedLevelIds: t.allowedLevelIds,
        sortOrder: i + 1,
      })),
      deletedTierIds: deletedIds,
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    start(async () => {
      const r = await saveExperienceAction(undefined, fd);
      if (r?.ok) {
        setMsg({ type: "ok", text: "Хадгалагдлаа" });
        setDeletedIds([]);
      } else setMsg({ type: "err", text: r?.error ?? "Алдаа гарлаа" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sub text-[12px] max-w-[760px]">
          Дизайнерийн ажилласан жилийн мужид зөвхөн зөвшөөрөгдсөн зэрэглэлийн төслийг
          оноох боломжтой. Жш: 1-2 жилийн туршлагатай дизайнерт C, B зэргийн төсөл өгнө.
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
          <button onClick={addTier} className="btn-ghost">+ Шинэ муж</button>
          <button onClick={onSave} disabled={pending} className="btn-primary">
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-white/[0.03] text-sub text-[11px]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Туршлагын муж</th>
              <th className="text-left px-2 py-2 font-medium w-[80px]">Хамгийн бага жил</th>
              <th className="text-left px-2 py-2 font-medium w-[80px]">Хамгийн их жил</th>
              <th className="text-left px-4 py-2 font-medium">Зөвшөөрөгдөх зэрэглэл</th>
              <th className="w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-sub text-[12px]">
                  Муж нэмж эхлүүлнэ үү
                </td>
              </tr>
            )}
            {tiers.map((t) => (
              <tr key={t._key} className="border-t border-bd/40">
                <td className="px-4 py-2">
                  <input
                    value={t.label}
                    onChange={(e) => updateTier(t._key, { label: e.target.value })}
                    placeholder="Жш: 1-2 жил"
                    className="w-full bg-transparent text-tx focus:outline-none focus:bg-white/5 rounded px-1.5 py-1 -mx-1.5"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={t.minYears}
                    onChange={(e) =>
                      updateTier(t._key, { minYears: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-8 bg-white/[0.02] border border-bd rounded px-2 text-center text-[12px] tabular-nums focus:outline-none focus:border-brand focus:bg-white/[0.04]"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={t.maxYears ?? ""}
                    placeholder="∞"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateTier(t._key, { maxYears: v === "" ? null : parseInt(v) || 0 });
                    }}
                    className="w-full h-8 bg-white/[0.02] border border-bd rounded px-2 text-center text-[12px] tabular-nums focus:outline-none focus:border-brand focus:bg-white/[0.04]"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {levels.map((lv) => {
                      const on = t.allowedLevelIds.includes(lv.id);
                      return (
                        <button
                          key={lv.id}
                          type="button"
                          onClick={() => toggleLevel(t._key, lv.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider transition ${
                            on
                              ? "bg-brand text-white border border-brand"
                              : "border border-bd text-sub hover:text-tx hover:border-brand/40"
                          }`}
                        >
                          {lv.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => removeTier(t._key)}
                    className="text-sub hover:text-dangerInk text-[12px]"
                    title="Устгах"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
