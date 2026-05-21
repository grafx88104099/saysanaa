"use client";
import { useState } from "react";

export type EmpOption = {
  id: string;
  initials: string;
  fullName: string;
  role: string;
  profession: string | null;
  photoUrl: string | null;
};

const ROLE_INITIAL: Record<string, string> = {
  ADMIN: "АД",
  PM: "ПМ",
  DESIGNER: "ДЗ",
  ACCOUNTANT: "НГ",
  CLIENT: "ЗХ",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "#E07474",
  PM: "#8B95FF",
  DESIGNER: "#3FCF8E",
  ACCOUNTANT: "#E5B85C",
  CLIENT: "#8B919C",
};

export default function EmployeeMultiPicker({
  name,
  leadName,
  options,
  defaultIds = [],
  defaultLeadId = null,
  max = 5,
}: {
  name: string;
  leadName: string;
  options: EmpOption[];
  defaultIds?: string[];
  defaultLeadId?: string | null;
  max?: number;
}) {
  const [picked, setPicked] = useState<string[]>(defaultIds);
  const [lead, setLead] = useState<string | null>(defaultLeadId);

  function toggle(id: string) {
    if (picked.includes(id)) {
      const next = picked.filter((x) => x !== id);
      setPicked(next);
      if (lead === id) setLead(next[0] ?? null);
    } else {
      if (picked.length >= max) return;
      const next = [...picked, id];
      setPicked(next);
      if (!lead) setLead(id);
    }
  }

  return (
    <div>
      {picked.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <input type="hidden" name={leadName} value={lead ?? ""} />
      <div className="text-[11px] text-white/45 mb-2">
        Сонгогдсон: {picked.length} / {max}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {options.map((e) => {
          const sel = picked.includes(e.id);
          const isLead = lead === e.id;
          const roleTag = ROLE_INITIAL[e.role] ?? "?";
          const roleColor = ROLE_COLOR[e.role] ?? "#8B919C";
          return (
            <button
              type="button"
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`relative text-left p-3 rounded-md border transition
                ${
                  sel
                    ? "border-white/45 bg-white/[0.04]"
                    : "border-white/10 hover:border-white/25"
                }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: roleColor, color: "#0B0D10" }}
                >
                  {roleTag}
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  #{e.id.slice(-4).toUpperCase()}
                </span>
                {sel && (
                  <span
                    className="ml-auto"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (isLead) return;
                      setLead(e.id);
                    }}
                    title={isLead ? "Лид" : "Лид болгох"}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isLead ? "text-white" : "text-white/30 hover:text-white/60"}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="text-[13px] font-medium leading-tight truncate">{e.fullName}</div>
              <div className="text-[11px] text-white/45 truncate">
                {e.profession ?? "—"}
              </div>
              {isLead && (
                <div className="absolute bottom-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-white">
                  Лид
                </div>
              )}
            </button>
          );
        })}
      </div>
      {picked.length > 0 && (
        <div className="text-[11px] text-white/40 mt-3">
          💡 Лид болгох хүний баруун дээд талын ✓ icon дээр товш
        </div>
      )}
    </div>
  );
}
