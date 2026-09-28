import { describe, expect, it } from "vitest";
import { buildStationReport, type StationInput } from "./model";
import { narrateStation } from "./narrate";
import { monthRange, resolveRange } from "../shared/period";
import type { Block } from "../shared/blocks";
import type { Toner, TonerDelivery, TonerReplacement, TonerStock } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";
import type { Gadget } from "../../types/gadget";
import type { Printer } from "../../types/printer";

const AUGUST = monthRange(2026, 7);
const ALL = resolveRange(2026, "ALL", "", "");

/** All prose in the document, for asserting that a claim was actually made. */
const allText = (blocks: Block[]) => blocks.map(b => ("text" in b ? b.text : "")).join("\n");

const headings = (blocks: Block[]) =>
  blocks.filter(b => b.kind === "heading").map(b => (b as { text: string }).text);

const toner = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Travel House",
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

const replacement = (
  id: string,
  dateReplaced: string,
  over: Partial<TonerReplacement> = {}
): TonerReplacement => ({
  id,
  tonerId: "p1",
  location: "Travel House",
  printerType: "HP LaserJet",
  colorType: "Black",
  dateChecked: dateReplaced,
  dateReplaced,
  previousPercentage: 5,
  currentPercentage: 100,
  createdAt: dateReplaced,
  ...over,
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
    officeName: "Nester",
    currentQuantity: 6,
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

const gadgetOn = (id: string, createdAt: string, over: Partial<Gadget> = {}): Gadget =>
  ({
    id,
    deviceType: "Laptop",
    model: "MacBook Air",
    year: 2021,
    status: "In-Stock",
    createdAt,
    ...over,
  }) as unknown as Gadget;

/** A month with something in every category. */
function august(over: Partial<StationInput> = {}) {
  return narrateStation(
    buildStationReport({
      toners: [toner({ id: "t1" })],
      stock: [pool({ id: "s1" })],
      deliveries: [],
      printers: [printer({ id: "p1" })],
      replacements: [replacement("r1", "2026-08-04"), replacement("r2", "2026-08-19")],
      sheets: [sheet({ id: "a1", lastRestocked: "2026-08-14" })],
      gadgets: [gadgetOn("g1", "2026-08-09")],
      range: AUGUST,
      reorderLevel: 3,
      generatedAt: "2026-09-10",
      ...over,
    })
  );
}

describe("narrateStation for a single month", () => {
  it("is prose only — no tables, charts or bullet lists", () => {
    for (const block of august()) expect(["heading", "paragraph"]).toContain(block.kind);
  });

  it("gives a section each to gadgets, toners and A4 paper", () => {
    expect(headings(august())).toEqual(["Gadgets", "Toners", "A4 Paper", "A Note on the Records"]);
  });

  it("reports the month's activity without restating the standing inventory", () => {
    const text = allText(august());

    expect(text).not.toMatch(/on the books|in stock across|on hand across|commonest laptop/i);
    expect(text).not.toMatch(/things stand today/i);
  });

  it("fits on one page", () => {
    expect(allText(august()).split(/\s+/).length).toBeLessThan(400);
  });

  it("names the month in the opening paragraph", () => {
    expect(allText([august()[0]])).toMatch(/August 2026/);
  });

  it("names the devices added during the month and who they went to", () => {
    const text = allText(
      august({
        gadgets: [
          gadgetOn("g1", "2026-08-09", { status: "In-Use", assignedTo: "Esther Nyarkoh" }),
          gadgetOn("g2", "2026-08-12", { deviceType: "Smartphone", model: "Galaxy A57 5G" }),
        ],
      })
    );

    expect(text).toMatch(/MacBook Air/);
    expect(text).toMatch(/Esther Nyarkoh/);
    expect(text).toMatch(/Galaxy A57 5G/);
  });

  it("gives the month's toner replacements with where and what colour", () => {
    const text = allText(
      august({
        replacements: [
          replacement("r1", "2026-08-04", { colorType: "Black" }),
          replacement("r2", "2026-08-19", { colorType: "Cyan", location: "Tema Branch" }),
        ],
      })
    );

    expect(text).toMatch(/2 toner cartridges were replaced/i);
    expect(text).toMatch(/Travel House/);
    expect(text).toMatch(/black/i);
  });

  it("names each restocked office once, however many stock records it has", () => {
    const text = allText(
      august({
        sheets: [
          sheet({ id: "a1", officeName: "Nester", lastRestocked: "2026-08-04" }),
          sheet({ id: "a2", officeName: "Nester", lastRestocked: "2026-08-20" }),
        ],
      })
    );

    expect(text).not.toMatch(/Nester and Nester/);
    expect(text).toMatch(/Nester/);
  });

  it("says a category was quiet rather than leaving it out", () => {
    const text = allText(august({ gadgets: [], sheets: [] }));

    expect(text).toMatch(/no devices were added/i);
    expect(text).toMatch(/no A4|no paper/i);
  });

  it("says plainly that this is activity, not a stocktake", () => {
    expect(allText(august())).toMatch(/not a stocktake|does not say what is currently held/i);
  });

  it("reports a completely quiet month without implying the estate is empty", () => {
    const text = allText(august({ replacements: [], gadgets: [], sheets: [], toners: [] }));

    expect(text).toMatch(/nothing was recorded/i);
    expect(text).not.toMatch(/no devices are recorded in the Assets Station\./i);
  });

  it("still reads correctly when the period is all time", () => {
    const text = allText(
      narrateStation(
        buildStationReport({
          toners: [toner({ id: "t1" })],
          stock: [pool({ id: "s1" })],
          deliveries: [],
          printers: [printer({ id: "p1" })],
          replacements: [replacement("r1", "2026-03-04")],
          sheets: [sheet({ id: "a1", lastRestocked: "2026-02-14" })],
          gadgets: [gadgetOn("g1", "2026-01-09")],
          range: ALL,
          reorderLevel: 3,
          generatedAt: "2026-09-10",
        })
      )
    );

    expect(text).toMatch(/all time/i);
    expect(text).not.toMatch(/undefined|NaN|\[object/);
  });

  it("produces a readable document from empty data instead of throwing", () => {
    const blocks = narrateStation(
      buildStationReport({
        toners: [],
        stock: [],
        deliveries: [],
        printers: [],
        replacements: [],
        sheets: [],
        gadgets: [],
        range: AUGUST,
        reorderLevel: 3,
        generatedAt: "2026-09-10",
      })
    );

    expect(blocks.length).toBeGreaterThan(0);
    expect(allText(blocks)).not.toMatch(/undefined|NaN|\[object/);
  });

  it("writes no doubled spaces or stray full stops", () => {
    expect(allText(august({ gadgets: [], sheets: [] }))).not.toMatch(/\s{2,}|\.\s*\./);
  });
});

describe("narrateStation toner deliveries", () => {
  const quiet = { replacements: [], gadgets: [], sheets: [], toners: [] };

  it("says how many cartridges were received and which", () => {
    const text = allText(
      august({
        deliveries: [
          delivery("d1", "2026-08-03", { tonerType: "222A", colorType: "Black", quantity: 4 }),
          delivery("d2", "2026-08-21", { tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 2 }),
        ],
      })
    );

    expect(text).toContain(
      "6 toner cartridges were received during the month: 4 Black 222A and 2 Cyan CARTRIDGE 069."
    );
  });

  it("uses the singular for one cartridge", () => {
    const text = allText(august({ deliveries: [delivery("d1", "2026-08-03")] }));

    expect(text).toContain("1 toner cartridge was received during the month");
    expect(text).not.toMatch(/1 toner cartridges|cartridge were/);
  });

  it("leaves out deliveries from other months", () => {
    const text = allText(august({ deliveries: [delivery("d1", "2026-07-30", { quantity: 3 })] }));

    expect(text).not.toMatch(/received/);
  });

  it("counts deliveries in the summary line", () => {
    const text = allText(august({ deliveries: [delivery("d1", "2026-08-03", { quantity: 3 })] }));

    expect(text).toMatch(/In short: [^.]*3 toner cartridges received/);
  });

  it("does not report a month with only deliveries as quiet", () => {
    const text = allText(
      august({ ...quiet, deliveries: [delivery("d1", "2026-08-03", { quantity: 2 })] })
    );

    expect(text).not.toMatch(/nothing was recorded/i);
    expect(text).not.toMatch(/no toner replacements or new toner stock/i);
    expect(text).toMatch(/No toner replacements were recorded in August 2026\./);
    expect(text).toContain("2 toner cartridges were received during the month: 2 Black 222A.");
    expect(text).toMatch(/In short: 2 toner cartridges received\./);
  });

  it("keeps the legacy stock-record sentence for months those records fall in", () => {
    const text = allText(
      august({
        toners: [toner({ id: "t1", dateBrought: "2026-08-05" })],
        deliveries: [delivery("d1", "2026-08-03")],
      })
    );

    expect(text).toMatch(/1 new toner stock record was entered/);
    expect(text).toMatch(/1 toner cartridge was received/);
  });

  it("still says nothing was received or replaced when neither happened", () => {
    const text = allText(august({ replacements: [], deliveries: [] }));

    expect(text).toMatch(/No toner replacements or new toner stock were recorded/);
  });
});

