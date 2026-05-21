// Shared formatting helpers — server/client дээр аль алинд ажиллана

export const HOURS_PER_DAY = 8;
export const WD_SHORT = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
export const MO_LONG = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().replace("T", " ").slice(0, 16);
}

export function fmtMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000_000) return `₮${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `₮${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `₮${(v / 1_000).toFixed(0)}K`;
  return `₮${v}`;
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtAgo(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ц`;
  const d = Math.floor(h / 24);
  return `${d}ө`;
}

export function fmtAgoRelative(iso: string | null): string {
  if (!iso) return "—";
  const ago = fmtAgo(iso);
  return `${ago} өмнө`;
}

export function dateKey(d: Date | string): string {
  return fmtDate(d);
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function workDayLabel(d: Date): string {
  return WD_SHORT[d.getDay()];
}
