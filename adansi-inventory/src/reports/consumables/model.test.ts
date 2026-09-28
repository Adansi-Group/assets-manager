import { describe, expect, it } from "vitest";
import { buildConsumablesModel } from "./model";
import type { TonerStock, TonerReplacement } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";
import type { Printer } from "../../types/printer";

const pool = (over: Partial<TonerStock> & { id: string }): TonerStock =>
  ({
    tonerType: "222A",
    colorType: "Magenta",
    quantity: 2,
    initialQuantity: 4,
    dateBrought: "2026-02-13",
    status: "Critical",
    ...over,
  }) as TonerStock;

const printer = (id: string, tonerType: string): Printer =>
  ({
    id,
    location: "Travel House",
    model: "Color Laser Jet Pro MFP 3303fdw",
    tonerType,
    printerColorType: "black",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-26",
  }) as Printer;

describe("buildConsumablesModel", () => {
  it("calculates stock, use, replacement duration and recommendations", () => {
    const toner = pool({ id: "t", tonerType: "415A", colorType: "Black", quantity: 1, initialQuantity: 5, dateBrought: "2026-01-01", status: "Warning" });
    const replacement = (id:string,date:string): TonerReplacement => ({ id, tonerId:"p", location:"HQ", printerType:"HP", colorType:"Black", dateChecked:date, dateReplaced:date, previousPercentage:0, currentPercentage:100, createdAt:date });
    const sheet = { id:"a", officeName:"HQ", currentQuantity:2, initialQuantity:10, minimumStockLevel:3, dateAdded:"2026-01-01", costPerReam:1, supplier:"S", brand:"B", status:"Low Stock", averageMonthlyUsage:4, estimatedDaysRemaining:15, createdAt:"2026-01-01" } as A4Sheet;
    const model = buildConsumablesModel([toner], [replacement("1","2026-01-01"), replacement("2","2026-01-31")], [sheet], [printer("ash", "415A")]);
    expect(model).toMatchObject({ tonerRemaining:1, tonerUsed:2, tonerAverageDays:30, a4Remaining:2, a4Used:8, a4MonthlyUsage:4 });
    expect(model.recommendations.some(item => item.priority === "Soon")).toBe(true);
  });

  it("does not invent a duration from one replacement", () => {
    const replacement = { id:"1", tonerId:"p", location:"HQ", printerType:"HP", colorType:"Black", dateChecked:"2026-01-01", dateReplaced:"2026-01-01", previousPercentage:0, currentPercentage:100, createdAt:"2026-01-01" } as TonerReplacement;
    expect(buildConsumablesModel([], [replacement], [], []).tonerAverageDays).toBeNull();
  });
});

describe("buildConsumablesModel with pooled stock", () => {
  const printers = [printer("ceo", "222A"), printer("coo", "222A"), printer("tema", "222A")];

  it("names the cartridge and how many printers it feeds", () => {
    const model = buildConsumablesModel([pool({ id: "p" })], [], [], printers);

    expect(model.recommendations.map((a) => a.text)).toContain(
      "Reorder Magenta 222A — 2 left; used by 3 printers"
    );
  });

  it("says 1 printer, not 1 printers", () => {
    const model = buildConsumablesModel([pool({ id: "p", tonerType: "415A" })], [], [], [
      printer("ash", "415A"),
    ]);

    expect(model.recommendations.map((a) => a.text)).toContain(
      "Reorder Magenta 415A — 2 left; used by 1 printer"
    );
  });

  it("keeps the same colour of different cartridges apart, as two distinct rows and reorder lines", () => {
    const model = buildConsumablesModel(
      [pool({ id: "a", tonerType: "222A" }), pool({ id: "b", tonerType: "207A" })],
      [],
      [],
      [...printers, printer("branch", "207A")]
    );

    expect(model.tonerLow.map(item => item.tonerType).sort()).toEqual(["207A", "222A"]);
    expect(model.recommendations.map(a => a.text)).toContain(
      "Reorder Magenta 222A — 2 left; used by 3 printers"
    );
    expect(model.recommendations.map(a => a.text)).toContain(
      "Reorder Magenta 207A — 2 left; used by 1 printer"
    );
  });

  it("prepares to reorder rather than reorder outright when stock is low but not yet critical", () => {
    const model = buildConsumablesModel(
      [pool({ id: "p", status: "Warning" })],
      [],
      [],
      printers
    );

    expect(model.recommendations.map(a => a.text)).toContain(
      "Prepare to reorder Magenta 222A — 2 left; used by 3 printers"
    );
  });

  it("says used by 0 printers rather than omitting the count when no printer takes the cartridge", () => {
    const model = buildConsumablesModel([pool({ id: "p", tonerType: "999Z" })], [], [], []);

    expect(model.recommendations.map(a => a.text)).toContain(
      "Reorder Magenta 999Z — 2 left; used by 0 printers"
    );
  });
});
