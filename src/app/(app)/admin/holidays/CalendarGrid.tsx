"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteHolidayAction,
  quickAddHolidayAction,
} from "./actions";
import { dateKey, fmtDate } from "@/lib/format";

type Holiday = { id: string; date: string; name: string };

const WD = ["Да", "Мя", "Лха", "Пү", "Ба", "Бя", "Ня"];
const MONTHS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

function buildMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const firstDow = (first.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarGrid({
  year,
  holidays,
  canManage,
}: {
  year: number;
  holidays: Holiday[];
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);

  const holidayMap = new Map<string, Holiday>();
  for (const h of holidays) holidayMap.set(h.date.slice(0, 10), h);

  const todayKey = dateKey(new Date());

  function onDelete(id: string, name: string) {
    if (!confirm(`"${name}" амралтыг устгах уу?`)) return;
    setPendingId(id);
    start(async () => {
      await deleteHolidayAction(id);
      setPendingId(null);
    });
  }

  function onCellClick(d: Date) {
    if (!canManage) return;
    const k = dateKey(d);
    const holiday = holidayMap.get(k);
    if (holiday) {
      onDelete(holiday.id, holiday.name);
      return;
    }
    setAddingDate(k);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const cells = buildMonth(year, m);
          const monthHolidays = holidays.filter((h) => {
            const d = new Date(h.date);
            return d.getFullYear() === year && d.getMonth() === m;
          });
          return (
            <div
              key={m}
              className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.015]"
            >
              <div className="flex items-baseline justify-between px-3 pt-3 pb-2">
                <div className="text-[12px] font-semibold tracking-tight">
                  {MONTHS[m]}
                </div>
                <div className="text-[10px] text-white/35 tabular-nums">
                  {monthHolidays.length > 0 ? `${monthHolidays.length} амралт` : ""}
                </div>
              </div>

              <div className="grid grid-cols-7 px-2 pb-1">
                {WD.map((w, i) => (
                  <div
                    key={i}
                    className={`text-center text-[9px] uppercase tracking-wider py-1 ${
                      i >= 5 ? "text-white/25" : "text-white/45"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                {cells.map((d, idx) => {
                  if (!d) return <div key={idx} className="h-7" />;
                  const k = dateKey(d);
                  const holiday = holidayMap.get(k);
                  const dow = (d.getDay() + 6) % 7;
                  const isWeekend = dow >= 5;
                  const isToday = k === todayKey;

                  let cellCls =
                    "relative h-7 flex items-center justify-center text-[11px] tabular-nums rounded transition";
                  if (holiday) {
                    cellCls +=
                      " bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/55";
                  } else if (isWeekend) {
                    cellCls += " text-white/25";
                  } else {
                    cellCls += " text-white/85";
                  }
                  if (canManage) cellCls += " cursor-pointer hover:bg-white/[0.05]";
                  if (isToday) cellCls += " ring-1 ring-white/55 ring-inset";

                  return (
                    <div
                      key={idx}
                      className={cellCls}
                      onClick={() => onCellClick(d)}
                      title={
                        holiday
                          ? `${holiday.name} — устгах товш`
                          : isWeekend
                          ? "Бямба/Ням — амралт"
                          : canManage
                          ? "Товшиж амралт нэмэх"
                          : ""
                      }
                      style={
                        pendingId === holiday?.id ? { opacity: 0.4 } : undefined
                      }
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>

              {monthHolidays.length > 0 && (
                <div className="border-t border-white/8 px-3 py-2 space-y-1">
                  {monthHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 text-[10px] group"
                    >
                      <span className="text-white/55 tabular-nums w-4 text-right">
                        {new Date(h.date).getDate()}
                      </span>
                      <span className="text-white/65 truncate flex-1" title={h.name}>
                        {h.name}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDelete(h.id, h.name)}
                          disabled={pending}
                          className="text-white/25 hover:text-white opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addingDate && (
        <AddHolidayDialog
          date={addingDate}
          onClose={() => setAddingDate(null)}
        />
      )}
    </>
  );
}

function AddHolidayDialog({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Нэр оруулна уу");
      return;
    }
    setErr(null);
    start(async () => {
      const r = await quickAddHolidayAction(date, trimmed);
      if (r && "error" in r) setErr(r.error!);
      else onClose();
    });
  }

  const d = new Date(date);
  const wd = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"][d.getDay()];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(420px,90vw)] bg-bg border border-white/15 rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-[11px] uppercase tracking-wider text-white/45 mb-1">
            Амралтын өдөр нэмэх
          </div>
          <div className="text-[16px] font-semibold tracking-tight">
            {fmtDate(date)}{" "}
            <span className="text-white/45 font-normal">· {wd}</span>
          </div>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="label">Амралтын нэр</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Жш: Шинэ жил"
              maxLength={80}
              className="input"
            />
          </div>
          {err && (
            <div className="text-[12px] text-white/80 border border-white/25 rounded-md px-3 py-2">
              {err}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="btn-ghost"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="btn-primary"
            >
              {pending ? "Нэмэж байна…" : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
