// src/toners/poolRows.ts
//
// Turning pools into the Toners page's rows.
//
// The page shows one row per cartridge, with a colour picker choosing among
// that cartridge's pools. This module owns the grouping so it can be tested
// without React or Firestore — the same reasoning as pools.ts and
// stockLevel.ts.
//
// Colours are keyed by their normalized form, the same key pools.ts's
// poolKey uses, so "Black" and " black " land in the same slot in a row
// instead of showing as two colours. A genuine collision — two different
// Firestore documents that normalize to the same cartridge and colour — is
// something findPoolCollisions reports, not something groupPools quietly
// picks a winner for and hides the loser of.
//
// Pure: no React, no Firestore.

import type { TonerStock } from "../types/toner";
import type { Printer } from "../types/printer";
import { normalizeType, poolKey, printersUsing } from "./pools";
import type { TonerStockStatus } from "./stockLevel";

export type CartridgeRow = {
  /** Normalized tonerType; stable identity for the row and its UI state. */
  key: string;
  tonerType: string;
  /** Keyed by normalized colour. */
  colors: Record<string, TonerStock>;
  /** The colour currently on view, as typed or displayed — not normalized. */
  selectedColor: string;
  usedBy: Printer[];
  status?: TonerStockStatus;
};

export function usedByLabel(n: number): string {
  return n === 1 ? "1 printer" : `${n} printers`;
}

/** The pool a row's selected colour actually points at, if it exists. */
export function selectedPool(row: CartridgeRow): TonerStock | undefined {
  return row.colors[normalizeType(row.selectedColor)];
}

/**
 * Every set of pools that collide once normalized — same cartridge, same
 * colour in every way a person would judge it, but different Firestore
 * documents. `tonerStockService` guards both writes against creating one of
 * these, so a collision should only ever come from data older than that
 * guard; when it does, it has to stay visible rather than have groupPools
 * silently keep one and drop the other.
 */
export function findPoolCollisions(pools: TonerStock[]): TonerStock[][] {
  const byKey = new Map<string, TonerStock[]>();

  for (const pool of pools) {
    const key = poolKey(pool.tonerType, pool.colorType);
    const group = byKey.get(key);
    if (group) group.push(pool);
    else byKey.set(key, [pool]);
  }

  return Array.from(byKey.values()).filter((group) => group.length > 1);
}

/**
 * One row per cartridge, each holding every colour pool filed under it.
 *
 * `selectedColors` carries the colour the user picked for a row, keyed by
 * the row's key; a row falls back to the first pool's colour.
 */
export function groupPools(
  pools: TonerStock[],
  printers: Printer[],
  selectedColors: Record<string, string> = {}
): CartridgeRow[] {
  const groups: Record<string, CartridgeRow> = {};

  pools.forEach((pool) => {
    const key = normalizeType(pool.tonerType);
    const colorKey = normalizeType(pool.colorType);

    if (!groups[key]) {
      groups[key] = {
        key,
        tonerType: pool.tonerType,
        colors: {},
        selectedColor: selectedColors[key] || pool.colorType,
        usedBy: printersUsing(printers, pool.tonerType),
      };
    }

    // A genuine collision is findPoolCollisions' job to report; here the
    // first pool seen for a colour simply keeps the row's display slot.
    if (!groups[key].colors[colorKey]) {
      groups[key].colors[colorKey] = pool;
    }

    // Worst status across the set wins: a row is only calm when every
    // colour in it is.
    if (pool.status === "Critical") {
      groups[key].status = "Critical";
    } else if (pool.status === "Warning" && groups[key].status !== "Critical") {
      groups[key].status = "Warning";
    } else if (!groups[key].status) {
      groups[key].status = pool.status;
    }
  });

  return Object.values(groups);
}
