import { describe, expect, it } from "vitest";
import type { Gadget } from "../../types/gadget";
import { resolveRange } from "../shared/period";
import { buildGadgetReport, type BuildOptions } from "./buildModel";

/**
 * A fixture modelled on the real estate the former colleague reported by hand:
 * MacBook Air M1s in stock, older Intel Airs in use, a MacBook Pro with the
 * nonsense "49438" storage, and Sammy(Faulty) holding both a laptop and a phone.
 */
function laptop(over: Partial<Gadget> & { id: string }): Gadget {
  return {
    deviceType: "Laptop",
    model: "MacBook Air",
    year: 2020,
    status: "In-Stock",
    ...over,
  } as Gadget;
}

function phone(over: Partial<Gadget> & { id: string }): Gadget {
  return {
    deviceType: "Smartphone",
    model: "Galaxy A25",
    year: 0, // phones in the real data carry no usable year
    status: "In-Use",
    ...over,
  } as Gadget;
}

const FIXTURE: Gadget[] = [
  // 3 x MacBook Air M1 2020, in stock, uniform specs
  laptop({ id: "l1", processor: "Apple M1 8GB RAM", storage: "245.11GB", serialNumber: "S1" }),
  laptop({ id: "l2", processor: "Apple M1 8GB RAM", storage: "245.11GB", serialNumber: "S2" }),
  laptop({ id: "l3", processor: "Apple M1 8GB RAM", storage: "245.11GB", serialNumber: "S3" }),
  // Intel Airs, in use, varied years — 2014 is the oldest device in the estate
  laptop({
    id: "l4",
    processor: "Intel Core i5 4GB RAM",
    storage: "121.02GB",
    year: 2014,
    status: "In-Use",
    assignedTo: "Grace",
    serialNumber: "S4",
  }),
  laptop({
    id: "l5",
    processor: "Intel Core i7 16GB RAM",
    storage: "500GB",
    year: 2018,
    status: "In-Use",
    assignedTo: "Bright Darkwa",
    serialNumber: "S5",
  }),
  laptop({
    id: "l6",
    model: "MacBook Air",
    processor: "Intel Core i5 8GB RAM",
    storage: "250GB",
    year: 2019,
    status: "In-Use",
    assignedTo: "Gifty",
    serialNumber: "FVFCR19BMNHQ",
  }),
  // MacBook Pro M1 2021 — newest, and the storage value that makes no sense
  laptop({
    id: "l7",
    model: "MacBook Pro",
    processor: "Apple M1 16GB RAM",
    storage: "49438",
    year: 2021,
    status: "In-Use",
    assignedTo: "Sammy(Faulty)",
    serialNumber: "S7",
  }),
  // Phones — no processor, no storage, no usable year
  phone({ id: "p1", assignedTo: "Grace" }),
  phone({ id: "p2", model: "Galaxy A23", assignedTo: "Bright Darkwa" }),
  phone({ id: "p3", model: "Galaxy A31", assignedTo: "Sammy(Faulty)" }),
  phone({ id: "p4", model: "Galaxy A36", assignedTo: "Julius" }),
  // Accessories
  {
    id: "a1",
    deviceType: "Accessory",
    model: "USB-C Power Adapter",
    accessoryType: "Adapter",
    quantity: 8,
    condition: "New",
    year: 2025,
    status: "In-Stock",
  } as Gadget,
  {
    id: "a2",
    deviceType: "Accessory",
    model: "USB-C Cable",
    accessoryType: "Cable",
    quantity: 1,
    condition: "Good",
    year: 2025,
    status: "In-Stock",
  } as Gadget,
];

const OPTIONS: BuildOptions = {
  range: resolveRange(2026, "ALL", "", ""),
  dateBasis: "purchaseDate",
  scope: "active",
  returned: [],
  generatedAt: "2026-07-16",
};

const report = buildGadgetReport(FIXTURE, OPTIONS);

describe("summary", () => {
  it("counts the estate by type", () => {
    expect(report.summary.total).toBe(13);
    expect(report.summary.byType).toEqual([
      { key: "Laptop", count: 7 },
      { key: "Smartphone", count: 4 },
      { key: "Accessory", count: 2 },
    ]);
  });

  it("counts by status", () => {
    expect(report.summary.byStatus).toEqual([
      { key: "In-Use", count: 8 },
      { key: "In-Stock", count: 5 },
    ]);
  });
});

