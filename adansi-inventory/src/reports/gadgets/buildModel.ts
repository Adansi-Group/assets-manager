// src/reports/gadgets/buildModel.ts
//
// Gadget[] -> GadgetReportModel. Pure: no React, no Firestore, no jsPDF.

import type { Gadget } from "../../types/gadget";
import { inRange, toISODate, type Range } from "../shared/period";
import { capitalize, joinList, pluralize } from "../shared/text";
import { detectAnomalies } from "./anomalies";
import {
  normalizeAssignee,
  parseRamGb,
  parseSizeGb,
  parseVariant,
  sizeLabel,
  usableYear,
  type Variant,
} from "./parse";
import type {
  AccessorySection,
  AssignmentSection,
  DataGap,
  DateBasis,
  DeviceRef,
  DeviceSection,
  FieldCoverage,
  GadgetReportModel,
  ModelGroup,
  PersonHoldings,
  ReportScope,
  Tally,
  ValueSpread,
  VariantGroup,
} from "./model";

export interface BuildOptions {
  range: Range;
  dateBasis: DateBasis;
  scope: ReportScope;
  /** Locker/returned devices, fetched separately from the active set. */
  returned: Gadget[];
  /** Injected so the model stays pure and testable. */
  generatedAt: string;
}

function tally(values: (string | null | undefined)[]): Tally[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    // Count desc, then key asc so equal counts have a stable, readable order.
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function coverage(field: string, gadgets: Gadget[], has: (g: Gadget) => boolean): FieldCoverage {
  return { field, present: gadgets.filter(has).length, total: gadgets.length };
}

function toRef(g: Gadget): DeviceRef {
  return {
    id: g.id,
    model: g.model?.trim() || "(no model recorded)",
    variant: parseVariant(g),
    year: usableYear(g.year),
    serialNumber: g.serialNumber?.trim() || null,
    assignedTo: normalizeAssignee(g.assignedTo)?.display ?? null,
  };
}

/**
 * Order size labels smallest to largest, not by frequency.
 * "4GB, 8GB and 16GB" reads as a range; "4GB, 16GB and 8GB" reads as a mistake.
 * Unparseable labels sort last so they stand out.
 */
function sortSizesAscending(values: Tally[]): Tally[] {
  return [...values].sort((a, b) => {
    const ga = parseSizeGb(a.key).gb;
    const gb = parseSizeGb(b.key).gb;
    if (ga === null && gb === null) return a.key.localeCompare(b.key);
    if (ga === null) return 1;
    if (gb === null) return -1;
    return ga - gb;
  });
}

/** Distinct values for a size-like spec, keeping unparseable raw text visible. */
function sizeSpread(gadgets: Gadget[], pick: (g: Gadget) => string | undefined): ValueSpread {
  const labels: string[] = [];
  const unparsed = new Set<string>();
  let missing = 0;
  for (const g of gadgets) {
    const raw = pick(g);
    const label = sizeLabel(raw);
    if (label === null) {
      missing++;
      continue;
    }
    // A value we do not trust must not also be reported as a real spec, or the
    // report states both "all have 49438 storage" and "49438 cannot be read as
    // a size". It is surfaced as unparsed only, and left out of the tally.
    if (parseSizeGb(raw).suspect) {
      unparsed.add(label);
      continue;
    }
    labels.push(label);
  }
  return { values: sortSizesAscending(tally(labels)), unparsed: [...unparsed], missing };
}

function ramSpread(gadgets: Gadget[]): ValueSpread {
  const labels: string[] = [];
  let missing = 0;
  for (const g of gadgets) {
    const gb = parseRamGb(g);
    if (gb === null) missing++;
    else labels.push(`${Math.round(gb * 100) / 100}GB`);
  }
  return { values: sortSizesAscending(tally(labels)), unparsed: [], missing };
}

function buildVariantGroup(variant: Variant, gadgets: Gadget[]): VariantGroup {
  const years = gadgets.map(g => usableYear(g.year)).filter((y): y is number => y !== null);
  return {
    variant,
    count: gadgets.length,
    ram: ramSpread(gadgets),
    storage: sizeSpread(gadgets, g => g.storage),
    processors: tally(gadgets.map(g => g.processor)),
    years: {
      min: years.length ? Math.min(...years) : null,
      max: years.length ? Math.max(...years) : null,
      unknown: gadgets.length - years.length,
    },
    statuses: tally(gadgets.map(g => g.status)),
  };
}

function buildModelGroups(gadgets: Gadget[]): ModelGroup[] {
  const byModel = new Map<string, Gadget[]>();
  for (const g of gadgets) {
    const key = g.model?.trim() || "(no model recorded)";
    byModel.set(key, [...(byModel.get(key) ?? []), g]);
  }
  return [...byModel.entries()]
    .map(([model, gs]) => {
      const byVariant = new Map<Variant, Gadget[]>();
      for (const g of gs) {
        const v = parseVariant(g);
        byVariant.set(v, [...(byVariant.get(v) ?? []), g]);
      }
      return {
        model,
        count: gs.length,
        variants: [...byVariant.entries()]
          .map(([v, vg]) => buildVariantGroup(v, vg))
          .sort((a, b) => b.count - a.count || a.variant.localeCompare(b.variant)),
      };
    })
    .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
}

function buildDeviceSection(
  deviceType: "Laptop" | "Smartphone",
  all: Gadget[]
): DeviceSection {
  const gadgets = all.filter(g => g.deviceType === deviceType);
  const withYear = gadgets.filter(g => usableYear(g.year) !== null);
  const years = withYear.map(g => usableYear(g.year) as number);
  const min = years.length ? Math.min(...years) : null;
  const max = years.length ? Math.max(...years) : null;

  const fields: FieldCoverage[] = [
    coverage("Serial number", gadgets, g => Boolean(g.serialNumber?.trim())),
    coverage("Processor", gadgets, g => Boolean(g.processor?.trim())),
    coverage("Storage", gadgets, g => Boolean(g.storage?.trim())),
    coverage("RAM", gadgets, g => parseRamGb(g) !== null),
    coverage("Year", gadgets, g => usableYear(g.year) !== null),
    coverage("Purchase date", gadgets, g => Boolean(toISODate(g.purchaseDate))),
  ];
  if (deviceType === "Smartphone") {
    fields.push(coverage("IMEI", gadgets, g => Boolean(g.imei1?.trim())));
  }

  return {
    deviceType,
    total: gadgets.length,
    models: buildModelGroups(gadgets),
    processors: tally(gadgets.map(g => g.processor)),
    statuses: tally(gadgets.map(g => g.status)),
    yearRange: {
      min,
      max,
      oldest: min === null ? [] : withYear.filter(g => g.year === min).map(toRef),
      newest: max === null ? [] : withYear.filter(g => g.year === max).map(toRef),
      unknown: gadgets.length - years.length,
    },
    coverage: fields,
  };
}

function buildAccessorySection(all: Gadget[], lowStockThreshold: number): AccessorySection {
  const gadgets = all.filter(g => g.deviceType === "Accessory");
  // A missing quantity is unknown, not zero and not one. Counting it either way
  // makes the unit total and the low-stock list contradict each other, so it is
  // excluded from both; the Quantity coverage figure reports how many that is.
  const withQuantity = gadgets.filter(
    (g): g is Gadget & { quantity: number } => typeof g.quantity === "number"
  );
  return {
    total: gadgets.length,
    totalUnits: withQuantity.reduce((sum, g) => sum + g.quantity, 0),
    byType: tally(gadgets.map(g => g.accessoryType)),
    byCondition: tally(gadgets.map(g => g.condition)),
    statuses: tally(gadgets.map(g => g.status)),
    lowStock: withQuantity
      .filter(g => g.quantity <= lowStockThreshold && g.status !== "Faulty")
      .map(g => ({
        model: g.model?.trim() || "(no model recorded)",
        accessoryType: g.accessoryType?.trim() || "—",
        quantity: g.quantity,
      }))
      .sort((a, b) => a.quantity - b.quantity || a.model.localeCompare(b.model)),
    coverage: [
      coverage("Accessory type", gadgets, g => Boolean(g.accessoryType?.trim())),
      coverage("Quantity", gadgets, g => typeof g.quantity === "number"),
      coverage("Condition", gadgets, g => Boolean(g.condition?.trim())),
      coverage("Location", gadgets, g => Boolean(g.location?.trim())),
    ],
  };
}

function buildAssignmentSection(all: Gadget[]): AssignmentSection {
  const byPerson = new Map<string, PersonHoldings>();
  for (const g of all) {
    const a = normalizeAssignee(g.assignedTo);
    if (!a) continue;
    const person =
      byPerson.get(a.key) ??
      ({ key: a.key, display: a.display, laptops: [], phones: [], accessories: [] } as PersonHoldings);
    if (g.deviceType === "Laptop") person.laptops.push(toRef(g));
    else if (g.deviceType === "Smartphone") person.phones.push(toRef(g));
    else person.accessories.push(toRef(g));
    byPerson.set(a.key, person);
  }

  const people = [...byPerson.values()].sort((a, b) => a.display.localeCompare(b.display));
  const has = (p: PersonHoldings, k: "laptops" | "phones") => p[k].length > 0;

  const countAssigned = (type: Gadget["deviceType"]) =>
    all.filter(g => g.deviceType === type && normalizeAssignee(g.assignedTo)).length;
  const countUnassigned = (type: Gadget["deviceType"]) =>
    all.filter(g => g.deviceType === type && !normalizeAssignee(g.assignedTo)).length;

  return {
    people,
    bothLaptopAndPhone: people.filter(p => has(p, "laptops") && has(p, "phones")).map(p => p.display),
    laptopOnly: people.filter(p => has(p, "laptops") && !has(p, "phones")).map(p => p.display),
    phoneOnly: people.filter(p => !has(p, "laptops") && has(p, "phones")).map(p => p.display),
    assignedCounts: {
      laptops: countAssigned("Laptop"),
      phones: countAssigned("Smartphone"),
      accessories: countAssigned("Accessory"),
    },
    unassigned: {
      laptops: countUnassigned("Laptop"),
      phones: countUnassigned("Smartphone"),
      accessories: countUnassigned("Accessory"),
    },
  };
}

/**
 * Limitations of the source data, stated in the report rather than left for the
 * reader to infer from a zero.
 */
function buildDataGaps(
  gadgets: Gadget[],
  laptops: DeviceSection,
  phones: DeviceSection,
  dateBasis: DateBasis,
  filtering: boolean
): DataGap[] {
  const gaps: DataGap[] = [
    {
      field: "Purchase cost",
      note:
        "The Assets Station records no purchase price for gadgets, so this report carries no spend " +
        "figures. A cost total cannot be produced from the system as it stands.",
    },
    {
      field: "Branch / office",
      note:
        "Laptops and smartphones have no branch field; only accessories carry a location. Devices " +
        "are therefore reported by assignee rather than by branch.",
    },
  ];

  const undated = gadgets.filter(g => !toISODate(g.purchaseDate)).length;
  if (undated > 0) {
    // Only claim the filter drops these when the filter actually reads this
    // field — the period can be applied to createdAt instead.
    const affectsFilter = filtering && dateBasis === "purchaseDate";
    gaps.push({
      field: "Purchase date",
      note:
        `${undated} of ${gadgets.length} ${pluralize(gadgets.length, "device")} ` +
        `${undated === 1 ? "has" : "have"} no purchase date recorded.` +
        (affectsFilter
          ? " The period filter excludes them, so these figures are a floor rather than a full count."
          : " When a period is filtered by purchase date, they are excluded from it."),
    });
  }

  // One line per device type, not one per field: eight bullets each saying
  // "not recorded for any of the 32 smartphones" is noise, not detail.
  for (const section of [laptops, phones]) {
    const absent = section.coverage.filter(c => c.total > 0 && c.present === 0);
    if (absent.length === 0) continue;
    const noun = `${section.deviceType.toLowerCase()}s`;
    gaps.push({
      field: capitalize(noun),
      note:
        `${joinList(absent.map(c => c.field))} ${absent.length === 1 ? "is" : "are"} not recorded ` +
        `for any of the ${section.total} ${noun}.`,
    });
  }
  return gaps;
}

export function buildGadgetReport(active: Gadget[], options: BuildOptions): GadgetReportModel {
  const { range, dateBasis, scope, returned, generatedAt } = options;

  // getGadgets() and getReturnedDevices() overlap: a locker device that was
  // reassigned satisfies isActiveGadget AND lockerDevice === true, so it comes
  // back from both. Deduplicate, or it is counted twice and the "excluded"
  // figure names devices that were never actually excluded.
  const activeIds = new Set(active.map(g => g.id));
  const trulyExcluded = returned.filter(g => !activeIds.has(g.id));
  const pool = scope === "active+locker" ? [...active, ...trulyExcluded] : active;
  const dateOf = (g: Gadget) => toISODate(dateBasis === "createdAt" ? g.createdAt : g.purchaseDate);

  // "All time" spans every date, so only narrow the set when a real period is set.
  const filtering = !(range.start === "0000-01-01" && range.end === "9999-12-31");
  const gadgets = filtering ? pool.filter(g => inRange(dateOf(g), range)) : pool;

  const laptops = buildDeviceSection("Laptop", gadgets);
  const phones = buildDeviceSection("Smartphone", gadgets);

  return {
    meta: {
      generatedAt,
      periodLabel: range.label,
      dateBasis,
      scope,
      excludedLockerCount: scope === "active+locker" ? 0 : trulyExcluded.length,
      missingDateCount: pool.filter(g => !dateOf(g)).length,
      filtered: filtering,
    },
    summary: {
      total: gadgets.length,
      byType: tally(gadgets.map(g => g.deviceType)),
      byStatus: tally(gadgets.map(g => g.status)),
      byTypeAndStatus: tally(gadgets.map(g => `${g.deviceType}|${g.status}`)).map(t => {
        const [type, status] = t.key.split("|");
        return { type, status, count: t.count };
      }),
    },
    laptops,
    phones,
    accessories: buildAccessorySection(gadgets, 2),
    assignments: buildAssignmentSection(gadgets),
    anomalies: detectAnomalies(gadgets),
    dataGaps: buildDataGaps(gadgets, laptops, phones, dateBasis, filtering),
  };
}
