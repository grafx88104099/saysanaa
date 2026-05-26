import type { TimeKind } from "@prisma/client";

export const TIME_KIND_LABEL: Record<TimeKind, string> = {
  WORK: "Ажилласан",
  CLIENT_WAIT: "Захиалагч хүлээсэн",
  REVISION: "Засвар",
};

export const TIME_KIND_COLOR: Record<TimeKind, string> = {
  WORK: "#22C55E",
  CLIENT_WAIT: "#6AA6FF",
  REVISION: "#F59E0B",
};

export const TIME_KIND_ICON: Record<TimeKind, string> = {
  WORK: "⏱",
  CLIENT_WAIT: "⌛",
  REVISION: "↻",
};

/** Pretty hours: 0.5 -> "30мин", 1 -> "1ц", 2.5 -> "2.5ц" */
export function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}м`;
  if (Math.abs(h - Math.round(h)) < 0.05) return `${Math.round(h)}ц`;
  return `${h.toFixed(1)}ц`;
}

/** Local YYYY-MM-DD */
export function isoDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get Monday of week containing date */
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
