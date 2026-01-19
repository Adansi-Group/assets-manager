import { useEffect, useState } from "react";
import {
  Printer,
  Droplet,
  FileText,
  Users,
  Smartphone,
  Laptop,
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
import type { Gadget } from "../types/gadget";

export default function Dashboard() {
  const [printerCount, setPrinterCount] = useState(0);
  const [tonerCount, setTonerCount] = useState(0);
  const [phonesCount, setPhonesCount] = useState(0);
  const [laptopsCount, setLaptopsCount] = useState(0);

  const [recentGadgets, setRecentGadgets] = useState<Gadget[]>([]);
  const [statusSummary, setStatusSummary] = useState({
    inStock: 0,
    inUse: 0,
    faulty: 0,
  });

  useEffect(() => {
    const printers = JSON.parse(localStorage.getItem("printers") || "[]");
    const toners = JSON.parse(localStorage.getItem("toners") || "[]");
    const gadgets: Gadget[] = JSON.parse(
      localStorage.getItem("gadgets") || "[]"
    );

    setPrinterCount(printers.length);
    setTonerCount(toners.length);

    setPhonesCount(
      gadgets.filter(g => g.deviceType === "Smartphone").length
    );
    setLaptopsCount(
      gadgets.filter(g => g.deviceType === "Laptop").length
    );

    setRecentGadgets(gadgets.slice(-5).reverse());

    setStatusSummary({
      inStock: gadgets.filter(g => g.status === "In-Stock").length,
      inUse: gadgets.filter(g => g.status === "In-Use").length,
      faulty: gadgets.filter(g => g.status === "Faulty").length,
    });
  }, []);

  const stats = [
    {
      label: "Printers",
      value: printerCount,
      icon: Printer,
      bg: "bg-blue-50",
      iconBg: "bg-blue-600",
    },
    {
      label: "Toners",
      value: tonerCount,
      icon: Droplet,
      bg: "bg-purple-50",
      iconBg: "bg-purple-600",
    },
    {
      label: "Sheets",
      value: 0,
      icon: FileText,
      bg: "bg-yellow-50",
      iconBg: "bg-yellow-500",
    },
    {
      label: "Users",
      value: 2,
      icon: Users,
      bg: "bg-green-50",
      iconBg: "bg-green-600",
    },
    {
      label: "Phones",
      value: phonesCount,
      icon: Smartphone,
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-600",
    },
    {
      label: "Laptops",
      value: laptopsCount,
      icon: Laptop,
      bg: "bg-teal-50",
      iconBg: "bg-teal-600",
    },
  ];

  const deviceChartData = [
    { name: "Phones", value: phonesCount },
    { name: "Laptops", value: laptopsCount },
  ];

  const statusChartData = [
    { name: "In Stock", value: statusSummary.inStock },
    { name: "In Use", value: statusSummary.inUse },
    { name: "Faulty", value: statusSummary.faulty },
  ];

  const STATUS_COLORS = ["#16a34a", "#2563eb", "#dc2626"];

  return (
    <div className="p-6 space-y-6">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`rounded-xl shadow p-6 ${s.bg}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">{s.label}</p>
                  <p className="text-3xl font-bold">{s.value}</p>
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
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Recent Gadgets
          </h3>

          {recentGadgets.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No recent activity
            </p>
          ) : (
            <ul className="space-y-3">
              {recentGadgets.map(g => (
                <li
                  key={g.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">
                      {g.deviceType} — {g.model}
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.year}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      g.status === "In-Stock"
                        ? "bg-green-100 text-green-700"
                        : g.status === "In-Use"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
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
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Gadget Status Overview
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span>In Stock</span>
              <span className="font-bold text-green-600">
                {statusSummary.inStock}
              </span>
            </div>

            <div className="flex justify-between">
              <span>In Use</span>
              <span className="font-bold text-blue-600">
                {statusSummary.inUse}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Faulty</span>
              <span className="font-bold text-red-600">
                {statusSummary.faulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAR CHART */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Devices Overview
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deviceChartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Gadget Status Distribution
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {statusChartData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}





