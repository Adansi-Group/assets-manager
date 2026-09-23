// src/reports/gadgets/parse.ts
//
// Pure parsers over the free-text spec fields on Gadget.
//
// Every function here returns an explicit null/"Unknown" rather than guessing.
// Callers keep the raw string so nothing is silently dropped from the report.

import type { Gadget } from "../../types/gadget";

export type Variant = "M1" | "M2" | "M3" | "M4" | "Intel" | "Unknown";

/**
 * Apple silicon / Intel split, read from the processor field and the model name.
 *
 * The model name is checked too because stock is commonly recorded as
 * "MacBook Air M1" with the processor field left empty.
 */
export function parseVariant(gadget: Pick<Gadget, "processor" | "model">): Variant {
  const haystack = `${gadget.processor ?? ""} ${gadget.model ?? ""}`.toLowerCase();
  // Word-boundary match: "m1" must not fire on "hdmi1" or a stray "m10".
  for (const chip of ["m4", "m3", "m2", "m1"] as const) {
    if (new RegExp(`\\b${chip}\\b`).test(haystack)) {
      return chip.toUpperCase() as Variant;
    }
  }
  if (/\bintel\b|\bi[357]\b|\bcore\b|\bx64\b/.test(haystack)) return "Intel";
  return "Unknown";
}

/** Largest plausible storage/RAM figure, in GB, before we call a value suspect. */
const MAX_PLAUSIBLE_GB = 4096;

interface SizeParse {
  gb: number | null;
  /** True when a value was present but could not be read as a size. */
  suspect: boolean;
}

/**
 * Parse a size string to GB.
 *
 * Handles "245.11GB", "1TB", "512 MB", and the bare "500" shorthand. A bare
 * number above MAX_PLAUSIBLE_GB (e.g. the "49438" seen in real records) has no
 * sane unit reading, so it comes back suspect rather than as a wrong number.
 */
export function parseSizeGb(raw: string | undefined | null): SizeParse {
  if (raw === undefined || raw === null) return { gb: null, suspect: false };
  const s = String(raw).trim();
  if (s === "") return { gb: null, suspect: false };

  const m = /^([\d.,]+)\s*(tb|gb|mb)?$/i.exec(s);
  if (!m) return { gb: null, suspect: true };

  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return { gb: null, suspect: true };

  const unit = m[2]?.toLowerCase();
  if (unit === "tb") return { gb: n * 1024, suspect: false };
  if (unit === "mb") return { gb: n / 1024, suspect: false };
  if (unit === "gb") return { gb: n, suspect: n > MAX_PLAUSIBLE_GB };

  // No unit given. Read as GB only if that lands in a believable range.
  return n > MAX_PLAUSIBLE_GB ? { gb: null, suspect: true } : { gb: n, suspect: false };
}

/** Human label for a size, preserving the raw text when it cannot be parsed. */
export function sizeLabel(raw: string | undefined | null): string | null {
  const s = raw === undefined || raw === null ? "" : String(raw).trim();
  if (s === "") return null;
  const { gb } = parseSizeGb(s);
  if (gb === null) return s; // unparseable — show what was actually recorded
  const rounded = Math.round(gb * 100) / 100;
  return `${rounded}GB`;
}

/**
 * RAM is not a column on Gadget, so it is only reportable when someone typed it
 * into a free-text field. Scan the fields where it plausibly lands.
 */
export function parseRamGb(gadget: Pick<Gadget, "processor" | "specifications" | "notes">): number | null {
  const haystack = [gadget.processor, gadget.specifications, gadget.notes]
    .filter(Boolean)
    .join(" ");
  const m = /(\d+(?:\.\d+)?)\s*(gb|mb)\s*(?:of\s*)?ram\b|\bram\s*:?\s*(\d+(?:\.\d+)?)\s*(gb|mb)/i.exec(
    haystack
  );
  if (!m) return null;
  const value = Number(m[1] ?? m[3]);
  const unit = (m[2] ?? m[4] ?? "gb").toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;
  const gb = unit === "mb" ? value / 1024 : value;
  return gb > MAX_PLAUSIBLE_GB ? null : gb;
}

export interface Assignee {
  /** Case/whitespace-folded key for grouping. */
  key: string;
  /** The original spelling, for display. */
  display: string;
}

/**
 * Fold an assignee name for grouping.
 *
 * `assignedTo` is free text with no link to the users collection, so "Grace",
 * "grace " and "Grace" must group together. Deliberately conservative: it folds
 * case and whitespace only. It will NOT merge "Grace" with "Grace A." — that is
 * left to an anomaly so a human decides, because a wrong merge makes the report
 * quietly false.
 */
export function normalizeAssignee(raw: string | undefined | null): Assignee | null {
  if (raw === undefined || raw === null) return null;
  const display = String(raw).replace(/\s+/g, " ").trim();
  if (display === "") return null;
  return { key: display.toLowerCase(), display };
}

/** Strip a parenthetical status note from a name: "Sammy(Faulty)" -> "Sammy". */
export function stripNameAnnotation(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** A year is only usable if it looks like a real manufacture year. */
export function usableYear(year: unknown): number | null {
  if (typeof year !== "number" || !Number.isInteger(year)) return null;
  return year >= 1990 && year <= 2100 ? year : null;
}
