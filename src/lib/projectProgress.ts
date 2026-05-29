import { calcWorkDaysBetween } from "./calendar";

export type ProjectForProgress = {
  startDate: Date | null;
  endDate: Date | null;
  totalWorkDays: number;
  totalHours: number;
  progressPct: number;        // actual, from project
  phases: Array<{
    ordinal: number;
    name: string;
    hours: number;
    progressPct: number;
  }>;
};

export type ExpectedProgress = {
  expectedPct: number;          // 0..100
  actualPct: number;            // mirrored for convenience
  daysElapsed: number;
  daysTotal: number;
  daysLeft: number;             // working days from today to endDate (inclusive)
  // Difference vs schedule:
  delta: number;                // actualPct - expectedPct  (positive = ahead, negative = behind)
  status: "AHEAD" | "ON_TRACK" | "BEHIND" | "NOT_STARTED" | "OVERDUE" | "COMPLETED";
  // The phase that should be active today (by cumulative hours)
  currentPhase: {
    ordinal: number;
    name: string;
    indexInArray: number;
    phaseExpectedPct: number;   // how far into that phase we should be (0..100)
  } | null;
};

/**
 * Тухайн өдрийн байдлаар төслийн хүлээгдэх ахицыг тооцоолно.
 * Гол сэдэв: "өнөөдөр төсөл 53%-тай явж байх ёстой, одоо 3D Render фаз дээр байх ёстой" гэх.
 */
export function computeExpectedProgress(
  project: ProjectForProgress,
  holidayKeys: Set<string>,
  now: Date = new Date()
): ExpectedProgress {
  const empty: ExpectedProgress = {
    expectedPct: 0,
    actualPct: project.progressPct,
    daysElapsed: 0,
    daysTotal: 0,
    daysLeft: 0,
    delta: 0,
    status: "NOT_STARTED",
    currentPhase: null,
  };

  if (!project.startDate || !project.endDate) return empty;

  const start = new Date(project.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(project.endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Total working days from start to end (inclusive).
  const daysTotal = calcWorkDaysBetween(start, end, holidayKeys);
  if (daysTotal <= 0) return empty;

  // Days elapsed measured as **completed** working days. Start day → 0%, end of
  // start day → 1/total. We approximate by counting workdays strictly before
  // today (so start-day morning still shows 0%, not 1/total ≈ 5%).
  let daysElapsed = 0;
  if (today > start) {
    const dayBeforeToday = new Date(today);
    dayBeforeToday.setDate(dayBeforeToday.getDate() - 1);
    if (dayBeforeToday >= start) {
      const lastCompleted = dayBeforeToday < end ? dayBeforeToday : end;
      daysElapsed = calcWorkDaysBetween(start, lastCompleted, holidayKeys);
    }
  }
  if (today > end) daysElapsed = daysTotal;
  const daysLeft = today > end ? 0 : calcWorkDaysBetween(today, end, holidayKeys);

  const expectedPct = Math.max(0, Math.min(100, Math.round((daysElapsed / daysTotal) * 100)));
  const actualPct = project.progressPct;
  const delta = actualPct - expectedPct;

  let status: ExpectedProgress["status"];
  if (actualPct >= 100) status = "COMPLETED";
  else if (today < start) status = "NOT_STARTED";
  else if (today > end && actualPct < 100) status = "OVERDUE";
  else if (delta >= 5) status = "AHEAD";
  else if (delta <= -5) status = "BEHIND";
  else status = "ON_TRACK";

  // Determine the phase that should be active today by cumulative hours
  // (distributes phases proportionally over the working-days span).
  let currentPhase: ExpectedProgress["currentPhase"] = null;
  const totalH = project.phases.reduce((s, p) => s + p.hours, 0);
  if (totalH > 0 && project.phases.length > 0) {
    const expectedHoursElapsed = (expectedPct / 100) * totalH;
    let cum = 0;
    for (let i = 0; i < project.phases.length; i++) {
      const ph = project.phases[i];
      const prevCum = cum;
      cum += ph.hours;
      if (expectedHoursElapsed <= cum || i === project.phases.length - 1) {
        const intoPhase = ph.hours > 0
          ? Math.max(0, Math.min(100, Math.round(((expectedHoursElapsed - prevCum) / ph.hours) * 100)))
          : 0;
        currentPhase = {
          ordinal: ph.ordinal,
          name: ph.name,
          indexInArray: i,
          phaseExpectedPct: intoPhase,
        };
        break;
      }
    }
  }

  return {
    expectedPct,
    actualPct,
    daysElapsed,
    daysTotal,
    daysLeft,
    delta,
    status,
    currentPhase,
  };
}

export const STATUS_LABEL: Record<ExpectedProgress["status"], string> = {
  NOT_STARTED: "Эхлээгүй",
  ON_TRACK: "Хуваарьт",
  AHEAD: "Урагшилсан",
  BEHIND: "Хоцорсон",
  OVERDUE: "Хугацаа өнгөрсөн",
  COMPLETED: "Дууссан",
};

export const STATUS_COLOR: Record<ExpectedProgress["status"], string> = {
  NOT_STARTED: "#6B7390",
  ON_TRACK: "#6AA6FF",
  AHEAD: "#22C55E",
  BEHIND: "#F59E0B",
  OVERDUE: "#EF4444",
  COMPLETED: "#22C55E",
};
