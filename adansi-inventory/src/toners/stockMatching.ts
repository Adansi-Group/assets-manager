// src/toners/stockMatching.ts
//
// Which printer does a stock record belong to?
//
// A toner record names its printer by copying three strings — location, room and
// model. Nothing enforces that those strings still match a printer that exists,
// so a record can point at nothing at all and look perfectly healthy on the
// Toners page: it has a quantity, it has a status badge. The failure only
// surfaces when someone tries to replace a cartridge and is told the stock does
// not exist, while the screen in front of them says it does.
//
// The model strings drift because they come from two different places: printers
// carry whatever was typed when the printer was added, while toner records used
// to take theirs from a hardcoded map in AddTonerModal. "HP Color Laser Jet Pro
// MFP 3303" against a printer recorded as "Color Laser Jet Pro MFP 3303fdw" is
// the shape of it.
//
// This module owns the comparison, and the replacement service uses it too, so
// what the Toners page reports as linked is exactly what a replacement finds.
//
// Pure: no React, no Firestore.

import type { Toner } from "../types/toner";
import type { Printer } from "../types/printer";

/**
 * Compare the way a person would: casing and stray spacing are typing noise,
 * not a different printer. Anything more forgiving would start matching one
 * floor's cupboard to another floor's printer.
 */
export const normalize = (value?: string) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";

type PrinterLike = { location: string; room?: string; model: string };
type TonerLike = { location: string; room?: string; printerType: string };

/** The three strings that say which printer this is. */
export function printerIdentity(printer: PrinterLike): string {
  return [normalize(printer.location), normalize(printer.room), normalize(printer.model)].join("|");
}

/** The same three strings as a stock record spells them. */
export function tonerIdentity(toner: TonerLike): string {
  return [normalize(toner.location), normalize(toner.room), normalize(toner.printerType)].join("|");
}

/** The printer a stock record belongs to, if it still exists. */
export function findPrinterForToner<P extends PrinterLike>(
  toner: TonerLike,
  printers: P[]
): P | undefined {
  const wanted = tonerIdentity(toner);
  return printers.find((printer) => printerIdentity(printer) === wanted);
}

/** Which part of the address was wrong — the most specific difference first. */
export type Divergence = "model" | "room" | "location";

export type UnlinkedStock = {
  toner: Toner;
  /**
   * Printers that agree on everything but one field, likeliest first. This is
   * what makes the report actionable: it names the printer that was probably
   * meant and the single string that has to change.
   */
  candidates: Array<{ printer: Printer; differs: Divergence }>;
};

/**
 * Every stock record pointing at a printer that does not exist.
 *
 * Grouped per record rather than per printer, because it is the record that
 * carries the wrong string and the record that has to be corrected.
 */
export function unlinkedStock(toners: Toner[], printers: Printer[]): UnlinkedStock[] {
  return toners
    .filter((toner) => !findPrinterForToner(toner, printers))
    .map((toner) => ({ toner, candidates: candidatesFor(toner, printers) }));
}

function candidatesFor(toner: Toner, printers: Printer[]): UnlinkedStock["candidates"] {
  const found: UnlinkedStock["candidates"] = [];

  for (const printer of printers) {
    const sameLocation = normalize(printer.location) === normalize(toner.location);
    const sameRoom = normalize(printer.room) === normalize(toner.room);
    const sameModel = normalize(printer.model) === normalize(toner.printerType);

    // Exactly one field apart, so there is a single thing to correct.
    if (sameLocation && sameRoom && !sameModel) found.push({ printer, differs: "model" });
    else if (sameLocation && sameModel && !sameRoom) found.push({ printer, differs: "room" });
    else if (sameRoom && sameModel && !sameLocation) found.push({ printer, differs: "location" });
  }

  const rank: Record<Divergence, number> = { model: 0, room: 1, location: 2 };
  return found.sort((a, b) => rank[a.differs] - rank[b.differs]);
}

/**
 * The printer models a stock record may be filed under.
 *
 * Every printer on record, always — a compatibility list only decides the
 * order, never who is left out.
 *
 * Excluding by compatibility is what broke this data twice. Tema Branch runs a
 * 3303 while the map said 222A belonged to an M283fdw, so the form offered one
 * printer, the wrong one, and four cartridges were filed against a machine in
 * another branch. The COO's Office 3303fdw was unreachable the same way. A
 * hardcoded list of what fits what goes stale the moment someone buys a
 * printer; the stock itself is the better record of what a cartridge is for.
 *
 * `currentValue` keeps an already-saved model visible while editing, so a wrong
 * one can be seen and corrected rather than silently cleared.
 */
export function selectablePrinterModels(
  printers: Array<{ model: string }>,
  compatibleModels: string[] = [],
  currentValue?: string
): string[] {
  const seen = new Set<string>();
  const real: string[] = [];
  for (const { model } of printers) {
    const key = normalize(model);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    real.push(model);
  }

  // Suggested models first, the rest after, each keeping its original order.
  const suggested = new Set(compatibleModels.map(normalize));
  const options = [
    ...real.filter((m) => suggested.has(normalize(m))),
    ...real.filter((m) => !suggested.has(normalize(m))),
  ];

  const current = currentValue?.trim();
  if (current && !options.some((m) => normalize(m) === normalize(current))) {
    return [current, ...options];
  }
  return options;
}
