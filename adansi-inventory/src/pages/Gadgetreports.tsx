


import { useState, useEffect } from "react";
import { Download, Laptop, Smartphone, TrendingUp, Users } from "lucide-react";

export default function GadgetReports() {
  const [gadgets, setGadgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // TODO: Load from gadget service
    // const data = await getGadgets();
    // setGadgets(data);
    setGadgets([]); // Placeholder
    setLoading(false);
  }

  // Calculate statistics
  const stats = {
    totalGadgets: gadgets.length,
    inUse: gadgets.filter((g) => g.status === "In Use").length,
    available: gadgets.filter((g) => g.status === "Available").length,
    maintenance: gadgets.filter((g) => g.status === "Maintenance").length,
  };

  // Group by type
  const byType: Record<string, { count: number; inUse: number; available: number }> = gadgets.reduce((acc, g) => {
    if (!acc[g.type]) {
      acc[g.type] = { count: 0, inUse: 0, available: 0 };
    }
    acc[g.type].count++;
    if (g.status === "In Use") acc[g.type].inUse++;
    if (g.status === "Available") acc[g.type].available++;
    return acc;
  }, {} as Record<string, { count: number; inUse: number; available: number }>);

  // Group by office
  const byOffice: Record<string, { count: number; value: number }> = gadgets.reduce((acc, g) => {
    const office = g.assignedTo || "Unassigned";
    if (!acc[office]) {
      acc[office] = { count: 0, value: 0 };
    }
    acc[office].count++;
    acc[office].value += g.purchasePrice || 0;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  function exportExcel() {
    const csv = [
      ["Type", "Brand", "Model", "Status", "Assigned To", "Purchase Date", "Warranty"],
      ...gadgets.map((g) => [
        g.type,
        g.brand,
        g.model,
        g.status,
        g.assignedTo || "Unassigned",
        g.purchaseDate,
        g.warrantyExpiry || "N/A",
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gadget-report-${new Date().toISOString().split("T")[0]}.csv`;
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
            Gadget Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Inventory tracking, assignments, and maintenance logs
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
          title="Total Devices"
          value={stats.totalGadgets}
          icon={<Laptop />}
          color="text-purple-600"
        />
        <StatCard
          title="In Use"
          value={stats.inUse}
          icon={<Users />}
          color="text-green-600"
        />
        <StatCard
          title="Available"
          value={stats.available}
          icon={<Smartphone />}
          color="text-blue-600"
        />
        <StatCard
          title="Maintenance"
          value={stats.maintenance}
          icon={<TrendingUp />}
          color="text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Devices by Type
          </h2>
          {Object.keys(byType).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No gadget data available
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byType).map(([type, data]) => (
                <div key={type}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.count} devices
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-purple-600"
                      style={{
                        width: `${(data.count / stats.totalGadgets) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>In Use: {data.inUse}</span>
                    <span>Available: {data.available}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Office */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Devices by Office/Person
          </h2>
          {Object.keys(byOffice).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">
              No assignment data available
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
                      {data.count} devices
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${(data.count / stats.totalGadgets) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Total Value: GH₵{data.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Inventory Status Overview
        </h2>

        {gadgets.length === 0 ? (
          <div className="text-center py-12">
            <Laptop size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No gadget records found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add gadgets to see detailed analytics
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {["Type", "Brand/Model", "Status", "Assigned To", "Purchase Date", "Warranty"].map(
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
                {gadgets.map((g, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {g.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {g.brand} {g.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          g.status === "In Use"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : g.status === "Available"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {g.assignedTo || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {g.purchaseDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {g.warrantyExpiry || "N/A"}
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