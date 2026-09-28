import { describe, expect, it } from "vitest";
import { replacementIntervals } from "./replacementIntervals";
import type { TonerReplacement } from "../../types/toner";

const replacement = (
  id: string,
  dateReplaced: string,
  over: Partial<TonerReplacement> = {}
): TonerReplacement => ({
  id,
  tonerId: "p1",
  location: "Head Office",
  printerType: "HP LaserJet",
  colorType: "Black",
  dateChecked: dateReplaced,
  dateReplaced,
  previousPercentage: 5,
  currentPercentage: 100,
  createdAt: dateReplaced,
  ...over,
});

describe("replacementIntervals", () => {
  it("does not invent a gap from a single replacement", () => {
    expect(replacementIntervals([replacement("r1", "2026-01-01")])).toEqual([]);
  });

  it("measures the gap between two replacements at the same printer", () => {
    const intervals = replacementIntervals([
      replacement("r1", "2026-01-01"),
      replacement("r2", "2026-01-31"),
    ]);

    expect(intervals).toEqual([30]);
  });

  it("keeps two printers that share a pooled cartridge apart, rather than averaging across them", () => {
    // Both printers take the same cartridge and colour, but they are two
    // different printer slots. Mixing their dates (day 0, 5, 10) would
    // produce two 5-day gaps instead of the one real 10-day gap.
    const intervals = replacementIntervals([
      replacement("r1", "2026-01-01", { printerType: "HP LaserJet", tonerType: "415A" }),
      replacement("r2", "2026-01-11", { printerType: "HP LaserJet", tonerType: "415A" }),
      replacement("r3", "2026-01-06", { printerType: "Canon iR2004", tonerType: "415A" }),
    ]);

    expect(intervals).toEqual([10]);
  });

  it("still groups by printer slot when tonerType is missing on the record", () => {
    const intervals = replacementIntervals([
      replacement("r1", "2026-02-01", { tonerType: undefined }),
      replacement("r2", "2026-02-15", { tonerType: undefined }),
      replacement("r3", "2026-02-04", { printerType: "Canon iR2004", tonerType: undefined }),
    ]);

    // r1/r2 share a slot (14-day gap); r3 is a different printer with only
    // one date, so it contributes no gap of its own.
    expect(intervals).toEqual([14]);
  });

  it("treats location, room and colour as part of the slot, not just the printer type", () => {
    const intervals = replacementIntervals([
      replacement("r1", "2026-03-01", { room: "Front Desk" }),
      replacement("r2", "2026-03-11", { room: "Back Office" }),
    ]);

    expect(intervals).toEqual([]);
  });
});
