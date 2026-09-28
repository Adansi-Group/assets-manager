// src/pages/Reports.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Download,
  Droplet,
  FileSpreadsheet,
  Laptop,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import Swal from "sweetalert2";

import { lastCompletedMonth, recentMonths, type Range } from "../reports/shared/period";
import { renderReportPdf } from "../reports/shared/pdf/renderPdf";
import { DEFAULT_TONER_REORDER_LEVEL } from "../toners/stockLevel";
import { buildStationReport } from "../reports/station/model";
import { narrateStation } from "../reports/station/narrate";
import { getToners } from "../services/tonerService";
import { getTonerStock } from "../services/tonerStockService";
import { getPrinters } from "../services/printerService";
import { getTonerReorderLevel } from "../services/notificationService";
import { getAllReplacements } from "../services/Tonerreplacementservice";
import { getA4Sheets } from "../services/a4SheetService";
import { getInternetUsage } from "../services/internetUsageService";
import { getGadgets } from "../services/gadgetsService";
import type { Toner, TonerReplacement, TonerStock } from "../types/toner";
import type { A4Sheet } from "../types/A4Sheet";
import type { InternetUsage } from "../types/InternetUsage";
import type { Gadget } from "../types/gadget";
import type { Printer } from "../types/printer";

/**
 * Shown where a figure genuinely cannot be produced from the data, rather than
 * printing a zero or an invented number that reads as fact.
 */
const NOT_RECORDED = "Not recorded";

const cedis = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface Stat {
  label: string;
  value: string;
  /** Renders muted, to distinguish "we cannot know" from a real measurement. */
  muted?: boolean;
}

interface Category {
  id: string;
  title: string;
  icon: ReactNode;
  description: string;
  path: string;
  stats: Stat[];
}

