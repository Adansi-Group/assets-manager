import { describe, expect, it } from "vitest";
import { buildStationReport } from "./model";
import { monthRange, resolveRange } from "../shared/period";
import type { Toner, TonerDelivery, TonerReplacement, TonerStock } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";
import type { Gadget } from "../../types/gadget";
import type { Printer } from "../../types/printer";

const ALL = resolveRange(2026, "ALL", "", "");

const toner = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Head Office",
    printerType: "HP LaserJet",
    tonerType: "415A",
    colorType: "Black",
    quantity: 3,
    dateBrought: "2026-01-01",
    ...over,
  }) as Toner;

const pool = (over: Partial<TonerStock> & { id: string }): TonerStock =>
  ({
    tonerType: "415A",
    colorType: "Black",
    quantity: 3,
    dateBrought: "2026-01-01",
    ...over,
  }) as TonerStock;

const printer = (over: Partial<Printer> & { id: string }): Printer =>
  ({
    location: "Travel House",
    model: "HP LaserJet",
    tonerType: "415A",
    printerColorType: "black",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-01",
    ...over,
  }) as Printer;

const replacement = (id: string, dateReplaced: string): TonerReplacement => ({
  id,
  tonerId: "p1",
  location: "Head Office",
  printerType: "HP LaserJet",
  colorType: "Black",
  dateChecked: dateReplaced,
  dateReplaced,
  previousPercentage: 5,
  currentPercentage: 100,
  createdAt: dateReplaced,
});

const delivery = (
  id: string,
  dateReceived: string,
  over: Partial<TonerDelivery> = {}
): TonerDelivery => ({
  id,
  tonerType: "222A",
  colorType: "Black",
  quantity: 1,
  dateReceived,
  ...over,
});

const sheet = (over: Partial<A4Sheet> & { id: string }): A4Sheet =>
  ({
    officeName: "Head Office",
    currentQuantity: 2,
    initialQuantity: 10,
    minimumStockLevel: 3,
    dateAdded: "2026-01-01",
    costPerReam: 40,
    supplier: "Sonlife",
    brand: "Double A",
    status: "In Stock",
    createdAt: "2026-01-01",
    ...over,
  }) as A4Sheet;

const laptop = (over: Partial<Gadget> & { id: string }): Gadget =>
  ({ deviceType: "Laptop", model: "MacBook Air", year: 2021, status: "In-Stock", ...over }) as Gadget;

function build(over: Partial<Parameters<typeof buildStationReport>[0]> = {}) {
  return buildStationReport({
    toners: [toner({ id: "t1" })],
    stock: [pool({ id: "s1" })],
    deliveries: [],
    printers: [printer({ id: "p1" })],
    replacements: [],
    sheets: [sheet({ id: "a1" })],
    gadgets: [laptop({ id: "g1" })],
    range: ALL,
    reorderLevel: 3,
    generatedAt: "2026-09-10",
    ...over,
  });
}

