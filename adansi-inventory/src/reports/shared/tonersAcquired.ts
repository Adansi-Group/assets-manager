// src/reports/shared/tonersAcquired.ts
//
// Toners that came in during a period, for the consolidated report.
//
// Two sources, both dated: deliveries recorded since pooling, and the legacy
// per-printer stock records from before it (by dateBrought). Pools are never
// counted — a pool's quantity is what is held now, not what arrived.
//
// Pure: no React, no Firestore.

import type { Toner, TonerDelivery } from "../../types/toner";
import { inRange, toISODate, type Range } from "./period";

export interface TonersAcquired {
  deliveries: number;
  legacyRecords: number;
  units: number;
  /** Known cost only: units with no price add nothing. */
  cost: number;
}

const amount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function tonersAcquired(
  deliveries: TonerDelivery[],
  legacy: Toner[],
  range: Range
): TonersAcquired {
  const received = deliveries.filter((d) => inRange(toISODate(d.dateReceived), range));
  const brought = legacy.filter((t) => inRange(toISODate(t.dateBrought), range));
  const lines = [...received, ...brought];

  return {
    deliveries: received.length,
    legacyRecords: brought.length,
    units: lines.reduce((sum, l) => sum + amount(l.quantity), 0),
    cost: lines.reduce((sum, l) => sum + amount(l.quantity) * amount(l.costPerUnit), 0),
  };
}