export default function Reports() {
  const navigate = useNavigate();

  const [toners, setToners] = useState<Toner[]>([]);
  const [stock, setStock] = useState<TonerStock[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [replacements, setReplacements] = useState<TonerReplacement[]>([]);
  const [sheets, setSheets] = useState<A4Sheet[]>([]);
  const [internet, setInternet] = useState<InternetUsage[]>([]);
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reorderLevel, setReorderLevel] = useState(DEFAULT_TONER_REORDER_LEVEL);

  // Twelve completed months plus all-time. Defaults to last month, because the
  // current one is still accruing and would under-report whatever follows today.
  const periods = useMemo<Range[]>(
    () => [
      ...recentMonths(12),
      { start: "0000-01-01", end: "9999-12-31", label: "All time" },
    ],
    []
  );
  const [periodLabel, setPeriodLabel] = useState(() => lastCompletedMonth().label);
  const period = periods.find(p => p.label === periodLabel) ?? periods[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, st, p, r, s, i, g, level] = await Promise.all([
        getToners(),
        getTonerStock(),
        getPrinters(),
        getAllReplacements(),
        getA4Sheets(),
        getInternetUsage(),
        getGadgets(),
        getTonerReorderLevel(),
      ]);
      setToners(t);
      setStock(st);
      setPrinters(p);
      setReplacements(r);
      setSheets(s);
      setInternet(i);
      setGadgets(g);
      setReorderLevel(level);
    } catch (e) {
      console.error("Error loading report summaries:", e);
      setError(e instanceof Error ? e.message : "Could not load the report summaries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /**
   * Gadgets, toners and A4 paper as one short written summary.
   *
   * The period selects what activity the report covers — replacements logged,
   * devices added, offices restocked. The report is activity only: stock
   * quantities are overwritten in place with no history kept, so a month's
   * closing position does not exist and is never claimed.
   */
  const stationModel = useMemo(
    () =>
      buildStationReport({
        toners,
        stock,
        printers,
        replacements,
        sheets,
        gadgets,
        range: period,
        reorderLevel,
        generatedAt: new Date().toISOString().slice(0, 10),
      }),
    [toners, stock, printers, replacements, sheets, gadgets, period, reorderLevel]
  );

  const blocks = useMemo(() => narrateStation(stationModel), [stationModel]);

  async function handleDownloadPdf() {
    setGenerating(true);
    try {
      const pdf = renderReportPdf(blocks, {
        title: "IT Assets Report",
        subtitle: `Adansi Travels · ${stationModel.meta.periodLabel} · Gadgets, toners and A4 paper`,
        footerNote: "Adansi Travels · Contains staff assignment data — internal use only",
        charts: new Map(),
      });
      pdf.save(`Adansi_IT_Assets_${stationModel.meta.periodLabel.replace(/[^\w]+/g, "_")}.pdf`);
    } catch (e) {
      console.error("Error generating the station report:", e);
      await Swal.fire({
        icon: "error",
        title: "Could not generate the PDF",
        text: e instanceof Error ? e.message : "Something went wrong building the document.",
      });
    } finally {
      setGenerating(false);
    }
  }

  const categories = useMemo<Category[]>(() => {
    // Quantities now live in the pooled stock, not the legacy per-printer
    // records, so the preview cards read the same numbers the reports do.
    const tonerUnits = stock.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
    const a4Reams = sheets.reduce((sum, s) => sum + (s.currentQuantity ?? 0), 0);
    const a4Value = sheets.reduce(
      (sum, s) => sum + (s.currentQuantity ?? 0) * (s.costPerReam ?? 0),
      0
    );
    const a4LowStock = sheets.filter(s => s.status === "Low Stock" || s.status === "Out of Stock").length;

    const internetCost = internet.reduce((sum, u) => sum + (u.cost ?? 0), 0);
    const activeInternet = internet.filter(u => u.status === "Active").length;

    // Only A4 and internet carry a real cost; gadgets, printers and toners have
    // no price field at all, so this is knowable spend, not total spend.
    const knownSpend = a4Value + internetCost;

    return [
      {
        id: "consumables",
        title: "Consumables Management Report",
        icon: <BarChart3 className="text-green-600" size={32} />,
        description: "Meeting report for toners and A4 sheets; gadgets excluded",
        path: "/reports/consumables",
        stats: [
          { label: "Toners Left", value: String(tonerUnits) },
          { label: "Toners Used", value: String(replacements.length) },
          { label: "A4 Left", value: `${a4Reams} reams` },
        ],
      },
      {
        id: "toners",
        title: "Toner Reports",
        icon: <Droplet className="text-blue-600" size={32} />,
        description: "Stock levels and replacement history",
        path: "/reports/toners",
        stats: [
          { label: "Units in Stock", value: String(tonerUnits) },
          { label: "Replacements", value: String(replacements.length) },
          // costPerUnit is in the type but nothing ever writes it.
          { label: "Total Spent", value: NOT_RECORDED, muted: true },
        ],
      },
      {
        id: "gadgets",
        title: "Gadget Reports",
        icon: <Laptop className="text-purple-600" size={32} />,
        description: "Inventory, specifications and assignments",
        path: "/reports/gadgets",
        stats: [
          { label: "Total Devices", value: String(gadgets.length) },
          { label: "In Use", value: String(gadgets.filter(g => g.status === "In-Use").length) },
          { label: "Available", value: String(gadgets.filter(g => g.status === "In-Stock").length) },
        ],
      },
      {
        id: "internet",
        title: "Internet Reports",
        icon: <Wifi className="text-green-600" size={32} />,
        description: "Usage duration and cost analysis",
        path: "/reports/internet",
        stats: [
          { label: "Total Cost", value: cedis(internetCost) },
          { label: "Active", value: `${activeInternet} ${activeInternet === 1 ? "entry" : "entries"}` },
          { label: "Entries", value: String(internet.length) },
        ],
      },
      {
        id: "a4sheets",
        title: "A4 Sheet Reports",
        icon: <FileSpreadsheet className="text-orange-600" size={32} />,
        description: "Stock levels and stock value",
        path: "/reports/a4sheets",
        stats: [
          { label: "Total Stock", value: `${a4Reams} ${a4Reams === 1 ? "ream" : "reams"}` },
          { label: "Stock Value", value: cedis(a4Value) },
          { label: "Low Stock", value: `${a4LowStock} ${a4LowStock === 1 ? "office" : "offices"}` },
        ],
      },
      {
        id: "consolidated",
        title: "Consolidated Report",
        icon: <BarChart3 className="text-red-600" size={32} />,
        description: "All categories, by period",
        path: "/reports/consolidated",
        stats: [
          { label: "Known Spend", value: cedis(knownSpend) },
          { label: "Categories", value: "7" },
          { label: "Period", value: "All time" },
        ],
      },
      {
        id: "budget",
        title: "Budget Analysis",
        icon: <DollarSign className="text-yellow-600" size={32} />,
        description: "Budget vs actual spending",
        path: "/reports/budget",
        // Budgets are hardcoded in the page with no source of truth, so no
        // figure here would be a real measurement.
        stats: [
          { label: "Budget", value: "Not configured", muted: true },
          { label: "Spent", value: NOT_RECORDED, muted: true },
          { label: "Remaining", value: NOT_RECORDED, muted: true },
        ],
      },
    ];
  }, [stock, replacements, sheets, internet, gadgets]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports &amp; Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Live figures from the Assets Station. Open a report for the detail.
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
            <label htmlFor="report-period" className="text-sm text-gray-600 dark:text-gray-400">
              Period
            </label>
            <select
              id="report-period"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {periods.map(p => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void handleDownloadPdf()}
            // A document built on a failed load would look like an empty estate.
            disabled={generating || !!error}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                       font-medium shadow-sm transition-colors"
          >
            <Download size={18} />
            {generating ? "Building…" : "Download summary (PDF)"}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
            {period.label === "All time"
              ? "Everything logged for gadgets, toners and A4 paper."
              : `What was recorded in ${period.label} — activity only, not a stocktake.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center gap-4">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              Could not load the summary figures
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => void loadData()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <div
            key={category.id}
            onClick={() => navigate(category.path)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all
                       cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                {category.icon}
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  View Report →
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {category.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="grid grid-cols-3 gap-4">
                {category.stats.map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p
                      className={`text-sm font-bold ${
                        stat.muted
                          ? "text-gray-400 dark:text-gray-500 italic font-normal"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 rounded-r-lg px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-1">
          About these figures
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Gadgets, printers and toners have no purchase price field in the Assets Station, so no
          spend total can be produced for them — those figures read “{NOT_RECORDED}” rather than
          showing a zero. Only A4 paper, internet and general inventory carry real costs. A4 stock
          value is the value of paper currently on hand, not money spent in a period.
        </p>
      </div>
    </div>
  );
}
