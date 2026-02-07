






import { useState, useEffect } from "react";
import { Download, Printer, TrendingUp, Calendar } from "lucide-react";
import { getToners } from "../services/tonerService";

export default function TonerReports() {
  const [toners, setToners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getToners();
    setToners(data);
    setLoading(false);
  }

  // Calculate statistics
  const stats = {
    totalToners: toners.length,
    totalValue: toners.reduce((sum, t) => sum + (t.quantity * (t.costPerUnit || 0)), 0),
    lowStock: toners.filter(t => t.status === "Low Stock" || t.status === "Critical").length,
    avgDaysRemaining: Math.round(
      toners.reduce((sum, t) => sum + (t.estimatedDaysRemaining || 0), 0) / (toners.length || 1)
    ),
  };

  // Group by location
  const byLocation: Record<string, { count: number; value: number; low: number }> = toners.reduce((acc, t) => {
    if (!acc[t.location]) {
      acc[t.location] = { count: 0, value: 0, low: 0 };
    }
    acc[t.location].count++;
    acc[t.location].value += t.quantity * (t.costPerUnit || 0);
    if (t.status === "Low Stock" || t.status === "Critical") {
      acc[t.location].low++;
    }
    return acc;
  }, {} as Record<string, { count: number; value: number; low: number }>);

  // Group by color
  const byColor: Record<string, { count: number; quantity: number }> = toners.reduce((acc, t) => {
    if (!acc[t.colorType]) {
      acc[t.colorType] = { count: 0, quantity: 0 };
    }
    acc[t.colorType].count++;
    acc[t.colorType].quantity += t.quantity;
    return acc;
  }, {} as Record<string, { count: number; quantity: number }>);

  function exportPDF() {
    console.log("Exporting PDF...");
    // TODO: Implement PDF export
  }

  function exportExcel() {
    const csv = [
      ["Location", "Printer", "Toner", "Color", "Quantity", "Status", "Days Remaining", "Cost"],
      ...toners.map(t => [
        t.location,
        t.printerType,
        t.tonerType,
        t.colorType,
        t.quantity,
        t.status || "N/A",
        t.estimatedDaysRemaining || "N/A",
        t.costPerUnit ? `GH₵${(t.quantity * t.costPerUnit).toFixed(2)}` : "N/A",
      ]),
    ]
      .map(r => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toner-report-${new Date().toISOString().split("T")[0]}.csv`;
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
            Toner Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Usage patterns, costs, and consumption analysis
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

          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Toners"
          value={stats.totalToners}
          icon={<Printer />}
          color="text-blue-600"
        />
        <StatCard
          title="Total Value"
          value={`GH₵${stats.totalValue.toFixed(2)}`}
          icon={<TrendingUp />}
          color="text-green-600"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStock}
          icon={<Calendar />}
          color="text-red-600"
        />
        <StatCard
          title="Avg Days Remaining"
          value={`~${stats.avgDaysRemaining} days`}
          icon={<Calendar />}
          color="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Toners by Location
          </h2>
          <div className="space-y-4">
            {Object.entries(byLocation).map(([location, data]) => (
              <div key={location}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {location}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {data.count} toners
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      data.low > 0 ? "bg-red-600" : "bg-green-600"
                    }`}
                    style={{
                      width: `${(data.count / stats.totalToners) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Value: GH₵{data.value.toFixed(2)}
                  </span>
                  {data.low > 0 && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {data.low} low stock
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Color */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Toners by Color
          </h2>
          <div className="space-y-4">
            {Object.entries(byColor).map(([color, data]) => {
              const colorMap: Record<string, string> = {
                Black: "bg-gray-800",
                Cyan: "bg-cyan-500",
                Magenta: "bg-pink-500",
                Yellow: "bg-yellow-400",
              };

              return (
                <div key={color}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {color}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.count} units ({data.quantity} total qty)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${colorMap[color] || "bg-blue-600"}`}
                      style={{
                        width: `${(data.count / stats.totalToners) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Detailed Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["Location", "Printer", "Toner", "Color", "Quantity", "Status", "Days Left"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {toners.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {t.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {t.printerType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {t.tonerType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        t.colorType === "Black"
                          ? "bg-gray-800 text-white"
                          : t.colorType === "Cyan"
                          ? "bg-cyan-500 text-white"
                          : t.colorType === "Magenta"
                          ? "bg-pink-500 text-white"
                          : "bg-yellow-400 text-black"
                      }`}
                    >
                      {t.colorType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {t.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === "Good"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : t.status === "Warning"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {t.status || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {t.estimatedDaysRemaining ? `~${t.estimatedDaysRemaining} days` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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