import { describe, it, expect } from "vitest";
import { buildStationReport } from "./model";
import { narrateStation } from "./narrate";
import { renderReportPdf } from "../shared/pdf/renderPdf";
import { resolveRange } from "../shared/period";
import type { Toner, TonerReplacement } from "../../types/toner";
import type { A4Sheet } from "../../types/A4Sheet";
import type { Gadget } from "../../types/gadget";

describe("the station report renders to a PDF", () => {
  it("draws every block the narrative produces without throwing", () => {
    const model = buildStationReport({
      toners: [
        { id:"t1", location:"Head Office", room:"Accounts", printerType:"HP LaserJet M404", tonerType:"59A", colorType:"Black", quantity:4, dateBrought:"2026-02-01" },
        { id:"t2", location:"Head Office", printerType:"HP Color 281", tonerType:"203A", colorType:"Cyan", quantity:0, dateBrought:"2026-01-05", status:"Critical" },
        { id:"t3", location:"Kumasi", printerType:"Canon iR2004", tonerType:"NPG-59", colorType:"Black", quantity:2, dateBrought:"2026-03-11", status:"Warning" },
      ] as Toner[],
      replacements: [
        { id:"r1", tonerId:"t1", location:"Head Office", room:"Accounts", printerType:"HP LaserJet M404", colorType:"Black", dateChecked:"2026-01-10", dateReplaced:"2026-01-10", previousPercentage:4, currentPercentage:100, createdAt:"2026-01-10" },
        { id:"r2", tonerId:"t1", location:"Head Office", room:"Accounts", printerType:"HP LaserJet M404", colorType:"Black", dateChecked:"2026-03-15", dateReplaced:"2026-03-15", previousPercentage:6, currentPercentage:100, createdAt:"2026-03-15" },
        { id:"r3", tonerId:"t3", location:"Kumasi", printerType:"Canon iR2004", colorType:"Black", dateChecked:"2026-05-02", dateReplaced:"2026-05-02", previousPercentage:2, currentPercentage:100, createdAt:"2026-05-02" },
      ] as TonerReplacement[],
      sheets: [
        { id:"a1", officeName:"Head Office", currentQuantity:8, initialQuantity:20, minimumStockLevel:5, dateAdded:"2026-01-01", costPerReam:45, supplier:"Sonlife", brand:"Double A", status:"In Stock", averageMonthlyUsage:3, estimatedDaysRemaining:80, createdAt:"2026-01-01" },
        { id:"a2", officeName:"Kumasi", currentQuantity:2, initialQuantity:12, minimumStockLevel:4, dateAdded:"2026-01-01", costPerReam:45, supplier:"Sonlife", brand:"Double A", status:"Low Stock", averageMonthlyUsage:2, estimatedDaysRemaining:30, createdAt:"2026-01-01" },
        { id:"a3", officeName:"Takoradi", currentQuantity:2, initialQuantity:10, minimumStockLevel:4, dateAdded:"2026-01-01", costPerReam:45, supplier:"Sonlife", brand:"Double A", status:"In Stock", createdAt:"2026-01-01" },
      ] as A4Sheet[],
      gadgets: [
        { id:"g1", deviceType:"Laptop", model:"MacBook Air", processor:"Apple M1 8GB RAM", storage:"245.11GB", year:2021, status:"In-Use", assignedTo:"Grace Mensah", serialNumber:"C02X1", quantity:1 },
        { id:"g2", deviceType:"Laptop", model:"MacBook Air", processor:"Apple M1 8GB RAM", storage:"245.11GB", year:2020, status:"In-Stock", quantity:1 },
        { id:"g3", deviceType:"Laptop", model:"HP EliteBook", processor:"Intel Core i5 8GB RAM", storage:"512GB", year:2016, status:"In-Use", assignedTo:"Kwame Asare", quantity:1 },
        { id:"g4", deviceType:"Smartphone", model:"Galaxy A25", year:0, status:"In-Use", assignedTo:"Grace Mensah", quantity:1 },
        { id:"g5", deviceType:"Accessory", model:"Logitech M170", accessoryType:"Mouse", condition:"Good", status:"In-Stock", quantity:6 },
      ] as Gadget[],
      range: resolveRange(2026, "ALL", "", ""),
      reorderLevel: 3,
      generatedAt: "2026-09-10",
    });

    const blocks = narrateStation(model);
    const pdf = renderReportPdf(blocks, {
      title: "IT Assets Summary",
      subtitle: "Adansi Travels · Gadgets, toners and A4 paper · Generated 2026-09-10",
      footerNote: "Adansi Travels · Contains staff assignment data — internal use only",
      charts: new Map(),
    });
    // Exercises the DocBuilder paths this document reaches — headings and
    // wrapped paragraphs — so a layout crash surfaces here rather than when
    // someone clicks Download.
    const uri = pdf.toDataUri();

    expect(blocks.length).toBeGreaterThan(8);
    expect(uri.startsWith("data:application/pdf")).toBe(true);
    expect(uri.length).toBeGreaterThan(5000);
  });
});
