import { describe, expect, it } from "vitest";
import {
  normalizeAssignee,
  parseRamGb,
  parseSizeGb,
  parseVariant,
  sizeLabel,
  stripNameAnnotation,
  usableYear,
} from "./parse";

describe("parseVariant", () => {
  it("reads the chip from the processor field", () => {
    expect(parseVariant({ processor: "Apple M1", model: "MacBook Air" })).toBe("M1");
    expect(parseVariant({ processor: "Intel Core i5", model: "MacBook Air" })).toBe("Intel");
  });

  it("falls back to the model name when processor is empty", () => {
    expect(parseVariant({ processor: "", model: "MacBook Air M2" })).toBe("M2");
    expect(parseVariant({ processor: undefined, model: "MacBook Pro M1" })).toBe("M1");
  });

  it("reads Intel from an x64 processor string", () => {
    // The Lenovo in the real data records "Intel x64".
    expect(parseVariant({ processor: "Intel x64", model: "Lenovo Windows 10 Pro" })).toBe("Intel");
  });

  it("does not fire on a chip name embedded in another word", () => {
    expect(parseVariant({ processor: "HDMI1 dock", model: "Dock" })).toBe("Unknown");
    expect(parseVariant({ processor: "", model: "Widget M10" })).toBe("Unknown");
  });

  it("returns Unknown rather than guessing", () => {
    expect(parseVariant({ processor: "", model: "" })).toBe("Unknown");
    expect(parseVariant({ processor: undefined, model: "Galaxy A25" })).toBe("Unknown");
  });
});

describe("parseSizeGb", () => {
  it("parses explicit units", () => {
    expect(parseSizeGb("245.11GB")).toEqual({ gb: 245.11, suspect: false });
    expect(parseSizeGb("500GB")).toEqual({ gb: 500, suspect: false });
    expect(parseSizeGb("1TB")).toEqual({ gb: 1024, suspect: false });
    expect(parseSizeGb("512 MB")).toEqual({ gb: 0.5, suspect: false });
  });

  it("treats a bare plausible number as GB", () => {
    expect(parseSizeGb("500")).toEqual({ gb: 500, suspect: false });
  });

  it("flags the unit-less outlier rather than inventing a number", () => {
    // "49438" appears in the real data; a former colleague flagged it by hand.
    expect(parseSizeGb("49438")).toEqual({ gb: null, suspect: true });
  });

  it("treats absent values as absent, not suspect", () => {
    expect(parseSizeGb("")).toEqual({ gb: null, suspect: false });
    expect(parseSizeGb(undefined)).toEqual({ gb: null, suspect: false });
    expect(parseSizeGb(null)).toEqual({ gb: null, suspect: false });
  });

  it("flags junk", () => {
    expect(parseSizeGb("N/A")).toEqual({ gb: null, suspect: true });
    expect(parseSizeGb("0GB")).toEqual({ gb: null, suspect: true });
  });
});

describe("sizeLabel", () => {
  it("normalises parseable sizes", () => {
    expect(sizeLabel("245.11GB")).toBe("245.11GB");
    expect(sizeLabel("1TB")).toBe("1024GB");
  });

  it("preserves the raw text when unparseable, rather than hiding it", () => {
    expect(sizeLabel("49438")).toBe("49438");
  });

  it("returns null for absent values", () => {
    expect(sizeLabel("")).toBeNull();
    expect(sizeLabel(undefined)).toBeNull();
  });
});

describe("parseRamGb", () => {
  it("finds RAM stated in free text", () => {
    expect(parseRamGb({ processor: "Intel Core i5 8GB RAM" })).toBe(8);
    expect(parseRamGb({ specifications: "RAM: 16GB" })).toBe(16);
    expect(parseRamGb({ notes: "shipped with 4 GB ram" })).toBe(4);
  });

  it("returns null when RAM was never recorded", () => {
    // RAM is not a column on Gadget, so this is the common case.
    expect(parseRamGb({ processor: "Apple M1" })).toBeNull();
    expect(parseRamGb({})).toBeNull();
  });

  it("does not mistake storage for RAM", () => {
    expect(parseRamGb({ processor: "Apple M1", specifications: "245.11GB storage" })).toBeNull();
  });
});

describe("normalizeAssignee", () => {
  it("folds case and whitespace so one person groups once", () => {
    expect(normalizeAssignee("Grace")?.key).toBe("grace");
    expect(normalizeAssignee("  grace ")?.key).toBe("grace");
    expect(normalizeAssignee("Bright  Darkwa")?.key).toBe("bright darkwa");
  });

  it("keeps the original spelling for display", () => {
    expect(normalizeAssignee("  Bright  Darkwa ")?.display).toBe("Bright Darkwa");
  });

  it("treats empty and absent as unassigned", () => {
    expect(normalizeAssignee("")).toBeNull();
    expect(normalizeAssignee("   ")).toBeNull();
    expect(normalizeAssignee(undefined)).toBeNull();
  });

  it("does NOT merge similar-but-distinct names", () => {
    // Merging these would quietly reassign someone's device in the report.
    expect(normalizeAssignee("Grace")?.key).not.toBe(normalizeAssignee("Grace A.")?.key);
  });
});

describe("stripNameAnnotation", () => {
  it("removes a parenthetical status from a name", () => {
    expect(stripNameAnnotation("Sammy(Faulty)")).toBe("Sammy");
    expect(stripNameAnnotation("Kojo (left)")).toBe("Kojo");
  });

  it("leaves plain names alone", () => {
    expect(stripNameAnnotation("Bright Darkwa")).toBe("Bright Darkwa");
  });
});

describe("usableYear", () => {
  it("accepts real manufacture years", () => {
    expect(usableYear(2014)).toBe(2014);
    expect(usableYear(2021)).toBe(2021);
  });

  it("rejects sentinels and junk", () => {
    expect(usableYear(0)).toBeNull();
    expect(usableYear(undefined)).toBeNull();
    expect(usableYear("2014")).toBeNull();
    expect(usableYear(1.5)).toBeNull();
  });
});
