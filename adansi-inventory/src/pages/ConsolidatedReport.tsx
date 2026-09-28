import { useState, useEffect, useMemo } from "react";
import { Download, DollarSign, TrendingUp, Calendar, PieChart, Package, AlertTriangle } from "lucide-react";
import { getToners } from "../services/tonerService";
import { getTonerDeliveries } from "../services/tonerDeliveryService";
import { getA4Sheets } from "../services/a4SheetService";
import { getInternetUsage } from "../services/internetUsageService";
import { getGadgets } from "../services/gadgetsService";
import { getPrinters } from "../services/printerService";
import { getInventoryItems } from "../services/inventoryService";
import { getAllReplacements } from "../services/Tonerreplacementservice";
import type { Toner, TonerDelivery, TonerReplacement } from "../types/toner";
import type { A4Sheet } from "../types/A4Sheet";
import type { InternetUsage } from "../types/InternetUsage";
import type { Gadget } from "../types/gadget";
import type { Printer } from "../types/printer";
import type { InventoryItem } from "../types/inventory";
import { inRange, resolveRange, toISODate, type Quarter } from "../reports/shared/period";
import { tonersAcquired } from "../reports/shared/tonersAcquired";

// ---- Component --------------------------------------------------------------

interface AllData {
  toners: Toner[];
  deliveries: TonerDelivery[];
  a4Sheets: A4Sheet[];
  internet: InternetUsage[];
  gadgets: Gadget[];
  printers: Printer[];
  inventory: InventoryItem[];
  replacements: TonerReplacement[];
}

const EMPTY: AllData = {
  toners: [],
  deliveries: [],
  a4Sheets: [],
  internet: [],
  gadgets: [],
  printers: [],
  inventory: [],
  replacements: [],
};

