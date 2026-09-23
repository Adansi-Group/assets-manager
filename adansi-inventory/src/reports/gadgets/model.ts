// src/reports/gadgets/model.ts
//
// The shape of a gadget report. Pure data: no React, no Firestore, no jsPDF.
// buildGadgetReport() produces it; narrate() turns it into Block[].

import type { Variant } from "./parse";

export type Tally = { key: string; count: number };

/** Which devices the report counted. */
export type ReportScope = "active" | "active+locker";

/** Which date field the period filter applies to. */
export type DateBasis = "purchaseDate" | "createdAt";

/** Enough to name a specific device in prose. */
export interface DeviceRef {
  id: string;
  model: string;
  variant: Variant;
  year: number | null;
  serialNumber: string | null;
  assignedTo: string | null;
}

/**
 * How often a field is actually filled in.
 *
 * This drives the "consistently N/A" sentence instead of hardcoding it, so the
 * claim stays true as the data improves.
 */
export interface FieldCoverage {
  field: string;
  present: number;
  total: number;
}

/** The distinct values seen for a spec, plus anything that would not parse. */
export interface ValueSpread {
  values: Tally[];
  /** Raw strings that could not be read as a size — surfaced, never dropped. */
  unparsed: string[];
  /** Devices where the field was blank. */
  missing: number;
}

export interface VariantGroup {
  variant: Variant;
  count: number;
  ram: ValueSpread;
  storage: ValueSpread;
  processors: Tally[];
  years: { min: number | null; max: number | null; unknown: number };
  statuses: Tally[];
}

export interface ModelGroup {
  model: string;
  count: number;
  variants: VariantGroup[];
}

export interface DeviceSection {
  deviceType: "Laptop" | "Smartphone";
  total: number;
  /** Sorted by count, descending. */
  models: ModelGroup[];
  processors: Tally[];
  statuses: Tally[];
  yearRange: {
    min: number | null;
    max: number | null;
    /** Devices sharing the oldest year — plural because ties are real. */
    oldest: DeviceRef[];
    newest: DeviceRef[];
    unknown: number;
  };
  coverage: FieldCoverage[];
}

export interface AccessorySection {
  total: number;
  /** Accessories carry a quantity; a "unit" count is not the same as a row count. */
  totalUnits: number;
  byType: Tally[];
  byCondition: Tally[];
  statuses: Tally[];
  lowStock: { model: string; accessoryType: string; quantity: number }[];
  coverage: FieldCoverage[];
}

export interface PersonHoldings {
  key: string;
  display: string;
  laptops: DeviceRef[];
  phones: DeviceRef[];
  accessories: DeviceRef[];
}

export interface AssignmentSection {
  people: PersonHoldings[];
  bothLaptopAndPhone: string[];
  laptopOnly: string[];
  phoneOnly: string[];
  unassigned: { laptops: number; phones: number; accessories: number };
  assignedCounts: { laptops: number; phones: number; accessories: number };
}

export interface Anomaly {
  code: string;
  severity: "info" | "warn";
  message: string;
  deviceIds: string[];
}

/** A limitation of the source data, stated in the report rather than hidden. */
export interface DataGap {
  field: string;
  note: string;
}

export interface GadgetReportModel {
  meta: {
    generatedAt: string;
    periodLabel: string;
    dateBasis: DateBasis;
    scope: ReportScope;
    /** Locker/returned devices left out of the totals above. */
    excludedLockerCount: number;
    /** Devices with no date on the chosen basis — excluded when filtering. */
    missingDateCount: number;
    /** True when a period filter is actually narrowing the set. */
    filtered: boolean;
  };
  summary: {
    total: number;
    byType: Tally[];
    byStatus: Tally[];
    byTypeAndStatus: { type: string; status: string; count: number }[];
  };
  laptops: DeviceSection;
  phones: DeviceSection;
  accessories: AccessorySection;
  assignments: AssignmentSection;
  anomalies: Anomaly[];
  dataGaps: DataGap[];
}
