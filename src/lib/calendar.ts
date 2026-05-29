import { prisma } from "./db";
import { HOURS_PER_DAY, dateKey, isWeekend } from "./format";

export { HOURS_PER_DAY };

const WORK_DAY_SAFETY_LIMIT = 5000;

// Монгол улсын 2026 оны баяр амралт (admin өөрөө сольж болно)
export const MN_HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "Шинэ жил" },
  { date: "2026-02-17", name: "Цагаан сар" },
  { date: "2026-02-18", name: "Цагаан сар" },
  { date: "2026-02-19", name: "Цагаан сар" },
  { date: "2026-03-08", name: "Эх үрсийн баяр" },
  { date: "2026-06-01", name: "Хүүхдийн баяр" },
  { date: "2026-07-11", name: "Үндэсний их баяр наадам" },
  { date: "2026-07-12", name: "Үндэсний их баяр наадам" },
  { date: "2026-07-13", name: "Үндэсний их баяр наадам" },
  { date: "2026-07-14", name: "Үндэсний их баяр наадам" },
  { date: "2026-07-15", name: "Үндэсний их баяр наадам" },
  { date: "2026-11-26", name: "Их Эзэн Чингис Хааны төрсөн өдөр" },
  { date: "2026-12-29", name: "Тусгаар тогтнолын өдөр" },
];

// re-export for backwards compat
export const toDateKey = dateKey;
export { isWeekend };

export function isWorkDay(d: Date, holidayKeys: Set<string>): boolean {
  if (isWeekend(d)) return false;
  return !holidayKeys.has(dateKey(d));
}

/**
 * Эхлэх огнооноос нийт цагт хүрэх хэрэгтэй ажлын өдрийн тоог тооцоолж дуусах огноог буцаана.
 * - 8 цагт нэг ажлын өдөр
 * - Бямба/Ням амарна
 * - holidayKeys-д бүртгэгдсэн огноо хасагдана
 */
export function calcEndDate(
  startDate: Date,
  totalHours: number,
  holidayKeys: Set<string>,
): Date | null {
  if (totalHours <= 0) return null;
  const daysNeeded = Math.ceil(totalHours / HOURS_PER_DAY);
  if (daysNeeded === 0) return null;

  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  let workDays = 0;
  // эхлэх огноо нь ажлын өдөр бол түүнийг хамруулна
  if (isWorkDay(cursor, holidayKeys)) workDays = 1;
  while (workDays < daysNeeded) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWorkDay(cursor, holidayKeys)) workDays++;
    if (workDays > WORK_DAY_SAFETY_LIMIT) break;
  }
  return cursor;
}

export function calcWorkDays(totalHours: number): number {
  return Math.ceil(totalHours / HOURS_PER_DAY);
}

/**
 * Эхлэх ба дуусах огнооны хооронд ажлын өдрийн тоог буцаана (хоёулангаар нь оруулна).
 */
export function calcWorkDaysBetween(
  startDate: Date,
  endDate: Date,
  holidayKeys: Set<string>,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) return 0;
  let count = 0;
  let safety = 0;
  const cursor = new Date(start);
  while (cursor <= end && safety < WORK_DAY_SAFETY_LIMIT) {
    if (isWorkDay(cursor, holidayKeys)) count++;
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }
  return count;
}

// In-memory cache (60 min TTL). Holidays нь маш ховор өөрчлөгддөг тул RAM-д хадгалах нь зүйтэй.
let HOLIDAY_CACHE: { ts: number; keys: Set<string> } | null = null;
const HOLIDAY_TTL_MS = 60 * 60 * 1000;

export async function loadHolidayKeys(): Promise<Set<string>> {
  if (HOLIDAY_CACHE && Date.now() - HOLIDAY_CACHE.ts < HOLIDAY_TTL_MS) {
    return HOLIDAY_CACHE.keys;
  }
  const rows = await prisma.holiday.findMany({ select: { date: true } });
  const keys = new Set(rows.map((r) => dateKey(r.date)));
  HOLIDAY_CACHE = { ts: Date.now(), keys };
  return keys;
}

export function invalidateHolidayCache() {
  HOLIDAY_CACHE = null;
}

/**
 * 7 хоногийн интервал доторх ажлын өдрүүдийг буцаана.
 */
export function workDaysInRange(
  start: Date,
  end: Date,
  holidayKeys: Set<string>,
): Date[] {
  const out: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    if (isWorkDay(cursor, holidayKeys)) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
