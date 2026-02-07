


import { useState, useEffect } from "react";
import { Download, DollarSign, TrendingUp, Calendar, PieChart } from "lucide-react";
import { getToners } from "../services/tonerService";
import { getA4Sheets } from "../services/a4SheetService";
import { getInternetUsage } from "../services/internetUsageService";

export default function ConsolidatedReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    toners: [] as any[],
    a4Sheets: [] as any[],
    internet: [] as any[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [toners, sheets, internet] = await Promise.all([
      getToners(),
      getA4Sheets(),
      getInternetUsage(),
    ]);
    setData({ toners, a4Sheets: sheets, internet });
    setLoading(false);
  }

  // Calculate totals
  const totals = {
    toners: {
      count: data.toners.length,
      cost: data.toners.reduce((sum, t) => sum + (t.quantity * (t.costPerUnit || 0)), 0),
    },
    a4Sheets: {
      count: data.a4Sheets.reduce((sum, s) => sum + s.currentQuantity, 0),
      cost: data.a4Sheets.reduce((sum, s) => sum + s.currentQuantity * s.costPerReam, 0),
    },
    internet: {
      count: data.internet.filter((i) => i.status === "Active").length,
      cost: data.internet.reduce((sum, i) => sum + (i.cost || 0), 0),
    },
  };

  const grandTotal =
    totals.toners.cost + totals.a4Sheets.cost + totals.internet.cost;

  function exportPDF() {
    console.log("Exporting consolidated PDF...");
    // TODO: Implement PDF export with charts
  }

  function exportExcel() {
    const csv = [
      ["CONSOLIDATED EXPENSE REPORT"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Category", "Items", "Total Cost"],
      ["Toners", totals.toners.count, `GH₵${totals.toners.cost.toFixed(2)}`],
      ["A4 Sheets", `${totals.a4Sheets.count} reams`, `GH₵${totals.a4Sheets.cost.toFixed(2)}`],
      ["Internet", totals.internet.count, `GH₵${totals.internet.cost.toFixed(2)}`],
      [""],
      ["GRAND TOTAL", "", `GH₵${grandTotal.toFixed(2)}`],
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidated-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Consolidated Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete overview of all expenses and inventory
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Grand Total Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 mb-2">Total Expenses (All Categories)</p>
            <p className="text-5xl font-bold">GH₵{grandTotal.toFixed(2)}</p>
            <p className="text-green-100 mt-2">
              Period: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <DollarSign size={80} className="text-green-200 opacity-50" />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Toners */}
        <CategoryCard
          title="Toners"
          count={totals.toners.count}
          cost={totals.toners.cost}
          percentage={(totals.toners.cost / grandTotal) * 100}
          color="bg-blue-600"
          icon="💧"
        />

        {/* A4 Sheets */}
        <CategoryCard
          title="A4 Sheets"
          count={`${totals.a4Sheets.count} reams`}
          cost={totals.a4Sheets.cost}
          percentage={(totals.a4Sheets.cost / grandTotal) * 100}
          color="bg-orange-600"
          icon="📄"
        />

        {/* Internet */}
        <CategoryCard
          title="Internet Usage"
          count={`${totals.internet.count} active`}
          cost={totals.internet.cost}
          percentage={(totals.internet.cost / grandTotal) * 100}
          color="bg-green-600"
          icon="📡"
        />
      </div>

      {/* Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChart size={24} className="text-green-600" />
            Cost Distribution
          </h2>

          <div className="space-y-4">
            <DistributionBar
              label="Toners"
              value={totals.toners.cost}
              percentage={(totals.toners.cost / grandTotal) * 100}
              color="bg-blue-600"
            />
            <DistributionBar
              label="A4 Sheets"
              value={totals.a4Sheets.cost}
              percentage={(totals.a4Sheets.cost / grandTotal) * 100}
              color="bg-orange-600"
            />
            <DistributionBar
              label="Internet"
              value={totals.internet.cost}
              percentage={(totals.internet.cost / grandTotal) * 100}
              color="bg-green-600"
            />
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-green-600" />
            Monthly Trend
          </h2>

          <div className="text-center py-12">
            <Calendar size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Historical data will appear here
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Track month-over-month spending patterns
            </p>
          </div>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Toner Expenses */}
        <SummaryTable
          title="Top Toner Expenses"
          items={data.toners
            .map((t) => ({
              name: `${t.location} - ${t.colorType}`,
              value: (t.quantity * (t.costPerUnit || 0)).toFixed(2),
            }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 5)}
        />

        {/* A4 Sheet Usage */}
        <SummaryTable
          title="A4 Sheet Stock Value"
          items={data.a4Sheets
            .map((s) => ({
              name: s.officeName,
              value: (s.currentQuantity * s.costPerReam).toFixed(2),
            }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 5)}
        />

        {/* Internet Costs */}
        <SummaryTable
          title="Internet Expenses"
          items={data.internet
            .filter((i) => i.cost)
            .map((i) => ({
              name: `${i.officeName} - ${i.provider}`,
              value: i.cost.toFixed(2),
            }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 5)}
        />
      </div>
    </div>
  );
}

function CategoryCard({ title, count, cost, percentage, color, icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        GH₵{cost.toFixed(2)}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{count}</p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {percentage.toFixed(1)}% of total
      </p>
    </div>
  );
}

function DistributionBar({ label, value, percentage, color }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          GH₵{value.toFixed(2)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
        <div className={`h-4 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function SummaryTable({ title, items }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">No data</p>
        ) : (
          items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                GH₵{item.value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}