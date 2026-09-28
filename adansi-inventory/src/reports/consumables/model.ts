import type { A4Sheet } from "../../types/A4Sheet";
import type { TonerStock, TonerReplacement } from "../../types/toner";
import type { Printer } from "../../types/printer";
import { printersUsing } from "../../toners/pools";
import { usedByLabel } from "../../toners/poolRows";
import { replacementIntervals } from "../shared/replacementIntervals";

export type Recommendation = { priority: "Urgent" | "Soon" | "Monitor"; text: string };

export function buildConsumablesModel(
  toners: TonerStock[],
  replacements: TonerReplacement[],
  sheets: A4Sheet[],
  printers: Printer[]
) {
  const tonerRemaining = toners.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  const tonerLow = toners.filter(item => item.quantity <= 2 || item.status === "Warning" || item.status === "Critical");
  // "Average toner usage duration" is how long one printer's cartridge
  // lasts, so intervals are grouped per printer slot, not per cartridge —
  // the same rule the station report uses, from the same shared helper.
  const intervals = replacementIntervals(replacements);

  const a4Remaining = sheets.reduce((sum, item) => sum + Math.max(0, Number(item.currentQuantity) || 0), 0);
  const a4Used = sheets.reduce((sum, item) => sum + Math.max(0, (Number(item.initialQuantity) || 0) - (Number(item.currentQuantity) || 0)), 0);
  const a4MonthlyUsage = sheets.reduce((sum, item) => sum + Math.max(0, Number(item.averageMonthlyUsage) || 0), 0);
  const a4Low = sheets.filter(item => item.status !== "In Stock");
  const recommendations: Recommendation[] = [];
  tonerLow.filter(item => item.quantity === 0 || item.status === "Critical").forEach(item => {
    const n = printersUsing(printers, item.tonerType).length;
    recommendations.push({
      priority: "Urgent", text: `Reorder ${item.colorType} ${item.tonerType} — ${item.quantity} left; used by ${usedByLabel(n)}`,
    });
  });
  tonerLow.filter(item => item.quantity > 0 && item.status !== "Critical").forEach(item => {
    const n = printersUsing(printers, item.tonerType).length;
    recommendations.push({
      priority: "Soon", text: `Prepare to reorder ${item.colorType} ${item.tonerType} — ${item.quantity} left; used by ${usedByLabel(n)}`,
    });
  });
  a4Low.forEach(item => recommendations.push({
    priority: item.status === "Out of Stock" ? "Urgent" : "Soon",
    text: `${item.officeName} A4 stock is ${item.status.toLowerCase()} (${item.currentQuantity} reams); restock to above ${item.minimumStockLevel}.`,
  }));
  sheets.filter(item => item.estimatedDaysRemaining !== undefined && item.estimatedDaysRemaining <= 30 && item.status === "In Stock").forEach(item => recommendations.push({
    priority: "Monitor", text: `${item.officeName} has about ${item.estimatedDaysRemaining} days of A4 stock remaining; schedule the next order.`,
  }));
  if (!recommendations.length) recommendations.push({ priority: "Monitor", text: "Stock is currently adequate; continue recording every toner replacement and A4 quantity change." });

  return {
    tonerRemaining,
    tonerUsed: replacements.length,
    tonerAverageDays: intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null,
    tonerDurationSamples: intervals.length,
    tonerLow,
    a4Remaining,
    a4Used,
    a4MonthlyUsage,
    a4Low,
    recommendations,
  };
}