describe("buildStationReport", () => {
  it("rolls up stock across toners and A4", () => {
    const model = build({
      stock: [pool({ id: "s1", quantity: 3 }), pool({ id: "s2", quantity: 5, tonerType: "207A" })],
      deliveries: [],
      sheets: [
        sheet({ id: "a1", currentQuantity: 2, costPerReam: 40 }),
        sheet({ id: "a2", currentQuantity: 10, costPerReam: 40, officeName: "Accra" }),
      ],
    });

    expect(model.toners.unitsInStock).toBe(8);
    expect(model.a4.totalReams).toBe(12);
  });

  it("values A4 stock at the cost per ream recorded against each office", () => {
    const model = build({
      sheets: [
        sheet({ id: "a1", currentQuantity: 2, costPerReam: 40 }),
        sheet({ id: "a2", currentQuantity: 3, costPerReam: 50, officeName: "Accra" }),
      ],
    });

    expect(model.a4.stockValue).toBe(230);
  });

  it("covers only gadgets, toners and A4", () => {
    const model = build();

    expect(model).not.toHaveProperty("internet");
    expect(model).not.toHaveProperty("spend");
  });

  it("names the covered categories that carry no cost field at all", () => {
    const model = build();
    const purchaseCost = model.dataGaps.find(g => g.field === "Purchase cost");

    expect(purchaseCost?.note).toMatch(/Gadgets and Toners/);
    // A zero would read as "nothing was spent"; these have nowhere to record a price.
    expect(purchaseCost?.note).not.toMatch(/GHS\s*0(?![\d.])/);
  });

  it("averages the days between toner replacements at the same printer", () => {
    const model = build({
      replacements: [replacement("r1", "2026-01-01"), replacement("r2", "2026-01-31")],
    });

    expect(model.toners.replacements).toBe(2);
    expect(model.toners.averageDaysBetween).toBe(30);
  });

  it("does not invent a cartridge life from a single replacement", () => {
    const model = build({ replacements: [replacement("r1", "2026-01-01")] });

    expect(model.toners.averageDaysBetween).toBeNull();
    expect(model.toners.durationSamples).toBe(0);
  });

  it("breaks A4 stock down by office and flags offices below their minimum", () => {
    const model = build({
      sheets: [
        sheet({ id: "a1", officeName: "Head Office", currentQuantity: 8 }),
        sheet({ id: "a2", officeName: "Accra", currentQuantity: 1, status: "Low Stock" }),
      ],
    });

    expect(model.a4.byOffice.map(o => o.office)).toEqual(["Head Office", "Accra"]);
    expect(model.a4.low.map(s => s.officeName)).toEqual(["Accra"]);
  });

  it("counts distinct cartridge pools rather than printers or branches", () => {
    const model = build({
      stock: [
        pool({ id: "s1", tonerType: "415A", quantity: 3 }),
        pool({ id: "s2", tonerType: "207A", quantity: 2 }),
        pool({ id: "s3", tonerType: "222A", quantity: 4 }),
      ],
    });

    expect(model.toners.lines).toBe(3);
    expect(model.toners.unitsInStock).toBe(9);
  });

  it("carries the gadget report through untouched so the accepted format is reused", () => {
    const model = build({ gadgets: [laptop({ id: "g1" }), laptop({ id: "g2", status: "In-Use", assignedTo: "Grace" })] });

    expect(model.gadgets.summary.total).toBe(2);
    expect(model.gadgets.laptops.total).toBe(2);
  });

  it("flags offices whose paper cannot be projected forward", () => {
    const model = build({
      sheets: [
        sheet({ id: "a1", averageMonthlyUsage: 3 }),
        sheet({ id: "a2", officeName: "Accra" }),
      ],
    });

    expect(model.a4.usageUnknown).toBe(1);
    const gap = model.dataGaps.find(g => g.field === "A4 usage rate");
    expect(gap?.note).toMatch(/1 of the 2 offices has no monthly usage/);
  });

  it("holds no figures it cannot source when every dataset is empty", () => {
    const model = buildStationReport({
      toners: [],
      stock: [],
      deliveries: [],
      printers: [],
      replacements: [],
      sheets: [],
      gadgets: [],
      range: ALL,
      reorderLevel: 3,
      generatedAt: "2026-09-10",
    });

    expect(model.toners.unitsInStock).toBe(0);
    expect(model.toners.averageDaysBetween).toBeNull();
    expect(model.a4.totalReams).toBe(0);
  });
});

describe("buildStationReport activity", () => {
  const AUGUST = monthRange(2026, 7);

  const gadgetOn = (id: string, createdAt: string): Gadget =>
    ({ id, deviceType: "Laptop", model: "MacBook Air", year: 2021, status: "In-Stock", createdAt }) as unknown as Gadget;

  it("counts only the toner replacements dated inside the period", () => {
    const model = build({
      range: AUGUST,
      replacements: [
        replacement("r1", "2026-08-04"),
        replacement("r2", "2026-08-29"),
        replacement("r3", "2026-07-31"),
        replacement("r4", "2026-09-01"),
      ],
    });

    expect(model.activity.tonerReplacements).toHaveLength(2);
  });

  it("lists the devices added during the period", () => {
    const model = build({
      range: AUGUST,
      gadgets: [gadgetOn("g1", "2026-08-12"), gadgetOn("g2", "2026-06-01")],
    });

    expect(model.activity.gadgetsAdded.map(g => g.date)).toEqual(["2026-08-12"]);
  });

  it("counts undated devices so a quiet month is not confused with missing data", () => {
    const model = build({
      range: AUGUST,
      gadgets: [gadgetOn("g1", "2026-08-12"), laptop({ id: "g2" })],
    });

    expect(model.activity.gadgetsUndated).toBe(1);
  });

  it("names the offices restocked during the period", () => {
    const model = build({
      range: AUGUST,
      sheets: [
        sheet({ id: "a1", officeName: "Kumasi", lastRestocked: "2026-08-19" }),
        sheet({ id: "a2", officeName: "Head Office", lastRestocked: "2026-05-02" }),
      ],
    });

    expect(model.activity.a4Restocked.map(a => a.office)).toEqual(["Kumasi"]);
  });

  it("reports the period as unfiltered for an all-time report", () => {
    expect(build().activity.filtered).toBe(false);
    expect(build({ range: AUGUST }).activity.filtered).toBe(true);
  });

  it("flags a period in which nothing at all was recorded", () => {
    const model = build({ range: AUGUST, replacements: [], gadgets: [], sheets: [] });

    expect(model.activity.empty).toBe(true);
  });

  it("leaves the current stock figures unfiltered, since they are today's position", () => {
    const model = build({
      range: AUGUST,
      gadgets: [gadgetOn("g1", "2026-08-12"), gadgetOn("g2", "2026-06-01")],
      stock: [pool({ id: "s1", quantity: 4 })],
      deliveries: [],
    });

    // Both devices are still on the books today, whatever month they arrived.
    expect(model.gadgets.summary.total).toBe(2);
    expect(model.toners.unitsInStock).toBe(4);
  });
});

