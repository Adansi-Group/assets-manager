



import { useState, useEffect } from "react";
import { Download, FileText, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { getA4Sheets, getA4SheetStats } from "../services/a4SheetService";

export default function A4SheetReports() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getA4Sheets();
    setSheets(data);
    setLoading(false);
  }

  // Calculate statistics
  const stats = {
    totalReams: sheets.reduce((sum, s) => sum + s.currentQuantity, 0),
    totalValue: sheets.reduce((sum, s) => sum + s.currentQuantity * s.costPerReam, 0),
    lowStock: sheets.filter((s) => s.status === "Low Stock").length,
    outOfStock: sheets.filter((s) => s.status === "Out of Stock").length,
    avgConsumption: Math.round(
      sheets.reduce((sum, s) => sum + (s.averageMonthlyUsage || 0), 0) /
        (sheets.filter((s) => s.averageMonthlyUsage).length || 1)
    ),
  };

  // Group by office
  const byOffice: Record<string, { quantity: number; value: number; status: string }> = sheets.reduce((acc, s) => {
    if (!acc[s.officeName]) {
      acc[s.officeName] = { quantity: 0, value: 0, status: s.status };
    }
    acc[s.officeName].quantity += s.currentQuantity;
    acc[s.officeName].value += s.currentQuantity * s.costPerReam;
    return acc;
  }, {} as Record<string, { quantity: number; value: number; status: string }>);

  // Group by brand
  const byBrand: Record<string, { quantity: number; offices: number }> = sheets.reduce((acc, s) => {
    if (!acc[s.brand]) {
      acc[s.brand] = { quantity: 0, offices: 0 };
    }
    acc[s.brand].quantity += s.currentQuantity;
    acc[s.brand].offices++;
    return acc;
  }, {} as Record<string, { quantity: number; offices: number }>);

  function exportExcel() {
    const csv = [
      [
        "Office",
        "Brand",
        "Current Stock",
        "Min Level",
        "Status",
        "Monthly Usage",
        "Days Left",
        "Cost/Ream",
        "Total Value",
      ],
      ...sheets.map((s) => [
        s.officeName,
        s.brand,
        s.currentQuantity,
        s.minimumStockLevel,
        s.status,
        s.averageMonthlyUsage || "N/A",
        s.estimatedDaysRemaining || "N/A",
        `GH₵${s.costPerReam.toFixed(2)}`,
        `GH₵${(s.currentQuantity * s.costPerReam).toFixed(2)}`,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `a4sheet-report-${new Date().toISOString().split("T")[0]}.csv`;
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
            A4 Sheet Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Consumption patterns, stock levels, and cost analysis
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Stock"
          value={`${stats.totalReams} reams`}
          icon={<FileText />}
          color="text-blue-600"
        />
        <StatCard
          title="Total Value"
          value={`GH₵${stats.totalValue.toFixed(2)}`}
          icon={<DollarSign />}
          color="text-green-600"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStock + stats.outOfStock}
          icon={<AlertTriangle />}
          color="text-red-600"
        />
        <StatCard
          title="Avg Monthly Usage"
          value={`${stats.avgConsumption} reams`}
          icon={<TrendingDown />}
          color="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Office */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Stock by Office
          </h2>
          {Object.keys(byOffice).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No A4 sheet data available
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byOffice).map(([office, data]) => (
                <div key={office}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {office}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.quantity} reams
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        data.status === "Out of Stock"
                          ? "bg-red-600"
                          : data.status === "Low Stock"
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{
                        width: `${(data.quantity / stats.totalReams) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Value: GH₵{data.value.toFixed(2)}</span>
                    <span
                      className={`${
                        data.status === "Out of Stock"
                          ? "text-red-600"
                          : data.status === "Low Stock"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {data.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Brand */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Stock by Brand
          </h2>
          {Object.keys(byBrand).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No brand data available
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byBrand).map(([brand, data]) => (
                <div key={brand}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {brand}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.quantity} reams
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-orange-600"
                      style={{
                        width: `${(data.quantity / stats.totalReams) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Used in {data.offices} {data.offices === 1 ? "office" : "offices"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Detailed Stock Analysis
          </h2>
        </div>

        {sheets.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No A4 sheet records found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add A4 sheet records to see analytics
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {[
                    "Office",
                    "Brand",
                    "Current Stock",
                    "Min Level",
                    "Status",
                    "Monthly Usage",
                    "Days Left",
                    "Stock Value",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sheets.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {s.officeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {s.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {s.currentQuantity} reams
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {s.minimumStockLevel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === "In Stock"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : s.status === "Low Stock"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {s.averageMonthlyUsage ? `~${s.averageMonthlyUsage} reams` : "No data"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {s.estimatedDaysRemaining ? (
                        <span
                          className={`font-medium ${
                            s.estimatedDaysRemaining <= 7
                              ? "text-red-600 dark:text-red-400"
                              : s.estimatedDaysRemaining <= 14
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          ~{s.estimatedDaysRemaining} days
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      GH₵{(s.currentQuantity * s.costPerReam).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`${color}`}>{icon}</div>
      </div>
    </div>
  );
}