// src/reports/station/model.ts
//
// The figures behind the short written report: gadgets, toners and A4 paper.
//
// It composes rather than reimplements. buildGadgetReport() supplies the device
// figures — the same ones behind the detailed gadget report — and
// buildConsumablesModel() the meeting figures for toners and paper. What is
// added here is the handful of cross-cutting numbers a summary needs.
//
// Pure data: no React, no Firestore, no jsPDF. narrateStation() turns it into
// prose.

import type { Toner, TonerReplacement, TonerStock } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";
import type { Gadget } from "../../types/gadget";
import type { Printer } from "../../types/printer";
import { inRange, toISODate, type Range } from "../shared/period";
import { joinList, verbHave } from "../shared/text";
import { replacementIntervals } from "../shared/replacementIntervals";
import { lowToners } from "../../toners/stockLevel";
import { buildGadgetReport } from "../gadgets/buildModel";
import type { DataGap, GadgetReportModel, Tally } from "../gadgets/model";
import { buildConsumablesModel } from "../consumables/model";

/**
 * Categories in this report that the Assets Station never prices. Naming them
 * is the point: silence would let a reader assume nothing was spent.
 */
const UNPRICED_CATEGORIES = ["Gadgets", "Toners"] as const;

export type ConsumablesModel = ReturnType<typeof buildConsumablesModel>;

export interface TonerSection {
  unitsInStock: number;
  /** Distinct pools — a cartridge and colour, not a printer or a branch. */
  lines: number;
  replacements: number;
  /** Null rather than 0 when there are too few replacements to measure a gap. */
  averageDaysBetween: number | null;
  durationSamples: number;
  byColour: Tally[];
  low: TonerStock[];
}

export interface A4Office {
  office: string;
  reams: number;
  minimum: number;
  status: A4Sheet["status"];
  value: number;
  monthlyUsage: number | null;
}

export interface A4Section {
  offices: number;
  totalReams: number;
  usedReams: number;
  stockValue: number;
  monthlyUsage: number;
  byOffice: A4Office[];
  low: A4Sheet[];
  /** Offices whose average monthly usage has never been recorded. */
  usageUnknown: number;
}

export interface GadgetAdded {
  model: string;
  deviceType: string;
  date: string;
  assignedTo: string | null;
}

export interface A4Restock {
  office: string;
  date: string;
}

/**
 * What was actually recorded during the reporting period.
 *
 * Kept separate from the stock sections on purpose. Toner replacements are a
 * real dated history and devices carry a createdAt, so those are answerable per
 * month. Stock levels are not: quantities are overwritten in place and no
 * history is kept, so "what we held at the end of August" cannot be recovered
 * and is never claimed.
 */
export interface ActivitySection {
  label: string;
  /** False for an all-time report, where "activity" means everything on record. */
  filtered: boolean;
  tonerReplacements: TonerReplacement[];
  tonerReplacementsByLocation: Tally[];
  tonerReplacementsByColour: Tally[];
  tonerReplacementsByPrinter: Tally[];
  gadgetsAdded: GadgetAdded[];
  gadgetsAddedByType: Tally[];
  /** Devices with no createdAt at all, so they cannot be placed in any month. */
  gadgetsUndated: number;
  a4Restocked: A4Restock[];
  /** Toner stock records first entered during the period. */
  tonersBroughtRecords: Toner[];
  tonersBrought: number;
  /** True when the period holds no recorded activity of any kind. */
  empty: boolean;
}

export interface StationReportModel {
  meta: {
    generatedAt: string;
    periodLabel: string;
  };
  gadgets: GadgetReportModel;
  consumables: ConsumablesModel;
  toners: TonerSection;
  a4: A4Section;
  activity: ActivitySection;
  dataGaps: DataGap[];
}

