






import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Printer,
  Droplet,
  Wifi,
  FileSpreadsheet,
  Laptop,
} from "lucide-react";

export default function Reports() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("month");

  const reportCategories = [
    {
      id: "toners",
      title: "Toner Reports",
      icon: <Droplet className="text-blue-600" size={32} />,
      description: "Usage, costs, and consumption trends",
      path: "/reports/toners",
      stats: [
        { label: "Total Spent", value: "GH₵12,450" },
        { label: "Replacements", value: "45" },
        { label: "Avg Days/Toner", value: "38" },
      ],
    },
    {
      id: "gadgets",
      title: "Gadget Reports",
      icon: <Laptop className="text-purple-600" size={32} />,
      description: "Inventory, assignments, and maintenance",
      path: "/reports/gadgets",
      stats: [
        { label: "Total Devices", value: "127" },
        { label: "In Use", value: "98" },
        { label: "Available", value: "29" },
      ],
    },
    {
      id: "internet",
      title: "Internet Reports",
      icon: <Wifi className="text-green-600" size={32} />,
      description: "Usage duration and cost analysis",
      path: "/reports/internet",
      stats: [
        { label: "Monthly Cost", value: "GH₵8,200" },
        { label: "Active", value: "7 offices" },
        { label: "Avg Duration", value: "42 days" },
      ],
    },
    {
      id: "a4sheets",
      title: "A4 Sheet Reports",
      icon: <FileSpreadsheet className="text-orange-600" size={32} />,
      description: "Consumption rates and stock levels",
      path: "/reports/a4sheets",
      stats: [
        { label: "Total Stock", value: "450 reams" },
        { label: "Monthly Use", value: "85 reams" },
        { label: "Low Stock", value: "3 offices" },
      ],
    },
    {
      id: "consolidated",
      title: "Consolidated Report",
      icon: <BarChart3 className="text-red-600" size={32} />,
      description: "All expenses and summaries",
      path: "/reports/consolidated",
      stats: [
        { label: "Total Expenses", value: "GH₵45,890" },
        { label: "Categories", value: "4" },
        { label: "Period", value: "Jan 2026" },
      ],
    },
    {
      id: "budget",
      title: "Budget Analysis",
      icon: <DollarSign className="text-yellow-600" size={32} />,
      description: "Budget vs actual spending",
      path: "/reports/budget",
      stats: [
        { label: "Budget", value: "GH₵50,000" },
        { label: "Spent", value: "GH₵45,890" },
        { label: "Remaining", value: "GH₵4,110" },
      ],
    },
  ];

  const quickActions = [
    {
      icon: <FileText size={20} />,
      label: "Generate Monthly Report",
      action: () => handleGenerateReport("monthly"),
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      icon: <Calendar size={20} />,
      label: "Quarterly Summary",
      action: () => handleGenerateReport("quarterly"),
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      icon: <Download size={20} />,
      label: "Export All Data",
      action: () => handleExportAll(),
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      icon: <TrendingUp size={20} />,
      label: "Trends Analysis",
      action: () => navigate("/reports/trends"),
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  function handleGenerateReport(type: string) {
    console.log(`Generating ${type} report...`);
    // TODO: Implement report generation
  }

  function handleExportAll() {
    console.log("Exporting all data...");
    // TODO: Implement export all
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your inventory and expenses
          </p>
        </div>

        {/* Date Range Selector */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.action}
            className={`${action.color} text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3`}
          >
            {action.icon}
            <span className="font-semibold">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category) => (
          <div
            key={category.id}
            onClick={() => navigate(category.path)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                {category.icon}
                <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                  View Report →
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {category.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {category.description}
              </p>
            </div>

            {/* Stats */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="grid grid-cols-3 gap-4">
                {category.stats.map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Report Activity
          </h2>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {[
            {
              type: "Toner Report",
              date: "2 hours ago",
              user: "Admin",
              action: "Generated",
            },
            {
              type: "Monthly Summary",
              date: "Yesterday",
              user: "Admin",
              action: "Exported",
            },
            {
              type: "Budget Analysis",
              date: "2 days ago",
              user: "Admin",
              action: "Downloaded",
            },
          ].map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {activity.type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.action} by {activity.user}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activity.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}