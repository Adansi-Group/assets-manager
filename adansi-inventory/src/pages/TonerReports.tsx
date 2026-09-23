






import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Download, Layers, Printer, TriangleAlert } from "lucide-react";
import Swal from "sweetalert2";
import { getToners } from "../services/tonerService";
import type { Toner } from "../types/toner";
import ExportDropdown from "../components/ExportDropdown";
import { DocBuilder } from "../reports/shared/pdf/docBuilder";

export default function TonerReports() {
  const [toners, setToners] = useState<Toner[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const data = await getToners();
    setToners(data);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  // Note: `costPerUnit` and `estimatedDaysRemaining` exist on the Toner type but
  // nothing in the app ever writes them, so a "total value" or "avg days
  // remaining" here would always be exactly 0. Those are reported as not
  // recorded rather than shown as a figure.
  const stats = {
    totalToners: toners.length,
    totalUnits: toners.reduce((sum, t) => sum + (t.quantity ?? 0), 0),
    lowStock: toners.filter(t => t.status === "Warning" || t.status === "Critical").length,
    locations: new Set(toners.map(t => t.location).filter(Boolean)).size,
  };

  // Group by location
  const byLocation: Record<string, { count: number; units: number; low: number }> = toners.reduce((acc, t) => {
    if (!acc[t.location]) {
      acc[t.location] = { count: 0, units: 0, low: 0 };
    }
    acc[t.location].count++;
    acc[t.location].units += t.quantity ?? 0;
    if (t.status === "Warning" || t.status === "Critical") {
      acc[t.location].low++;
    }
    return acc;
  }, {} as Record<string, { count: number; units: number; low: number }>);

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
    try {
      const today = new Date().toISOString().slice(0, 10);
      const doc = new DocBuilder({
        title: "Toner Stock Report",
        subtitle: `Adansi Travels · All locations · Generated ${today}`,
        footerNote: "Adansi Travels · Assets Station",
      });

      doc.heading(2, "Summary");
      doc.paragraph(
        `${stats.totalToners} toner ${stats.totalToners === 1 ? "record" : "records"} covering ` +
          `${stats.totalUnits} ${stats.totalUnits === 1 ? "unit" : "units"} across ` +
          `${stats.locations} ${stats.locations === 1 ? "location" : "locations"}. ` +
          `${stats.lowStock} ${stats.lowStock === 1 ? "record is" : "records are"} at warning or critical level.`
      );

      doc.heading(2, "Stock by Location");
      doc.table(
        ["Location", "Records", "Units", "Low stock"],
        Object.entries(byLocation)
          .sort((a, b) => b[1].units - a[1].units)
          .map(([location, d]) => [location, d.count, d.units, d.low])
      );

      doc.heading(2, "Stock by Colour");
      doc.table(
        ["Colour", "Records", "Units"],
        Object.entries(byColor)
          .sort((a, b) => b[1].quantity - a[1].quantity)
          .map(([color, d]) => [color, d.count, d.quantity])
      );

      doc.heading(2, "All Toner Records");
      doc.table(
        ["Location", "Room", "Printer", "Toner", "Colour", "Qty", "Status"],
        toners.map(t => [
          t.location ?? "—",
          t.room ?? "—",
          t.printerType ?? "—",
          t.tonerType ?? "—",
          t.colorType ?? "—",
          t.quantity ?? 0,
          t.status ?? "Not set",
        ])
      );

      doc.heading(2, "Data Coverage and Limitations");
      doc.callout(
        "warn",
        "Cost not recorded",
        "The Assets Station has no field for toner purchase cost that is ever filled in, so no " +
          "spend or stock-value figure can be produced for toners. This report deliberately omits " +
          "a cost total rather than showing GHS 0, which would read as “nothing was spent”."
      );
      doc.callout(
        "info",
        "Days remaining not tracked",
        "Estimated days remaining is not calculated or stored for toners, so consumption rate and " +
          "reorder timing cannot be reported from this data."
      );

      doc.save(`Adansi_Toner_Report_${today}.pdf`);
    } catch (error) {
      console.error("Error generating toner PDF:", error);
      void Swal.fire({
        icon: "error",
        title: "Could not generate the PDF",
        text: error instanceof Error ? error.message : "Something went wrong building the document.",
      });
    }
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
            Stock levels by location and colour
          </p>
        </div>

        <div className="flex gap-3">
          <ExportDropdown
            data={toners as unknown as Record<string, unknown>[]}
            filename={`toners-${new Date().toISOString().slice(0, 10)}`}
            columns={[
              { key: "location", label: "Location" },
              { key: "room", label: "Room" },
              { key: "printerType", label: "Printer" },
              { key: "tonerType", label: "Toner" },
              { key: "colorType", label: "Colour" },
              { key: "quantity", label: "Quantity" },
              { key: "initialQuantity", label: "Initial Quantity" },
              { key: "dateBrought", label: "Date Brought" },
              { key: "status", label: "Status" },
            ]}
          />

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
          title="Units in Stock"
          value={stats.totalUnits}
          icon={<Layers />}
          color="text-green-600"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStock}
          icon={<TriangleAlert />}
          color="text-red-600"
        />
        <StatCard
          title="Locations"
          value={stats.locations}
          icon={<Printer />}
          color="text-purple-600"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 rounded-r-lg px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-1">
          No cost figures for toners
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Toner purchase cost is never captured when a toner is added, so no spend or stock-value
          total can be produced here. Showing GHS 0 would read as “nothing was spent”, so it is left
          out instead. Estimated days remaining is not tracked either.
        </p>
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
                    {data.units} {data.units === 1 ? "unit" : "units"}
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
                {/* No "Days Left": estimatedDaysRemaining is never written, so
                    the column could only ever print N/A on every row. */}
                {["Location", "Printer", "Toner", "Color", "Quantity", "Status"].map(
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
        <div className={`${color}`}>{icon}</div>
      </div>
    </div>
  );
}