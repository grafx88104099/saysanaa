"use client";
import Panel from "./Panel";
import { fmtAgo } from "@/lib/format";

type Item = { id: string; action: string; label: string; actor: string; at: string };

export default function ActivityFeed({ items }: { items?: Item[] }) {
  return (
    <Panel title="Сүүлийн идэвх" hint={items ? `${items.length}` : ""}>
      <div className="h-full overflow-hidden">
        {!items && <div className="text-white/30 text-[12px]">Уншиж байна…</div>}
        {items && items.length === 0 && (
          <div className="text-white/30 text-[12px]">Идэвх алга</div>
        )}
        <ul className="divide-y divide-white/[0.06]">
          {items?.slice(0, 8).map((it) => (
            <li
              key={it.id}
              className="flex items-start gap-3 py-2.5 text-[13px]"
            >
              <div className="w-12 text-right tabular-nums text-white/35 text-[11px] pt-0.5">
                {fmtAgo(it.at)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  <span className="text-white">{it.actor || "—"}</span>{" "}
                  <span className="text-white/55">{it.label}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