describe("laptop section", () => {
  it("groups by model, commonest first", () => {
    expect(report.laptops.models.map(m => [m.model, m.count])).toEqual([
      ["MacBook Air", 6],
      ["MacBook Pro", 1],
    ]);
  });

  it("splits a model into M1 and Intel variants", () => {
    const air = report.laptops.models.find(m => m.model === "MacBook Air")!;
    expect(air.variants.map(v => [v.variant, v.count])).toEqual([
      ["Intel", 3],
      ["M1", 3],
    ]);
  });

  it("reports the uniform spec of the M1 Airs", () => {
    const air = report.laptops.models.find(m => m.model === "MacBook Air")!;
    const m1 = air.variants.find(v => v.variant === "M1")!;
    expect(m1.ram.values).toEqual([{ key: "8GB", count: 3 }]);
    expect(m1.storage.values).toEqual([{ key: "245.11GB", count: 3 }]);
    expect(m1.years).toEqual({ min: 2020, max: 2020, unknown: 0 });
  });

  it("names the oldest and newest laptops with their holders", () => {
    // The colleague's report: "The oldest laptop is a MacBook Air from 2014,
    // assigned to Grace." The newest are the 2021 MacBook Pros.
    expect(report.laptops.yearRange.min).toBe(2014);
    expect(report.laptops.yearRange.max).toBe(2021);

    expect(report.laptops.yearRange.oldest).toHaveLength(1);
    expect(report.laptops.yearRange.oldest[0]).toMatchObject({
      model: "MacBook Air",
      year: 2014,
      assignedTo: "Grace",
    });
    expect(report.laptops.yearRange.newest[0]).toMatchObject({
      model: "MacBook Pro",
      year: 2021,
    });
  });

  it("surfaces the unreadable storage value instead of dropping it", () => {
    const pro = report.laptops.models.find(m => m.model === "MacBook Pro")!;
    expect(pro.variants[0].storage.unparsed).toEqual(["49438"]);
  });

  it("never reports a suspect storage value as a real spec", () => {
    // Otherwise the report claims both "all have 49438 storage" AND
    // "49438 cannot be read as a size" — two contradictory statements.
    const pro = report.laptops.models.find(m => m.model === "MacBook Pro")!;
    expect(pro.variants[0].storage.values).toEqual([]);
  });

  it("excludes an implausibly large size even when it carries a unit", () => {
    const odd = buildGadgetReport(
      [laptop({ id: "big", model: "Odd Laptop", processor: "Apple M1", storage: "8000GB" })],
      OPTIONS
    );
    const spread = odd.laptops.models[0].variants[0].storage;
    expect(spread.values).toEqual([]);
    expect(spread.unparsed).toEqual(["8000GB"]);
  });

  it("orders a spec spread smallest to largest, not by frequency", () => {
    // "4GB, 8GB and 16GB" reads as a range; frequency order reads as a mistake.
    const air = report.laptops.models.find(m => m.model === "MacBook Air")!;
    const intel = air.variants.find(v => v.variant === "Intel")!;
    expect(intel.ram.values.map(v => v.key)).toEqual(["4GB", "8GB", "16GB"]);
    expect(intel.storage.values.map(v => v.key)).toEqual(["121.02GB", "250GB", "500GB"]);
  });
});

describe("phone section", () => {
  it("records zero coverage for the fields phones never carry", () => {
    // This is what drives the colleague's "consistently N/A" sentence.
    const byField = Object.fromEntries(report.phones.coverage.map(c => [c.field, c]));
    expect(byField["Processor"]).toEqual({ field: "Processor", present: 0, total: 4 });
    expect(byField["Storage"]).toEqual({ field: "Storage", present: 0, total: 4 });
    expect(byField["Year"]).toEqual({ field: "Year", present: 0, total: 4 });
  });

  it("treats a 0 year as unknown rather than year zero", () => {
    expect(report.phones.yearRange.min).toBeNull();
    expect(report.phones.yearRange.unknown).toBe(4);
  });
});

describe("assignments", () => {
  it("finds the people holding both a laptop and a phone", () => {
    expect(report.assignments.bothLaptopAndPhone).toEqual([
      "Bright Darkwa",
      "Grace",
      "Sammy(Faulty)",
    ]);
  });

  it("separates people holding only one kind of device", () => {
    expect(report.assignments.laptopOnly).toEqual(["Gifty"]);
    expect(report.assignments.phoneOnly).toEqual(["Julius"]);
  });

  it("counts unassigned stock", () => {
    expect(report.assignments.unassigned.laptops).toBe(3);
    expect(report.assignments.unassigned.phones).toBe(0);
  });
});

describe("accessories", () => {
  it("counts rows and units separately", () => {
    expect(report.accessories.total).toBe(2);
    expect(report.accessories.totalUnits).toBe(9);
  });

  it("flags low stock", () => {
    expect(report.accessories.lowStock).toEqual([
      { model: "USB-C Cable", accessoryType: "Cable", quantity: 1 },
    ]);
  });
});

describe("anomalies", () => {
  const codes = report.anomalies.map(a => a.code);

  it("catches the storage outlier the colleague spotted by hand", () => {
    expect(codes).toContain("storage-outlier");
    const a = report.anomalies.find(x => x.code === "storage-outlier")!;
    expect(a.deviceIds).toEqual(["l7"]);
    expect(a.message).toContain("49438");
  });

  it("catches a status baked into an assignee name", () => {
    expect(codes).toContain("status-in-assignee-name");
    const a = report.anomalies.find(x => x.code === "status-in-assignee-name")!;
    expect(a.deviceIds.sort()).toEqual(["l7", "p3"]);
  });

  it("puts warnings before informational notes", () => {
    const severities = report.anomalies.map(a => a.severity);
    expect(severities.indexOf("warn")).toBeLessThan(severities.lastIndexOf("info"));
  });
});