export default function ConsolidatedReport() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<AllData>(EMPTY);

  // Period controls — default to the current quarter/year, common reporting need.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = (["Q1", "Q2", "Q3", "Q4"] as const)[Math.floor(now.getMonth() / 3)];
  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<Quarter>(currentQuarter);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = useMemo(
    () => resolveRange(year, quarter, customStart, customEnd),
    [year, quarter, customStart, customEnd]
  );

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [toners, deliveries, a4Sheets, internet, gadgets, printers, inventory, replacements] =
        await Promise.all([
          getToners(),
          // Throws on failure: a report of zero toners acquired would be false.
          getTonerDeliveries(),
          getA4Sheets(),
          getInternetUsage(),
          getGadgets(),
          getPrinters(),
          getInventoryItems(),
          getAllReplacements(),
        ]);
      setData({ toners, deliveries, a4Sheets, internet, gadgets, printers, inventory, replacements });
    } catch (error) {
      console.error("Error loading consolidated report:", error);
      setData(EMPTY);
      setLoadError(error instanceof Error ? error.message : "Could not load the report data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // ---- Period-filtered metrics ----------------------------------------------
  const m = useMemo(() => {
    // Toners acquired within the period: recorded deliveries, plus the legacy
    // stock records from before pooling. Never the pools themselves.
    const toners = tonersAcquired(data.deliveries, data.toners, range);
    const tonerUnits = toners.units;
    const tonerCost = toners.cost;

    // Toner replacements performed within the period
    const replacements = data.replacements.filter((r) =>
      inRange(toISODate(r.dateReplaced), range)
    );

    // A4 restock/add events within the period
    const a4Events = data.a4Sheets.filter(
      (s) => inRange(toISODate(s.lastRestocked), range) || inRange(toISODate(s.dateAdded), range)
    );
    const a4ReamsAdded = a4Events.reduce((s, r) => s + (r.initialQuantity || 0), 0);
    const a4PeriodSpend = a4Events.reduce(
      (s, r) => s + (r.initialQuantity || 0) * (r.costPerReam || 0),
      0
    );
    // Snapshot value (not period-specific)
    const a4StockValue = data.a4Sheets.reduce(
      (s, r) => s + (r.currentQuantity || 0) * (r.costPerReam || 0),
      0
    );
    const a4StockReams = data.a4Sheets.reduce((s, r) => s + (r.currentQuantity || 0), 0);

    // Internet purchased within the period
    const internet = data.internet.filter((i) => inRange(toISODate(i.datePurchased), range));
    const internetCost = internet.reduce((s, i) => s + (i.cost || 0), 0);

    // Gadgets purchased within the period
    const gadgets = data.gadgets.filter((g) => inRange(toISODate(g.purchaseDate), range));
    const gadgetByType = { Laptop: 0, Smartphone: 0, Accessory: 0 } as Record<string, number>;
    const gadgetByStatus = { "In-Use": 0, "In-Stock": 0, Faulty: 0 } as Record<string, number>;
    gadgets.forEach((g) => {
      gadgetByType[g.deviceType] = (gadgetByType[g.deviceType] || 0) + 1;
      gadgetByStatus[g.status] = (gadgetByStatus[g.status] || 0) + 1;
    });

    // Printers added within the period
    const printers = data.printers.filter((p) => inRange(toISODate(p.date), range));
    const printerUnits = printers.reduce((s, p) => s + (p.quantity || 0), 0);

    // Inventory added within the period
    const inventory = data.inventory.filter((i) => inRange(toISODate(i.createdAt), range));
    const inventoryUnits = inventory.reduce((s, i) => s + (i.quantity || 0), 0);

    const knownSpend = tonerCost + a4PeriodSpend + internetCost;

    return {
      toners,
      tonerUnits,
      tonerCost,
      replacements,
      a4Events,
      a4ReamsAdded,
      a4PeriodSpend,
      a4StockValue,
      a4StockReams,
      internet,
      internetCost,
      gadgets,
      gadgetByType,
      gadgetByStatus,
      printers,
      printerUnits,
      inventory,
      inventoryUnits,
      knownSpend,
    };
  }, [data, range]);

  function exportExcel() {
    const rows: (string | number)[][] = [
      ["CONSOLIDATED REPORT"],
      ["Period:", range.label],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Category", "Items in period", "Units", "Known cost (GH₵)"],
      ["Toners acquired", m.toners.deliveries + m.toners.legacyRecords, m.tonerUnits, m.tonerCost.toFixed(2)],
      ["Toner replacements", m.replacements.length, "", ""],
      ["A4 sheet restocks", m.a4Events.length, m.a4ReamsAdded, m.a4PeriodSpend.toFixed(2)],
      ["Internet purchases", m.internet.length, "", m.internetCost.toFixed(2)],
      ["Gadgets acquired", m.gadgets.length, "", ""],
      ["  – Laptops", m.gadgetByType.Laptop, "", ""],
      ["  – Smartphones", m.gadgetByType.Smartphone, "", ""],
      ["  – Accessories", m.gadgetByType.Accessory, "", ""],
      ["Printers added", m.printers.length, m.printerUnits, ""],
      ["Inventory added", m.inventory.length, m.inventoryUnits, ""],
      [""],
      ["KNOWN CASH SPEND (period)", "", "", m.knownSpend.toFixed(2)],
      ["A4 stock value on hand (snapshot)", `${m.a4StockReams} reams`, "", m.a4StockValue.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidated-report-${range.label.replace(/[^\w]+/g, "-")}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (loadError) {
    // No figures at all rather than zeros: the reader must not mistake a
    // failed read for a quiet period.
    return (
      <div className="p-6">
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-r-lg p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300">
                Could not load the consolidated report
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{loadError}</p>
              <button
                onClick={() => void loadData()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consolidated Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Asset activity and expenses for a selected period
          </p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-wrap items-center gap-3">
        <Calendar size={18} className="text-green-600" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Period:</span>
        <div className="flex flex-wrap gap-1">
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                quarter === q
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => setQuarter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              quarter === "ALL"
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All time
          </button>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={quarter === "ALL" || quarter === "CUSTOM"}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQuarter("CUSTOM")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              quarter === "CUSTOM"
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Custom
          </button>
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              setQuarter("CUSTOM");
            }}
            className="px-2 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              setQuarter("CUSTOM");
            }}
            className="px-2 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
        </div>
        <span className="ml-auto text-sm font-semibold text-green-700 dark:text-green-400">
          Showing: {range.label}
        </span>
      </div>

      {/* Known cash spend card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 mb-2">Known Cash Spend (period, where cost is recorded)</p>
            <p className="text-5xl font-bold">GH₵{m.knownSpend.toFixed(2)}</p>
            <p className="text-green-100 mt-2">Period: {range.label}</p>
          </div>
          <DollarSign size={80} className="text-green-200 opacity-50" />
        </div>
      </div>

      {/* Data coverage note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
        <strong>Note:</strong> Purchase cost is only recorded for A4 sheets and internet bundles
        (and toners when a unit cost is entered). Gadgets, printers and inventory are tracked by
        quantity, not cost — so the figures below are primarily <em>asset activity</em> for the
        period, and “Known Cash Spend” reflects only categories that carry cost data.
      </div>

      {/* Consumables (cost-bearing) */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <DollarSign size={20} className="text-green-600" /> Consumables (cost tracked)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Toners acquired"
          icon="💧"
          primary={`${m.toners.deliveries + m.toners.legacyRecords}`}
          primaryLabel="deliveries and stock records"
          secondary={`${m.tonerUnits} units · GH₵${m.tonerCost.toFixed(2)}`}
          extra={`${m.replacements.length} replacements in period`}
          color="bg-blue-600"
        />
        <MetricCard
          title="A4 Sheets"
          icon="📄"
          primary={`${m.a4Events.length}`}
          primaryLabel="restock/add events"
          secondary={`${m.a4ReamsAdded} reams · GH₵${m.a4PeriodSpend.toFixed(2)}`}
          extra={`Stock on hand: ${m.a4StockReams} reams (GH₵${m.a4StockValue.toFixed(2)})`}
          color="bg-orange-600"
        />
        <MetricCard
          title="Internet purchases"
          icon="📡"
          primary={`${m.internet.length}`}
          primaryLabel="purchases"
          secondary={`GH₵${m.internetCost.toFixed(2)}`}
          extra={m.internet.map((i) => `${i.officeName} · ${i.provider}`).slice(0, 2).join(" | ") || "—"}
          color="bg-green-600"
        />
      </div>

      {/* Assets (quantity tracked) */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Package size={20} className="text-green-600" /> Asset acquisitions (quantity tracked)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Gadgets acquired"
          icon="💻"
          primary={`${m.gadgets.length}`}
          primaryLabel="devices"
          secondary={`${m.gadgetByType.Laptop} laptops · ${m.gadgetByType.Smartphone} phones · ${m.gadgetByType.Accessory} accessories`}
          extra={`${m.gadgetByStatus["In-Use"]} in-use · ${m.gadgetByStatus["In-Stock"]} in-stock · ${m.gadgetByStatus.Faulty} faulty`}
          color="bg-teal-600"
        />
        <MetricCard
          title="Printers added"
          icon="🖨️"
          primary={`${m.printers.length}`}
          primaryLabel="records"
          secondary={`${m.printerUnits} units`}
          extra={m.printers.map((p) => p.location).slice(0, 2).join(" | ") || "—"}
          color="bg-indigo-600"
        />
        <MetricCard
          title="Inventory added"
          icon="📦"
          primary={`${m.inventory.length}`}
          primaryLabel="records"
          secondary={`${m.inventoryUnits} units`}
          extra={m.inventory.map((i) => i.itemName).slice(0, 2).join(" | ") || "—"}
          color="bg-purple-600"
        />
      </div>

      {/* Gadget type distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChart size={24} className="text-green-600" />
            Gadget mix ({range.label})
          </h2>
          <div className="space-y-4">
            {(["Laptop", "Smartphone", "Accessory"] as const).map((t) => {
              const val = m.gadgetByType[t] || 0;
              const pct = m.gadgets.length ? (val / m.gadgets.length) * 100 : 0;
              return (
                <DistributionBar
                  key={t}
                  label={t === "Accessory" ? "Accessories" : `${t}s`}
                  valueText={`${val} (${pct.toFixed(0)}%)`}
                  percentage={pct}
                  color={t === "Laptop" ? "bg-teal-600" : t === "Smartphone" ? "bg-blue-600" : "bg-orange-500"}
                />
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-green-600" />
            Toner replacements by location ({range.label})
          </h2>
          <SummaryTable
            items={Object.entries(
              m.replacements.reduce<Record<string, number>>((acc, r) => {
                acc[r.location || "Unknown"] = (acc[r.location || "Unknown"] || 0) + 1;
                return acc;
              }, {})
            )
              .map(([name, v]) => ({ name, value: String(v) }))
              .sort((a, b) => Number(b.value) - Number(a.value))}
            emptyText="No replacements in this period"
          />
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

interface MetricCardProps {
  title: string;
  icon: string;
  primary: string;
  primaryLabel: string;
  secondary: string;
  extra: string;
  color: string;
}

function MetricCard({ title, icon, primary, primaryLabel, secondary, extra, color }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-4xl font-bold text-gray-900 dark:text-white">{primary}</p>
        <span className="text-sm text-gray-500 dark:text-gray-400">{primaryLabel}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{secondary}</p>
      <div className={`h-1 w-16 rounded-full ${color} mb-2`}></div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{extra}</p>
    </div>
  );
}

interface DistributionBarProps {
  label: string;
  valueText: string;
  percentage: number;
  color: string;
}

function DistributionBar({ label, valueText, percentage, color }: DistributionBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{valueText}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
        <div className={`h-4 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

interface SummaryItem {
  name: string;
  value: string;
}

function SummaryTable({ items, emptyText }: { items: SummaryItem[]; emptyText: string }) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">{emptyText}</p>
      ) : (
        items.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{item.value}</span>
          </div>
        ))
      )}
    </div>
  );
}
