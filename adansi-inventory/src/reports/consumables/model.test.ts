import { describe, expect, it } from "vitest";
import { buildConsumablesModel } from "./model";
import type { Toner, TonerReplacement } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";

describe("buildConsumablesModel", () => {
  it("calculates stock, use, replacement duration and recommendations", () => {
    const toner = { id:"t", location:"HQ", printerType:"HP", tonerType:"415A", colorType:"Black", quantity:1, initialQuantity:5, dateBrought:"2026-01-01", status:"Warning" } as Toner;
    const replacement = (id:string,date:string): TonerReplacement => ({ id, tonerId:"p", location:"HQ", printerType:"HP", colorType:"Black", dateChecked:date, dateReplaced:date, previousPercentage:0, currentPercentage:100, createdAt:date });
    const sheet = { id:"a", officeName:"HQ", currentQuantity:2, initialQuantity:10, minimumStockLevel:3, dateAdded:"2026-01-01", costPerReam:1, supplier:"S", brand:"B", status:"Low Stock", averageMonthlyUsage:4, estimatedDaysRemaining:15, createdAt:"2026-01-01" } as A4Sheet;
    const model = buildConsumablesModel([toner], [replacement("1","2026-01-01"), replacement("2","2026-01-31")], [sheet]);
    expect(model).toMatchObject({ tonerRemaining:1, tonerUsed:2, tonerAverageDays:30, a4Remaining:2, a4Used:8, a4MonthlyUsage:4 });
    expect(model.recommendations.some(item => item.priority === "Soon")).toBe(true);
  });

  it("does not invent a duration from one replacement", () => {
    const replacement = { id:"1", tonerId:"p", location:"HQ", printerType:"HP", colorType:"Black", dateChecked:"2026-01-01", dateReplaced:"2026-01-01", previousPercentage:0, currentPercentage:100, createdAt:"2026-01-01" } as TonerReplacement;
    expect(buildConsumablesModel([], [replacement], []).tonerAverageDays).toBeNull();
  });
});
