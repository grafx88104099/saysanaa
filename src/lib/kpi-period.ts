import type { KpiPeriodType } from "@prisma/client";

/** parse "2026-05" / "2026-Q2" / "2026" → [start, endExclusive] in UTC */
export function periodKeyToRange(
  type: KpiPeriodType,
  key: string
): { start: Date; end: Date } | null {
  if (type === "MONTH") {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1]),
      mo = parseInt(m[2]) - 1;
    if (mo < 0 || mo > 11) return null;
    return {
      start: new Date(Date.UTC(y, mo, 1)),
      end: new Date(Date.UTC(y, mo + 1, 1)),
    };
  }
  if (type === "QUARTER") {
    const m = key.match(/^(\d{4})-Q([1-4])$/);
    if (!m) return null;
    const y = parseInt(m[1]),
      q = parseInt(m[2]);
    const startMo = (q - 1) * 3;
    return {
      start: new Date(Date.UTC(y, startMo, 1)),
      end: new Date(Date.UTC(y, startMo + 3, 1)),
    };
  }
  if (type === "YEAR") {
    const m = key.match(/^(\d{4})$/);
    if (!m) return null;
    const y = parseInt(m[1]);
    return {
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y + 1, 0, 1)),
    };
  }
  return null;
}

export function currentPeriodKey(type: KpiPeriodType, d: Date = new Date()): string {
  const y = d.getFullYear();
  if (type === "YEAR") return String(y);
  if (type === "QUARTER") return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function listRecentPeriodKeys(type: KpiPeriodType, count: number = 12): string[] {
  const today = new Date();
  const out: string[] = [];
  if (type === "MONTH") {
    for (let i = 0; i < count; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push(currentPeriodKey("MONTH", d));
    }
  } else if (type === "QUARTER") {
    for (let i = 0; i < count; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i * 3, 1);
      out.push(currentPeriodKey("QUARTER", d));
    }
  } else {
    for (let i = 0; i < count; i++) {
      out.push(currentPeriodKey("YEAR", new Date(today.getFullYear() - i, 0, 1)));
    }
  }
  return out;
}

export function formatPeriodLabel(type: KpiPeriodType, key: string): string {
  if (type === "MONTH") {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return key;
    const months = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
                    "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
    return `${m[1]} оны ${months[parseInt(m[2]) - 1]}`;
  }
  if (type === "QUARTER") {
    const m = key.match(/^(\d{4})-Q([1-4])$/);
    if (!m) return key;
    return `${m[1]} оны ${m[2]}-р улирал`;
  }
  return `${key} он`;
}