describe("data gaps", () => {
  it("always states that gadget cost is not recorded", () => {
    expect(report.dataGaps.map(g => g.field)).toContain("Purchase cost");
  });

  it("states that laptops and phones have no branch", () => {
    expect(report.dataGaps.map(g => g.field)).toContain("Branch / office");
  });

  it("only blames the period filter for undated devices when it filters on that date", () => {
    // A device recorded in Q2 but with no purchase date: it survives a
    // createdAt filter, so saying "the period filter excludes them" is false.
    const q2Created = laptop({
      id: "c1",
      createdAt: { seconds: Date.UTC(2026, 4, 15) / 1000 } as unknown as Gadget["createdAt"],
    });
    const range = resolveRange(2026, "Q2", "", "");

    const byCreated = buildGadgetReport([q2Created], { ...OPTIONS, dateBasis: "createdAt", range });
    expect(byCreated.summary.total).toBe(1);
    const createdGap = byCreated.dataGaps.find(g => g.field === "Purchase date")!;
    expect(createdGap.note).not.toContain("The period filter excludes them");
    expect(createdGap.note).toContain("When a period is filtered by purchase date");

    // Filtering on purchaseDate: now the claim is true.
    const dated = [q2Created, laptop({ id: "p1", purchaseDate: "2026-05-02" })];
    const byPurchase = buildGadgetReport(dated, { ...OPTIONS, dateBasis: "purchaseDate", range });
    expect(byPurchase.dataGaps.find(g => g.field === "Purchase date")).toBeUndefined();
  });

  it("reports empty fields once per device type, not once per field", () => {
    const smartphoneGaps = report.dataGaps.filter(g => g.field === "Smartphones");
    expect(smartphoneGaps).toHaveLength(1);
    // The fields phones never carry, named together in a single line.
    expect(smartphoneGaps[0].note).toContain("Processor");
    expect(smartphoneGaps[0].note).toContain("Storage");
    expect(smartphoneGaps[0].note).toContain("Year");
    expect(smartphoneGaps[0].note).toContain("any of the 4 smartphones");
  });
});

describe("scope and period", () => {
  it("discloses locker devices left out of the totals", () => {
    const withReturned = buildGadgetReport(FIXTURE, {
      ...OPTIONS,
      returned: [laptop({ id: "r1", lockerDevice: true })],
    });
    expect(withReturned.meta.excludedLockerCount).toBe(1);
    expect(withReturned.summary.total).toBe(13);
  });

  it("includes locker devices when the scope asks for them", () => {
    const full = buildGadgetReport(FIXTURE, {
      ...OPTIONS,
      scope: "active+locker",
      returned: [laptop({ id: "r1", lockerDevice: true })],
    });
    expect(full.meta.excludedLockerCount).toBe(0);
    expect(full.summary.total).toBe(14);
  });

  it("does not double-count a locker device that is also active", () => {
    // getGadgets() keeps a reassigned locker device, and getReturnedDevices()
    // returns it too. Counting both lists naively would report it twice.
    const reassigned = laptop({ id: "l1", lockerDevice: true, lockerAction: "Reassigned" });
    const both = buildGadgetReport(FIXTURE, {
      ...OPTIONS,
      scope: "active+locker",
      returned: [reassigned],
    });
    expect(both.summary.total).toBe(13);
    expect(both.meta.excludedLockerCount).toBe(0);
  });

  it("does not report an overlapping device as excluded", () => {
    const reassigned = laptop({ id: "l1", lockerDevice: true, lockerAction: "Reassigned" });
    const activeScope = buildGadgetReport(FIXTURE, { ...OPTIONS, returned: [reassigned] });
    // "l1" is already in the active set, so nothing was actually excluded.
    expect(activeScope.meta.excludedLockerCount).toBe(0);
  });

  it("does not filter when the period is All time", () => {
    // Every fixture device lacks a purchaseDate; All time must still count them.
    expect(report.meta.filtered).toBe(false);
    expect(report.summary.total).toBe(13);
    expect(report.meta.missingDateCount).toBe(13);
  });

  it("narrows to a real quarter, excluding undated devices", () => {
    const dated = [
      ...FIXTURE,
      laptop({ id: "q1", purchaseDate: "2026-05-02" }),
      laptop({ id: "q2", purchaseDate: "2026-11-30" }),
    ];
    const q2 = buildGadgetReport(dated, {
      ...OPTIONS,
      range: resolveRange(2026, "Q2", "", ""),
    });
    expect(q2.meta.filtered).toBe(true);
    expect(q2.summary.total).toBe(1);
  });
});
