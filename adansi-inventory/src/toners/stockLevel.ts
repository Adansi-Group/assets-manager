// src/toners/stockLevel.ts
//
// When is a toner low enough to reorder?
//
// The answer is an ABSOLUTE number of cartridges, not a percentage of what was
// originally bought. The percentage rule this replaces called three cartridges
// out of an original four "Good" — 75% — which is precisely the case that needs
// flagging: three left is three left, however many there once were.
//
// Pure: no React, no Firestore. The service applies it on read so every screen
// and every report agrees on what "low" means.

import type { Toner } from "../types/toner";

export type TonerStockStatus = "Good" | "Warning" | "Critical";

/** Cartridges. Alert when stock falls to this many or fewer. */
export const DEFAULT_TONER_REORDER_LEVEL = 3;

/**
 * The warning band sits between the reorder level and twice it, so there is a
 * heads-up before the situation is urgent — derived from the one configured
 * number rather than a second setting to keep in step.
 */
const WARNING_MULTIPLE = 2;

/**
 * A usable reorder level from whatever is stored in settings.
 *
 * Zero is meaningful — it means "only tell me when a toner is actually empty" —
 * so it is kept, while negatives and nonsense fall back to the default.
 */
export function normaliseReorderLevel(value: number | null | undefined): number {
  if (value === null || value === undefined) return DEFAULT_TONER_REORDER_LEVEL;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TONER_REORDER_LEVEL;
  // Floor, so a level of 3.7 does not quietly start alerting at 3.
  return Math.floor(n);
}

export function tonerStatus(quantity: number, reorderLevel: number): TonerStockStatus {
  const level = normaliseReorderLevel(reorderLevel);
  const left = Number.isFinite(quantity) ? quantity : 0;

  if (left <= level) return "Critical";
  if (left <= level * WARNING_MULTIPLE) return "Warning";
  return "Good";
}

/** True when this toner is at or below the reorder level. */
export function isLowToner(toner: Pick<Toner, "quantity">, reorderLevel: number): boolean {
  return tonerStatus(toner.quantity, reorderLevel) === "Critical";
}

/**
 * Every toner needing a reorder, emptiest first.
 *
 * The order is the point: the banner should lead with what has actually run out
 * rather than whatever happens to sort first alphabetically.
 */
export function lowToners<T extends Pick<Toner, "quantity" | "location">>(
  toners: T[],
  reorderLevel: number
): T[] {
  return toners
    .filter(t => isLowToner(t, reorderLevel))
    .sort(
      (a, b) =>
        (Number(a.quantity) || 0) - (Number(b.quantity) || 0) ||
        (a.location ?? "").localeCompare(b.location ?? "")
    );
}