describe("buildStationReport activity detail", () => {
  const AUGUST = monthRange(2026, 7);

  const gadgetOn = (id: string, createdAt: string, over: Partial<Gadget> = {}): Gadget =>
    ({ id, deviceType: "Laptop", model: "MacBook Air", year: 2021, status: "In-Stock", createdAt, ...over }) as unknown as Gadget;

  const replacementAt = (id: string, date: string, over: Partial<TonerReplacement> = {}): TonerReplacement =>
    ({ ...replacement(id, date), ...over });

  it("breaks the period's replacements down by colour and printer", () => {
    const model = build({
      range: AUGUST,
      replacements: [
        replacementAt("r1", "2026-08-04", { colorType: "Black", printerType: "HP LaserJet" }),
        replacementAt("r2", "2026-08-11", { colorType: "Black", printerType: "HP LaserJet" }),
        replacementAt("r3", "2026-08-19", { colorType: "Cyan", printerType: "Canon iR" }),
      ],
    });

    expect(model.activity.tonerReplacementsByColour).toEqual([
      { key: "Black", count: 2 },
      { key: "Cyan", count: 1 },
    ]);
    expect(model.activity.tonerReplacementsByPrinter[0]).toEqual({ key: "HP LaserJet", count: 2 });
  });

  it("groups the devices added by type", () => {
    const model = build({
      range: AUGUST,
      gadgets: [
        gadgetOn("g1", "2026-08-02"),
        gadgetOn("g2", "2026-08-03", { deviceType: "Smartphone", model: "Galaxy A57 5G" }),
        gadgetOn("g3", "2026-08-04", { deviceType: "Smartphone", model: "Galaxy A35 5G" }),
      ],
    });

    expect(model.activity.gadgetsAddedByType).toEqual([
      { key: "Smartphone", count: 2 },
      { key: "Laptop", count: 1 },
    ]);
  });

  it("records who a device added in the period went to", () => {
    const model = build({
      range: AUGUST,
      gadgets: [gadgetOn("g1", "2026-08-02", { status: "In-Use", assignedTo: "Esther" })],
    });

    expect(model.activity.gadgetsAdded[0].assignedTo).toBe("Esther");
  });

  it("names each restocked office once, even when it has several stock records", () => {
    const model = build({
      range: AUGUST,
      sheets: [
        sheet({ id: "a1", officeName: "Nester", lastRestocked: "2026-08-04" }),
        sheet({ id: "a2", officeName: "Nester", lastRestocked: "2026-08-20" }),
      ],
    });

    expect(model.activity.a4Restocked.map(a => a.office)).toEqual(["Nester"]);
  });

  it("lists the toner stock brought in during the period", () => {
    const model = build({
      range: AUGUST,
      toners: [
        toner({ id: "t1", dateBrought: "2026-08-07", colorType: "Black", quantity: 5 }),
        toner({ id: "t2", dateBrought: "2026-02-01" }),
      ],
    });

    expect(model.activity.tonersBroughtRecords).toHaveLength(1);
    expect(model.activity.tonersBrought).toBe(1);
  });

  it("counts the cartridges received in the period and breaks them down", () => {
    const model = build({
      range: AUGUST,
      deliveries: [
        delivery("d1", "2026-08-03", { tonerType: "222A", colorType: "Black", quantity: 3 }),
        delivery("d2", "2026-08-21", { tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 2 }),
        // Same pool typed differently: one line, not two.
        delivery("d3", "2026-08-25", { tonerType: " 222a ", colorType: "black", quantity: 1 }),
      ],
    });

    expect(model.activity.tonerDeliveries.map(d => d.id)).toEqual(["d1", "d2", "d3"]);
    expect(model.activity.cartridgesReceived).toBe(6);
    expect(model.activity.cartridgesReceivedByCartridge).toEqual([
      { key: "Black 222A", count: 4 },
      { key: "Cyan CARTRIDGE 069", count: 2 },
    ]);
  });

  it("ignores deliveries received outside the period", () => {
    const model = build({
      range: AUGUST,
      deliveries: [
        delivery("d1", "2026-07-31", { quantity: 5 }),
        delivery("d2", "2026-09-01", { quantity: 7 }),
        delivery("d3", "2026-08-15", { quantity: 2 }),
      ],
    });

    expect(model.activity.tonerDeliveries.map(d => d.id)).toEqual(["d3"]);
    expect(model.activity.cartridgesReceived).toBe(2);
  });

  it("does not call a month with only deliveries empty", () => {
    const model = build({
      range: AUGUST,
      toners: [],
      replacements: [],
      sheets: [],
      gadgets: [],
      deliveries: [delivery("d1", "2026-08-15")],
    });

    expect(model.activity.empty).toBe(false);
  });

  it("never counts a stock pool as a delivery", () => {
    const model = build({
      range: AUGUST,
      toners: [],
      stock: [pool({ id: "s1", dateBrought: "2026-08-10", quantity: 9 })],
      replacements: [],
      sheets: [],
      gadgets: [],
      deliveries: [],
    });

    expect(model.activity.cartridgesReceived).toBe(0);
    expect(model.activity.tonersBrought).toBe(0);
    expect(model.activity.empty).toBe(true);
  });
});
