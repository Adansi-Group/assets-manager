// src/reports/shared/replacementIntervals.ts
//
// Days between consecutive toner replacements at the same printer.
//
// "Average toner usage duration" answers how long ONE printer's cartridge
// lasts, so replacements are grouped by printer slot — location, room,
// printer model and colour — not by cartridge type. Two printers that share
// the same pooled cartridge are still two separate slots: mixing their
// replacement dates would average unrelated intervals into a number that
// describes neither printer.
//
// Cartridge pooling did not change this grouping. `TonerReplacement.tonerType`
// is optional and can be missing on older records; the key deliberately does
// not use it, so those records still group correctly by printer slot.
//
// Used by both the consumables report and the station report so there is one
// definition of what a "duration" is.
//
// Pure: no React, no Firestore.

import type { TonerReplacement } from "../../types/toner";

const DAY_MS = 86_400_000;

const validDate = (value?: string) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

/** One printer slot: where it sits, what it is, what colour. */
function slotKey(item: TonerReplacement): string {
  return [item.location, item.room, item.printerType, item.colorType]
    .map(v => v?.trim().toLowerCase() ?? "")
    .join("|");
}

/**
 * Day-gaps between consecutive replacements within each printer slot, across
 * every slot present in `replacements`. A slot with only one replacement
 * contributes no interval — one date cannot measure a gap.
 */
export function replacementIntervals(replacements: TonerReplacement[]): number[] {
  const groups = new Map<string, number[]>();
  for (const item of replacements) {
    const at = validDate(item.dateReplaced);
    if (at === null) continue;
    const key = slotKey(item);
    groups.set(key, [...(groups.get(key) ?? []), at]);
  }

  const intervals: number[] = [];
  for (const times of groups.values()) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      intervals.push(Math.max(0, Math.round((times[i] - times[i - 1]) / DAY_MS)));
    }
  }
  return intervals;
}
