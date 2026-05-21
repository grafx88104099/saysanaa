"use client";
import { useState } from "react";
import { priorityAccent } from "@/lib/labels";

export default function PriorityPicker({
  name,
  defaultValue = 5,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [val, setVal] = useState(defaultValue);
  const { color, tone } = priorityAccent(val);

  return (
    <div>
      <input type="hidden" name={name} value={val} />
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const a = priorityAccent(n);
          const selected = n === val;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setVal(n)}
              className={`w-10 h-10 rounded-md border text-[13px] font-semibold tabular-nums transition
                ${
                  selected
                    ? "scale-110"
                    : "hover:border-white/30 text-white/70 border-white/12"
                }`}
              style={
                selected
                  ? { background: a.color, color: "#0B0D10", borderColor: a.color }
                  : undefined
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="text-[12px] text-white/55 mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: color, color: "#0B0D10" }}
        >
          P{val}
        </span>
        <span>— {tone}</span>
      </div>
    </div>
  );
}
