// src/pages/Gadgetreports.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FileText, Laptop, Smartphone, Users, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import Swal from "sweetalert2";

import ExportDropdown from "../components/ExportDropdown";
import { getGadgetsStrict, getReturnedDevices } from "../services/gadgetsService";
import type { Gadget } from "../types/gadget";
import { resolveRange, type Quarter } from "../reports/shared/period";
import type { ChartId } from "../reports/shared/blocks";
import ReportPreview from "../reports/shared/ReportPreview";
import { captureCharts } from "../reports/shared/pdf/chartCapture";
import { buildGadgetReport } from "../reports/gadgets/buildModel";
import { narrate } from "../reports/gadgets/narrative";
import { renderReportPdf } from "../reports/shared/pdf/renderPdf";
import { ChartStage } from "../reports/gadgets/ReportCharts";
import type { DateBasis, ReportScope } from "../reports/gadgets/model";

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const SELECT_CLASS =
  "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white";

export default function GadgetReports() {
  const [active, setActive] = useState<Gadget[]>([]);
  const [returned, setReturned] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Default to All time: this is an inventory snapshot, and purchaseDate is
  // sparse, so defaulting to a narrow period would render a near-empty report.
  const [quarter, setQuarter] = useState<Quarter>("ALL");
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateBasis, setDateBasis] = useState<DateBasis>("purchaseDate");
  const [scope, setScope] = useState<ReportScope>("active");

  const stageRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Strict variants: a failed read must not look like an empty estate.
      const [activeData, returnedData] = await Promise.all([
        getGadgetsStrict(),
        getReturnedDevices(),
      ]);
      setActive(activeData);
      setReturned(returnedData);
    } catch (error) {
      console.error("Error loading gadget report data:", error);
      setLoadError(
        error instanceof Error ? error.message : "Could not read the gadget records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const range = useMemo(
    () => resolveRange(year, quarter, "", ""),
    [year, quarter]
  );

  const model = useMemo(
    () =>
      buildGadgetReport(active, {
        range,
        dateBasis,
        scope,
        returned,
        generatedAt: new Date().toISOString().slice(0, 10),
      }),
    [active, returned, range, dateBasis, scope]
  );

  const blocks = useMemo(() => narrate(model), [model]);

  const chartIds = useMemo(
    () => [...new Set(blocks.filter(b => b.kind === "chart").map(b => b.chartId))] as ChartId[],
    [blocks]
  );

  /** Flat per-device rows for the spreadsheet exports. */
  const exportRows = useMemo(
    () =>
      (scope === "active+locker"
        ? [...active, ...returned.filter(r => !active.some(a => a.id === r.id))]
        : active
      ).map(g => ({
        deviceType: g.deviceType,
        model: g.model,
        serialNumber: g.serialNumber ?? "",
        processor: g.processor ?? "",
        storage: g.storage ?? "",
        year: g.year,
        status: g.status,
        assignedTo: g.assignedTo ?? "Unassigned",
        purchaseDate: g.purchaseDate ?? "",
        quantity: g.quantity,
        condition: g.condition ?? "",
        imei1: g.imei1 ?? "",
      })),
    [active, returned, scope]
  );

  async function handleDownloadPdf() {
    setGenerating(true);
    try {
      // Let the offscreen chart stage mount before capturing it.
      const charts = stageRef.current
        ? await captureCharts(stageRef.current)
        : new Map();

      const pdf = renderReportPdf(blocks, {
        title: "IT Asset Inventory Report",
        subtitle: `Adansi Travels · ${model.meta.periodLabel} · Generated ${model.meta.generatedAt}`,
        footerNote: "Adansi Travels · Contains staff assignment data — internal use only",
        charts,
      });
      pdf.save(`Adansi_IT_Asset_Report_${model.meta.periodLabel.replace(/[^\w]+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      await Swal.fire({
        icon: "error",
        title: "Could not generate the PDF",
        text: error instanceof Error ? error.message : "Something went wrong building the document.",
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Could not load the gadget records
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{loadError}</p>
          <button
            onClick={() => void loadData()}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasData = model.summary.total > 0;

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gadget Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Device inventory, specifications and assignments — {model.meta.periodLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={quarter}
            onChange={e => setQuarter(e.target.value as Quarter)}
            className={SELECT_CLASS}
          >
            <option value="ALL">All time</option>
            <option value="Q1">Q1 (Jan–Mar)</option>
            <option value="Q2">Q2 (Apr–Jun)</option>
            <option value="Q3">Q3 (Jul–Sep)</option>
            <option value="Q4">Q4 (Oct–Dec)</option>
          </select>

          {quarter !== "ALL" && (
            <>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className={SELECT_CLASS}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={dateBasis}
                onChange={e => setDateBasis(e.target.value as DateBasis)}
                className={SELECT_CLASS}
                title="Which date the period filter applies to"
              >
                <option value="purchaseDate">By purchase date</option>
                <option value="createdAt">By date added to the system</option>
              </select>
            </>
          )}

          <select
            value={scope}
            onChange={e => setScope(e.target.value as ReportScope)}
            className={SELECT_CLASS}
            title="Whether to include returned/locker devices"
          >
            <option value="active">Active devices</option>
            <option value="active+locker">Include returned/locker</option>
          </select>

          <ExportDropdown
            data={exportRows}
            filename={`gadgets-${model.meta.periodLabel.replace(/[^\w]+/g, "-")}`}
            columns={[
              { key: "deviceType", label: "Type" },
              { key: "model", label: "Model" },
              { key: "serialNumber", label: "Serial Number" },
              { key: "processor", label: "Processor" },
              { key: "storage", label: "Storage" },
              { key: "year", label: "Year" },
              { key: "status", label: "Status" },
              { key: "assignedTo", label: "Assigned To" },
              { key: "purchaseDate", label: "Purchase Date" },
              { key: "quantity", label: "Quantity" },
              { key: "condition", label: "Condition" },
              { key: "imei1", label: "IMEI" },
            ]}
          />

          <button
            onClick={() => void handleDownloadPdf()}
            disabled={!hasData || generating}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            {generating ? "Building…" : "Download detailed PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Devices" value={model.summary.total} icon={<Laptop />} color="text-purple-600" />
        <StatCard title="Laptops" value={model.laptops.total} icon={<Laptop />} color="text-blue-600" />
        <StatCard title="Smartphones" value={model.phones.total} icon={<Smartphone />} color="text-green-600" />
        <StatCard
          title="Faulty"
          value={model.summary.byStatus.find(s => s.key === "Faulty")?.count ?? 0}
          icon={<Wrench />}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="People holding devices"
          value={model.assignments.people.length}
          icon={<Users />}
          color="text-cyan-600"
        />
        <StatCard
          title="Records needing attention"
          value={model.anomalies.length}
          icon={<AlertTriangle />}
          color="text-amber-600"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {hasData ? (
          <ReportPreview blocks={blocks} />
        ) : (
          <div className="text-center py-12">
            <Laptop size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No devices recorded for {model.meta.periodLabel.toLowerCase()}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {model.meta.missingDateCount > 0
                ? `${model.meta.missingDateCount} devices have no date recorded — try "All time".`
                : "Add gadgets to see the report."}
            </p>
          </div>
        )}
      </div>

      {/* Offscreen, but laid out — recharts cannot be captured while hidden. */}
      {hasData && (
        <div ref={stageRef}>
          <ChartStage model={model} chartIds={chartIds} />
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={color}>{icon}</div>
      </div>
    </div>
  );
}
