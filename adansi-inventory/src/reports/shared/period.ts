// src/reports/shared/period.ts
//
// Period/date helpers shared by the report pages.
// Extracted verbatim from ConsolidatedReport.tsx so other reports can reuse them.

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "ALL" | "CUSTOM";

export const QUARTER_MONTHS: Record<"Q1" | "Q2" | "Q3" | "Q4", [string, string]> = {
  Q1: ["01-01", "03-31"],
  Q2: ["04-01", "06-30"],
  Q3: ["07-01", "09-30"],
  Q4: ["10-01", "12-31"],
};

export const QUARTER_LABEL: Record<"Q1" | "Q2" | "Q3" | "Q4", string> = {
  Q1: "Q1 (Jan–Mar)",
  Q2: "Q2 (Apr–Jun)",
  Q3: "Q3 (Jul–Sep)",
  Q4: "Q4 (Oct–Dec)",
};

/** Normalise any Firestore date shape (ISO string, Timestamp, {seconds}) to YYYY-MM-DD. */
export function toISODate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : null;
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate().toISOString().slice(0, 10);
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString().slice(0, 10);
  }
  return null;
}

export interface Range {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
  label: string;
}

export function resolveRange(
  year: number,
  quarter: Quarter,
  customStart: string,
  customEnd: string
): Range {
  if (quarter === "ALL") return { start: "0000-01-01", end: "9999-12-31", label: "All time" };
  if (quarter === "CUSTOM") {
    return {
      start: customStart || "0000-01-01",
      end: customEnd || "9999-12-31",
      label: customStart && customEnd ? `${customStart} → ${customEnd}` : "Custom range",
    };
  }
  const [s, e] = QUARTER_MONTHS[quarter];
  return { start: `${year}-${s}`, end: `${year}-${e}`, label: `${QUARTER_LABEL[quarter]} ${year}` };
}

export function inRange(iso: string | null, r: Range): boolean {
  return !!iso && iso >= r.start && iso <= r.end;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One whole calendar month. `month` is 0-based, matching Date.getMonth().
 *
 * Day 0 of the next month is the last day of this one, so leap years need no
 * special case.
 */
export function monthRange(year: number, month: number): Range {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
    label: `${MONTH_NAMES[month]} ${year}`,
  };
}

/**
 * The most recent month that has finished.
 *
 * The sensible default for a monthly report: the current month is still
 * accruing, so reporting on it would understate whatever happens after today.
 */
export function lastCompletedMonth(now: Date = new Date()): Range {
  const month = now.getMonth();
  return month === 0 ? monthRange(now.getFullYear() - 1, 11) : monthRange(now.getFullYear(), month - 1);
}

/** The last `count` completed months, most recent first — for a period picker. */
export function recentMonths(count: number, now: Date = new Date()): Range[] {
  const months: Range[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthRange(d.getFullYear(), d.getMonth()));
  }
  return months;
}
