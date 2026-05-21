"use client";
import { useState, useTransition } from "react";
import { importPresetAction } from "./actions";

export default function ImportButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onImport() {
    if (!confirm("Монгол улсын 2026 оны баяр амралтыг нэмэх үү?")) return;
    start(async () => {
      const r = await importPresetAction();
      setMsg(`✓ ${r.added} өдөр нэмэгдлээ`);
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={onImport} disabled={pending} className="btn-ghost">
        {pending ? "Нэмэгдэж байна…" : "🇲🇳 2026 оны Монгол улсын баяр амралт нэмэх"}
      </button>
      {msg && <div className="text-[12px] text-white/70">{msg}</div>}
    </div>
  );
}
