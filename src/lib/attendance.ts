import type { AttendanceStatus, LeaveType, LeaveStatus } from "@prisma/client";

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Ирээгүй",
  SICK: "Өвчтэй",
  LEAVE: "Чөлөө",
  REMOTE: "Зайнаас",
  HOLIDAY: "Амралт",
};

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "#22C55E",
  LATE: "#FBBF24",
  ABSENT: "#EF4444",
  SICK: "#F472B6",
  LEAVE: "#6AA6FF",
  REMOTE: "#22D3EE",
  HOLIDAY: "#6B7390",
};

export const ATTENDANCE_STATUS_SHORT: Record<AttendanceStatus, string> = {
  PRESENT: "И",
  LATE: "Х",
  ABSENT: "А",
  SICK: "Өв",
  LEAVE: "Чө",
  REMOTE: "З",
  HOLIDAY: "Б",
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  VACATION: "Ээлжийн амралт",
  SICK: "Өвчний чөлөө",
  UNPAID: "Цалингүй чөлөө",
  COMP: "Илүү цагийн нөхөн",
  MATERNITY: "Жирэмсний чөлөө",
  BEREAVEMENT: "Хүндэтгэлийн чөлөө",
  OTHER: "Бусад",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрсөн",
  REJECTED: "Татгалзсан",
  CANCELLED: "Цуцалсан",
};

export const LEAVE_STATUS_COLOR: Record<LeaveStatus, string> = {
  PENDING: "#FBBF24",
  APPROVED: "#22C55E",
  REJECTED: "#EF4444",
  CANCELLED: "#6B7390",
};

/** YYYY-MM-DD */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns days in a given month (1-31). */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** Current month key "2026-05" */
export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1]);
  const month = parseInt(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}