export interface StationInput {
  /**
   * Legacy per-printer toner records. Stock levels moved to pooled `stock`;
   * this is kept only for `tonersBroughtRecords`, the one figure that is a
   * true dated history — new stock records brought in during a month — which
   * pooling has no equivalent of yet.
   */
  toners: Toner[];
  /** Pooled cartridge stock: one record per cartridge and colour. */
  stock: TonerStock[];
  replacements: TonerReplacement[];
  sheets: A4Sheet[];
  gadgets: Gadget[];
  /** Which cartridge each printer takes, used to say how many printers a pool feeds. */
  printers: Printer[];
  range: Range;
  /** Cartridges at or below this count need reordering. */
  reorderLevel: number;
  /** Injected so the model stays pure and testable. */
  generatedAt: string;
}

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const positive = (value: unknown): number => Math.max(0, num(value));

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

function tally(values: (string | null | undefined)[]): Tally[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    // Count desc, then key asc so equal counts have a stable, readable order.
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function buildToners(
  stock: TonerStock[],
  replacements: TonerReplacement[],
  reorderLevel: number
): TonerSection {
  const intervals = replacementIntervals(replacements);

  return {
    unitsInStock: stock.reduce((sum, t) => sum + positive(t.quantity), 0),
    lines: stock.length,
    replacements: replacements.length,
    averageDaysBetween: mean(intervals),
    durationSamples: intervals.length,
    byColour: tally(stock.map(t => t.colorType)),
    // The reorder level is the app's single definition of "low"; the report
    // must not carry a second, quieter one of its own.
    low: lowToners(stock, reorderLevel),
  };
}

function buildA4(sheets: A4Sheet[]): A4Section {
  const byOffice: A4Office[] = sheets
    .map(sheet => ({
      office: sheet.officeName?.trim() || "Unspecified office",
      reams: positive(sheet.currentQuantity),
      minimum: positive(sheet.minimumStockLevel),
      status: sheet.status,
      value: positive(sheet.currentQuantity) * positive(sheet.costPerReam),
      monthlyUsage:
        sheet.averageMonthlyUsage === undefined ? null : positive(sheet.averageMonthlyUsage),
    }))
    .sort((a, b) => b.reams - a.reams || a.office.localeCompare(b.office));

  return {
    offices: sheets.length,
    totalReams: byOffice.reduce((sum, o) => sum + o.reams, 0),
    usedReams: sheets.reduce(
      (sum, s) => sum + Math.max(0, positive(s.initialQuantity) - positive(s.currentQuantity)),
      0
    ),
    stockValue: byOffice.reduce((sum, o) => sum + o.value, 0),
    monthlyUsage: sheets.reduce((sum, s) => sum + positive(s.averageMonthlyUsage), 0),
    byOffice,
    low: sheets.filter(s => s.status !== "In Stock"),
    usageUnknown: sheets.filter(s => s.averageMonthlyUsage === undefined).length,
  };
}

/** "All time" spans every date, so only narrow the set when a real period is set. */
const isAllTime = (range: Range) => range.start === "0000-01-01" && range.end === "9999-12-31";

function buildActivity(input: StationInput): ActivitySection {
  const { range } = input;
  const filtered = !isAllTime(range);
  const within = (value: unknown) => !filtered || inRange(toISODate(value), range);

  const tonerReplacements = input.replacements.filter(r => within(r.dateReplaced));

  const gadgetsAdded = input.gadgets
    .filter(g => toISODate(g.createdAt) && within(g.createdAt))
    .map(g => ({
      model: g.model,
      deviceType: g.deviceType,
      date: toISODate(g.createdAt) as string,
      assignedTo: g.assignedTo?.trim() || null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // An office can hold several A4 stock records, so restocks are collapsed to
  // one entry per office — otherwise the prose reads "Nester and Nester".
  const restockedByOffice = new Map<string, A4Restock>();
  for (const s of input.sheets) {
    const date = toISODate(s.lastRestocked);
    if (!date || !within(s.lastRestocked)) continue;
    const office = s.officeName?.trim() || "Unspecified office";
    const seen = restockedByOffice.get(office);
    if (!seen || date > seen.date) restockedByOffice.set(office, { office, date });
  }
  const a4Restocked = [...restockedByOffice.values()].sort((a, b) => a.date.localeCompare(b.date));

  const tonersBroughtRecords = input.toners.filter(t => within(t.dateBrought));

  return {
    label: range.label,
    filtered,
    tonerReplacements,
    tonerReplacementsByLocation: tally(tonerReplacements.map(r => r.location)),
    tonerReplacementsByColour: tally(tonerReplacements.map(r => r.colorType)),
    tonerReplacementsByPrinter: tally(tonerReplacements.map(r => r.printerType)),
    gadgetsAdded,
    gadgetsAddedByType: tally(gadgetsAdded.map(g => g.deviceType)),
    gadgetsUndated: input.gadgets.filter(g => !toISODate(g.createdAt)).length,
    a4Restocked,
    tonersBroughtRecords,
    tonersBrought: tonersBroughtRecords.length,
    empty:
      tonerReplacements.length === 0 &&
      gadgetsAdded.length === 0 &&
      a4Restocked.length === 0 &&
      tonersBroughtRecords.length === 0,
  };
}

/** Gaps worth a sentence in the closing paragraph. Kept short — this is prose. */
function stationGaps(toners: TonerSection, a4: A4Section, activity: ActivitySection): DataGap[] {
  const gaps: DataGap[] = [
    {
      field: "Purchase cost",
      note:
        `${joinList([...UNPRICED_CATEGORIES])} have no price field anywhere in the system, so this ` +
        "report gives no spend figure for them rather than a zero",
    },
  ];

  if (activity.filtered) {
    gaps.push({
      field: "Stock history",
      note:
        "stock quantities are overwritten in place rather than logged, so the figures for what is " +
        `held today cannot be rewound to ${activity.label}; only the activity above is period-specific`,
    });
  }

  if (activity.filtered && activity.gadgetsUndated > 0) {
    gaps.push({
      field: "Device dates",
      note:
        `${activity.gadgetsUndated} devices carry no date of entry, so they cannot be attributed to ` +
        "any particular month",
    });
  }

  if (toners.durationSamples === 0 && toners.replacements > 0) {
    gaps.push({
      field: "Toner life",
      note:
        "no printer has been serviced twice yet, so there is no interval from which to work out how " +
        "long a cartridge lasts",
    });
  }

  if (a4.usageUnknown > 0) {
    gaps.push({
      field: "A4 usage rate",
      note:
        `${a4.usageUnknown} of the ${a4.offices} offices ${verbHave(a4.usageUnknown)} no monthly ` +
        "usage recorded, so their paper cannot be projected forward to a reorder date",
    });
  }

  return gaps;
}

/** Every date, so the stock sections describe the estate as it stands today. */
const ALL_TIME: Range = { start: "0000-01-01", end: "9999-12-31", label: "All time" };

export function buildStationReport(input: StationInput): StationReportModel {
  const toners = buildToners(input.stock, input.replacements, input.reorderLevel);
  const a4 = buildA4(input.sheets);
  const activity = buildActivity(input);

  // Deliberately all-time, whatever period is selected. Stock is a snapshot of
  // now; filtering it by purchase date would report the devices bought in the
  // period as though they were the whole estate.
  const gadgets = buildGadgetReport(input.gadgets, {
    range: ALL_TIME,
    dateBasis: "purchaseDate",
    scope: "active",
    returned: [],
    generatedAt: input.generatedAt,
  });

  return {
    meta: { generatedAt: input.generatedAt, periodLabel: input.range.label },
    gadgets,
    consumables: buildConsumablesModel(input.stock, input.replacements, input.sheets, input.printers),
    toners,
    a4,
    activity,
    dataGaps: stationGaps(toners, a4, activity),
  };
}
