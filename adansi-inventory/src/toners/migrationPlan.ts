// src/toners/migrationPlan.ts
//
// Turning per-printer stock records into pools, as a plan you can look at
// before anything is written.
//
// The Firestore database cannot be read from a script on this account, so there
// is no way to rehearse this against live data. That makes the planner a pure
// function on purpose: everything it decides is decided here, where tests can
// reach it, and the screen that calls it only renders and writes.
//
// Pure: no React, no Firestore.

import { normalizeType, poolKey } from "./pools";
import type { Toner } from "../types/toner";
import type { Printer } from "../types/printer";

export type PlannedPool = {
  tonerType: string;
  colorType: string;
  quantity: number;
  initialQuantity?: number;
  dateBrought: string;
  /** The old records folded into this pool, so the preview can show its working. */
  sources: Toner[];
};

export type MigrationWarning = {
  kind: "printer-without-cartridge" | "impossible-colour" | "empty-pool";
  message: string;
  /** Printer id, or a poolKey, depending on kind. */
  ref: string;
};

export type MigrationInput = {
  oldStock: Toner[];
  printers: Printer[];
  /** Cartridge names to fold together, e.g. { "222A-CEO": "222A" }. */
  aliases?: Record<string, string>;
  /** poolKey values the user ticked to discard. */
  dropped?: string[];
};

export type MigrationPlan = {
  pools: PlannedPool[];
  /** printer id -> cartridge name. */
  printerTypes: Record<string, string>;
  warnings: MigrationWarning[];
};

/** A PIXMA takes one combined colour cartridge; CMY against it is junk. */
const PIXMA_COLOURS = new Set(["black", "color"]);

function resolveAlias(tonerType: string, aliases: Record<string, string>): string {
  const match = Object.keys(aliases).find((from) => normalizeType(from) === normalizeType(tonerType));
  return match ? aliases[match] : tonerType;
}

/**
 * The cartridge a printer takes, read from whatever stock is currently filed
 * against its old address. Printers with no stock get no suggestion rather than
 * a guess — the COO's Office 3303fdw is exactly that case.
 */
export function inferPrinterTonerType(printer: Printer, oldStock: Toner[]): string | undefined {
  const match = oldStock.find(
    (record) =>
      normalizeType(record.location) === normalizeType(printer.location) &&
      normalizeType(record.room) === normalizeType(printer.room) &&
      normalizeType(record.printerType) === normalizeType(printer.model)
  );
  return match?.tonerType;
}

export function planMigration({
  oldStock,
  printers,
  aliases = {},
  dropped = [],
}: MigrationInput): MigrationPlan {
  const warnings: MigrationWarning[] = [];
  const droppedKeys = new Set(dropped);
  const byKey = new Map<string, PlannedPool>();

  for (const record of oldStock) {
    const tonerType = resolveAlias(record.tonerType, aliases);
    const key = poolKey(tonerType, record.colorType);
    if (droppedKeys.has(key)) continue;

    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += Number(record.quantity) || 0;
      if (record.initialQuantity !== undefined) {
        existing.initialQuantity = (existing.initialQuantity ?? 0) + Number(record.initialQuantity);
      }
      // Earliest, so a merged pool does not look newer than its oldest stock.
      if (record.dateBrought < existing.dateBrought) existing.dateBrought = record.dateBrought;
      existing.sources.push(record);
    } else {
      byKey.set(key, {
        tonerType,
        colorType: record.colorType,
        quantity: Number(record.quantity) || 0,
        initialQuantity:
          record.initialQuantity === undefined ? undefined : Number(record.initialQuantity),
        dateBrought: record.dateBrought,
        sources: [record],
      });
    }
  }

  const pools = [...byKey.values()];

  for (const pool of pools) {
    if (
      normalizeType(pool.tonerType).includes("pixma") &&
      !PIXMA_COLOURS.has(normalizeType(pool.colorType))
    ) {
      warnings.push({
        kind: "impossible-colour",
        message: `${pool.colorType} ${pool.tonerType} — a PIXMA takes only Black and Color. This looks like a mistaken record.`,
        ref: poolKey(pool.tonerType, pool.colorType),
      });
    }
    if (pool.quantity === 0) {
      warnings.push({
        kind: "empty-pool",
        message: `${pool.colorType} ${pool.tonerType} has none left.`,
        ref: poolKey(pool.tonerType, pool.colorType),
      });
    }
  }

  const printerTypes: Record<string, string> = {};
  for (const printer of printers) {
    const inferred = inferPrinterTonerType(printer, oldStock);
    if (inferred) {
      printerTypes[printer.id] = resolveAlias(inferred, aliases);
    } else {
      warnings.push({
        kind: "printer-without-cartridge",
        message: `${printer.model} at ${printer.location}${printer.room ? ` (${printer.room})` : ""} has no stock to infer a cartridge from. Choose one.`,
        ref: printer.id,
      });
    }
  }

  return { pools, printerTypes, warnings };
}
