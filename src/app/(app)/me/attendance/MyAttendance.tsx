"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_SHORT,
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
} from "@/lib/attendance";
import {
  recordAttendanceAction,
  requestLeaveAction,
  cancelOwnLeaveAction,
  deleteAttendanceAction,
} from "./actions";
import type { AttendanceStatus, LeaveStatus, LeaveType } from "@prisma/client";

type Entry = {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  hoursWorked: number | null;
  note: string | null;
};
type Leave = {
  id: string;
  fromDate: string;
  toDate: string;
  type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  rejectedReason: string | null;
  createdAt: string;
};

const WD = ["Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям", "Ням"];
const MONTH_NAME = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthShift(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MyAttendance({
  employeeId,
  employeeName,
  monthKey,
  year,
  month,
  workDayMap,
  entries,
  leaves,
}: {
  employeeId: string;
  employeeName: string;
  monthKey: string;
  year: number;
  month: number;
  workDayMap: Record<string, boolean>;
  entries: Entry[];
  leaves: Leave[];
}) {
  const entriesByDate = useMemo(() => {
    const m: Record<string, Entry> = {};
    for (const e of entries) m[e.date] = e;
    return m;
  }, [entries]);

  // Build the day grid for this month
  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const out: { iso: string; dayNum: number; wd: number; isWork: boolean; entry?: Entry }[] = [];
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month - 1, d);
      const iso = isoDate(date);
      out.push({
        iso,
        dayNum: d,
        wd: (date.getDay() + 6) % 7,  // 0=Mon..6=Sun
        isWork: workDayMap[iso] ?? false,
        entry: entriesByDate[iso],
      });
    }
    return out;
  }, [year, month, workDayMap, entriesByDate]);

  // Totals
  const totals = useMemo(() => {
    let workedDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let sickDays = 0;
    let leaveDays = 0;
    let remoteDays = 0;
    let hours = 0;
    for (const c of cells) {
      const s = c.entry?.status;
      if (s === "PRESENT") workedDays++;
      else if (s === "LATE") { workedDays++; lateDays++; }
      else if (s === "REMOTE") { workedDays++; remoteDays++; }
      else if (s === "ABSENT") absentDays++;
      else if (s === "SICK") sickDays++;
      else if (s === "LEAVE") leaveDays++;
      hours += c.entry?.hoursWorked ?? 0;
    }
    return { workedDays, lateDays, absentDays, sickDays, leaveDays, remoteDays, hours };
  }, [cells]);

  const [editing, setEditing] = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">Миний ирц</h1>
          <p className="text-sub text-[12px] mt-1">
            {employeeName} · {year} оны {MONTH_NAME[month - 1]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/me/attendance?month=${monthShift(monthKey, -1)}`} className="btn-ghost h-9">←</Link>
          <Link href="/me/attendance" className="btn-ghost h-9 px-3">Энэ сар</Link>
          <Link href={`/me/attendance?month=${monthShift(monthKey, 1)}`} className="btn-ghost h-9">→</Link>
        </div>
      </div>

      {/* Totals tiles */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <Tile label="Ажилласан өдөр" value={`${totals.workedDays}`} color="#22C55E" />
        <Tile label="Хоцорсон" value={`${totals.lateDays}`} color="#FBBF24" />
        <Tile label="Зайнаас" value={`${totals.remoteDays}`} color="#22D3EE" />
        <Tile label="Чөлөө" value={`${totals.leaveDays}`} color="#6AA6FF" />
        <Tile label="Өвчтэй" value={`${totals.sickDays}`} color="#F472B6" />
        <Tile label="Нийт цаг" value={`${totals.hours.toFixed(1)}ц`} />
      </div>

      {/* Calendar grid */}
      <div className="panel p-4 mb-6">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WD.map((d) => (
            <div key={d} className="text-[10px] uppercase tracking-wider text-sub text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty pads before first day */}
          {Array.from({ length: cells[0]?.wd ?? 0 }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {cells.map((c) => (
            <DayCell
              key={c.iso}
              cell={c}
              onClick={() => setEditing(c.iso)}
            />
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <EditDay
          employeeId={employeeId}
          date={editing}
          entry={entriesByDate[editing]}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Leaves section */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-tx">
            Чөлөөний хүсэлт <span className="text-sub font-normal">· {leaves.length}</span>
          </h2>
          <button
            onClick={() => setShowLeaveForm((v) => !v)}
            className={showLeaveForm ? "btn-ghost h-8 px-3" : "btn-primary h-8 px-3"}
          >
            {showLeaveForm ? "Хаах" : "+ Шинэ хүсэлт"}
          </button>
        </div>

        {showLeaveForm && (
          <LeaveForm onDone={() => setShowLeaveForm(false)} />
        )}

        {leaves.length === 0 ? (
          <div className="text-sub text-[12px] panel p-6 text-center">
            Хүсэлт алга
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Хугацаа</th>
                  <th className="text-left px-3 py-2 font-medium">Төрөл</th>
                  <th className="text-left px-3 py-2 font-medium">Шалтгаан</th>
                  <th className="text-center px-3 py-2 font-medium">Төлөв</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <LeaveRow key={l.id} leave={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DayCell({
  cell,
  onClick,
}: {
  cell: { iso: string; dayNum: number; wd: number; isWork: boolean; entry?: Entry };
  onClick: () => void;
}) {
  const isWeekend = cell.wd >= 5;
  const today = new Date().toISOString().slice(0, 10) === cell.iso;
  const status = cell.entry?.status;
  const color = status ? ATTENDANCE_STATUS_COLOR[status] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded border text-left transition px-2 py-1.5 ${
        today ? "border-brand/60 shadow-[0_0_12px_rgba(106,166,255,0.20)]" : "border-bd"
      } ${!cell.isWork && !status ? "opacity-50" : ""} hover:border-brand/40`}
      style={color ? { background: `${color}1A` } : undefined}
    >
      <div className={`text-[11px] tabular-nums ${isWeekend ? "text-sub" : "text-tx"}`}>
        {cell.dayNum}
      </div>
      {status && color && (
        <div
          className="absolute bottom-1 right-1.5 text-[10px] font-bold"
          style={{ color }}
        >
          {ATTENDANCE_STATUS_SHORT[status]}
        </div>
      )}
      {cell.entry?.hoursWorked != null && (
        <div className="absolute bottom-1 left-1.5 text-[9px] tabular-nums text-sub">
          {cell.entry.hoursWorked}ц
        </div>
      )}
    </button>
  );
}

