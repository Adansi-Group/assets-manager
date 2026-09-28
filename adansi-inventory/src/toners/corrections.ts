// src/toners/corrections.ts
//
// A count correction that RAISES a pool's quantity may really be a delivery.
//
// Corrections are not dated deliveries, so the monthly report does not count
// them as received. Raising a count is allowed — a recount can find
// cartridges — but the person is reminded where deliveries belong.
//
// Pure: no React, no Firestore.

export const RAISED_COUNT_HINT =
  "If these cartridges just arrived, use Add stock instead so the monthly report counts them.";

/** The reminder to show after a correction from `before` to `after`, or null. */
export function correctionHint(before: unknown, after: number): string | null {
  const previous = Number(before);
  if (!Number.isFinite(previous) || !Number.isFinite(after)) return null;
  return after > previous ? RAISED_COUNT_HINT : null;
}
