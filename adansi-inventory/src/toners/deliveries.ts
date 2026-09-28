// src/toners/deliveries.ts
//
// What recording a toner delivery writes.
//
// A delivery adds cartridges to the pool for its cartridge and colour — or
// creates that pool — and leaves a dated record behind, so a month's report can
// say what arrived instead of printing a zero. The service runs this plan
// inside one Firestore transaction; the decisions live here so they can be
// tested without Firestore.
//
// Pure: no React, no Firestore.

import type { TonerDelivery } from "../types/toner";
import { findPool, type PoolLike } from "./pools";
import { canonicalColour } from "./colours";

export type DeliveryInput = Omit<TonerDelivery, "id">;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Why this delivery cannot be recorded, or null when it can. `today` is
 * YYYY-MM-DD, passed in so this stays free of a hidden clock read.
 */
export function deliveryProblem(today: string, input: DeliveryInput): string | null {
  if (!input.tonerType?.trim()) return "Choose the cartridge that was delivered.";
  if (!input.colorType?.trim()) return "Choose the colour that was delivered.";
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return "Quantity received must be a whole number of 1 or more.";
  }
  if (typeof input.dateReceived !== "string" || !isRealDate(input.dateReceived)) {
    return "Date received must be a real date (YYYY-MM-DD).";
  }
  if (input.dateReceived > today) {
    return "Date received cannot be in the future.";
  }
  if (
    input.costPerUnit !== undefined &&
    (!Number.isFinite(input.costPerUnit) || input.costPerUnit < 0)
  ) {
    return "Cost per unit must be 0 or more, or left blank.";
  }
  return null;
}

/** Firestore rejects undefined values, so they are dropped rather than written. */
function defined<T extends Record<string, unknown>>(fields: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * The existing pool a delivery adds to, if any. The colour is made canonical
 * first, so a "Color PIXMA" delivery lands in the live "Color" pool instead
 * of opening a second one the replacement can never draw from.
 */
export function deliveryPool<P extends PoolLike>(
  pools: P[],
  input: Pick<DeliveryInput, "tonerType" | "colorType">
): P | undefined {
  return findPool(pools, input.tonerType, canonicalColour(input.colorType));
}

export type PoolWrite =
  | { kind: "increment"; fields: { quantity: number; lastCheckedDate: string } }
  | { kind: "create"; fields: Record<string, unknown> };

export interface DeliveryPlan {
  pool: PoolWrite;
  delivery: Record<string, unknown>;
}

/**
 * The writes for one delivery, given the pool as it stands inside the
 * transaction (undefined when there is none yet). Throws on an invalid
 * delivery so nothing is written.
 */
export function planDelivery(
  today: string,
  existing: { quantity?: unknown; lastCheckedDate?: unknown } | undefined,
  input: DeliveryInput
): DeliveryPlan {
  const problem = deliveryProblem(today, input);
  if (problem) throw new Error(problem);

  const tonerType = input.tonerType.trim();
  const colorType = canonicalColour(input.colorType.trim());

  const delivery = defined({
    tonerType,
    colorType,
    quantity: input.quantity,
    dateReceived: input.dateReceived,
    costPerUnit: input.costPerUnit,
  });

  if (existing) {
    const current = Number(existing.quantity);
    // A delivery entered late must not move a more recent check date back.
    const checked =
      typeof existing.lastCheckedDate === "string" && isRealDate(existing.lastCheckedDate.slice(0, 10))
        ? existing.lastCheckedDate.slice(0, 10)
        : "";
    return {
      pool: {
        kind: "increment",
        fields: {
          quantity: (Number.isFinite(current) ? Math.max(0, current) : 0) + input.quantity,
          lastCheckedDate: checked > input.dateReceived ? checked : input.dateReceived,
        },
      },
      delivery,
    };
  }

  return {
    pool: {
      kind: "create",
      fields: defined({
        tonerType,
        colorType,
        quantity: input.quantity,
        initialQuantity: input.quantity,
        dateBrought: input.dateReceived,
        costPerUnit: input.costPerUnit,
      }),
    },
    delivery,
  };
}