function EditDay({
  employeeId,
  date,
  entry,
  onClose,
}: {
  employeeId: string;
  date: string;
  entry?: Entry;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(entry?.status ?? "PRESENT");
  const [checkIn, setCheckIn] = useState(entry?.checkInAt ?? "09:00");
  const [checkOut, setCheckOut] = useState(entry?.checkOutAt ?? "18:00");
  const [hours, setHours] = useState<string>(entry?.hoursWorked?.toString() ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("date", date);
    fd.set("status", status);
    // For non-working statuses (LEAVE/SICK/ABSENT/HOLIDAY), do NOT send check
    // in/out or hours — even if the input still has stale values from a prior
    // PRESENT state. Server also enforces this, but stripping client-side
    // prevents the network payload from carrying confusing fields.
    const isWorking = status === "PRESENT" || status === "LATE" || status === "REMOTE";
    if (isWorking) {
      fd.set("checkInAt", checkIn);
      fd.set("checkOutAt", checkOut);
      if (hours) fd.set("hoursWorked", hours);
    }
    fd.set("note", note);
    start(async () => {
      const r = await recordAttendanceAction(undefined, fd);
      if (r?.ok) onClose();
      else setError(r?.error ?? "Алдаа");
    });
  };

  const remove = () => {
    if (!entry) return onClose();
    if (!confirm("Энэ өдрийн бүртгэлийг устгах уу?")) return;
    start(async () => {
      const r = await deleteAttendanceAction(entry.id);
      if (r?.ok) onClose();
      else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel max-w-[420px] w-full p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-tx">{date}</h2>
            <p className="text-[11px] text-sub">Ирцийн бүртгэл</p>
          </div>
          {entry && (
            <button onClick={remove} className="text-[11px] text-dangerInk hover:underline">
              ✕ Устгах
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Төлөв</label>
            <div className="grid grid-cols-7 gap-1">
              {(["PRESENT", "LATE", "REMOTE", "LEAVE", "SICK", "ABSENT", "HOLIDAY"] as AttendanceStatus[]).map(
                (s) => {
                  const sel = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`h-9 rounded text-[10px] font-semibold border transition ${
                        sel ? "text-white border-transparent" : "border-bd text-sub hover:text-tx"
                      }`}
                      style={sel ? { background: ATTENDANCE_STATUS_COLOR[s] } : undefined}
                      title={ATTENDANCE_STATUS_LABEL[s]}
                    >
                      {ATTENDANCE_STATUS_SHORT[s]}
                    </button>
                  );
                }
              )}
            </div>
            <div className="text-[10px] text-sub mt-1.5">{ATTENDANCE_STATUS_LABEL[status]}</div>
          </div>

          {(status === "PRESENT" || status === "LATE" || status === "REMOTE") && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Ирсэн</label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="input h-9 text-[12px] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Явсан</label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="input h-9 text-[12px] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Цаг</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={24}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="auto"
                  className="input h-9 text-[12px] text-center tabular-nums"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Тэмдэглэл</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="заавал биш"
              className="input h-9 text-[12px]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-bd">
          <button onClick={onClose} className="btn-ghost h-9">Цуцлах</button>
          <button onClick={submit} disabled={pending} className="btn-primary h-9">
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveForm({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [type, setType] = useState<LeaveType>("VACATION");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("fromDate", fromDate);
    fd.set("toDate", toDate);
    fd.set("type", type);
    fd.set("reason", reason);
    start(async () => {
      const r = await requestLeaveAction(undefined, fd);
      if (r?.ok) {
        setReason("");
        onDone();
      } else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="panel p-4 mb-3 border-brand/30 bg-brand/[0.04]">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Эхлэх</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input h-9 text-[12px] [color-scheme:dark]"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Дуусах</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input h-9 text-[12px] [color-scheme:dark]"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Төрөл</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
            className="input h-9 text-[12px]"
          >
            {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
              <option key={t} value={t}>
                {LEAVE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-3 flex items-end gap-2">
          <button onClick={onDone} className="btn-ghost h-9 px-3">Цуцлах</button>
          <button onClick={submit} disabled={pending} className="btn-primary h-9 px-3">
            {pending ? "..." : "Илгээх"}
          </button>
        </div>
        <div className="col-span-12">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">Шалтгаан</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Заавал биш"
            className="input h-9 text-[12px]"
          />
        </div>
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}

function LeaveRow({ leave }: { leave: Leave }) {
  const [pending, start] = useTransition();
  const cancel = () => {
    if (!confirm("Хүсэлтийг цуцлах уу?")) return;
    start(async () => {
      await cancelOwnLeaveAction(leave.id);
    });
  };
  return (
    <tr className="border-t border-bd/40">
      <td className="px-3 py-2 tabular-nums">
        {leave.fromDate}{leave.fromDate !== leave.toDate ? ` → ${leave.toDate}` : ""}
      </td>
      <td className="px-3 py-2">{LEAVE_TYPE_LABEL[leave.type]}</td>
      <td className="px-3 py-2 truncate max-w-[260px] text-sub">{leave.reason ?? "—"}</td>
      <td className="px-3 py-2 text-center">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{
            color: LEAVE_STATUS_COLOR[leave.status],
            background: `${LEAVE_STATUS_COLOR[leave.status]}1A`,
            border: `1px solid ${LEAVE_STATUS_COLOR[leave.status]}40`,
          }}
        >
          {LEAVE_STATUS_LABEL[leave.status]}
        </span>
        {leave.status === "REJECTED" && leave.rejectedReason && (
          <div className="text-[10px] text-sub mt-1">{leave.rejectedReason}</div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {leave.status === "PENDING" && (
          <button
            onClick={cancel}
            disabled={pending}
            className="text-[11px] text-sub hover:text-dangerInk"
          >
            Цуцлах
          </button>
        )}
      </td>
    </tr>
  );
}

function Tile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
