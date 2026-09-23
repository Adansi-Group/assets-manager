import type { A4Sheet } from "../../types/A4Sheet";
import type { Toner, TonerReplacement } from "../../types/toner";

const day = 86_400_000;
const validDate = (value?: string) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

export type Recommendation = { priority: "Urgent" | "Soon" | "Monitor"; text: string };

export function buildConsumablesModel(toners: Toner[], replacements: TonerReplacement[], sheets: A4Sheet[]) {
  const tonerRemaining = toners.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  const tonerLow = toners.filter(item => item.quantity <= 2 || item.status === "Warning" || item.status === "Critical");
  const groups = new Map<string, TonerReplacement[]>();
  replacements.forEach(item => {
    const key = [item.location, item.room, item.printerType, item.colorType].map(v => v?.trim().toLowerCase() ?? "").join("|");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  const intervals: number[] = [];
  groups.forEach(items => {
    const times = items.map(item => validDate(item.dateReplaced)).filter((v): v is number => v !== null).sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) intervals.push(Math.max(0, Math.round((times[i] - times[i - 1]) / day)));
  });

  const a4Remaining = sheets.reduce((sum, item) => sum + Math.max(0, Number(item.currentQuantity) || 0), 0);
  const a4Used = sheets.reduce((sum, item) => sum + Math.max(0, (Number(item.initialQuantity) || 0) - (Number(item.currentQuantity) || 0)), 0);
  const a4MonthlyUsage = sheets.reduce((sum, item) => sum + Math.max(0, Number(item.averageMonthlyUsage) || 0), 0);
  const a4Low = sheets.filter(item => item.status !== "In Stock");
  const recommendations: Recommendation[] = [];
  tonerLow.filter(item => item.quantity === 0 || item.status === "Critical").forEach(item => recommendations.push({
    priority: "Urgent", text: `Reorder ${item.colorType} ${item.tonerType} for ${item.location}${item.room ? ` / ${item.room}` : ""}; ${item.quantity} left.`,
  }));
  tonerLow.filter(item => item.quantity > 0 && item.status !== "Critical").forEach(item => recommendations.push({
    priority: "Soon", text: `Prepare to reorder ${item.colorType} ${item.tonerType} for ${item.location}; ${item.quantity} left.`,
  }));
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
