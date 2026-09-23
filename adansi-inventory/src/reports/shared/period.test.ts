import { describe, expect, it } from "vitest";
import { inRange, lastCompletedMonth, monthRange, resolveRange, toISODate } from "./period";

describe("toISODate", () => {
  it("reads an ISO string", () => {
    expect(toISODate("2026-04-15")).toBe("2026-04-15");
    expect(toISODate("2026-04-15T11:55:03.291Z")).toBe("2026-04-15");
  });

  it("reads a Firestore Timestamp", () => {
    const ts = { toDate: () => new Date("2026-04-15T00:00:00.000Z") };
    expect(toISODate(ts)).toBe("2026-04-15");
  });

  it("reads a raw {seconds} shape", () => {
    expect(toISODate({ seconds: Date.UTC(2026, 3, 15) / 1000 })).toBe("2026-04-15");
  });

  it("returns null for absent or unusable values", () => {
    expect(toISODate(null)).toBeNull();
    expect(toISODate(undefined)).toBeNull();
    expect(toISODate("")).toBeNull();
    expect(toISODate("2026")).toBeNull();
    expect(toISODate(42)).toBeNull();
  });
});

describe("resolveRange", () => {
  it("bounds a quarter inclusively", () => {
    expect(resolveRange(2026, "Q2", "", "")).toEqual({
      start: "2026-04-01",
      end: "2026-06-30",
      label: "Q2 (Apr–Jun) 2026",
    });
  });

  it("spans everything for ALL", () => {
    const r = resolveRange(2026, "ALL", "", "");
    expect(r.label).toBe("All time");
    expect(r.start).toBe("0000-01-01");
    expect(r.end).toBe("9999-12-31");
  });

  it("falls back to an open range when CUSTOM is only half-filled", () => {
    const r = resolveRange(2026, "CUSTOM", "", "");
    expect(r.start).toBe("0000-01-01");
    expect(r.end).toBe("9999-12-31");
    expect(r.label).toBe("Custom range");
  });

  it("labels a fully-specified custom range", () => {
    expect(resolveRange(2026, "CUSTOM", "2026-01-05", "2026-02-10").label).toBe(
      "2026-01-05 → 2026-02-10"
    );
  });
});

describe("inRange", () => {
  const q2 = resolveRange(2026, "Q2", "", "");

  it("includes both boundaries", () => {
    expect(inRange("2026-04-01", q2)).toBe(true);
    expect(inRange("2026-06-30", q2)).toBe(true);
  });

  it("excludes the days either side", () => {
    expect(inRange("2026-03-31", q2)).toBe(false);
    expect(inRange("2026-07-01", q2)).toBe(false);
  });

  it("excludes undated records", () => {
    // Devices with no purchaseDate must not silently land in a period.
    expect(inRange(null, q2)).toBe(false);
  });

  it("includes everything dated in an ALL range", () => {
    const all = resolveRange(2026, "ALL", "", "");
    expect(inRange("1999-01-01", all)).toBe(true);
    expect(inRange(null, all)).toBe(false);
  });
});

describe("monthRange", () => {
  it("covers a whole calendar month and names it", () => {
    expect(monthRange(2026, 7)).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
      label: "August 2026",
    });
  });

  it("ends February on the 28th in a common year", () => {
    expect(monthRange(2026, 1).end).toBe("2026-02-28");
  });

  it("ends February on the 29th in a leap year", () => {
    expect(monthRange(2024, 1).end).toBe("2024-02-29");
  });
});

describe("lastCompletedMonth", () => {
  it("returns the month before the given date", () => {
    expect(lastCompletedMonth(new Date("2026-09-10")).label).toBe("August 2026");
  });

  it("rolls back across the new year", () => {
    expect(lastCompletedMonth(new Date("2026-01-05")).label).toBe("December 2025");
  });
});
