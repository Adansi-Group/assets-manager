



import { useState, useEffect } from "react";
import { Download, Wifi, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { getInternetUsage, getInternetUsageStats } from "../services/internetUsageService";

export default function InternetReports() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getInternetUsage();
    setRecords(data);
    setLoading(false);
  }

  // Calculate statistics
  const stats = {
    totalRecords: records.length,
    active: records.filter((r) => r.status === "Active").length,
    exhausted: records.filter((r) => r.status === "Exhausted").length,
    totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0),
    avgDuration: Math.round(
      records
        .filter((r) => r.dateExhausted)
        .reduce((sum, r) => {
          const days = Math.ceil(
            (new Date(r.dateExhausted).getTime() - new Date(r.datePurchased).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / (records.filter((r) => r.dateExhausted).length || 1)
    ),
  };

  // Group by office
  const byOffice: Record<string, { count: number; cost: number; active: number }> = records.reduce((acc, r) => {
    if (!acc[r.officeName]) {
      acc[r.officeName] = { count: 0, cost: 0, active: 0 };
    }
    acc[r.officeName].count++;
    acc[r.officeName].cost += r.cost || 0;
    if (r.status === "Active") acc[r.officeName].active++;
    return acc;
  }, {} as Record<string, { count: number; cost: number; active: number }>);

  // Group by provider
  const byProvider: Record<string, { count: number; cost: number; avgDuration: number }> = records.reduce((acc, r) => {
    if (!acc[r.provider]) {
      acc[r.provider] = { count: 0, cost: 0, avgDuration: 0 };
    }
    acc[r.provider].count++;
    acc[r.provider].cost += r.cost || 0;
    
    if (r.dateExhausted) {
      const days = Math.ceil(
        (new Date(r.dateExhausted).getTime() - new Date(r.datePurchased).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      acc[r.provider].avgDuration += days;
    }
    return acc;
  }, {} as Record<string, { count: number; cost: number; avgDuration: number }>);

  // Calculate average duration for providers
  Object.keys(byProvider).forEach((provider) => {
    byProvider[provider].avgDuration = Math.round(
      byProvider[provider].avgDuration / byProvider[provider].count
    );
  });

  function exportExcel() {
    const csv = [
      ["Office", "Provider", "Date Purchased", "Date Exhausted", "Duration (Days)", "Bundle", "Cost"],
      ...records.map((r) => {
        const duration = r.dateExhausted
          ? Math.ceil(
              (new Date(r.dateExhausted).getTime() - new Date(r.datePurchased).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : "Active";

        return [
          r.officeName,
          r.provider,
          r.datePurchased,
          r.dateExhausted || "Active",
          duration,
          r.bundleSize || "N/A",
          r.cost ? `GH₵${r.cost.toFixed(2)}` : "N/A",
        ];
      }),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internet-report-${new Date().toISOString().split("T")[0]}.csv`;
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
            Internet Usage Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Cost analysis, duration tracking, and provider comparison
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
          title="Total Cost"
          value={`GH₵${stats.totalCost.toFixed(2)}`}
          icon={<DollarSign />}
          color="text-green-600"
        />
        <StatCard
          title="Active Connections"
          value={stats.active}
          icon={<Wifi />}
          color="text-blue-600"
        />
        <StatCard
          title="Exhausted"
          value={stats.exhausted}
          icon={<Calendar />}
          color="text-red-600"
        />
        <StatCard
          title="Avg Duration"
          value={`${stats.avgDuration} days`}
          icon={<TrendingUp />}
          color="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Office */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Usage by Office
          </h2>
          {Object.keys(byOffice).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No internet usage data available
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
                      {data.count} records
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        data.active > 0 ? "bg-green-600" : "bg-gray-400"
                      }`}
                      style={{
                        width: `${(data.count / stats.totalRecords) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Cost: GH₵{data.cost.toFixed(2)}</span>
                    <span>Active: {data.active}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Provider */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Provider Comparison
          </h2>
          {Object.keys(byProvider).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No provider data available
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byProvider).map(([provider, data]) => (
                <div key={provider}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {provider}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.count} subscriptions
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${(data.count / stats.totalRecords) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Total: GH₵{data.cost.toFixed(2)}</span>
                    <span>Avg: {data.avgDuration} days</span>
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
            Detailed Usage Records
          </h2>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12">
            <Wifi size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No internet usage records found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add internet usage records to see analytics
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {[
                    "Office",
                    "Provider",
                    "Date Purchased",
                    "Date Exhausted",
                    "Duration",
                    "Bundle",
                    "Cost",
                    "Status",
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
                {records.map((r) => {
                  const duration = r.dateExhausted
                    ? Math.ceil(
                        (new Date(r.dateExhausted).getTime() -
                          new Date(r.datePurchased).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {r.officeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {r.provider}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {r.datePurchased}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {r.dateExhausted || (
                          <span className="text-blue-600 dark:text-blue-400">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {duration ? `${duration} days` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {r.bundleSize || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {r.cost ? `GH₵${r.cost.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            r.status === "Active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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