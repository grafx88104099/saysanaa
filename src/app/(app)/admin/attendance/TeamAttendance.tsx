"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_SHORT,
  LEAVE_TYPE_LABEL,
} from "@/lib/attendance";
import {
  approveLeaveAction,
  recordAttendanceAction,
} from "@/app/(app)/me/attendance/actions";
import type { AttendanceStatus, LeaveType } from "@prisma/client";

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

type Employee = { id: string; fullName: string; photoUrl: string | null; role: string };
type AttCell = { id: string; status: string; hoursWorked: number | null };
type PendingLeave = {
  id: string;
  employeeId: string;
  employeeName: string;
  photoUrl: string | null;
  fromDate: string;
  toDate: string;
  type: LeaveType;
  reason: string | null;
  createdAt: string;
};

export default function TeamAttendance({
  monthKey,
  year,
  month,
  workDayMap,
  employees,
  attendanceByEmp,
  pendingLeaves,
}: {
  monthKey: string;
  year: number;
  month: number;
  workDayMap: Record<string, boolean>;
  employees: Employee[];
  attendanceByEmp: Record<string, Record<string, AttCell>>;
  pendingLeaves: PendingLeave[];
}) {
  const days = useMemo(() => {
    const last = new Date(year, month, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const d = new Date(year, month - 1, i + 1);
      const iso = isoDate(d);
      return {
        iso,
        dayNum: i + 1,
        wd: (d.getDay() + 6) % 7,
        isWork: workDayMap[iso] ?? false,
      };
    });
  }, [year, month, workDayMap]);

  const [editing, setEditing] = useState<{ empId: string; iso: string } | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">Багийн ирц</h1>
          <p className="text-sub text-[12px] mt-1">
            {year} оны {MONTH_NAME[month - 1]} · {employees.length} ажилтан
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/attendance?month=${monthShift(monthKey, -1)}`} className="btn-ghost h-9">←</Link>
          <Link href="/admin/attendance" className="btn-ghost h-9 px-3">Энэ сар</Link>
          <Link href={`/admin/attendance?month=${monthShift(monthKey, 1)}`} className="btn-ghost h-9">→</Link>
        </div>
      </div>

      {/* Pending leave requests */}
      {pendingLeaves.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[13px] font-semibold text-tx mb-2 flex items-center gap-2">
            ⏳ Хүлээж буй чөлөөний хүсэлт
            <span className="text-sub font-normal">· {pendingLeaves.length}</span>
          </h2>
          <div className="space-y-2">
            {pendingLeaves.map((l) => (
              <PendingLeaveRow key={l.id} leave={l} />
            ))}
          </div>
        </section>
      )}

      {/* Attendance matrix */}
      <div className="panel overflow-x-auto">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="border-b border-bd">
              <th className="text-left px-3 py-2 sticky left-0 bg-surf2 z-10 font-medium text-sub uppercase tracking-wider min-w-[200px]">
                Ажилтан
              </th>
              {days.map((d) => (
                <th
                  key={d.iso}
                  className={`px-1.5 py-2 text-center font-medium tabular-nums ${
                    !d.isWork ? "text-sub/50" : "text-sub"
                  }`}
                  style={{ minWidth: 28 }}
                >
                  {d.dayNum}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium text-sub uppercase tracking-wider">
                Нийт
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const cells = attendanceByEmp[emp.id] ?? {};
              const totalHours = Object.values(cells).reduce(
                (s, c) => s + (c.hoursWorked ?? 0),
                0
              );
              return (
                <tr key={emp.id} className="border-t border-bd/40">
                  <td className="px-3 py-1.5 sticky left-0 bg-surf z-10">
                    <div className="flex items-center gap-2">
                      {emp.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={emp.photoUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-bd"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-bd flex items-center justify-center text-[9px]">
                          {emp.fullName
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                      <span className="truncate text-tx text-[12px]">{emp.fullName}</span>
                    </div>
                  </td>
                  {days.map((d) => {
                    const c = cells[d.iso];
                    const status = c?.status as AttendanceStatus | undefined;
                    const color = status ? ATTENDANCE_STATUS_COLOR[status] : null;
                    return (
                      <td key={d.iso} className="p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => setEditing({ empId: emp.id, iso: d.iso })}
                          className={`w-full h-7 rounded text-[10px] font-bold border transition ${
                            status
                              ? "border-transparent"
                              : d.isWork
                              ? "border-bd hover:border-brand/40"
                              : "border-bd/30"
                          }`}
                          style={color ? { background: `${color}33`, color } : undefined}
                          title={status ? ATTENDANCE_STATUS_LABEL[status] : d.iso}
                        >
                          {status ? ATTENDANCE_STATUS_SHORT[status] : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right tabular-nums text-success font-semibold">
                    {totalHours.toFixed(0)}ц
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="text-center py-8 text-sub">
                  Ажилтан байхгүй
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        {(["PRESENT", "LATE", "REMOTE", "LEAVE", "SICK", "ABSENT", "HOLIDAY"] as AttendanceStatus[]).map(
          (s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border"
              style={{
                color: ATTENDANCE_STATUS_COLOR[s],
                borderColor: `${ATTENDANCE_STATUS_COLOR[s]}40`,
                background: `${ATTENDANCE_STATUS_COLOR[s]}1A`,
              }}
            >
              <span className="font-bold">{ATTENDANCE_STATUS_SHORT[s]}</span>
              <span>{ATTENDANCE_STATUS_LABEL[s]}</span>
            </span>
          )
        )}
      </div>

      {editing && (
        <QuickEdit
          employeeId={editing.empId}
          date={editing.iso}
          existing={attendanceByEmp[editing.empId]?.[editing.iso] ?? null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PendingLeaveRow({ leave }: { leave: PendingLeave }) {
  const [pending, start] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approve = () => {
    start(async () => {
      await approveLeaveAction(leave.id, "APPROVED");
    });
  };
  const reject = () => {
    start(async () => {
      await approveLeaveAction(leave.id, "REJECTED", rejectReason || null);
      setShowReject(false);
    });
  };

  return (
    <div className="panel p-3">
      <div className="flex items-center gap-3">
        {leave.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={leave.photoUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-bd"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-bd flex items-center justify-center text-[10px]">
            {leave.employeeName
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-tx truncate">
            {leave.employeeName}{" "}
            <span className="text-sub">
              · {LEAVE_TYPE_LABEL[leave.type]} · {leave.fromDate}
              {leave.toDate !== leave.fromDate && ` → ${leave.toDate}`}
            </span>
          </div>
          {leave.reason && (
            <div className="text-[11px] text-sub mt-0.5 truncate">«{leave.reason}»</div>
          )}
        </div>
        <button
          onClick={approve}
          disabled={pending}
          className="btn-success h-8 px-3"
        >
          ✓ Зөвшөөрөх
        </button>
        <button
          onClick={() => setShowReject((v) => !v)}
          disabled={pending}
          className="btn-danger h-8 px-3"
        >
          ✕ Татгалзах
        </button>
      </div>
      {showReject && (
        <div className="mt-3 flex gap-2 items-center">
          <input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Татгалзсан шалтгаан (заавал биш)"
            className="input h-8 text-[12px] flex-1"
          />
          <button
            onClick={reject}
            disabled={pending}
            className="btn-danger h-8 px-3 text-[12px]"
          >
            Илгээх
          </button>
        </div>
      )}
    </div>
  );
}

function QuickEdit({
  employeeId,
  date,
  existing,
  onClose,
}: {
  employeeId: string;
  date: string;
  existing: AttCell | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(
    (existing?.status as AttendanceStatus) ?? "PRESENT"
  );
  const [hours, setHours] = useState<string>(existing?.hoursWorked?.toString() ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("date", date);
    fd.set("status", status);
    if (hours) fd.set("hoursWorked", hours);
    start(async () => {
      const r = await recordAttendanceAction(undefined, fd);
      if (r?.ok) onClose();
      else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel max-w-[360px] w-full p-4">
        <div className="mb-3 text-[13px] font-semibold text-tx">{date}</div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {(["PRESENT", "LATE", "REMOTE", "LEAVE", "SICK", "ABSENT", "HOLIDAY"] as AttendanceStatus[]).map(
            (s) => {
              const sel = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`h-9 rounded text-[10px] font-bold border transition ${
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
        <div className="mb-3">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Цаг (заавал биш)
          </label>
          <input
            type="number"
            step="0.5"
            min={0}
            max={24}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="8"
            className="input h-9 text-[12px] text-center tabular-nums"
          />
        </div>
        {error && (
          <div className="text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1 mb-2">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost h-8 px-3">Цуцлах</button>
          <button onClick={submit} disabled={pending} className="btn-primary h-8 px-3">
            {pending ? "..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
