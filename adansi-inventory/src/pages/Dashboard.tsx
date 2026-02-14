import { useEffect, useState } from "react";
import {
  Printer,
  Droplet,
  FileText,
  Smartphone,
  Laptop,
  RefreshCw,
  Package,
  Wifi,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getPrinters } from "../services/printerService";
import { getGadgets } from "../services/gadgetsService";
import { getToners } from "../services/tonerService";
import { getA4Sheets } from "../services/a4SheetService";
import { getInternetUsage } from "../services/internetUsageService";
import type { Gadget } from "../types/gadget";

export default function Dashboard() {
  const [printerCount, setPrinterCount] = useState(0);
  const [tonerCount, setTonerCount] = useState(0);
  const [a4SheetCount, setA4SheetCount] = useState(0);
  const [internetCount, setInternetCount] = useState(0);
  const [phonesCount, setPhonesCount] = useState(0);
  const [laptopsCount, setLaptopsCount] = useState(0);
  const [accessoriesCount, setAccessoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [recentGadgets, setRecentGadgets] = useState<Gadget[]>([]);
  const [statusSummary, setStatusSummary] = useState({
    inStock: 0,
    inUse: 0,
    faulty: 0,
  });

  useEffect(() => {
    loadData();

    // Reload when window gains focus
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("🔄 Loading dashboard data from Firebase...");

      // Fetch all data from Firebase
      const [printers, gadgets, toners, a4Sheets, internetRecords] = await Promise.all([
        getPrinters(),
        getGadgets(),
        getToners(),
        getA4Sheets(),
        getInternetUsage(),
      ]);

      console.log("✅ Printers from Firebase:", printers.length);
      console.log("✅ Gadgets from Firebase:", gadgets.length);
      console.log("✅ Toners (individual color records) from Firebase:", toners.length);
      console.log("✅ A4 Sheets from Firebase:", a4Sheets.length);
      console.log("✅ Internet Records from Firebase:", internetRecords.length);

      // ============================================
      // DEBUG: Show EVERY toner record
      // ============================================
      console.log("\n🔍 DEBUGGING TONERS - ALL RECORDS:");
      console.log("=".repeat(80));
      
      let totalQty = 0;
      const groupedByLocation: Record<string, Array<{color: string, qty: number}>> = {};
      
      toners.forEach((t, index) => {
        const key = `${t.location} - ${t.room || 'N/A'} - ${t.printerType}`;
        if (!groupedByLocation[key]) {
          groupedByLocation[key] = [];
        }
        groupedByLocation[key].push({ color: t.colorType, qty: t.quantity });
        totalQty += t.quantity;
        
        console.log(`${index + 1}. ${t.location} | ${t.room || 'N/A'} | ${t.printerType} | ${t.tonerType} | ${t.colorType} → Qty: ${t.quantity}`);
      });

      console.log("=".repeat(80));
      console.log("\n📊 GROUPED BY LOCATION:");
      Object.entries(groupedByLocation).forEach(([location, colors]) => {
        const locationTotal = colors.reduce((sum, c) => sum + c.qty, 0);
        console.log(`\n📍 ${location}:`);
        colors.forEach(c => {
          console.log(`   ${c.color}: ${c.qty}`);
        });
        console.log(`   ✅ Subtotal: ${locationTotal}`);
      });
      
      console.log("\n" + "=".repeat(80));
      console.log(`🎯 GRAND TOTAL: ${totalQty}`);
      console.log("=".repeat(80));

      // Set counts
      setPrinterCount(printers.length);
      setTonerCount(totalQty); // Sum of ALL toner quantities
      setA4SheetCount(a4Sheets.length);
      setInternetCount(internetRecords.length);

      // Count by device type
      const phones = gadgets.filter(g => g.deviceType === "Smartphone").length;
      const laptops = gadgets.filter(g => g.deviceType === "Laptop").length;
      const accessories = gadgets.filter(g => g.deviceType === "Accessory").length;
      
      setPhonesCount(phones);
      setLaptopsCount(laptops);
      setAccessoriesCount(accessories);

      console.log("📊 Device counts - Phones:", phones, "Laptops:", laptops, "Accessories:", accessories);

      // Get recent gadgets (last 5)
      setRecentGadgets(gadgets.slice(0, 5)); // Already ordered by createdAt desc from service

      // Count by status
      const inStock = gadgets.filter(g => g.status === "In-Stock").length;
      const inUse = gadgets.filter(g => g.status === "In-Use").length;
      const faulty = gadgets.filter(g => g.status === "Faulty").length;

      setStatusSummary({ inStock, inUse, faulty });
      console.log("📊 Status counts - In-Stock:", inStock, "In-Use:", inUse, "Faulty:", faulty);

    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      label: "Printers",
      value: printerCount,
      icon: Printer,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconBg: "bg-blue-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "Toners",
      value: tonerCount,
      icon: Droplet,
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconBg: "bg-purple-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "Internet",
      value: internetCount,
      icon: Wifi,
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      iconBg: "bg-cyan-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "Phones",
      value: phonesCount,
      icon: Smartphone,
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconBg: "bg-emerald-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "Laptops",
      value: laptopsCount,
      icon: Laptop,
      bg: "bg-teal-50 dark:bg-teal-900/20",
      iconBg: "bg-teal-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "Accessories",
      value: accessoriesCount,
      icon: Package,
      bg: "bg-orange-50 dark:bg-orange-900/20",
      iconBg: "bg-orange-600",
      textColor: "text-gray-900 dark:text-white",
    },
    {
      label: "A4 Sheets",
      value: a4SheetCount,
      icon: FileText,
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      iconBg: "bg-yellow-500",
      textColor: "text-gray-900 dark:text-white",
    },
  ];

  const deviceChartData = [
    { name: "Phones", value: phonesCount },
    { name: "Laptops", value: laptopsCount },
    { name: "Accessories", value: accessoriesCount },
  ];

  const statusChartData = [
    { name: "In Stock", value: statusSummary.inStock },
    { name: "In Use", value: statusSummary.inUse },
    { name: "Faulty", value: statusSummary.faulty },
  ];

  const STATUS_COLORS = ["#16a34a", "#2563eb", "#dc2626"];
  const DEVICE_COLORS = ["#059669", "#0d9488", "#f97316"];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadData}
          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all hover:rotate-180 flex items-center gap-2"
          title="Refresh Data"
        >
          <RefreshCw size={20} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`rounded-xl shadow p-6 ${s.bg} border border-gray-200 dark:border-gray-700`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.label}</p>
                  <p className={`text-3xl font-bold ${s.textColor}`}>{s.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${s.iconBg}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECENT + STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECENT GADGETS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Recent Gadgets
          </h3>

          {recentGadgets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No recent activity
            </p>
          ) : (
            <ul className="space-y-3">
              {recentGadgets.map(g => (
                <li
                  key={g.id}
                  className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {g.deviceType} — {g.model}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {g.year}
                      {g.deviceType === "Accessory" && g.quantity !== undefined && (
                        <span className="ml-2">• Qty: {g.quantity}</span>
                      )}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      g.status === "In-Stock"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : g.status === "In-Use"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {g.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* STATUS SUMMARY */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Gadget Status Overview
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">In Stock</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {statusSummary.inStock}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">In Use</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {statusSummary.inUse}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Faulty</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {statusSummary.faulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAR CHART */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Devices Overview
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deviceChartData}>
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis allowDecimals={false} stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {deviceChartData.map((_, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Gadget Status Distribution
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {statusChartData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}






