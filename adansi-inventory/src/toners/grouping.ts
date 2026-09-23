// src/toners/grouping.ts
//
// Which stock records belong to the same printer?
//
// The Toners page shows one row per printer with a colour picker, so it has to
// fold the per-colour records back into sets. A room is part of a printer's
// identity: Travel House has two Canon imageRunner C3326i units, one at Down
// Floor and one at Reception, and they hold separate cartridges. Grouping them
// together showed Down Floor a Yellow it does not own and let the row's delete
// button reach across to the other printer's stock.
//
// The key normalises the way the replacement service matches stock, so what a
// row claims to hold is what a replacement will actually find.
//
// Pure: no React, no Firestore.

import type { Toner } from "../types/toner";

export type GroupedToner = {
  /** Stable identity for the group; also the key used for per-row UI state. */
  key: string;
  id: string;
  location: string;
  room?: string;
  printerType: string;
  tonerType: string;
  colors: Record<string, number>;
  colorRecords: Record<string, Toner>;
  dateBrought: string;
  status?: string;
  selectedColor: string;
};

/** Same shape as the replacement service's matcher, so the two agree. */
const normalize = (value?: string) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";

/**
 * Identity of the printer a stock record belongs to.
 *
 * Room is included because two printers of the same model in the same building
 * are two printers.
 */
export function tonerGroupKey(
  toner: Pick<Toner, "location" | "room" | "printerType" | "tonerType">
): string {
  return [
    normalize(toner.location),
    normalize(toner.room),
    normalize(toner.printerType),
    normalize(toner.tonerType),
  ].join("|");
}

/**
 * Fold per-colour records into one entry per printer.
 *
 * `selectedColors` carries the colour the user picked for a row, keyed by the
 * same group key; a group falls back to the first record's colour.
 */
export function groupToners(
  tonerList: Toner[],
  selectedColors: Record<string, string> = {}
): GroupedToner[] {
  const groups: Record<string, GroupedToner> = {};

  tonerList.forEach((toner) => {
    const key = tonerGroupKey(toner);

    if (!groups[key]) {
      groups[key] = {
        key,
        id: toner.id,
        location: toner.location,
        room: toner.room,
        printerType: toner.printerType,
        tonerType: toner.tonerType,
        colors: {},
        colorRecords: {},
        dateBrought: toner.dateBrought,
        status: toner.status,
        selectedColor: selectedColors[key] || toner.colorType,
      };
    }

    groups[key].colors[toner.colorType] = toner.quantity;
    groups[key].colorRecords[toner.colorType] = toner;

    // Worst status across the set wins: a row is only calm when every
    // cartridge in it is.
    if (toner.status === "Critical") {
      groups[key].status = "Critical";
    } else if (toner.status === "Warning" && groups[key].status !== "Critical") {
      groups[key].status = "Warning";
    } else if (!groups[key].status) {
      groups[key].status = toner.status;
    }
  });

  return Object.values(groups);
}

/**
 * The record a row's actions should act on.
 *
 * The colour the user is looking at, not whichever colour happened to be stored
 * first — otherwise a row showing Magenta edits the Black cartridge, and the
 * other colours in the set cannot be reached at all.
 */
export function selectedRecord(group: GroupedToner): Toner | undefined {
  return group.colorRecords[group.selectedColor] ?? Object.values(group.colorRecords)[0];
}
